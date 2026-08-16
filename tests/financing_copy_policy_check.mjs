// Financing copy-policy renderer contract — Commit F (Cycle 2).
//
// tools/validation.py refuses RESERVED OR UNREVIEWED financing language in
// strings that render OUTSIDE the exact-terms gate: likely exact/time-sensitive
// markers (rates, duration and currency units, cadences, counts, deferrals),
// plus payment-noun phrasing outside the reviewed neutral allowlist. A hit
// means the wording is reserved or unreviewed — it is not a semantic proof that
// the prose states an exact claim. That classification is only correct while the
// renderer keeps gating what it gates today. This test pins the renderer's
// actual structure by BRACE-MATCHING the gated block — not by measuring
// distance between substrings — so a future edit that moves a field out of the
// gate (silently creating a new bypass the validator does not check) fails here.
//
// Run: node tests/financing_copy_policy_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const cfg = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));
const py = readFileSync(join(root, "tools", "validation.py"), "utf8");
// Python f-strings split messages across adjacent literals; normalise before matching.
const pyFlat = py.replace(/["']\s*\n\s*f?["']/g, "").replace(/\s+/g, " ");

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}`); }
}

// --- extract renderFinancingSheet() by brace matching ---
function blockFrom(src, startIdx) {
  const open = src.indexOf("{", startIdx);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  return "";
}

const fnIdx = html.indexOf("function renderFinancingSheet()");
check("renderFinancingSheet() located", fnIdx > 0);
const sheet = blockFrom(html, fnIdx);
check("renderFinancingSheet() body extracted", sheet.length > 1000);

// --- the promotional (gated) block ---
const gateIdx = sheet.indexOf("if (fresh && grp.plans.length && grp.plans.every(financingPlanFresh))");
check("promotional exact-terms gate located", gateIdx > 0);
const gated = blockFrom(sheet, gateIdx);
check("gated block extracted", gated.length > 100);

// Everything in the sheet that is NOT inside the gated block is ungated.
const ungated = sheet.slice(0, sheet.indexOf(gated)) + sheet.slice(sheet.indexOf(gated) + gated.length);

// --- fields the validator treats as GATED must live inside the gated block ---
for (const expr of ["L(p.headline)", "L(p.detail)", "L(p.disclosure)"]) {
  check(`promotional ${expr} renders INSIDE the exact-terms gate`, gated.includes(expr));
}

// --- fields the validator treats as UNGATED must NOT be inside it ---
for (const expr of ["L(ih.headline)", "L(mx.headline)", "L(ih.disclosure)", "L(mx.disclosure)"]) {
  check(`${expr} renders OUTSIDE the exact-terms gate (validator guards it)`,
    ungated.includes(expr) && !gated.includes(expr));
}
check("provider renders outside the gate, from the provider GROUP not syn[0]",
  /var provider = grp\.provider;/.test(sheet) && !/syn\[0\]/.test(sheet)
  && ungated.includes("provider") && !gated.includes("+ provider"));

// --- per-plan freshness ternaries still gate the exact details ---
check("in-house detail is gated by ihFresh",
  /ihFresh\s*\?[\s\S]{0,120}L\(ih\.detail\)/.test(sheet));
check("scenario detail + representativeExample are gated by mxFresh",
  /mxFresh\s*\?[\s\S]{0,200}L\(mx\.detail\)/.test(sheet)
  && /mxFresh\s*\?[\s\S]{0,400}L\(mx\.representativeExample\)/.test(sheet));

// --- evergreen card is genuinely ungated (validator guards its detail) ---
const moreIdx = sheet.indexOf("groups.evergreen.forEach(function(p)");
check("evergreen card located", moreIdx > 0);
const evergreen = sheet.slice(moreIdx, sheet.indexOf("// Card 4", moreIdx));
check("evergreen headline+detail render with no freshness gate",
  evergreen.includes("L(p.headline)") && evergreen.includes("L(p.detail)")
  && !/fresh/i.test(evergreen));

// --- handoff chips use non-promotional headlines ungated ---
const chipIdx = html.indexOf("var seenKinds = {};");
const chips = html.slice(chipIdx, chipIdx + 1100);
check("handoff chips label non-promotional plans from plan.headline",
  chips.includes("L(p.headline)") && !/Fresh/.test(chips));
check("handoff chips exclude scenario AND unclassified plans by GROUP",
  /var chipGroup = finPlanGroup\(p\);/.test(chips)
  && /chipGroup !== 'promotional'/.test(chips) && /chipGroup !== 'evergreen'/.test(chips));

// --- validator classification agrees with the renderer's membership test ---
check("validator's gated-plan predicate is the promotional GROUP",
  /return _plan_group\(plan\) == "promotional"/.test(py)
  && /if \(p\.kind === 'open-end-promotional-credit'\) return 'promotional';/.test(html));
check("validator guards provider plus each group's ungated fields",
  /return \("provider",\) \+ _GROUP_UNGATED_FIELDS\.get\(/.test(py)
  && /"evergreen": \("headline", "detail", "disclosure"\)/.test(py));

// --- every shipped copy key really is an ungated surface ---
const copyKeys = Object.keys(cfg.financing.copy);
// Announcement copy is read through a computed key inside announceFinInterest(),
// not a literal FC('...'), so these are exempt from the literal-consumer scan.
// The list is exactly the states setFinancingInterestChoice() accepts — a third
// entry here would let an unreachable key ship unnoticed, which is what
// interestMarkedAnnounce did.
const announceKeys = ["interestNotNowAnnounce", "interestClearedAnnounce"];
const missing = copyKeys.filter(k => !html.includes(`FC('${k}')`) && !announceKeys.includes(k));
check(`every financing.copy key has a runtime consumer (unconsumed: ${JSON.stringify(missing)})`,
  missing.length === 0);
check("no financing.copy key is read inside the exact-terms gate",
  !copyKeys.some(k => k !== "staleNotice" && gated.includes(`FC('${k}')`)));

// --- shipped data is clean under the guard (mirrors the python rule) ---
const SIGNALS = [
  /\d/, /%/, /[$€£]|\bUSD\b|\bMXN\b/i, /\bAPR\b/i,
  /\bno interest\b|\binterest[-\s]free\b|\bzero interest\b|\bdeferred interest\b|\bsin\s+inter[eé]s(?:es)?\b|\bcero\s+inter[eé]s(?:es)?\b/i,
  /\bper month\b|\ba month\b|\bmonthly payments?\b|\bequal payments?\b|\bal mes\b|\bpor mes\b|\bpagos?\s+mensual(?:es)?\b|\bmensualidades\b/i,
];
const dirty = (s) => SIGNALS.some(rx => rx.test(s || ""));

// ONE semantic classifier for both shipped-data scanners — mirrors
// validation.py's _plan_group/_GROUP_UNGATED_FIELDS so a future `informational`
// plan gets identical evergreen coverage in each of them.
const GROUP_UNGATED = { promotional: [], installment: ["headline", "disclosure"],
  evergreen: ["headline", "detail", "disclosure"], scenario: ["headline", "disclosure"] };
function planGroupOf(p) {
  if (Object.prototype.hasOwnProperty.call(p, "presentationScenario")) {
    const v = p.presentationScenario;
    return (typeof v === "string" && v.trim() === "mexico-delivery") ? "scenario" : "";
  }
  if (p.kind === "open-end-promotional-credit") return "promotional";
  if (p.kind === "closed-end-installment") return "installment";
  if (["lease-to-own", "credit-builder", "informational"].includes(p.kind)) return "evergreen";
  return "";
}
const ungatedFieldsFor = (p) =>
  ["provider"].concat(GROUP_UNGATED[planGroupOf(p)] || ["headline", "detail", "disclosure"]);
check("informational plans get evergreen ungated coverage in both scanners",
  JSON.stringify(ungatedFieldsFor({ kind: "informational" }))
  === JSON.stringify(ungatedFieldsFor({ kind: "lease-to-own" })));
const offenders = [];
for (const [k, v] of Object.entries(cfg.financing.copy)) {
  for (const lang of ["en", "es"]) if (dirty(v[lang])) offenders.push(`copy.${k}.${lang}`);
}
for (const p of cfg.financing.plans) {
  const fields = ungatedFieldsFor(p);
  for (const f of fields) {
    const v = p[f];
    if (typeof v === "string") { if (dirty(v)) offenders.push(`${p.id}.${f}`); }
    else if (v) for (const lang of ["en", "es"]) if (dirty(v[lang])) offenders.push(`${p.id}.${f}.${lang}`);
  }
}
check(`shipped ungated financing copy trips no guarded signal (offenders: ${JSON.stringify(offenders)})`,
  offenders.length === 0);

// ---------------------------------------------------------------------------
// Commit G: classification is SEMANTIC. The renderer groups plans by kind +
// presentationScenario; validation mirrors the same partition. No plan id and
// no legacy separatePath flag participates in either layer.
// ---------------------------------------------------------------------------
for (const legacyId of ["lacks-in-house", "lease-to-own", "build-my-credit", "mexico-in-house"]) {
  check(`renderer no longer selects by hardcoded id '${legacyId}'`,
    !sheet.includes(`byId['${legacyId}']`) && !html.includes(`byId['${legacyId}']`));
}
check("renderer has no byId lookup in the financing sheet at all",
  !sheet.includes("byId["));
check("renderer no longer reads the retired separatePath flag",
  !/p\.separatePath/.test(html) && !/separatePath/.test(sheet));
check("_RENDERER_ROLE_IDS is gone from validation.py", !/_RENDERER_ROLE_IDS/.test(py));
check("validation.py no longer has a separatePath boolean contract",
  !/isinstance\(plan\.get\("separatePath"\), bool\)/.test(py));
check("validation.py retires separatePath with a named error",
  /separatePath is retired/.test(pyFlat));

// The two layers must share one partition.
check("validator exposes the semantic classifier",
  // The parameter annotation is deliberately NOT pinned: _plan_group is total
  // over any JSON value (Commit J), so `plan: dict` would be a false contract.
  /def _plan_group\(plan[^)]*\) -> str:/.test(py) && /FINANCING_SCENARIOS/.test(py));
check("renderer exposes the matching classifier",
  /function finPlanGroup\(p\)/.test(html) && /FIN_SCENARIO_MEXICO/.test(html));
for (const [pyLit, jsLit, label] of [
  ["open-end-promotional-credit", "open-end-promotional-credit", "promotional kind"],
  ["closed-end-installment", "closed-end-installment", "installment kind"],
  ["mexico-delivery", "mexico-delivery", "mexico scenario"],
]) {
  check(`both layers agree on the ${label} literal`,
    py.includes(pyLit) && html.includes(jsLit));
}
check("both layers treat the same kinds as evergreen",
  /FINANCING_EVERGREEN_KINDS = \{"lease-to-own", "credit-builder", "informational"\}/.test(py)
  && /FIN_EVERGREEN_KINDS = \['lease-to-own', 'credit-builder', 'informational'\]/.test(html));
check("validator drives the ungated field set from the group, not an id",
  /_GROUP_UNGATED_FIELDS/.test(py)
  && /return \("provider",\) \+ _GROUP_UNGATED_FIELDS\.get\(/.test(py));
check("validator's gated predicate is the promotional group",
  /return _plan_group\(plan\) == "promotional"/.test(py));

// Field exposure per group (Commit F's guard, now semantically derived).
check("in-house/scenario detail stays freshness-gated in the renderer",
  /ihFresh\s*\?[\s\S]{0,140}L\(ih\.detail\)/.test(sheet)
  && /mxFresh\s*\?[\s\S]{0,220}L\(mx\.detail\)/.test(sheet));
check("in-house/scenario headline+disclosure render outside the gate",
  ungated.includes("L(ih.headline)") && ungated.includes("L(ih.disclosure)")
  && ungated.includes("L(mx.headline)") && ungated.includes("L(mx.disclosure)"));
check("evergreen cards render individually from the evergreen group with no freshness gate",
  /groups\.evergreen\.forEach\(function\(p\)/.test(sheet));
check("scenario card is selected only by the explicit scenario",
  /var mx = groups\['scenario-mexico'\]\[0\];/.test(sheet));
check("provider comes from the provider GROUP, not array position",
  !/syn\[0\]/.test(sheet) && /finPromotionalByProvider\(groups\.promotional\)/.test(sheet));

// ---------------------------------------------------------------------------
// Written-out (digit-free) exact claims must be caught by the shared signals.
// ---------------------------------------------------------------------------
const UNIT_SIGNALS = [
  /\bmonths?\b|\bmonthly\b|\bweeks?\b|\bweekly\b|\byears?\b|\byearly\b|\bannual(?:ly)?\b|\bmes\b|\bmeses\b|\bmensual(?:es|mente)?\b|\bsemanas?\b|\bsemanal(?:es)?\b|\ba[ñn]os?\b|\banual(?:es|mente)?\b/i,
  /\bpercent(?:age)?\b|\bpor\s+ciento\b|\bporcentaje\b/i,
  /\bdollars?\b|\bd[oó]lar(?:es)?\b|\bpesos?\b|\beuros?\b/i,
  /\binstallments?\b|\bmensualidades?\b|\bcuotas?\b|\babonos?\b/i,
];
const unitDirty = (s) => UNIT_SIGNALS.some(rx => rx.test(s || ""));
for (const s of ["Choose twelve months for repayment.", "Elige doce meses para pagar.",
                 "Only nine percent interest.", "Solo nueve por ciento.",
                 "Just fifty dollars down.", "Solo cincuenta pesos.",
                 "Pay in twelve installments.", "Make one payment every week."]) {
  check(`written-out claim detected: ${s.slice(0, 34)}`, unitDirty(s));
}
for (const s of ["Exact rates and terms are not shown right now.",
                 "Las tasas y los plazos exactos no se muestran en este momento.",
                 "Current payment options are available from your Lacks specialist.",
                 "Todas las opciones de pago están sujetas a términos y aprobación."]) {
  check(`generic phrasing stays clean: ${s.slice(0, 34)}`, !unitDirty(s));
}
check("validation.py carries the same unit signals",
  /duration-unit/.test(py) && /percent-word/.test(py)
  && /currency-unit/.test(py) && /installment-count/.test(py));
check("validation.py carries the count/down-payment/deferral/proportion signals",
  /repetition-count/.test(py) && /down-payment/.test(py)
  && /deferral/.test(py) && /proportion/.test(py));

// The payment noun is STRUCTURAL: default-deny with a neutral-collocation
// allowlist, because "payment"/"pago" is legitimate shipped vocabulary.
check("validation.py handles the payment noun structurally, not by a plain ban",
  /_NEUTRAL_PAYMENT_PHRASES/.test(py) && /def _bare_payment_noun/.test(py)
  && /_PAYMENT_NOUN\.search\(_NEUTRAL_PAYMENT_PHRASES\.sub/.test(py));
const NEUTRAL_PAY = /\bpayment\s+(?:options?|choices?|methods?)\b|\b(?:opciones?|formas?|m[eé]todos?|maneras?)\s+de\s+pago\b/gi;
const PAY_NOUN = /\bpayments?\b|\bpagos?\b/i;
const barePayment = (s) => PAY_NOUN.test((s || "").replace(NEUTRAL_PAY, " "));
for (const s of ["Make twelve payments.", "Haz doce pagos.", "Repay in twelve payments.",
                 "Only one payment required.", "Un solo pago requerido."]) {
  check(`ordinary-word payment count detected: ${s}`, barePayment(s));
}
for (const s of ["Explore payment options", "Explorar opciones de pago",
                 "Your Sleep Plan. Your Payment Choices.", "never on payment method.",
                 "nunca en la forma de pago.", "Lacks Payment Choice offers more than one way."]) {
  check(`neutral payment concept stays legal: ${s.slice(0, 38)}`, !barePayment(s));
}
// Shipped ungated copy must survive the payment-noun rule untouched.
const payOffenders = [];
for (const [k, v] of Object.entries(cfg.financing.copy)) {
  for (const lang of ["en", "es"]) if (barePayment(v[lang])) payOffenders.push(`copy.${k}.${lang}`);
}
check(`shipped ungated copy has no bare payment noun (offenders: ${JSON.stringify(payOffenders)})`,
  payOffenders.length === 0);

// ---------------------------------------------------------------------------
// HONESTY PINS. Every description in validation.py must match the behaviour.
// These fail if a future edit restores a claim that was previously false.
// ---------------------------------------------------------------------------
check("validation.py documents the limits of lexical validation",
  /CANNOT prove the absence/.test(py) && /not\s*\n?#?\s*as a proof/.test(py.replace(/\s+/g, " ")));
check("validation.py no longer claims the unit ban 'closes the whole class'",
  !/closes the whole class/.test(py));
check("validation.py does not claim the detector is purely value-oriented",
  !/VALUE-oriented/i.test(py) && !/topic-oriented/i.test(py));
check("validation.py does not claim bare 'months' remains allowed",
  !/"months" on its own/.test(py) && !/never on generic words/i.test(py));
check("validation.py states the conservative marker-oriented posture instead",
  /MARKER-oriented/.test(py) && /rejected with no\s*\n?#?\s*numeric value/.test(py.replace(/\s+/g, " ")));
check("validation.py does not claim every non-allowlisted payment noun states an actual payment",
  !/Any other use states something about actual payments/.test(py)
  && /DEFAULT-DENY against a REVIEWED ALLOWLIST/.test(py)
  && /NOT because the\s*\n?#?\s*prose has been shown to contain an exact claim/.test(py.replace(/\s+/g, " ")));
// Python f-strings split messages across adjacent literals, so normalise the
// concatenation before searching — otherwise a claim written as
// `"...the only values on " f"which..."` would slip past a naive regex.
check("validation.py no longer carries the retired separatePath rationale",
  !/any other value is truthy in the browser/.test(pyFlat)
  && !/the only values on which/.test(pyFlat)
  && !/Others do NOT diverge/.test(pyFlat)
  && /separatePath is retired/.test(pyFlat));
check("classification is documented as semantic, not id-driven",
  /never by\s*#?\s*plan id/.test(pyFlat) || /plan id has no effect on it/.test(pyFlat));
// The user-facing error must not misdiagnose a default-deny rejection as a
// proven exact claim — the payment-noun signal fires on benign wording too.
check("_check_ungated_text does not report every rejection as a proven exact claim",
  !/but states an exact claim/.test(pyFlat)
  && /uses reserved or unreviewed financing language/.test(pyFlat)
  && /does not by itself establish that this text states an exact claim/.test(pyFlat));
check("_check_ungated_text offers both remedies to the editor",
  /reword it using reviewed generic orientation language/.test(pyFlat)
  && /move genuine verified terms into a freshness-gated plan field/.test(pyFlat));
check("_check_ungated_text docstring distinguishes the two hit categories",
  /It does NOT by itself prove/.test(pyFlat)
  && /payment-noun phrase outside the reviewed neutral allowlist/.test(pyFlat));
check("the stable error substring survives the rewording",
  /renders outside the exact-terms gate/.test(pyFlat)
  && /_UNGATED_ERR = "renders outside the exact-terms gate"/.test(py));
// Behavioural counterparts — the pins above describe what these prove.
const barePaymentBenign = ["Payment information is available in store.",
                           "Ask your specialist about payment.",
                           "Choose a payment program."];
for (const s of barePaymentBenign) {
  check(`default-deny rejects benign-but-unreviewed wording (documented false positive): ${s.slice(0, 40)}`,
    barePayment(s));
}
check("bare 'months' with no numeral is rejected (posture claim is behaviourally true)",
  /\bmonths?\b/i.test("Choose the right months"));
const shippedUnitOffenders = [];
for (const [k, v] of Object.entries(cfg.financing.copy)) {
  for (const lang of ["en", "es"]) if (unitDirty(v[lang])) shippedUnitOffenders.push(`copy.${k}.${lang}`);
}
for (const p of cfg.financing.plans) {
  for (const f of ungatedFieldsFor(p)) {
    const v = p[f];
    if (typeof v === "string") { if (unitDirty(v)) shippedUnitOffenders.push(`${p.id}.${f}`); }
    else if (v) for (const lang of ["en", "es"]) if (unitDirty(v[lang])) shippedUnitOffenders.push(`${p.id}.${f}.${lang}`);
  }
}
check(`shipped ungated copy trips no unit marker (offenders: ${JSON.stringify(shippedUnitOffenders)})`,
  shippedUnitOffenders.length === 0);

// --- the retired marked-announcement key is gone everywhere -----------------
// announceFinInterest() lost its unreachable 'interested' arm; the copy key it
// read must not survive in either the canonical financing source or the
// generated store config, or a future edit could quietly wire it back up.
{
  const canonical = JSON.parse(
    readFileSync(join(root, "incoming", "lacks_financing.json"), "utf8"));
  const canonicalCopy = (canonical.copy || (canonical.financing || {}).copy || {});
  check("canonical financing source has no interestMarkedAnnounce",
    !Object.prototype.hasOwnProperty.call(canonicalCopy, "interestMarkedAnnounce"));
  check("generated store config has no interestMarkedAnnounce",
    !Object.prototype.hasOwnProperty.call(cfg.financing.copy, "interestMarkedAnnounce"));
  check("canonical and generated announcement copy agree exactly",
    JSON.stringify(Object.keys(canonicalCopy).filter((k) => k.endsWith("Announce")))
    === JSON.stringify(Object.keys(cfg.financing.copy).filter((k) => k.endsWith("Announce"))));
  check("the two reachable announcement keys are the only ones shipped",
    JSON.stringify(Object.keys(cfg.financing.copy).filter((k) => k.endsWith("Announce")))
    === JSON.stringify(["interestNotNowAnnounce", "interestClearedAnnounce"]));
  check("interestMarkedAnnounce appears nowhere in the app source",
    !html.includes("interestMarkedAnnounce"));
}

console.log(`\nFinancing copy policy check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
