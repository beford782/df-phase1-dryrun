// Financing presentation taxonomy contract — Commit G (Cycle 2).
//
// The renderer used to select three of its four cards by HARDCODED PLAN ID
// (byId['lacks-in-house'] etc.), so renaming a plan id silently dropped cards.
// Classification is now semantic — kind + presentationScenario — in both the
// renderer and tools/validation.py. This test executes the REAL classifier
// extracted from index.html, replays the REAL card selection, and pins that
// the two layers stay in step.
//
// Run: node tests/financing_taxonomy_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const py = readFileSync(join(root, "tools", "validation.py"), "utf8");
const cfg = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));
const PLANS = cfg.financing.plans;

let passed = 0, failed = 0;
const check = (l, c) => { if (c) { passed++; console.log(`  [ok] ${l}`); } else { failed++; console.log(`  [FAIL] ${l}`); } };
function grab(re, name) { const m = html.match(re); check(`${name} extracted`, !!m); return m ? m[0] : ""; }

// --- compile the REAL classifier out of index.html ---
const src = [
  grab(/var FIN_SCENARIO_MEXICO = [^\n]*/, "FIN_SCENARIO_MEXICO"),
  grab(/var FIN_EVERGREEN_KINDS = [^\n]*/, "FIN_EVERGREEN_KINDS"),
  grab(/function finPlanScenario\(p\)\s*\{[\s\S]*?\n    \}/, "finPlanScenario()"),
  grab(/function finPlanGroup\(p\)\s*\{[\s\S]*?\n    \}/, "finPlanGroup()"),
  grab(/function finSafeProvider\(p\)\s*\{[\s\S]*?\n    \}/, "finSafeProvider()"),
  grab(/function finGroupedPlans\(plans\)\s*\{[\s\S]*?\n    \}/, "finGroupedPlans()"),
  grab(/function finPromotionalByProvider\(promoPlans\)\s*\{[\s\S]*?\n    \}/, "finPromotionalByProvider()"),
].join("\n");
const api = new Function(`${src}
  return { finPlanGroup, finGroupedPlans, finPromotionalByProvider, finPlanScenario };`)();
const { finPlanGroup, finGroupedPlans, finPromotionalByProvider } = api;

// Replays the renderer's card sequence from the grouped plans.
function cardSequence(plans) {
  const g = finGroupedPlans(plans);
  const seq = [];
  finPromotionalByProvider(g.promotional).forEach(grp =>
    seq.push({ card: "promotional", provider: grp.provider, plans: grp.plans.map(p => p.id) }));
  g.installment.forEach(p => seq.push({ card: "installment", plans: [p.id] }));
  if (g.evergreen.length) seq.push({ card: "evergreen", plans: g.evergreen.map(p => p.id) });
  if (g["scenario-mexico"][0]) seq.push({ card: "scenario-mexico", plans: [g["scenario-mexico"][0].id] });
  return seq;
}

// 1. the six shipped plans partition exactly once
{
  const groups = PLANS.map(p => finPlanGroup(p));
  check("every shipped plan classifies into a group", groups.every(Boolean));
  const g = finGroupedPlans(PLANS);
  const covered = [].concat(g.promotional, g.installment, g.evergreen, g["scenario-mexico"]).map(p => p.id);
  check("every shipped plan is covered exactly once",
    covered.length === PLANS.length && new Set(covered).size === PLANS.length);
  check("shipped groups are promo=2 installment=1 evergreen=2 scenario=1",
    g.promotional.length === 2 && g.installment.length === 1
    && g.evergreen.length === 2 && g["scenario-mexico"].length === 1);
}

// 2. every allowed kind maps somewhere
for (const [kind, group] of [["open-end-promotional-credit", "promotional"],
                             ["closed-end-installment", "installment"],
                             ["lease-to-own", "evergreen"], ["credit-builder", "evergreen"],
                             ["informational", "evergreen"]]) {
  check(`kind ${kind} -> ${group}`, finPlanGroup({ kind }) === group);
}
check("scenario overrides kind",
  finPlanGroup({ kind: "closed-end-installment", presentationScenario: "mexico-delivery" }) === "scenario-mexico");

