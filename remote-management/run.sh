#!/usr/bin/env bash
# Start the remote-management stack: Next.js on 0.0.0.0:8080, exposed publicly
# via Tailscale Funnel on https://<tailnet-host>/.
# Requires tailscaled to be running, the node to be logged in, and Funnel to be
# enabled for this node/tailnet in the Tailscale admin console.
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
PORT="${PORT:-8080}"
export PORT

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
	# Tear down the funnel so stale config doesn't linger after we exit. Do not use
	# sudo here: startup scripts often run without an interactive TTY/password, and
	# the tailscale CLI talks to the local tailscaled daemon as the current user.
	if command -v tailscale >/dev/null 2>&1; then
		tailscale funnel reset 2>/dev/null || true
	fi
}
trap cleanup EXIT INT TERM

echo "[remote-management] starting next.js on 0.0.0.0:${PORT}"
npm run start -- -H 0.0.0.0 -p "${PORT}" &
PIDS+=($!)

# Wait until Next.js is actually accepting connections on the loopback
# interface before we tell tailscale funnel to proxy there. Otherwise the
# first requests through funnel race the server startup and 502.
echo "[remote-management] waiting for next.js to become ready on 127.0.0.1:${PORT}"
for i in $(seq 1 60); do
	if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/api/health"; then
		echo "[remote-management] next.js is ready"
		break
	fi
	if ! kill -0 "${PIDS[0]}" 2>/dev/null; then
		echo "[remote-management] ERROR: next.js exited before becoming ready"
		exit 1
	fi
	sleep 1
	if [ "$i" -eq 60 ]; then
		echo "[remote-management] ERROR: next.js did not become ready within 60s"
		exit 1
	fi
done

if ! command -v tailscale >/dev/null 2>&1; then
	echo "[remote-management] ERROR: tailscale missing, install it"
	exit 1
fi

# Sanity-check tailscaled is up and the node is logged in. If systemd is
# available, make one non-interactive attempt to start the daemon first.
if ! tailscale status >/dev/null 2>&1; then
	if command -v systemctl >/dev/null 2>&1; then
		echo "[remote-management] tailscale not ready; trying to start tailscaled"
		sudo -n systemctl start tailscaled 2>/dev/null || true
		sleep 2
	fi
fi
if ! tailscale status >/dev/null 2>&1; then
	echo "[remote-management] ERROR: tailscale not running or not logged in."
	echo "  Fix with: sudo systemctl enable --now tailscaled && sudo tailscale up"
	exit 1
fi

# Wipe pre-existing funnel/serve state so we get a clean, predictable mapping.
# Tailscale 1.96 uses `funnel reset` / `serve reset`; the older
# `--https=443 off` form can leave confusing state and sudo can fail at boot.
echo "[remote-management] resetting existing tailscale funnel/serve config"
tailscale funnel reset 2>/dev/null || true
tailscale serve reset 2>/dev/null || true

echo "[remote-management] enabling tailscale funnel: https://*:443 -> http://127.0.0.1:${PORT}"
if ! tailscale funnel --yes --bg --https=443 "http://127.0.0.1:${PORT}"; then
	echo "[remote-management] ERROR: failed to enable tailscale funnel."
	echo "  Confirm this node has Funnel enabled in the Tailscale admin console"
	echo "  and that HTTPS certificates are enabled for the tailnet."
	exit 1
fi

# Print actual funnel state so we can see if it really took.
echo "[remote-management] tailscale funnel status:"
tailscale funnel status || true

PUBLIC_URL="$(tailscale status --json 2>/dev/null \
	| python3 -c 'import json,sys; print("https://"+json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' \
	2>/dev/null || echo unknown)"
echo "[remote-management] public url: ${PUBLIC_URL}"

wait
