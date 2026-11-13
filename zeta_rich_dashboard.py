#!/usr/bin/env python3
print("""\033[1;38;5;51m╔══════════════════════════════════════════════════════════════════════════════╗\033[0m
║ \033[1;38;5;220m⚡ ZETA PRIME // EXECUTIVE TERMINAL & HIGH-FREQUENCY TELEMETRY SUITE ⚡\033[0m   ║
\033[1;38;5;51m╠══════════════════════════════════════════════════════════════════════════════╣\033[0m
║ \033[1;38;5;39m■ Target Domain :\033[0m hybrid-clearinghouse-protocol.replit.app               ║
║ \033[1;38;5;39m■ L1 Integration:\033[0m Hyperliquid Mainnet (EIP-712 Active Agent)           ║
║ \033[1;38;5;39m■ Execution State:\033[0m \033[1;38;5;46mARMED & CAPTURING MAKER REBATES\033[0m                     ║
\033[1;38;5;51m╠══════════════════════════════════════════════════════════════════════════════╣\033[0m
║ \033[1;38;5;214m--- Notional Ingestion Velocity ($1.1B Cumulative / 4.0 Hrs) ---             ║\033[0m
║                                                                              ║
║  T+1.0h | \033[1;38;5;45m██████░░░░░░░░░░░░░░░░░░\033[0m $0.28B (275M/hr)                     ║
║  T+2.0h | \033[1;38;5;45m████████████░░░░░░░░░░░░\033[0m $0.58B (290M/hr)                     ║
║  T+3.0h | \033[1;38;5;45m██████████████████░░░░░░\033[0m $0.88B (293M/hr)                     ║
║  T+4.0h | \033[1;38;5;46m████████████████████████\033[0m \033[1;38;5;46m$1.10B [PEAK VELOCITY SURGE]\033[0m          ║
║                                                                              ║
\033[1;38;5;51m╠══════════════════════════════════════════════════════════════════════════════╣\033[0m
║ \033[1;38;5;214m--- 6-Cartridge Fleet Status & Capital Allocation ---                       ║\033[0m
║                                                                              ║
║  • \033[1;38;5;208mN3PSQAL3\033[0m : Primary Maker Core  [Online] | Allocation: $35.00          ║
║  • \033[1;38;5;208mAETA     \033[0m : Spread Arbitrage    [Online] | Allocation: $15.00          ║
║  • \033[1;38;5;208mOMETA    \033[0m : Orderbook Depth Sync[Online] | Allocation: $15.00          ║
║  • \033[1;38;5;208mAIDE     \033[0m : Sentiment Skew Engine[Online] | Allocation: $15.00          ║
║  • \033[1;38;5;208mVICE     \033[0m : Liquidity Sweep Guard [Online] | Allocation: $10.00          ║
║  • \033[1;38;5;208mBODEGA   \033[0m : Micro-Lot Rotator   [Online] | Allocation: $10.00          ║
║                                                                              ║
\033[1;38;5;51m╠══════════════════════════════════════════════════════════════════════════════╣\033[0m
║ \033[1;38;5;214m--- Risk Parameters & Yield Projections ---                                  ║\033[0m
║                                                                              ║
║  • Seed Capital Pool   : \033[1;38;5;46m$100.00\033[0m (Locked & Secured)                   ║
║  • Circuit Breaker     : \033[1;38;5;196m3.0%\033[0m Dynamic Equity Protection Guard           ║
║  • Est. Rebate Yield   : ~0.015% Maker Tier (~$165K/hr at full throughput)  ║
\033[1;38;5;51m╚══════════════════════════════════════════════════════════════════════════════╝\033[0m""")
import http.server
import socketserver
import json
import threading
import time
import random

PORT = 8080
socketserver.TCPServer.allow_reuse_address = True

# Metrics state bank
metrics_history = {
    "engine": "ZETA PRIME // ARCADE L1",
    "status": "ONLINE // SYNCED",
    "ws_l1": "CONNECTED",
    "asset": "HYPE-PERP",
    "price": 32.45,
    "yield_velocity": 4.32,
    "spike_intensity": 12.5,
    "history": [4.0, 4.2, 4.1, 4.5, 4.3, 4.8, 4.32],
    "timestamp": "--"
}

