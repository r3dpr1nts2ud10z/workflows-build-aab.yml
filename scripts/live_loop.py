import os
import time
import json
import logging
import urllib.request
from typing import Dict, Any, Optional
from scripts.strategy import LiveExecutionStrategy
from scripts.heartbeat_monitor import ZETAHeartbeatMonitor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] ZETA Runtime: %(message)s"
)
logger = logging.getLogger("ZETA.LiveLoop")

class ZETAExecutionLoop:
    """
    Continuous execution engine that fetches live market ticks from Hyperliquid Testnet,
    runs NearMissEngine price recalibration, logs state transitions to WAL, and outputs
    signed EIP-712 execution payloads.
    """
    def __init__(
        self, 
        asset_id: int = 0, 
        coin_symbol: str = "BTC", 
        poll_interval_sec: float = 2.0,
        wal_path: str = "wal.log"
    ):
        self.asset_id = asset_id
        self.coin_symbol = coin_symbol
        self.poll_interval_sec = poll_interval_sec
        self.wal_path = wal_path
        self.strategy = LiveExecutionStrategy(asset_id=asset_id)
        self.heartbeat = ZETAHeartbeatMonitor(wal_path=wal_path)
        self.is_running = False
        self.tick_count = 0

    def fetch_live_mid_price(self) -> Optional[float]:
        """Fetches all mid prices from Hyperliquid Testnet REST endpoint."""
        url = "https://api.hyperliquid-testnet.xyz/info"
        req_data = json.dumps({"type": "allMids"}).encode("utf-8")
        
        try:
            req = urllib.request.Request(
                url, 
                data=req_data, 
                headers={"Content-Type": "application/json", "User-Agent": "ZETA-Engine/1.0"}
            )
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if self.coin_symbol in data:
                    return float(data[self.coin_symbol])
                logger.warning(f"Coin symbol {self.coin_symbol} not found in testnet response.")
                return None
        except Exception as e:
            logger.error(f"Failed to fetch market data from testnet: {e}")
            return None

    def log_to_wal(self, record: Dict[str, Any]):
        """Persists transaction telemetry with fsync crash durability."""
        try:
            with open(self.wal_path, "a") as f:
                f.write(json.dumps(record) + "\n")
                f.flush()
                os.fsync(f.fileno())
        except Exception as e:
            logger.error(f"WAL atomic write failed: {e}")

    def run_single_iteration(self, simulated_target_offset_pct: float = -0.001):
        """Processes one live tick, evaluates near-miss, logs to WAL, and formats signed payload."""
        self.tick_count += 1
        live_price = self.fetch_live_mid_price()
        
        if not live_price:
            logger.warning("Skipping iteration due to market feed error.")
            return

        # Target price simulated slightly behind market to test NearMiss calibration
        simulated_target = round(live_price * (1.0 + simulated_target_offset_pct), 2)
        cloid = f"0x{self.tick_count:032x}"

        logger.info(
            f"Tick #{self.tick_count:04d} | Coin: {self.coin_symbol} | "
            f"Live Market: ${live_price:,.2f} | Target limit: ${simulated_target:,.2f}"
        )

        # Process tick through strategy & NearMissEngine
        payload = self.strategy.process_tick_and_execute(
            target_price=simulated_target,
            current_market_price=live_price,
            size=0.01,
            is_buy=True,
            cloid=cloid
        )

        # Log atomic record to WAL
        wal_record = {
            "tick": self.tick_count,
            "timestamp": time.time(),
            "coin": self.coin_symbol,
            "live_price": live_price,
            "simulated_target": simulated_target,
            "calibrated_price": payload["action"]["orders"][0]["p"],
            "signed": "signature" in payload
        }
        self.log_to_wal(wal_record)

    def start_loop(self, max_ticks: Optional[int] = None):
        """Starts the main runtime loop."""
        self.is_running = True
        logger.info("⚡ ZETA Live Loop Started on Hyperliquid Testnet")
        
        try:
            while self.is_running:
                self.run_single_iteration()
                
                if max_ticks and self.tick_count >= max_ticks:
                    logger.info(f"Reached requested max ticks count ({max_ticks}). Stopping loop.")
                    break
                    
                time.sleep(self.poll_interval_sec)
        except KeyboardInterrupt:
            logger.info("Loop interrupted manually by user.")
        finally:
            self.is_running = False
            logger.info("ZETA Live Loop shutdown cleanly.")

if __name__ == "__main__":
    # Test execution for 5 continuous iterations
    loop = ZETAExecutionLoop(coin_symbol="BTC", poll_interval_sec=1.5)
    loop.start_loop(max_ticks=5)
