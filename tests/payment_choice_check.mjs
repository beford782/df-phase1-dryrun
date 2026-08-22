// payment_choice_check.mjs — the Payment Choice slice (Slice 4, item D4).
//
// What this slice is: the customer-facing payment model was rebuilt from a
// salesperson-marked "discussion agenda" (a set of independently toggled
// topics) into TWO observable dimensions and nothing else —
//
//   payExplored — an ORDERED, de-duplicated list of canonical path ids in
//                 first-deliberate-open order. Descriptive history, never
//                 intent. Nothing ever removes an entry.
//   payPref     — exactly one of: null, a canonical path id, or PAY_NOT_NOW.
//
// plus payOpen, which is NOT a dimension: ephemeral disclosure state, invisible
// to the handoff, the email, the diagnostics and the customer's recorded
// position.
//
// This file REPLACES tests/handoff_interest_check.mjs. It reuses that suite's
// harness technique (regex-extract the real functions from index.html, execute
// them against a DOM shim and a controlled clock) and deliberately preserves
// none of its agenda assertions — the agenda is retired, and §20 below proves
// it is gone from executable code rather than merely unused.
//
// House style (quiz_presentation_check.mjs / results_presentation_check.mjs):
// EXTRACT the production sources and EXECUTE them. Grepping is used only where
// a fact cannot be executed without a browser — the shipped stylesheet's
// cascade, and the source-level inventories (§20, §23, §24, §25). Every
// pattern-shaped assertion is ALSO proved against a planted counter-example, so
// a typo'd regex cannot pass forever by matching nothing.
//
// HONEST SCOPE, stated once and repeated where it applies: the forced-colors
// and touch-floor sections are STATIC CASCADE ANALYSIS of the shipped
// stylesheet, not rendered verification. No forced-colors rendering
// environment was available; nothing here claims a cue was seen. Likewise the
// DOM shim models element identity, focus, :focus-visible and innerHTML
// subtree replacement — it does not lay anything out, so no assertion here
// claims a measured pixel.
//
// Writes nothing; exit 0 = pass.
// Run: node tests/payment_choice_check.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
// The working tree is CRLF on Windows and LF on CI; several assertions match
// across line breaks, so everything below reads the NORMALIZED text.
const norm = html.replace(/\r\n/g, '\n');
const CFG = JSON.parse(readFileSync(join(root, 'data', 'store-config.json'), 'utf8'));
const INCOMING = JSON.parse(readFileSync(join(root, 'incoming', 'lacks_financing.json'), 'utf8'));

