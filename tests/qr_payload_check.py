#!/usr/bin/env python3
"""Financing QR payload check — Commit H.

Proves the committed images/qr-financing.svg actually ENCODES the shipped
financing.sourceUrl, by decoding the SVG's own module grid. The answer is never
taken from a TARGET constant, the filename, a comment, the config, or generator
metadata — only from the committed bytes.

LIMITS, stated plainly: this proves the encoded PAYLOAD. It does not prove the
destination is reachable on the network; a real phone-camera scan of the printed
kiosk QR remains a separate pre-pilot check.

The decoder supports QR versions 1-3, error-correction level M, byte mode —
and ENFORCES all three. Versions 1-3 carry a single EC block and one alignment
pattern; level M is what the generator emits, and other levels are refused
rather than assumed. Anything outside the subset fails loudly.

The decoder, the SVG-grammar checks and `--check` are stdlib-only. GENERATION
tests need the pinned qrcode package (incoming/requirements-qr.txt); without it
they report SKIP, never a silent pass.

Run: python tests/qr_payload_check.py     (exit 0 = all pass)
"""
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "incoming"))
import generate_financing_qr as G  # noqa: E402

SVG_PATH = os.path.join(REPO, "images", "qr-financing.svg")
GEN = os.path.join(REPO, "incoming", "generate_financing_qr.py")
CONFIG_PATH = os.path.join(REPO, "data", "store-config.json")

passed = failed = skipped = 0

# GENERATION tests need the pinned qrcode package
# (python -m pip install -r incoming/requirements-qr.txt). The decoder,
# structure checks and `--check` are stdlib-only and always run. When qrcode is
# absent the generation tests are reported as SKIP — never silently as passes.
try:
    import qrcode  # noqa: F401
    import importlib.metadata as _md
    HAVE_QRCODE = True
    QRCODE_VERSION = _md.version("qrcode")
except Exception:
    HAVE_QRCODE = False
    QRCODE_VERSION = None


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
    else:
        failed += 1
    print(f"  [{'ok' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail and not cond else ""))


def skip(name, why):
    global skipped
    skipped += 1
    print(f"  [SKIP] {name} — {why}")


NO_QR = "qrcode not installed (pip install -r incoming/requirements-qr.txt)"


def shipped_source_url():
    with io.open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)["financing"]["sourceUrl"]


def cfg_with(**financing_overrides):
    """A config copy with financing overrides, written to a temp dir."""
    with io.open(CONFIG_PATH, encoding="utf-8") as f:
        cfg = json.load(f)
    for k, v in financing_overrides.items():
        if v is G_DELETE:
            cfg["financing"].pop(k, None)
        else:
            cfg["financing"][k] = v
    d = tempfile.mkdtemp()
    p = os.path.join(d, "store-config.json")
    with io.open(p, "w", encoding="utf-8") as f:
        json.dump(cfg, f)
    return p, d


G_DELETE = object()


def svg_doc(d_attr, total, **override):
    """Build a document in the EXACT grammar the pinned generator emits.

    Synthetic fixtures must satisfy the same grammar as production; otherwise a
    negative test could "pass" because the fixture was malformed rather than
    because the behaviour under test worked. Keyword overrides deliberately
    break one thing at a time.
    """
    root = {"width": f"{total}mm", "height": f"{total}mm", "version": "1.1",
            "viewBox": f"0 0 {total} {total}"}
    path = {"d": d_attr, "id": "qr-path", "fill": "#000000", "fill-opacity": "1",
            "fill-rule": "nonzero", "stroke": "none"}
    for k, v in override.items():
        k = k.replace("__", "-")
        target = root if k in root or k in ("width", "height", "version", "viewBox") else path
        if v is G_DELETE:
            target.pop(k, None)
        else:
            target[k] = v
    ra = "".join(f' {k}="{v}"' for k, v in root.items())
    pa = "".join(f' {k}="{v}"' for k, v in path.items())
    return ("<?xml version='1.0' encoding='UTF-8'?>\n"
            f'<svg{ra} xmlns="http://www.w3.org/2000/svg">'
            f'<path{pa} /></svg>')


def expect_unsupported(label, document, frag=None):
    """Write `document` to a scratch path and require check_svg() to refuse it
    with QrUnsupportedError. Only that exception is accepted: anything else
    (including a pass) is a failure, so a test cannot succeed by accident."""
    d = tempfile.mkdtemp()
    try:
        q = os.path.join(d, "case.svg")
        io.open(q, "w", encoding="utf-8", newline="").write(document)
        try:
            G.check_svg(CONFIG_PATH, q)
            check(label, False, "accepted it")
        except G.QrUnsupportedError as e:
            if frag and frag not in str(e):
                check(label, False, f"wrong reason: {str(e)[:70]}")
            else:
                check(label, True)
        except G.QrPayloadMismatch as e:
            check(label, False, f"reported a payload mismatch instead: {str(e)[:60]}")
        except Exception as e:                      # noqa: BLE001 - reported, not swallowed
            check(label, False, f"unexpected {type(e).__name__}: {str(e)[:60]}")
    finally:
        shutil.rmtree(d, ignore_errors=True)


