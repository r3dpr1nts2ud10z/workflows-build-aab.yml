# ZETA combined simulation

```bash
python scripts/zeta_master_engine.py
```

This launcher combines the existing public-feed monitor, CSV logger, and
simulated order manager. The standalone tools remain available.
**No private keys, signed actions, real orders, or trading API calls are used.**

## Behavior

- Public mainnet BTC, ETH, and SOL `l2Book` feeds.
- CSV records every valid received book, even below the alert threshold or
  during cooldown, using the same protected append-only recorder.
- Spread trigger: **0.02% of best bid**, equivalent to **2 basis points**.
- Independent **three-second cooldowns** per asset.
- Each eligible signal creates a fictitious `SIM-...` buy with size **0.001 BTC**,
  **0.01 ETH**, or **0.1 SOL**.
- Theoretical price: `best_bid + 0.1 * (best_ask - best_bid)`.
  This is not an exchange-validated tick price or a guarantee of ALO acceptance.
- A **four-second TTL**, checked every 0.2 seconds, requests local simulated
  cancellation. State changes to `EXPIRED` only after callback confirmation.
  Polling, scheduling, and simulated latency mean it need not expire at exactly
  four seconds. Cooldown is shorter than TTL, so simulated orders may overlap.
- No automatic fills, matching, fees, inventory, or P&L are modeled. A spread
  signal alone is not evidence of profitable execution.

## Recording and shutdown

```bash
python scripts/zeta_master_engine.py --duration 25
python scripts/zeta_master_engine.py --csv-path data/separate_session.csv
```

The default CSV is `data/zeta_spread_ticks.csv`, shared with the standalone
monitor. Only one recorder can hold a given CSV at a time. Stop the other
recorder or choose a different path; prior rows are never intentionally replaced.

Ctrl+C and timed stops finish active CSV writes and stop the feed and TTL tasks
in one event loop. Unexpected background-task failures stop the combined engine.
Shutdown reports any remaining simulated orders honestly rather than pretending
they were cancelled. Order state is not persisted across process restarts;
only market snapshots are stored in CSV. No disconnected-period backfill is
attempted. See `ZETA_MONITOR.md` for CSV precision and storage limitations.

## Local latency profiling

The combined engine uses the standalone `LatencyProfiler` without changing
the recorder, trigger arithmetic, cooldowns, or simulated order lifecycle.
The standalone monitor leaves profiling disabled.

- **T0:** immediately on entry to the message handler after `recv()`, before JSON
  parsing. Calls directly to `evaluate_order_book` instead start at method entry.
- **T1:** after the threshold/cooldown decision, including below-threshold and
  cooldown-suppressed valid books. Below-threshold books do not need a cooldown
  check. Rejected messages/books and interrupted or failed evaluations produce
  no evaluation sample.
- **T2:** immediately after successful awaited local simulated registration.
  Failed or interrupted registration produces no dispatch sample.

**Both intervals include the existing awaited CSV append.** Persistence remains
before trigger evaluation and registration; it has not been moved or replaced
with a lossy queue to improve timing. T2 also includes profiler-recording and
signal-logging work between T1 and registration. Neither interval includes
network transit, socket backlog before receipt, or exchange execution.

The shutdown report includes p50/p95/p99/max for each category's latest 10,000
samples, plus separate lifetime and retained counts. Counts need not match
received frames or valid-book counters when processing fails. No latency
measurements are added to the market-data CSV. All boundaries use
`time.perf_counter_ns()`; cooldowns retain their separate monotonic clock.

Run the offline integration and regression tests:

```bash
python -m unittest discover -s scripts -p 'test_zeta_*.py'
```