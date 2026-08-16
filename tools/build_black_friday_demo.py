#!/usr/bin/env python3
"""Daybreak Black Friday demo bundle builder (PR 2).

Derives the static, deployable /demo/black-friday/ bundle from canonical
sources. Nothing here touches production artifacts: the root index.html, the
generated data/store-config.json, the workbook, and every incoming/ source stay
byte-identical. The illustrative scenario lives ONLY in the tracked fixture
demo/daybreak-black-friday.json and in the generated demo bundle.

Generated files (committed, deterministic — rebuild twice, byte-identical; the
bundle is emitted LF-only on every platform and .gitattributes pins the
checkout to LF, so --check compares byte-for-byte on Windows and CI alike):

    demo/black-friday/index.html            derived from the root index.html
    demo/black-friday/data/store-config.json  production config + injected
                                              illustrative scenario, gasUrl ""
    demo/black-friday/manifest.json         demo-specific PWA manifest

The derived page differs from the canonical root page ONLY at the
transformation sites below, each cardinality-checked so canonical drift fails
the build instead of producing a silently wrong page, plus one documented
whitespace normalization:

    T1  <base href="../../"> + robots noindex meta inserted after the charset
        meta, so every ordinary relative asset/data fetch resolves against the
        repository root (no catalog/dictionary/image duplication).
    T2  the manifest link points at the demo manifest (start_url must open the
        demo route, not the ordinary app).
    T3  the store-config fetch points at the demo configuration; the production
        configuration is never fetched by the demo page.
    T4  a narrow demo-only block after `STORE_CONFIG = payload;` stamps the
        illustrative scenario with a browser-time demonstration window
        (durationHours from the fixture). Browser time is acceptable ONLY
        because the scenario is explicitly illustrative, carries no
        authorization or evidence, and cannot be redeemed; the production
        current-event system must never copy this clock behavior.
    T5  the drawer promo detail block's muted-line color is corrected for the
        light drawer surface. The dormant production block styles its detail
        and expiry lines rgba(248,246,241,.6) — warm white, authored for a
        navy surface — but the production drawer renders LIGHT, so the demo
        deadline was invisible. Production renders no promotions today, so
        the latent defect is repaired in the derived page only; the root page
        stays byte-identical, and the production repair belongs to the
        governed Daybreak presentation work (reported, not slipped in).
    T6  illustrative terminology. The root page's disclosed-scenario surfaces
        say "Historical Promo" / "(Historical Demo)" / "Details confirmed by
        your <store> specialist" — correct for the legacy historical
        reconstruction, semantically wrong for a Black Friday event preview
        (and "confirmed" could imply the illustrative offer is real). The
        demo page renders only the illustrative scenario, so these strings
        are replaced wholesale HERE ONLY: the root page keeps its legacy
        historical-demo terminology unchanged for back-compat.
          - offer tab:      "Black Friday Demo" / "Demo de Black Friday"
          - drawer kicker:  "Black Friday Event Preview · Illustrative Demo"
                            / "Vista Previa de Black Friday · Demostración
                            Ilustrativa"
          - drawer heading: "Illustrative qualification and bonus details"
                            / "Detalles ilustrativos de elegibilidad y bono"
    T7  a demo-only <style id="daybreak-demo-overrides"> block giving the
        prospect-facing controls a practical 44px minimum touch height
        (tier tabs, card details/save, drawer back/prev/next). min-height
        only — nothing currently larger is reduced, layout/focus preserved.
    T8  promotion typography floors, applied INSIDE the two promo render
        functions only (their font sizes are inline styles, so a stylesheet
        cannot reach them without !important): every sub-12px promo line —
        badge, detail, disclosure, expiry/deadline, provenance, source link,
        drawer disclosure box — moves to 0.75rem (12px). The 0.82rem
        headline is untouched. Root promo functions keep their original
        sizes.

    Whitespace normalization: the generated page is emitted with LF line
    endings and no trailing spaces/tabs (the root page carries ~146
    whitespace-only indentation lines that would otherwise trip the ranged
    `git diff --check`). Blank lines and the final newline are preserved;
    the normalization is behavior-neutral (HTML/CSS/JS line-end whitespace).

Run:  python tools/build_black_friday_demo.py            (write the bundle)
      python tools/build_black_friday_demo.py --check    (rebuild in temp,
          compare byte-for-byte against the committed bundle; used by CI)
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import validation  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURE_PATH = os.path.join(REPO, "demo", "daybreak-black-friday.json")
DEMO_DIR = os.path.join(REPO, "demo", "black-friday")

DEMO_ALLOWED_SOURCE_HOSTS = ["lacks.com"]
DURATION_HOURS_MIN, DURATION_HOURS_MAX = 1, 168


def _read(path):
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()


def _load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_fixture():
    """Load and structurally validate the outer demo fixture."""
    fx = _load_json(FIXTURE_PATH)
    errs = []
    if type(fx.get("schemaVersion")) is not int or fx["schemaVersion"] != 1:
        errs.append("fixture schemaVersion must be the integer 1")
    dh = fx.get("durationHours")
    if type(dh) is not int or not (DURATION_HOURS_MIN <= dh <= DURATION_HOURS_MAX):
        errs.append(f"fixture durationHours must be a non-bool integer in "
                    f"{DURATION_HOURS_MIN}..{DURATION_HOURS_MAX} (got {dh!r})")
    sid = fx.get("scenarioId")
    if not isinstance(sid, str) or not sid.strip():
        errs.append("fixture scenarioId must be a nonblank string")
    if not isinstance(fx.get("scenario"), dict):
        errs.append("fixture scenario must be an object")
    if errs:
        raise SystemExit("demo fixture invalid:\n  " + "\n  ".join(errs))
    return fx


def _catalog_ids_and_brands():
    m = _load_json(os.path.join(REPO, "data", "mattresses.json"))
    ids, brands = set(), set()
    for tier in m.values():
        for rec in tier:
            if rec.get("id"):
                ids.add(rec["id"])
            if rec.get("brand"):
                brands.add(rec["brand"])
    return ids, brands


def demo_promotions_block(fx):
    """The promotions block the demo configuration ships: the illustrative
    scenario injected into the inert production shape, activeScenario set."""
    return {
        "schemaVersion": 1,
        "activeScenario": fx["scenarioId"],
        "allowedSourceHosts": list(DEMO_ALLOWED_SOURCE_HOSTS),
        "scenarios": {fx["scenarioId"]: copy.deepcopy(fx["scenario"])},
    }


def validate_fixture(fx):
    """Validate the injected promotions block under the illustrative-demo
    contract, against the real catalog. Fails loudly on any error."""
    ids, brands = _catalog_ids_and_brands()
    hosts = validation.load_source_hosts().get("promotionSourceHosts")
    r = validation.validate_promotions(
        {"promotions": demo_promotions_block(fx)},
        mattress_ids=ids, mattress_brands=brands,
        allowed_source_hosts=hosts, allow_illustrative=True)
    if not r.ok:
        raise SystemExit("demo fixture failed illustrative-demo validation:\n  "
                         + "\n  ".join(r.errors))
    return r


def build_demo_store_config(fx):
    """Production store-config + the illustrative scenario. gasUrl is forced
    blank so a prospect's typed contact details can never leave the browser."""
    cfg = _load_json(os.path.join(REPO, "data", "store-config.json"))
    demo = copy.deepcopy(cfg)
    demo["gasUrl"] = ""
    demo["promotions"] = demo_promotions_block(fx)
    return demo


