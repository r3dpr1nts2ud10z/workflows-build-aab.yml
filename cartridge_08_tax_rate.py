import os, time
import hyperliquid.info as i
import hyperliquid.utils.constants as c

user = os.getenv('HYPERLIQUID_MAIN_ADDRESS')
info = i.Info(c.MAINNET_API_URL, skip_ws=True)

print("="*60)
print("  ⚡ CARTRIDGE 08: PROTOCOL TAX & FUNDING YIELD MONITOR ⚡")
print("="*60)

def fetch_funding_matrix():
    """Helper: Fetches meta and asset contexts, returning sorted funding list."""
    meta, ctxs = info.meta_and_asset_ctxs()
    hl_fundings = []
    for asset, ctx in zip(meta["universe"], ctxs):
        coin = asset["name"]
        hourly_rate = float(ctx.get("funding", 0))
        annual_apr = hourly_rate * 24 * 365 * 100
        mark_px = float(ctx.get("markPx", 0))
        hl_fundings.append((coin, hourly_rate, annual_apr, mark_px))
    
    # Sort by highest yield paid to SHORTS
    hl_fundings.sort(key=lambda x: x[1], reverse=True)
    return hl_fundings

def evaluate_position_yield(user_address, hl_fundings):
    """Helper: Evaluates active user positions against live funding rates."""
    if not user_address:
        print("\n⚠️ No user address configured in environment.")
        return

    state = info.user_state(user_address)
    positions = [p['position'] for p in state.get('assetPositions', []) if float(p['position']['szi']) != 0]
    
    if not positions:
        print("\n💤 No active open positions found.")
        return

    print("\n" + "="*60)
    print("  📡 ACTIVE POSITION FUNDING AUDIT")
    print("="*60)
    
    for p in positions:
        coin = str(p['coin'])
        szi = float(p['szi'])
        entry_px = float(p['entryPx'])
        unrealized_pnl = float(p['unrealizedPnl'])
        
        # Find matching funding rate for this specific coin
        match = next((item for item in hl_fundings if item[0] == coin), None)
        if match:
            _, active_rate, apr, mark_px = match
            notional = abs(szi) * mark_px
            hourly_drip = notional * active_rate
            
            print(f"🪙 Asset: {coin} | Size: {szi} | Entry: ${entry_px:.2f} | Mark: ${mark_px:.2f}")
            print(f"💵 Unrealized PnL: ${unrealized_pnl:+.3f}")
            print(f"📊 Asset Hourly Funding: {active_rate*100:+.4f}% ({apr:+.2f}% APR)")
            
            if szi < 0:
                if active_rate > 0:
                    print(f"💰 FUNDING HARVEST: SHORTS PAID! Estimated +${hourly_drip:.4f} / hour")
                else:
                    print(f"⚠️ FUNDING TAX: SHORTS PAYING! Cost ~${abs(hourly_drip):.4f} / hour")
            else:
                if active_rate < 0:
                    print(f"💰 FUNDING HARVEST: LONGS PAID! Estimated +${abs(hourly_drip):.4f} / hour")
                else:
                    print(f"⚠️ FUNDING TAX: LONGS PAYING! Cost ~${hourly_drip:.4f} / hour")
        else:
            print(f"🪙 Asset: {coin} | Size: {szi} | Rate data unavailable")
    print("="*60)

def main():
    try:
        fundings = fetch_funding_matrix()
        
        print("\n🔥 TOP SHORT-YIELD ASSETS (Longs pay Shorts):")
        print("-" * 50)
        for coin, rate, apr, px in fundings[:5]:
            print(f"🪙 {coin:<8} | Hourly Tax Rate: {rate*100:+.4f}% | Annualized Yield: {apr:+.2f}% APR | Mark: ${px:.2f}")

        evaluate_position_yield(user, fundings)
        
    except Exception as err:
        print(f"Telemetry Error: {err}")

if __name__ == "__main__":
    main()
