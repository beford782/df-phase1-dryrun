#!/usr/bin/env python3
"""Daybreak localhost demo-server check (PR 2).

Executes the REAL tools/serve_daybreak_demo.py machinery — the injected
configuration builder and the request handler — against a live loopback server
on an ephemeral port. Proves the loopback-only bind policy, the narrow
store-config interception (query strings included), the launch+durationHours
window stamped identically onto both illustrative items, the untouched
production keys (financing deep-equal), the no-store cache policy, and that a
full serve/exercise/stop cycle leaves every committed file byte-identical.

Run: python tests/daybreak_server_check.py
"""

import hashlib
import io
import json
import os
import sys
import threading
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_daybreak_demo as srv  # noqa: E402

passed = failed = 0


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}" + (f" - {detail}" if detail else ""))


def sha(path):
    with open(os.path.join(REPO, path), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


WATCHED = ["data/store-config.json", "incoming/Lacks_Store_Data.xlsx",
           "incoming/lacks_promotions.json", "demo/daybreak-black-friday.json",
           "index.html"]
before = {p: sha(p) for p in WATCHED}

with io.open(os.path.join(REPO, "data", "store-config.json"), encoding="utf-8") as f:
    PROD = json.load(f)

# ---- injected configuration -------------------------------------------------
print("Injected configuration:")
launch = datetime(2026, 11, 27, 9, 0, 0, tzinfo=timezone(timedelta(hours=-6)))
cfg, ends_iso = srv.build_injected_config(launch)

check("expiration is launch + 72 hours exactly (fixed launch)",
      ends_iso == (launch + timedelta(hours=72)).isoformat(timespec="seconds"))
check("generated timestamp carries an explicit offset",
      ends_iso.endswith("-06:00"))
sc = cfg["promotions"]["scenarios"]["daybreak-black-friday-demo"]
items = sc["items"]
check("exactly one illustrative scenario is activated",
      cfg["promotions"]["activeScenario"] == "daybreak-black-friday-demo"
      and set(cfg["promotions"]["scenarios"]) == {"daybreak-black-friday-demo"})
check("injected scenario contains exactly two items", len(items) == 2)
check("each item receives the same generated endsAt",
      all(it.get("endsAt") == ends_iso for it in items))
check("each item receives a display expiration",
      all(it.get("expiration") for it in items))
check("durationHours never reaches the runtime scenario",
      "durationHours" not in sc and all("durationHours" not in it for it in items))
strip = lambda c: {k: v for k, v in c.items() if k != "promotions"}
check("all non-promotions keys deep-equal production", strip(cfg) == strip(PROD))
check("financing deep-equals production", cfg["financing"] == PROD["financing"])

# default-launch path: now-based window within tolerance
cfg2, ends2 = srv.build_injected_config()
delta = (datetime.fromisoformat(ends2)
         - datetime.now(timezone.utc)).total_seconds()
check("default launch: expiration is ~72h from now (60s tolerance)",
      abs(delta - 72 * 3600) < 60, f"delta={delta}")

# ---- bind policy ------------------------------------------------------------
print("Bind policy:")
check("public bind attempt is refused (0.0.0.0)",
      srv.main(["--bind", "0.0.0.0", "--port", "0"]) == 2)
check("public bind attempt is refused (192.168.1.10)",
      srv.main(["--bind", "192.168.1.10", "--port", "0"]) == 2)
check("loopback helper accepts 127.0.0.1 and localhost",
      srv._loopback("127.0.0.1") and srv._loopback("localhost")
      and srv._loopback("::1"))

# ---- live loopback server ---------------------------------------------------
print("Live loopback server:")
config_bytes = json.dumps(cfg, indent=2, ensure_ascii=False).encode("utf-8")
server = ThreadingHTTPServer(("127.0.0.1", 0), srv.make_handler(config_bytes))
port = server.server_address[1]
t = threading.Thread(target=server.serve_forever, daemon=True)
t.start()
base = f"http://127.0.0.1:{port}"

def get(path):
    with urllib.request.urlopen(base + path, timeout=10) as resp:
        return resp.status, dict(resp.headers), resp.read()

try:
    status, headers, body = get("/data/store-config.json")
    check("intercepted store-config: HTTP 200", status == 200)
    check("intercepted store-config: application/json",
          headers.get("Content-Type", "").startswith("application/json"))
    check("intercepted store-config: Cache-Control no-store",
          headers.get("Cache-Control") == "no-store")
    served = json.loads(body.decode("utf-8"))
    check("served config is the injected configuration",
          served["promotions"]["activeScenario"] == "daybreak-black-friday-demo")
    check("served financing deep-equals production",
          served["financing"] == PROD["financing"])

    status_q, _, body_q = get("/data/store-config.json?cacheBust=1")
    check("query string does not bypass interception",
          status_q == 200 and body_q == body)

    status_f, headers_f, body_f = get("/data/quiz.json")
    with open(os.path.join(REPO, "data", "quiz.json"), "rb") as f:
        disk = f.read()
    check("unrelated data file served unmodified from disk",
          status_f == 200 and body_f == disk)

    status_i, _, body_i = get("/index.html")
    check("normal repository files are served", status_i == 200 and len(body_i) > 100000)

    req = urllib.request.Request(base + "/data/store-config.json", method="HEAD")
    with urllib.request.urlopen(req, timeout=10) as resp:
        check("HEAD is intercepted with headers only",
              resp.status == 200 and resp.headers.get("Cache-Control") == "no-store"
              and resp.read() == b"")
finally:
    server.shutdown()
    server.server_close()

# ---- repository untouched ---------------------------------------------------
print("Repository untouched:")
after = {p: sha(p) for p in WATCHED}
check("serve/exercise/stop leaves every committed file byte-identical",
      before == after,
      "; ".join(p for p in WATCHED if before[p] != after[p]))

print(f"\nDaybreak server check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
