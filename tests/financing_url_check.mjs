// Financing URL runtime-contract check — Commit D (Cycle 1).
//
// Proves the REAL financingSourceAllowed() and setAllowedFinancingLink()
// extracted from index.html enforce https / no-credentials / default-port /
// allowlisted-host, and that an unsafe URL strips the anchor's href, text and
// visibility (never '#', never a stale href) while a later valid render
// restores it deterministically. Build-time validation (tools/validation.py)
// remains authoritative; this is the defense-in-depth layer.
//
// Render-level fail-closed behavior (Mexico text-only card, sheet link/note,
// handoff continuation + QR, email URL) is pinned statically here and
// verified behaviorally in the browser.
//
// Run: node tests/financing_url_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const cfg = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}`); }
}
function extract(re, name) {
  const m = html.match(re);
  check(`${name} found`, !!m);
  return m ? m[0] : "";
}

const allowedSrc = extract(/function financingSourceAllowed\(url\)\s*\{[\s\S]*?\n    \}/, "financingSourceAllowed()");
const linkSrc = extract(/function setAllowedFinancingLink\(anchor, url, text, noteEl\)\s*\{[\s\S]*?\n    \}/, "setAllowedFinancingLink()");

// Real functions, shared scope, real shipped allowlist from data/store-config.json.
const api = new Function("getFinancingConfig", "FC",
  `${allowedSrc}
   ${linkSrc}
   return { financingSourceAllowed: financingSourceAllowed,
            setAllowedFinancingLink: setAllowedFinancingLink };`
)(() => cfg.financing, () => "EXTERNAL-NOTE");
const { financingSourceAllowed: allowed, setAllowedFinancingLink: setLink } = api;

check("shipped allowlist is the narrow Lacks/Synchrony set",
  JSON.stringify(cfg.financing.allowedSourceHosts) ===
  JSON.stringify(["lacks.com", "www.lacks.com", "synchrony.com", "www.synchrony.com", "mysynchrony.com"]));

// --- allowed ---
for (const [label, url] of [
  ["shipped financing.sourceUrl", cfg.financing.sourceUrl],
  ["shipped mexicoInfoUrl (FAQ)", cfg.financing.mexicoInfoUrl],
  ["bare allowlisted apex host", "https://lacks.com/financing"],
  ["approved Synchrony host", "https://www.synchrony.com/whatever"],
  ["mysynchrony host", "https://mysynchrony.com/x"],
  ["dot-boundary subdomain", "https://promo.lacks.com/x"],
  ["explicit default port 443", "https://www.lacks.com:443/financing"],
]) {
  check(`allowed: ${label}`, allowed(url) === true);
}

// --- rejected ---
for (const [label, url] of [
  ["http scheme", "http://www.lacks.com/financing"],
  ["protocol-relative", "//www.lacks.com/financing"],
  ["relative path", "/financing"],
  ["bare path", "financing"],
  ["javascript:", "javascript:alert(1)"],
  ["data:", "data:text/html,hi"],
  ["embedded username", "https://user@www.lacks.com/financing"],
  ["username + password", "https://u:p@www.lacks.com/financing"],
  ["non-default port", "https://www.lacks.com:8443/financing"],
  ["lookalike suffix host", "https://www.lacks.com.evil.example/financing"],
  ["lookalike prefix host", "https://wwwlacks.com/financing"],
  ["substring-only host", "https://evil-lacks.com/financing"],
  ["malformed", "https://"],
  ["empty string", ""],
  ["null", null],
  ["undefined", undefined],
]) {
  check(`rejected: ${label}`, allowed(url) === false);
}

// --- anchor lifecycle ---
function makeAnchor(href, text) {
  return {
    href, textContent: text, hidden: false, hrefRemoved: false,
    removeAttribute(name) { if (name === "href") { this.href = undefined; this.hrefRemoved = true; } },
  };
}
function makeNote() { return { textContent: "stale note", hidden: false }; }

