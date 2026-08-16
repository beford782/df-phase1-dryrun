// Phase 0.6 — the Consultation Summary's three strings (context / who /
// profile) resolved through the config-driven implication mapping
// (salesNotes.consultationImplications, keyed by question id + option id),
// end to end: real config hydration, the shared resolver, the hf2 render,
// the payload projection, and Code.gs on both send paths.
//
// THE LEAK THIS SUITE IS BUILT AROUND: before 0.6 the who/profile rows
// resolved quiz option LABELS, so a customer read back a clinical summary of
// themselves ("Side Sleeper · Snoring or Sleep Apnea · Nerve Pain or
// Tingling"). The mapping replaces those with testing implications, and the
// resolver fails CLOSED: a missing / malformed / untranslated entry omits the
// fragment — never the quiz label, never an option or question id, never the
// other language's copy. Non-leakage is proven BEHAVIORALLY: quiz labels are
// replaced with sentinel diagnosis strings in a sandbox and every output
// surface is shown to carry only implication copy.
//
// The generated-config ↔ canonical-pipeline equality (exit 12) is the strict
// golden suite's job (tests/golden/run_golden.py --strict); this file asserts
// against the COMMITTED data/store-config.json and data/quiz.json.
//
// Run: node tests/consultation_summary_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const gs = readFileSync(join(root, "Code.gs"), "utf8");
const CONFIG = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));
const QUIZ = JSON.parse(readFileSync(join(root, "data", "quiz.json"), "utf8"));

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

// The five questions the resolver consumes — MIRRORS index.html's
// resolveConsultationSummary() and tools/validation.py CONSULTATION_QUESTIONS.
// (sleep_quality was removed from the quiz 2026-08-12, owner ruling; the
// context row now builds from trigger alone.)
const CONSUMED = ["trigger", "sleep_issues",
  "sleep_position", "health_conditions", "temperature"];

// ---------- extractions ------------------------------------------------------
section("extraction");
const IMPLICATION_FN = grab(/function consultImplication\(questionId, optionId\) \{[\s\S]*?\n    \}/, "consultImplication()");
const RESOLVER_FN = grab(/function resolveConsultationSummary\(\) \{[\s\S]*?\n    \}/, "resolveConsultationSummary()");
const RENDER_FN = grab(/function renderHf2Brief\(\) \{[\s\S]*?\n    \}/, "renderHf2Brief()");
// Slice 2 stamp: renderHf2Brief() draws the shared decorative Sleep Signature
// before the rows. Executed for real here so this suite keeps proving that
// the stamp is the ONLY change to this screen — the resolver, rows, copy and
// payload assertions below are untouched.
const SIGNATURE_FN = grab(/function buildSleepSignatureSvg\(answers\) \{[\s\S]*?\n    \}/, "buildSleepSignatureSvg()");
const ANSWER_LABEL_FN = grab(/function answerLabelFor\(questionId, optionId\) \{[\s\S]*?\n    \}/, "answerLabelFor()");
const FIRMNESS_FN = grab(/function firmnessFeel\(score\) \{[\s\S]*?\n    \}/, "firmnessFeel()");
// The real hydration assignments, anchored on the (pinned) BRAND_NOTES_ES
// line above them but TOLERANT about their right-hand sides — so a mutation
// that blanks a map is still extracted and caught by the behavioral
// "maps populate" assertions below, not by an extraction boundary.
const HYDRATE_BLOCK = (() => {
  const m = html.match(
    /BRAND_NOTES_ES    = \(STORE_CONFIG\.salesNotes_es && STORE_CONFIG\.salesNotes_es\.brands\) \|\| \{\};\r?\n\s*(CONSULT_IMPLICATIONS    = [^\n]*;)\r?\n\s*(CONSULT_IMPLICATIONS_ES = [^\n]*;)/);
  check("extracted the two consultation hydration lines", !!m);
  return m ? m[1] + "\n" + m[2] : ";";
})();
// The payload's consultation field — grabbed by boundary (not by exact
// expression) so a mutated projection is still EXTRACTED and its wrong
// behavior OBSERVED, rather than failing at the extraction boundary.
const PAYLOAD_FIELD = (() => {
  const m = html.match(/consultation: [\s\S]*?,(?=\r?\n\s*emailPromotions:)/);
  check("extracted the payload consultation field", !!m);
  return m ? m[0] : "consultation: null,";
})();

// ---------- harness ----------------------------------------------------------
function makeDoc() {
  const els = new Map();
  const make = (id) => ({ id, innerHTML: "", textContent: "", style: {} });
  return {
    els,
    doc: { getElementById: (id) => { if (!els.has(id)) els.set(id, make(id)); return els.get(id); } },
  };
}

