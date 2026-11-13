"""Deterministic synthetic timing fixtures, not live latency benchmarks."""

import io
import unittest
from dataclasses import FrozenInstanceError

from zeta_latency_profiler import LatencyProfiler


class TestLatencyProfiler(unittest.TestCase):
    def test_empty_categories(self):
        profiler = LatencyProfiler()
        self.assertEqual(profiler.summary(), {"evaluation": None, "dispatch": None})
        output = io.StringIO()
        profiler.print_summary(file=output)
        self.assertEqual(output.getvalue().count("No samples recorded."), 2)

    def test_nanoseconds_to_microseconds_and_single_sample(self):
        profiler = LatencyProfiler()
        profiler.record_eval(1_000_000, 1_001_250)
        stats = profiler.summary()["evaluation"]
        self.assertEqual(stats.total_samples, 1)
        self.assertEqual(stats.retained_samples, 1)
        for value in (stats.p50_us, stats.p95_us, stats.p99_us, stats.max_us):
            self.assertEqual(value, 1.25)

    def test_known_linear_percentiles(self):
        profiler = LatencyProfiler()
        for elapsed in (4000, 0, 3000, 1000, 2000):
            profiler.record_eval(100, 100 + elapsed)
        stats = profiler.summary()["evaluation"]
        self.assertEqual(stats.p50_us, 2)
        self.assertAlmostEqual(stats.p95_us, 3.8)
        self.assertAlmostEqual(stats.p99_us, 3.96)
        self.assertEqual(stats.max_us, 4)

    def test_two_samples_interpolate(self):
        profiler = LatencyProfiler()
        profiler.record_dispatch(0, 1000)
        profiler.record_dispatch(0, 3000)
        stats = profiler.summary()["dispatch"]
        self.assertEqual(stats.p50_us, 2)
        self.assertAlmostEqual(stats.p95_us, 2.9)
        self.assertAlmostEqual(stats.p99_us, 2.98)

    def test_independent_windows_and_lifetime_counts(self):
        profiler = LatencyProfiler(capacity=2)
        for value in (100_000, 2000, 3000):
            profiler.record_eval(0, value)
        profiler.record_dispatch(0, 7000)
        report = profiler.summary()
        self.assertEqual(report["evaluation"].total_samples, 3)
        self.assertEqual(report["evaluation"].retained_samples, 2)
        self.assertEqual(report["evaluation"].max_us, 3)
        self.assertEqual(report["evaluation"].p50_us, 2.5)
        self.assertEqual(report["dispatch"].total_samples, 1)
        self.assertEqual(report["dispatch"].max_us, 7)

    def test_capacity_one(self):
        profiler = LatencyProfiler(capacity=1)
        profiler.record_eval(0, 3000)
        profiler.record_eval(0, 0)
        stats = profiler.summary()["evaluation"]
        self.assertEqual(stats.total_samples, 2)
        self.assertEqual(stats.retained_samples, 1)
        self.assertEqual(stats.p99_us, 0)

    def test_default_capacity_is_bounded(self):
        profiler = LatencyProfiler()
        for _ in range(10_001):
            profiler.record_dispatch(0, 1000)
        stats = profiler.summary()["dispatch"]
        self.assertEqual(stats.total_samples, 10_001)
        self.assertEqual(stats.retained_samples, 10_000)

    def test_invalid_capacities(self):
        for capacity in (0, -1):
            with self.subTest(capacity=capacity), self.assertRaises(ValueError):
                LatencyProfiler(capacity)
        for capacity in (True, False, 1.5, "10", None):
            with self.subTest(capacity=capacity), self.assertRaises(TypeError):
                LatencyProfiler(capacity)

    def test_invalid_timestamps_do_not_mutate_statistics(self):
        profiler = LatencyProfiler()
        for record in (profiler.record_eval, profiler.record_dispatch):
            record(0, 1000)
            before = profiler.summary()
            for start, end, error in (
                (2, 1, ValueError),
                (True, 1, TypeError),
                (0, False, TypeError),
                (0.0, 1, TypeError),
                (0, float("nan"), TypeError),
                (0, float("inf"), TypeError),
                ("0", 1, TypeError),
                (None, 1, TypeError),
                (0, 10**1000, ValueError),
            ):
                with self.subTest(start=start, error=error):
                    with self.assertRaises(error):
                        record(start, end)
                    self.assertEqual(profiler.summary(), before)

    def test_large_clock_origin_preserves_small_delta(self):
        profiler = LatencyProfiler()
        profiler.record_eval(10**30, 10**30 + 1)
        self.assertEqual(profiler.summary()["evaluation"].p50_us, 0.001)

    def test_dispatch_only_is_reported(self):
        profiler = LatencyProfiler()
        profiler.record_dispatch(0, 2250)
        output = io.StringIO()
        profiler.print_summary(file=output)
        text = output.getvalue()
        self.assertIn("Simulated Dispatch", text)
        self.assertIn("p50: 2.25 µs", text)
        self.assertEqual(text.count("No samples recorded."), 1)

    def test_summary_is_immutable_and_printing_does_not_clear(self):
        profiler = LatencyProfiler(capacity=1)
        profiler.record_eval(0, 1000)
        snapshot = profiler.summary()
        with self.assertRaises(FrozenInstanceError):
            snapshot["evaluation"].max_us = 0
        output = io.StringIO()
        profiler.print_summary(file=output)
        self.assertEqual(profiler.summary(), snapshot)
        self.assertIn("Lifetime samples: 1; retained window: 1", output.getvalue())
        self.assertIn("not network or exchange execution latency", output.getvalue())
        profiler.record_eval(0, 2000)
        self.assertEqual(snapshot["evaluation"].max_us, 1)


if __name__ == "__main__":
    unittest.main()