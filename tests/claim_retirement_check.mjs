// Claim retirement (owner ruling 2026-08-12) — g6, g7, s3, g8, g9.
//
// The unsupported display claims on five models were withdrawn from the
// canonical data, and the renderer was taught TOTAL component omission: a
// model whose authored differentiators AND archetype are both absent shows
// NO differentiator component — no heading, no container, no hardcoded
// "Its defining character" default, no feature-derived generic pair. In the
// compare modal a retired side shows "—"; retired-vs-retired omits the two
// differentiator rows entirely.
//
// This suite EXTRACTS the real mattressDifferentiators(), the drawer's
// differentiator render block, the compare modal's sideData()/rowsHtml(),
// buildMattressPriorities() and hf2ReasonFor() from index.html and EXECUTES
// them against the real shipped catalog (both languages). It pins:
//   1. the EXACT affected-model set — g6, g7, s3, g8, g9 and no other;
//   2. total drawer omission for retired models; intact rendering for
//      authored models; intact fallback for archetype-bearing models;
//   3. compare semantics (mixed "—" one side only; retired×retired row
//      omission; all other rows preserved);
//   4. the R4-exclusion evidence: buildMattressPriorities() is non-empty
//      for every retired model, so hf2ReasonFor's dangling-separator path
//      stays unreachable (recorded, per the owner's scope ruling);
//   5. banned retired claims absent from the five models' DISPLAY fields
//      (scoring inputs like features are deliberately out of scan scope);
//   6. four in-memory mutation proofs — every protection above must be
//      demonstrably load-bearing on every run.
//
// Run: node tests/claim_retirement_check.mjs   (exit 0 = all pass)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const MATTRESSES = JSON.parse(readFileSync(join(root, "data", "mattresses.json"), "utf8"));
const ALL = Object.values(MATTRESSES).flat();
const RETIRED = ["g6", "g7", "s3", "g8", "g9"];

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
  return cond;
}
function section(name) { console.log(`\n-- ${name} --`); }
function grab(re, what) {
  const m = html.match(re);
  check(`extracted ${what}`, !!m);
  return m ? m[0] : "";
}

// ---------- extractions ------------------------------------------------------
section("extraction");
const DIFFS_FN = grab(/function mattressDifferentiators\(m\) \{[\s\S]*?\r?\n    \}/, "mattressDifferentiators()");
const DRAWER_BLOCK = grab(/var _diffItems = mattressDifferentiators\(m\);[\s\S]*?\.join\(''\);/, "the drawer differentiator render block");
const SIDEDATA_FN = grab(/function sideData\(data\) \{[\s\S]*?\r?\n      \}/, "sideData()");
const ROWSHTML_FN = grab(/function rowsHtml\(d1, d2\) \{[\s\S]*?\r?\n      \}/, "rowsHtml()");
const PRIORITIES_FN = grab(/function buildMattressPriorities\(m\) \{[\s\S]*?\r?\n    \}/, "buildMattressPriorities()");
const HF2_LABELS = grab(/var HF2_ARCHETYPE_LABELS = \{[\s\S]*?\};/, "HF2_ARCHETYPE_LABELS");
const HF2_REASON_FN = grab(/function hf2ReasonFor\(m, tier\) \{[\s\S]*?\r?\n    \}/, "hf2ReasonFor()");
const RESPONSE_FN = grab(/function mattressResponseLabel\(m\) \{[\s\S]*?\r?\n    \}/, "mattressResponseLabel()");
const DIFFTEXT_FN = grab(/function mattressDifferenceText\(m\) \{[\s\S]*?\r?\n    \}/, "mattressDifferenceText()");
const PRICETIER_FN = grab(/function priceTierSymbol\(tier\) \{[\s\S]*?\r?\n    \}/, "priceTierSymbol()");
const L_FN = grab(/function L\(obj\) \{[\s\S]*?\r?\n    \}/, "L()");
const ESCAPE_FN = grab(/function escapeHtml\([\s\S]*?\r?\n    \}/, "escapeHtml()");
if (failed) { console.log("\nextraction failed — aborting"); process.exit(1); }