// Executes the real resolver stack for one answers/lang/mapping state.
function run(answers, lang, opts) {
  opts = opts || {};
  const { els, doc } = makeDoc();
  const questions = opts.questions || QUIZ.questions;
  const implEn = "implEn" in opts ? opts.implEn
    : CONFIG.salesNotes.consultationImplications;
  const implEs = "implEs" in opts ? opts.implEs
    : CONFIG.salesNotes_es.consultationImplications;
  const out = {};
  new Function("document", "answers", "currentLang", "QUESTIONS",
    "CONSULT_IMPLICATIONS", "CONSULT_IMPLICATIONS_ES", "out",
    `"use strict";
    ${FIRMNESS_FN}
    ${ANSWER_LABEL_FN}
    ${IMPLICATION_FN}
    ${RESOLVER_FN}
    ${SIGNATURE_FN}
    ${RENDER_FN}
    out.resolve = resolveConsultationSummary;
    out.render = renderHf2Brief;
    out.implication = consultImplication;
    out.firmnessFeel = firmnessFeel;
    out.payload = function() { return ({ ${PAYLOAD_FIELD} }).consultation; };
    `)(doc, JSON.parse(JSON.stringify(answers)), lang, questions, implEn, implEs, out);
  return { els, out };
}

// sleep_quality is DELIBERATELY kept in these answer fixtures although the
// question no longer exists: a stale answer for a removed question must be
// ignored by the resolver, never resurface on any surface.
const ANSWERS_A = {
  sleep_quality: "poor", trigger: "pain", mattress_size: "queen",
  sleep_position: "side", temperature: "hot", firmness: 6,
  sleep_issues: ["back_pain", "hot"], health_conditions: ["snoring", "nerve_pain"],
};
const ANSWERS_NONE = {
  sleep_quality: "well", trigger: "browsing", mattress_size: "king",
  sleep_position: "back", temperature: "comfortable", firmness: 4,
  sleep_issues: ["none"], health_conditions: ["none"],
};

// Clinical-style labels that must never surface (from the real quiz).
const CLINICAL = ["Sleep Apnea", "Apnea del Sueño", "Nerve Pain", "Dolor Nervioso",
  "Snoring", "Ronquidos", "Acid Reflux", "Reflujo"];

// ===========================================================================
// 0. THE REAL CONFIG — hydration, completeness, parity (exit 1)
// ===========================================================================
section("real config: hydration and mapping completeness");
{
  const out = {};
  new Function("STORE_CONFIG", "out", `"use strict";
    var CONSULT_IMPLICATIONS = {};
    var CONSULT_IMPLICATIONS_ES = {};
    ${HYDRATE_BLOCK}
    out.en = CONSULT_IMPLICATIONS; out.es = CONSULT_IMPLICATIONS_ES;
    `)(CONFIG, out);
  check("the real hydration lines populate both maps from store-config.json",
    Object.keys(out.en).length === 5 && Object.keys(out.es).length === 5);
  // Content, not just shape: each map must carry ITS OWN language — a
  // swapped pair of hydration lines ships Spanish copy to English kiosks
  // (and vice versa) while both maps still count five questions.
  check("the EN map is the config's EN copy and the ES map the ES copy",
    out.en.trigger.pain === CONFIG.salesNotes.consultationImplications.trigger.pain
    && out.es.trigger.pain === CONFIG.salesNotes_es.consultationImplications.trigger.pain
    && out.en.trigger.pain !== out.es.trigger.pain);
  const quizOptions = {};
  for (const q of QUIZ.questions) {
    if (CONSUMED.includes(q.id)) quizOptions[q.id] = q.options.map((o) => o.id);
  }
  check("all five consumed questions exist in the quiz", Object.keys(quizOptions).length === 5);
  let missing = [], lopsided = 0, entries = 0, omissions = [];
  for (const qid of CONSUMED) {
    for (const oid of quizOptions[qid]) {
      const en = (out.en[qid] || {})[oid];
      const es = (out.es[qid] || {})[oid];
      if (typeof en !== "string" || typeof es !== "string") { missing.push(`${qid}.${oid}`); continue; }
      entries++;
      if ((en.trim() === "") !== (es.trim() === "")) lopsided++;
      if (en.trim() === "" && es.trim() === "") omissions.push(`${qid}.${oid}`);
    }
  }
  // 29 = trigger 5 + sleep_issues 8 + sleep_position 5 + health_conditions 7
  // + temperature 4 (the five-question surface since sleep_quality's removal).
  check(`every consumed option id is mapped in BOTH languages (${entries} pairs, 0 missing)`,
    missing.length === 0 && entries >= 29);
  check("no lopsided pair (EN empty XOR ES empty)", lopsided === 0);
  check("intentional omissions exist and are represented as entries, not holes",
    omissions.length >= 1 && omissions.includes("sleep_issues.none")
    && omissions.includes("health_conditions.none"));
  // The mapping is implication copy, not relabeled quiz labels.
  let labelEcho = 0;
  for (const q of QUIZ.questions) {
    if (!CONSUMED.includes(q.id)) continue;
    for (const o of q.options) {
      const en = ((out.en[q.id] || {})[o.id] || "").toLowerCase();
      const es = ((out.es[q.id] || {})[o.id] || "").toLowerCase();
      const lab = o.label || {};
      const labEn = (typeof lab === "string" ? lab : lab.en || "").toLowerCase();
      const labEs = (typeof lab === "object" && lab.es ? lab.es : "").toLowerCase();
      if (en && labEn && en === labEn) labelEcho++;
      if (es && labEs && es === labEs) labelEcho++;
    }
  }
  check("no implication string merely echoes its quiz label", labelEcho === 0);
  // Copy-rule floor (adversarial finding F1): implications describe what to
  // prioritize/compare/notice/test or the shopping goal — never a
  // second-person condition claim in either language.
  const BANNED = [/\byou are\b/i, /\byou have\b/i, /suffers? from/i,
    /\btienes\b/i, /\bsufres?\b/i, /\beres\b/i, /\bpadeces?\b/i];
  let bannedHits = [];
  for (const maps of [out.en, out.es]) {
    for (const [qid, opts] of Object.entries(maps)) {
      for (const [oid, v] of Object.entries(opts)) {
        if (typeof v === "string" && BANNED.some((re) => re.test(v))) {
          bannedHits.push(`${qid}.${oid}`);
        }
      }
    }
  }
  check("no implication uses a second-person condition construction", bannedHits.length === 0);
}

