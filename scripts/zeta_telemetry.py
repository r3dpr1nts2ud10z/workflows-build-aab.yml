import asyncio
import json
import logging
import sys
from datetime import datetime
import websockets

# Configure logging for telemetry monitoring
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

MAINNET_WS_URL = "wss://api.hyperliquid.xyz/ws"
COINS_TO_STREAM = ["BTC", "ETH"]

async def subscribe_l2_book(websocket, coin: str):
    """Sends subscription request for l2Book channel for a specific asset."""
    subscription_msg = {
        "method": "subscribe",
        "subscription": {
            "type": "l2Book",
            "coin": coin
        }
    }
    await websocket.send(json.dumps(subscription_msg))
    logging.info(f"Sent l2Book subscription request for {coin}")

async def render_order_book(data):
    """Parses and formats the l2Book payload into a clean console view."""
    coin = data.get("coin", "UNKNOWN")
    levels = data.get("levels", [[], []])
    bids, asks = levels[0], levels[1]
    
    time_str = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    
    # Calculate top bid, top ask, and current spread
    best_bid = float(bids[0]["px"]) if bids else 0.0
    best_ask = float(asks[0]["px"]) if asks else 0.0
    spread = round(best_ask - best_bid, 4)
    
    print("\n" + "=" * 55)
    print(f"  ZETA ENGINE TELEMETRY | {coin} L2 ORDER BOOK | {time_str}")
    print(f"  Best Bid: ${best_bid:,.2f} | Best Ask: ${best_ask:,.2f} | Spread: ${spread}")
    print("=" * 55)
    print(f"{'ASKS (SELLS)':^26} | {'BIDS (BUYS)':^26}")
    print(f"{'Price':>12} | {'Size':>11} || {'Price':>12} | {'Size':>11}")
    print("-" * 55)
    
    # Render top 5 depth levels
    for i in range(min(5, max(len(asks), len(bids)))):
        ask_px = f"${float(asks[i]['px']):,.2f}" if i < len(asks) else ""
        ask_sz = f"{float(asks[i]['sz']):.4f}" if i < len(asks) else ""
        bid_px = f"${float(bids[i]['px']):,.2f}" if i < len(bids) else ""
        bid_sz = f"{float(bids[i]['sz']):.4f}" if i < len(bids) else ""
        
        print(f"{ask_px:>12} | {ask_sz:>11} || {bid_px:>12} | {bid_sz:>11}")
    print("=" * 55 + "\n")

async def keep_alive(websocket):
    """Sends periodic pings to keep the WebSocket connection alive."""
    while True:
        try:
            await asyncio.sleep(50)
            ping_msg = {"method": "ping"}
            await websocket.send(json.dumps(ping_msg))
        except asyncio.CancelledError:
            break
        except Exception as e:
            logging.error(f"Error in keep_alive loop: {e}")
            break

async def handle_telemetry_stream():
    """Main execution loop with auto-reconnect and backoff strategy."""
    backoff_delay = 1  # Initial reconnect delay in seconds
    
    while True:
        try:
            logging.info(f"Connecting to Hyperliquid Mainnet: {MAINNET_WS_URL}")
            async with websockets.connect(
                MAINNET_WS_URL, 
                ping_interval=None  # Managed custom application pings
            ) as websocket:
                logging.info("WebSocket connection established successfully.")
                backoff_delay = 1  # Reset backoff delay on successful connection
                
                # Subscribe to l2Book for requested pairs
                for coin in COINS_TO_STREAM:
                    await subscribe_l2_book(websocket, coin)
                
                # Start keep-alive task
                ping_task = asyncio.create_task(keep_alive(websocket))
                
                try:
                    async for message in websocket:
                        payload = json.loads(message)
                        channel = payload.get("channel")
                        
                        if channel == "l2Book":
                            data = payload.get("data", {})
                            await render_order_book(data)
                        elif channel == "subscriptionResponse":
                            logging.info(f"Subscription Confirmed: {payload}")
                        elif channel == "pong":
                            pass  # Silent heartbeats
                        else:
                            logging.debug(f"Received message on channel [{channel}]: {payload}")
                            
                except websockets.ConnectionClosed as e:
                    logging.warning(f"WebSocket closed unexpectedly: {e}")
                finally:
                    ping_task.cancel()
                    
        except (websockets.WebSocketException, OSError) as e:
            logging.error(f"Connection failed: {e}")
            
        logging.info(f"Reconnecting in {backoff_delay} seconds...")
        await asyncio.sleep(backoff_delay)
        backoff_delay = min(backoff_delay * 2, 60)  # Exponential backoff capped at 60s

if __name__ == "__main__":
    try:
        asyncio.run(handle_telemetry_stream())
    except KeyboardInterrupt:
        logging.info("ZETA stream manually halted.")