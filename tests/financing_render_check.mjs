// Financing sheet RENDER check — executes the real renderFinancingSheet()
// and the real Payment Choice path derivation it draws from.
//
// Every other financing gate (exactPromotionsEnabled, financingTermsFresh,
// financingPlanFresh, financingAgeOk, financingSourceAllowed) is proven
// behaviourally elsewhere. But a gate only matters if the RENDERER consults
// it, and until this suite existed nothing executed the one component that
// turns a gate decision into pixels: the .mjs suites asserted on index.html as
// TEXT, so they pinned the gates by NAME, not by VALUE.
//
// That gap was measured, not assumed. Mutating either per-card freshness test
// to a literal `true`:
//     var ihFresh = fresh && financingPlanFresh(ih);   ->  var ihFresh = true;
//     var mxFresh = fresh && financingPlanFresh(mx);   ->  var mxFresh = true;
// leaked exact terms in the SHIPPED state and survived all eleven suites.
//
// This suite extracts renderFinancingSheet() and its dependencies from
// index.html, compiles them with `new Function` over a recording DOM stub, and
// asserts on the HTML actually produced — in both languages, across the
// operating states that matter. The extraction pattern is the one
// exact_promotions_policy_check.mjs already uses.
//
// SLICE 4 (D4 Payment Choice). The salesperson-marked "discussion agenda"
// (finAgendaKey / finAgendaItems / finAgendaSelected / finAgendaControl) is
// retired. Every property this suite proved about the agenda renderer is
// carried over to its replacement:
//
//   finAgendaKey()      -> finPathEncode() + finPathId()  (canonical, injective)
//   finAgendaItems()    -> finPaymentPaths()              (same partition)
//   finAgendaControl()  -> finPathBlock()                 (disclosure + Consider)
//   finAgendaSelected() -> payPref / finPathById()
//
// SCOPE. This is the RENDERER + taxonomy suite: what the sheet emits, which
// paths exist, how they are identified, and what the freshness gates suppress.
// The Payment Choice STATE MACHINE — transitions, focus restoration, live
// regions, session wipe, email exclusion, forced colors — belongs to
// tests/payment_choice_check.mjs and is deliberately not duplicated here.
//
// Run: node tests/financing_render_check.mjs     (exit 0 = all pass)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const shipped = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " - " + detail : ""}`); }
  return cond;
}
function extract(re, name) {
  const m = html.match(re);
  if (!m) { failed++; console.log(`  [FAIL] could not extract ${name}`); return ""; }
  return m[0];
}

// --- the real source, lifted verbatim ---------------------------------------
// index.html uses CRLF; `\n    \}` still terminates on the "\r\n    }" that
// closes a top-level function in the script block, so the multi-line matcher
// below needs no line-ending special case. One-liners get their own pattern
// because they have no such terminator.
const fn = (n) => new RegExp(`function ${n}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n    \\}`);
const SRC = [
  ["escapeHtml", extract(/function escapeHtml\(str\)\s*\{[\s\S]*?\n    \}/, "escapeHtml")],
  ["finEsc", extract(/function finEsc\(s\)\s*\{[^\n]*\n/, "finEsc")],
  // L() and FC() are lifted from index.html rather than re-implemented in the
  // harness. Both are pure over (currentLang, config) and both are on the path
  // every rendered string travels, so a change to either — say L() gaining a
  // fallback, or FC() resolving a missing key to the key name — has to show up
  // in this suite's output rather than be masked by a stub that agrees with
  // yesterday's semantics.
  ["L", extract(fn("L"), "L")],
  ["FC", extract(fn("FC"), "FC")],
  ["FIN_SCENARIO_MEXICO", extract(/var FIN_SCENARIO_MEXICO = [^\n]*/, "FIN_SCENARIO_MEXICO")],
  ["FIN_EVERGREEN_KINDS", extract(/var FIN_EVERGREEN_KINDS = [^\n]*/, "FIN_EVERGREEN_KINDS")],
  ["FINANCING_CLOCK_SKEW_MS", extract(/var FINANCING_CLOCK_SKEW_MS = [^\n]*/, "skew")],
  ["finPlanScenario", extract(fn("finPlanScenario"), "finPlanScenario")],
  ["finPlanGroup", extract(fn("finPlanGroup"), "finPlanGroup")],
  ["finGroupedPlans", extract(fn("finGroupedPlans"), "finGroupedPlans")],
  ["finSafeProvider", extract(fn("finSafeProvider"), "finSafeProvider")],
  ["finPromotionalByProvider", extract(fn("finPromotionalByProvider"), "finPromotionalByProvider")],
  // ---- D4 path identity + partition (replaces the agenda helpers) ----
  ["finPathEncode", extract(fn("finPathEncode"), "finPathEncode")],
  ["finPathId", extract(fn("finPathId"), "finPathId")],
  ["finPathDom", extract(/function finPathDom\([^)]*\)[^\n]*\n/, "finPathDom")],
  ["finPaymentPaths", extract(fn("finPaymentPaths"), "finPaymentPaths")],
  ["finPathById", extract(fn("finPathById"), "finPathById")],
  ["finPathBlock", extract(fn("finPathBlock"), "finPathBlock")],
  // ---- the gates ----
  ["financingSourceAllowed", extract(fn("financingSourceAllowed"), "financingSourceAllowed")],
  ["financingAgeOk", extract(fn("financingAgeOk"), "financingAgeOk")],
  ["financingTermsFresh", extract(fn("financingTermsFresh"), "financingTermsFresh")],
  ["financingPlanFresh", extract(fn("financingPlanFresh"), "financingPlanFresh")],
  ["setAllowedFinancingLink", extract(fn("setAllowedFinancingLink"), "setAllowedFinancingLink")],
  ["updateFinancingSheetStatus", extract(fn("updateFinancingSheetStatus"), "updateFinancingSheetStatus")],
  ["renderFinancingSheet", extract(fn("renderFinancingSheet"), "renderFinancingSheet")],
];
for (const [name, src] of SRC) check(`extracted ${name}()`, src.length > 0);