// ===========================================================================
// 1. THE THREE ROWS — markup order, render, content (exits 2 and 4)
// ===========================================================================
section("static markup: the three rows keep their ids and order");
{
  const ctx = html.indexOf('id="hf2BriefContext"');
  const who = html.indexOf('id="hf2BriefWho"');
  const prof = html.indexOf('id="hf2BriefProfile"');
  check("hf2BriefContext, hf2BriefWho, hf2BriefProfile exist in order",
    ctx !== -1 && who !== -1 && prof !== -1 && ctx < who && who < prof);
  check("all three keep the existing row class (no new component class)",
    (html.match(/class="hf2-brief__row" id="hf2Brief(Context|Who|Profile)"/g) || []).length === 3);
}

section("resolution: EN content is implication copy, size and firmness intact");
{
  const { els, out } = run(ANSWERS_A, "en");
  out.render();
  const vm = out.resolve();
  check("context row: the opener resolves through the mapping (stale sleep_quality ignored)",
    vm.context === "here to solve a comfort problem");
  check("who row: neutral size identity leads, then issue implications in answer order",
    vm.who === "Queen · test lower-back support carefully · prioritize temperature control");
  check("profile row: position, conditions, firmness value, temperature — in order",
    vm.profile === "prioritize shoulder and hip cushioning"
      + " · test head-of-bed elevation on an adjustable base"
      + " · compare gentle, even pressure relief"
      + " · Firm 6/10"
      + " · compare cooling covers and airflow");
  check("the firmness value is the computed feel + score, unchanged",
    vm.profile.includes(out.firmnessFeel(6) + " 6/10"));
  check("the DOM rows carry exactly the resolved strings",
    els.get("hf2BriefContext").textContent === vm.context
    && els.get("hf2BriefWho").textContent === vm.who
    && els.get("hf2BriefProfile").textContent === vm.profile);
  check("no clinical-style quiz label reaches any row",
    CLINICAL.every((s) => !(vm.context + vm.who + vm.profile).includes(s)));
}

section("resolution: Spanish re-renders the same answers with ES copy (exit 3)");
{
  const en = run(ANSWERS_A, "en").out.resolve();
  const { els, out } = run(ANSWERS_A, "es");
  out.render();
  const vm = out.resolve();
  check("[es] context uses Spanish implication copy",
    vm.context === "aquí para resolver un problema de comodidad");
  check("[es] who keeps the neutral size and uses Spanish implications",
    vm.who === "Queen · probar con cuidado el soporte lumbar · priorizar el control de temperatura");
  check("[es] profile is Spanish end to end (firmness feel included)",
    vm.profile.includes("priorizar el acolchado de hombros y caderas")
    && vm.profile.includes("Firme 6/10")
    && vm.profile.includes("comparar fundas frescas y ventilación"));
  check("[es] no EN implication string leaks into the Spanish render",
    !vm.profile.includes("prioritize") && !vm.who.includes("test lower-back")
    && !vm.context.includes("aiming"));
  check("[es] the rows re-render from the same answer state",
    els.get("hf2BriefWho").textContent === vm.who
    && en.who !== vm.who);
}