def build_demo_manifest():
    root = _load_json(os.path.join(REPO, "manifest.json"))
    demo = dict(root)
    demo["name"] = "DreamFinder Black Friday Demo"
    demo["short_name"] = "BF Demo"
    demo["description"] = ("Illustrative Black Friday demonstration of the "
                           "DreamFinder sleep consultation — not current Lacks "
                           "promotions")
    demo["start_url"] = "/LacksFurniture/demo/black-friday/"
    return demo


def _expect(haystack, needle, count, what):
    found = haystack.count(needle)
    if found != count:
        raise SystemExit(
            f"build_black_friday_demo: expected exactly {count} occurrence(s) "
            f"of {what}, found {found} — the canonical page drifted beyond "
            f"the known transformation; update this builder deliberately "
            f"instead of shipping a wrong demo page")
    return True


def _replace_in_function(out, fn_pattern, replacements, label):
    """Apply exact-count token replacements INSIDE one function's source only
    (the promo font sizes are inline styles that repeat elsewhere in the page,
    so global replacement would be reckless)."""
    m = re.search(fn_pattern, out)
    if not m:
        raise SystemExit(f"build_black_friday_demo: could not extract {label}")
    segment = m.group(0)
    for token, replacement, count in replacements:
        _expect(segment, token, count, f"{token!r} inside {label}")
        segment = segment.replace(token, replacement)
    return out[:m.start()] + segment + out[m.end():]


