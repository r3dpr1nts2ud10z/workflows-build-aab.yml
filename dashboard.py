import http.server
import socketserver
import json
import threading
import time
import random
import os

PORT = int(os.environ.get("PORT", 8080))
socketserver.TCPServer.allow_reuse_address = True

# Vice City Synthwave Command Center State
cartridge_data = {
    "engine": "VICE CITY // COMMAND CENTER",
    "status": "ONLINE // MAXIMUM SUNSET SYNC",
    "timestamp": "--",
    "history": [15, 18, 22, 20, 25, 28, 32],
    "cartridges": {
        "N3PSQAL3": {
            "name": "N3PSQAL3",
            "function": "Neon Grid Indexing & Retro Wave Telemetry",
            "value": 88.50,
            "volume": "$154.2M",
            "yield": 6.82,
            "status": "HOT"
        },
        "AETA": {
            "name": "AETA",
            "function": "Ocean Drive Momentum & Spread Execution",
            "value": 45.20,
            "volume": "$92.8M",
            "yield": 4.50,
            "status": "ACTIVE"
        },
        "HYPE": {
            "name": "HYPE-PERP",
            "function": "Vice City L1 Core Protocol Settlement",
            "value": 86.20,
            "volume": "$612.4M",
            "yield": 5.15,
            "status": "LIVE"
        },
        "SOL": {
            "name": "SOL-PERP",
            "function": "Biscayne Bay High-Speed Liquidity Flow",
            "value": 124.80,
            "volume": "$1.52B",
            "yield": 7.40,
            "status": "LIVE"
        },
        "PURR": {
            "name": "PURR",
            "function": "Palm Tree Meme Volatility Harvester",
            "value": 0.178,
            "volume": "$49.6M",
            "yield": 11.20,
            "status": "SPIKING"
        },
        "KITE": {
            "name": "KITE",
            "function": "Club Downtown Cross-Chain Arbitrage",
            "value": 0.162,
            "volume": "$35.4M",
            "yield": 8.60,
            "status": "VOLATILE"
        }
    }
}

def vice_city_simulator():
    global cartridge_data
    while True:
        c = cartridge_data["cartridges"]
        c["N3PSQAL3"]["value"] = round(88.50 + random.uniform(-0.6, 0.6), 2)
        c["N3PSQAL3"]["yield"] = round(random.uniform(5.0, 8.5), 2)

        c["AETA"]["value"] = round(45.20 + random.uniform(-0.4, 0.4), 2)
        c["AETA"]["yield"] = round(random.uniform(3.5, 6.0), 2)

        c["HYPE"]["value"] = round(86.20 + random.uniform(-0.9, 0.9), 2)
        c["HYPE"]["yield"] = round(random.uniform(4.0, 7.0), 2)

        c["SOL"]["value"]  = round(124.80 + random.uniform(-1.5, 1.5), 2)
        c["SOL"]["yield"]  = round(random.uniform(5.5, 9.8), 2)

        c["PURR"]["value"] = round(0.178 + random.uniform(-0.003, 0.003), 4)
        c["PURR"]["yield"] = round(random.uniform(8.0, 14.5), 2)

        c["KITE"]["value"] = round(0.162 + random.uniform(-0.003, 0.003), 4)
        c["KITE"]["yield"] = round(random.uniform(6.5, 12.0), 2)

        cartridge_data["timestamp"] = time.strftime("%H:%M:%S")
        cartridge_data["history"].append(c["N3PSQAL3"]["yield"])
        if len(cartridge_data["history"]) > 25:
            cartridge_data["history"].pop(0)

        time.sleep(1)

t = threading.Thread(target=vice_city_simulator, daemon=True)
t.start()

class EngineHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(cartridge_data).encode('utf-8'))
        else:
            super().do_GET()

