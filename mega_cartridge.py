import sys
import hyperliquid.info as i
import hyperliquid.utils.constants as c

USER_ADDRESSES = [
    "0xb395Cc23068185163C78c0A1DffAE5c6C0578517",
    "0xb7fbe32b3c646f387a62e278a7a0bbaf2442d356"
]

def print_header():
    print("\n" + "="*70)
    print(" ⚡ ZETA PRIME: DUAL-WALLET LIVE YIELD MONITOR (C08) ⚡")
    print("="*70)

def main():
    print_header()
    print("📡 Connecting to Hyperliquid L1 Info API...")
    
    try:
        info = i.Info(c.MAINNET_API_URL, skip_ws=True)
        print("✅ API Connected Successfully!\n")
    except Exception as ex:
        print(f"❌ Connection Error: {ex}")
        sys.exit(1)
    
    # Fetch Universal Funding Matrix
    meta, ctxs = info.meta_and_asset_ctxs()
    hl_fundings = []
    for asset, ctx in zip(meta["universe"], ctxs):
        coin = asset["name"]
        hourly_rate = float(ctx.get("funding", 0))
        annual_apr = hourly_rate * 24 * 365 * 100
        mark_px = float(ctx.get("markPx", 0))
        hl_fundings.append({
            "coin": coin,
            "rate": hourly_rate,
            "apr": annual_apr,
            "price": mark_px
        })

    # Audit Both Addresses
    for idx, addr in enumerate(USER_ADDRESSES, 1):
        print("="*70)
        print(f" 📡 AUDITING WALLET #{idx}: {addr}")
        print("="*70)
        try:
            state = info.user_state(addr)
            positions = [p['position'] for p in state.get('assetPositions', []) if float(p['position']['szi']) != 0]
            
            if not positions:
                print("💤 No open positions active on this address.")
            else:
                for p in positions:
                    coin = str(p['coin'])
                    szi = float(p['szi'])
                    entry_px = float(p['entryPx'])
                    unrealized_pnl = float(p['unrealizedPnl'])
                    
                    match = next((item for item in hl_fundings if item["coin"] == coin), None)
                    if match:
                        active_rate = match["rate"]
                        apr = match["apr"]
                        mark_px = match["price"]
                        notional = abs(szi) * mark_px
                        hourly_drip = notional * active_rate
                        
                        print(f"🪙 {coin:<6} | Size: {szi:<10} | Entry: ${entry_px:.4f} | Mark: ${mark_px:.4f}")
                        print(f"   └─ Notional Value: ${notional:.2f}")
                        print(f"   └─ uPnL: ${unrealized_pnl:+.4f} | Funding Rate: {active_rate*100:+.4f}%/hr ({apr:+.2f}% APR)")
                        
                        if szi > 0:
                            if active_rate < 0:
                                print(f"   └─ 💰 ACTIVE LONG HARVEST: Collecting +${abs(hourly_drip):.4f}/hr from shorts!")
                            else:
                                print(f"   └─ ⚠️ LONG COST: Paying -${hourly_drip:.4f}/hr to shorts.")
                        else:
                            if active_rate > 0:
                                print(f"   └─ 💰 ACTIVE SHORT HARVEST: Collecting +${hourly_drip:.4f}/hr from longs logo!")
                            else:
                                print(f"   └─ ⚠️ SHORT COST: Paying -${abs(hourly_drip):.4f}/hr.")
        except Exception as ex:
            print(f"⚠️ Could not fetch user state: {ex}")
        print()
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
