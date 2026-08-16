// Financing specialist-agenda gate.
// Pins the salesperson-led orientation model: semantic discussion items are
// marked in the sheet and carried into handoff without becoming product
// selections, scoring inputs, diagnostics, persisted data, or email payload.
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
function extract(re, label) {
  const m = html.match(re);
  check(`${label} found`, !!m);
  return m ? m[0] : "";
}

const items = extract(/function finAgendaItems\(\)\s*\{[\s\S]*?\n    \}/, "finAgendaItems()");
const control = extract(/function finAgendaControl\(item\)\s*\{[\s\S]*?\n    \}/, "finAgendaControl()");
const toggle = extract(/window\.toggleFinancingAgenda = function\(key\)\s*\{[\s\S]*?\n    \};/, "toggleFinancingAgenda()");
const handoff = extract(/function renderHandoffFinancing\(\)\s*\{[\s\S]*?\n    \}/, "renderHandoffFinancing()");
const decline = extract(/window\.setFinancingInterestChoice = function\(state\)\s*\{[\s\S]*?\n    \};/, "handoff not-now control");
const eventBase = extract(/function finEventBase\(placement\)\s*\{[\s\S]*?\n    \}/, "finEventBase()");
const wipe = extract(/function resetSessionState\(opts\)\s*\{[\s\S]{0,9000}/, "resetSessionState()");

// Model A: a single provider-level promotional category, individual evergreen
// and installment paths, and a separate Mexico scenario. Never per-rate cards.
check("promotions group by provider", items.includes("finPromotionalByProvider(groups.promotional)"));
check("installment and evergreen paths remain individual", items.includes("groups.installment.concat(groups.evergreen)"));
check("Mexico is selected by presentation scenario", items.includes("groups['scenario-mexico']"));
check("agenda keys contain no rates or term values", !/apr|termMonths|purchaseMinimum/.test(items));

// Toggle controls are explicit stateful buttons and work for touch presentation.
check("sheet controls expose aria-pressed", control.includes("aria-pressed=\"") && control.includes("is-marked"));
check("sheet controls preserve touch preventDefault", control.includes("ontouchend=\"event.preventDefault()"));
check("only inventory keys can be toggled", toggle.includes("finAgendaItems().some"));
check("unmark deletes the key instead of retaining false residue", toggle.includes("delete financingAgenda[key]"));
check("marking clears the not-now state", toggle.includes("financingAgendaDismissed = false"));

// Handoff is a salesperson-guided discussion agenda, not an application.
check("handoff renders only selected agenda items", handoff.includes("var selected = finAgendaSelected()") && handoff.includes("fin-agenda-list"));
check("handoff includes the consequence statement", handoff.includes("agendaConsequence"));
check("handoff retains an equally available not-now route", handoff.includes("hf2FinancingInterestNotNow") && handoff.includes("agendaNotNow"));
check("handoff can reopen the sheet to change the agenda", handoff.includes("agendaChange"));
check("renderer never focuses a hidden handoff", !handoff.includes(".focus("));
check("handoff not-now rerender restores focus to the replacement control",
  decline.includes("hadFocusInside") && decline.includes("hf2FinancingInterestChange")
  && decline.includes("hf2FinancingInterestNotNow") && decline.includes("target.focus()"));

// The copy must describe a salesperson/customer conversation, not self-service.
const copy = cfg.financing.copy;
for (const lang of ["en", "es"]) {
  check(`[${lang}] agenda prompt is bilingual`, typeof copy.agendaPrompt?.[lang] === "string" && copy.agendaPrompt[lang].length > 20);
  check(`[${lang}] no-application consequence is bilingual`, typeof copy.agendaConsequence?.[lang] === "string" && copy.agendaConsequence[lang].length > 20);
}
check("English prompt explicitly says review together", /together/i.test(copy.agendaPrompt.en));
check("English prompt names the customer as discussion owner", /customer/i.test(copy.agendaPrompt.en));

// Privacy and isolation: no choice telemetry, no transport, no persistence,
// and the one authoritative session wipe clears both agenda structures.
check("diagnostic base excludes financing interest and agenda fields", !/\b(interest|agenda|planId)\s*:/.test(eventBase));
check("email payload does not transmit interest or agenda", !/financing:[\s\S]{0,700}(interest|agenda)/.test(html));
check("agenda state is memory-only", !/(localStorage|sessionStorage|indexedDB)\.[^(]*\([^)]*financingAgenda/.test(html));
check("session wipe clears the agenda map", wipe.includes("financingAgenda = {}"));
check("session wipe clears the declined state", wipe.includes("financingAgendaDismissed = false"));
check("legacy global financing-interest state is gone", !/var financingInterest\b/.test(html));

// Presentation-only means it cannot enter the scoring function.
const score = extract(/function calculateScores\([^)]*\)\s*\{[\s\S]*?\n    \}/, "calculateScores()");
check("agenda state is absent from score calculation", !/financingAgenda|finAgenda/.test(score));

// ===========================================================================
// Behavioural announcement coverage.
//
// The agenda model changed which controls announce, not whether announcement
// works. The handoff still owns one aria-live region, still driven by the real
// announceFinInterest() / clearFinInterestAnnouncement() /
// cancelFinInterestPending(). Those functions are regex-extracted from
// index.html and EXECUTED here against a stub DOM and controlled timers — not
// reimplemented. Static-only pins would not have caught the defects these
// assertions cover (stale-language text landing after a switch, a queued
// utterance surviving the session wipe, a hidden handoff being populated).
//
// Deliberately NOT restored: the old global financing-interest state machine
// and the _finInterestFocusFrame / requestAnimationFrame focus-restoration
// tests. Both describe mechanisms this change removed; the agenda's focus
// restoration is synchronous and is asserted above.
// ===========================================================================

const annSrc = extract(/function announceFinInterest\(state\)\s*\{[\s\S]*?\n    \}/, "announceFinInterest()");
const clearSrc = extract(/function clearFinInterestAnnouncement\(\)\s*\{[\s\S]*?\n    \}/, "clearFinInterestAnnouncement()");
const cancelSrc = extract(/function cancelFinInterestPending\(\)\s*\{[\s\S]*?\n    \}/, "cancelFinInterestPending()");

// Comments legitimately DISCUSS the retired state, so every source-level
// assertion below reads the code with comments stripped.
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
const annCode = stripComments(annSrc);

// 0. The announcer maps exactly the two states the handoff can produce. The
//    third arm was unreachable once the sheet toggles stopped announcing, and
//    its copy key ('interestMarkedAnnounce') has been retired with it.
check("announceFinInterest() has no 'interested' mapping",
  !/'interested'/.test(annCode) && !annCode.includes("interestMarkedAnnounce"));
check("announceFinInterest() maps exactly the two reachable states",
  /state === 'not_now' \? 'interestNotNowAnnounce'/.test(annCode)
  && (annCode.match(/interestNotNowAnnounce|interestClearedAnnounce/g) || []).length === 2);
check("setFinancingInterestChoice() still rejects every other state",
  /if \(state !== 'not_now' && state !== 'undecided'\) return;/.test(decline));
check("interestMarkedAnnounce is absent from the whole app source",
  !html.includes("interestMarkedAnnounce"));

// 1. The region the announcer writes to: exact markup, exactly one of it.
check("handoff live region markup is exact (sr-only / status / polite / atomic)",
  /<div\s+class="sr-only"\s+id="hf2FinancingStatus"\s+role="status"\s+aria-live="polite"\s+aria-atomic="true"><\/div>/.test(html));
check("handoff live region is unique",
  (html.match(/id="hf2FinancingStatus"/g) || []).length === 1);

function makeAnnouncer() {
  const h = { lang: "en", visible: true, writes: [], timers: [] };
  const FCmap = {
    en: { interestNotNowAnnounce: "NOTNOW-EN", interestClearedAnnounce: "CLEARED-EN" },
    es: { interestNotNowAnnounce: "NOTNOW-ES", interestClearedAnnounce: "CLEARED-ES" },
  };
  const region = {
    _t: "initial",
    get textContent() { return this._t; },
    set textContent(v) { this._t = v; h.writes.push(v); },
  };
  h.api = new Function(
    "document", "FC", "finHandoffVisible", "setTimeout", "clearTimeout",
    `var _finInterestAnnounceTimer = null;
     ${annSrc}
     ${clearSrc}
     ${cancelSrc}
     return {
       announce: announceFinInterest,
       clear: clearFinInterestAnnouncement,
       cancel: cancelFinInterestPending,
       timer: function() { return _finInterestAnnounceTimer; }
     };`)(
    { getElementById: (id) => (id === "hf2FinancingStatus" ? region : null) },
    (k) => FCmap[h.lang][k] || "",
    () => h.visible,
    (cb) => { h.timers.push({ cb, cleared: false, done: false }); return h.timers.length; },
    (id) => { if (h.timers[id - 1]) h.timers[id - 1].cleared = true; });
  h.text = () => region.textContent;
  h.flush = () => h.timers.forEach((t) => { if (!t.cleared && !t.done) { t.done = true; t.cb(); } });
  h.pending = () => h.timers.filter((t) => !t.cleared && !t.done).length;
  return h;
}

// 2. Clear synchronously, repopulate in the deferred callback. The clear+set
//    pair is what makes a repeated identical sentence a real DOM mutation.
{
  const h = makeAnnouncer();
  h.api.announce("not_now");
  check("announcement clears the region synchronously", h.text() === "");
  check("announcement timer id is retained while pending", h.api.timer() !== null);
  h.flush();
  check("deferred callback populates the message", h.text() === "NOTNOW-EN");
  check("timer id is released once the callback runs", h.api.timer() === null);
}

// 3. Repeats. The same handoff action can be requested twice in a row.
{
  const h = makeAnnouncer();
  h.api.announce("not_now"); h.flush();
  const first = h.text();
  h.api.announce("not_now");
  check("repeat clears the region again before repopulating", h.text() === "");
  h.flush();
  check("repeat re-announces the identical message",
    first === "NOTNOW-EN" && h.text() === "NOTNOW-EN");
}

// 4. Supersession: a newer announcement cancels the older pending one.
{
  const h = makeAnnouncer();
  h.api.announce("not_now");
  h.api.announce("undecided");
  check("a newer announcement cancels the prior pending timer",
    h.timers[0].cleared === true && h.pending() === 1);
  h.flush();
  check("only the newest message lands", h.text() === "CLEARED-EN");
}

// 5. A hidden or inactive handoff is never populated — checked at call time...
{
  const h = makeAnnouncer();
  h.visible = false;
  h.api.announce("not_now");
  check("hidden handoff: nothing scheduled and the region is untouched",
    h.api.timer() === null && h.pending() === 0 && h.text() === "initial");
}

// 6. ...and re-checked inside the callback, for a handoff that hides mid-defer.
{
  const h = makeAnnouncer();
  h.api.announce("not_now");
  h.visible = false;
  h.flush();
  check("handoff hidden mid-defer: the callback declines to populate",
    h.text() === "" && h.writes.filter((w) => w === "NOTNOW-EN").length === 0);
}

// 7. FC(key) is resolved inside the callback, so a language switch landing
//    mid-defer speaks the current language rather than the captured one.
{
  const h = makeAnnouncer();
  h.api.announce("not_now");
  h.lang = "es";
  h.flush();
  check("message text is resolved at callback time, not at call time",
    h.text() === "NOTNOW-ES");
}

// 8. Language switch: drop the prior-language sentence, announce nothing new,
//    and make sure an in-flight utterance cannot land in the new language.
{
  const h = makeAnnouncer();
  h.api.announce("not_now"); h.flush();
  check("prior-language sentence is present before the switch", h.text() === "NOTNOW-EN");
  const before = h.writes.length;
  h.lang = "es";
  h.api.clear();
  const newWrites = h.writes.slice(before);
  check("the switch removes the prior-language sentence", h.text() === "");
  check("clearing writes only the empty string (it announces nothing)",
    newWrites.length === 1 && newWrites[0] === "");
  check("no announcement is left queued after the switch", h.pending() === 0);

  h.api.announce("undecided");
  h.api.clear();
  h.flush();
  check("an in-flight announcement cannot land after the switch", h.text() === "");
}
check("switchLanguage drops the announcement before re-rendering financing",
  /clearFinInterestAnnouncement\(\);\s*\n\s*renderAllFinancingSurfaces\(\);/.test(html));
check("the sheet status region is deliberately NOT dropped by the switch",
  !/clearFinancingSheetStatus/.test(html) && /region\.textContent = _finSheetStale/.test(html));

// 9. The session wipe cancels queued announcement work BEFORE it resets the
//    agenda, so no utterance composed for the previous customer can run after
//    the reset. Behavioural half first, then the ordering pin in the wipe.
{
  const h = makeAnnouncer();
  h.api.announce("not_now");
  h.api.cancel();
  check("cancel clears the pending announcement and releases the id",
    h.timers[0].cleared === true && h.api.timer() === null && h.pending() === 0);
  h.flush();
  check("a cancelled announcement never lands", h.text() === "");
}
{
  const cancelAt = wipe.indexOf("cancelFinInterestPending();");
  const agendaAt = wipe.indexOf("financingAgenda = {};");
  check("the wipe cancels pending announcement work", cancelAt > -1);
  check("the wipe drops the announcement region text",
    wipe.indexOf("clearFinInterestAnnouncement();") > -1);
  check("cancellation precedes the agenda reset",
    cancelAt > -1 && agendaAt > -1 && cancelAt < agendaAt);
}

// 10. The wipe empties the status region itself, via the declarative text
//     inventory. Assert both halves: the region is listed, and every listed id
//     is emptied. (tests/session_safety_check.mjs proves the emptying
//     behaviourally against a seeded sentinel.)
{
  const inventory = (html.match(/var SESSION_TEXT_IDS = \[([\s\S]*?)\];/) || [, ""])[1];
  check("the wipe text inventory includes the handoff status region",
    /'hf2FinancingStatus'/.test(inventory));
  check("the wipe empties every id in that inventory",
    /SESSION_TEXT_IDS\.forEach\(function\(id\) \{[\s\S]{0,160}textContent = '';/.test(wipe));
}

// 11. The boundary this change turns on: sheet agenda controls are TOGGLES and
//     announce through their own aria-pressed, so they must never write to the
//     handoff region. The handoff's own ACTION buttons still must. Both halves
//     are executed against a spy announcer, not grepped.
check("toggleFinancingAgenda contains no call to the handoff announcer (source)",
  !/announceFinInterest\s*\(/.test(stripComments(toggle)));
{
  const spy = [];
  const api = new Function(
    "finAgendaItems", "document", "analytics", "finEventBase",
    "renderAllFinancingSurfaces", "announceFinInterest", "window",
    `var financingAgenda = {};
     var financingAgendaDismissed = true;
     ${toggle}
     return {
       run: window.toggleFinancingAgenda,
       agenda: function() { return financingAgenda; },
       dismissed: function() { return financingAgendaDismissed; }
     };`)(
    () => [{ key: "pathA" }, { key: "pathB" }],
    { activeElement: null, getElementById: () => null },
    { log: () => {} },
    () => ({}),
    () => {},
    (state) => spy.push(state),
    {});

  api.run("pathA");
  check("marking an agenda item records it", api.agenda().pathA === true);
  check("marking an agenda item clears the not-now state", api.dismissed() === false);
  check("marking does NOT announce through the handoff region", spy.length === 0);
  api.run("pathA");
  check("unmarking removes the key rather than storing false",
    Object.prototype.hasOwnProperty.call(api.agenda(), "pathA") === false);
  check("unmarking does NOT announce through the handoff region", spy.length === 0);
  api.run("notAnAgendaKey");
  check("an unknown key changes nothing and announces nothing",
    Object.keys(api.agenda()).length === 0 && spy.length === 0);
}
{
  const spy = [];
  const api = new Function(
    "document", "analytics", "finEventBase", "renderAllFinancingSurfaces",
    "finHandoffVisible", "announceFinInterest", "window",
    `var financingAgenda = { pathA: true };
     var financingAgendaDismissed = false;
     ${decline}
     return {
       run: window.setFinancingInterestChoice,
       agenda: function() { return financingAgenda; },
       dismissed: function() { return financingAgendaDismissed; }
     };`)(
    { activeElement: null, getElementById: () => null },
    { log: () => {} },
    () => ({}),
    () => {},
    () => true,
    (state) => spy.push(state),
    {});

  api.run("not_now");
  check("the handoff not-now ACTION does announce", spy.length === 1 && spy[0] === "not_now");
  check("not-now clears the agenda and records the declined state",
    Object.keys(api.agenda()).length === 0 && api.dismissed() === true);
  api.run("undecided");
  check("the handoff change ACTION announces the cleared message",
    spy.length === 2 && spy[1] === "undecided");
  check("change reopens the undecided state", api.dismissed() === false);
  api.run("interested");
  check("no other state reaches the handoff announcer", spy.length === 2);
}

console.log(`\nFinancing specialist agenda check: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
