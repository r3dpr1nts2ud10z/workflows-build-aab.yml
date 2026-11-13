# Standalone ZETA latency profiler

`zeta_latency_profiler.py` is an in-memory utility, also used by the combined
simulation engine. Importing it starts nothing. The profiler itself does not
read or write recordings, access the network, or place orders. No NumPy or other
third-party packages are required. See `ZETA_MASTER_ENGINE.md` for the engine's
timing boundaries, including CSV-write time.

## Interface

Import `LatencyProfiler` from `zeta_latency_profiler` when using a script in
this directory (or set `PYTHONPATH=scripts` from the project root).

- `LatencyProfiler(capacity=10_000)`: positive integer capacity, per category.
- `record_eval(t0_ns, t1_ns)`: local receipt to evaluation completion.
- `record_dispatch(t0_ns, t2_ns)`: local receipt to simulated dispatch.
- `summary()`: immutable statistics per category, or `None` when empty.
- `print_summary(file=None)`: print to stdout or a supplied text stream.

The caller must capture all boundaries using `time.perf_counter_ns()` from
the same clock. Capture T0 immediately after receiving a message, T1 after
completing its spread evaluation, and T2 at simulated dispatch. Whether
logging, queuing, or other work is included depends on where the caller places
these boundaries; document that placement before comparing measurements.
The profiler cannot verify the source clock or pair events. Use from a single
thread/event loop; the class is not synchronized.

Timestamps must be integer nanoseconds (not booleans). Reversed timestamps
and unrepresentable elapsed durations raise errors without recording a
sample. Zero elapsed time is allowed. Integer subtraction precedes conversion
to floating-point microseconds, avoiding loss from a large clock origin.
Nanosecond units do not guarantee nanosecond clock resolution or accuracy.

Each category retains its own latest `capacity` samples. Lifetime counts
continue increasing after eviction; p50/p95/p99/max describe **only the
retained window**, using linear interpolation like NumPy's default percentile
method. Reporting neither clears nor changes the window. A missing dispatch
sample means no dispatch was recorded, not proof that no trigger occurred.

These statistics measure local processing only—not network latency, exchange
acknowledgements, fills, profitability, or the profiler's own recording cost.

## Tests

From the project root:

```sh
python -m unittest discover -s scripts -p 'test_zeta_latency_profiler.py' -v
```

Tests use synthetic timestamps; their results are **not live engine latency
benchmarks**. No engine, recorder, or live connection is started.