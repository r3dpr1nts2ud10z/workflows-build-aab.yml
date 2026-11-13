"""Synthetic feed tests; no credentials or external requests."""

import unittest
import json
from unittest.mock import AsyncMock, Mock
from decimal import Decimal

from zeta_spread_monitor import MultiAssetSpreadMonitor, TARGET_COINS


def book(bid="80000", ask="80016", coin="BTC"):
    return {"coin": coin, "levels": [[{"px": bid, "sz": "1.25"}],
                                    [{"px": ask, "sz": "2.5"}]]}


class TestSpreadMonitor(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.clock = Mock(return_value=0)
        self.monitor = MultiAssetSpreadMonitor(clock=self.clock)

    async def test_exact_threshold_previews_observed_bid(self):
        result = await self.monitor.evaluate_order_book(book())
        self.assertEqual(result["price"], Decimal("80000"))
        self.assertEqual(result["spread"], Decimal("16"))
        self.assertEqual(result["spread_pct"], Decimal("0.02"))

    async def test_below_threshold_not_rounded_up(self):
        self.assertIsNone(await self.monitor.evaluate_order_book(book(ask="80015.999")))
        self.assertEqual(self.monitor.preview_count, 0)

    async def test_cooldown_uses_monotonic_time(self):
        await self.monitor.evaluate_order_book(book())
        self.clock.return_value = 2.99
        self.assertIsNone(await self.monitor.evaluate_order_book(book()))
        self.clock.return_value = 3
        self.assertIsNotNone(await self.monitor.evaluate_order_book(book()))
        self.assertEqual(self.monitor.preview_count, 2)

    async def test_other_coin_is_ignored(self):
        self.assertIsNone(await self.monitor.evaluate_order_book(book(coin="DOGE")))
        self.assertEqual(self.monitor.book_updates, 0)

    async def test_each_asset_uses_same_percentage(self):
        for coin, bid, ask, below in (
            ("BTC", "80000", "80016", "80015.999"),
            ("ETH", "3000", "3000.6", "3000.599"),
            ("SOL", "150", "150.03", "150.0299"),
        ):
            with self.subTest(coin=coin):
                self.assertIsNone(await self.monitor.evaluate_order_book(book(bid, below, coin)))
                result = await self.monitor.evaluate_order_book(book(bid, ask, coin))
                self.assertEqual(result["coin"], coin)
                self.assertEqual(result["spread_pct"], Decimal("0.02"))
                self.assertEqual(self.monitor.updates_by_coin[coin], 2)
                self.assertEqual(self.monitor.previews_by_coin[coin], 1)

    async def test_cooldowns_are_independent_per_asset(self):
        await self.monitor.evaluate_order_book(book())
        self.clock.return_value = 1
        self.assertIsNotNone(await self.monitor.evaluate_order_book(book("3000", "3001", "ETH")))
        self.assertIsNotNone(await self.monitor.evaluate_order_book(book("150", "150.1", "SOL")))
        self.assertIsNone(await self.monitor.evaluate_order_book(book()))
        self.clock.return_value = 3
        self.assertIsNotNone(await self.monitor.evaluate_order_book(book()))
        self.assertIsNone(await self.monitor.evaluate_order_book(book("3000", "3001", "ETH")))
        self.assertEqual(self.monitor.previews_by_coin, {"BTC": 2, "ETH": 1, "SOL": 1})

    async def test_subscribes_to_all_assets_without_order_messages(self):
        ws = AsyncMock()
        await self.monitor.subscribe(ws)
        messages = [json.loads(call.args[0]) for call in ws.send.await_args_list]
        self.assertEqual(messages, [
            {"method": "subscribe", "subscription": {"type": "l2Book", "coin": coin}}
            for coin in TARGET_COINS
        ])

    async def test_empty_invalid_and_crossed_books_are_skipped(self):
        for data in (None, {}, {"coin": "BTC", "levels": []},
                     {"coin": "BTC", "levels": [[], []]},
                     {"coin": "BTC", "levels": [None, []]},
                     book(bid="NaN"), book(ask="Infinity"), book(bid="-1"), book(bid="0"),
                     book(bid="bad"), book(ask="79999")):
            with self.subTest(data=data):
                self.assertIsNone(await self.monitor.evaluate_order_book(data))
        self.assertEqual(self.monitor.preview_count, 0)

    async def test_bad_messages_do_not_stop_next_valid_book(self):
        await self.monitor.handle_message("{broken")
        await self.monitor.handle_message("[]")
        await self.monitor.handle_message('{"channel":"pong"}')
        await self.monitor.handle_message(
            '{"channel":"l2Book","data":{"coin":"BTC",'
            '"levels":[[{"px":"80000","sz":"1"}],[{"px":"80020","sz":"2"}]]}}'
        )
        self.assertEqual(self.monitor.preview_count, 1)

    async def test_subscription_error_is_explicit(self):
        with self.assertRaises(RuntimeError):
            await self.monitor.handle_message('{"channel":"error"}')


if __name__ == "__main__":
    unittest.main()