section("'none' answers resolve to intentional omissions");
{
  const vm = run(ANSWERS_NONE, "en").out.resolve();
  check("who row is just the size when the only issue is 'none'", vm.who === "King");
  check("profile row omits the comfortable-temperature fragment",
    vm.profile === "look for even lumbar support · Medium 4/10");
}

// ===========================================================================
// 2. NO RAW IDS, EVER (exit 5)
// ===========================================================================
section("no option or question id reaches any surface");
{
  const allIds = [];
  for (const q of QUIZ.questions) {
    allIds.push(q.id);
    for (const o of (q.options || [])) allIds.push(o.id);
  }
  const underscoreIds = allIds.filter((id) => id.includes("_"));
  for (const lang of ["en", "es"]) {
    const vm = run(ANSWERS_A, lang).out.resolve();
    const joined = [vm.context, vm.who, vm.profile].join(" | ");
    const frags = [vm.context, vm.who, vm.profile]
      .flatMap((s) => s.split(" · ")).map((s) => s.trim());
    check(`[${lang}] no fragment IS a raw id`, frags.every((f) => !allIds.includes(f)));
    check(`[${lang}] no underscore id appears as a substring`,
      underscoreIds.every((id) => !joined.includes(id)));
  }
}

// ===========================================================================
// 3. FAIL CLOSED — missing, malformed, untranslated (exit 8)
// ===========================================================================
section("missing / malformed / untranslated mappings omit the fragment");
{
  const holedEn = JSON.parse(JSON.stringify(CONFIG.salesNotes.consultationImplications));
  delete holedEn.sleep_issues.back_pain;
  const vm = run(ANSWERS_A, "en", { implEn: holedEn }).out.resolve();
  check("a MISSING entry omits the fragment — no label, no id",
    vm.who === "Queen · prioritize temperature control"
    && !vm.who.includes("Back Pain") && !vm.who.includes("back_pain"));
}
{
  const badEn = JSON.parse(JSON.stringify(CONFIG.salesNotes.consultationImplications));
  badEn.sleep_position.side = 42;
  badEn.temperature = "not-an-object";
  const vm = run(ANSWERS_A, "en", { implEn: badEn }).out.resolve();
  check("a malformed entry (number) and a malformed question (string) both omit, never throw",
    !vm.profile.includes("42") && vm.profile ===
      "test head-of-bed elevation on an adjustable base"
      + " · compare gentle, even pressure relief"
      + " · Firm 6/10");
}
{
  // Untranslated: the ES map has no entry — Spanish OMITS. It never shows the
  // English implication and never the quiz label.
  const holedEs = JSON.parse(JSON.stringify(CONFIG.salesNotes_es.consultationImplications));
  delete holedEs.health_conditions.snoring;
  const vm = run(ANSWERS_A, "es", { implEs: holedEs }).out.resolve();
  check("[es] an untranslated entry omits the fragment in Spanish mode",
    !vm.profile.includes("head-of-bed") && !vm.profile.includes("Snoring")
    && !vm.profile.includes("Ronquidos")
    && vm.profile.includes("comparar un alivio de presión suave y uniforme"));
}
{
  const vm = run(ANSWERS_A, "en", { implEn: {}, implEs: {} }).out.resolve();
  check("empty maps degrade to the two direct values only (size, firmness)",
    vm.context === "" && vm.who === "Queen" && vm.profile === "Firm 6/10");
}
{
  // Whitespace-only mappings are TRUE omissions (Codex, PR #17 final
  // review): the converter normalizes them away, and the resolver trims
  // defensively — a "   " entry must not survive the non-empty filter and
  // join as an orphan " · " fragment on any surface.
  const wsEn = JSON.parse(JSON.stringify(CONFIG.salesNotes.consultationImplications));
  wsEn.sleep_issues.back_pain = "   ";
  wsEn.trigger.pain = "\t\n ";
  const { els, out } = run(ANSWERS_A, "en", { implEn: wsEn });
  out.render();
  const vm = out.resolve();
  const pay = out.payload();
  check("[en] whitespace-only entries omit their fragments exactly",
    vm.context === ""
    && vm.who === "Queen · prioritize temperature control");
  check("[en] the DOM rows and payload carry the same omission — no orphan separators",
    els.get("hf2BriefWho").textContent === vm.who
    && pay.who === vm.who && pay.context === vm.context
    && ![vm.context, vm.who, vm.profile].some((s) =>
      /·\s*·/.test(s) || /^\s*·/.test(s) || /·\s*$/.test(s)));
  const wsEs = JSON.parse(JSON.stringify(CONFIG.salesNotes_es.consultationImplications));
  wsEs.sleep_issues.back_pain = "   ";
  const vmEs = run(ANSWERS_A, "es", { implEs: wsEs }).out.resolve();
  check("[es] a whitespace-only ES entry omits in Spanish mode — never EN copy",
    vmEs.who === "Queen · priorizar el control de temperatura"
    && !vmEs.who.includes("lower-back"));
}
{
  // answerLabelFor fails closed too: an unknown size renders nothing, not the id.
  const vm = run(Object.assign({}, ANSWERS_A, { mattress_size: "bogus_size" }), "en").out.resolve();
  check("an unresolvable size omits — the raw id never renders",
    !vm.who.includes("bogus_size")
    && vm.who === "test lower-back support carefully · prioritize temperature control");
}
{
  // ...on every one of its fail-closed paths (adversarial finding F7): the
  // question absent entirely, and an option whose label is an empty object.
  const noSizeQ = QUIZ.questions.filter((q) => q.id !== "mattress_size");
  const vm1 = run(ANSWERS_A, "en", { questions: noSizeQ }).out.resolve();
  check("a missing mattress_size QUESTION omits — never the raw answer id",
    !vm1.who.includes("queen")
    && vm1.who === "test lower-back support carefully · prioritize temperature control");
  const blankLabelQ = JSON.parse(JSON.stringify(QUIZ.questions));
  blankLabelQ.find((q) => q.id === "mattress_size")
    .options.find((o) => o.id === "queen").label = {};
  const vm2 = run(ANSWERS_A, "en", { questions: blankLabelQ }).out.resolve();
  check("an empty label object omits — never the raw option id",
    !vm2.who.includes("queen") && !vm2.who.includes("Queen"));
}
{
  // Firmness hardening (adversarial finding F8): null and '' must OMIT the
  // fragment — Number(null) and Number('') are 0, which would fabricate a
  // "Plush 0/10" the customer never chose. NaN input omits too.
  for (const [label, v] of [["null", null], ["empty string", ""], ["NaN string", "x"]]) {
    const vm = run(Object.assign({}, ANSWERS_A, { firmness: v }), "en").out.resolve();
    check(`firmness as ${label}: the fragment is omitted, never fabricated`,
      !vm.profile.includes("0/10") && !vm.profile.includes("/10"));
  }
}

