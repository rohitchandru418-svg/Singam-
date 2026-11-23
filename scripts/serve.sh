#!/usr/bin/env bash
#
# Keep the production server up so the public work-host link stays reachable
# for people outside this workspace (for example a client in another country).
#
# Runs `next start` on port 12000 and restarts it if it ever exits, so a crash
# does not take the shared link down. Stop it with `bash scripts/serve-stop.sh`.
#
# Usage: bash scripts/serve.sh   (or: npm run serve)
set -uo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-12000}"
LOG_DIR=".logs"
LOG="${LOG_DIR}/serve.log"
PIDFILE="${LOG_DIR}/serve.pid"

mkdir -p "$LOG_DIR"

# Refuse to start twice.
if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Server supervisor already running (pid $(cat "$PIDFILE"))."
  exit 0
fi

echo "$$" > "$PIDFILE"
echo "Supervising the production server on port ${PORT} (log: ${LOG})."

# Stop any previous server so the port is free. `next start` runs as a shell wrapper
# plus a `next-server` child, so both must be cleared or the port stays taken.
pkill -f "next start -p ${PORT}" 2>/dev/null
pkill -f "next-server" 2>/dev/null
for _ in 1 2 3 4 5; do
  curl -s -o /dev/null "http://127.0.0.1:${PORT}/" || break
  sleep 1
done

while true; do
  echo "[$(date -u +%FT%TZ)] starting next start on ${PORT}" >> "$LOG"
  # The public work-host link is a review environment, so the development affordances the
  # prototype relies on (the acting-user switcher and the returned one-time code) are enabled
  # explicitly with SINGAM_AUTH_DEV. A real production deployment leaves this unset, and both
  # affordances stay off because NODE_ENV is production.
  SINGAM_AUTH_DEV=1 npm run start >> "$LOG" 2>&1
  code=$?
  echo "[$(date -u +%FT%TZ)] server exited (code ${code}); restarting in 3s" >> "$LOG"
  sleep 3
done
