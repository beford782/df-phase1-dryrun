#!/usr/bin/env python3
"""Daybreak shipped-state lock + demo-bundle contract check (PR 2).

Owns the production/demo separation:

  * the committed production promotions configuration is EXACTLY the inert
    contract (a temporary pre-runtime activation lock: a later reviewed
    implementation may deliberately relax the empty-scenarios assertion after
    trusted-time and governed current-event runtime gates exist);
  * no Black Friday / illustrative content exists in any production artifact
    (canonical source, workbook envelope, generated store-config, root page);
  * the root page cannot select the demo configuration and carries no
    demo-deadline logic and no demo query-parameter pathway;
  * the /demo/black-friday/ bundle is exactly what a fresh deterministic
    rebuild produces, fetches only its own configuration, keeps gasUrl blank,
    keeps the scenario illustrative/demoOnly/email-disabled, computes its
    deadline only at page load (never committed), and deep-equals production
    on every non-promotions key except the deliberately blanked demo gasUrl;
  * the production build path (allow_illustrative=False) rejects the demo
    configuration, so the illustrative scenario cannot enter production
    through the validated pipeline.

Run: python tests/daybreak_contract_check.py
"""

import io
import json
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import validation  # noqa: E402
import build_black_friday_demo as demo_builder  # noqa: E402

import openpyxl  # noqa: E402

passed = failed = 0


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}" + (f" - {detail}" if detail else ""))


def _read(path):
    with io.open(os.path.join(REPO, path), encoding="utf-8", newline="") as f:
        return f.read()


def _load(path):
    return json.loads(_read(path))


INERT = {"schemaVersion": 1, "activeScenario": None,
         "allowedSourceHosts": ["lacks.com"], "scenarios": {}}

# ---- production artifacts ---------------------------------------------------
print("Production shipped-state lock:")
src = _load("incoming/lacks_promotions.json")
check("canonical promotion source promotions block is exactly inert",
      src.get("promotions") == INERT)
check("canonical promotion source carries no illustrative scenario",
      "illustrative-demo" not in _read("incoming/lacks_promotions.json"))
check("canonical promotion source carries no Black Friday copy",
      "lack friday" not in _read("incoming/lacks_promotions.json").lower()
      and "black friday" not in _read("incoming/lacks_promotions.json").lower())

cfg = _load("data/store-config.json")
check("generated store-config promotions is exactly the inert contract",
      cfg.get("promotions") == INERT)
check("generated store-config scenarios is exactly {}",
      cfg.get("promotions", {}).get("scenarios") == {})
check("no current-event scenario ships", "current-event" not in _read("data/store-config.json"))
check("no illustrative-demo scenario ships", "illustrative-demo" not in _read("data/store-config.json"))
raw_cfg = _read("data/store-config.json").lower()
check("no Black Friday copy in generated store-config",
      "black friday" not in raw_cfg and "black-friday" not in raw_cfg)
check("no fake bonus copy in generated store-config",
      "choose your bonus" not in raw_cfg and "elige tu bono" not in raw_cfg)
check("no invented deadline fields in generated store-config",
      '"endsat"' not in raw_cfg and '"startat"' not in raw_cfg
      and '"expiration"' not in raw_cfg)

# The workbook envelope: promotions slot must be the inert contract and the
# financing slot must deep-equal the shipped financing block.
wb = openpyxl.load_workbook(os.path.join(REPO, "incoming", "Lacks_Store_Data.xlsx"))
ws = wb["Promotions"]
payload = "".join(str(row[0].value or "") for row in ws.iter_rows(min_row=2))
envelope = json.loads(payload)
check("workbook envelope carries exactly promotions and financing",
      set(envelope) == {"promotions", "financing"})
check("workbook promotions slot is exactly the inert contract",
      envelope.get("promotions") == INERT)
check("workbook financing slot deep-equals shipped store-config financing",
      envelope.get("financing") == cfg.get("financing"))
check("no demo fixture content entered the workbook",
      "black friday" not in payload.lower() and "illustrative" not in payload.lower())
check("_meta is not propagated into the workbook envelope", "_meta" not in envelope)

# ---- the root page cannot reach the demo ------------------------------------
print("Root page separation:")
root = _read("index.html")
check("root index fetches the production store-config",
      root.count("'./data/store-config.json'") == 1)
check("root index never references the demo configuration",
      "black-friday" not in root)
check("root index carries no demo-deadline logic",
      "DAYBREAK BLACK FRIDAY DEMO" not in root and "durationHours" not in root)
check("root index carries no demo query-parameter pathway",
      "promoDemo" not in root and "blackFriday" not in root
      and "?demo" not in root and "demo=1" not in root)