HTML_CONTENT = """<!DOCTYPE html>
<html>
<head>
    <title>VICE CITY // COMMAND CENTER</title>
    <style>
        body { 
            background: linear-gradient(135deg, #1b003a 0%, #0b0c10 50%, #2b0b2e 100%); 
            color: #ff77ff; 
            font-family: 'Courier New', monospace; 
            padding: 20px; 
            min-height: 100vh;
        }
        .header { 
            border-bottom: 2px solid #ff007f; 
            padding-bottom: 12px; 
            margin-bottom: 20px; 
            text-shadow: 0 0 10px #ff007f;
        }
        .header h2 { color: #00ffff; text-shadow: 0 0 10px #00ffff; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; max-width: 1050px; }
        .cartridge { 
            border: 1px solid #ff007f; 
            padding: 18px; 
            border-radius: 8px; 
            background: rgba(31, 40, 51, 0.85); 
            box-shadow: 0 0 15px rgba(255, 0, 127, 0.3); 
            display: flex; 
            flex-direction: column; 
            justify-content: space-between; 
        }
        .tag { 
            background: #ff007f; 
            color: #ffffff; 
            padding: 2px 8px; 
            font-weight: bold; 
            font-size: 10px; 
            border-radius: 4px; 
            float: right; 
            box-shadow: 0 0 8px #ff007f;
        }
        .title { font-size: 18px; font-weight: bold; color: #00ffff; margin-bottom: 6px; text-shadow: 0 0 5px #00ffff; }
        .func { font-size: 11px; color: #ffb3ff; margin-bottom: 12px; min-height: 30px; line-height: 1.3; }
        .metrics { border-top: 1px dashed #ff007f; padding-top: 10px; font-size: 13px; }
        .value { font-size: 20px; color: #00ffcc; font-weight: bold; margin-bottom: 4px; text-shadow: 0 0 5px #00ffcc; }
        .yield { color: #00ff66; font-weight: bold; text-shadow: 0 0 5px #00ff66; }
        .vol { color: #b3c6c7; font-size: 11px; }
        canvas { width: 100%; height: 110px; background: #0b0c10; border: 1px solid #00ffff; border-radius: 4px; margin-top: 15px; box-shadow: 0 0 10px rgba(0,255,255,0.2); }
    </style>
</head>
<body>
    <div class="header">
        <h2>VICE CITY // L1 COMMAND CENTER</h2>
        <p>SUNSET STATUS: <span style="color: #00ff66; text-shadow: 0 0 5px #00ff66;">ONLINE</span> | SYNC TICK: <span id="tick">--</span></p>
    </div>
    
    <div class="grid" id="cartridges"></div>

    <div style="max-width: 1050px; margin-top: 20px; border: 1px solid #ff007f; padding: 15px; border-radius: 8px; background: rgba(31, 40, 51, 0.85); box-shadow: 0 0 15px rgba(255, 0, 127, 0.3);">
        <h3 style="color: #00ffff; text-shadow: 0 0 5px #00ffff;">NEON YIELD VELOCITY PULSE</h3>
        <canvas id="chart"></canvas>
    </div>

    <script>
        const canvas = document.getElementById('chart');
        const ctx = canvas.getContext('2d');

        function drawChart(dataArray) {
            canvas.width = canvas.parentElement.clientWidth - 30;
            canvas.height = 110;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00ffff';
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
            ctx.shadowBlur = 0; // reset shadow
        }

        async function update() {
            try {
                let res = await fetch('/api/status');
                let d = await res.json();
                document.getElementById('tick').innerText = d.timestamp;
                
                let container = document.getElementById('cartridges');
                container.innerHTML = '';
                
                for (let key in d.cartridges) {
                    let item = d.cartridges[key];
                    container.innerHTML += `
                        <div class="cartridge">
                            <div>
                                <span class="tag">${item.status}</span>
                                <div class="title">${item.name}</div>
                                <div class="func">${item.function}</div>
                            </div>
                            <div class="metrics">
                                <div class="value">$${item.value}</div>
                                <div>YIELD: <span class="yield">+${item.yield}%</span></div>
                                <div class="vol">24H VOL: ${item.volume}</div>
                            </div>
                        </div>
                    `;
                }
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

Handler = EngineHandler
with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"VICE CITY Command Center active on port {PORT}")
    httpd.serve_forever()