// --- harness ----------------------------------------------------------------
// A recording DOM: every element remembers what was written to it, so the
// assertions read the HTML the renderer actually produced rather than the
// source that produced it. storeName() is supplied rather than extracted — it
// reads STORE_CONFIG, which is store identity rather than anything this suite
// tests.
//
// el(id) returns null for an id the renderer never touched, ON PURPOSE. The
// agenda-era version of this file created an element on demand, so its
// "card title carries no rate marker" section read #financingSheetInHouse and
// #financingSheetMexico — two ids that do not exist anywhere in index.html —
// found empty strings, and passed `[].every(...)` vacuously in all four
// state/language combinations. A phantom element is a silently green test.
//
// The three D4 state variables are harness-writable so the renderer can be
// exercised in the collapsed, expanded and preferred states without importing
// the state machine (payment_choice_check.mjs owns the transitions).
const harness = new Function("SRC_LIST", `
  var __cfg = null, currentLang = 'en';
  var payExplored = [], payPref = null, payOpen = {};
  var PAY_NOT_NOW = 'not_now';
  var console = { warn: function () {}, log: function () {} };
  var _finSheetStale = false;
  function getFinancingConfig() { return __cfg; }
  function storeName() { return 'Lacks Furniture'; }
  var __els = {};
  function __el(id) {
    if (!__els[id]) __els[id] = {
      id: id, _html: '', _text: '', hidden: false, _attrs: {},
      get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); },
      get textContent() { return this._text; }, set textContent(v) { this._text = String(v); },
      setAttribute: function (k, v) { this._attrs[k] = String(v); },
      removeAttribute: function (k) { delete this._attrs[k]; },
      getAttribute: function (k) { return k in this._attrs ? this._attrs[k] : null; },
      set href(v) { this._attrs.href = String(v); },
      get href() { return this._attrs.href || ''; },
      classList: { add: function () {}, remove: function () {}, contains: function () { return false; } }
    };
    return __els[id];
  }
  var document = { getElementById: __el };
  ${SRC.map(([, s]) => s).join("\n")}
  function __setState(cfg, lang, state) {
    __cfg = cfg;
    currentLang = lang || 'en';
    state = state || {};
    payOpen = state.open || {};
    payPref = ('pref' in state) ? state.pref : null;
    payExplored = state.explored || [];
    __els = {};
  }
  return {
    // set() without render(), for exercising the helpers directly.
    set: __setState,
    run: function (cfg, lang, state) {
      __setState(cfg, lang, state);
      renderFinancingSheet();
      var out = '';
      for (var k in __els) out += __els[k]._html + ' ' + __els[k]._text + ' ';
      return {
        dom: out,
        el: function (id) {
          return Object.prototype.hasOwnProperty.call(__els, id) ? __els[id] : null;
        }
      };
    },
    api: {
      finPathEncode: finPathEncode, finPathId: finPathId, finPathDom: finPathDom,
      finPaymentPaths: finPaymentPaths, finPathById: finPathById,
      finPathBlock: finPathBlock, finGroupedPlans: finGroupedPlans,
      finPlanGroup: finPlanGroup, finSafeProvider: finSafeProvider,
      finPromotionalByProvider: finPromotionalByProvider,
      financingSourceAllowed: financingSourceAllowed,
      financingPlanFresh: financingPlanFresh, financingTermsFresh: financingTermsFresh,
      FC: FC, L: L
    }
  };`)(SRC);

// --- fixtures ---------------------------------------------------------------
const clone = (o) => JSON.parse(JSON.stringify(o));
const RATE = /\d+(\.\d+)?\s*%|\bAPR\b|\b\d+\s*(months?|meses|mes)\b/i;

// EVERY freshness-gated string, DERIVED from the config rather than listed.
// Deriving is the point: an earlier draft of this suite hardcoded only the two
// promotional headlines, and therefore could not see the leak that forcing
// ihFresh/mxFresh true produces — those gate the in-house `detail` and the
// Mexico `detail`/`representativeExample`, which are exact terms too. The
// suite passed while the mutation it existed to kill survived.
// Per-group gated fields mirror _GROUP_UNGATED_FIELDS in tools/validation.py:
//   promotional -> headline, detail, disclosure  (all gated)
//   installment -> detail                        (title/disclosure ungated)
//   scenario    -> detail, representativeExample (title/disclosure ungated)
//   evergreen   -> nothing gated
const GATED_FIELDS = {
  promotional: ["headline", "detail", "disclosure"],
  installment: ["detail"],
  scenario: ["detail", "representativeExample"],
  evergreen: []
};
function groupOf(p) {
  if (!p) return "";
  if (typeof p.presentationScenario === "string" && p.presentationScenario)
    return p.presentationScenario === "mexico-delivery" ? "scenario" : "";
  if (p.kind === "open-end-promotional-credit") return "promotional";
  if (p.kind === "closed-end-installment") return "installment";
  if (["lease-to-own", "credit-builder", "informational"].includes(p.kind)) return "evergreen";
  return "";
}
// The renderer writes every plan string through finEsc/escapeHtml, so the DOM
// holds the ESCAPED form. Searching for the raw config text would silently
// fail to match any string containing an apostrophe, ampersand or angle
// bracket — which would weaken the SUPPRESSION assertions into vacuity: a
// gated string like "Lacks' published example: $999 ..." could leak and go
// unnoticed. Compare against what the renderer actually emits.
const escLike = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function gatedStrings(cfg, lang) {
  const out = [];
  for (const p of cfg.plans || []) {
    for (const f of GATED_FIELDS[groupOf(p)] || []) {
      const v = p[f];
      if (v && typeof v === "object" && v[lang]) {
        out.push({ id: p.id, group: groupOf(p), field: f, text: escLike(v[lang]) });
      }
    }
  }
  return out;
}

function freshCfg() {
  const c = clone(shipped.financing);
  c.exactPromotionsEnabled = true;
  const now = new Date(Date.now() - 60000).toISOString();
  c.verifiedAt = now;
  (c.plans || []).forEach(p => { if (p.verifiedAt) p.verifiedAt = now; });
  return c;
}

// The markup vocabulary the sheet emits, in one place so a class rename shows
// up as a wall of failures rather than a wall of silent zero-length matches.
const CARD_RE = /<article class="fin-card[^"]*">/g;
const TITLE_RE = /<h3 class="fin-card__title">([\s\S]*?)<\/h3>/g;
const REVIEW_RE = /class="fin-btn fin-btn-ghost fin-path-review"/g;
const CONSIDER_RE = /class="fin-btn fin-btn-secondary fin-path-consider"/g;
const CLEAR_RE = /class="fin-btn fin-btn-ghost fin-path-clear"/g;
const MARKER_RE = /<span class="fin-path-marker" id="([^"]*)">([\s\S]*?)<\/span>/;
const countOf = (s, re) => (s.match(re) || []).length;
const cardsOf = (r) => { const el = r.el("financingSheetCards"); return el ? el._html : ""; };
// Used where "does not throw" is itself the property under test, so a defect
// that crashes the renderer is REPORTED as a failure and the remaining two
// hundred assertions still run. Everywhere else the renderer is called
// directly: an exception there is not a result worth continuing past.
function tryRun(cfg, lang, state) {
  try { return harness.run(cfg, lang, state); }
  catch (e) { return { dom: "", el: () => null, error: e }; }
}
// A path's member plans, read defensively. A derivation defect can hand back a
// path with no `plans` array at all (mutation_sweep's "promotional paths stop
// grouping by provider" does exactly that), and a bare `.plans.length` would
// abort the run on the first such path instead of reporting it and continuing.
// planCount() returns -1 for a malformed path, so every `=== n` comparison
// against it fails rather than throwing.
const planCount = (path) =>
  path && Array.isArray(path.plans) ? path.plans.length : -1;
