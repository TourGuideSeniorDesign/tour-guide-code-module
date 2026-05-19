# remote-management

Local admin dashboard + log/status ingest for the robot. Replaces the
old hosted `autogiro-test-api` service — everything runs on the box.

## Stack

- **Next.js 15** (app router, TypeScript) — single process serves both
  the UI and `/api/*` routes on `127.0.0.1:8000`. HTTP Basic Auth is
  enforced by `middleware.ts` on every route except `/api/health`.
- **better-sqlite3** for storage (`remote-management.db`).
- **Caddy** in front on `:80` / `:443`, binds to `$PUBLIC_HOST` (a
  public IP), auto-provisions a Let's Encrypt cert (short-lived
  profile for raw IPs), and reverse-proxies to Next.js.

## Prerequisites

```bash
# Node 20+
# Caddy
sudo apt install caddy
# Let Caddy bind to :80 / :443 without sudo:
sudo setcap CAP_NET_BIND_SERVICE=+ep "$(command -v caddy)"
```

Ports **80 and 443** must be reachable from the public internet so
Let's Encrypt can validate the IP via HTTP-01 / TLS-ALPN-01.

## Run

```bash
cp .env.example .env   # edit ADMIN_PASSWORD, PUBLIC_HOST
./run.sh
```

`run.sh` prints the detected public IP, runs `npm install` and
`npm run build` on first launch, then starts `next start` and Caddy.
It is also launched automatically by `../startup_script.sh`.

## Robot logging

`src/autogiro_utils/autogiro_utils/remote_logger.py` reads
`REMOTE_LOG_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` from the
environment. `startup_script.sh` sources this directory's `.env` so
the ROS nodes pick up the same credentials.

## API

```
POST /api/logs              { source, level, message }
GET  /api/logs              cursor pagination (?cursor=&source=&level=)
POST /api/status            { battery_level, battery_voltage, state, latitude?, longitude? }
GET  /api/status/current
GET  /api/status/history    ?limit=
GET  /api/health            unauthenticated
```

Everything except `/api/health` requires
`Authorization: Basic …` with the credentials from `.env`.
