#!/usr/bin/env python3
import sys
import json
import asyncio

try:
    import websockets
except ImportError:
    print("❌ Error: 'websockets' module not found. Run: pip install websockets")
    sys.exit(1)

HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws"

async def stream_market_telemetry(symbol: str = "ETH"):
    print(f"\n⚡ [BODEGA] LIVE MAINNET BRIDGE :: TARGET: {symbol}")
    print("=" * 65)

    while True:
        try:
            async with websockets.connect(HYPERLIQUID_WS_URL, ping_interval=20) as ws:
                await ws.send(json.dumps({"method": "subscribe", "subscription": {"type": "l2Book", "coin": symbol}}))
                await ws.send(json.dumps({"method": "subscribe", "subscription": {"type": "trades", "coin": symbol}}))
                print(f"✅ [CONNECTED] Streaming live L1 data for {symbol}...\n")

                while True:
                    raw_msg = await ws.recv()
                    msg = json.loads(raw_msg)
                    channel = msg.get("channel")

                    if channel == "l2Book":
                        levels = msg.get("data", {}).get("levels", [[], []])
                        bids, asks = levels[0], levels[1]
                        if bids and asks:
                            best_bid, best_ask = float(bids[0]["px"]), float(asks[0]["px"])
                            spread = round(best_ask - best_bid, 2)
                            print(f"📖 [BOOK] {symbol} | Bid: ${best_bid:,.2f} | Ask: ${best_ask:,.2f} | Spread: ${spread:.2f}")

                    elif channel == "trades":
                        for trade in msg.get("data", []):
                            side = "BUY " if trade.get("side") == "A" else "SELL"
                            px, sz = float(trade.get("px", 0)), float(trade.get("sz", 0))
                            print(f"🔥 [FILL] {side} | {sz:.4f} {symbol} @ ${px:,.2f} | Notional: ${px * sz:,.2f}")

        except Exception as e:
            print(f"⚠️ Reconnecting... ({e})")
            await asyncio.sleep(3)

if __name__ == "__main__":
    symbol = sys.argv[1].upper() if len(sys.argv) > 1 else "ETH"
    try:
        asyncio.run(stream_market_telemetry(symbol))
    except KeyboardInterrupt:
        print("\n⚡ Stream closed cleanly.")
