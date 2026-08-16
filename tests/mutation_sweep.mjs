// Mutation sweep — does the suite actually CATCH each safety property being
// removed?
//
// The behavioural suites answer "does the code do the right thing". This
// answers the question one level up: "would we find out if it stopped". Each
// entry below deletes one safety property from index.html and requires at least
// one suite to go red. A mutation that SURVIVES is a property with no effective
// test, and this file fails on it.
//
// Every mutation is asserted to have applied. A substitution that silently
// matches nothing would leave its assertion passing against unmutated source —
// the exact vacuity this exists to prevent, one level up again.
//
// Nothing is written inside the repository: the tree is copied to a temporary
// directory and mutated there, so a run leaves `git status` untouched.
//
// Run: node tests/mutation_sweep.mjs
//      node tests/mutation_sweep.mjs --list     (print the manifest, run nothing)

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The suites that can observe these properties. Kept explicit rather than
// "every suite", so the runtime stays proportionate and so a survivor cannot be
// explained away by an unrelated suite happening to fail.
//
// Most properties are observable in the recovery suite alone, and running both
// for all of them doubles the wall clock for no added signal. Entries that need
// the session suite name it in a fourth field. If a future change makes some
// property observable ONLY there, this sweep reports it as a SURVIVOR — loudly
// and in the safe direction — and the fix is to widen that entry.
const DEFAULT_SUITES = ["tests/data_error_recovery_check.mjs"];
const WITH_SESSION = DEFAULT_SUITES.concat(["tests/session_safety_check.mjs"]);
// Phase 0.5 observers. The consultation suite owns the compute/state/hf2/
// payload properties; the email suite owns the Code.gs ones; wipe-inventory
// properties need the session suite too.
const PRIORITIES = ["tests/consultation_priorities_check.mjs"];
const PRIORITIES_WITH_SESSION = PRIORITIES.concat(["tests/session_safety_check.mjs"]);
const EMAIL_PRIORITIES = ["tests/email_priorities_check.mjs"];
// Phase 0.6 observer: the consultation-summary suite owns the implication
// resolver, the three hf2 rows, the payload consultation field, and the
// Code.gs consultation rendering on both MIME parts.
const CONSULT = ["tests/consultation_summary_check.mjs"];
// Compare-modal prerequisite observer: the dialog-semantics suite owns the
// labelled-dialog contract, focus lifecycle, localization, listener
// idempotence, and the wipe null-before-close ordering.
const COMPARE = ["tests/compare_modal_check.mjs"];
// Construction reveal repair observer (slice 5a): the repair suite owns the
// two-theme contrast arithmetic, motif ban, equal geometry, forced-colors
// fallback, visibility-based legend hiding, and fill correspondence.
const CONS = ["tests/construction_reveal_repair_check.mjs"];
// Compare entry-point observer: the entry suite owns the card controls,
// ruled tray strings, selection/aria-pressed behavior, handler precedence,
// and the wipe reset.
const CMPE = ["tests/compare_entry_check.mjs"];
// PR 1 integrity observer: the integrity suite owns the retired
// availability claims and the RSA-panel wipe entry.
const INTEGRITY = ["tests/integrity_repairs_check.mjs"];
// Results presentation observer (Slice 1, 2026-08-14): the results suite owns
// the index-only hero/support hierarchy and its absent presentation cap, the
// tier-tab state contract and touch floor, the ruled EN/ES match-ordinal dict
// keys and relativity line, the retired buyer-characterising descriptor, the
// de-rendered synthesized priority rows, and the promotion hooks on both card
// types.
const RESULTS = ["tests/results_presentation_check.mjs"];
// Sleep Brief observer (Slice 2, D1+D2 2026-08-15): the sleep-brief suite owns
// the constellation's determinism/decorative contract and, with the
// recomposition, the D1 structural and behavioral contract.
const BRIEF = ["tests/sleep_brief_presentation_check.mjs"];
// The motion suite owns the review→Sleep Brief transition paths, including
// the reduced-motion hardening of the retained legacy fallback (Slice 2).
const MOTION = ["tests/motion_flag_check.mjs"];

