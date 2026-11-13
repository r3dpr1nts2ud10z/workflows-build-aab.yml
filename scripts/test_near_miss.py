from scripts.near_miss_engine import NearMissEngine

def test_near_miss_calibration():
    engine = NearMissEngine(proximity_threshold_pct=0.002)
    eval_result = engine.evaluate_order_proximity(target_price=2500.0, actual_price=2502.5, is_buy=True)
    assert eval_result["is_near_miss"] is True
    
    calibrated_price = engine.refine_limit_price(target_price=2500.0, is_buy=True, evaluation=eval_result)
    assert calibrated_price > 2500.0
    print("\n✅ Near-Miss Autonomous Calibration Diagnostic Passed!")

if __name__ == "__main__":
    test_near_miss_calibration()