// ===========================================================================
// 4. SENTINEL NON-LEAKAGE — labels rebuilt as diagnosis strings (exits 6, 7)
// ===========================================================================
section("sentinel quiz labels cannot reach any surface");
const SENTINEL_QUESTIONS = JSON.parse(JSON.stringify(QUIZ.questions));
for (const q of SENTINEL_QUESTIONS) {
  if (!CONSUMED.includes(q.id)) continue;   // size labels are neutral by design
  for (const o of (q.options || [])) {
    o.label = { en: `XDIAGNOSISX-${q.id}-${o.id}`, es: `XDIAGNOSISX-ES-${q.id}-${o.id}` };
  }
}
{
  for (const lang of ["en", "es"]) {
    const { out } = run(ANSWERS_A, lang, { questions: SENTINEL_QUESTIONS });
    const vm = out.resolve();
    const pay = out.payload();
    check(`[${lang}] sentinel labels never reach the resolved strings`,
      !JSON.stringify(vm).includes("XDIAGNOSISX"));
    check(`[${lang}] ...nor the payload projection`,
      !JSON.stringify(pay).includes("XDIAGNOSISX"));
    check(`[${lang}] the implication copy renders instead`,
      vm.who.includes(lang === "es" ? "soporte lumbar" : "lower-back support"));
  }
}

// ===========================================================================
// 5. ONE VIEW-MODEL — DOM and payload cannot drift
// ===========================================================================
section("the DOM rows and the payload carry the SAME resolved strings");
for (const lang of ["en", "es"]) {
  const { els, out } = run(ANSWERS_A, lang);
  out.render();
  const pay = out.payload();
  check(`[${lang}] payload === DOM for context/who/profile`,
    pay && typeof pay === "object"
    && pay.context === els.get("hf2BriefContext").textContent
    && pay.who === els.get("hf2BriefWho").textContent
    && pay.profile === els.get("hf2BriefProfile").textContent
    && pay.who.length > 0);
  check(`[${lang}] the payload carries exactly context/who/profile`,
    JSON.stringify(Object.keys(pay).sort()) === JSON.stringify(["context", "profile", "who"]));
}

