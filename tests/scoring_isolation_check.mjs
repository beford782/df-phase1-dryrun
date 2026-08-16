// Scoring isolation check — executes the real calculateScores().
//
// CLAUDE.md states the invariant twice: "Sleep fit first, payment choice
// second — financing NEVER affects scoring, tiers, or the Sleep Brief", and
// "Do not modify scoring weights or logic without confirming with Blake. This
// area has had significant prior tuning."
//
// Both statements lived only in prose. Nothing executed the scoring engine, so
// a mutation making the financing agenda a scoring input:
//     if (financingAgenda['plan:x']) { ...scores[m.id] += 40 }
// survived every suite, as did 10x-ing the locally-made bonus — enough to
// invert Gold/Silver/Bronze ordering and the "top 3 scoring >= 60% of top"
// qualification rule.
//
// This suite compiles calculateScores() against the real shipped catalogue and
// quiz, and asserts:
//   1. scores are byte-identical across every financing state;
//   2. the documented weights still hold (firmness ladder, the per-feature
//      cap, the >=4 diff penalty — the locally-made +25 was retired by owner
//      ruling 2026-08-13, and the engine may not read the flag at all);
//   3. golden pins on the shipped catalogue, so a silent retune is visible.
//
// Run: node tests/scoring_isolation_check.mjs     (exit 0 = all pass)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const MATTRESSES = JSON.parse(readFileSync(join(root, "data", "mattresses.json"), "utf8"));
const QUIZ = JSON.parse(readFileSync(join(root, "data", "quiz.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " - " + detail : ""}`); }
  return cond;
}

const m = html.match(/function calculateScores\(\)\s*\{[\s\S]*?\n    \}/);
if (!check("extracted calculateScores()", !!m)) process.exit(1);

// The engine reads MATTRESSES, QUESTIONS, answers and currentLang from module
// scope. Financing state (financingAgenda / financingExplored) is deliberately
// declared here too: if the engine ever starts reading it, this harness will
// happily supply it — and the equality assertions below will catch it.
const engine = new Function("MATTRESSES", "QUESTIONS", `
  var answers = {}, currentLang = 'en';
  var financingAgenda = {}, financingAgendaDismissed = false, financingExplored = false;
  ${m[0]}
  return function (a, lang, finAgenda, finExplored) {
    answers = a; currentLang = lang;
    financingAgenda = finAgenda; financingAgendaDismissed = finAgenda === null;
    financingExplored = finExplored;
    return calculateScores();
  };`)(MATTRESSES, QUIZ.questions);

const ANSWER_SETS = {
  "side sleeper, hot, back pain": {
    sleep_quality: "poor", trigger: "pain", mattress_size: "queen",
    partner_sleep: "partner", partner_disturbance: "yes_often",
    sleep_position: "side", body_type: "average", temperature: "hot",
    firmness: 4, current_mattress_age: "eight_fifteen",
    sleep_issues: ["back_pain", "hot"], health_conditions: ["snoring"]
  },
  "solo, firm, no issues": {
    sleep_quality: "well", trigger: "upgrade", mattress_size: "king",
    partner_sleep: "solo", sleep_position: "back", body_type: "athletic",
    temperature: "comfortable", firmness: 8,
    current_mattress_age: "under_2", sleep_issues: ["none"],
    health_conditions: ["none"]
  },
  "plus body, plush, reflux": {
    sleep_quality: "fair", trigger: "worn_out", mattress_size: "full",
    partner_sleep: "family", partner_disturbance: "sometimes",
    sleep_position: "combo", body_type: "plus", temperature: "cold",
    firmness: 2, current_mattress_age: "fifteen_plus",
    sleep_issues: ["hip_pain", "sagging"], health_conditions: ["reflux"]
  }
};

// Every financing state the app can be in.
const FIN_STATES = [
  [{}, false], [{}, true],
  [{ "promotional:synchrony": true }, false],
  [{ "plan:lacks-in-house": true, "plan:lease-to-own": true }, true],
  [null, false], [null, true]
];

// --- 1. Financing state cannot move a single point --------------------------
console.log("Financing state does not affect scoring:");
for (const [name, answers] of Object.entries(ANSWER_SETS)) {
  for (const lang of ["en", "es"]) {
    const base = engine(answers, lang, {}, false);
    const baseJson = JSON.stringify(base.scores);
    for (const [agenda, explored] of FIN_STATES) {
      const got = engine(answers, lang, agenda, explored);
      check(`[${lang}] ${name} - scores identical across agenda state/explored=${explored}`,
        JSON.stringify(got.scores) === baseJson);
    }
    // Match reasons are the Sleep Brief's raw material; they must not move either.
    const reasonsJson = JSON.stringify(base.matchReasons);
    const withInterest = engine(answers, lang, { "scenario:mexico-delivery": true }, true);
    check(`[${lang}] ${name} - match reasons identical too`,
      JSON.stringify(withInterest.matchReasons) === reasonsJson);
  }
}

// --- 2. The scoring engine never mentions financing at all ------------------
console.log("The engine's source contains no financing identifier:");
for (const id of ["financingAgenda", "financingAgendaDismissed", "financingExplored", "getFinancingConfig",
                  "financingTermsFresh", "exactPromotionsEnabled", "FC(",
                  // 0.5: consultation-priority state must never feed scoring —
                  // the priorities shape consultation copy only, and the
                  // engine may not so much as name their store.
                  "trialFocus", "renderHf2Priorities",
                  // Daybreak PR 1 (owner ruling 2026-08-13): the locally-made
                  // +25 bonus is retired. Origin is data-only and the engine
                  // may not read the flag — a reintroduction fails here.
                  "locallyMade", "Made locally", "Hecho localmente"]) {
  check(`calculateScores() does not reference ${id}`, !m[0].includes(id));
}

// --- 3. Documented weights still hold ---------------------------------------
// From CLAUDE.md: firmness is a linear slide (50 - diff*10, floored at 0) with
// an extra -20 once diff >= 4; the per-feature cap is 5. The locally-made +25
// bonus was retired by owner ruling 2026-08-13 (Daybreak PR 1) — origin must
// not alter sleep-fit ranking — so the expected math carries no origin term
// and the engine may not read the flag at all (asserted in section 2 above).
console.log("Documented scoring weights hold:");
const all = Object.values(MATTRESSES).flat();
{
  // Isolate firmness by supplying ONLY the firmness answer.
  const at = (v) => engine({ firmness: v }, "en", {}, false).scores;
  for (const target of [1, 5, 10]) {
    const s = at(target);
    for (const mm of all) {
      const diff = Math.abs(mm.firmness - target);
      let expected = Math.max(0, 50 - diff * 10);
      if (diff >= 4) expected -= 20;
      if (s[mm.id] !== expected) {
        check(`firmness ${target}: ${mm.id} scores ${expected}`, false,
          `got ${s[mm.id]}`);
        break;
      }
    }
  }
  check("firmness ladder reproduces exactly for every model (no origin term)",
    [1, 5, 10].every(t => {
      const s = at(t);
      return all.every(mm => {
        const d = Math.abs(mm.firmness - t);
        let e = Math.max(0, 50 - d * 10);
        if (d >= 4) e -= 20;
        return s[mm.id] === e;
      });
    }));
}

// --- 3b. The per-feature cap actually caps ----------------------------------
// FEATURE_CAP=5 exists so overlapping signals cannot run a score away. The
// documented example is exactly this one: "hot sleeper + 'too hot' issue".
// temperature/hot awards cooling=3 and sleep_issues/hot awards cooling=3, so a
// cooling mattress would gain 6 uncapped and must gain 5. Measured as a DELTA
// over a baseline that already includes the first answer, so the assertion does
// not depend on catalogue-wide absolute values — and so BOTH raising and
// lowering the cap is visible.
console.log("The per-feature cap caps:");
{
  const FIRM = 5;
  const carriers = all.filter(mm => (mm.features || []).includes("cooling"));
  check("catalogue has models carrying cooling", carriers.length > 0, `${carriers.length}`);
  const CAP = 5;
  const ANS = { firmness: FIRM, temperature: "hot", sleep_issues: ["hot"] };
  const base = engine({ firmness: FIRM }, "en", {}, false).scores;
  const both = engine(ANS, "en", {}, false).scores;

  // Expected feature contribution, computed analytically from the quiz data:
  // per feature, sum the awards from the supplied answers, then apply the cap.
  // Any change to FEATURE_CAP — up OR down — makes this disagree with the engine.
  const opts = [];
  for (const [qid, ansVal] of Object.entries(ANS)) {
    const q = QUIZ.questions.find(x => x.id === qid);
    if (!q || q.type === "slider") continue;
    for (const sel of Array.isArray(ansVal) ? ansVal : [ansVal]) {
      const o = (q.options || []).find(x => x.id === sel);
      if (o && o.scores) opts.push(o);
    }
  }
  const expectedDelta = (mm) => {
    const tot = {};
    for (const o of opts) {
      for (const [f, p] of Object.entries(o.scores)) {
        if (!(mm.features || []).includes(f)) continue;
        const cur = tot[f] || 0;
        tot[f] = cur + Math.max(0, Math.min(p, CAP - cur));
      }
    }
    return Object.values(tot).reduce((a, b) => a + b, 0);
  };
  const wrong = all.filter(mm => (both[mm.id] - base[mm.id]) !== expectedDelta(mm));
  check("feature awards match the analytic cap model for EVERY model",
    wrong.length === 0,
    wrong.slice(0, 3).map(mm =>
      `${mm.id}: got +${both[mm.id] - base[mm.id]} want +${expectedDelta(mm)}`).join(" | "));
  check("the fixture actually exercises the cap (cooling 3+3 would exceed it)",
    carriers.some(mm => {
      let raw = 0;
      for (const o of opts) if (o.scores.cooling && (mm.features || []).includes("cooling")) raw += o.scores.cooling;
      return raw > CAP;
    }));
}

// --- 4. GOLDEN PINS: fixed expected winners, scores and qualified counts ----
// An earlier version of this section asserted only that a winner existed and
// that the qualified set was non-empty and no larger than the catalogue —
// which is true of almost any scoring function, and pinned nothing. These are
// real pins: the exact top-5 (id, score) ordering, the winning score, and the
// size of the ">= 60% of top" qualified set, captured from the shipped
// catalogue and quiz.
//
// They are INTENTIONALLY brittle. CLAUDE.md requires Blake's sign-off before
// scoring weights or logic change, and the golden bundle already pins
// data/mattresses.json, so a diff here means either a deliberate retune or an
// unreviewed one — both worth stopping for. Regenerate only alongside an
// approved scoring or catalogue change, never to make a red build green.
// Regenerated 2026-08-13 alongside the owner-approved retirement of the
// locally-made +25 bonus (Daybreak PR 1) — the previous pins carried the
// bonus inside every locally-made model's score.
const GOLDEN = {
  "side sleeper, hot, back pain": {
    top5: [["g5", 55], ["s6", 55], ["s7", 53], ["b3", 50], ["g7", 50]], qualified: 15
  },
  "solo, firm, no issues": {
    top5: [["b6", 55], ["s10", 55], ["s2", 55], ["g8", 54], ["g1", 46]], qualified: 13
  },
  "plus body, plush, reflux": {
    top5: [["g4", 53], ["g2", 52], ["g6", 52], ["s3", 47], ["s7", 47]], qualified: 9
  }
};
console.log("Golden pins on the shipped catalogue:");
for (const [name, answers] of Object.entries(ANSWER_SETS)) {
  const { scores } = engine(answers, "en", {}, false);
  // Ranking is id-tiebroken so the pin is deterministic across engines.
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const want = GOLDEN[name];
  check(`${name}: top-5 ids and scores match the pin`,
    JSON.stringify(ranked.slice(0, 5)) === JSON.stringify(want.top5),
    `got ${JSON.stringify(ranked.slice(0, 5))}`);
  check(`${name}: winning score is exactly ${want.top5[0][1]}`,
    ranked[0][1] === want.top5[0][1], `got ${ranked[0][1]}`);
  const qualified = ranked.filter(([, v]) => v >= ranked[0][1] * 0.6);
  check(`${name}: qualified set (>=60% of top) is exactly ${want.qualified}`,
    qualified.length === want.qualified, `got ${qualified.length}`);
  // EN and ES must rank identically — language must not reorder results.
  const es = engine(answers, "es", {}, false).scores;
  check(`${name}: EN and ES produce identical scores`,
    JSON.stringify(scores) === JSON.stringify(es));
}

console.log(`\nScoring isolation check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
