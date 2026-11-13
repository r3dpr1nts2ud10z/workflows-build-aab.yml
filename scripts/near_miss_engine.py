import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] ZETA NearMiss: %(message)s")
logger = logging.getLogger("ZETA.NearMiss")

class NearMissEngine:
    def __init__(self, proximity_threshold_pct: float = 0.002):
        self.proximity_threshold_pct = proximity_threshold_pct
        self.near_miss_count = 0
        self.total_evaluations = 0

    def evaluate_order_proximity(
        self, 
        target_price: float, 
        actual_price: float, 
        is_buy: bool
    ) -> Dict[str, Any]:
        self.total_evaluations += 1
        price_delta = abs(target_price - actual_price)
        pct_delta = price_delta / target_price if target_price > 0 else 1.0
        is_near_miss = 0 < pct_delta <= self.proximity_threshold_pct
        
        if is_near_miss:
            self.near_miss_count += 1
            logger.info(
                f"🎯 Near-Miss Detected | Target: {target_price} | Market: {actual_price} | "
                f"Delta: {pct_delta:.4%} | Near-Miss Ratio: {self.near_miss_count}/{self.total_evaluations}"
            )
            
        return {
            "is_near_miss": is_near_miss,
            "pct_delta": pct_delta,
            "target_price": target_price,
            "actual_price": actual_price,
            "suggested_offset": price_delta * 0.5 if is_near_miss else 0.0
        }

    def refine_limit_price(self, target_price: float, is_buy: bool, evaluation: Dict[str, Any]) -> float:
        if not evaluation["is_near_miss"]:
            return target_price
            
        adjustment = evaluation["suggested_offset"]
        adjusted_price = target_price + adjustment if is_buy else target_price - adjustment
        logger.info(f"⚙️ Autonomous Price Calibration: {target_price} ──► {adjusted_price}")
        return round(adjusted_price, 2)
