import sys
import time
from risk_manager import RiskManager

def run_stress_test():
    print("==================================================================")
    print("🧪 ZETA PRIME :: CIRCUIT BREAKER STRESS TEST INITIALIZED")
    print("==================================================================")
    
    # Initialize RiskManager with $10,000 starting balance
    risk_guard = RiskManager(starting_balance_usd=10000.0)
    print(f"💰 Starting Balance: ${risk_guard.current_balance:,.2f}")
    print(f"🛑 Daily Max Drawdown Limit: -${risk_guard.max_daily_drawdown:,.2f}")
    print(f"⚡ Consecutive Loss Limit: {risk_guard.max_consecutive_losses} trades")
    print("------------------------------------------------------------------")

    # 1. Test Order Validation
    print("\n[TEST 1] Validating standard order ($1,000 USD)...")
    if risk_guard.validate_order(1000.0):
        print("✅ Order validated successfully.")

    # 2. Test Single Order Limit Violation
    print("\n[TEST 2] Testing order size breach ($2,500 USD)...")
    if not risk_guard.validate_order(2500.0):
        print("✅ Single-order size limit correctly blocked over-sized order.")

    # 3. Test Consecutive Loss Cooloff Trigger
    print("\n[TEST 3] Simulating 3 consecutive small losses (-$50 each)...")
    for i in range(1, 4):
        risk_guard.record_trade_result(-50.0)
        print(f"  └ Trade {i}: PnL -$50.00 | Total Daily PnL: ${risk_guard.daily_pnl:.2f}")

    print("Checking if cooloff lock is active...")
    if not risk_guard.validate_order(1000.0):
        print("✅ Cooloff lock successfully engaged after 3 consecutive losses!")

    # 4. Reset Cooloff for Final Circuit Breaker Test
    risk_guard.cooloff_until = 0

    # 5. Simulate Hard Drawdown Limit Breach (-$500 Daily Limit)
    print("\n[TEST 4] Simulating severe slippage event (-$400 additional loss)...")
    risk_guard.record_trade_result(-400.0)
    print(f"  └ Cumulative Daily PnL: ${risk_guard.daily_pnl:.2f}")

    print("\n[TEST 5] Attempting execution post-drawdown breach...")
    try:
        risk_guard.validate_order(1000.0)
    except SystemExit as e:
        print(f"\n✅ [STRESS TEST SUCCESSFUL] Circuit Breaker Caught Breach: {e}")
        print("==================================================================")

if __name__ == "__main__":
    run_stress_test()
