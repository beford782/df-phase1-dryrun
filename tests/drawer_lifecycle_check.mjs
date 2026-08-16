// Mattress-drawer dialog lifecycle — behavioural regression.
//
// This does NOT grep for function names. It EXTRACTS the real lifecycle source
// from index.html (the open-path block, closeMattressDrawer, drawerKeydown and
// their module-scope state) and EXECUTES it against a DOM shim, using the same
// extract-and-execute pattern as tests/financing_render_check.mjs.
//
// The regression it exists to pin: the idle reset fires while a drawer is open.
// Before the fix, startOver() left the drawer open over Welcome, kept its focus
// trap, and released inert from "whatever screen is active now" — permanently
// stranding #resultsScreen inert for the rest of the tablet's session.
//
// Run: node tests/drawer_lifecycle_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}`); }
}

// ---------- extract the real source ----------------------------------------
function grab(re, what) {
  const m = html.match(re);
  check(`extracted ${what} from index.html`, !!m);
  return m ? m[0] : "";
}
const openBlock = grab(
  /\/\/ ---- dialog lifecycle \(mirrors openFinancingSheet\)[\s\S]*?if \(title && typeof title\.focus === 'function'\) title\.focus\(\);/,
  "the open-path lifecycle block");
// Signature-agnostic on purpose: the pre-fix build took no arguments. Matching
// either shape lets this suite EXECUTE against the old source and fail on real
// behaviour, rather than bailing out at extraction and proving nothing.
const closeFn = grab(
  /window\.closeMattressDrawer = function\([^)]*\) \{[\s\S]*?\n    \};/,
  "closeMattressDrawer()");
const keydownFn = grab(
  /function drawerKeydown\(e\) \{[\s\S]*?\n    \}/,
  "drawerKeydown()");

