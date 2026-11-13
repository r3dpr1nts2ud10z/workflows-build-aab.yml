import sys
import os
os.environ['PYTHONUNBUFFERED'] = '1'

print("1. About to import os, sys, time...", flush=True)
import time
print("   -> Success!", flush=True)

print("2. About to import requests...", flush=True)
import requests
print("   -> Success!", flush=True)

print("3. About to import eth_account (Account)...", flush=True)
from eth_account import Account
print("   -> Success!", flush=True)

print("4. About to import hyperliquid.exchange...", flush=True)
from hyperliquid.exchange import Exchange
print("   -> Success!", flush=True)

print("ALL IMPORTS LOADED CLEANLY!", flush=True)