const planIdsOf = (path) =>
  (path && Array.isArray(path.plans) ? path.plans : []).map(p => p && p.id).join(",");
const titlesOf = (cards) =>
  (cards.match(TITLE_RE) || []).map(t => t.replace(/<[^>]*>/g, ""));
// One card's markup, located by the review control's derived DOM id rather
// than by position, so reordering the cards cannot silently retarget an
// assertion at a different path.
function blockFor(cards, pathId) {
  const needle = `id="finPathReview-${pathId}"`;
  return cards.split("<article ").filter(s => s.includes(needle))[0] || "";
}

// --- 1. SHIPPED STATE: no freshness-gated string reaches the DOM ------------
console.log("Shipped state (exactPromotionsEnabled=false) - every gated string suppressed:");
for (const lang of ["en", "es"]) {
  const cfg = clone(shipped.financing);
  const r = harness.run(cfg, lang);
  const dom = r.dom;
  check(`[${lang}] renderer produced output`, dom.trim().length > 0);
  const gated = gatedStrings(cfg, lang);
  check(`[${lang}] derived a non-trivial gated-string set`, gated.length >= 6,
    `got ${gated.length}`);
  for (const g of gated) {
    check(`[${lang}] gated ${g.id}.${g.field} absent from rendered DOM`,
      !dom.includes(g.text), JSON.stringify(g.text.slice(0, 44)));
  }
  check(`[${lang}] generic guidance rendered instead`,
    /Current payment options are available|opciones de pago actuales/.test(dom));
  const cards = cardsOf(r);
  check(`[${lang}] #financingSheetCards was actually written`, cards.length > 0);
  check(`[${lang}] one card per semantic path`, countOf(cards, CARD_RE) === 5,
    `got ${countOf(cards, CARD_RE)}`);
  check(`[${lang}] one Review disclosure per semantic path`,
    countOf(cards, REVIEW_RE) === 5, `got ${countOf(cards, REVIEW_RE)}`);
  check(`[${lang}] one Consider control per semantic path (none preferred yet)`,
    countOf(cards, CONSIDER_RE) === 5, `got ${countOf(cards, CONSIDER_RE)}`);
  const titles = titlesOf(cards);
  check(`[${lang}] lease-to-own and credit-building are separate cards`,
    !/More paths|Más caminos/.test(dom) && new Set(titles).size === 5,
    titles.join(" | "));
}

// --- 2. GATE ON + FRESH: they DO render (proves the checks above can see) ---
console.log("Gate enabled with fresh evidence (non-vacuity):");
for (const lang of ["en", "es"]) {
  const cfg = freshCfg();
  const { dom } = harness.run(cfg, lang);
  for (const g of gatedStrings(cfg, lang)) {
    check(`[${lang}] gated ${g.id}.${g.field} IS rendered when authorized+fresh`,
      dom.includes(g.text), JSON.stringify(g.text.slice(0, 44)));
  }
}

// --- 3. Each gate independently suppresses EVERY gated string ---------------
console.log("Each gate independently suppresses every gated string:");
const cases = {
  "exactPromotionsEnabled=false": (c) => { c.exactPromotionsEnabled = false; },
  "stale verifiedAt": (c) => { c.verifiedAt = "2020-01-01T00:00:00-05:00"; },
  "future verifiedAt": (c) => { c.verifiedAt = "2099-01-01T00:00:00-05:00"; },
  "non-allowlisted sourceUrl": (c) => { c.sourceUrl = "https://evil.example.com/x"; },
  "http sourceUrl": (c) => { c.sourceUrl = "http://www.lacks.com/financing"; },
  "maxAgeDays missing": (c) => { delete c.maxAgeDays; },
  "every plan verifiedAt stale": (c) => { (c.plans || []).forEach(p => { if (p.verifiedAt) p.verifiedAt = "2020-01-01T00:00:00-05:00"; }); },
  "every plan verified=false": (c) => { (c.plans || []).forEach(p => { if ("verified" in p) p.verified = false; }); },
  "plan sourceUrl not allowlisted": (c) => { (c.plans || []).forEach(p => { if (p.sourceUrl) p.sourceUrl = "https://evil.example.com/x"; }); },
  "allowedSourceHosts empty": (c) => { c.allowedSourceHosts = []; }
};
for (const [name, mutate] of Object.entries(cases)) {
  for (const lang of ["en", "es"]) {
    const c = freshCfg(); mutate(c);
    const { dom } = harness.run(c, lang);
    const leaked = gatedStrings(c, lang).filter(g => dom.includes(g.text));
    check(`[${lang}] ${name} -> nothing gated rendered`,
      leaked.length === 0, leaked.map(g => `${g.id}.${g.field}`).join(", "));
  }
}

// --- 3b. PER-PLAN staleness is isolated (the .every contract) ---------------
// Within a provider card, ONE stale plan must blank the whole card rather than
// render a mix of verified and unverified rate claims under one lender name.
console.log("Per-plan staleness is isolated:");
for (const lang of ["en", "es"]) {
  const c = freshCfg();
  const promos = (c.plans || []).filter(p => groupOf(p) === "promotional");
  check(`[${lang}] fixture has >=2 promotional plans to mix`, promos.length >= 2);
  promos[0].verifiedAt = "2020-01-01T00:00:00-05:00";
  const { dom } = harness.run(c, lang);
  const leaked = gatedStrings(c, lang)
    .filter(g => g.group === "promotional" && dom.includes(g.text));
  check(`[${lang}] one stale promo blanks its entire provider card`,
    leaked.length === 0, leaked.map(g => `${g.id}.${g.field}`).join(", "));
}
console.log("Installment and scenario cards gate independently:");
for (const lang of ["en", "es"]) {
  const c = freshCfg();
  const inh = (c.plans || []).find(p => groupOf(p) === "installment");
  const mx = (c.plans || []).find(p => groupOf(p) === "scenario");
  if (inh) inh.verifiedAt = "2020-01-01T00:00:00-05:00";
  const { dom } = harness.run(c, lang);
  check(`[${lang}] stale installment plan suppresses its own detail`,
    !inh || !gatedStrings(c, lang).some(g => g.id === inh.id && dom.includes(g.text)));
  check(`[${lang}] a still-fresh scenario plan is not over-suppressed`,
    !mx || gatedStrings(c, lang).some(g => g.id === mx.id && dom.includes(g.text)));
}

