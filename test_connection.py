import os
import sys
import requests

os.environ['PYTHONUNBUFFERED'] = '1'
print("🔥 [DIAGNOSTIC] Script started successfully! Python execution is alive.", flush=True)

url = "https://api.hyperliquid.xyz/info"
payload = {"type": "meta"}

print("🌐 [DIAGNOSTIC] Attempting raw HTTP connection to Hyperliquid L1...", flush=True)

try:
    response = requests.post(url, json=payload, timeout=5)
    print(f"✅ [DIAGNOSTIC] Connection successful! Status Code: {response.status_code}", flush=True)
    data = response.json()
    print(f"📡 [DIAGNOSTIC] Asset universe loaded. Total assets tracked: {len(data.get('universe', []))}", flush=True)
except requests.exceptions.Timeout:
    print("❌ [DIAGNOSTIC ERROR] Connection timed out! Your VPN is blocking or severely lagging the Hyperliquid API endpoint.", flush=True)
except Exception as e:
    print(f"❌ [DIAGNOSTIC ERROR] Failed to connect: {e}", flush=True)
