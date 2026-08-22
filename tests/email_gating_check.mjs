#!/usr/bin/env node
// D4 regression test (supersedes COPY-15): the email packet's financing row is
// INVARIANT across the entire Payment Choice state space.
//
// COPY-15 shipped a two-state gate — an "You explored…" body for anyone who had
// opened Payment Choice content, the neutral availability body for everyone
// else — and this suite proved the gate picked the right side. Owner ruling 13
// retired the gate outright: payment state is entirely excluded from email, so
// a customer who compared three payment paths and a customer who opened nothing
// must receive byte-identical wording. Proving "the gate picks correctly" is
// therefore the wrong property; the property now is that there is no gate, and
// that nothing downstream of finEmailBody() can reconstruct one.
//
// So this file executes the REAL finEmailBody() source extracted from
// index.html against the REAL shipped config copy across the complete D4 state
// matrix, in both languages, and asserts one output. It then compiles mutated
// bodies that DO consult payment state and requires the same harness to reject
// them, so a green run means the invariance check can actually fail. Around
// that sit the exclusion sweeps: no payment identifier in the visible email
// preview, the GAS payload, Code.gs, the session summary or the analytics
// field map, and no resurrection path through config copy.
//
// Run: node tests/email_gating_check.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
const codeGs = fs.readFileSync(path.join(REPO, "Code.gs"), "utf8");
const validationPy = fs.readFileSync(
  path.join(REPO, "tools", "validation.py"), "utf8");
const cfg = JSON.parse(
  fs.readFileSync(path.join(REPO, "data", "store-config.json"), "utf8"));
const incoming = JSON.parse(fs.readFileSync(
  path.join(REPO, "incoming", "lacks_financing.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, ok, detail = "") {
  if (ok) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
}
function section(title) { console.log(title + ":"); }
const sameSet = (a, b) => {
  const x = [...a].slice().sort(), y = [...b].slice().sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

// ---- Source-reading machinery --------------------------------------------
// Several sweeps below have to look at CODE rather than prose. The name
// `emailBody` deliberately SURVIVES in index.html's explanatory comment about
// its own retirement, and index.html's D4 comments name payPref/payExplored/
// payOpen while explaining why the email never reads them — so a raw substring
// sweep would report the exact opposite of the truth. This is the literal-aware
// stripper from tests/session_async_check.mjs (which owns the proof that it
// never deletes a live call site in this file); copied rather than imported
// because that module runs its whole suite and calls process.exit() on import.
function stripComments(source) {
  const REGEX_OK_AFTER = /[({[,;:=!&|?+\-*%~^]/;
  const REGEX_OK_KEYWORD = /(?:^|[^A-Za-z0-9_$])(?:return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/;
  let out = "";
  let i = 0;
  let prev = "";        // last significant character emitted
  let prevWord = "";    // ...and the identifier it belongs to, for keywords
  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];
    if (c === "/" && d === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      const end = source.indexOf("*/", i + 2);
      // An unterminated opener is EMITTED, never deleted to end of file.
      if (end === -1) { out += source.slice(i); break; }
      i = end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === "\\") { j += 2; continue; }
        if (source[j] === c) { j++; break; }
        j++;
      }
      out += source.slice(i, j);
      prev = c; prevWord = ""; i = j;
      continue;
    }
    if (c === "/" && (prev === "" || REGEX_OK_AFTER.test(prev) || REGEX_OK_KEYWORD.test(prevWord))) {
      let j = i + 1, inClass = false;
      while (j < source.length) {
        const e = source[j];
        if (e === "\\") { j += 2; continue; }
        if (e === "\n") break;            // not a regex after all — emit as-is
        if (e === "[") inClass = true;
        else if (e === "]") inClass = false;
        else if (e === "/" && !inClass) { j++; break; }
        j++;
      }
      out += source.slice(i, j);
      prev = "/"; prevWord = ""; i = j;
      continue;
    }
    out += c;
    if (!/\s/.test(c)) {
      prev = c;
      prevWord = /[A-Za-z0-9_$]/.test(c) ? prevWord + c : "";
    }
    i++;
  }
  return out;
}

// Brace-matched slice starting at the '{' at or after `from`. Quote-aware, so
// a brace inside a string literal cannot end the block early. Returns '' when
// the braces never balance, which every caller asserts on rather than assuming.
function balancedBlock(src, from) {
  const openIdx = src.indexOf("{", from);
  if (openIdx === -1) return "";
  let depth = 0, i = openIdx;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === c) { j++; break; }
        j++;
      }
      i = j; continue;
    }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return src.slice(openIdx, i + 1); }
    i++;
  }
  return "";
}

