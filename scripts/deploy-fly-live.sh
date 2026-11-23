#!/usr/bin/env bash
# Deploy the 2-day live demo of Startup Singam ERP to a SEPARATE Fly app.
#
# The existing app (singam-1234567) is never touched: this uses fly.live.toml, a
# different app name and a different volume.
#
#   export FLY_API_TOKEN=...        # token with write access (a Fly org/access token)
#   bash scripts/deploy-fly-live.sh
#
# Optional: APP_NAME=some-other-name bash scripts/deploy-fly-live.sh
set -euo pipefail

FLYCTL=${FLYCTL:-/workspace/.bin/flyctl}
[ -x "$FLYCTL" ] || FLYCTL=$(command -v flyctl || true)
[ -n "$FLYCTL" ] || { echo "flyctl not found; install it or set FLYCTL=/path/to/flyctl"; exit 1; }

CONFIG=${CONFIG:-fly.live.toml}
APP_NAME=${APP_NAME:-singam-s03-demo-31311}
VOLUME=${VOLUME:-singam_live_data}
REGION=${REGION:-sin}
FORBIDDEN="singam-1234567"

if [ -z "${FLY_API_TOKEN:-}" ]; then
  echo "FLY_API_TOKEN is not set. Export it first, e.g.:  export FLY_API_TOKEN=..."; exit 1
fi
if [ "$APP_NAME" = "$FORBIDDEN" ]; then
  echo "Refusing to deploy: APP_NAME must not be the existing app ($FORBIDDEN)."; exit 1
fi

cd "$(dirname "$0")/.."

echo "==> Authenticating"
"$FLYCTL" auth whoami

echo "==> Ensuring app '$APP_NAME' exists"
if ! "$FLYCTL" apps list 2>/dev/null | grep -qE "^$APP_NAME\b"; then
  "$FLYCTL" apps create "$APP_NAME" --org "${FLY_ORG:-personal}" 2>/dev/null \
    || "$FLYCTL" apps create "$APP_NAME"
fi

echo "==> Ensuring volume '$VOLUME' exists in $REGION"
if ! "$FLYCTL" volumes list --app "$APP_NAME" 2>/dev/null | grep -q "$VOLUME"; then
  "$FLYCTL" volumes create "$VOLUME" --app "$APP_NAME" --region "$REGION" --size 1 --yes
fi

echo "==> Deploying (config $CONFIG)"
"$FLYCTL" deploy --config "$CONFIG" --app "$APP_NAME" --remote-only --ha=false

echo "==> Status"
"$FLYCTL" status --app "$APP_NAME"
echo "==> Live at https://$APP_NAME.fly.dev"
