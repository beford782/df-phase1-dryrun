// Session asynchrony + diagnostic-privacy boundary — behavioural regression.
//
// Gate 1B amendment. Two defects this pins, both present on the pre-amendment
// branch (43b25ed) and both reproducible below:
//
//  1. POST-WIPE ASYNCHRONOUS MUTATION. sendResults() completed through a RAW
//     setTimeout(showSuccess, 1200) in preview mode - the deployment's only
//     path, since gasUrl is blank - and through unguarded fetch continuations
//     on the live path. Either could run AFTER the authoritative wipe and
//     rewrite the send button, capture view and confirmation over the NEXT
//     customer's session.
//
//  2. DIAGNOSTIC PRIVACY. analytics.log() printed and retained its raw data
//     argument, so the customer's name/email/phone (email_previewed) and every
//     raw quiz answer (session_summary) reached a console anyone can open on a
//     showroom tablet, and stayed in analytics.events. Preview mode separately
//     printed the entire email payload. Console history is NOT something the
//     session wipe can retract, so the fix has to be that the data is never
//     written - console.clear() would be theatre.
//
// Everything here EXECUTES source extracted verbatim from index.html against a
// DOM shim, a fake clock and deferred promises. Nothing is reimplemented.
//
// Run: node tests/session_async_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const kioskDoc = readFileSync(join(root, "docs", "kiosk-device-hardening.md"), "utf8");

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}`); }
}
function section(name) { console.log(`\n-- ${name} --`); }
function grab(re, what) {
  const m = html.match(re);
  check(`extracted ${what}`, !!m);
  return m ? m[0] : "";
}

// Several static sweeps below have to look at CODE rather than prose, and
// comment removal has to be literal-aware for the same reason argument parsing
// is — with higher stakes. index.html contains `u.replace(/^\.?\/*/, '')`: a
// REGEX whose body holds the two characters `/*`. A plain
// `/\/\*[\s\S]*?\*\//g` strip reads that as a comment opener and deletes
// everything from it to the next `*/` ANYWHERE later in the file, taking most
// of the analytics.log() and localStorage call sites with it. That is the
// sweeps failing OPEN: an unlisted event, or a customer value written to
// storage, inside the deleted span is discovered by nothing. The file happened
// to contain no later `*/`, so the bug sat dormant until a stylesheet comment
// was added below that line and supplied one.
//
// Misdetection is not harmless by itself. A `/` wrongly read as a regex scans
// to the next `/` on the line, and if that lands past a string's opening quote
// the scanner is then OUTSIDE a string it is really inside — where a `//` or
// `/*` in ordinary text becomes a comment opener and its branch deletes. The
// two mitigations below bound that, and the caller-side assertion in the
// "comment stripping" section proves no deletion ever swallowed a call site in
// THIS file rather than assuming the heuristic is sound.
function stripComments(source, deleted = []) {
  // A `/` opens a regex only where a value may begin.
  //
  // `<` and `>` are deliberately NOT here, though they are legal regex-start
  // contexts in principle. This function is run over an 18,000-line HTML file:
  // with `<` included, every `</tag>` starts a regex scan that runs to the next
  // `/` on the line, and one landing on an attribute's closing quote
  // (`title="z/* q"`) desyncs the scanner and deletes from there. `a < /re/`
  // does not occur in real code; `</div>` occurs on nearly every line.
  //
  // `)` and `}` are absent for the original reason: they are ambiguous, and
  // reading them as division keeps the fallback on the emitting side.
  const REGEX_OK_AFTER = /[({[,;:=!&|?+\-*%~^]/;
  const REGEX_OK_KEYWORD = /(?:^|[^A-Za-z0-9_$])(?:return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/;
  let out = "";
  let i = 0;
  let prev = "";        // last significant character emitted
  let prevWord = "";    // ...and the identifier it belongs to, for keywords
  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];
    if (c === "/" && d === "/") {
      const from = i;
      while (i < source.length && source[i] !== "\n") i++;
      deleted.push(source.slice(from, i));
      continue;
    }
    if (c === "/" && d === "*") {
      const end = source.indexOf("*/", i + 2);
      // An unterminated opener is EMITTED, never deleted to end of file. If the
      // scanner has desynced, "delete everything from here on" is the single
      // most destructive thing it could do — and it is exactly the fail-open
      // this function replaced, reached from the other direction.
      if (end === -1) { out += source.slice(i); break; }
      deleted.push(source.slice(i, end + 2));
      i = end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === "\\") { j += 2; continue; }
        if (source[j] === c) { j++; break; }
        j++;
      }
      out += source.slice(i, j);
      prev = c; prevWord = ""; i = j;
      continue;
    }
    if (c === "/" && (prev === "" || REGEX_OK_AFTER.test(prev) || REGEX_OK_KEYWORD.test(prevWord))) {
      let j = i + 1, inClass = false;
      while (j < source.length) {
        const e = source[j];
        if (e === "\\") { j += 2; continue; }
        if (e === "\n") break;            // not a regex after all — emit as-is
        if (e === "[") inClass = true;
        else if (e === "]") inClass = false;
        else if (e === "/" && !inClass) { j++; break; }
        j++;
      }
      out += source.slice(i, j);
      prev = "/"; prevWord = ""; i = j;
      continue;
    }
    out += c;
    if (!/\s/.test(c)) {
      prev = c;
      prevWord = /[A-Za-z0-9_$]/.test(c) ? prevWord + c : "";
    }
    i++;
  }
  return out;
}

const SENTINEL_EMAIL = "prior.customer@example.invalid";
const SENTINEL_NAME = "PRIOR-CUSTOMER-NAME-x7";
const SENTINEL_PHONE = "956-555-0199";
const SENTINEL_ANSWER = "PRIOR-ANSWER-q3";

// ===========================================================================
// 1. OWNED INVENTORY OF RAW DELAYED WORK  (the static guard)
// ===========================================================================
section("owned inventory: every raw setTimeout / setInterval / rAF is classified");

// The complete classification of asynchronous work in index.html. Anything
// scheduled through sessionTimeout() / sessionFrame() / sessionBound() is
// session-owned and needs no entry. Everything ELSE must appear here with a
// class and a reason, or this suite fails.
//
//   A = session/customer-bearing  -> must be cancelled AND epoch-guarded
//   B = device/application lifecycle -> safe across sessions
//   C = unreachable during a customer session -> proven, not assumed
//
// Keyed on line TEXT rather than line number so it survives edits elsewhere.
const RAW_ALLOWLIST = [
  { cls: "A", count: 1, match: "_finInterestAnnounceTimer = setTimeout(",
    why: "cancelled by name in cancelFinInterestPending() + clearFinInterestAnnouncement(), both called by the wipe" },
  { cls: "A", count: 1, match: "_drawerCloseTimer = setTimeout(",
    why: "cleared by name in closeMattressDrawer(), which the wipe calls first with {immediate:true}" },
  { cls: "B", count: 1, match: "__STARFIELD_RAF__",
    why: "one-time boot decoration; runs before any session and mutates only the starfield" },
  { cls: "B", count: 1, match: "_idleTicker = setInterval(idleReconcile,",
    why: "the idle controller's own ticker; lifecycle infrastructure, cleared and re-armed by idleRestart()" },
  { cls: "B", count: 1, match: "var dataDeadlineTimer = setTimeout(",
    why: "the data/dictionary fetch deadline; cleared by name the moment the request settles, carries no session state, and is deliberately NOT a sessionTimeout — clearSessionTimers() would disarm it during a wipe and a black-holed request would strand the loader's in-flight latch again" },
  { cls: "B", count: 1, match: "var id = setTimeout(function() {",
    why: "the sessionTimeout() implementation itself" },
  { cls: "B", count: 1, match: "var id = requestAnimationFrame(function() {",
    why: "the sessionFrame() implementation itself" },
  { cls: "C", count: 8, match: "__LEGACY_ACCESSORIES__",
    why: "staggered reveal inside window._legacyShowAccessories, which has NO call site (asserted below)" },
];

// Locate the dead legacy renderer so its raw timers can be attributed to it.
const legacyStart = html.indexOf("window._legacyShowAccessories = function() {");
check("the legacy accessories renderer was located", legacyStart !== -1);
const legacyEnd = html.indexOf("\r\n    function scoreAccessoriesFromAnswers", legacyStart) !== -1
  ? html.indexOf("\r\n    window.showAccessories = function", legacyStart)
  : html.length;
const legacyBody = legacyStart === -1 ? "" : html.slice(legacyStart, legacyEnd > 0 ? legacyEnd : html.length);

// Proof for class C: unreachable because nothing calls it.
{
  const refs = (html.match(/_legacyShowAccessories/g) || []).length;
  check(`_legacyShowAccessories is defined once and never called (${refs} reference${refs === 1 ? "" : "s"})`,
    refs === 1);
}

// Enumerate every RAW delayed call and attribute each to an allowlist entry.
{
  const lines = html.split(/\r?\n/);
  const rawRe = /(?<![A-Za-z_$.])(setTimeout|setInterval|requestAnimationFrame)\s*\(/;
  const raw = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines whose only occurrence is inside sessionTimeout( / sessionFrame(
    const stripped = line.replace(/session(Timeout|Frame)\s*\(/g, "");
    if (rawRe.test(stripped)) {
      // Context, not a byte offset: index.html is CRLF, so a character offset
      // accumulated from split("\n") lengths drifts by one per line.
      raw.push({ n: i + 1, text: line.trim(), context: lines.slice(i, i + 8).join(" ") });
    }
  }
  check(`found raw delayed calls to classify (${raw.length})`, raw.length > 0);

  const unattributed = [];
  const counts = {};
  for (const r of raw) {
    const inLegacy = legacyBody.includes(r.text) && r.text.includes("setTimeout(");
    // Longest match first: "var id = requestAnimationFrame(" must win over the
    // bare "requestAnimationFrame(" it contains, or the two collide.
    const byLength = RAW_ALLOWLIST.filter((a) => !a.match.startsWith("__"))
      .sort((x, y) => y.match.length - x.match.length);
    let hit = byLength.find((a) => r.text.includes(a.match));
    if (!hit && inLegacy) hit = RAW_ALLOWLIST.find((a) => a.match === "__LEGACY_ACCESSORIES__");
    if (!hit && r.text === "requestAnimationFrame(function() {" && r.context.includes("starfield")) {
      hit = RAW_ALLOWLIST.find((a) => a.match === "__STARFIELD_RAF__");
    }
    if (!hit) unattributed.push(`line ${r.n}: ${r.text.slice(0, 90)}`);
    else counts[hit.match] = (counts[hit.match] || 0) + 1;
  }
  check(`every raw delayed call is classified in the owned inventory${unattributed.length ? " — UNCLASSIFIED: " + unattributed.join(" | ") : ""}`,
    unattributed.length === 0);
  for (const a of RAW_ALLOWLIST) {
    check(`[${a.cls}] ${a.match.slice(0, 52)} — expected ${a.count}, found ${counts[a.match] || 0}`,
      (counts[a.match] || 0) === a.count);
  }
}

check("sessionFrame() exists so animation frames can be session-owned",
  /function sessionFrame\(fn\) \{/.test(html));
check("sessionBound() exists so promise continuations validate at callback time",
  /function sessionBound\(fn\) \{/.test(html));
check("the wipe cancels registered frames as well as timers",
  /_sessionFrames\.forEach\(function\(id\) \{ cancelAnimationFrame\(id\); \}\);/.test(html));
check("the epoch is bumped AFTER both registries are drained",
  /_sessionFrames = \[\];[\s\S]{0,220}_sessionEpoch\+\+;/.test(html));

// ===========================================================================
// 2. EXECUTE THE REAL SEND-COMPLETION PATH
// ===========================================================================
// Wrapped so a tree WITHOUT the amendment (the pre-amendment HEAD) reports a
// legible failure for every behavioural contract instead of dying on the first
// missing symbol. A crash is a failure too, but it hides how much is unmet.
try {
const guardsSrc = grab(/var _sessionEpoch = 1;[\s\S]*?function clearSessionTimers\(\) \{[\s\S]*?\n    \}/,
  "the session timer/frame/bound guards");
// The real failure classifiers, executed rather than stubbed.
const classifiersSrc = grab(
  /var EMAIL_FAILURE_CODES = \[[\s\S]*?function transportFailureCode\(err\) \{[\s\S]*?\n    \}/,
  "the send-failure classifiers");
const showSuccessSrc = grab(/      function showSuccess\(\) \{[\s\S]*?\n      \}/, "showSuccess()");
const showErrorSrc = grab(/      function showError\(msg\) \{[\s\S]*?\n      \}/, "showError()");
// index.html is CRLF, so the terminator must tolerate the \r before each \n.
const sendBlockSrc = grab(/      if \(gasUrl && !scenarioBlocksEmail\) \{[\s\S]*?\r?\n      \}\r?\n    \};/,
  "the send-completion block (live fetch + preview)");

function makeEl(id) {
  const cls = new Set();
  return {
    id, style: {}, textContent: "", innerHTML: "", value: "", disabled: false, hidden: false,
    classList: {
      add: (...c) => c.forEach((x) => cls.add(x)),
      remove: (...c) => c.forEach((x) => cls.delete(x)),
      contains: (c) => cls.has(c),
    },
    scrollIntoView() {},
    setAttribute() {}, removeAttribute() {},
  };
}

// Fake clock shared by the timer tests.
let NOW = 5_000_000, seq = 1;
let timeouts = new Map(), frames = new Map();
const clock = {
  setTimeout(fn, ms) { const id = seq++; timeouts.set(id, { fn, at: NOW + (ms || 0) }); return id; },
  clearTimeout(id) { timeouts.delete(id); },
  requestAnimationFrame(fn) { const id = seq++; frames.set(id, { fn, at: NOW + 16 }); return id; },
  cancelAnimationFrame(id) { frames.delete(id); },
  advance(ms) {
    NOW += ms;
    for (const [id, t] of [...timeouts]) if (t.at <= NOW) { timeouts.delete(id); t.fn(); }
    for (const [id, f] of [...frames]) if (f.at <= NOW) { frames.delete(id); f.fn(); }
  },
  // The real hazard: the event loop has ALREADY handed the callback to the
  // task queue, so clearTimeout can no longer reach it. Snapshot must be taken
  // BEFORE the wipe — taking it after would find an empty map and the test
  // would pass without exercising anything.
  snapshot() { return [...timeouts.values(), ...frames.values()]; },
  fireSnapshot(snap) { snap.forEach((t) => t.fn()); },
  pending() { return timeouts.size + frames.size; },
};

// A fetch whose promise we resolve/reject by hand, after the wipe.
let deferred = null;
function deferredFetch() {
  return new Promise((resolve, reject) => { deferred = { resolve, reject }; });
}

const consoleLines = [];
const fakeConsole = {
  log: (...a) => consoleLines.push(["log", ...a]),
  warn: (...a) => consoleLines.push(["warn", ...a]),
  error: (...a) => consoleLines.push(["error", ...a]),
};

function buildSendHarness(opts) {
  const els = {
    emailSendBtn: makeEl("emailSendBtn"),
    emailCaptureView: makeEl("emailCaptureView"),
    emailConfirmation: makeEl("emailConfirmation"),
    emailError: makeEl("emailError"),
  };
  const doc = { getElementById: (id) => els[id] || makeEl(id) };
  const payload = {
    name: SENTINEL_NAME, email: SENTINEL_EMAIL, phone: SENTINEL_PHONE,
    sleepProfile: "The Back Saver", allMatches: [{ name: "m1" }, { name: "m2" }],
    accessories: [{ id: "a1" }], lang: "en",
  };
  const fn = new Function(
    "document", "console", "setTimeout", "clearTimeout", "requestAnimationFrame",
    "cancelAnimationFrame", "fetch", "gasUrl", "scenarioBlocksEmail", "isEmailPreview",
    "currentLang", "payload", "sendBtn", "errorEl", "confirmation", "out",
    `
    ${guardsSrc}
    ${classifiersSrc}
    ${showSuccessSrc}
    ${showErrorSrc}
    out.run = function() {
      ${sendBlockSrc.replace(/\n    \};$/, "")}
    };
    out.wipe = clearSessionTimers;
    out.epoch = function() { return _sessionEpoch; };
    out.pendingRegistered = function() { return _sessionTimers.length + _sessionFrames.length; };
    out.sessionTimeout = sessionTimeout;
    out.sessionFrame = sessionFrame;
    out.sessionBound = sessionBound;
    `
  );
  const out = {};
  fn(doc, fakeConsole, clock.setTimeout, clock.clearTimeout, clock.requestAnimationFrame,
    clock.cancelAnimationFrame, opts.fetch || deferredFetch, opts.gasUrl || "", false,
    !opts.gasUrl, "en", payload, els.emailSendBtn, els.emailError, els.emailConfirmation, out);
  return { out, els };
}

function sendState(els) {
  return {
    btnText: els.emailSendBtn.textContent,
    sent: els.emailSendBtn.classList.contains("sent"),
    sending: els.emailSendBtn.classList.contains("sending"),
    captureHidden: els.emailCaptureView.style.display === "none",
    confirmVisible: els.emailConfirmation.classList.contains("visible"),
    error: els.emailError.textContent,
  };
}
function untouched(s) {
  return !s.sent && !s.sending && !s.captureHidden && !s.confirmVisible && s.error === "" && s.btnText === "";
}

section("preview completion after the wipe (the reported reproduction)");
{
  const { out, els } = buildSendHarness({ gasUrl: "" });
  out.run();
  check("preview scheduled its completion through the session registry",
    out.pendingRegistered() === 1);
  const before = out.epoch();
  const clockBefore = clock.pending();
  out.wipe();                              // authoritative wipe fires first
  check("the wipe drained the registry", out.pendingRegistered() === 0);
  // Both halves of the rule, separately. Forgetting the ids without cancelling
  // them would leave the timer armed in the browser and pass the check above.
  check("REGRESSION: the underlying timer was really cancelled, not just forgotten",
    clockBefore > 0 && clock.pending() === 0);
  check("the wipe rotated the epoch", out.epoch() > before);
  clock.advance(2000);                     // past the 1200ms deadline
  const s = sendState(els);
  check("REGRESSION: showSuccess() cannot run after the wipe", untouched(s));
  check("  send button not rewritten", s.btnText === "" && !s.sent);
  check("  capture view not hidden", !s.captureHidden);
  check("  confirmation not revealed", !s.confirmVisible);
}

section("preview completion in an UNINTERRUPTED session still works");
{
  const { out, els } = buildSendHarness({ gasUrl: "" });
  out.run();
  clock.advance(2000);
  const s = sendState(els);
  check("ordinary same-session completion is unaffected",
    s.sent && s.captureHidden && s.confirmVisible);
}

section("preview completion belonging to a FRESH session still works");
{
  const { out, els } = buildSendHarness({ gasUrl: "" });
  out.wipe();                              // previous customer cleared first
  out.run();                               // new customer sends
  clock.advance(2000);
  const s = sendState(els);
  check("a fresh session's own callback is not rejected by the epoch guard",
    s.sent && s.captureHidden && s.confirmVisible);
}

section("already-dispatched callback (epoch guard, not cancellation)");
{
  const { out, els } = buildSendHarness({ gasUrl: "" });
  out.run();
  // Snapshot BEFORE the wipe: this models a callback the event loop has
  // already dispatched, which clearTimeout can no longer reach. Only the
  // callback-time epoch check can stop it.
  const dispatched = clock.snapshot();
  check("there is a dispatched callback to test with", dispatched.length > 0);
  out.wipe();
  clock.fireSnapshot(dispatched);          // run it anyway, as the browser would
  check("REGRESSION: a callback already dispatched before the wipe is rejected",
    untouched(sendState(els)));
}

section("live path: continuations settling AFTER the wipe");
const liveCases = [
  { name: "success", settle: (d) => d.resolve({ ok: true, json: async () => ({ success: true }) }) },
  { name: "server-declared failure", settle: (d) => d.resolve({ ok: true, json: async () => ({ success: false, error: "quota" }) }) },
  { name: "malformed response", settle: (d) => d.resolve({ ok: true, json: async () => null }) },
  { name: "non-ok HTTP", settle: (d) => d.resolve({ ok: false, status: 503, json: async () => ({}) }) },
  { name: "network rejection", settle: (d) => d.reject(new Error("network down")) },
];
for (const c of liveCases) {
  const { out, els } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
  out.run();
  out.wipe();                              // wipe while the request is in flight
  c.settle(deferred);
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  const s = sendState(els);
  check(`REGRESSION: ${c.name} after the wipe mutates nothing`, untouched(s));
}

section("live path: continuations settling INSIDE their own session still work");
{
  const { out, els } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
  out.run();
  deferred.resolve({ ok: true, json: async () => ({ success: true }) });
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  const s = sendState(els);
  check("same-session success still completes the send", s.sent && s.confirmVisible);
}
{
  const { out, els } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
  out.run();
  deferred.resolve({ ok: true, json: async () => ({ success: false, error: "quota" }) });
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  check("same-session server failure still surfaces an error to the customer",
    sendState(els).error.length > 0);
}

section("every send continuation is bound, structurally");
{
  // The first continuation only parses JSON and cannot mutate the page, so
  // unbinding it is not observable behaviourally — which is exactly why it
  // needs a structural assertion. All three are bound, uniformly, so a
  // reviewer removing any one of them is caught.
  const bound = (sendBlockSrc.match(/\.(then|catch)\(sessionBound\(/g) || []).length;
  check(`all three fetch continuations are sessionBound (found ${bound})`, bound === 3);
  check("no continuation is left unbound",
    !/\.(then|catch)\(\s*function/.test(sendBlockSrc));
}

section("error diagnostics carry no server- or exception-supplied text");
{
  // A GAS endpoint, a proxy, or a malformed body is outside our control, and
  // the request we just sent it contained the customer's name, email and
  // phone. Anything echoed back must not reach a log line.
  const errCases = [
    { name: "server-declared error string",
      settle: (d) => d.resolve({ ok: true, json: async () => ({ success: false, error: SENTINEL_EMAIL }) }) },
    { name: "server error containing a name",
      settle: (d) => d.resolve({ ok: true, json: async () => ({ success: false, error: "rejected for " + SENTINEL_NAME }) }) },
    { name: "rejection whose Error.message holds a sentinel",
      settle: (d) => d.reject(Object.assign(new Error("POST /gas?who=" + SENTINEL_EMAIL), { name: "TypeError" })) },
    { name: "malformed response (JSON parse throws with body text)",
      settle: (d) => d.resolve({ ok: true, json: async () => {
        throw Object.assign(new SyntaxError("Unexpected token in " + SENTINEL_PHONE), { name: "SyntaxError" }); } }) },
    { name: "non-ok HTTP",
      settle: (d) => d.resolve({ ok: false, status: 503, json: async () => ({}) }) },
  ];
  for (const c of errCases) {
    // (a) SAME session: the customer must still get a localized generic error.
    const { out, els } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
    consoleLines.length = 0;
    out.run();
    c.settle(deferred);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const printed = JSON.stringify(consoleLines);
    const leaked = [SENTINEL_EMAIL, SENTINEL_NAME, SENTINEL_PHONE].filter((s) => printed.includes(s));
    check(`REGRESSION: ${c.name} — no sentinel in console${leaked.length ? " — LEAKED " + leaked.join(",") : ""}`,
      leaked.length === 0);
    check(`  ${c.name} — customer still sees a localized generic error`,
      els.emailError.textContent.length > 0 && !els.emailError.textContent.includes(SENTINEL_EMAIL));
    check(`  ${c.name} — a classification code was logged`,
      /send failed/.test(printed) && /(unclassified|malformed_response|network|http_\d{3}|quota|auth|rate_limit|invalid_recipient|server_error|disabled)/.test(printed));

    // (b) POST-WIPE: the same settle must mutate nothing and still not leak.
    const b = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
    consoleLines.length = 0;
    b.out.run();
    b.out.wipe();
    c.settle(deferred);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const printed2 = JSON.stringify(consoleLines);
    check(`  ${c.name} — after the wipe: nothing mutated`, untouched(sendState(b.els)));
    check(`  ${c.name} — after the wipe: no sentinel in console`,
      ![SENTINEL_EMAIL, SENTINEL_NAME, SENTINEL_PHONE].some((s) => printed2.includes(s)));
  }
  // A classified server code is still useful signal (see the Code.gs
  // cross-check below for the authoritative set).
  {
    const { out } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
    consoleLines.length = 0;
    out.run();
    deferred.resolve({ ok: true, json: async () => ({ success: false, error: "send_failed" }) });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    check("a classified server failure code survives as signal",
      JSON.stringify(consoleLines).includes("send_failed"));
  }
}

section("error diagnostics: every code Code.gs emits is classified");
{
  // Cross-file drift guard. The first version of EMAIL_FAILURE_CODES was a
  // guess at what a mail service might return and matched NONE of the codes
  // this repo's own backend emits, so every real failure would have logged as
  // 'unclassified' once gasUrl went live. Read Code.gs as the source of truth
  // rather than restating the list here, so adding a code there without
  // classifying it here fails.
  const codeGs = readFileSync(join(root, "Code.gs"), "utf8");
  const emitted = [...new Set(
    (codeGs.match(/success:\s*false,\s*error:\s*'([a-z_]+)'/g) || [])
      .map((m) => m.match(/error:\s*'([a-z_]+)'/)[1]))].sort();
  check(`Code.gs emits a non-empty set of failure codes (${emitted.join(", ")})`,
    emitted.length > 0);

  const declared = (html.match(/var EMAIL_FAILURE_CODES = \[([\s\S]*?)\];/) || [, ""])[1];
  const declaredCodes = (declared.match(/'([a-z_]+)'/g) || []).map((s) => s.replace(/'/g, ""));
  const missing = emitted.filter((c) => !declaredCodes.includes(c));
  check(`REGRESSION: every code Code.gs emits is classified${missing.length ? " — UNCLASSIFIED: " + missing.join(", ") : ""}`,
    missing.length === 0);
  const speculative = declaredCodes.filter((c) => !emitted.includes(c));
  check(`the set contains no speculative codes the backend never sends${speculative.length ? " — EXTRA: " + speculative.join(", ") : ""}`,
    speculative.length === 0);

  // Behavioural: each real code must survive as signal, same-session, with no
  // sentinel anywhere near it.
  for (const code of emitted) {
    const { out, els } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
    consoleLines.length = 0;
    out.run();
    deferred.resolve({ ok: true, json: async () => ({ success: false, error: code }) });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const printed = JSON.stringify(consoleLines);
    check(`  "${code}" is logged as itself, not as unclassified`,
      printed.includes(code) && !printed.includes("unclassified"));
    check(`  "${code}" still shows the customer a localized generic error`,
      els.emailError.textContent.length > 0);
    check(`  "${code}" leaks no contact sentinel`,
      ![SENTINEL_EMAIL, SENTINEL_NAME, SENTINEL_PHONE].some((s) => printed.includes(s)));

    // ...and after a wipe it must still mutate nothing and still not leak.
    const b = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
    consoleLines.length = 0;
    b.out.run();
    b.out.wipe();
    deferred.resolve({ ok: true, json: async () => ({ success: false, error: code }) });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    check(`  "${code}" after the wipe: nothing mutated`, untouched(sendState(b.els)));
  }

  // The closed set is still closed: anything else is reduced, including a
  // hostile string dressed up to look like one of ours.
  for (const bogus of [SENTINEL_EMAIL, "invalid_email_" + SENTINEL_NAME,
                       "send_failed for " + SENTINEL_PHONE, "quota", ""]) {
    const { out } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
    consoleLines.length = 0;
    out.run();
    deferred.resolve({ ok: true, json: async () => ({ success: false, error: bogus }) });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const printed = JSON.stringify(consoleLines);
    check(`unrecognised server code ${JSON.stringify(bogus.slice(0, 28))} -> unclassified, no echo`,
      printed.includes("unclassified")
      && ![SENTINEL_EMAIL, SENTINEL_NAME, SENTINEL_PHONE].some((s) => printed.includes(s)));
  }
}

section("error diagnostics: static sweep");
{
  check("the server's error string is never logged directly",
    !/console\.error\([^)]*\bmsg\b/.test(html));
  check("the Error object is never logged directly",
    !/console\.error\([^)]*,\s*err\s*\)/.test(html));
  check("failures are logged through a classifier",
    /emailFailureCode\(/.test(html) && /transportFailureCode\(/.test(html));
  check("the server code classifier validates against a closed set",
    /EMAIL_FAILURE_CODES\.indexOf\(raw\) !== -1/.test(html));
  check("the transport classifier validates its own thrown shape",
    /\/\^http_\\d\{3\}\$\/\.test\(msg\)/.test(html));
  check("no thrown Error embeds a customer value",
    !/throw new Error\([^)]*(payload|email|name|phone|answers)/i.test(html));
}

section("cancellation does not break the drawer");
{
  // The drawer's slide-out timer is deliberately NOT session-registered: it is
  // cleared by name inside closeMattressDrawer, which the wipe calls first.
  // Pin that it is still cleared that way, so the new registry cannot be
  // mistaken for the drawer's owner.
  const closeSrc = (html.match(/window\.closeMattressDrawer = function\([^)]*\) \{[\s\S]*?\n    \};/) || [""])[0];
  check("closeMattressDrawer still clears its own timer by name",
    /clearTimeout\(_drawerCloseTimer\)/.test(closeSrc));
  check("the drawer timer was NOT moved onto the session registry",
    !/sessionTimeout\(/.test(closeSrc));
  const wipeSrc = (html.match(/function resetSessionState\(opts\) \{[\s\S]*?\n    \}/) || [""])[0];
  check("the wipe still unwinds the drawer before draining timers",
    wipeSrc.indexOf("closeMattressDrawer(") < wipeSrc.indexOf("clearSessionTimers()"));
}

// ===========================================================================
// 3. DIAGNOSTIC PRIVACY — execute the real analytics object
// ===========================================================================
section("diagnostic privacy: the real analytics.log() redaction");

const analyticsSrc = grab(/const analytics = \{[\s\S]*?\n    \};/, "the analytics object");
const A = (() => {
  const fn = new Function("console", "Date", `${analyticsSrc}; return analytics;`);
  const FakeDate = function () {}; FakeDate.now = () => 1;
  return fn(fakeConsole, FakeDate);
})();

function runLogged(fn) { consoleLines.length = 0; fn(); return JSON.stringify(consoleLines); }

{
  // The exact payload the shipped call site passes (index.html email_previewed).
  const printed = runLogged(() =>
    A.log("email_previewed", { email: SENTINEL_EMAIL, name: SENTINEL_NAME, phone: SENTINEL_PHONE }));
  check("REGRESSION: email never reaches console", !printed.includes(SENTINEL_EMAIL));
  check("REGRESSION: name never reaches console", !printed.includes(SENTINEL_NAME));
  check("REGRESSION: phone never reaches console", !printed.includes(SENTINEL_PHONE));
  check("the event NAME is preserved", printed.includes("email_previewed"));
  const retained = JSON.stringify(A.events);
  check("REGRESSION: contact values are not retained in analytics.events",
    !retained.includes(SENTINEL_EMAIL) && !retained.includes(SENTINEL_NAME) && !retained.includes(SENTINEL_PHONE));
  check("the retained event still records that it happened", retained.includes("email_previewed"));
}
{
  const printed = runLogged(() =>
    A.log("session_summary", {
      sessionId: "s1", durationSec: 42,
      answers: { firmness: SENTINEL_ANSWER, sleep_position: SENTINEL_ANSWER },
      topPick: { id: "g7", name: SENTINEL_ANSWER },
      cardExpands: { g7: 2 },
    }));
  check("REGRESSION: raw quiz answers never reach console", !printed.includes(SENTINEL_ANSWER));
  check("approved aggregates survive (durationSec)", printed.includes("42"));
  check("the session identifier does NOT survive", !printed.includes("s1"));
  check("REGRESSION: raw answers are not retained in analytics.events",
    !JSON.stringify(A.events).includes(SENTINEL_ANSWER));
}
section("diagnostic privacy: an UNKNOWN event keeps only its name");
{
  // The defect a global key allowlist has: an approved KEY is not a licence to
  // print an arbitrary string. Every key that used to be globally approved is
  // tried here, each carrying a customer sentinel, on an event nobody declared.
  const APPROVED_KEYS = ["reason", "status", "step", "tier", "lang", "interest",
    "placement", "offerVersion", "sessionId", "count", "attempt", "saved",
    "itemsShown", "durationSec", "answeredCount", "entryStep", "layout"];
  const leaks = [];
  for (const k of APPROVED_KEYS) {
    const printed = runLogged(() => A.log("some_future_event", { [k]: SENTINEL_ANSWER }));
    const retained = JSON.stringify(A.events);
    if (printed.includes(SENTINEL_ANSWER)) leaks.push(`${k} (console)`);
    if (retained.includes(SENTINEL_ANSWER)) leaks.push(`${k} (retained)`);
  }
  check(`REGRESSION: no otherwise-approved key leaks on an unknown event${leaks.length ? " — LEAKED: " + leaks.join(", ") : ""}`,
    leaks.length === 0);
  // ...and the same keys carrying real contact values, all at once.
  const printed = runLogged(() => A.log("some_future_event", {
    reason: SENTINEL_EMAIL, status: SENTINEL_NAME, step: SENTINEL_PHONE,
    tier: SENTINEL_ANSWER, lang: SENTINEL_EMAIL, placement: SENTINEL_NAME,
    interest: SENTINEL_PHONE, offerVersion: SENTINEL_ANSWER, sessionId: SENTINEL_EMAIL,
  }));
  check("REGRESSION: contact values under approved keys never reach console",
    !printed.includes(SENTINEL_EMAIL) && !printed.includes(SENTINEL_NAME)
    && !printed.includes(SENTINEL_PHONE) && !printed.includes(SENTINEL_ANSWER));
  check("an unknown event still records that it happened", printed.includes("some_future_event"));
  check("...and reports how many fields it dropped, without naming them",
    /_dropped/.test(printed) && !printed.includes("offerVersion"));
}

section("diagnostic privacy: string values are enum-validated, not merely key-approved");
{
  const cases = [
    ["tier_view", "tier", "gold", true],
    ["tier_view", "tier", SENTINEL_ANSWER, false],
    ["sleep_system_step_viewed", "step", "pillow", true],
    ["sleep_system_step_viewed", "step", SENTINEL_ANSWER, false],
    ["sleep_system_decision_recorded", "status", "confirm", true],
    ["sleep_system_decision_recorded", "status", SENTINEL_ANSWER, false],
    ["finance_details_open", "placement", "drawer", true],
    ["finance_details_open", "placement", SENTINEL_ANSWER, false],
    ["finance_details_open", "lang", "es", true],
    ["finance_details_open", "lang", SENTINEL_ANSWER, false],
    ["session_ended", "reason", "idle_timeout", true],
    ["session_ended", "reason", SENTINEL_ANSWER, false],
  ];
  for (const [ev, key, val, shouldSurvive] of cases) {
    const printed = runLogged(() => A.log(ev, { [key]: val }));
    const survived = printed.includes(val);
    check(`${ev}.${key} = ${val === SENTINEL_ANSWER ? "<sentinel>" : `"${val}"`} ${shouldSurvive ? "survives" : "is redacted"}`,
      survived === shouldSurvive);
  }
}

section("diagnostic privacy: numeric and boolean fields are TYPE-validated too");
{
  // A field declared `num` or `bool` must not accept a string. Otherwise the
  // enum work is bypassed simply by choosing a differently-typed key.
  const typeCases = [
    ["session_ended", "durationSec", SENTINEL_ANSWER, false],
    ["session_ended", "durationSec", 42, true],
    ["session_ended", "answeredCount", SENTINEL_EMAIL, false],
    ["session_ended", "answeredCount", 11, true],
    ["session_ended", "resultsViewed", SENTINEL_NAME, false],
    ["session_ended", "resultsViewed", true, true],
    ["save_pick_toggle", "saved", SENTINEL_PHONE, false],
    ["save_pick_toggle", "saved", false, true],
    ["accessories_viewed", "itemsShown", SENTINEL_ANSWER, false],
    ["accessories_viewed", "itemsShown", 7, true],
  ];
  for (const [ev, key, val, shouldSurvive] of typeCases) {
    const printed = runLogged(() => A.log(ev, { [key]: val }));
    const survived = printed.includes(JSON.stringify(val));
    check(`${ev}.${key} = ${typeof val === "string" ? "<sentinel string>" : String(val)} ${shouldSurvive ? "survives" : "is redacted"}`,
      survived === shouldSurvive);
  }
  // NaN / Infinity are numbers but not diagnostics.
  check("non-finite numbers are redacted",
    !runLogged(() => A.log("session_ended", { durationSec: NaN })).includes("null"));
}

section("diagnostic privacy: identifiers and customer state are not diagnostics");
{
  const printed = runLogged(() => A.log("finance_details_open", {
    placement: "drawer", lang: "en", layout: "tablet",
    offerVersion: "2026-07", interest: "interested",
  }));
  check("financing interest is treated as customer state and redacted",
    !printed.includes("interested"));
  // Behavioural redaction alone would still pass if someone re-approved the
  // field but the enum were missing (or vice versa). Pin BOTH halves, so
  // either step back towards approving it is caught on its own.
  {
    const enumsSrc = (html.match(/ENUMS: \{[\s\S]*?\n      \},/) || [""])[0];
    const fieldsSrc = (html.match(/EVENT_FIELDS: \(function\(\) \{[\s\S]*?\n      \}\)\(\),/) || [""])[0];
    check("no `interest` enum is declared", !/\binterest:\s*\[/.test(enumsSrc));
    check("no event declares `interest` as an approved field",
      !/\binterest:\s*'/.test(fieldsSrc));
    check("no event declares `offerVersion` as an approved field",
      !/\bofferVersion:\s*'/.test(fieldsSrc));
    check("no event declares `sessionId` as an approved field",
      !/\bsessionId:\s*'/.test(fieldsSrc));
  }
  check("the placement/lang/layout diagnostics still survive",
    printed.includes("drawer") && printed.includes("tablet"));
  const s = runLogged(() => A.log("session_ended", { reason: "idle_timeout", sessionId: "abc123xyz" }));
  check("sessionId is not emitted as a diagnostic", !s.includes("abc123xyz"));
  check("the reason code still survives", s.includes("idle_timeout"));
  check("sessionSafeSummary no longer builds a sessionId at all",
    !/function sessionSafeSummary[\s\S]{0,900}?sessionId: analytics\.sessionId/.test(html));

  // REGRESSION: the identifier was also being SHIPPED. It rode in the GAS
  // payload — the one record that already carries name, email and phone — as a
  // stable per-visit correlator that Code.gs never read. Diagnostics and the
  // outbound payload are two different surfaces; suppressing it in one while
  // sending it in the other is not a privacy boundary.
  const payloadSrc = (html.match(/const payload = \{[\s\S]*?\n      \};/) || [""])[0];
  check("the GAS payload was located", payloadSrc.length > 0);
  check("REGRESSION: sessionId is not sent in the GAS payload",
    !/^\s*sessionId:/m.test(payloadSrc));
  check("no payload field carries the raw session identifier",
    !/analytics\.sessionId/.test(payloadSrc));
  // ...and Code.gs genuinely has no use for it, which is why removing it is safe.
  check("Code.gs makes no reference to sessionId",
    !/sessionId/.test(readFileSync(join(root, "Code.gs"), "utf8")));
  // The in-memory identifier must SURVIVE: the Savings Pass code is derived
  // from it, and that derived code is what legitimately travels.
  check("the in-memory session identifier is still used to seed the Savings Pass",
    /generateSavingsPass\(analytics\.sessionId\)/.test(html));
  check("the derived Pass code is still what travels in the payload",
    /dreamCode: savingsPass \? savingsPass\.code : ''/.test(payloadSrc));
}
{
  // Reactions and selections are named in the requirement explicitly.
  const printed = runLogged(() => {
    A.log("save_pick_toggle", { mattressId: SENTINEL_ANSWER, tier: "gold", saved: true });
    A.log("pillow_fit_recorded", { reaction: SENTINEL_ANSWER, candidateId: SENTINEL_ANSWER });
    A.log("adjustable_base_hero_shown", { snoring: true, reflux: false, backPain: true });
  });
  check("REGRESSION: saved selections never reach console", !printed.includes(SENTINEL_ANSWER));
  check("non-customer diagnostics survive (tier, saved)",
    printed.includes("gold") && printed.includes("true"));
  const health = JSON.stringify(consoleLines);
  check("REGRESSION: health-condition answers are redacted even as booleans",
    !/snoring/.test(health) && !/reflux/.test(health) && !/backPain/.test(health));
  check("...and the drop is accounted for", /_dropped/.test(health));
}
{
  check("analytics.events cannot grow a circular self-reference",
    (() => { try { JSON.stringify(A.events); return true; } catch (e) { return false; } })());
}

section("diagnostic privacy: the preview payload log");
{
  const { out, els } = buildSendHarness({ gasUrl: "" });
  consoleLines.length = 0;
  out.run();
  const printed = JSON.stringify(consoleLines);
  check("REGRESSION: the email payload is no longer printed",
    !printed.includes(SENTINEL_EMAIL) && !printed.includes(SENTINEL_NAME) && !printed.includes(SENTINEL_PHONE));
  check("...and the sleep profile with it", !printed.includes("The Back Saver"));
  check("a shape-only preview diagnostic remains", printed.includes("payload suppressed"));
  check("the shape carries counts, not contents", /"matches":2|matches.{0,4}2/.test(printed));
}

section("error diagnostics: classifying a code did not widen the event contract");
{
  // Guard against the obvious wrong fix: approving these tokens as diagnostic
  // VALUES somewhere in the analytics contract instead of in the send-failure
  // classifier. Unknown events must still keep only name + timestamp.
  const printed = runLogged(() =>
    A.log("some_future_event", { error: "invalid_email", reason: SENTINEL_EMAIL }));
  check("an unknown event still keeps only its name and timestamp",
    !printed.includes("invalid_email") && !printed.includes(SENTINEL_EMAIL));
  const fieldsSrc = (html.match(/EVENT_FIELDS: \(function\(\) \{[\s\S]*?\n      \}\)\(\),/) || [""])[0];
  check("no event declares an `error` field", !/\berror:\s*'/.test(fieldsSrc));
  const enumsSrc = (html.match(/ENUMS: \{[\s\S]*?\n      \},/) || [""])[0];
  check("the failure codes were not added to the analytics enums",
    !/invalid_email|canspam_not_configured|send_failed/.test(enumsSrc));
}

section("diagnostic privacy: static sweep of the shipped source");
{
  // No console call may pass a whole payload/summary/state object again.
  check("no console statement prints the email payload",
    !/console\.\w+\([^)]*JSON\.stringify\(payload/.test(html));
  check("no console statement prints analytics.getSummary()",
    !/console\.\w+\([^)]*getSummary\(\)/.test(html));
  check("analytics.log no longer prints its raw data argument",
    !/console\.log\('\[DreamFinder\]', event, data/.test(html));
  check("analytics.log prints the redacted copy",
    /console\.log\('\[DreamFinder\]', event, safe\);/.test(html));
  check("the drawer diagnostic no longer dumps the per-customer match map",
    !/console\.warn\('\[Drawer\] No data for', mattressId, window\._drawerData\)/.test(html));
  check("session_summary now logs the safe aggregate",
    /analytics\.log\('session_summary', sessionSafeSummary\(/.test(html));
  // Comments stripped: the source explains WHY console.clear() is not a fix,
  // and that rationale must not read as a use of it.
  const codeOnly = stripComments(html);
  check("console.clear() is NOT used as a privacy mechanism",
    !/console\.clear\s*\(/.test(codeOnly));
  // Storage: the CUSTOMER session must stay memory-only, but the app does
  // legitimately persist staff/device state (the salesperson selection and
  // roster). Assert the boundary rather than a blanket "nothing is stored",
  // which the tree would contradict — and which the hardening doc used to say.
  {
    // A window after each call site, not a paren-balanced match: the key is
    // built as 'dreamfinder.' + getHf2StoreKey() + '.deviceRsa', so anything
    // stopping at the first ')' truncates before the part that identifies it.
    const storageSites = [...codeOnly.matchAll(/localStorage\.\w+\(/g)]
      .map((m) => codeOnly.slice(m.index, m.index + 140));
    const offSpec = storageSites.filter((e) => !/deviceRsa|rsaList/.test(e));
    check(`localStorage is used only for staff/device state (${storageSites.length} call sites)${offSpec.length ? " — UNEXPECTED: " + offSpec.map((e) => e.slice(0, 70)).join(" | ") : ""}`,
      storageSites.length > 0 && offSpec.length === 0);
    check("no customer field is persisted",
      !storageSites.some((e) => /(email|phone|answers|picks|cart|reaction|firstName)/i.test(e)));
    check("sessionStorage / IndexedDB / cookies are unused",
      !/sessionStorage|indexedDB|document\.cookie/.test(codeOnly));
    check("the hardening doc names the persisted keys rather than denying storage",
      /deviceRsa/.test(kioskDoc) && /rsaList/.test(kioskDoc));
    check("the hardening doc no longer claims nothing is written to localStorage",
      !/writes nothing to `localStorage`/.test(kioskDoc));
    check("the hardening doc still states the customer session is memory-only",
      /No customer data is persisted/.test(kioskDoc));
  }
  check("redaction is scoped per EVENT, not by a global key list",
    /EVENT_FIELDS:/.test(html) && !/SAFE_KEYS:/.test(html));
  check("an unlisted event yields no fields at all",
    /hasOwnProperty\.call\(this\.EVENT_FIELDS, event\)/.test(html));
  check("string values are validated against closed enums",
    /enums\[rule\] && typeof v === 'string' && enums\[rule\]\.indexOf\(v\) !== -1/.test(html));
}

section("diagnostic contract: the logged event set and EVENT_FIELDS agree");
{
  // The drift this pins, present on 94eab0d and reproducible by reverting the
  // EVENT_FIELDS half: building the specialist agenda (2b34e7a) renamed the two
  // financing events at their CALL SITES —
  //     financing_interest_changed    -> financing_agenda_changed
  //     financing_followup_requested  -> financing_agenda_reviewed
  // — but left EVENT_FIELDS declaring the old pair. Neither half is wrong when
  // read alone, so all eighteen suites stayed green, while redact() classified
  // both live events as UNKNOWN and dropped every field from each:
  //     A.log('financing_agenda_changed', finEventBase('sheet'))  ->  {_dropped: 4}
  // Both agenda events were emitting a drop-count and nothing else. Placement,
  // language and layout — the whole reason the events exist — never survived.
  //
  // Name-by-name assertions cannot prevent that recurring; a rename simply
  // moves to a name nobody has written an assertion about yet. Only the SET
  // equality holds, and both directions carry a distinct failure:
  //   logged but unlisted -> the event silently loses its entire payload
  //   listed but unlogged -> dead contract surface outliving the code it named
  //
  // EVENT_FIELDS is read off the executing object, not re-parsed out of the
  // source, so this compares against what actually ships.
  //
  // THE GUARD MUST FAIL CLOSED, and the first version of it did not (caught in
  // review of PR #11). It matched single-quoted literals only, so
  //     analytics.log("new_event", payload)
  // was found as a call but yielded no name. A newly added event has no stale
  // EVENT_FIELDS entry to trip the reverse direction either, so BOTH equality
  // assertions passed while redact() dropped the event's whole payload — the
  // precise regression this section exists to prevent, reintroduced by the
  // guard's own blind spot. A scanner that contributes nothing when it does not
  // understand something is worse than no scanner: it reports success.
  //
  // So the rule is now inverted. Every discovered analytics.log() call MUST
  // yield at least one statically enumerable name, and anything not understood
  // — a dynamic identifier, an interpolated template, a concatenation, an
  // unbalanced call — is a FAILURE rather than a silent zero-name contribution.
  // Adding a genuinely dynamic event name is then a deliberate act that has to
  // change this guard, which is the point.

  // Literal-aware scan of one first-argument expression. String literals are
  // atoms, so a comma or paren inside a literal cannot end the argument, and a
  // literal in a later payload argument cannot be mistaken for an event name.
  function tokenizeArg(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "'" || c === '"' || c === "`") {
        let j = i + 1, v = "";
        while (j < src.length) {
          if (src[j] === "\\") { v += src[j + 1] ?? ""; j += 2; continue; }
          if (src[j] === c) break;
          // An interpolated template cannot be enumerated statically.
          if (c === "`" && src[j] === "$" && src[j + 1] === "{") return null;
          v += src[j]; j++;
        }
        if (j >= src.length) return null;          // unterminated literal
        out.push({ t: "str", v });
        i = j + 1;
        continue;
      }
      // `?.` and `??` are not the conditional operator and must not split it.
      if (c === "?" && (src[i + 1] === "." || src[i + 1] === "?")) {
        out.push({ t: "other", v: c }); i += 2; continue;
      }
      if (c === "?" || c === ":") { out.push({ t: "op", v: c }); i++; continue; }
      if (c === "(" || c === ")") { out.push({ t: "paren", v: c }); i++; continue; }
      out.push({ t: "other", v: c }); i++;
    }
    return out;
  }

  // An event expression is either a single literal, or a conditional whose two
  // branches are themselves event expressions. The CONDITION is ignored — it
  // does not produce the name. Everything else yields null, i.e. a failure.
  function namesFromTokens(tokens) {
    let depth = 0, qIdx = -1;
    for (let k = 0; k < tokens.length; k++) {
      const t = tokens[k];
      if (t.t === "paren") depth += t.v === "(" ? 1 : -1;
      else if (t.t === "op" && t.v === "?" && depth === 0) { qIdx = k; break; }
    }
    if (qIdx === -1) {
      const meaningful = tokens.filter((t) =>
        t.t !== "paren" && !(t.t === "other" && /\s/.test(t.v)));
      return (meaningful.length === 1 && meaningful[0].t === "str")
        ? [meaningful[0].v] : null;
    }
    let nested = 0, colonIdx = -1, d = 0;
    for (let k = qIdx + 1; k < tokens.length; k++) {
      const t = tokens[k];
      if (t.t === "paren") d += t.v === "(" ? 1 : -1;
      else if (t.t === "op" && d === 0) {
        if (t.v === "?") nested++;
        else if (nested === 0) { colonIdx = k; break; }
        else nested--;
      }
    }
    if (colonIdx === -1) return null;
    const a = namesFromTokens(tokens.slice(qIdx + 1, colonIdx));
    const b = namesFromTokens(tokens.slice(colonIdx + 1));
    return (a && b) ? a.concat(b) : null;
  }

  // Literal-aware extraction of the first argument of the call opening at idx.
  function firstArg(src, idx) {
    let depth = 1, i = idx;
    while (i < src.length) {
      const c = src[i];
      if (c === "'" || c === '"' || c === "`") {
        const q = c; i++;
        while (i < src.length) {
          if (src[i] === "\\") { i += 2; continue; }
          if (src[i] === q) { i++; break; }
          i++;
        }
        continue;
      }
      if (c === "(" || c === "[" || c === "{") { depth++; i++; continue; }
      if (c === ")" || c === "]" || c === "}") {
        depth--;
        if (depth === 0) return src.slice(idx, i);
        i++; continue;
      }
      if (c === "," && depth === 1) return src.slice(idx, i);
      i++;
    }
    return null;                                    // unbalanced call
  }

  // The whole audit as a pure function, so the mutation battery below can run
  // it over sources and contracts that are not this repository's.
  function auditEventContract(source, listedNames) {
    const code = stripComments(source);
    // DISCOVERY must be whitespace-aware, not a fixed substring. `analytics.log
    // (` and a newline before the parenthesis are both valid JavaScript, and an
    // exact "analytics.log(" search finds neither — so the call would be
    // discovered at all, contribute no name, and (having no EVENT_FIELDS entry
    // either) pass every assertion while redact() dropped its payload. That is
    // the same failure as the double-quote gap, one step earlier in the
    // pipeline: reported by Codex on PR #12 and reproduced at 203/0 before
    // this was fixed. Parsing must fail closed at BOTH steps to mean anything.
    const CALL_RE = /\banalytics\s*\.\s*log\s*\(/g;
    const names = new Set();
    const unparsed = [];
    let call;
    while ((call = CALL_RE.exec(code)) !== null) {
      const arg = firstArg(code, call.index + call[0].length);
      const found = arg === null ? null : (() => {
        const toks = tokenizeArg(arg);
        return toks === null ? null : namesFromTokens(toks);
      })();
      if (!found || !found.length) {
        unparsed.push((arg === null ? "<unbalanced>" : arg).trim().slice(0, 60));
        continue;
      }
      for (const n of found) names.add(n);
    }
    const listed = new Set(listedNames);
    return {
      names,
      unparsed,
      unlisted: [...names].filter((e) => !listed.has(e)).sort(),
      unlogged: [...listed].filter((e) => !names.has(e)).sort(),
    };
  }

  const shipped = auditEventContract(html, Object.keys(A.EVENT_FIELDS));
  const logged = shipped.names;
  check(`the sweep found the call sites (${logged.size} distinct event names)`, logged.size > 20);
  check(`every analytics.log() call yields a statically enumerable name${shipped.unparsed.length ? " — UNPARSED: " + shipped.unparsed.join(" | ") : ""}`,
    shipped.unparsed.length === 0);
  check(`every logged event is declared in EVENT_FIELDS${shipped.unlisted.length ? " — PAYLOAD DROPPED FOR: " + shipped.unlisted.join(", ") : ""}`,
    shipped.unlisted.length === 0);
  check(`every EVENT_FIELDS entry is actually logged${shipped.unlogged.length ? " — DEAD ENTRIES: " + shipped.unlogged.join(", ") : ""}`,
    shipped.unlogged.length === 0);
  // Discovery keys on the `analytics.log` call expression. Rebinding the method
  // to another name would log events this sweep never sees, so the boundary is
  // asserted rather than assumed — the honest limit of a non-parser guard.
  // The stripper is a heuristic, and a heuristic that DELETES is the one thing
  // in this sweep that can hide a call site. Rather than trust it, look at what
  // it actually removed from this file: no span it deleted may contain a call
  // shape either sweep depends on. This holds whatever the scanner did or did
  // not get right — a desync that swallowed real code would fail here even if
  // every other assertion still passed.
  {
    const deleted = [];
    stripComments(html, deleted);
    const CALL_SHAPE = /analytics\s*\.\s*log\s*\(|localStorage\s*\.\s*\w+\s*\(/;
    const swallowed = deleted.filter((span) => CALL_SHAPE.test(span));
    check(`comment stripping never deleted a call site (${deleted.length} spans removed)${swallowed.length ? " — SWALLOWED: " + swallowed.map((s) => JSON.stringify(s.slice(0, 60))).join(" | ") : ""}`,
      swallowed.length === 0);
    // A deletion running to end of file is the signature of a desynced scanner,
    // and it is what the unterminated-opener branch now refuses to do.
    const longest = deleted.reduce((a, s) => Math.max(a, s.length), 0);
    check(`no single deletion is anywhere near file-sized (largest ${longest} bytes of ${html.length})`,
      longest < html.length / 50);
  }
  {
    const src = stripComments(html);
    check("analytics.log is never aliased, so call-site discovery is complete",
      !/(?:const|let|var)\s+\w+\s*=\s*analytics\s*\.\s*log\b/.test(src)
      && !/\{[^{}]*\blog\b[^{}]*\}\s*=\s*analytics\b/.test(src));
  }

  // ---- non-vacuity: the guard must actually reject each failure mode -------
  // Every mutation below reintroduces a way the contract can silently break.
  // A guard that passes them all is decorative, so each is executed.
  {
    const LISTED = ["alpha", "beta"];
    const m = (src, listedNames = LISTED) => auditEventContract(src, listedNames);

    // The exact escape Codex found: double quotes, no stale entry to catch it.
    const dq = m(`analytics.log('alpha', p); analytics.log("beta", p); analytics.log("new_event", p);`);
    check("MUTATION: a double-quoted unlisted event is caught",
      dq.unlisted.join(",") === "new_event" && dq.unparsed.length === 0);

    check("double-quoted literals are recognised, not merely rejected",
      m(`analytics.log("alpha", p); analytics.log("beta", p);`).unlisted.length === 0);

    // DISCOVERY, not parsing: each of these is valid JavaScript that a fixed
    // "analytics.log(" search never finds, so the call would contribute
    // nothing and pass silently.
    const spaced = m(`analytics.log('alpha', p); analytics.log ("new_event", p);`);
    check("MUTATION: a space before the parenthesis is still discovered",
      spaced.unlisted.join(",") === "new_event");
    check("MUTATION: a newline before the parenthesis is still discovered",
      m("analytics.log('alpha', p); analytics.log\n  ('new_event', p);").unlisted.join(",") === "new_event");
    check("MUTATION: spacing around the dot is still discovered",
      m("analytics.log('alpha', p); analytics . log('new_event', p);").unlisted.join(",") === "new_event");
    check("a spaced call with a dynamic argument still fails as unparsed",
      m("analytics.log ( eventName , p);").unparsed.length === 1);

    // Comment removal is part of DISCOVERY, so its own failure mode is a
    // mutation too. The regex below is the exact literal index.html carries;
    // read naively its `/*` opens a comment that runs to the next `*/`, and
    // every call site in between vanishes from the sweep.
    const regexHazard = m(
      "analytics.log('alpha', p);\n"
      + "var s = u.replace(/^\\.?\\/*/, '');\n"
      + "analytics.log('new_event', p);\n"
      + "/* a later block comment, e.g. one added in a stylesheet */\n");
    check("MUTATION: a regex containing /* cannot swallow later call sites",
      regexHazard.unlisted.join(",") === "new_event" && regexHazard.unparsed.length === 0);
    check("real block comments are still removed",
      m("analytics.log('alpha', p); /* analytics.log('new_event', p); */").unlisted.length === 0);
    check("real line comments are still removed",
      m("analytics.log('alpha', p);\n    // analytics.log('new_event', p);").unlisted.length === 0);

    // The two ways the scanner itself can go wrong, both reported against the
    // first version of this function. Neither is exotic: the first is ordinary
    // markup, and this runs over an HTML file.
    const markup = m(
      "analytics.log('alpha', p);\n"
      + "var s = '<i>a</i> <a href=\"x/y\" title=\"z/* q\">t</a>';\n"
      + "analytics.log('new_event', p);\n");
    check("MUTATION: a closing HTML tag does not start a regex scan that eats the file",
      markup.unlisted.join(",") === "new_event" && markup.unparsed.length === 0);
    const unterminated = m(
      "analytics.log('alpha', p);\n"
      + "var q = a-- / b;   /* an opener with no closer\n"
      + "analytics.log('new_event', p);\n");
    check("MUTATION: an unterminated block opener is emitted, never deleted to EOF",
      unterminated.unlisted.join(",") === "new_event");

    const tpl = m("analytics.log(`alpha`, p); analytics.log(`beta`, p);");
    check("un-interpolated template literals are recognised",
      tpl.unparsed.length === 0 && tpl.unlisted.length === 0 && tpl.unlogged.length === 0);

    check("MUTATION: an interpolated template literal fails",
      m("analytics.log(`evt_${i}`, p);").unparsed.length === 1);
    check("MUTATION: a dynamic identifier first argument fails",
      m("analytics.log(eventName, p);").unparsed.length === 1);
    check("MUTATION: a concatenated first argument fails",
      m("analytics.log('pre' + suffix, p);").unparsed.length === 1);
    check("MUTATION: a function-call first argument fails",
      m("analytics.log(nameFor(x), p);").unparsed.length === 1);
    // A call whose first argument never terminates. (`log('alpha', p;` is NOT
    // this case — its first argument is complete and correctly yields "alpha";
    // unbalance after the event name cannot affect enumeration.)
    check("MUTATION: a truncated call with no argument terminator fails",
      m("analytics.log('alpha'").unparsed.length === 1);
    check("MUTATION: an unterminated string literal fails",
      m("analytics.log('alpha, p);").unparsed.length === 1);

    check("the conditional form still enumerates BOTH branches",
      m("analytics.log(flag ? 'alpha' : 'beta', p);").unlisted.length === 0);
    check("a nested conditional enumerates every branch",
      m("analytics.log(a ? 'alpha' : b ? 'beta' : 'gamma', p);").unlisted.join(",") === "gamma");
    check("a conditional with a dynamic branch fails",
      m("analytics.log(flag ? 'alpha' : other, p);").unparsed.length === 1);
    check("optional chaining in the condition is not read as a conditional",
      m("analytics.log(o?.flag ? 'alpha' : 'beta', p);").unparsed.length === 0);

    check("a comma inside a literal does not truncate the argument",
      m(`analytics.log('alpha', { s: 'x,y' });`).unlisted.length === 0);
    check("a literal in the PAYLOAD is never mistaken for an event name",
      m(`analytics.log('alpha', { note: 'beta_typo' });`).names.has("beta_typo") === false);

    // Both directions of the set equality, mutated against the real source.
    const dropped = Object.keys(A.EVENT_FIELDS).filter((e) => e !== "quiz_started");
    check("MUTATION: removing an EVENT_FIELDS entry is caught",
      auditEventContract(html, dropped).unlisted.join(",") === "quiz_started");
    check("MUTATION: adding a stale EVENT_FIELDS entry is caught",
      auditEventContract(html, Object.keys(A.EVENT_FIELDS).concat("retired_event"))
        .unlogged.join(",") === "retired_event");
    check("the unmutated shipped source and contract pass",
      shipped.unparsed.length === 0 && shipped.unlisted.length === 0
      && shipped.unlogged.length === 0);
  }
  // The specific pair, so the regression reads by name in the log too.
  for (const ev of ["financing_agenda_changed", "financing_agenda_reviewed"]) {
    const printed = runLogged(() => A.log(ev, {
      placement: "sheet", lang: "en", layout: "tablet", offerVersion: "2026-07",
    }));
    check(`${ev} retains its placement/lang/layout diagnostics`,
      printed.includes("sheet") && printed.includes("tablet") && printed.includes('"en"'));
    // offerVersion stays redacted here for the same reason it is everywhere
    // else — being a declared event is not a licence to widen the field set.
    check(`${ev} still redacts offerVersion`, !printed.includes("2026-07"));
  }
}

} catch (err) {
  section("behavioural execution");
  check("the extracted async/privacy implementation executes end to end", false);
  console.log("      could not run against this tree: "
    + String(err && err.stack ? err.stack.split("\n")[0] : err));
  console.log("      (expected on a tree without the amendment — every post-wipe,");
  console.log("       deferred-fetch and redaction contract above is unmet.)");
}

console.log(`\nSession async/privacy check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