let failures = 0;
let checks = 0;
function ok(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { failures++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n== ${t} ==`); }

// ===========================================================================
// EXTRACTION — the real production sources, not a copy
// ===========================================================================
section('extraction — the real Payment Choice sources');

function extractFunction(anchor) {
  const start = norm.indexOf(anchor);
  if (start === -1) return null;
  let i = norm.indexOf('{', start);
  if (i === -1) return null;
  let depth = 1;
  i++;
  while (i < norm.length && depth > 0) {
    const ch = norm[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return norm.slice(start, i) + ';';
}
function extractStatement(re) {
  const m = norm.match(re);
  return m ? m[0] : null;
}

const FUNCS = {
  L: 'function L(obj)',
  escapeHtml: 'function escapeHtml(str)',
  storeName: 'function storeName()',
  getFinancingConfig: 'function getFinancingConfig()',
  financingEnabled: 'function financingEnabled()',
  finSurfaceEnabled: 'function finSurfaceEnabled(name)',
  finPlanScenario: 'function finPlanScenario(p)',
  finPlanGroup: 'function finPlanGroup(p)',
  finSafeProvider: 'function finSafeProvider(p)',
  finGroupedPlans: 'function finGroupedPlans(plans)',
  finPromotionalByProvider: 'function finPromotionalByProvider(promoPlans)',
  financingSourceAllowed: 'function financingSourceAllowed(url)',
  setAllowedFinancingLink: 'function setAllowedFinancingLink(anchor, url, text, noteEl)',
  financingAgeOk: 'function financingAgeOk(ts, maxDays, label)',
  financingTermsFresh: 'function financingTermsFresh()',
  financingPlanFresh: 'function financingPlanFresh(p)',
  FC: 'function FC(key)',
  finEmailBody: 'function finEmailBody()',
  finLayoutClass: 'function finLayoutClass()',
  finEventBase: 'function finEventBase(placement)',
  finPathEncode: 'function finPathEncode(value)',
  finPathId: 'function finPathId(kind, value)',
  finPathDom: 'function finPathDom(prefix, pathId)',
  finPaymentPaths: 'function finPaymentPaths()',
  finPathById: 'function finPathById(id)',
  payIsExplored: 'function payIsExplored(id)',
  payRecordExplored: 'function payRecordExplored(id)',
  reviewPaymentPath: 'window.reviewPaymentPath = function(id)',
  considerPaymentPath: 'window.considerPaymentPath = function(id)',
  clearPaymentPreference: 'window.clearPaymentPreference = function(id)',
  setPaymentNotNow: 'window.setPaymentNotNow = function()',
  payFocusOrigin: 'function payFocusOrigin(controlId)',
  payRestoreFocus: 'function payRestoreFocus(successorId)',
  payRegionLive: 'function payRegionLive(regionId)',
  announcePayAction: 'function announcePayAction(regionId, key)',
  finHandoffVisible: 'function finHandoffVisible()',
  clearPayAnnouncements: 'function clearPayAnnouncements()',
  cancelPayAnnouncePending: 'function cancelPayAnnouncePending()',
  finEsc: 'function finEsc(s)',
  finPathBlock: 'function finPathBlock(path, bodyHtml)',
  renderFinancingSheet: 'function renderFinancingSheet()',
  updateFinancingSheetStatus: 'function updateFinancingSheetStatus()',
  renderHandoffFinancing: 'function renderHandoffFinancing()',
  renderResultsFinancing: 'function renderResultsFinancing()',
  finResultsVisible: 'function finResultsVisible()',
  renderDrawerFinancing: 'function renderDrawerFinancing()',
  renderAllFinancingSurfaces: 'function renderAllFinancingSurfaces()',
  openFinancingSheet: 'window.openFinancingSheet = function(placement)',
  closeFinancingSheet: 'window.closeFinancingSheet = function()',
  finSheetKeydown: 'function finSheetKeydown(e)'
};
const src = {};
const missingFn = [];
for (const [key, anchor] of Object.entries(FUNCS)) {
  // Every anchor must be UNIQUE, or the harness could silently execute a
  // different function than the one it claims to be testing.
  if (norm.split(anchor).length - 1 !== 1) missingFn.push(key + '(ambiguous)');
  src[key] = extractFunction(anchor);
  if (!src[key]) missingFn.push(key);
}
ok(`all ${Object.keys(FUNCS).length} production sources found, each by a unique anchor`,
  missingFn.length === 0, missingFn.join(','));

const VARS = {
  payState: /var payExplored = \[\];\n\s*var payPref = null;\n\s*var payOpen = \{\};\n\s*var PAY_NOT_NOW = 'not_now';/,
  returnFocus: /var _financeReturnFocus = null;/,
  impression: /var _finModuleImpressionLogged = false;/,
  sheetStale: /var _finSheetStale = false;/,
  announceTimer: /var _payAnnounceTimer = null;/,
  clockSkew: /var FINANCING_CLOCK_SKEW_MS = [^;]+;/,
  scenarioMexico: /var FIN_SCENARIO_MEXICO = [^;]+;/,
  evergreenKinds: /var FIN_EVERGREEN_KINDS = [^;]+;/,
  pathKinds: /var FIN_PATH_KINDS = [^;]+;/,
  keydownBound: /var _finSheetKeydownBound = false;/
};
const vars = {};
const missingVar = [];
for (const [key, re] of Object.entries(VARS)) {
  vars[key] = extractStatement(re);
  if (!vars[key]) missingVar.push(key);
}
ok('the D4 state declarations are the shipped ones (initial values come from index.html, not from this test)',
  missingVar.length === 0, missingVar.join(','));
if (missingFn.length || missingVar.length) {
  console.log('\nFAIL — sources missing; the rest of the suite cannot run honestly.');
  process.exit(1);
}

// Larger windows used only for source-level inventory assertions (§23, §24).
const wipeSrc = extractFunction('function resetSessionState(opts)') || '';
const emailCaptureSrc = extractFunction('window.showEmailCapture = function()') || '';
const sendResultsSrc = extractFunction('window.sendResults = function()') || '';
const sessionSummarySrc = extractFunction('function sessionSafeSummary(reason)') || '';
const eventFieldsSrc = (norm.match(/EVENT_FIELDS: \(function\(\) \{[\s\S]*?\}\)\(\),/) || [''])[0];
ok('the wipe, both email builders, the session summary and the diagnostics field map all extracted',
  wipeSrc.length > 2000 && emailCaptureSrc.length > 500 && sendResultsSrc.length > 500
  && sessionSummarySrc.length > 200 && eventFieldsSrc.length > 500,
  `wipe ${wipeSrc.length} / capture ${emailCaptureSrc.length} / send ${sendResultsSrc.length} / summary ${sessionSummarySrc.length} / fields ${eventFieldsSrc.length}`);

// ===========================================================================
// COMMENT STRIPPING — literal-aware, copied from tests/session_async_check.mjs
//
// Several retired agenda names legitimately SURVIVE inside comments as
// historical rationale ("the retired financingExplored flag was set at exactly
// this point"). A naive strip is also unsafe on this file: index.html contains
// `u.replace(/^\.?\/*/, '')`, a REGEX whose body holds the two characters `/*`,
// and a plain block-comment strip deletes from there to the next `*/` anywhere
// later — taking real call sites with it, and failing OPEN.
// ===========================================================================
function stripComments(source, deleted = []) {
  const REGEX_OK_AFTER = /[({[,;:=!&|?+\-*%~^]/;
  const REGEX_OK_KEYWORD = /(?:^|[^A-Za-z0-9_$])(?:return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/;
  let out = '';
  let i = 0;
  let prev = '';
  let prevWord = '';
  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];
    if (c === '/' && d === '/') {
      const from = i;
      while (i < source.length && source[i] !== '\n') i++;
      deleted.push(source.slice(from, i));
      continue;
    }
    if (c === '/' && d === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) { out += source.slice(i); break; }
      deleted.push(source.slice(i, end + 2));
      i = end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === c) { j++; break; }
        j++;
      }
      out += source.slice(i, j);
      prev = c; prevWord = ''; i = j;
      continue;
    }
    if (c === '/' && (prev === '' || REGEX_OK_AFTER.test(prev) || REGEX_OK_KEYWORD.test(prevWord))) {
      let j = i + 1, inClass = false;
      while (j < source.length) {
        const e = source[j];
        if (e === '\\') { j += 2; continue; }
        if (e === '\n') break;
        if (e === '[') inClass = true;
        else if (e === ']') inClass = false;
        else if (e === '/' && !inClass) { j++; break; }
        j++;
      }
      out += source.slice(i, j);
      prev = '/'; prevWord = ''; i = j;
      continue;
    }
    out += c;
    if (!/\s/.test(c)) {
      prev = c;
      prevWord = /[A-Za-z0-9_$]/.test(c) ? prevWord + c : '';
    }
    i++;
  }
  return out;
}
const deletedSpans = [];
const codeOnly = stripComments(norm, deletedSpans);

// ===========================================================================
// DOM SHIM
//
// getElementById does NOT auto-vivify. The static id universe is read out of
// index.html's own markup (the file with every <script> block removed), so an
// id the production code asks for and the page does not declare resolves to
// null here exactly as it would in a browser. Dynamic ids come into existence
// only by being written into some element's innerHTML, and go out of existence
// when that subtree is replaced — which is precisely the condition the focus
// restoration has to survive.
//
// What the shim does NOT model, stated plainly: layout (no measured pixel is
// asserted anywhere in this file), the element tree (closest() answers null,
// so §12's "hidden ancestor" arm of finHandoffVisible is out of scope here),
// and CSS itself (:focus-visible is an explicit per-element flag so a test can
// distinguish a KEYBOARD activation from a TOUCH one).
// ===========================================================================
const STATIC_MARKUP = norm.replace(/<script[\s\S]*?<\/script>/g, '');
const STATIC_IDS = [...STATIC_MARKUP.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const STATIC_HIDDEN = new Set();
for (const id of STATIC_IDS) {
  const tag = STATIC_MARKUP.match(
    new RegExp('<[a-zA-Z][^>]*\\bid="' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>'));
  if (tag && /\shidden(\s|>|=)/.test(tag[0])) STATIC_HIDDEN.add(id);
}
ok('the static id universe and its hidden attributes are read from the shipped markup',
  STATIC_IDS.length > 200 && STATIC_IDS.includes('financingSheet')
  && STATIC_IDS.includes('hf2Financing') && STATIC_IDS.includes('financingSheetAction')
  && STATIC_HIDDEN.has('financingSheet') && STATIC_HIDDEN.has('hf2Financing'),
  `${STATIC_IDS.length} ids, ${STATIC_HIDDEN.size} hidden`);

function makeEl(id, doc) {
  const el = {
    id, style: {}, attrs: {}, textContent: '', _html: '',
    hidden: false, isConnected: true, href: undefined, alt: '', value: '',
    _focusCount: 0, _focusOpts: null, _focusVisible: false, _detached: false,
    _writes: [], _ev: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => el.classList._s.add(x)); },
      remove(...c) { c.forEach((x) => el.classList._s.delete(x)); },
      contains(c) { return el.classList._s.has(c); }
    },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(el.attrs, k) ? el.attrs[k] : null; },
    setAttribute(k, v) { el.attrs[k] = v; },
    removeAttribute(k) { delete el.attrs[k]; if (k === 'href') el.href = undefined; },
    addEventListener(type, fn) { (el._ev[type] = el._ev[type] || []).push(fn); },
    closest() { return null; },
    matches(sel) { return sel === ':focus-visible' ? el._focusVisible : false; },
    focus(opts) { el._focusCount++; el._focusOpts = opts || null; if (doc) doc.activeElement = el; }
  };
  let _text = '';
  Object.defineProperty(el, 'textContent', {
    get() { return _text; },
    set(v) { _text = String(v); el._writes.push(_text); }
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) {
      el._html = String(v);
      if (!doc) return;
      (el._owned || []).forEach((cid) => {
        const prev = doc._els.get(cid);
        if (prev) { prev._detached = true; prev.isConnected = false; }
        doc._els.delete(cid);
      });
      const owned = [...el._html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      owned.forEach((cid) => { doc._els.set(cid, makeEl(cid, doc)); });
      el._owned = owned;
    }
  });
  return el;
}

function makeDoc() {
  const doc = {
    _els: new Map(),
    activeElement: null,
    getElementById(id) { return doc._els.get(id) || null; }
  };
  STATIC_IDS.forEach((id) => {
    const el = makeEl(id, doc);
    el.hidden = STATIC_HIDDEN.has(id);
    doc._els.set(id, el);
  });
  doc.body = makeEl('__body', doc);
  return doc;
}

// The pieces of module source, in the order index.html declares them. Any
// `mutate` runs over the WHOLE body, so a negative control can plant a defect
// in exactly the production text under test.
const MODULE_ORDER = [
  vars.clockSkew, vars.scenarioMexico, vars.evergreenKinds, vars.pathKinds,
  vars.payState, vars.returnFocus, vars.impression, vars.sheetStale,
  vars.announceTimer, vars.keydownBound,
  src.L, src.escapeHtml, src.storeName,
  src.getFinancingConfig, src.financingEnabled, src.finSurfaceEnabled,
  src.finPlanScenario, src.finPlanGroup, src.finSafeProvider,
  src.finGroupedPlans, src.finPromotionalByProvider,
  src.financingSourceAllowed, src.setAllowedFinancingLink,
  src.financingAgeOk, src.financingTermsFresh, src.financingPlanFresh,
  src.FC, src.finEmailBody, src.finLayoutClass, src.finEventBase,
  src.finPathEncode, src.finPathId, src.finPathDom,
  src.finPaymentPaths, src.finPathById,
  src.payIsExplored, src.payRecordExplored,
  src.reviewPaymentPath, src.considerPaymentPath,
  src.clearPaymentPreference, src.setPaymentNotNow,
  src.payFocusOrigin, src.payRestoreFocus,
  src.payRegionLive, src.announcePayAction, src.finHandoffVisible,
  src.clearPayAnnouncements, src.cancelPayAnnouncePending,
  src.openFinancingSheet, src.closeFinancingSheet, src.finSheetKeydown,
  src.finEsc, src.finPathBlock,
  src.renderFinancingSheet, src.updateFinancingSheetStatus,
  src.renderHandoffFinancing, src.renderResultsFinancing, src.finResultsVisible,
  src.renderDrawerFinancing, src.renderAllFinancingSurfaces
].join('\n');

const RETURN_API = `
  return {
    encode: finPathEncode,
    pathId: finPathId,
    pathDom: finPathDom,
    paths: finPaymentPaths,
    pathById: finPathById,
    isExplored: payIsExplored,
    recordExplored: payRecordExplored,
    review: window.reviewPaymentPath,
    consider: window.considerPaymentPath,
    clearPref: window.clearPaymentPreference,
    notNow: window.setPaymentNotNow,
    openSheet: window.openFinancingSheet,
    closeSheet: window.closeFinancingSheet,
    renderSheet: renderFinancingSheet,
    renderHandoff: renderHandoffFinancing,
    renderResults: renderResultsFinancing,
    renderDrawer: renderDrawerFinancing,
    renderAll: renderAllFinancingSurfaces,
    updateStatus: updateFinancingSheetStatus,
    pathBlock: finPathBlock,
    emailBody: finEmailBody,
    eventBase: finEventBase,
    announce: announcePayAction,
    clearAnnouncements: clearPayAnnouncements,
    cancelAnnounce: cancelPayAnnouncePending,
    focusOrigin: payFocusOrigin,
    restoreFocus: payRestoreFocus,
    regionLive: payRegionLive,
    handoffVisible: finHandoffVisible,
    enabled: financingEnabled,
    surfaceEnabled: finSurfaceEnabled,
    termsFresh: financingTermsFresh,
    FC: FC,
    NOT_NOW: PAY_NOT_NOW,
    timer: function() { return _payAnnounceTimer; },
    timerCount: function() { return _payAnnounceTimer === null ? 0 : 1; },
    stale: function() { return _finSheetStale; },
    returnFocus: function() { return _financeReturnFocus; },
    state: function() {
      return { explored: payExplored.slice(), pref: payPref,
               open: Object.keys(payOpen).slice().sort() };
    },
    seed: function(s) {
      if (s.explored) payExplored = s.explored.slice();
      if (Object.prototype.hasOwnProperty.call(s, 'pref')) payPref = s.pref;
      if (s.open) { payOpen = {}; s.open.forEach(function(k) { payOpen[k] = true; }); }
    },
    setLang: function(l) { currentLang = l; },
    getLang: function() { return currentLang; },
    setConfig: function(c) { STORE_CONFIG = c; }
  };`;

function makeEnv({ lang = 'en', config = CFG, mutate = null,
                   sheetOpen = false, handoffActive = true, resultsActive = false } = {}) {
  const doc = makeDoc();
  if (handoffActive) doc.getElementById('hf2Screen').classList.add('active');
  if (resultsActive) doc.getElementById('resultsScreen').classList.add('active');
  if (sheetOpen) {
    doc.getElementById('financingSheet').hidden = false;
    doc.getElementById('financingSheetBackdrop').hidden = false;
  }

  const timers = [];
  const setTimeoutFake = (cb) => { timers.push({ cb, cleared: false, done: false }); return timers.length; };
  const clearTimeoutFake = (id) => { if (timers[id - 1]) timers[id - 1].cleared = true; };
  const sessionTimers = [];
  const sessionTimeout = (cb, ms) => { sessionTimers.push({ cb, ms }); return sessionTimers.length; };
  const events = [];
  const analytics = { log: (name, data) => events.push({ name, data }), sessionId: 'test' };
  const win = { innerWidth: 1200 };

  let body = MODULE_ORDER;
  if (mutate) body = mutate(body);

  const api = new Function(
    'document', 'window', 'STORE_CONFIG', 'analytics', 'sessionTimeout',
    'setTimeout', 'clearTimeout', 'console', '__lang',
    'var currentLang = __lang;\n' + body + RETURN_API
  )(doc, win, config, analytics, sessionTimeout, setTimeoutFake, clearTimeoutFake,
    { warn() {}, log() {}, error() {} }, lang);

  return {
    api, doc, win, events, sessionTimers,
    get: (id) => doc.getElementById(id),
    txt: (id) => (doc.getElementById(id) || { textContent: null }).textContent,
    sheetHtml: () => doc.getElementById('financingSheetCards').innerHTML,
    handoffHtml: () => doc.getElementById('hf2FinancingInterest').innerHTML,
    flush: () => timers.forEach((t) => { if (!t.cleared && !t.done) { t.done = true; t.cb(); } }),
    pending: () => timers.filter((t) => !t.cleared && !t.done).length,
    timers,
    focusKeyboard: (id) => {
      const el = doc.getElementById(id);
      if (!el) throw new Error('no such control to focus: ' + id);
      el._focusVisible = true;
      doc.activeElement = el;
      return el;
    },
    focusPointer: (id) => {
      const el = doc.getElementById(id);
      if (!el) throw new Error('no such control to focus: ' + id);
      el._focusVisible = false;      // a mouse click focuses but is not focus-visible
      doc.activeElement = el;
      return el;
    }
  };
}

// An env with the sheet rendered and open, which is where the path controls live.
function openEnv(opts = {}) {
  const env = makeEnv({ sheetOpen: true, ...opts });
  env.api.renderSheet();
  env.api.renderHandoff();
  return env;
}

const P = (env) => env.api.paths().map((x) => x.id);
const snapshot = (env) => JSON.stringify(env.api.state());

// Attribute reader for a control in rendered markup, by id.
function tagOf(markup, id) {
  const m = markup.match(
    new RegExp('<([a-zA-Z]+)([^>]*\\bid="' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*)>'));
  return m ? { name: m[1], attrs: m[2], raw: m[0] } : null;
}
const attr = (tag, k) => {
  if (!tag) return null;
  const m = tag.attrs.match(new RegExp('\\b' + k + '="([^"]*)"'));
  return m ? m[1] : null;
};
const hasAttr = (tag, k) => !!tag && new RegExp('\\b' + k + '(=|\\s|$)').test(tag.attrs);

// ===========================================================================
// 1–2. A new session, and what merely arriving records
// ===========================================================================
section('§1–2 — a new session, and arriving at the sheet');
{
  const env = makeEnv();
  ok('§1 new session: payExplored is empty, payPref is null, payOpen is empty',
    snapshot(env) === JSON.stringify({ explored: [], pref: null, open: [] }), snapshot(env));
  ok('§1 the committed configuration really does offer payment paths (so §2 is not vacuous)',
    env.api.enabled() === true && P(env).length >= 4, P(env).join(','));
}
{
  const env = makeEnv();
  const before = snapshot(env);
  env.api.openSheet('results');
  ok('§2 opening the whole sheet records NOTHING — arriving at a room is not choosing a door',
    snapshot(env) === before, snapshot(env));
  ok('§2 the sheet did open (the no-op above is not a no-op because nothing happened)',
    env.get('financingSheet').hidden === false
    && env.doc.body.classList.contains('fin-sheet-open')
    && env.events.some((e) => e.name === 'finance_details_open'));
  ok('§2 opening the sheet emits no payment identifier in its diagnostic event',
    env.events.every((e) => !/pay|path|pref|explored/i.test(JSON.stringify(e.data))),
    JSON.stringify(env.events.map((e) => e.data)));
}

// ===========================================================================
// 3–5. Disclosure: what opening and closing a path's details records
// ===========================================================================
section('§3–5 — disclosure records history, once, in first-open order');
{
  const env = openEnv();
  const [A, B] = P(env);
  env.api.review(A);
  ok('§3 opening path A appends A exactly once',
    JSON.stringify(env.api.state().explored) === JSON.stringify([A]));
  ok('§3 opening path A does not change the preference', env.api.state().pref === null);
  ok('§3 opening path A expands only A',
    JSON.stringify(env.api.state().open) === JSON.stringify([A]));

  const beforeClose = JSON.stringify(env.api.state().explored);
  env.api.review(A);
  ok('§4 closing A changes no history and no preference',
    JSON.stringify(env.api.state().explored) === beforeClose && env.api.state().pref === null);
  ok('§4 closing A collapses the panel (payOpen is ephemeral, history is not)',
    env.api.state().open.length === 0);

  env.api.review(A);
  ok('§3 re-opening A does not append a second entry',
    JSON.stringify(env.api.state().explored) === JSON.stringify([A]));
}
{
  const env = openEnv();
  const [A, B] = P(env);
  env.api.review(A);
  env.api.review(B);
  env.api.review(A);      // close A
  env.api.review(A);      // re-open A
  ok('§5 history is de-duplicated and ordered by FIRST deliberate open, not by last',
    JSON.stringify(env.api.state().explored) === JSON.stringify([A, B]),
    env.api.state().explored.join(','));
}
{
  const env = openEnv();
  const ids = P(env);
  ids.forEach((id) => env.api.review(id));
  // NOT an independent check of authored-config order: `ids` is the list
  // finPaymentPaths() returned, and the assertion compares the history with
  // that same list. What it proves is completeness plus preservation of the
  // order the paths were REVIEWED in, which is the order they were enumerated.
  ok('§5 opening every path records every path, in the path enumeration order returned by finPaymentPaths',
    JSON.stringify(env.api.state().explored) === JSON.stringify(ids));
  ok('§5 opening every path leaves every panel open simultaneously (disclosure is not exclusive)',
    env.api.state().open.length === ids.length);
}

// ===========================================================================
// 6–11. Preference: Consider, replace, pause, idempotence, Clear
// ===========================================================================
section('§6–11 — the single preference, and the only control that unsets it');
{
  const env = openEnv();
  const [A, B] = P(env);
  env.api.consider(A);
  ok('§6 considering A sets the preference to A', env.api.state().pref === A);
  ok('§6 considering A ensures A is explored, even though its panel was never opened',
    JSON.stringify(env.api.state().explored) === JSON.stringify([A]));
  ok('§6 considering A opens no panel', env.api.state().open.length === 0);

  env.api.consider(B);
  ok('§7 considering B replaces A as the ONLY preference', env.api.state().pref === B);
  ok('§7 replacing the preference preserves the full history, in order',
    JSON.stringify(env.api.state().explored) === JSON.stringify([A, B]));
}
{
  const env = openEnv();
  const [A] = P(env);
  env.api.notNow();
  ok('§8 precondition: not_now is active', env.api.state().pref === env.api.NOT_NOW);
  env.api.consider(A);
  ok('§8 considering a path while paused replaces the pause', env.api.state().pref === A);
}
{
  const env = openEnv();
  const [A] = P(env);
  env.api.consider(A);
  const before = snapshot(env);
  const writesBefore = env.get('financingSheetAction')._writes.length;
  env.api.consider(A);
  ok('§9 re-considering the current path is an idempotent NO-OP, never a toggle off',
    snapshot(env) === before && env.api.state().pref === A, snapshot(env));
  ok('§9 the idempotent no-op announces nothing (it is not a state change)',
    env.get('financingSheetAction')._writes.length === writesBefore);
}
{
  const env = openEnv();
  const ids = P(env);
  const [A, B] = ids;
  ids.forEach((id) => env.api.review(id));
  env.api.consider(A);
  const before = snapshot(env);

  env.api.clearPref(B);
  ok('§10 Clear naming a DIFFERENT path is a no-op', snapshot(env) === before);
  env.api.clearPref('promo-NotAConfiguredProvider');
  ok('§10 Clear naming an unknown id is a no-op', snapshot(env) === before);
  env.api.clearPref('not_now');
  ok('§10 Clear naming not_now is a no-op (the pause is unset by its own control)',
    snapshot(env) === before);
  env.api.clearPref(null);
  env.api.clearPref(undefined);
  env.api.clearPref('');
  ok('§10 Clear with null / undefined / empty id is a no-op', snapshot(env) === before);

  env.api.clearPref(A);
  ok('§11 Clear on the EXACT current preference sets it to null', env.api.state().pref === null);
  ok('§11 Clear preserves ALL history, in order',
    JSON.stringify(env.api.state().explored) === JSON.stringify(ids),
    env.api.state().explored.join(','));
}
{
  const env = openEnv();
  const [A] = P(env);
  env.api.notNow();
  ok('§8 not_now toggles on', env.api.state().pref === env.api.NOT_NOW);
  env.api.notNow();
  ok('§8 not_now toggles back to "nothing selected" (it is the one reversible control)',
    env.api.state().pref === null);
  env.api.consider(A);
  env.api.notNow();
  ok('§8 not_now while a path is selected replaces that path',
    env.api.state().pref === env.api.NOT_NOW);
}

// ===========================================================================
// 12. not_now suppresses the handoff row only
// ===========================================================================
section('§12 — not_now is presentation suppression, not deletion');
{
  const env = openEnv();
  const ids = P(env);
  ids.slice(0, 3).forEach((id) => env.api.review(id));
  env.api.renderHandoff();
  const rowBefore = env.handoffHtml();
  const sheetBefore = env.sheetHtml();
  const exploredBefore = env.api.state().explored.slice();

  env.api.notNow();
  ok('§12 not_now preserves the explored history INTERNALLY',
    JSON.stringify(env.api.state().explored) === JSON.stringify(exploredBefore));
  ok('§12 not_now suppresses the explored ROW in the handoff',
    !/fin-explored-list/.test(env.handoffHtml()) && /fin-explored-list/.test(rowBefore));
  ok('§12 not_now does NOT hide or alter the sheet',
    env.sheetHtml() === sheetBefore && env.get('financingSheet').hidden === false);

  env.api.notNow();
  env.api.renderHandoff();
  ok('§12 undoing not_now restores the explored row unchanged',
    env.handoffHtml() === rowBefore);
}

// ===========================================================================
// 13. Unknown, stale and colliding ids
// ===========================================================================
section('§13 — unknown / stale / colliding ids never become state and never become text');
{
  const env = openEnv();
  const before = snapshot(env);
  ['promo-Nope', 'plan-nope', 'scenario-nope', 'not_now', 'promo-', '', null, undefined, 42, {}]
    .forEach((bad) => { env.api.review(bad); env.api.consider(bad); env.api.clearPref(bad); });
  ok('§13 every unknown/malformed id no-ops across all three entry points',
    snapshot(env) === before, snapshot(env));
}
{
  // STALE: a preference and a history recorded under one configuration, read
  // back under a configuration that no longer has those paths.
  const env = openEnv();
  const ids = P(env);
  ids.forEach((id) => env.api.review(id));
  env.api.consider(ids[0]);

  const shrunk = JSON.parse(JSON.stringify(CFG));
  shrunk.financing.plans = shrunk.financing.plans.filter((p) => p.kind === 'lease-to-own');
  env.api.setConfig(shrunk);
  env.api.renderHandoff();
  const markup = env.handoffHtml();
  ok('§13 a stale preference reads as the governed "not selected" label, never a raw token',
    markup.includes(CFG.financing.copy.preferenceNone.en)
    && ids.every((id) => !markup.includes(id)), ids.filter((id) => markup.includes(id)).join(','));
  ok('§13 unresolvable explored ids drop out silently rather than rendering',
    !/fin-explored-list/.test(markup) || !ids.some((id) => markup.includes(id)));
  ok('§13 the stale ids are still HELD in state (presentation dropped them, the model did not)',
    JSON.stringify(env.api.state().explored) === JSON.stringify(ids)
    && env.api.state().pref === ids[0]);
}
{
  // COLLIDING under the retired slugifier: two providers that produced one key.
  const collide = JSON.parse(JSON.stringify(CFG));
  const base = CFG.financing.plans.find((p) => p.kind === 'open-end-promotional-credit');
  collide.financing.plans = ['Synchrony Bank', 'Synchrony-Bank', 'Synchrony', 'SYNCHRONY']
    .map((provider, i) => Object.assign(JSON.parse(JSON.stringify(base)), {
      id: 'collide-' + i, provider
    }));
  const env = openEnv({ config: collide });
  const ids = P(env);
  ok('§13 four providers that collided under the retired slugifier produce four distinct paths',
    ids.length === 4 && new Set(ids).size === 4, ids.join(','));
  env.api.consider(ids[0]);
  ok('§13 considering one colliding provider marks exactly that one',
    env.api.state().pref === ids[0]
    && ids.slice(1).every((id) => env.api.state().pref !== id));
  env.api.renderSheet();
  const marker = tagOf(env.sheetHtml(), 'finPathMarker-' + ids[0]);
  ok('§13 exactly one considering marker renders across the four colliding cards',
    !!marker && (env.sheetHtml().match(/class="fin-path-marker"/g) || []).length === 1);
  ok('§13 no raw path id leaks into the rendered sheet as customer-visible text',
    ids.every((id) => !new RegExp('>[^<]*' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^<]*<')
      .test(env.sheetHtml())));
}

// ===========================================================================
// 14. Renderers are pure with respect to the model
// ===========================================================================
section('§14 — no renderer mutates the model');
{
  const env = openEnv();
  const ids = P(env);
  ids.forEach((id) => env.api.review(id));
  env.api.consider(ids[1]);
  const renderers = [
    ['renderFinancingSheet', () => env.api.renderSheet()],
    ['renderHandoffFinancing', () => env.api.renderHandoff()],
    ['renderResultsFinancing', () => env.api.renderResults()],
    ['renderDrawerFinancing', () => env.api.renderDrawer()],
    ['renderAllFinancingSurfaces', () => env.api.renderAll()],
    ['finPathBlock', () => env.api.pathBlock(env.api.pathById(ids[0]), '<p>x</p>')],
    ['updateFinancingSheetStatus', () => env.api.updateStatus()]
  ];
  for (const [name, run] of renderers) {
    const before = snapshot(env);
    run(); run();
    const after = snapshot(env);
    ok(`§14 ${name}() called twice leaves payExplored / payPref / payOpen untouched`,
      after === before, after === before ? '' : `${before} -> ${after}`);
  }
}
{
  // Rendering with NOTHING recorded must also record nothing — the retired
  // model's failure mode was a renderer (and an opener) writing state.
  const env = openEnv();
  env.api.renderAll(); env.api.renderAll();
  ok('§14 rendering every surface from a clean session records nothing',
    snapshot(env) === JSON.stringify({ explored: [], pref: null, open: [] }));
}

// ===========================================================================
// 15. The preference is never also listed as merely explored
// ===========================================================================
section('§15 — the preference never doubles as an explored entry');
{
  const env = openEnv();
  const ids = P(env);
  ids.forEach((id) => env.api.review(id));
  for (const id of ids) {
    env.api.consider(id);
    env.api.renderHandoff();
    const label = env.api.pathById(id).label;
    const listMatch = env.handoffHtml().match(/<ul class="fin-explored-list">([\s\S]*?)<\/ul>/);
    const listed = listMatch ? listMatch[1] : '';
    ok(`§15 "${label}" is named on the preference row and NOT in the explored list`,
      env.handoffHtml().includes(label) && !listed.includes(label));
    ok(`§15 the other ${ids.length - 1} explored paths are still listed`,
      (listed.match(/<li>/g) || []).length === ids.length - 1,
      `${(listed.match(/<li>/g) || []).length} items`);
  }
}

// ===========================================================================
// 16. Path identity — injectivity, proved by decoding
// ===========================================================================
section('§16 — finPathEncode is injective (proved by a decoder, not by inspection)');

// The decoder lives HERE, in the test, on purpose: a round trip through an
// independent inverse is what proves the escape is lossless. The encoder emits
// `_` followed by exactly two lowercase hex digits for every escaped byte and
// never emits a bare `_`, so a left-to-right scan is unambiguous.
function finPathDecode(encoded) {
  return decodeURIComponent(String(encoded).replace(/_([0-9a-f]{2})/g, '%$1'));
}

const CORPUS = [
  'Synchrony Bank', 'Synchrony-Bank', 'Synchrony', 'SYNCHRONY', 'synchrony',
  'Café', 'Caf!', 'Caf', 'General', '', 'general',
  'a b', 'a-b', 'x_y', 'x-y', 'x_5fy', 'x__y',
  '_', '-', '.', '!', '~', '*', "'", '(', ')', '%', '%20', 'a%20b',
  '__proto__', 'constructor', 'toString', 'valueOf', 'prototype',
  'a/b', 'a\\b', 'a.b', 'a:b', 'a;b', 'a b ', ' a b', 'A B',
  'ñ', 'Ñ', '日本語', '🙂', 'é', 'é',
  '<script>', 'a"b', "a'b", 'a&b', 'a\tb', 'a\nb',
  'promo-x', 'plan-x', 'scenario-x', 'promo', '0', '00', '0x'
];
{
  const env = makeEnv();
  const seen = new Map();
  const collisions = [];
  const roundTripFails = [];
  const alphabetFails = [];
  for (const v of CORPUS) {
    const e = env.api.encode(v);
    if (!/^[A-Za-z0-9_-]*$/.test(e)) alphabetFails.push(JSON.stringify(v) + '->' + e);
    if (finPathDecode(e) !== v) roundTripFails.push(JSON.stringify(v) + '->' + e + '->' + JSON.stringify(finPathDecode(e)));
    if (seen.has(e)) collisions.push(`${JSON.stringify(seen.get(e))} == ${JSON.stringify(v)} -> ${e}`);
    seen.set(e, v);
  }
  ok(`§16 every one of the ${CORPUS.length} adversarial values encodes to a distinct id`,
    collisions.length === 0, collisions.slice(0, 4).join(' | '));
  ok('§16 every encoding round-trips through an independent decoder (the escape is lossless)',
    roundTripFails.length === 0, roundTripFails.slice(0, 4).join(' | '));
  ok('§16 every encoding stays inside the [A-Za-z0-9_-] alphabet',
    alphabetFails.length === 0, alphabetFails.slice(0, 4).join(' | '));
}
{
  // The RETIRED slugifier, reimplemented here so the collisions it produced are
  // demonstrated rather than asserted from a comment: lower-case, replace runs
  // of non-[a-z0-9_-] with '-', trim the edges. Its provider-less promotional
  // group fell back to the literal 'general'.
  const retired = (v) => String(v).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  const RETIRED_NO_PROVIDER = 'general';
  const env = makeEnv();
  const PAIRS = [
    ['Synchrony Bank', 'Synchrony-Bank'],
    ['Synchrony', 'SYNCHRONY'],
    ['Café', 'Caf!'],
    ['a b', 'a-b']
  ];
  for (const [x, y] of PAIRS) {
    ok(`§16 precondition: the retired slugifier really collided on ${JSON.stringify(x)} / ${JSON.stringify(y)}`,
      retired(x) === retired(y), `${retired(x)} == ${retired(y)}`);
    ok(`§16 the shipped encoder keeps ${JSON.stringify(x)} and ${JSON.stringify(y)} distinct`,
      env.api.encode(x) !== env.api.encode(y),
      `${env.api.encode(x)} vs ${env.api.encode(y)}`);
  }
  ok('§16 precondition: a provider named "General" collided with a provider-less promotional group',
    retired('General') === RETIRED_NO_PROVIDER);
  ok('§16 the shipped encoder keeps a "General" provider distinct from no provider at all',
    env.api.pathId('promo', 'General') !== env.api.pathId('promo', ''),
    `${env.api.pathId('promo', 'General')} vs ${env.api.pathId('promo', '')}`);
  ok('§16 "x_y" and "x-y" stay distinct, and a literal underscore cannot be read as an escape marker',
    env.api.encode('x_y') !== env.api.encode('x-y')
    && env.api.encode('x_y') !== env.api.encode('x_5fy')
    && env.api.encode('x_5fy') !== env.api.encode('x_y'),
    `${env.api.encode('x_y')} / ${env.api.encode('x-y')} / ${env.api.encode('x_5fy')}`);
}
{
  // Every generated DOM id, for every corpus value and every kind, must be a
  // usable element id AND a usable CSS id selector. The retired keys embedded a
  // colon ("promotional:synchrony"), which getElementById tolerates but
  // querySelector parses as a pseudo-class.
  //
  // Honest scope: this is a LEXICAL check against the CSS ident grammar (no
  // escapes, no leading digit), not a browser parse — node has no
  // querySelector. The planted counter-example below proves it bites.
  const env = makeEnv();
  const DOM_ID = /^[A-Za-z][A-Za-z0-9_-]*$/;
  const CSS_ID_SELECTOR = /^#-?[A-Za-z_][A-Za-z0-9_-]*$/;
  const PREFIXES = ['finPathReview', 'finPathPanel', 'finPathConsider', 'finPathClear', 'finPathMarker'];
  const bad = [];
  let generated = 0;
  for (const kind of ['promo', 'plan', 'scenario']) {
    for (const v of CORPUS) {
      const pathId = env.api.pathId(kind, v);
      for (const prefix of PREFIXES) {
        const domId = env.api.pathDom(prefix, pathId);
        generated++;
        if (!DOM_ID.test(domId)) bad.push('shape:' + domId);
        if (domId.includes(':')) bad.push('colon:' + domId);
        if (!CSS_ID_SELECTOR.test('#' + domId)) bad.push('selector:' + domId);
      }
    }
  }
  ok(`§16 all ${generated} generated DOM ids match /^[A-Za-z][A-Za-z0-9_-]*$/, contain no colon, and are valid id selectors`,
    bad.length === 0, bad.slice(0, 4).join(' | '));
  ok('§16 control: the retired colon-bearing key shape fails all three checks (so they bite)',
    !DOM_ID.test('promotional:synchrony')
    && !CSS_ID_SELECTOR.test('#promotional:synchrony')
    && 'finAgenda-promotional:synchrony'.includes(':'));
  ok('§16 the app source constructs no finAgenda- id and no colon-bearing payment id',
    !codeOnly.includes('finAgenda-')
    && !/finPath(Review|Panel|Consider|Clear|Marker)[^'"\s]*:/.test(codeOnly)
    && PREFIXES.every((p) => !p.includes(':')));
}
{
  // Identity is LANGUAGE-INDEPENDENT: labels are recomputed per call, ids are
  // not. That is what lets §22's language switch preserve the model.
  const en = makeEnv({ lang: 'en' });
  const es = makeEnv({ lang: 'es' });
  ok('§16 path ids are identical in EN and ES; only the labels differ',
    JSON.stringify(P(en)) === JSON.stringify(P(es))
    && en.api.paths().some((p, i) => p.label !== es.api.paths()[i].label),
    P(en).join(','));
}
{
  // A path with no resolvable label is dropped — it cannot be named on the
  // handoff, so it must not be selectable either.
  const nameless = JSON.parse(JSON.stringify(CFG));
  nameless.financing.plans = nameless.financing.plans.map((p) =>
    (p.kind === 'lease-to-own' ? Object.assign({}, p, { headline: { en: '', es: '' } }) : p));
  const env = makeEnv({ config: nameless });
  ok('§16 a path whose label does not resolve is dropped from the selectable set',
    !P(env).includes(env.api.pathId('plan', 'lease-to-own'))
    && env.api.pathById(env.api.pathId('plan', 'lease-to-own')) === null,
    P(env).join(','));
  const before = snapshot(env);
  env.api.consider(env.api.pathId('plan', 'lease-to-own'));
  ok('§16 an unlabelled path cannot be considered either', snapshot(env) === before);
}

// ===========================================================================
// 17. Accessibility — computed outcomes first, cascade analysis second
// ===========================================================================
section('§17 — control semantics, computed from the rendered markup');
{
  const env = openEnv();
  const ids = P(env);
  const markup = env.sheetHtml();

  const reviewTags = ids.map((id) => tagOf(markup, 'finPathReview-' + id));
  ok('§17 every path renders a Review control, and every one is a native <button>',
    reviewTags.length === ids.length && reviewTags.every((t) => t && t.name === 'button'),
    reviewTags.map((t) => t && t.name).join(','));
  ok('§17 every Review control carries type="button" (never a form submit)',
    reviewTags.every((t) => attr(t, 'type') === 'button'));
  ok('§17 every Review control starts aria-expanded="false"',
    reviewTags.every((t) => attr(t, 'aria-expanded') === 'false'));
  ok('§17 every Review control names a panel with aria-controls, and every named panel EXISTS in the markup',
    reviewTags.every((t) => {
      const panelId = attr(t, 'aria-controls');
      return !!panelId && markup.includes('id="' + panelId + '"');
    }), reviewTags.map((t) => attr(t, 'aria-controls')).join(','));

  env.api.review(ids[0]);
  const opened = env.sheetHtml();
  ok('§17 aria-expanded flips to true for the opened path only',
    attr(tagOf(opened, 'finPathReview-' + ids[0]), 'aria-expanded') === 'true'
    && ids.slice(1).every((id) => attr(tagOf(opened, 'finPathReview-' + id), 'aria-expanded') === 'false'));
  ok('§17 the panel is a <div> that carries the hidden attribute when collapsed and drops it when expanded',
    tagOf(opened, 'finPathPanel-' + ids[0]).name === 'div'
    && !hasAttr(tagOf(opened, 'finPathPanel-' + ids[0]), 'hidden')
    && hasAttr(tagOf(opened, 'finPathPanel-' + ids[1]), 'hidden'));
  ok('§17 the disclosure is NOT <details>/<summary> — no <summary> appears anywhere in the sheet markup',
    !/<summary/i.test(opened) && !/<details/i.test(opened));
  ok('§17 the sheet focus trap really does select only button / [href] / the title, which is WHY <summary> is unusable here',
    src.finSheetKeydown.includes("'button, [href], [tabindex=\"-1\"]#financingSheetTitle'"));
  ok('§17 the Review label itself changes between states (the accessible name is not static)',
    opened.includes(CFG.financing.copy.hideDetails.en)
    && opened.includes(CFG.financing.copy.reviewOption.en));

  env.api.review(ids[0]);   // collapse again
}
{
  const env = openEnv();
  const ids = P(env);
  const markup = env.sheetHtml();
  const considerTags = ids.map((id) => tagOf(markup, 'finPathConsider-' + id));
  ok('§17 every path renders a Consider control as a native <button>',
    considerTags.every((t) => t && t.name === 'button'));
  ok('§17 Consider carries NO aria-pressed — it is one-way, and labelling it two-state would be a lie',
    considerTags.every((t) => attr(t, 'aria-pressed') === null),
    considerTags.map((t) => attr(t, 'aria-pressed')).join(','));

  env.api.consider(ids[0]);
  const after = env.sheetHtml();
  const marker = tagOf(after, 'finPathMarker-' + ids[0]);
  const clear = tagOf(after, 'finPathClear-' + ids[0]);
  ok('§17 the considering marker is a non-interactive <span>: not a button',
    !!marker && marker.name === 'span');
  ok('§17 the marker carries no aria-pressed, no role, and is not focusable',
    attr(marker, 'aria-pressed') === null && attr(marker, 'role') === null
    && attr(marker, 'tabindex') === null && !/onclick|ontouchend/.test(marker.attrs));
  ok('§17 the marker states its meaning in words, not by colour alone',
    after.includes(CFG.financing.copy.currentlyConsidering.en));
  ok('§17 Clear is a SEPARATE button with its own name',
    !!clear && clear.name === 'button'
    && after.includes(CFG.financing.copy.clearPreference.en)
    && CFG.financing.copy.clearPreference.en !== CFG.financing.copy.considerOption.en);
  ok('§17 Consider is replaced by marker + Clear for the considered path only',
    tagOf(after, 'finPathConsider-' + ids[0]) === null
    && ids.slice(1).every((id) => !!tagOf(after, 'finPathConsider-' + id)
      && tagOf(after, 'finPathMarker-' + id) === null));
}
{
  const env = openEnv();
  const notNow = tagOf(env.handoffHtml(), 'hf2FinancingNotNow');
  ok('§17 "Not right now" IS a two-state control and carries aria-pressed="false" at rest',
    !!notNow && notNow.name === 'button' && attr(notNow, 'aria-pressed') === 'false');
  env.api.notNow();
  ok('§17 "Not right now" flips aria-pressed to true when active',
    attr(tagOf(env.handoffHtml(), 'hf2FinancingNotNow'), 'aria-pressed') === 'true');
  env.api.notNow();
  ok('§17 "Not right now" flips back to false',
    attr(tagOf(env.handoffHtml(), 'hf2FinancingNotNow'), 'aria-pressed') === 'false');
  ok('§17 aria-pressed appears on exactly ONE D4 control in the whole model',
    (env.handoffHtml().match(/aria-pressed=/g) || []).length === 1
    && !/aria-pressed=/.test(env.sheetHtml()));
}
{
  // Touch/click handler pair, and the deliberate absence of pointerdown.
  const env = openEnv();
  const ids = P(env);
  env.api.consider(ids[0]);
  const all = env.sheetHtml() + env.handoffHtml();
  const controls = ['finPathReview-' + ids[0], 'finPathClear-' + ids[0],
    'finPathConsider-' + ids[1], 'hf2FinancingNotNow'];
  const missingPair = [];
  for (const id of controls) {
    const tag = tagOf(all, id);
    if (!tag) { missingPair.push(id + ':absent'); continue; }
    if (!/\bonclick="/.test(tag.attrs)) missingPair.push(id + ':onclick');
    if (!/\bontouchend="event\.preventDefault\(\);/.test(tag.attrs)) missingPair.push(id + ':ontouchend');
    if (/onpointerdown|pointerdown/.test(tag.attrs)) missingPair.push(id + ':pointerdown');
  }
  ok('§17 every new control keeps the shipped onclick + ontouchend="event.preventDefault();…" pair',
    missingPair.length === 0, missingPair.join(','));
  ok('§17 no D4 control adds a pointerdown listener (Invariant 10: the shipped pair, unchanged)',
    !/pointerdown/i.test(all) && !/pointerdown/i.test(stripComments(src.finPathBlock))
    && !/pointerdown/i.test(stripComments(src.renderHandoffFinancing)));
  ok('§17 every new control carries fin-btn, so it inherits the shipped interaction floor rather than declaring a private one',
    ['finPathReview-' + ids[0], 'finPathClear-' + ids[0], 'finPathConsider-' + ids[1], 'hf2FinancingNotNow']
      .every((id) => /\bclass="fin-btn /.test(tagOf(all, id).attrs)));
  ok('§17 no D4 renderer emits an inline style= attribute (no inline colours)',
    !/ style="/.test(all) && !/style="/.test(env.sheetHtml()),
    (all.match(/ style="[^"]*"/g) || []).slice(0, 3).join(' | '));
}

section('§17 — the shipped stylesheet (STATIC ANALYSIS, not rendered verification)');
// Comments are stripped before any CSS is parsed, the same way
// tests/contrast_check.mjs and tests/quiz_presentation_check.mjs do it: a
// rationale comment inside a rule body that QUOTES a declaration is prose, and
// a regex parser that reads it gets the wrong geometry.
const cssNorm = norm.replace(/\/\*[\s\S]*?\*\//g, '');
// Anchored at a rule boundary on purpose. An unanchored
// `/\.fin-path-marker\s*\{/` also matches INSIDE
// `.fin-card .fin-path-marker {` in the forced-colors block, which sits
// earlier in the file — so the "author rule" every cascade comparison below
// depends on would silently resolve to the forced-colors rule it is supposed
// to be compared against, and the comparison would be against itself.
function cssBlock(sel, source = cssNorm) {
  const re = new RegExp('^\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm');
  const m = source.match(re);
  return m ? m[1] : null;
}
// Specificity of a compound selector, per CSS Selectors 4 (:has() takes the
// specificity of its most specific argument). Same implementation as
// tests/quiz_presentation_check.mjs.
function specificity(sel) {
  let s = sel.trim();
  let a = 0, b = 0, c = 0;
  s = s.replace(/:has\(([^)]*)\)/g, (_, inner) => {
    const [ia, ib, ic] = specificity(inner);
    a += ia; b += ib; c += ic;
    return ' ';
  });
  a += (s.match(/#[\w-]+/g) || []).length;
  b += (s.match(/\.[\w-]+/g) || []).length;
  b += (s.match(/\[[^\]]*\]/g) || []).length;
  b += (s.match(/:(?!:)(?!has\b)[\w-]+/g) || []).length;
  c += (s.replace(/[#.\[][^\s>+~]*/g, ' ').match(/\b[a-zA-Z][\w-]*\b/g) || []).length;
  return [a, b, c];
}
const cmpSpec = (x, y) => (x[0] - y[0]) || (x[1] - y[1]) || (x[2] - y[2]);
// Pull a rule body out of an already-isolated @media block. Takes the block
// TEXT, not a regex: several forced-colors blocks exist and more than one
// mentions .fin-btn, so matching against the whole file silently resolves to
// the wrong block.
// The optional `,[^{}]*` arm resolves a selector that shares a GROUPED rule
// with its siblings (the three sheet controls do), from any position in the
// group — without it, only the last selector in a group would ever resolve.
function ruleIn(block, selector) {
  if (!block) return null;
  const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    + '\\s*(?:,[^{}]*)?\\{([^}]*)\\}');
  const r = block.match(re);
  return r ? r[1] : null;
}
{
  const finBtn = cssBlock('.fin-btn');
  const marker = cssBlock('.fin-path-marker');
  const actions = cssBlock('.fin-path-actions');
  const prefRow = cssBlock('.fin-pref-row');
  ok('§17 .fin-btn declares a 48px minimum height — comfortably above the 44px floor',
    parseFloat((finBtn.match(/min-height:\s*([\d.]+)px;/) || [])[1]) >= 44,
    (finBtn.match(/min-height:\s*[\d.]+px;/) || [])[0]);
  ok('§17 .fin-btn declares touch-action: manipulation (CLAUDE.md interactive-element rule)',
    /touch-action:\s*manipulation;/.test(finBtn));
  ok('§17 the considering marker also reaches 48px, so the actions row does not change height',
    parseFloat((marker.match(/min-height:\s*([\d.]+)px;/) || [])[1]) >= 44);
  ok('§17 the marker declares no cursor, no pointer affordance and no transition (it is a statement, not a control)',
    !/cursor/.test(marker) && !/touch-action/.test(marker));
  ok('§17 Consider and Clear sit in a WRAPPING flex row, so a long Spanish label moves to its own line',
    /display:\s*flex;/.test(actions) && /flex-wrap:\s*wrap;/.test(actions));
  ok('§17 the handoff preference rows wrap too',
    /display:\s*flex;/.test(prefRow) && /flex-wrap:\s*wrap;/.test(prefRow));
  ok('§17 the D4 controls joined the shipped .fin-btn:focus-visible ring rather than declaring their own',
    /\.fin-btn:focus-visible,/.test(cssNorm)
    && !/\.fin-path-(review|consider|clear):focus-visible/.test(cssNorm)
    && !/\.fin-not-now:focus-visible/.test(cssNorm));
}
{
  // The D4 forced-colors block: identified by content, not by position.
  const blocks = cssNorm.match(/@media \(forced-colors: active\) \{[\s\S]*?\n    \}/g) || [];
  const d4 = blocks.find((b) => b.includes('.fin-path-marker')) || '';
  ok('§17 a forced-colors block exists that governs the D4 controls',
    !!d4 && d4.includes('.fin-path-review') && d4.includes('.fin-not-now'));

  const SEL_GHOST = '.fin-btn-ghost';
  const SEL_SECONDARY = '.fin-btn-secondary';
  const SEL_PRESSED_AUTHOR = '.fin-not-now[aria-pressed="true"]';
  const SEL_F_REVIEW = '.fin-card .fin-path-review';
  const SEL_F_CONSIDER = '.fin-card .fin-path-consider';
  const SEL_F_CLEAR = '.fin-card .fin-path-clear';
  const SEL_F_MARKER = '.fin-card .fin-path-marker';
  const SEL_F_REST = '.fin-handoff__interest .fin-not-now[aria-pressed="false"]';
  const SEL_F_PRESSED = '.fin-handoff__interest .fin-not-now[aria-pressed="true"]';

  // Both halves matter: the selector the FILE ships must be the one whose
  // specificity outranks the author rule. Comparing two constants would pass
  // against any tree at all.
  ok('§17 precondition: the author rules the forced ones must beat really are at (0,1,0) and (0,2,0)',
    cssNorm.includes(SEL_GHOST + ' {') && cssNorm.includes(SEL_SECONDARY + ' {')
    && cssNorm.includes(SEL_PRESSED_AUTHOR + ' {')
    && specificity(SEL_GHOST).join(',') === '0,1,0'
    && specificity(SEL_SECONDARY).join(',') === '0,1,0'
    && specificity(SEL_PRESSED_AUTHOR).join(',') === '0,2,0');
  ok('§17 precondition: those author rules really do declare a border colour (the hazard is real)',
    /border:\s*1px solid #C9C1AF;/.test(cssBlock(SEL_GHOST))
    && /border:\s*1px solid #211E19;/.test(cssBlock(SEL_SECONDARY))
    && /border-color:\s*#211E19;/.test(cssBlock(SEL_PRESSED_AUTHOR)));

  [[SEL_F_REVIEW, SEL_GHOST], [SEL_F_CLEAR, SEL_GHOST], [SEL_F_MARKER, SEL_GHOST],
   [SEL_F_CONSIDER, SEL_SECONDARY], [SEL_F_REST, SEL_GHOST],
   [SEL_F_PRESSED, SEL_PRESSED_AUTHOR]].forEach(([forced, author]) => {
    ok(`§17 forced-colors "${forced}" outranks "${author}", so it can actually apply`,
      d4.includes(forced) && cmpSpec(specificity(forced), specificity(author)) > 0,
      `${specificity(forced).join(',')} vs ${specificity(author).join(',')}`);
  });

  ok('§17 forced colors: the RESTING "Not right now" pins border-color: CanvasText',
    /border-color:\s*CanvasText;/.test(ruleIn(d4, SEL_F_REST) || ''));
  ok('§17 forced colors: the PRESSED "Not right now" pins it too — the resting rule cannot reach a pressed control',
    /border-color:\s*CanvasText;/.test(ruleIn(d4, SEL_F_PRESSED) || ''));
  ok('§17 forced colors: the three sheet controls and the marker all pin border-color: CanvasText',
    [SEL_F_REVIEW, SEL_F_CONSIDER, SEL_F_CLEAR, SEL_F_MARKER]
      .every((s) => /border-color:\s*CanvasText;/.test(ruleIn(d4, s) || '')),
    [SEL_F_REVIEW, SEL_F_CONSIDER, SEL_F_CLEAR, SEL_F_MARKER]
      .filter((s) => !/border-color:\s*CanvasText;/.test(ruleIn(d4, s) || '')).join(' | '));

  // The cue must be GEOMETRY, not fill: forced colors strips background.
  const restWidth = parseFloat((ruleIn(d4, SEL_F_REST) || '').match(/border-width:\s*([\d.]+)px;/)?.[1] ?? 'NaN');
  const pressWidth = parseFloat((ruleIn(d4, SEL_F_PRESSED) || '').match(/border-width:\s*([\d.]+)px;/)?.[1] ?? 'NaN');
  const markWidth = parseFloat((ruleIn(d4, SEL_F_MARKER) || '').match(/border-width:\s*([\d.]+)px;/)?.[1] ?? 'NaN');
  ok('§17 forced colors: the considering / paused cue is 2px against the resting 1px — pure geometry',
    restWidth === 1 && pressWidth === 2 && markWidth === 2,
    `rest ${restWidth}px, pressed ${pressWidth}px, marker ${markWidth}px`);
  ok('§17 forced colors: the D4 block declares no background, colour token or fill (a fill would be stripped)',
    !/background/.test(d4) && !/var\(--/.test(d4) && !/\scolor:\s/.test(d4));
  ok('§17 forced colors is achieved without forced-color-adjust: none, anywhere in the file',
    !/forced-color-adjust\s*:\s*none/.test(cssNorm));

  // Box geometry: the NORMAL pressed rule pairs the extra 1px of border with a
  // calc() that takes 1px of padding back, so the label and the border box do
  // not move between states — which is also why the forced block does not
  // restate widths for that control.
  const authorPressed = cssBlock(SEL_PRESSED_AUTHOR);
  const finBtn = cssBlock('.fin-btn');
  ok('§17 the normal pressed rule pairs border-width: 2px with calc(… - 1px) padding compensation on BOTH axes',
    /border-width:\s*2px;/.test(authorPressed)
    && /padding:\s*calc\(0\.7rem - 1px\) calc\(1\.5rem - 1px\);/.test(authorPressed)
    && /padding:\s*0\.7rem 1\.5rem;/.test(finBtn),
    (authorPressed.match(/padding:[^;]*;/) || [])[0]);
  ok('§17 the marker applies the same compensation (2px border paired with calc(… - 1px) padding)',
    /border:\s*2px solid/.test(cssBlock('.fin-path-marker'))
    && /padding:\s*calc\(0\.7rem - 1px\) calc\(1\.1rem - 1px\);/.test(cssBlock('.fin-path-marker')));
  ok('§17 the forced-colors block deliberately does NOT restate widths or padding for the pressed control (the normal rule already pairs them)',
    !/padding/.test(d4));
  ok('§17 the D4 forced-colors block sits AFTER the anchored focus block (suite ordering preserved)',
    cssNorm.indexOf(d4.slice(0, 60)) > cssNorm.indexOf('.fin-btn:focus-visible')
    && (cssNorm.match(/@media \(forced-colors: active\)/g) || []).length >= 2);
}

// ===========================================================================
// 18. Focus restoration — keyboard, touch, and the hybrid sequence
// ===========================================================================
section('§18 — focus restoration is gated on IDENTITY and on :focus-visible');
{
  const env = openEnv();
  const ids = P(env);
  const A = ids[0];

  // KEYBOARD: Consider -> Clear, same path.
  env.focusKeyboard('finPathConsider-' + A);
  env.api.consider(A);
  ok('§18 keyboard: Consider restores focus to the SUCCESSOR control for the same path (Clear)',
    env.get('finPathClear-' + A)._focusCount === 1,
    `clear focus calls: ${env.get('finPathClear-' + A)._focusCount}`);
  ok('§18 keyboard: focus is restored with preventScroll (no scroll jump on a long card list)',
    env.get('finPathClear-' + A)._focusOpts
    && env.get('finPathClear-' + A)._focusOpts.preventScroll === true);

  // KEYBOARD: Clear -> Consider, same path.
  env.focusKeyboard('finPathClear-' + A);
  env.api.clearPref(A);
  ok('§18 keyboard: Clear restores focus to the SUCCESSOR control for the same path (Consider)',
    env.get('finPathConsider-' + A)._focusCount === 1);

  // KEYBOARD: Review -> itself.
  env.focusKeyboard('finPathReview-' + A);
  env.api.review(A);
  ok('§18 keyboard: Review restores focus to itself across the rerender',
    env.get('finPathReview-' + A)._focusCount === 1);

  // KEYBOARD: Not right now -> itself.
  env.focusKeyboard('hf2FinancingNotNow');
  env.api.notNow();
  ok('§18 keyboard: "Not right now" restores focus to itself',
    env.get('hf2FinancingNotNow')._focusCount === 1);
}
{
  // TOUCH: ontouchend preventDefaults, so the control never takes focus.
  const env = openEnv();
  const A = P(env)[0];
  env.doc.activeElement = null;
  env.api.consider(A);
  ok('§18 touch: nothing is focused (the tap moved no focus, so there is nothing to restore)',
    env.get('finPathClear-' + A)._focusCount === 0);

  // POINTER: a mouse click focuses but never matches :focus-visible.
  const mouse = openEnv();
  const B = P(mouse)[0];
  mouse.focusPointer('finPathConsider-' + B);
  mouse.api.consider(B);
  ok('§18 pointer: the successor is NOT focused (restoration is keyboard-only)',
    mouse.get('finPathClear-' + B)._focusCount === 0);
  ok('§18 pointer: the action still lands (state changed, markup rerendered)',
    mouse.api.state().pref === B && !!tagOf(mouse.sheetHtml(), 'finPathClear-' + B));
}
{
  // HYBRID — the sequence that makes "restore whatever was focused" wrong.
  // A hardware keyboard leaves a visible ring on path A's control; a finger
  // then taps path B. ontouchend calls preventDefault(), so the tap moves no
  // focus at all and document.activeElement is STILL A, still focus-visible.
  const env = openEnv();
  const ids = P(env);
  const A = ids[0], B = ids[1];

  env.focusKeyboard('finPathConsider-' + A);
  env.api.consider(A);
  const clearA = env.get('finPathClear-' + A);
  ok('§18 hybrid precondition: the keyboard activation of A restored focus to A\'s Clear',
    clearA._focusCount === 1);
  clearA._focusVisible = true;
  env.doc.activeElement = clearA;           // the ring is still sitting on A

  env.api.consider(B);                      // touch-activate B: no focus moves
  ok('§18 hybrid: tapping B stores B, not A', env.api.state().pref === B);
  ok('§18 hybrid: focus is NOT restored to the stale keyboard-focused control on path A',
    env.get('finPathConsider-' + A)._focusCount === 0
    && env.get('finPathClear-' + A) === null,
    'A no longer has a Clear control');
  ok('§18 hybrid: B is not given a focus ring it never had',
    env.get('finPathClear-' + B)._focusCount === 0);
  ok('§18 hybrid: exactly one considering marker renders, and it is B\'s',
    (env.sheetHtml().match(/class="fin-path-marker"/g) || []).length === 1
    && !!tagOf(env.sheetHtml(), 'finPathMarker-' + B));
}
{
  // The other half of the identity gate: a control for the SAME path but the
  // wrong one must not satisfy the origin test either.
  const env = openEnv();
  const A = P(env)[0];
  env.focusKeyboard('finPathReview-' + A);
  ok('§18 payFocusOrigin() is true only for the exact originating control id',
    env.api.focusOrigin('finPathReview-' + A) === true
    && env.api.focusOrigin('finPathConsider-' + A) === false
    && env.api.focusOrigin('hf2FinancingNotNow') === false);
  env.focusPointer('finPathReview-' + A);
  ok('§18 payFocusOrigin() is false when the focus is not keyboard-visible',
    env.api.focusOrigin('finPathReview-' + A) === false);
  env.doc.activeElement = null;
  ok('§18 payFocusOrigin() is false when nothing is focused',
    env.api.focusOrigin('finPathReview-' + A) === false);
}
{
  // Restoration never focuses a detached element: the successor is resolved
  // through getElementById AFTER the rerender, and gated on isConnected.
  const env = openEnv();
  const A = P(env)[0];
  const stale = env.get('finPathConsider-' + A);
  env.focusKeyboard('finPathConsider-' + A);
  env.api.consider(A);
  ok('§18 the pre-rerender element is detached and is never the one focused',
    stale._detached === true && stale._focusCount === 0);
  ok('§18 restoring to an id that no longer exists is a silent no-op, not a throw',
    (() => { try { env.api.restoreFocus('finPathClear-does-not-exist'); return true; }
             catch (e) { return false; } })());
  ok('§18 the restoration uses no timer, frame or deferred callback',
    !/setTimeout|requestAnimationFrame|sessionFrame|setInterval/.test(
      stripComments(src.payRestoreFocus) + stripComments(src.considerPaymentPath)
      + stripComments(src.clearPaymentPreference) + stripComments(src.reviewPaymentPath)
      + stripComments(src.setPaymentNotNow)));
}

// ===========================================================================
// 19. Two separate live regions
// ===========================================================================
section('§19 — the action region and the freshness region stay separate');
ok('§19 the sheet ships TWO distinct sr-only status regions, each exactly once',
  (norm.match(/id="financingSheetStatus"/g) || []).length === 1
  && (norm.match(/id="financingSheetAction"/g) || []).length === 1
  && (norm.match(/id="hf2FinancingStatus"/g) || []).length === 1);
ok('§19 the action region markup is exact (sr-only / status / polite / atomic)',
  /<div class="sr-only" id="financingSheetAction" role="status" aria-live="polite" aria-atomic="true"><\/div>/
    .test(norm));
ok('§19 the handoff region markup carries the same contract',
  /id="hf2FinancingStatus"[\s\S]{0,120}role="status"[\s\S]{0,80}aria-live="polite"[\s\S]{0,80}aria-atomic="true"/
    .test(norm));
{
  // Both freshness outcomes are exercised, from configurations this test
  // BUILDS — so the separation proof does not quietly depend on whichever way
  // the committed config's freshness gate happens to resolve today.
  const withTerms = (mut) => { const c = JSON.parse(JSON.stringify(CFG)); mut(c.financing); return c; };
  const nowIso = new Date().toISOString();
  const STALE = withTerms((f) => {
    f.exactPromotionsEnabled = true;
    f.verifiedAt = '2000-01-01T00:00:00Z';
  });
  const FRESH = withTerms((f) => {
    f.exactPromotionsEnabled = true;
    f.verifiedAt = nowIso;
    f.maxAgeDays = 30;
    f.plans = f.plans.map((p) => Object.assign({}, p, { verified: true, verifiedAt: nowIso }));
  });

  for (const [label, config, wantStale] of [['stale terms', STALE, true], ['fresh terms', FRESH, false]]) {
    const env = openEnv({ config });
    const A = P(env)[0];
    const status = env.get('financingSheetStatus');
    const action = env.get('financingSheetAction');
    ok(`§19 precondition [${label}]: the freshness gate resolves as intended`,
      env.api.stale() === wantStale, `stale=${env.api.stale()}`);
    const before = status.textContent;
    ok(`§19 [${label}] the freshness region holds its own governed text and nothing else`,
      before === (wantStale ? CFG.financing.copy.staleAnnouncement.en : ''),
      JSON.stringify(before.slice(0, 40)));

    env.api.consider(A);
    ok(`§19 [${label}] Consider clears the ACTION region synchronously and queues the message`,
      action.textContent === '' && env.api.timer() !== null);
    env.flush();
    ok(`§19 [${label}] the deferred callback populates the action region`,
      action.textContent === CFG.financing.copy.currentlyConsidering.en, action.textContent);
    ok(`§19 [${label}] the timer id is released once the callback runs`,
      env.api.timer() === null && env.api.timerCount() === 0);
    ok(`§19 [${label}] the Consider announcement neither erased the freshness status nor was erased by it`,
      status.textContent === before && status.textContent !== action.textContent);

    env.api.clearPref(A);
    env.flush();
    ok(`§19 [${label}] Clear announces through the SAME action region, still leaving the freshness status intact`,
      action.textContent === CFG.financing.copy.preferenceClearedAnnounce.en
      && status.textContent === before);
  }
  ok('§19 the two regions are genuinely different elements (a merged region would make the pair above vacuous)',
    (() => {
      const env = openEnv({ config: STALE });
      return env.get('financingSheetStatus') !== env.get('financingSheetAction');
    })());
}
{
  const env = openEnv();
  const notNowRegion = env.get('hf2FinancingStatus');
  const actionRegion = env.get('financingSheetAction');
  env.api.notNow();
  env.flush();
  ok('§19 "Not right now" announces through the HANDOFF region, not the sheet region',
    notNowRegion.textContent === CFG.financing.copy.preferenceNotNowAnnounce.en
    && actionRegion.textContent === '');
  env.api.notNow();
  env.flush();
  ok('§19 undoing "Not right now" announces the cleared message in the handoff region',
    notNowRegion.textContent === CFG.financing.copy.preferenceClearedAnnounce.en);
}
{
  // Repeats: the same action can be re-requested, and identical text must still
  // be a real DOM mutation. Clear + set is what guarantees that.
  const env = openEnv();
  const [A, B] = P(env);
  env.api.consider(A); env.flush();
  const first = env.get('financingSheetAction').textContent;
  env.api.consider(B); env.flush();
  env.api.consider(A);
  ok('§19 a repeated announcement clears the region again before repopulating it',
    env.get('financingSheetAction').textContent === '');
  env.flush();
  ok('§19 the repeat re-announces the identical sentence',
    first === CFG.financing.copy.currentlyConsidering.en
    && env.get('financingSheetAction').textContent === first);
}
{
  // Supersession: a newer announcement cancels the older pending one.
  const env = openEnv();
  const [A, B] = P(env);
  env.api.consider(A);
  env.api.consider(B);
  ok('§19 a newer announcement cancels the prior pending timer',
    env.timers[0].cleared === true && env.pending() === 1);
  env.flush();
  ok('§19 only the newest message lands',
    env.get('financingSheetAction').textContent === CFG.financing.copy.currentlyConsidering.en
    && env.timers.filter((t) => t.done).length === 1);
}
{
  // FC(key) resolves INSIDE the callback, so a language switch landing
  // mid-defer speaks the current language rather than the captured one.
  const env = openEnv();
  const A = P(env)[0];
  env.api.consider(A);
  env.api.setLang('es');
  env.flush();
  ok('§19 a queued announcement resolves its text at FIRE time, not at call time',
    env.get('financingSheetAction').textContent === CFG.financing.copy.currentlyConsidering.es,
    env.get('financingSheetAction').textContent);
}
{
  // A hidden or closed surface is never populated — checked at call time…
  const env = makeEnv({ sheetOpen: false });
  env.api.renderHandoff();
  const A = P(env)[0];
  env.api.announce('financingSheetAction', 'currentlyConsidering');
  ok('§19 a CLOSED sheet: nothing is scheduled and the action region is untouched',
    env.api.timerCount() === 0 && env.pending() === 0
    && env.get('financingSheetAction').textContent === '');

  const hidden = openEnv({ handoffActive: false });
  hidden.api.announce('hf2FinancingStatus', 'preferenceNotNowAnnounce');
  ok('§19 an INACTIVE handoff screen: nothing is scheduled and its region is untouched',
    hidden.api.timerCount() === 0 && hidden.pending() === 0
    && hidden.get('hf2FinancingStatus').textContent === '');
}
{
  // …and re-checked inside the callback, for a surface that closes mid-defer.
  const env = openEnv();
  const A = P(env)[0];
  env.api.consider(A);
  env.get('financingSheet').hidden = true;
  env.flush();
  ok('§19 a sheet closed mid-defer: the callback declines to populate',
    env.get('financingSheetAction').textContent === '');
}
{
  // The language switch drops the action regions without announcing anything,
  // and cancels queued work so an old-language utterance cannot land after.
  const env = openEnv();
  const A = P(env)[0];
  env.api.consider(A); env.flush();
  const region = env.get('financingSheetAction');
  const writesBefore = region._writes.length;
  env.api.setLang('es');
  env.api.clearAnnouncements();
  ok('§19 the switch removes the prior-language sentence',
    region.textContent === '' && region._writes.length === writesBefore + 1
    && region._writes[region._writes.length - 1] === '');
  ok('§19 clearing leaves nothing queued', env.pending() === 0);

  env.api.consider(P(env)[1]);
  env.api.clearAnnouncements();
  env.flush();
  ok('§19 an in-flight announcement cannot land after the switch', region.textContent === '');
  ok('§19 the freshness region is deliberately NOT dropped by the switch (it is re-announced on purpose)',
    stripComments(src.clearPayAnnouncements).includes('hf2FinancingStatus')
    && stripComments(src.clearPayAnnouncements).includes('financingSheetAction')
    && !stripComments(src.clearPayAnnouncements).includes('financingSheetStatus'));
}
ok('§19 switchLanguage drops the announcements before re-rendering the financing surfaces',
  /clearPayAnnouncements\(\);\s*\n\s*renderAllFinancingSurfaces\(\);/.test(codeOnly));

// ===========================================================================
// 20. Retired absence — in EXECUTABLE CODE, not in the rationale comments
// ===========================================================================
section('§20 — the retired agenda model is gone from executable code');
{
  ok('§20 the comment stripper ran and removed real comment spans without eating a call site',
    deletedSpans.length > 100 && codeOnly.length > 0
    && codeOnly.includes('window.considerPaymentPath')
    && codeOnly.includes('function renderHandoffFinancing')
    && codeOnly.includes('SESSION_TEXT_IDS'),
    `${deletedSpans.length} spans removed`);
  ok('§20 precondition: some retired names DO survive inside comments (so scoping to code is load-bearing)',
    /financingExplored|finAgendaKey|Review agenda \(/.test(norm),
    'financingExplored / finAgendaKey / "Review agenda (" appear in rationale comments');
}
{
  // CODE forms, not bare mentions.
  const RETIRED = [
    ['financingAgenda assignment', /\bfinancingAgenda\s*(=|\[)/],
    ['financingAgendaDismissed assignment', /\bfinancingAgendaDismissed\s*=/],
    ['financingExplored assignment', /\bfinancingExplored\s*=/],
    ['finAgendaKey() definition or call', /\bfinAgendaKey\s*\(/],
    ['finAgendaItems() definition or call', /\bfinAgendaItems\s*\(/],
    ['finAgendaSelected() definition or call', /\bfinAgendaSelected\s*\(/],
    ['finAgendaControl() definition or call', /\bfinAgendaControl\s*\(/],
    ['toggleFinancingAgenda', /\btoggleFinancingAgenda\b/],
    ['setFinancingInterestChoice', /\bsetFinancingInterestChoice\b/],
    ['requestFinancingFollowup', /\brequestFinancingFollowup\b/],
    ['renderDrawerFinancingMark', /\brenderDrawerFinancingMark\b/],
    ['the resultsFinancingAsk element id', /resultsFinancingAsk/],
    ['the drawerFinancingMark element id', /drawerFinancingMark/],
    ['the hf2FinancingSpecialist element id', /hf2FinancingSpecialist/],
    ['the financing_agenda_changed event', /financing_agenda_changed/],
    ['the financing_agenda_reviewed event', /financing_agenda_reviewed/],
    ['FC(\'agendaMark\') and its siblings', /FC\(\s*'agenda[A-Za-z]*'\s*\)/],
    ['FC(\'drawerMark\')', /FC\(\s*'drawerMark'\s*\)/],
    ['FC(\'resultsAsk\')', /FC\(\s*'resultsAsk'\s*\)/],
    ['FC(\'emailBody\') — the state-specific email copy', /FC\(\s*'emailBody'\s*\)/],
    ['the hardcoded English agenda count', /Review agenda \(/],
    ['the hardcoded Spanish agenda count', /Revisar agenda \(/],
    ['announceFinInterest', /\bannounceFinInterest\b/],
    ['interestMarkedAnnounce', /interestMarkedAnnounce/]
  ];
  const survivors = RETIRED.filter(([, rx]) => rx.test(codeOnly)).map(([label]) => label);
  ok(`§20 all ${RETIRED.length} retired code forms are absent from executable index.html`,
    survivors.length === 0, survivors.join(' | '));

  // Every ban must be able to fire.
  const PLANTED = [
    [/\bfinancingAgenda\s*(=|\[)/, 'financingAgenda = {};'],
    [/\bfinancingAgendaDismissed\s*=/, 'financingAgendaDismissed = false;'],
    [/\bfinancingExplored\s*=/, 'financingExplored = true;'],
    [/\bfinAgendaKey\s*\(/, 'function finAgendaKey(kind, value) {}'],
    [/\bfinAgendaItems\s*\(/, 'var items = finAgendaItems();'],
    [/\bfinAgendaSelected\s*\(/, 'var sel = finAgendaSelected();'],
    [/\bfinAgendaControl\s*\(/, 'html += finAgendaControl(item);'],
    [/\btoggleFinancingAgenda\b/, 'window.toggleFinancingAgenda = function(key) {};'],
    [/\bsetFinancingInterestChoice\b/, 'window.setFinancingInterestChoice = function(s) {};'],
    [/\brequestFinancingFollowup\b/, 'window.requestFinancingFollowup();'],
    [/\brenderDrawerFinancingMark\b/, 'renderDrawerFinancingMark();'],
    [/resultsFinancingAsk/, "document.getElementById('resultsFinancingAsk')"],
    [/drawerFinancingMark/, "document.getElementById('drawerFinancingMark')"],
    [/hf2FinancingSpecialist/, "document.getElementById('hf2FinancingSpecialist')"],
    [/financing_agenda_changed/, "analytics.log('financing_agenda_changed', {});"],
    [/financing_agenda_reviewed/, "analytics.log('financing_agenda_reviewed', {});"],
    [/FC\(\s*'agenda[A-Za-z]*'\s*\)/, "el.textContent = FC('agendaMark');"],
    [/FC\(\s*'drawerMark'\s*\)/, "el.textContent = FC('drawerMark');"],
    [/FC\(\s*'resultsAsk'\s*\)/, "el.textContent = FC('resultsAsk');"],
    [/FC\(\s*'emailBody'\s*\)/, "return FC('emailBody');"],
    [/Review agenda \(/, "'Review agenda (' + n + ')'"],
    [/Revisar agenda \(/, "'Revisar agenda (' + n + ')'"],
    [/\bannounceFinInterest\b/, 'announceFinInterest("not_now");'],
    [/interestMarkedAnnounce/, "FC('interestMarkedAnnounce')"]
  ];
  const dead = PLANTED.filter(([rx, sample]) => !rx.test(sample));
  ok(`§20 all ${PLANTED.length} absence patterns match a planted counter-example (none is vacuous)`,
    dead.length === 0, dead.map(([rx]) => String(rx)).join(' | '));

  // The stripper must not be doing the work by deleting the code.
  ok('§20 control: the retired names ARE detectable in code the stripper keeps',
    /\bfinancingAgenda\s*(=|\[)/.test(stripComments('var x = 1;\nfinancingAgenda = {};\n'))
    && !/\bfinancingAgenda\s*(=|\[)/.test(stripComments('// financingAgenda = {};\n')));
}
{
  // The replacement is present and reachable, so §20 is not passing because
  // the whole feature vanished.
  ok('§20 the replacement model is present in executable code',
    ['payExplored', 'payPref', 'payOpen', 'PAY_NOT_NOW',
     'window.reviewPaymentPath', 'window.considerPaymentPath',
     'window.clearPaymentPreference', 'window.setPaymentNotNow',
     'function finPathEncode', 'function finPaymentPaths']
      .every((n) => codeOnly.includes(n)));
}

// ===========================================================================
// 21. EN/ES parity and the exact adopted strings
// ===========================================================================
section('§21 — the adopted copy, character for character, in both languages');
const ADOPTED = [
  ['paymentPreferenceLabel', 'Payment preference', 'Preferencia de pago'],
  ['preferenceNone', 'Not selected', 'Sin seleccionar'],
  ['optionsExploredLabel', 'Options explored', 'Opciones exploradas'],
  ['reviewOption', 'Review this option', 'Revisar esta opción'],
  ['hideDetails', 'Hide details', 'Ocultar detalles'],
  ['considerOption', 'Consider this option', 'Considerar esta opción'],
  ['currentlyConsidering', 'Currently considering ✓', 'En consideración ✓'],
  ['clearPreference', 'Clear preference', 'Quitar preferencia'],
  ['exploreConsequence',
    'Explore options together. Nothing is submitted and no application is started.',
    'Exploren las opciones juntos. No se envía nada y no se inicia ninguna solicitud.']
];
ok('§21 exactly nine pairs were adopted for D4', ADOPTED.length === 9);
for (const [key, en, es] of ADOPTED) {
  ok(`§21 [${key}] is character-for-character identical in the canonical source and the shipped config`,
    INCOMING.financing.copy[key] && CFG.financing.copy[key]
    && INCOMING.financing.copy[key].en === en && INCOMING.financing.copy[key].es === es
    && CFG.financing.copy[key].en === en && CFG.financing.copy[key].es === es,
    JSON.stringify(CFG.financing.copy[key]));
  ok(`§21 [${key}] EN and ES are both present, non-empty and genuinely different`,
    en.length > 0 && es.length > 0 && en !== es);
}
ok('§21 the EN no-application sentence is pinned exactly',
  CFG.financing.copy.exploreConsequence.en.includes('Nothing is submitted and no application is started.')
  && INCOMING.financing.copy.exploreConsequence.en.includes('Nothing is submitted and no application is started.'));
ok('§21 the ES no-application sentence is pinned exactly',
  CFG.financing.copy.exploreConsequence.es.includes('No se envía nada y no se inicia ninguna solicitud.')
  && INCOMING.financing.copy.exploreConsequence.es.includes('No se envía nada y no se inicia ninguna solicitud.'));
{
  // Every key the D4 renderers read must exist in BOTH languages, or a control
  // renders nameless in one of them.
  const keys = [...new Set([
    ...[...stripComments(src.finPathBlock).matchAll(/FC\('([^']+)'\)/g)].map((m) => m[1]),
    ...[...stripComments(src.renderHandoffFinancing).matchAll(/FC\('([^']+)'\)/g)].map((m) => m[1]),
    ...[...stripComments(src.considerPaymentPath).matchAll(/'([a-zA-Z]+)'\)/g)].map((m) => m[1]),
    'currentlyConsidering', 'preferenceClearedAnnounce', 'preferenceNotNowAnnounce'
  ])].filter((k) => Object.prototype.hasOwnProperty.call(CFG.financing.copy, k));
  const gaps = keys.filter((k) => !(CFG.financing.copy[k].en || '').length || !(CFG.financing.copy[k].es || '').length);
  ok(`§21 all ${keys.length} copy keys the D4 renderers actually read are bilingual and non-empty`,
    keys.length >= 8 && gaps.length === 0, gaps.join(','));
}
{
  // Rendered parity: identical structure, different words.
  const en = openEnv({ lang: 'en' });
  const es = openEnv({ lang: 'es' });
  const ids = P(en);
  ids.forEach((id) => { en.api.review(id); es.api.review(id); });
  en.api.consider(ids[1]); es.api.consider(ids[1]);
  en.api.renderHandoff(); es.api.renderHandoff();
  const strip = (s) => s.replace(/>[^<]*</g, '><');
  ok('§21 EN and ES render structurally identical sheet markup (same tags, ids and attributes)',
    strip(en.sheetHtml()) === strip(es.sheetHtml()));
  ok('§21 EN and ES render structurally identical handoff markup',
    strip(en.handoffHtml()) === strip(es.handoffHtml()));
  ok('§21 …and the visible words genuinely differ',
    en.sheetHtml() !== es.sheetHtml() && en.handoffHtml() !== es.handoffHtml()
    && es.sheetHtml().includes(CFG.financing.copy.considerOption.es)
    && es.handoffHtml().includes(CFG.financing.copy.paymentPreferenceLabel.es));
}

// ===========================================================================
// 22. A language switch is a copy swap, not a reset
// ===========================================================================
section('§22 — a language switch preserves the model, the order and the focus identity');
{
  const env = openEnv({ lang: 'en' });
  const ids = P(env);
  ids.forEach((id) => env.api.review(id));
  env.api.review(ids[0]);                    // collapse one, to make payOpen non-trivial
  env.api.consider(ids[2]);
  const before = env.api.state();
  const orderBefore = before.explored.join(',');

  env.focusKeyboard('finPathReview-' + ids[1]);
  const focusedIdBefore = env.doc.activeElement.id;

  env.api.setLang('es');
  env.api.clearAnnouncements();
  env.api.renderAll();

  const after = env.api.state();
  ok('§22 payExplored survives the switch, with its ORDER intact',
    after.explored.join(',') === orderBefore, after.explored.join(','));
  ok('§22 payPref survives the switch', after.pref === before.pref);
  ok('§22 payOpen survives the switch, exactly',
    JSON.stringify(after.open) === JSON.stringify(before.open),
    JSON.stringify(after.open));
  ok('§22 the focus target keeps its IDENTITY (the control ids are language-independent)',
    !!env.get(focusedIdBefore) && focusedIdBefore === 'finPathReview-' + ids[1]);
  ok('§22 the labels changed — this really was a copy swap',
    env.sheetHtml().includes(CFG.financing.copy.considerOption.es)
    && !env.sheetHtml().includes(CFG.financing.copy.considerOption.en));
  ok('§22 the considering marker follows the language too',
    env.sheetHtml().includes(CFG.financing.copy.currentlyConsidering.es));
  ok('§22 the handoff rows follow the language',
    env.handoffHtml().includes(CFG.financing.copy.paymentPreferenceLabel.es)
    && env.handoffHtml().includes(CFG.financing.copy.optionsExploredLabel.es));
}
{
  // A switch and a switch back must be a round trip.
  const env = openEnv({ lang: 'en' });
  const ids = P(env);
  ids.forEach((id) => env.api.review(id));
  env.api.consider(ids[0]);
  const enMarkup = env.sheetHtml() + env.handoffHtml();
  const stateBefore = snapshot(env);
  env.api.setLang('es'); env.api.renderAll();
  env.api.setLang('en'); env.api.renderAll();
  ok('§22 EN -> ES -> EN restores the exact markup and the exact model',
    env.sheetHtml() + env.handoffHtml() === enMarkup && snapshot(env) === stateBefore);
}

// ===========================================================================
// 23. Session wipe — the INVENTORY contract (the executable end-to-end wipe
//     lives in tests/session_safety_check.mjs; this is deliberately not a
//     second execution of it)
// ===========================================================================
section('§23 — the wipe clears every D4 binding by name, with no typeof guard');
{
  const wipeCode = stripComments(wipeSrc);
  ['payExplored = []', 'payPref = null', 'payOpen = {}',
   '_finSheetStale = false', '_financeReturnFocus = null'].forEach((stmt) => {
    ok(`§23 the wipe contains \`${stmt};\``, wipeCode.includes(stmt + ';'));
  });
  ok('§23 no D4 binding is cleared behind a typeof guard (a guard lets a renamed binding pass silently)',
    !/typeof\s+(payExplored|payPref|payOpen|_finSheetStale|_financeReturnFocus|PAY_NOT_NOW)\b/.test(wipeCode),
    (wipeCode.match(/typeof\s+\w+/g) || []).slice(0, 6).join(','));
  ok('§23 control: the typeof-guard ban matches a planted example',
    /typeof\s+(payExplored|payPref|payOpen|_finSheetStale|_financeReturnFocus|PAY_NOT_NOW)\b/
      .test("if (typeof payExplored !== 'undefined') payExplored = [];"));

  const cancelAt = wipeCode.indexOf('cancelPayAnnouncePending();');
  const clearAt = wipeCode.indexOf('clearPayAnnouncements();');
  const stateAt = wipeCode.indexOf('payExplored = [];');
  ok('§23 the wipe cancels queued announcement work', cancelAt > -1);
  ok('§23 the wipe clears the announcement region text', clearAt > -1);
  ok('§23 cancellation precedes the state reset, so no utterance composed for the previous customer can run after it',
    cancelAt > -1 && stateAt > -1 && cancelAt < stateAt && clearAt < stateAt,
    `cancel@${cancelAt} clear@${clearAt} state@${stateAt}`);
  ok('§23 the wipe nulls the sheet\'s stored opener BEFORE closing the sheet (or the close pulls focus into a torn-down session)',
    wipeCode.indexOf('_financeReturnFocus = null;') <
      wipeCode.indexOf('window.closeFinancingSheet();'));
}
{
  const contentIds = (norm.match(/var SESSION_CONTENT_IDS = \[([\s\S]*?)\];/) || [, ''])[1];
  const textIds = (norm.match(/var SESSION_TEXT_IDS = \[([\s\S]*?)\];/) || [, ''])[1];
  ['financingSheetCards', 'hf2FinancingInterest', 'hf2FinancingPrograms'].forEach((id) => {
    ok(`§23 '${id}' is in SESSION_CONTENT_IDS`, new RegExp(`'${id}'`).test(contentIds));
  });
  ok("§23 'financingSheetAction' is in SESSION_TEXT_IDS", /'financingSheetAction'/.test(textIds));
  ok("§23 the two other announcement regions are listed too",
    /'hf2FinancingStatus'/.test(textIds) && /'financingSheetStatus'/.test(textIds));
  ok('§23 the wipe empties every id in both inventories',
    /SESSION_CONTENT_IDS\.forEach\(function\(id\) \{[\s\S]{0,160}innerHTML = '';/.test(wipeSrc)
    && /SESSION_TEXT_IDS\.forEach\(function\(id\) \{[\s\S]{0,160}textContent = '';/.test(wipeSrc));
  ok('§23 control: the inventory patterns match a planted example and reject an absent id',
    /'financingSheetAction'/.test("var x = ['financingSheetAction'];")
    && !/'financingSheetActionMissing'/.test(textIds));
}
{
  // Payment state has never been written to any persistent store, and must not
  // start being.
  ok('§23 no D4 binding is ever written to localStorage / sessionStorage / IndexedDB / a cookie',
    !/(localStorage|sessionStorage|indexedDB)[^\n]{0,120}(payPref|payExplored|payOpen)/.test(codeOnly)
    && !/(payPref|payExplored|payOpen)[^\n]{0,120}(localStorage|sessionStorage|indexedDB)/.test(codeOnly)
    && !/document\.cookie[^\n]{0,120}pay/i.test(codeOnly));
  ok('§23 control: the persistence ban matches a planted example',
    /(localStorage|sessionStorage|indexedDB)[^\n]{0,120}(payPref|payExplored|payOpen)/
      .test("localStorage.setItem('x', JSON.stringify(payExplored));"));
}

// ===========================================================================
// 24. Email / GAS / diagnostics / session-summary exclusion
// ===========================================================================
section('§24 — payment state reaches no email, no payload, no diagnostic');
{
  // finEmailBody() is executed across the FULL state matrix, in both languages.
  const ids = P(makeEnv());
  const STATES = [
    ['nothing recorded', {}],
    ['one path explored', { explored: [ids[0]] }],
    ['every path explored', { explored: ids.slice() }],
    ['a path considered', { explored: [ids[0]], pref: ids[0] }],
    ['a different path considered', { explored: ids.slice(), pref: ids[2] }],
    ['not_now active', { explored: ids.slice(), pref: 'not_now' }],
    ['not_now with nothing explored', { explored: [], pref: 'not_now' }],
    ['a stale preference', { explored: ids.slice(), pref: 'promo-GoneAway' }],
    ['panels open, nothing chosen', { explored: ids.slice(), open: ids.slice() }]
  ];
  let bodies = new Set();
  for (const lang of ['en', 'es']) {
    const expected = CFG.financing.copy.emailBodyAvailable[lang];
    for (const [label, state] of STATES) {
      const env = makeEnv({ lang });
      env.api.seed(state);
      const body = env.api.emailBody();
      bodies.add(lang + '|' + body);
      ok(`§24 [${lang}] finEmailBody() is the neutral availability body under: ${label}`,
        body === expected && body === env.api.FC('emailBodyAvailable'),
        body.slice(0, 40));
    }
  }
  ok('§24 across all 9 states x 2 languages there are exactly 2 distinct bodies — one per language, none per state',
    bodies.size === 2, [...bodies].map((b) => b.slice(0, 24)).join(' | '));
}
{
  const IDENTIFIERS = [
    'payPref', 'payExplored', 'payOpen', 'PAY_NOT_NOW',
    'finPaymentPaths', 'finPathId', 'finPathById', 'finPathEncode', 'finPathDom',
    'payIsExplored', 'payRecordExplored', 'considerPaymentPath',
    'clearPaymentPreference', 'reviewPaymentPath', 'setPaymentNotNow',
    'paymentPreferenceLabel', 'optionsExploredLabel', 'currentlyConsidering'
  ];
  const SURFACES = [
    ['the email preview builder (showEmailCapture)', emailCaptureSrc],
    ['the GAS payload builder (sendResults)', sendResultsSrc],
    ['sessionSafeSummary()', sessionSummarySrc],
    ['analytics.EVENT_FIELDS', eventFieldsSrc]
  ];
  for (const [label, source] of SURFACES) {
    const code = stripComments(source);
    const hits = IDENTIFIERS.filter((id) => new RegExp('\\b' + id + '\\b').test(code));
    ok(`§24 no payment identifier appears in ${label}`, hits.length === 0, hits.join(','));
  }
  ok('§24 control: the identifier sweep matches a planted example (it is not vacuous)',
    IDENTIFIERS.some((id) => new RegExp('\\b' + id + '\\b').test('var x = payPref;')));
  ok('§24 the email packet reaches financing only through the neutral finEmailBody()/emailHeading pair',
    /finEmailBody\(\)/.test(stripComments(emailCaptureSrc))
    && /finEmailBody\(\)/.test(stripComments(sendResultsSrc)));
  ok('§24 EVENT_FIELDS declares no payment field and no payment event',
    !/pay[A-Z]/.test(stripComments(eventFieldsSrc))
    && !/consider|explored|preference|not_now/i.test(stripComments(eventFieldsSrc)));
}
{
  // Executed, not grepped: the four D4 actions must emit NO diagnostic event.
  const env = openEnv();
  const ids = P(env);
  const before = env.events.length;
  ids.forEach((id) => env.api.review(id));
  env.api.consider(ids[0]);
  env.api.consider(ids[1]);
  env.api.clearPref(ids[1]);
  env.api.notNow();
  env.api.notNow();
  ok('§24 Review, Consider, Clear and Not-right-now emit no analytics event at all',
    env.events.length === before,
    env.events.slice(before).map((e) => e.name).join(','));

  // …and the events financing DOES emit carry only placement/lang/layout.
  const base = env.api.eventBase('sheet');
  ok('§24 finEventBase() carries placement, lang, layout and offerVersion only',
    JSON.stringify(Object.keys(base).sort())
      === JSON.stringify(['lang', 'layout', 'offerVersion', 'placement']),
    Object.keys(base).join(','));
  ok('§24 finEventBase() is invariant across every payment state',
    (() => {
      const a = JSON.stringify(env.api.eventBase('sheet'));
      env.api.seed({ explored: ids.slice(), pref: ids[0], open: ids.slice() });
      const b = JSON.stringify(env.api.eventBase('sheet'));
      env.api.seed({ explored: [], pref: null, open: [] });
      return a === b && a === JSON.stringify(env.api.eventBase('sheet'));
    })());
}

// ===========================================================================
// 25. No product-level payment calculation
// ===========================================================================
section('§25 — nothing in D4 computes a monthly payment (V1 invariant)');
{
  const D4_SOURCES = [
    ['finPathEncode', src.finPathEncode], ['finPathId', src.finPathId],
    ['finPathDom', src.finPathDom], ['finPaymentPaths', src.finPaymentPaths],
    ['finPathById', src.finPathById], ['payIsExplored', src.payIsExplored],
    ['payRecordExplored', src.payRecordExplored],
    ['reviewPaymentPath', src.reviewPaymentPath],
    ['considerPaymentPath', src.considerPaymentPath],
    ['clearPaymentPreference', src.clearPaymentPreference],
    ['setPaymentNotNow', src.setPaymentNotNow],
    ['finPathBlock', src.finPathBlock],
    ['renderFinancingSheet', src.renderFinancingSheet],
    ['renderHandoffFinancing', src.renderHandoffFinancing],
    ['finEmailBody', src.finEmailBody]
  ];
  const BANS = [
    ['a publishedPaymentFactor read', /publishedPaymentFactor/],
    ['a price multiplication or division', /\b(price|amount|total|subtotal|principal)\b[^\n;]{0,40}[*/]/i],
    ['a payment-factor multiplication', /[*/][^\n;]{0,30}\b(factor|apr|termMonths|months)\b/i],
    ['a monthly-payment identifier', /\bmonthlyPayment|perMonth|estimatedPayment\b/i]
  ];
  const violations = [];
  for (const [name, source] of D4_SOURCES) {
    const code = stripComments(source);
    for (const [label, rx] of BANS) if (rx.test(code)) violations.push(`${name}: ${label}`);
  }
  ok('§25 no D4 code path multiplies or divides a price, or reads publishedPaymentFactor',
    violations.length === 0, violations.join(' | '));
  const PLANTED25 = [
    [/publishedPaymentFactor/, 'var f = plan.publishedPaymentFactor;'],
    [/\b(price|amount|total|subtotal|principal)\b[^\n;]{0,40}[*/]/i, 'var m = price * factor;'],
    [/[*/][^\n;]{0,30}\b(factor|apr|termMonths|months)\b/i, 'var m = x / termMonths;'],
    [/\bmonthlyPayment|perMonth|estimatedPayment\b/i, 'var monthlyPayment = 12;']
  ];
  ok('§25 all four bans match a planted counter-example',
    PLANTED25.every(([rx, sample]) => rx.test(sample)));
  ok('§25 publishedPaymentFactor is absent from the shipped store config as well as from the app',
    !JSON.stringify(CFG).includes('publishedPaymentFactor')
    && !codeOnly.includes('publishedPaymentFactor'));
  ok('§25 no rendered D4 surface prints a currency amount',
    (() => {
      const env = openEnv();
      const ids = P(env);
      ids.forEach((id) => env.api.review(id));
      env.api.consider(ids[0]);
      const markup = env.sheetHtml() + env.handoffHtml();
      return !/\$\s?\d/.test(markup) && !/\/\s*(mo|month|mes)\b/i.test(markup);
    })());
}

// ===========================================================================
// NEGATIVE CONTROLS — the behavioural assertions must fail on a broken tree
// ===========================================================================
// ===========================================================================
// 26. Per-surface placement: financing.surfaces
// ===========================================================================
section('§26 — the drawer and Sleep System surfaces are config-DISABLED, not deleted');
{
  // The shipped policy.
  const env = openEnv();
  ok('§26 the shipped config disables both duplicate surfaces',
    env.api.surfaceEnabled('drawer') === false
    && env.api.surfaceEnabled('sleepSystem') === false,
    JSON.stringify(CFG.financing.surfaces));
  ok('§26 the canonical source and the generated config agree on the policy',
    JSON.stringify(INCOMING.financing.surfaces)
    === JSON.stringify(CFG.financing.surfaces),
    JSON.stringify(INCOMING.financing.surfaces));

  // BACKWARD COMPATIBILITY is the load-bearing half. A retailer whose
  // financing block predates this field must keep both surfaces, so a MISSING
  // flag — and a missing surfaces object entirely — means ENABLED. Only an
  // explicit `false` turns a surface off.
  const cfgWith = (surfaces) => {
    const c = JSON.parse(JSON.stringify(CFG));
    if (surfaces === undefined) delete c.financing.surfaces;
    else c.financing.surfaces = surfaces;
    return c;
  };
  const surf = (surfaces, name) =>
    makeEnv({ config: cfgWith(surfaces) }).api.surfaceEnabled(name);

  for (const [label, surfaces, drawer, sleep] of [
    ['no surfaces block at all', undefined, true, true],
    ['an empty surfaces object', {}, true, true],
    ['drawer:false only — sleepSystem is missing, so enabled', { drawer: false }, false, true],
    ['sleepSystem:false only — drawer is missing, so enabled', { sleepSystem: false }, true, false],
    ['both false', { drawer: false, sleepSystem: false }, false, false],
    ['both true', { drawer: true, sleepSystem: true }, true, true],
    ['mixed', { drawer: true, sleepSystem: false }, true, false]
  ]) {
    ok(`§26 ${label} -> drawer=${drawer}, sleepSystem=${sleep}`,
      surf(surfaces, 'drawer') === drawer && surf(surfaces, 'sleepSystem') === sleep,
      `got drawer=${surf(surfaces, 'drawer')}, sleepSystem=${surf(surfaces, 'sleepSystem')}`);
  }
  // A malformed surfaces value must not silently disable anything. Build
  // validation rejects these shapes; the runtime still has to fail towards the
  // EXISTING behaviour rather than towards a blank screen.
  for (const bad of ['drawer', 7, null, true, 0]) {
    ok(`§26 a malformed surfaces value (${JSON.stringify(bad)}) leaves every surface enabled`,
      surf(bad, 'drawer') === true && surf(bad, 'sleepSystem') === true);
  }
  ok('§26 an unknown surface name reads as enabled (the enum lives in validation, not here)',
    surf({ drawer: false }, 'handoff') === true);

  // BEHAVIOUR: the drawer renderer, both ways.
  {
    const off = makeEnv({ config: cfgWith({ drawer: false }) });
    off.api.renderDrawer();
    ok('§26 drawer disabled: the box is hidden',
      off.get('drawerFinancing').hidden === true);
    ok('§26 drawer disabled: no copy is written into it',
      off.txt('drawerFinancingLabel') === ''
      && off.txt('drawerFinancingBody') === ''
      && off.txt('drawerFinancingExplore') === '');
  }
  {
    const on = makeEnv({ config: cfgWith({ drawer: true }) });
    on.api.renderDrawer();
    ok('§26 drawer enabled: the box renders (so the disabled case is not vacuous)',
      on.get('drawerFinancing').hidden === false
      && on.txt('drawerFinancingLabel') === CFG.financing.copy.drawerTitle.en
      && on.txt('drawerFinancingExplore') === CFG.financing.copy.cta.en);
  }
  {
    // The financing experience being OFF must still hide it, independently.
    const noFin = JSON.parse(JSON.stringify(CFG));
    noFin.financing.enabled = false;
    const env2 = makeEnv({ config: noFin });
    env2.api.renderDrawer();
    ok('§26 financing disabled entirely still hides the drawer box',
      env2.get('drawerFinancing').hidden === true);
  }

  // DORMANT, NOT DELETED. The whole point of config-disabling rather than
  // removing is that Phase 2 can turn these back on, and that the closed
  // analytics `placement` enum keeps values its live call sites still pass.
  ok('§26 the drawer financing markup is still in the shipped page',
    /id="drawerFinancing"/.test(norm) && /id="drawerFinancingExplore"/.test(norm));
  ok('§26 the drawer renderer still exists and is still called',
    /function renderDrawerFinancing\(\)/.test(codeOnly)
    && (codeOnly.match(/renderDrawerFinancing\(\)/g) || []).length >= 2);
  ok('§26 the drawer call site still opens the sheet with placement "drawer"',
    /window\.openFinancingSheet\('drawer'\)/.test(norm));
  ok('§26 the Sleep System financing block and its call site still exist',
    /sleep-system__financing/.test(norm)
    && /window\.openFinancingSheet\(\\?'sleep-system\\?'\)/.test(norm));
  ok('§26 the drawer financing CSS is still present',
    /\.drawer-financing \{/.test(norm));
  ok('§26 the closed placement enum still carries BOTH disabled surfaces',
    /placement: \['results', 'drawer', 'handoff', 'sheet', 'mexico', 'sleep-system'\]/.test(norm));

  // The Sleep System gate is source-level (its renderer is a large screen
  // builder outside this harness's module), so it is asserted as a gate rather
  // than executed — and the assertion is proved able to fire below.
  ok('§26 the Sleep System block is gated on BOTH financingEnabled and the surface flag',
    /var financingBlock = \(financingEnabled\(\) && finSurfaceEnabled\('sleepSystem'\)\)/
      .test(codeOnly));
  ok('§26 the drawer renderer is gated on BOTH, too',
    /if \(!financingEnabled\(\) \|\| !finSurfaceEnabled\('drawer'\)\)/.test(codeOnly));
}

// ===========================================================================
// 27. Unencodable path values, and the single current-preference announcement
// ===========================================================================
// Both raised by adversarial review against the first behavioural commit.
section('§27 — an unencodable value fails closed, and only the current preference remains pending');
{
  // An UNPAIRED SURROGATE is what JSON.parse('"\ud800"') produces, so it is a
  // value a hand-authored canonical source can genuinely carry. encodeURIComponent
  // raises URIError on it, and the throw used to escape three guarded entry
  // points: renderHandoffFinancing() after the module was already visible
  // (leaving a permanently blank Payment Choice block), openFinancingSheet()
  // after its guard but before the sheet was revealed (a silently dead CTA),
  // and renderAllFinancingSurfaces() inside switchLanguage() (stopping every
  // renderer queued behind it, leaving the app half-translated).
  const LONE = 'a\uD800b';
  ok('§27 precondition: the value really is unencodable (encodeURIComponent throws on it)',
    (() => { try { encodeURIComponent(LONE); return false; } catch (e) { return e instanceof URIError; } })());

  const env = openEnv();
  ok('§27 the encoder returns the failure SENTINEL rather than throwing',
    env.api.encode(LONE) === null);
  ok('§27 finPathId yields NO id for it, so the path is dropped, not mis-identified',
    env.api.pathId('plan', LONE) === '');
  ok('§27 a genuinely EMPTY value still yields a usable id (the two are distinguished)',
    env.api.pathId('promo', '') === 'promo-' && env.api.encode('') === '');
  ok('§27 a well-formed astral pair still encodes (only unpaired surrogates are refused)',
    env.api.encode('a\u{1F6CF}b') === 'a_f0_9f_9b_8fb');

  // The three surfaces the throw escaped, driven through a config carrying one.
  const hostile = JSON.parse(JSON.stringify(CFG));
  hostile.financing.plans[2].id = 'lease' + LONE + 'own';
  const henv = makeEnv({ config: hostile, sheetOpen: true });
  let threw = null;
  try {
    henv.api.renderHandoff();
    henv.api.renderSheet();
    henv.api.renderResults();
    henv.api.openSheet('results');
    henv.api.renderAll();
  } catch (e) { threw = e; }
  ok('§27 no surface throws on a config carrying an unencodable plan id',
    threw === null, threw && String(threw));
  ok('§27 the handoff still renders its rows rather than going blank',
    /fin-pref-rows/.test(henv.handoffHtml()));
  ok('§27 the sheet still opens', henv.get('financingSheet').hidden === false);
  ok('§27 the unencodable path is DROPPED from the path set, and the others survive',
    henv.api.paths().every((x) => x.id && /^[a-z]+-.+$/.test(x.id))
    && henv.api.paths().length === P(env).length - 1,
    henv.api.paths().map((x) => x.id).join(','));

  // NON-VACUITY: the pre-fix encoder really did throw through these surfaces.
  {
    const broken = makeEnv({
      config: hostile, sheetOpen: true,
      mutate: (src) => src.replace(
        '      var esc;\n      try {\n        esc = encodeURIComponent(value);\n      } catch (err) {\n        return null;\n      }',
        '      var esc = encodeURIComponent(value);')
    });
    let brokeThrew = false;
    try { broken.api.renderHandoff(); } catch (e) { brokeThrew = e instanceof URIError; }
    ok('§27 [control] without the guard the handoff renderer really does throw URIError',
      brokeThrew);
  }
}
{
  // ONE PENDING ANNOUNCEMENT, AND IT DESCRIBES THE CURRENT payPref.
  //
  // This is the invariant, and an earlier version of this section got it
  // wrong. All four announcement strings describe the SAME variable:
  // #financingSheetAction carries currentlyConsidering / preferenceCleared and
  // #hf2FinancingStatus carries preferenceNotNow / preferenceCleared, and every
  // one of them is a statement about payPref. They are two VIEWS of one value,
  // split by which control the customer operated — not two independent facts.
  //
  // So a queued message goes stale the instant payPref moves again, wherever
  // the next transition happens to be operated. Cancelling it is the correct
  // outcome, not an erasure, and "both land, each in its own region" — which
  // this section previously asserted as desirable — would make a screen reader
  // announce a payment position the customer has already left.
  //
  // Every case below runs two transitions INSIDE the 50 ms window, which only a
  // script can do; a customer cannot press two controls that fast. That is why
  // this is an invariant test rather than a defect report. The invariant is
  // still worth holding: it is what the commit that introduced these regions
  // claimed, and correctness that depends on humans being slow is not
  // correctness.
  const CUR = CFG.financing.copy.currentlyConsidering.en;
  const NOTNOW = CFG.financing.copy.preferenceNotNowAnnounce.en;
  const CLEARED = CFG.financing.copy.preferenceClearedAnnounce.en;
  const heard = (e) => [e.txt('financingSheetAction'), e.txt('hf2FinancingStatus')]
    .filter((t) => t !== '');

  {
    const env = openEnv();                       // handoff ACTIVE: both live
    const [A, B] = P(env);
    ok('§27 precondition: both action regions are live at the same time',
      env.api.regionLive('financingSheetAction') === true
      && env.api.regionLive('hf2FinancingStatus') === true);

    env.api.consider(A);
    ok('§27 one announcement is pending after the first transition',
      env.api.timerCount() === 1);
    env.api.notNow();
    ok('§27 a SECOND transition supersedes the first ACROSS regions — still one pending',
      env.api.timerCount() === 1, `${env.api.timerCount()} pending`);
    env.flush();
    ok('§27 exactly one utterance lands, and it describes the CURRENT payPref',
      env.api.state().pref === env.api.NOT_NOW
      && JSON.stringify(heard(env)) === JSON.stringify([NOTNOW]),
      JSON.stringify(heard(env)));

    // ...and in the other order.
    const env2 = openEnv();
    env2.api.notNow();
    env2.api.consider(P(env2)[0]);
    env2.flush();
    ok('§27 the reverse order also yields ONE utterance for the current payPref',
      env2.api.state().pref === P(env2)[0]
      && JSON.stringify(heard(env2)) === JSON.stringify([CUR]),
      JSON.stringify(heard(env2)));

    // Three transitions, ending on a path.
    const env3 = openEnv();
    const [C, D] = P(env3);
    env3.api.consider(C); env3.api.notNow(); env3.api.consider(D);
    env3.flush();
    ok('§27 three chained transitions leave exactly the last one audible',
      env3.api.state().pref === D
      && JSON.stringify(heard(env3)) === JSON.stringify([CUR]),
      JSON.stringify(heard(env3)));
  }

  {
    // THE CROSS-REGION DARK CASE. A queued SHEET announcement, then a HANDOFF
    // transition while the handoff screen is inactive. The handoff cannot
    // speak — but the sheet's pending message is now false, so it must not be
    // allowed to land. This is the case a per-region timer cannot see, because
    // the transition and the stale message live in different slots.
    const env = openEnv({ handoffActive: false });
    const A = P(env)[0];
    ok('§27 precondition: the sheet is live and the handoff is dark',
      env.api.regionLive('financingSheetAction') === true
      && env.api.regionLive('hf2FinancingStatus') === false);
    env.api.consider(A);
    ok('§27 precondition: the sheet announcement really is queued',
      env.api.timerCount() === 1);
    env.api.notNow();
    ok('§27 a dark-region transition still cancels the stale message in the OTHER region',
      env.api.timerCount() === 0, `${env.api.timerCount()} pending`);
    env.flush();
    ok('§27 ...so nothing stale is heard, and silence is correct (no live region can speak)',
      env.api.state().pref === env.api.NOT_NOW && heard(env).length === 0,
      JSON.stringify(heard(env)));
  }

  {
    // The same-region case, which the previous version of this section covered
    // and which must keep working: a transition supersedes its own queued
    // message even when its own region has gone dark.
    const env = openEnv();
    env.api.consider(P(env)[0]);
    ok('§27 precondition: an announcement is queued for the sheet region',
      env.api.timerCount() === 1);
    env.get('financingSheet').hidden = true;            // the sheet goes dark
    env.api.announce('financingSheetAction', 'preferenceClearedAnnounce');
    ok('§27 a same-region transition supersedes its own queued message when dark',
      env.api.timerCount() === 0);
    env.flush();
    ok('§27 ...and the stale announcement never lands', env.txt('financingSheetAction') === '');
  }

  {
    // The wipe helper clears whatever is pending, wherever it is.
    const env = openEnv();
    env.api.consider(P(env)[0]);
    ok('§27 precondition: an announcement is armed', env.api.timerCount() === 1);
    env.api.cancelAnnounce();
    ok('§27 cancelPayAnnouncePending() leaves nothing pending anywhere',
      env.api.timerCount() === 0 && env.pending() === 0);
  }
}

// ===========================================================================
// 28. A malformed identity value has no canonical id, and nothing throws
// ===========================================================================
// Raised by an external read-only review, which disproved the reachability
// premise a previous commit recorded in index.html. That comment claimed a
// native JSON parse "yields only plain objects, arrays, strings, numbers,
// booleans and null, none of which can throw on coercion". FALSE:
// JSON.parse('{"toString": null}') is a plain object whose own toString is not
// callable, and String() on it throws TypeError. Any non-callable toString does
// it. finGroupedPlans admits such a plan on its `kind` alone, so
// finPaymentPaths reached a second String() coercion that sat OUTSIDE the
// encoder's try, and the throw escaped the same three guarded entry points the
// unpaired-surrogate defect did.
//
// The contract is now: identity values are STRINGS. null/undefined still map to
// the legitimate empty encoding (the providerless promotional path relies on
// it); every other type returns the failure sentinel WITHOUT being coerced.
section('§28 — a non-string identity value fails closed, never throws');
{
  // Built through JSON.parse, not an object literal, so the test exercises
  // exactly what the loader can hand the runtime.
  const VIA_JSON = JSON.parse('{"toString": null}');
  ok('§28 precondition: this JSON-derived value really does throw on String()',
    (() => { try { String(VIA_JSON); return false; } catch (e) { return e instanceof TypeError; } })());
  ok('§28 precondition: and it is an ordinary JSON object, not a crafted literal',
    typeof VIA_JSON === 'object' && VIA_JSON !== null
    && Object.prototype.hasOwnProperty.call(VIA_JSON, 'toString')
    && typeof VIA_JSON.toString !== 'function');

  const env = openEnv();
  // The encoder refuses without coercing; finPathId yields no id and does not
  // re-derive the coercion that reintroduced the throw.
  for (const [label, v] of [
    ['the JSON-derived object', VIA_JSON],
    ['a plain object', JSON.parse('{"a":1}')],
    ['an array', JSON.parse('[1,2]')],
    ['a number', JSON.parse('7')],
    ['a boolean', JSON.parse('true')]
  ]) {
    let enc, id, threw = null;
    try { enc = env.api.encode(v); id = env.api.pathId('plan', v); }
    catch (e) { threw = e; }
    ok(`§28 ${label}: encoder returns the sentinel and finPathId yields no id, without throwing`,
      threw === null && enc === null && id === '', threw ? String(threw) : `enc=${enc} id=${id}`);
  }
  ok('§28 null and undefined still encode to the LEGITIMATE empty string',
    env.api.encode(null) === '' && env.api.encode(undefined) === ''
    && env.api.pathId('promo', null) === 'promo-');
  ok('§28 a providerless promotional group still has a usable id (the case the empty encoding exists for)',
    env.api.pathId('promo', '') === 'promo-' && env.api.encode('') === '');
  ok('§28 ordinary strings are unaffected',
    env.api.pathId('plan', 'lacks-in-house') === 'plan-lacks-in-house');
}
{
  // The whole chain, against a config carrying the malformed plan: the path
  // enumeration, then each guarded entry point the throw previously escaped.
  const hostile = JSON.parse(JSON.stringify(CFG));
  hostile.financing.plans.push(JSON.parse(
    '{"id": {"toString": null}, "kind": "lease-to-own", "provider": "X",'
    + ' "verified": true, "headline": {"en": "Malformed", "es": "Malformado"},'
    + ' "detail": {"en": "D", "es": "D"}}'));
  const clean = openEnv();
  const expected = P(clean).length;

  const env = makeEnv({ config: hostile, sheetOpen: true, resultsActive: true });
  let paths = null, threw = null;
  try { paths = env.api.paths(); } catch (e) { threw = e; }
  ok('§28 finPaymentPaths does not throw on the malformed plan',
    threw === null, threw && String(threw));
  ok('§28 the malformed path is DROPPED and every well-formed path survives',
    !!paths && paths.length === expected
    && paths.every((x) => typeof x.id === 'string' && /^[a-z]+-.+$/.test(x.id)),
    paths && paths.map((x) => x.id).join(','));
  ok('§28 no empty-id DOM id can leak from it',
    !!paths && paths.every((x) => x.id !== '' && x.id !== 'plan-'));

  // Entry point 1: the handoff renderer, which previously threw AFTER the
  // module was already visible and left a permanently blank block.
  let hThrew = null;
  try { env.api.renderHandoff(); } catch (e) { hThrew = e; }
  ok('§28 renderHandoffFinancing does not throw', hThrew === null, hThrew && String(hThrew));
  ok('§28 ...and the handoff still renders its rows rather than going blank',
    /fin-pref-rows/.test(env.handoffHtml()) && /hf2FinancingNotNow/.test(env.handoffHtml()));

  // Entry point 2: opening the sheet, which previously threw after its own
  // guard but before the sheet was revealed, leaving a silently dead CTA.
  let sThrew = null;
  try { env.api.openSheet('results'); } catch (e) { sThrew = e; }
  ok('§28 openFinancingSheet does not throw', sThrew === null, sThrew && String(sThrew));
  ok('§28 ...and the sheet actually opens',
    env.get('financingSheet').hidden === false
    && env.doc.body.classList.contains('fin-sheet-open'));
  ok('§28 ...and the well-formed cards still render inside it',
    /fin-path-review/.test(env.sheetHtml()));
  // WHAT "DROPPED" MEANS, stated exactly. finPathBlock(null, body) returns the
  // body, so a plan with no canonical identity still renders as an
  // INFORMATIONAL card carrying its own governed copy — it simply has no
  // controls and no path id, so it cannot be reviewed, considered or preferred.
  // The previous version of this assertion tested an ES headline against a
  // sheet rendered in EN, which could not fail whatever the code did.
  ok('§28 ...while the malformed plan contributes NO CONTROL and NO path id',
    !/finPathReview-plan-["\s]/.test(env.sheetHtml())
    && !/data-path-id="plan-"/.test(env.sheetHtml())
    && env.get('finPathConsider-plan-') === null);
  ok('§28 [precondition] the malformed card itself DID render, so the check above is about controls',
    /Malformed/.test(env.sheetHtml()));

  // Entry point 3: the language switch. switchLanguage() calls
  // clearPayAnnouncements() then renderAllFinancingSurfaces(); the throw used
  // to stop every renderer queued behind it, leaving the app half-translated.
  // The financing half is executed here; the call itself is pinned from source
  // below, because switchLanguage is an async screen-wide function outside this
  // harness's module.
  let lThrew = null;
  try { env.api.setLang('es'); env.api.clearAnnouncements(); env.api.renderAll(); }
  catch (e) { lThrew = e; }
  ok('§28 the language-switch render path does not throw', lThrew === null, lThrew && String(lThrew));
  ok('§28 ...and the surfaces really re-rendered into Spanish',
    env.handoffHtml().includes(CFG.financing.copy.paymentPreferenceLabel.es));
  ok('§28 switchLanguage really does drive that path (source pin, not an assumption)',
    /clearPayAnnouncements\(\);\n      renderAllFinancingSurfaces\(\);/.test(norm));

  // State remains coherent: the malformed path can never become a preference.
  env.api.setLang('en');
  env.api.renderSheet();
  const good = env.api.paths()[0].id;
  env.api.review(good);
  env.api.consider(good);
  ok('§28 the surviving paths remain fully operable alongside the malformed one',
    env.api.state().pref === good && env.api.state().explored.length === 1);
  env.api.consider('');
  env.api.consider('plan-');
  ok('§28 an empty or stub id is not a path and cannot become the preference',
    env.api.state().pref === good);
}
{
  // BLANK IDENTITIES. C11 refused objects, arrays, numbers and booleans but
  // still mapped null/undefined/'' to an empty encoding for EVERY kind, so a
  // plan with a null or blank id produced the TRUTHY id 'plan-'. That survived
  // finPaymentPaths()'s filter, resolved through finPathById(), emitted
  // controls named finPathReview-plan- and could become payPref. Found by
  // external review; the empty encoding is now an identity only for the
  // promotional group, which genuinely has one.
  //
  // Each configuration below is well-formed in every respect EXCEPT the id, so
  // nothing but the identity defect can be what drops the path.
  const MALFORMED = [
    ['null id', '{"id": null, "kind": "lease-to-own", "provider": "X", "verified": true,'
      + ' "headline": {"en": "Blank Id Plan", "es": "Plan Sin Id"},'
      + ' "detail": {"en": "D", "es": "D"}}'],
    ['empty-string id', '{"id": "", "kind": "closed-end-installment", "provider": "X", "verified": true,'
      + ' "headline": {"en": "Blank Id Plan", "es": "Plan Sin Id"},'
      + ' "detail": {"en": "D", "es": "D"}}']
  ];
  const baseline = P(openEnv());

  for (const [label, planJson] of MALFORMED) {
    const cfg = JSON.parse(JSON.stringify(CFG));
    cfg.financing.plans.push(JSON.parse(planJson));
    const env = makeEnv({ config: cfg, sheetOpen: true, resultsActive: true });

    ok(`§28 [${label}] precondition: the derived id would have been the truthy stub 'plan-'`,
      env.api.pathId('plan', JSON.parse(planJson).id) === ''
      && baseline.indexOf('plan-') === -1);

    let paths = null, threw = null;
    try { paths = env.api.paths(); } catch (e) { threw = e; }
    ok(`§28 [${label}] finPaymentPaths does not throw`, threw === null, threw && String(threw));
    ok(`§28 [${label}] the malformed path is DROPPED and every well-formed path survives`,
      !!paths && JSON.stringify(paths.map((x) => x.id)) === JSON.stringify(baseline),
      paths && paths.map((x) => x.id).join(','));
    ok(`§28 [${label}] the stub id 'plan-' is absent from the path set`,
      !!paths && paths.every((x) => x.id !== 'plan-' && /^[a-z]+-.+$/.test(x.id)));
    ok(`§28 [${label}] finPathById('plan-') resolves to null`,
      env.api.pathById('plan-') === null);

    // The rendered surfaces must carry no trace of it.
    let rThrew = null;
    try { env.api.renderSheet(); env.api.renderHandoff(); } catch (e) { rThrew = e; }
    ok(`§28 [${label}] the sheet and handoff render without throwing`,
      rThrew === null, rThrew && String(rThrew));
    ok(`§28 [${label}] no data-path-id="plan-" is emitted`,
      !/data-path-id="plan-"/.test(env.sheetHtml()));
    for (const prefix of ['finPathReview', 'finPathConsider', 'finPathClear']) {
      ok(`§28 [${label}] no ${prefix}-plan- control is emitted`,
        !new RegExp(prefix + '-plan-["\\s]').test(env.sheetHtml())
        && env.get(prefix + '-plan-') === null);
    }
    // Its governed copy still renders as an unselectable informational card —
    // that is the designed degradation, and asserting it here keeps the
    // control-absence claims above honest about what "dropped" means.
    ok(`§28 [${label}] its card still renders as informational copy (dropped means UNSELECTABLE)`,
      /Blank Id Plan/.test(env.sheetHtml()));

    // The actions must refuse it, and it must never become the preference.
    env.api.review('plan-');
    ok(`§28 [${label}] Review('plan-') is a no-op`,
      env.api.state().explored.length === 0 && env.api.state().open.length === 0);
    env.api.consider('plan-');
    ok(`§28 [${label}] Consider('plan-') is a no-op and cannot become payPref`,
      env.api.state().pref === null && env.api.state().explored.length === 0);
    const good = paths[0].id;
    env.api.consider(good);
    env.api.clearPref('plan-');
    ok(`§28 [${label}] Clear('plan-') is a no-op and does not disturb the real preference`,
      env.api.state().pref === good);

    // The guarded entry points, as for the non-string case.
    let oThrew = null;
    try { env.api.openSheet('results'); } catch (e) { oThrew = e; }
    ok(`§28 [${label}] openFinancingSheet completes`,
      oThrew === null && env.get('financingSheet').hidden === false, oThrew && String(oThrew));
    let lThrew = null;
    try { env.api.setLang('es'); env.api.clearAnnouncements(); env.api.renderAll(); }
    catch (e) { lThrew = e; }
    ok(`§28 [${label}] the language rerender completes, in Spanish`,
      lThrew === null
      && env.handoffHtml().includes(CFG.financing.copy.paymentPreferenceLabel.es),
      lThrew && String(lThrew));
    ok(`§28 [${label}] ...and it still emits no control or path id after the rerender`,
      !/data-path-id="plan-"/.test(env.sheetHtml())
      && !/finPathReview-plan-["\s]/.test(env.sheetHtml())
      && env.api.paths().every((x) => x.id !== 'plan-'));
  }
}
{
  // THE CASE THE EMPTY ENCODING EXISTS FOR must keep working, and must not be
  // confused with a rejected plan/scenario identity.
  const cfg = JSON.parse(JSON.stringify(CFG));
  cfg.financing.plans.forEach((pl) => {
    if (pl.kind === 'open-end-promotional-credit') delete pl.provider;
  });
  const env = makeEnv({ config: cfg, sheetOpen: true });
  const ids = env.api.paths().map((x) => x.id);
  ok('§28 a providerless promotional group still has the identity promo-',
    ids.indexOf('promo-') !== -1, ids.join(','));
  ok('§28 ...and it resolves, with the generic label rather than a lender name',
    !!env.api.pathById('promo-')
    && env.api.pathById('promo-').label === 'Promotional financing');
  ok('§28 ...and blank promo identity is NOT treated like a blank plan identity',
    env.api.pathId('promo', '') === 'promo-' && env.api.pathId('plan', '') === ''
    && env.api.pathId('scenario', '') === '');

  env.api.renderSheet();
  ok('§28 ...and its disclosure control is emitted and operable',
    /data-path-id="promo-"/.test(env.sheetHtml())
    && env.get('finPathReview-promo-') !== null);
  env.api.review('promo-');
  ok('§28 ...Review records it exactly once',
    JSON.stringify(env.api.state().explored) === JSON.stringify(['promo-']));
  env.api.consider('promo-');
  ok('§28 ...Consider makes it the preference',
    env.api.state().pref === 'promo-' && env.get('finPathClear-promo-') !== null);
  env.api.clearPref('promo-');
  ok('§28 ...and Clear unsets it while preserving the history',
    env.api.state().pref === null
    && JSON.stringify(env.api.state().explored) === JSON.stringify(['promo-']));
  env.api.renderHandoff();
  ok('§28 ...and the handoff names it rather than showing a raw id',
    env.handoffHtml().includes('Promotional financing')
    && !env.handoffHtml().includes('promo-'));
}
{
  // NON-VACUITY: without the guard, this really does throw through the chain.
  const hostile = JSON.parse(JSON.stringify(CFG));
  hostile.financing.plans.push(JSON.parse(
    '{"id": {"toString": null}, "kind": "lease-to-own", "provider": "X",'
    + ' "verified": true, "headline": {"en": "Malformed", "es": "Malformado"},'
    + ' "detail": {"en": "D", "es": "D"}}'));
  const broken = makeEnv({
    config: hostile, sheetOpen: true,
    mutate: (src) => src
      .replace("      if (value === null || value === undefined) return '';\n      if (typeof value !== 'string') return null;",
               "      value = String(value == null ? '' : value);")
      .replace('      var enc = finPathEncode(value);\n      return enc === null ? \'\' : kind + \'-\' + enc;',
               "      var enc = finPathEncode(value);\n      if (!enc && String(value == null ? '' : value) !== '') return '';\n      return kind + '-' + enc;")
  });
  let brokeThrew = false;
  try { broken.api.renderHandoff(); } catch (e) { brokeThrew = e instanceof TypeError; }
  ok('§28 [control] restoring the unsafe coercion really does throw TypeError through the handoff renderer',
    brokeThrew);
}

section('negative controls — each load-bearing behaviour is proved detectable');
{
  const env = openEnv({ mutate: (s) => s.replace('if (!payIsExplored(id)) payExplored.push(id);', 'payExplored.push(id);') });
  const A = P(env)[0];
  env.api.review(A); env.api.review(A); env.api.review(A);
  ok('control: a de-duplication regression is detected (§3, §5)',
    env.api.state().explored.length > 1, env.api.state().explored.join(','));
}
{
  const env = openEnv({ mutate: (s) => s.replace('if (payPref === id) return;                  // idempotent, never a toggle', 'if (payPref === id) { payPref = null; renderAllFinancingSurfaces(); return; }') });
  const A = P(env)[0];
  env.api.consider(A);
  env.api.consider(A);
  ok('control: turning Consider into a toggle is detected (§9)', env.api.state().pref === null);
}
{
  const env = openEnv({ mutate: (s) => s.replace('if (payPref !== id) return;', '') });
  const ids = P(env);
  env.api.consider(ids[0]);
  env.api.clearPref(ids[1]);
  ok('control: dropping Clear\'s exact-preference gate is detected (§10)',
    env.api.state().pref === null);
}
{
  const env = openEnv({ mutate: (s) => s.replace('payRecordExplored(id);\n      payPref = id;', 'payPref = id;') });
  const A = P(env)[0];
  env.api.consider(A);
  ok('control: a Consider that stops recording exploration is detected (§6)',
    env.api.state().explored.length === 0);
}
{
  const env = openEnv({ mutate: (s) => s.replace(/var exploredLabels = notNow \? \[\] : payExplored/, 'var exploredLabels = payExplored') });
  const ids = P(env);
  ids.forEach((id) => env.api.review(id));
  env.api.notNow();
  env.api.renderHandoff();
  ok('control: losing the not_now row suppression is detected (§12)',
    /fin-explored-list/.test(env.handoffHtml()));
}
{
  const env = openEnv({ mutate: (s) => s.replace('.filter(function(id) { return id !== payPref; })', '') });
  const ids = P(env);
  ids.forEach((id) => env.api.review(id));
  env.api.consider(ids[0]);
  env.api.renderHandoff();
  const listed = (env.handoffHtml().match(/<ul class="fin-explored-list">([\s\S]*?)<\/ul>/) || [, ''])[1];
  ok('control: letting the preference double as an explored entry is detected (§15)',
    listed.includes(env.api.pathById(ids[0]).label));
}
{
  const env = openEnv({ mutate: (s) => s.replace("&& active.matches(':focus-visible')", '') });
  const A = P(env)[0];
  env.focusPointer('finPathConsider-' + A);
  env.api.consider(A);
  ok('control: dropping the :focus-visible guard is detected (§18) — a pointer tap would steal a ring',
    env.get('finPathClear-' + A)._focusCount === 1);
}
{
  const env = openEnv({ mutate: (s) => s.replace('active.id === controlId', 'true') });
  const ids = P(env);
  const A = ids[0], B = ids[1];
  env.focusKeyboard('finPathConsider-' + A);
  env.api.consider(A);
  const clearA = env.get('finPathClear-' + A);
  clearA._focusVisible = true;
  env.doc.activeElement = clearA;
  env.api.consider(B);
  ok('control: dropping the identity gate is detected (§18) — the hybrid tap steals focus onto B',
    env.get('finPathClear-' + B)._focusCount === 1);
}
{
  const env = openEnv({ mutate: (s) => s.replace("if (regionId === 'hf2FinancingStatus') return finHandoffVisible();", "if (regionId === 'hf2FinancingStatus') return true;") });
  const hidden = openEnv({ handoffActive: false, mutate: (s) => s.replace("if (regionId === 'hf2FinancingStatus') return finHandoffVisible();", "if (regionId === 'hf2FinancingStatus') return true;") });
  hidden.api.announce('hf2FinancingStatus', 'preferenceNotNowAnnounce');
  hidden.flush();
  ok('control: populating a hidden handoff region is detected (§19)',
    hidden.get('hf2FinancingStatus').textContent.length > 0);
}
{
  const env = openEnv({ mutate: (s) => s.replace("if (el) el.textContent = FC(key) || '';", "if (el) el.textContent = __captured || '';").replace('function announcePayAction(regionId, key) {', 'function announcePayAction(regionId, key) {\n      var __captured = FC(key);') });
  const A = P(env)[0];
  env.api.consider(A);
  env.api.setLang('es');
  env.flush();
  ok('control: resolving the announcement text at CALL time is detected (§19)',
    env.get('financingSheetAction').textContent === CFG.financing.copy.currentlyConsidering.en);
}
{
  const env = openEnv({ mutate: (s) => s.replace("region.textContent = '';\n      _payAnnounceTimer = setTimeout", "_payAnnounceTimer = setTimeout") });
  const [A, B] = P(env);
  env.api.consider(A); env.flush();
  env.api.consider(B); env.flush();
  env.api.consider(A);
  ok('control: dropping the synchronous clear is detected (§19) — a repeat would not mutate the DOM',
    env.get('financingSheetAction').textContent !== '');
}
{
  const env = openEnv({ mutate: (s) => s.replace('      var enc = finPathEncode(value);', "      return kind + '-' + String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-');\n      var enc = finPathEncode(value);") });
  ok('control: reinstating the lossy slugifier is detected (§16)',
    env.api.encode('Synchrony Bank') !== 'synchrony-bank'
    && env.api.pathId('promo', 'Synchrony Bank') === env.api.pathId('promo', 'Synchrony-Bank'));
}
{
  const env = openEnv({
    mutate: (s) => s.replace("'aria-expanded=\"' + (open ? 'true' : 'false') + '\" '", "''")
  });
  ok('control: stripping aria-expanded is detected (§17)',
    !/aria-expanded=/.test(env.sheetHtml()));
}
{
  const env = openEnv({ mutate: (s) => s.replace("html += '<span class=\"fin-path-marker\"", "html += '<button type=\"button\" aria-pressed=\"true\" class=\"fin-path-marker\"") });
  const A = P(env)[0];
  env.api.consider(A);
  ok('control: turning the considering marker into a pressed button is detected (§17)',
    /class="fin-path-marker"/.test(env.sheetHtml())
    && tagOf(env.sheetHtml(), 'finPathMarker-' + A).name === 'button');
}
{
  const env = openEnv({ mutate: (s) => s.replace('return FC(\'emailBodyAvailable\');', "return payExplored.length ? 'EXPLORED' : FC('emailBodyAvailable');") });
  const A = P(env)[0];
  env.api.review(A);
  ok('control: an email body that varies with payment state is detected (§24)',
    env.api.emailBody() === 'EXPLORED');
}
{
  const env = openEnv({ mutate: (s) => s.replace("return { placement: placement, lang: currentLang, layout: finLayoutClass(),", "return { pref: payPref, placement: placement, lang: currentLang, layout: finLayoutClass(),") });
  ok('control: a payment field added to the diagnostic base is detected (§24)',
    Object.keys(env.api.eventBase('sheet')).includes('pref'));
}
{
  const env = openEnv({ mutate: (s) => s.replace("      payOpen[id] = true;\n        payRecordExplored(id);", "      payOpen[id] = true;\n        payRecordExplored(id);\n        payPref = id;") });
  const A = P(env)[0];
  env.api.review(A);
  ok('control: an opener that also sets the preference is detected (§3)',
    env.api.state().pref === A);
}
{
  const env = makeEnv({
    config: (() => { const c = JSON.parse(JSON.stringify(CFG)); c.financing.surfaces = { drawer: false }; return c; })(),
    mutate: (s) => s.replace("if (!financingEnabled() || !finSurfaceEnabled('drawer'))", 'if (!financingEnabled())')
  });
  env.api.renderDrawer();
  ok('control: ignoring the drawer surface flag is detected (§26)',
    env.get('drawerFinancing').hidden === false);
}
{
  const env = makeEnv({
    // A surfaces object that EXISTS but omits `drawer`. Deleting the object
    // entirely would short-circuit on the guard above and never reach the line
    // this control mutates.
    config: (() => { const c = JSON.parse(JSON.stringify(CFG)); c.financing.surfaces = { sleepSystem: false }; return c; })(),
    mutate: (s) => s.replace('return surfaces[name] !== false;', 'return surfaces[name] === true;')
  });
  ok('control: treating a MISSING flag as disabled is detected (§26 backward compatibility)',
    env.api.surfaceEnabled('drawer') === false);
}
{
  const env = makeEnv({
    // `surfaces: null` is the shape that PROVES the guard is load-bearing:
    // without it, `surfaces[name]` throws on null. A string would merely read
    // undefined and pass, which is why this control does not use one.
    config: (() => { const c = JSON.parse(JSON.stringify(CFG)); c.financing.surfaces = null; return c; })(),
    mutate: (s) => s.replace("if (!surfaces || typeof surfaces !== 'object') return true;", '')
  });
  let threwOrDisabled = false;
  try { threwOrDisabled = env.api.surfaceEnabled('drawer') !== true; }
  catch (e) { threwOrDisabled = true; }
  ok('control: dropping the malformed-surfaces guard is detected (§26)', threwOrDisabled);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