// The keys declared directly on an object literal — depth 1 only, so nested
// blocks (branding, the financing IIFE, the per-match maps) contribute nothing.
function topLevelKeys(objSrc) {
  const keys = [];
  let depth = 0, i = 0, prevSig = "";
  while (i < objSrc.length) {
    const c = objSrc[i];
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < objSrc.length) {
        if (objSrc[j] === "\\") { j += 2; continue; }
        if (objSrc[j] === c) { j++; break; }
        j++;
      }
      prevSig = c; i = j; continue;
    }
    if (c === "{" || c === "[" || c === "(") { depth++; prevSig = c; i++; continue; }
    if (c === "}" || c === "]" || c === ")") { depth--; prevSig = c; i++; continue; }
    if (depth === 1 && (prevSig === "{" || prevSig === ",") && /[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < objSrc.length && /[\w$]/.test(objSrc[j])) j++;
      let k = j;
      while (k < objSrc.length && /\s/.test(objSrc[k])) k++;
      if (objSrc[k] === ":") {
        keys.push(objSrc.slice(i, j));
        prevSig = ":"; i = k + 1; continue;
      }
      prevSig = objSrc[j - 1]; i = j; continue;
    }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return keys;
}

// Every identifier a snippet READS from its enclosing scope: comments and
// string contents removed, property accesses (`x.foo`) and language keywords
// excluded. Used to prove finEmailBody()'s body is a pure function of FC —
// executing it proves it does not vary, this proves it cannot.
const JS_RESERVED = new Set([
  "return", "var", "let", "const", "function", "if", "else", "typeof", "new",
  "delete", "void", "in", "of", "true", "false", "null", "undefined", "this",
  "for", "while", "do", "switch", "case", "break", "continue", "try", "catch",
  "finally", "throw", "instanceof", "yield", "await"]);
function freeIdentifiers(src) {
  const noStrings = stripComments(src)
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
  const out = new Set();
  const re = /(\.)?\b([A-Za-z_$][\w$]*)\b/g;
  let m;
  while ((m = re.exec(noStrings)) !== null) {
    if (m[1]) continue;                       // property, not a free binding
    if (JS_RESERVED.has(m[2])) continue;
    out.add(m[2]);
  }
  return out;
}

const htmlCode = stripComments(html);
const gsCode = stripComments(codeGs);

// ---- The D4 lexicon -------------------------------------------------------
// Every binding that carries, derives or names a customer's payment position.
// `financingEnabled`, `FC` and `finEmailBody` are deliberately absent: they are
// the category-level CONFIG accessors, which ruling 13 permits in email. What
// it forbids is customer state, path identity and history.
const D4_SYMBOL = new RegExp(
  "\\b(?:payExplored|payPref|payOpen|PAY_NOT_NOW|payIsExplored|payRecordExplored"
  + "|finPathId|finPathById|finPathEncode|finPathDom|FIN_PATH_KINDS"
  + "|reviewPaymentPath|considerPaymentPath|clearPaymentPreference|setPaymentNotNow"
  + "|financingExplored|finAgendaSelected)\\b|['\"]not_now['\"]");