// --- 4. Ungated surfaces never carry a rate, in any state -------------------
// Card TITLES render in every operating state — freshness gates the offer
// bodies inside the disclosure, not the heading that names the path — so a
// rate in a title is a claim no gate can withdraw.
console.log("Ungated card titles stay rate-free (and the rate detector is live):");
check("the rate detector fires on a planted counter-example",
  RATE.test("0% APR for 48 months") && RATE.test("por 72 meses") && !RATE.test("Lease-to-own"));
check("the recording DOM returns null for an element the renderer never touched",
  harness.run(clone(shipped.financing), "en").el("financingSheetNoSuchId") === null);
for (const state of ["shipped", "fresh"]) {
  for (const lang of ["en", "es"]) {
    const cfg = state === "shipped" ? clone(shipped.financing) : freshCfg();
    const r = harness.run(cfg, lang);
    const cards = cardsOf(r);
    const titles = titlesOf(cards);
    check(`[${state}/${lang}] every card title was captured (non-vacuous)`,
      titles.length === 5, `got ${titles.length}`);
    check(`[${state}/${lang}] no card title carries a rate marker`,
      titles.length > 0 && titles.every(t => !RATE.test(t)),
      titles.filter(t => RATE.test(t)).join(" | "));
  }
}
// The counterpart: exact rates DO reach the offer bodies when authorized and
// fresh, so "no rate in a title" is a placement result, not a config with no
// rates in it at all.
for (const lang of ["en", "es"]) {
  const cards = cardsOf(harness.run(freshCfg(), lang));
  const offers = (cards.match(/<h4 class="fin-offer__headline">([\s\S]*?)<\/h4>/g) || [])
    .map(t => t.replace(/<[^>]*>/g, ""));
  check(`[${lang}] fresh offer headlines DO carry rates (placement, not absence)`,
    offers.length >= 2 && offers.every(t => RATE.test(t)), offers.join(" | "));
}

// --- 5. The official link is inert when the URL fails validation ------------
console.log("Official-page link fails closed:");
{
  const c = freshCfg(); c.sourceUrl = "https://evil.example.com/financing";
  const { el } = harness.run(c, "en");
  const a = el("financingSheetLink");
  check("unsafe sourceUrl leaves the anchor with no href",
    !a || !a.getAttribute("href"), a ? String(a.getAttribute("href")) : "");
  check("unsafe sourceUrl also clears the external-site note",
    !el("financingSheetExternal") || el("financingSheetExternal")._text === "");
  const c2 = freshCfg();
  const r2 = harness.run(c2, "en");
  check("allowlisted sourceUrl sets a real href",
    r2.el("financingSheetLink") &&
    r2.el("financingSheetLink").getAttribute("href") === c2.sourceUrl);
  check("allowlisted sourceUrl restores the external-site note",
    r2.el("financingSheetExternal") && r2.el("financingSheetExternal")._text.length > 0);
}

// --- 6. The path partition: one path per provider, per plan, per scenario ---
// finPaymentPaths() replaces finAgendaItems(). The property that mattered then
// still matters now, and matters MORE: an agenda entry was one of several
// independent marks, but a path id is what the customer's single preference is
// keyed on. Two payment paths sharing one identity means the Consider lands on
// a path the customer did not choose.
console.log("Payment path partition:");
{
  harness.set(clone(shipped.financing), "en");
  const paths = harness.api.finPaymentPaths();
  check("shipped config derives exactly five paths", paths.length === 5,
    paths.map(p => p.id).join(", "));
  check("group sequence is promotional -> installment -> evergreen -> scenario",
    paths.map(p => p.group).join(",") ===
      "promotional,installment,evergreen,evergreen,scenario-mexico",
    paths.map(p => p.group).join(","));
  check("the two promotional offers collapse into ONE provider path",
    paths.filter(p => p.group === "promotional").length === 1 &&
    planCount(paths[0]) === 2);
  check("each installment plan is its own path",
    paths.filter(p => p.group === "installment")
         .every(p => planCount(p) === 1));
  check("each evergreen plan is its own path",
    paths.filter(p => p.group === "evergreen").length === 2 &&
    paths.filter(p => p.group === "evergreen").every(p => planCount(p) === 1));
  check("the Mexico scenario gets exactly one path",
    paths.filter(p => p.group === "scenario-mexico").length === 1);
  check("path ids are derived, not positional",
    paths.map(p => p.id).join(",") ===
      "promo-Synchrony,plan-lacks-in-house,plan-lease-to-own,plan-build-my-credit,scenario-mexico-delivery",
    paths.map(p => p.id).join(","));
}
{
  // Provider grouping preserves FIRST-APPEARANCE order, and repeats fold into
  // the group they opened rather than starting a new one further down.
  const c = freshCfg();
  const promo = c.plans.filter(p => groupOf(p) === "promotional");
  const tpl = promo[0];
  c.plans = [
    Object.assign(clone(tpl), { id: "z1", provider: "Zeta" }),
    Object.assign(clone(tpl), { id: "a1", provider: "Alpha" }),
    Object.assign(clone(tpl), { id: "z2", provider: "Zeta" }),
    Object.assign(clone(tpl), { id: "b1", provider: "Beta" })
  ];
  harness.set(c, "en");
  const paths = harness.api.finPaymentPaths();
  check("repeated providers fold into one path each",
    paths.length === 3, paths.map(p => p.id).join(", "));
  check("provider paths follow first appearance in config",
    paths.map(p => p.id).join(",") === "promo-Zeta,promo-Alpha,promo-Beta",
    paths.map(p => p.id).join(","));
  check("the repeat joins its own group rather than opening a new one",
    planIdsOf(paths[0]) === "z1,z2", planIdsOf(paths[0]));
  const cards = cardsOf(harness.run(c, "en"));
  check("the rendered cards match the derived paths one-for-one",
    countOf(cards, CARD_RE) === 3 && countOf(cards, REVIEW_RE) === 3);
  check("card titles carry each provider exactly once",
    titlesOf(cards).join(",") ===
      "Zeta promotional financing,Alpha promotional financing,Beta promotional financing",
    titlesOf(cards).join(","));
}
{
  // The null-prototype provider index. A plain {} reports "constructor",
  // "toString" and "__proto__" as already present (inherited), hands back an
  // inherited Function where an array index was expected, and throws on
  // .plans.push — so these four names are the whole point of Object.create(null)
  // in finPromotionalByProvider().
  const HOSTILE = ["constructor", "__proto__", "toString", "valueOf"];
  const c = freshCfg();
  const tpl = c.plans.filter(p => groupOf(p) === "promotional")[0];
  c.plans = HOSTILE.map((name, i) =>
    Object.assign(clone(tpl), { id: "h" + i, provider: name }));
  harness.set(c, "en");
  let paths = null, thrown = null;
  try { paths = harness.api.finPaymentPaths(); } catch (e) { thrown = e.message; }
  check("prototype-named providers do not throw the path derivation",
    thrown === null, String(thrown));
  check("each prototype-named provider gets its own path",
    !!paths && paths.length === 4, paths ? paths.map(p => p.id).join(", ") : "");
  check("each prototype-named provider path holds exactly its own plan",
    !!paths && paths.every((p, i) => planIdsOf(p) === "h" + i));
  check("prototype-named provider ids stay distinct",
    !!paths && new Set(paths.map(p => p.id)).size === 4);
  // And the ids themselves can never collide with an Object.prototype key,
  // because the mandatory kind prefix means no id is a bare property name.
  const protoKeys = Object.getOwnPropertyNames(Object.prototype);
  check("no derived path id is an Object.prototype key",
    !!paths && paths.every(p => !protoKeys.includes(p.id)));
  check("that guard is non-vacuous (the raw provider values ARE such keys)",
    HOSTILE.filter(n => protoKeys.includes(n)).length >= 3);
  const r = tryRun(c, "en");
  check("the sheet renders at all with prototype-named providers", !r.error,
    r.error ? r.error.message : "");
  const cards = cardsOf(r);
  check("all four prototype-named providers render as separate cards",
    countOf(cards, CARD_RE) === 4 && countOf(cards, REVIEW_RE) === 4);
}

