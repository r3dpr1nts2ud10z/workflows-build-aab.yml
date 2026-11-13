import asyncio
import logging
from scripts.hl_websocket import HyperliquidWS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ZETA.Test")

async def main():
    messages_received = []

    async def handle_msg(msg):
        messages_received.append(msg)

    ws_client = HyperliquidWS(testnet=True, on_message_cb=handle_msg)
    conn_task = asyncio.create_task(ws_client.connect())
    
    # Allow time for socket connection & handshake
    await asyncio.sleep(3)
    
    assert ws_client.ws is not None, "WebSocket should be connected to Hyperliquid Testnet"
    logger.info("✅ L1 WebSocket Connection Verified Successfully!")
    
    await ws_client.stop()
    conn_task.cancel()

if __name__ == "__main__":
    asyncio.run(main())