// ---------- harnesses --------------------------------------------------------
function makeDiffs(lang, src = DIFFS_FN) {
  return new Function("currentLang", `"use strict";
    ${L_FN}
    ${ESCAPE_FN}
    ${RESPONSE_FN}
    ${DIFFTEXT_FN}
    function topPickReasonText(m) {
      if (!m.topPickReason) return '';
      return m.topPickReason[currentLang] || m.topPickReason.en || '';
    }
    ${src}
    return mattressDifferentiators;`)(lang);
}

function runDrawer(m, lang, blockSrc = DRAWER_BLOCK) {
  const els = new Map();
  const make = (id) => ({ id, hidden: undefined, textContent: "", innerHTML: "" });
  const doc = { getElementById: (id) => { if (!els.has(id)) els.set(id, make(id)); return els.get(id); } };
  new Function("document", "m", "currentLang", `"use strict";
    ${L_FN}
    ${ESCAPE_FN}
    ${RESPONSE_FN}
    ${DIFFTEXT_FN}
    function topPickReasonText(mm) {
      if (!mm.topPickReason) return '';
      return mm.topPickReason[currentLang] || mm.topPickReason.en || '';
    }
    ${DIFFS_FN}
    ${blockSrc}`)(doc, JSON.parse(JSON.stringify(m)), lang);
  return { label: els.get("drawerDifferentiatorsLabel"), list: els.get("drawerDifferentiators") };
}

function makeCompare(lang, { sideSrc = SIDEDATA_FN, rowsSrc = ROWSHTML_FN } = {}) {
  return new Function("currentLang", "window", `"use strict";
    var answers = {};
    ${L_FN}
    ${ESCAPE_FN}
    ${RESPONSE_FN}
    ${DIFFTEXT_FN}
    ${PRICETIER_FN}
    ${PRIORITIES_FN}
    ${HF2_LABELS}
    ${HF2_REASON_FN}
    function topPickReasonText(m) {
      if (!m.topPickReason) return '';
      return m.topPickReason[currentLang] || m.topPickReason.en || '';
    }
    function reactionLabel(r) { return String(r); }
    ${DIFFS_FN}
    ${sideSrc}
    ${rowsSrc}
    return { sideData: sideData, rowsHtml: rowsHtml };`)(lang, { _mattressReactions: {} });
}

const byId = (id) => ALL.find((x) => x.id === id);
const dd = (m, tier) => ({ m: JSON.parse(JSON.stringify(m)), tier, firmFeel: "Feel" });

// ---------- 1. the affected-model set is EXACTLY the five --------------------
section("affected-model pin (owner requirement: g6, g7, s3, g8, g9 and no other)");
for (const lang of ["en", "es"]) {
  const diffs = makeDiffs(lang);
  const affected = ALL.filter((m) => diffs(m).length === 0).map((m) => m.id).sort();
  check(`[${lang}] models with total differentiator omission === ${JSON.stringify([...RETIRED].sort())}`,
    JSON.stringify(affected) === JSON.stringify([...RETIRED].sort()),
    `got ${JSON.stringify(affected)}`);
}
{
  // The fallback path stays intact for an archetype-bearing model with no
  // authored pairs (none ships today; synthetic proof that R1 changed
  // nothing for that class).
  const diffs = makeDiffs("en");
  const synthetic = { archetype: "Test archetype", differentiators: [], highlight: "HL", topPickReason: { en: "TPR" } };
  const out = diffs(synthetic);
  check("archetype-bearing model still receives the two fallback pairs",
    out.length === 2 && out[0].title === "Test archetype" && out[0].detail === "TPR");
  const authored = diffs(byId("g1"));
  check("authored model (g1) keeps its authored pairs verbatim",
    authored.length === 2 && authored[0].title.length > 0 && authored[0].detail.length > 0);
}