// The session reset must unwind the drawer synchronously, immediately, and
// without focus restoration. Static, because the reset itself is far too large
// to execute here — tests/session_safety_check.mjs proves the same ordering
// behaviourally by executing the real wipe.
//
// Gate 1B moved this body out of window.startOver() and into the single
// authoritative resetSessionState(), which every destructive path (confirmed
// restart, final timeout, startOver) now delegates to. The invariant is
// unchanged; only the symbol that carries it moved, so the assertions follow
// it and additionally pin that there is exactly ONE reset implementation.
// index.html is CRLF, so the function terminator is matched as "\n<4 spaces>}"
// with no trailing newline — the same shape closeMattressDrawer() uses above.
const wipe = html.match(/function resetSessionState\(opts\) \{[\s\S]*?\n    \}/)
  || html.match(/window\.startOver = function\(\) \{[\s\S]{0,1400}/);
check("the authoritative session wipe was located", !!wipe);
check("the session wipe unwinds the drawer",
  !!wipe && /closeMattressDrawer\(\{\s*immediate:\s*true,\s*restoreFocus:\s*false\s*\}\)/.test(wipe[0]));
check("the session wipe unwinds the drawer BEFORE the rest of the reset runs",
  !!wipe &&
  wipe[0].indexOf("closeMattressDrawer(") < wipe[0].indexOf("analytics.log('session_ended'"));
check("window.startOver() is preserved and delegates to that one wipe",
  /window\.startOver = function\(\) \{\s*return resetSessionState\(/.test(html)
  && (html.match(/function resetSessionState\(/g) || []).length === 1);

// ---------- DOM shim --------------------------------------------------------
function makeEl(id, className) {
  const attrs = new Map();
  const classes = new Set((className || "").split(" ").filter(Boolean));
  const el = {
    id, children: [],
    get className() { return [...classes].join(" "); },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    hasAttribute: (k) => attrs.has(k),
    focus() { doc.activeElement = el; },
    blur() { if (doc.activeElement === el) doc.activeElement = doc.body; },
    // `descendants` is the containment set; `children` is the FOCUSABLE set the
    // Tab trap iterates. The title is a descendant but deliberately not in the
    // focus cycle, so the two lists differ.
    descendants: [],
    contains: (other) => other === el || el.descendants.indexOf(other) !== -1,
    querySelectorAll: () => el.children,
    offsetParent: {}, disabled: false,
    addEventListener() {},
  };
  return el;
}

const drawer = makeEl("mattressDrawer", "mattress-drawer");
const backdrop = makeEl("drawerBackdrop", "drawer-backdrop");
const title = makeEl("drawerName");
const btnA = makeEl("drawerBtnA");
const btnB = makeEl("drawerBtnB");
drawer.children = [btnA, btnB];          // focusable cycle
drawer.descendants = [title, btnA, btnB]; // containment set
const resultsScreen = makeEl("resultsScreen", "screen active");
const welcomeScreen = makeEl("welcomeScreen", "screen");
const openerCard = makeEl("openerCard");
const body = makeEl("body");

drawer.setAttribute("inert", "");
drawer.setAttribute("aria-hidden", "true");

const byId = { mattressDrawer: drawer, drawerBackdrop: backdrop, drawerName: title,
  resultsScreen, welcomeScreen };
const doc = {
  activeElement: body, body,
  getElementById: (id) => byId[id] || null,
  querySelector: (sel) => {
    if (sel === ".screen.active") {
      return [resultsScreen, welcomeScreen].find((s) => s.classList.contains("active")) || null;
    }
    return null;
  },
  contains: (el) => el !== null && el !== undefined,
};

// controllable clock so the 400ms slide-out is testable without real waiting
let timers = [], seq = 1;
const setTimeoutShim = (fn, ms) => { const id = seq++; timers.push({ id, fn, ms }); return id; };
const clearTimeoutShim = (id) => { timers = timers.filter((t) => t.id !== id); };
const flushTimers = () => { const t = timers; timers = []; t.forEach((x) => x.fn()); };

// ---------- compose the extracted source ------------------------------------
const win = {};
const harness = new Function(
  "document", "window", "setTimeout", "clearTimeout", "drawerRef",
  `
  var _drawerReturnFocus = null;
  var _drawerWasOpen = false;
  var _drawerKeydownBound = false;
  var _drawerCloseTimer = null;
  var _drawerInertedScreen = null;
  ${closeFn}
  ${keydownFn}
  window.openDrawerLifecycle = function() {
    var drawer = drawerRef;
    ${openBlock}
  };
  window.__state = function(){ return {
    wasOpen:_drawerWasOpen, inerted:_drawerInertedScreen && _drawerInertedScreen.id,
    timer:_drawerCloseTimer !== null, returnFocus:_drawerReturnFocus && _drawerReturnFocus.id }; };
  window.drawerKeydown = drawerKeydown;
  `
)(doc, win, setTimeoutShim, clearTimeoutShim, drawer);

// ---------- scenario 1: open from Results -----------------------------------
console.log("\n-- open from Results --");
doc.activeElement = openerCard;
win.openDrawerLifecycle();
check("focus moves to the dialog title", doc.activeElement === title);
check("drawer is no longer inert", !drawer.hasAttribute("inert"));
check('drawer aria-hidden="false" when open', drawer.getAttribute("aria-hidden") === "false");
check("Results (the background) is inert", resultsScreen.hasAttribute("inert"));
check("the inerted screen is remembered", win.__state().inerted === "resultsScreen");
check("the opener is remembered for focus return", win.__state().returnFocus === "openerCard");

// ---------- scenario 2: idle reset while the drawer is open -----------------
// This is the exact reproduction Codex reported.
console.log("\n-- idle reset (startOver path) while open --");
backdrop.classList.add("open");
drawer.classList.add("drawer-open");
// startOver() switches the active screen; the drawer must still release the
// screen it actually inerted, not the newly-active one.
resultsScreen.classList.remove("active");
welcomeScreen.classList.add("active");
win.closeMattressDrawer({ immediate: true, restoreFocus: false });

check("Welcome is the active screen", welcomeScreen.classList.contains("active"));
check("drawer is inert immediately", drawer.hasAttribute("inert"));
check('drawer aria-hidden="true" immediately', drawer.getAttribute("aria-hidden") === "true");
check("drawer-open removed (no stale mattress over Welcome)", !drawer.classList.contains("drawer-open"));
check("is-closing NOT set on the reset path (hidden immediately)", !drawer.classList.contains("is-closing"));
check("backdrop closed", !backdrop.classList.contains("open"));
check("REGRESSION: Results is no longer inert", !resultsScreen.hasAttribute("inert"));
check("Welcome was never inerted", !welcomeScreen.hasAttribute("inert"));
check("focus not left inside the drawer", doc.activeElement !== title && doc.activeElement !== btnA);
check("focus not restored into the torn-down Results card", doc.activeElement !== openerCard);
check("no close timer left pending", !win.__state().timer);
check("stored background reference cleared", win.__state().inerted === null || win.__state().inerted === undefined);
check("stored opener reference cleared", !win.__state().returnFocus);

// ---------- scenario 3: the next session can use Results normally -----------
console.log("\n-- next session --");
welcomeScreen.classList.remove("active");
resultsScreen.classList.add("active");
doc.activeElement = openerCard;
win.openDrawerLifecycle();
check("drawer opens again in the new session", !drawer.hasAttribute("inert"));
check("Results can be inerted again", resultsScreen.hasAttribute("inert"));
win.closeMattressDrawer();
check("and released again", !resultsScreen.hasAttribute("inert"));
flushTimers();

// ---------- scenario 4: ordinary user close keeps slide-out + focus ---------
console.log("\n-- ordinary close --");
doc.activeElement = openerCard;
win.openDrawerLifecycle();
drawer.classList.add("drawer-open");
win.closeMattressDrawer();
check("is-closing set so the 400ms slide-out still plays", drawer.classList.contains("is-closing"));
check("inert applied immediately, without waiting for the animation", drawer.hasAttribute("inert"));
check("focus restored to the opener", doc.activeElement === openerCard);
flushTimers();
check("is-closing retired by the timer", !drawer.classList.contains("is-closing"));

// ---------- scenario 5: rapid close then reopen is timer-safe ---------------
console.log("\n-- rapid close / reopen --");
doc.activeElement = openerCard;
win.openDrawerLifecycle();
win.closeMattressDrawer();                 // starts the 400ms timer
check("timer pending after close", win.__state().timer);
win.openDrawerLifecycle();                 // reopen mid-slide-out
check("reopen cancels the pending hide", !win.__state().timer);
check("is-closing cleared on reopen", !drawer.classList.contains("is-closing"));
check("drawer is open again", !drawer.hasAttribute("inert"));
flushTimers();
check("stale timer cannot hide a reopened drawer", !drawer.hasAttribute("inert"));
win.closeMattressDrawer({ immediate: true, restoreFocus: false });

// ---------- scenario 6: keyboard ---------------------------------------------
console.log("\n-- keyboard --");
doc.activeElement = openerCard;
win.openDrawerLifecycle();
let prevented = false;
const ev = (key, shiftKey) => ({ key, shiftKey: !!shiftKey, preventDefault() { prevented = true; } });
doc.activeElement = title;
win.drawerKeydown(ev("Tab"));
check("Tab from the title is trapped into the dialog", prevented && doc.activeElement === btnA);
prevented = false;
doc.activeElement = btnB;                  // last focusable
win.drawerKeydown(ev("Tab"));
check("Tab from the last control wraps to the first", prevented && doc.activeElement === btnA);
prevented = false;
doc.activeElement = btnA;                  // first focusable
win.drawerKeydown(ev("Tab", true));
check("Shift+Tab from the first control wraps to the last", prevented && doc.activeElement === btnB);
win.drawerKeydown(ev("Escape"));
check("Escape closes the dialog", drawer.hasAttribute("inert"));
check("Escape restores focus to the opener", doc.activeElement === openerCard);

// ---------- idempotence -------------------------------------------------------
console.log("\n-- idempotence --");
win.closeMattressDrawer({ immediate: true, restoreFocus: false });
win.closeMattressDrawer();
check("closing an already-closed drawer is harmless", drawer.hasAttribute("inert")
  && !drawer.classList.contains("drawer-open") && !resultsScreen.hasAttribute("inert"));

console.log(`\nDrawer lifecycle check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