// --- 7. A missing/blank/non-string provider degrades, never coerces ---------
// finSafeProvider() is deliberately NOT String()-coerced: the failure mode it
// prevents is a card titled "42 promotional financing" or
// "[object Object] promotional financing", and the milder one is the leading
// space in " promotional financing".
console.log("Provider degradation (no coercion, no orphan space):");
{
  const BAD = [undefined, "", "   ", 42, true, null, {}, ["Synchrony"], 0, false];
  harness.set(clone(shipped.financing), "en");
  for (const v of BAD) {
    check(`finSafeProvider(${JSON.stringify(v) ?? "undefined"}) -> ''`,
      harness.api.finSafeProvider({ provider: v }) === "");
  }
  check("finSafeProvider trims a real provider rather than dropping it",
    harness.api.finSafeProvider({ provider: "  Synchrony  " }) === "Synchrony");
  check("finSafeProvider on a missing plan is total", harness.api.finSafeProvider() === "");

  const c = freshCfg();
  const tpl = c.plans.filter(p => groupOf(p) === "promotional")[0];
  c.plans = BAD.map((v, i) => {
    const p = Object.assign(clone(tpl), { id: "bad" + i });
    if (v === undefined) delete p.provider; else p.provider = v;
    return p;
  });
  harness.set(c, "en");
  const paths = harness.api.finPaymentPaths();
  check("every unusable provider lands in ONE generic group",
    paths.length === 1 && planCount(paths[0]) === BAD.length,
    paths.map(p => p.id).join(", "));
  check("the generic promotional path id is stable",
    paths[0].id === "promo-", paths[0].id);
  check("[en] the generic label carries no provider fragment",
    paths[0].label === "Promotional financing", paths[0].label);
  harness.set(c, "es");
  check("[es] the generic label carries no provider fragment",
    harness.api.finPaymentPaths()[0].label === "Financiamiento promocional");

  const en = cardsOf(harness.run(c, "en"));
  check("[en] no ' promotional financing' with an orphaned leading space",
    !en.includes(" promotional financing"), en.slice(0, 0));
  check("[en] that check is non-vacuous (a real provider DOES produce it)",
    cardsOf(harness.run(clone(shipped.financing), "en")).includes(" promotional financing"));
  for (const coerced of ["42 promotional", "true promotional", "[object Object]",
                         "Synchrony promotional", "0 promotional", "false promotional"]) {
    check(`[en] no coerced provider "${coerced}..." in the DOM`, !en.includes(coerced));
  }
  const es = cardsOf(harness.run(c, "es"));
  check("[es] 'Financiamiento promocional' is never followed by a provider fragment",
    !/Financiamiento promocional [^<]/.test(es));
  check("[es] that check is non-vacuous (a real provider DOES produce it)",
    /Financiamiento promocional [^<]/.test(cardsOf(harness.run(clone(shipped.financing), "es"))));
}

// --- 8. Totality over malformed configuration -------------------------------
// The renderer runs on data that reached the device; if it throws, the sheet is
// blank and the customer sees nothing at all. Every helper must therefore
// produce a value for anything JSON.parse can hand it.
//
// BOUNDARY, stated rather than assumed. Two shapes are outside this corpus:
//   * `financing.plans` being a non-array truthy value (string / number /
//     object). finGroupedPlans() does `(plans || []).forEach`, which throws on
//     those. validate_financing refuses them at build time
//     (tools/validation.py:1879, "financing.plans must be an array of plan
//     objects"), so no such bundle is publishable.
//   * strings carrying a LONE SURROGATE. finPathEncode() delegates to
//     encodeURIComponent, which raises URIError on one. Reported separately —
//     asserting the current behaviour here would enshrine it.
// Everything else json.loads/JSON.parse can produce is in scope.
console.log("Totality over malformed configuration:");
const throwsIn = (thunk) => { try { thunk(); return false; } catch (e) { return e; } };
check("the totality probe reports a planted throw",
  throwsIn(() => { throw new Error("planted"); }) !== false);
check("the totality probe reports a clean call as clean", throwsIn(() => 1) === false);