// ---------------------------------------------------------------------------
// THE MANIFEST. [label, find, replace] — `find` may span lines; index.html is
// CRLF, so newlines are matched loosely.
// ---------------------------------------------------------------------------
const MUTATIONS = [
  // --- recovery clears what the terminal overlay never did -----------------
  ["recovery does not clear _dataLoadFailed",
    "_dataLoadFailed = false;\n      _startQuizAttempts = 0;", "_startQuizAttempts = 0;"],
  ["recovery does not reset the poll counter",
    "_startQuizAttempts = 0;\n      // A deferred show", "// A deferred show"],
  ["recovery does not disarm a deferred show",
    "_dataErrorDeferred = false;\n      var wasVisible", "var wasVisible"],
  ["hide does not restore aria-hidden",
    "overlay.setAttribute('aria-hidden', 'true');\n      overlay.setAttribute('aria-busy', 'false');",
    "overlay.setAttribute('aria-busy', 'false');"],
  ["hide does not remove the visible class",
    "if (overlay.classList) overlay.classList.remove('visible');", "if (false) {}"],
  ["hide does not clear the status region",
    "overlay.setAttribute('aria-busy', 'false');\n      setDataErrorStatus('');\n      return true;",
    "overlay.setAttribute('aria-busy', 'false');\n      return true;"],

  // --- who may speak -------------------------------------------------------
  ["the loader's stale gate is removed",
    "if (generation !== _dataLoadGeneration) { clearDataErrorBusy(); return 'stale'; }",
    "if (false) { clearDataErrorBusy(); return 'stale'; }"],
  ["the verdict's stale gate is removed",
    "if (generation !== _dataLoadGeneration) { clearDataErrorBusy(); return 'stale'; }\n      // appStartReady()",
    "if (false) { clearDataErrorBusy(); return 'stale'; }\n      // appStartReady()"],
  ["the session guard is removed at the failure path",
    "var verdict = failed ? resolveDataLoadOutcome(generation, sessionUnchanged() === true) : null;",
    "var verdict = failed ? resolveDataLoadOutcome(generation, true) : null;"],
  ["the session guard is removed at the verdict",
    "var owned = sessionUnchanged() === true;", "var owned = true;"],
  ["the silent post-wipe path is removed", "if (opts.silent) return;", "if (false) return;"],
  ["the overlay re-announces on every failure", "if (!wasVisible) {", "if (true) {"],
  ["a stale status survives the first show",
    "setDataErrorStatus('');\n        focusDataError();", "focusDataError();"],

  // --- what counts as loaded ----------------------------------------------
  ["the retry re-fetches everything",
    ".filter(function(src) { return !_dataLoaded[src.key]; })",
    ".filter(function(src) { return true; })"],
  ["first-success-wins is removed",
    "if (_dataLoaded[src.key]) return { src: src, ok: true, duplicate: true };", "if (false) {}"],
  ["the gold tier may be empty",
    "if (!payload.gold.length) throw new Error('mattresses.json has no gold tier');",
    "if (false) throw new Error('mattresses.json has no gold tier');"],
  ["tiers need not be arrays",
    "if (!Array.isArray(payload[tier])) {", "if (false) {"],
  ["entries need no id or firmness",
    "if (!m || typeof m.id !== 'string' || !m.id) {", "if (false) {"],
  ["duplicate ids are allowed",
    "if (ids[m.id]) throw new Error('mattresses.json has duplicate id ' + m.id);", "if (false) {}"],
  ["the payload is assigned wholesale again",
    "MATTRESSES = { gold: payload.gold, silver: payload.silver, bronze: payload.bronze };",
    "MATTRESSES = payload;"],
  ["store-config accepts anything",
    "if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {\n            throw new Error('store-config.json is not an object');\n          }",
    "if (false) { throw new Error('store-config.json is not an object'); }"],
  ["the quiz may have no questions",
    "if (!questions.length) throw new Error('quiz.json has no questions');", "if (false) {}"],
  ["accessories become fatal",
    "key: 'accessories', url: './data/accessories.json', core: false,",
    "key: 'accessories', url: './data/accessories.json', core: true,"],
  ["accessories no longer degrade to []",
    "if (!_dataLoaded.accessories) ACCESSORIES = [];", "if (false) {}"],

  // --- the appliers --------------------------------------------------------
  ["a throwing applier is still a success",
    "if (!appStartReady()) {", "if (!coreDataReady()) {"],
  // Anchored to the CATCH, not to the identifier: the declaration is also
  // `_appliersApplied = false;` and mutating that one only changes the initial
  // value, which the catch immediately corrects — a mutant that behaves
  // correctly and therefore proves nothing.
  ["the applier flag is never cleared",
    "_appliersApplied = false;\n              console.error('[DreamFinder] Post-load application failed:',",
    "console.error('[DreamFinder] Post-load application failed:',"],
  ["appliers run after a wipe", "if (owned) {\n          // Each applier", "if (true) {\n          // Each applier"],
  ["startQuiz no longer waits for the appliers",
    "|| QUESTIONS.length === 0 || !appStartReady()) {", "|| QUESTIONS.length === 0) {"],

  // --- bounded requests ----------------------------------------------------
  ["the fetch deadline never fires",
    "var dataDeadlineTimer = setTimeout(function() {", "var dataDeadlineTimer = 0; (function() {"],
  // Deliberately NOT a manifest entry: "the deadline resolves instead of
  // rejecting" is not a distinct safety property. Either way the load settles,
  // the latch releases and the payload fails validation, so the outcome is the
  // same — and a mutation with no behavioural difference cannot be caught by
  // any test worth writing. What matters is that the deadline FIRES, which the
  // entry above it covers.
  ["responses are not status-checked",
    "if (!res || !res.ok) throw new Error(label + ' HTTP '", "if (false) throw new Error(label + ' HTTP '"],

  // --- the dictionary ------------------------------------------------------
  ["the installed language is not recorded",
    "if (typeof _dictInstalledFor !== 'undefined') _dictInstalledFor = loaded.lang;\n      return loaded.lang;",
    "return loaded.lang;"],
  ["the fallback claims the language that was asked for",
    "return { lang: 'en', dict: fallbackBody };", "return { lang: lang, dict: fallbackBody };"],
  ["an empty dictionary body is installed",
    "if (!loaded || !loaded.dict || !Object.keys(loaded.dict).length) return '';",
    "if (!loaded || !loaded.dict) return '';"],
  ["the dictionary ordering token is removed",
    "if (sequenced && token !== _langRequestSeq) return '';", "if (false) return '';"],
  ["the dictionary is re-fetched every time",
    "if (_dictInstalledFor !== currentLang) await loadDictionary(currentLang);",
    "if (true) await loadDictionary(currentLang);"],

  // --- focus and modal ownership ------------------------------------------
  ["Tab is taken from the layer above",
    "if (overlay.hasAttribute && overlay.hasAttribute('inert')) return;\n      if (typeof safetyDialogMode === 'function' && safetyDialogMode() !== null) return;",
    "if (false) return;"],
  ["Tab containment ignores visibility",
    "if (!e || e.key !== 'Tab' || !dataErrorVisible()) return;", "if (!e || e.key !== 'Tab') return;"],
  ["the container hand-off is removed",
    "if (active === overlay || !dataErrorOwnsFocus()) {", "if (false) {"],
  ["the Tab cycle no longer wraps",
    "if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }\n      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }",
    "if (false) {}"],
  ["the keydown handler is registered as a no-op",
    "document.addEventListener('keydown', dataErrorKeydown);",
    "document.addEventListener('keydown', function() {});"],
  ["recovery focuses Welcome from any screen",
    "if (onWelcome && typeof focusWelcomeEntry === 'function') focusWelcomeEntry();\n      else if (typeof focusActiveScreen === 'function') focusActiveScreen();",
    "if (typeof focusWelcomeEntry === 'function') focusWelcomeEntry();"],
  ["recovery moves focus even when nothing was shown",
    "if (!wasVisible || !mayFocus) return;", "if (false) return;"],
  // The two properties the recovery suite cannot see: they live in the Gate 1B
  // dialog, which only the session suite executes.
  //
  // "Visible" is not grounds to outrank an opener that is INSIDE the visible
  // layer. Remove the containment preference and a customer who was on Try
  // again when the timeout warning opened gets the whole dialog re-announced
  // and loses their place on Continue.
  ["the layer root outranks even an opener inside the layer",
    "if (openerInsideLayer && isFocusRestorable(target)) {", "if (false) {",
    WITH_SESSION],
  ["the safety dialog restores focus behind a visible overlay",
    "} else if (errorVisible && typeof errorLayer.focus === 'function') {",
    "} else if (false && typeof errorLayer.focus === 'function') {",
    WITH_SESSION],

  // --- the session inventory ----------------------------------------------
  ["the layer leaves the session-layer close list",
    "{ id: 'dataErrorOverlay', remove: ['visible'], display: 'none',\n        attrs: { 'aria-hidden': 'true', 'aria-busy': 'false' } },", ""],
  ["closing the layer no longer restores aria-hidden",
    "attrs: { 'aria-hidden': 'true', 'aria-busy': 'false' } },\n      { id: 'privacyOverlay'",
    "},\n      { id: 'privacyOverlay'"],
  ["the announcement region leaves the text inventory",
    "'sessionSafetyLive', 'dataErrorLive',", "'sessionSafetyLive',"],

  // --- the controls and their copy ----------------------------------------
  ["the retry latch is removed", "if (_dataLoadInFlight) {", "if (false) {"],
  ["aria-busy is raised before the status is written",
    "setDataErrorStatus(L(DATA_ERROR_COPY.retrying));\n      if (overlay) overlay.setAttribute('aria-busy', 'true');",
    "if (overlay) overlay.setAttribute('aria-busy', 'true');\n      setDataErrorStatus(L(DATA_ERROR_COPY.retrying));"],
  ["clean restart stops delegating to the canonical wipe",
    "if (typeof window.startOver !== 'function') return undefined;\n      return window.startOver();",
    "return undefined;"],
  ["the boot rejection goes unhandled again",
    "loadAppData().catch(function(err) {", "loadAppData(); (function(err) {"],
  ["the Spanish retry label becomes English",
    "retry:       { en: 'Try again', es: 'Intentar de nuevo' },",
    "retry:       { en: 'Try again', es: 'Try again' },"],
  ["the Spanish title becomes English",
    "es: 'Tenemos problemas para cargar' },", "es: 'We’re having trouble loading' },"],

  // --- found by an independent vacuity audit of the suite itself ----------
  ["Tab containment runs on every key, not just Tab",
    "if (!e || e.key !== 'Tab' || !dataErrorVisible()) return;",
    "if (!e || !dataErrorVisible()) return;"],
  ["recovery moves focus even when no overlay was shown",
    "if (!wasVisible || !mayFocus) return;", "if (!mayFocus) return;"],
  ["the microtask hop before the session guard binds is removed",
    "await null;", ";"],
  ["a superseded load releases the current load's latch",
    "if (generation === _dataLoadGeneration) _dataLoadInFlight = false;",
    "_dataLoadInFlight = false;"],
  ["accessories are applied without a shape check",
    "if (!Array.isArray(payload)) throw new Error('accessories.json is not an array');",
    "if (false) {}"],
  ["the white-label lookup tables stop being hydrated",
    "SUBBRAND_NOTES    = (STORE_CONFIG.salesNotes && STORE_CONFIG.salesNotes.subBrands) || {};",
    "SUBBRAND_NOTES    = {};"],
  // Targets the RECOVERY inside the catch, not the logging beside it. The
  // first version of this entry disabled only the console.error and survived,
  // correctly — a mutant that still shows the overlay has removed no safety
  // property. Same mistake as the applier-flag entry above: aim at the line
  // that carries the guarantee.
  ["the boot catch is disabled while keeping its shape",
    "      showDataError();\n    });", "      if (false) showDataError();\n    });"],
  ["the layer is focused before it is made visible",
    "if (overlay.classList) overlay.classList.add('visible');",
    "if (overlay.classList) setTimeout(function() { overlay.classList.add('visible'); }, 0);"],
  ["the accessibility contract moves off the root onto the inner panel",
    '<div id="dataErrorOverlay" role="alertdialog" aria-modal="true" tabindex="-1"',
    '<div id="dataErrorOverlay" data-role="alertdialog" data-modal="true"'],
  ["the base display:none rule is deleted",
    "#dataErrorOverlay { display:none !important; }", ""],
  ["the sr-only rule the status region depends on is deleted",
    "clip: rect(0 0 0 0);", "clip: auto;"],

  // --- the markup contract -------------------------------------------------
  ["the layer reverts to a live region",
    '<div id="dataErrorOverlay" role="alertdialog" aria-modal="true" tabindex="-1"',
    '<div id="dataErrorOverlay" role="status" aria-live="polite" tabindex="-1"'],
  ["the layer loses its accessible name",
    'aria-labelledby="dataErrorTitle" aria-describedby="dataErrorText"', ""],
  ["the retry control loses its touch handler",
    'ontouchend="event.preventDefault();window.dataErrorRetry();"', ""],
  ["the rule that makes the layer visible is deleted",
    "#dataErrorOverlay.visible { display:flex !important; }", ""],

  // ==== Phase 0.5 — consultation priorities ================================
  // --- the engine's order, count and bilingual store -----------------------
  ["the priority sort is reversed",
    "priorities.sort(function(a, b) { return b.score - a.score; });",
    "priorities.sort(function(a, b) { return a.score - b.score; });", PRIORITIES],
  ["the priority sort is removed",
    "priorities.sort(function(a, b) { return b.score - a.score; });", "", PRIORITIES],
  ["the top-three bound is widened",
    "var topPriorities = priorities.slice(0, 3);",
    "var topPriorities = priorities.slice(0, 10);", PRIORITIES],
  // Anchor updated for the Slice 2 disclosure accordion (the row renderer now
  // takes the index too); the property — engine order IS render order — is
  // unchanged, and both observers still see it.
  ["the Sleep Brief list renders reversed",
    "prioritiesEl.innerHTML = topPriorities.map(function(p, i) {",
    "prioritiesEl.innerHTML = topPriorities.slice().reverse().map(function(p, i) {", PRIORITIES],
  ["the stored state loses its Spanish prose",
    "why: { en: priority.whyEn, es: priority.whyEs },",
    "why: { en: priority.whyEn, es: priority.whyEn },", PRIORITIES],
  ["the stored state loses the testing prompts",
    "test: { en: priority.testEn, es: priority.testEs }",
    "test: { en: priority.testEn, es: '' }", PRIORITIES],

  // --- the Consultation Summary render -------------------------------------
  ["the hf2 render reverses the stored order",
    "list.innerHTML = valid.map(function(item) {",
    "list.innerHTML = valid.slice().reverse().map(function(item) {", PRIORITIES],
  ["the hf2 section never hides on empty state",
    "list.innerHTML = '';\n        section.style.display = 'none';\n        return;",
    "list.innerHTML = '';\n        section.style.display = '';\n        return;", PRIORITIES],
  ["the hf2 render drops the reason text",
    "+ escapeHtml(item.why[currentLang] || item.why.en)",
    "+ ''", PRIORITIES],
  ["the hf2 render drops the testing prompt",
    "+ escapeHtml(item.test[currentLang] || item.test.en)",
    "+ ''", PRIORITIES],
  ["the hf2 render stops escaping",
    "+ '<strong>' + escapeHtml(L(item)) + '</strong>",
    "+ '<strong>' + L(item) + '</strong>", PRIORITIES],
  // STATIC-CONTRACT entry: caught by the copy-map pin, not by a render
  // (the label is written by renderHf2's copy loop, which the suite does not
  // execute). The email suite covers the ES label behaviorally.
  ["the hf2 label loses its Spanish (static contract)",
    "hf2PrioritiesLabel: es ? 'Lo que probaremos juntos' : 'What we will test together',",
    "hf2PrioritiesLabel: 'What we will test together',", PRIORITIES],

  // --- the payload projection ----------------------------------------------
  // Reversal INSIDE the projection body, so the suite's extraction still
  // matches and the wrong order is OBSERVED — mutating the regex's literal
  // prefix instead was caught only by the extraction failing, which the
  // sweep's own rules call a boundary, not proof.
  ["the payload ships the stored order reversed",
    ".slice(0, 3)\n          .map(function(item) {",
    ".slice(0, 3).reverse()\n          .map(function(item) {",
    PRIORITIES],
  ["the payload cap is widened",
    ".slice(0, 3)\n          .map(function(item) {",
    ".slice(0, 10)\n          .map(function(item) {", PRIORITIES],
  ["the payload grows an extra key",
    "name: (item && (item[currentLang] || item.en)) || '',",
    "name: (item && (item[currentLang] || item.en)) || '', raw: item,", PRIORITIES],
  ["the payload stops pre-localizing the reason",
    "reason: (item && item.why && (item.why[currentLang] || item.why.en)) || '',",
    "reason: (item && item.why && item.why.en) || '',", PRIORITIES],

  // --- the wipe inventories -------------------------------------------------
  ["the hf2 list leaves the wipe's content inventory",
    "'hf2SleepSystemSection', 'hf2Priorities',",
    "'hf2SleepSystemSection',", PRIORITIES_WITH_SESSION],
  // STATIC-CONTRACT entry: the layer entry is belt-and-braces on top of the
  // renderer's own hide (which IS behaviorally covered); its pin is static.
  ["the hf2 section leaves the session layers (static contract)",
    "{ id: 'hf2PrioritiesSection', display: 'none' },", "", PRIORITIES],
  ["the wipe stops clearing the priority store",
    "analytics.trialFocus = [];", "analytics.trialFocus = analytics.trialFocus;",
    ["tests/session_safety_check.mjs"]],

  // --- Code.gs ---------------------------------------------------------------
  ["Code.gs: the priorities cap is removed",
    "priorities: _safeArray(data.priorities).slice(0, MAX_EMAIL_PRIORITIES).map(function(p) {",
    "priorities: _safeArray(data.priorities).map(function(p) {",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the array coercion is bypassed",
    "priorities: _safeArray(data.priorities).slice(0, MAX_EMAIL_PRIORITIES).map(function(p) {",
    "priorities: (data.priorities || []).slice(0, MAX_EMAIL_PRIORITIES).map(function(p) {",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the name bound is removed",
    "name: _safeText(p && p.name, 200),",
    "name: p && p.name,",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the HTML section stops escaping the name",
    "+ '<strong>' + (i + 1) + '. ' + _escapeHtml(pr.name) + '</strong>'",
    "+ '<strong>' + (i + 1) + '. ' + pr.name + '</strong>'",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the HTML section stops escaping the reason",
    "+ (pr.reason ? ' &mdash; ' + _escapeHtml(pr.reason) : '')",
    "+ (pr.reason ? ' &mdash; ' + pr.reason : '')",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the EN plain-text branch drops the priorities (HTML-only rendering)",
    "+ (priorityLines ? 'What we will test together:\\n' + priorityLines + '\\n' : '')",
    "",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the ES plain-text branch drops the priorities",
    "+ (priorityLines ? 'Lo que probaremos juntos:\\n' + priorityLines + '\\n' : '')",
    "",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: plain text stops stripping angle brackets",
    "var _plainPriority = function(s) { return String(s || '').replace(/[<>]/g, ''); };",
    "var _plainPriority = function(s) { return String(s || ''); };",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the projection becomes a passthrough",
    "return {\n          name: _safeText(p && p.name, 200),\n          reason: _safeText(p && p.reason, 400),\n          test: _safeText(p && p.test, 400)\n        };",
    "return Object.assign({}, p, { name: _safeText(p && p.name, 200) });",
    EMAIL_PRIORITIES, "Code.gs"],
  // P2 (Codex, PR #16): the normal SUCCESSFUL send used to ship a one-sentence
  // stub as its text/plain part, so a text-only client got no priorities on
  // the ordinary path. The first two mutations touch NOTHING except the
  // successful send's body argument — the HTML part and the whole fallback
  // path stay intact — so only a success-path text-body assertion can catch
  // them; a suite that only ever inspected the fallback would let them
  // survive. The third proves the fallback observers still bite now that the
  // catch reuses the shared body instead of building its own.
  ["Code.gs: the successful send's text part reverts to the stub",
    "GmailApp.sendEmail(email, subject, plainBody, mailOptions);",
    "GmailApp.sendEmail(email, subject, isEs ? 'Por favor visualiza este correo en un cliente de correo HTML.' : 'Please view in an HTML email client.', mailOptions);",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the successful send's text part is emptied",
    "GmailApp.sendEmail(email, subject, plainBody, mailOptions);",
    "GmailApp.sendEmail(email, subject, '', mailOptions);",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the fallback stops reusing the shared plain body",
    "GmailApp.sendEmail(email, subject, plainBody, fallbackOptions);",
    "GmailApp.sendEmail(email, subject, 'Please view in an HTML email client.', fallbackOptions);",
    EMAIL_PRIORITIES, "Code.gs"],
  // Found by the adversarial review of the fix above: the three entries
  // before this one are each caught by MANY assertions, so the suite's
  // drift-equality check (success text part === fallback body) had no
  // mutation that only IT could catch — delete that check and the sweep
  // stayed green. This mutant keeps both bodies full-length and well-formed
  // but not identical, so every content assertion passes and the equality
  // is the sole observer.
  ["Code.gs: the two sends' plain bodies drift apart",
    "GmailApp.sendEmail(email, subject, plainBody, fallbackOptions);",
    "GmailApp.sendEmail(email, subject, buildPlainBody(safeData, isEs, storeName + '.'), fallbackOptions);",
    EMAIL_PRIORITIES, "Code.gs"],

  // --- the Sleep Brief pin ---------------------------------------------------
  // Anchor updated for the Slice 2 disclosure panel, which now carries the
  // reason prose; the property — the render reads the language-RESOLVED
  // field, never the English one — is unchanged.
  ["the Sleep Brief render reads a widened field instead of the resolved one",
    "+ '<p class=\"noct-profile-priority-why\">' + escapeHtml(p.why) + '</p>'",
    "+ '<p class=\"noct-profile-priority-why\">' + escapeHtml(p.whyEn) + '</p>'",
    PRIORITIES],
  ["the brief summary stops resolving Spanish names",
    "var name = lang === 'es' ? priority.nameEs : priority.nameEn;",
    "var name = priority.nameEn;",
    PRIORITIES],

  // ==== Phase 0.6 — consultation implications ==============================
  // --- the resolver's fail-closed contract ---------------------------------
  ["a missing implication falls back to the quiz label",
    "return (typeof v === 'string') ? v.trim() : '';",
    "return (typeof v === 'string' && v.trim()) ? v.trim() : answerLabelFor(questionId, optionId);",
    CONSULT],
  ["a missing implication leaks the raw option id",
    "return (typeof v === 'string') ? v.trim() : '';",
    "return (typeof v === 'string') ? v.trim() : optionId;",
    CONSULT],
  // Codex (PR #17 final review): blank-only values must be true omissions on
  // every layer. This mutant removes the CLIENT's trim so a whitespace entry
  // survives the non-empty filter and joins as an orphan fragment.
  ["a whitespace-only implication renders as a fragment",
    "return (typeof v === 'string') ? v.trim() : '';",
    "return (typeof v === 'string') ? v : '';",
    CONSULT],
  ["the mapping is looked up by label text instead of id",
    "var v = q[optionId];",
    "var v = q[answerLabelFor(questionId, optionId)];",
    CONSULT],
  ["Spanish resolves through the English map",
    "var map = currentLang === 'es' ? CONSULT_IMPLICATIONS_ES : CONSULT_IMPLICATIONS;",
    "var map = CONSULT_IMPLICATIONS;",
    CONSULT],
  ["an unresolvable size label leaks the raw id again",
    "if (!opt) return '';",
    "if (!opt) return optionId;",
    CONSULT],

  // --- one view-model, two consumers ---------------------------------------
  // Each side of the shared resolver mutated ALONE, so only a DOM===payload
  // (or exact-content) assertion can notice — the other surface stays right.
  ["the payload consultation drifts from the DOM rows",
    "consultation: resolveConsultationSummary(),",
    "consultation: (function(vm) { vm.who = vm.who + '.'; return vm; })(resolveConsultationSummary()),",
    CONSULT],
  ["the hf2 rows stop rendering the resolved strings",
    "var vm = resolveConsultationSummary();",
    "var vm = { context: '', who: '', profile: '' };",
    CONSULT],

  // --- the hydration ---------------------------------------------------------
  // The suite extracts these lines by their ANCHOR (the BRAND_NOTES_ES line
  // above them), tolerant of the right-hand side — so a blanked map is still
  // executed and caught by the "maps populate" assertions, not by an
  // extraction boundary.
  ["the consultation maps stop being hydrated",
    "CONSULT_IMPLICATIONS    = (STORE_CONFIG.salesNotes && STORE_CONFIG.salesNotes.consultationImplications) || {};",
    "CONSULT_IMPLICATIONS    = {};",
    CONSULT],
  ["the Spanish consultation map stops being hydrated",
    "CONSULT_IMPLICATIONS_ES = (STORE_CONFIG.salesNotes_es && STORE_CONFIG.salesNotes_es.consultationImplications) || {};",
    "CONSULT_IMPLICATIONS_ES = {};",
    CONSULT],
  // Adversarial finding F3: blanking a map was caught, SWAPPING the two was
  // not — both maps still count six questions while English kiosks render
  // Spanish copy. Content-equality assertions in the suite own these.
  ["the EN hydration reads the Spanish block",
    "CONSULT_IMPLICATIONS    = (STORE_CONFIG.salesNotes && STORE_CONFIG.salesNotes.consultationImplications) || {};",
    "CONSULT_IMPLICATIONS    = (STORE_CONFIG.salesNotes_es && STORE_CONFIG.salesNotes_es.consultationImplications) || {};",
    CONSULT],
  ["the ES hydration reads the English block",
    "CONSULT_IMPLICATIONS_ES = (STORE_CONFIG.salesNotes_es && STORE_CONFIG.salesNotes_es.consultationImplications) || {};",
    "CONSULT_IMPLICATIONS_ES = (STORE_CONFIG.salesNotes && STORE_CONFIG.salesNotes.consultationImplications) || {};",
    CONSULT],

  // --- Code.gs ---------------------------------------------------------------
  ["Code.gs: the EN plain branch drops the consultation lines",
    "+ 'Sleep Brief: ' + sleepProfile + '\\n'\n      + consultBlock",
    "+ 'Sleep Brief: ' + sleepProfile + '\\n'",
    CONSULT, "Code.gs"],
  ["Code.gs: the ES plain branch drops the consultation lines",
    "+ 'Resumen de sue\\u00f1o: ' + sleepProfile + '\\n'\n      + consultBlock",
    "+ 'Resumen de sue\\u00f1o: ' + sleepProfile + '\\n'",
    CONSULT, "Code.gs"],
  ["Code.gs: the HTML part drops the consultation lines",
    "+ consultLines.map(function(line) {",
    "+ [].map(function(line) {",
    CONSULT, "Code.gs"],
  ["Code.gs: the consultation projection becomes a passthrough",
    "consultation: (function(cs) {\n        var pick = function(v) { var t = typeof v === 'string' ? v.trim() : ''; return t ? _safeText(t, 300) : ''; };\n        return {\n          context: pick(cs && cs.context),\n          who: pick(cs && cs.who),\n          profile: pick(cs && cs.profile)\n        };\n      })(data.consultation),",
    "consultation: (data.consultation && typeof data.consultation === 'object') ? data.consultation : {},",
    CONSULT, "Code.gs"],
  // Adversarial finding F6: these three properties each had exactly ONE
  // observing assertion and NO mutation of their own, so deleting the
  // assertion would have left them untested while the sweep stayed green.
  ["Code.gs: the consultation bound is widened 100x",
    "var pick = function(v) { var t = typeof v === 'string' ? v.trim() : ''; return t ? _safeText(t, 300) : ''; };",
    "var pick = function(v) { var t = typeof v === 'string' ? v.trim() : ''; return t ? _safeText(t, 30000) : ''; };",
    CONSULT, "Code.gs"],
  // Codex (PR #17 final review): the SERVER half of the blank-only rule -
  // this mutant restores the pre-review pick that bounded without trimming,
  // so "   " arrives truthy and renders an empty line in both MIME parts.
  ["Code.gs: blank-only consultation fields render anyway",
    "var pick = function(v) { var t = typeof v === 'string' ? v.trim() : ''; return t ? _safeText(t, 300) : ''; };",
    "var pick = function(v) { return typeof v === 'string' ? _safeText(v, 300) : ''; };",
    CONSULT, "Code.gs"],
  ["Code.gs: the HTML part stops escaping the consultation lines",
    ".map(function(s) { return _escapeHtml(s); })",
    ".map(function(s) { return String(s == null ? '' : s); })",
    CONSULT, "Code.gs"],
  ["Code.gs: the plain part stops stripping consultation angle brackets",
    ".map(function(s) { return _plainPriority(s); })",
    ".map(function(s) { return String(s || ''); })",
    CONSULT, "Code.gs"],
  ["Code.gs: the sheet row grows the consultation content",
    "      rsa\n    ]);",
    "      rsa,\n      JSON.stringify(data.consultation || '')\n    ]);",
    CONSULT, "Code.gs"],
  // --- compare-modal dialog semantics (the alignment prerequisite) ---------
  // Every anchor is compare-specific so none can alias onto the financing
  // sheet's byte-identical wrap/label implementation (that aliasing was a
  // real mistake caught during PR #30's scratch mutation pass).
  ["compare modal: dialog semantics removed",
    '<div id="compareModal" class="compare-modal" style="display:none;" role="dialog"\n       aria-modal="true" aria-labelledby="compareModalTitle">',
    '<div id="compareModal" class="compare-modal" style="display:none;">', COMPARE],
  ["compare modal: initial title focus removed",
    "modal.classList.add('visible');\n      if (title && typeof title.focus === 'function') {",
    "modal.classList.add('visible');\n      if (false) {", COMPARE],
  ["compare modal: Escape handling removed",
    "if (e.key === 'Escape') { e.preventDefault(); window.closeCompareModal(); return; }",
    "if (false) { return; }", COMPARE],
  ["compare modal: Shift+Tab wrap removed",
    "return el.offsetParent !== null && el.disabled !== true;\n      });\n      if (!list.length) return;\n      var first = list[0], last = list[list.length - 1];\n      if (e.shiftKey && document.activeElement === first) {\n        e.preventDefault(); last.focus();\n      } else if (!e.shiftKey && document.activeElement === last) {",
    "return el.offsetParent !== null && el.disabled !== true;\n      });\n      if (!list.length) return;\n      var first = list[0], last = list[list.length - 1];\n      if (!e.shiftKey && document.activeElement === last) {", COMPARE],
  ["compare modal: focus restoration removed",
    "try { opener.focus({ preventScroll: true }); } catch (err) { opener.focus(); }",
    "if (false) {}", COMPARE],
  ["compare modal: close-label localization removed",
    "closeBtn.setAttribute('aria-label',\n          currentLang === 'es' ? 'Cerrar comparación' : 'Close comparison');",
    "closeBtn.setAttribute('data-nope',\n          currentLang === 'es' ? 'Cerrar comparación' : 'Close comparison');", COMPARE],
  ["compare modal: wipe null-before-close ordering reversed",
    "window._compareReturnFocus = null;\n        if (typeof window.closeCompareModal === 'function') window.closeCompareModal();",
    "if (typeof window.closeCompareModal === 'function') window.closeCompareModal();\n        window._compareReturnFocus = null;", COMPARE],

  // --- static comparison alignment (owner-approved slice) ------------------
  ["compare alignment: the head row regresses to independent columns",
    "'<div class=\"cmp-head-row\" role=\"row\"><div class=\"cmp-label\" role=\"columnheader\"></div>' + a.head + b.head + '</div>'",
    "''", COMPARE],
  // Re-pointed 2026-08-12 (claim-retirement slice): the two lines gained the
  // retired-model "—" ternary, so the find-strings moved with the code. The
  // mutation semantics are IDENTICAL — drop the d0 term and the compare
  // suite must notice the title/benefit vanish.
  ["compare alignment: the key-feature title is dropped again",
    "feature: _retired ? '—' : (d0.title || mattressResponseLabel(m)),",
    "feature: _retired ? '—' : (d0.detail || mattressResponseLabel(m)),", COMPARE],
  ["compare alignment: the practical benefit is dropped",
    "benefit: _retired ? '—' : (d0.detail || mattressDifferenceText(m)),",
    "benefit: _retired ? '—' : (mattressDifferenceText(m)),", COMPARE],
  ["compare alignment: identical values no longer merge",
    "if (r.a === r.b) {", "if (false) {", COMPARE],
  ["compare alignment: difference emphasis removed",
    "' cmp-row--diff\" role=\"row\" data-cmp=\"'", "' \" role=\"row\" data-cmp=\"'", COMPARE],
  ["compare alignment: the Spanish key-feature label removed",
    "_esCmp ? 'Característica clave' : 'Key feature'", "'Key feature'", COMPARE],

  // --- comparison table associations (a11y correction) ---------------------
  ["compare alignment a11y: the table role is removed",
    "role=\"table\" aria-labelledby=\"compareModalTitle\"", "", COMPARE],
  ["compare alignment a11y: mattress column headers demoted to plain divs",
    "'<div class=\"cmp-head\" role=\"columnheader\">'", "'<div class=\"cmp-head\">'", COMPARE],
  ["compare alignment a11y: the merged-row header is demoted",
    "cmp-row--same\" role=\"row\" data-cmp=\"' + r.key + '\">'\n                  + '<div class=\"cmp-label\" role=\"rowheader\">'",
    "cmp-row--same\" role=\"row\" data-cmp=\"' + r.key + '\">'\n                  + '<div class=\"cmp-label\">'", COMPARE],
  ["compare alignment a11y: the merged cell loses its column span",
    "role=\"cell\" aria-colspan=\"2\"", "role=\"cell\"", COMPARE],

  // --- construction reveal repair + two-role reframe (slices 5a+5b) --------
  ["cons repair: the light-drawer palette override is removed",
    "body:has(#resultsScreen.active) .dfm-cons {\n      --dfm-cons-ink: #7D5B34;\n      --dfm-cons-wash: #F3EADB;\n      --dfm-cons-edge: #9A7445;\n    }",
    "", CONS],
  ["cons repair: a coil-reading motif returns to a region",
    ".dfm-cons-fill--support { background: repeating-linear-gradient(45deg, var(--dfm-cons-ink) 0 5px, var(--dfm-cons-wash) 5px 11px); }",
    ".dfm-cons-fill--support { background: repeating-radial-gradient(circle at 8px 8px, var(--dfm-cons-ink) 0 2px, var(--dfm-cons-wash) 2px 10px); }",
    CONS],
  ["cons 5b: one role explanation goes blank",
    "['Support', 'The deeper structure that holds you up.']",
    "['Support', '']", CONS],
  ["cons 5b: markup varies by model (generic boundary broken)",
    "'<div class=\"drawer-section-label\">' + heading + '</div>' +\n        '<div class=\"dfm-cons\" id=\"dfmConstructionPanel\">' +",
    "'<div class=\"drawer-section-label\">' + heading + (((window.currentDrawerMattress || {}).id) || '') + '</div>' +\n        '<div class=\"dfm-cons\" id=\"dfmConstructionPanel\">' +",
    CONS],
  ["cons 5b: markup reads product data (no-product-data rule)",
    "var keys = ['comfort', 'support'];",
    "var keys = ['comfort', 'support']; var _f = window.currentDrawerMattress && window.currentDrawerMattress.firmness;",
    CONS],
  ["cons 5b: a swatch stops matching its region",
    "'<dt><span class=\"dfm-cons-swatch dfm-cons-fill--' + keys[i] + '\" aria-hidden=\"true\"></span>'",
    "'<dt><span class=\"dfm-cons-swatch dfm-cons-fill--' + keys[0] + '\" aria-hidden=\"true\"></span>'",
    CONS],
  ["cons 5b: the forced-colors fallback is removed",
    "@media (forced-colors: active) {\n      .dfm-cons-region, .dfm-cons-swatch { border-width: 3px; }\n      .dfm-cons-fill--comfort { border-style: solid; }\n      .dfm-cons-fill--support { border-style: double; }\n    }",
    "", CONS],
  ["cons 5b: the forced-colors region styles lose their distinction",
    ".dfm-cons-fill--support { border-style: double; }",
    ".dfm-cons-fill--support { border-style: solid; }", CONS],
  ["cons 5b: collapsed roles regress to opacity-only hiding",
    "color: inherit;\n      opacity: 0;\n      visibility: hidden;\n    }\n    .dfm-cons.is-open .dfm-cons-roles { opacity: 1; visibility: visible; }",
    "color: inherit;\n      opacity: 0;\n    }\n    .dfm-cons.is-open .dfm-cons-roles { opacity: 1; visibility: visible; }",
    CONS],
  ["cons 5b: reduced motion no longer opens the demonstration",
    "if (dfmReducedMotion()) setState(true);", "", CONS],

  // --- compare entry point (owner-authorized slice) ------------------------
  ["compare entry: the top-pick card loses its compare control",
    "+       detailsBtn\n        +       compareBtn\n        +       saveBtn",
    "+       detailsBtn\n        +       saveBtn", CMPE],
  ["compare entry: the supporting cards lose their compare control",
    "+       detailsBtn\n          +       compareBtn\n          +       saveBtn",
    "+       detailsBtn\n          +       saveBtn", CMPE],
  ["compare entry: the tray go label loses its Spanish draft",
    "go.textContent = currentLang === 'es' ? 'Comparar →' : 'Compare →';",
    "go.textContent = 'Compare →';", CMPE],
  ["compare entry: the two-selection cap is removed",
    "if (arr.length >= 2) return; // soft cap at 2",
    "if (false) return;", CMPE],
  ["compare entry: toggle stops announcing state (aria-pressed dropped)",
    "btn.classList.toggle('selected', on);\n        btn.setAttribute('aria-pressed', on ? 'true' : 'false');",
    "btn.classList.toggle('selected', on);", CMPE],
  ["compare entry: clear stops announcing state (aria-pressed dropped)",
    "b.classList.remove('selected');\n        b.setAttribute('aria-pressed', 'false');",
    "b.classList.remove('selected');", CMPE],
  ["compare entry: a compare tap falls through and opens the drawer",
    "var cmpBtn = e.target.closest('.compare-btn');",
    "var cmpBtn = null;", CMPE],
  ["compare entry: the session wipe keeps the previous customer's selection",
    "window._favoriteMattressId = '';\n        window._compareSelected = [];",
    "window._favoriteMattressId = '';", CMPE],
  ["compare modal: the aligned table loses its light theme (cream on cream)",
    "body:has(#resultsScreen.active) .cmp-head-name,\n    body:has(#hf2Screen.active) .cmp-head-name,\n    body:has(#resultsScreen.active) .cmp-val,\n    body:has(#hf2Screen.active) .cmp-val {\n      color: #2F271E;\n    }",
    "", CMPE],
  ["compare tray: reduced motion regains the entrance slide",
    "@media (prefers-reduced-motion: reduce) {\n      .compare-tray { animation: none; }\n    }",
    "", CMPE],
  ["compare modal: title and price tier regress to root gold (~2.8:1)",
    "body:has(#resultsScreen.active) #compareModalTitle,\n    body:has(#hf2Screen.active) #compareModalTitle {\n      --gold: #7D5B34;\n    }\n    body:has(#resultsScreen.active) .cmp-head-name .price-tier,\n    body:has(#hf2Screen.active) .cmp-head-name .price-tier {\n      color: #7D5B34;\n    }",
    "", CMPE],

  // --- Sleep Brief CTA relabel (owner-authorized 2026-08-10) ---------------
  // The label pair is ruled verbatim and the handler must keep routing to the
  // results reveal. Anchored on the CTA's own ternary and its own button
  // markup — nothing else in the file shares either string.
  ["sleep brief CTA: the EN label reverts to the pre-relabel Compare claim",
    "ctaBtn.textContent = es ? 'Ver Mis Opciones →' : 'See My Matches →';",
    "ctaBtn.textContent = es ? 'Ver Mis Opciones →' : 'Compare My Matches →';",
    PRIORITIES],
  ["sleep brief CTA: the ES label reverts to the pre-relabel Compare claim",
    "ctaBtn.textContent = es ? 'Ver Mis Opciones →' : 'See My Matches →';",
    "ctaBtn.textContent = es ? 'Comparar Mis Opciones →' : 'See My Matches →';",
    PRIORITIES],
  ["sleep brief CTA: the handler repoints at the comparison opener",
    'id="profileCta" onclick="window.startResultsReveal()" ontouchend="event.preventDefault();window.startResultsReveal();"',
    'id="profileCta" onclick="window.compareReviewFinalists()" ontouchend="event.preventDefault();window.compareReviewFinalists();"',
    PRIORITIES],

  // --- PR 1 integrity repairs (2026-08-13) ---------------------------------
  // The deployment has no inventory data source, so a returning stock claim
  // is a fabricated claim; the RSA-panel entry reverting to a class strip is
  // the wipe no-op this repair removed.
  ["a hardcoded stock claim returns to the top-pick card",
    "'<div class=\"noct-toppick-actions\">'\n        +     '<div class=\"noct-card-action-cluster\">'",
    "'<div class=\"noct-toppick-actions\">'\n        +     '<div class=\"noct-toppick-stock\">In stock</div>'\n        +     '<div class=\"noct-card-action-cluster\">'",
    INTEGRITY],
  ["the RSA panel wipe entry reverts to the is-open class strip",
    "{ id: 'hf2RsaPanel', hiddenAttr: true },",
    "{ id: 'hf2RsaPanel', remove: ['is-open'] },",
    INTEGRITY],

  // --- Results presentation (Slice 1, 2026-08-14) --------------------------
  // D3: index-only hierarchy at the engine's own cap, ruled dict labels, the
  // relativity line, restyled 44px tabs with real selected-state semantics,
  // no buyer labels, no provenance, no synthesized priority rows on cards.
  ["results: the hero renders a different index than the engine's first entry",
    "renderTopPickCard(list[0], tier);",
    "renderTopPickCard(list[list.length - 1], tier);", RESULTS],
  ["results: the support cards render in reversed order",
    "renderSupportingCards(supports, tier);",
    "renderSupportingCards(supports.slice().reverse(), tier);", RESULTS],
  ["results: the supports are predicate-filtered on meetsMatchThreshold",
    "var supports = list.slice(1);",
    "var supports = list.slice(1).filter(function(m){ return m.meetsMatchThreshold; });",
    RESULTS],
  ["results: the presentation layer re-applies the engine cap",
    "var supports = list.slice(1);",
    "var supports = list.slice(1, 3);", RESULTS],
  ["results: the ordinal role label reads pct off the item",
    "var ordinalKey = i === 0 ? 'results.match_second'",
    "var ordinalKey = (m.pct >= 90) ? null : i === 0 ? 'results.match_second'",
    RESULTS],
  ["results: the lead role label conditions on meetsMatchThreshold",
    "escapeHtml(t('results.match_lead'))",
    "escapeHtml(m.meetsMatchThreshold ? t('results.match_lead') : '')", RESULTS],
  ["results: the tier tab stops announcing its selected state",
    "          + ' aria-pressed=\"' + (isActive ? 'true' : 'false') + '\"'\n",
    "", RESULTS],
  ["results: the tier tab falls below the 44px touch floor",
    "      min-height: 44px;\n      padding: 10px 20px 10px 24px;",
    "      padding: 10px 20px 10px 24px;", RESULTS],
  ["results: the relativity line is dropped from the tier descriptor",
    "      html += '<span class=\"tier-relativity\">' + escapeHtml(t('results.match_relativity')) + '</span>';\n",
    "", RESULTS],
  ["results: the Spanish relativity line is silently anglicized",
    "\"results.match_relativity\": \"La afinidad es relativa dentro de cada nivel\"",
    "\"results.match_relativity\": \"Match strength is relative within each tier\"",
    RESULTS, "data/dict-es.json"],
  ["results: a fabricated reason fallback stands in for missing catalog content",
    "      var reasonHtml = reason\n        ? '<p class=\"noct-toppick-reason\">' + escapeHtml(reason) + '</p>'\n        : '';",
    "      var reasonHtml = '<p class=\"noct-toppick-reason\">' + escapeHtml(reason || (es ? 'Ideal para ti' : 'A great fit for you')) + '</p>';",
    RESULTS],
  ["results: an origin/provenance chip returns to the lead card",
    "        +   '<div class=\"noct-toppick-brand\">' + escapeHtml(brandLine) + '</div>'",
    "        +   (m.locallyMade ? '<div class=\"noct-origin-chip\">Made in Texas</div>' : '')\n        +   '<div class=\"noct-toppick-brand\">' + escapeHtml(brandLine) + '</div>'",
    RESULTS],
  ["results: the promotion badges hook is removed from the support cards",
    "          +   promotionBadgesHtml(m)\n",
    "", RESULTS],
  ["results: the promotion offer tab hook is removed from the lead card",
    "        + promotionOfferTabHtml(promotion)\n        + img",
    "        + img", RESULTS],
  ["results: tier_view logs a hardcoded tier instead of the viewed one",
    "        analytics.log('tier_view', { tier: tier });",
    "        analytics.log('tier_view', { tier: 'gold' });", RESULTS],
  ["results: the tier tap strands keyboard focus on the detached tab",
    "      var tab = document.getElementById('tierTab-' + tier);\n      if (tab) { try { tab.focus({ preventScroll: true }); } catch (err) { tab.focus(); } }\n",
    "", RESULTS],

  // --- Slice 2: the Sleep Signature constellation (D2) ---------------------
  ["constellation: the geometry goes nondeterministic",
    "        var angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;",
    "        var angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2 + Math.random() * 0.01;",
    BRIEF],
  ["constellation: the decorative shield is dropped",
    "viewBox=\"0 0 120 120\" aria-hidden=\"true\" focusable=\"false\"",
    "viewBox=\"0 0 120 120\"", BRIEF],

  // --- Slice 2: the D1 Sleep Brief composition ----------------------------
  ["brief: the heading stops resolving from the governed dictionary",
    "setProfileText('profileName', t('brief.heading'));",
    "setProfileText('profileName', 'Your Sleep Brief');", BRIEF],
  ["brief: the ruled hero message is dropped from beneath the heading",
    "      setProfileText('profileHero', t('brief.hero'));\n", "", BRIEF],
  ["brief: the answer-derived subtitle returns to the customer-visible DOM",
    "        <p class=\"noct-profile-hero\" id=\"profileHero\"></p>\n",
    "        <p class=\"noct-profile-hero\" id=\"profileHero\"></p>\n        <div id=\"profileSubtitle\"></div>\n",
    BRIEF],
  ["brief: every disclosure opens at once (single-open contract lost)",
    "          var open = _briefOpenPriority === i;", "          var open = true;", BRIEF],
  ["brief: a revised quiz completion inherits the previous open disclosure",
    "      _briefOpenPriority = null;\n", "", BRIEF],
  ["brief: opening a second priority stops closing the first",
    "      _briefOpenPriority = (_briefOpenPriority === index) ? null : index;",
    "      _briefOpenPriority = index;", BRIEF],
  ["brief: the disclosure stops announcing its state",
    "            + ' aria-expanded=\"' + (open ? 'true' : 'false') + '\"'\n", "", BRIEF],
  ["brief: the testing prose leaves the disclosure panel",
    "            + '<p class=\"noct-profile-priority-test\"><strong>' + escapeHtml(t('brief.try_this')) + '</strong>' + escapeHtml(p.test) + '</p>'\n",
    "", BRIEF],
  ["brief: the reason prose leaves the disclosure panel",
    "            + '<p class=\"noct-profile-priority-why\">' + escapeHtml(p.why) + '</p>'\n",
    "", BRIEF],
  ["brief: the disclosure toggle falls below the 44px touch floor",
    "      min-width: 44px;\n      min-height: 44px;\n      padding: 11px 14px;",
    "      padding: 11px 14px;", BRIEF],
  ["brief: the focus destination suppresses its own indicator again",
    "      letter-spacing: -0.035em;\n      line-height: 0.98;\n    }",
    "      letter-spacing: -0.035em;\n      line-height: 0.98;\n      outline: none;\n    }", BRIEF],
  ["brief: the wipe stops owning the Sleep Signature containers",
    "      'profileName', 'profilePriorities', 'profileSignature', 'profileHero',",
    "      'profileName', 'profilePriorities', 'profileHero',", BRIEF],
  // --- Slice 2 device-gate repairs (2026-08-15) ---------------------------
  ["brief: the reveal starts before the Sleep Brief is painted (one frame, not two)",
    "          sessionFrame(function() {\n            sessionFrame(function() {\n              var el = document.getElementById('profileSignature');\n              if (el && el.classList) el.classList.add('is-entering');\n            });\n          });",
    "          sessionFrame(function() {\n              var el = document.getElementById('profileSignature');\n              if (el && el.classList) el.classList.add('is-entering');\n          });",
    BRIEF],
  ["brief: the hero constellation shrinks back to stamp scale",
    "      width: clamp(220px, 20vw, 260px);\n      margin-inline: auto;",
    "      width: clamp(132px, 15vw, 168px);\n      margin-inline: auto;", BRIEF],
  ["brief: portrait pins the card to the viewport again (dead band below the actions)",
    "        min-height: auto;\n        border: 0;",
    "        min-height: 100dvh;\n        border: 0;", BRIEF],
  ["brief: the portrait heading loses its clearance from the fixed controls",
    "        padding-top: calc(var(--session-utility-clearance) + env(safe-area-inset-top));\n",
    "", BRIEF],
  ["brief: the signature animates on every render, not just the quiz entry",
    "        window._sleepSignatureEntry = false;\n", "", BRIEF],
  ["brief: the Results header stamp stops sharing the answer-derived geometry",
    "      if (resultsSignature) resultsSignature.innerHTML = buildSleepSignatureSvg(answers);",
    "      if (resultsSignature) resultsSignature.innerHTML = '';", BRIEF],
  ["brief: the Consultation Summary stamp is dropped",
    "      if (hf2Signature) hf2Signature.innerHTML = buildSleepSignatureSvg(answers);\n",
    "", BRIEF],
  ["brief: the Spanish signature eyebrow is anglicized",
    "\"brief.signature_eyebrow\": \"Tu firma de sueño\",",
    "\"brief.signature_eyebrow\": \"Your sleep signature\",", BRIEF, "data/dict-es.json"],
  ["brief: the retained reveal fallback stops honoring reduced motion",
    "      if (dfmReducedMotion()) {\n        window._sleepSignatureEntry = true;\n        window.showProfileScreen();\n        return;\n      }\n      var elements = getConsultationRevealElements();",
    "      var elements = getConsultationRevealElements();", MOTION],

];

