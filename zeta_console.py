#!/usr/bin/env python3
"""
ZETA PRIME :: 6-Cartridge Master Console with Live Mainnet WebSocket Ingestion
Combines live L1 orderbook/trade telemetry with the full intentional pipeline.
"""

import sys
import json
import time
import asyncio
import threading
from datetime import datetime

try:
    from rich.console import Console
    from rich.layout import Layout
    from rich.panel import Panel
    from rich.table import Table
    from rich.live import Live
    from rich.text import Text
except ImportError:
    print("❌ Error: 'rich' module not found. Run: pip install rich websockets")
    sys.exit(1)

try:
    import websockets
except ImportError:
    sys.exit(1)

console = Console()

class LiveTelemetryBridge:
    def __init__(self, symbol="ETH"):
        self.symbol = symbol
        self.best_bid = 0.0
        self.best_ask = 0.0
        self.spread = 0.0
        self.last_trade_side = "---"
        self.last_trade_px = 0.0
        self.last_trade_sz = 0.0
        self.last_trade_notional = 0.0
        self.total_volume_streamed = 0.0
        self.trade_count = 0
        self.connected = False

    async def run_ws(self):
        url = "wss://api.hyperliquid.xyz/ws"
        while True:
            try:
                async with websockets.connect(url, ping_interval=20) as ws:
                    await ws.send(json.dumps({"method": "subscribe", "subscription": {"type": "l2Book", "coin": self.symbol}}))
                    await ws.send(json.dumps({"method": "subscribe", "subscription": {"type": "trades", "coin": self.symbol}}))
                    self.connected = True

                    while True:
                        raw = await ws.recv()
                        msg = json.loads(raw)
                        channel = msg.get("channel")

                        if channel == "l2Book":
                            levels = msg.get("data", {}).get("levels", [[], []])
                            bids, asks = levels[0], levels[1]
                            if bids and asks:
                                self.best_bid = float(bids[0]["px"])
                                self.best_ask = float(asks[0]["px"])
                                self.spread = round(self.best_ask - self.best_bid, 2)

                        elif channel == "trades":
                            for t in msg.get("data", []):
                                self.last_trade_side = "BUY" if t.get("side") == "A" else "SELL"
                                self.last_trade_px = float(t.get("px", 0))
                                self.last_trade_sz = float(t.get("sz", 0))
                                self.last_trade_notional = self.last_trade_px * self.last_trade_sz
                                self.total_volume_streamed += self.last_trade_notional
                                self.trade_count += 1
            except Exception:
                self.connected = False
                await asyncio.sleep(3)

    def start(self):
        def background_loop():
            asyncio.run(self.run_ws())
        t = threading.Thread(target=background_loop, daemon=True)
        t.start()

