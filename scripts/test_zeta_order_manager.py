"""Offline order-manager tests. All callbacks are local simulations."""

import asyncio
from dataclasses import FrozenInstanceError
from decimal import Decimal
import unittest
from unittest.mock import AsyncMock, Mock

from zeta_order_manager import OrderStatus, ZetaOrderManager


class TestOrderManager(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.clock = Mock(return_value=0.0)
        self.wall = Mock(return_value=1000.0)
        self.cancel = AsyncMock(return_value=True)
        self.manager = ZetaOrderManager(
            cancel_callback=self.cancel, clock=self.clock, wall_clock=self.wall,
        )
        self.addAsyncCleanup(self.manager.stop_monitoring)

    async def register(self, oid="101", **kwargs):
        return await self.manager.register_order(
            oid, "BTC", True, "65000.00000001", "0.001000000000001", **kwargs,
        )

    async def test_decimal_values_and_immutable_snapshots(self):
        order = await self.register()
        self.assertEqual(order.price, Decimal("65000.00000001"))
        self.assertEqual(order.to_dict()["size"], "0.001000000000001")
        with self.assertRaises(FrozenInstanceError):
            order.status = OrderStatus.FILLED
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.RESTING)

    async def test_ttl_boundary_requires_confirmed_cancel(self):
        await self.register(ttl_seconds=2)
        self.clock.return_value = 1.999
        await self.manager.check_stale_orders()
        self.cancel.assert_not_awaited()
        self.clock.return_value = 2
        await self.manager.check_stale_orders()
        self.cancel.assert_awaited_once_with("BTC", "101")
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.EXPIRED)
        self.assertEqual(await self.manager.get_active_orders(), [])

    async def test_filled_order_is_never_cancelled_by_ttl(self):
        await self.register()
        await self.manager.update_order_status("101", OrderStatus.FILLED)
        self.clock.return_value = 100
        await self.manager.check_stale_orders()
        self.cancel.assert_not_awaited()

    async def test_manual_cancel_and_repeat(self):
        await self.register()
        self.assertTrue(await self.manager.cancel_order("101"))
        self.assertFalse(await self.manager.cancel_order("101"))
        self.assertFalse(await self.manager.cancel_order("missing"))
        self.cancel.assert_awaited_once()
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.CANCELLED)

    async def test_no_callback_never_claims_cancellation(self):
        self.manager.cancel_callback = None
        await self.register()
        self.assertFalse(await self.manager.cancel_order("101"))
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.RESTING)
        with self.assertRaises(RuntimeError):
            self.manager.start_monitoring()

    async def test_false_response_leaves_order_active(self):
        self.cancel.return_value = False
        await self.register(ttl_seconds=1)
        self.clock.return_value = 2
        await self.manager.check_stale_orders()
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.RESTING)
        self.assertEqual(len(await self.manager.get_active_orders()), 1)

    async def test_exception_requires_explicit_reconciliation(self):
        self.cancel.side_effect = OSError("simulated failure")
        await self.register(ttl_seconds=1)
        self.clock.return_value = 2
        await self.manager.check_stale_orders()
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.CANCEL_UNKNOWN)
        await self.manager.check_stale_orders()
        self.cancel.assert_awaited_once()
        self.assertEqual(len(await self.manager.get_active_orders()), 1)
        self.cancel.side_effect = None
        await self.manager.update_order_status("101", OrderStatus.RESTING)
        await self.manager.check_stale_orders()
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.EXPIRED)

    async def test_timeout_does_not_claim_success(self):
        async def blocked(*args):
            await asyncio.Event().wait()

        self.manager.cancel_callback = blocked
        self.manager.cancel_timeout = 0.01
        await self.register()
        self.assertFalse(await self.manager.cancel_order("101"))
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.CANCEL_UNKNOWN)

    async def test_non_boolean_response_is_not_success(self):
        self.cancel.return_value = {"status": "ok"}
        await self.register()
        self.assertFalse(await self.manager.cancel_order("101"))
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.CANCEL_UNKNOWN)

    async def test_fill_during_cancel_is_preserved_and_duplicate_cancel_blocked(self):
        started, release = asyncio.Event(), asyncio.Event()

        async def delayed_cancel(*args):
            started.set()
            await release.wait()
            return True

        self.cancel.side_effect = delayed_cancel
        await self.register()
        task = asyncio.create_task(self.manager.cancel_order("101"))
        try:
            await asyncio.wait_for(started.wait(), 1)
            self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.PENDING_CANCEL)
            self.assertEqual(len(await self.manager.get_active_orders()), 1)
            self.assertFalse(await self.manager.cancel_order("101"))
            await self.manager.update_order_status("101", OrderStatus.FILLED)
        finally:
            release.set()
        self.assertFalse(await task)
        self.cancel.assert_awaited_once()
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.FILLED)

    async def test_system_clock_changes_do_not_change_ttl(self):
        await self.register(ttl_seconds=2)
        self.wall.return_value = -50000
        self.clock.return_value = 1
        await self.manager.check_stale_orders()
        self.cancel.assert_not_awaited()
        self.wall.return_value = 900000
        self.clock.return_value = 2
        await self.manager.check_stale_orders()
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.EXPIRED)

    async def test_duplicate_id_does_not_replace_order(self):
        original = await self.register()
        with self.assertRaises(ValueError):
            await self.register()
        self.assertIs(await self.manager.get_order("101"), original)

    async def test_terminal_state_cannot_regress(self):
        await self.register()
        await self.manager.update_order_status("101", OrderStatus.FILLED)
        for status in (OrderStatus.RESTING, OrderStatus.CANCELLED, OrderStatus.EXPIRED):
            with self.subTest(status=status):
                with self.assertRaises(ValueError):
                    await self.manager.update_order_status("101", status)
        await self.manager.update_order_status("101", OrderStatus.FILLED)  # Idempotent.

    async def test_missing_id_and_invalid_status_are_explicit(self):
        with self.assertRaises(KeyError):
            await self.manager.update_order_status("missing", OrderStatus.FILLED)
        await self.register()
        with self.assertRaises(ValueError):
            await self.manager.update_order_status("101", "FILLED")

    async def test_invalid_parameters_are_rejected(self):
        for value in (0, -1, float("nan"), float("inf"), True, "bad"):
            for field in ("default_ttl_seconds", "check_interval_seconds", "cancel_timeout_seconds"):
                with self.subTest(field=field, value=value):
                    with self.assertRaises(ValueError):
                        ZetaOrderManager(**{field: value})
            with self.assertRaises(ValueError):
                await self.register(ttl_seconds=value)
            for field in ("price", "size"):
                values = dict(oid="bad", coin="BTC", is_buy=True, price="65000", size="0.001")
                values[field] = value
                with self.assertRaises(ValueError):
                    await self.manager.register_order(**values)

    async def test_monitor_stop_during_cancel_leaves_uncertain_active_order(self):
        started = asyncio.Event()

        async def blocked(*args):
            started.set()
            await asyncio.Event().wait()

        self.manager.cancel_callback = blocked
        self.manager.check_interval = 0.001
        await self.register(ttl_seconds=1)
        self.clock.return_value = 2
        self.manager.start_monitoring()
        original_task = self.manager._monitor_task
        self.manager.start_monitoring()
        self.assertIs(self.manager._monitor_task, original_task)
        await asyncio.wait_for(started.wait(), 1)
        await self.manager.stop_monitoring()
        self.assertTrue(original_task.done())
        self.assertIsNone(self.manager._monitor_task)
        self.assertEqual((await self.manager.get_order("101")).status, OrderStatus.CANCEL_UNKNOWN)
        self.assertEqual(len(await self.manager.get_active_orders()), 1)
        await self.manager.stop_monitoring()  # Idempotent.


if __name__ == "__main__":
    unittest.main()