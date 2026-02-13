"""Non-blocking FIFO HTTP log forwarder.

Enqueues log entries and POSTs them to the remote API in FIFO order on
a background daemon thread so callers never block.
"""

import json
import queue
import sys
import threading
import urllib.request

_BASE_URL = "https://autogiro-test-api.noah.dev"
_ENDPOINT = f"{_BASE_URL}/api/logs"

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
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                },
                method="POST",
            )
            urllib.request.urlopen(req, timeout=5)
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
