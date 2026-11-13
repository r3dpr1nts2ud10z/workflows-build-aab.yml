import json
import logging
import urllib.request
from typing import Dict, Any, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ZETA.StateReconciler")

class HyperliquidStateReconciler:
    """
    Queries L1 REST info endpoints on boot to reconcile 
    local WAL state with ground-truth exchange state.
    """
    MAINNET_INFO = "https://api.hyperliquid.xyz/info"
    TESTNET_INFO = "https://api.hyperliquid-testnet.xyz/info"

    def __init__(self, testnet: bool = True):
        self.url = self.TESTNET_INFO if testnet else self.MAINNET_INFO

    def fetch_user_state(self, user_address: str) -> Dict[str, Any]:
        """Fetch open positions, margin summary, and account equity."""
        payload = json.dumps({
            "type": "clearinghouseState",
            "user": user_address
        }).encode("utf-8")

        req = urllib.request.Request(
            self.url,
            data=payload,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                logger.info(f"Successfully fetched user state for {user_address[:6]}...{user_address[-4:]}")
                return data
        except Exception as e:
            logger.error(f"Failed to reconcile state with L1 REST endpoint: {e}")
            raise ConnectionError(f"REST Reconciliation Failed: {e}")

    def reconcile_wal_with_l1(self, wal_open_cloids: List[str], l1_open_orders: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Cross-references local WAL order IDs with live L1 open orders.
        Detects filled, canceled, or orphan orders.
        """
        l1_cloids = {o.get("cloid") for o in l1_open_orders if o.get("cloid")}
        
        matched = []
        filled_or_canceled_in_flight = []

        for cloid in wal_open_cloids:
            if cloid in l1_cloids:
                matched.append(cloid)
            else:
                filled_or_canceled_in_flight.append(cloid)

        reconciliation_report = {
            "matched_orders": matched,
            "resolved_in_flight": filled_or_canceled_in_flight,
            "status": "CLEARED" if len(filled_or_canceled_in_flight) == 0 else "ACTION_REQUIRED"
        }
        
        return reconciliation_report
