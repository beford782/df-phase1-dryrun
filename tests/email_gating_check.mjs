#!/usr/bin/env node
// COPY-15 regression test: the email packet's financing body must use the
// "You explored…" wording ONLY when the customer actually opened Payment
// Choice content (or added an agenda item); everyone else gets the neutral
// availability variant. Executes the REAL finEmailBody() source extracted
// from index.html against the REAL shipped config copy, plus static wiring
// checks that keep the explored flag set/reset in the right places.
//
// Run: node tests/email_gating_check.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
const cfg = JSON.parse(
  fs.readFileSync(path.join(REPO, "data", "store-config.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, ok, detail = "") {
  if (ok) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
}

// ---- Extract and compile the real function -------------------------------
const m = html.match(/function finEmailBody\(\)\s*\{([\s\S]*?)\}/);
check("finEmailBody() found in index.html", !!m);
if (!m) { report(); }

// Same contract as the app: FC(key) returns '' for missing copy keys.
const finEmailBody = new Function(
  "financingExplored", "finAgendaSelected", "FC", m[1]);

const copy = (cfg.financing && cfg.financing.copy) || {};
const fc = (lang, omit = []) => (key) =>
  copy[key] && !omit.includes(key) ? copy[key][lang] || "" : "";

console.log("Shipped config copy:");
check("emailBody present EN+ES",
  !!(copy.emailBody && copy.emailBody.en && copy.emailBody.es));
check("emailBodyAvailable present EN+ES (COPY-15 neutral variant)",
  !!(copy.emailBodyAvailable && copy.emailBodyAvailable.en && copy.emailBodyAvailable.es));
check("explored variant asserts exploration",
  /You explored/.test(copy.emailBody.en) && /Exploraste/.test(copy.emailBody.es));
check("neutral variant asserts nothing about the customer",
  !/You explored|you explored/.test(copy.emailBodyAvailable.en)
  && !/Exploraste|exploraste/.test(copy.emailBodyAvailable.es));

console.log("Behavior (real function, real copy):");
for (const lang of ["en", "es"]) {
  const FC = fc(lang);
  check(`${lang}: never opened, undecided -> neutral body`,
    finEmailBody(false, () => [], FC) === copy.emailBodyAvailable[lang]);
  check(`${lang}: opened the sheet -> explored body`,
    finEmailBody(true, () => [], FC) === copy.emailBody[lang]);
  check(`${lang}: agenda item without opening -> explored body`,
    finEmailBody(false, () => [{ key: "plan:test" }], FC) === copy.emailBody[lang]);
  check(`${lang}: not-now without opening -> neutral body`,
    finEmailBody(false, () => [], FC) === copy.emailBodyAvailable[lang]);
  const FCnoNeutral = fc(lang, ["emailBodyAvailable"]);
  check(`${lang}: config without emailBodyAvailable falls back to emailBody`,
    finEmailBody(false, () => [], FCnoNeutral) === copy.emailBody[lang]);
}

console.log("Wiring (static):");
check("email packet builders call finEmailBody() (not raw FC('emailBody'))",
  (html.match(/finEmailBody\(\)/g) || []).length >= 2);
check("openFinancingSheet sets financingExplored = true",
  /sheet\.hidden = false;[\s\S]{0,200}financingExplored = true;/.test(html));
// Gate 1B moved the reset body into the single authoritative
// resetSessionState(); window.startOver() delegates to it. Same invariant,
// asserted against whichever symbol carries the body.
const wipeDef = html.indexOf("function resetSessionState(opts)") !== -1
  ? html.indexOf("function resetSessionState(opts)")
  : html.indexOf("window.startOver = function");
check("the session wipe resets financingExplored to false",
  wipeDef !== -1 && /financingExplored = false;/.test(html.slice(wipeDef, wipeDef + 8000)));
check("window.startOver() still exists and delegates to that one wipe",
  /window\.startOver = function\(\) \{\s*return resetSessionState\(/.test(html));

function report() {
  console.log(`\nEmail gating check: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
report();
