import os
import time
import json
import logging
import threading
import websocket
from typing import Dict, Any, Optional
from scripts.strategy import LiveExecutionStrategy
from scripts.heartbeat_monitor import ZETAHeartbeatMonitor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] ZETA WS-Runtime: %(message)s"
)
logger = logging.getLogger("ZETA.WSLoop")

class ZETAWebSocketLoop:
    """
    High-frequency persistent WebSocket execution loop for Hyperliquid Testnet.
    Subscribes to live 'allMids' channel and streams market ticks directly to NearMissEngine.
    """
    def __init__(
        self, 
        coin_symbol: str = "BTC", 
        ws_url: str = "wss://api.hyperliquid-testnet.xyz/ws",
        wal_path: str = "wal.log",
        max_ticks: Optional[int] = None
    ):
        self.coin_symbol = coin_symbol
        self.ws_url = ws_url
        self.wal_path = wal_path
        self.max_ticks = max_ticks
        
        self.strategy = LiveExecutionStrategy(asset_id=0)
        self.heartbeat = ZETAHeartbeatMonitor(wal_path=wal_path)
        
        self.ws: Optional[websocket.WebSocketApp] = None
        self.is_running = False
        self.tick_count = 0
        self.ping_thread: Optional[threading.Thread] = None

    def log_to_wal(self, record: Dict[str, Any]):
        """Atomic WAL persistence with fsync durability."""
        try:
            with open(self.wal_path, "a") as f:
                f.write(json.dumps(record) + "\n")
                f.flush()
                os.fsync(f.fileno())
        except Exception as e:
            logger.error(f"WAL atomic write failed: {e}")

    def on_message(self, ws, message):
        """Processes real-time tick frames from WebSocket."""
        try:
            data = json.loads(message)
            channel = data.get("channel")
            
            if channel == "allMids":
                mids = data.get("data", {}).get("mids", {})
                if self.coin_symbol in mids:
                    live_price = float(mids[self.coin_symbol])
                    self.process_ws_tick(live_price)
        except Exception as e:
            logger.error(f"Error parsing WS message: {e}")

    def process_ws_tick(self, live_price: float):
        """Processes incoming market tick through NearMiss Engine and signs order payload."""
        self.tick_count += 1
        simulated_target = round(live_price * 0.999, 2)
        cloid = f"0x{self.tick_count:032x}"

        logger.info(
            f"⚡ [WS Tick #{self.tick_count:04d}] Coin: {self.coin_symbol} | "
            f"Live Mid: ${live_price:,.2f} | Target Limit: ${simulated_target:,.2f}"
        )

        # NearMiss strategy execution & EIP-712 payload signing
        payload = self.strategy.process_tick_and_execute(
            target_price=simulated_target,
            current_market_price=live_price,
            size=0.01,
            is_buy=True,
            cloid=cloid
        )

        wal_record = {
            "tick": self.tick_count,
            "timestamp": time.time(),
            "coin": self.coin_symbol,
            "live_price": live_price,
            "simulated_target": simulated_target,
            "calibrated_price": payload["action"]["orders"][0]["p"],
            "signed": "signature" in payload,
            "source": "websocket"
        }
        self.log_to_wal(wal_record)

        if self.max_ticks and self.tick_count >= self.max_ticks:
            logger.info(f"Reached target max ticks ({self.max_ticks}). Closing WebSocket...")
            self.stop()

    def send_ping(self):
        """Keep-alive ping frame every 20 seconds to prevent channel disconnects."""
        while self.is_running:
            time.sleep(20)
            if self.ws and self.ws.sock and self.ws.sock.connected:
                try:
                    self.ws.send(json.dumps({"method": "ping"}))
                except Exception as e:
                    logger.warning(f"Ping failed: {e}")

    def on_open(self, ws):
        """Subscribes to 'allMids' channel upon socket establishment."""
        logger.info("🟢 WebSocket Connection Established. Subscribing to 'allMids' stream...")
        subscribe_msg = {
            "method": "subscribe",
            "subscription": {"type": "allMids"}
        }
        ws.send(json.dumps(subscribe_msg))
        
        self.is_running = True
        self.ping_thread = threading.Thread(target=self.send_ping, daemon=True)
        self.ping_thread.start()

    def on_error(self, ws, error):
        logger.error(f"WebSocket Error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        logger.info(f"🔴 WebSocket Connection Closed ({close_status_code}: {close_msg})")
        self.is_running = False

    def start(self):
        """Connects and runs WebSocket event loop."""
        self.ws = websocket.WebSocketApp(
            self.ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        self.ws.run_forever()

    def stop(self):
        """Gracefully terminates WebSocket session."""
        self.is_running = False
        if self.ws:
            self.ws.close()

if __name__ == "__main__":
    # Test execution for 5 WS ticks
    loop = ZETAWebSocketLoop(coin_symbol="BTC", max_ticks=5)
    loop.start()
