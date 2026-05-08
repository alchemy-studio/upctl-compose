#!/bin/bash
set -e

echo "[ai-agent] Setting up workspace..."
mkdir -p /app/workspace

# Start tmux session for interactive agent work
echo "[ai-agent] Starting tmux session..."
tmux new-session -d -s deepseek-agent -c /app/workspace 2>/dev/null || true

# Start the polling worker
echo "[ai-agent] Starting poll worker..."
exec python3 /app/poll_worker.py
