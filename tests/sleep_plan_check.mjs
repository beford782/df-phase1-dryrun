#!/usr/bin/env node
// Sleep Plan check — Slice 5 (D5 / roadmap §1.7), owner rulings 2026-08-21.
//
// Two halves, deliberately distinct:
//
//   PART 1 — PASS-1 CHARACTERIZATION AGAINST SHIPPED CODE. These assertions
//   were written to be RED at 4a76503 for a stated reason (silent finalist
//   promotion, the reachable two-tap orphan, the impure accessory view model)
//   and to turn green ONLY when the Slice 5 behaviour lands. They need no new
//   symbol to fail, which is what makes them discriminating rather than
//   "extraction failed". Their red run is recorded in the C0 commit message.
//
//   PART 2 — THE SLICE 5 CONTRACT. Each section is gated on the symbol it
//   governs. A MISSING symbol is reported as an explicit [pending] line and
//   counted as a failure ONLY after the corresponding commit should have
//   landed (the REQUIRED set below). Until then absence is absence, not
//   success — and never a green.
//
// Every assertion that governs behaviour has a named mutant in
// tests/mutation_sweep.mjs whose observer list names THIS file explicitly
// (mutation_sweep's DEFAULT_SUITES fall-through would otherwise report a
// survivor as a pass).
//
// Run: node tests/sleep_plan_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const norm = html.replace(/\r\n/g, "\n");
const dictEn = JSON.parse(readFileSync(join(root, "data", "dict-en.json"), "utf8"));
const dictEs = JSON.parse(readFileSync(join(root, "data", "dict-es.json"), "utf8"));
const ACCESSORIES = JSON.parse(readFileSync(join(root, "data", "accessories.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
  return !!cond;
}
function section(name) { console.log(`\n-- ${name} --`); }

function extractFunction(anchor) {
  const start = norm.indexOf(anchor);
  if (start === -1) return null;
  let i = norm.indexOf("{", start);
  if (i === -1) return null;
  let depth = 1; i++;
  while (i < norm.length && depth > 0) {
    const ch = norm[i];
    if (ch === "{") depth++; else if (ch === "}") depth--;
    i++;
  }
  return norm.slice(start, i) + ";";
}
function countOccurrences(s, needle) { return s.split(needle).length - 1; }
function throwingWindow(seed = {}) {
  const store = Object.assign(Object.create(null), seed);
  return new Proxy(store, {
    get(t, k) {
      if (typeof k === "symbol") return undefined;
      if (k in t) return t[k];
      throw new Error(`read window.${String(k)} which this harness never declared`);
    },
    set(t, k, v) { t[k] = v; return true; },
    has(t, k) { return typeof k === "symbol" ? false : k in t; },
    deleteProperty(t, k) { delete t[k]; return true; }
  });
}

// Which Part 2 sections are REQUIRED at this head. The C0 commit ships this
// file with only Part 1 required; each later commit flips its section on by
// landing the symbol. A section listed here whose symbol is absent is a
// failure; one not listed is reported [pending].
const REQUIRED = new Set([
  "resolveFinalistState", "chooseFinalist",   // finalist provenance commit (C2)
  "readSleepSystemGroups",   // accessor commit (C3)
  "sleepPlanScreen", "renderSleepPlan",   // screen-shell commit (C4)
]);
function gate(symbolName, present) {
  if (present) return true;
  if (REQUIRED.has(symbolName)) { check(`[required] ${symbolName} is present`, false, "symbol absent at a head that requires it"); }
  else { console.log(`  [pending] ${symbolName} not present at this head — section skipped (not counted as pass)`); }
  return false;
}

// ============================================================================
// PART 1 — pass-1 characterization against SHIPPED code
// ============================================================================

const FINALIST_SRC = extractFunction("function getSleepSystemFinalist()");
const VIEWMODEL_SRC = extractFunction("function getSleepSystemViewModel()");
const QUALIFY_SRC = extractFunction("function qualifyRankedChoices(sorted, scoreForItem)");
const STEP_SRC = extractFunction("function sleepSystemStepForItem(item)");
const CAT_SRC = extractFunction("function sleepSystemCategory(item)");

section("pass-1 / finalist: no silent promotion (RED at 4a76503 by design)");
check("getSleepSystemFinalist() extracted", !!FINALIST_SRC);
if (FINALIST_SRC) {
  // Once the resolver lands, getSleepSystemFinalist() delegates to it; the
  // sandbox includes it when present so the wrapper is exercised as shipped.
  const RESOLVER_FOR_PASS1 = extractFunction("function resolveFinalistState()") || "";
  const run = (savedPicks, favorite, resultsState, analytics) => {
    try {
      return { ok: true, v: new Function("window", "_resultsState", "analytics",
        RESOLVER_FOR_PASS1 + "\n" + FINALIST_SRC + "\n return getSleepSystemFinalist();")(
        { _savedPicks: savedPicks, _favoriteMattressId: favorite }, resultsState, analytics) };
    } catch (e) { return { ok: false, err: e }; }
  };
  const saved = [{ id: "g5", name: "G5" }, { id: "g6", name: "G6" }];
  const gold = [{ id: "gX", name: "GX" }];
  const top = { name: "TOP", tier: "gold" };
  const HOSTILE = [
    ["blank ''", ""], ["whitespace '  '", "  "], ["unknown 'g999'", "g999"],
    ["'g1' not among the picks", "g1"], ["number 0", 0], ["number 42", 42],
    ["boolean true", true], ["array []", []], ["object {}", {}],
    ["{toString:null}", { toString: null }], ["lone surrogate", "\uD800"],
    ["null", null], ["undefined", undefined],
  ];
  // With picks present: NONE of these names a finalist; the honest result is
  // null (no explicit finalist). Shipped code returns saved[0] for all 13.
  for (const [label, fav] of HOSTILE) {
    const r = run(saved, fav, null, {});
    check(`hostile favorite ${label} with picks present yields NO finalist (not saved[0])`,
      r.ok && r.v === null, r.ok ? `got ${JSON.stringify(r.v)}` : `threw ${r.err && r.err.message}`);
  }
  // With no picks and engine output present: still no finalist. Shipped code
  // promotes tierData.gold[0], then analytics.topPick.
  check("no picks + Gold #1 present yields NO finalist (never the engine's pick)",
    (() => { const r = run([], "", { tierData: { gold } }, {}); return r.ok && r.v === null; })());
  check("no picks + empty gold + analytics.topPick yields NO finalist (never the analytics fallback)",
    (() => { const r = run([], "", { tierData: { gold: [] } }, { topPick: top }); return r.ok && r.v === null; })());
  // The REACHABLE two-tap orphan (owner ruling R-1 evidence): favorite g5 was
  // un-saved on Results; _savedPicks=[g6], favorite still 'g5'. Shipped code
  // returns g6 and labels it "your finalist".
  check("ORPHANED favorite (un-saved on Results: picks=[g6], favorite='g5') yields NO finalist — never another saved pick",
    (() => { const r = run([{ id: "g6", name: "G6" }], "g5", null, {}); return r.ok && r.v === null; })());
  // Blank-id pick at index >= 1: a blank favorite must NOT match a blank pick
  // id. (At index 0 the outcome is indistinguishable from saved[0]; index 1 is
  // the discriminating fixture.)
  check("a BLANK pick id at index 1 is never matched by a blank favorite (C12 pattern in the finalist path)",
    (() => { const r = run([{ id: "g6" }, { id: "", name: "BLANK" }], "", null, {}); return r.ok && r.v === null; })());
  // Malformed _savedPicks shapes must not throw.
  for (const [label, picks] of [["[null, pick]", [null, { id: "g6" }]], ["a string", "g5g6"], ["a non-array object", { 0: { id: "g6" } }]]) {
    const r = run(picks, "g6", null, {});
    check(`malformed _savedPicks ${label} does not throw`, r.ok, r.ok ? "" : `threw ${r.err && r.err.message}`);
  }
  // Controls that must hold in BOTH worlds.
  check("[control] exact valid favorite 'g6' among the picks resolves to g6",
    (() => { const r = run(saved, "g6", null, {}); return r.ok && r.v && r.v.id === "g6"; })());
  check("[control] empty session resolves to null",
    (() => { const r = run([], "", null, {}); return r.ok && r.v === null; })());
}

section("pass-1 / accessories: the shipped view model is not a safe Plan accessor (RED at 4a76503 by design)");
check("getSleepSystemViewModel() extracted", !!VIEWMODEL_SRC);
check("qualifyRankedChoices/sleepSystemStepForItem/sleepSystemCategory extracted", !!QUALIFY_SRC && !!STEP_SRC && !!CAT_SRC);
if (VIEWMODEL_SRC && QUALIFY_SRC && STEP_SRC && CAT_SRC && FINALIST_SRC) {
  // A5: the shipped view model MUTATES analytics.recommendedAccessories on
  // every call, so it is not a safe thing for a renderer to read. At 4a76503
  // it was the only accessor; the Plan's accessor (readSleepSystemGroups,
  // gated below) must leave the sentinel IDENTICAL. Measured with a real
  // scorer so the call reaches the write.
  const SENTINEL = Object.freeze([]);
  const analytics = { recommendedAccessories: SENTINEL, topPick: null };
  const SCORE_FOR_A5 = extractFunction("function scoreAccessoriesFromAnswers()");
  const READ_FOR_A5 = extractFunction("function readSleepSystemGroups()") || "";
  new Function("ACCESSORIES", "window", "answers", "currentLang", "analytics", "_resultsState",
    `"use strict"; ${SCORE_FOR_A5} ${extractFunction("function resolveFinalistState()") || ""} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${FINALIST_SRC} ${READ_FOR_A5} ${VIEWMODEL_SRC}
     getSleepSystemViewModel();`)(
    ACCESSORIES, throwingWindow({ _savedPicks: [], _favoriteMattressId: "" }), { sleep_position: "side" }, "en", analytics, null);
  check("A5 (characterization): the shipped view model REASSIGNS analytics.recommendedAccessories — a renderer must not read through it",
    analytics.recommendedAccessories !== SENTINEL);
  if (READ_FOR_A5) {
    const a2 = { recommendedAccessories: SENTINEL, topPick: null };
    new Function("ACCESSORIES", "window", "answers", "currentLang", "analytics",
      `"use strict"; ${SCORE_FOR_A5} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${READ_FOR_A5} readSleepSystemGroups();`)(
      ACCESSORIES, throwingWindow({}), { sleep_position: "side" }, "en", a2);
    check("A5: the Plan's accessor leaves analytics.recommendedAccessories IDENTICAL (sentinel identity, not deep-equal)",
      a2.recommendedAccessories === SENTINEL);
  } else {
    console.log("  [pending] A5 accessor half skipped — readSleepSystemGroups not present at this head");
  }
  // A6 belongs to the Plan RENDERER (it must never call the scorer, directly
  // or indirectly); it is asserted in the screen-shell section with a
  // throwing scorer stub once renderSleepPlan exists.
}

// ============================================================================
// PART 2 — the Slice 5 contract (each section gated on its symbol)
// ============================================================================

section("contract / resolveFinalistState()");
const RESOLVER_SRC = extractFunction("function resolveFinalistState()");
if (gate("resolveFinalistState", !!RESOLVER_SRC)) {
  const run = (savedPicks, favorite) => {
    try {
      return { ok: true, v: new Function("window", RESOLVER_SRC + "\n return resolveFinalistState();")(
        { _savedPicks: savedPicks, _favoriteMattressId: favorite }) };
    } catch (e) { return { ok: false, err: e }; }
  };
  const saved = [{ id: "g5", name: "G5" }, { id: "g6", name: "G6" }];
  const r = run(saved, "g6");
  check("returns a discriminated {kind, item}", r.ok && r.v && typeof r.v.kind === "string");
  check("exact valid favorite -> kind 'chosen' with that item", r.ok && r.v.kind === "chosen" && r.v.item && r.v.item.id === "g6");
  check("no favorite with picks -> kind 'none' (never a promotion)", (() => { const x = run(saved, ""); return x.ok && x.v.kind === "none" && !x.v.item; })());
  check("empty picks -> kind 'none'", (() => { const x = run([], ""); return x.ok && x.v.kind === "none"; })());
  check("orphaned favorite (picks=[g6], favorite 'g5') -> kind 'none'", (() => { const x = run([{ id: "g6" }], "g5"); return x.ok && x.v.kind === "none"; })());
  check("blank pick id at index 1 with blank favorite -> kind 'none'", (() => { const x = run([{ id: "g6" }, { id: "" }], ""); return x.ok && x.v.kind === "none"; })());
  for (const [label, fav] of [["whitespace", "  "], ["number", 42], ["boolean", true], ["array", []], ["object", {}], ["{toString:null}", { toString: null }], ["lone surrogate", "\uD800"], ["null", null]]) {
    check(`hostile favorite ${label} -> kind 'none', no throw`, (() => { const x = run(saved, fav); return x.ok && x.v.kind === "none"; })());
  }
  for (const [label, picks] of [["[null, pick]", [null, { id: "g6" }]], ["a string", "g5g6"], ["an object", { 0: { id: "g6" } }]]) {
    check(`malformed _savedPicks ${label} -> no throw`, run(picks, "g6").ok);
  }
  check("the resolver never references tierData, topPick or analytics (no engine fallback path exists)",
    !/tierData|topPick|analytics/.test(RESOLVER_SRC));
}

section("contract / chooseFinalist() producer + atomic clears (R-1)");
const CHOOSE_SRC = extractFunction("window.chooseFinalist = function(mattressId)");
const TOGGLE_SAVE_SRC = extractFunction("window._toggleSavePick = function(mattressId)");
const REMOVE_SRC = extractFunction("window.removeReviewMattress = function(mattressId)");
const HF2_TOGGLE_SRC = extractFunction("window.toggleFavoriteMattress = function(mattressId)");
if (gate("chooseFinalist", !!CHOOSE_SRC && !!TOGGLE_SAVE_SRC && !!REMOVE_SRC && !!HF2_TOGGLE_SRC)) {
  // Minimal executable environment: a results state with two gold mattresses,
  // a DOM stub that records button repaints, an analytics recorder.
  const mk = () => {
    const events = [];
    const buttons = {};
    const doc = {
      getElementById: (id) => buttons[id] || null,
      querySelectorAll: () => Object.values(buttons).filter((b) => b.className.includes("finalist-btn")),
    };
    const btn = (id, cls) => (buttons[id] = { id, className: cls, attrs: {}, textContent: "",
      classList: { add(c) { if (!this._s.has(c)) this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); }, _s: new Set() },
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : (k === "data-id" ? id.replace(/^fin-/, "") : null); } });
    btn("save-g5", "noct-save-btn"); btn("save-g6", "noct-save-btn");
    btn("fin-g5", "finalist-btn"); btn("fin-g6", "finalist-btn");
    const win = { _savedPicks: [], _favoriteMattressId: "", _updatePicksBadge: () => {} };
    const resultsState = { tierData: { gold: [{ id: "g5", name: "G5", brand: "B", firmness: 5 }, { id: "g6", name: "G6", brand: "B", firmness: 6 }], silver: [], bronze: [] } };
    new Function("window", "document", "_resultsState", "analytics", "t", "saveButtonLabel", "firmnessFeel", "renderHf2", "_renderResults",
      `"use strict";
       ${TOGGLE_SAVE_SRC}
       ${CHOOSE_SRC}
       function finalistButtonLabel(c) { return c ? 'CHOSEN' : 'CHOOSE'; }
       window._repaintFinalistControls = function() {
         document.querySelectorAll('.finalist-btn').forEach(function(btn) {
           var on = btn.getAttribute('data-id') === window._favoriteMattressId;
           btn.classList.toggle('chosen', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.textContent = finalistButtonLabel(on);
         });
       };
       ${REMOVE_SRC}
       ${HF2_TOGGLE_SRC}`)(
      win, doc, resultsState, { log: (e, d) => events.push({ e, d }) }, (k) => k, (s) => (s ? "SAVED" : "SAVE"), () => "FEEL", () => {}, () => {});
    return { win, events, buttons };
  };
  {
    const { win } = mk();
    win.chooseFinalist("g5");
    check("choosing an UNSAVED mattress saves it AND sets it as finalist (atomic)",
      win._savedPicks.some((p) => p.id === "g5") && win._favoriteMattressId === "g5");
    win.chooseFinalist("g6");
    check("choosing a second mattress REPLACES the previous finalist (single finalist) and saves it",
      win._favoriteMattressId === "g6" && win._savedPicks.some((p) => p.id === "g6") && win._savedPicks.some((p) => p.id === "g5"));
    const before = win._favoriteMattressId;
    win.chooseFinalist("g6");
    check("re-choosing the current finalist is an idempotent no-op (never a toggle off)", win._favoriteMattressId === before && before === "g6");
  }
  {
    // The Consultation Summary's control carries the SAME "Chosen ✓" label as
    // the Results producer (finalistButtonLabel) and must mean the same thing:
    // activating it on the current finalist keeps the finalist and keeps the
    // pick saved. Unsetting belongs to the adjacent Remove control. (External
    // review P2 at eb7b124: the hf2 control toggled the finalist OFF, so the
    // next Plan render silently fell back to the recommended starting point.)
    const { win } = mk();
    win.toggleFavoriteMattress("g5");
    check("hf2 control on an unchosen saved pick SETS it as finalist through the producer (saves + chooses)",
      win._favoriteMattressId === "g5" && win._savedPicks.some((p) => p.id === "g5"));
    win.toggleFavoriteMattress("g5");
    check("hf2 control on the CURRENT finalist is idempotent — finalist kept, pick still saved (never a toggle off)",
      win._favoriteMattressId === "g5" && win._savedPicks.some((p) => p.id === "g5"));
    win.toggleFavoriteMattress("g6");
    check("hf2 control on another pick REPLACES the finalist (single finalist), both picks stay saved",
      win._favoriteMattressId === "g6" && win._savedPicks.some((p) => p.id === "g5") && win._savedPicks.some((p) => p.id === "g6"));
  }
  {
    const { win } = mk();
    win._toggleSavePick("g5");
    check("SAVING ALONE never chooses a finalist", win._savedPicks.length === 1 && win._favoriteMattressId === "");
  }
  {
    const { win } = mk();
    win.chooseFinalist("g5"); win._toggleSavePick("g6");
    win._toggleSavePick("g5");   // un-save the chosen one on Results
    check("un-saving the chosen mattress on Results ATOMICALLY clears _favoriteMattressId (the two-tap orphan is closed)",
      !win._savedPicks.some((p) => p.id === "g5") && win._favoriteMattressId === "");
  }
  {
    const { win } = mk();
    win.chooseFinalist("g5"); win._toggleSavePick("g6");
    win._toggleSavePick("g6");   // un-save a NON-finalist
    check("un-saving a different mattress leaves the finalist intact", win._favoriteMattressId === "g5");
  }
  {
    const { win } = mk();
    win.chooseFinalist("g5"); win.removeReviewMattress("g5");
    check("hf2 Remove of the chosen mattress clears the finalist", win._favoriteMattressId === "" && !win._savedPicks.some((p) => p.id === "g5"));
  }
  {
    const { win, events } = mk();
    win.chooseFinalist("g5");
    check("choosing emits NO analytics event of its own (only the save toggle's existing event, if a save happened)",
      events.every((x) => x.e === "save_pick_toggle"));
    for (const bad of ["", "  ", null, undefined, 42, {}, [], "g999"]) {
      const w = mk().win; w.chooseFinalist(bad);
      check(`chooseFinalist(${JSON.stringify(bad)}) is a no-op: no finalist, no throw, no stray save`,
        w._favoriteMattressId === "" && !w._savedPicks.some((p) => p && p.id === bad));
    }
  }
  check("the Results cards DEFINE the finalist control on BOTH templates (top pick + supporting)",
    countOccurrences(norm, "class=\"finalist-btn'") === 2);
  check("...and EMIT it into BOTH action clusters between compare and save (definition alone is not emission)",
    (norm.match(/\+\s+detailsBtn\s+\+\s+compareBtn\s+\+\s+finalistBtn\s+\+\s+saveBtn/g) || []).length === 2);
  check("the finalist control is routed through the delegated click handler before the card-tap path",
    /closest\('\.finalist-btn'\)[\s\S]{0,200}chooseFinalist\(/.test(norm)
    && norm.indexOf("closest('.finalist-btn')") < norm.indexOf("closest('.noct-toppick, .noct-support-card')"));
  check("the drawer's save control no longer says 'Save as Finalist' (labels a save as a save)",
    !/Save as Finalist|Guardar como finalista|Finalist saved|Finalista guardado/.test(norm));
  check("hf2 no longer calls saved picks 'finalists' (plural vocabulary retired)",
    !/'Your finalists'|'Tus finalistas'|'Add to finalists'|'Agregar a finalistas'|'Compare finalists'|'Comparar finalistas'|Only saved finalists|Solo los finalistas/.test(norm));
  check("the compare modal title no longer labels an arbitrary pair as finalists",
    !/Compare Your Finalists|Compara Tus Finalistas/.test(norm));
  check("the Sleep System anchor label is kind-aware (finalist vs recommended starting point) and dictionary-driven",
    /t\('finalist\.building_around_finalist'\)/.test(norm) && /t\('finalist\.building_around_recommended'\)/.test(norm)
    && !/'Building around your finalist'/.test(norm));
  for (const k of ["finalist.chosen", "finalist.recommended", "finalist.none", "finalist.choose", "finalist.choose_as", "finalist.chosen_btn",
    "finalist.building_around_finalist", "finalist.building_around_recommended", "compare.modal_title", "hf2.saved_picks_label", "hf2.compare_saved", "hf2.add_to_saved",
    "hf2.saved_picks_hint"]) {
    check(`dict key ${k} present in both languages and translated`,
      typeof dictEn[k] === "string" && dictEn[k].length > 0 && typeof dictEs[k] === "string" && dictEs[k].length > 0 && dictEn[k] !== dictEs[k]);
  }
  // The hint paired with "Your saved picks" must not call every saved pick a
  // finalist (saving and choosing are separate actions). External review P2
  // at 0613805: the renamed label still sat beside "Saved finalists are sent".
  check("the saved-picks hint is dictionary-driven and uses saved-pick terminology in BOTH languages (no 'finalist')",
    /hf2FinalistsHint:\s*t\('hf2\.saved_picks_hint'\)/.test(norm) && !/Saved finalists are sent/.test(norm) && !/Los finalistas guardados se env/.test(norm)
    && !/finalist/i.test(dictEn["hf2.saved_picks_hint"]) && !/finalista/i.test(dictEs["hf2.saved_picks_hint"]));
  check("the governed EN strings are exact", dictEn["finalist.chosen"] === "Finalist ✓" && dictEn["finalist.recommended"] === "Recommended starting point"
    && dictEn["finalist.none"] === "No finalist selected yet" && dictEn["finalist.choose"] === "Choose a finalist"
    && dictEn["finalist.choose_as"] === "Choose as finalist" && dictEn["finalist.chosen_btn"] === "Chosen ✓");
}

section("contract / readSleepSystemGroups() — side-effect-free Plan accessor");
const READ_SRC = extractFunction("function readSleepSystemGroups()");
const SCORE_SRC = extractFunction("function scoreAccessoriesFromAnswers()");
if (gate("readSleepSystemGroups", !!READ_SRC) && QUALIFY_SRC && STEP_SRC && CAT_SRC && SCORE_SRC) {
  const stripComments = (src) => src.replace(/\/\/.*$/gm, "");
  check("the accessor writes nothing to analytics", !/analytics\s*\./.test(stripComments(READ_SRC)));
  check("the accessor writes nothing to window state", !/window\.[A-Za-z_$][\w$]*\s*=/.test(stripComments(READ_SRC)));
  check("the accessor does not reach the finalist", !/getSleepSystemFinalist|resolveFinalistState|_favoriteMattressId|_savedPicks/.test(READ_SRC));
  check("the accessor carries the engine-owned support sub-type sort and NO score re-sort",
    /groups\.support\.sort\(/.test(READ_SRC) && (stripComments(READ_SRC).match(/\.sort\(/g) || []).length === 1);
  // A: engine parity. The accessor's groups must equal the fixture-facing
  // view model's groups id-for-id, index-for-index (the fixture pins the
  // latter; this ties the Plan's source to the pinned one).
  {
    const answers = { sleep_position: "side", temperature: "hot", sleep_issues: ["snoring"], health_conditions: [], budget: "mid" };
    const out = {};
    new Function("ACCESSORIES", "window", "answers", "currentLang", "analytics", "_resultsState", "out",
      `"use strict"; ${SCORE_SRC} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${extractFunction("function resolveFinalistState()") || ""} ${FINALIST_SRC} ${READ_SRC} ${VIEWMODEL_SRC}
       out.vm = getSleepSystemViewModel().groups; out.rd = readSleepSystemGroups();`)(
      ACCESSORIES, throwingWindow({ _savedPicks: [], _favoriteMattressId: "" }), answers, "en", {}, null, out);
    const ids = (g) => ["support", "adjustability", "pillow", "protection"].map((k) => g[k].map((a) => a.id));
    check("the accessor's four groups equal the view model's four groups, id-for-id, index-for-index",
      JSON.stringify(ids(out.vm)) === JSON.stringify(ids(out.rd)));
    check("at the pinned catalog every group is non-empty (support/adjustability/pillow/protection)",
      ["support", "adjustability", "pillow", "protection"].every((k) => out.rd[k].length > 0));
  }
  // B: NOT memoized — and the assertion discriminates a PER-LANGUAGE memo,
  // which an EN/ES-differ check cannot. Same language, module-scope answers
  // mutated between two reads: the output MUST change. The scorer reads
  // `answers` directly, so no plumbing is needed.
  {
    const out = {};
    new Function("ACCESSORIES", "window", "currentLang", "out",
      `"use strict"; var answers = { sleep_position: "side", temperature: "hot", sleep_issues: ["snoring"], health_conditions: [], budget: "mid" };
       ${SCORE_SRC} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${READ_SRC}
       out.a = JSON.stringify(readSleepSystemGroups());
       answers = { sleep_position: "back", temperature: "cold", sleep_issues: [], health_conditions: ["back_pain"], budget: "premium" };
       out.b = JSON.stringify(readSleepSystemGroups());
       out.a2 = (function(){ answers = { sleep_position: "side", temperature: "hot", sleep_issues: ["snoring"], health_conditions: [], budget: "mid" }; return JSON.stringify(readSleepSystemGroups()); })();`)(
      ACCESSORIES, throwingWindow({}), "en", out);
    check("two reads in the SAME language with answers mutated between them differ (no memo of any kind, per-language included)",
      out.a !== out.b);
    check("restoring the answers restores the output (deterministic given inputs)", out.a === out.a2);
  }
  // C: language reaches the reasons through the read, every time (no stale
  // first-render language). ES-first equals EN-then-ES.
  {
    const run = (seq) => {
      const out = {};
      new Function("ACCESSORIES", "window", "answers", "seq", "out",
        `"use strict"; var currentLang = seq[0];
         ${SCORE_SRC} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${READ_SRC}
         out.r = seq.map(function(l){ currentLang = l; return readSleepSystemGroups(); });`)(
        ACCESSORIES, throwingWindow({}), { sleep_position: "side", temperature: "hot", sleep_issues: ["snoring"], health_conditions: [], budget: "mid" }, seq, out);
      return out.r;
    };
    const [en, es] = run(["en", "es"]);
    const [esFirst] = run(["es"]);
    const ids = (g) => JSON.stringify(["support", "adjustability", "pillow", "protection"].map((k) => g[k].map((a) => a.id)));
    const reasons = (g) => JSON.stringify(["support", "adjustability", "pillow", "protection"].map((k) => g[k].map((a) => a.reasons)));
    check("EN and ES reads yield identical ids in identical order (ranking is language-invariant)", ids(en) === ids(es));
    check("EN and ES reads yield DIFFERENT reason text (language reaches the read)", reasons(en) !== reasons(es));
    check("an ES-first read equals the ES read after EN (no first-render language freeze)", reasons(esFirst) === reasons(es));
  }
  // D: the accessor really invokes the scorer exactly once per read (a
  // throwing stub fires; a counting stub counts one) — it is a READ of the
  // engine, not a cache.
  {
    let calls = 0; let threw = null;
    try {
      new Function("ACCESSORIES", "window", "answers", "currentLang", "onScore",
        `"use strict"; function scoreAccessoriesFromAnswers() { onScore(); return []; }
         ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${READ_SRC}
         readSleepSystemGroups(); readSleepSystemGroups();`)(ACCESSORIES, throwingWindow({}), {}, "en", () => { calls++; });
    } catch (e) { threw = e; }
    check("each read invokes the engine scorer exactly once (two reads -> two calls; no cache)", !threw && calls === 2, threw && threw.message);
  }
}

section("contract / Sleep Plan screen shell");
const SCREEN_PRESENT = /\sid="sleepPlanScreen"/.test(html);
if (gate("sleepPlanScreen", SCREEN_PRESENT)) {
  check("sleepPlanScreen is a .screen container with role=region",
    /<div\b[^>]*\sclass="(?:[^"]*\s)?screen(?:\s[^"]*)?"[^>]*\sid="sleepPlanScreen"[^>]*\srole="region"/.test(html)
    || /<div\b[^>]*\sid="sleepPlanScreen"[^>]*\sclass="(?:[^"]*\s)?screen(?:\s[^"]*)?"[^>]*\srole="region"/.test(html));
  check("sleepPlanScreen is registered in SCREEN_NAME_KEYS", /sleepPlanScreen:\s*'screen\.sleep_plan'/.test(html));
  check("screen.sleep_plan is bilingual and translated",
    typeof dictEn["screen.sleep_plan"] === "string" && typeof dictEs["screen.sleep_plan"] === "string" && dictEn["screen.sleep_plan"] !== dictEs["screen.sleep_plan"]);
  check("sleepPlanScreen is registered in SCREEN_HEADING_IDS (render-then-showScreen shape)", /sleepPlanScreen:\s*'sleepPlanTitle'/.test(html));
  check("the Plan is wiped by name in resetSessionState (no typeof guard)",
    /window\._sleepPlanState = \{/.test(extractFunction("function resetSessionState(opts)") || ""));
  check("switchLanguage re-renders the Plan when it is active (a live classList.contains('active') branch, not dead text)",
    /var sleepPlanScreen = document\.getElementById\('sleepPlanScreen'\);\s*if \(sleepPlanScreen && sleepPlanScreen\.classList\.contains\('active'\)\) \{\s*renderSleepPlan\(\);/.test(
      extractFunction("async function switchLanguage(lang)") || extractFunction("function switchLanguage(lang)") || ""));
}

section("contract / renderSleepPlan() — executed against a DOM stub");
const RENDER_SRCS = [
  "function sleepPlanTrialFocusIsComplete(stored)", "function sleepPlanTierLabel(tier)",
  "function sleepPlanMattressById(id)", "function sleepPlanModelLine(m)",
  "function renderSleepPlanFinalist()", "function renderSleepPlanPriorities()",
  "function renderSleepPlanCompared()", "function renderSleepPlanSystem()", "function renderSleepPlan()",
  "window.showSleepPlan = function(origin)", "window.sleepPlanBack = function()",
  "window.sleepPlanContinue = function()", "window.sleepPlanChooseFinalist = function()",
  "window.sleepPlanReturnToBrief = function()",
].map((a) => extractFunction(a));
const FALLBACK_SRC = extractFunction("function finalistRecommendedFallback()");
if (gate("renderSleepPlan", RENDER_SRCS.every(Boolean) && !!FALLBACK_SRC && !!READ_SRC && !!RESOLVER_SRC)) {
  const PLAN_SRC = RENDER_SRCS.join("\n");
  // Source-level bans on the renderer (cheap, and they catch the obvious).
  check("the renderer never calls scoreAccessoriesFromAnswers() (source)", !/scoreAccessoriesFromAnswers\s*\(/.test(PLAN_SRC));
  check("the renderer never calls getSleepSystemViewModel() (source)", !/getSleepSystemViewModel\s*\(/.test(PLAN_SRC));
  check("the renderer never writes analytics (source)", !/analytics\s*\.\s*[A-Za-z_$][\w$]*\s*=/.test(PLAN_SRC) && !/analytics\.log\(/.test(PLAN_SRC));
  check("the renderer never reads tierData/topPick for the FINALIST (the engine read is the caller-owned fallback only)",
    !/tierData|topPick/.test(extractFunction("function renderSleepPlanFinalist()").replace(/finalistRecommendedFallback\(\)/g, "")) );
  check("the renderer never reaches the payment dimensions", !/payExplored|payPref|payOpen|PAY_NOT_NOW|payRecordExplored|reviewPaymentPath/.test(PLAN_SRC));
  check("the renderer resolves tier labels through the existing results.tier_* keys (no second tier authority)",
    /'results\.tier_' \+/.test(PLAN_SRC) && !/'Oro'|'Plata'|'Bronce'|'Gold'|'Silver'|'Bronze'/.test(PLAN_SRC));
  check("the renderer contains no inline bilingual literal", !/\{\s*en:\s*'/.test(PLAN_SRC));
  check("the completeness predicate inlined in the Plan is textually identical to the producer/consumer copies",
    (() => {
      // Indentation differs (the producer/consumer copies sit one level
      // deeper), so compare with whitespace collapsed — the PREDICATE must be
      // identical, not the column it starts in.
      const ws = (x) => x.replace(/\s+/g, " ").trim();
      const plan = ws((PLAN_SRC.match(/var entryOk = function\(item\) \{[\s\S]*?\};/) || [""])[0]);
      const hf2 = ws((norm.match(/var entryOk = function\(item\) \{[\s\S]*?\};/) || [""])[0]);
      return plan.length > 50 && plan === hf2;
    })());

  // Executable harness: DOM stub, throwing scorer by default, recorder for
  // analytics, throwingWindow for undeclared reads.
  function makePlanEnv({ savedPicks = [], favorite = "", compare = [], cart = {}, trialFocus = null, results = null, groups = null, lang = "en", scorer = "throw" } = {}) {
    const els = {}; const focusLog = []; const screens = [];
    const mk = (id, tag) => (els[id] = { id, tag, innerHTML: "", textContent: "", hidden: false, style: {}, attrs: {},
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      focus() { focusLog.push(id); }, scrollIntoView() {}, classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }, toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); } } });
    for (const id of ["sleepPlanBack", "sleepPlanEyebrow", "sleepPlanTitle", "sleepPlanContinue", "sleepPlanFinalistLabel", "sleepPlanFinalist",
      "sleepPlanPrioritiesLabel", "sleepPlanPriorities", "sleepPlanPrioritiesRecovery", "sleepPlanPrioritiesRecoveryText", "sleepPlanPrioritiesRecoveryBtn",
      "sleepPlanComparedLabel", "sleepPlanCompared", "sleepPlanSystemLabel", "sleepPlanSystem"]) mk(id);
    const doc = { getElementById: (id) => els[id] || null, querySelector: () => null, querySelectorAll: () => [] };
    const analytics = { trialFocus: trialFocus === null ? [
      { en: "P1", es: "P1e", why: { en: "w1", es: "w1e" }, test: { en: "t1", es: "t1e" } },
      { en: "P2", es: "P2e", why: { en: "w2", es: "w2e" }, test: { en: "t2", es: "t2e" } },
      { en: "P3", es: "P3e", why: { en: "w3", es: "w3e" }, test: { en: "t3", es: "t3e" } }] : trialFocus,
      recommendedAccessories: Object.freeze([]), topPick: null, log: () => { analytics._logged = (analytics._logged || 0) + 1; } };
    const win = throwingWindow({ _savedPicks: savedPicks, _favoriteMattressId: favorite, _compareSelected: compare, _accCart: cart,
      _drawerData: {}, _sleepPlanState: { prioritiesInvalid: false, origin: "" } });
    const HOSTILE_GROUPS = groups || {
      support: [], adjustability: [],
      pillow: [ { id: "p-A", score: 10, matched: false, meetsMatchThreshold: false, name: { en: "A", es: "Ae" } },
                { id: "p-B", score: 99, matched: true, meetsMatchThreshold: true, name: { en: "B", es: "Be" } },
                { id: "p-C", score: 55, matched: true, meetsMatchThreshold: false, name: { en: "C", es: "Ce" } } ],
      protection: [ { id: "x-Z", score: 1, matched: false, meetsMatchThreshold: false, name: { en: "Z", es: "Ze" } } ] };
    const scorerSrc = scorer === "throw"
      ? "function scoreAccessoriesFromAnswers() { throw new Error('PLAN_CALLED_SCORER'); }"
      : "function scoreAccessoriesFromAnswers() { return []; }";
    const out = { screens, focusLog, els, win, analytics };
    const dict = (k) => (lang === "es" ? "ES:" : "EN:") + k;
    try {
      new Function("document", "window", "analytics", "_resultsState", "currentLang", "t", "escapeHtml", "L", "sleepSystemText", "showScreen", "_renderResults", "showProfileScreen", "sessionTimeout", "out",
        `"use strict";
         ${scorerSrc}
         // The accessor is REPLACED by a fixture for the renderer tests: this
         // proves the renderer consumes whatever the engine hands it at exact
         // indices, and cannot reach the real scorer (which throws).
         function readSleepSystemGroups() { return ${JSON.stringify(HOSTILE_GROUPS)}; }
         ${RESOLVER_SRC}
         ${FALLBACK_SRC}
         // The payment moment is a separate financing surface exercised by
         // payment_choice_check §29; stubbed here so the Plan renderer's own
         // contract is tested in isolation from D4's module state.
         function renderSleepPlanFinancing() {}
         ${PLAN_SRC}
         out.api = { render: renderSleepPlan, show: window.showSleepPlan, back: window.sleepPlanBack, cont: window.sleepPlanContinue, choose: window.sleepPlanChooseFinalist, recover: window.sleepPlanReturnToBrief };`)(
        doc, win, analytics, results, lang, dict, (x) => String(x), (o) => (o && typeof o === "object" ? (o[lang] || o.en) : String(o)), (o) => (o && typeof o === "object" ? (o[lang] || o.en) : String(o)),
        (id) => { screens.push(id); out.titleAtShow = (out.titleAtShow || []).concat([els.sleepPlanTitle.textContent]); }, () => { out.rendered = (out.rendered || 0) + 1; }, () => { out.profile = (out.profile || 0) + 1; }, (fn) => fn(), out);
      out.err = null;
    } catch (e) { out.err = e; }
    return out;
  }
  const RESULTS = { tierData: { gold: [{ id: "g1", name: "Gold One", tier: "gold" }, { id: "g2", name: "Gold Two", tier: "gold" }], silver: [], bronze: [] } };
  const ids = (html, attr) => [...String(html).matchAll(new RegExp(attr + '="([^"]+)"', "g"))].map((m) => m[1]);

  // A6 — the renderer never reaches the scorer (a throwing stub must not fire).
  { const env = makePlanEnv({ results: RESULTS }); env.api.render();
    check("A6: renderSleepPlan() completes with a THROWING scorer installed (the renderer never reaches it, directly or indirectly)", !env.err, env.err && env.err.message); }

  // Accessory block: hostile snapshot consumed at EXACT indices, order, length.
  { const env = makePlanEnv({ results: RESULTS, cart: { "p-B": { reasons: [] } } }); env.api.render();
    const got = ids(env.els.sleepPlanSystem.innerHTML, "data-acc-id");
    const idx = ids(env.els.sleepPlanSystem.innerHTML, "data-acc-index");
    check("system block renders pillow THEN protection at exact indices and produced length — ['p-A','p-B','p-C','x-Z']", JSON.stringify(got) === JSON.stringify(["p-A", "p-B", "p-C", "x-Z"]));
    check("system block indices are 0..n-1 in DOM order (index fidelity, not just sequence)", JSON.stringify(idx) === JSON.stringify(["0", "1", "2", "3"]));
    check("hostile order is NOT re-sorted by score (index 0 is the LOWEST score)", got[0] === "p-A");
    check("matched=false / meetsMatchThreshold=false items are NOT filtered", got.includes("p-A") && got.includes("x-Z"));
    check("an ADDED item stays in its engine position and reads 'added' (overlay, never a filter)",
      got[1] === "p-B" && /data-acc-id="p-B"[\s\S]*?EN:plan\.added/.test(env.els.sleepPlanSystem.innerHTML));
    check("not-added items read 'not added'", (env.els.sleepPlanSystem.innerHTML.match(/EN:plan\.not_added/g) || []).length === 3); }
  { const env = makePlanEnv({ results: RESULTS, groups: { support: [], adjustability: [], pillow: [{ id: "p-A", name: { en: "A" } }], protection: [] } }); env.api.render();
    check("a SHORT engine output renders at its produced length (1) — no backfill, no cap", ids(env.els.sleepPlanSystem.innerHTML, "data-acc-id").length === 1); }
  { const env = makePlanEnv({ results: RESULTS, groups: { support: [], adjustability: [], pillow: [], protection: [] } }); env.api.render();
    check("an EMPTY engine output renders an empty block without throwing (accessories-unavailable path)", !env.err && env.els.sleepPlanSystem.innerHTML === ""); }

  // Finalist block: the three states, never a substitution.
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g2", name: "Gold Two", tier: "gold" }], favorite: "g2" }); env.api.render();
    check("chosen: label is finalist.chosen and the chosen mattress renders; no route-back control",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.chosen" && /Gold Two/.test(env.els.sleepPlanFinalist.innerHTML) && !/sleepPlanChooseFinalist/.test(env.els.sleepPlanFinalist.innerHTML)); }
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g2", name: "Gold Two", tier: "gold" }], favorite: "" }); env.api.render();
    check("saved picks with NO favorite: label is finalist.recommended, the ENGINE's Gold #1 (not saved[0]) renders, absence stated, route-back offered",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.recommended" && /Gold One/.test(env.els.sleepPlanFinalist.innerHTML)
      && !/Gold Two/.test(env.els.sleepPlanFinalist.innerHTML) && /EN:finalist\.none/.test(env.els.sleepPlanFinalist.innerHTML) && /sleepPlanChooseFinalist/.test(env.els.sleepPlanFinalist.innerHTML)); }
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g2", name: "Gold Two", tier: "gold" }], favorite: "g9" }); env.api.render();
    check("stale favorite ('g9' unsaved): recommended state, never a promotion of saved[0]",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.recommended" && !/Gold Two/.test(env.els.sleepPlanFinalist.innerHTML)); }
  { // PRODUCTION SHAPE: showResults() maps MATTRESSES[tier] entries with score/pct/
    // meetsMatchThreshold and NO `tier` property (the tier is the bucket key only).
    // The recommended starting point is read from that bucket, so its tier-and-
    // position line must still resolve to Gold · lead. (External review P2 at
    // eb7b124: the fallback returned the raw entry and the line rendered blank.)
    const PROD = { tierData: { gold: [{ id: "g1", name: "Gold One", score: 90, pct: 100, meetsMatchThreshold: true },
                                      { id: "g2", name: "Gold Two", score: 80, pct: 89, meetsMatchThreshold: true }], silver: [], bronze: [] } };
    const env = makePlanEnv({ results: PROD, savedPicks: [], favorite: "" }); env.api.render();
    const html = env.els.sleepPlanFinalist.innerHTML;
    check("recommended starting point from PRODUCTION-shaped tierData (no tier stamp) still renders Gold One",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.recommended" && /Gold One/.test(html));
    check("…and its model line carries the GOLD tier label (results.tier_gold), not a blank tier",
      /results\.tier_gold/.test(html) && !/results\.tier_(?![a-z])/.test(html));
    check("…and the lead position within Gold (results.match_lead)", /results\.match_lead/.test(html));
    check("the fallback does not mutate the engine's tierData entry (no tier stamped onto the shared object)",
      !("tier" in PROD.tierData.gold[0])); }
  { // NO-FINALIST HONESTY (owner ruling 2026-08-23, Slice 5 C10). The Plan's
    // priorities are the stored Sleep Brief prose; in the no-finalist state they
    // sit beside "Recommended starting point / No finalist selected yet", so the
    // real producer prose may not call the recommendation "the finalist". The
    // trialFocus used here is built from the REAL priority strings in the
    // producer source (every quoted argument of every addPriority(...) call),
    // not a hand-written fixture — so a regression in the source is what fails.
    const producer = (norm.match(/addPriority\(([\s\S]*?)\);/g) || []);
    const strings = producer.flatMap((call) => [...call.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]));
    check("the producer source exposes its priority strings (harness sanity)", producer.length >= 5 && strings.length >= 20);
    check("no producer priority string says 'the finalist' / 'el finalista' (source)",
      !strings.some((s) => /\bfinalist(a|as|s)?\b/i.test(s)), strings.filter((s) => /finalist/i.test(s)).join(" | "));
    const PROD2 = { tierData: { gold: [{ id: "g1", name: "Gold One", score: 90, pct: 100, meetsMatchThreshold: true }], silver: [], bronze: [] } };
    const realFocus = [{ en: "Comfortable elevation", es: "Elevación cómoda",
      why: { en: strings.find((s) => /raised upper body/i.test(s)) || "", es: strings.find((s) => /posición elevada/i.test(s)) || "" },
      test: { en: strings.find((s) => /^Try the .* flat, then with the head/i.test(s)) || "", es: strings.find((s) => /^Prueba el .* plano y luego/i.test(s)) || "" } }];
    check("the real 'Comfortable elevation' prose was located in the producer source", !!realFocus[0].test.en && !!realFocus[0].test.es && !!realFocus[0].why.en);
    for (const lang of ["en", "es"]) {
      const env = makePlanEnv({ results: PROD2, savedPicks: [], favorite: "", trialFocus: realFocus, lang }); env.api.render();
      const plain = (env.els.sleepPlanPriorities.innerHTML + " " + env.els.sleepPlanFinalist.innerHTML).replace(/(EN|ES):[a-z_.]+/g, "");
      check(`[${lang}] no-finalist Plan: the finalist block is the RECOMMENDED state (not a finalist)`,
        env.els.sleepPlanFinalistLabel.textContent === (lang === "es" ? "ES:" : "EN:") + "finalist.recommended");
      check(`[${lang}] no-finalist Plan: the rendered priority and finalist markup never calls the recommendation 'the finalist' (dictionary keys excluded)`,
        !/\bfinalist(a|as|s)?\b/i.test(plain), plain.slice(0, 200));
      check(`[${lang}] no-finalist Plan: the testing line says 'mattress' / 'colchón'`,
        lang === "es" ? /colchón plano/.test(env.els.sleepPlanPriorities.innerHTML) : /mattress flat/.test(env.els.sleepPlanPriorities.innerHTML));
    }
  }
  { const env = makePlanEnv({ results: { tierData: { gold: [], silver: [], bronze: [] } } }); env.api.render();
    check("no engine pick and no favorite: label is finalist.none, nothing rendered as a mattress, route-back offered",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.none" && !/hf2-pick__name/.test(env.els.sleepPlanFinalist.innerHTML) && /sleepPlanChooseFinalist/.test(env.els.sleepPlanFinalist.innerHTML)); }
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g2", name: "Gold Two", tier: "gold" }], favorite: "g2" });
    env.api.render(); env.win._favoriteMattressId = ""; env.api.render();
    check("the Plan RE-RESOLVES on every render (favorite cleared between renders -> recommended, not a cached Finalist ✓)",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.recommended"); }

  // Compared block: membership, equality + order, unresolvable ids omitted.
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g1", name: "Gold One", tier: "gold" }, { id: "g2", name: "Gold Two", tier: "gold" }], compare: ["g2", "g1"] }); env.api.render();
    check("compared block renders EXACTLY _compareSelected in its order (['g2','g1'])", JSON.stringify(ids(env.els.sleepPlanCompared.innerHTML, "data-compared-id")) === JSON.stringify(["g2", "g1"])); }
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g1", name: "Gold One", tier: "gold" }], compare: [] }); env.api.render();
    check("compared block with an empty selection renders the neutral empty line — NEVER the saved picks", /EN:plan\.compared_empty/.test(env.els.sleepPlanCompared.innerHTML) && !/Gold One/.test(env.els.sleepPlanCompared.innerHTML)); }
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g1", name: "Gold One", tier: "gold" }], compare: ["g1", "zzz", "", 42, null] }); env.api.render();
    check("unresolvable / blank / wrong-type compare ids are omitted; no raw token is rendered", JSON.stringify(ids(env.els.sleepPlanCompared.innerHTML, "data-compared-id")) === JSON.stringify(["g1"]) && !/zzz/.test(env.els.sleepPlanCompared.innerHTML)); }

  // Priorities: all-or-nothing, recovery, forward control withheld.
  { const env = makePlanEnv({ results: RESULTS }); env.api.render();
    check("valid priorities render 3 <li> in an <ol> and the forward control is available",
      (env.els.sleepPlanPriorities.innerHTML.match(/<li /g) || []).length === 3 && env.els.sleepPlanPrioritiesRecovery.hidden === true && env.els.sleepPlanContinue.hidden === false); }
  for (const badIndex of [0, 1, 2]) {
    const base = [ { en: "P1", es: "P1e", why: { en: "w1", es: "w1e" }, test: { en: "t1", es: "t1e" } },
      { en: "P2", es: "P2e", why: { en: "w2", es: "w2e" }, test: { en: "t2", es: "t2e" } },
      { en: "P3", es: "P3e", why: { en: "w3", es: "w3e" }, test: { en: "t3", es: "t3e" } } ];
    const broken = Object.assign({}, base[badIndex]); delete broken.test;
    const env = makePlanEnv({ results: RESULTS, trialFocus: base.map((x, i) => (i === badIndex ? broken : x)) }); env.api.render();
    check(`one malformed entry at index ${badIndex}: ZERO rows, recovery shown with the governed copy, forward control WITHHELD`,
      (env.els.sleepPlanPriorities.innerHTML.match(/<li /g) || []).length === 0 && env.els.sleepPlanPrioritiesRecovery.hidden === false
      && env.els.sleepPlanPrioritiesRecoveryText.textContent === "EN:plan.priorities_recovery" && env.els.sleepPlanContinue.hidden === true
      && env.win._sleepPlanState.prioritiesInvalid === true);
    env.api.cont();
    check(`...and sleepPlanContinue() is a no-op while priorities are invalid (index ${badIndex})`, env.screens.length === 0);
  }
  { const env = makePlanEnv({ results: RESULTS, trialFocus: [] }); env.api.render(); env.api.recover();
    check("the recovery action returns to the producer (showProfileScreen) and does NOT wipe, fetch, log, or touch _dataLoadFailed",
      env.profile === 1 && !env.analytics._logged && !/showDataError|_dataLoadFailed|resetSessionState|fetch\(/.test(extractFunction("window.sleepPlanReturnToBrief = function()"))); }

  // Routes + focus shape.
  { const env = makePlanEnv({ results: RESULTS }); env.api.show("results");
    check("showSleepPlan renders THEN shows (the heading is ALREADY populated at the moment showScreen is called)",
      env.screens[0] === "sleepPlanScreen" && env.titleAtShow && env.titleAtShow[0] === "EN:plan.title");
    env.api.back(); check("Back returns to Results", env.screens[1] === "resultsScreen" && env.rendered === 1); }
  { const env = makePlanEnv({ results: null }); env.api.show("results"); check("showSleepPlan is a no-op before Results exist", env.screens.length === 0); }
  { const env = makePlanEnv({ results: RESULTS }); env.api.choose();
    check("'Choose a finalist' routes BACK to Results (never to hf2) and re-renders it", env.screens[0] === "resultsScreen" && env.rendered === 1); }
  { const env = makePlanEnv({ results: RESULTS, lang: "es" }); env.api.render();
    check("ES render resolves every label through the dictionary in ES", env.els.sleepPlanTitle.textContent === "ES:plan.title" && env.els.sleepPlanSystemLabel.textContent === "ES:plan.system_label"); }

  // Route ledger pins (per call site; the chokepoint body is untouched).
  check("the showSavedPicks() chokepoint body is UNCHANGED (renderHf2(); showScreen('hf2Screen');)",
    /window\.showSavedPicks = function\(\) \{\s*renderHf2\(\);\s*showScreen\('hf2Screen'\);\s*\};/.test(norm));
  check("email 'Back to handoff' still targets showSavedPicks() (never the Plan)", /id="emailConfirmBackHandoff" onclick="window\.showSavedPicks\(\)"/.test(norm));
  check("the floating Selections pill still targets showSavedPicks() (R-5)", /id="savedPicksBtn"\s+onclick="window\.showSavedPicks\(\)"/.test(norm));
  check("the Sleep System review-plan branch and the last-step terminal both route to the Plan", (norm.match(/window\.showSleepPlan\('sleep-system'\)/g) || []).length === 2);
  check("the Results 'Review with customer' CTA routes to the Plan", /id="reviewWithCustomerBtn" onclick="window\.showSleepPlan\('results'\)"/.test(norm));
  check("hf2Screen's spoken name is now distinct from the Plan's", dictEn["screen.handoff"] !== dictEn["screen.sleep_plan"] && dictEs["screen.handoff"] !== dictEs["screen.sleep_plan"]);
  check("the governed recovery strings are exact EN", dictEn["plan.priorities_recovery"] === "We couldn't prepare the trial priorities. Return to the Sleep Brief and try again." && dictEn["plan.priorities_recovery_action"] === "Return to Sleep Brief");
  check("the Plan's generated containers are in the content/text wipe inventories",
    ["sleepPlanFinalist", "sleepPlanPriorities", "sleepPlanCompared", "sleepPlanSystem", "sleepPlanFinancingInterest"].every((id) => new RegExp(`'${id}'`).test((norm.match(/var SESSION_CONTENT_IDS = \[[\s\S]*?\];/) || [""])[0]))
    && /'sleepPlanFinancingStatus', 'sleepPlanPrioritiesRecoveryText'/.test(norm));
}

console.log(`\nSleep Plan check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
