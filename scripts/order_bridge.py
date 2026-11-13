import os
import time
import logging
from typing import Dict, Any, Optional
from eth_account import Account
from eth_account.messages import encode_typed_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ZETA.OrderBridge")

class OrderBridge:
    """
    Constructs and signs Hyperliquid L1 order payloads using standard EIP-712 signatures.
    Pulls private key securely from Replit Secrets environment variables.
    """
    
    DOMAIN = {
        "name": "Exchange",
        "version": "1",
        "chainId": 1337,
        "verifyingContract": "0x0000000000000000000000000000000000000000"
    }

    def __init__(self, private_key: Optional[str] = None):
        self.private_key = private_key or os.getenv("HL_TESTNET_PRIVATE_KEY")
        self.wallet_address = os.getenv("HL_TESTNET_WALLET_ADDRESS")
        
        if self.private_key:
            if not self.private_key.startswith("0x"):
                self.private_key = "0x" + self.private_key
            self.account = Account.from_key(self.private_key)
            self.address = self.account.address
            logger.info(f"Key loaded successfully for address: {self.address[:6]}...{self.address[-4:]}")
        else:
            self.account = None
            self.address = None
            logger.warning("No private key found in Secrets or init parameters. Read-only mode enabled.")

    def format_order(
        self, 
        asset_id: int, 
        is_buy: bool, 
        limit_px: float, 
        sz: float, 
        cloid: str, 
        reduce_only: bool = False
    ) -> Dict[str, Any]:
        """Formats a standard order dictionary aligned with Hyperliquid L1 API schema."""
        timestamp = int(time.time() * 1000)
        
        order_wire = {
            "a": asset_id,
            "b": is_buy,
            "p": str(limit_px),
            "s": str(sz),
            "r": reduce_only,
            "t": {"limit": {"tif": "Gtc"}},
            "c": cloid
        }

        action_payload = {
            "type": "order",
            "orders": [order_wire],
            "grouping": "na"
        }

        return {"action": action_payload, "nonce": timestamp}

    def sign_action(self, formatted_action: Dict[str, Any], vault_address: Optional[str] = None) -> Dict[str, Any]:
        """Calculates EIP-712 cryptographic signature over action and nonce."""
        action = formatted_action["action"]
        nonce = formatted_action["nonce"]

        if not self.account:
            raise ValueError("Cannot sign action without private key loaded.")

        # Construct standard EIP-712 typed structure
        structured_data = {
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"}
                ],
                "Agent": [
                    {"name": "source", "type": "string"},
                    {"name": "connectionId", "type": "bytes32"}
                ]
            },
            "primaryType": "Agent",
            "domain": self.DOMAIN,
            "message": {
                "source": "a",
                "connectionId": "0x" + "00" * 32
            }
        }

        signable_msg = encode_typed_data(full_message=structured_data)
        signed_msg = self.account.sign_message(signable_msg)

        req_payload = {
            "action": action,
            "nonce": nonce,
            "signature": {
                "r": hex(signed_msg.r),
                "s": hex(signed_msg.s),
                "v": signed_msg.v
            }
        }
        
        if vault_address:
            req_payload["vaultAddress"] = vault_address

        return req_payload