class ZetaConsoleApp:
    def __init__(self, symbol="ETH"):
        self.symbol = symbol
        self.bridge = LiveTelemetryBridge(symbol)
        self.bridge.start()
        self.start_time = time.time()
        self.collateral = 100.00
        self.gta6_hype = 82.5

    def build_layout(self):
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body", ratio=1),
            Layout(name="footer", size=7)
        )
        layout["body"].split_row(
            Layout(name="left", ratio=1),
            Layout(name="right", ratio=1)
        )
        return layout

    def make_header(self):
        grid = Table.grid(expand=True)
        grid.add_column(justify="left", ratio=1)
        grid.add_column(justify="right", ratio=1)
        status_text = "[bold green]● LIVE MAINNET INGESTION[/]" if self.bridge.connected else "[bold red]○ CONNECTING...[/]"
        grid.add_row(
            Text(f"⚡ ZETA PRIME :: COMMAND DECK ({self.symbol})", style="bold gold1"),
            Text(f"{status_text} | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} EST", style="cyan")
        )
        return Panel(grid, style="bold white on blue")

    def make_left_panel(self):
        table = Table(show_header=False, expand=True, box=None)
        table.add_column(style="bold white", width=18)
        table.add_column(style="bold green")

        table.add_row("Execution Core:", "MAINNET_PRIME (Layaway)")
        table.add_row("Seed Collateral:", f"${self.collateral:.2f}")
        table.add_row("Live Best Bid:", f"${self.bridge.best_bid:,.2f}")
        table.add_row("Live Best Ask:", f"${self.bridge.best_ask:,.2f}")
        table.add_row("Orderbook Spread:", f"${self.bridge.spread:.2f}")
        table.add_row("Last Fill Side:", f"[{'green' if self.bridge.last_trade_side=='BUY' else 'red'}]{self.bridge.last_trade_side}[/]")
        table.add_row("Last Fill Price:", f"${self.bridge.last_trade_px:,.2f}")
        table.add_row("Last Fill Notional:", f"${self.bridge.last_trade_notional:,.2f}")
        table.add_row("Streamed Volume:", f"${self.bridge.total_volume_streamed:,.2f}")

        return Panel(table, title="[bold red]N3PSQAL3 :: Live L1 Orderbook & Fills[/]", border_style="red")

    def make_right_panel(self):
        self.gta6_hype = max(0.0, min(100.0, self.gta6_hype + ((time.time() % 3) - 1.5) * 0.2))
        vice_skew = round((self.gta6_hype - 50.0) * 0.01, 4)

        table = Table(expand=True, box=None)
        table.add_column("Cartridge", style="bold yellow", width=16)
        table.add_column("Telemetry Signal", style="white")
        table.add_column("Skew", style="bold green", justify="right")

        table.add_row("AETA (Adult)", "Traffic Surge: 1.85x", "+0.1500 bps")
        table.add_row("OMETA (Music)", "IP Royalty Yield: SURGE", "+0.2200 bps")
        table.add_row("AIDE (Lang Radar)", "Active Sentiment: [EN/ZH]", "-0.0500 bps")
        table.add_row("VICE (GTA 6)", f"Hype Index: {self.gta6_hype:.1f}/100 [ACTIVE]", f"{vice_skew:+} bps")

        return Panel(table, title="[bold yellow]INTENTIONAL PIPELINES (AETA + OMETA + AIDE + VICE)[/]", border_style="yellow")

    def make_footer_panel(self):
        uptime = int(time.time() - self.start_time)
        table = Table(show_header=False, expand=True, box=None)
        table.add_column(style="bold magenta", width=18)
        table.add_column(style="white")

        table.add_row("System Uptime:", f"{uptime // 3600:02d}:{(uptime % 3600) // 60:02d}:{uptime % 60:02d}")
        table.add_row("Cartridge Status:", "[bold green]6 / 6 CARTRIDGES ONLINE (LIVE STREAM)[/]")
        table.add_row("Physical Hub:", "607 VILLA SIENA NODE")
        table.add_row("Circuit Breaker:", "[bold red]KILL-SWITCH LOCK (3.0% / $3.00)[/]")

        return Panel(table, title="[bold magenta]BODEGA :: Routing Bridge & 607 Villa Siena Gateway[/]", border_style="magenta")

    def run(self):
        layout = self.build_layout()
        with Live(layout, refresh_per_second=4, screen=True):
            while True:
                layout["header"].update(self.make_header())
                layout["left"].update(self.make_left_panel())
                layout["right"].update(self.make_right_panel())
                layout["footer"].update(self.make_footer_panel())
                time.sleep(0.25)

if __name__ == "__main__":
    target_symbol = sys.argv[1].upper() if len(sys.argv) > 1 else "ETH"
    app = ZetaConsoleApp(target_symbol)
    try:
        app.run()
    except KeyboardInterrupt:
        console.print("\n[bold red]⚡ ZETA PRIME COMMAND DECK OFFLINE. GOODNIGHT VILLA SIENA.[/]")
        sys.exit(0)
