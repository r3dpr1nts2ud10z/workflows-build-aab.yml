import asyncio
import json
import logging
import time
from typing import Callable, Optional
import websockets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ZETA.WebSocket")

class HyperliquidWS:
    MAINNET_URL = "wss://api.hyperliquid.xyz/ws"
    TESTNET_URL = "wss://api.hyperliquid-testnet.xyz/ws"

    def __init__(self, testnet: bool = True, on_message_cb: Optional[Callable] = None):
        self.url = self.TESTNET_URL if testnet else self.MAINNET_URL
        self.on_message_cb = on_message_cb
        self.ws = None
        self.running = False
        self.last_heartbeat = 0.0

    async def connect(self):
        self.running = True
        while self.running:
            try:
                logger.info(f"Connecting to Hyperliquid L1 WS at {self.url}...")
                async with websockets.connect(self.url, ping_interval=15, ping_timeout=10) as ws:
                    self.ws = ws
                    self.last_heartbeat = time.time()
                    logger.info("L1 WebSocket Connected.")
                    
                    ping_task = asyncio.create_task(self._heartbeat())
                    
                    async for message in ws:
                        self.last_heartbeat = time.time()
                        data = json.loads(message)
                        if self.on_message_cb:
                            await self.on_message_cb(data)
                            
                    ping_task.cancel()
            except (websockets.ConnectionClosed, Exception) as e:
                logger.warning(f"L1 WS Disconnected: {e}. Reconnecting in 2s...")
                self.ws = None
                await asyncio.sleep(2)

    async def _heartbeat(self):
        while self.running and self.ws:
            await asyncio.sleep(15)
            try:
                ping_payload = json.dumps({"method": "ping"})
                await self.ws.send(ping_payload)
            except Exception as e:
                logger.error(f"Heartbeat failed: {e}")
                break

    async def subscribe_user_events(self, user_address: str):
        if not self.ws:
            raise ConnectionError("WebSocket is not connected.")
            
        sub_msg = {
            "method": "subscribe",
            "subscription": {"type": "userEvents", "user": user_address}
        }
        await self.ws.send(json.dumps(sub_msg))
        logger.info(f"Subscribed to userEvents for {user_address}")

    async def stop(self):
        self.running = False
        if self.ws:
            await self.ws.close()
            logger.info("L1 WS Shutdown complete.")