check("the demo fixture is not consumed by the workbook builder",
      "daybreak-black-friday" not in _read("incoming/build_lacks_workbook.py"))
check("the demo fixture is not consumed by the converter",
      "daybreak-black-friday" not in _read("tools/convert_store_data.py"))
check("allowed-hosts allowlist not widened for the demo",
      _read("data/allowed-hosts.js").count("beford782.github.io") == 1
      and "black-friday" not in _read("data/allowed-hosts.js"))

# ---- demo bundle ------------------------------------------------------------
print("Demo bundle contract:")
fresh = demo_builder.build_all()
for rel, content in fresh.items():
    rel_posix = rel.replace("\\", "/")
    check(f"{rel_posix} matches a fresh deterministic rebuild",
          os.path.exists(os.path.join(REPO, rel)) and _read(rel) == content)
fresh_again = demo_builder.build_all()
check("building twice is deterministic (byte-identical)", fresh == fresh_again)

demo_idx = _read("demo/black-friday/index.html")
check("demo index fetches the demo-specific configuration exactly once",
      demo_idx.count("'./demo/black-friday/data/store-config.json'") == 1)
check("demo index never fetches the production configuration",
      "'./data/store-config.json'" not in demo_idx)
check("demo index carries exactly one demo block",
      demo_idx.count("DAYBREAK BLACK FRIDAY DEMO") == 1)
check("demo index carries the relative base",
      demo_idx.count('<base href="../../">') == 1)
check("demo index is noindex,nofollow,noarchive",
      '<meta name="robots" content="noindex,nofollow,noarchive">' in demo_idx)
check("demo index references the demo manifest",
      'href="demo/black-friday/manifest.json"' in demo_idx
      and 'href="manifest.json"' not in demo_idx)
check("demo index contains no second copy of the application logic",
      demo_idx.count("function calculateScores()") == 1
      and demo_idx.count("window.showResults = function") == 1)
check("demo index corrects the drawer promo muted color for the light surface (T5)",
      demo_idx.count("var muted = 'color:rgba(74,63,48,0.78);';") == 1
      and "var muted = 'color:rgba(248,246,241,0.6);';" not in demo_idx)
check("the root page keeps its original muted literal (T5 never leaks back)",
      root.count("var muted = 'color:rgba(248,246,241,0.6);';") == 1)

# ---- amend repairs: whitespace, terminology, touch targets, typography ------
print("Amend repairs (whitespace / terminology / iPad CSS / typography):")
import re as _re
for rel in ("demo/black-friday/index.html",
            "demo/black-friday/data/store-config.json",
            "demo/black-friday/manifest.json"):
    body = _read(rel)
    check(f"{rel} carries no trailing whitespace",
          not _re.search(r"[ \t]\r?\n", body)
          and not body.rstrip("\n").endswith((" ", "\t")))
    check(f"{rel} is LF-only", "\r" not in body)

for banned in ("Historical Promo", "Historical Demo",
               "Promo histórica", "Demostración histórica",
               "Details confirmed by your", "Detalles confirmados por tu"):
    check(f"demo page carries no historical terminology: {banned!r}",
          banned not in demo_idx)
for required in ("Black Friday Demo", "Demo de Black Friday",
                 "Black Friday Event Preview · Illustrative Demo",
                 "Vista Previa de Black Friday · Demostración Ilustrativa",
                 "Illustrative qualification and bonus details",
                 "Detalles ilustrativos de elegibilidad y bono"):
    check(f"demo page carries the illustrative terminology: {required!r}",
          demo_idx.count(required) >= 1)
for legacy in ("Historical Promo", "Historical Demo",
               "Promo histórica", "Demostración histórica"):
    check(f"root keeps legacy historical-demo terminology: {legacy!r}",
          root.count(legacy) >= 1)
for demo_only in ("daybreak-demo-overrides", "Black Friday Demo",
                  "Illustrative qualification and bonus details",
                  "Detalles ilustrativos de elegibilidad y bono"):
    check(f"root carries none of the demo-only overrides: {demo_only!r}",
          demo_only not in root)

_t7_block = (demo_idx.split('id="daybreak-demo-overrides"')[1].split("</style>")[0]
             if 'id="daybreak-demo-overrides"' in demo_idx else "")
check("demo page carries exactly one iPad touch-target override block (T7)",
      demo_idx.count('id="daybreak-demo-overrides"') == 1
      and _t7_block.count("min-height: 44px;") == 1)
for sel in (".noct-tier-tab", ".noct-card-details", ".noct-save-btn",
            ".drawer-back-to-results", ".drawer-nav-btn"):
    check(f"T7 covers {sel}", sel in _t7_block)
