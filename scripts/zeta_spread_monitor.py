"""Read-only BTC, ETH, and SOL spread alerts and CSV logging. No orders or keys."""

import argparse
import asyncio
from contextlib import suppress
from decimal import Decimal, InvalidOperation
import json
import logging
import math
import time

import websockets
from zeta_csv_logger import AsyncCsvLogger, CsvLoggingError, DEFAULT_CSV_PATH, tick_row


MAINNET_WS_URL = "wss://api.hyperliquid.xyz/ws"
TARGET_COINS = ("BTC", "ETH", "SOL")
SPREAD_TRIGGER_PCT = Decimal("0.02")  # Percentage points: 0.02% = 2 basis points.
COOLDOWN_SECONDS = 3.0
LOGGER = logging.getLogger(__name__)


class MultiAssetSpreadMonitor:
    def __init__(self, clock=time.monotonic, csv_logger=None, *,
                 profiler=None, latency_clock=time.perf_counter_ns):
        self.clock = clock
        self.csv_logger = csv_logger
        self.profiler = profiler
        self.latency_clock = latency_clock
        self.last_trigger_times = {coin: None for coin in TARGET_COINS}
        self.updates_by_coin = {coin: 0 for coin in TARGET_COINS}
        self.previews_by_coin = {coin: 0 for coin in TARGET_COINS}
        self.book_updates = 0
        self.preview_count = 0

    def _record_evaluation(self, t0_ns):
        if self.profiler is not None and t0_ns is not None:
            self.profiler.record_eval(t0_ns, self.latency_clock())

    async def evaluate_order_book(self, data, *, t0_ns=None):
        if self.profiler is not None and t0_ns is None:
            # Direct callers have no receipt boundary; measure from method entry.
            t0_ns = self.latency_clock()
        if not isinstance(data, dict):
            return None
        coin = data.get("coin")
        if coin not in TARGET_COINS:
            return None
        try:
            levels = data["levels"]
            if not isinstance(levels, list) or len(levels) != 2:
                raise ValueError("Expected bid and ask arrays")
            bids, asks = levels
            if not isinstance(bids, list) or not isinstance(asks, list):
                raise ValueError("Expected bid and ask arrays")
            if not bids or not asks:
                return None
            best_bid = Decimal(str(bids[0]["px"]))
            best_ask = Decimal(str(asks[0]["px"]))
            bid_size = Decimal(str(bids[0]["sz"]))
            ask_size = Decimal(str(asks[0]["sz"]))
            if not all(p.is_finite() and p > 0 for p in (best_bid, best_ask)):
                raise ValueError("Invalid price")
            if not all(s.is_finite() and s > 0 for s in (bid_size, ask_size)):
                raise ValueError("Invalid top-level size")
            if best_ask < best_bid:
                raise ValueError("Crossed book")
        except (KeyError, IndexError, TypeError, ValueError, InvalidOperation):
            LOGGER.warning("Skipping malformed %s order book.", coin)
            return None

        self.book_updates += 1
        self.updates_by_coin[coin] += 1
        spread = best_ask - best_bid
        spread_pct = spread / best_bid * Decimal("100")
        if self.csv_logger is not None:
            # Log every valid update, including books below the alert threshold
            # and those suppressed by cooldown. Awaiting applies backpressure.
            await self.csv_logger.append(tick_row(
                coin, best_bid, best_ask, spread,
                spread / best_bid * Decimal("10000"), bid_size, ask_size,
            ))
        if self.updates_by_coin[coin] == 1:
            LOGGER.info("Live %s book | bid=$%s | ask=$%s | spread=$%s (%s%%)",
                        coin, best_bid, best_ask, spread, spread_pct)
        # Compare without rounding or division near the threshold.
        if spread * Decimal("100") < SPREAD_TRIGGER_PCT * best_bid:
            self._record_evaluation(t0_ns)
            return None
        now = self.clock()
        last_time = self.last_trigger_times[coin]
        if last_time is not None and now - last_time < COOLDOWN_SECONDS:
            self._record_evaluation(t0_ns)
            return None
        # T1: the threshold/cooldown decision is complete. CSV persistence above
        # remains in the measured path; no pipeline steps are moved for timing.
        self._record_evaluation(t0_ns)
        self.last_trigger_times[coin] = now
        self.preview_count += 1
        self.previews_by_coin[coin] += 1
        # Reuse the observed bid, not a guessed tick increment. This is NOT an
        # executable quote or guarantee of acceptance, fill, or profitability.
        preview = {"coin": coin, "price": best_bid,
                   "spread": spread, "spread_pct": spread_pct}
        LOGGER.info(
            "[DRY RUN] %s spread=%s%% ($%s) >= %s%% | preview maker bid "
            "@ observed bid $%s | ALO intent only | NO ORDER SENT",
            coin, spread_pct, spread, SPREAD_TRIGGER_PCT, best_bid,
        )
        return preview

    async def handle_message(self, message):
        # Called immediately after recv(), with no intervening awaited work.
        # Capture before JSON parsing, using the same clock as T1 and T2.
        t0_ns = self.latency_clock() if self.profiler is not None else None
        try:
            payload = json.loads(message, parse_float=Decimal)
        except (json.JSONDecodeError, UnicodeDecodeError):
            LOGGER.warning("Skipping invalid JSON message.")
            return
        if not isinstance(payload, dict):
            LOGGER.warning("Skipping non-object message.")
            return
        channel = payload.get("channel")
        if channel == "l2Book":
            await self.evaluate_order_book(payload.get("data"), t0_ns=t0_ns)
        elif channel == "subscriptionResponse":
            LOGGER.info("Server confirmed subscription: %s", payload.get("data"))
        elif channel == "error":
            raise RuntimeError("Feed returned a subscription error.")

    @staticmethod
    async def keep_alive(ws):
        while True:
            await asyncio.sleep(20)
            try:
                await ws.send(json.dumps({"method": "ping"}))
            except (OSError, websockets.WebSocketException):
                await ws.close()
                return

    @staticmethod
    async def subscribe(ws):
        for coin in TARGET_COINS:
            await ws.send(json.dumps({
                "method": "subscribe",
                "subscription": {"type": "l2Book", "coin": coin},
            }))
            LOGGER.info("Requested %s l2Book subscription.", coin)

    async def run(self):
        backoff = 1
        LOGGER.info("Read-only mainnet feeds: %s; no wallet or execution engine.",
                    ", ".join(TARGET_COINS))
        LOGGER.info("Trigger >= %s%% of best bid; independent %ss cooldowns. "
                    "A spread signal is not a profit guarantee.",
                    SPREAD_TRIGGER_PCT, COOLDOWN_SECONDS)
        while True:
            try:
                async with websockets.connect(
                    MAINNET_WS_URL, open_timeout=15, close_timeout=3,
                    ping_interval=20, ping_timeout=20,
                ) as ws:
                    await self.subscribe(ws)
                    ping_task = asyncio.create_task(self.keep_alive(ws))
                    try:
                        while True:
                            message = await asyncio.wait_for(ws.recv(), timeout=65)
                            await self.handle_message(message)
                            backoff = 1
                    finally:
                        ping_task.cancel()
                        with suppress(asyncio.CancelledError):
                            await ping_task
            except (OSError, TimeoutError, websockets.WebSocketException) as error:
                LOGGER.warning("Feed disconnected (%s); reconnecting in %ss.",
                               type(error).__name__, backoff)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 60)


