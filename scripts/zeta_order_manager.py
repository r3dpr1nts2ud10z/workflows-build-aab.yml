"""Standalone in-memory order simulation. No network, wallet, or exchange imports."""

import asyncio
from dataclasses import dataclass, field, replace
from decimal import Decimal, InvalidOperation
from enum import Enum
import logging
import math
import time
from typing import Awaitable, Callable


LOGGER = logging.getLogger(__name__)


class OrderStatus(Enum):
    PENDING_NEW = "PENDING_NEW"
    RESTING = "RESTING"
    PENDING_CANCEL = "PENDING_CANCEL"
    CANCEL_UNKNOWN = "CANCEL_UNKNOWN"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


TERMINAL = frozenset({OrderStatus.FILLED, OrderStatus.CANCELLED, OrderStatus.EXPIRED})
TRANSITIONS = {
    OrderStatus.PENDING_NEW: {OrderStatus.RESTING, OrderStatus.FILLED, OrderStatus.CANCELLED},
    OrderStatus.RESTING: {OrderStatus.FILLED, OrderStatus.CANCELLED},
    OrderStatus.PENDING_CANCEL: {OrderStatus.FILLED, OrderStatus.CANCELLED},
    OrderStatus.CANCEL_UNKNOWN: {OrderStatus.RESTING, OrderStatus.FILLED, OrderStatus.CANCELLED},
}


def positive_seconds(value, label):
    if isinstance(value, bool):
        raise ValueError(f"{label} must be finite and positive.")
    try:
        number = float(value)
    except (ValueError, TypeError, OverflowError):
        raise ValueError(f"{label} must be finite and positive.") from None
    if not math.isfinite(number) or number <= 0:
        raise ValueError(f"{label} must be finite and positive.")
    return number


def positive_decimal(value, label):
    try:
        number = Decimal(str(value))
    except InvalidOperation:
        raise ValueError(f"{label} must be a finite positive decimal.") from None
    if not number.is_finite() or number <= 0:
        raise ValueError(f"{label} must be a finite positive decimal.")
    return number


@dataclass(frozen=True)
class TrackedOrder:
    """Immutable snapshot: mutations must pass through the manager's lock."""

    oid: str
    coin: str
    is_buy: bool
    price: Decimal
    size: Decimal
    ttl_seconds: float
    status: OrderStatus
    created_at: float
    updated_at: float
    _created_monotonic: float = field(repr=False)
    _clock: Callable[[], float] = field(repr=False, compare=False)

    @property
    def age_seconds(self):
        return max(0.0, self._clock() - self._created_monotonic)

    @property
    def is_stale(self):
        return self.status == OrderStatus.RESTING and self.age_seconds >= self.ttl_seconds

    def to_dict(self):
        return {
            "oid": self.oid, "coin": self.coin, "side": "BUY" if self.is_buy else "SELL",
            "price": str(self.price), "size": str(self.size), "status": self.status.value,
            "age_seconds": round(self.age_seconds, 3), "created_at": self.created_at,
            "updated_at": self.updated_at, "ttl_seconds": self.ttl_seconds,
        }


