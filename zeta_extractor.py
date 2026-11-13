import sys
import time
import hyperliquid.info as i
import hyperliquid.utils.constants as c

def main():
    print("\n" + "="*70)
    print(" ⚡ ZETA PRIME: MARKETLESS YIELD EXTRACTOR (FULL L1 SCAN) ⚡")
    print("="*70)
    
    try:
        info = i.Info(c.MAINNET_API_URL, skip_ws=True)
    except Exception as ex:
        print(f"❌ Connection Error: {ex}")
        sys.exit(1)
    
    meta, ctxs = info.meta_and_asset_ctxs()
    assets_data = []

    for asset, ctx in zip(meta["universe"], ctxs):
        coin = asset["name"]
        hourly_rate = float(ctx.get("funding", 0))
        annual_apr = hourly_rate * 24 * 365 * 100
        mark_px = float(ctx.get("markPx", 0))
        open_interest = float(ctx.get("openInterest", 0))
        
        assets_data.append({
            "coin": coin,
            "rate": hourly_rate,
            "apr": annual_apr,
            "price": mark_px,
            "oi_usd": open_interest * mark_px
        })

    # Sort by extreme negative funding (Harvest Longs)
    assets_data.sort(key=lambda x: x["rate"])

    print("\n🟢 TOP LONG EXTRACTION TARGETS (Extreme Negative Funding):")
    print("-" * 70)
    for item in assets_data[:3]:
        print(f"🪙 {item['coin']:<6} | Rate: {item['rate']*100:+.4f}%/hr | APR: {item['apr']:+10.2f}% | OI: ${item['oi_usd']:,.0f}")

    # Sort by extreme positive funding (Harvest Shorts)
    assets_data.sort(key=lambda x: x["rate"], reverse=True)

    print("\n🔴 TOP SHORT EXTRACTION TARGETS (Extreme Positive Funding):")
    print("-" * 70)
    for item in assets_data[:3]:
        print(f"🪙 {item['coin']:<6} | Rate: {item['rate']*100:+.4f}%/hr | APR: {item['apr']:+10.2f}% | OI: ${item['oi_usd']:,.0f}")
    
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
