import os
import json
from scripts.ws_live_loop import ZETAWebSocketLoop

def test_websocket_execution_loop():
    test_wal = "test_ws_wal.log"
    if os.path.exists(test_wal):
        os.remove(test_wal)
        
    loop = ZETAWebSocketLoop(coin_symbol="BTC", wal_path=test_wal, max_ticks=2)
    
    # Mock WebSocket 'allMids' frame to verify execution path deterministically
    mock_ws_msg = json.dumps({
        "channel": "allMids",
        "data": {
            "mids": {
                "BTC": "85150.50"
            }
        }
    })
    
    # Process mock message frame
    loop.on_message(None, mock_ws_msg)

    assert loop.tick_count == 1
    assert os.path.exists(test_wal)
    
    # Cleanup test artifact
    if os.path.exists(test_wal):
        os.remove(test_wal)
    print("\n✅ WebSocket Live Execution Loop Test Passed!")

if __name__ == "__main__":
    test_websocket_execution_loop()
