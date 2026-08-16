// Exact-promotions operating-policy check — Commit E (Cycle 1).
//
// Executes the REAL financingTermsFresh() / financingPlanFresh() /
// financingAgeOk() / financingSourceAllowed() extracted from index.html in a
// shared scope, driven by a controlled STORE_CONFIG. Proves that
// financing.exactPromotionsEnabled is a STRICT additional fail-closed
// condition: it never substitutes for verification, freshness, timestamp,
// plan or URL gates, and refreshing a timestamp cannot grant it.
//
// Timestamps are relative to real now, so nothing here rots by date.
//
// Run: node tests/exact_promotions_policy_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const cfg = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}`); }
}
function extract(re, name) {
  const m = html.match(re);
  check(`${name} found`, !!m);
  return m ? m[0] : "";
}

const srcAllowed = extract(/function financingSourceAllowed\(url\)\s*\{[\s\S]*?\n    \}/, "financingSourceAllowed()");
const srcSkew = extract(/var FINANCING_CLOCK_SKEW_MS = [^\n]*/, "FINANCING_CLOCK_SKEW_MS");
const srcAge = extract(/function financingAgeOk\(ts, maxDays, label\)\s*\{[\s\S]*?\n    \}/, "financingAgeOk()");
const srcFresh = extract(/function financingTermsFresh\(\)\s*\{[\s\S]*?\n    \}/, "financingTermsFresh()");
const srcPlan = extract(/function financingPlanFresh\(p\)\s*\{[\s\S]*?\n    \}/, "financingPlanFresh()");

// Build the real gate over a settable config. console.warn is swallowed so
// intentional fail-closed paths do not spam the test output.
const gate = new Function("__setCfg", `
  var __cfg = null;
  var console = { warn: function() {}, log: function() {} };
  function getFinancingConfig() { return __cfg; }
  ${srcAllowed}
  ${srcSkew}
  ${srcAge}
  ${srcFresh}
  ${srcPlan}
  return {
    setCfg: function(c) { __cfg = c; },
    termsFresh: financingTermsFresh,
    planFresh: financingPlanFresh,
  };`)();

const MIN = 60 * 1000, DAY = 24 * 60 * MIN;
const iso = (ms) => new Date(Date.now() + ms).toISOString();

// A configuration that satisfies EVERY gate except the policy switch, so any
// failure below is attributable to the field under test.
function baseCfg(overrides = {}) {
  return Object.assign({
    enabled: true,
    verifiedAt: iso(-1 * MIN),
    maxAgeDays: 7,
    sourceUrl: "https://www.lacks.com/financing",
    allowedSourceHosts: cfg.financing.allowedSourceHosts,
    plans: [{ id: "p", verified: true, verifiedAt: iso(-1 * MIN),
              sourceUrl: "https://www.lacks.com/financing" }],
  }, overrides);
}
const freshPlan = () => baseCfg().plans[0];

function termsWith(overrides) { gate.setCfg(baseCfg(overrides)); return gate.termsFresh(); }

// --- the shipped configuration is the real subject ---
check("shipped config carries exactPromotionsEnabled === false",
  cfg.financing.exactPromotionsEnabled === false);
gate.setCfg(cfg.financing);
check("shipped config: exact terms are HIDDEN despite a fresh stamp",
  gate.termsFresh() === false);
check("shipped config: financing itself is still enabled (orientation renders)",
  cfg.financing.enabled === true);

// --- field-shape matrix: everything except boolean true fails closed ---
const shapes = [
  ["absent", undefined],
  ["null", null],
  ["false", false],
  ['string "false"', "false"],
  ['string "true"', "true"],
  ["number 0", 0],
  ["number 1", 1],
  ["object", { enabled: true }],
  ["array", [true]],
  ["empty string", ""],
  ["Boolean object", new Boolean(true)],
];
for (const [label, value] of shapes) {
  const o = value === undefined ? {} : { exactPromotionsEnabled: value };
  check(`policy ${label} -> exact terms hidden`, termsWith(o) === false);
}
check("policy boolean true + fresh + safe -> exact terms eligible",
  termsWith({ exactPromotionsEnabled: true }) === true);

// --- the switch is ADDITIONAL, never a substitute ---
check("true + stale timestamp -> hidden",
  termsWith({ exactPromotionsEnabled: true, verifiedAt: iso(-8 * DAY) }) === false);
