// Trust integrity and transparency gate (Phase 1 cross-cutting, 2026-08-21).
//
// The gate's premise is that the app must tell the truth about itself: what a
// quiz answer changes, what leaves the device, who sees the answers, and how
// strong a match claim is. Each section below pins one of those truths to the
// code that makes it true, so the copy cannot drift away from the behaviour
// without this suite going red:
//
//   A. copy <-> engine correspondence — every canonical question has a row in
//      docs/quiz-copy-engine-correspondence.md whose cited score tags are the
//      question's real tags, the inert-tag set recorded there equals the set
//      computed from the shipped catalog, the shipped help lines are the lines
//      the document records, and no banned claim (weights, size filter, health
//      outcome, "easy fix", "best", ...) appears in any help line.
//   B. the heritage / trust-story rail is absent from production (no
//      quiz.trustStories, no validator contract, no renderer, no CLAUDE.md
//      paragraph) — the prototype is research, not product.
//   C. privacy voice — the template carries no privacy promise of its own; the
//      data-use sentence is dictionary copy in two mode variants selected at
//      runtime by the same gasUrl truth the send path uses; the network-sink
//      set that makes it true is pinned; the build gate exists and is tested.
//   D. tier-relativity legibility — (added with the legibility commit)
//
// Run: node tests/trust_integrity_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const html = read("index.html");
const norm = html.replace(/\r\n/g, "\n");
const QUIZ = JSON.parse(read("data", "quiz.json"));
const CANON = JSON.parse(read("incoming", "dreamfinder_quiz.json"));
const MATTRESSES = JSON.parse(read("data", "mattresses.json"));
const DOC = read("docs", "quiz-copy-engine-correspondence.md").replace(/\r\n/g, "\n");
const VALIDATION = read("tools", "validation.py");
const CLAUDE_MD = read("CLAUDE.md");

let checks = 0, failures = 0;
function ok(name, cond, detail = "") {
  checks++;
  if (!cond) failures++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  return !!cond;
}
function section(t) { console.log(`\n== ${t} ==`); }

// ================================================================ A. copy <-> engine
section("A — copy <-> engine correspondence (docs/quiz-copy-engine-correspondence.md)");

const questions = QUIZ.questions;
const canonical = CANON.quiz.questions;
ok("the generated quiz and its canonical source carry the same ten ids in the same order",
  questions.length === 10 && canonical.length === 10
  && questions.every((q, i) => q.id === canonical[i].id));

