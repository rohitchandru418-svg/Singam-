#!/usr/bin/env bash
#
# Stop the supervised production server started by scripts/serve.sh.
set -uo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-12000}"
PIDFILE=".logs/serve.pid"

if [[ -f "$PIDFILE" ]]; then
  sup="$(cat "$PIDFILE")"
  if kill -0 "$sup" 2>/dev/null; then
    # Kill the supervisor first so it does not restart the server, then the server.
    kill "$sup" 2>/dev/null
  fi
  rm -f "$PIDFILE"
fi

pkill -f "next start -p ${PORT}" 2>/dev/null
echo "Stopped the server supervisor and any next start process on port ${PORT}."