check("true + materially future timestamp -> hidden",
  termsWith({ exactPromotionsEnabled: true, verifiedAt: iso(60 * MIN) }) === false);
check("true + malformed timestamp -> hidden",
  termsWith({ exactPromotionsEnabled: true, verifiedAt: "not-a-timestamp" }) === false);
check("true + missing timestamp -> hidden",
  termsWith({ exactPromotionsEnabled: true, verifiedAt: undefined }) === false);
check("true + missing maxAgeDays -> hidden",
  termsWith({ exactPromotionsEnabled: true, maxAgeDays: undefined }) === false);
check("true + unsafe (http) source URL -> hidden",
  termsWith({ exactPromotionsEnabled: true, sourceUrl: "http://www.lacks.com/financing" }) === false);
check("true + non-allowlisted source URL -> hidden",
  termsWith({ exactPromotionsEnabled: true, sourceUrl: "https://evil.example.com/x" }) === false);
check("true + credentialed source URL -> hidden",
  termsWith({ exactPromotionsEnabled: true, sourceUrl: "https://u:p@www.lacks.com/x" }) === false);

// existing 5-minute future tolerance must be untouched by the new gate
check("true + timestamp 2 min ahead (inside clock skew) -> still eligible",
  termsWith({ exactPromotionsEnabled: true, verifiedAt: iso(2 * MIN) }) === true);
check("true + timestamp 6 min ahead (outside clock skew) -> hidden",
  termsWith({ exactPromotionsEnabled: true, verifiedAt: iso(6 * MIN) }) === false);

// --- plan gate never routes around the top-level policy ---
gate.setCfg(baseCfg({ exactPromotionsEnabled: false }));
check("plan gate: fresh verified plan is still hidden while policy is false",
  gate.planFresh(freshPlan()) === false);
gate.setCfg(baseCfg({ exactPromotionsEnabled: true }));
check("plan gate: fresh verified plan passes once policy is true",
  gate.planFresh(freshPlan()) === true);
check("plan gate: true + unverified plan -> hidden",
  gate.planFresh(Object.assign(freshPlan(), { verified: false })) === false);
check("plan gate: true + plan verified:'true' string -> hidden",
  gate.planFresh(Object.assign(freshPlan(), { verified: "true" })) === false);
check("plan gate: true + stale plan stamp -> hidden",
  gate.planFresh(Object.assign(freshPlan(), { verifiedAt: iso(-8 * DAY) })) === false);
check("plan gate: true + unsafe plan source -> hidden",
  gate.planFresh(Object.assign(freshPlan(), { sourceUrl: "http://www.lacks.com/x" })) === false);

// --- financing.enabled and the policy are independent ---
check("financing disabled + policy true -> hidden",
  termsWith({ enabled: false, exactPromotionsEnabled: true }) === false);
check("financing enabled:'true' string + policy true -> hidden",
  termsWith({ enabled: "true", exactPromotionsEnabled: true }) === false);

// --- refreshing the stamp is NOT authorization ---
{
  const c = baseCfg({ exactPromotionsEnabled: false, verifiedAt: iso(-8 * DAY) });
  gate.setCfg(c);
  const beforeRefresh = gate.termsFresh();
  c.verifiedAt = iso(-1 * MIN);            // simulate a re-verification stamp
  c.plans[0].verifiedAt = iso(-1 * MIN);
  const afterRefresh = gate.termsFresh();
  check("false + refreshed timestamp -> still hidden (re-verification is not authorization)",
    beforeRefresh === false && afterRefresh === false);
}

// --- source pins: one authoritative strict gate, no scattered copies ---
check("gate uses a strict identity test on the policy field",
  /f\.exactPromotionsEnabled !== true/.test(srcFresh));
check("policy is checked before timestamp/source work in the gate",
  srcFresh.indexOf("exactPromotionsEnabled") < srcFresh.indexOf("Date.parse"));
check("financingPlanFresh still requires financingTermsFresh()",
  /financingTermsFresh\(\)/.test(srcPlan));
check("exactly one property read of the policy in index.html (no scattered copies)",
  (html.match(/\.exactPromotionsEnabled/g) || []).length === 1);
check("the policy is never assigned/defaulted in index.html",
  !/exactPromotionsEnabled\s*=[^=]/.test(html));
check("no truthy (==) policy test anywhere in index.html",
  !/exactPromotionsEnabled\s*==[^=]/.test(html));

console.log(`\nExact-promotions policy check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
