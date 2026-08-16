// Financing sheet RENDER check — executes the real renderFinancingSheet().
//
// Every other financing gate (exactPromotionsEnabled, financingTermsFresh,
// financingPlanFresh, financingAgeOk, financingSourceAllowed) is proven
// behaviourally elsewhere. But a gate only matters if the RENDERER consults
// it, and until now nothing executed the one component that turns a gate
// decision into pixels: the .mjs suites asserted on index.html as TEXT, so
// they pinned the gates by NAME, not by VALUE.
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
const fn = (n) => new RegExp(`function ${n}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n    \\}`);
const SRC = [
  ["escapeHtml", extract(/function escapeHtml\(str\)\s*\{[\s\S]*?\n    \}/, "escapeHtml")],
  ["finEsc", extract(/function finEsc\(s\)\s*\{[^\n]*\n/, "finEsc")],
  ["FIN_SCENARIO_MEXICO", extract(/var FIN_SCENARIO_MEXICO = [^\n]*/, "FIN_SCENARIO_MEXICO")],
  ["FIN_EVERGREEN_KINDS", extract(/var FIN_EVERGREEN_KINDS = [^\n]*/, "FIN_EVERGREEN_KINDS")],
  ["FINANCING_CLOCK_SKEW_MS", extract(/var FINANCING_CLOCK_SKEW_MS = [^\n]*/, "skew")],
  ["finPlanScenario", extract(fn("finPlanScenario"), "finPlanScenario")],
  ["finPlanGroup", extract(fn("finPlanGroup"), "finPlanGroup")],
  ["finGroupedPlans", extract(fn("finGroupedPlans"), "finGroupedPlans")],
  ["finPromotionalByProvider", extract(fn("finPromotionalByProvider"), "finPromotionalByProvider")],
  ["finAgendaKey", extract(fn("finAgendaKey"), "finAgendaKey")],
  ["finAgendaItems", extract(fn("finAgendaItems"), "finAgendaItems")],
  ["finAgendaSelected", extract(fn("finAgendaSelected"), "finAgendaSelected")],
  ["finAgendaControl", extract(fn("finAgendaControl"), "finAgendaControl")],
  ["finSafeProvider", extract(fn("finSafeProvider"), "finSafeProvider")],
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
// source that produced it. FC/L/storeName are supplied rather than extracted --
// they depend on the dictionary loader and store identity, neither of which is
// what this suite tests; they return the real shipped config strings.
const harness = new Function("SRC_LIST", `
  var __cfg = null, currentLang = 'en', financingAgenda = {};
  var console = { warn: function () {}, log: function () {} };
  var _finSheetStale = false;
  function getFinancingConfig() { return __cfg; }
  function FC(key) {
    var c = (__cfg && __cfg.copy) || {};
    var v = c[key];
    if (v == null) return '';
    return typeof v === 'string' ? v : (v[currentLang] || v.en || '');
  }
  function storeName() { return 'Lacks Furniture'; }
  function L(obj) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    return obj[currentLang] || obj.en || '';
  }
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
  return {
    run: function (cfg, lang) {
      __cfg = cfg; currentLang = lang; __els = {};
      renderFinancingSheet();
      var out = '';
      for (var k in __els) out += __els[k]._html + ' ' + __els[k]._text + ' ';
      return { dom: out, el: function (id) { return __els[id]; } };
    },
    fresh: function (cfg) { __cfg = cfg; return financingTermsFresh(); }
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

// --- 1. SHIPPED STATE: no freshness-gated string reaches the DOM ------------
console.log("Shipped state (exactPromotionsEnabled=false) - every gated string suppressed:");
for (const lang of ["en", "es"]) {
  const cfg = clone(shipped.financing);
  const { dom } = harness.run(cfg, lang);
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
  check(`[${lang}] one agenda control per semantic path`,
    (dom.match(/class="fin-agenda-toggle/g) || []).length === 5);
  check(`[${lang}] lease-to-own and credit-building are separate cards`,
    !/More paths|Más caminos/.test(dom));
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
console.log("Ungated card titles and the Mexico card stay rate-free:");
for (const state of ["shipped", "fresh"]) {
  for (const lang of ["en", "es"]) {
    const cfg = state === "shipped" ? clone(shipped.financing) : freshCfg();
    const { el } = harness.run(cfg, lang);
    const inhouse = el("financingSheetInHouse");
    const mexico = el("financingSheetMexico");
    for (const [label, node] of [["in-house", inhouse], ["mexico", mexico]]) {
      if (!node) continue;
      const titles = (node._html.match(/<h3[^>]*class="fin-card__title"[^>]*>([\s\S]*?)<\/h3>/g) || []);
      check(`[${state}/${lang}] ${label} card title carries no rate marker`,
        titles.every(t => !RATE.test(t.replace(/<[^>]*>/g, ""))));
    }
  }
}

// --- 5. The official link is inert when the URL fails validation ------------
console.log("Official-page link fails closed:");
{
  const c = freshCfg(); c.sourceUrl = "https://evil.example.com/financing";
  const { el } = harness.run(c, "en");
  const a = el("financingSheetLink");
  check("unsafe sourceUrl leaves the anchor with no href",
    !a || !a.getAttribute("href"), a ? String(a.getAttribute("href")) : "");
  const c2 = freshCfg();
  const r2 = harness.run(c2, "en");
  check("allowlisted sourceUrl sets a real href",
    r2.el("financingSheetLink") &&
    r2.el("financingSheetLink").getAttribute("href") === c2.sourceUrl);
}

console.log(`\nFinancing render check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