// ===========================================================================
// 6. Code.gs — bounds, allowlist, both MIME parts, sheet row (exits 9, 10)
// ===========================================================================
function buildGas() {
  const log = [];
  const rows = [];
  const sent = [];
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
  return { api, log, rows, sent };
}
function post(api, payload) {
  return JSON.parse(api.doPost({ postData: { contents: JSON.stringify(payload) } }).getContent());
}
function gasPayload(over) {
  return Object.assign({
    storeName: "Test Store", name: "Test Customer", email: "c@example.test",
    phone: "9565550100", sleepProfile: "The Balanced Sleeper",
    topMatch: "Test Mattress", matchPct: "88", meetsMatchThreshold: true,
    discount: 0, dreamCode: "", passExpiration: "", passScope: "", passTerms: "",
    rsa: "", lang: "en",
    allMatches: [{ name: "Test Mattress", brand: "TB", matchPct: "88",
      meetsMatchThreshold: true, imageUrl: "" }],
    accessories: [], emailPromotions: [], promoSpanishDraft: "",
    promoScenario: "", promoDisclosure: "",
    branding: { logoMain: "", logoSub: "", primary: "", accent: "" },
    financing: null, priorities: [],
    consultation: {
      context: "aiming for a real change in nightly rest · here to solve a comfort problem",
      who: "Queen · test lower-back support carefully",
      profile: "prioritize shoulder and hip cushioning · Firm 6/10",
    },
  }, over || {});
}

section("Code.gs: shipped CAN-SPAM refusal still holds (nothing below is vacuous)");
{
  const g = buildGas();
  const res = post(g.api, gasPayload());
  check("doPost refuses with canspam_not_configured", res.error === "canspam_not_configured");
  check("NO email was sent and NO sheet row written", g.sent.length === 0 && g.rows.length === 0);
}

section("Code.gs: the three strings render in the Sleep Brief block, both parts");
{
  const g = buildGas();
  g.api.approveCanSpam();
  const res = post(g.api, gasPayload());
  check("send succeeded via the normal HTML path",
    res.success === true && g.sent.length === 1 && "htmlBody" in g.sent[0].opts);
  const htmlBody = g.sent[0].opts.htmlBody;
  const brief = htmlBody.indexOf("YOUR SLEEP BRIEF");
  const ctx = htmlBody.indexOf("aiming for a real change in nightly rest · here to solve a comfort problem");
  const who = htmlBody.indexOf("Queen · test lower-back support carefully");
  const prof = htmlBody.indexOf("prioritize shoulder and hip cushioning · Firm 6/10");
  check("all three render after the Sleep Brief label, in order",
    brief !== -1 && ctx > brief && who > ctx && prof > who);
  // CONTAINMENT, structurally (adversarial finding F4): the three lines live
  // inside the Sleep Brief block's OWN table cell — from its label to that
  // cell's close — so a mutant that moves them into a new section/card after
  // the block still fails here, not just total removal.
  const briefCell = htmlBody.slice(brief, htmlBody.indexOf("</td></tr>", brief));
  check("…and INSIDE the Sleep Brief cell itself — no new section or card",
    briefCell.includes("aiming for a real change in nightly rest")
    && briefCell.includes("Queen · test lower-back support carefully")
    && briefCell.includes("prioritize shoulder and hip cushioning · Firm 6/10"));
  check("the normal send's text part carries all three lines under the Sleep Brief line",
    g.sent[0].body.includes("Sleep Brief: The Balanced Sleeper\n"
      + "aiming for a real change in nightly rest · here to solve a comfort problem\n"
      + "Queen · test lower-back support carefully\n"
      + "prioritize shoulder and hip cushioning · Firm 6/10\n"));
  check("the sheet row still has exactly 9 cells and none of this content",
    g.rows.length === 1 && g.rows[0].length === 9
    && !g.rows[0].join("|").includes("here to solve a comfort problem"));
}
{
  // The catch path reuses the SAME shared body.
  const ok = buildGas();
  ok.api.approveCanSpam();
  post(ok.api, gasPayload());
  const broken = buildGas();
  broken.api.approveCanSpam();
  broken.api.breakHtmlBuilder();
  const res = post(broken.api, gasPayload());
  check("fallback still succeeds and carries the same body (no drift)",
    res.success === true && !("htmlBody" in broken.sent[0].opts)
    && broken.sent[0].body === ok.sent[0].body
    && broken.sent[0].body.includes("here to solve a comfort problem"));
}
{
  // The SPANISH plain branch carries the lines too (its own branch in
  // buildPlainBody — a mutation there is invisible to the EN checks above).
  const g = buildGas();
  g.api.approveCanSpam();
  post(g.api, gasPayload({ lang: "es", sleepProfile: "El Descansador",
    consultation: {
      context: "buscando un cambio real en el descanso",
      who: "Queen · probar con cuidado el soporte lumbar",
      profile: "priorizar el acolchado · Firme 6/10",
    } }));
  check("[es] the normal send's text part carries all three lines under the brief line",
    g.sent[0].body.includes("Resumen de sueño: El Descansador\n"
      + "buscando un cambio real en el descanso\n"
      + "Queen · probar con cuidado el soporte lumbar\n"
      + "priorizar el acolchado · Firme 6/10\n"));
  check("[es] ...and the HTML part renders them inside the Sleep Brief block",
    (g.sent[0].opts.htmlBody.indexOf("TU RESUMEN DE SUEÑO") !== -1)
    && g.sent[0].opts.htmlBody.indexOf("buscando un cambio real en el descanso")
       > g.sent[0].opts.htmlBody.indexOf("TU RESUMEN DE SUEÑO"));
}

