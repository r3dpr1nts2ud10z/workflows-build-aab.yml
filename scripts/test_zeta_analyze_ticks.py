"""Synthetic statistical fixtures. Never modifies the actual recording."""

from contextlib import redirect_stdout, redirect_stderr
import csv
from decimal import Decimal
import io
from pathlib import Path
import tempfile
import unittest

from zeta_analyze_ticks import analyze_spreads, main, print_analysis


HEADERS = ["coin", "best_bid", "best_ask", "spread_bps"]


def row(coin="BTC", bid="10000", ask="10002", bps=""):
    return [coin, bid, ask, bps]


class TestTickAnalyzer(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "ticks.csv"

    def write(self, rows, headers=HEADERS):
        with self.path.open("w", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(headers)
            writer.writerows(rows)

    def test_known_distribution_percentiles_and_population_stddev(self):
        self.write([row(ask=str(10000 + n)) for n in range(5)])
        stats = analyze_spreads(self.path).assets["BTC"]
        self.assertEqual(stats.samples, 5)
        self.assertEqual(stats.minimum, 0)
        self.assertEqual(stats.maximum, 4)
        self.assertEqual(stats.mean, 2)
        self.assertEqual(stats.median, 2)
        self.assertEqual(stats.p95, Decimal("3.8"))
        self.assertEqual(stats.p99, Decimal("3.96"))
        self.assertEqual(stats.std_dev, Decimal(2).sqrt())
        self.assertEqual(stats.qualifying_samples, 3)
        self.assertEqual(stats.qualifying_pct, 60)

    def test_best_bid_denominator_and_inclusive_threshold(self):
        self.write([row(bps="2")])
        stats = analyze_spreads(self.path).assets["BTC"]
        self.assertEqual(stats.mean, 2)
        self.assertEqual(stats.qualifying_samples, 1)
        self.assertEqual(stats.std_dev, 0)
        self.assertEqual(stats.p99, 2)

    def test_exact_threshold_comparison_does_not_round_up(self):
        self.write([
            row(ask="10001.99999999999999999999999999999"),
            row(ask="10002"),
            row(ask="10002.00000000000000000000000000001"),
        ])
        stats = analyze_spreads(self.path).assets["BTC"]
        self.assertEqual(stats.samples, 3)
        self.assertEqual(stats.qualifying_samples, 2)

    def test_optional_spread_column_recomputed_when_absent_or_blank(self):
        self.write([row()])
        self.assertEqual(analyze_spreads(self.path).assets["BTC"].mean, 2)
        self.write([["ETH", "3000", "3000.6"]], headers=HEADERS[:3])
        self.assertEqual(analyze_spreads(self.path).assets["ETH"].mean, 2)

    def test_invalid_rows_are_counted_not_silently_used(self):
        bad = [
            row(bid="0"), row(bid="-1"), row(ask="9999"), row(coin=""),
            row(bid="NaN"), row(ask="Infinity"), row(bid="bad"),
            row(bps="NaN"), row(bps="Infinity"), row(bps="-1"),
            row(bps="999"), row(bps="bad"), ["BTC", "10000"],
            row() + ["extra"],
        ]
        self.write(bad + [row()])
        report = analyze_spreads(self.path)
        self.assertEqual(report.total_rows, len(bad) + 1)
        self.assertEqual(report.valid_rows, 1)
        self.assertEqual(sum(report.rejected_reasons.values()), len(bad))

    def test_assets_grouped_and_sorted(self):
        self.write([
            row("SOL", "150", "150.03"), row("ETH", "3000", "3000.6"),
            row(), row(ask="10001"),
        ])
        report = analyze_spreads(self.path)
        self.assertEqual(list(report.assets), ["BTC", "ETH", "SOL"])
        self.assertEqual(report.assets["BTC"].samples, 2)
        self.assertEqual(report.assets["BTC"].qualifying_pct, 50)

    def test_zero_spread_is_valid(self):
        self.write([row(ask="10000", bps="0")])
        stats = analyze_spreads(self.path).assets["BTC"]
        self.assertEqual(stats.samples, 1)
        self.assertEqual(stats.mean, 0)
        self.assertEqual(stats.qualifying_samples, 0)

    def test_even_sample_median_interpolates(self):
        self.write([row(ask="10001"), row(ask="10003")])
        self.assertEqual(analyze_spreads(self.path).assets["BTC"].median, 2)

    def test_incompatible_and_duplicate_headers_fail(self):
        for headers in ([], ["symbol", "bid", "ask", "spread_bps"],
                        ["coin", "best_bid", "best_ask", "coin"]):
            with self.subTest(headers=headers):
                self.write([], headers=headers)
                with self.assertRaises(ValueError):
                    analyze_spreads(self.path)

    def test_missing_empty_and_all_invalid_files_exit_with_error(self):
        with redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
            self.assertEqual(main(["--csv-path", str(self.path)]), 1)
            self.write([])
            self.assertEqual(main(["--csv-path", str(self.path)]), 1)
            self.write([row(bid="NaN")])
            self.assertEqual(main(["--csv-path", str(self.path)]), 1)

    def test_broken_csv_is_explicit_error(self):
        self.path.write_text("coin,best_bid,best_ask\nBTC,10000,\"unterminated")
        with redirect_stderr(io.StringIO()):
            self.assertEqual(main(["--csv-path", str(self.path)]), 1)

    def test_csv_is_unchanged_and_output_labels_samples_not_orders(self):
        self.write([row(), row()])
        before = self.path.read_bytes()
        output = io.StringIO()
        with redirect_stdout(output):
            report = analyze_spreads(self.path)
            print_analysis(report)
        self.assertEqual(self.path.read_bytes(), before)
        self.assertIn("Qualifying samples (>= 2 bps): 2", output.getvalue())
        self.assertIn("NOT orders", output.getvalue())
        with redirect_stdout(io.StringIO()):
            self.assertEqual(main(["--csv-path", str(self.path)]), 0)


if __name__ == "__main__":
    unittest.main()