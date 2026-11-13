import os
import asyncio
import json
import time
import csv
from datetime import datetime
import websockets
from dotenv import load_dotenv
from risk_manager import RiskManager

load_dotenv()

WS_URL = os.getenv("HYPERLIQUID_MAINNET_WS_URL", "wss://api.hyperliquid.xyz/ws")
TARGET_ASSET = os.getenv("TARGET_ASSET", "BTC")
MODE = os.getenv("N3PSQAL3_MODE", "dry_run")
SPREAD_BPS = float(os.getenv("QUOTE_SPREAD_BPS", "2.0")) / 10000.0
ORDER_SIZE_USD = float(os.getenv("ORDER_SIZE_USD", "1000"))
MAKER_REBATE_BPS = float(os.getenv("L1_MAKER_REBATE_BPS", "0.1")) / 10000.0
CSV_LOG_FILE = "n3psqal3_dryrun_telemetry.csv"

class NearMissEngine:
    def __init__(self):
        self.risk_manager = RiskManager(starting_balance_usd=10000.0)
        self.total_rebates_captured = 0.0
        self.simulated_fills_count = 0
        self.active_bid = 0.0
        self.active_ask = 0.0
        self.current_position_usd = 0.0
        self._init_csv_log()

    def _init_csv_log(self):
        """Creates the CSV file with headers if it does not exist."""
        if not os.path.exists(CSV_LOG_FILE):
            with open(CSV_LOG_FILE, mode="w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "timestamp_utc",
                    "side",
                    "fill_price",
                    "order_size_usd",
                    "rebate_earned_usd",
                    "cumulative_rebates_usd",
                    "daily_pnl_usd",
                    "current_balance_usd",
                    "simulated_fills_count"
                ])
            print(f"📁 Telemetry CSV Initialized: {CSV_LOG_FILE}")

    def log_fill_to_csv(self, side, fill_price, rebate_earned):
        """Appends a new fill record to the CSV telemetry log."""
        timestamp_utc = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        with open(CSV_LOG_FILE, mode="a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp_utc,
                side,
                f"{fill_price:.2f}",
                f"{ORDER_SIZE_USD:.2f}",
                f"{rebate_earned:.6f}",
                f"{self.total_rebates_captured:.6f}",
                f"{self.risk_manager.daily_pnl:.6f}",
                f"{self.risk_manager.current_balance:.2f}",
                self.simulated_fills_count
            ])

    def calculate_quotes(self, mid_price):
        if not self.risk_manager.validate_order(ORDER_SIZE_USD, self.current_position_usd):
            return 0.0, 0.0

        half_spread = mid_price * (SPREAD_BPS / 2.0)
        self.active_bid = round(mid_price - half_spread, 2)
        self.active_ask = round(mid_price + half_spread, 2)
        return self.active_bid, self.active_ask

    def evaluate_simulated_fills(self, best_bid, best_ask):
        filled = False
        
        # Check Ask Fill
        if best_bid >= self.active_ask and self.active_ask > 0:
            rebate = ORDER_SIZE_USD * MAKER_REBATE_BPS
            self.total_rebates_captured += rebate
            self.simulated_fills_count += 1
            self.risk_manager.record_trade_result(rebate)
            self.log_fill_to_csv("ASK", self.active_ask, rebate)
            print(f"⚡ [FILL-SIM] ASK FILLED @ ${self.active_ask:,.2f} | Rebate: +${rebate:.4f} | Logged to CSV")
            filled = True

        # Check Bid Fill
        if best_ask <= self.active_bid and self.active_bid > 0:
            rebate = ORDER_SIZE_USD * MAKER_REBATE_BPS
            self.total_rebates_captured += rebate
            self.simulated_fills_count += 1
            self.risk_manager.record_trade_result(rebate)
            self.log_fill_to_csv("BID", self.active_bid, rebate)
            print(f"⚡ [FILL-SIM] BID FILLED @ ${self.active_bid:,.2f} | Rebate: +${rebate:.4f} | Logged to CSV")
            filled = True

        return filled

async def run_n3psqal3_engine():
    engine = NearMissEngine()
    print("------------------------------------------------------------------")
    print(f"⚡ CARTRIDGE 1: N3PSQAL3 + RISK GUARD + CSV LOGGING ACTIVE")
    print(f"🎯 Asset: {TARGET_ASSET} | Size: ${ORDER_SIZE_USD:,.0f} | Spread Target: {SPREAD_BPS*10000:.1f} bps")
    print("------------------------------------------------------------------")

    async with websockets.connect(WS_URL) as ws:
        sub_payload = {
            "method": "subscribe",
            "subscription": {"type": "l2Book", "coin": TARGET_ASSET}
        }
        await ws.send(json.dumps(sub_payload))
        print(f"📡 Subscribed to L2 Depth Stream for {TARGET_ASSET}...")

        tick_count = 0
        while True:
            try:
                msg = await ws.recv()
                data = json.loads(msg)

                if data.get("channel") == "l2Book":
                    levels = data.get("data", {}).get("levels", [])
                    if not levels or len(levels[0]) == 0 or len(levels[1]) == 0:
                        continue

                    best_bid = float(levels[0][0]["px"])
                    best_ask = float(levels[1][0]["px"])
                    mid_price = (best_bid + best_ask) / 2.0

                    calc_bid, calc_ask = engine.calculate_quotes(mid_price)
                    engine.evaluate_simulated_fills(best_bid, best_ask)

                    tick_count += 1
                    if tick_count % 20 == 0:
                        print(
                            f"📊 [MID: ${mid_price:,.2f}] "
                            f"Quote Bid: ${calc_bid:,.2f} | Quote Ask: ${calc_ask:,.2f} | "
                            f"Fills: {engine.simulated_fills_count} | Yield: ${engine.total_rebates_captured:.4f}"
                        )

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"❌ Connection error: {e}")
                await asyncio.sleep(2)

if __name__ == "__main__":
    try:
        asyncio.run(run_n3psqal3_engine())
    except KeyboardInterrupt:
        print("\n🛑 N3PSQAL3 Engine Safely Stopped.")
