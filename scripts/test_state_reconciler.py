import pytest
from scripts.state_reconciler import HyperliquidStateReconciler

def test_reconciliation_logic():
    reconciler = HyperliquidStateReconciler(testnet=True)

    # Simulated local WAL open order list
    wal_cloids = ["0x01", "0x02", "0x03"]

    # Simulated active L1 orders returned from REST
    l1_orders = [
        {"cloid": "0x01", "coin": "ETH", "sz": "1.0"},
        {"cloid": "0x02", "coin": "BTC", "sz": "0.1"}
    ]

    report = reconciler.reconcile_wal_with_l1(wal_cloids, l1_orders)

    assert len(report["matched_orders"]) == 2
    assert "0x03" in report["resolved_in_flight"]
    assert report["status"] == "ACTION_REQUIRED"
    print("\n✅ State Reconciliation Match Engine & Discrepancy Detection Verified!")

if __name__ == "__main__":
    test_reconciliation_logic()
