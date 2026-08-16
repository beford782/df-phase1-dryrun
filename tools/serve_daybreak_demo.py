#!/usr/bin/env python3
"""Localhost-only Daybreak Black Friday demonstration server (PR 2).

Serves the ordinary repository over HTTP for local preview, intercepting ONLY
GET/HEAD for /data/store-config.json (query strings included) to return an
in-memory copy of the committed production configuration with the illustrative
Black Friday scenario injected and a launch-time demonstration window applied.

Guarantees:
  * binds only to loopback — a non-loopback bind address is refused;
  * the committed data/store-config.json, the workbook, and every incoming/
    source are never written; the injected configuration exists in memory only;
  * every non-promotions production key is served unchanged (financing
    included, deep-equal);
  * the injected scenario is validated under the illustrative-demo contract
    before the server starts;
  * the response carries Cache-Control: no-store so a later ordinary preview
    on the same port cannot serve a cached demo configuration;
  * the offers are ILLUSTRATIVE ONLY — the scenario's own disclosure denies
    being a current Lacks promotion, and disableEmailSubmission keeps email
    preview-only regardless of gasUrl.

Run:  python tools/serve_daybreak_demo.py --port 8000
Stop: Ctrl+C.
"""

from __future__ import annotations

import argparse
import copy
import ipaddress
import json
import os
import sys
from datetime import datetime, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_black_friday_demo as demo  # noqa: E402

REPO = demo.REPO
INTERCEPT_PATH = "/data/store-config.json"


def _loopback(bind: str) -> bool:
    if bind in ("localhost",):
        return True
    try:
        return ipaddress.ip_address(bind).is_loopback
    except ValueError:
        return False


def build_injected_config(launch: datetime | None = None):
    """Production store-config + illustrative scenario + launch-time window.

    Returns (config_dict, ends_at_iso). Timezone-aware instants with explicit
    offsets throughout; the demonstration window is durationHours from launch.
    """
    fx = demo.load_fixture()
    demo.validate_fixture(fx)
    cfg = copy.deepcopy(demo._load_json(
        os.path.join(REPO, "data", "store-config.json")))

    launch = launch or datetime.now().astimezone()
    if launch.tzinfo is None:
        raise ValueError("launch instant must be timezone-aware")
    ends = launch + timedelta(hours=fx["durationHours"])
    ends_iso = ends.isoformat(timespec="seconds")
    display = ends.strftime("%Y-%m-%d %H:%M")

    block = demo.demo_promotions_block(fx)
    sc = block["scenarios"][fx["scenarioId"]]
    sc["startAt"] = launch.isoformat(timespec="seconds")
    sc["endsAt"] = ends_iso
    for it in list(sc.get("items") or []) + list(sc.get("storewide") or []):
        it["endsAt"] = ends_iso
        it["expiration"] = display

    cfg["promotions"] = block
    return cfg, ends_iso


def make_handler(config_bytes: bytes):
    class DemoHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=REPO, **kwargs)

        def _intercepted(self):
            return self.path.split("?", 1)[0].split("#", 1)[0] == INTERCEPT_PATH

        def _send_config_headers(self):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(config_bytes)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

        def do_GET(self):
            if self._intercepted():
                self._send_config_headers()
                self.wfile.write(config_bytes)
                return
            super().do_GET()

        def do_HEAD(self):
            if self._intercepted():
                self._send_config_headers()
                return
            super().do_HEAD()

    return DemoHandler


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--bind", default="127.0.0.1",
                        help="loopback address only (default 127.0.0.1)")
    args = parser.parse_args(argv)

    if not _loopback(args.bind):
        print(f"REFUSED: {args.bind!r} is not a loopback address. This server "
              f"exists only for local demonstration and never binds publicly.")
        return 2

    config, ends_iso = build_injected_config()
    config_bytes = json.dumps(config, indent=2, ensure_ascii=False).encode("utf-8")

    server = ThreadingHTTPServer((args.bind, args.port), make_handler(config_bytes))
    url = f"http://{args.bind}:{args.port}/"
    print("=" * 72)
    print("DAYBREAK DEMO SERVER - ILLUSTRATIVE BLACK FRIDAY PROMOTIONS ACTIVE")
    print("These are NOT current Lacks offers. Demonstration content only.")
    print("=" * 72)
    print(f"  URL:                 {url}")
    print(f"  Demo window ends at: {ends_iso}")
    print("  Email stays preview-only (scenario disableEmailSubmission).")
    print("  Committed files are never modified; the demo config is in-memory.")
    print("  Stop with Ctrl+C.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