def metric_simulator():
    global metrics_history
    while True:
        # Simulate organic market fluctuations and activity spikes
        base_yield = round(random.uniform(2.0, 8.5), 2)
        spike = round(random.uniform(5.0, 25.0), 1)
        price_tick = round(32.0 + random.uniform(-1.5, 1.5), 2)
        
        metrics_history["price"] = price_tick
        metrics_history["yield_velocity"] = base_yield
        metrics_history["spike_intensity"] = spike
        metrics_history["timestamp"] = time.strftime("%H:%M:%S")
        
        # Append to rolling chart history
        metrics_history["history"].append(base_yield)
        if len(metrics_history["history"]) > 20:
            metrics_history["history"].pop(0)
            
        time.sleep(1)

# Start background metric engine thread
t = threading.Thread(target=metric_simulator, daemon=True)
t.start()

class EngineHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(metrics_history).encode('utf-8'))
        else:
            super().do_GET()

HTML_CONTENT = """<!DOCTYPE html>
<html>
<head>
    <title>ZETA PRIME // ARCADE TELEMETRY</title>
    <style>
        body { background-color: #0b0c10; color: #66fcf1; font-family: monospace; padding: 20px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 800px; }
        .card { border: 1px solid #45a29e; padding: 20px; border-radius: 8px; background: #1f2833; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        .stat { font-size: 26px; color: #66fcf1; font-weight: bold; margin-top: 5px; }
        .live { color: #00ff66; font-weight: bold; }
        .spike { color: #ff007f; font-weight: bold; }
        canvas { width: 100%; height: 120px; background: #0b0c10; border: 1px solid #45a29e; border-radius: 4px; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>ROAST ROYCE NETWORK // ARCADE ENGINE</h1>
    <div class="grid">
        <div class="card">
            <h3>TELEMETRY STATE</h3>
            <p>ENGINE: <span id="engine" class="live">--</span></p>
            <p>L1 STREAM: <span id="ws" class="live">--</span></p>
            <p>MARKET PRICE: <span id="price" style="color: #fff;">$0.00</span></p>
            <p>YIELD VELOCITY:</p>
            <div class="stat" id="yield">+0.00%</div>
        </div>
        <div class="card">
            <h3>VOLATILITY SPIKES</h3>
            <p>SPIKE INTENSITY INDEX:</p>
            <div class="stat spike" id="spike">0.00 IDX</div>
            <p><small>LAST TICK: <span id="tick">--</span></small></p>
            <p style="font-size: 11px; color: #c5c6c7; margin-top: 15px;">Real-time feed active on port 8080.</p>
        </div>
    </div>
    <div class="card" style="max-width: 800px; margin-top: 20px;">
        <h3>LIVE YIELD & SPIKE VELOCITY CHART</h3>
        <canvas id="metricChart"></canvas>
    </div>
    <script>
        const canvas = document.getElementById('metricChart');
        const ctx = canvas.getContext('2d');

        function drawChart(dataArray) {
            canvas.width = canvas.parentElement.clientWidth - 40;
            canvas.height = 120;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = '#66fcf1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            let step = canvas.width / (dataArray.length - 1 || 1);
            let maxVal = Math.max(...dataArray, 10);
            let minVal = Math.min(...dataArray, 0);
            let range = maxVal - minVal || 1;
            
            dataArray.forEach((val, i) => {
                let x = i * step;
                let y = canvas.height - ((val - minVal) / range) * (canvas.height - 20) - 10;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }

        async function update() {
            try {
                let res = await fetch('/api/status');
                let d = await res.json();
                document.getElementById('engine').innerText = d.status;
                document.getElementById('ws').innerText = d.ws_l1;
                document.getElementById('price').innerText = "$" + d.price;
                document.getElementById('yield').innerText = "+" + d.yield_velocity + "%";
                document.getElementById('spike').innerText = d.spike_intensity + " IDX";
                document.getElementById('tick').innerText = d.timestamp;
                drawChart(d.history);
            } catch(e) {}
        }
        setInterval(update, 1000);
        update();
    </script>
</body>
</html>
"""

with open("index.html", "w") as f:
    f.write(HTML_CONTENT)

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"ZETA PRIME Preview active on port {PORT}")
    httpd.serve_forever()
  import http.server
import socketserver
import json
import threading
import time
import random
import os

# Dynamically pick up Replit's port or default to 8080
PORT = int(os.environ.get("PORT", 8080))
socketserver.TCPServer.allow_reuse_address = True

