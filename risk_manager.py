import os
import sys
import time
from dotenv import load_dotenv

load_dotenv()

class RiskManager:
    def __init__(self, starting_balance_usd=10000.0):
        self.max_total_pos = float(os.getenv("MAX_TOTAL_POSITION_USD", "10000"))
        self.max_single_order = float(os.getenv("MAX_SINGLE_ORDER_USD", "1000"))
        self.max_daily_drawdown = float(os.getenv("MAX_DAILY_DRAWDOWN_USD", "500"))
        self.max_drawdown_pct = float(os.getenv("MAX_DRAWDOWN_PCT", "5.0")) / 100.0
        self.max_consecutive_losses = int(os.getenv("CONSECUTIVE_LOSS_LIMIT", "3"))
        self.cooloff_duration = int(os.getenv("COOLOFF_DURATION_SECONDS", "300"))

        # State Tracking
        self.peak_balance = starting_balance_usd
        self.current_balance = starting_balance_usd
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.cooloff_until = 0

    def validate_order(self, order_size_usd, current_position_usd=0.0):
        current_time = time.time()

        if current_time < self.cooloff_until:
            remaining = int(self.cooloff_until - current_time)
            print(f"🛑 [RISK BLOCKED] Cooloff active due to loss limit. {remaining}s remaining.")
            return False

        if order_size_usd > self.max_single_order:
            print(f"🛑 [RISK BLOCKED] Order size (${order_size_usd:,.2f}) exceeds limit (${self.max_single_order:,.2f}).")
            return False

        if (current_position_usd + order_size_usd) > self.max_total_pos:
            print(f"🛑 [RISK BLOCKED] Total exposure would exceed limit (${self.max_total_pos:,.2f}).")
            return False

        if self.daily_pnl <= -self.max_daily_drawdown:
            print(f"💥 [CIRCUIT BREAKER] Daily drawdown limit (-${self.max_daily_drawdown:,.2f}) hit! Hard shut down engaged.")
            sys.exit("CRITICAL: Daily max drawdown exceeded. Execution engine terminated.")

        return True

    def record_trade_result(self, pnl_usd):
        self.daily_pnl += pnl_usd
        self.current_balance += pnl_usd

        if self.current_balance > self.peak_balance:
            self.peak_balance = self.current_balance

        if pnl_usd < 0:
            self.consecutive_losses += 1
            if self.consecutive_losses >= self.max_consecutive_losses:
                self.cooloff_until = time.time() + self.cooloff_duration
                print(f"⚠️ [RISK WARNING] {self.consecutive_losses} consecutive losses. Triggering {self.cooloff_duration}s cooloff.")
                self.consecutive_losses = 0
        else:
            self.consecutive_losses = 0
