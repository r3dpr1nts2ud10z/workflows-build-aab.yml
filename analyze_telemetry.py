import os
import pandas as pd

CSV_LOG_FILE = "n3psqal3_dryrun_telemetry.csv"

def analyze_telemetry():
    if not os.path.exists(CSV_LOG_FILE):
        print(f"❌ Log file '{CSV_LOG_FILE}' not found. Run the n3psqal3_engine.py first to generate telemetry data.")
        return

    df = pd.read_csv(CSV_LOG_FILE)
    if df.empty:
        print("⚠️ Telemetry log is empty. No execution data available yet.")
        return

    # Parse timestamps
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"])

    # Aggregate Metrics
    total_fills = len(df)
    bid_fills = len(df[df["side"] == "BID"])
    ask_fills = len(df[df["side"] == "ASK"])
    total_volume_usd = df["order_size_usd"].sum()
    total_rebates_usd = df["rebate_earned_usd"].sum()
    final_pnl_usd = df["daily_pnl_usd"].iloc[-1]
    final_balance_usd = df["current_balance_usd"].iloc[-1]

    # Time Window Calculation
    time_elapsed = df["timestamp_utc"].max() - df["timestamp_utc"].min()
    total_minutes = max(time_elapsed.total_seconds() / 60.0, 0.1)
    hourly_rebate_rate = (total_rebates_usd / total_minutes) * 60.0

    print("==================================================================")
    print("📊 ZETA PRIME :: N3PSQAL3 TELEMETRY PERFORMANCE SUMMARY")
    print("==================================================================")
    print(f"⏱️  Log Duration         : {total_minutes:.2f} minutes")
    print(f"🔄 Total Fills Captured : {total_fills} (Bids: {bid_fills} | Asks: {ask_fills})")
    print(f"💵 Cumulative Volume    : ${total_volume_usd:,.2f} USD")
    print(f"💰 Total Rebates Earned : ${total_rebates_usd:.6f} USD")
    print(f"📈 Estimated Hourly Rate: ${hourly_rebate_rate:.4f} USD/hr")
    print(f"🏦 Ending Balance       : ${final_balance_usd:,.2f} USD")
    print("------------------------------------------------------------------")
    print("Recent Execution Stream (Last 5 Fills):")
    print(df[["timestamp_utc", "side", "fill_price", "rebate_earned_usd", "daily_pnl_usd"]].tail(5).to_string(index=False))
    print("==================================================================")

if __name__ == "__main__":
    analyze_telemetry()
