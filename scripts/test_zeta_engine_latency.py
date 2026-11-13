"""Offline integration checks: synthetic timestamps/books and temporary CSVs."""

import asyncio
from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, Mock, patch

from zeta_csv_logger import AsyncCsvLogger, CsvLoggingError
from zeta_master_engine import ZetaMasterEngine, run_engine
from zeta_spread_monitor import MultiAssetSpreadMonitor


def book(bid="100", ask="100.02", coin="BTC"):
    return {"coin": coin, "levels": [
        [{"px": bid, "sz": "1"}], [{"px": ask, "sz": "2"}],
    ]}


class TestEngineLatency(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = Path(temp.name) / "ticks.csv"
        self.logger = await self.enterAsyncContext(AsyncCsvLogger(self.path))
        self.clock = Mock(return_value=0)
        self.timer = Mock()
        self.engine = ZetaMasterEngine(
            self.logger, clock=self.clock, latency_clock=self.timer,
        )
        self.addAsyncCleanup(self.engine.order_manager.stop_monitoring)

    async def test_receipt_before_parsing_and_boundaries_preserve_pipeline(self):
        events = []
        boundaries = iter([("T0", 1000), ("T1", 5000), ("T2", 9000)])

        def timer():
            label, value = next(boundaries)
            events.append(label)
            return value

        self.timer.side_effect = timer
        self.clock.side_effect = lambda: events.append("monotonic") or 0
        original_parse = json.loads
        original_append = self.logger.append
        original_register = self.engine.order_manager.register_order

        def parse(*args, **kwargs):
            events.append("parse")
            return original_parse(*args, **kwargs)

        async def append(row):
            events.append("csv-start")
            await original_append(row)
            events.append("csv-done")

        async def register(**kwargs):
            events.append("register-start")
            order = await original_register(**kwargs)
            events.append("register-done")
            return order

        with patch("zeta_spread_monitor.json.loads", side_effect=parse), patch.object(
            self.logger, "append", side_effect=append,
        ), patch.object(self.engine.order_manager, "register_order", side_effect=register):
            await self.engine.handle_message(json.dumps({"channel": "l2Book", "data": book()}))

        self.assertEqual(events[:6], [
            "T0", "parse", "csv-start", "csv-done", "monotonic", "T1",
        ])
        self.assertGreater(events.index("register-start"), events.index("T1"))
        self.assertEqual(events[-2:], ["register-done", "T2"])
        self.assertEqual(self.timer.call_count, 3)
        stats = self.engine.profiler.summary()
        self.assertEqual(stats["evaluation"].p50_us, 4)
        self.assertEqual(stats["dispatch"].p50_us, 8)
        self.assertEqual(self.logger.rows_written, 1)

    async def test_nontrigger_cooldown_and_zero_spread_are_evaluation_samples(self):
        self.timer.side_effect = range(0, 20_000, 1000)
        self.assertIsNone(await self.engine.evaluate_order_book(book(ask="100.019999")))
        self.assertIsNotNone(await self.engine.evaluate_order_book(book()))
        self.clock.return_value = 2.999
        self.assertIsNone(await self.engine.evaluate_order_book(book()))
        self.assertIsNone(await self.engine.evaluate_order_book(book(ask="100")))
        self.clock.return_value = 3
        self.assertIsNotNone(await self.engine.evaluate_order_book(book()))
        stats = self.engine.profiler.summary()
        self.assertEqual(stats["evaluation"].total_samples, 5)
        self.assertEqual(stats["dispatch"].total_samples, 2)
        self.assertEqual(self.logger.rows_written, 5)

    async def test_rejected_frames_and_books_do_not_record_timings(self):
        self.timer.side_effect = range(0, 20_000, 1000)
        for message in ("{broken", "[]", '{"channel":"pong"}'):
            await self.engine.handle_message(message)
        for data in (None, {}, book(coin="DOGE"), book(ask="NaN"),
                     book(ask="99"), {"coin": "BTC", "levels": []}):
            await self.engine.evaluate_order_book(data)
        self.assertEqual(self.engine.profiler.summary(), {
            "evaluation": None, "dispatch": None,
        })
        self.assertEqual(self.logger.rows_written, 0)

    async def test_storage_failure_has_no_completed_evaluation_or_dispatch(self):
        self.timer.return_value = 1000
        with patch.object(self.logger, "_append_sync", side_effect=OSError("disk failure")):
            with self.assertRaises(CsvLoggingError):
                await self.engine.evaluate_order_book(book())
        self.assertEqual(self.engine.profiler.summary(), {
            "evaluation": None, "dispatch": None,
        })
        self.assertEqual(await self.engine.order_manager.get_orders(), [])
        self.timer.assert_called_once()

    async def test_registration_failure_has_evaluation_but_no_dispatch(self):
        self.timer.side_effect = [1000, 3000]
        with patch.object(self.engine.order_manager, "register_order", new=AsyncMock(
            side_effect=RuntimeError("registration failed"),
        )):
            with self.assertRaisesRegex(RuntimeError, "registration failed"):
                await self.engine.evaluate_order_book(book())
        stats = self.engine.profiler.summary()
        self.assertEqual(stats["evaluation"].p50_us, 2)
        self.assertIsNone(stats["dispatch"])
        self.assertEqual(self.logger.rows_written, 1)

    async def test_interrupted_registration_does_not_record_dispatch(self):
        self.timer.side_effect = [1000, 3000]
        with patch.object(self.engine.order_manager, "register_order", new=AsyncMock(
            side_effect=asyncio.CancelledError,
        )):
            with self.assertRaises(asyncio.CancelledError):
                await self.engine.evaluate_order_book(book())
        self.assertIsNone(self.engine.profiler.summary()["dispatch"])
        self.assertEqual(self.engine.profiler.summary()["evaluation"].total_samples, 1)

    async def test_explicit_receipt_timestamp_and_report_preserve_samples(self):
        self.timer.side_effect = [5000, 9000]
        await self.engine.evaluate_order_book(book(), t0_ns=0)
        before = self.engine.profiler.summary()
        output = io.StringIO()
        with redirect_stdout(output):
            report = await self.engine.report()
        self.assertEqual(report["latency"], before)
        self.assertEqual(self.engine.profiler.summary(), before)
        self.assertEqual(before["evaluation"].max_us, 5)
        self.assertEqual(before["dispatch"].max_us, 9)
        self.assertIn("Lifetime samples: 1; retained window: 1", output.getvalue())

    async def test_standalone_monitor_has_no_profiling_overhead(self):
        monitor = MultiAssetSpreadMonitor(latency_clock=self.timer)
        await monitor.handle_message(json.dumps({"channel": "l2Book", "data": book()}))
        self.timer.assert_not_called()
        self.assertIsNone(monitor.profiler)

    async def test_timed_shutdown_prints_profile_without_live_feed(self):
        async def fake_feed(monitor):
            for coin in ("BTC", "ETH", "SOL"):
                await monitor.evaluate_order_book(book(coin=coin))
            await asyncio.Event().wait()

        output = io.StringIO()
        with patch.object(MultiAssetSpreadMonitor, "run", fake_feed), redirect_stdout(output):
            result = await run_engine(0.1, self.path.parent / "shutdown.csv")
        self.assertEqual(result, 0)
        self.assertIn("Zeta Local Latency Profile", output.getvalue())
        self.assertEqual(output.getvalue().count("Lifetime samples: 3; retained window: 3"), 2)


if __name__ == "__main__":
    unittest.main()