// One heading per canonical question, numbered by position, and nothing else.
const headings = [...DOC.matchAll(/^### (\d+)\. ([a-z_]+)\s*$/gm)].map((m) => ({ n: Number(m[1]), id: m[2] }));
ok("every canonical question has exactly one numbered section, in quiz order, and there are no extra sections",
  headings.length === questions.length
  && headings.every((h, i) => h.n === i + 1 && h.id === questions[i].id),
  headings.map((h) => `${h.n}.${h.id}`).join(","));

// The section text for one question id.
function sectionFor(id) {
  const start = DOC.indexOf(`\n### ${headings.findIndex((h) => h.id === id) + 1}. ${id}\n`);
  if (start < 0) return "";
  const rest = DOC.slice(start + 1);
  const next = rest.slice(1).search(/\n### \d+\. /);
  return next < 0 ? rest : rest.slice(0, next + 1);
}
function field(sec, label) {
  const m = sec.match(new RegExp(`^- \\*\\*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\*\\*\\s*(.*)$`, "m"));
  return m ? m[1].trim() : null;
}
function tagsOf(q) {
  const set = new Set();
  (q.options || []).forEach((o) => Object.keys(o.scores || {}).forEach((t) => set.add(t)));
  return set;
}

// Cited tags must be EXACTLY the question's real score tags — no invented
// mechanism, and no live mechanism left undocumented.
for (const q of questions) {
  const sec = sectionFor(q.id);
  const cited = field(sec, "Cited tags");
  const real = tagsOf(q);
  const citedSet = new Set(cited === null || /^none\b/i.test(cited)
    ? [] : cited.replace(/\.$/, "").split(",").map((s) => s.trim()).filter(Boolean));
  const same = citedSet.size === real.size && [...real].every((t) => citedSet.has(t));
  ok(`${q.id}: the document cites exactly the question's real score tags`, cited !== null && same,
    `cited=[${[...citedSet].join(",")}] real=[${[...real].join(",")}]`);
}

// Zero-scoring questions are named as such.
const zeroScoring = questions.filter((q) => q.type !== "slider" && tagsOf(q).size === 0).map((q) => q.id);
ok("the two zero-scoring questions are trigger and mattress_size (engine fact)",
  zeroScoring.join(",") === "trigger,mattress_size");
ok("the document names the zero-scoring questions in its engine section",
  /\*\*Zero-scoring questions\.\*\*\s*`trigger` and `mattress_size`/.test(DOC));

// The inert-tag set recorded in the document equals the set computed from the
// shipped catalog. When 3.1 (case-fold) or 3.2 (vocabulary) ships, this fails
// on purpose: every help line must be re-audited against the new engine truth.
const catalogFeatures = new Set();
Object.values(MATTRESSES).forEach((list) => list.forEach((m) => (m.features || []).forEach((f) => catalogFeatures.add(f))));
const allTags = new Set();
questions.forEach((q) => tagsOf(q).forEach((t) => allTags.add(t)));
const inert = [...allTags].filter((t) => !catalogFeatures.has(t)).sort();
const docInert = (DOC.match(/`Inert tags: ([^`]*)`/) || [null, ""])[1].split(",").map((s) => s.trim()).filter(Boolean).sort();
ok("the inert-tag set recorded in the document equals the set computed from data/mattresses.json",
  inert.length === docInert.length && inert.every((t, i) => t === docInert[i]),
  `computed=[${inert.join(",")}] documented=[${docInert.join(",")}]`);
ok("the catalog still matches score tags case-sensitively (3.1 is locked; the copy was written for this)",
  /m\.features\?\.includes\(feat\)/.test(norm));

// The shipped help lines are the lines the document records, in both languages.
for (const q of questions) {
  const sec = sectionFor(q.id);
  const en = field(sec, "Current EN") ?? field(sec, "Current EN (unchanged)");
  const es = field(sec, "Current ES (provisional)") ?? field(sec, "Current ES (unchanged)");
  ok(`${q.id}: the shipped EN help line is the one the document records`, en !== null && en === q.helpText.en,
    en === q.helpText.en ? "" : `doc="${en}" shipped="${q.helpText.en}"`);
  ok(`${q.id}: the shipped ES help line is the one the document records`, es !== null && es === q.helpText.es,
    es === q.helpText.es ? "" : `doc="${es}" shipped="${q.helpText.es}"`);
}
for (const q of questions) {
  for (const v of (q.copyVariants || [])) {
    if (!v || !v.helpText) continue;
    const sec = sectionFor(q.id);
    const line = field(sec, "Couples variant EN/ES (unchanged, `copyVariants`)");
    ok(`${q.id}: the copy-variant help line is the one the document records (EN / ES)`,
      line !== null && line === `${v.helpText.en} / ${v.helpText.es}`, line === null ? "no variant line in the document" : `doc="${line}"`);
  }
}
ok("the canonical source and the generated bundle carry identical help lines (pipeline, not hand edits)",
  questions.every((q, i) => q.helpText.en === canonical[i].helpText.en && q.helpText.es === canonical[i].helpText.es));

// Banned claims. Each phrase is one the investigation found shipped, or one
// the gate forbids outright (numeric weights, outcomes, availability, feel
// promises, exclamation, markup — help lines are inserted unescaped).
const BANNED_EN = [
  /easy fix/i, /\bbiggest\b/i, /\bbest\b/i, /\bunmatched\b/i, /fits your space/i, /\bin stock\b/i,
  /fast delivery/i, /made in texas/i, /\brelieves?\b/i, /stops? snoring/i, /\bcures?\b/i, /\btreats?\b/i,
  /guarantee/i, /\bnever\b/i, /trusted for/i, /\d/, /!/, /[<&]/
];
const BANNED_ES = [
  /\bfácil\b/i, /\bmayores?\b/i, /\bmejor(es)?\b/i, /garantiz/i, /\bcura\b/i, /\balivia\b/i,
  /se ajusten a tu espacio/i, /clave para/i, /\bnunca\b/i, /\bsiempre\b/i, /\d/, /!/, /¡/, /[<&]/
];
function helpLines(q) {
  const out = [["en", q.helpText.en], ["es", q.helpText.es]];
  (q.copyVariants || []).forEach((v) => {
    if (v && v.helpText) out.push(["en", v.helpText.en], ["es", v.helpText.es]);
  });
  return out;
}
for (const q of questions) {
  const hits = [];
  for (const [lang, text] of helpLines(q)) {
    const rules = lang === "en" ? BANNED_EN : BANNED_ES;
    rules.forEach((re) => { if (re.test(text || "")) hits.push(`${lang}:${re}`); });
    if (!text || !text.trim()) hits.push(`${lang}:empty`);
  }
  ok(`${q.id}: no banned claim, digit, exclamation or markup in any help line (EN, ES, variants)`, hits.length === 0, hits.join(" "));
}

// The overclaims the investigation found are gone from the shipped copy.
ok("the three shipped overclaims and the benefit claim are gone in both languages",
  !/fits your space|biggest clue|easy fix|first upgrades you'll feel|se ajusten a tu espacio|clave para un sueño|mayores mejoras/i
    .test(JSON.stringify(questions.map((q) => q.helpText))));
ok("the size line does not claim availability",
  !/available|availability|disponib/i.test(questions.find((q) => q.id === "mattress_size").helpText.en
    + questions.find((q) => q.id === "mattress_size").helpText.es));
ok("the health line names no condition-to-product pairing as a treatment",
  !/snor|reflux|reflujo|ronqu|pain|dolor/i.test(questions.find((q) => q.id === "health_conditions").helpText.en
    + questions.find((q) => q.id === "health_conditions").helpText.es));
ok("the document records the re-audit triggers (scores, catalog tags, priorities, accessories, consultation, email)",
  /Code\/data locations that trigger a re-audit/.test(DOC) && /calculateScores\(\)/.test(DOC)
  && /resolveConsultationSummary\(\)/.test(DOC) && /scoreAccessoriesFromAnswers\(\)/.test(DOC));
ok("the document records the verification date and the outstanding approvals (owner sign-off, native ES)",
  /\*\*Verification date:\*\* 2026-08-21/.test(DOC) && /sign-off as governed quiz copy[\s\S]{0,160}still owed/.test(DOC)
  && /NATIVE REVIEW REQUIRED/.test(DOC));

// ================================================================ B. no heritage rail
section("B — the trust-story / heritage rail is absent from production");
ok("data/quiz.json has no trustStories block (retailer prose never enters the quiz contract)",
  !("trustStories" in QUIZ) && !JSON.stringify(QUIZ).includes("trustStories"));
ok("incoming/dreamfinder_quiz.json has no trustStories block", !JSON.stringify(CANON).includes("trustStories"));
ok("index.html has no story-rail renderer, CSS or loader",
  !/quizTrustStoryMarkup|noct-quiz-trust|__DF_QUIZ_TRUST_STORIES|trustStories/.test(norm));
ok("tools/validation.py has no trustStories contract and no unknown_root tightening",
  !/trustStories|unknown_root/.test(VALIDATION));
ok("CLAUDE.md carries no paragraph legitimizing trustStories in quiz.json", !/trustStories/.test(CLAUDE_MD));
ok("the quiz root contract is still exactly {questions} (no widening for retailer prose)",
  Object.keys(QUIZ).join(",") === "questions" && Object.keys(CANON.quiz).join(",") === "questions");

// ================================================================ C. privacy voice
section("C — privacy voice: one data-use truth, selected by deployment mode, pinned to the sinks");

const dictEn = JSON.parse(read("data", "dict-en.json"));
const dictEs = JSON.parse(read("data", "dict-es.json"));
const STORE = JSON.parse(read("data", "store-config.json"));
const DEMO_STORE = JSON.parse(read("demo", "black-friday", "data", "store-config.json"));
const CODE_GS = read("Code.gs");
// Executable text only: HTML comments and whole-line // comments stripped, so
// a comment that MENTIONS a sink or a promise is not mistaken for one.
const code = norm.replace(/<!--[\s\S]*?-->/g, "").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
// ...and with trailing `// ...` comments removed too (a URL's `//` is never
// preceded by whitespace, so `http://www.w3.org/2000/svg` survives).
const code2 = code.replace(/\s\/\/.*$/gm, "");

// C1. The template carries no privacy promise of its own.
const TEMPLATE_PROMISES = [
  /never sold/i, /nunca se vende/i, /never shared/i, /nunca se comparte/i, /unsubscribe anytime/i,
  /cancelar la suscripci/i, /third parties/i, /\banonymous\b/i, /\banónim/i, /nothing is stored/i,
  /deleted immediately/i, /cleared when you finish/i, /we do not collect/i, /never sent anywhere/i
];
{
  const hits = TEMPLATE_PROMISES.filter((re) => re.test(code)).map(String);
  ok("index.html carries no template-hardcoded privacy promise (EN or ES)", hits.length === 0, hits.join(" "));
}
ok("the email screen's static promise span is gone (markup and renderer)",
  !/emailPrivacyStatic/.test(norm));
ok("the email privacy lead is retailer config in BOTH languages (text / text_es merged), or nothing",
  /setText\('emailPrivacyLead', localizedConfigBlock\('text'\)\.emailPrivacy \|\| ''\);/.test(norm)
  && !/Solo usaremos tu correo/.test(norm) && !/We'll only use your email/.test(norm));
ok("the privacy-overlay body and the email lead have EMPTY pre-config placeholders and hydrate to config or nothing",
  /<span data-store="privacy-body"><\/span>/.test(norm)
  && /<span id="emailPrivacyLead" data-store="email-privacy"><\/span>/.test(norm)
  && /el\.textContent = textBlock\.privacyBody \|\| '';/.test(norm)
  && /el\.textContent = textBlock\.emailPrivacy \|\| '';/.test(norm)
  && /<span data-store="privacy-policy-contact"><\/span>/.test(norm)
  && /el\.textContent = textBlock\.privacyPolicyContact \|\| '';/.test(norm));
ok("the retailer's configured privacy lead exists in both languages (so the email screen is not blank here)",
  typeof STORE.text.emailPrivacy === "string" && STORE.text.emailPrivacy.trim().length > 0
  && typeof STORE.text_es.emailPrivacy === "string" && STORE.text_es.emailPrivacy.trim().length > 0);

// C2. The dictionary carries both mode variants and the audience line, in both languages.
const KEYS = ["privacy.data_use_preview", "privacy.data_use_live", "review.help"];
ok("both dictionaries carry the two data-use variants and review.help, non-empty and genuinely translated",
  KEYS.every((k) => typeof dictEn[k] === "string" && dictEn[k].trim() && typeof dictEs[k] === "string" && dictEs[k].trim()
    && dictEn[k] !== dictEs[k]));
ok("the Spanish values are Spanish and the English values are English (no half-translated string)",
  KEYS.every((k) => /\b(tus|tu|se usan|resultados|especialista|respuestas)\b/i.test(dictEs[k]) && !/\b(your|during|restart|matches|specialist)\b/i.test(dictEs[k])
    && !/\b(tus|respuestas|especialista|resultados)\b/i.test(dictEn[k])));
ok("the preview and live variants differ in both languages",
  dictEn["privacy.data_use_preview"] !== dictEn["privacy.data_use_live"]
  && dictEs["privacy.data_use_preview"] !== dictEs["privacy.data_use_live"]);
const ABSOLUTES = [/\bnever\b/i, /\banonymous\b/i, /\bnothing is stored\b/i, /deleted immediately/i, /cleared when you finish/i,
  /\bnunca\b/i, /\banónim/i, /\bno se guarda nada\b/i, /unsubscribe/i, /suscripci/i, /\d/, /!/, /¡/, /[<&]/];
for (const k of KEYS) {
  const hits = ABSOLUTES.filter((re) => re.test(dictEn[k]) || re.test(dictEs[k])).map(String);
  ok(`${k}: no absolute promise, subscription, digit, exclamation or markup (EN, ES)`, hits.length === 0, hits.join(" "));
}
// The preview sentence is the one the validator would reject under a live
// endpoint; the live sentence is not. Runtime and build gate agree on what
// "preview wording" is.
const PREVIEW_SIGNALS = [/stays? on this tablet/i, /permanecen? en esta tableta/i, /nothing is sent/i, /no se envía nada/i];
ok("the preview variant carries a preview-mode signal phrase in both languages (what the validator rejects under a live gasUrl)",
  PREVIEW_SIGNALS.some((re) => re.test(dictEn["privacy.data_use_preview"]))
  && PREVIEW_SIGNALS.some((re) => re.test(dictEs["privacy.data_use_preview"])));
ok("the preview variant says Restart clears the answers — and the confirmed Restart does (Gate 1B wipe)",
  /Restart clears them\.$/.test(dictEn["privacy.data_use_preview"]) && /Reiniciar las borra\.$/.test(dictEs["privacy.data_use_preview"])
  && /resetSessionState\(\{ reason: 'confirmed_new_customer' \}\)/.test(norm));
{
  // ...of the DOM too: every container that renders answer-derived prose is in
  // the wipe inventory, including the four Sleep System containers the
  // privacy audit found still holding the previous customer's text.
  const inventory = (norm.match(/var SESSION_CONTENT_IDS = \[([\s\S]*?)\];/) || [null, ""])[1];
  ok("the wipe inventory includes the four Sleep System containers (answer-derived prose)",
    ["sleepSystemMain", "sleepSystemGuidance", "sleepSystemRail", "sleepSystemPlanList"].every((id) => inventory.includes(`'${id}'`)));
  const textInventory = (norm.match(/var SESSION_TEXT_IDS = \[([\s\S]*?)\];/) || [null, ""])[1];
  ok("the text wipe inventory includes the drawer's answer-derived lines (shortlist fit, pillow prompt title and reason)",
    ["drawerShortlistFit", "drawerSystemPromptTitle", "drawerSystemPromptReason"].every((id) => textInventory.includes(`'${id}'`)));
}
ok("the live variant makes sending conditional on the customer's choice and never claims nothing leaves",
  /sent only if you choose to email/i.test(dictEn["privacy.data_use_live"]) && /solo se envían si eliges/i.test(dictEs["privacy.data_use_live"])
  && !/stays? on this tablet|nothing is sent/i.test(dictEn["privacy.data_use_live"])
  && !/permanecen? en esta tableta|no se envía nada a ning/i.test(dictEs["privacy.data_use_live"]));
ok("the Review audience line names both products of the answers: the matches and the specialist's summary",
  /matches/.test(dictEn["review.help"]) && /specialist/.test(dictEn["review.help"])
  && /resultados/.test(dictEs["review.help"]) && /especialista/.test(dictEs["review.help"]));
ok("the Review line does not claim the specialist sees only finalists, nor that answers are transmitted",
  !/only|finalist|not your full|sent|transmit/i.test(dictEn["review.help"]) && !/solo|finalista|envía/i.test(dictEs["review.help"]));

// C3. One shared mode truth, executed.
const fnSrc = (anchor) => {
  const start = norm.indexOf(anchor);
  if (start < 0) return null;
  let i = norm.indexOf("{", start), depth = 1; i++;
  while (i < norm.length && depth > 0) { if (norm[i] === "{") depth++; else if (norm[i] === "}") depth--; i++; }
  return norm.slice(start, i);
};
const liveSrc = fnSrc("function emailDeliveryLive()");
const dataUseSrc = fnSrc("function renderDataUseStatement()");
ok("emailDeliveryLive() and renderDataUseStatement() exist", !!liveSrc && !!dataUseSrc);
ok("renderNocturnalLanding() renders the data-use statement and the email screen derives preview mode from the same helper",
  /renderDataUseStatement\(\);/.test(fnSrc("function renderNocturnalLanding()") || "")
  && /var isDemoMode = !emailDeliveryLive\(\);/.test(norm));
function liveFor(gasUrl, blocks) {
  return new Function("STORE_CONFIG", "getActivePromotionScenario", liveSrc + "\nreturn emailDeliveryLive();")(
    { gasUrl }, () => (blocks ? { disableEmailSubmission: true } : null));
}
// The send path's own gate, extracted verbatim and evaluated over the same matrix.
const sendGate = norm.match(/const isEmailPreview = ([^;]+);/);
function sendPreviewFor(gasUrl, blocks) {
  return new Function("gasUrl", "scenarioBlocksEmail", `return (${sendGate[1]});`)(gasUrl, blocks);
}
{
  const matrix = [["", false], ["", true], ["https://script.google.com/macros/s/x/exec", false], ["https://script.google.com/macros/s/x/exec", true]];
  const agree = matrix.every(([g, b]) => liveFor(g, b) === !sendPreviewFor(g, b));
  ok("emailDeliveryLive() agrees with sendResults()'s own preview gate over the whole (gasUrl x scenario-block) matrix", !!sendGate && agree);
  ok("blank gasUrl -> not live; live gasUrl -> live; a scenario that disables submission -> not live even with a gasUrl",
    liveFor("", false) === false && liveFor("https://x/exec", false) === true && liveFor("https://x/exec", true) === false);
}
ok("the POST to gasUrl is still gated on both conditions (the helper mirrors it, it does not replace it)",
  /if \(gasUrl && !scenarioBlocksEmail\) \{/.test(norm));

// C4. The renderer, executed: preview text here, live text under a live endpoint, nothing on a missing variant.
function renderDataUse({ gasUrl = "", blocks = false, dict = dictEn } = {}) {
  const el = { textContent: "<untouched>", hidden: true };
  const doc = { getElementById: (id) => (id === "landingDataUse" ? el : null) };
  const t = (key) => (Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key);
  new Function("document", "t", "STORE_CONFIG", "getActivePromotionScenario",
    liveSrc + "\n" + dataUseSrc + "\nrenderDataUseStatement();")(doc, t, { gasUrl }, () => (blocks ? { disableEmailSubmission: true } : null));
  return el;
}
{
  const shipped = renderDataUse({ gasUrl: STORE.gasUrl });
  ok("with the shipped config (gasUrl blank) the Welcome line is the PREVIEW sentence, visible",
    shipped.hidden === false && shipped.textContent === dictEn["privacy.data_use_preview"]);
  const es = renderDataUse({ gasUrl: STORE.gasUrl, dict: dictEs });
  ok("...and the Spanish preview sentence in Spanish", es.hidden === false && es.textContent === dictEs["privacy.data_use_preview"]);
  const live = renderDataUse({ gasUrl: "https://script.google.com/macros/s/x/exec" });
  ok("under a live endpoint the Welcome line is the LIVE sentence — never the preview one",
    live.hidden === false && live.textContent === dictEn["privacy.data_use_live"]);
  const blocked = renderDataUse({ gasUrl: "https://script.google.com/macros/s/x/exec", blocks: true });
  ok("a scenario that disables submission makes the preview sentence true again, and it is shown",
    blocked.hidden === false && blocked.textContent === dictEn["privacy.data_use_preview"]);
  const missing = renderDataUse({ dict: Object.fromEntries(Object.entries(dictEn).filter(([k]) => k !== "privacy.data_use_preview")) });
  ok("a missing variant renders NOTHING — not the key, not the other mode's sentence — and hides the element",
    missing.hidden === true && missing.textContent === "");
  const blank = renderDataUse({ dict: { ...dictEn, "privacy.data_use_preview": "   " } });
  ok("a blank variant is treated as missing", blank.hidden === true && blank.textContent === "");
}
ok("the Welcome line is a plain paragraph in reading order: hidden and empty until rendered, not focusable, not live, no role",
  /<p class="landing-data-use" id="landingDataUse" hidden><\/p>/.test(norm)
  && !/id="landingDataUse"[^>]*(tabindex|aria-live|role=)/.test(norm));
ok("the Welcome line is body size (16px) in the landing's muted ink",
  /\.landing-data-use \{[^}]*font-size: 16px;[^}]*color: var\(--landing-muted, var\(--color-text-muted\)\);/.test(norm));
ok("the Review help line reads the dictionary audience statement, and the old inline claim is gone",
  /if \(help\) help\.textContent = t\('review\.help'\);/.test(norm)
  && !/specialist builds your recommendations|construiremos tu combinación/.test(norm));

// C4b. The CALL SITE, executed: the real renderNocturnalLanding() (with the
// real localizedConfigBlock, emailDeliveryLive and renderDataUseStatement, and
// stubs for the landing's other collaborators) populates #landingDataUse from
// the shipped config and dictionary. A regex on the call text could not tell
// a live call from a dead one (found in review); this executes it.
{
  const landingSrc = fnSrc("function renderNocturnalLanding()");
  const lcbSrc = fnSrc("function localizedConfigBlock(key)");
  ok("renderNocturnalLanding() and localizedConfigBlock() extracted", !!landingSrc && !!lcbSrc);
  function runLanding({ lang = "en", dict = dictEn, gasUrl = STORE.gasUrl, mutate = null } = {}) {
    const els = new Map();
    const mk = (id) => ({ id, textContent: "<untouched>", hidden: true, innerHTML: "", style: {}, classList: { add() {}, remove() {}, contains() { return false; } } });
    const doc = {
      getElementById: (id) => { if (!els.has(id)) els.set(id, mk(id)); return els.get(id); },
      querySelector: (sel) => { if (!els.has(sel)) els.set(sel, mk(sel)); return els.get(sel); }
    };
    const t = (key) => (Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key);
    let body = lcbSrc + "\n" + liveSrc + "\n" + dataUseSrc + "\n" + landingSrc + "\nrenderNocturnalLanding();";
    if (mutate) body = mutate(body);
    new Function("document", "t", "STORE_CONFIG", "currentLang", "getActivePromotionScenario", "getSavingsPassConfig",
      "financingEnabled", "savingsPassEnabled", "FC", "L", "updateLanguageControls", body)(
      doc, t, { ...STORE, gasUrl }, lang, () => null, () => ({}), () => false, () => false, () => "",
      (o) => (o && typeof o === "object" ? (o[lang] || o.en || "") : o), () => {});
    return els.get("landingDataUse");
  }
  const en = runLanding();
  ok("executing the real Welcome renderer with the shipped config populates the data-use line with the EN preview sentence",
    !!en && en.hidden === false && en.textContent === dictEn["privacy.data_use_preview"]);
  const es = runLanding({ lang: "es", dict: dictEs });
  ok("...and with the Spanish dictionary, the ES preview sentence",
    !!es && es.hidden === false && es.textContent === dictEs["privacy.data_use_preview"]);
  const live = runLanding({ gasUrl: "https://script.google.com/macros/s/x/exec" });
  ok("...and under a live gasUrl, the live sentence — from the same call site", !!live && live.textContent === dictEn["privacy.data_use_live"]);
  const dead = runLanding({ mutate: (b) => b.replace("      renderDataUseStatement();", "      if (false) renderDataUseStatement();") });
  ok("control: a dead call site is detected (the line would never render)", dead === undefined || dead.textContent === "<untouched>");
}
ok("the Review help placeholder in the static markup is EMPTY (the audience line is dictionary copy rendered at runtime; no stale claim in the pre-render DOM)",
  /<p class="noct-quiz-help" id="reviewHelp"><\/p>/.test(norm) && !/Make sure everything looks right/.test(norm));

// C5. The shipped operating state makes the preview sentence the true one, in production and in the demo.
ok("production store-config gasUrl is blank and the demo bundle's is forced blank (the preview sentence is the shipped statement)",
  STORE.gasUrl === "" && DEMO_STORE.gasUrl === "");

// C6. The network-sink set that makes the sentence true, pinned. A new sink
// of any kind changes one of these counts and must be reviewed against the
// sentence before it ships.
const countOf = (re) => (code.match(re) || []).length;
{
  const fetchSites = countOf(/\bfetch\(/g);
  ok("exactly two fetch() call sites: the same-origin data loader and the gasUrl-gated results POST", fetchSites === 2, `found ${fetchSites}`);
  const fetchRefs = (code2.match(/\bfetch\b/g) || []).length;
  ok("...and exactly two references to the fetch IDENTIFIER at all (no aliasing, no `fetch (` spacing, no window['fetch'])",
    fetchRefs === 2 && !/\bfetch\s+\(/.test(code2) && !/\[\s*['"]fetch['"]\s*\]/.test(code2), `found ${fetchRefs}`);
  const urlLiterals = (code2.match(/https?:\/\/[^\s"'`)<]+/g) || []).filter((u) => u !== "http://www.w3.org/2000/svg");
  ok("no external URL literal in executable code except the SVG namespace (no pixel, font, script or style beacons)",
    urlLiterals.length === 0, urlLiterals.slice(0, 5).join(" "));
  ok("no protocol-relative URL literal", !/["'`]\/\/[a-z0-9.-]+\.[a-z]/i.test(code2));
  const loader = fnSrc("async function boundedJson(") || fnSrc("function boundedJson(");
  ok("one fetch lives inside the bounded same-origin JSON loader", !!loader && /\bfetch\(/.test(loader));
  ok("the other fetch is the results POST whose first argument is gasUrl, inside the gated block",
    /fetch\(gasUrl, \{/.test(norm) && norm.indexOf("fetch(gasUrl, {") > norm.indexOf("if (gasUrl && !scenarioBlocksEmail) {"));
  const forbidden = {
    XMLHttpRequest: /XMLHttpRequest/g, sendBeacon: /sendBeacon/g, WebSocket: /\bWebSocket\b/g, EventSource: /\bEventSource\b/g,
    "navigator.share": /navigator\.share/g, postMessage: /postMessage\(/g, "window.open": /window\.open\(/g,
    "new Image(": /new Image\(/g, ".submit(": /\.submit\(/g, "history.pushState": /history\.(pushState|replaceState)/g,
    "location writes": /location\.(href\s*=|assign\(|replace\()/g, iframe: /<iframe/gi, "document.cookie": /document\.cookie/g,
    sessionStorage: /sessionStorage/g, indexedDB: /indexedDB/g, "caches.": /\bcaches\./g, serviceWorker: /serviceWorker/g,
    "external script/style": /<(script|link)[^>]+(src|href)="https?:\/\//gi,
    "Image()": /\bImage\s*\(/g, ".src assignment": /\.src\s*=[^=]/g, "location assignment": /\blocation\s*=[^=]/g,
    "document.location": /document\.location/g, "window.name": /window\.name\s*=[^=]/g, clipboard: /clipboard/gi,
    "Worker(": /\b(Shared)?Worker\s*\(/g, BroadcastChannel: /BroadcastChannel/g, RTCPeerConnection: /RTCPeerConnection/g,
    importScripts: /importScripts/g, "new WebSocket": /new\s+WebSocket/g,
    // Attribute- and element-based sinks (an image, media, form or frame whose
    // URL is built at runtime rather than written as a literal).
    "setAttribute(src/href/action/ping/srcset/formaction)": /setAttribute\(\s*['"](src|href|action|ping|data|srcset|formaction)['"]/g,
    requestSubmit: /requestSubmit/g, ".srcset assignment": /\.srcset\s*=/g, ".action assignment": /\.action\s*=[^=]/g,
    "print(": /\bprint\s*\(/g, "download attribute": /\bdownload\b/g, "dynamic import(": /\bimport\s*\(/g,
    cookieStore: /cookieStore/g, WebTransport: /WebTransport/g, "Audio(": /\bnew\s+Audio\b|\bAudio\s*\(/g,
    "createElement(iframe/object/embed/base/video/audio/script/link/form)": /createElement\(\s*['"](iframe|object|embed|base|video|audio|script|link|form)['"]/g,
    formaction: /formaction/gi, "meta http-equiv": /http-equiv/gi, "ping=": /\bping=/gi
  };
  const present = Object.entries(forbidden).filter(([, re]) => countOf(re) > 0).map(([k]) => k);
  ok("zero other network, messaging, navigation or storage sinks", present.length === 0, present.join(","));
  const forms = code.match(/<form\b[^>]*>/gi) || [];
  ok("the one <form> never submits (preventDefault, no action attribute)",
    forms.length === 1 && /onsubmit="[^"]*preventDefault/.test(forms[0]) && !/\baction=/.test(forms[0]), forms.join(" | "));
  const storage = code2.split("\n").filter((l) => /localStorage/.test(l));
  ok("every localStorage reference (any access form) names a 'dreamfinder.' staff/device key (deviceRsa or rsaList) — no customer data is persisted",
    storage.length === 5 && storage.every((s) => /localStorage\.(getItem|setItem)\(/.test(s) && /'dreamfinder\.'/.test(s) && /deviceRsa|rsaList/.test(s)),
    `${storage.length} references`);
  ok("the only URL read is the motion flag; nothing writes answers or contact values to the URL or hash",
    countOf(/location\.search/g) <= 1 && countOf(/location\.hash\s*=/g) === 0 && countOf(/URLSearchParams\(/g) <= 1);
}
// publicAssetRoot is the one configured absolute host the app knows; it must
// feed only the email payload's image URLs inside sendResults(), never a DOM
// element (a config-host image is how a beacon would avoid the literal-URL pin).
{
  const refs = (code2.match(/publicAssetRoot/g) || []).length;
  const sendSrc = fnSrc("window.sendResults = function()") || "";
  ok("publicAssetRoot is referenced exactly once, inside sendResults() (the email payload), never to build a DOM element",
    refs === 1 && /publicAssetRoot/.test(sendSrc));
}
// analytics.getSummary() returns the raw answers; it has no caller. Pinned so a
// caller (a console dump, a payload field) cannot appear without a reviewed diff.
ok("analytics.getSummary() (which returns raw answers) has no call site",
  /getSummary: function\(\)/.test(norm) && !/\.getSummary\(/.test(code2));
// This tripwire pins the named sink forms on executable text. It is a drift
// alarm, not a proof against every possible sink (a string-split API name or
// a config-host URL would evade it) — which is why the sentence's truth also
// rests on the session suites' redaction pins and on review.
ok("the analytics sink is in-memory plus a redacted console line — no transport (pinned by session_async_check too)",
  /analytics\.log = function|log: function|function log\(/.test(norm) && !/analytics[\s\S]{0,400}sendBeacon|fetch\(analytics/.test(norm));
ok("Code.gs is reached only through that POST and its CAN-SPAM refusal sentinels still stand (no live send is possible yet)",
  /UNSUBSCRIBE_URL/.test(CODE_GS) && /dreamfinderleads@gmail\.com|RESULT_EMAIL_BCC/.test(CODE_GS));

// C7. The build-time gate exists and is self-tested.
ok("tools/validation.py rejects preview-mode privacy prose under a live gasUrl (rule + phrase list + self-test)",
  /def _check_privacy_prose_mode\(/.test(VALIDATION) && /PREVIEW_MODE_SIGNALS/.test(VALIDATION)
  && /if live_at_runtime:\s*\n\s*_check_privacy_prose_mode\(r, config\)/.test(VALIDATION.replace(/\r\n/g, "\n"))
  && /preview-mode privacy wording under a live gasUrl -> error/.test(VALIDATION));
ok("the validator's signal list covers the runtime's preview sentence (build gate and runtime agree on what preview wording is)",
  /"stays on this tablet"/.test(VALIDATION) && /"permanecen en esta tableta"/.test(VALIDATION));
ok("the validator keys the gate on the RAW runtime truthiness of gasUrl (whitespace-only is live, as in index.html's !!gasUrl) and refuses a non-blank placeholder",
  /def _runtime_truthy\(v\)/.test(VALIDATION)
  && /raw_gas = config\.get\("gasUrl"\)/.test(VALIDATION)
  && /live_at_runtime = _runtime_truthy\(raw_gas\)/.test(VALIDATION)
  && !/live_at_runtime = not _blank\(gas\)/.test(VALIDATION)
  && /if live_at_runtime:\s*\n\s*_check_privacy_prose_mode/.test(VALIDATION.replace(/\r\n/g, "\n"))
  && /non-blank placeholder/.test(VALIDATION)
  && /whitespace-only gasUrl is live at runtime -> non-blank placeholder error/.test(VALIDATION));

// ================================================================ D. tier-relativity legibility
section("D — the tier-relativity statement is legible and semantically untouched");
{
  const rules = [...norm.matchAll(/\.noct-tier-descriptor \.tier-relativity \{([^}]*)\}/g)];
  const rule = rules[0];
  const size = rule ? Number((rule[1].match(/font-size:\s*(\d+(?:\.\d+)?)px/) || [])[1]) : NaN;
  ok("exactly one rule styles the relativity note (no later override can shrink it unseen)", rules.length === 1, `${rules.length} rules`);
  ok(`the relativity note is body size: the declared font-size is >= 15px (got ${size}px; one rule, so computed = declared)`, size >= 15);
  ok("the relativity note keeps the muted showroom ink (contrast pinned in contrast_check)",
    !!rule && /color: var\(--color-text-muted\);/.test(rule[1]));
  ok("the relativity note's wording is exactly the D3 ruling in both languages (semantics unchanged)",
    dictEn["results.match_relativity"] === "Match strength is relative within each tier"
    && dictEs["results.match_relativity"] === "La afinidad es relativa dentro de cada nivel");
  ok("the renderer still emits the note from the dictionary key inside the tier descriptor (markup unchanged)",
    /html \+= '<span class="tier-relativity">' \+ escapeHtml\(t\('results\.match_relativity'\)\) \+ '<\/span>';/.test(norm));
  ok("no cross-tier marker, global best-match or naked percentage was added to the results descriptor",
    !/best overall|highest overall|across all tiers|global.?max|globalMax/i.test(norm.slice(norm.indexOf("function renderTierDescriptor"), norm.indexOf("function renderTierDescriptor") + 1500)));
  ok("Gold remains the initial active tier (presentation untouched — an open owner decision, register)",
    /activeTier:\s*'gold'/.test(norm) || /activeTier = 'gold'/.test(norm));
}

// ================================================================ summary
console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
