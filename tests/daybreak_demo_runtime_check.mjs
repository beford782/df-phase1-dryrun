// Daybreak demo runtime-integration check (PR 2).
//
// Executes the REAL promotion helpers extracted from index.html — scenario
// resolution, the time gate, item/brand matching, badge Sample/Ejemplo
// treatment, the results-cue disclosure branch, the drawer disclosure + detail
// blocks, the expiry line — against the real mattress catalog and the demo
// configuration exactly as the server/page injects it (illustrative scenario
// active, both items stamped with a generated endsAt). Also executes the real
// email-preview gate expressions to prove the scenario blocks submission and
// the analytics event stays 'email_previewed' EVEN when a nonblank,
// production-like gasUrl is supplied to the test harness.
//
// Run: node tests/daybreak_demo_runtime_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const MATTRESSES = JSON.parse(readFileSync(join(root, "data", "mattresses.json"), "utf8"));
const PROD_CFG = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));
const FIXTURE = JSON.parse(readFileSync(join(root, "demo", "daybreak-black-friday.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " - " + detail : ""}`); }
}
function extract(re, name) {
  const m = html.match(re);
  check(`extracted ${name}`, !!m);
  return m ? m[0] : "";
}

// ---- the injected demo configuration (as the server/page builds it) --------
const LAUNCH_MS = Date.parse("2026-11-27T09:00:00-06:00");
const ENDS_MS = LAUNCH_MS + FIXTURE.durationHours * 3600 * 1000;
const ENDS_ISO = new Date(ENDS_MS).toISOString();
const scenario = JSON.parse(JSON.stringify(FIXTURE.scenario));
scenario.startAt = new Date(LAUNCH_MS).toISOString();
scenario.endsAt = ENDS_ISO;
for (const it of scenario.items) { it.endsAt = ENDS_ISO; it.expiration = "2026-11-30 09:00"; }
const DEMO_CFG = JSON.parse(JSON.stringify(PROD_CFG));
DEMO_CFG.gasUrl = "";
DEMO_CFG.promotions = {
  schemaVersion: 1,
  activeScenario: FIXTURE.scenarioId,
  allowedSourceHosts: ["lacks.com"],
  scenarios: { [FIXTURE.scenarioId]: scenario },
};

// ---- extraction -------------------------------------------------------------
const SRC = [
  extract(/function getActivePromotionScenario\(\) \{[\s\S]*?\n    \}/, "getActivePromotionScenario()"),
  extract(/function promotionActiveAt\(p, nowMs\) \{[\s\S]*?\n    \}/, "promotionActiveAt()"),
  extract(/function getScenarioDisclosure\(\) \{[\s\S]*?\n    \}/, "getScenarioDisclosure()"),
  extract(/function getMattressPromotions\(mattress\) \{[\s\S]*?\n    \}/, "getMattressPromotions()"),
  extract(/function getMattressPromotion\(mattress\) \{[\s\S]*?\n    \}/, "getMattressPromotion()"),
  extract(/function getStorewidePromotions\(\) \{[\s\S]*?\n    \}/, "getStorewidePromotions()"),
  extract(/function promotionBadgeLabel\(promotion\) \{[\s\S]*?\n    \}/, "promotionBadgeLabel()"),
  extract(/function promotionBadgeHtml\(promotion\) \{[\s\S]*?\n    \}/, "promotionBadgeHtml()"),
  extract(/function promotionOfferTabHtml\(promotion\) \{[\s\S]*?\n    \}/, "promotionOfferTabHtml()"),
  extract(/function promotionExpiryText\(p\) \{[\s\S]*?\n    \}/, "promotionExpiryText()"),
  extract(/function promotionDetailBlockHtml\(p\) \{[\s\S]*?\n    \}/, "promotionDetailBlockHtml()"),
  extract(/function promotionDrawerDetailHtml\(mattress\) \{[\s\S]*?\n    \}/, "promotionDrawerDetailHtml()"),
  extract(/function renderResultsOfferCue\(mattresses\) \{[\s\S]*?\n    \}/, "renderResultsOfferCue()"),
  extract(/function L\(obj\) \{[\s\S]*?\n    \}/, "L()"),
  extract(/function escapeHtml\([\s\S]*?\n    \}/, "escapeHtml()"),
].join("\n");
if (failed) { console.log("\nextraction failed - aborting"); process.exit(1); }

function harness(lang) {
  const cueEl = {
    textContent: "", attrs: {}, classes: new Set(),
    setAttribute(k, v) { this.attrs[k] = v; },
    classList: null,
  };
  cueEl.classList = {
    add: (c) => cueEl.classes.add(c),
    remove: (c) => cueEl.classes.delete(c),
  };
  const api = new Function("STORE_CONFIG", "currentLang", "cueEl", `"use strict";
    var document = { getElementById: function (id) {
      return id === 'resultsOfferCue' ? cueEl : null; } };
    function storeName() { return (STORE_CONFIG && STORE_CONFIG.storeName) || 'Store'; }
    ${SRC}
    return {
      scenario: getActivePromotionScenario,
      activeAt: promotionActiveAt,
      disclosure: getScenarioDisclosure,
      forMattress: getMattressPromotions,
      storewide: getStorewidePromotions,
      badgeLabel: promotionBadgeLabel,
      offerTab: promotionOfferTabHtml,
      expiry: promotionExpiryText,
      drawer: promotionDrawerDetailHtml,
      renderCue: renderResultsOfferCue,
    };`)(DEMO_CFG, lang, cueEl);
  return { api, cueEl };
}

const all = Object.values(MATTRESSES).flat();
const restonic = all.find((m) => m.brand === "Restonic");
const chattam = all.find((m) => m.brand === "Chattam & Wells");
const tempur = all.find((m) => m.brand === "Tempur-Pedic");
const genesis = all.find((m) => m.brand === "Genesis");
check("catalog carries qualifying and nonqualifying brands",
  !!restonic && !!chattam && !!tempur && !!genesis);

// ---- EN ---------------------------------------------------------------------
const { api: en, cueEl: cueEn } = harness("en");
const sc = en.scenario();
check("active scenario resolves to the illustrative demo",
  !!sc && sc.kind === "illustrative-demo" && sc.demoOnly === true);
const restonicPromos = en.forMattress(restonic);
check("qualifying Restonic mattress receives both promotions",
  restonicPromos.length === 2);
check("qualifying Chattam & Wells mattress receives both promotions",
  en.forMattress(chattam).length === 2);
check("nonqualifying Tempur-Pedic mattress receives none",
  en.forMattress(tempur).length === 0);
check("nonqualifying Genesis mattress receives none",
  en.forMattress(genesis).length === 0);
check("storewide list is empty (fixture ships none)",
  en.storewide().length === 0);
check("both items are active at the generated launch time",
  scenario.items.every((it) => en.activeAt(it, LAUNCH_MS + 1000)));
check("both items expire after the generated endsAt",
  scenario.items.every((it) => !en.activeAt(it, ENDS_MS + 60 * 1000)));
check("EN badge labels carry the Sample treatment",
  restonicPromos.every((p) => en.badgeLabel(p).startsWith("Sample · ")));
const discEn = en.disclosure();
check("EN disclosure resolves and denies being a current offer",
  !!discEn && /not current Lacks promotions/.test(discEn.en));
en.renderCue([restonic, tempur]);
check("results cue shows the scenario disclosure, not a current-offers claim",
  cueEn.textContent === discEn.en
  && !/have current .* offers/.test(cueEn.textContent)
  && !/offers are available/.test(cueEn.textContent));
check("results cue is labeled NOTICE, not OFFER",
  cueEn.attrs["data-label"] === "NOTICE");
const drawerEn = en.drawer(restonic);
check("drawer carries the disclosure before both offers",
  drawerEn.indexOf("BLACK FRIDAY DEMO") > -1
  && drawerEn.indexOf("BLACK FRIDAY DEMO") < drawerEn.indexOf("Black Friday sleep bonus")
  && drawerEn.includes("choose two cooling pillows"));
check("drawer shows the generated expiration through the existing expiry line",
  drawerEn.includes("Good through: 2026-11-30 09:00"));
check("no ticking countdown vocabulary reaches the drawer",
  !/second|minute|countdown/i.test(drawerEn));

// ---- ES ---------------------------------------------------------------------
const { api: es, cueEl: cueEs } = harness("es");
const restonicEs = es.forMattress(restonic);
check("ES badge labels carry the Ejemplo treatment",
  restonicEs.every((p) => es.badgeLabel(p).startsWith("Ejemplo · ")));
const discEs = es.disclosure();
check("ES disclosure resolves with the vigentes denial",
  !!discEs && /No son promociones vigentes/.test(discEs.es));
es.renderCue([restonic, tempur]);
check("ES results cue shows the Spanish disclosure with AVISO label",
  cueEs.textContent === discEs.es && cueEs.attrs["data-label"] === "AVISO");
const drawerEs = es.drawer(restonic);
check("ES drawer is fully localized (disclosure + both offers)",
  drawerEs.includes("DEMOSTRACIÓN DE BLACK FRIDAY")
  && drawerEs.includes("bono de descanso de Black Friday")
  && drawerEs.includes("dos almohadas frescas"));
check("ES drawer expiry line is localized",
  drawerEs.includes("Válido hasta: 2026-11-30 09:00"));

// ---- illustrative terminology on the DERIVED demo page ----------------------
// The root page keeps its legacy historical-demo strings (back-compat, pinned
// below); the derived demo page relabels the disclosed-scenario surfaces with
// the approved illustrative terminology (builder T6). Executed, not grepped:
// the demo page's own extracted offer-tab renderer must produce the approved
// labels in both languages.
const demoHtml = readFileSync(join(root, "demo", "black-friday", "index.html"), "utf8");
function demoOfferTab(lang) {
  const srcScenario = demoHtml.match(/function getActivePromotionScenario\(\) \{[\s\S]*?\n    \}/)[0];
  const srcDisc = demoHtml.match(/function getScenarioDisclosure\(\) \{[\s\S]*?\n    \}/)[0];
  const srcTab = demoHtml.match(/function promotionOfferTabHtml\(promotion\) \{[\s\S]*?\n    \}/)[0];
  const srcL = demoHtml.match(/function L\(obj\) \{[\s\S]*?\n    \}/)[0];
  return new Function("STORE_CONFIG", "currentLang", `"use strict";
    ${srcScenario}
    ${srcDisc}
    ${srcTab}
    ${srcL}
    return promotionOfferTabHtml({ badge: { en: "x", es: "x" } });`)(DEMO_CFG, lang);
}
check("derived demo page extracted successfully", demoHtml.length > 100000);
check("demo offer tab renders 'Black Friday Demo' in EN",
  /Black Friday Demo/.test(demoOfferTab("en"))
  && !/Historical/.test(demoOfferTab("en")));
check("demo offer tab renders 'Demo de Black Friday' in ES",
  /Demo de Black Friday/.test(demoOfferTab("es"))
  && !/histórica/.test(demoOfferTab("es")));
for (const banned of ["Historical Promo", "Historical Demo",
                      "Promo histórica", "Demostración histórica",
                      "Details confirmed by your",
                      "Detalles confirmados por tu"]) {
  check(`demo page carries no historical terminology: ${banned}`,
    !demoHtml.includes(banned));
}
check("demo drawer kicker uses the illustrative labels in both languages",
  demoHtml.includes("Black Friday Event Preview · Illustrative Demo")
  && demoHtml.includes("Vista Previa de Black Friday · Demostración Ilustrativa"));
check("demo drawer heading uses the illustrative labels in both languages",
  demoHtml.includes("Illustrative qualification and bonus details")
  && demoHtml.includes("Detalles ilustrativos de elegibilidad y bono"));
check("production root retains its legacy historical-demo terminology unchanged",
  html.includes("Historical Promo") && html.includes("Historical Demo")
  && html.includes("Promo histórica") && html.includes("Demostración histórica")
  && html.includes("Details confirmed by your"));

// ---- email stays preview-only ----------------------------------------------
// Execute the REAL gate expressions from sendResults() and renderEmailChrome()
// with a nonblank, production-like gasUrl: the scenario-level block must keep
// the flow preview-only and the analytics event must stay 'email_previewed'.
const sendGate = extract(
  /const _submitScenario = getActivePromotionScenario\(\);[\s\S]*?const isEmailPreview = [^\n]+/,
  "sendResults() email gate");
// Trust gate (2026-08-21): renderEmailChrome() derives preview mode from the
// shared emailDeliveryLive() helper — the same two conditions (gasUrl
// configured AND the scenario does not block submission) sendResults() gates
// its POST on — so the REAL helper is extracted and executed with the gate.
const liveHelper = extract(
  /function emailDeliveryLive\(\) \{[\s\S]*?\n    \}/,
  "emailDeliveryLive() shared mode helper");
const chromeGate = extract(
  /var isDemoMode = !emailDeliveryLive\(\);/,
  "renderEmailChrome() demo-mode gate");
check("analytics event is chosen by the preview flag",
  /analytics\.log\(isEmailPreview \? 'email_previewed' : 'email_submitted'/.test(html));

const gateResult = new Function("STORE_CONFIG", `"use strict";
  ${SRC}
  const gasUrl = 'https://script.google.com/macros/s/PRODUCTION-LIKE/exec';
  ${sendGate}
  var _eventName = isEmailPreview ? 'email_previewed' : 'email_submitted';
  ${liveHelper}
  ${chromeGate}
  return { isEmailPreview: isEmailPreview, eventName: _eventName, isDemoMode: isDemoMode };
`)(DEMO_CFG);
check("nonblank gasUrl + demo scenario -> email stays preview-only",
  gateResult.isEmailPreview === true);
check("the analytics/email payload records a preview, never a live submission",
  gateResult.eventName === "email_previewed");
check("the email screen renders in demo mode under the scenario block",
  gateResult.isDemoMode === true);

console.log(`\nDaybreak demo runtime check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