// ---------- 2. drawer: total omission, no empty markup ------------------------
section("drawer omission");
for (const lang of ["en", "es"]) {
  for (const id of RETIRED) {
    const { label, list } = runDrawer(byId(id), lang);
    check(`[${lang}] ${id}: heading and container hidden, zero markup`,
      label.hidden === true && list.hidden === true && list.innerHTML === "");
  }
  const { label, list } = runDrawer(byId("g1"), lang);
  check(`[${lang}] control g1: section visible with authored content`,
    label.hidden === false && list.hidden === false
    && list.innerHTML.includes("drawer-differentiator-title")
    && !list.innerHTML.includes('class="drawer-differentiator-detail"></div>'.replace(">", ">X")));
}
{
  const { list } = runDrawer(byId("g6"), "en");
  check("retired drawer emits no hardcoded or generic fallback strings",
    !list.innerHTML.includes("Its defining character")
    && !list.innerHTML.includes("How it feels different"));
}

// ---------- 3. compare semantics ----------------------------------------------
section("compare modal");
for (const lang of ["en", "es"]) {
  const cmp = makeCompare(lang);
  // mixed: retired g6 vs authored g1 — "—" on the retired side only
  const a = cmp.sideData(dd(byId("g6"), "gold"));
  const b = cmp.sideData(dd(byId("g1"), "gold"));
  check(`[${lang}] mixed: retired side shows "—" for feature and benefit`,
    a.retired === true && a.feature === "—" && a.benefit === "—");
  check(`[${lang}] mixed: authored side keeps its real differentiator`,
    b.retired === false && b.feature !== "—" && b.feature.length > 0);
  const mixedHtml = cmp.rowsHtml(dd(byId("g6"), "gold"), dd(byId("g1"), "gold"));
  check(`[${lang}] mixed: feature and benefit rows render (diff rows, one dash side)`,
    mixedHtml.includes('data-cmp="feature"') && mixedHtml.includes('data-cmp="benefit"'));
  // retired × retired: both rows omitted entirely, all other rows kept
  const rrHtml = cmp.rowsHtml(dd(byId("g6"), "gold"), dd(byId("g7"), "gold"));
  check(`[${lang}] retired×retired: feature and benefit rows OMITTED`,
    !rrHtml.includes('data-cmp="feature"') && !rrHtml.includes('data-cmp="benefit"'));
  check(`[${lang}] retired×retired: feel/response/tier/fit/reaction rows preserved`,
    ["feel", "response", "tier", "fit", "reaction"].every((k) => rrHtml.includes(`data-cmp="${k}"`)));
}

// ---------- 4. R4-exclusion evidence ------------------------------------------
section("hf2ReasonFor latent path stays unreachable (R4 excluded by ruling)");
{
  const cmp = makeCompare("en");
  // buildMattressPriorities is reachable through sideData's fit; assert the
  // real function returns >=1 priority for every retired model, so the
  // hf2ReasonFor fallback (the dangling-separator path) never fires.
  const mkPrios = (ans) => new Function("currentLang", "answers", `"use strict";
    ${L_FN}
    ${PRIORITIES_FN}
    return buildMattressPriorities;`)("en", ans);
  // Weakest case first: even with EMPTY answers the features-driven entries
  // must fire; then a representative populated session.
  const emptyP = mkPrios({});
  const fullP = mkPrios({ sleep_position: "side", temperature: "hot",
    sleep_issues: ["back_pain"], health_conditions: ["snoring"] });
  check("every retired model yields >=1 priority even with empty answers",
    RETIRED.every((id) => emptyP(byId(id)).length >= 1),
    RETIRED.map((id) => `${id}:${emptyP(byId(id)).length}`).join(" "));
  check("every retired model yields >=1 priority with a populated session",
    RETIRED.every((id) => fullP(byId(id)).length >= 1));
  const fit = cmp.sideData(dd(byId("s3"), "silver")).fit;
  check("silver retired model's compare fit comes from priorities, no dangling separator",
    fit.length > 0 && !/—\s*$/.test(fit) && !/ alternative — $/.test(fit));
}