// ---------------------------------------------------------------------------
if (process.argv.includes("--list")) {
  MUTATIONS.forEach(([label], i) => console.log(`${String(i + 1).padStart(2)}. ${label}`));
  console.log(`\n${MUTATIONS.length} mutations; default suites: ${DEFAULT_SUITES.join(", ")}`);
  process.exit(0);
}

const sandbox = mkdtempSync(join(tmpdir(), "df-mutsweep-"));
process.on("exit", () => { try { rmSync(sandbox, { recursive: true, force: true }); } catch {} });
for (const d of ["tests", "data", "docs", "tools", "incoming"]) {
  cpSync(join(root, d), join(sandbox, d), { recursive: true });
}
for (const f of ["index.html", "Code.gs"]) cpSync(join(root, f), join(sandbox, f));

// Per-target pristine sources. Entries name their target with a fifth field;
// index.html is the default. Every mutated target is restored before the next
// entry runs, so one entry's mutation can never contaminate another's.
const PRISTINE = readFileSync(join(sandbox, "index.html"), "utf8");
const PRISTINE_BY_FILE = {
  "index.html": PRISTINE,
  "Code.gs": readFileSync(join(sandbox, "Code.gs"), "utf8"),
  "data/dict-es.json": readFileSync(join(sandbox, "data", "dict-es.json"), "utf8"),
};

