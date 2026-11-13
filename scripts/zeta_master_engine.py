"""Public market data + CSV recording + simulated orders. No live execution."""

import argparse
import asyncio
from collections import Counter
from decimal import Decimal
import logging
import math
import time

from zeta_csv_logger import AsyncCsvLogger, CsvLoggingError, DEFAULT_CSV_PATH
from zeta_latency_profiler import LatencyProfiler
from zeta_order_manager import ZetaOrderManager
from zeta_spread_monitor import MultiAssetSpreadMonitor, TARGET_COINS


LOGGER = logging.getLogger(__name__)
DEFAULT_ORDER_TTL = 4.0
SIMULATED_SIZES = {
    "BTC": Decimal("0.001"),
    "ETH": Decimal("0.01"),
    "SOL": Decimal("0.1"),
}


class ZetaMasterEngine(MultiAssetSpreadMonitor):
    """Reuses validated feeds, decimal signals, CSV writes, and order state.

    The only cancellation callback is a local simulation. No testnet execution
    engine or wallet code is imported. Order sizes/prices are theoretical, not
    exchange-validated, and no fill or profit model is implemented.
    """

    def __init__(self, csv_logger, *, clock=time.monotonic,
                 latency_clock=time.perf_counter_ns):
        super().__init__(
            clock=clock, csv_logger=csv_logger,
            profiler=LatencyProfiler(), latency_clock=latency_clock,
        )
        self.simulated_oid_counter = 1000
        self.order_manager = ZetaOrderManager(
            default_ttl_seconds=DEFAULT_ORDER_TTL,
            check_interval_seconds=0.2,
            cancel_callback=self._execute_simulated_cancel,
            clock=clock,
        )

    @staticmethod
    async def _execute_simulated_cancel(coin, oid):
        await asyncio.sleep(0.05)
        LOGGER.info("[SIMULATED CANCEL] %s %s; no exchange request.", coin, oid)
        return True

    async def evaluate_order_book(self, data, *, t0_ns=None):
        if t0_ns is None:
            t0_ns = self.latency_clock()
        # Every valid book is persisted before the inherited threshold/cooldown
        # logic returns a signal. Storage failures prevent simulated registration.
        signal = await super().evaluate_order_book(data, t0_ns=t0_ns)
        if signal is None:
            return None
        coin = signal["coin"]
        theoretical_price = signal["price"] + signal["spread"] * Decimal("0.1")
        self.simulated_oid_counter += 1
        order = await self.order_manager.register_order(
            oid=f"SIM-{self.simulated_oid_counter}",
            coin=coin,
            is_buy=True,
            price=theoretical_price,
            size=SIMULATED_SIZES[coin],
            ttl_seconds=DEFAULT_ORDER_TTL,
        )
        # T2: successful local registration, NOT exchange dispatch or execution.
        self.profiler.record_dispatch(t0_ns, self.latency_clock())
        LOGGER.info(
            "[SIMULATED ORDER] %s BUY %s %s @ $%s | 10%% inside observed spread "
            "| TTL=%ss | NOT tick-validated; NO ORDER SENT",
            order.oid, order.size, coin, order.price, order.ttl_seconds,
        )
        return order

    async def run(self):
        LOGGER.info(
            "ZETA combined simulation: public feeds + CSV + local order states. "
            "No keys, signing, or trading API calls."
        )
        LOGGER.info(
            "Theoretical sizes: BTC=0.001, ETH=0.01, SOL=0.1 | TTL=4s | "
            "No automatic fill simulation or profit calculation."
        )
        ttl_task = self.order_manager.start_monitoring()
        feed_task = asyncio.create_task(super().run(), name="zeta-public-feed")
        try:
            # A failed TTL task must not leave the feed creating unmonitored
            # simulated orders. A feed/storage failure also stops TTL monitoring.
            done, _ = await asyncio.wait(
                (feed_task, ttl_task), return_when=asyncio.FIRST_COMPLETED,
            )
            for task in done:
                task.result()
            raise RuntimeError("A combined-engine background task stopped unexpectedly.")
        finally:
            feed_task.cancel()
            # Await cancellation-safe CSV writes inside the feed before closing
            # the writer in run_engine's original event loop.
            results = await asyncio.gather(feed_task, return_exceptions=True)
            try:
                await self.order_manager.stop_monitoring()
            finally:
                # A disk error while draining a cancelled write is still fatal,
                # not a successful timed shutdown.
                if isinstance(results[0], Exception):
                    raise results[0]

    async def report(self):
        orders = await self.order_manager.get_orders()
        active = await self.order_manager.get_active_orders()
        statuses = dict(Counter(order.status.value for order in orders))
        summary = {
            "updates": dict(self.updates_by_coin),
            "csv_rows": self.csv_logger.rows_written,
            "simulated_orders": len(orders),
            "statuses": statuses,
            "active_simulated_orders": len(active),
            "latency": self.profiler.summary(),
        }
        LOGGER.info(
            "Summary: CSV rows=%s | simulated orders=%s | states=%s | "
            "active simulated orders=%s | REAL orders submitted=0",
            summary["csv_rows"], len(orders), statuses, len(active),
        )
        for coin in TARGET_COINS:
            LOGGER.info("%s: %s valid books; %s signals.",
                        coin, self.updates_by_coin[coin], self.previews_by_coin[coin])
        if active:
            LOGGER.info(
                "Remaining simulated states were not automatically marked closed. "
                "They are in-memory only and will be discarded on process exit."
            )
        LOGGER.info(
            "Latency includes awaited CSV persistence before the trigger decision; "
            "dispatch means local simulated registration only."
        )
        self.profiler.print_summary()
        return summary


async def run_engine(duration=None, csv_path=DEFAULT_CSV_PATH):
    async with AsyncCsvLogger(csv_path) as csv_logger:
        engine = ZetaMasterEngine(csv_logger)
        LOGGER.info("CSV destination: %s | UTC receipt timestamps.", csv_logger.path)
        try:
            if duration is None:
                await engine.run()
            else:
                deadline = asyncio.timeout(duration)
                try:
                    async with deadline:
                        await engine.run()
                except TimeoutError:
                    if not deadline.expired():
                        raise
                    LOGGER.info("Requested monitoring duration reached.")
        finally:
            summary = await engine.report()
        missing = [coin for coin, count in summary["updates"].items() if not count]
        if missing:
            LOGGER.error("No valid books received for: %s", ", ".join(missing))
            return 1
        return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--duration", type=float, help="Stop after this many seconds.")
    parser.add_argument("--csv-path", default=DEFAULT_CSV_PATH,
                        help="CSV destination (default: project data/zeta_spread_ticks.csv).")
    args = parser.parse_args(argv)
    if args.duration is not None and (not math.isfinite(args.duration) or args.duration <= 0):
        parser.error("--duration must be finite and positive")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    try:
        return asyncio.run(run_engine(args.duration, args.csv_path))
    except KeyboardInterrupt:
        LOGGER.info("Combined simulation stopped.")
        return 0
    except CsvLoggingError as error:
        LOGGER.error("Recording stopped: %s", error)
        return 1
    except Exception as error:
        LOGGER.error("Combined simulation failed (%s): %s", type(error).__name__, error)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())