class ZetaOrderManager:
    """Local simulation state, not exchange reconciliation or live risk control.

    Inject only simulated cancellation callbacks. True means a confirmed
    simulated cancel; False means a confirmed failure. Exceptions/timeouts are
    uncertain and require an explicit status update before another attempt.
    """

    def __init__(
        self, default_ttl_seconds=5.0, check_interval_seconds=0.5,
        cancel_callback: Callable[[str, str], Awaitable[bool]] | None = None,
        cancel_timeout_seconds=2.0, *, clock=time.monotonic, wall_clock=time.time,
    ):
        self.default_ttl = positive_seconds(default_ttl_seconds, "Default TTL")
        self.check_interval = positive_seconds(check_interval_seconds, "Check interval")
        self.cancel_timeout = positive_seconds(cancel_timeout_seconds, "Cancel timeout")
        if cancel_callback is not None and not callable(cancel_callback):
            raise ValueError("Cancel callback must be callable.")
        self.cancel_callback = cancel_callback
        self._clock, self._wall_clock = clock, wall_clock
        self._orders: dict[str, TrackedOrder] = {}
        self._lock = asyncio.Lock()
        self._monitor_task = None

    async def register_order(self, oid, coin, is_buy, price, size, ttl_seconds=None):
        """Register an explicitly acknowledged, simulated resting order."""
        if isinstance(oid, bool) or not isinstance(oid, (str, int)) or not str(oid).strip():
            raise ValueError("Order ID must be a non-empty string or integer.")
        if not isinstance(coin, str) or not coin.strip():
            raise ValueError("Coin must be non-empty.")
        if not isinstance(is_buy, bool):
            raise ValueError("is_buy must be a boolean.")
        ttl = positive_seconds(
            self.default_ttl if ttl_seconds is None else ttl_seconds, "Order TTL"
        )
        now = self._wall_clock()
        order = TrackedOrder(
            str(oid).strip(), coin.strip(), is_buy, positive_decimal(price, "Price"),
            positive_decimal(size, "Size"), ttl, OrderStatus.RESTING, now, now,
            self._clock(), self._clock,
        )
        async with self._lock:
            if order.oid in self._orders:
                raise ValueError(f"Order ID already registered: {order.oid}")
            self._orders[order.oid] = order
        LOGGER.info("[SIMULATION] Registered %s %s | TTL=%ss", order.coin, order.oid, ttl)
        return order

    async def get_order(self, oid):
        async with self._lock:
            return self._orders[str(oid)]

    async def get_active_orders(self):
        """Include pending/uncertain cancellations: they aren't confirmed closed."""
        async with self._lock:
            return [order for order in self._orders.values() if order.status not in TERMINAL]

    async def get_orders(self):
        """Return immutable snapshots for simulation reporting."""
        async with self._lock:
            return list(self._orders.values())

    def _replace_status(self, order, status):
        updated = replace(order, status=status, updated_at=self._wall_clock())
        self._orders[order.oid] = updated
        return updated

    async def update_order_status(self, oid, status):
        if not isinstance(status, OrderStatus):
            raise ValueError("Use an OrderStatus value.")
        async with self._lock:
            order = self._orders[str(oid)]
            if order.status == status:
                return order
            if status not in TRANSITIONS.get(order.status, set()):
                raise ValueError(f"Invalid transition: {order.status.value} -> {status.value}")
            updated = self._replace_status(order, status)
        LOGGER.info("[SIMULATION] %s -> %s", oid, status.value)
        return updated

    async def _finish_cancel(self, claimed, status):
        async with self._lock:
            # Identity changes on every transition. Never overwrite a fill or
            # other status received while the callback was awaiting a response.
            if self._orders.get(claimed.oid) is not claimed:
                return False
            self._replace_status(claimed, status)
            return True

    async def cancel_order(self, oid, reason="MANUAL_CANCEL"):
        async with self._lock:
            order = self._orders.get(str(oid))
            if order is None or order.status != OrderStatus.RESTING:
                return False
            if self.cancel_callback is None:
                LOGGER.warning("[SIMULATION] No cancel callback; %s remains RESTING.", oid)
                return False
            # Claim under the lock so manual and TTL cancellation can't duplicate.
            claimed = self._replace_status(order, OrderStatus.PENDING_CANCEL)
        try:
            async with asyncio.timeout(self.cancel_timeout):
                success = await self.cancel_callback(claimed.coin, claimed.oid)
            if type(success) is not bool:
                raise ValueError("Simulated callback must return a boolean.")
        except asyncio.CancelledError:
            await self._finish_cancel(claimed, OrderStatus.CANCEL_UNKNOWN)
            raise
        except Exception as error:
            await self._finish_cancel(claimed, OrderStatus.CANCEL_UNKNOWN)
            LOGGER.warning("[SIMULATION] Cancel outcome unknown for %s (%s); reconcile before retry.",
                           oid, type(error).__name__)
            return False
        status = (
            OrderStatus.EXPIRED if reason == "TTL_EXPIRED" else OrderStatus.CANCELLED
        ) if success else OrderStatus.RESTING
        applied = await self._finish_cancel(claimed, status)
        if applied:
            LOGGER.info("[SIMULATION] %s -> %s", oid, status.value)
        else:
            LOGGER.info("[SIMULATION] Ignored outdated cancel response for %s.", oid)
        return success and applied

    async def check_stale_orders(self):
        """One deterministic sweep; only confirmed cancels mark TTL expiry."""
        async with self._lock:
            stale = [order.oid for order in self._orders.values() if order.is_stale]
        for oid in stale:
            await self.cancel_order(oid, reason="TTL_EXPIRED")

    async def _stale_order_monitor_loop(self):
        while True:
            await asyncio.sleep(self.check_interval)
            await self.check_stale_orders()

    def start_monitoring(self):
        if self.cancel_callback is None:
            raise RuntimeError("Monitoring needs an explicit simulated cancellation callback.")
        if self._monitor_task is None or self._monitor_task.done():
            self._monitor_task = asyncio.create_task(self._stale_order_monitor_loop())
        return self._monitor_task

    async def stop_monitoring(self):
        if self._monitor_task is not None:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
            finally:
                self._monitor_task = None


async def simulated_exchange_cancel(coin, oid):
    LOGGER.info("[SIMULATED CALLBACK] Cancel %s %s; no exchange request.", coin, oid)
    await asyncio.sleep(0.1)
    return True


async def main():
    manager = ZetaOrderManager(default_ttl_seconds=3.0, cancel_callback=simulated_exchange_cancel)
    LOGGER.info("SIMULATION ONLY: no wallet, exchange connection, or real orders.")
    manager.start_monitoring()
    try:
        await manager.register_order("101", "BTC", True, "65000", "0.001", ttl_seconds=2)
        await manager.register_order("102", "ETH", False, "3500", "0.1", ttl_seconds=5)
        await asyncio.sleep(1)
        await manager.update_order_status("102", OrderStatus.FILLED)
        await asyncio.sleep(2)
    finally:
        await manager.stop_monitoring()
    for oid in ("101", "102"):
        LOGGER.info("Final simulated order: %s", (await manager.get_order(oid)).to_dict())
    LOGGER.info("Remaining active simulated orders: %s", len(await manager.get_active_orders()))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        LOGGER.info("Simulation stopped.")