// 3/4. scenario classification — HONEST about what runtime does.
// null = key absent (classify by kind); '' = present but unusable (fail closed).
{
  const K = { kind: "closed-end-installment" };
  check("absent scenario classifies by kind", finPlanGroup({ ...K }) === "installment");
  check("supported scenario classifies to the scenario group",
    finPlanGroup({ ...K, presentationScenario: "mexico-delivery" }) === "scenario-mexico");
  // presentationScenario is an ENUM compared EXACTLY. Whitespace padding is
  // NOT normalised: trimming it into validity would let the runtime accept a
  // plan that build validation rejects.
  for (const [label, v] of [["whitespace-padded", "  mexico-delivery  "],
                            ["leading space", " mexico-delivery"],
                            ["trailing space", "mexico-delivery "],
                            ["unknown string", "brazil-delivery"], ["blank string", "   "],
                            ["empty string", ""], ["null", null], ["true", true],
                            ["number", 7], ["array", []], ["object", {}]]) {
    check(`present-but-invalid scenario (${label}) is UNCLASSIFIED, never a kind fallback`,
      finPlanGroup({ ...K, presentationScenario: v }) === "");
  }
  check("only the EXACT enum value reaches the Mexico card",
    finPlanGroup({ ...K, presentationScenario: "mexico-delivery" }) === "scenario-mexico");
  check("an unclassified plan reaches no card at all",
    cardSequence([{ id: "x", kind: "closed-end-installment", presentationScenario: 7 }]).length === 0);
}

// F. provider grouping — prototype safety, ordering, no cross-labelling.
{
  const mk = (id, provider) => ({ id, provider, kind: "open-end-promotional-credit" });
  for (const hostile of ["constructor", "toString", "__proto__", "valueOf", "hasOwnProperty"]) {
    let groups = null, threw = false;
    try { groups = finPromotionalByProvider([mk("a", hostile), mk("b", hostile)]); }
    catch (e) { threw = true; }
    check(`provider "${hostile}" groups without throwing`, !threw);
    check(`provider "${hostile}" yields one card with both offers`,
      !!groups && groups.length === 1 && groups[0].plans.length === 2
      && groups[0].provider === hostile);
  }
  const two = finPromotionalByProvider([mk("a", "Synchrony"), mk("b", "Wells Fargo"), mk("c", "Synchrony")]);
  check("two providers -> two cards in first-appearance order",
    two.length === 2 && two[0].provider === "Synchrony" && two[1].provider === "Wells Fargo");
  check("repeated offers land under their own provider",
    JSON.stringify(two[0].plans.map(p => p.id)) === '["a","c"]'
    && JSON.stringify(two[1].plans.map(p => p.id)) === '["b"]');
  const rev = finPromotionalByProvider([mk("b", "Wells Fargo"), mk("a", "Synchrony"), mk("c", "Synchrony")]);
  check("reordering changes card order but never cross-labels",
    rev[0].provider === "Wells Fargo" && rev[0].plans.length === 1
    && rev[1].provider === "Synchrony" && rev[1].plans.length === 2);
  const all = finPromotionalByProvider([mk("a", "X"), mk("b", "Y"), mk("c", "X")]);
  check("every offer appears exactly once across cards",
    all.reduce((n, g) => n + g.plans.length, 0) === 3
    && new Set(all.flatMap(g => g.plans.map(p => p.id))).size === 3);
  for (const [label, bad] of [["blank", "   "], ["empty", ""], ["number", 123],
                              ["boolean", true], ["null", null], ["object", { en: "A" }],
                              ["missing", undefined]]) {
    const g = finPromotionalByProvider([{ id: "z", provider: bad, kind: "open-end-promotional-credit" }]);
    check(`malformed provider (${label}) degrades to '' — never coerced into a title`,
      g.length === 1 && g[0].provider === "");
  }
}

// Shipped single-provider output pinned against the pre-G parent.
{
  const seq = cardSequence(PLANS).filter(c => c.card === "promotional");
  check("shipped data still yields exactly one promotional card",
    seq.length === 1 && seq[0].provider === "Synchrony");
  check("shipped promotional card holds both offers in config order",
    JSON.stringify(seq[0].plans) === '["synchrony-9-99-72","synchrony-0-48"]');
  check("renderer builds the title from the group's own provider",
    html.includes("? (es ? ('Financiamiento promocional ' + provider)"));
  check("a blank provider degrades to the generic label, not a coerced string",
    html.includes(": (es ? 'Financiamiento promocional' : 'Promotional financing'))"));
}

