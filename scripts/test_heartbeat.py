from scripts.heartbeat_monitor import ZETAHeartbeatMonitor

def test_heartbeat_monitor_execution():
    monitor = ZETAHeartbeatMonitor()
    report = monitor.run_health_check()
    
    assert "status" in report
    assert "network" in report
    assert "wal" in report
    assert report["wal"]["healthy"] is True
    print("\n✅ Heartbeat Diagnostic Test Passed!")

if __name__ == "__main__":
    test_heartbeat_monitor_execution()