section("Code.gs: bounds, allowlist, hostility");
{
  const g = buildGas();
  g.api.approveCanSpam();
  let seen = null;
  g.api.captureSafeData((d) => { seen = d; });
  const huge = "x".repeat(100000);
  post(g.api, gasPayload({ consultation: {
    context: huge, who: huge, profile: huge,
    rank: 1, answers: { q: "a" }, mattressId: "g1" } }));
  check("each field is truncated to exactly 300",
    seen.consultation.context.length === 300
    && seen.consultation.who.length === 300
    && seen.consultation.profile.length === 300);
  check("extra sub-fields are dropped by the projection",
    JSON.stringify(Object.keys(seen.consultation).sort())
    === JSON.stringify(["context", "profile", "who"]));
}
for (const [label, bad] of [["a string", "zzz"], ["a number", 7], ["null", null],
  ["an array", ["a"]], ["absent", undefined]]) {
  const g = buildGas();
  g.api.approveCanSpam();
  const payload = gasPayload();
  if (bad === undefined) delete payload.consultation; else payload.consultation = bad;
  const res = post(g.api, payload);
  check(`consultation as ${label}: send succeeds, lines cleanly absent`,
    res.success === true && g.sent.length === 1
    && !g.sent[0].body.includes("undefined")
    && !(g.sent[0].opts.htmlBody || "").includes("undefined"));
}
{
  // Blank-only consultation FIELDS drop server-side too (Codex, PR #17
  // final review) — on the normal path, the fallback path, the HTML part,
  // and never in the sheet.
  const g = buildGas();
  g.api.approveCanSpam();
  const broken = buildGas();
  broken.api.approveCanSpam();
  broken.api.breakHtmlBuilder();
  for (const t of [g, broken]) {
    post(t.api, gasPayload({ consultation: {
      context: "   ", who: "\t\n ", profile: "prioritize real copy · Firm 6/10" } }));
  }
  check("blank-only fields drop on the normal path — no blank line under the brief",
    g.sent[0].body.includes("Sleep Brief: The Balanced Sleeper\n"
      + "prioritize real copy · Firm 6/10\n"));
  check("...and the fallback path carries the same shared body",
    broken.sent[0].body === g.sent[0].body);
  check("...and the HTML part renders exactly one consultation line, no blank divs",
    (g.sent[0].opts.htmlBody.match(/prioritize real copy/g) || []).length === 1
    && !g.sent[0].opts.htmlBody.includes(">   <"));
  check("...and the sheet row stays 9 cells with none of it",
    g.rows[0].length === 9 && !g.rows[0].join("|").includes("prioritize real copy"));
}
{
  // Non-string SUB-fields (adversarial finding F5): a client bug shipping an
  // object/array/number in one field must DROP that line, never coerce it —
  // "[object Object]" and "1,2" are not customer content.
  const g = buildGas();
  g.api.approveCanSpam();
  post(g.api, gasPayload({ consultation: {
    context: { a: 1 }, who: [1, 2], profile: "prioritize real copy · Firm 6/10" } }));
  check("non-string sub-fields are dropped, not coerced",
    g.sent.length === 1
    && !g.sent[0].body.includes("[object Object]")
    && !g.sent[0].body.includes("1,2")
    && !(g.sent[0].opts.htmlBody || "").includes("[object Object]")
    && g.sent[0].body.includes("prioritize real copy · Firm 6/10"));
}
{
  const g = buildGas();
  g.api.approveCanSpam();
  post(g.api, gasPayload({ consultation: {
    context: '<script>alert(1)</script>', who: '<b>bold</b> · Queen', profile: "ok" } }));
  const htmlBody = g.sent[0].opts.htmlBody;
  check("hostile markup is escaped in the HTML part",
    !htmlBody.includes("<script>") && htmlBody.includes("&lt;script&gt;"));
  const consultSlice = (g.sent[0].body.split("Sleep Brief: ")[1] || "")
    .split("\n").slice(1, 4).join("\n");
  check("angle brackets are stripped from the text part's consultation lines",
    consultSlice.length > 0 && !/[<>]/.test(consultSlice)
    && consultSlice.includes("bold") && consultSlice.includes("Queen"));
}
{
  // Sentinel labels can also never survive a full client→server round trip:
  // resolve against sentinel QUESTIONS, ship the payload, inspect every
  // server output (exit 6, server half).
  const { out } = run(ANSWERS_A, "en", { questions: SENTINEL_QUESTIONS });
  const g = buildGas();
  g.api.approveCanSpam();
  const broken = buildGas();
  broken.api.approveCanSpam();
  broken.api.breakHtmlBuilder();
  for (const target of [g, broken]) post(target.api, gasPayload({ consultation: out.payload() }));
  check("sentinels absent from HTML body, normal text body, fallback body and sheet",
    !JSON.stringify([g.sent[0].opts.htmlBody, g.sent[0].body,
      broken.sent[0].body, g.rows[0]]).includes("XDIAGNOSISX"));
  check("...while the implication copy arrived",
    g.sent[0].body.includes("test lower-back support carefully"));
}

