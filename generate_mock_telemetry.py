import csv
from datetime import datetime, timedelta
import random

CSV_FILE = "n3psqal3_dryrun_telemetry.csv"

fieldnames = [
    "timestamp_utc", "side", "order_size_usd", 
    "fill_price", "rebate_earned_usd", "daily_pnl_usd", "current_balance_usd"
]

base_time = datetime.utcnow() - timedelta(minutes=10)
balance = 10000.0
cumulative_pnl = 0.0

rows = []
for i in range(15):
    t_stamp = (base_time + timedelta(seconds=i * 40)).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    side = "BID" if i % 2 == 0 else "ASK"
    size_usd = round(random.uniform(2500.0, 5000.0), 2)
    fill_price = round(random.uniform(62000.0, 62500.0), 2)
    rebate = round(size_usd * 0.00015, 6) # 0.015% Hyperliquid maker rebate
    pnl_delta = round(random.uniform(-1.5, 3.5), 4)
    
    cumulative_pnl += pnl_delta + rebate
    balance += pnl_delta + rebate

    rows.append({
        "timestamp_utc": t_stamp,
        "side": side,
        "order_size_usd": size_usd,
        "fill_price": fill_price,
        "rebate_earned_usd": rebate,
        "daily_pnl_usd": round(cumulative_pnl, 4),
        "current_balance_usd": round(balance, 2)
    })

with open(CSV_FILE, mode="w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"✅ Generated {len(rows)} test telemetry fills in '{CSV_FILE}'.")