// A KEY NAME is payment-derived if it names any part of the D4 model. Note it
// is not triggered by the word `financing` on its own: the payload's financing
// block is category-level copy (heading / body / url / offerVersion /
// confirmNote), which is permitted — its contents are asserted separately.
const PAY_DERIVED_NAME =
  /^pay(?:[A-Z_]|$)|explored|preference|prefer|notNow|not_now|paymentPath|pathId|financingInterest/i;

// ===========================================================================
section("Lexicon (the sweeps' own detectors must be able to fire)");
// ===========================================================================
const PLANTED_D4 = [
  "if (payExplored.length) return x;", "return payPref === id;",
  "payOpen[id] = true;", "if (payPref === PAY_NOT_NOW) return '';",
  "payIsExplored(id)", "payRecordExplored(id)", "finPathId('plan', v)",
  "finPathById(id)", "finPathEncode(v)", "finPathDom('row', id)",
  "window.considerPaymentPath('plan-x')", "window.reviewPaymentPath('plan-x')",
  "window.clearPaymentPreference(id)", "window.setPaymentNotNow()",
  "financingExplored = true;", "if (payPref === 'not_now') return '';"];
check("D4_SYMBOL fires on every planted payment-state line",
  PLANTED_D4.every((line) => D4_SYMBOL.test(line)),
  PLANTED_D4.filter((l) => !D4_SYMBOL.test(l)).join(" | "));
const PERMITTED_FIN = [
  "if (financingEnabled()) {", "detail: finEmailBody()",
  "title: FC('emailHeading')", "return FC('emailBodyAvailable');",
  "offerVersion: f.offerVersion || ''", "financing: financing,"];
check("D4_SYMBOL does NOT fire on the permitted category-level copy accessors",
  PERMITTED_FIN.every((line) => !D4_SYMBOL.test(line)),
  PERMITTED_FIN.filter((l) => D4_SYMBOL.test(l)).join(" | "));

const PLANTED_KEYS = ["payPref", "payExplored", "payOpen", "pay_pref",
  "financingExplored", "paymentPreference", "exploredPaths", "pathId",
  "preferredPath", "notNowSince", "financingInterest"];
check("PAY_DERIVED_NAME flags every planted payment-state key name",
  PLANTED_KEYS.every((k) => PAY_DERIVED_NAME.test(k)),
  PLANTED_KEYS.filter((k) => !PAY_DERIVED_NAME.test(k)).join(" | "));
const LEGITIMATE_KEYS = ["storeName", "financing", "dreamCode", "passScope",
  "passExpiration", "layout", "placement", "lang", "savedPickCount",
  "accessoriesViewed", "consultation", "priorities", "branding"];
check("PAY_DERIVED_NAME does not flag legitimate shipped key names",
  LEGITIMATE_KEYS.every((k) => !PAY_DERIVED_NAME.test(k)),
  LEGITIMATE_KEYS.filter((k) => PAY_DERIVED_NAME.test(k)).join(" | "));

const IDENT_PROBE = freeIdentifiers("return payPref ? FC('a') : other.thing;");
check("freeIdentifiers() sees a state read and ignores properties/strings",
  IDENT_PROBE.has("payPref") && IDENT_PROBE.has("FC") && IDENT_PROBE.has("other")
  && !IDENT_PROBE.has("thing") && !IDENT_PROBE.has("a"));

// ===========================================================================
section("Extract the real function");
// ===========================================================================
const sigIdx = html.indexOf("function finEmailBody(");
check("finEmailBody() found in index.html", sigIdx !== -1);
if (sigIdx === -1) { report(); }
check("finEmailBody() takes NO parameters (state cannot be handed to it)",
  /function finEmailBody\(\s*\)/.test(html.slice(sigIdx, sigIdx + 40)));
const finBlock = balancedBlock(html, sigIdx);
check("finEmailBody() body extracted (braces balance)", finBlock.length > 2);
const finBody = finBlock.slice(1, -1);

const finIdents = freeIdentifiers(finBody);
check("finEmailBody()'s body reads exactly one binding — FC — and nothing else",
  sameSet(finIdents, ["FC"]), [...finIdents].join(", "));