// ---------- 5. banned retired claims are gone from display fields -------------
section("banned strings absent from the five models' display fields");
{
  const BANNED = ["hand-made", "hand made", "hecho a mano", "hecha a mano",
    "texas", "natural materials", "materiales naturales", "wrapped", "envueltos",
    "strong edges", "bordes fuertes", "lifetime", "toda la vida", "euro-top",
    "euro top", "craftspeople", "artesanos", "copper-infused", "infusión de cobre",
    "cooling", "frescura", "patented", "patentada", "natuverex", "zoned coils",
    "resortes zonificados", "outlast", "duran más", "maximum support",
    "máximo soporte"];
  for (const id of RETIRED) {
    const m = byId(id);
    // DISPLAY fields only: scoring inputs (features) and identity fields
    // (name/brand/subBrand) are deliberately outside the scan.
    const display = JSON.stringify({
      tags: m.tags, tags_es: m.tags_es, archetype: m.archetype,
      highlight: m.highlight, highlight_es: m.highlight_es,
      topPickReason: m.topPickReason, differentiators: m.differentiators,
      reasons: m.reasons, reasons_es: m.reasons_es,
    }).toLowerCase();
    const hits = BANNED.filter((b) => display.includes(b));
    check(`${id}: no banned claim in any display field`, hits.length === 0,
      `found ${JSON.stringify(hits)}`);
  }
  check("tags arrays are arrays with matching EN/ES counts on every model",
    ALL.every((m) => Array.isArray(m.tags) && Array.isArray(m.tags_es)
      && (m.tags.length === 0) === (m.tags_es.length === 0)
      && m.tags.length === m.tags_es.length));
  check("the five retired models keep exactly their one name-derived tag",
    JSON.stringify(RETIRED.map((id) => byId(id).tags)) ===
    JSON.stringify([["Plush"], ["Medium"], ["Plush Box Top"], ["Extra Firm"], ["Cushion Firm"]]));
}

// ---------- 6. mutation proof --------------------------------------------------
section("mutation proof (every protection is load-bearing)");
const MUTATIONS = [
  {
    name: "R1 retirement condition removed (fallback resurrection)",
    run() {
      const src = DIFFS_FN.replace(/if \(!\(\(m\.archetype \|\| ''\)\.trim\(\)\)\) return \[\];/, "");
      if (src === DIFFS_FN) return "find-string missing";
      const diffs = makeDiffs("en", src);
      return diffs(byId("g6")).length === 0 ? "NOT CAUGHT" : "caught";
    }
  },
  {
    name: "drawer hidden-toggle removed (empty section renders)",
    run() {
      const src = DRAWER_BLOCK
        .replace("_diffLabelEl.hidden = _diffItems.length === 0;", "_diffLabelEl.hidden = false;")
        .replace("_diffListEl.hidden = _diffItems.length === 0;", "_diffListEl.hidden = false;");
      if (src === DRAWER_BLOCK) return "find-string missing";
      const { label } = runDrawer(byId("g6"), "en", src);
      return label.hidden === true ? "NOT CAUGHT" : "caught";
    }
  },
  {
    name: "compare dash removed (generic text resurrects on retired side)",
    run() {
      const src = SIDEDATA_FN
        .replace("_retired ? '—' : (d0.title || mattressResponseLabel(m))", "(d0.title || mattressResponseLabel(m))")
        .replace("_retired ? '—' : (d0.detail || mattressDifferenceText(m))", "(d0.detail || mattressDifferenceText(m))");
      if (src === SIDEDATA_FN) return "find-string missing";
      const cmp = makeCompare("en", { sideSrc: src });
      const a = cmp.sideData(dd(byId("g6"), "gold"));
      return a.feature === "—" ? "NOT CAUGHT" : "caught";
    }
  },
  {
    name: "retired×retired row-omission filter removed",
    run() {
      const src = ROWSHTML_FN.replace(/if \(a\.retired && b\.retired\) \{[\s\S]*?\}\r?\n/, "");
      if (src === ROWSHTML_FN) return "find-string missing";
      const cmp = makeCompare("en", { rowsSrc: src });
      const rr = cmp.rowsHtml(dd(byId("g6"), "gold"), dd(byId("g7"), "gold"));
      return rr.includes('data-cmp="feature"') ? "caught" : "NOT CAUGHT";
    }
  }
];
for (const mu of MUTATIONS) {
  const verdict = mu.run();
  check(`[caught] ${mu.name}`, verdict === "caught", verdict);
}

console.log(`\nClaim retirement check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