// ---------------------------------------------------------------------------
// E1. SOURCE-INTEGRITY GUARDS (not behavioural mutation tests).
// auditSource() inspects source shape. Each mutant below must flip its named
// guard to false, which proves the guard is not vacuous — but the mutated code
// is NOT compiled or executed here, so these are source-integrity guards, not
// behavioural proofs. Behavioural proofs follow in E2.
// ---------------------------------------------------------------------------
function auditSource(h, p) {
  return {
    noHardcodedIds: ["lacks-in-house", "lease-to-own", "build-my-credit", "mexico-in-house"]
      .every(id => !h.includes("byId['" + id + "']")),
    noRoleTable: !p.includes("_RENDERER_ROLE_IDS"),
    prototypeSafeProvider: /index = Object\.create\(null\)/.test(h)
      && /Object\.prototype\.hasOwnProperty\.call\(index, key\)/.test(h)
      && !/if \(!\(key in index\)\)/.test(h),
    scenarioFailsClosed: /if \(scenario !== null\)/.test(h)
      && /hasOwnProperty\.call\(p, 'presentationScenario'\)/.test(h),
    unclassifiedRejected: /matches no renderer presentation group/.test(p),
    evergreenAvailabilityOnly: /kind in FINANCING_EVERGREEN_KINDS and exact/.test(p),
    providerContract: /provider is required when financing is enabled/.test(p),
  };
}
const PROD = auditSource(html, py);
for (const [name, ok] of Object.entries(PROD)) check(`production source passes audit: ${name}`, ok);

const MUTANTS = [
  ["semantic Mexico selection -> byId lookup",
   h => h.replace("var mx = groups['scenario-mexico'][0];", "var mx = byId['mexico-in-house'];"),
   p => p, "noHardcodedIds"],
  ["restore an ID-to-role table",
   h => h, p => p + "\n_RENDERER_ROLE_IDS = {}\n", "noRoleTable"],
  ["revert to the unsafe {} + `in` provider index",
   h => h.replace("var groups = [], index = Object.create(null);", "var groups = [], index = {};")
         .replace("if (!Object.prototype.hasOwnProperty.call(index, key)) {", "if (!(key in index)) {"),
   p => p, "prototypeSafeProvider"],
  ["let a malformed scenario fall through to its kind",
   h => h.replace("if (scenario !== null) {", "if (scenario) {"), p => p, "scenarioFailsClosed"],
  // NOTE: this mutant changes only the DIAGNOSTIC PHRASE, so it proves the
  // guard reads the real source — it does NOT prove the validator would accept
  // an unclassified plan. That behavioural protection is proven directly by
  // tools/validation.py --self-test ("unclassifiable plan -> validation error"),
  // which runs the real validate_financing() against a counterexample.
  ["rename the unclassified-plan diagnostic (source marker only)",
   h => h, p => p.replace(/matches no renderer presentation group/g, "silently ignored"),
   "unclassifiedRejected"],
  ["drop the evergreen availability-only rule",
   h => h, p => p.replace("kind in FINANCING_EVERGREEN_KINDS and exact", "False and exact"),
   "evergreenAvailabilityOnly"],
  ["drop the provider contract",
   h => h, p => p.replace("provider is required when financing is enabled", "unused"),
   "providerContract"],
];
for (const [label, mh, mp, key] of MUTANTS) {
  const mutated = auditSource(mh(html), mp(py));
  check(`source guard detects — ${label} (audit.${key} fails)`, mutated[key] === false);
}

