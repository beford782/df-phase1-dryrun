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

console.log(`\nIntegrity repairs check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
