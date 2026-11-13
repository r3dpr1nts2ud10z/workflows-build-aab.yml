"""Serialized, off-loop CSV writes with backpressure and cancellation-safe flushing."""

import asyncio
import csv
from datetime import datetime, timezone
import fcntl
from pathlib import Path


DEFAULT_CSV_PATH = Path(__file__).resolve().parent.parent / "data/zeta_spread_ticks.csv"
CSV_HEADERS = [
    "timestamp_iso", "timestamp_ms", "coin", "best_bid", "best_ask",
    "spread_usd", "spread_bps", "bid_size_top", "ask_size_top",
]


class CsvLoggingError(RuntimeError):
    """Fatal storage failure; must not be treated as a reconnectable feed error."""


def tick_row(coin, bid, ask, spread, spread_bps, bid_size, ask_size):
    """UTC local receipt time, not the exchange's event timestamp."""
    now = datetime.now(timezone.utc)
    since_epoch = now - datetime(1970, 1, 1, tzinfo=timezone.utc)
    timestamp_ms = (
        (since_epoch.days * 86400 + since_epoch.seconds) * 1000
        + since_epoch.microseconds // 1000
    )
    return [
        now.isoformat(), str(timestamp_ms), coin,
        str(bid), str(ask), str(spread), str(spread_bps),
        str(bid_size), str(ask_size),
    ]


class AsyncCsvLogger:
    """One awaited write at a time, rather than an unbounded background queue.

    Flushes each row before accepting the next. Cancellation waits for the
    active disk operation in the original event loop. Flush isn't a guarantee
    against power loss or forced process termination.
    """

    def __init__(self, path=DEFAULT_CSV_PATH):
        self.path = Path(path)
        self.rows_written = 0
        self._file = None
        self._writer = None
        self._lock = asyncio.Lock()

    def _guarded_call(self, function, *args):
        try:
            return function(*args)
        except (OSError, csv.Error, UnicodeError) as error:
            raise CsvLoggingError(f"CSV operation failed at {self.path}: {error}") from error

    async def _io(self, function, *args):
        task = asyncio.create_task(asyncio.to_thread(self._guarded_call, function, *args))
        try:
            return await asyncio.shield(task)
        except asyncio.CancelledError:
            # Do not close the file or loop while its worker thread is writing.
            await task
            raise

    def _initialize_sync(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._file = self.path.open("a+", newline="", encoding="utf-8")
        try:
            # Refuse a second recorder writing this file concurrently.
            fcntl.flock(self._file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            self._file.seek(0)
            headers = next(csv.reader(self._file), None)
            if headers is not None and headers != CSV_HEADERS:
                raise CsvLoggingError(
                    f"Incompatible CSV header at {self.path}; file left unchanged. "
                    "Use --csv-path to select a new file."
                )
            self._file.seek(0, 2)
            end = self._file.tell()
            if end:
                # Avoid merging a new row into an interrupted/unterminated row.
                self._file.seek(end - 1)
                if self._file.read(1) not in ("\n", "\r"):
                    raise CsvLoggingError(
                        f"CSV at {self.path} has an unterminated last row; file left unchanged."
                    )
                self._file.seek(0, 2)
            self._writer = csv.writer(self._file)
            if headers is None:
                self._writer.writerow(CSV_HEADERS)
                self._file.flush()
        except BaseException:
            self._close_sync()
            raise

    def _append_sync(self, row):
        if self._file is None:
            raise CsvLoggingError("CSV logger is not open.")
        if len(row) != len(CSV_HEADERS):
            raise CsvLoggingError("CSV row does not match the expected schema.")
        self._writer.writerow(row)
        self._file.flush()
        self.rows_written += 1

    async def append(self, row):
        async with self._lock:
            await self._io(self._append_sync, row)

    def _close_sync(self):
        if self._file is not None:
            try:
                self._file.close()
            finally:
                self._file = None
                self._writer = None

    async def __aenter__(self):
        try:
            await self._io(self._initialize_sync)
        except BaseException:
            await self._io(self._close_sync)
            raise
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        async with self._lock:
            await self._io(self._close_sync)