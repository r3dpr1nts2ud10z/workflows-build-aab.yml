#!/usr/bin/env python3
"""Read-only spread statistics for the ZETA CSV recorder (no trading actions)."""

import argparse
from collections import Counter, defaultdict
import csv
from dataclasses import dataclass
from decimal import Decimal, DecimalException, localcontext
from fractions import Fraction
from pathlib import Path
import sys

from zeta_csv_logger import DEFAULT_CSV_PATH


TRIGGER_THRESHOLD_BPS = Fraction(2)
REQUIRED_HEADERS = {"coin", "best_bid", "best_ask"}


@dataclass(frozen=True)
class AssetStats:
    samples: int
    minimum: Decimal
    mean: Decimal
    median: Decimal
    p95: Decimal
    p99: Decimal
    maximum: Decimal
    std_dev: Decimal
    qualifying_samples: int
    qualifying_pct: Decimal


@dataclass(frozen=True)
class Analysis:
    source: Path
    total_rows: int
    valid_rows: int
    rejected_reasons: dict[str, int]
    assets: dict[str, AssetStats]


def decimal_ratio(value: Fraction) -> Decimal:
    return Decimal(value.numerator) / Decimal(value.denominator)


def percentile(values: list[Decimal], percentage: int) -> Decimal:
    """Sorted values; linear interpolation, matching NumPy's default method."""
    position = Decimal(len(values) - 1) * percentage / 100
    lower = int(position)
    upper = min(lower + 1, len(values) - 1)
    return values[lower] + (values[upper] - values[lower]) * (position - lower)


def summarize(values: list[Decimal], qualifying: int) -> AssetStats:
    ordered = sorted(values)
    count = len(ordered)
    mean = sum(ordered, Decimal(0)) / count
    variance = sum(((value - mean) ** 2 for value in ordered), Decimal(0)) / count
    return AssetStats(
        count, ordered[0], mean, percentile(ordered, 50),
        percentile(ordered, 95), percentile(ordered, 99), ordered[-1],
        variance.sqrt(), qualifying, Decimal(qualifying) * 100 / count,
    )


def parse_spread(row):
    if None in row or any(value is None for value in row.values()):
        raise ValueError("wrong number of columns")
    coin = row["coin"].strip()
    if not coin:
        raise ValueError("missing coin")
    try:
        bid, ask = Decimal(row["best_bid"]), Decimal(row["best_ask"])
        if not all(value.is_finite() and value > 0 for value in (bid, ask)):
            raise ValueError("non-finite or non-positive price")
        if ask < bid:
            raise ValueError("crossed book")
        # Same best-bid denominator as the monitor, not the midpoint. Fraction
        # keeps threshold comparisons exact even for very near-boundary inputs.
        exact_bps = (Fraction(ask) - Fraction(bid)) / Fraction(bid) * 10000
        bps = decimal_ratio(exact_bps)
        recorded = row.get("spread_bps", "").strip()
        if recorded:
            recorded_bps = Decimal(recorded)
            if not recorded_bps.is_finite() or recorded_bps < 0:
                raise ValueError("non-finite or negative recorded spread")
            if recorded_bps != bps:
                raise ValueError("recorded spread disagrees with best-bid calculation")
    except DecimalException:
        raise ValueError("invalid decimal value") from None
    return coin, bps, exact_bps >= TRIGGER_THRESHOLD_BPS


def analyze_spreads(file_path: Path = DEFAULT_CSV_PATH) -> Analysis:
    """Read only. Bad data rows are counted; bad CSV structure fails explicitly."""
    source = Path(file_path)
    values = defaultdict(list)
    qualifying = Counter()
    rejected = Counter()
    total = valid = 0
    # Match the recorder's 28-digit Decimal arithmetic, independent of callers.
    with localcontext() as context:
        context.prec = 28
        with source.open("r", newline="", encoding="utf-8") as stream:
            reader = csv.DictReader(stream, strict=True)
            headers = reader.fieldnames or []
            if len(headers) != len(set(headers)):
                raise ValueError("CSV has duplicate column names.")
            missing = REQUIRED_HEADERS - set(headers)
            if missing:
                raise ValueError("Missing CSV headers: " + ", ".join(sorted(missing)))
            for row in reader:
                total += 1
                try:
                    coin, bps, qualifies = parse_spread(row)
                except ValueError as error:
                    rejected[str(error)] += 1
                    continue
                values[coin].append(bps)
                qualifying[coin] += int(qualifies)
                valid += 1
        assets = {
            coin: summarize(spreads, qualifying[coin])
            for coin, spreads in sorted(values.items())
        }
    return Analysis(source, total, valid, dict(rejected), assets)


def print_analysis(report: Analysis):
    print("=== ZETA Telemetry Spread Analysis ===")
    print(f"Source: {report.source}")
    print(f"Records read: {report.total_rows} | Valid: {report.valid_rows} | "
          f"Rejected: {report.total_rows - report.valid_rows}")
    print("Spread = (best_ask - best_bid) / best_bid * 10,000")
    for reason, count in sorted(report.rejected_reasons.items()):
        print(f"  Rejected {count}: {reason}")
    if not report.assets:
        print("\nNo valid samples available.")
    for coin, stats in report.assets.items():
        print(f"\n--- {coin} ({stats.samples} samples) ---")
        for label, value in (
            ("Min", stats.minimum), ("Mean", stats.mean), ("Median (p50)", stats.median),
            ("95th percentile", stats.p95), ("99th percentile", stats.p99),
            ("Max", stats.maximum), ("Std dev (population)", stats.std_dev),
        ):
            print(f"  {label:22} {value:.6f} bps")
        print(f"  Qualifying samples (>= 2 bps): {stats.qualifying_samples} "
              f"({stats.qualifying_pct:.2f}%)")
    print("\nPercentiles use linear interpolation; displayed statistics are rounded.")
    print("Qualifying samples are NOT orders; cooldowns and fills are not evaluated.")
    print("Recorded snapshots may repeat and contain time gaps. "
          "This is not a profitability estimate or representative-market guarantee.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv-path", type=Path, default=DEFAULT_CSV_PATH,
                        help="CSV to read (default: project data/zeta_spread_ticks.csv).")
    args = parser.parse_args(argv)
    try:
        report = analyze_spreads(args.csv_path)
        print_analysis(report)
        return 0 if report.valid_rows else 1
    except (OSError, UnicodeError, csv.Error, ValueError, DecimalException) as error:
        print(f"Analysis failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())