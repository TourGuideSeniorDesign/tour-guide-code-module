"""Non-blocking FIFO HTTP log forwarder.

Enqueues log entries and POSTs them to the remote API in FIFO order on
a background daemon thread so callers never block.
"""

import base64
import json
import os
import queue
import ssl
import sys
import threading
import urllib.request

_BASE_URL = os.environ.get("REMOTE_LOG_URL", "https://139.147.176.3").rstrip("/")
_ENDPOINT = f"{_BASE_URL}/api/logs"
_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")
_AUTH_HEADER = "Basic " + base64.b64encode(
    f"{_USERNAME}:{_PASSWORD}".encode()
).decode()

# The admin server uses a short-lived Let's Encrypt IP cert. urllib's
# default trust store handles that, but if the env asks us to skip
# verification (e.g. self-signed fallback) honor it.
_INSECURE = os.environ.get("REMOTE_LOG_INSECURE", "").lower() in ("1", "true", "yes")
_SSL_CONTEXT = ssl._create_unverified_context() if _INSECURE else None

_queue: queue.Queue = queue.Queue()
_shutdown_event = threading.Event()


def _worker() -> None:
    while True:
        try:
            entry = _queue.get(timeout=0.5)
        except queue.Empty:
            if _shutdown_event.is_set():
                return
            continue

        try:
            data = json.dumps(entry).encode("utf-8")
            req = urllib.request.Request(
                _ENDPOINT,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": _AUTH_HEADER,
                    "User-Agent": "autogiro-remote-logger/1",
                },
                method="POST",
            )
            urllib.request.urlopen(req, timeout=5, context=_SSL_CONTEXT)
        except Exception as exc:
            print(f"[remote_logger] Failed to send log: {exc}", file=sys.stderr)

        _queue.task_done()


_thread = threading.Thread(target=_worker, daemon=True)
_thread.start()


def log(source: str, level: str, message: str) -> None:
    """Enqueue a log entry (returns immediately)."""
    _queue.put({"source": source, "level": level, "message": message})


def shutdown() -> None:
    """Drain remaining entries then stop the background thread."""
    _queue.join()
    _shutdown_event.set()
    _thread.join(timeout=2)
