import pytest
from scripts.strategy import LiveExecutionStrategy

def test_strategy_near_miss_pipeline():
    strategy = LiveExecutionStrategy(asset_id=0, proximity_threshold_pct=0.005)
    
    # Target buy @ 2500.0, actual market @ 2502.5 (0.1% delta -> triggers near-miss offset)
    payload = strategy.process_tick_and_execute(
        target_price=2500.0,
        current_market_price=2502.5,
        size=0.1,
        is_buy=True,
        cloid="0x00000000000000000000000000000003"
    )

    action = payload["action"]
    order = action["orders"][0]

    assert action["type"] == "order"
    assert float(order["p"]) > 2500.0  # Confirm price was calibrated upward for buy fill
    assert order["s"] == "0.1"
    assert "signature" in payload
    print("\n✅ Integrated Strategy & Near-Miss Pipeline Diagnostic Passed!")

if __name__ == "__main__":
    test_strategy_near_miss_pipeline()