const finKeys = [...stripComments(finBody).matchAll(/FC\(\s*['"]([^'"]+)['"]\s*\)/g)]
  .map((m) => m[1]);
check("its only copy key is emailBodyAvailable (no state-specific alternative)",
  sameSet(finKeys, ["emailBodyAvailable"]), finKeys.join(", "));

// Compiled with the whole D4 model in scope. The real body binds none of these
// — that is the point: an unused binding for the shipped function is a live
// input for any body that reads it, and the matrix below sees the difference.
function compileBody(body) {
  return new Function("FC", "payExplored", "payPref", "payOpen", "PAY_NOT_NOW", body);
}
const finEmailBody = compileBody(finBody);

// ===========================================================================
section("Shipped config copy");
// ===========================================================================
const copy = (cfg.financing && cfg.financing.copy) || {};
const inCopy = (incoming.financing && incoming.financing.copy) || {};
// Same contract as the app: FC(key) returns '' for a missing copy key.
const fc = (lang, omit = []) => (key) =>
  copy[key] && !omit.includes(key) ? copy[key][lang] || "" : "";

const fullBilingual = (o) => !!(o && typeof o.en === "string" && o.en.trim()
  && typeof o.es === "string" && o.es.trim());
check("emailBodyAvailable ships full EN+ES in incoming/lacks_financing.json",
  fullBilingual(inCopy.emailBodyAvailable));
check("emailBodyAvailable ships full EN+ES in data/store-config.json",
  fullBilingual(copy.emailBodyAvailable));
check("the canonical source and the generated config agree exactly",
  JSON.stringify(inCopy.emailBodyAvailable) === JSON.stringify(copy.emailBodyAvailable));
check("the neutral body asserts nothing about what the customer did",
  fullBilingual(copy.emailBodyAvailable)
  && !/\byou explored\b|\bexplored\b|\byou chose\b|\byou selected\b/i.test(copy.emailBodyAvailable.en)
  && !/\bexploraste\b|\belegiste\b|\bseleccionaste\b/i.test(copy.emailBodyAvailable.es));
check("the retired emailBody key is gone from incoming/lacks_financing.json",
  !Object.prototype.hasOwnProperty.call(inCopy, "emailBody"));
check("the retired emailBody key is gone from data/store-config.json",
  !Object.prototype.hasOwnProperty.call(copy, "emailBody"));
// Config is the one place the neutral body could be dropped (leaving the email's
// payment row blank) or the gate re-introduced. Both are closed at build time.
check("validation.py REQUIRES emailBodyAvailable under payment-choice",
  /^\s*"emailBodyAvailable",\s*$/m.test(validationPy));
check("validation.py lists emailBody as retired copy (config cannot resurrect it)",
  /"emailBody":\s*"[^"]*retired|PAYMENT_CHOICE_RETIRED_COPY[\s\S]{0,1200}?"emailBody":/.test(validationPy));

// ===========================================================================
section("Invariance across the complete D4 state matrix (real function, real copy)");
// ===========================================================================
// Realistic canonical ids: finPathId() emits KIND '-' ENCODED over the
// alphabet [A-Za-z0-9-_]. They are opaque to the email by construction, which
// is exactly what the matrix has to prove rather than assume.
const P_PROMO = "promo-Synchrony";
const P_HOUSE = "plan-lacks-in-house";
const P_LEASE = "plan-lease-to-own";
const P_STALE = "plan-retired-2019-offer";   // id no longer in the shipped config