{
  const a = makeAnchor("https://www.lacks.com/financing", "lacks.com/financing");
  const n = makeNote();
  const ok = setLink(a, "https://evil.example.com/x", "evil.example.com/x", n);
  check("unsafe URL: helper reports failure", ok === false);
  check("unsafe URL: href attribute removed (not '#', not stale)",
    a.hrefRemoved === true && a.href === undefined);
  check("unsafe URL: stale link text cleared", a.textContent === "");
  check("unsafe URL: anchor hidden", a.hidden === true);
  check("unsafe URL: external note cleared and hidden", n.textContent === "" && n.hidden === true);

  // valid rerender restores deterministically from the failed state
  const ok2 = setLink(a, cfg.financing.sourceUrl, "lacks.com/financing", n);
  check("valid rerender: helper reports success", ok2 === true);
  check("valid rerender: href restored", a.href === cfg.financing.sourceUrl);
  check("valid rerender: text restored", a.textContent === "lacks.com/financing");
  check("valid rerender: anchor unhidden", a.hidden === false);
  check("valid rerender: note restored from config", n.textContent === "EXTERNAL-NOTE" && n.hidden === false);
}
{
  const a = makeAnchor(undefined, "");
  const ok = setLink(a, "http://www.lacks.com/financing", "x", makeNote());
  check("http URL on an allowlisted host is still refused by the helper", ok === false);
}
check("missing anchor is a safe no-op (returns false)", setLink(null, cfg.financing.sourceUrl, "x", null) === false);

// --- static pins for render-level fail-closed behavior ---
check("sheet official link routed through the safe-link helper",
  /setAllowedFinancingLink\(\s*\n\s*document\.getElementById\('financingSheetLink'\)/.test(html));
check("handoff link routed through the safe-link helper",
  /setAllowedFinancingLink\(\s*\n\s*document\.getElementById\('hf2FinancingLink'\)/.test(html));
check("handoff continuation wrapper has a stable id and is hidden when the link fails",
  html.includes('id="hf2FinancingContinuation"') && /contin\.hidden = !linkOk/.test(html));
check("scan-to-open copy cleared when the link fails",
  /hf2FinancingPrivate'\)\.textContent = linkOk \? FC\('handoffPrivate'\) : ''/.test(html));
check("QR alt text only built when the link is valid", /if \(qrImg && linkOk\)/.test(html));
check("Mexico anchor is conditional on a safe resolved link", /\+ \(mxLink\s*\n\s*\? '<a class="fin-official-link"/.test(html));
check("Mexico falls back to sourceUrl only when NO Mexico URL is configured",
  /if \(mxConfigured\) \{\s*\n\s*if \(financingSourceAllowed\(mxConfigured\)\) mxLink = mxConfigured;\s*\n\s*\} else if \(financingSourceAllowed\(f\.sourceUrl\)\)/.test(html));
check("Mexico never renders a blank hostname label", /if \(!mxHost\) mxLink = '';/.test(html));
check("email payload URL fails closed to empty string",
  html.includes("url: financingSourceAllowed(f.sourceUrl) ? f.sourceUrl : ''"));
// Structural, not distance-based: assert the call lives INSIDE the gate's own
// body. (An earlier proximity regex went false-negative the moment unrelated
// lines were added to the function.)
const termsFreshBody = (html.match(/function financingTermsFresh\(\)\s*\{[\s\S]*?\n    \}/) || [""])[0];
check("exact-terms gate body was located", termsFreshBody.length > 0);
check("exact-terms gate still consults the URL allowlist",
  termsFreshBody.includes("financingSourceAllowed(f.sourceUrl)"));
check("dead Mexico application URL unreferenced by runtime code",
  !html.includes("mexicoApplicationUrl") && !html.includes("mexican-credit-application"));

// --- QR: authoritative payload coverage lives in tests/qr_payload_check.py ---
// Node does not decode the SVG, so this file deliberately makes NO claim about
// the encoded payload. It pins only that the generator is config-driven; the
// committed image's payload is decoded and asserted by the Python check.
const qrGen = readFileSync(join(root, "incoming", "generate_financing_qr.py"), "utf8");
check("QR generator carries no hardcoded financing target",
  !qrGen.includes("https://www.lacks.com/financing"));
check("QR generator reads the target from financing.sourceUrl",
  qrGen.includes('fin.get("sourceUrl")'));
check("QR payload proof is owned by tests/qr_payload_check.py",
  qrGen.includes("def decode_svg("));

console.log(`\nFinancing URL check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