check("T7 exists only in the demo page", 'daybreak-demo-overrides' not in root)

_demo_detail_fn = _re.search(
    r"function promotionDetailBlockHtml\(p\) \{[\s\S]*?\n    \}", demo_idx).group(0)
_root_detail_fn = _re.search(
    r"function promotionDetailBlockHtml\(p\) \{[\s\S]*?\n    \}", root).group(0)
check("T8: demo promo detail block has no sub-12px font sizes",
      not _re.search(r"font-size:0\.(6\d?|7)rem", _demo_detail_fn)
      and _demo_detail_fn.count("font-size:0.75rem;") == 6)
check("T8: demo promo headline keeps its size",
      "font-size:0.82rem;" in _demo_detail_fn)
check("T8: root promo detail block keeps its original sizes",
      "font-size:0.7rem;" in _root_detail_fn
      and "font-size:0.62rem;" in _root_detail_fn)
_demo_drawer_fn = _re.search(
    r"function promotionDrawerDetailHtml\(mattress\) \{[\s\S]*?\n    \}",
    demo_idx).group(0)
check("T8: demo drawer disclosure box reaches 12px",
      "font-size:0.66rem;" not in _demo_drawer_fn
      and _demo_drawer_fn.count("font-size:0.75rem;") == 3)
check("demo index shows no localhost URL",
      "localhost:8000" not in demo_idx.replace("127.0.0.1", "localhost"))

demo_cfg = _load("demo/black-friday/data/store-config.json")
check("demo config gasUrl is blank", demo_cfg.get("gasUrl") == "")
promos = demo_cfg.get("promotions") or {}
scenarios = promos.get("scenarios") or {}
check("demo config activates exactly one scenario",
      promos.get("activeScenario") == "daybreak-black-friday-demo"
      and set(scenarios) == {"daybreak-black-friday-demo"})
sc = scenarios.get("daybreak-black-friday-demo") or {}
check("demo scenario is illustrative-demo / demoOnly / email-disabled",
      sc.get("kind") == "illustrative-demo" and sc.get("demoOnly") is True
      and sc.get("disableEmailSubmission") is True and sc.get("verified") is not True)
items = sc.get("items") or []
check("both Black Friday items exist",
      [it.get("id") for it in items]
      == ["black-friday-event-demo", "black-friday-bonus-demo"])
check("no committed deadline: the 72h window is computed only at page load",
      all("endsAt" not in it and "expiration" not in it for it in items)
      and "endsAt" not in sc and "startAt" not in sc)
check("demo scenario carries no evidence/authority/authorization",
      all(k not in sc for k in ("sourceUrl", "verifiedAt", "authority",
                                "enabledByOwner", "maxAgeDays", "esReviewStatus")))

strip = lambda c: {k: v for k, v in c.items() if k not in ("promotions", "gasUrl")}
check("demo config deep-equals production on every other key",
      strip(demo_cfg) == strip(cfg))
check("demo config financing deep-equals production financing",
      demo_cfg.get("financing") == cfg.get("financing"))

demo_manifest = _load("demo/black-friday/manifest.json")
check("demo manifest starts at the demo route",
      demo_manifest.get("start_url") == "/LacksFurniture/demo/black-friday/")
check("demo manifest names itself a demo",
      "demo" in (demo_manifest.get("name") or "").lower())
_manifest_text = json.dumps(demo_manifest).lower()
check("demo manifest claims no live promotion (the 'not current' denial is fine)",
      "current" not in _manifest_text.replace("not current", ""))

# ---- validation seam --------------------------------------------------------
print("Validation seam:")
ids, brands = demo_builder._catalog_ids_and_brands()
hosts = validation.load_source_hosts().get("promotionSourceHosts")
r_prod = validation.validate_promotions(
    {"promotions": promos}, mattress_ids=ids, mattress_brands=brands,
    allowed_source_hosts=hosts)
check("the production build path REJECTS the demo configuration",
      any("must never ship in production" in e for e in r_prod.errors))
r_demo = validation.validate_promotions(
    {"promotions": promos}, mattress_ids=ids, mattress_brands=brands,
    allowed_source_hosts=hosts, allow_illustrative=True)
check("the demo configuration is valid under the illustrative contract",
      r_demo.ok, "; ".join(r_demo.errors[:3]))

# builder --check agrees with this suite (stale bundle fails CI)
rc = subprocess.run([sys.executable,
                     os.path.join(REPO, "tools", "build_black_friday_demo.py"),
                     "--check"], capture_output=True, text=True)
check("tools/build_black_friday_demo.py --check passes", rc.returncode == 0,
      (rc.stdout + rc.stderr)[-200:])

print(f"\nDaybreak contract check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