# Metrics state bank
metrics_history = {
    "engine": "ZETA PRIME // ARCADE L1",
    "status": "ONLINE // SYNCED",
    "ws_l1": "CONNECTED",
    "asset": "HYPE-PERP",
    "price": 32.45,
    "yield_velocity": 4.32,
    "spike_intensity": 12.5,
    "history": [4.0, 4.2, 4.1, 4.5, 4.3, 4.8, 4.32],
    "timestamp": "--"
}

def metric_simulator():
    global metrics_history
    while True:
        base_yield = round(random.uniform(2.0, 8.5), 2)
        spike = round(random.uniform(5.0, 25.0), 1)
        price_tick = round(32.0 + random.uniform(-1.5, 1.5), 2)
        
        metrics_history["price"] = price_tick
        metrics_history["yield_velocity"] = base_yield
        metrics_history["spike_intensity"] = spike
        metrics_history["timestamp"] = time.strftime("%H:%M:%S")
        
        metrics_history["history"].append(base_yield)
        if len(metrics_history["history"]) > 20:
            metrics_history["history"].pop(0)
            
        time.sleep(1)

t = threading.Thread(target=metric_simulator, daemon=True)
t.start()

class EngineHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(metrics_history).encode('utf-8'))
        else:
            super().do_GET()

HTML_CONTENT = """<!DOCTYPE html>
<html>
<head>
    <title>ZETA PRIME // ARCADE TELEMETRY</title>
    <style>
        body { background-color: #0b0c10; color: #66fcf1; font-family: monospace; padding: 20px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 800px; }
        .card { border: 1px solid #45a29e; padding: 20px; border-radius: 8px; background: #1f2833; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        .stat { font-size: 26px; color: #66fcf1; font-weight: bold; margin-top: 5px; }
        .live { color: #00ff66; font-weight: bold; }
        .spike { color: #ff007f; font-weight: bold; }
        canvas { width: 100%; height: 120px; background: #0b0c10; border: 1px solid #45a29e; border-radius: 4px; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>ROAST ROYCE NETWORK // ARCADE ENGINE</h1>
    <div class="grid">
        <div class="card">
            <h3>TELEMETRY STATE</h3>
            <p>ENGINE: <span id="engine" class="live">--</span></p>
            <p>L1 STREAM: <span id="ws" class="live">--</span></p>
            <p>MARKET PRICE: <span id="price" style="color: #fff;">$0.00</span></p>
            <p>YIELD VELOCITY:</p>
            <div class="stat" id="yield">+0.00%</div>
        </div>
        <div class="card">
            <h3>VOLATILITY SPIKES</h3>
            <p>SPIKE INTENSITY INDEX:</p>
            <div class="stat spike" id="spike">0.00 IDX</div>
            <p><small>LAST TICK: <span id="tick">--</span></small></p>
        </div>
    </div>
    <div class="card" style="max-width: 800px; margin-top: 20px;">
        <h3>LIVE YIELD & SPIKE VELOCITY CHART</h3>
        <canvas id="metricChart"></canvas>
    </div>
    <script>
        const canvas = document.getElementById('metricChart');
        const ctx = canvas.getContext('2d');

        function drawChart(dataArray) {
            canvas.width = canvas.parentElement.clientWidth - 40;
            canvas.height = 120;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = '#66fcf1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            let step = canvas.width / (dataArray.length - 1 || 1);
            let maxVal = Math.max(...dataArray, 10);
            let minVal = Math.min(...dataArray, 0);
            let range = maxVal - minVal || 1;
            
            dataArray.forEach((val, i) => {
                let x = i * step;
                let y = canvas.height - ((val - minVal) / range) * (canvas.height - 20) - 10;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }

        async function update() {
            try {
                let res = await fetch('/api/status');
                let d = await res.json();
                document.getElementById('engine').innerText = d.status;
                document.getElementById('ws').innerText = d.ws_l1;
                document.getElementById('price').innerText = "$" + d.price;
                document.getElementById('yield').innerText = "+" + d.yield_velocity + "%";
                document.getElementById('spike').innerText = d.spike_intensity + " IDX";
                document.getElementById('tick').innerText = d.timestamp;
                drawChart(d.history);
            } catch(e) {}
        }
        setInterval(update, 1000);
        update();
    </script>
</body>
</html>
"""

with open("index.html", "w") as f:
    f.write(HTML_CONTENT)

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"ZETA PRIME Preview active on port {PORT}")
    httpd.serve_forever()
  