const D4_STATES = [
  { name: "empty session", explored: [], pref: null, open: {} },
  // Opening the sheet records NOTHING (openFinancingSheet, asserted below), so
  // this row is state-identical to the empty session BY DESIGN. Kept as a named
  // case because it is the exact scenario the retired gate used to split on.
  { name: "sheet opened", explored: [], pref: null, open: {} },
  { name: "one path explored", explored: [P_PROMO], pref: null, open: {} },
  { name: "two paths explored", explored: [P_PROMO, P_HOUSE], pref: null, open: {} },
  { name: "an open disclosure", explored: [P_PROMO], pref: null, open: { [P_PROMO]: true } },
  { name: "a preference set", explored: [P_PROMO], pref: P_PROMO, open: {} },
  { name: "a preference replaced", explored: [P_PROMO, P_HOUSE], pref: P_HOUSE, open: {} },
  { name: "not_now with preserved history", explored: [P_PROMO, P_LEASE], pref: "not_now", open: {} },
  { name: "not_now with no history", explored: [], pref: "not_now", open: {} },
  { name: "a cleared preference with history", explored: [P_PROMO, P_HOUSE], pref: null, open: { [P_HOUSE]: true } },
  { name: "a stale/unknown id held in state", explored: [P_STALE], pref: P_STALE, open: { [P_STALE]: true } }
];

const stateShape = (s) => JSON.stringify([s.explored, s.pref, s.open]);
check("opening the sheet is not a state: 'sheet opened' equals 'empty session'",
  stateShape(D4_STATES[0]) === stateShape(D4_STATES[1]));

// The harness the mutation proof exercises: one candidate body, every state,
// one language — the set of DISTINCT outputs must have exactly one member.
function matrixOutputs(fn, lang) {
  const FC = fc(lang);
  return D4_STATES.map((s) => fn(
    FC, s.explored.slice(), s.pref, JSON.parse(JSON.stringify(s.open)), "not_now"));
}
function isInvariant(fn) {
  return ["en", "es"].every((lang) => new Set(matrixOutputs(fn, lang)).size === 1);
}

for (const lang of ["en", "es"]) {
  const expected = copy.emailBodyAvailable[lang];
  const outputs = matrixOutputs(finEmailBody, lang);
  D4_STATES.forEach((s, i) => {
    check(`${lang}: ${s.name} -> the neutral body, byte-identical`,
      outputs[i] === expected,
      outputs[i] === expected ? "" : JSON.stringify(outputs[i]));
  });
}
check("EN and ES differ — language is the ONLY input that moves the row",
  matrixOutputs(finEmailBody, "en")[0] !== matrixOutputs(finEmailBody, "es")[0]);
check("the whole matrix collapses to one output per language",
  isInvariant(finEmailBody));
// The retired gate's fallback was "no emailBodyAvailable -> use emailBody".
// Nothing may fall back now: a config missing the key renders empty, and
// validation.py (asserted above) is what stops that config from shipping.
for (const lang of ["en", "es"]) {
  check(`${lang}: config without emailBodyAvailable renders '' (no hidden fallback)`,
    finEmailBody(fc(lang, ["emailBodyAvailable"]), [], null, {}, "not_now") === "");
}

// ===========================================================================
section("Mutation proof (the invariance harness can reject)");
// ===========================================================================
// Each of these is a plausible regression — a body that re-introduces the gate
// in a different disguise. If the harness above passed them, its green run on
// the real body would mean nothing.
const MUTANTS = [
  { why: "branches on payPref",
    body: "return FC(payPref ? 'emailBodyAvailable' : 'emailHeading');" },
  { why: "appends a count from payExplored",
    body: "return FC('emailBodyAvailable') + (payExplored.length ? ' You explored ' + payExplored.length + ' options.' : '');" },
  { why: "leaks the open disclosure panels",
    body: "return FC('emailBodyAvailable') + (Object.keys(payOpen).length ? ' (details opened)' : '');" },
  { why: "special-cases the not_now pause",
    body: "return payPref === PAY_NOT_NOW ? FC('emailHeading') : FC('emailBodyAvailable');" },
  { why: "names a single explored path id",
    body: "return FC('emailBodyAvailable') + (payExplored[0] ? ' [' + payExplored[0] + ']' : '');" }
];
for (const m of MUTANTS) {
  check(`a body that ${m.why} is REJECTED by the same harness`,
    !isInvariant(compileBody(m.body)));
}
check("...and the real body is ACCEPTED by it", isInvariant(finEmailBody));