// Every helper, over one configuration, in one language.
function exerciseAll(cfg, lang) {
  harness.set(cfg, lang);
  const a = harness.api;
  const plans = Array.isArray(cfg.plans) ? cfg.plans : [];
  plans.forEach(p => { a.finPlanGroup(p); a.finSafeProvider(p); });
  const groups = a.finGroupedPlans(cfg.plans);
  a.finPromotionalByProvider(groups.promotional);
  const paths = a.finPaymentPaths();
  paths.forEach(p => {
    a.finPathById(p.id);
    a.finPathBlock(p, "<p>body</p>");
    a.finPathDom("finPathPanel", p.id);
  });
  [null, undefined, "", "plan-gone", 0, {}, []].forEach(id => a.finPathById(id));
  [null, undefined, {}, { id: 42 }, { id: null, label: 5 }].forEach(p => a.finPathBlock(p));
  [null, undefined, 0, false, true, {}, [], "x", -1.5].forEach(v => {
    a.finPathEncode(v); a.finPathId("plan", v);
  });
  harness.run(cfg, lang);
}
const HOSTILE_CONFIGS = {
  "plans absent": (c) => { delete c.plans; },
  "plans null": (c) => { c.plans = null; },
  "plans empty": (c) => { c.plans = []; },
  "plan entry null": (c) => { c.plans.push(null); },
  "plan entry number": (c) => { c.plans.push(3); },
  "plan entry string": (c) => { c.plans.push("plan"); },
  "plan entry array": (c) => { c.plans.push([1, 2]); },
  "plan entry empty object": (c) => { c.plans.push({}); },
  "kind is an array": (c) => { c.plans[0].kind = ["open-end-promotional-credit"]; },
  "kind is a number": (c) => { c.plans[0].kind = 7; },
  "kind is an object": (c) => { c.plans[0].kind = { en: "x" }; },
  "kind is null": (c) => { c.plans[0].kind = null; },
  "kind absent": (c) => { delete c.plans[0].kind; },
  "plan id numeric": (c) => { c.plans[2].id = 42; },
  "plan id null": (c) => { c.plans[2].id = null; },
  "plan id object": (c) => { c.plans[2].id = { a: 1 }; },
  "plan id array": (c) => { c.plans[2].id = ["a"]; },
  "provider is an object": (c) => { c.plans[0].provider = { n: 1 }; },
  "provider is an array": (c) => { c.plans[0].provider = ["Synchrony"]; },
  "presentationScenario numeric": (c) => { c.plans[5].presentationScenario = 3; },
  "presentationScenario null": (c) => { c.plans[5].presentationScenario = null; },
  "presentationScenario array": (c) => { c.plans[5].presentationScenario = ["mexico-delivery"]; },
  "presentationScenario unknown": (c) => { c.plans[5].presentationScenario = "mars-delivery"; },
  "headline numeric": (c) => { c.plans[0].headline = 5; },
  "headline array": (c) => { c.plans[1].headline = ["a"]; },
  "headline null": (c) => { c.plans[3].headline = null; },
  "headline absent": (c) => { delete c.plans[3].headline; },
  "detail is an array": (c) => { c.plans[2].detail = [1, 2]; },
  "disclosure numeric": (c) => { c.plans[5].disclosure = 9; },
  "copy null": (c) => { c.copy = null; },
  "copy is an array": (c) => { c.copy = ["eyebrow"]; },
  "copy entry numeric": (c) => { c.copy.staleNotice = 12; },
  "allowedSourceHosts is a string": (c) => { c.allowedSourceHosts = "lacks.com"; },
  "allowedSourceHosts holds non-strings": (c) => { c.allowedSourceHosts = [1, null, {}]; },
  "sourceUrl is an object": (c) => { c.sourceUrl = { en: "x" }; },
  "sourceUrl is a relative path": (c) => { c.sourceUrl = "/financing"; },
  "mexicoInfoUrl numeric": (c) => { c.mexicoInfoUrl = 5; },
  "mexicoInfoUrl is javascript:": (c) => { c.mexicoInfoUrl = "javascript:alert(1)"; },
  "maxAgeDays is a string": (c) => { c.maxAgeDays = "30"; },
  "verifiedAt is an object": (c) => { c.verifiedAt = { en: "now" }; },
  "config is an empty object": (c) => { Object.keys(c).forEach(k => delete c[k]); }
};
for (const [name, mutate] of Object.entries(HOSTILE_CONFIGS)) {
  const errs = [];
  for (const lang of ["en", "es"]) {
    const c = freshCfg();
    mutate(c);
    const e = throwsIn(() => exerciseAll(c, lang));
    if (e !== false) errs.push(`${lang}: ${e && e.message}`);
  }
  check(`${name} -> every helper returns a value`, errs.length === 0, errs.join(" / "));
}
// Totality is worth nothing if the renderer quietly stopped rendering, so the
// benign case has to still produce a full sheet after the corpus above.
check("the totality corpus did not leave the harness wedged",
  countOf(cardsOf(harness.run(clone(shipped.financing), "en")), CARD_RE) === 5);

// --- 9. Stale is REVIEWABLE, not removed ------------------------------------
// The fail-closed swap replaces the exact terms with the governed staleNotice
// INSIDE the disclosure; the path itself stays fully operable, because a
// customer must still be able to say "this is the one I'm considering" about a
// path whose numbers the kiosk is not currently allowed to state.
console.log("Stale paths stay reviewable:");
for (const lang of ["en", "es"]) {
  const c = freshCfg();
  const promos = (c.plans || []).filter(p => groupOf(p) === "promotional");
  promos[0].verified = false;                      // one stale plan, whole card blanks
  const state = { open: { "promo-Synchrony": true } };
  const r = harness.run(c, lang, state);
  const cards = cardsOf(r);
  const block = blockFor(cards, "promo-Synchrony");
  const stale = escLike(c.copy.staleNotice[lang]);
  check(`[${lang}] the stale provider card still renders its path controls`,
    block.length > 0 && countOf(block, REVIEW_RE) === 1 && countOf(block, CONSIDER_RE) === 1);
  check(`[${lang}] its disclosure reveals the governed staleNotice`,
    block.includes(stale), stale.slice(0, 40));
  check(`[${lang}] and not the exact offer headline`,
    !block.includes(escLike(promos[0].headline[lang])));
  check(`[${lang}] the freshness status region announces the swap`,
    r.el("financingSheetStatus")._text === c.copy.staleAnnouncement[lang]);
  const fresh = harness.run(freshCfg(), lang, state);
  check(`[${lang}] and stays silent when nothing was swapped (non-vacuous)`,
    fresh.el("financingSheetStatus")._text === "");
  check(`[${lang}] the fresh card shows the exact headline in the same slot`,
    blockFor(cardsOf(fresh), "promo-Synchrony")
      .includes(escLike(promos[0].headline[lang])));
}