function runSuites(suites) {
  const red = [];
  for (const s of suites) {
    try {
      execFileSync("node", [s], { cwd: sandbox, stdio: "pipe", timeout: 180000 });
    } catch {
      red.push(s.replace("tests/", "").replace("_check.mjs", ""));
    }
  }
  return red;
}

function asRegex(find) {
  return new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\r?\n/g, "\\r?\\n"));
}

let survivors = 0, notApplied = 0, caught = 0;
// The baseline runs EVERY suite the manifest can name, derived from the
// manifest itself so a new entry's observer is baselined automatically. A
// suite that is red before any mutation would otherwise mark every mutation
// naming it as "caught" and the sweep could finish green while masking a
// vacuous observer (Codex, PR #16).
const ALL_OBSERVERS = [...new Set(
  MUTATIONS.flatMap((m) => m[3] || DEFAULT_SUITES).concat(WITH_SESSION))];
const baseline = runSuites(ALL_OBSERVERS);
console.log(`baseline (unmutated): ${baseline.length ? "RED — " + baseline.join(",") : "green"}\n`);
if (baseline.length) {
  console.log("::error:: the sweep cannot mean anything while the suites are red unmutated");
  process.exit(1);
}

for (const [label, find, replace, suites, targetFile] of MUTATIONS) {
  const target = targetFile || "index.html";
  const clean = PRISTINE_BY_FILE[target];
  const mutated = clean.replace(asRegex(find), replace);
  if (mutated === clean) {
    console.log(`  [NOT APPLIED] ${label}`);
    notApplied++;
    continue;
  }
  writeFileSync(join(sandbox, target), mutated);
  const red = runSuites(suites || DEFAULT_SUITES);
  writeFileSync(join(sandbox, target), clean);
  if (red.length === 0) {
    console.log(`  [SURVIVED]    ${label}`);
    survivors++;
  } else {
    console.log(`  [caught by ${red.join(",")}] ${label}`);
    caught++;
  }
}

console.log(`\nMutation sweep: ${caught}/${MUTATIONS.length} caught, ${survivors} survived, ${notApplied} did not apply`);
if (survivors) console.log("A SURVIVOR is a safety property with no effective test.");
if (notApplied) console.log("A mutation that DID NOT APPLY is a stale manifest entry — its target moved or was renamed.");
process.exit(survivors === 0 && notApplied === 0 ? 0 : 1);
