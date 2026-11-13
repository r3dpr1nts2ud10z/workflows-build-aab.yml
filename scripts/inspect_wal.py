import json
import os
import sys

def safe_float(val, default=0.0):
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def inspect_wal(wal_path="wal.log", limit=5):
    if not os.path.exists(wal_path):
        print(f"❌ WAL file '{wal_path}' not found.")
        return

    print(f"\n================ ZETA WAL TELEMETRY SUMMARY ================")
    records = []
    with open(wal_path, "r") as f:
        for line in f:
            if line.strip():
                try:
                    records.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    continue

    total_records = len(records)
    print(f"Total Persisted Ticks: {total_records}")
    
    if not records:
        print("No valid records found in WAL.")
        return

    print(f"\n--- Displaying Last {min(limit, total_records)} Entries ---")
    for r in records[-limit:]:
        tick = r.get("tick", 0)
        coin = r.get("coin", "UNKNOWN")
        live_price = safe_float(r.get("live_price"))
        target_price = safe_float(r.get("simulated_target"))
        calibrated_price = safe_float(r.get("calibrated_price"))
        signed = bool(r.get("signed"))

        delta = calibrated_price - target_price

        print(f"Tick #{tick:04d} | Coin: {coin} | Market: ${live_price:,.2f}")
        print(f"  ├─ Target Limit:     ${target_price:,.2f}")
        print(f"  ├─ Calibrated Limit: ${calibrated_price:,.2f} (Adjustment: +${delta:,.2f})")
        print(f"  └─ Signed Payload:   {'✅ YES' if signed else '❌ NO'}\n")

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    inspect_wal(limit=count)
