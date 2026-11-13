import os
import asyncio
import json
import time
import websockets
from dotenv import load_dotenv

load_dotenv()

WS_URL = os.getenv("HYPERLIQUID_MAINNET_WS_URL", "wss://api.hyperliquid.xyz/ws")

async def run_smoke_test():
    print("--------------------------------------------------")
    print("⚡ ZETA PRIME: Initializing Mainnet WebSocket Diagnostic")
    print(f"📡 Target Endpoint: {WS_URL}")
    print("--------------------------------------------------")

    start_time = time.perf_counter()

    try:
        async with websockets.connect(WS_URL) as ws:
            conn_time = (time.perf_counter() - start_time) * 1000
            print(f"✅ [SUCCESS] WebSocket Connected in {conn_time:.2f} ms")

            ping_start = time.perf_counter()
            ping_payload = {"method": "ping"}
            await ws.send(json.dumps(ping_payload))
            
            response = await asyncio.wait_for(ws.recv(), timeout=5.0)
            roundtrip_ms = (time.perf_counter() - ping_start) * 1000
            print(f"⚡ [SPEED] Single-Tick Roundtrip Latency: {roundtrip_ms:.2f} ms")

            sub_payload = {
                "method": "subscribe",
                "subscription": {"type": "allMids"}
            }
            await ws.send(json.dumps(sub_payload))
            print("📡 [STREAM] Subscribed to AllMids L1 Feed...")

            tick_data = await asyncio.wait_for(ws.recv(), timeout=5.0)
            parsed_tick = json.loads(tick_data)

            print("--------------------------------------------------")
            print("🔥 [DATA CAPTURE] First Tick Received:")
            print(json.dumps(parsed_tick, indent=2)[:300] + "...\n[TRUNCATED]")
            print("--------------------------------------------------")
            print("🎉 ZETA PRIME CONSOLE ONLINE: Mainnet Read Pipeline Verified.")

    except Exception as e:
        print(f"❌ [FAIL] Diagnostic Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_smoke_test())
