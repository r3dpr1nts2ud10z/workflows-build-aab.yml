"""Standalone, in-memory local latency statistics; no engine or network access."""

from collections import deque
from dataclasses import dataclass
import math
from typing import TextIO


@dataclass(frozen=True)
class LatencyStats:
    """Percentiles describe retained samples, not all lifetime samples."""

    total_samples: int
    retained_samples: int
    p50_us: float
    p95_us: float
    p99_us: float
    max_us: float


def _stats(samples: deque[float], total: int) -> LatencyStats | None:
    if not samples:
        return None
    ordered = sorted(samples)

    def percentile(percent: int) -> float:
        # Linear interpolation, matching NumPy's default percentile method.
        lower, remainder = divmod((len(ordered) - 1) * percent, 100)
        if not remainder:
            return ordered[lower]
        return ordered[lower] + (
            ordered[lower + 1] - ordered[lower]
        ) * (remainder / 100)

    return LatencyStats(
        total, len(ordered), percentile(50), percentile(95),
        percentile(99), ordered[-1],
    )


def _elapsed_us(start_ns: int, end_ns: int) -> float:
    if type(start_ns) is not int or type(end_ns) is not int:
        raise TypeError("timestamps must be integer nanoseconds, not booleans")
    if end_ns < start_ns:
        raise ValueError("end timestamp must not precede start timestamp")
    try:
        elapsed = (end_ns - start_ns) / 1_000
    except OverflowError as exc:
        raise ValueError("elapsed time cannot be represented in microseconds") from exc
    if not math.isfinite(elapsed):
        raise ValueError("elapsed time must be finite")
    return elapsed


class LatencyProfiler:
    """Bounded windows for timestamps from the same time.perf_counter_ns clock.

    Call record_eval/record_dispatch with caller-captured boundaries. This class
    does not capture timestamps, pair events, or instrument the engine itself.
    Use from one thread/event loop only; no synchronization is provided.
    """

    def __init__(self, capacity: int = 10_000):
        if type(capacity) is not int:
            raise TypeError("capacity must be an integer, not a boolean")
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self._eval_us: deque[float] = deque(maxlen=capacity)
        self._dispatch_us: deque[float] = deque(maxlen=capacity)
        self._eval_total = 0
        self._dispatch_total = 0

    def record_eval(self, t0_ns: int, t1_ns: int) -> None:
        """Record local message receipt -> spread evaluation completion."""
        elapsed = _elapsed_us(t0_ns, t1_ns)
        self._eval_us.append(elapsed)
        self._eval_total += 1

    def record_dispatch(self, t0_ns: int, t2_ns: int) -> None:
        """Record local receipt -> simulated dispatch; never sends an order."""
        elapsed = _elapsed_us(t0_ns, t2_ns)
        self._dispatch_us.append(elapsed)
        self._dispatch_total += 1

    def summary(self) -> dict[str, LatencyStats | None]:
        """Return independent immutable snapshots; empty categories are None."""
        return {
            "evaluation": _stats(self._eval_us, self._eval_total),
            "dispatch": _stats(self._dispatch_us, self._dispatch_total),
        }

    def print_summary(self, file: TextIO | None = None) -> None:
        """Print rolling-window metrics without clearing or changing samples."""
        stats = self.summary()
        print("\n=== Zeta Local Latency Profile (microseconds) ===", file=file)
        for key, label in (
            ("evaluation", "Receipt -> Spread Evaluation (T0 -> T1)"),
            ("dispatch", "Receipt -> Simulated Dispatch (T0 -> T2)"),
        ):
            print(label, file=file)
            values = stats[key]
            if values is None:
                print("   No samples recorded.", file=file)
                continue
            print(
                f"   Lifetime samples: {values.total_samples}; "
                f"retained window: {values.retained_samples}",
                file=file,
            )
            for name, value in (
                ("p50", values.p50_us), ("p95", values.p95_us),
                ("p99", values.p99_us), ("Max", values.max_us),
            ):
                print(f"   {name}: {value:.2f} µs", file=file)
        print("Local processing only; not network or exchange execution latency.", file=file)