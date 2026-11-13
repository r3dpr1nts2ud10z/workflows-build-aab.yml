import pytest
from scripts.order_bridge import OrderBridge

def test_order_formatting():
    bridge = OrderBridge()
    formatted = bridge.format_order(
        asset_id=0,
        is_buy=True,
        limit_px=65000.0,
        sz=0.1,
        cloid="0x00000000000000000000000000000001",
        reduce_only=False
    )
    
    action = formatted["action"]
    orders = action["orders"]

    # Verify Hyperliquid L1 wire schema
    assert action["type"] == "order"
    assert len(orders) == 1
    assert orders[0]["a"] == 0
    assert orders[0]["b"] is True
    assert orders[0]["p"] == "65000.0"
    assert orders[0]["s"] == "0.1"
    assert orders[0]["c"] == "0x00000000000000000000000000000001"
    print("\n✅ Order Bridge Wire Schema & CLOID Serialization Verified!")

if __name__ == "__main__":
    test_order_formatting()