// ===========================================================================
section("Retirement (scoped to executable code — the names survive in prose)");
// ===========================================================================
check("emailBody is absent from index.html's executable code",
  !/\bemailBody\b/.test(htmlCode));
check("...while the explanatory comment still names it (so the sweep is real)",
  /\bemailBody\b/.test(html));
check("financingExplored is absent from index.html's executable code",
  !/\bfinancingExplored\b/.test(htmlCode));
check("...while index.html still explains why it was retired",
  /\bfinancingExplored\b/.test(html));
check("no call site anywhere still reads FC('emailBody')",
  !/FC\(\s*['"]emailBody['"]\s*\)/.test(html));
// The stripper is the load-bearing part of the two sweeps above. Prove on a
// planted sample that it removes prose and keeps code, in this file's own run.
const STRIP_PROBE = stripComments(
  "// a comment naming emailBody and financingExplored\n"
  + "var keep = FC('emailBodyAvailable');\n"
  + "/* block prose about payPref */\n");
check("the stripper removes prose and keeps the code beside it",
  !/\bemailBody\b(?!Available)/.test(STRIP_PROBE)
  && !/financingExplored|payPref/.test(STRIP_PROBE)
  && /FC\('emailBodyAvailable'\)/.test(STRIP_PROBE));

// ===========================================================================
section("Exclusion: the visible email preview");
// ===========================================================================
const previewIdx = htmlCode.indexOf("window.showEmailCapture = function()");
check("showEmailCapture() (the visible preview builder) located", previewIdx !== -1);
const previewBlock = balancedBlock(htmlCode, previewIdx);
check("its body extracted and is the packet builder",
  previewBlock.length > 2000 && previewBlock.includes("var packet = [")
  && previewBlock.includes("emailPreview"));
check("the preview builder references NO payment state, path or preference",
  !D4_SYMBOL.test(previewBlock),
  (previewBlock.match(D4_SYMBOL) || [""])[0]);
check("its financing row is exactly the heading + finEmailBody(), nothing else",
  /packet\.push\(\{\s*present:\s*true,\s*title:\s*FC\('emailHeading'\),\s*detail:\s*finEmailBody\(\)\s*\}\);/
    .test(previewBlock.replace(/\s+/g, " ")));
check("the financing row renders only when financing is enabled",
  /if\s*\(financingEnabled\(\)\)\s*\{\s*packet\.push/.test(previewBlock.replace(/\s+/g, " ")));

// ===========================================================================
section("Exclusion: the GAS payload");
// ===========================================================================
const payloadIdx = htmlCode.indexOf("const payload = {");
check("the GAS payload object located", payloadIdx !== -1);
const payloadBlock = balancedBlock(htmlCode, payloadIdx + "const payload =".length);
const payloadKeys = topLevelKeys(payloadBlock);
check("the payload's own keys were recovered (extractor sanity)",
  payloadKeys.includes("storeName") && payloadKeys.includes("email")
  && payloadKeys.includes("lang") && payloadKeys.includes("financing")
  && !payloadKeys.includes("logoMain") && !payloadKeys.includes("heading"),
  payloadKeys.join(", "));
const payloadOffenders = payloadKeys.filter((k) => PAY_DERIVED_NAME.test(k));
check("no payload key is payment-derived", payloadOffenders.length === 0,
  payloadOffenders.join(", "));
check("the payload body references NO payment state, path or preference",
  !D4_SYMBOL.test(payloadBlock),
  (payloadBlock.match(D4_SYMBOL) || [""])[0]);

const finBlockIdx = payloadBlock.indexOf("financing: financingEnabled()");
check("the payload's financing block located", finBlockIdx !== -1);
const payloadFin = balancedBlock(payloadBlock, payloadBlock.indexOf("return {", finBlockIdx));
const payloadFinKeys = topLevelKeys(payloadFin);
check("the transmitted financing block is category-level copy only",
  sameSet(payloadFinKeys,
    ["heading", "body", "url", "offerVersion", "confirmNote"]),
  payloadFinKeys.join(", "));
check("its body field is finEmailBody() — the same invariant row as the preview",
  /body:\s*finEmailBody\(\)/.test(payloadFin));

// ===========================================================================
section("Exclusion: Code.gs");
// ===========================================================================
check("Code.gs references NO payment state, path or preference symbol",
  !D4_SYMBOL.test(gsCode), (gsCode.match(D4_SYMBOL) || [""])[0]);
check("Code.gs has no explored/preference/agenda vocabulary at all",
  !/\bexplored\b|\bpreference\b|\bagenda\b/i.test(gsCode));
const gsFinIdx = gsCode.indexOf("var financing = (data.financing");
check("Code.gs's financing sanitizer located", gsFinIdx !== -1);
const gsFinKeys = topLevelKeys(balancedBlock(gsCode, gsFinIdx));
// `interest` is a vestigial slot from the pre-D4 design: the kiosk has never
// sent it (asserted below) and nothing renders it (asserted below), so no
// payment state reaches it — but it is pinned here so the residue cannot
// quietly grow a reader, and so a NEW unsent key fails rather than passes.
check("Code.gs's sanitized financing keys are exactly the known set",
  sameSet(gsFinKeys, ["heading", "body", "url", "confirmNote", "interest"]),
  gsFinKeys.join(", "));
check("the kiosk never populates financing.interest",
  !payloadFinKeys.includes("interest") && !/financing\.interest/.test(htmlCode));
const gsInterestLines = gsCode.split("\n").filter((l) => /\binterest\b/i.test(l));
check("Code.gs never reads or renders financing.interest (write-only residue)",
  gsInterestLines.length === 1
  && /^\s*interest:\s*_safeText\(data\.financing\.interest,\s*20\)\s*$/.test(gsInterestLines[0]),
  gsInterestLines.join(" | "));

// ===========================================================================
section("Exclusion: diagnostics");
// ===========================================================================
const summaryIdx = htmlCode.indexOf("function sessionSafeSummary(reason)");
check("sessionSafeSummary() located", summaryIdx !== -1);
const summaryBody = balancedBlock(htmlCode, summaryIdx + "function sessionSafeSummary(reason)".length);
const sessionSafeSummary = new Function(
  "reason", "analytics", "window", summaryBody.slice(1, -1));
// Executed against a session that DID use Payment Choice, so a leak would show
// up as an extra key rather than having to be inferred from the source.
const summary = sessionSafeSummary("results_viewed", {
  startedAt: 1000, completedAt: 61000, answers: { firmness: "medium" },
  resultsViewed: true, accessoriesViewed: true, events: [{ event: "x" }]
}, { _savedPicks: [{ id: "g1" }], _accCart: { a1: {} } });
check("sessionSafeSummary() executes and returns an object",
  !!summary && typeof summary === "object");
check("its key set is exactly the counts contract",
  sameSet(Object.keys(summary), ["reason", "durationSec", "answeredCount",
    "resultsViewed", "accessoriesViewed", "savedPickCount",
    "sleepSystemItemCount", "eventCount"]),
  Object.keys(summary).join(", "));
const summaryOffenders = Object.keys(summary).filter((k) => PAY_DERIVED_NAME.test(k));
check("no session-summary field is payment-derived", summaryOffenders.length === 0,
  summaryOffenders.join(", "));

const efIdx = htmlCode.indexOf("EVENT_FIELDS: (function()");
check("analytics.EVENT_FIELDS located", efIdx !== -1);
const efBody = balancedBlock(htmlCode, efIdx + "EVENT_FIELDS: (function()".length);
const EVENT_FIELDS = new Function("return (function() {" + efBody.slice(1, -1) + "})();")();
check("EVENT_FIELDS evaluates to the real event map",
  !!EVENT_FIELDS && typeof EVENT_FIELDS === "object"
  && Object.keys(EVENT_FIELDS).length > 20
  && !!EVENT_FIELDS.finance_details_open);
const declaredFields = new Set();
Object.values(EVENT_FIELDS).forEach((f) => Object.keys(f || {}).forEach((k) => declaredFields.add(k)));
const fieldOffenders = [...declaredFields].filter((k) => PAY_DERIVED_NAME.test(k));
check("no declared analytics field is payment-derived", fieldOffenders.length === 0,
  fieldOffenders.join(", "));
check("the four financing events declare placement/lang/layout and nothing more",
  ["official_financing_link_click", "mexico_financing_details_open",
   "finance_details_open", "finance_module_impression"]
    .every((e) => EVENT_FIELDS[e] && sameSet(Object.keys(EVENT_FIELDS[e]),
      ["placement", "lang", "layout"])));
check("D4's own actions declare no event at all",
  !Object.keys(EVENT_FIELDS).some((e) =>
    /consider|preference|not_now|notnow|pay_|_pref|explored/i.test(e)),
  Object.keys(EVENT_FIELDS).filter((e) => /consider|preference|explored/i.test(e)).join(", "));
// Planted counter-example: the same scan over a widened map must flag it.
const PLANTED_EF = { session_summary: { durationSec: "num", payPref: "payPath" } };
const plantedFields = new Set();
Object.values(PLANTED_EF).forEach((f) => Object.keys(f).forEach((k) => plantedFields.add(k)));
check("...and the same scan flags a planted payPref field",
  [...plantedFields].some((k) => PAY_DERIVED_NAME.test(k)));

// ===========================================================================
section("Wiring (static)");
// ===========================================================================
const callSites = (htmlCode.match(/\bfinEmailBody\(\s*\)/g) || []).length;
check("finEmailBody() has exactly one definition and two call sites",
  callSites === 3, `found ${callSites}`);
check("both call sites are the preview row and the payload body",
  (previewBlock.match(/\bfinEmailBody\(\s*\)/g) || []).length === 1
  && (payloadBlock.match(/\bfinEmailBody\(\s*\)/g) || []).length === 1);
check("no call site passes it an argument",
  !/\bfinEmailBody\(\s*[^)\s]/.test(htmlCode));

const openIdx = htmlCode.indexOf("window.openFinancingSheet = function(placement)");
check("openFinancingSheet() located", openIdx !== -1);
const openBlock = balancedBlock(htmlCode, openIdx + "window.openFinancingSheet = function(placement)".length);
check("openFinancingSheet() extracted", openBlock.includes("sheet.hidden = false;"));
check("opening the sheet records NOTHING — no payExplored/payPref/payOpen write",
  !/pay(?:Explored|Pref|Open)\s*(?:=|\.push|\[)/.test(openBlock)
  && !/payRecordExplored\s*\(/.test(openBlock));
check("...and no longer sets the retired financingExplored flag",
  !/financingExplored/.test(openBlock));

// Gate 1B moved the reset body into the single authoritative
// resetSessionState(); window.startOver() delegates to it.
const wipeIdx = htmlCode.indexOf("function resetSessionState(opts)");
check("the authoritative session wipe located", wipeIdx !== -1);
const wipeBlock = balancedBlock(htmlCode, wipeIdx + "function resetSessionState(opts)".length);
check("the wipe clears all three D4 dimensions by name",
  /payExplored = \[\];/.test(wipeBlock) && /payPref = null;/.test(wipeBlock)
  && /payOpen = \{\};/.test(wipeBlock));
check("the wipe no longer references the retired financingExplored flag",
  !/financingExplored/.test(wipeBlock));
check("window.startOver() still exists and delegates to that one wipe",
  /window\.startOver = function\(\) \{\s*return resetSessionState\(/.test(html));

function report() {
  console.log(`\nEmail gating check: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
report();
