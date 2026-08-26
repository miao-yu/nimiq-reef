#!/usr/bin/env bash
#
# Build and release Nimiq Reef on the VPS.
#
#   REEF_SSH=root@<host> ./deploy/deploy.sh
#
# The host is never committed — this repo is public. See docs/DEPLOY.local.md.
set -euo pipefail

: "${REEF_SSH:?Set REEF_SSH=user@host (see docs/DEPLOY.local.md)}"
APP_DIR=/opt/reef/app
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> syncing source to ${REEF_SSH}:${APP_DIR}"
ssh "$REEF_SSH" "install -d -o reef -g reef -m 750 ${APP_DIR}"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude '.env*' --exclude '*.local.md' \
  "${REPO_ROOT}/" "${REEF_SSH}:${APP_DIR}/"
ssh "$REEF_SSH" "chown -R reef:reef ${APP_DIR}"

echo "==> installing and building on the box"
ssh "$REEF_SSH" "cd ${APP_DIR} && sudo -u reef npm ci --no-audit --no-fund && sudo -u reef npm run build"

# server.js serves neither of these by default; the Next docs say to copy them in.
echo "==> copying static assets into the standalone bundle"
ssh "$REEF_SSH" "cd ${APP_DIR} && sudo -u reef cp -r public .next/standalone/ 2>/dev/null || true; sudo -u reef cp -r .next/static .next/standalone/.next/"

echo "==> migrations"
ssh "$REEF_SSH" "cd ${APP_DIR} && sudo -u reef env \$(grep -v '^#' /opt/reef/db.env | xargs) npm run migrate"

echo "==> tick timer"
ssh "$REEF_SSH" "install -m 644 ${APP_DIR}/deploy/reef-tick.service /etc/systemd/system/reef-tick.service && install -m 644 ${APP_DIR}/deploy/reef-tick.timer /etc/systemd/system/reef-tick.timer && systemctl daemon-reload && systemctl enable --now reef-tick.timer >/dev/null"

echo "==> restarting"
ssh "$REEF_SSH" "systemctl restart reef && sleep 2 && systemctl is-active reef"

echo "==> health check"
ssh "$REEF_SSH" "curl -sf -o /dev/null -w 'localhost:3200 -> HTTP %{http_code}\n' http://127.0.0.1:3200/"
