import os
import sys
from eth_account import Account

ACCOUNT_ADDRESS = os.getenv("HYPERLIQUID_MAIN_ADDRESS")
AGENT_KEY = os.getenv("HYPERLIQUID_AGENT_KEY")

if not ACCOUNT_ADDRESS or not AGENT_KEY:
    print("❌ ERROR: Missing credentials in Replit Secrets!", flush=True)
    sys.exit(1)

agent_account = Account.from_key(AGENT_KEY)


AGENT_KEY = os.getenv("HYPERLIQUID_AGENT_KEY")

if not ACCOUNT_ADDRESS or not AGENT_KEY:
    print("❌ ERROR: Missing credentials in Replit Secrets!", flush=True)
    sys.exit(1)

agent_account = Account.from_key(AGENT_KEY)

import os
import sys
import time
import requests
from eth_account import Account
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants

# Force instant output streaming
os.environ['PYTHONUNBUFFERED'] = '1'

print("==========================================", flush=True)
print("   ParaResident™ Cartridge 07 (Live Core) ", flush=True)
print("==========================================", flush=True)

INFO_URL = "https://api.hyperliquid.xyz/info"
EXCHANGE_URL = constants.MAINNET_API_URL
COIN = "HYPE"
POSITION_SZ = 3.5

# Load Credentials
ACCOUNT_ADDRESS = os.getenv("HYPERLIQUID_MAIN_ADDRESS")

if not AGENT_KEY or not ACCOUNT_ADDRESS:
    print("❌ ERROR: Missing credentials in Replit Secrets!", flush=True)
    sys.exit(1)

# Initialize Exchange Signer
try:
    agent_account = Account.from_key(AGENT_KEY)
    exchange = Exchange(agent_account, EXCHANGE_URL, account_address=ACCOUNT_ADDRESS)
    print("🔑 Agent Wallet & Exchange Signer Loaded Successfully.", flush=True)
except Exception as e:
    print(f"❌ Failed to initialize exchange signer: {e}", flush=True)
    sys.exit(1)

def get_current_price():
    try:
        response = requests.post(INFO_URL, json={"type": "allMids"}, timeout=5)
        if response.status_code == 200:
            return float(response.json().get(COIN, 0))
    except Exception as e:
        print(f"⚠️ Price fetch error: {e}", flush=True)
    return 0.0

if __name__ == "__main__":
    print(f"🔄 Starting ParaResident™ telemetry loop for {COIN}...", flush=True)
    
    try:
        while True:
            current_px = get_current_price()
            print(f"📡 Live {COIN} Price: ${current_px:.3f} | Engine Status: ARMED & READY", flush=True)
            time.sleep(3)
    except KeyboardInterrupt:
        print("🛑 ParaResident™ safely halted by user.", flush=True)
