"""Offline CSV persistence and shutdown tests; no network or wallet access."""

import asyncio
import csv
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

from zeta_csv_logger import AsyncCsvLogger, CSV_HEADERS, CsvLoggingError
from zeta_spread_monitor import MultiAssetSpreadMonitor, run_monitor


def book(coin="BTC", bid="80000.00", ask="80016.00", size="1.234567890123456789"):
    return {"coin": coin, "levels": [
        [{"px": bid, "sz": size}], [{"px": ask, "sz": "2.00000001"}],
    ]}


class TestCsvLogger(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "nested" / "ticks.csv"

    def rows(self):
        with self.path.open(newline="", encoding="utf-8") as stream:
            return list(csv.DictReader(stream))

    async def test_exact_decimals_utc_and_basis_points(self):
        async with AsyncCsvLogger(self.path) as logger:
            monitor = MultiAssetSpreadMonitor(csv_logger=logger)
            await monitor.evaluate_order_book(book())
            self.assertEqual(logger.rows_written, 1)
        row, = self.rows()
        self.assertEqual(list(row), CSV_HEADERS)
        self.assertEqual(row["best_bid"], "80000.00")
        self.assertEqual(row["best_ask"], "80016.00")
        self.assertEqual(row["bid_size_top"], "1.234567890123456789")
        self.assertEqual(row["ask_size_top"], "2.00000001")
        self.assertEqual(Decimal(row["spread_usd"]), Decimal("16"))
        self.assertEqual(Decimal(row["spread_bps"]), Decimal("2"))
        timestamp = datetime.fromisoformat(row["timestamp_iso"])
        self.assertEqual(timestamp.utcoffset().total_seconds(), 0)
        delta = timestamp - datetime(1970, 1, 1, tzinfo=timezone.utc)
        self.assertEqual(int(row["timestamp_ms"]),
                         (delta.days * 86400 + delta.seconds) * 1000 + delta.microseconds // 1000)

    async def test_logs_below_threshold_and_during_cooldown(self):
        async with AsyncCsvLogger(self.path) as logger:
            monitor = MultiAssetSpreadMonitor(clock=lambda: 0, csv_logger=logger)
            await monitor.evaluate_order_book(book(ask="80001"))
            await monitor.evaluate_order_book(book())
            await monitor.evaluate_order_book(book())
            self.assertEqual(monitor.preview_count, 1)
            self.assertEqual(logger.rows_written, 3)
        self.assertEqual(len(self.rows()), 3)

    async def test_restart_appends_without_duplicate_header(self):
        for _ in range(2):
            async with AsyncCsvLogger(self.path) as logger:
                await MultiAssetSpreadMonitor(csv_logger=logger).evaluate_order_book(book())
        with self.path.open(newline="") as stream:
            rows = list(csv.reader(stream))
        self.assertEqual(rows[0], CSV_HEADERS)
        self.assertEqual(rows.count(CSV_HEADERS), 1)
        self.assertEqual(len(rows), 3)

    async def test_empty_file_is_initialized(self):
        self.path.parent.mkdir()
        self.path.touch()
        async with AsyncCsvLogger(self.path):
            pass
        with self.path.open(newline="") as stream:
            self.assertEqual(list(csv.reader(stream)), [CSV_HEADERS])

    async def test_mismatched_header_is_rejected_without_modification(self):
        self.path.parent.mkdir()
        original = "other,format\nkeep,this\n"
        self.path.write_text(original)
        with self.assertRaises(CsvLoggingError):
            async with AsyncCsvLogger(self.path):
                self.fail("Must reject mismatched CSV")
        self.assertEqual(self.path.read_text(), original)

    async def test_incomplete_last_line_is_rejected_without_modification(self):
        self.path.parent.mkdir()
        original = ",".join(CSV_HEADERS) + "\npartial,row"
        self.path.write_text(original)
        with self.assertRaises(CsvLoggingError):
            async with AsyncCsvLogger(self.path):
                self.fail("Must reject partial final line")
        self.assertEqual(self.path.read_text(), original)

    async def test_second_recorder_cannot_write_same_file(self):
        async with AsyncCsvLogger(self.path) as first:
            with self.assertRaises(CsvLoggingError):
                async with AsyncCsvLogger(self.path):
                    self.fail("Must reject concurrent recorder")
            await MultiAssetSpreadMonitor(csv_logger=first).evaluate_order_book(book())
        self.assertEqual(len(self.rows()), 1)

    async def test_invalid_prices_sizes_and_shapes_write_no_rows(self):
        invalid = [None, {}, {"coin": "BTC", "levels": [None, None]},
                   book(bid="0"), book(ask="NaN"), book(ask="79999")]
        for size in ("NaN", "Infinity", "-1", "0", "bad", None):
            invalid.append(book(size=size))
        missing_size = book()
        del missing_size["levels"][0][0]["sz"]
        invalid.append(missing_size)
        async with AsyncCsvLogger(self.path) as logger:
            monitor = MultiAssetSpreadMonitor(csv_logger=logger)
            for data in invalid:
                await monitor.evaluate_order_book(data)
            self.assertEqual(logger.rows_written, 0)
        self.assertEqual(self.rows(), [])

    async def test_disk_failure_is_fatal_not_network_reconnect(self):
        async with AsyncCsvLogger(self.path) as logger:
            monitor = MultiAssetSpreadMonitor(csv_logger=logger)
            with patch.object(logger, "_append_sync", side_effect=OSError("disk full")):
                with self.assertRaisesRegex(CsvLoggingError, "disk full"):
                    await monitor.evaluate_order_book(book())
            self.assertEqual(logger.rows_written, 0)

    async def test_cancellation_waits_for_in_progress_write(self):
        started = threading.Event()
        release = threading.Event()
        async with AsyncCsvLogger(self.path) as logger:
            original_append = logger._append_sync

            def slow_append(row):
                started.set()
                if not release.wait(timeout=5):
                    raise RuntimeError("Test did not release the writer")
                original_append(row)

            with patch.object(logger, "_append_sync", side_effect=slow_append):
                task = asyncio.create_task(
                    MultiAssetSpreadMonitor(csv_logger=logger).evaluate_order_book(book())
                )
                try:
                    self.assertTrue(await asyncio.to_thread(started.wait, 2))
                    task.cancel()
                    await asyncio.sleep(0)
                    self.assertFalse(task.done())
                finally:
                    release.set()
                    with self.assertRaises(asyncio.CancelledError):
                        await task
            self.assertEqual(logger.rows_written, 1)
        self.assertEqual(len(self.rows()), 1)

    async def test_all_assets_record_through_run_entrypoint(self):
        async def synthetic_feed(monitor):
            await monitor.evaluate_order_book(book())
            await monitor.evaluate_order_book(book("ETH", "3000", "3000.60"))
            await monitor.evaluate_order_book(book("SOL", "150", "150.03"))

        with patch.object(MultiAssetSpreadMonitor, "run", synthetic_feed):
            self.assertEqual(await run_monitor(None, self.path), 0)
        self.assertEqual([row["coin"] for row in self.rows()], ["BTC", "ETH", "SOL"])

    async def test_broken_storage_returns_failure_from_cli(self):
        from zeta_spread_monitor import main

        self.path.parent.mkdir()
        self.path.write_text("wrong,header\n")
        # The CLI owns asyncio.run, so invoke it outside this test's event loop.
        with patch("sys.argv", ["monitor", "--csv-path", str(self.path), "--duration", "1"]):
            self.assertEqual(await asyncio.to_thread(main), 1)


if __name__ == "__main__":
    unittest.main()