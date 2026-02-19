#!/bin/bash
# Lightweight prompt watcher - polls every 5s, triggers cron wake when prompt found
AUDIO_DIR="/root/.openclaw/workspace/fablino/audio"
GW="http://127.0.0.1:18789"
TOKEN="4b264f9073d2637852644020c487f23cad337da815654fb2"

echo "Prompt watcher started (5s polling)"

while true; do
  for f in "$AUDIO_DIR"/prompt-*.json; do
    [ -f "$f" ] || continue
    ID=$(basename "$f" | sed 's/prompt-//;s/.json//')
    SCRIPT="$AUDIO_DIR/script-${ID}.json"
    [ -f "$SCRIPT" ] && continue
    MARKER="/tmp/fablino-notified-${ID}"
    [ -f "$MARKER" ] && continue
    touch "$MARKER"
    echo "$(date): Prompt $ID found, triggering wake..."
    # Use OpenClaw's websocket-based wake via CLI
    openclaw cron wake --text "[FABLINO] prompt-${ID}.json ready in $AUDIO_DIR — generate script now" --mode now 2>&1 || true
  done
  sleep 5
done