def main():
    # Whole-run guard. A test that generates into the DEFAULT output path would
    # rewrite the committed asset — harmless-looking when the bytes match, but it
    # means that test ran against the real config instead of its fixture, and was
    # therefore proving nothing. Every generating test must pass --output.
    run_start_stat = os.stat(SVG_PATH)
    run_start_bytes = io.open(SVG_PATH, "rb").read()

    print("Committed payload:")
    svg = io.open(SVG_PATH, encoding="utf-8").read()
    payload, info = G.decode_svg(svg)
    url = shipped_source_url()
    check("committed SVG decodes to the shipped financing.sourceUrl",
          payload == url, f"{payload!r} vs {url!r}")
    check("decoded symbol is the expected shape (v3, byte mode)",
          info["version"] == 3 and info["mode"] == "0100", str(info))
    check("every SVG subpath was understood as a QR module",
          bool(G.svg_to_matrix(svg)[0]))

    # Canonical/shipped parity is enforced by smoke; assert the QR target side.
    with io.open(os.path.join(REPO, "incoming", "lacks_financing.json"), encoding="utf-8") as f:
        canonical = json.load(f)["financing"]["sourceUrl"]
    check("canonical financing.sourceUrl equals shipped", canonical == url)

    gen_src = io.open(os.path.join(REPO, "incoming", "generate_financing_qr.py"),
                      encoding="utf-8").read()
    check("generator has no baked-in financing target",
          "https://www.lacks.com/financing" not in gen_src)
    check("generator reads the target from financing.sourceUrl",
          'fin.get("sourceUrl")' in gen_src)
    check("generator reuses the repository's allowlist, not a private copy",
          "validation.load_source_hosts()" in gen_src
          and "validation._is_allowed_source" in gen_src)

    print("Round-trip through the real generator:")
    if not HAVE_QRCODE:
        skip("alternate allowlisted url generates and decodes to itself", NO_QR)
        skip("generated in-memory SVG for the shipped url decodes to it", NO_QR)
    else:
        alt = "https://www.synchrony.com/financing-offer"
        pth, d = cfg_with(sourceUrl=alt)
        try:
            cfg, target = G.load_target(pth)
            G.validate_target(cfg, target)
            decoded, _ = G.decode_svg(G.build_svg(target))
            check("an alternate ALLOWLISTED url generates and decodes to itself",
                  decoded == alt, f"{decoded!r}")
        finally:
            shutil.rmtree(d, ignore_errors=True)
        check("generated in-memory SVG for the shipped url decodes to it",
              G.decode_svg(G.build_svg(url))[0] == url)

    print("Refusals (nothing is written):")
    dead = "https://www.lacks.com/mexican-credit-application"
    for label, overrides, frag in [
        ("non-allowlisted host", {"sourceUrl": "https://evil.example.com/financing"}, "allowlisted"),
        ("http scheme", {"sourceUrl": "http://www.lacks.com/financing"}, "allowlisted"),
        ("credentialed url", {"sourceUrl": "https://u:p@www.lacks.com/financing"}, "allowlisted"),
        ("non-default port", {"sourceUrl": "https://www.lacks.com:8443/financing"}, "allowlisted"),
        ("lookalike host", {"sourceUrl": "https://www.lacks.com.evil.example/f"}, "allowlisted"),
        ("malformed url", {"sourceUrl": "not a url"}, "allowlisted"),
        ("blank url", {"sourceUrl": "   "}, "blank"),
        ("non-string url", {"sourceUrl": 123}, "must be a string"),
        ("missing url", {"sourceUrl": G_DELETE}, "must be a string"),
        ("financing disabled", {"enabled": False}, "not true"),
        ("unverified Mexico application target", {"sourceUrl": dead}, "unverified"),
        # PRIVACY: the whole query/parameter/fragment class, not a name list.
        ("utm tracking query",
         {"sourceUrl": "https://www.lacks.com/financing?utm_source=kiosk"}, "query string"),
        ("PII-looking query",
         {"sourceUrl": "https://www.lacks.com/financing?customer_email=a%40example.com"},
         "query string"),
        ("session/token query",
         {"sourceUrl": "https://www.lacks.com/financing?session=abc"}, "query string"),
        ("fragment", {"sourceUrl": "https://www.lacks.com/financing#apply"}, "fragment"),
        ("path parameters",
         {"sourceUrl": "https://www.lacks.com/financing;jsessionid=ABC"}, "path parameters"),
    ]:
        p, d = cfg_with(**overrides)
        try:
            try:
                cfg, target = G.load_target(p)
                G.validate_target(cfg, target)
                check(f"refuses {label}", False, "accepted it")
            except G.QrTargetError as e:
                check(f"refuses {label}", frag in str(e), str(e)[:90])
        finally:
            shutil.rmtree(d, ignore_errors=True)

    print("Error redaction:")
    SENTINEL = "SUPERSECRET-TOKEN-9F2A"
    for label, bad in [
        ("credentials", f"https://user:{SENTINEL}@www.lacks.com/financing"),
        ("query value", f"https://www.lacks.com/financing?token={SENTINEL}"),
        ("fragment", f"https://www.lacks.com/financing#{SENTINEL}"),
    ]:
        pth, d = cfg_with(sourceUrl=bad)
        try:
            try:
                c, t = G.load_target(pth)
                G.validate_target(c, t)
                check(f"{label} is refused", False, "accepted it")
            except G.QrTargetError as e:
                check(f"{label} is refused", True)
                check(f"{label}: the sentinel never appears in the error",
                      SENTINEL not in str(e), str(e)[:90])
            # The subprocess MUST still see the sentinel-bearing config, and MUST
            # write to a scratch path — never the committed asset. Asserting the
            # nonzero exit is what keeps the redaction claim honest: without it a
            # run that silently fell back to the clean config would "pass" while
            # proving nothing.
            out = os.path.join(d, "scratch.svg")
            r = subprocess.run([sys.executable, GEN, "--config", pth, "--output", out],
                               capture_output=True, text=True)
            check(f"{label}: the generator subprocess actually refused it",
                  r.returncode != 0, f"exit {r.returncode}")
            check(f"{label}: the subprocess emitted the refusal it was given",
                  "FAIL" in (r.stdout + r.stderr), (r.stdout + r.stderr)[:90])
            check(f"{label}: the sentinel never appears on stdout/stderr",
                  SENTINEL not in (r.stdout + r.stderr), (r.stdout + r.stderr)[:90])
            check(f"{label}: nothing was written for a refused target",
                  not os.path.exists(out))
        finally:
            shutil.rmtree(d, ignore_errors=True)
    check("sanitiser strips userinfo, query and fragment",
          G.sanitize_url_for_error(f"https://u:{SENTINEL}@www.lacks.com/f?t={SENTINEL}#{SENTINEL}")
          == "https://www.lacks.com/f")

    print("Whole-document SVG grammar:")
    for label, injected in [
        ("opaque overlay rect", '<rect width="33" height="33" fill="#fff"/>'),
        ("second path", '<path d="M0,0H1V1H0z"/>'),
        ("external image", '<image href="https://example.com/pixel"/>'),
        ("script element", "<script>alert(1)</script>"),
        ("foreignObject", "<foreignObject/>"),
        ("use reference", '<use href="#qr-path"/>'),
        ("style element", "<style>*{fill:red}</style>"),
    ]:
        d = tempfile.mkdtemp()
        try:
            q = os.path.join(d, "t.svg")
            io.open(q, "w", encoding="utf-8", newline="\n").write(
                svg.replace("</svg>", injected + "</svg>"))
            try:
                G.check_svg(CONFIG_PATH, q)
                check(f"rejects a QR plus {label}", False, "accepted it")
            except G.QrUnsupportedError:
                check(f"rejects a QR plus {label}", True)
        finally:
            shutil.rmtree(d, ignore_errors=True)
    d = tempfile.mkdtemp()
    try:
        q = os.path.join(d, "t.svg")
        io.open(q, "w", encoding="utf-8", newline="\n").write(
            svg.replace("<svg ", '<svg onload="alert(1)" ', 1))
        try:
            G.check_svg(CONFIG_PATH, q)
            check("rejects a root event handler", False, "accepted it")
        except G.QrUnsupportedError:
            check("rejects a root event handler", True)
        q2 = os.path.join(d, "t2.svg")
        io.open(q2, "w", encoding="utf-8", newline="\n").write(
            svg.replace('id="qr-path"', 'id="qr-path" transform="scale(2)"', 1))
        try:
            G.check_svg(CONFIG_PATH, q2)
            check("rejects a transform that would move modules", False, "accepted it")
        except G.QrUnsupportedError:
            check("rejects a transform that would move modules", True)
    finally:
        shutil.rmtree(d, ignore_errors=True)

    print("Exact rendered grammar — attribute PRESENCE and VALUES:")
    # Restricting attribute NAMES is not enough. Each of these keeps the
    # document structurally valid and the QR path decodable, while destroying
    # what actually renders. Every one PASSED before this amendment.
    grammar_cases = [
        ("transparent fill (fill-opacity=0)", ('fill-opacity="1"', 'fill-opacity="0"')),
        ("white fill", ('fill="#000000"', 'fill="#ffffff"')),
        ("alternate fill colour", ('fill="#000000"', 'fill="#010101"')),
        ("named-colour fill", ('fill="#000000"', 'fill="black"')),
        ("non-none stroke", ('stroke="none"', 'stroke="red"')),
        ("altered fill rule", ('fill-rule="nonzero"', 'fill-rule="evenodd"')),
        ("missing fill", (' fill="#000000"', "")),
        ("missing fill-opacity", (' fill-opacity="1"', "")),
        ("missing fill-rule", (' fill-rule="nonzero"', "")),
        ("missing stroke", (' stroke="none"', "")),
        ("missing path id", (' id="qr-path"', "")),
        ("wrong path id", ('id="qr-path"', 'id="not-the-qr"')),
        ("missing viewBox", (' viewBox="0 0 33 33"', "")),
        ("wrong viewBox", ('viewBox="0 0 33 33"', 'viewBox="0 0 99 99"')),
        ("zero dimensions", ('width="33mm" height="33mm"', 'width="0mm" height="0mm"')),
        ("under-sized dimensions", ('width="33mm" height="33mm"', 'width="1mm" height="1mm"')),
        ("over-sized dimensions", ('width="33mm" height="33mm"', 'width="999mm" height="999mm"')),
        ("unitless dimensions", ('width="33mm" height="33mm"', 'width="33" height="33"')),
        ("missing width", ('width="33mm" ', "")),
        ("missing height", ('height="33mm" ', "")),
        ("wrong version", ('version="1.1"', 'version="2.0"')),
        ("missing version", (' version="1.1"', "")),
    ]
    for label, (needle, repl) in grammar_cases:
        mutated = svg.replace(needle, repl, 1)
        # Non-vacuity: a fixture that changed nothing would "pass" for free.
        if mutated == svg:
            check(f"rejects {label}", False, f"fixture no-op: {needle!r} not in the SVG")
            continue
        d = tempfile.mkdtemp()
        try:
            q = os.path.join(d, "t.svg")
            io.open(q, "w", encoding="utf-8", newline="").write(mutated)
            try:
                G.check_svg(CONFIG_PATH, q)
                check(f"rejects {label}", False, "accepted it")
            except G.QrUnsupportedError:
                check(f"rejects {label}", True)
        finally:
            shutil.rmtree(d, ignore_errors=True)

    print("XML boundary — namespace-qualified attribute smuggling:")
    # A browser applies the UNQUALIFIED presentation attribute; the old verifier
    # collapsed `x:width` onto `width` and took the LAST value, so the rendered
    # and verified documents could disagree on every required attribute.
    real_d = svg.split('d="')[1].split('"')[0]
    smuggles = [
        ("root width", 'width="33mm"', 'width="0mm" xmlns:x="urn:fake" x:width="33mm"'),
        ("root height", 'height="33mm"', 'height="0mm" xmlns:x="urn:fake" x:height="33mm"'),
        ("root version", 'version="1.1"', 'version="9.9" xmlns:x="urn:fake" x:version="1.1"'),
        ("root viewBox", 'viewBox="0 0 33 33"',
         'viewBox="0 0 1 1" xmlns:x="urn:fake" x:viewBox="0 0 33 33"'),
        ("path fill", 'fill="#000000"',
         'fill="#ffffff" xmlns:x="urn:fake" x:fill="#000000"'),
        ("path fill-opacity", 'fill-opacity="1"',
         'fill-opacity="0" xmlns:x="urn:fake" x:fill-opacity="1"'),
        ("path fill-rule", 'fill-rule="nonzero"',
         'fill-rule="evenodd" xmlns:x="urn:fake" x:fill-rule="nonzero"'),
        ("path stroke", 'stroke="none"', 'stroke="red" xmlns:x="urn:fake" x:stroke="none"'),
        ("path id", 'id="qr-path"', 'id="other" xmlns:x="urn:fake" x:id="qr-path"'),
        # The most severe: the browser draws a decoy, the verifier decodes x:d.
        ("path d itself", f'd="{real_d}"',
         f'd="M2,2H3V3H2z" xmlns:x="urn:fake" x:d="{real_d}"'),
    ]
    for label, needle, repl in smuggles:
        mutated = svg.replace(needle, repl, 1)
        if mutated == svg:
            check(f"rejects {label} smuggling", False, f"fixture no-op: {needle!r}")
            continue
        expect_unsupported(f"rejects {label} smuggling", mutated)

    # The predefined `xml:` prefix needs NO declaration, so it slips past a
    # namespace COUNT and must be caught by the qualified-attribute rule itself.
    for label, needle, repl in [
        ("xml:base (relative-URL redirection)", "<svg ", '<svg xml:base="https://evil.example/" '),
        ("xml:space on root", "<svg ", '<svg xml:space="preserve" '),
        ("xml:lang on path", "<path ", '<path xml:lang="en" '),
    ]:
        expect_unsupported(f"rejects {label}", svg.replace(needle, repl, 1))
    # ISOLATING LAYER: `xml:` is predefined, so this needs no extra namespace
    # declaration AND its local name is a REQUIRED one — the namespace count and
    # the unexpected-attribute rule both pass it, leaving the qualified-attribute
    # rule as the only thing standing between the rendered 0mm and the verified
    # 33mm. Without this case, reverting that rule breaks no test.
    expect_unsupported("rejects xml:-qualified twin of a required attribute",
                       svg.replace('width="33mm"', 'width="0mm" xml:width="33mm"', 1),
                       frag="namespace-qualified attribute")
    # ISOLATING LAYER: an unused extra namespace whose URI contains no "://",
    # so neither the external-reference scan nor the qualified-attribute rule
    # applies — only the namespace-declaration count refuses it.
    expect_unsupported("rejects an unused extra namespace declaration",
                       svg.replace("<svg ", '<svg xmlns:x="urn:fake" ', 1),
                       frag="declares 2 namespaces")
    for label, needle, repl in [
        ("extra unused namespace declaration", "<svg ",
         '<svg xmlns:xlink="http://www.w3.org/1999/xlink" '),
        ("prefixed svg: namespace form", "<svg ", '<svg:svg xmlns:svg="SVGNS" '),
        ("empty default namespace", 'xmlns="http://www.w3.org/2000/svg"', 'xmlns=""'),
    ]:
        if label == "prefixed svg: namespace form":
            mutated = (svg.replace("<svg ", '<svg:svg xmlns:svg="http://www.w3.org/2000/svg" ', 1)
                          .replace('xmlns="http://www.w3.org/2000/svg"', "")
                          .replace("<path", "<svg:path").replace("</svg>", "</svg:svg>"))
        else:
            mutated = svg.replace(needle, repl, 1)
        expect_unsupported(f"rejects {label}", mutated)

    print("XML boundary — out-of-grammar document content:")
    for label, mutated in [
        ("external stylesheet PI",
         svg.replace("<svg ", "<?xml-stylesheet href='https://example.invalid/qr.css' "
                              "type='text/css'?>\n<svg ", 1)),
        ("generic processing instruction",
         svg.replace("<svg ", "<?some-pi data='x'?>\n<svg ", 1)),
        ("processing instruction AFTER the root",
         svg.rstrip() + "\n<?xml-stylesheet href='https://example.invalid/x.css'?>"),
        ("comment before the root", svg.replace("<svg ", "<!-- injected -->\n<svg ", 1)),
        ("comment inside the svg", svg.replace("</svg>", "<!-- inside --></svg>", 1)),
        ("DOCTYPE declaration",
         svg.replace("<svg ", '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" '
                              '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg ', 1)),
        ("DOCTYPE with an internal ENTITY",
         svg.replace("<svg ", '<!DOCTYPE svg [<!ENTITY xx "PAYLOAD">]>\n<svg ', 1)),
        ("text content inside the path", svg.replace("/></svg>", ">hello</path></svg>", 1)),
        ("CDATA inside the path", svg.replace("/></svg>", "><![CDATA[x]]></path></svg>", 1)),
        ("byte-order mark prologue", "\ufeff" + svg),
        ("a second path element",
         svg.replace("</svg>", '<path d="M0,0H1V1H0z" id="qr-path" fill="#000000" '
                               'fill-opacity="1" fill-rule="nonzero" stroke="none"/></svg>', 1)),
    ]:
        expect_unsupported(f"rejects {label}", mutated)
    # XML forbids duplicate unqualified attributes outright; confirm the parser
    # surfaces that rather than silently keeping one.
    expect_unsupported("rejects a duplicate unqualified attribute",
                       svg.replace('width="33mm"', 'width="33mm" width="0mm"', 1))
    # ISOLATING LAYER: well-formed, correctly namespaced, every attribute right —
    # only the canonical-prologue rule refuses it.
    # POLICY: the declaration is enforced SEMANTICALLY (XML 1.0 / UTF-8 / no
    # standalone) via expat's XmlDeclHandler; CDATA is rejected outright,
    # including empty and whitespace-only sections. Formatting is NOT
    # constrained -- this is a grammar checker, not a byte-identity checker.
    body = svg.split("?>", 1)[1]
    expect_unsupported("rejects a document with no XML declaration",
                       body.lstrip(), frag="no XML declaration")
    for label, decl, frag in [
        ("XML version 1.1", "<?xml version='1.1' encoding='UTF-8'?>", "version"),
        ("a non-UTF-8 encoding", "<?xml version='1.0' encoding='ISO-8859-1'?>", "encoding"),
        ("standalone='yes'", "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>",
         "standalone"),
        ("standalone='no'", "<?xml version='1.0' encoding='UTF-8' standalone='no'?>",
         "standalone"),
    ]:
        expect_unsupported(f"rejects {label}", decl + body, frag=frag)
    for label, injected in [
        ("an EMPTY CDATA section", "<![CDATA[]]>"),
        ("a whitespace-only CDATA section", "<![CDATA[   ]]>"),
        ("a CDATA section with content", "<![CDATA[x]]>"),
    ]:
        expect_unsupported(f"rejects {label}",
                           svg.replace("/></svg>", f">{injected}</path></svg>", 1),
                           frag="CDATA")
    # ...and formatting variations must still be ACCEPTED.
    for label, decl in [
        ("double-quoted declaration", '<?xml version="1.0" encoding="UTF-8"?>'),
        ("lowercase utf-8", "<?xml version='1.0' encoding='utf-8'?>"),
        ("extra whitespace in the declaration", "<?xml  version='1.0'  encoding='UTF-8' ?>"),
    ]:
        d_ok = tempfile.mkdtemp()
        try:
            q_ok = os.path.join(d_ok, "ok.svg")
            io.open(q_ok, "w", encoding="utf-8", newline="").write(decl + body)
            try:
                G.check_svg(CONFIG_PATH, q_ok)
                check(f"accepts {label} (formatting is not canonicalised)", True)
            except Exception as e:
                check(f"accepts {label} (formatting is not canonicalised)", False,
                      f"{type(e).__name__}: {str(e)[:60]}")
        finally:
            shutil.rmtree(d_ok, ignore_errors=True)

    print("Complete symbol — function patterns (both directions):")
    mat, msize = G.svg_to_matrix(svg)
    B = G.QR_BORDER

    def module_mutation(r, c):
        """Flip one module in the committed SVG, in whichever direction applies."""
        cell = f"M{c + B},{r + B}H{c + B + 1}V{r + B + 1}H{c + B}z"
        if mat[r][c]:
            assert cell in svg, (r, c)
            return svg.replace(cell, "", 1)
        return svg.replace('d="', 'd="' + cell, 1)

    for label, (r, c) in [
        ("top-left finder", (0, 0)),
        ("top-right finder", (0, msize - 1)),
        ("bottom-left finder", (msize - 1, 0)),
        ("finder inner ring", (2, 2)),
        ("finder light ring (light->dark)", (1, 1)),
        ("separator (light->dark)", (7, 0)),
        ("horizontal timing", (6, 10)),
        ("vertical timing", (8, 6)),
        ("timing light cell (light->dark)", (6, 11)),
        ("alignment centre", (msize - 7, msize - 7)),
        ("alignment outer ring", (msize - 9, msize - 9)),
        ("alignment light ring (light->dark)", (msize - 8, msize - 8)),
        ("fixed dark module", (msize - 8, 8)),
    ]:
        expect_unsupported(f"rejects a corrupt {label}", module_mutation(r, c),
                           frag="function pattern is corrupt")

    print("Complete symbol — data, EC and remainder regions:")
    traversal = []
    col, up = msize - 1, True
    while col > 0:
        if col == 6:
            col -= 1
        for rr in (range(msize - 1, -1, -1) if up else range(msize)):
            for cc in (col, col - 1):
                if G._is_function_module(rr, cc, msize):
                    continue
                traversal.append((rr, cc))
        up = not up
        col -= 2
    v = (msize - 17) // 4
    n_data, n_ec = G._DATA_CODEWORDS_M[v], G._EC_CODEWORDS_M[v]
    check("traversal length equals data+EC bits plus remainder",
          len(traversal) == 8 * (n_data + n_ec) + G._REMAINDER_BITS[v],
          f"{len(traversal)}")
    for label, idx in [("first data bit", 0), ("mid data bit", 8 * n_data // 2),
                       ("last data bit", 8 * n_data - 1),
                       ("first EC bit", 8 * n_data), ("mid EC bit", 8 * n_data + 100),
                       ("last EC bit", 8 * (n_data + n_ec) - 1),
                       ("first remainder bit", 8 * (n_data + n_ec)),
                       ("last remainder bit", len(traversal) - 1)]:
        r, c = traversal[idx]
        expect_unsupported(f"rejects a flipped {label} (idx {idx})", module_mutation(r, c))

    print("Complete symbol — internally well-formed but WRONG error correction:")
    # Re-encode the symbol with EC bytes that are a valid RS codeword for
    # DIFFERENT data. Nothing is malformed; only the EC/data relationship is
    # wrong, which a bit-level mutation test would not catch.
    if not HAVE_QRCODE:
        skip("rejects EC codewords valid for different data", NO_QR)
    else:
        fmt_a = [(8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 7), (8, 8),
                 (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8)]
        raw = int("".join(str(mat[r][c]) for r, c in fmt_a), 2)
        _ecf, msk = G._VALID_FORMATS[raw]
        bits = [mat[r][c] ^ (1 if G._MASKS[msk](r, c) else 0) for r, c in traversal]
        cws = [int("".join(str(b) for b in bits[i * 8:(i + 1) * 8]), 2)
               for i in range(n_data + n_ec)]
        bogus = G._rs_encode([(x + 1) & 0xFF for x in cws[:n_data]], n_ec)
        check("the bogus EC really differs from the real EC (fixture check)",
              bogus != cws[n_data:])
        newbits = list(bits)
        for i, byte in enumerate(bogus):
            for j in range(8):
                newbits[8 * (n_data + i) + j] = (byte >> (7 - j)) & 1
        grid = [row[:] for row in mat]
        for (r, c), b in zip(traversal, newbits):
            grid[r][c] = b ^ (1 if G._MASKS[msk](r, c) else 0)
        d_attr = "".join(f"M{c + B},{r + B}H{c + B + 1}V{r + B + 1}H{c + B}z"
                         for r in range(msize) for c in range(msize) if grid[r][c])
        expect_unsupported("rejects EC codewords valid for different data",
                           svg_doc(d_attr, msize + 2 * B), frag="error-correction codewords")

    print("Valid controls for every supported version at level M:")
    if not HAVE_QRCODE:
        for v_ in (1, 2, 3):
            skip(f"a genuine version {v_} level M symbol still verifies", NO_QR)
    else:
        import qrcode.image.svg
        for payload, want_v in [("https://a.co", 1), ("https://www.lacks.com/x", 2),
                                (url, 3)]:
            q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                              border=G.QR_BORDER)
            q.add_data(payload)
            q.make(fit=True)
            buf = io.BytesIO()
            q.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(buf)
            doc = buf.getvalue().decode("utf-8")
            try:
                got, inf = G.decode_svg(doc)
                check(f"a genuine version {want_v} level M symbol still verifies",
                      got == payload and inf["version"] == want_v,
                      f"v{inf['version']} {got!r}")
            except G.QrUnsupportedError as e:
                check(f"a genuine version {want_v} level M symbol still verifies",
                      False, str(e)[:80])

    print("Multi-segment payload smuggling:")
    # A QR may carry several segments in different modes; a scanner reads their
    # CONCATENATION. Decoding only the first segment meant a symbol whose first
    # segment was exactly the configured URL, followed by an alphanumeric
    # segment, was certified as "encodes the configured URL" while a phone
    # camera read a longer, different URL.
    if not HAVE_QRCODE:
        skip("a trailing segment after the configured URL is refused", NO_QR)
        skip("--check exits nonzero on a smuggled second segment", NO_QR)
        skip("generator forces ONE byte segment for an optimizable url", NO_QR)
        skip("generator output reports segments == 1", NO_QR)
        skip("generator forces ONE byte segment for a numeric-heavy url", NO_QR)
        skip("generator output is byte mode", NO_QR)
    else:
        import qrcode.image.svg
        from qrcode.util import QRData, MODE_8BIT_BYTE, MODE_ALPHA_NUM

        def two_segment_svg(first, extra):
            q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                              border=G.QR_BORDER)
            q.add_data(QRData(first.encode(), mode=MODE_8BIT_BYTE))
            q.add_data(QRData(extra.encode(), mode=MODE_ALPHA_NUM))
            q.make(fit=True)
            buf = io.BytesIO()
            q.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(buf)
            return buf.getvalue().decode("utf-8")

        smuggled = two_segment_svg(url, "/SECRET")
        d = tempfile.mkdtemp()
        try:
            q2 = os.path.join(d, "smuggled.svg")
            io.open(q2, "w", encoding="utf-8", newline="\n").write(smuggled)
            try:
                G.check_svg(CONFIG_PATH, q2)
                check("a trailing segment after the configured URL is refused",
                      False, "certified a QR that scans elsewhere")
            except G.QrUnsupportedError as e:
                check("a trailing segment after the configured URL is refused",
                      "further data segment" in str(e), str(e)[:80])
            r = subprocess.run([sys.executable, GEN, "--check", "--output", q2],
                               capture_output=True, text=True)
            check("--check exits nonzero on a smuggled second segment",
                  r.returncode != 0, f"exit {r.returncode}")
        finally:
            shutil.rmtree(d, ignore_errors=True)
        # THE DISTINCTION THAT MATTERS. Rejecting an externally supplied
        # multi-segment symbol (above) is correct. Our OWN generator emitting one
        # is not: `qr.add_data(str)` ran qrcode's optimizer, which split
        # ".../SUPERSECRET-MISMATCH" into byte + alphanumeric segments, so
        # build_svg() could produce an asset --check refused. build_svg() now
        # passes a QRData instance, which bypasses the optimizer structurally.
        # An earlier version of this test asserted that refusal was DESIRABLE,
        # which enshrined the generator defect as intended behaviour.
        for label, target in [
            ("an optimizable uppercase url", "https://www.lacks.com/SUPERSECRET-MISMATCH"),
            ("a numeric-heavy url", "https://www.lacks.com/1234567890"),
            ("an uppercase+digit url", "https://www.lacks.com/PROMO2026"),
        ]:
            try:
                got, inf = G.decode_svg(G.build_svg(target))
                check(f"generator emits ONE byte segment for {label}",
                      got == target and inf["segments"] == 1 and inf["mode"] == "0100",
                      f"{got!r} segments={inf.get('segments')} mode={inf.get('mode')}")
            except (G.QrUnsupportedError, G.QrTargetError) as e:
                check(f"generator emits ONE byte segment for {label}", False,
                      f"our own generator produced an asset --check refuses: {str(e)[:60]}")
            except Exception as e:                  # noqa: BLE001 - reported, not swallowed
                check(f"generator emits ONE byte segment for {label}", False,
                      f"unexpected {type(e).__name__}: {str(e)[:60]}")
        # Structural, not behavioural: prove the generator hands qrcode a single
        # explicit byte-mode segment rather than relying on an optimizer setting.
        gen_src_now = io.open(GEN, encoding="utf-8").read()
        check("build_svg passes an explicit byte-mode QRData, not a bare string",
              "QRData(target.encode(\"utf-8\"), mode=MODE_8BIT_BYTE)" in gen_src_now
              and "qr.add_data(target)" not in gen_src_now)
        qtest = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                              border=G.QR_BORDER)
        qtest.add_data(QRData("https://www.lacks.com/SUPERSECRET-MISMATCH".encode(),
                              mode=MODE_8BIT_BYTE))
        qtest.make(fit=True)
        check("an explicit QRData segment bypasses qrcode's optimizer",
              len(qtest.data_list) == 1, f"{len(qtest.data_list)} segments")

    print("Mismatch diagnostics never echo the untrusted payload:")
    MSENT = "supersecret-mismatch"
    if not HAVE_QRCODE:
        skip("the sentinel really is in the alternate payload (fixture check)", NO_QR)
        skip("mismatch exception withholds the decoded payload", NO_QR)
        skip("mismatch exception still identifies the payload by digest", NO_QR)
        skip("mismatch CLI exits nonzero on the sentinel SVG", NO_QR)
        skip("mismatch CLI names the mismatch", NO_QR)
        skip("sentinel never reaches stdout", NO_QR)
        skip("sentinel never reaches stderr", NO_QR)
    else:
        alt_svg = G.build_svg(f"https://www.lacks.com/{MSENT}")
        check("the sentinel really is in the alternate payload (fixture check)",
              G.decode_svg(alt_svg)[0].endswith(MSENT))
        d = tempfile.mkdtemp()
        try:
            q3 = os.path.join(d, "mismatch.svg")
            io.open(q3, "w", encoding="utf-8", newline="\n").write(alt_svg)
            try:
                G.check_svg(CONFIG_PATH, q3)
                check("mismatch exception withholds the decoded payload",
                      False, "no mismatch raised")
            except G.QrPayloadMismatch as e:
                check("mismatch exception withholds the decoded payload",
                      MSENT not in str(e), str(e)[:90])
                check("mismatch exception still identifies the payload by digest",
                      "sha256:" in str(e), str(e)[:90])
            # The subprocess MUST receive the sentinel-bearing SVG and fail, so
            # this cannot pass by falling back to a clean fixture.
            r = subprocess.run([sys.executable, GEN, "--check", "--output", q3],
                               capture_output=True, text=True)
            check("mismatch CLI exits nonzero on the sentinel SVG",
                  r.returncode != 0, f"exit {r.returncode}")
            check("mismatch CLI names the mismatch",
                  "QrPayloadMismatch" in (r.stdout + r.stderr), (r.stdout + r.stderr)[:90])
            check("sentinel never reaches stdout", MSENT not in r.stdout)
            check("sentinel never reaches stderr", MSENT not in r.stderr)
        finally:
            shutil.rmtree(d, ignore_errors=True)

    print("Tamper detection and non-vacuity:")
    mutated = svg.replace("M20,20H21V21H20z", "", 1)
    check("the module-removal fixture actually changed the SVG", mutated != svg)
    try:
        bad_payload, _ = G.decode_svg(mutated)
        check("a removed data module changes the decoded payload", bad_payload != url,
              f"still decoded {bad_payload!r}")
    except G.QrUnsupportedError:
        check("a removed data module is detected (decode fails explicitly)", True)
    # Damaged format information must fail explicitly.
    fmt_cell = "M2,10H3V11H2z"
    if fmt_cell in svg:
        broken = svg.replace(fmt_cell, "", 1)
    else:
        broken = svg.replace("M8,2H9V3H8z", "", 1)
    try:
        G.decode_svg(broken)
        check("damaged format information fails explicitly", False, "decoded anyway")
    except G.QrUnsupportedError as e:
        check("damaged format information fails explicitly",
              "format information" in str(e) or "BCH" in str(e), str(e)[:80])
    except Exception as e:                          # noqa: BLE001 - reported, not swallowed
        check("damaged format information fails explicitly", False,
              f"unexpected {type(e).__name__}: {str(e)[:60]}")

    print("Format information and EC scope (stdlib-only, no qrcode needed):")
    # Rebuild the symbol with FORGED format bits. This is what makes the EC
    # claim non-vacuous: a well-formed BCH codeword for a level the decoder
    # does not implement must be refused by the EC gate specifically, not
    # accepted and not confused with a checksum failure.
    _, size = G.svg_to_matrix(svg)
    base_mask = info["mask"]

    def refmt(bits_a, bits_b):
        mat = [row[:] for row in G.svg_to_matrix(svg)[0]]
        cells_a = [(8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 7), (8, 8),
                   (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8)]
        cells_b = [(size - 1 - i, 8) for i in range(7)] + \
                  [(8, size - 8 + i) for i in range(8)]
        for (r, c), v in zip(cells_a, bits_a):
            mat[r][c] = int(v)
        for (r, c), v in zip(cells_b, bits_b):
            mat[r][c] = int(v)
        b = G.QR_BORDER
        d_attr = "".join(f"M{c + b},{r + b}H{c + b + 1}V{r + b + 1}H{c + b}z"
                         for r in range(size) for c in range(size) if mat[r][c])
        return svg_doc(d_attr, size + 2 * b)

    def bits(ec, mask):
        return format(G._format_codeword(ec, mask), "015b")

    # CONTROL FIRST: re-encoding with the CORRECT format bits must still decode.
    # Without this the three refusals below could all be passing because the
    # fixture builder is broken rather than because the gates work.
    good = bits(G.SUPPORTED_EC_FIELD, base_mask)
    try:
        ctrl, _ = G.decode_svg(refmt(good, good))
        check("control: the format-rewrite fixture still decodes correctly",
              ctrl == url, f"{ctrl!r}")
    except G.QrUnsupportedError as e:
        check("control: the format-rewrite fixture still decodes correctly",
              False, str(e)[:80])

    for label, a_bits, b_bits, frag in [
        ("EC level L (valid BCH, unimplemented block layout)",
         bits(1, base_mask), bits(1, base_mask), "outside this decoder's supported subset"),
        ("EC level H", bits(2, base_mask), bits(2, base_mask),
         "outside this decoder's supported subset"),
        ("EC level Q", bits(3, base_mask), bits(3, base_mask),
         "outside this decoder's supported subset"),
        ("format bits that are not a valid codeword",
         format(G._format_codeword(0, base_mask) ^ 0b1011, "015b"),
         format(G._format_codeword(0, base_mask) ^ 0b1011, "015b"),
         "BCH check"),
        ("two valid copies that disagree",
         bits(0, base_mask), bits(0, (base_mask + 1) % 8), "disagree"),
        # ISOLATING LAYER: copy B is a perfectly valid codeword, so only the
        # copy-A BCH check can refuse this one.
        ("a corrupt FIRST copy beside a valid second",
         format(G._format_codeword(0, base_mask) ^ 0b1011, "015b"),
         bits(0, base_mask), "BCH check"),
        # ...and the mirror image, isolating the copy-B check.
        ("a corrupt SECOND copy beside a valid first",
         bits(0, base_mask),
         format(G._format_codeword(0, base_mask) ^ 0b1011, "015b"),
         "second format-information copy"),
    ]:
        try:
            G.decode_svg(refmt(a_bits, b_bits))
            check(f"refuses {label}", False, "decoded anyway")
        except G.QrUnsupportedError as e:
            check(f"refuses {label}", frag in str(e), str(e)[:95])
        except Exception as e:                      # noqa: BLE001 - reported, not swallowed
            check(f"refuses {label}", False, f"unexpected {type(e).__name__}: {str(e)[:60]}")

    if not HAVE_QRCODE:
        skip("--check rejects an alternate-payload SVG", NO_QR)
        skip("the alternate payload is withheld from the message", NO_QR)
    else:
        d = tempfile.mkdtemp()
        try:
            other = os.path.join(d, "other.svg")
            io.open(other, "w", encoding="utf-8", newline="\n").write(
                G.build_svg("https://www.synchrony.com/other"))
            try:
                G.check_svg(CONFIG_PATH, other)
                check("--check rejects an alternate-payload SVG", False, "accepted it")
            except G.QrPayloadMismatch as e:
                check("--check rejects an alternate-payload SVG",
                      "payload differs" in str(e), str(e)[:90])
                check("the alternate payload is withheld from the message",
                      "synchrony.com/other" not in str(e), str(e)[:90])
        finally:
            shutil.rmtree(d, ignore_errors=True)
    for label, doc, frag in [
        # Grammar-correct documents whose MODULE GRID is wrong, so the failure
        # is attributable to the grid and not to a malformed fixture.
        ("undersized symbol", svg_doc("M2,2H3V3H2z", 5), "valid QR size"),
        ("non-1x1 subpath", svg_doc("M2,2H4V4H2z", 33), "not 1x1"),
        ("not XML", "<svg><path d=", "well-formed XML"),
    ]:
        try:
            G.decode_svg(doc)
            check(f"{label} fails explicitly", False, "decoded anyway")
        except G.QrUnsupportedError as e:
            check(f"{label} fails explicitly", frag in str(e), str(e)[:80])
    check("decoder supports all eight data masks", len(G._MASKS) == 8)
    check("decoder enforces the supported EC level",
          G.SUPPORTED_EC_FIELD == 0 and G._EC_FIELD_NAMES[0] == "M")
    check("decoder rejects unsupported EC levels by contract",
          "outside this decoder's supported subset" in
          io.open(os.path.join(REPO, "incoming", "generate_financing_qr.py"),
                  encoding="utf-8").read())

    print("CLI contract:")
    before = os.stat(SVG_PATH)
    before_bytes = io.open(SVG_PATH, "rb").read()
    r = subprocess.run([sys.executable, GEN, "--check"], capture_output=True, text=True)
    check("--check exits 0 on the committed QR", r.returncode == 0, r.stderr[:120])
    after = os.stat(SVG_PATH)
    check("--check is read-only (bytes and mtime unchanged)",
          io.open(SVG_PATH, "rb").read() == before_bytes and after.st_mtime == before.st_mtime)

    # Divergence tripwire. The no-parameter contract lives in THIS tool, not in
    # tools/validation.py (which currently accepts a query/fragment on
    # financing.sourceUrl) and not in the runtime helper (whose job is
    # scheme/host/credential/port safety). So a tracking parameter added to the
    # config would render on the tapped anchor while the committed QR still
    # encodes the bare URL — two different destinations. What stops that
    # shipping silently is that `--check` FAILS. Pin it.
    p2, d2 = cfg_with(sourceUrl="https://www.lacks.com/financing?utm_source=kiosk")
    try:
        r3 = subprocess.run([sys.executable, GEN, "--check", "--config", p2],
                            capture_output=True, text=True)
        check("--check fails when the config gains a parameter the QR cannot encode",
              r3.returncode != 0, f"exit {r3.returncode}")
        check("--check names the reason rather than reporting a bare mismatch",
              "query string" in (r3.stdout + r3.stderr), (r3.stdout + r3.stderr)[:90])
    finally:
        shutil.rmtree(d2, ignore_errors=True)
    # A refused generation must leave an existing output byte-for-byte intact.
    d = tempfile.mkdtemp()
    try:
        out = os.path.join(d, "existing.svg")
        io.open(out, "w", encoding="utf-8", newline="\n").write("SENTINEL")
        p, cd = cfg_with(sourceUrl="https://evil.example.com/x")
        try:
            r2 = subprocess.run([sys.executable, GEN, "--config", p, "--output", out],
                                capture_output=True, text=True)
            check("a refused generation exits nonzero", r2.returncode != 0)
            check("a refused generation leaves the existing output intact",
                  io.open(out, encoding="utf-8").read() == "SENTINEL")
        finally:
            shutil.rmtree(cd, ignore_errors=True)
    finally:
        shutil.rmtree(d, ignore_errors=True)

    # Determinism at the module/payload level.
    if not HAVE_QRCODE:
        skip("generation is deterministic (identical bytes across runs)", NO_QR)
        skip("committed SVG matches a fresh generation of the configured target", NO_QR)
    else:
        a, b = G.build_svg(url), G.build_svg(url)
        check("generation is deterministic (identical bytes across runs)", a == b)
        check("committed SVG matches a fresh generation of the configured target", a == svg)

    print("Runtime wiring:")
    html = io.open(os.path.join(REPO, "index.html"), encoding="utf-8").read()
    check("runtime still references images/qr-financing.svg", "qr-financing.svg" in html)
    check("an unsafe sourceUrl hides the whole handoff continuation incl. the QR",
          "contin.hidden = !linkOk" in html and 'id="hf2FinancingContinuation"' in html)

    print("Test-suite hygiene:")
    end_stat = os.stat(SVG_PATH)
    check("no test rewrote the committed QR asset (bytes unchanged)",
          io.open(SVG_PATH, "rb").read() == run_start_bytes)
    check("no test rewrote the committed QR asset (mtime unchanged)",
          end_stat.st_mtime == run_start_stat.st_mtime,
          "a generating test omitted --output and ran against the real config")

    env = f"python {sys.version.split()[0]}"
    env += f", qrcode {QRCODE_VERSION}" if HAVE_QRCODE else ", qrcode ABSENT"
    print(f"\nQR payload check: {passed} passed, {failed} failed, {skipped} skipped  [{env}]")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
