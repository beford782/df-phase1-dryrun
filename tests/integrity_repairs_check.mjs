// Integrity repairs check — PR 1 (Daybreak preparation, owner ruling 2026-08-13).
//
// Owns two repairs and keeps them repaired:
//
//  A. Unbacked availability claims stay retired. Every result card used to
//     render "In stock at <store>" / "In stock" ("Disponible en <store>" /
//     "Disponible") with no inventory data source anywhere in the deployment
//     — a fabricated availability claim, and a white-label violation (the
//     hardcoded strings shadowed the unread text.inStockText config pair).
//     This suite pins the strings, the stock CSS classes, and the stockText
//     variable out of index.html, and holds the two card renderers to zero
//     availability vocabulary so the claim cannot return under a new spelling
//     of the same word.
//
//  B. The session wipe actually closes the RSA roster panel. The panel is
//     hidden-attribute-driven (toggleHf2RsaPanel); the pre-repair
//     SESSION_LAYERS entry stripped an is-open class the element never
//     carries, so a wipe fired with the roster open left it rendered over the
//     next customer's handoff. The inventory entry must use hiddenAttr, and
//     the REAL wipeLayer() executed against a stub must end with the panel
//     hidden. A negative control proves the class-strip form cannot close it,
//     so this suite fails if the entry ever reverts.
//
// Run: node tests/integrity_repairs_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");

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

// --- A. availability claims stay retired ---------------------------------

check("no noct-toppick-stock class anywhere (markup or CSS)",
  !/noct-toppick-stock/.test(html));
check("no noct-support-stock class anywhere (markup or CSS)",
  !/noct-support-stock/.test(html));
check("no stockText variable anywhere",
  !/\bstockText\b/.test(html));
check("no 'In stock' literal anywhere",
  !/In stock/.test(html));
check("no 'Disponible en <store>' literal anywhere",
  !/Disponible en/.test(html));
check("no bare 'Disponible' availability literal anywhere",
  !/'Disponible'/.test(html));

// The renderers themselves carry zero availability vocabulary, so the claim
// cannot come back under a different class name or phrasing of "stock".
const srcTopPick = extract(/function renderTopPickCard\(m, tier\) \{[\s\S]*?\n    \}/,
  "renderTopPickCard()");
const srcSupport = extract(/function renderSupportingCards\(mattresses, tier\) \{[\s\S]*?\n    \}/,
  "renderSupportingCards()");
check("renderTopPickCard carries no stock/availability vocabulary",
  !/stock|in.?stock|disponible|availab/i.test(srcTopPick));
check("renderSupportingCards carries no stock/availability vocabulary",
  !/stock|in.?stock|disponible|availab/i.test(srcSupport));

// --- B. the wipe closes the RSA roster panel -----------------------------

const srcLayers = extract(/var SESSION_LAYERS = \[[\s\S]*?\n    \];/,
  "SESSION_LAYERS inventory");
const srcWipe = extract(/function wipeLayer\(spec\) \{[\s\S]*?\n    \}/,
  "wipeLayer()");

check("the hf2RsaPanel inventory entry uses hiddenAttr",
  /\{ id: 'hf2RsaPanel', hiddenAttr: true \}/.test(srcLayers));