// ---------------------------------------------------------------------------
// E2. BEHAVIOURAL MUTATION TESTS. The mutated source is COMPILED and EXECUTED
// against a counterexample, and the wrong behaviour is observed directly.
// ---------------------------------------------------------------------------
{
  const unsafeSrc = src.replace("var groups = [], index = Object.create(null);", "var groups = [], index = {};")
                       .replace("if (!Object.prototype.hasOwnProperty.call(index, key)) {", "if (!(key in index)) {");
  const unsafe = new Function(unsafeSrc + "\nreturn finPromotionalByProvider;")();
  let threw = false;
  try { unsafe([{ id: "a", provider: "constructor", kind: "open-end-promotional-credit" }]); }
  catch (e) { threw = true; }
  check("MUTATION detected behaviourally — the unsafe index throws on 'constructor'", threw);
  let prodThrew = false;
  try { finPromotionalByProvider([{ id: "a", provider: "constructor", kind: "open-end-promotional-credit" }]); }
  catch (e) { prodThrew = true; }
  check("production implementation does NOT throw on the same input", !prodThrew);
}

// ---------------------------------------------------------------------------
// CROSS-LAYER PARITY. The runtime classifier and the build validator must
// agree on EVERY value, not merely on valid input. The validator's expected
// verdict is pinned here by the rules present in validation.py; its behaviour
// is proven directly by tools/validation.py --self-test.
// ---------------------------------------------------------------------------
const SCENARIO_MATRIX = [
  // label,                value,                   runtimeGroup,      validatorAccepts
  ["absent",               undefined,               "installment",     true],
  ["exact supported",      "mexico-delivery",       "scenario-mexico", true],
  ["whitespace-padded",    "  mexico-delivery  ",   "",                false],
  ["unknown string",       "brazil-delivery",       "",                false],
  ["empty string",         "",                      "",                false],
  ["blank string",         "   ",                   "",                false],
  ["null",                 null,                    "",                false],
  ["true",                 true,                    "",                false],
  ["number",               7,                       "",                false],
  ["array",                [],                      "",                false],
  ["object",               {},                      "",                false],
];
for (const [label, value, runtimeGroup, accepted] of SCENARIO_MATRIX) {
  const plan = { kind: "closed-end-installment" };
  if (value !== undefined) plan.presentationScenario = value;
  check(`matrix runtime: ${label} -> ${JSON.stringify(runtimeGroup)}`,
    finPlanGroup(plan) === runtimeGroup);
  // Parity rule: a present value reaches the Mexico card at runtime IF AND
  // ONLY IF the validator accepts it.
  const reachesMexico = finPlanGroup(plan) === "scenario-mexico";
  const presentAndValid = value !== undefined && accepted;
  check(`matrix parity: ${label} — runtime scenario card === validator accepts`,
    reachesMexico === presentAndValid);
}
check("validator supports exactly one scenario enum value",
  /FINANCING_SCENARIOS = \{"mexico-delivery"\}/.test(py));
check("validator compares the scenario without trimming it into validity",
  !/presentationScenario[\s\S]{0,200}\.strip\(\) in FINANCING_SCENARIOS/.test(py));
check("runtime compares the scenario exactly (no .trim())",
  /return typeof v === 'string' \? v : '';/.test(html));
check("unclassified and scenario plans are both excluded from handoff chips",
  /chipGroup !== 'promotional'[\s\S]{0,120}chipGroup !== 'evergreen'/.test(html));


// Behavioural mutation 2: let the scenario fall through to its kind.
{
  const fallthroughSrc = src.replace("if (scenario !== null) {", "if (scenario) {");
  const mutated = new Function(`${fallthroughSrc}\nreturn finPlanGroup;`)();
  const probe = { kind: "closed-end-installment", presentationScenario: null };
  check("MUTATION detected behaviourally — fall-through misclassifies a null scenario as installment",
    mutated(probe) === "installment");
  check("production classifier leaves it unclassified", finPlanGroup(probe) === "");
}

// Behavioural mutation 3: re-introduce trimming.
{
  const trimSrc = src.replace("return typeof v === 'string' ? v : '';",
                              "return typeof v === 'string' ? v.trim() : '';");
  const mutated = new Function(`${trimSrc}\nreturn finPlanGroup;`)();
  const padded = { kind: "closed-end-installment", presentationScenario: "  mexico-delivery  " };
  check("MUTATION detected behaviourally — trimming accepts a value the validator rejects",
    mutated(padded) === "scenario-mexico");
  check("production classifier rejects the padded value", finPlanGroup(padded) === "");
}

console.log(`\nFinancing taxonomy check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
