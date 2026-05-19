#!/usr/bin/env bash
# Start the remote-management stack: Next.js on loopback, exposed publicly via Tailscale Funnel.
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

export ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-changeme}"
export DATABASE_PATH="${DATABASE_PATH:-$SCRIPT_DIR/remote-management.db}"

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

if ! command -v tailscale >/dev/null 2>&1; then
	echo "[remote-management] tailscale missing, install it"
	exit 1
fi

sudo tailscale funnel --bg --https=443 http://127.0.0.1:8080 >/dev/null
PUBLIC_URL="$(tailscale status --json 2>/dev/null \
	| python3 -c 'import json,sys; print("https://"+json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' \
	2>/dev/null || echo unknown)"
echo "[remote-management] public url: ${PUBLIC_URL}"

cleanup_funnel() {
	sudo tailscale funnel --https=443 off 2>/dev/null || true
}
trap 'cleanup; cleanup_funnel' EXIT INT TERM

wait
