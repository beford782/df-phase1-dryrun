// Session safety — behavioural regression (Gate 1B).
//
// This does NOT grep for function names. It EXTRACTS the real Gate 1B block
// from index.html (everything between the GATE1B SESSION SAFETY markers) and
// EXECUTES it against a DOM shim and a controllable fake clock, following the
// same extract-and-execute pattern as tests/drawer_lifecycle_check.mjs and
// tests/financing_render_check.mjs.
//
// The regressions it exists to pin, all present on main @ 47c9a17:
//
//   1. A 2-minute silent DESTRUCTIVE reset. The main customer activity — lying
//      on a mattress — generates no DOM event, so a live session could and did
//      disappear while the product was being used exactly as intended.
//   2. No warning, no recovery: the idle timer called window.startOver()
//      directly.
//   3. Restart wiped immediately with no confirmation.
//   4. EN/ES controls existed only on Welcome.
//   5. startOver() never cleared emailNameInput / emailInput / emailPhoneInput.
//   6. Those fields advertised given-name / email / tel autofill on a shared
//      public device.
//   7. Hidden contact, error and confirmation state survived into the next
//      customer's session.
//   9. switchLanguage() had no stale-request guard, so a slow EN->ES->EN could
//      finish with the Spanish dictionary applied.
//
// Run: node tests/session_safety_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const dictEn = JSON.parse(readFileSync(join(root, "data", "dict-en.json"), "utf8"));
const dictEs = JSON.parse(readFileSync(join(root, "data", "dict-es.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}`); }
}
function section(name) { console.log(`\n-- ${name} --`); }

// ===========================================================================
// 1. STATIC / MARKUP CONTRACTS
// ===========================================================================
section("markup contracts");

const SOURCE = (() => {
  const m = html.match(
    /\/\/ ==== GATE1B SESSION SAFETY :: BEGIN =+([\s\S]*?)\/\/ ==== GATE1B SESSION SAFETY :: END =+/);
  check("extracted the Gate 1B session block from index.html", !!m);
  return m ? m[1] : "";
})();

// -- contact fields: public-device attributes, old autofill tokens gone ------
const CONTACT_IDS = ["emailNameInput", "emailInput", "emailPhoneInput"];
const OLD_TOKENS = { emailNameInput: "given-name", emailInput: "email", emailPhoneInput: "tel" };
for (const id of CONTACT_IDS) {
  const tag = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`));
  check(`<input id="${id}"> found`, !!tag);
  const src = tag ? tag[0] : "";
  check(`${id} declares autocomplete="off"`, /autocomplete="off"/.test(src));
  check(`${id} no longer advertises autocomplete="${OLD_TOKENS[id]}"`,
    !new RegExp(`autocomplete="${OLD_TOKENS[id]}"`).test(src));
  check(`${id} opts out of password-manager capture`,
    /data-lpignore="true"/.test(src) && /data-1p-ignore/.test(src));
  check(`${id} disables autocorrect`, /autocorrect="off"/.test(src));
}
const formTag = html.match(/<form[^>]*id="emailContactForm"[^>]*>/);
check("contact fields are wrapped in a real <form> (so reset() is available)", !!formTag);
check('contact form declares autocomplete="off"', !!formTag && /autocomplete="off"/.test(formTag[0]));

// -- safety dialog: closed state is absent from a11y + keyboard -------------
const dlgTag = html.match(/<div class="safety-dialog" id="sessionSafetyDialog"[^>]*>/s);
check("safety dialog element found", !!dlgTag);
const dlg = dlgTag ? dlgTag[0] : "";
check('dialog declares role="alertdialog"', /role="alertdialog"/.test(dlg));
check('dialog declares aria-modal="true"', /aria-modal="true"/.test(dlg));
check("dialog is labelled by its title", /aria-labelledby="sessionSafetyTitle"/.test(dlg));
check("dialog is described by its body", /aria-describedby="sessionSafetyBody"/.test(dlg));
check("dialog ships hidden", /\bhidden\b/.test(dlg));
check("dialog ships inert (absent from keyboard navigation when closed)", /\binert\b/.test(dlg));
check('dialog ships aria-hidden="true"', /aria-hidden="true"/.test(dlg));
check("dialog title is focusable for focus entry",
  /id="sessionSafetyTitle" tabindex="-1"/.test(html));
check("remaining-time meter is aria-hidden (no per-second live-region noise)",
  /id="sessionSafetyMeter"[^>]*aria-hidden="true"/.test(html));
check("a separate polite region exists for the single late reminder",
  /id="sessionSafetyLive"[^>]*aria-live="polite"/.test(html));

// -- persistent utility controls --------------------------------------------
check("persistent utility bar exists", /id="sessionUtility"/.test(html));
check("utility bar is a SIBLING of <header>, not a child (the header is "
  + "display:none on every screen but handoff)",
  html.indexOf('id="sessionUtility"') > html.indexOf("</header>"));
const langGroupTag = html.match(/<div[^>]*id="sessionLangGroup"[^>]*>/);
check("language control group is a labelled group",
  !!langGroupTag && /role="group"/.test(langGroupTag[0]) && /aria-label=/.test(langGroupTag[0]));
for (const [id, lang] of [["sessionLangEn", "en"], ["sessionLangEs", "es"]]) {
  const btn = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`, "s"));
  check(`${id} exists`, !!btn);
  check(`${id} carries programmatic pressed state, not colour alone`,
    !!btn && /aria-pressed="(true|false)"/.test(btn[0]));
  check(`${id} is bound to data-lang="${lang}"`, !!btn && btn[0].includes(`data-lang="${lang}"`));
  check(`${id} label comes from the generic dictionary`, !!btn && /data-i18n="session\.lang_/.test(btn[0]));
}
check("restart control is visually distinct from the language pair (own class)",
  /class="[^"]*session-utility__restart[^"]*"/.test(html));
check("restart control opens the confirmation, never the wipe",
  /id="headerStartOverBtn"[\s\S]{0,400}?window\.requestStartOver\(\)/.test(html));
check("the delegated .js-start-over handler asks first",
  /closest\('\.js-start-over'\)[\s\S]{0,160}window\.requestStartOver\(\)/.test(html));
check("no .js-start-over path calls window.startOver() directly",
  !/closest\('\.js-start-over'\)[\s\S]{0,160}window\.startOver\(\)/.test(html));
check("the native confirm dialog is never invoked",
  !/(?:^|[^.\w])(?:window\.)?confirm\s*\(/m.test(html.replace(/\/\/[^\n]*/g, "")));
check("location.reload() is still never used", !/location\.reload\s*\(/.test(html));
check("showScreen() reveals the utility bar on every non-Welcome screen",
  /const utility = document\.getElementById\('sessionUtility'\);[\s\S]{0,120}utility\.hidden = isWelcome/.test(html));
// The bar is a sibling of the screens, so the drawer's "inert the active
// screen" rule no longer covers the whole background. A control reachable
// outside an aria-modal dialog is a containment gap the bar would otherwise
// have introduced into the Gate 1A drawer lifecycle.
{
  const openSrc = (html.match(/\/\/ ---- dialog lifecycle \(mirrors openFinancingSheet\)[\s\S]*?title\.focus\(\);/) || [""])[0];
  const closeSrc = (html.match(/window\.closeMattressDrawer = function\([^)]*\) \{[\s\S]*?\n    \};/) || [""])[0];
  check("the open drawer inerts the utility bar as part of its background",
    /getElementById\('sessionUtility'\)[\s\S]{0,200}setAttribute\('inert', ''\)/.test(openSrc));
  check("it marks what it inerted so the release stays exact",
    /data-drawer-inerted/.test(openSrc) && /data-drawer-inerted/.test(closeSrc));
  check("the close path releases the bar only if the drawer inerted it",
    /hasAttribute\('data-drawer-inerted'\)[\s\S]{0,160}removeAttribute\('inert'\)/.test(closeSrc));
}

// -- bilingual strings live in the generic dictionaries ----------------------
const SAFETY_KEYS = [
  "session.lang_group", "session.lang_en", "session.lang_es",
  "session.restart", "session.restart_aria",
  "safety.restart_title", "safety.restart_body", "safety.restart_keep", "safety.restart_confirm",
  "safety.timeout_title", "safety.timeout_body", "safety.timeout_continue", "safety.timeout_confirm",
  "safety.timeout_remaining", "safety.timeout_final_warning",
];
for (const k of SAFETY_KEYS) {
  check(`dict-en has ${k}`, typeof dictEn[k] === "string" && dictEn[k].length > 0);
  check(`dict-es has ${k}`, typeof dictEs[k] === "string" && dictEs[k].length > 0);
}
check("EN and ES dictionaries have identical key sets",
  JSON.stringify(Object.keys(dictEn).sort()) === JSON.stringify(Object.keys(dictEs).sort()));
check("Spanish safety copy is actually translated, not the English string",
  dictEs["safety.restart_title"] !== dictEn["safety.restart_title"]
  && dictEs["safety.timeout_title"] !== dictEn["safety.timeout_title"]
  && dictEs["safety.timeout_body"] !== dictEn["safety.timeout_body"]);
check("required English restart title is exact", dictEn["safety.restart_title"] === "Start a new customer?");
check("required English restart body is exact",
  dictEn["safety.restart_body"] === "This clears the current answers, mattress selections, and Sleep Plan.");
check("required English timeout title is exact", dictEn["safety.timeout_title"] === "Still comparing?");
// Trust gate (owner ruling R5, 2026-08-21): the body is behaviourally exact
// and names the dialog's REAL controls. The earlier "paused to protect your
// privacy" reassurance described intent, not behaviour (a grace countdown runs
// and the answers persist until it ends or Start new customer is pressed).
check("required English timeout body is exact",
  dictEn["safety.timeout_body"] === "Session paused. Continue this session where you left off, or start a new customer to clear it.");
check("required Spanish timeout body is exact (provisional, native review owed)",
  dictEs["safety.timeout_body"] === "Sesión en pausa. Sigue en esta sesión donde la dejaste o empieza con otro cliente para borrarla.");
// The sentence must use the same terminology as the two controls it refers to,
// in each language: the cancel label verbatim and the confirm label's words.
check("EN timeout body names the Continue control verbatim and the Start-new-customer control's terminology",
  dictEn["safety.timeout_body"].toLowerCase().includes(dictEn["safety.timeout_continue"].toLowerCase())
  && /start (a )?new customer/i.test(dictEn["safety.timeout_body"]) && dictEn["safety.timeout_confirm"] === "Start new customer");
check("ES timeout body uses the controls' terminology (en esta sesión / con otro cliente)",
  /en esta sesi[oó]n/i.test(dictEs["safety.timeout_body"]) && /con otro cliente/i.test(dictEs["safety.timeout_body"])
  && /en esta sesi[oó]n/i.test(dictEs["safety.timeout_continue"]) && /con otro cliente/i.test(dictEs["safety.timeout_confirm"]));
check("the timeout body claims nothing about privacy, protection, hiding, encryption, anonymity or transmission, and names no number",
  ["en", "es"].every((l) => !/privac|protect|proteg|hidden|oculta|encrypt|cifra|anonym|anónim|\bsent\b|envia|envía|\d/i.test(l === "en" ? dictEn["safety.timeout_body"] : dictEs["safety.timeout_body"])));
check("the timeout body is not a literal in index.html (dictionary-driven only)",
  !html.includes("Session paused.") && !html.includes("Sesión en pausa."));
// Spanish expansion must not blow the 320px bar apart. The bar wraps rather
// than truncating, but a runaway label would still push the panel wide.
for (const k of ["session.restart", "session.lang_en", "session.lang_es"]) {
  const v = dictEs[k];
  check(`${k} stays compact in ES (<= 14 chars, got ${v ? v.length : "missing"})`,
    typeof v === "string" && v.length <= 14);
}
for (const k of ["safety.restart_confirm", "safety.timeout_continue"]) {
  const v = dictEs[k];
  const longest = typeof v === "string" ? Math.max(...v.split(" ").map(w => w.length)) : Infinity;
  check(`${k} ES has no unbreakable word wider than the 320px panel (longest ${longest})`, longest <= 16);
}

// -- new chrome must not depend on retailer-configurable colour -------------
// applyStoreConfig() writes `colors.accent` into --color-accent, but its
// paired foreground --color-on-accent is a fixed literal. Anything essential
// built on that pair has contrast that varies per deployment. The session
// chrome is app furniture, not brand identity, so it uses the unconfigurable
// --color-text / --color-bg inversion instead.
{
  // Comments stripped: this is about declarations, not the prose explaining
  // why the configurable pair is avoided.
  const cssBlock = (html.match(/\/\* ===== GATE 1B: PERSISTENT SESSION UTILITY BAR[\s\S]*?\n  <\/style>/) || [""])[0]
    .replace(/\/\*[\s\S]*?\*\//g, "");
  check("Gate 1B stylesheet block located", cssBlock.length > 0);
  check("the session chrome never pairs --color-accent with --color-on-accent",
    !/--color-on-accent/.test(cssBlock));
  for (const sel of [
    /\.session-utility__btn\[aria-pressed="true"\] \{[^}]*\}/,
    /\.safety-dialog__btn--keep \{[^}]*\}/,
    /\.safety-dialog__meter-fill \{[^}]*\}/,
  ]) {
    const rule = (cssBlock.match(sel) || [""])[0];
    check(`${(rule.split("{")[0] || "?").trim()} uses brand-neutral colour only`,
      rule.length > 0 && !/--color-accent|--store-primary/.test(rule));
  }
  // Independent contrast maths on the two literals those tokens resolve to.
  const lum = (hex) => {
    const h = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map(i => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const tok = (name) => (html.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`)) || [, ""])[1];
  const text = tok("--color-text"), bg = tok("--color-bg"), surface = tok("--color-surface");
  check(`--color-text (${text}) is not retailer-configurable`,
    !!text && !/setProperty\('--color-text'/.test(html));
  check(`--color-bg (${bg}) is not retailer-configurable`,
    !!bg && !/setProperty\('--color-bg'/.test(html));
  check(`--color-surface (${surface}) is not retailer-configurable`,
    !!surface && !/setProperty\('--color-surface'/.test(html));
  check(`selected-language inversion is ${ratio(text, bg).toFixed(2)}:1 (>= 4.5)`, ratio(text, bg) >= 4.5);
  check(`unselected control on the bar is ${ratio(text, surface).toFixed(2)}:1 (>= 4.5)`, ratio(text, surface) >= 4.5);
  check(`--color-accent IS retailer-configurable, which is why it is avoided here`,
    /setProperty\('--color-accent'/.test(html));
}

// -- policy is centralised and provisional ----------------------------------
check("one central policy object declares the timing", /var SESSION_POLICY = \{/.test(SOURCE));
check("policy is labelled provisional, not validated", /provisional-preview/.test(SOURCE));
check("no stray idle literals survive (the old 120000 / 300000)",
  !/\b120000\b/.test(SOURCE) && !/\b300000\b/.test(SOURCE));
check("the old DEFAULT_IDLE / HANDOFF_IDLE constants are gone from index.html",
  !/DEFAULT_IDLE/.test(html) && !/HANDOFF_IDLE/.test(html));
check("handoff no longer gets its own unreviewed destructive policy",
  !/hf2Screen'\)\s*\?\s*HANDOFF_IDLE/.test(html));
check("dev timing injection is gated on loopback hosts only",
  /__dfSetSessionPolicy[\s\S]{0,400}location[\s\S]{0,80}hostname[\s\S]{0,200}'127\.0\.0\.1'/.test(SOURCE));
check("dev timing injection is NOT reachable from a URL parameter",
  !/URLSearchParams|location\.search|location\.hash/.test(SOURCE));
check("session state is never persisted to browser storage",
  !/localStorage|sessionStorage|indexedDB|document\.cookie/.test(SOURCE));

// -- no raw prior-customer data printed at reset ----------------------------
check("the raw Session Summary console dump of every answer is gone",
  !/console\.log\('\[DreamFinder\] Session Summary:'/.test(html));
check("reset logs a safe aggregate instead", /function sessionSafeSummary/.test(SOURCE));
check("the aggregate carries counts, not answers",
  /answeredCount:/.test(SOURCE) && !/answers: analytics\.answers/.test(SOURCE));

// -- language transaction safety --------------------------------------------
check("switchLanguage takes a monotonic request token", /var _langRequestSeq = 0;/.test(html));
check("a superseded dictionary response is discarded",
  /if \(token !== _langRequestSeq\) return false;/.test(html));
check("the dictionary fetch has no side effect of its own",
  /async function fetchDictionary\(lang\)/.test(html)
  && !/async function fetchDictionary\(lang\)[\s\S]{0,700}?DICT = /.test(html));
check("the requested language is validated against store-config.languages",
  /function requestedLangIsSupported/.test(html) && /STORE_CONFIG\.languages/.test(html));

// ===========================================================================
// 2. DOM SHIM + FAKE CLOCK
// ===========================================================================
const doc = makeDocument();

function makeEl(id, tag) {
  const attrs = new Map();
  const classes = new Set();
  const el = {
    id, tagName: (tag || "div").toUpperCase(),
    children: [], descendants: [],
    innerHTML: "", textContent: "", value: "", defaultValue: "",
    hidden: false, disabled: false, style: {},
    offsetParent: {},
    get className() { return [...classes].join(" "); },
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      contains: (c) => classes.has(c),
      toggle: (c, on) => { if (on === undefined) { classes.has(c) ? classes.delete(c) : classes.add(c); } else if (on) classes.add(c); else classes.delete(c); return classes.has(c); },
    },
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    hasAttribute: (k) => attrs.has(k),
    focus() { doc.activeElement = el; },
    blur() { if (doc.activeElement === el) doc.activeElement = doc.body; },
    contains: (o) => o === el || el.descendants.indexOf(o) !== -1 || el.children.indexOf(o) !== -1,
    querySelectorAll: (sel) => (sel && sel.includes("button") ? el.children : []),
    addEventListener() {}, removeEventListener() {},
    reset() { el.children.forEach(c => { c.value = c.defaultValue || ""; }); },
  };
  return el;
}

function makeDocument() {
  const byId = new Map();
  const bodyChildren = [];
  const d = {
    hidden: false,
    documentElement: { lang: "en", style: { setProperty() {} } },
    // Auto-vivifying: the block touches ~60 ids and every one of them exists
    // in the real page. Creating on demand keeps the shim honest (nothing is
    // silently absent) and lets the wipe matrix seed a sentinel into any id.
    getElementById(id) {
      if (!byId.has(id)) {
        const el = makeEl(id);
        byId.set(id, el);
        if (!["body"].includes(id)) bodyChildren.push(el);
      }
      return byId.get(id);
    },
    querySelector(sel) {
      if (sel === ".screen.active") return [...byId.values()].find(e => e.classList.contains("active")) || null;
      if (sel === ".session-utility__sep") return d.getElementById("__sep");
      if (sel === ".header-location") return d.getElementById("__loc");
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    contains: () => true,
    all: byId,
  };
  d.body = makeEl("body", "body");
  d.body.children = bodyChildren;
  d.body.classList.add("boot");
  d.activeElement = d.body;
  return d;
}

// Fake clock. Absolute-deadline logic is the whole point of the controller, so
// the suite must be able to move time without waiting.
let NOW = 1_000_000;
let timerSeq = 1;
let timeouts = new Map();     // id -> {fn, at}
let intervals = new Map();    // id -> {fn, every, next}

const clock = {
  now: () => NOW,
  setTimeout(fn, ms) { const id = timerSeq++; timeouts.set(id, { fn, at: NOW + (ms || 0) }); return id; },
  clearTimeout(id) { timeouts.delete(id); },
  setInterval(fn, ms) { const id = timerSeq++; intervals.set(id, { fn, every: Math.max(1, ms || 1), next: NOW + (ms || 1) }); return id; },
  clearInterval(id) { intervals.delete(id); },
  // Advance in policy-tick steps so interval callbacks fire in order.
  advance(ms) {
    const target = NOW + ms;
    while (NOW < target) {
      const nextTimeout = Math.min(...[...timeouts.values()].map(t => t.at), Infinity);
      const nextInterval = Math.min(...[...intervals.values()].map(t => t.next), Infinity);
      const next = Math.min(nextTimeout, nextInterval, target);
      NOW = next;
      for (const [id, t] of [...timeouts]) if (t.at <= NOW) { timeouts.delete(id); t.fn(); }
      for (const [id, t] of [...intervals]) if (t.next <= NOW) { t.next = NOW + t.every; t.fn(); }
      if (next === target) break;
    }
    NOW = target;
  },
  // Simulate an OS sleep / backgrounded tab: the wall clock jumps but no
  // timer callback ever fired for the elapsed time.
  jump(ms) { NOW += ms; },
  pendingTimeouts: () => timeouts.size,
};

// ===========================================================================
// 3. COMPOSE AND EXECUTE THE REAL BLOCK
// ===========================================================================
// Wrapped so a tree WITHOUT the Gate 1B module (the unmodified base) reports a
// legible failure for every behavioural contract instead of crashing on the
// first missing symbol. A crash is technically a failure too, but it hides how
// much of the contract is unmet.
try {
const calls = [];
function record(name) { return (...a) => { calls.push({ name, args: a }); }; }
function callsTo(name) { return calls.filter(c => c.name === name).length; }

// Bindings the extracted block reads from the enclosing script scope.
const outer = {
  analytics: null,
  probe: null,
};

let DICT = dictEn;
const win = {
  location: { hostname: "localhost" },
  addEventListener() {},
};

const harness = new Function(
  "document", "window", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "Date", "console", "record", "getDict", "outer",
  `
  "use strict";
  // ---- the enclosing-scope bindings the block relies on ------------------
  var currentQuestion = 0;
  var answers = {};
  var editingFromReview = false;
  var _resultsState = null;
  var currentLang = 'en';
  // Slice 4 (D4) replaced the discussion agenda with Payment Choice. The block
  // comment above the GATE1B markers in index.html lists the enclosing-scope
  // bindings the extracted module reads; these four are the payment half of
  // that list, and they are declared WITHOUT initial values matching the wipe's
  // targets on purpose — a dirty session is seeded through outer.seed() below,
  // so a wipe that does nothing cannot pass by starting from a clean slate.
  var payExplored = [];
  var payPref = null;
  var payOpen = {};
  var _finSheetStale = false;
  var _finModuleImpressionLogged = false;
  var _financeReturnFocus = null;
  var _langFocusHintId = null;
  var analytics = {
    sessionId: 'seed-session',
    startedAt: null, completedAt: null, answers: {}, resultsViewed: false,
    tierViews: { gold: 0, silver: 0, bronze: 0 }, cardExpands: {},
    accessoriesViewed: false, selectedAccessories: [], allMatches: [],
    recommendedAccessories: [], topPick: null, profileName: null,
    profileBrief: null, profileBriefByLang: null, trialFocus: [],
    profileSubtitle: null, profileSubtitleByLang: null, events: [],
    log: function(ev, data) { record('analytics.log')(ev, data); this.events.push({ ev: ev }); }
  };
  outer.analytics = analytics;
  function t(key, repl) {
    var s = getDict()[key] || key;
    if (repl) Object.keys(repl).forEach(function(k) { s = s.replace(new RegExp('\\\\{' + k + '\\\\}', 'g'), repl[k]); });
    return s;
  }
  function switchLanguage(lang) { record('switchLanguage')(lang); currentLang = lang; return Promise.resolve(true); }
  function showScreen(id) {
    record('showScreen')(id);
    ['welcomeScreen','questionScreen','resultsScreen','emailScreen','hf2Screen','profileScreen','reviewScreen','accessoriesScreen']
      .forEach(function(s) { document.getElementById(s).classList.remove('active'); });
    document.getElementById(id).classList.add('active');
  }
  // The two Payment Choice announcement helpers the wipe calls by name. Both
  // live OUTSIDE the Gate 1B markers, so they are recorded stubs here and the
  // wipe's use of them is asserted by call count, not by reimplementation.
  function cancelPayAnnouncePending() { record('cancelPayAnnouncePending')(); }
  function clearPayAnnouncements() { record('clearPayAnnouncements')(); }

  ${SOURCE}

  // ---- read-only probe over the private module state --------------------
  outer.probe = function() {
    return {
      currentQuestion: currentQuestion, answers: answers,
      editingFromReview: editingFromReview, resultsState: _resultsState,
      currentLang: currentLang,
      payExplored: payExplored, payPref: payPref, payOpen: payOpen,
      finSheetStale: _finSheetStale,
      finImpression: _finModuleImpressionLogged,
      financeReturnFocus: _financeReturnFocus,
      analytics: analytics
    };
  };
  outer.seed = function(state) {
    if ('currentQuestion' in state) currentQuestion = state.currentQuestion;
    if ('answers' in state) answers = state.answers;
    if ('editingFromReview' in state) editingFromReview = state.editingFromReview;
    if ('resultsState' in state) _resultsState = state.resultsState;
    if ('currentLang' in state) currentLang = state.currentLang;
    if ('payExplored' in state) payExplored = state.payExplored;
    if ('payPref' in state) payPref = state.payPref;
    if ('payOpen' in state) payOpen = state.payOpen;
    if ('finSheetStale' in state) _finSheetStale = state.finSheetStale;
    if ('finImpression' in state) _finModuleImpressionLogged = state.finImpression;
    if ('financeReturnFocus' in state) _financeReturnFocus = state.financeReturnFocus;
  };
  outer.sessionTimeout = sessionTimeout;
  `
);

const FakeDate = function () {};
FakeDate.now = () => NOW;

harness(doc, win, clock.setTimeout, clock.clearTimeout, clock.setInterval, clock.clearInterval,
  FakeDate, { log() {}, warn() {}, error() {} }, record, () => DICT, outer);

const S = win.__dfSession;
const probe = outer.probe;

// App-level collaborators the block calls through window.*
const appCalls = [];
win.closeMattressDrawer = (o) => appCalls.push({ fn: "closeMattressDrawer", o });
win.closeFinancingSheet = () => appCalls.push({ fn: "closeFinancingSheet" });
win.closeCompareModal = () => appCalls.push({ fn: "closeCompareModal" });
win.updateCompareTray = () => appCalls.push({ fn: "updateCompareTray" });
win._updatePicksBadge = () => appCalls.push({ fn: "_updatePicksBadge" });

const el = (id) => doc.getElementById(id);
const dialogOpen = () => !el("sessionSafetyDialog").hidden;

// Mirror the shipped closed state of the dialog (hidden + inert + aria-hidden),
// which the markup contract above already proved is what index.html serves.
el("sessionSafetyDialog").hidden = true;
el("sessionSafetyDialog").setAttribute("inert", "");
el("sessionSafetyDialog").setAttribute("aria-hidden", "true");
el("sessionSafetyBackdrop").hidden = true;
check("shim starts from the shipped closed-dialog state", !dialogOpen());

// Drive the controller to a known state, then advance just past the warning
// deadline — far enough to open the warning, never far enough to reach the
// grace deadline behind it.
function armAndWarn() {
  S.restart();
  clock.advance(S.policy.idleWarningMs + S.policy.tickMs);
}

// Shorten the policy the way a developer would locally. Also proves the hook.
check("dev policy injection is accepted on a loopback host",
  win.__dfSetSessionPolicy({ idleWarningMs: 5000, graceMs: 4000, tickMs: 100, finalAnnounceMs: 1000 }) === true);
{
  const savedHost = win.location.hostname;
  win.location.hostname = "beford782.github.io";
  const before = S.policy.idleWarningMs;
  check("dev policy injection is REFUSED on the production host",
    win.__dfSetSessionPolicy({ idleWarningMs: 1 }) === false && S.policy.idleWarningMs === before);
  win.location.hostname = savedHost;
}

// ===========================================================================
// 4. TIMEOUT CONTROLLER
// ===========================================================================
section("timeout controller: activity resets the deadline");
S.restart();
check("controller starts active", S.inspect().state === "active");
clock.advance(4000);
S.activity();
const deadlineAfterActivity = S.inspect().idleDeadline;
check("activity pushes the warning deadline a full window forward",
  deadlineAfterActivity === NOW + S.policy.idleWarningMs);
clock.advance(4000);
check("no warning while activity keeps arriving", !dialogOpen() && S.inspect().state === "active");

section("timeout controller: the warning opens at the policy deadline");
// Seed an open drawer + financing sheet and a focused control, so Continue can
// be proved to restore the EXACT prior layer and focus.
const drawer = el("mattressDrawer");
const sheet = el("financingSheet");
const resultsScreen = el("resultsScreen");
drawer.classList.add("drawer-open");
drawer.removeAttribute("inert");
sheet.hidden = false;
const drawerBtn = el("drawerInterestedBtn");
S.restart();
calls.length = 0;
drawerBtn.focus();
check("pre-warning: drawer open, focus inside it", doc.activeElement === drawerBtn);

clock.advance(S.policy.idleWarningMs + S.policy.tickMs);
check("REGRESSION: warning opens instead of wiping", dialogOpen());
check("controller is in the warning state", S.inspect().state === "warning");
check("no wipe ran (Welcome is not the active screen)", callsTo("showScreen") === 0);
check("dialog is no longer inert", !el("sessionSafetyDialog").hasAttribute("inert"));
check('dialog aria-hidden="false" when open',
  el("sessionSafetyDialog").getAttribute("aria-hidden") === "false");
check("backdrop is shown", !el("sessionSafetyBackdrop").hidden);
check("focus entered the dialog title", doc.activeElement === el("sessionSafetyTitle"));
check("dialog is in timeout mode", el("sessionSafetyDialog").getAttribute("data-mode") === "timeout");
check("timeout title is the required copy", el("sessionSafetyTitle").textContent === "Still comparing?");
check("timeout body is the required copy (rendered through the real path)",
  el("sessionSafetyBody").textContent === "Session paused. Continue this session where you left off, or start a new customer to clear it.");
check("the rendered body equals the governed dictionary value (no drift between dict and render)",
  el("sessionSafetyBody").textContent === dictEn["safety.timeout_body"]);
// Same open dialog, relocalised through the real renderer with the Spanish
// dictionary installed: the ES body renders, then English is restored.
DICT = dictEs;
S.renderSafety();
check("open timeout dialog relocalises its body to the governed Spanish sentence",
  el("sessionSafetyBody").textContent === dictEs["safety.timeout_body"]
  && el("sessionSafetyTitle").textContent === dictEs["safety.timeout_title"]
  && el("sessionSafetyCancel").textContent === dictEs["safety.timeout_continue"]
  && el("sessionSafetyConfirm").textContent === dictEs["safety.timeout_confirm"]);
DICT = dictEn;
S.renderSafety();
check("switching back restores the English timeout body",
  el("sessionSafetyBody").textContent === dictEn["safety.timeout_body"]);
check("remaining-time meter is shown in timeout mode", el("sessionSafetyMeter").hidden === false);
check("meter reports a real remaining time", /\d+ seconds left/.test(el("sessionSafetyMeterText").textContent));

section("timeout controller: background is inert, dialog is not");
check("background is inert while the warning is open", drawer.hasAttribute("inert"));
check("the header/screens behind are inert too", el("resultsScreen").hasAttribute("inert"));
check("the dialog itself was not inerted", !el("sessionSafetyDialog").hasAttribute("inert"));
check("the backdrop was not inerted", !el("sessionSafetyBackdrop").hasAttribute("inert"));
check("pre-warning drawer state is preserved, not closed",
  drawer.classList.contains("drawer-open") && appCalls.filter(c => c.fn === "closeMattressDrawer").length === 0);
check("pre-warning financing sheet is still open", sheet.hidden === false);

section("timeout controller: incidental activity cannot dismiss or extend");
const graceAtOpen = S.inspect().graceDeadline;
const idleDeadlineAtOpen = S.inspect().idleDeadline;
clock.advance(S.policy.tickMs * 2);
S.activity();            // a mousemove / scroll while the tablet sits alone
S.activity();
check("incidental activity does not close the warning", dialogOpen());
check("incidental activity does not extend the grace deadline",
  S.inspect().graceDeadline === graceAtOpen);
// The guard itself: ordinary activity resets the warning deadline ONLY while
// the controller is active. Without this, a brush against the tablet silently
// rewrites session deadlines from behind an open privacy warning.
check("incidental activity does not move the warning deadline either",
  S.inspect().idleDeadline === idleDeadlineAtOpen);
check("incidental activity does not move the controller out of warning",
  S.inspect().state === "warning");

section("timeout controller: Escape cannot silently bypass the decision");
let prevented = false;
const ev = (key, shiftKey) => ({ key, shiftKey: !!shiftKey, preventDefault() { prevented = true; } });
S.safetyKeydown(ev("Escape"));
check("Escape is swallowed in timeout mode", prevented);
check("Escape leaves the timeout warning OPEN — the extension must be explicit",
  dialogOpen() && S.inspect().state === "warning");

section("timeout controller: focus trap");
const cancelBtn = el("sessionSafetyCancel");
const confirmBtn = el("sessionSafetyConfirm");
el("sessionSafetyDialog").children = [el("sessionSafetyTitle"), cancelBtn, confirmBtn];
el("sessionSafetyDialog").descendants = [el("sessionSafetyTitle"), cancelBtn, confirmBtn];
doc.activeElement = confirmBtn;  prevented = false;
S.safetyKeydown(ev("Tab"));
check("Tab from the last control wraps to the first",
  prevented && doc.activeElement === el("sessionSafetyTitle"));
doc.activeElement = el("sessionSafetyTitle"); prevented = false;
S.safetyKeydown(ev("Tab", true));
check("Shift+Tab from the first control wraps to the last",
  prevented && doc.activeElement === confirmBtn);
doc.activeElement = drawerBtn; prevented = false;   // focus escaped behind the dialog
S.safetyKeydown(ev("Tab"));
check("Tab from outside the dialog is pulled back in",
  prevented && doc.activeElement === el("sessionSafetyTitle"));

section("timeout controller: the late reminder is announced once, not per second");
clock.advance(S.policy.graceMs - S.policy.finalAnnounceMs + 200);
const liveText = el("sessionSafetyLive").textContent;
check("a single late reminder is announced", /clears in about \d+ seconds/.test(liveText));
check("the reminder is not re-announced on the next tick",
  (clock.advance(S.policy.tickMs * 3), el("sessionSafetyLive").textContent === liveText));
check("the visual meter DID keep counting down honestly",
  parseInt(el("sessionSafetyMeterText").textContent, 10)
    < parseInt(liveText.replace(/\D+/g, ""), 10) + 1);

section("Continue restores the exact prior layer and focus");
win.safetyDialogCancel();
check("warning is closed", !dialogOpen());
check("the closed dialog no longer advertises a mode",
  el("sessionSafetyDialog").getAttribute("data-mode") === null);
check('closed dialog is inert again', el("sessionSafetyDialog").hasAttribute("inert"));
check('closed dialog is aria-hidden again',
  el("sessionSafetyDialog").getAttribute("aria-hidden") === "true");
check("backdrop hidden again", el("sessionSafetyBackdrop").hidden === true);
check("REGRESSION: background inert released", !drawer.hasAttribute("inert"));
check("Results is not left inert", !resultsScreen.hasAttribute("inert"));
check("the drawer the customer had open is still open", drawer.classList.contains("drawer-open"));
check("the financing sheet the customer had open is still open", sheet.hidden === false);
check("focus is restored to the EXACT pre-warning element", doc.activeElement === drawerBtn);
// An opener that stops being reachable while the dialog is open. Work that is
// legitimately allowed to finish during the customer's OWN session can hide it
// — the send-completion path sets #emailCaptureView to display:none, and that
// container holds the "Start over" button which opens this very dialog.
// focus() on a hidden or detached element does nothing and leaves focus on
// BODY, so the target has to be checked, not trusted.
{
  const hiddenOpener = makeEl("emailStartOver");
  const activeScreen = el("emailScreen");
  activeScreen.classList.add("active");
  el("resultsScreen").classList.remove("active");

  // (a) still reachable -> exact restoration, unchanged behaviour
  hiddenOpener.focus();
  S.openSafety("restart");
  win.safetyDialogCancel();
  check("a reachable opener still receives exact focus", doc.activeElement === hiddenOpener);

  // (b) hidden by same-session async completion while the dialog was open
  hiddenOpener.focus();
  S.openSafety("restart");
  hiddenOpener.offsetParent = null;          // its container went display:none
  win.safetyDialogCancel();
  check("REGRESSION: a hidden opener does NOT receive focus", doc.activeElement !== hiddenOpener);
  check("focus lands on a valid visible destination instead",
    doc.activeElement === activeScreen);

  // (c) detached from the document entirely
  const detached = makeEl("detachedOpener");
  detached.focus();
  S.openSafety("restart");
  detached.isConnected = false;
  win.safetyDialogCancel();
  check("REGRESSION: a detached opener does NOT receive focus", doc.activeElement !== detached);
  check("focus again lands on the active screen", doc.activeElement === activeScreen);

  // (d) hidden via the hidden attribute
  const attrHidden = makeEl("attrHiddenOpener");
  attrHidden.focus();
  S.openSafety("restart");
  attrHidden.hidden = true;
  win.safetyDialogCancel();
  check("REGRESSION: an opener with [hidden] does NOT receive focus", doc.activeElement !== attrHidden);
  check("focus still lands on the active screen", doc.activeElement === activeScreen);

  activeScreen.classList.remove("active");
  el("resultsScreen").classList.add("active");
}

// A LAYER THAT APPEARED WHILE THE DIALOG WAS OPEN OUTRANKS THE STORED OPENER.
//
// The data-error overlay can be raised by a data load completing behind this
// dialog. It is a body child, so inertBackgroundForSafety() has already marked
// it inert — which is why its own focus call is a no-op and the failure is
// never announced — and releaseSafetyInert() then makes it reachable again a
// few lines before the restore. Restoring the opener captured BEFORE it existed
// puts focus behind a visible alertdialog, and isFocusRestorable() cannot catch
// that: it tests connectedness, hidden, disabled and a box, and nothing about
// being covered by a modal.
{
  const errorLayer = el("dataErrorOverlay");
  const priorOpener = makeEl("layerOrderOpener");
  const activeScreen = el("resultsScreen");
  activeScreen.classList.add("active");
  // The layer's own two controls, so "was the opener inside this layer" is a
  // real containment question rather than one the shim answers by default.
  const errRetry = el("dataErrorRetryBtn");
  const errRestart = el("dataErrorRestartBtn");
  errorLayer.descendants = [errRetry, errRestart];

  // (a) the ordering that was broken: overlay appears DURING the dialog
  priorOpener.focus();
  S.openSafety("restart");
  check("the dialog inerted the data-error overlay as a body child",
    errorLayer.hasAttribute("inert"));
  errorLayer.classList.add("visible");        // a load failed behind the dialog
  errorLayer.setAttribute("aria-hidden", "false");
  win.safetyDialogCancel();
  check("closing the dialog releases the overlay's inert mark",
    !errorLayer.hasAttribute("inert"));
  check("REGRESSION: focus goes to the visible alertdialog, not behind it",
    doc.activeElement === errorLayer);
  check("...and specifically NOT to the opener stored before it existed",
    doc.activeElement !== priorOpener);

  // (b) the same handoff from the fallback branch — an unreachable opener must
  // not route round it into the active screen underneath the overlay.
  priorOpener.focus();
  S.openSafety("restart");
  priorOpener.offsetParent = null;            // opener stopped being reachable
  win.safetyDialogCancel();
  check("the fallback branch hands off to the overlay too",
    doc.activeElement === errorLayer && doc.activeElement !== activeScreen);
  priorOpener.offsetParent = {};

  // (c) THE PRE-EXISTING-OVERLAY ORDERING. The layer was already up and the
  // customer was ON one of its controls when the dialog opened, so the stored
  // opener IS that control. Focusing the root here would re-announce the whole
  // dialog and discard the exact position — the thing _safetyReturnFocus
  // exists to preserve. Being visible is not grounds to outrank an opener that
  // lives inside the visible layer.
  errorLayer.classList.add("visible");
  errorLayer.setAttribute("aria-hidden", "false");
  errRetry.focus();
  check("precondition: the customer is on Try again, overlay already up",
    doc.activeElement === errRetry && errorLayer.classList.contains("visible"));
  S.openSafety("timeout");
  win.safetyDialogCancel();
  check("REGRESSION: the exact control is restored, not the dialog root",
    doc.activeElement === errRetry);
  check("...and the root is specifically NOT re-focused",
    doc.activeElement !== errorLayer);

  // The other control too, so this is not passing on one hard-coded element.
  errRestart.focus();
  S.openSafety("restart");
  win.safetyDialogCancel();
  check("Start over is restored exactly too", doc.activeElement === errRestart);

  // An opener inside the layer that stopped being reachable still falls back
  // to the layer root, never to something behind it.
  errRetry.focus();
  S.openSafety("restart");
  errRetry.offsetParent = null;
  win.safetyDialogCancel();
  check("an unreachable opener INSIDE the layer routes to the layer root",
    doc.activeElement === errorLayer);
  errRetry.offsetParent = {};

  // (d) the ordering that already worked must keep working: the overlay is
  // recovered and hidden while the dialog is open, so it is NOT the destination.
  errorLayer.classList.remove("visible");
  errorLayer.setAttribute("aria-hidden", "true");
  priorOpener.focus();
  S.openSafety("restart");
  win.safetyDialogCancel();
  check("a hidden overlay is not a focus destination",
    doc.activeElement === priorOpener);

  activeScreen.classList.remove("active");
  drawerBtn.focus();
}

// The ordinary timeout case: nobody was interacting, so there IS no prior
// focus. Falling back to BODY would drop a keyboard/AT user at the top of the
// document with no context for the dialog that just closed.
{
  doc.activeElement = doc.body;               // genuinely idle tablet
  el("resultsScreen").classList.add("active");
  S.openSafety("timeout");
  check("warning still opens with no prior focus", dialogOpen());
  win.safetyDialogCancel();
  check("REGRESSION: Continue does not dump focus on BODY", doc.activeElement !== doc.body);
  check("it lands on the screen the customer was actually on",
    doc.activeElement === el("resultsScreen"));
  check("the fallback target is programmatic-only (no new Tab stop)",
    el("resultsScreen").getAttribute("tabindex") === "-1");
  el("resultsScreen").classList.remove("active");
  drawerBtn.focus();
}
check("controller is active again", S.inspect().state === "active");
check("Continue granted a FULL new activity window",
  S.inspect().idleDeadline === NOW + S.policy.idleWarningMs);
check("no wipe ran at any point", callsTo("showScreen") === 0);

section("warning and extension repeat");
clock.advance(S.policy.idleWarningMs + S.policy.tickMs);
check("a second warning opens after the extension elapses", dialogOpen());
win.safetyDialogCancel();
check("Continue works a second time", !dialogOpen() && S.inspect().state === "active");
clock.advance(S.policy.idleWarningMs + S.policy.tickMs);
check("a third warning opens", dialogOpen());
win.safetyDialogCancel();
check("Continue works a third time", !dialogOpen() && S.inspect().state === "active");
check("still no wipe after three extensions", callsTo("showScreen") === 0);

section("visibility / pageshow reconciliation");
S.restart();
calls.length = 0;
// The tablet sleeps: the wall clock moves but no timer callback ever fires.
clock.jump(S.policy.idleWarningMs * 3);
check("no warning yet — no timer could have fired while suspended", !dialogOpen());
S.reconcile();                                  // what visibilitychange/pageshow do
check("reconciliation opens the warning immediately on wake", dialogOpen());
check("REGRESSION: a long sleep still does NOT jump straight to a wipe",
  S.inspect().state === "warning" && callsTo("showScreen") === 0);
// And a sleep that outlives the grace period too:
clock.jump(S.policy.graceMs * 3);
S.reconcile();
check("a sleep past the grace deadline wipes on reconcile", callsTo("showScreen") === 1);
check("the wipe returned to Welcome", calls.filter(c => c.name === "showScreen").pop().args[0] === "welcomeScreen");
check("controller was restarted active by the wipe", S.inspect().state === "active");

section("no stale timer can wipe a fresh session");
S.restart();
const epochBefore = S.inspect().epoch;
let staleRan = false;
outer.sessionTimeout(() => { staleRan = true; }, 50);
check("a session timer is registered", S.inspect().timers === 1);
S.reset({ reason: "test" });
check("the wipe cleared every registered session timer", S.inspect().timers === 0);
check("the wipe rotated the session epoch", S.inspect().epoch > epochBefore);
clock.advance(500);
check("REGRESSION: a stale session timer cannot run against the new session", !staleRan);

// The hazard clearTimeout alone cannot cover: two timers due in the SAME tick,
// where the first one wipes. The second was already dispatched by the event
// loop, so clearing the registry no longer reaches it — only the epoch does.
S.restart();
let dispatchedRan = false;
outer.sessionTimeout(() => { S.reset({ reason: "same_tick_wipe" }); }, 40);
outer.sessionTimeout(() => { dispatchedRan = true; }, 40);
clock.advance(100);
check("REGRESSION: a timer already dispatched in the wipe's own tick is rejected",
  !dispatchedRan);

// ===========================================================================
// 5. RESTART
// ===========================================================================
section("restart: confirmation, not immediate destruction");
S.restart();
calls.length = 0;
const resultsCard = el("someResultCard");
resultsCard.focus();
win.requestStartOver();
check("restart opens the confirmation", dialogOpen());
check("dialog is in restart mode", el("sessionSafetyDialog").getAttribute("data-mode") === "restart");
check("restart title is the required copy", el("sessionSafetyTitle").textContent === "Start a new customer?");
check("restart body is the required copy",
  el("sessionSafetyBody").textContent
    === "This clears the current answers, mattress selections, and Sleep Plan.");
check("restart actions are Keep / Start new customer",
  el("sessionSafetyCancel").textContent === "Keep this session"
  && el("sessionSafetyConfirm").textContent === "Start new customer");
check("the remaining-time meter is hidden in restart mode", el("sessionSafetyMeter").hidden === true);
check("REGRESSION: nothing was wiped by opening restart", callsTo("showScreen") === 0);
check("focus entered the dialog", doc.activeElement === el("sessionSafetyTitle"));

section("restart: Cancel preserves state and focus");
outer.seed({ answers: { firmness: "medium" }, currentQuestion: 4 });
win.safetyDialogCancel();
check("confirmation closed", !dialogOpen());
check("REGRESSION: no wipe on cancel", callsTo("showScreen") === 0);
check("answers survived cancel", probe().answers.firmness === "medium");
check("question position survived cancel", probe().currentQuestion === 4);
check("focus restored to the exact opener", doc.activeElement === resultsCard);
check("background inert released on cancel", S.inspect().inerted === 0);

section("restart: Escape acts as Keep this session");
resultsCard.focus();
win.requestStartOver();
prevented = false;
S.safetyKeydown(ev("Escape"));
check("Escape is handled", prevented);
check("Escape closed the restart confirmation", !dialogOpen());
check("Escape did NOT wipe", callsTo("showScreen") === 0);
check("Escape restored focus", doc.activeElement === resultsCard);

section("restart: the confirmation switches language");
win.requestStartOver();
DICT = dictEs;
S.renderSafety();
check("open confirmation relocalises to Spanish",
  el("sessionSafetyTitle").textContent === dictEs["safety.restart_title"]);
check("Spanish is a real translation, not the English string",
  el("sessionSafetyTitle").textContent !== dictEn["safety.restart_title"]);
check("no stale English fragment is left in the body",
  el("sessionSafetyBody").textContent === dictEs["safety.restart_body"]);
DICT = dictEn;
S.renderSafety();
check("switching back restores English", el("sessionSafetyTitle").textContent === dictEn["safety.restart_title"]);

section("no two dialogs can stack");
check("restart confirmation is open", dialogOpen() && el("sessionSafetyDialog").getAttribute("data-mode") === "restart");
const inertedDuringRestart = S.inspect().inerted;
S.openSafety("timeout");
check("the timeout warning SUPERSEDES it in the same node",
  dialogOpen() && el("sessionSafetyDialog").getAttribute("data-mode") === "timeout");
check("the background was not inerted a second time (no nested restore)",
  S.inspect().inerted === inertedDuringRestart);
win.safetyDialogCancel();
check("one Cancel fully unwinds — no orphan dialog left behind",
  !dialogOpen() && S.inspect().inerted === 0 && S.inspect().mode === null);

section("confirmed restart runs the authoritative wipe exactly once");
S.restart();
calls.length = 0;
win.requestStartOver();
win.safetyDialogConfirm();
check("confirmed restart wiped", callsTo("showScreen") === 1);
check("it returned to Welcome", calls.filter(c => c.name === "showScreen").pop().args[0] === "welcomeScreen");
check("the confirmation is closed and inert",
  !dialogOpen() && el("sessionSafetyDialog").hasAttribute("inert"));
win.safetyDialogConfirm();      // second tap on a torn-down control
check("a second confirm is inert (no double wipe)", callsTo("showScreen") === 1);

section("window.startOver() still exists and delegates");
check("window.startOver is a function", typeof win.startOver === "function");
calls.length = 0;
win.startOver();
check("startOver() performs the wipe", callsTo("showScreen") === 1);
check("startOver() delegates rather than reimplementing the reset",
  /window\.startOver = function\(\) \{\s*return resetSessionState\(/.test(SOURCE));
check("there is exactly ONE reset implementation",
  (SOURCE.match(/function resetSessionState\(/g) || []).length === 1);

section("the wipe is re-entrant safe");
calls.length = 0;
S.reset({ reason: "a" });
S.reset({ reason: "b" });
check("two SEQUENTIAL wipes each complete", callsTo("showScreen") === 2);
check("the wipe flag is released afterwards", S.inspect().wiping === false);

// Genuine re-entrancy: a wipe triggered from inside a wipe. The real shapes are
// a grace deadline expiring in the same frame as a confirmed restart, and a
// double tap on "Start new customer". Both land as a nested call.
calls.length = 0;
const realClose = win.closeMattressDrawer;
let nested = 0;
win.closeMattressDrawer = (o) => {
  realClose(o);
  if (nested++ === 0) S.reset({ reason: "nested" });   // re-enter mid-wipe
};
S.reset({ reason: "outer" });
win.closeMattressDrawer = realClose;
check("REGRESSION: a wipe re-entered mid-wipe does not run a second reset",
  callsTo("showScreen") === 1);
check("the re-entrant attempt did not leave the wipe flag stuck",
  S.inspect().wiping === false);

// ===========================================================================
// 6. WIPE MATRIX — seed a sentinel everywhere, prove every one is gone
// ===========================================================================
section("wipe matrix: seeding");
const SENTINEL = "PRIOR-CUSTOMER-DATA-a9f3";

// module state
//
// The Payment Choice half is a REALISTIC dirty D4 session rather than three
// truthy placeholders: a customer who opened three payment paths in order,
// settled on the second of them, left two disclosure panels expanded, and was
// last shown the generic notice because one path's exact terms were stale.
// Path ids are in the shipped canonical KIND-ENCODED form (finPathId), and the
// preference is one of the explored ids — a preference pointing at a path that
// was never explored is not a state the app can reach, and seeding one would
// let a wipe that only clears history look like it cleared everything.
//
// Identity is captured, not just contents: the wipe must REBIND payExplored
// and payOpen, not empty the previous customer's array/object in place.
const PAY_SEED_EXPLORED = ["promo-Synchrony", "plan-lacks-in-house", "scenario-mexico-delivery"];
const PAY_SEED_OPEN = { "plan-lacks-in-house": true, "scenario-mexico-delivery": true };
outer.seed({
  currentQuestion: 7,
  answers: { firmness: SENTINEL, position: SENTINEL },
  editingFromReview: true,
  resultsState: { activeTier: "silver", matches: [SENTINEL] },
  currentLang: "es",
  payExplored: PAY_SEED_EXPLORED,
  payPref: "plan-lacks-in-house",
  payOpen: PAY_SEED_OPEN,
  finSheetStale: true,
  finImpression: true,
  financeReturnFocus: el("someResultCard"),
});
check("seeded: a dirty Payment Choice session (3 explored, 1 preferred, 2 open)",
  probe().payExplored.length === 3 && probe().payPref === "plan-lacks-in-house"
  && Object.keys(probe().payOpen).length === 2 && probe().finSheetStale === true);
check("seeded: the preference is one of the explored paths, as the app enforces",
  probe().payExplored.indexOf(probe().payPref) !== -1);

// window state
win._savedPicks = [{ id: "g1", name: SENTINEL }];
win._mattressReactions = { g1: "firm" };
win._favoriteMattressId = "g1";
win._compareSelected = ["g1", "g2"];
win._compareOrigin = "review";
win._accCart = { pillow1: true, protector1: true };
win._finalistAccessoryPromptShown = true;
win._drawerOrder = ["g1", "g2", "g3"];
win._drawerCurrentIndex = 2;
win._currentDrawerMattressId = "g3";
win._drawerData = { g1: { reasons: [SENTINEL] } };
win._sleepSystemState = {
  activeStep: "protection", decisions: { adjustability: SENTINEL },
  demoPosition: SENTINEL, supportChoice: SENTINEL, pillowCandidateId: SENTINEL,
  pillowReaction: SENTINEL, pillowFeedback: SENTINEL, protectionGoal: SENTINEL,
};
win._profileRevealInFlight = true;
win._resultsRevealInFlight = true;

// analytics
const A = outer.analytics;
A.sessionId = "OLD-SESSION-ID";
A.startedAt = 111; A.completedAt = 222;
A.answers = { firmness: SENTINEL };
A.resultsViewed = true; A.accessoriesViewed = true;
A.tierViews = { gold: 3, silver: 2, bronze: 1 };
A.cardExpands = { g1: 2 };
A.topPick = { id: "g1", name: SENTINEL };
A.allMatches = [{ id: "g1", name: SENTINEL }];
A.recommendedAccessories = [SENTINEL];
A.selectedAccessories = [SENTINEL];
A.profileName = SENTINEL; A.profileBrief = SENTINEL;
A.profileBriefByLang = { en: SENTINEL };
// The 0.5 widened element shape: the wipe must clear the prose pairs along
// with the names — one sentinel-bearing element in the real stored shape, so
// the session_ended-diagnostic assertion covers the new fields for free.
A.trialFocus = [{ en: SENTINEL, es: SENTINEL,
  why: { en: SENTINEL, es: SENTINEL }, test: { en: SENTINEL, es: SENTINEL } }];
A.profileSubtitle = SENTINEL; A.profileSubtitleByLang = { en: SENTINEL };
A.events = [{ ev: "quiz_started" }, { ev: "results_viewed" }];

// contact values — including the attribute path that survives form.reset()
for (const id of CONTACT_IDS) {
  const input = el(id);
  input.value = SENTINEL;
  input.defaultValue = SENTINEL;
  input.setAttribute("value", SENTINEL);
}
el("emailContactForm").children = CONTACT_IDS.map(el);

// Generated content and short strings.
//
// These two lists are the TEST's own contract, deliberately NOT read out of
// index.html. Deriving the expectation from the implementation's inventory
// would make it self-certifying: deleting an id from the app would silently
// delete the assertion that covers it. Every entry below is a container the
// app renders customer-derived content into and rebuilds on its own render
// path.
const REQUIRED_CONTENT_IDS = [
  "questionContainer", "reviewList",
  // Slice 2 (D1 recomposition): the meta strip and the journey rail are gone
  // from the Sleep Brief; the hero line, the reflection and the three
  // Sleep Signature stamps are the customer-derived containers that replaced
  // them, and each must be owned by the wipe.
  "profileName", "profilePriorities", "profileSignature", "profileHero",
  "profileReflection", "profileSecondary", "profileCta",
  "resultsSignature", "hf2Signature",
  "resultsHeadline", "tierTabs", "tierDescriptor", "topPickContainer",
  "supportingRow", "resultsTrialFocus",
  "drawerName", "drawerDifferentiators", "drawerTryPrompts", "drawerPromotionDetail",
  "compareCols", "compareTraySlots",
  "hf2PicksList", "hf2AccessoriesList", "hf2BriefWho", "hf2BriefContext",
  "hf2BriefProfile", "hf2SleepSystemSection", "hf2Priorities",
  // Slice 4 (D4): the three containers built from Payment Choice state. The
  // sheet cards carry the disclosure panels and the Consider/Clear controls;
  // the handoff block names the considered path and lists the explored ones.
  // Left behind, they are the previous customer's payment position rendered as
  // text over the next customer's session.
  "financingSheetCards", "hf2FinancingInterest", "hf2FinancingPrograms",
  "emailPreview", "emailRecap", "accessoriesGrid",
  // Trust gate (2026-08-21): the four Sleep System containers hold
  // answer-derived prose; "Restart clears them" must be true of the DOM, not
  // only of the visible surfaces.
  "sleepSystemMain", "sleepSystemGuidance", "sleepSystemRail", "sleepSystemPlanList",
];
const REQUIRED_TEXT_IDS = [
  "dreamCodeValue", "dreamCodePct", "emailError", "drawerNavLabel", "accStatus",
  // Trust gate (2026-08-21): the drawer's answer-derived text targets.
  "drawerShortlistFit", "drawerSystemPromptTitle", "drawerSystemPromptReason",
  // Three separate financing regions on purpose: freshness, the sheet's
  // Consider/Clear announcement (new in Slice 4), and the handoff's
  // Not-right-now announcement. Each keeps its last utterance until something
  // overwrites it, so each must be emptied by the wipe.
  "hf2FinancingStatus", "financingSheetStatus", "financingSheetAction",
  "sessionSafetyLive",
  "resultsRevealTitle", "resultsRevealSubtitle",
  "revealCertCode", "revealCertPctNum", "revealCertScope", "revealCertExpiry",
  "revealCertTerms",
];
// Also seed anything the implementation lists beyond the required set, so a
// LARGER inventory is exercised too — but never a smaller expectation.
const implContent = ((SOURCE.match(/var SESSION_CONTENT_IDS = \[([\s\S]*?)\];/) || [, ""])[1]
  .match(/'([^']+)'/g) || []).map(s => s.replace(/'/g, ""));
const implText = ((SOURCE.match(/var SESSION_TEXT_IDS = \[([\s\S]*?)\];/) || [, ""])[1]
  .match(/'([^']+)'/g) || []).map(s => s.replace(/'/g, ""));
const CONTENT_IDS = [...new Set([...REQUIRED_CONTENT_IDS, ...implContent])];
const TEXT_IDS = [...new Set([...REQUIRED_TEXT_IDS, ...implText])];
const missingContent = REQUIRED_CONTENT_IDS.filter(id => !implContent.includes(id));
const missingText = REQUIRED_TEXT_IDS.filter(id => !implText.includes(id));
check(`every required content container is in the app's inventory${missingContent.length ? " — missing: " + missingContent.join(", ") : ""}`,
  missingContent.length === 0);
check(`every required text region is in the app's inventory${missingText.length ? " — missing: " + missingText.join(", ") : ""}`,
  missingText.length === 0);
CONTENT_IDS.forEach(id => { el(id).innerHTML = `<p>${SENTINEL}</p>`; });
TEXT_IDS.forEach(id => { el(id).textContent = SENTINEL; });

el("privacyOverlay").classList.add("visible");
el("compareModal").classList.add("visible");
el("compareModal").style.display = "flex";
el("compareTray").style.display = "block";
el("discountRevealOverlay").style.display = "flex";
el("resultsRevealOverlay").classList.add("is-visible");
el("resultsRevealOverlay").setAttribute("aria-hidden", "false");
el("accCartBar").classList.add("visible");
el("savedPicksBtn").classList.add("noct-picks-pill--visible");
el("emailConfirmation").classList.add("visible");
el("hf2DiscountBtn").classList.add("hf2-discount-btn--revealed");
el("profileScreen").classList.add("animate");
el("dreamCodeBox").hidden = false;
el("financingSheet").hidden = false;
el("emailSendBtn").classList.add("sent");
el("emailSendBtn").disabled = true;
// Phase 0.4: the data-error overlay used to be ABSENT from the layer
// inventory. A wipe left it stranded — visible and aria-hidden="false" — over
// the fresh Welcome screen whose Start button focusWelcomeEntry() had just
// focused underneath it. Seeded in the state a wipe landing mid-retry finds.
el("dataErrorOverlay").classList.add("visible");
el("dataErrorOverlay").setAttribute("aria-hidden", "false");
el("dataErrorOverlay").setAttribute("aria-busy", "true");
el("dataErrorOverlay").style.display = "flex";
// an in-flight session timer and an open drawer over the email screen
let ghostRan = false;
outer.sessionTimeout(() => { ghostRan = true; }, 60);
drawer.classList.add("drawer-open");
drawer.removeAttribute("inert");
el("emailScreen").classList.add("active");
el("welcomeScreen").classList.remove("active");
// and an open timeout warning over all of it (the email-screen timeout path)
S.openSafety("timeout");
check("seeded: warning open over the email screen with contact values entered",
  dialogOpen() && el("emailInput").value === SENTINEL);

section("wipe matrix: invoke the REAL wipe");
appCalls.length = 0;
calls.length = 0;
S.reset({ reason: "wipe_matrix" });

check("drawer was unwound immediately, without focus restore",
  appCalls.some(c => c.fn === "closeMattressDrawer" && c.o
    && c.o.immediate === true && c.o.restoreFocus === false));
check("the drawer is unwound BEFORE the rest of the reset runs",
  appCalls[0] && appCalls[0].fn === "closeMattressDrawer");
check("financing sheet closed", appCalls.some(c => c.fn === "closeFinancingSheet"));
check("compare modal closed", appCalls.some(c => c.fn === "closeCompareModal"));
check("financing sheet's stored opener was nulled BEFORE closing it",
  probe().financeReturnFocus === null);
// Both halves, and EXACTLY once each. Cancelling the queued announcement
// without emptying the regions leaves the departing customer's last spoken
// sentence sitting in a live region over the next Welcome screen; emptying the
// regions without cancelling lets a queued utterance repopulate one right
// after the wipe. Two calls each would mean the wipe runs a payment teardown
// twice, which is how a partially-rebuilt next session gets clobbered.
check("queued Payment Choice announcement work cancelled exactly once",
  callsTo("cancelPayAnnouncePending") === 1);
check("both preference-action regions dropped exactly once",
  callsTo("clearPayAnnouncements") === 1);

section("wipe matrix: module state");
check("currentQuestion reset", probe().currentQuestion === 0);
check("answers cleared", Object.keys(probe().answers).length === 0);
check("editingFromReview cleared", probe().editingFromReview === false);
check("results cache cleared", probe().resultsState === null);
check("financing impression flag cleared", probe().finImpression === false);

section("wipe matrix: Payment Choice (D4)");
// The customer's payment position is the most sensitive non-contact state the
// session holds: it is what someone would read off an unattended showroom
// tablet to learn that the previous customer was considering a credit-building
// plan. All three dimensions plus the sheet's freshness flag are cleared here,
// and the emptiness is checked separately from the REBINDING.
check("explored history cleared", probe().payExplored.length === 0);
check("...and it is a FRESH array — the previous customer's is not reused",
  Array.isArray(probe().payExplored) && probe().payExplored !== PAY_SEED_EXPLORED);
check("...so a reference the departing session still holds cannot repopulate it",
  PAY_SEED_EXPLORED.length === 3 && probe().payExplored.length === 0);
check("the preference is cleared, not merely replaced", probe().payPref === null);
check("no disclosure panel survives", Object.keys(probe().payOpen).length === 0);
check("...and payOpen is a FRESH object", probe().payOpen !== PAY_SEED_OPEN);
check("the sheet's stale-terms flag cleared", probe().finSheetStale === false);

section("wipe matrix: window state");
check("saved picks cleared", win._savedPicks.length === 0);
check("mattress reactions cleared", Object.keys(win._mattressReactions).length === 0);
check("favorite/finalist id cleared", win._favoriteMattressId === "");
check("comparison selection cleared", win._compareSelected.length === 0);
check("comparison origin cleared", win._compareOrigin === "");
check("accessory cart cleared", Object.keys(win._accCart).length === 0);
check("finalist accessory prompt flag cleared", win._finalistAccessoryPromptShown === false);
check("drawer order cleared", win._drawerOrder.length === 0);
check("drawer index cleared", win._drawerCurrentIndex === 0);
check("current drawer mattress cleared", win._currentDrawerMattressId === "");
check("per-customer drawer match data cleared", Object.keys(win._drawerData).length === 0);
check("every Sleep System decision field cleared",
  win._sleepSystemState.activeStep === "adjustability"
  && Object.keys(win._sleepSystemState.decisions).length === 0
  && ["demoPosition", "supportChoice", "pillowCandidateId", "pillowReaction",
      "pillowFeedback", "protectionGoal"].every(k => win._sleepSystemState[k] === ""));
check("reveal in-flight flags cleared",
  win._profileRevealInFlight === false && win._resultsRevealInFlight === false);

section("wipe matrix: contact values");
for (const id of CONTACT_IDS) {
  const input = el(id);
  check(`REGRESSION: ${id}.value === ""`, input.value === "");
  check(`${id}.defaultValue cannot restore the old content`, input.defaultValue === "");
  check(`${id} value ATTRIBUTE removed`, input.getAttribute("value") === null);
}
check("validation error cleared", el("emailError").textContent === "");
check("send button state reset",
  !el("emailSendBtn").classList.contains("sent")
  && !el("emailSendBtn").classList.contains("sending")
  && el("emailSendBtn").disabled === false);
check("saved-confirmation view is not left visible",
  !el("emailConfirmation").classList.contains("visible"));
check("capture view is restored for the next customer", el("emailCaptureView").style.display === "");

section("wipe matrix: generated content and announcement regions");
const contentLeaks = CONTENT_IDS.filter(id => el(id).innerHTML.includes(SENTINEL));
check(`no prior-customer content survives (${CONTENT_IDS.length} containers checked)`,
  contentLeaks.length === 0);
if (contentLeaks.length) console.log("      leaked:", contentLeaks.join(", "));
const textLeaks = TEXT_IDS.filter(id => el(id).textContent.includes(SENTINEL));
check(`no prior-customer string survives (${TEXT_IDS.length} regions checked)`, textLeaks.length === 0);
if (textLeaks.length) console.log("      leaked:", textLeaks.join(", "));

section("wipe matrix: layers");
check("privacy overlay closed", !el("privacyOverlay").classList.contains("visible"));
check("compare modal closed",
  !el("compareModal").classList.contains("visible") && el("compareModal").style.display === "none");
check("compare tray hidden", el("compareTray").style.display === "none");
check("discount reveal overlay closed", el("discountRevealOverlay").style.display === "none");
check("results reveal overlay closed and aria-hidden",
  !el("resultsRevealOverlay").classList.contains("is-visible")
  && el("resultsRevealOverlay").getAttribute("aria-hidden") === "true");
check("cart bar hidden", el("accCartBar").style.display === "none");
check("saved-picks pill hidden", !el("savedPicksBtn").classList.contains("noct-picks-pill--visible"));
check("dream code box hidden", el("dreamCodeBox").hidden === true);
check("financing sheet hidden", el("financingSheet").hidden === true);
check("discount reveal state on the handoff button cleared",
  !el("hf2DiscountBtn").classList.contains("hf2-discount-btn--revealed"));
check("profile animate class cleared", !el("profileScreen").classList.contains("animate"));
check("data-error overlay closed, aria-hidden RESTORED, and no longer busy",
  !el("dataErrorOverlay").classList.contains("visible")
  && el("dataErrorOverlay").getAttribute("aria-hidden") === "true"
  && el("dataErrorOverlay").getAttribute("aria-busy") === "false"
  && el("dataErrorOverlay").style.display === "none");
check("safety dialog closed, inert and aria-hidden",
  !dialogOpen()
  && el("sessionSafetyDialog").hasAttribute("inert")
  && el("sessionSafetyDialog").getAttribute("aria-hidden") === "true");
check("no element is left inert by the safety dialog", S.inspect().inerted === 0);
check("Gate 1A: Results is NOT left inert", !resultsScreen.hasAttribute("inert"));
check("Welcome is the only active screen",
  el("welcomeScreen").classList.contains("active")
  && ["questionScreen", "reviewScreen", "profileScreen", "resultsScreen",
      "hf2Screen", "emailScreen", "accessoriesScreen"]
     .every(id => !el(id).classList.contains("active")));

section("wipe matrix: timers and analytics");
clock.advance(500);
check("an in-flight session timer cannot fire after the wipe", !ghostRan);
check("analytics answers cleared", Object.keys(A.answers).length === 0);
check("analytics profile text cleared",
  A.profileName === null && A.profileBrief === null && A.profileBriefByLang === null
  && A.profileSubtitle === null && A.profileSubtitleByLang === null);
check("analytics matches cleared", A.topPick === null && A.allMatches.length === 0);
check("analytics selections cleared",
  A.selectedAccessories.length === 0 && A.recommendedAccessories.length === 0
  && A.trialFocus.length === 0);
check("analytics view counters cleared",
  A.resultsViewed === false && A.accessoriesViewed === false
  && A.tierViews.gold === 0 && Object.keys(A.cardExpands).length === 0);
check("analytics timing cleared", A.startedAt === null && A.completedAt === null);
check("analytics event memory cleared", A.events.length === 0);
check("session id was rotated", A.sessionId !== "OLD-SESSION-ID");
{
  // Rotation must happen exactly once, and only after the prior session's
  // memory is gone — an early rotation would stamp the NEW id onto data that
  // still belongs to the departing customer.
  // NB: index.html is CRLF, so the terminator is matched as "\n<4 spaces>}"
  // without a trailing \n — the same shape the drawer suite uses.
  const body = (SOURCE.match(/function resetSessionState\(opts\) \{[\s\S]*?\n    \}/) || [""])[0];
  check("resetSessionState() body located for ordering checks", body.length > 0);
  const rotations = body.match(/analytics\.sessionId = /g) || [];
  check(`the session id is rotated exactly once in the wipe (found ${rotations.length})`,
    rotations.length === 1);
  check("the rotation happens AFTER the prior event memory is cleared",
    body.indexOf("analytics.events = []") !== -1
    && body.indexOf("analytics.events = []") < body.lastIndexOf("analytics.sessionId = "));
  check("the rotation happens AFTER the prior answers are cleared",
    body.indexOf("analytics.answers = {}") < body.lastIndexOf("analytics.sessionId = "));
}
const ended = calls.filter(c => c.name === "analytics.log" && c.args[0] === "session_ended").pop();
check("a session_ended event was logged", !!ended);
check("REGRESSION: the reset log carries NO raw answers or contact values",
  !!ended && !JSON.stringify(ended.args[1]).includes(SENTINEL));
check("the reset log carries safe aggregate counts instead",
  !!ended && typeof ended.args[1].answeredCount === "number"
  && typeof ended.args[1].savedPickCount === "number");

section("wipe matrix: language and next session");
check("language reset to English", callsTo("switchLanguage") >= 1
  && calls.filter(c => c.name === "switchLanguage").pop().args[0] === "en");
check("document language is English", doc.documentElement.lang === "en" || probe().currentLang === "en");
check("focus is not left on BODY or hidden content",
  doc.activeElement !== doc.body && doc.activeElement === el("startBtn"));
check("the English state is awaitable rather than assumed",
  S.languageSettled && typeof S.languageSettled.then === "function");
check("the idle controller is armed and active for the next customer",
  S.inspect().state === "active" && S.inspect().idleDeadline > NOW);
// and the next session can actually progress
S.activity();
clock.advance(S.policy.idleWarningMs - 100);
check("the next session runs without an immediate warning", !dialogOpen());
clock.advance(300);
check("the next session's own warning still arrives on policy", dialogOpen());
win.safetyDialogCancel();
check("and can be continued", !dialogOpen() && S.inspect().state === "active");

// ===========================================================================
// 6b. LANGUAGE TRANSACTION + PER-SCREEN CONTROLS — executed, not grepped
// ===========================================================================
section("language transaction: rapid EN -> ES -> EN");

function grabFn(re, what) {
  const m = html.match(re);
  check(`extracted ${what}`, !!m);
  return m ? m[0] : "";
}
const langSrc = [
  // The bounded-fetch helpers the dictionary now goes through. Extracted so
  // this harness executes the REAL request path rather than a shape that no
  // longer exists — without them fetchDictionary() throws a ReferenceError on
  // its first line and every language assertion below passes or fails for
  // reasons having nothing to do with the language transaction.
  grabFn(/var DATA_DEADLINE_MS = \d+;/, "DATA_DEADLINE_MS"),
  grabFn(/function dataDeadline\(work, label, controller\) \{[\s\S]*?\n    \}/, "dataDeadline()"),
  grabFn(/function boundedJson\(url, label, init\) \{[\s\S]*?\n    \}/, "boundedJson()"),
  grabFn(/async function fetchDictionary\(lang\) \{[\s\S]*?\n    \}/, "fetchDictionary()"),
  grabFn(/function requestedLangIsSupported\(lang\) \{[\s\S]*?\n    \}/, "requestedLangIsSupported()"),
  grabFn(/function updateLanguageControls\(\) \{[\s\S]*?\n    \}/, "updateLanguageControls()"),
  grabFn(/async function switchLanguage\(lang\) \{[\s\S]*?\n    \}/, "switchLanguage()"),
  grabFn(/function restoreLanguageFocus\(\) \{[\s\S]*?\n    \}/, "restoreLanguageFocus()"),
].join("\n");
const showScreenSrc = grabFn(/window\.showScreen = function\(id\) \{[\s\S]*?\n    \}/, "showScreen()");

// A document whose querySelectorAll understands the two selectors these
// functions use, plus a fetch we can resolve OUT OF ORDER.
const ldoc = makeDocument();
const SCREENS = ["welcomeScreen", "questionScreen", "reviewScreen", "profileScreen",
  "resultsScreen", "hf2Screen", "emailScreen", "accessoriesScreen"];
SCREENS.forEach(id => { ldoc.getElementById(id).classList.add("screen"); });
const langBtns = ["sessionLangEn", "sessionLangEs"].map((id, i) => {
  const b = ldoc.getElementById(id);
  b.setAttribute("data-lang", i === 0 ? "en" : "es");
  b.classList.add("session-utility__lang");
  return b;
});
ldoc.querySelectorAll = (sel) => {
  if (sel === ".screen") return SCREENS.map(id => ldoc.getElementById(id));
  if (sel && sel.includes("session-utility__lang")) return langBtns;
  return [];
};

let pendingFetches = [];
const fakeFetch = (url) => new Promise((resolve) => {
  pendingFetches.push({ url, resolve });
});
async function settleAll() {
  // Drain microtasks until nothing new is queued.
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

const lwin = { scrollTo() {}, _compareSelected: [], _setIdleScreen() {} };
const lcalls = [];
const langHarness = new Function(
  "document", "window", "fetch", "STORE_CONFIG_IN", "DICT_EN", "rec", "out",
  // The fetch deadline schedules a timer. Driven by the fake clock so a
  // deliberately unresolved request in the race below cannot hold a real
  // 12-second timer open and stall the suite.
  "setTimeout", "clearTimeout",
  `
  "use strict";
  var STORE_CONFIG = STORE_CONFIG_IN;
  var currentLang = 'en';
  var DICT = DICT_EN;
  var _langRequestSeq = 0;
  var _langFocusHintId = null;
  var _safetyMode = null;
  function safetyDialogMode() { return _safetyMode; }
  function t(k) { return DICT[k] || k; }
  function applyTranslations() { rec('applyTranslations'); }
  function applyStoreConfig() { rec('applyStoreConfig'); }
  // Slice 4: switchLanguage() drops both preference-action regions before
  // re-rendering the financing surfaces. Recorded so the assertion below can
  // prove the language switch is a COPY SWAP — it clears announcements and
  // nothing else.
  function clearPayAnnouncements() { rec('clearPayAnnouncements'); }
  function renderAllFinancingSurfaces() { rec('renderAllFinancingSurfaces'); }
  function renderSleepSystem() { rec('renderSleepSystem'); }
  function renderHf2() { rec('renderHf2'); }
  function showProfileScreen() { rec('showProfileScreen'); }
  function showEmailCapture() { rec('showEmailCapture'); }
  function _renderResults() { rec('_renderResults'); }
  function renderReview() { rec('renderReview'); }
  function renderSafetyDialog() { rec('renderSafetyDialog'); }
  function calculateScores() { rec('calculateScores'); return {}; }
  window.renderQuestion = function() { rec('renderQuestion'); };
  window.renderReview = renderReview;
  window.rerenderOpenMattressDrawer = function() { rec('rerenderOpenMattressDrawer'); return true; };
  ${langSrc}
  ${showScreenSrc}
  out.switchLanguage = switchLanguage;
  out.showScreen = window.showScreen;
  out.lang = function() { return currentLang; };
  out.dictKey = function() { return DICT.__id; };
  `
);
const lout = {};
langHarness(ldoc, lwin, fakeFetch, { languages: ["en", "es"] },
  Object.assign({ __id: "EN" }, dictEn), (n) => lcalls.push(n), lout,
  clock.setTimeout, clock.clearTimeout);

// Quiz is mid-flight on the question screen, with contact values entered.
ldoc.getElementById("questionScreen").classList.add("active");
const p1 = lout.switchLanguage("en");   // token 1
const p2 = lout.switchLanguage("es");   // token 2
const p3 = lout.switchLanguage("en");   // token 3 — the newest selection
check("three dictionary requests are in flight", pendingFetches.length === 3);
check("currentLang follows the newest selection SYNCHRONOUSLY", lout.lang() === "en");
check("document language follows synchronously too", ldoc.documentElement.lang === "en");
check("the EN control is pressed immediately, before any fetch resolves",
  langBtns[0].getAttribute("aria-pressed") === "true"
  && langBtns[1].getAttribute("aria-pressed") === "false");

// Resolve OUT OF ORDER: the newest first, then the stale Spanish response.
pendingFetches[2].resolve({ ok: true, status: 200, json: async () => Object.assign({ __id: "EN" }, dictEn) });
pendingFetches[0].resolve({ ok: true, status: 200, json: async () => Object.assign({ __id: "EN" }, dictEn) });
pendingFetches[1].resolve({ ok: true, status: 200, json: async () => Object.assign({ __id: "ES" }, dictEs) });
await Promise.all([p1, p2, p3]);
await settleAll();
check("REGRESSION: a late Spanish response cannot win — dictionary is English",
  lout.dictKey() === "EN");
check("the ES request reported that it was superseded", (await p2) === false);
check("the winning EN request reported success", (await p3) === true);
check("document language ended English", ldoc.documentElement.lang === "en");
check("controls ended in the English pressed state",
  langBtns[0].getAttribute("aria-pressed") === "true"
  && langBtns[1].getAttribute("aria-pressed") === "false");
check("the current screen was preserved across the switches",
  ldoc.getElementById("questionScreen").classList.contains("active"));
check("the active screen was re-rendered in the new language",
  lcalls.includes("renderQuestion"));
check("an open drawer is relocalised too", lcalls.includes("rerenderOpenMattressDrawer"));
// Openness must be read from the open marker, not from `inert`. Since Gate 1B
// `inert` on the drawer also means "still open but backgrounded by the safety
// dialog", so keying on it silently skipped the drawer for any language switch
// taken from the timeout warning — and Continue then restored a drawer still
// rendered in the previous language.
{
  const fn = (html.match(/window\.rerenderOpenMattressDrawer = function\(\) \{[\s\S]*?\n    \};/) || [""])[0];
  check("rerenderOpenMattressDrawer() found", fn.length > 0);
  check("it reads the drawer-open marker, not inert",
    /classList\.contains\('drawer-open'\)/.test(fn) && !/hasAttribute\('inert'\)/.test(fn));
  check("relocalising an open drawer never re-runs the dialog lifecycle",
    /contentOnly: true/.test(fn));
  const openSrc2 = (html.match(/window\.openMattressDrawer = function[\s\S]*?title\.focus\(\);/) || [""])[0];
  check("the contentOnly early-return precedes every lifecycle side effect",
    openSrc2.indexOf("opts.contentOnly === true) return;") !== -1
    && openSrc2.indexOf("opts.contentOnly === true) return;")
       < openSrc2.indexOf("drawer.removeAttribute('inert')"));
}
check("an open safety dialog is relocalised too", lcalls.includes("renderSafetyDialog"));
check("scores were NOT recomputed by a language switch", !lcalls.includes("calculateScores"));
// A stale EN sentence sitting in a live region inside an ES interface is the
// defect this drops. It is a copy swap, so it clears the ANNOUNCEMENTS only —
// the payment position itself must survive EN/ES, which is asserted
// structurally below (the language harness never binds the three dimensions,
// so an assignment to any of them would throw here rather than pass quietly).
check("a language switch drops both preference-action announcements",
  lcalls.includes("clearPayAnnouncements"));

section("language transaction: unsupported and forced-English");
pendingFetches = [];
check("a language the retailer does not offer is refused",
  (await lout.switchLanguage("fr")) === false && pendingFetches.length === 0);
check("the refusal did not change the current language", lout.lang() === "en");
{
  const p = lout.switchLanguage("es");
  pendingFetches[0].resolve({ ok: true, status: 200, json: async () => Object.assign({ __id: "ES" }, dictEs) });
  await p; await settleAll();
  check("a supported language IS applied", lout.dictKey() === "ES" && lout.lang() === "es");
  const pen = lout.switchLanguage("en");
  pendingFetches[1].resolve({ ok: true, status: 200, json: async () => Object.assign({ __id: "EN" }, dictEn) });
  await pen; await settleAll();
  check("English is always available as the reset target",
    lout.dictKey() === "EN" && lout.lang() === "en");
}

section("persistent controls on every non-Welcome screen");
const utilityEl = ldoc.getElementById("sessionUtility");
for (const id of SCREENS) {
  lout.showScreen(id);
  const shouldShow = id !== "welcomeScreen";
  check(`${id}: utility controls ${shouldShow ? "exposed" : "hidden (landing toggle instead)"}`,
    utilityEl.hidden === !shouldShow);
  check(`${id}: the active screen is ${id}`, ldoc.getElementById(id).classList.contains("active"));
}
check("REGRESSION: EN/ES and Restart are reachable on all 7 non-Welcome screens",
  SCREENS.filter(id => id !== "welcomeScreen").every(id => {
    lout.showScreen(id);
    return utilityEl.hidden === false;
  }));

} catch (err) {
  section("behavioural execution");
  check("the extracted session module executes end to end", false);
  console.log("      the behavioural suite could not run against this tree:");
  console.log("      " + String(err && err.stack ? err.stack.split("\n")[0] : err));
  console.log("      (expected on a tree with no Gate 1B session module — every");
  console.log("       timeout-controller, restart, language and wipe-matrix");
  console.log("       contract above is unmet.)");
}

// ===========================================================================
// 7. REGRESSION INVARIANTS (scoring / financing / config isolation)
// ===========================================================================
section("regression invariants");
const cfg = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));
check("exactPromotionsEnabled remains false", cfg.financing.exactPromotionsEnabled === false);
check("gasUrl remains blank (no live email delivery)", !(cfg.gasUrl || "").trim());
check("discount.mode remains disabled", cfg.discount.mode === "disabled");
check("the session block never touches scoring",
  !/calculateScores|firmnessScore|locallyMade|scoreMattress/.test(SOURCE));
check("the session block never reorders or re-tiers results",
  !/\.sort\(/.test(SOURCE) && !/activeTier\s*=/.test(SOURCE));
check("no external analytics transport was introduced",
  !/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(SOURCE));
const switchSrc = (html.match(/async function switchLanguage[\s\S]*?\n    \}/) || [""])[0];
check("switchLanguage() found for isolation checks", switchSrc.length > 0);
check("switchLanguage does not recompute scores", !/calculateScores/.test(switchSrc));
check("switchLanguage does not replay the reveal animations",
  !/startResultsReveal|startProfileReveal|playSavingsPassReveal/.test(switchSrc));
check("switchLanguage preserves in-progress contact values across the rerender",
  /var emailValues = \{[\s\S]{0,900}?getElementById\('emailNameInput'\)\.value = emailValues\.name/.test(html));
check("switchLanguage clears the preference-action announcements, not the state",
  /clearPayAnnouncements\(\)/.test(switchSrc)
  && !/(^|[^.\w$])payExplored\s*=(?!=)/.test(switchSrc)
  && !/(^|[^.\w$])payPref\s*=(?!=)/.test(switchSrc)
  && !/(^|[^.\w$])payOpen\s*=(?!=)/.test(switchSrc));

// ===========================================================================
// 7b. PAYMENT CHOICE (D4): THE WIPE OWNS ALL THREE DIMENSIONS
// ===========================================================================
// This replaces the retired "financing agenda is only reset inside the session
// module" assertion. The agenda's two variables are gone; Slice 4's model is
// payExplored / payPref / payOpen, and the contract here is deliberately
// stricter than the one it replaces.
//
// TWO separate rules, because they fail in different ways:
//
//  (1) The wipe must clear each dimension BY NAME and WITHOUT a typeof guard.
//      index.html legitimately typeof-guards two OTHER wipe lines
//      (_briefOpenPriority, _dfmGen) so extracted-module sandboxes stay
//      runnable. Copying that idiom onto payment state would be silent
//      failure: a renamed or deleted binding would skip its clear and the wipe
//      would still "pass", leaving the previous customer's payment position in
//      place for the next one. The repo rule is that a missing binding must
//      fail LOUDLY here.
//
//  (2) Nothing outside the D4 action functions and the wipe may assign any of
//      the three. A write anywhere else — a renderer, a language path, a
//      handoff builder — is either an undeclared state transition or a second
//      reset implementation, and the wipe cannot be the single authority over
//      state that other code also rewrites.
//
// Both rules are pure functions of a source string, so the mutation battery
// below runs them over deliberately broken copies and requires a rejection.
section("Payment Choice (D4): wipe ownership");

const PAY_DIMS = ["payExplored", "payPref", "payOpen"];
const PAY_CLEAR_LITERAL = {
  payExplored: "payExplored = [];",
  payPref: "payPref = null;",
  payOpen: "payOpen = {};",
};
// Whole-binding assignment only. `payPref === id`, `payPref !== PAY_NOT_NOW`
// and `payOpen[id] = true` are reads or member writes, not rebindings, and
// none of them may be counted as a clear or as a rogue assignment.
function payAssignRe(name) { return new RegExp(`(^|[^.\\w$])${name}\\s*=(?!=)`); }

// RULE 1 — the wipe body, read out of whatever source string is passed.
function payWipeAudit(sessionSource) {
  const body = (sessionSource.match(/function resetSessionState\(opts\) \{[\s\S]*?\n    \}/) || [""])[0];
  const clears = {
    payExplored: /(^|[^.\w$])payExplored\s*=\s*\[\s*\]\s*;/,
    payPref: /(^|[^.\w$])payPref\s*=\s*null\s*;/,
    payOpen: /(^|[^.\w$])payOpen\s*=\s*\{\s*\}\s*;/,
  };
  return {
    found: body.length > 0,
    missing: PAY_DIMS.filter((d) => !clears[d].test(body)),
    guarded: PAY_DIMS.filter((d) => new RegExp(`typeof\\s+${d}\\b`).test(body)),
  };
}

{
  const real = payWipeAudit(SOURCE);
  check("the wipe body was located inside the session module", real.found);
  check(`the wipe clears all three Payment Choice dimensions by name${real.missing.length ? " — MISSING: " + real.missing.join(", ") : ""}`,
    real.missing.length === 0);
  check(`no Payment Choice clear is wrapped in a typeof guard${real.guarded.length ? " — GUARDED: " + real.guarded.join(", ") : ""}`,
    real.guarded.length === 0);

  for (const d of PAY_DIMS) {
    const lit = PAY_CLEAR_LITERAL[d];
    // Non-vacuity for the mutations themselves: if the literal is not in the
    // source, `replace` is a no-op and every mutation below would "pass" by
    // testing the unmodified source.
    check(`[non-vacuity] the session module really contains "${lit}" to mutate`,
      SOURCE.includes(lit));
    const removed = payWipeAudit(SOURCE.replace(lit, ""));
    check(`MUTATION: deleting the ${d} clear is caught`, removed.missing.includes(d));
    const wrapped = payWipeAudit(
      SOURCE.replace(lit, `if (typeof ${d} !== 'undefined') ${lit}`));
    check(`MUTATION: typeof-guarding the ${d} clear is caught`, wrapped.guarded.includes(d));
    // ...and it is caught by the GUARD rule specifically. A guarded clear still
    // reads as a clear, so a suite that only looked for the assignment text
    // would report the mutant as healthy.
    check(`  ...the guarded ${d} clear still looks like a clear, so only rule 1b rejects it`,
      !wrapped.missing.includes(d));
  }
}

// RULE 2 — every whole-binding assignment in index.html, attributed to an owner.
//
// Owners are located by their real function headers and converted to line
// ranges, so this survives edits elsewhere in an 21k-line file. Per-owner
// COUNTS are asserted as well as membership: without them, moving the wipe's
// three clears into considerPaymentPath would still be "owned" and would still
// pass.
//
// Scope: `//` tails are dropped before scanning, because index.html's D4
// commentary discusses these bindings at length and prose is not executable.
// Block comments are deliberately NOT stripped here (the literal-aware
// stripper lives in tests/session_async_check.mjs, which owns that job) — that
// direction fails CLOSED: a `/* payPref = ... */` block would be reported
// rather than ignored.
const PAY_OWNERS = [
  { name: "declaration", expect: 3,
    re: /    var payExplored = \[\];\r?\n    var payPref = null;\r?\n    var payOpen = \{\};/ },
  // The only D4 action that writes no whole binding: it toggles payOpen by KEY
  // and appends to payExplored through payRecordExplored(). Listed with an
  // expectation of 0 so the inventory is the complete action set, and so a new
  // rebinding here reads as a change rather than as an unowned site.
  { name: "reviewPaymentPath", expect: 0,
    re: /window\.reviewPaymentPath = function\(id\) \{[\s\S]*?\n    \};/ },
  { name: "considerPaymentPath", expect: 1,
    re: /window\.considerPaymentPath = function\(id\) \{[\s\S]*?\n    \};/ },
  { name: "clearPaymentPreference", expect: 1,
    re: /window\.clearPaymentPreference = function\(id\) \{[\s\S]*?\n    \};/ },
  { name: "setPaymentNotNow", expect: 1,
    re: /window\.setPaymentNotNow = function\(\) \{[\s\S]*?\n    \};/ },
  { name: "resetSessionState", expect: 3,
    re: /function resetSessionState\(opts\) \{[\s\S]*?\n    \}/ },
];

function payAssignmentAudit(source) {
  const owners = PAY_OWNERS.map((o) => {
    const m = source.match(o.re);
    if (!m) return { name: o.name, expect: o.expect, missing: true, count: 0 };
    const start = source.slice(0, m.index).split(/\r?\n/).length;
    return { name: o.name, expect: o.expect, missing: false, count: 0,
             start, end: start + m[0].split(/\r?\n/).length - 1 };
  });
  const lines = source.split(/\r?\n/);
  const unowned = [];
  let sites = 0;
  for (let i = 0; i < lines.length; i++) {
    const code = lines[i].split("//")[0];
    const hit = PAY_DIMS.filter((d) => payAssignRe(d).test(code));
    if (!hit.length) continue;
    sites += hit.length;
    const owner = owners.find((o) => !o.missing && i + 1 >= o.start && i + 1 <= o.end);
    if (!owner) unowned.push(`line ${i + 1}: ${lines[i].trim().slice(0, 70)}`);
    else owner.count += hit.length;
  }
  return { owners, unowned, sites,
           wrongCount: owners.filter((o) => o.missing || o.count !== o.expect) };
}

{
  const audit = payAssignmentAudit(html);
  for (const o of audit.owners) {
    check(`[D4] ${o.name} located in index.html`, !o.missing);
  }
  check(`every Payment Choice assignment site is inside a D4 action or the wipe (${audit.sites} sites)${audit.unowned.length ? " — UNOWNED: " + audit.unowned.join(" | ") : ""}`,
    audit.unowned.length === 0);
  for (const o of audit.owners) {
    check(`[D4] ${o.name} makes exactly ${o.expect} whole-binding assignment${o.expect === 1 ? "" : "s"} (found ${o.count})`,
      !o.missing && o.count === o.expect);
  }

  // -- non-vacuity: the audit must reject each way rule 2 can break ----------
  // A rogue write outside every owner. Planted in finLayoutClass(), which sits
  // between the declarations and the first action function.
  const ROGUE_HOST = "function finLayoutClass() {";
  check("[non-vacuity] the rogue-assignment host exists to plant into",
    html.includes(ROGUE_HOST));
  for (const d of PAY_DIMS) {
    const rogue = payAssignmentAudit(
      html.replace(ROGUE_HOST, `${ROGUE_HOST}\n      ${PAY_CLEAR_LITERAL[d]}`));
    check(`MUTATION: a rogue ${d} assignment outside every owner is caught`,
      rogue.unowned.length === 1 && rogue.unowned[0].includes(d));
  }
  // A clear that MOVED into an owner it does not belong to: owned, so the
  // membership rule passes, and only the per-owner counts reject it.
  {
    const moved = payAssignmentAudit(
      html.replace("      if (payPref === id) return;",
        "      payExplored = [];\n      if (payPref === id) return;"));
    check("MUTATION: relocating a clear into another D4 action is caught by the counts",
      moved.unowned.length === 0
      && moved.wrongCount.some((o) => o.name === "considerPaymentPath"));
  }
  // A clear silently dropped from the wipe: the count falls short. The
  // statement is blanked rather than the line deleted (index.html is CRLF, so
  // a "\n"-terminated needle matches nothing), which also keeps every other
  // owner's line range intact.
  {
    const WIPE_CLEAR = "        payOpen = {};";
    check("[non-vacuity] the wipe's payOpen clear is present to delete",
      html.includes(WIPE_CLEAR));
    const dropped = payAssignmentAudit(html.replace(WIPE_CLEAR, ""));
    check("MUTATION: dropping a clear from the wipe is caught by the counts",
      dropped.wrongCount.some((o) => o.name === "resetSessionState" && o.count === 2));
  }
  // ...and the counter-example that must NOT fire: commentary about these
  // bindings is prose, and index.html carries a lot of it.
  {
    const commented = payAssignmentAudit(
      html.replace(ROGUE_HOST, `${ROGUE_HOST}\n      // payPref = 'promo-Synchrony';`));
    check("a commented-out assignment is NOT reported (prose is not executable)",
      commented.unowned.length === 0 && commented.sites === audit.sites);
  }
}

// ===========================================================================
// 8. GATE 2A :: SCREEN-TRANSITION FOCUS AND ANNOUNCEMENT
// ===========================================================================
// showScreen() now moves focus and, on screens with no rendered heading,
// announces the destination. Everything below EXECUTES the real functions
// extracted from index.html against a purpose-built DOM stub.
//
// A LOCAL stub rather than the shared makeEl(): the shared one's focus()
// writes `doc.activeElement` against the MODULE-LEVEL document it closed over,
// not the document owning the element. Every focus assertion written against
// it would read `body` and pass for the wrong reason. The shared stub also has
// no closest(), and isFocusRestorable() guards its [hidden],[inert] ancestor
// test behind `typeof el.closest === 'function'` — so that branch would
// silently never run and the inert case would be vacuous. Both are fixed here
// without disturbing the 372 assertions above.
section("Gate 2A: screen-transition focus and announcement");

function g2aDom() {
  const doc = { activeElement: null, byId: {} };
  function el(id, tag) {
    const e = {
      id, tagName: (tag || 'div').toUpperCase(), parent: null, kids: [],
      _cls: {}, _attr: {}, textContent: '', hidden: undefined, focusCount: 0,
      classList: {
        add(c) { e._cls[c] = true; }, remove(c) { delete e._cls[c]; },
        contains(c) { return !!e._cls[c]; },
        toggle(c, on) { if (on) e._cls[c] = true; else delete e._cls[c]; },
      },
      setAttribute(k, v) { e._attr[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(e._attr, k) ? e._attr[k] : null; },
      // Ancestor-aware, so isFocusRestorable's [hidden],[inert] rule is real.
      closest(sel) {
        const want = sel.replace(/[\[\]]/g, '').split(',').map((s) => s.trim());
        for (let n = e; n; n = n.parent) {
          for (const w of want) {
            if (w === 'hidden' && n.hidden === true) return n;
            if (n.getAttribute(w) !== null) return n;
          }
        }
        return null;
      },
      // Writes to the document that OWNS this element.
      focus() { e.focusCount++; doc.activeElement = e; },
      style: {}, scrollTop: 0, offsetParent: {},
    };
    doc.byId[id] = e;
    return e;
  }
  doc.getElementById = (id) => doc.byId[id] || (doc.byId[id] = el(id));
  doc.querySelector = (sel) => {
    if (sel === '.screen.active') return SCREENS.map((s) => doc.byId[s]).find((s) => s && s._cls.active) || null;
    return doc.byId[sel.replace(/^[.#]/, '')] || null;
  };
  doc.querySelectorAll = (sel) => (sel === '.screen' ? SCREENS.map((s) => doc.getElementById(s)) : []);
  doc.contains = () => true;
  doc.el = el;
  return doc;
}
const SCREENS = ['welcomeScreen', 'questionScreen', 'reviewScreen', 'profileScreen',
  'resultsScreen', 'hf2Screen', 'emailScreen', 'accessoriesScreen'];
const HEADINGS = {
  profileScreen: 'profileName', resultsScreen: 'resultsHeadline',
  hf2Screen: 'hf2ReviewTitle', emailScreen: 'emailHeadline',
  accessoriesScreen: 'sleepSystemTitle',
};

function g2aGrab(re, what) {
  const m = html.match(re);
  check(`[Gate 2A] extracted ${what}`, !!m);
  return m ? m[0] : "";
}
const g2aSrc = [
  g2aGrab(/var SCREEN_HEADING_IDS = \{[\s\S]*?\n    \};/, "SCREEN_HEADING_IDS"),
  g2aGrab(/var SCREEN_NAME_KEYS = \{[\s\S]*?\n    \};/, "SCREEN_NAME_KEYS"),
  g2aGrab(/function isFocusRestorable\(el\) \{[\s\S]*?\n    \}/, "isFocusRestorable()"),
  g2aGrab(/function focusActiveScreen\(\) \{[\s\S]*?\n    \}/, "focusActiveScreen()"),
  g2aGrab(/function screenTransitionOwnedElsewhere\(\) \{[\s\S]*?\n    \}/, "screenTransitionOwnedElsewhere()"),
  g2aGrab(/function focusScreenDestination\(id\) \{[\s\S]*?\n    \}/, "focusScreenDestination()"),
  g2aGrab(/window\.showScreen = function\(id\) \{[\s\S]*?\n    \}/, "showScreen() for Gate 2A"),
].join("\n");

function g2a(opts) {
  const o = opts || {};
  const doc = g2aDom();
  const pending = [];
  let epoch = 1;
  const out = {};
  const win = { scrollTo() {}, _compareSelected: [], _setIdleScreen() {} };
  new Function("document", "window", "DICT", "out", "pending", "state", `
    "use strict";
    var _wipeInProgress = state.wipe;
    var _dataLoadFailed = state.dataFailed;
    var _safetyMode = state.safetyMode;
    var _screenAnnounceTimer = null;
    function safetyDialogMode() { return _safetyMode; }
    function t(k) { return DICT[k] || k; }
    function applyTranslations() {}
    function clearTimeout(id) { pending.forEach(function(p) { if (p.id === id) p.dead = true; }); }
    function sessionTimeout(fn) {
      var e = state.epoch();
      var id = pending.length + 1;
      pending.push({ id: id, dead: false, run: function() { if (e === state.epoch()) fn(); } });
      return id;
    }
    ${g2aSrc}
    out.showScreen = window.showScreen;
  `)(doc, win, Object.assign({}, dictEn), out, pending,
    { wipe: !!o.wipe, dataFailed: !!o.dataFailed, safetyMode: o.safetyMode || null,
      epoch: () => epoch });

  SCREENS.forEach((s) => { const e = doc.getElementById(s); e.classList.add('screen'); });
  Object.keys(HEADINGS).forEach((s) => {
    const h = doc.getElementById(HEADINGS[s]);
    h.textContent = 'Rendered heading for ' + s;
    h.parent = doc.getElementById(s);
  });
  doc.getElementById('screenAnnounce');
  if (o.from) doc.getElementById(o.from).classList.add('active');
  return {
    doc, out, pending,
    flush() { pending.filter((p) => !p.dead).forEach((p) => p.run()); },
    bumpEpoch() { epoch++; },
    region() { return doc.getElementById('screenAnnounce').textContent; },
    active() { return doc.activeElement ? doc.activeElement.id : null; },
  };
}

// -- F1: rendered headings are the destination ------------------------------
for (const [screen, heading] of Object.entries(HEADINGS)) {
  const h = g2a({ from: 'welcomeScreen' });
  h.out.showScreen(screen);
  check(`[Gate 2A] ${screen} focuses #${heading}`, h.active() === heading);
  check(`[Gate 2A] ${screen} announces exactly once, via focus alone`,
    h.pending.length === 0);
}

// -- F2: headingless screens focus the named container ----------------------
// EXACTLY ONE utterance. The first implementation named the container so that
// focusing it would announce, and then wrote the same name to a live region —
// VoiceOver would say "Sleep quiz, region" and then "Sleep quiz". The name is
// carried by the container itself; nothing else may speak it.
for (const [screen, key] of [['welcomeScreen', 'screen.welcome'],
  ['questionScreen', 'screen.question'], ['reviewScreen', 'screen.review']]) {
  const h = g2a({ from: 'profileScreen' });
  h.out.showScreen(screen);
  check(`[Gate 2A] ${screen} focuses its container`, h.active() === screen);
  check(`[Gate 2A] ${screen} container is programmatically focusable only`,
    h.doc.getElementById(screen).getAttribute('tabindex') === '-1');
  check(`[Gate 2A] ${screen} schedules no second utterance`, h.pending.length === 0);
  check(`[Gate 2A] ${screen} is named from the dictionary, both languages`,
    typeof dictEn[key] === 'string' && dictEn[key].length > 0
    && typeof dictEs[key] === 'string' && dictEs[key].length > 0);
}
// The container's name must be announced by the container, which for a plain
// div means it needs a role. #welcomeScreen is a <main> and needs none.
check("[Gate 2A] the two headingless div containers carry role=region",
  /id="questionScreen" role="region"/.test(html) && /id="reviewScreen" role="region"/.test(html));
check("[Gate 2A] #welcomeScreen is a <main>, so its name announces without a role",
  /<main class="main screen active" id="welcomeScreen"/.test(html));
check("[Gate 2A] container names are applied as aria-label from the dictionary",
  /var nameKey = SCREEN_NAME_KEYS\[screenId\];/.test(html)
  && /var name = t\(nameKey\);/.test(html)
  && /setAttribute\('aria-label', name\)/.test(html));

// -- F3: the profile heading is focused EXACTLY once ------------------------
{
  const h = g2a({ from: 'welcomeScreen' });
  h.out.showScreen('profileScreen');
  h.flush();
  check("[Gate 2A] #profileName is focused exactly once, not twice",
    h.doc.getElementById('profileName').focusCount === 1);
  check("[Gate 2A] the bespoke profile sessionFrame focus is gone from index.html",
    !/showScreen\('profileScreen'\);\s*\n\s*sessionFrame\(/.test(html));
}

// -- F4: an empty heading is not a destination ------------------------------
{
  const h = g2a({ from: 'welcomeScreen' });
  h.doc.getElementById('profileName').textContent = '   ';
  h.out.showScreen('profileScreen');
  check("[Gate 2A] an empty heading falls back to the container",
    h.active() === 'profileScreen');
  check("[Gate 2A] ...and the fallback schedules no deferred utterance either",
    h.pending.length === 0);
  // Focusing the fallback only announces anything if the fallback can BE
  // named. A plain <div> has the implicit `generic` role, naming is
  // prohibited there, and the aria-label would be discarded — leaving this
  // path silently anonymous while every behavioural assertion still passed.
  check("[Gate 2A] ...and the fallback container has a role that permits a name",
    /<div class="screen" id="profileScreen" role="region">/.test(html));
}

// -- F4b: EVERY container that can be a focus destination is nameable -------
// Not just the two headingless screens: each mapped screen falls back to its
// own container whenever its heading is empty, so all eight need this.
//
// Slice 5 C0: the roster is DERIVED from the shipped markup, not restated in
// this file. The earlier hand-written NAMEABLE map compared one authored list
// (SCREEN_NAME_KEYS) against another authored list (the map) — a ninth
// `.screen` container added to index.html and registered nowhere left both
// lists at eight and the suite green, with the new screen anonymous to
// assistive technology. Deriving the roster from the markup closes that:
// markup is the thing being guarded, so it cannot also be the restatement.
//
// The regex is element-agnostic on purpose: welcomeScreen is a <main>, not a
// <div>, and a <div>-anchored scan scores 7 of 8. Attributes are pulled out
// of the tag independently so class/id/role order never matters, and the
// class test is a TOKEN test so "question-screen" alone would not qualify.
function deriveScreenRoster(markup) {
  const roster = [];
  for (const m of markup.matchAll(/<(main|div|section)\b([^>]*)>/g)) {
    const attrs = m[2];
    const cls = (attrs.match(/\sclass="([^"]*)"/) || [, ""])[1];
    if (!/(^|\s)screen(\s|$)/.test(cls)) continue;
    const id = (attrs.match(/\sid="([^"]*)"/) || [, ""])[1];
    const role = (attrs.match(/\srole="([^"]*)"/) || [, ""])[1];
    roster.push({ id, tag: m[1], role, nameable: m[1] === "main" || role === "region" });
  }
  return roster;
}
{
  const roster = deriveScreenRoster(html);
  const tokenOccurrences = (html.match(/\sclass="(?:[^"]*\s)?screen(?:\s[^"]*)?"/g) || []).length;
  check(`[Gate 2A] the derived roster found every .screen container (${roster.length} of ${tokenOccurrences} class tokens)`,
    roster.length === tokenOccurrences && roster.length >= 8);
  check("[Gate 2A] every derived screen has a non-blank id",
    roster.every((s) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(s.id)));
  const namesSrc = (html.match(/var SCREEN_NAME_KEYS = \{[\s\S]*?\n    \};/) || [""])[0];
  for (const s of roster) {
    check(`[Gate 2A] ${s.id} carries a nameable role, so its aria-label is not discarded`, s.nameable);
    check(`[Gate 2A] ${s.id} is named from the dictionary`,
      new RegExp(`${s.id}: 'screen\\.`).test(namesSrc));
  }
  // SET EQUALITY, both directions, between the DERIVED roster and the shipped
  // SCREEN_NAME_KEYS. Neither side is restated in this file.
  const namedScreens = [...namesSrc.matchAll(/^\s*([A-Za-z0-9_]+):\s*'screen\./gm)]
    .map((m) => m[1]).sort();
  const rosterIds = roster.map((s) => s.id).sort();
  const unNameable = namedScreens.filter((s) => !rosterIds.includes(s));
  const unNamed = rosterIds.filter((s) => !namedScreens.includes(s));
  check(`[Gate 2A] every aria-labelled container is a real .screen${unNameable.length ? " — LABEL WOULD BE DISCARDED FOR: " + unNameable.join(", ") : ""}`,
    unNameable.length === 0);
  check(`[Gate 2A] every .screen container is actually named${unNamed.length ? " — UNNAMED: " + unNamed.join(", ") : ""}`,
    unNamed.length === 0);
  check(`[Gate 2A] the two sets are exactly equal (${namedScreens.length} screens)`,
    namedScreens.length === rosterIds.length
    && namedScreens.every((s, i) => s === rosterIds[i]));

  // Heading map: every registered heading must name a real screen and resolve
  // to a real element. Registration is a per-call-site decision (the source
  // explains why questionScreen/reviewScreen are deliberately absent), so the
  // reverse direction is not asserted.
  const headSrc = (html.match(/var SCREEN_HEADING_IDS = \{[\s\S]*?\n    \};/) || [""])[0];
  const headingMap = Object.fromEntries([...headSrc.matchAll(/^\s*([A-Za-z0-9_]+):\s*'([A-Za-z0-9_-]+)'/gm)].map((m) => [m[1], m[2]]));
  const markupIds = new Set([...html.matchAll(/\bid="([A-Za-z0-9_:-]+)"/g)].map((m) => m[1]));
  check(`[Gate 2A] the heading map was read (${Object.keys(headingMap).length} entries)`, Object.keys(headingMap).length >= 5);
  for (const [screen, hid] of Object.entries(headingMap)) {
    check(`[Gate 2A] SCREEN_HEADING_IDS.${screen} names a real screen and a real heading (#${hid})`,
      rosterIds.includes(screen) && markupIds.has(hid));
  }

  // Every screen.* dictionary key the shipped map points at is present,
  // non-blank and genuinely translated — DERIVED from SCREEN_NAME_KEYS rather
  // than restated as a literal list.
  const screenKeys = [...namesSrc.matchAll(/'(screen\.[a-z_]+)'/g)].map((m) => m[1]);
  check(`[Gate 2A] the derived screen.* key list is non-empty (${screenKeys.length})`, screenKeys.length >= 8);
  for (const k of screenKeys) {
    check(`[Gate 2A] ${k} is bilingual and actually translated`,
      typeof dictEn[k] === 'string' && dictEn[k].length > 0
      && typeof dictEs[k] === 'string' && dictEs[k].length > 0
      && dictEn[k] !== dictEs[k]);
  }

  // NON-VACUITY, proved on every run by injection into a SANDBOX COPY of the
  // markup. Each injection must be detectable by the derived machinery; a
  // derived check that cannot detect a ninth screen is the hand-written map
  // with extra steps. The injected tag writes id BEFORE class deliberately —
  // every shipped screen writes class first, so attribute-order independence
  // is otherwise unobservable.
  const injected = html.replace('<div class="screen" id="reviewScreen" role="region">',
    '<div id="sentinelScreen" role="region" class="screen"></div>\n<div class="screen" id="reviewScreen" role="region">');
  const injRoster = deriveScreenRoster(injected).map((s) => s.id);
  check("[Gate 2A][non-vacuity] an injected ninth screen with id BEFORE class is found by the derived roster",
    injRoster.includes("sentinelScreen") && injRoster.length === roster.length + 1);
  check("[Gate 2A][non-vacuity] ...and it is UNNAMED, so set equality would go red from the markup side",
    !namedScreens.includes("sentinelScreen"));
  const dropped = namesSrc.replace(/^\s*hf2Screen:\s*'screen\.handoff',?\r?\n/m, "");
  const droppedNames = [...dropped.matchAll(/^\s*([A-Za-z0-9_]+):\s*'screen\./gm)].map((m) => m[1]);
  check("[Gate 2A][non-vacuity] deleting a SCREEN_NAME_KEYS entry leaves a real screen unnamed, so set equality would go red from the map side",
    droppedNames.length === namedScreens.length - 1 && !droppedNames.includes("hf2Screen") && rosterIds.includes("hf2Screen"));
  const divOnly = [...html.matchAll(/<div\b[^>]*\sclass="(?:[^"]*\s)?screen(?:\s[^"]*)?"[^>]*>/g)].length;
  check("[Gate 2A][non-vacuity] a <div>-anchored scan would MISS the <main> welcome screen (the derived scan must not be that scan)",
    divOnly === roster.length - 1);

  // A missing dictionary entry must never become the spoken name. t() returns
  // the KEY when the dictionary lacks it, so without a guard a failed fetch or
  // a stale cached dictionary would label every container with its own
  // identifier and assistive technology would announce "screen dot question".
  const labelLoop = (html.match(/if \(typeof SCREEN_NAME_KEYS !== 'undefined'\) \{[\s\S]*?\n      \}/) || [""])[0];
  check("[Gate 2A] the screen-label loop was located", labelLoop.length > 0);
  check("[Gate 2A] a missing dictionary key is never written as the accessible name",
    /name !== nameKey/.test(labelLoop));
  check("[Gate 2A] ...and the stale label is removed rather than left behind",
    /removeAttribute\('aria-label'\)/.test(labelLoop));
  check("[Gate 2A] the guard matches the data-i18n loop's existing fail-closed shape",
    /if \(val !== key\) \{/.test(html));
}

// -- F5/F6/F7 + A2: every refusal gate, focus AND speech ---------------------
const REFUSALS = [
  ["a safety dialog owns focus", { safetyMode: 'timeout' }, () => {}],
  ["the wipe owns the transition", { wipe: true }, () => {}],
  ["the data-error overlay is up", { dataFailed: true }, () => {}],
  ["the drawer is open", {}, (h) => h.doc.getElementById('mattressDrawer').classList.add('drawer-open')],
  ["the financing sheet is open", {}, (h) => { h.doc.getElementById('financingSheet').hidden = false; }],
  ["the compare modal is open", {}, (h) => h.doc.getElementById('compareModal').classList.add('visible')],
  ["the privacy overlay is open", {}, (h) => h.doc.getElementById('privacyOverlay').classList.add('visible')],
  ["the destination is hidden", {}, (h) => { h.doc.getElementById('resultsScreen').hidden = true; }],
  ["an ancestor is inert", {}, (h) => {
    const outer = h.doc.el('inertWrap');
    outer.setAttribute('inert', '');
    h.doc.getElementById('resultsScreen').parent = outer;
  }],
];
for (const [label, opts, mutate] of REFUSALS) {
  const h = g2a(Object.assign({ from: 'welcomeScreen' }, opts));
  mutate(h);
  const before = h.active();
  h.out.showScreen('resultsScreen');
  h.flush();
  check(`[Gate 2A] no focus move when ${label}`, h.active() === before);
  check(`[Gate 2A] no announcement when ${label}`,
    h.region() === '' && h.pending.length === 0);
}

// -- A3: a superseded transition cannot speak over its successor ------------
// The defect this pins: a headingless transition scheduled "Welcome", a
// heading transition to Results followed inside the deferral window, and the
// second path returned early WITHOUT cancelling the first — so "Welcome" was
// spoken over an active Results screen. The callback revalidated the session
// and modal ownership but was never bound to the destination that scheduled
// it. Announcing through focus removes the window entirely.
{
  const h = g2a({ from: 'profileScreen' });
  h.out.showScreen('welcomeScreen');
  h.out.showScreen('resultsScreen');
  h.flush();
  check("[Gate 2A] a superseded transition leaves nothing queued to speak",
    h.pending.length === 0 && h.region() === '');
  check("[Gate 2A] ...and focus is on the LAST destination, not the first",
    h.active() === 'resultsHeadline');
}

// -- A4: a queued destination that goes away cannot speak -------------------
{
  for (const [label, mutate] of [
    ["becoming inactive", (h) => { h.doc.getElementById('welcomeScreen').classList.remove('active'); }],
    ["becoming hidden", (h) => { h.doc.getElementById('welcomeScreen').hidden = true; }],
    ["becoming inert", (h) => { h.doc.getElementById('welcomeScreen').setAttribute('inert', ''); }],
  ]) {
    const h = g2a({ from: 'profileScreen' });
    h.out.showScreen('welcomeScreen');
    mutate(h);
    h.flush();
    check(`[Gate 2A] a destination ${label} after the transition never speaks`,
      h.region() === '' && h.pending.length === 0);
  }
}

// -- A4b: no deferred announcement machinery exists at all ------------------
// The strongest form of "no stale utterance": there is nothing to go stale.
{
  const h = g2a({ from: 'profileScreen' });
  h.out.showScreen('welcomeScreen');
  h.bumpEpoch();
  h.flush();
  check("[Gate 2A] no session-scoped work is queued by a transition at all",
    h.pending.length === 0);
  check("[Gate 2A] no screen-transition live region ships",
    !/id="screenAnnounce"/.test(html));
  check("[Gate 2A] no screen announcer or its timer survives in source",
    !/announceScreen\s*\(/.test(html) && !/_screenAnnounceTimer/.test(html));
  check("[Gate 2A] the wipe and language switch have nothing extra to clear",
    !/clearScreenAnnouncement/.test(html));
}

// -- A5: re-render vs transition -------------------------------------------
{
  const h = g2a({ from: 'resultsScreen' });
  h.out.showScreen('resultsScreen');
  h.flush();
  check("[Gate 2A] a same-screen re-render moves no focus", h.active() === null);
  check("[Gate 2A] ...and announces nothing", h.pending.length === 0);
  check("[Gate 2A] ...but still does the rest of showScreen's work",
    h.doc.getElementById('resultsScreen').classList.contains('active'));
}

// -- source-level contracts -------------------------------------------------
check("[Gate 2A] showScreen keeps the signature the extraction regexes pin",
  /window\.showScreen = function\(id\) \{/.test(html));
// Bounded to the function body. An unbounded [\s\S]*? would run past it and
// match a setTimeout anywhere later in the file, so the check would pass or
// fail for reasons having nothing to do with this code path.
check("[Gate 2A] the transition path adds no raw timer",
  !/setTimeout|requestAnimationFrame|sessionTimeout|sessionFrame/
    .test((html.match(/function focusScreenDestination\(id\) \{[\s\S]*?\n    \}/) || [""])[0]));
// Slice 4 repointed this at the D4 controls. It used to name
// toggleFinancingAgenda / setFinancingInterestChoice, both retired — and since
// a regex that matches nothing yields "", testing "" for an absent call passes
// for every possible tree. The extracted sources are therefore asserted
// NON-EMPTY first: an assertion about code that could not be found is not an
// assertion at all.
{
  const D4_CONTROLS = [
    ["reviewPaymentPath", /window\.reviewPaymentPath = function\(id\) \{[\s\S]*?\n    \};/],
    ["considerPaymentPath", /window\.considerPaymentPath = function\(id\) \{[\s\S]*?\n    \};/],
    ["clearPaymentPreference", /window\.clearPaymentPreference = function\(id\) \{[\s\S]*?\n    \};/],
    ["setPaymentNotNow", /window\.setPaymentNotNow = function\(\) \{[\s\S]*?\n    \};/],
  ].map(([name, re]) => ({ name, src: (html.match(re) || [""])[0] }));
  check("[Gate 2A] all four Payment Choice controls were extracted, not silently empty",
    D4_CONTROLS.every((c) => c.src.length > 0));
  const reaching = D4_CONTROLS.filter((c) => /focusScreenDestination\(/.test(c.src));
  check(`[Gate 2A] no Payment Choice control reaches the transition focus path${reaching.length ? " — " + reaching.map((c) => c.name).join(", ") : ""}`,
    reaching.length === 0);
  // Each control restores focus through its OWN identity-checked helper
  // instead, which is what keeps a payment action off the screen-transition
  // path in the first place.
  check("[Gate 2A] they restore focus through payRestoreFocus() instead",
    D4_CONTROLS.filter((c) => /payRestoreFocus\(/.test(c.src)).length === 4);
}
check("[Gate 2A] the transition path never writes the handoff region",
  !/hf2FinancingStatus/.test((html.match(/function focusScreenDestination[\s\S]*?\n    \}/) || [""])[0]));
console.log(`\nSession safety check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
