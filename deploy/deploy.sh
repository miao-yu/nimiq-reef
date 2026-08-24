#!/usr/bin/env bash
#
# Build and release Nimiq Grove on the VPS.
#
#   GROVE_SSH=root@<host> ./deploy/deploy.sh
#
# The host is never committed — this repo is public. See docs/DEPLOY.local.md.
set -euo pipefail

: "${GROVE_SSH:?Set GROVE_SSH=user@host (see docs/DEPLOY.local.md)}"
APP_DIR=/opt/grove/app
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> syncing source to ${GROVE_SSH}:${APP_DIR}"
ssh "$GROVE_SSH" "install -d -o grove -g grove -m 750 ${APP_DIR}"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude '.env*' --exclude '*.local.md' \
  "${REPO_ROOT}/" "${GROVE_SSH}:${APP_DIR}/"
ssh "$GROVE_SSH" "chown -R grove:grove ${APP_DIR}"

echo "==> installing and building on the box"
ssh "$GROVE_SSH" "cd ${APP_DIR} && sudo -u grove npm ci --no-audit --no-fund && sudo -u grove npm run build"

# server.js serves neither of these by default; the Next docs say to copy them in.
echo "==> copying static assets into the standalone bundle"
ssh "$GROVE_SSH" "cd ${APP_DIR} && sudo -u grove cp -r public .next/standalone/ 2>/dev/null || true; sudo -u grove cp -r .next/static .next/standalone/.next/"

echo "==> migrations"
ssh "$GROVE_SSH" "cd ${APP_DIR} && sudo -u grove env \$(grep -v '^#' /opt/grove/db.env | xargs) npm run migrate"

echo "==> tick timer"
ssh "$GROVE_SSH" "install -m 644 ${APP_DIR}/deploy/grove-tick.service /etc/systemd/system/grove-tick.service && install -m 644 ${APP_DIR}/deploy/grove-tick.timer /etc/systemd/system/grove-tick.timer && systemctl daemon-reload && systemctl enable --now grove-tick.timer >/dev/null"

echo "==> restarting"
ssh "$GROVE_SSH" "systemctl restart grove && sleep 2 && systemctl is-active grove"

echo "==> health check"
ssh "$GROVE_SSH" "curl -sf -o /dev/null -w 'localhost:3200 -> HTTP %{http_code}\n' http://127.0.0.1:3200/"
