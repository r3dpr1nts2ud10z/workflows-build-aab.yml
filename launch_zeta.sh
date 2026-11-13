#!/usr/bin/env bash

SESSION="zeta_prime"

# Kill old session if it exists
tmux kill-session -t $SESSION 2>/dev/null

# Start main session (Left Pane: Engine)
tmux new-session -d -s $SESSION -n "Console" "python3 n3psqal3_engine.py"

# Split pane vertically (Right Pane: Telemetry Dashboard)
tmux split-window -h -t $SESSION:0 "python3 zeta_console.py"

# Balance pane sizes 50/50
tmux select-layout -t $SESSION:0 even-horizontal

# Attach to the session
tmux attach-session -t $SESSION
