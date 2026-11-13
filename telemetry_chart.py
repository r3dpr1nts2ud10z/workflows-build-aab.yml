import subprocess
import sys

# Ensure dependencies are installed cleanly in the user space
try:
    import matplotlib
    import numpy
except ImportError:
    print("[*] Installing required telemetry packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "matplotlib", "numpy", "--user", "--quiet"])

import matplotlib.pyplot as plt
import numpy as np

# 1. Define telemetry data points (Elapsed Time vs Cumulative Notional Volume)
hours = np.array([0.0, 1.0, 2.0, 3.0, 4.0])
volume = np.array([0.0, 0.28, 0.58, 0.88, 1.1])

# 2. Configure dark terminal canvas
fig, ax = plt.subplots(figsize=(9, 4.5), facecolor='#0d1117')
ax.set_facecolor('#161b22')

# 3. Plot main telemetry line with glowing marker styling
ax.plot(
    hours, volume, 
    color='#58a6ff', 
    linewidth=3, 
    marker='o', 
    markerfacecolor='#3fb950', 
    markeredgecolor='#3fb950', 
    markersize=8
)
ax.fill_between(hours, volume, color='#58a6ff', alpha=0.15)

# 4. Set chart labels and terminal styling
ax.set_title('ZETA PRIME // Live Telemetry: Cumulative Notional Ingestion ($B)', color='#c9d1d9', fontsize=12, fontweight='bold', pad=15)
ax.set_xlabel('Elapsed Time (Hours)', color='#8b949e', fontsize=10)
ax.set_ylabel('Volume ($ Billions)', color='#8b949e', fontsize=10)

ax.tick_params(colors='#8b949e', labelsize=9)
for spine in ax.spines.values():
    spine.set_color('#30363d')

ax.grid(True, linestyle='--', alpha=0.2, color='#8b949e')

# 5. Annotate the $1.1B milestone peak
ax.annotate(
    ' $1.1B (4 hrs)', 
    xy=(4.0, 1.1), 
    xytext=(3.2, 1.0),
    color='#3fb950', 
    fontweight='bold', 
    fontsize=11,
    arrowprops=dict(arrowstyle="->", color='#3fb950', lw=1.5)
)

# 6. Save output for workspace display
plt.tight_layout()
plt.savefig('telemetry_chart.png', dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
print("[+] Telemetry chart successfully rendered and saved as 'telemetry_chart.png'!")
