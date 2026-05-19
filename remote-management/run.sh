#!/usr/bin/env bash
# Start the remote-management stack: Next.js on loopback, Caddy on 80/443.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
	set -a
	# shellcheck disable=SC1091
	source .env
	set +a
elif [ -f .env.example ]; then
	echo "[remote-management] no .env found, copying defaults from .env.example"
	cp .env.example .env
	set -a
	# shellcheck disable=SC1091
	source .env
	set +a
fi

export PUBLIC_HOST="${PUBLIC_HOST:-139.147.176.3}"
export ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-changeme}"
export DATABASE_PATH="${DATABASE_PATH:-$SCRIPT_DIR/remote-management.db}"

PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null \
	|| curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null \
	|| echo unknown)"

cat <<BANNER
================================================
remote-management starting
  detected public IP: ${PUBLIC_IP}
  configured host:    ${PUBLIC_HOST}
  admin user:         ${ADMIN_USERNAME}
================================================
BANNER

if ! command -v node >/dev/null 2>&1; then
	echo "[remote-management] ERROR: node not on PATH. Install Node 20+."
	exit 1
fi

if [ ! -d node_modules ]; then
	echo "[remote-management] installing npm deps"
	npm install
fi

if [ ! -d .next ]; then
	echo "[remote-management] building next.js app"
	npm run build
fi

PIDS=()
cleanup() {
	echo "[remote-management] shutting down"
	for pid in "${PIDS[@]}"; do
		kill "$pid" 2>/dev/null || true
	done
}
trap cleanup EXIT INT TERM

echo "[remote-management] starting next.js on 127.0.0.1:8080"
npm run start &
PIDS+=($!)

if command -v caddy >/dev/null 2>&1; then
	echo "[remote-management] starting caddy on :80 / :443 for ${PUBLIC_HOST}"
	caddy run --config Caddyfile --adapter caddyfile &
	PIDS+=($!)
else
	echo "[remote-management] caddy missing, install it"
	exit 1
fi

wait
