"""HTTP API + static frontend for the TCP/UDP analyzer."""

import json
import os
import socket
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import analyzer

HOST = "127.0.0.1"
PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

run_lock = threading.Lock()
run_state = {
    "running": False,
    "phase": "idle",
    "error": None,
}


def port_in_use(port, proto="tcp"):
    if proto == "tcp":
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.3)
        try:
            return sock.connect_ex((HOST, port)) == 0
        finally:
            sock.close()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.bind((HOST, port))
        return False
    except OSError:
        return True
    finally:
        sock.close()


def localhost_reachable():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(0.4)
    try:
        sock.bind((HOST, 0))
        return True
    except OSError:
        return False
    finally:
        sock.close()


def connectivity_payload():
    running = run_state["running"]
    return {
        "host": HOST,
        "loopback": localhost_reachable(),
        "tcp_port": 5002,
        "udp_port": 5001,
        "tcp_listener": True if running else port_in_use(5002, "tcp"),
        "udp_listener": True if running else port_in_use(5001, "udp"),
        "api": True,
        "running": running,
        "phase": run_state["phase"],
        "error": run_state["error"],
    }


def json_bytes(payload, status=200):
    body = json.dumps(payload).encode("utf-8")
    return status, "application/json; charset=utf-8", body


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def log_message(self, fmt, *args):
        print("[http] " + (fmt % args))

    def _send(self, status, content_type, body):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, "text/plain", b"")

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            status, ctype, body = json_bytes({"ok": True, "status": "ready"})
            return self._send(status, ctype, body)
        if path == "/api/connectivity":
            status, ctype, body = json_bytes(connectivity_payload())
            return self._send(status, ctype, body)
        if path == "/api/results":
            results = analyzer.load_results()
            if results is None:
                status, ctype, body = json_bytes(
                    {"ok": False, "error": "No results yet. Run a performance test."},
                    404,
                )
            else:
                status, ctype, body = json_bytes({"ok": True, "results": results})
            return self._send(status, ctype, body)
        if path == "/api/status":
            status, ctype, body = json_bytes(
                {
                    "ok": True,
                    "running": run_state["running"],
                    "phase": run_state["phase"],
                    "error": run_state["error"],
                }
            )
            return self._send(status, ctype, body)
        if path in ("/latest_results.csv", "/api/csv"):
            csv_path = os.path.join(BASE_DIR, "latest_results.csv")
            if not os.path.exists(csv_path):
                status, ctype, body = json_bytes({"ok": False, "error": "CSV not generated yet"}, 404)
                return self._send(status, ctype, body)
            with open(csv_path, "rb") as f:
                body = f.read()
            return self._send(200, "text/csv; charset=utf-8", body)
        if path in ("/latest_results.json", "/api/json"):
            json_path = os.path.join(BASE_DIR, "latest_results.json")
            if not os.path.exists(json_path):
                status, ctype, body = json_bytes({"ok": False, "error": "JSON not generated yet"}, 404)
                return self._send(status, ctype, body)
            with open(json_path, "rb") as f:
                body = f.read()
            return self._send(200, "application/json; charset=utf-8", body)
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/api/run":
            status, ctype, body = json_bytes({"ok": False, "error": "Not found"}, 404)
            return self._send(status, ctype, body)

        if not run_lock.acquire(blocking=False):
            status, ctype, body = json_bytes(
                {"ok": False, "error": "A test is already running."}, 409
            )
            return self._send(status, ctype, body)

        run_state["running"] = True
        run_state["phase"] = "starting"
        run_state["error"] = None
        try:
            run_state["phase"] = "tcp_udp"
            results = analyzer.run_analysis()
            run_state["phase"] = "idle"
            status, ctype, body = json_bytes({"ok": True, "results": results})
            return self._send(status, ctype, body)
        except Exception as exc:
            run_state["phase"] = "error"
            run_state["error"] = str(exc)
            status, ctype, body = json_bytes({"ok": False, "error": str(exc)}, 500)
            return self._send(status, ctype, body)
        finally:
            run_state["running"] = False
            if run_state["phase"] == "tcp_udp":
                run_state["phase"] = "idle"
            run_lock.release()


def main():
    if not os.path.isdir(FRONTEND_DIR):
        raise SystemExit(f"Frontend folder not found: {FRONTEND_DIR}")

    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"TCP/UDP PERFORMANCE ANALYZER UI: http://{HOST}:{PORT}", flush=True)
    print("API: GET /api/results  GET /api/connectivity  POST /api/run", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
