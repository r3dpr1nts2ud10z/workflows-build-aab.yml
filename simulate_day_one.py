import os
import sys

class ZetaPrimeSimulator:
    """
    ZETA PRIME :: Day One Yield & Volume Simulator
    Models daily turnover, L1 maker rebate capture, net spread PnL,
    and ROI across collateral tiers and execution speeds.
    """
    def __init__(self, rebate_rate_bps=0.2, net_spread_bps=0.4):
        # Hyperliquid L1 maker rebate (default 0.2 bps = 0.002% / 0.00002 decimal)
        self.rebate_rate = rebate_rate_bps / 10000.0
        # Net captured spread after S2UD10Z/AETA/OMETA adverse selection filtering
        self.net_spread_rate = net_spread_bps / 10000.0

    def run_simulation(self, collateral_tiers, turnover_modes):
        results = []
        for col in collateral_tiers:
            for mode, multiplier in turnover_modes.items():
                daily_volume = col * multiplier
                rebate_payout = daily_volume * self.rebate_rate
                spread_pnl = daily_volume * self.net_spread_rate
                total_net_pnl = rebate_payout + spread_pnl
                daily_roi = (total_net_pnl / col) * 100.0

                results.append({
                    "collateral": col,
                    "mode": mode,
                    "multiplier": multiplier,
                    "daily_volume": daily_volume,
                    "rebate_payout": rebate_payout,
                    "spread_pnl": spread_pnl,
                    "total_net_pnl": total_net_pnl,
                    "daily_roi": daily_roi
                })
        return results

def render_ascii_report(results):
    print("=" * 88)
    print("⚡ ZETA PRIME :: DAY ONE REVENUE & REBATE PROJECTION MATRIX")
    print("=" * 88)
    print(f"{'Collateral':<12} | {'Turnover Mode':<15} | {'Daily Volume':<15} | {'Rebates':<10} | {'Spread PnL':<10} | {'Total Net PnL':<13} | {'Daily ROI'}")
    print("-" * 88)

    for r in results:
        commas_flag = " 🔥 [COMMAS]" if r["total_net_pnl"] >= 1000.0 else ""
        print(
            f"${r['collateral']:<11,d} | "
            f"{r['mode']:<15} | "
            f"${r['daily_volume']:<14,d} | "
            f"${r['rebate_payout']:<9,.2f} | "
            f"${r['spread_pnl']:<9,.2f} | "
            f"${r['total_net_pnl']:<12,.2f} | "
            f"{r['daily_roi']:<5.2f}%{commas_flag}"
        )
    print("=" * 88)

if __name__ == "__main__":
    collateral_tiers = [500, 1000, 2500, 5000, 10000]
    
    # Daily inventory turnover speeds (Turnover = Daily Volume / Collateral)
    turnover_modes = {
        "Conservative": 50,      # 50x account turnover
        "Standard HFT": 200,     # 200x account turnover
        "High-Velocity": 500,    # 500x account turnover
        "Ultra-HFT": 1000        # 1000x account turnover
    }

    sim = ZetaPrimeSimulator(rebate_rate_bps=2.0, net_spread_bps=0.4)
    results = sim.run_simulation(collateral_tiers, turnover_modes)
    render_ascii_report(results)
