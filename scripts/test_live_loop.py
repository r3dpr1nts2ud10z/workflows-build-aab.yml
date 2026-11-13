import os
from scripts.live_loop import ZETAExecutionLoop

def test_live_execution_loop():
    test_wal = "test_wal.log"
    if os.path.exists(test_wal):
        os.remove(test_wal)
        
    loop = ZETAExecutionLoop(coin_symbol="BTC", poll_interval_sec=0.1, wal_path=test_wal)
    loop.start_loop(max_ticks=2)
    
    assert loop.tick_count == 2
    assert os.path.exists(test_wal)
    
    # Cleanup test artifact
    if os.path.exists(test_wal):
        os.remove(test_wal)
    print("\n✅ Live Execution Loop Diagnostic Passed!")

if __name__ == "__main__":
    test_live_execution_loop()