def _demo_runtime_block(fx):
    """The T4 demo-only JS block, indented to match its insertion site."""
    lines = [
        "",
        "          // ---- DAYBREAK BLACK FRIDAY DEMO (derived demo page ONLY) ----",
        "          // Generated by tools/build_black_friday_demo.py; the canonical",
        "          // root index.html carries none of this. Stamps the illustrative",
        "          // scenario with a browser-time demonstration window. Browser",
        "          // time is acceptable only because this scenario is explicitly",
        "          // illustrative, unverified, unauthorized, and unredeemable;",
        "          // production current-event activation must never copy this",
        "          // clock. No ticking countdown exists — one absolute instant is",
        "          // computed per page load and rendered as a plain date.",
        "          (function () {",
        f"            var DEMO_ID = {json.dumps(fx['scenarioId'])};",
        f"            var DEMO_HOURS = {int(fx['durationHours'])};",
        "            var promos = payload.promotions;",
        "            var sc = promos && promos.scenarios && promos.scenarios[DEMO_ID];",
        "            if (!sc) return;",
        "            var startMs = Date.now();",
        "            var end = new Date(startMs + DEMO_HOURS * 3600 * 1000);",
        "            var iso = end.toISOString();",
        "            var pad = function (n) { return (n < 10 ? '0' : '') + n; };",
        "            // Language-neutral local display for the existing expiry line.",
        "            var display = end.getFullYear() + '-' + pad(end.getMonth() + 1)",
        "              + '-' + pad(end.getDate()) + ' ' + pad(end.getHours())",
        "              + ':' + pad(end.getMinutes());",
        "            sc.startAt = new Date(startMs).toISOString();",
        "            sc.endsAt = iso;",
        "            (sc.items || []).concat(sc.storewide || []).forEach(function (it) {",
        "              it.endsAt = iso;",
        "              it.expiration = display;",
        "            });",
        "          })();",
    ]
    return "\n".join(lines)


_DEMO_STYLE_BLOCK = "\n".join([
    "  <style id=\"daybreak-demo-overrides\">",
    "    /* Daybreak demo overrides (derived page only; generated by",
    "       tools/build_black_friday_demo.py — T7). Practical 44px minimum",
    "       touch height for the prospect-facing controls on iPad. min-height",
    "       only: nothing currently larger is reduced, and layout, spacing,",
    "       focus indicators and card-tap behavior are untouched. */",
    "    .noct-tier-tab,",
    "    .noct-card-details,",
    "    .noct-save-btn,",
    "    .drawer-back-to-results,",
    "    .drawer-nav-btn {",
    "      min-height: 44px;",
    "    }",
    "  </style>",
])


