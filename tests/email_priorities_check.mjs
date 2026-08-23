// Phase 0.5 — the priorities field through Code.gs: intake, safeData
// projection, HTML email, the plain-text body on BOTH sends (the normal
// email's text/plain part and the forced-HTML-failure fallback), hostility.
//
// This is the FIRST suite in the repo to EXECUTE Code.gs rather than grep it.
// The file is plain ES5 (top-level vars + function declarations, no modules),
// so the whole file compiles as a `new Function` body with four recorder
// stubs — Logger, ContentService, SpreadsheetApp, GmailApp — and every
// declaration is in scope. Extracting doPost by regex instead would swallow to
// EOF (measured), which is why the whole-file load is the pattern.
//
// THE VACUITY TRAP THIS SUITE IS BUILT AROUND: the shipped CAN-SPAM constants
// are RETAILER_APPROVAL_REQUIRED sentinels, so doPost returns
// canspam_not_configured and sends NOTHING. A naive harness asserts on an
// email that never existed and passes. Two rules, everywhere below:
//   - approveCanSpam() is a HARNESS-SCOPE rebind (never a source edit), and
//     the shipped refusal is itself asserted first;
//   - every body assertion is preceded by "an email was actually sent", and
//     every plain-text assertion by "fell back to plain text".
//
// Run: node tests/email_priorities_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gs = readFileSync(join(root, "Code.gs"), "utf8");

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}`); }
}
function section(name) { console.log(`\n-- ${name} --`); }

// ---------- the harness ------------------------------------------------------
function buildGas() {
  const log = [];
  const rows = [];
  const sent = [];
  let safeDataSeen = null;
  const Logger = { log: (s) => log.push(String(s)) };
  const ContentService = {
    MimeType: { JSON: "json" },
    createTextOutput: (s) => ({ setMimeType: () => ({ getContent: () => s }), getContent: () => s }),
  };
  const SpreadsheetApp = {
    getActiveSpreadsheet: () => ({ getActiveSheet: () => ({ appendRow: (r) => rows.push(r) }) }),
  };
  const GmailApp = {
    sendEmail: (to, subject, body, opts) => sent.push({ to, subject, body, opts: opts || {} }),
  };
  const api = new Function("Logger", "ContentService", "SpreadsheetApp", "GmailApp", gs + `
    ;return {
      doPost: function(e) { return doPost(e); },
      buildSimpleHtml: function(d, f, es, s) { return buildSimpleHtml(d, f, es, s); },
      // Harness-scope rebinds — the SOURCE stays shipped and is asserted so.
      approveCanSpam: function() {
        UNSUBSCRIBE_URL = 'https://example.test/unsubscribe';
        POSTAL_ADDRESS = '1 Test St, Test TX 78501';
        PRIVACY_CONTACT = 'privacy@example.test';
      },
      breakHtmlBuilder: function() {
        buildSimpleHtml = function() { throw new Error('forced HTML failure'); };
      },
      captureSafeData: function(sink) {
        var orig = buildSimpleHtml;
        buildSimpleHtml = function(d, f, es, s) { sink(d); return orig(d, f, es, s); };
      }
    };`)(Logger, ContentService, SpreadsheetApp, GmailApp);
  return { api, log, rows, sent,
    setSafeDataSink: (fn) => api.captureSafeData(fn) };
}

const PRIORITIES_EN = [
  { name: "Comfortable elevation",
    reason: "A raised upper body may be worth experiencing as part of the complete sleep setup.",
    test: "Try the mattress flat, then with the head gently raised on an adjustable base." },
  { name: "Motion control",
    reason: "Movement on the other side is already affecting your sleep.",
    test: "Have the other sleeper change positions and notice how much movement reaches your side." },
  { name: "Consistent support",
    reason: "Your current mattress has lost shape, so stability across the sleep surface matters.",
    test: "Lie near the edge and at the middle and compare whether support feels the same." },
];
const PRIORITIES_ES = [
  { name: "Elevación cómoda", reason: "Razón uno.", test: "Prueba uno." },
  { name: "Control de movimiento", reason: "Razón dos.", test: "Prueba dos." },
  { name: "Soporte consistente", reason: "Razón tres.", test: "Prueba tres." },
];

function basePayload(over) {
  return Object.assign({
    storeName: "Test Store",
    name: "Test Customer",
    email: "customer@example.test",
    phone: "9565550100",
    sleepProfile: "Sleep brief · comfortable elevation, motion control, and consistent support",
    topMatch: "Test Mattress", matchPct: "88", meetsMatchThreshold: true,
    discount: 0, dreamCode: "", passExpiration: "", passScope: "", passTerms: "",
    rsa: "", lang: "en",
    allMatches: [{ name: "Test Mattress", brand: "TestBrand", matchPct: "88",
      meetsMatchThreshold: true, imageUrl: "" }],
    accessories: [], emailPromotions: [], promoSpanishDraft: "",
    promoScenario: "", promoDisclosure: "",
    branding: { logoMain: "", logoSub: "", primary: "", accent: "" },
    financing: null,
    priorities: PRIORITIES_EN,
  }, over || {});
}
function post(api, payload) {
  return JSON.parse(api.doPost({ postData: { contents: JSON.stringify(payload) } }).getContent());
}
const inOrder = (hay, needles) => {
  let at = -1;
  return needles.every((n) => { const i = hay.indexOf(n, at + 1); if (i <= at) return false; at = i; return true; });
};

// ===========================================================================
// -1. HARNESS PRECONDITIONS — a rename in Code.gs becomes a NAMED failure
// here, instead of a bare ReferenceError sixty assertions in.
// ===========================================================================
section("Code.gs still declares what the harness rebinds");
check("doPost, buildSimpleHtml and the CAN-SPAM constants exist by name",
  /function doPost\(/.test(gs) && /function buildSimpleHtml\(/.test(gs)
  && /var UNSUBSCRIBE_URL/.test(gs) && /var POSTAL_ADDRESS/.test(gs)
  && /var PRIVACY_CONTACT/.test(gs));

// ===========================================================================
// 0. THE SHIPPED REFUSAL — asserted first, so nothing below is vacuous
// ===========================================================================
section("shipped state refuses to send (CAN-SPAM sentinels)");
{
  const g = buildGas();
  const res = post(g.api, basePayload());
  check("doPost refuses with canspam_not_configured", res.error === "canspam_not_configured");
  check("NO email was sent and NO sheet row written", g.sent.length === 0 && g.rows.length === 0);
  check("the source still carries the sentinels (the rebind never edits it)",
    /RETAILER_APPROVAL_REQUIRED/.test(gs));
}

// ===========================================================================
// 1. HAPPY PATH — HTML email, order, both languages
// ===========================================================================
section("HTML email renders the priorities in order, localized");
{
  const g = buildGas();
  g.api.approveCanSpam();
  let seenSafe = null;
  g.setSafeDataSink((d) => { seenSafe = d; });
  const res = post(g.api, basePayload());
  check("send succeeded", res.success === true);
  check("an email was actually sent", g.sent.length === 1);
  const htmlBody = g.sent[0].opts.htmlBody || "";
  check("the section header is present in English",
    htmlBody.includes("WHAT WE WILL TEST TOGETHER"));
  check("the three names render in order",
    inOrder(htmlBody, PRIORITIES_EN.map((p) => p.name)));
  check("each entry carries its reason", PRIORITIES_EN.every((p) => htmlBody.includes(p.reason)));
  check("each entry carries its testing prompt with the EN label",
    PRIORITIES_EN.every((p) => htmlBody.includes(p.test)) && htmlBody.includes("Try this: "));
  check("entries are numbered 1..3 in order", inOrder(htmlBody, ["1. ", "2. ", "3. "]));
  check("the section sits after the Sleep Brief line",
    htmlBody.indexOf("Sleep brief ·") !== -1
    && htmlBody.indexOf("Sleep brief ·") < htmlBody.indexOf("WHAT WE WILL TEST TOGETHER"));

  // safeData: allowlist projection, observed on the object the builder received.
  check("safeData carries the priorities", Array.isArray(seenSafe.priorities)
    && seenSafe.priorities.length === 3);
  seenSafe.priorities.forEach((p, i) => {
    check(`safeData entry ${i}: exactly name/reason/test`,
      JSON.stringify(Object.keys(p).sort()) === JSON.stringify(["name", "reason", "test"]));
  });
  check("safeData preserves the order",
    JSON.stringify(seenSafe.priorities.map((p) => p.name))
    === JSON.stringify(PRIORITIES_EN.map((p) => p.name)));

  // The sheet row is untouched by priorities: 9 cells, none carrying them.
  check("the sheet row still has exactly 9 cells", g.rows.length === 1 && g.rows[0].length === 9);
  check("no priority content reaches the sheet",
    !g.rows[0].join("|").includes(PRIORITIES_EN[0].reason));
}
{
  const g = buildGas();
  g.api.approveCanSpam();
  post(g.api, basePayload({ lang: "es", priorities: PRIORITIES_ES }));
  check("[es] an email was actually sent", g.sent.length === 1);
  const htmlBody = g.sent[0].opts.htmlBody || "";
  check("[es] the section header is Spanish", htmlBody.includes("LO QUE PROBAREMOS JUNTOS"));
  check("[es] names render in order", inOrder(htmlBody, PRIORITIES_ES.map((p) => p.name)));
  check("[es] the testing label is Spanish",
    htmlBody.includes("Pruébalo: ") && !htmlBody.includes("Try this: "));
}

// ===========================================================================
// 2. THE PLAIN-TEXT BODY — carried by BOTH sends. P2 (Codex, PR #16): the
// normal successful send used to ship a one-sentence "view in an HTML
// client" stub as its text/plain part, so a text-only or HTML-disabled
// client received no priorities — effectively no results — on the ordinary
// path. The success-path assertions here are the behavioral pin that the
// stub never returns; the fallback assertions then prove the catch still
// works; the drift check proves the two sends share ONE body.
// ===========================================================================
section("the NORMAL successful send's text part is the full plain body");
for (const [lang, prios, header, label] of [
  ["en", PRIORITIES_EN, "What we will test together:", "Try this: "],
  ["es", PRIORITIES_ES, "Lo que probaremos juntos:", "Pruébalo: "],
]) {
  const g = buildGas();
  g.api.approveCanSpam();
  const res = post(g.api, basePayload({ lang, priorities: prios }));
  check(`[${lang}] send succeeded`, res.success === true);
  check(`[${lang}] an email was actually sent`, g.sent.length === 1);
  // SUCCESS-path witnesses, the mirror of the catch witnesses below: only
  // the success path sends options carrying the htmlBody key, and the
  // catch's log line must be absent.
  check(`[${lang}] the SUCCESS path ran: options carry a non-empty htmlBody`,
    "htmlBody" in g.sent[0].opts && (g.sent[0].opts.htmlBody || "").length > 0);
  check(`[${lang}] ...and no HTML failure was logged`,
    !g.log.some((l) => l.includes("HTML email failed")));
  const body = g.sent[0].body;
  check(`[${lang}] the text part is not the retired stub`,
    body !== "Please view in an HTML email client."
    && body !== "Por favor visualiza este correo en un cliente de correo HTML."
    && body.length > 200);
  check(`[${lang}] the text part carries the section header`, body.includes(header));
  check(`[${lang}] names in order`, inOrder(body, prios.map((p) => p.name)));
  check(`[${lang}] reasons and labeled testing prompts present`,
    prios.every((p) => body.includes(p.reason))
    && prios.every((p) => body.includes(p.test)) && body.includes(label));
  check(`[${lang}] entries numbered 1..3 in order`, inOrder(body, ["1. ", "2. ", "3. "]));
  check(`[${lang}] the CAN-SPAM footer rides the text part`,
    body.includes("1 Test St, Test TX 78501")
    && body.includes("https://example.test/unsubscribe"));
}

section("plain-text fallback carries the priorities in order");
for (const [lang, prios, header, label] of [
  ["en", PRIORITIES_EN, "What we will test together:", "Try this: "],
  ["es", PRIORITIES_ES, "Lo que probaremos juntos:", "Pruébalo: "],
]) {
  const g = buildGas();
  g.api.approveCanSpam();
  g.api.breakHtmlBuilder();
  const res = post(g.api, basePayload({ lang, priorities: prios }));
  check(`[${lang}] send still succeeded via the fallback`, res.success === true);
  check(`[${lang}] an email was actually sent`, g.sent.length === 1);
  // TWO path witnesses, not a description of the message. An audit built a
  // success-path email that satisfied "no htmlBody and a long plain body"
  // without the catch ever running. The catch is the only code that (a) sends
  // options with NO htmlBody KEY at all — the success path always has the key
  // — and (b) writes the 'HTML email failed' log line.
  check(`[${lang}] the CATCH really ran: options carry no htmlBody key`,
    !("htmlBody" in g.sent[0].opts));
  check(`[${lang}] ...and the failure was logged by the catch`,
    g.log.some((l) => l.includes("HTML email failed")));
  check(`[${lang}] fell back to plain text with a real body`,
    g.sent[0].body.length > 200);
  const body = g.sent[0].body;
  check(`[${lang}] the plain body carries the section header`, body.includes(header));
  check(`[${lang}] names in order`, inOrder(body, prios.map((p) => p.name)));
  check(`[${lang}] reasons and numbered testing prompts present`,
    prios.every((p) => body.includes(p.reason))
    && prios.every((p) => body.includes(p.test)) && body.includes(label));
  check(`[${lang}] same order as the HTML body would carry`, inOrder(body, ["1. ", "2. ", "3. "]));
}
// One construction, two uses: for the same payload, the success path's text
// part and the catch's whole body must be the SAME string — the drift the
// buildPlainBody extraction exists to prevent.
for (const [lang, prios] of [["en", PRIORITIES_EN], ["es", PRIORITIES_ES]]) {
  const ok = buildGas();
  ok.api.approveCanSpam();
  post(ok.api, basePayload({ lang, priorities: prios }));
  const broken = buildGas();
  broken.api.approveCanSpam();
  broken.api.breakHtmlBuilder();
  post(broken.api, basePayload({ lang, priorities: prios }));
  check(`[${lang}] success text part === fallback body (no drift, and real)`,
    ok.sent.length === 1 && broken.sent.length === 1
    && ok.sent[0].body.length > 200
    && ok.sent[0].body === broken.sent[0].body);
}

// ===========================================================================
// 3. HOSTILITY
// ===========================================================================
section("hostile priorities input");
for (const [label, bad] of [
  ["a string", "not an array"], ["a number", 7], ["an object", { 0: { name: "x" } }],
  ["null", null], ["absent", undefined],
]) {
  const g = buildGas();
  g.api.approveCanSpam();
  const payload = basePayload();
  if (bad === undefined) delete payload.priorities; else payload.priorities = bad;
  const res = post(g.api, payload);
  check(`priorities as ${label}: send still succeeds`, res.success === true);
  check(`priorities as ${label}: email sent, section cleanly absent — no header, no orphan label`,
    g.sent.length === 1
    && !(g.sent[0].opts.htmlBody || "").includes("WHAT WE WILL TEST TOGETHER")
    && !g.sent[0].body.includes("What we will test together:"));
}
{
  const g = buildGas();
  g.api.approveCanSpam();
  const hundred = Array.from({ length: 100 }, (_, i) => ({
    name: "Priority " + i, reason: "r" + i, test: "t" + i }));
  post(g.api, basePayload({ priorities: hundred }));
  const htmlBody = g.sent[0].opts.htmlBody;
  check("a 100-entry array is capped at 3",
    htmlBody.includes("Priority 2") && !htmlBody.includes("Priority 3")
    && !htmlBody.includes("Priority 99"));
  check("...in the text part too",
    g.sent[0].body.includes("Priority 2") && !g.sent[0].body.includes("Priority 3"));
}
{
  const g = buildGas();
  g.api.approveCanSpam();
  post(g.api, basePayload({ priorities: ["str", 7, null, []] }));
  check("non-object entries survive as skipped blanks, never a throw",
    g.sent.length === 1
    && !(g.sent[0].opts.htmlBody || "").includes("WHAT WE WILL TEST TOGETHER"));
}
{
  const g = buildGas();
  g.api.approveCanSpam();
  let seenSafe = null;
  g.setSafeDataSink((d) => { seenSafe = d; });
  const huge = "x".repeat(100000);
  post(g.api, basePayload({ priorities: [{ name: huge, reason: huge, test: huge }] }));
  check("an email was actually sent", g.sent.length === 1);
  // The EXACT labeled bounds, asserted on the object the builder received —
  // an audit showed the old "< 30000 chars total" passed with the bounds
  // raised 25x.
  check("name is truncated to exactly 200", seenSafe.priorities[0].name.length === 200);
  check("reason is truncated to exactly 400", seenSafe.priorities[0].reason.length === 400);
  check("test is truncated to exactly 400", seenSafe.priorities[0].test.length === 400);
}
{
  const g = buildGas();
  g.api.approveCanSpam();
  let seenSafe = null;
  g.setSafeDataSink((d) => { seenSafe = d; });
  post(g.api, basePayload({ priorities: [{
    name: "Real name", reason: "Real reason", test: "Real test",
    score: 96, kind: "need", rank: 1, mattressId: "g1", answers: { q: "a" } }] }));
  check("extra sub-fields (score/kind/rank/id/answers) are dropped by the projection",
    JSON.stringify(Object.keys(seenSafe.priorities[0]).sort())
    === JSON.stringify(["name", "reason", "test"]));
  check("...and never reach the HTML",
    !(g.sent[0].opts.htmlBody || "").match(/96|mattressId|g1/));
}
for (const field of ["name", "reason", "test"]) {
  const g = buildGas();
  g.api.approveCanSpam();
  const entry = { name: "Safe", reason: "Safe", test: "Safe" };
  entry[field] = '<script>alert(1)</script>"><img src=x onerror=y>';
  post(g.api, basePayload({ priorities: [entry, PRIORITIES_EN[1]] }));
  const htmlBody = g.sent[0].opts.htmlBody || "";
  check(`hostile ${field}: escaped in HTML — no live tag`,
    g.sent.length === 1 && !htmlBody.includes("<script>")
    && !htmlBody.includes("<img src=x")
    && htmlBody.includes("&lt;script&gt;"));
}
{
  // Hostile strings must not arrive as markup in the PLAIN body either.
  const g = buildGas();
  g.api.approveCanSpam();
  g.api.breakHtmlBuilder();
  post(g.api, basePayload({ priorities: [{
    name: "<b>Bold name</b>", reason: "<script>x</script>", test: "ok" }] }));
  check("plain-text fell back for real", !g.sent[0].opts.htmlBody);
  const afterHeader = g.sent[0].body.split("What we will test together:")[1] || "";
  const prioritySlice = afterHeader.split("\n\n")[0];
  check("the plain body still carries the priorities section", afterHeader.length > 0);
  check("angle brackets are stripped from the plain-text priority lines",
    !/[<>]/.test(prioritySlice) && prioritySlice.includes("Bold name"));
}
{
  // ...and the SUCCESS path's text part gets the same treatment — it now
  // carries the full plain body, so it needs its own hostile-markup pin.
  const g = buildGas();
  g.api.approveCanSpam();
  post(g.api, basePayload({ priorities: [{
    name: "<b>Bold name</b>", reason: "<script>x</script>", test: "ok" }] }));
  check("the email sent via the normal HTML path", "htmlBody" in g.sent[0].opts);
  const afterHeader = g.sent[0].body.split("What we will test together:")[1] || "";
  const prioritySlice = afterHeader.split("\n\n")[0];
  check("the success text part still carries the priorities section", afterHeader.length > 0);
  check("angle brackets are stripped from the success text part's priority lines",
    !/[<>]/.test(prioritySlice) && prioritySlice.includes("Bold name"));
}
{
  // A hostile discount ([] coerces to '' through _safeText, dodging doPost's
  // `|| 5`) must resolve to the same default in BOTH MIME parts. Before the
  // shared-body fix the HTML part said "5% OFF" while the plain part said
  // "% OFF" — buildPlainBody re-applies the builder-side default exactly as
  // buildSimpleHtml always has, and this pins that agreement.
  const g = buildGas();
  g.api.approveCanSpam();
  post(g.api, basePayload({ dreamCode: "DREAM123", discount: [] }));
  check("hostile discount: text and HTML parts agree on the 5% default",
    g.sent.length === 1
    && g.sent[0].body.includes("Your 30-day Savings Pass: 5% OFF")
    && g.sent[0].opts.htmlBody.includes("5% OFF"));
}
{
  const g = buildGas();
  g.api.approveCanSpam();
  post(g.api, basePayload({ priorities: [
    { name: "Only a name" },
    { reason: "no name at all", test: "t" },
    PRIORITIES_EN[0],
  ] }));
  const htmlBody = g.sent[0].opts.htmlBody || "";
  check("an entry with only a name still renders; a nameless entry is dropped",
    htmlBody.includes("Only a name") && !htmlBody.includes("no name at all")
    && htmlBody.includes(PRIORITIES_EN[0].name));
}

// ===========================================================================
// 4. EXISTING BEHAVIOR UNTOUCHED
// ===========================================================================
section("existing doPost behavior untouched");
{
  const g = buildGas();
  g.api.approveCanSpam();
  const res = post(g.api, basePayload({ email: "not-an-email" }));
  check("invalid recipient still refuses with invalid_email",
    res.error === "invalid_email" && g.sent.length === 0);
}
{
  const g = buildGas();
  g.api.approveCanSpam();
  const res = post(g.api, basePayload({ priorities: PRIORITIES_EN }));
  check("no new error code was introduced (success carries none)",
    res.success === true && !("error" in res));
  check("the error codes Code.gs emits are still the classified three",
    JSON.stringify([...new Set((gs.match(/error: '([a-z_]+)'/g) || [])
      .map((m) => m.match(/'([a-z_]+)'/)[1]))].sort())
    === JSON.stringify(["canspam_not_configured", "invalid_email", "send_failed"]));
}

// ===========================================================================
console.log(`\nEmail priorities check: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
