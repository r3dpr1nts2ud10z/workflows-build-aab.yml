# ZETA read-only monitor

Run from the project root:

```bash
python scripts/zeta_spread_monitor.py
```

It monitors public BTC, ETH, and SOL order books, alerts at a spread of at least
0.02% of best bid (2 basis points), and applies a separate three-second cooldown
per asset. It has no wallet dependency or order-submission code. Preview prices
use the observed bid; spread alerts are not claims of profitability.

Every valid received book is appended to `data/zeta_spread_ticks.csv`, including
updates below the alert threshold or during cooldown. Existing records are
preserved. The default path is relative to the project, regardless of the
working directory.

```bash
python scripts/zeta_spread_monitor.py --duration 25
python scripts/zeta_spread_monitor.py --csv-path data/another_recording.csv
```

Columns: `timestamp_iso`, `timestamp_ms`, `coin`, `best_bid`, `best_ask`,
`spread_usd`, `spread_bps`, `bid_size_top`, `ask_size_top`.

- Timestamps describe local receipt/processing time in UTC, not exchange event time.
- Source prices and sizes retain their decimal values; no binary-float conversion
  or fixed-width rounding is applied. Derived ratios use Decimal arithmetic
  (28 significant digits); repeating ratios necessarily have finite precision.
- Disk operations run off the event loop, one awaited row at a time. This applies
  backpressure instead of accumulating an unbounded queue.
- Each row is flushed. Ctrl+C and timed stops await an in-progress write before
  closing in the same event loop. Forced termination or disk failure can still
  leave incomplete data; there is no guarantee against power loss.
- An incompatible header, incomplete final line, or another active recorder on
  the same file prevents startup. Storage failures stop recording with an error;
  they are not retried as network disconnections. Inspect the file before retrying.
- Disconnected periods are not backfilled. CSV captures received snapshots,
  not every market event. The file grows until you stop recording.

Run offline tests:

```bash
python -m unittest discover -s scripts -p 'test_zeta_*.py'
```