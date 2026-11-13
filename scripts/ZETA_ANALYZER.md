# ZETA tick analysis (read-only)

```bash
python scripts/zeta_analyze_ticks.py
python scripts/zeta_analyze_ticks.py --csv-path data/another_recording.csv
```

Reads the existing `data/zeta_spread_ticks.csv` by default. It never updates the
recording, connects to the exchange, or starts the monitor. Uses the Python
standard library; NumPy is not required.

Required columns are `coin`, `best_bid`, and `best_ask`. The optional
`spread_bps` field must be finite, nonnegative, and consistent with the recorder's
best-bid-based calculation when populated. If absent or blank, it is recomputed.
The old `symbol`/`bid`/`ask` schema is not silently guessed.

Spread basis points = `(best_ask - best_bid) / best_bid * 10000`.

Reports per-asset sample count, minimum, mean, median, p95, p99, maximum,
population standard deviation, and samples at or above **2 bps**. Percentiles
use linear interpolation (NumPy's default convention); population standard
deviation uses `N`, not `N - 1`.

Threshold classification uses exact rational arithmetic from decimal prices,
not rounded displayed values. Statistical calculations use 28-digit Decimal
arithmetic and are printed to six decimal places.

Non-finite or invalid prices/spreads, crossed books, missing values, inconsistent
precomputed spreads, and wrong-width records are rejected with counts and
reasons. Missing/incompatible/duplicate headers or broken CSV syntax fail
explicitly. No valid samples produces a nonzero exit status.

**Qualifying samples are not orders or profits.** This analysis does not apply
cooldowns, simulate fills, deduct fees, or model inventory. Rows may be repeated
snapshots from short sessions with gaps; it is sample-weighted, not time-weighted
or evidence of statistically independent observations.

For a consistent complete file, stop its recorder before analyzing it. The
analyzer does not claim an atomic snapshot of an actively appended CSV.

```bash
python -m unittest discover -s scripts -p 'test_zeta_analyze_ticks.py' -v
```