async def _run_with_logger(duration, csv_logger):
    monitor = MultiAssetSpreadMonitor(csv_logger=csv_logger)
    LOGGER.info("CSV destination: %s | UTC receipt timestamps.", csv_logger.path)
    try:
        if duration is None:
            await monitor.run()
        else:
            try:
                async with asyncio.timeout(duration):
                    await monitor.run()
            except TimeoutError:
                LOGGER.info("Requested monitoring duration reached.")
    finally:
        LOGGER.info("Summary: %s valid books; %s dry-run previews; 0 orders submitted.",
                    monitor.book_updates, monitor.preview_count)
        LOGGER.info("CSV: %s rows written this run.", csv_logger.rows_written)
        for coin in TARGET_COINS:
            LOGGER.info("%s: %s valid books; %s dry-run previews.",
                        coin, monitor.updates_by_coin[coin], monitor.previews_by_coin[coin])
        missing = [coin for coin, count in monitor.updates_by_coin.items() if not count]
        if missing:
            LOGGER.warning("No valid books received for: %s", ", ".join(missing))
    return 0 if not missing else 1


async def run_monitor(duration, csv_path=DEFAULT_CSV_PATH):
    async with AsyncCsvLogger(csv_path) as csv_logger:
        return await _run_with_logger(duration, csv_logger)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--duration", type=float, help="Stop after this many seconds.")
    parser.add_argument("--csv-path", default=DEFAULT_CSV_PATH,
                        help="Append tick data here (default: project data/zeta_spread_ticks.csv).")
    args = parser.parse_args()
    if args.duration is not None and (not math.isfinite(args.duration) or args.duration <= 0):
        parser.error("--duration must be finite and positive")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    try:
        return asyncio.run(run_monitor(args.duration, args.csv_path))
    except KeyboardInterrupt:
        LOGGER.info("Monitor stopped.")
        return 0
    except CsvLoggingError as error:
        LOGGER.error("Recording stopped: %s", error)
        return 1
    except Exception as error:
        LOGGER.error("Monitor failed (%s).", type(error).__name__)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())