// ===========================================================================
// 7. THE QUIZ CONTRACT THE MAPPING KEYS AGAINST (exit 11)
// ===========================================================================
section("the consumed quiz surface is pinned (ids unchanged from main)");
{
  const want = {
    trigger: ["pain", "worn_out", "moving", "upgrade", "browsing"],
    sleep_issues: ["back_pain", "hip_pain", "hot", "tossing", "stiff", "sagging", "too_soft", "none"],
    sleep_position: ["side", "back", "stomach", "combo", "no_idea"],
    health_conditions: ["nerve_pain", "allergies", "snoring", "reflux", "extra_support", "getting_older", "none"],
    temperature: ["hot", "comfortable", "cold", "opposite"],
  };
  for (const qid of CONSUMED) {
    const q = QUIZ.questions.find((x) => x.id === qid);
    check(`quiz ${qid}: option ids and order are exactly the pinned set`,
      !!q && JSON.stringify(q.options.map((o) => o.id)) === JSON.stringify(want[qid]));
  }
  const size = QUIZ.questions.find((x) => x.id === "mattress_size");
  check("mattress_size keeps its six neutral options",
    !!size && size.options.length === 6
    && size.options.every((o) => typeof (o.label && o.label.en) === "string"));
}

section("the Python and JS consumed-question lists cannot drift");
{
  // tools/validation.py CONSULTATION_QUESTIONS and resolveConsultationSummary()
  // are a hand-maintained mirror; hold them equal in both directions here so
  // "validated but never rendered" and "rendered but never validated" both
  // fail loudly (the EVENT_FIELDS lesson, applied to this contract).
  const py = readFileSync(join(root, "tools", "validation.py"), "utf8");
  const m = py.match(/CONSULTATION_QUESTIONS = \(([\s\S]*?)\)/);
  check("validation.py declares CONSULTATION_QUESTIONS", !!m);
  const pySet = [...(m ? m[1] : "").matchAll(/"([a-z_]+)"/g)].map((x) => x[1]).sort();
  check("validation.py's set === this suite's CONSUMED set",
    JSON.stringify(pySet) === JSON.stringify([...CONSUMED].sort()));
  const resolved = [...RESOLVER_FN.matchAll(/consultImplication\('([a-z_]+)'/g)]
    .map((x) => x[1]).sort();
  check("the resolver consumes exactly that set through the mapping",
    JSON.stringify([...new Set(resolved)]) === JSON.stringify([...CONSUMED].sort()));
  check("the resolver's only direct label lookup is the neutral size identity",
    [...RESOLVER_FN.matchAll(/answerLabelFor\('([a-z_]+)'/g)].map((x) => x[1])
      .every((id) => id === "mattress_size"));
}

// ===========================================================================
console.log(`\nConsultation summary check: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
