"""Combined flow tests with synthetic books and local cancellations only."""

import asyncio
import csv
from decimal import Decimal
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, Mock, patch

from zeta_csv_logger import AsyncCsvLogger, CsvLoggingError
from zeta_master_engine import ZetaMasterEngine, SIMULATED_SIZES, run_engine
from zeta_order_manager import OrderStatus
from zeta_spread_monitor import MultiAssetSpreadMonitor


def book(coin="BTC", bid="80000", ask="80016"):
    return {"coin": coin, "levels": [
        [{"px": bid, "sz": "1.12345678"}],
        [{"px": ask, "sz": "2.987654321"}],
    ]}


class TestMasterEngine(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "ticks.csv"
        self.logger = await self.enterAsyncContext(AsyncCsvLogger(self.path))
        self.clock = Mock(return_value=0)
        self.engine = ZetaMasterEngine(self.logger, clock=self.clock)
        self.addAsyncCleanup(self.engine.order_manager.stop_monitoring)

    def rows(self):
        with self.path.open(newline="") as stream:
            return list(csv.DictReader(stream))

    async def test_three_asset_signals_log_then_create_exact_simulated_orders(self):
        cases = [
            ("BTC", "80000", "80016", "80001.6"),
            ("ETH", "3000", "3000.6", "3000.06"),
            ("SOL", "150", "150.03", "150.003"),
        ]
        for coin, bid, ask, expected_price in cases:
            order = await self.engine.evaluate_order_book(book(coin, bid, ask))
            self.assertTrue(order.oid.startswith("SIM-"))
            self.assertEqual(order.status, OrderStatus.RESTING)
            self.assertEqual(order.price, Decimal(expected_price))
            self.assertEqual(order.size, SIMULATED_SIZES[coin])
            self.assertEqual(order.ttl_seconds, 4)
            self.assertTrue(order.is_buy)
        orders = await self.engine.order_manager.get_orders()
        self.assertEqual(len({order.oid for order in orders}), 3)
        self.assertEqual([row["coin"] for row in self.rows()], ["BTC", "ETH", "SOL"])
        self.assertEqual(self.logger.rows_written, 3)

    async def test_full_lifecycle_fill_and_ttl_expiry(self):
        btc = await self.engine.evaluate_order_book(book())
        eth = await self.engine.evaluate_order_book(book("ETH", "3000", "3000.6"))
        self.clock.return_value = 1
        await self.engine.order_manager.update_order_status(eth.oid, OrderStatus.FILLED)
        self.clock.return_value = 3.999
        await self.engine.order_manager.check_stale_orders()
        self.assertEqual((await self.engine.order_manager.get_order(btc.oid)).status, OrderStatus.RESTING)
        self.clock.return_value = 4
        await self.engine.order_manager.check_stale_orders()
        summary = await self.engine.report()
        self.assertEqual(summary["statuses"], {"EXPIRED": 1, "FILLED": 1})
        self.assertEqual(summary["active_simulated_orders"], 0)
        self.assertEqual(summary["csv_rows"], 2)

    async def test_cooldowns_do_not_suppress_csv_records(self):
        await self.engine.evaluate_order_book(book(ask="80001"))
        self.assertEqual(await self.engine.order_manager.get_orders(), [])
        await self.engine.evaluate_order_book(book())
        self.clock.return_value = 2.999
        self.assertIsNone(await self.engine.evaluate_order_book(book()))
        # ETH is independent of BTC's cooldown.
        self.assertIsNotNone(await self.engine.evaluate_order_book(book("ETH", "3000", "3000.6")))
        self.clock.return_value = 3
        self.assertIsNotNone(await self.engine.evaluate_order_book(book()))
        self.assertEqual(len(await self.engine.order_manager.get_orders()), 3)
        self.assertEqual(self.logger.rows_written, 5)

    async def test_malformed_input_never_logs_or_creates_order(self):
        for data in (None, {}, {"coin": "BTC", "levels": []},
                     book(ask="NaN"), book(ask="79999"), book("DOGE")):
            self.assertIsNone(await self.engine.evaluate_order_book(data))
        self.assertEqual(self.logger.rows_written, 0)
        self.assertEqual(await self.engine.order_manager.get_orders(), [])

    async def test_csv_failure_prevents_simulated_registration(self):
        with patch.object(self.logger, "_append_sync", side_effect=OSError("simulated full disk")):
            with self.assertRaises(CsvLoggingError):
                await self.engine.evaluate_order_book(book())
        self.assertEqual(await self.engine.order_manager.get_orders(), [])

    async def test_cancel_timeout_remains_unknown_not_expired(self):
        async def blocked(*args):
            await asyncio.Event().wait()

        manager = self.engine.order_manager
        manager.cancel_callback = blocked
        manager.cancel_timeout = 0.01
        await self.engine.evaluate_order_book(book())
        self.clock.return_value = 4
        await manager.check_stale_orders()
        summary = await self.engine.report()
        self.assertEqual(summary["statuses"], {"CANCEL_UNKNOWN": 1})
        self.assertEqual(summary["active_simulated_orders"], 1)

    async def test_shutdown_does_not_invent_order_cancellation(self):
        started, stopped = asyncio.Event(), asyncio.Event()

        async def fake_feed(monitor):
            await monitor.evaluate_order_book(book())
            started.set()
            try:
                await asyncio.Event().wait()
            finally:
                stopped.set()

        with patch.object(MultiAssetSpreadMonitor, "run", fake_feed):
            task = asyncio.create_task(self.engine.run())
            await asyncio.wait_for(started.wait(), 1)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
        self.assertTrue(stopped.is_set())
        self.assertIsNone(self.engine.order_manager._monitor_task)
        summary = await self.engine.report()
        self.assertEqual(summary["statuses"], {"RESTING": 1})
        self.assertEqual(summary["csv_rows"], 1)

    async def test_ttl_task_failure_stops_feed_and_surfaces(self):
        stopped = asyncio.Event()

        async def fake_feed(monitor):
            try:
                await asyncio.Event().wait()
            finally:
                stopped.set()

        self.engine.order_manager.check_interval = 0.001
        with patch.object(MultiAssetSpreadMonitor, "run", fake_feed), patch.object(
            self.engine.order_manager, "check_stale_orders",
            new=AsyncMock(side_effect=RuntimeError("simulated TTL failure")),
        ):
            with self.assertRaisesRegex(RuntimeError, "simulated TTL failure"):
                await asyncio.wait_for(self.engine.run(), 1)
        self.assertTrue(stopped.is_set())
        self.assertIsNone(self.engine.order_manager._monitor_task)

    async def test_feed_failure_stops_ttl_task(self):
        with patch.object(MultiAssetSpreadMonitor, "run", new=AsyncMock(
            side_effect=CsvLoggingError("simulated storage failure")
        )):
            with self.assertRaises(CsvLoggingError):
                await self.engine.run()
        self.assertIsNone(self.engine.order_manager._monitor_task)

    async def test_write_failure_during_shutdown_is_not_swallowed(self):
        started = asyncio.Event()

        async def fake_feed(monitor):
            started.set()
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                raise CsvLoggingError("simulated final write failed") from None

        with patch.object(MultiAssetSpreadMonitor, "run", fake_feed):
            task = asyncio.create_task(self.engine.run())
            await asyncio.wait_for(started.wait(), 1)
            task.cancel()
            with self.assertRaisesRegex(CsvLoggingError, "final write failed"):
                await task
        self.assertIsNone(self.engine.order_manager._monitor_task)

    async def test_timed_runner_releases_file_after_final_rows(self):
        other_path = Path(self.temp.name) / "timed.csv"

        async def fake_feed(monitor):
            await monitor.evaluate_order_book(book())
            await monitor.evaluate_order_book(book("ETH", "3000", "3000.6"))
            await monitor.evaluate_order_book(book("SOL", "150", "150.03"))
            await asyncio.Event().wait()

        with patch.object(MultiAssetSpreadMonitor, "run", fake_feed):
            self.assertEqual(await run_engine(0.05, other_path), 0)
        # A fresh lock can be acquired after timed shutdown; previous rows remain.
        async with AsyncCsvLogger(other_path):
            with other_path.open(newline="") as stream:
                self.assertEqual(len(list(csv.DictReader(stream))), 3)

    async def test_header_rejected_before_feed_start(self):
        bad_path = Path(self.temp.name) / "wrong.csv"
        bad_path.write_text("wrong,header\n")
        with patch.object(MultiAssetSpreadMonitor, "run", new_callable=AsyncMock) as feed:
            with self.assertRaises(CsvLoggingError):
                await run_engine(0.01, bad_path)
            feed.assert_not_awaited()
        self.assertEqual(bad_path.read_text(), "wrong,header\n")


if __name__ == "__main__":
    unittest.main()