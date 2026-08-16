#!/usr/bin/env python3
"""Deterministic test server for pre-configuration browser testing.

Serves the repo root like `python -m http.server`, but can delay or fail the
store-config.json response so a browser test can inspect the DOM/accessibility
state BEFORE configuration resolves (the state a slow, blocked, or broken
config request leaves on screen) — the scenario behind the retired-promotion
flash defect.

Usage:
  python tests/serve_delayed.py --port 8002 --delay-config 6   # config after 6s
  python tests/serve_delayed.py --port 8002 --fail-config      # config 404s
"""
import argparse
import functools
import http.server
import os
import time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    delay_config = 0.0
    fail_config = False

    def do_GET(self):
        if self.path.split("?")[0].endswith("/data/store-config.json"):
            if self.fail_config:
                self.send_error(404, "store-config.json intentionally unavailable (test)")
                return
            if self.delay_config:
                time.sleep(self.delay_config)
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--port", type=int, default=8002)
    ap.add_argument("--delay-config", type=float, default=0.0,
                    help="seconds to delay data/store-config.json")
    ap.add_argument("--fail-config", action="store_true",
                    help="serve 404 for data/store-config.json")
    args = ap.parse_args()
    Handler.delay_config = args.delay_config
    Handler.fail_config = args.fail_config
    handler = functools.partial(Handler, directory=REPO)
    # Threading server: a delayed config response must not block other assets.
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"serving {REPO} on 127.0.0.1:{args.port} "
          f"(delay-config={args.delay_config}s fail-config={args.fail_config})",
          flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