// --- 10. Bilingual: labels move with the language, IDS DO NOT ---------------
// This is what lets a mid-session EN/ES switch swap every visible string while
// payExplored, payPref and payOpen keep pointing at the same paths. An id that
// moved with the language would silently drop the customer's preference on the
// toggle.
console.log("Bilingual labels, language-invariant ids:");
{
  harness.set(clone(shipped.financing), "en");
  const en = harness.api.finPaymentPaths();
  harness.set(clone(shipped.financing), "es");
  const es = harness.api.finPaymentPaths();
  check("both languages derive the same number of paths", en.length === es.length);
  check("path ids are identical across languages",
    en.map(p => p.id).join(",") === es.map(p => p.id).join(","),
    en.map(p => p.id).join(",") + "  vs  " + es.map(p => p.id).join(","));
  check("path groups are identical across languages",
    en.map(p => p.group).join(",") === es.map(p => p.group).join(","));
  const moved = en.filter((p, i) => p.label !== es[i].label).length;
  check("most labels DO change with the language (non-vacuous)", moved >= 3,
    `${moved} of ${en.length} changed`);
  check("[en] the promotional label reads provider-first",
    en[0].label === "Synchrony promotional financing", en[0].label);
  check("[es] the promotional label reads kind-first",
    es[0].label === "Financiamiento promocional Synchrony", es[0].label);
  check("labels come from config, not the renderer",
    es[1].label === shipped.financing.plans
      .find(p => p.id === "lacks-in-house").headline.es,
    es[1].label);
  // The rendered card titles are the same strings, in the same order.
  const enCards = titlesOf(cardsOf(harness.run(clone(shipped.financing), "en")));
  const esCards = titlesOf(cardsOf(harness.run(clone(shipped.financing), "es")));
  check("[en] card titles match the derived labels", enCards.join("|") === en.map(p => p.label).join("|"));
  check("[es] card titles match the derived labels", esCards.join("|") === es.map(p => p.label).join("|"));
  check("the sheet's own controls are localised too",
    cardsOf(harness.run(clone(shipped.financing), "es")).includes("Revisar esta opción") &&
    cardsOf(harness.run(clone(shipped.financing), "en")).includes("Review this option"));
}

// --- 11. Path identity: injective, and safe in a selector -------------------
// finAgendaKey() lower-cased the value and collapsed each run of unsupported
// characters into a single '-'. That is LOSSY, and it collided on values a real
// config can hold — and it embedded a COLON, which getElementById tolerates but
// querySelector parses as a pseudo-class. Reproduced here VERBATIM from the
// retired implementation, purely as the counter-example that keeps the new
// assertions honest.
console.log("Canonical path identity:");
{
  function legacyAgendaKey(prefix, value) {           // RETIRED — do not restore
    var slug = String(value || '').trim().toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return prefix + ':' + slug;
  }
  // The adversarial corpus is the collision list from the D4 comment, plus the
  // cross-kind and whitespace cases the comment implies.
  const CORPUS = [
    ["promo", "Synchrony Bank"], ["promo", "Synchrony-Bank"],
    ["promo", "Synchrony"], ["promo", "SYNCHRONY"],
    ["promo", "Café"], ["promo", "Caf!"],
    ["promo", "General"], ["promo", ""],
    ["promo", "__proto__"], ["promo", "constructor"],
    ["promo", "  Synchrony  "], ["promo", "Synchrony "],
    ["promo", "mexico-delivery"], ["scenario", "mexico-delivery"],
    ["plan", "lacks-in-house"], ["plan", "lacks in house"],
    ["plan", "a_b"], ["plan", "a-b"], ["plan", "a.b"], ["plan", "a b"],
    ["plan", "Ünicode"], ["plan", "emoji-\u{1F600}"]
  ];
  harness.set(clone(shipped.financing), "en");
  const ids = CORPUS.map(([k, v]) => harness.api.finPathId(k, v));
  check("finPathId is injective on the adversarial corpus",
    new Set(ids).size === CORPUS.length,
    `${new Set(ids).size} distinct of ${CORPUS.length}`);
  const legacy = CORPUS.map(([k, v]) => legacyAgendaKey(k, v));
  check("the corpus IS adversarial (the retired slugifier collides on it)",
    new Set(legacy).size < CORPUS.length,
    `${new Set(legacy).size} distinct of ${CORPUS.length}`);

  // Injective because DECODABLE: '_' always introduces exactly two hex digits,
  // and a literal '_' is itself escaped as '_5f', so the marker is unambiguous.
  const decode = (enc) =>
    decodeURIComponent(String(enc).replace(/_([0-9a-f]{2})/g, "%$1"));
  for (const [kind, value] of CORPUS) {
    const id = harness.api.finPathId(kind, value);
    const cut = id.indexOf("-");                 // no kind token contains '-'
    check(`round-trip ${kind}/${JSON.stringify(value)}`,
      id.slice(0, cut) === kind && decode(id.slice(cut + 1)) === value,
      id);
  }

  // DOM/CSS safety. The old ids could never be used with querySelector or in a
  // stylesheet without escaping; these can.
  const ID_SAFE = /^[A-Za-z][A-Za-z0-9_-]*$/;
  check("every corpus id is DOM/CSS safe", ids.every(id => ID_SAFE.test(id)),
    ids.filter(id => !ID_SAFE.test(id)).join(", "));
  check("no corpus id contains a colon", ids.every(id => id.indexOf(":") === -1));
  check("the safety pattern rejects a planted counter-example",
    !ID_SAFE.test("promotional:synchrony") && !ID_SAFE.test("9lives") &&
    !ID_SAFE.test("has space") && !ID_SAFE.test("-leading") && !ID_SAFE.test(""));
  check("the retired keys WOULD fail that pattern (non-vacuous)",
    legacy.every(k => !ID_SAFE.test(k)));

  // Every DOM id the renderer derives from a path id is safe too.
  harness.set(clone(shipped.financing), "en");
  const derived = harness.api.finPaymentPaths().flatMap(p =>
    ["finPathReview", "finPathPanel", "finPathConsider", "finPathClear", "finPathMarker"]
      .map(prefix => harness.api.finPathDom(prefix, p.id)));
  check("every derived DOM id is safe and unique",
    derived.length === 25 && derived.every(id => ID_SAFE.test(id)) &&
    new Set(derived).size === derived.length);

  // The grouping key and the path id must be derived from the SAME value, or a
  // provider with stray whitespace groups one way and identifies another.
  const c = freshCfg();
  const tpl = c.plans.filter(p => groupOf(p) === "promotional")[0];
  c.plans = [Object.assign(clone(tpl), { id: "p1", provider: "  Synchrony  " }),
             Object.assign(clone(tpl), { id: "p2", provider: "Synchrony" })];
  harness.set(c, "en");
  const trimmed = harness.api.finPaymentPaths();
  check("a padded provider groups AND identifies as its trimmed form",
    trimmed.length === 1 && trimmed[0].id === "promo-Synchrony" &&
    planCount(trimmed[0]) === 2, trimmed.map(p => p.id).join(", "));
}