check("the hf2RsaPanel inventory entry no longer strips is-open",
  !/hf2RsaPanel'[^}]*is-open/.test(srcLayers));

// Execute the real inventory + wipe against a stub document.
function stubEl() {
  return {
    hidden: false,
    classes: { removed: [], added: [] },
    classList: null,
    attrs: {},
    style: {},
    setAttribute(k, v) { this.attrs[k] = v; },
  };
}
function makeStub() {
  const el = stubEl();
  el.classList = {
    remove: (c) => el.classes.removed.push(c),
    add: (c) => el.classes.added.push(c),
  };
  return el;
}

const harness = new Function("document", `
  ${srcLayers}
  ${srcWipe}
  return { SESSION_LAYERS: SESSION_LAYERS, wipeLayer: wipeLayer };
`);

{
  const panel = makeStub();
  const doc = { getElementById: (id) => (id === "hf2RsaPanel" ? panel : null) };
  const mod = harness(doc);
  const spec = mod.SESSION_LAYERS.find((s) => s.id === "hf2RsaPanel");
  check("SESSION_LAYERS still inventories hf2RsaPanel", !!spec);
  if (spec) mod.wipeLayer(spec);
  check("executing the real wipeLayer() on the real entry hides the panel",
    panel.hidden === true);
}

// Negative control: the pre-repair entry shape cannot close the panel. If
// this ever starts "closing" it, the element model changed and this suite's
// positive assertion above needs re-derivation.
{
  const panel = makeStub();
  const doc = { getElementById: (id) => (id === "hf2RsaPanel" ? panel : null) };
  const mod = harness(doc);
  mod.wipeLayer({ id: "hf2RsaPanel", remove: ["is-open"] });
  check("negative control: the old class-strip entry leaves the panel open",
    panel.hidden === false && panel.classes.removed.includes("is-open"));
}

// --- C. Slice 5 C0: every wipe-inventory id resolves to a shipped element ---
//
// wipeLayer() reads `document.getElementById(spec.id)` and RETURNS on null
// (index.html, wipeLayer). The content/text loops do the same. So a typo'd or
// retired id in SESSION_LAYERS / SESSION_CONTENT_IDS / SESSION_TEXT_IDS /
// SESSION_CONTACT_INPUT_IDS is a silent no-op on every wipe: nothing is left
// exposed (there is nothing there), but the inventory — the app's
// authoritative statement of what a wipe secures — stops meaning what it
// says. No suite asserted existence before this; every wipe assertion named
// an id a human already remembered. This is one-directional by design
// (inventory -> markup); the reverse (a markup container never added to any
// inventory) is not derivable without a declaration the code does not make.
//
// KNOWN DEAD ENTRIES AT 4a76503, exempted BY NAME AND DATE so the debt is
// visible rather than invisible. All three are residue of the retired
// _legacyShowAccessories renderer (its FUNCTION is quarantined and pinned by
// session_async_check; its DOM was deleted; its inventory entries were not).
// Removing them is governance cleanup outside Slice 5's scope. A fourth name
// appearing here is a NEW defect and fails.
const KNOWN_DEAD_IDS_2026_08_21 = new Set(['accCartBar', 'accessoriesGrid', 'accStatus']);
{
  const srcContent = extract(/var SESSION_CONTENT_IDS = \[[\s\S]*?\n    \];/, "SESSION_CONTENT_IDS inventory");
  const srcText = extract(/var SESSION_TEXT_IDS = \[[\s\S]*?\n    \];/, "SESSION_TEXT_IDS inventory");
  const srcContact = extract(/var SESSION_CONTACT_INPUT_IDS = \[[\s\S]*?\];/, "SESSION_CONTACT_INPUT_IDS inventory");
  const markupIds = new Set([...html.matchAll(/\bid="([A-Za-z0-9_:-]+)"/g)].map((m) => m[1]));
  const harvest = (src, re) => [...src.matchAll(re)].map((m) => m[1]);
  const layerIds = harvest(srcLayers, /\bid: '([A-Za-z0-9_-]+)'/g);
  const contentIds = harvest(srcContent, /'([A-Za-z0-9_-]+)'/g);
  const textIds = harvest(srcText, /'([A-Za-z0-9_-]+)'/g);
  const contactIds = harvest(srcContact, /'([A-Za-z0-9_-]+)'/g);
  check(`the four inventories were harvested non-empty (layers ${layerIds.length}, content ${contentIds.length}, text ${textIds.length}, contact ${contactIds.length})`,
    layerIds.length >= 20 && contentIds.length >= 30 && textIds.length >= 15 && contactIds.length >= 3);
  check(`the markup id universe was read (${markupIds.size} ids)`, markupIds.size > 200);
  const report = (name, ids) => {
    const unresolved = ids.filter((id) => !markupIds.has(id));
    const unexpected = unresolved.filter((id) => !KNOWN_DEAD_IDS_2026_08_21.has(id));
    const exempt = unresolved.filter((id) => KNOWN_DEAD_IDS_2026_08_21.has(id));
    check(`every ${name} id resolves to a shipped element${unexpected.length ? " — UNRESOLVED: " + unexpected.join(", ") : ""}${exempt.length ? " (dated exemptions: " + exempt.join(", ") + ")" : ""}`,
      unexpected.length === 0);
    return unresolved;
  };
  const deadFound = new Set([
    ...report("SESSION_LAYERS", layerIds),
    ...report("SESSION_CONTENT_IDS", contentIds),
    ...report("SESSION_TEXT_IDS", textIds),
    ...report("SESSION_CONTACT_INPUT_IDS", contactIds),
  ]);
  // The exemption list must describe reality exactly: an exempted id that
  // now resolves (someone cleaned it up) must be removed from the list in the
  // same change, so the exemption cannot outlive the debt it records.
  const staleExemptions = [...KNOWN_DEAD_IDS_2026_08_21].filter((id) => !deadFound.has(id));
  check(`the dated exemption list matches the dead set exactly${staleExemptions.length ? " — STALE EXEMPTION: " + staleExemptions.join(", ") : ""}`,
    staleExemptions.length === 0);

  // NON-VACUITY: a typo on a live id whose misspelling occurs NOWHERE in the
  // file must be reported. The typo string is chosen so it cannot collide with
  // a neighbouring real id (hf2Priorities / hf2PrioritiesSection,
  // compareTray / compareTraySlots are near-neighbours a careless typo could
  // land on and pass).
  const typoId = "financingSheetZZtypo";
  check("[non-vacuity] the typo string occurs nowhere in the shipped file", !html.includes(typoId));
  const mutated = srcLayers.replace("id: 'financingSheet'", `id: '${typoId}'`);
  check("[non-vacuity] the typo mutation applied exactly once",
    mutated !== srcLayers && (mutated.match(new RegExp(typoId, "g")) || []).length === 1);
  const mutatedUnresolved = harvest(mutated, /\bid: '([A-Za-z0-9_-]+)'/g)
    .filter((id) => !markupIds.has(id) && !KNOWN_DEAD_IDS_2026_08_21.has(id));
  check("[non-vacuity] the typo'd id is reported as unresolved by the same scan",
    mutatedUnresolved.length === 1 && mutatedUnresolved[0] === typoId);
  // Guard the guard: an extractor that returned nothing must not read as clean.
  check("[non-vacuity] an empty harvest would fail the non-empty floor rather than pass vacuously",
    !(harvest("", /\bid: '([A-Za-z0-9_-]+)'/g).length >= 20));
}

console.log(`\nIntegrity repairs check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