def build_demo_index(fx):
    src = _read(os.path.join(REPO, "index.html"))
    # The bundle is LF-only on every platform (see the module docstring), so
    # normalize the source line endings before any anchor work.
    src = src.replace("\r\n", "\n")

    marker = "DAYBREAK BLACK FRIDAY DEMO"
    if marker in src:
        raise SystemExit("build_black_friday_demo: the canonical index.html "
                         "already carries the demo marker — refusing to derive "
                         "from a non-canonical page")

    # T1 — base + robots after the charset meta.
    charset = '  <meta charset="UTF-8">'
    _expect(src, charset, 1, "the charset meta (T1 anchor)")
    t1 = (charset + "\n"
          + '  <base href="../../">' + "\n"
          + '  <meta name="robots" content="noindex,nofollow,noarchive">')
    out = src.replace(charset, t1)

    # T2 — the demo page opens under the demo manifest.
    root_link = '<link rel="manifest" href="manifest.json">'
    _expect(out, root_link, 1, "the root manifest link (T2)")
    out = out.replace(root_link,
                      '<link rel="manifest" href="demo/black-friday/manifest.json">')

    # T3 — only the store-config request is redirected; every other data fetch
    # resolves through the base to the ordinary deployed assets.
    prod_cfg = "'./data/store-config.json'"
    _expect(out, prod_cfg, 1, "the store-config fetch URL (T3)")
    out = out.replace(prod_cfg, "'./demo/black-friday/data/store-config.json'")

    # T4 — the demo window stamp, immediately after config assignment.
    anchor = "          STORE_CONFIG = payload;"
    _expect(out, anchor, 1, "the STORE_CONFIG assignment (T4 anchor)")
    out = out.replace(anchor, anchor + _demo_runtime_block(fx))

    # T5 — drawer promo legibility (see the module docstring).
    muted = "var muted = 'color:rgba(248,246,241,0.6);';"
    _expect(out, muted, 1, "the drawer promo muted-color literal (T5)")
    out = out.replace(muted, "var muted = 'color:rgba(74,63,48,0.78);';")

    # T6 — illustrative terminology (see the module docstring). The root page
    # keeps its legacy historical-demo strings; the demo page renders only the
    # illustrative scenario, so the disclosed-scenario surfaces are relabeled.
    tab_old = "(es ? 'Promo histórica' : 'Historical Promo')"
    _expect(out, tab_old, 1, "the disclosed-scenario offer-tab label (T6a)")
    out = out.replace(tab_old, "(es ? 'Demo de Black Friday' : 'Black Friday Demo')")
    tab_comment = '// the tab reads "Historical Promo" instead of "OFFER"'
    _expect(out, tab_comment, 1, "the offer-tab comment (T6a)")
    out = out.replace(tab_comment,
                      '// the tab reads "Black Friday Demo" instead of "OFFER"')

    kicker_old = ("(esDrawer ? ('Ofertas de ' + storeName() + "
                  "' (Demostración histórica)') : (storeName() + "
                  "' Offers (Historical Demo)'))")
    _expect(out, kicker_old, 1, "the disclosed-scenario drawer kicker (T6b)")
    out = out.replace(kicker_old,
                      "(esDrawer ? 'Vista Previa de Black Friday · "
                      "Demostración Ilustrativa' : 'Black Friday Event "
                      "Preview · Illustrative Demo')")

    heading_old = ("          ? ('Detalles confirmados por tu especialista de "
                   "' + storeName())\n"
                   "          : ('Details confirmed by your ' + storeName() + "
                   "' specialist');")
    _expect(out, heading_old, 1, "the drawer promo secondary heading (T6c)")
    out = out.replace(heading_old,
                      "          ? 'Detalles ilustrativos de elegibilidad y "
                      "bono'\n"
                      "          : 'Illustrative qualification and bonus "
                      "details';")

    # T7 — demo-only touch-target overrides, inserted before </head>.
    head_close = "</head>"
    _expect(out, head_close, 1, "the </head> tag (T7 anchor)")
    out = out.replace(head_close, _DEMO_STYLE_BLOCK + "\n" + head_close)

    # T8 — promotion typography floors, INSIDE the two promo functions only.
    out = _replace_in_function(
        out,
        r"function promotionDetailBlockHtml\(p\) \{[\s\S]*?\n    \}",
        [
            ("font-size:0.7rem;", "font-size:0.75rem;", 2),   # badge + detail
            ("font-size:0.62rem;", "font-size:0.75rem;", 2),  # expiry + source
            ("font-size:0.64rem;", "font-size:0.75rem;", 1),  # disclosure
            ("font-size:0.6rem;", "font-size:0.75rem;", 1),   # provenance
        ],
        "promotionDetailBlockHtml() (T8)")
    out = _replace_in_function(
        out,
        r"function promotionDrawerDetailHtml\(mattress\) \{[\s\S]*?\n    \}",
        [
            ("font-size:0.66rem;", "font-size:0.75rem;", 1),  # disclosure box
            ("font-size:0.62rem;", "font-size:0.75rem;", 2),  # draft note + storewide
        ],
        "promotionDrawerDetailHtml() (T8)")

    # Whitespace normalization (behavior-neutral; see the module docstring):
    # no trailing spaces/tabs on any generated line, blank lines preserved.
    out = "\n".join(line.rstrip(" \t") for line in out.split("\n"))

    # Post-conditions.
    if prod_cfg in out:
        raise SystemExit("build_black_friday_demo: derived page still fetches "
                         "the production store-config")
    if out.count(marker) != 1:
        raise SystemExit("build_black_friday_demo: derived page must carry "
                         "exactly one demo block")
    if re.search(r"[ \t]\n", out) or out.rstrip("\n").endswith((" ", "\t")):
        raise SystemExit("build_black_friday_demo: trailing whitespace "
                         "survived normalization")
    if "\r" in out:
        raise SystemExit("build_black_friday_demo: the demo page must be LF-only")
    for banned in ("Historical Promo", "Historical Demo",
                   "Promo histórica", "Demostración histórica"):
        if banned in out:
            raise SystemExit(f"build_black_friday_demo: historical terminology "
                             f"{banned!r} survived T6")
    return out