// --- 12. finPathBlock: the disclosure + preference contract -----------------
// A native <button> with aria-expanded/aria-controls and a `hidden` panel,
// deliberately NOT <details>/<summary> — the sheet's focus trap selects
// `button, [href], [tabindex="-1"]#financingSheetTitle`, so a <summary> would
// be unreachable by Tab inside the modal. Consider is one-way and carries NO
// aria-pressed; when a path IS the preference, Consider is replaced by a
// non-interactive marker plus a separately named Clear.
console.log("Path disclosure and preference controls:");
{
  const PATH = "plan-lacks-in-house";
  const ariaControlsResolves = (block) => {
    const m = block.match(/aria-controls="([^"]+)"/);
    return !!m && block.includes(`id="${m[1]}"`);
  };
  const panelIsHidden = (block) =>
    /<div class="fin-path-panel" id="[^"]*" hidden>/.test(block);

  check("the aria-controls resolver rejects a planted dangling reference",
    !ariaControlsResolves('<button aria-controls="ghost"></button><div id="other">'));
  check("the hidden-panel detector rejects a planted open panel",
    !panelIsHidden('<div class="fin-path-panel" id="finPathPanel-x">body</div>'));

  // ---- collapsed, not preferred ----
  let cards = cardsOf(harness.run(clone(shipped.financing), "en"));
  let block = blockFor(cards, PATH);
  check("collapsed: the block was located", block.length > 0);
  check("collapsed: the control is a native <button type=\"button\">",
    /<button type="button" class="fin-btn fin-btn-ghost fin-path-review"/.test(block));
  check("collapsed: no <details>/<summary> anywhere in the sheet",
    !/<details|<summary/.test(cards));
  check("collapsed: aria-expanded is false", /aria-expanded="false"/.test(block));
  check("collapsed: aria-controls points at an id present in the same output",
    ariaControlsResolves(block));
  check("collapsed: the panel carries the hidden attribute", panelIsHidden(block));
  check("collapsed: the button reads reviewOption",
    block.includes(escLike(shipped.financing.copy.reviewOption.en)));
  check("collapsed: exactly one Consider, no Clear, no marker",
    countOf(block, CONSIDER_RE) === 1 && countOf(block, CLEAR_RE) === 0 &&
    !MARKER_RE.test(block));
  check("collapsed: no aria-pressed on any path control",
    !/aria-pressed/.test(cards));
  check("that aria-pressed probe fires on a planted counter-example",
    /aria-pressed/.test('<button aria-pressed="true">x</button>'));

  // ---- expanded ----
  cards = cardsOf(harness.run(clone(shipped.financing), "en", { open: { [PATH]: true } }));
  block = blockFor(cards, PATH);
  check("expanded: aria-expanded is true", /aria-expanded="true"/.test(block));
  check("expanded: the panel loses the hidden attribute", !panelIsHidden(block));
  check("expanded: aria-controls still resolves", ariaControlsResolves(block));
  check("expanded: the button reads hideDetails",
    block.includes(escLike(shipped.financing.copy.hideDetails.en)));
  check("expanding one path does not expand the others",
    countOf(cards, /aria-expanded="true"/g) === 1 &&
    countOf(cards, /aria-expanded="false"/g) === 4);

  // ---- preferred ----
  cards = cardsOf(harness.run(clone(shipped.financing), "en", { pref: PATH }));
  block = blockFor(cards, PATH);
  const marker = block.match(MARKER_RE);
  check("preferred: Consider is gone, Clear is present",
    countOf(block, CONSIDER_RE) === 0 && countOf(block, CLEAR_RE) === 1);
  check("preferred: the marker is a <span>, not a control", !!marker);
  check("preferred: the marker carries no interactive affordance",
    !!marker && !/<button|onclick|ontouchend|tabindex|role=/.test(marker[0]));
  check("preferred: the marker reads currentlyConsidering",
    !!marker && marker[2] === escLike(shipped.financing.copy.currentlyConsidering.en));
  check("preferred: still no aria-pressed anywhere", !/aria-pressed/.test(cards));
  check("preferred: only the preferred path swaps its control",
    countOf(cards, CONSIDER_RE) === 4 && countOf(cards, CLEAR_RE) === 1);
  check("preferred: the Review disclosure is unaffected",
    countOf(cards, REVIEW_RE) === 5);
  check("preferred: PAY_NOT_NOW is not a path, so no card claims it",
    countOf(cardsOf(harness.run(clone(shipped.financing), "en", { pref: "not_now" })),
      CLEAR_RE) === 0);

  // ---- a dropped path degrades to plain body, never orphan controls ----
  harness.set(clone(shipped.financing), "en");
  check("finPathBlock(null, body) returns the body untouched",
    harness.api.finPathBlock(null, "<p>x</p>") === "<p>x</p>");
  check("finPathBlock(null) with no body returns an empty string",
    harness.api.finPathBlock(null) === "");
  const c = clone(shipped.financing);
  const ever = c.plans.find(p => groupOf(p) === "evergreen");
  delete ever.headline;                            // no resolvable label
  harness.set(c, "en");
  check("a path with no resolvable label is dropped",
    harness.api.finPaymentPaths().length === 4);
  const degraded = cardsOf(harness.run(c, "en"));
  check("its card still renders, without any path controls",
    countOf(degraded, CARD_RE) === 5 && countOf(degraded, REVIEW_RE) === 4 &&
    countOf(degraded, CONSIDER_RE) === 4);
}

// --- 13. finPathById: resolve against the CURRENT config, or null -----------
// Every state transition validates through this first, so "unknown id" has to
// mean null rather than a partially-built object — and a raw id must never be
// treated as displayable text.
console.log("Path resolution:");
{
  harness.set(clone(shipped.financing), "en");
  const known = harness.api.finPaymentPaths().map(p => p.id);
  for (const id of known) {
    const got = harness.api.finPathById(id);
    check(`resolves ${id}`, !!got && got.id === id && !!got.label);
  }
  const UNKNOWN = ["", "promo-Nope", "plan-gone", "scenario-mars", "promo-synchrony",
                   "promo-Synchrony ", "constructor", "__proto__", "toString",
                   "valueOf", "hasOwnProperty", 0, 1, null, undefined, true,
                   {}, [], ["promo-Synchrony"]];
  for (const id of UNKNOWN) {
    check(`does not resolve ${JSON.stringify(id) ?? "undefined"}`,
      harness.api.finPathById(id) === null);
  }
  // Resolution follows the config, so a path that leaves the config stops
  // resolving — which is what makes a stale preference a no-op rather than a
  // dangling row.
  const c = clone(shipped.financing);
  c.plans = c.plans.filter(p => groupOf(p) !== "installment");
  harness.set(c, "en");
  check("a removed plan's id stops resolving",
    harness.api.finPathById("plan-lacks-in-house") === null);
  check("the surviving paths still resolve",
    harness.api.finPathById("promo-Synchrony") !== null &&
    harness.api.finPathById("scenario-mexico-delivery") !== null);
  check("a stale preference renders no marker and no Clear",
    countOf(cardsOf(harness.run(c, "en", { pref: "plan-lacks-in-house" })), CLEAR_RE) === 0);
}

console.log(`\nFinancing render check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
