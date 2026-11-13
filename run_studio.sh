#!/bin/bash
while true; do
    echo "[WATCHDOG] Starting R3DPR1NT Studio Bridge..."
    python3 studio_bridge.py
    echo "[WATCHDOG] Server stopped or crashed. Restarting in 3 seconds..."
    sleep 3
done
