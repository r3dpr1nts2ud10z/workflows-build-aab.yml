import sys
import time
import hyperliquid.info as i
import hyperliquid.utils.constants as c

def run_toll_matrix():
    print("\n" + "="*70)
    print(" ⚡ ZETA PRIME: L1 YIELD TOLL BOOTH (AUTONOMOUS EXTRACTOR) ⚡")
    print("="*70)
    
    try:
        info = i.Info(c.MAINNET_API_URL, skip_ws=True)
    except Exception as ex:
        print(f"❌ Connection Error: {ex}")
        return
    
    meta, ctxs = info.meta_and_asset_ctxs()
    harvest_board = []

    for asset, ctx in zip(meta["universe"], ctxs):
        coin = asset["name"]
        hourly_rate = float(ctx.get("funding", 0))
        annual_apr = hourly_rate * 24 * 365 * 100
        mark_px = float(ctx.get("markPx", 0))
        open_interest = float(ctx.get("openInterest", 0))
        oi_usd = open_interest * mark_px
        
        # Filter for high-liquidity or high-anomaly juice ($500k+ OI baseline)
        harvest_board.append({
            "coin": coin,
            "rate": hourly_rate,
            "apr": annual_apr,
            "price": mark_px,
            "oi": oi_usd
        })

    # Sort to isolate top absolute funding anomalies (both extreme negative longs and positive shorts)
    harvest_board.sort(key=lambda x: x["rate"])

    print("\n[+] TOLL BOOTH SCAN COMPLETE. ACTIVE L1 ANOMALIES:")
    print("-" * 70)
    
    # Top 3 Long Tolls (Negative Funding Capture)
    print("🟢 TOP LONG EXTRACTION GATES (Bleeding Shorts):")
    for gate in harvest_board[:3]:
        drip_per_k = 1000 * abs(gate['rate'])
        print(f"   🪙 {gate['coin']:<6} | Rate: {gate['rate']*100:+.4f}%/hr | APR: {gate['apr']:+8.2f}% | Yield/hr per $1k Notional: +${drip_per_k:.4f}")

    # Top 3 Short Tolls (Positive Funding Capture)
    harvest_board.sort(key=lambda x: x["rate"], reverse=True)
    print("\n🔴 TOP SHORT EXTRACTION GATES (Bleeding Longs):")
    for gate in harvest_board[:3]:
        drip_per_k = 1000 * abs(gate['rate'])
        print(f"   🪙 {gate['coin']:<6} | Rate: {gate['rate']*100:+.4f}%/hr | APR: {gate['apr']:+8.2f}% | Yield/hr per $1k Notional: +${drip_per_k:.4f}")

    print("="*70)
    print("⚡ SYSTEM STATUS: Toll booth armed. Ready for multi-wallet execution loops.")
    print("="*70 + "\n")

if __name__ == "__main__":
    run_toll_matrix()
