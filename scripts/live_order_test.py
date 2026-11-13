import os
import asyncio
import logging
from scripts.order_bridge import OrderBridge

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] ZETA Exec: %(message)s")
logger = logging.getLogger("ZETA.LiveTest")

def execute_signed_order_test():
    logger.info("Initializing Live Order Execution Test...")
    
    bridge = OrderBridge()
    
    if not bridge.account:
        logger.error("❌ Execution aborted: HL_TESTNET_PRIVATE_KEY not found in Secrets.")
        return

    logger.info(f"Signing payload for Wallet: {bridge.address}")
    
    # Format test limit order (Asset 0 = ETH/BTC market)
    cloid_hex = "0x00000000000000000000000000000001"
    order_payload = bridge.format_order(
        asset_id=0,
        is_buy=True,
        limit_px=2500.0,
        sz=0.01,
        cloid=cloid_hex,
        reduce_only=False
    )
    
    # Generate cryptographic signature structure
    signed_action = bridge.sign_action(order_payload)
    
    logger.info("✅ Order signed successfully.")
    logger.info(f"Target Nonce: {signed_action['nonce']}")
    logger.info(f"Action Type: {signed_action['action']['type']}")
    logger.info(f"CLOID Assigned: {signed_action['action']['orders'][0]['cloid']}")
    logger.info(f"Order Wire: {signed_action['action']['orders'][0]}")

if __name__ == "__main__":
    execute_signed_order_test()
