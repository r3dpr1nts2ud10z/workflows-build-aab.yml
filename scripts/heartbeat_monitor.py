import os
import time
import json
import logging
import urllib.request
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] ZETA Heartbeat: %(message)s")
logger = logging.getLogger("ZETA.Heartbeat")

class ZETAHeartbeatMonitor:
    """
    Monitors engine health, WS/REST socket availability, 
    WAL storage integrity, and signature readiness.
    """
    def __init__(self, wal_path: str = "wal.log", testnet_url: str = "https://api.hyperliquid-testnet.xyz/info"):
        self.wal_path = wal_path
        self.testnet_url = testnet_url

    def check_network_socket(self) -> Dict[str, Any]:
        """Probes the Hyperliquid API endpoint for latency and HTTP response status."""
        start_time = time.time()
        try:
            req = urllib.request.Request(self.testnet_url, headers={'User-Agent': 'ZETA-Engine/1.0'})
            with urllib.request.urlopen(req, timeout=3.0) as response:
                latency_ms = (time.time() - start_time) * 1000
                status_code = response.getcode()
                return {
                    "healthy": status_code == 200,
                    "latency_ms": round(latency_ms, 2),
                    "status_code": status_code
                }
        except Exception as e:
            return {
                "healthy": False,
                "latency_ms": None,
                "error": str(e)
            }

    def check_wal_integrity(self) -> Dict[str, Any]:
        """Verifies Write-Ahead Log disk presence, write access, and size metrics."""
        try:
            if not os.path.exists(self.wal_path):
                with open(self.wal_path, "a") as f:
                    f.write("")
            
            stat = os.stat(self.wal_path)
            return {
                "healthy": True,
                "size_bytes": stat.st_size,
                "last_modified": int(stat.st_mtime)
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e)
            }

    def check_environment_keys(self) -> Dict[str, Any]:
        """Verifies signature key load status without leaking secrets."""
        has_key = bool(os.getenv("HL_TESTNET_PRIVATE_KEY") or os.getenv("HL_MAINNET_PRIVATE_KEY"))
        return {
            "healthy": True,
            "keys_loaded": has_key
        }

    def run_health_check(self) -> Dict[str, Any]:
        """Executes a full diagnostic sweep across all core ZETA sub-systems."""
        net = self.check_network_socket()
        wal = self.check_wal_integrity()
        env = self.check_environment_keys()
        
        all_healthy = net["healthy"] and wal["healthy"] and env["healthy"]
        
        report = {
            "timestamp": int(time.time()),
            "status": "OPERATIONAL" if all_healthy else "DEGRADED",
            "network": net,
            "wal": wal,
            "environment": env
        }
        
        status_icon = "🟢" if all_healthy else "🔴"
        logger.info(
            f"{status_icon} Status: {report['status']} | "
            f"Latency: {net.get('latency_ms')}ms | "
            f"WAL Size: {wal.get('size_bytes')}B | "
            f"Key Configured: {env['keys_loaded']}"
        )
        return report

if __name__ == "__main__":
    monitor = ZETAHeartbeatMonitor()
    print("\n--- Running Single ZETA Heartbeat Diagnostic ---")
    diag = monitor.run_health_check()
    print(json.dumps(diag, indent=2))
