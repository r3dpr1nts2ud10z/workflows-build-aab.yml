import os
import time
import logging
from typing import Dict, Any, Optional
from scripts.near_miss_engine import NearMissEngine
from scripts.order_bridge import OrderBridge

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] ZETA Strategy: %(message)s")
logger = logging.getLogger("ZETA.Strategy")

class LiveExecutionStrategy:
    """
    Live Strategy Engine integrating NearMissEngine for dynamic order offset calibration
    and OrderBridge for EIP-712 payload construction.
    """
    def __init__(self, asset_id: int = 0, proximity_threshold_pct: float = 0.002):
        self.asset_id = asset_id
        self.near_miss = NearMissEngine(proximity_threshold_pct=proximity_threshold_pct)
        self.bridge = OrderBridge()
        logger.info(f"Strategy initialized for Asset ID {self.asset_id} with Near-Miss Threshold {proximity_threshold_pct:.2%}")

    def process_tick_and_execute(
        self, 
        target_price: float, 
        current_market_price: float, 
        size: float, 
        is_buy: bool,
        cloid: str
    ) -> Dict[str, Any]:
        """
        Evaluates current orderbook price against target execution price, applies
        near-miss offset calibration if a close miss occurs, and signs the payload.
        """
        # 1. Evaluate near-miss proximity
        eval_result = self.near_miss.evaluate_order_proximity(
            target_price=target_price,
            actual_price=current_market_price,
            is_buy=is_buy
        )

        # 2. Dynamically refine limit price if near-miss triggered
        calibrated_price = self.near_miss.refine_limit_price(
            target_price=target_price,
            is_buy=is_buy,
            evaluation=eval_result
        )

        # 3. Format wire payload using calibrated price
        formatted = self.bridge.format_order(
            asset_id=self.asset_id,
            is_buy=is_buy,
            limit_px=calibrated_price,
            sz=size,
            cloid=cloid,
            reduce_only=False
        )

        # 4. Sign payload via EIP-712 if key is loaded
        if self.bridge.account:
            signed_payload = self.bridge.sign_action(formatted)
            logger.info(f"⚡ Order signed successfully with calibrated price {calibrated_price}")
            return signed_payload
        else:
            logger.warning("Private key not loaded. Returning unsigned payload.")
            return formatted

if __name__ == "__main__":
    strategy = LiveExecutionStrategy(asset_id=0)
    # Simulated execution tick
    payload = strategy.process_tick_and_execute(
        target_price=2500.0,
        current_market_price=2502.5,
        size=0.1,
        is_buy=True,
        cloid="0x00000000000000000000000000000002"
    )
    print("\n✅ Live Strategy Execution Payload Ready:")
    print(payload)