def _dump_json(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False)


def build_all():
    fx = load_fixture()
    validate_fixture(fx)
    return {
        os.path.join("demo", "black-friday", "index.html"): build_demo_index(fx),
        os.path.join("demo", "black-friday", "data", "store-config.json"):
            _dump_json(build_demo_store_config(fx)),
        os.path.join("demo", "black-friday", "manifest.json"):
            _dump_json(build_demo_manifest()),
    }


def write_bundle(files):
    for rel, content in files.items():
        path = os.path.join(REPO, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(content)
        print(f"  wrote {rel}")


def check_bundle(files):
    """Compare the freshly built bundle against the committed files."""
    stale = []
    for rel, content in files.items():
        path = os.path.join(REPO, rel)
        if not os.path.exists(path):
            stale.append(f"{rel}: missing")
        elif _read(path) != content:
            stale.append(f"{rel}: differs from a fresh rebuild")
    if stale:
        print("STALE demo bundle:")
        for s in stale:
            print("  " + s)
        print("Re-run: python tools/build_black_friday_demo.py")
        return 1
    print(f"demo bundle check: {len(files)} generated files match a fresh rebuild")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="verify the committed bundle matches a fresh "
                             "rebuild; write nothing")
    args = parser.parse_args(argv)
    files = build_all()
    if args.check:
        return check_bundle(files)
    write_bundle(files)
    print("Black Friday demo bundle written. It ships ILLUSTRATIVE offers only "
          "- not current Lacks promotions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
