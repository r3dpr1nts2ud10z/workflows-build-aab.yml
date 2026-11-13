import os
import sys
import time
os.environ['PYTHONUNBUFFERED'] = '1'

print("1. Importing modules...", flush=True)
from eth_account import Account
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants

account_address = os.getenv("HYPERLIQUID_MAIN_ADDRESS")
agent_key = os.getenv("HYPERLIQUID_AGENT_KEY")

print(f"2. Env check -> Address: {bool(account_address)}, Key: {bool(agent_key)}", flush=True)

if agent_key:
    print("3. Attempting Account.from_key()...", flush=True)
    try:
        agent_account = Account.from_key(agent_key)
        print("   -> Account.from_key() SUCCESS!", flush=True)
    except Exception as e:
        print(f"   -> Account.from_key() FAILED: {e}", flush=True)

    print("4. Attempting Exchange initialization...", flush=True)
    try:
        # Pass skip_ws or check parameters if needed
        exchange = Exchange(agent_account, constants.MAINNET_API_URL, account_address=account_address)
        print("   -> Exchange initialization SUCCESS!", flush=True)
    except Exception as e:
        print(f"   -> Exchange initialization FAILED: {e}", flush=True)
else:
    print("❌ Agent key not found in environment secrets.", flush=True)

print("ALL STEPS COMPLETED!", flush=True)
