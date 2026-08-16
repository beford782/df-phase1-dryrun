// Contrast check — Commit B (Cycle 1) invariants.
//
// Proves: (1) the REAL pickAccessibleForeground() extracted from index.html
// chooses a foreground with WCAG contrast >= 4.5:1 for the configured Lacks
// colors, the brand-neutral defaults, and edge cases; (2) the financing
// focus rules no longer derive from --store-primary and use the semantic
// two-ring tokens with a forced-colors override; (3) .fin-btn-primary keeps
// its hardcoded light-on-dark pairing.
//
// Ratio verification uses an INDEPENDENT luminance implementation below so
// a bug in the app helper cannot self-certify; the foreground CHOICE under
// test always comes from the real extracted function.
//
// Run: node tests/contrast_check.mjs

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

// --- extract and compile the real helper ---
const m = html.match(/function pickAccessibleForeground\(hex\)\s*\{[\s\S]*?\n    \}/);
check("pickAccessibleForeground() found in index.html", !!m);
const pick = m ? new Function(`${m[0]}; return pickAccessibleForeground;`)() : () => null;

// --- independent luminance / ratio (NOT the app implementation) ---
function lum(hex) {
  const h = hex.length === 4 ? [...hex.slice(1)].map(c => c + c).join("") : hex.slice(1);
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// --- helper behavior: required palette ---
const cases = [
  ["#FABD0F", "#000000"], // Lacks storePrimary -> dark
  ["#FFD24D", "#000000"], // Lacks storePrimaryLight -> dark (independent pick)
  ["#B8935D", "#000000"], // brand-neutral default brass
  ["#C9A874", "#000000"], // brand-neutral default brass light
  ["#000000", "#FFFFFF"], // black bg -> white
  ["#FFFFFF", "#000000"], // white bg -> black
];
for (const [bg, want] of cases) {
  const got = pick(bg);
  check(`${bg} -> ${want}`, got === want);
  check(`${bg} pairing >= 4.5:1 (got ${ratio(bg, got ?? "#FF0000").toFixed(2)}:1)`, !!got && ratio(bg, got) >= 4.5);
}

// middle-luminance case: endpoints must still clear 4.5:1 (theoretical floor ~4.58)
const mid = pick("#767676");
check("middle gray #767676 picks a foreground", mid === "#000000" || mid === "#FFFFFF");
check(`middle gray pairing >= 4.5:1 (got ${ratio("#767676", mid ?? "#FF0000").toFixed(2)}:1)`, !!mid && ratio("#767676", mid) >= 4.5);

// three-digit hex expansion
check("#fff (3-digit) expands and picks #000000", pick("#fff") === "#000000");
check("#000 (3-digit) expands and picks #FFFFFF", pick("#000") === "#FFFFFF");

// malformed / missing input -> null fallback (CSS default stands)
for (const bad of ["yellow", "", "#FABD0", "#GGGGGG", null, undefined, 42]) {
  check(`unsupported input ${JSON.stringify(bad)} -> null`, pick(bad) === null);
}

// --- configured Lacks colors, straight from shipped config ---
check("shipped storePrimary is #FABD0F", cfg.colors.storePrimary === "#FABD0F");
check("shipped storePrimaryLight is #FFD24D", cfg.colors.storePrimaryLight === "#FFD24D");
check("Lacks normal CTA selects dark foreground", pick(cfg.colors.storePrimary) === "#000000");
check("Lacks hover CTA independently selects dark foreground", pick(cfg.colors.storePrimaryLight) === "#000000");

// --- static wiring: focus tokens ---
check("no :focus-visible rule uses --store-primary anymore",
  !/:focus-visible[^}]*var\(--store-primary\)/.test(html));
const focusSelectors = [".fin-btn:focus-visible", ".fin-sheet-close:focus-visible",
  ".fin-sheet-title:focus-visible", ".fin-official-link:focus-visible",
  "#resultsScreen .noct-results-cta:focus-visible"];
const consolidated = html.match(/\.fin-btn:focus-visible,[\s\S]{0,400}?\{[\s\S]*?\}/);
check("consolidated focus rule covers all five pilot selectors",
  !!consolidated && focusSelectors.every(s => consolidated[0].includes(s)));
check("focus rule uses semantic two-ring tokens",
  !!consolidated && consolidated[0].includes("var(--focus-ring-outer)") && consolidated[0].includes("var(--focus-ring-inner)"));
const forced = html.match(/@media \(forced-colors: active\)\s*\{[\s\S]*?\n    \}/);
check("forced-colors override exists for the same five selectors",
  !!forced && focusSelectors.every(s => forced[0].includes(s)));
check("forced-colors override uses CanvasText and drops the halo",
  !!forced && forced[0].includes("outline-color: CanvasText") && forced[0].includes("box-shadow: none"));
check(":root declares safe defaults for all four semantic tokens",
  ["--focus-ring-inner: #FFFFFF", "--focus-ring-outer: #000000",
   "--on-store-primary: #000000", "--on-store-primary-light: #000000"].every(s => html.includes(s)));

// --- static wiring: CTA foregrounds ---
check("results CTA normal state uses var(--on-store-primary)",
  /#resultsScreen \.noct-results-cta \{[^}]*color: var\(--on-store-primary\);/.test(html));
check("results CTA hover state uses var(--on-store-primary-light)",
  /#resultsScreen \.noct-results-cta:hover \{[^}]*color: var\(--on-store-primary-light\);/.test(html));
check("applyStoreConfig computes both foreground tokens via the helper",
  /--on-store-primary', onPrimary\)/.test(html) && /--on-store-primary-light', onPrimaryLight\)/.test(html));

// --- .fin-btn-primary must keep its hardcoded light-on-dark pairing ---
const finPrimary = html.match(/\.fin-btn-primary \{[^}]*\}/);
check(".fin-btn-primary keeps light-on-dark (#211E19 / #F7F2E8)",
  !!finPrimary && finPrimary[0].includes("background: #211E19") && finPrimary[0].includes("color: #F7F2E8"));
check(".fin-btn-primary does not use the on-store tokens",
  !!finPrimary && !finPrimary[0].includes("--on-store"));

// ===================================================================
// Gate 1A — global brand-colour contrast.
//
// The pilot above proved the FOREGROUND-ON-STORE-PRIMARY direction for a
// handful of financing selectors. These assertions cover the two remaining
// global directions and are deliberately store-agnostic: they are expressed
// against whatever colours the shipped config carries, so a white-label
// deployment with a different primary is held to the same floor.
//
//   D1  text/icons ON a store-primary fill must resolve through the computed
//       --on-store-* tokens, never a hardcoded white.
//   D2  store primary must not be used AS a foreground (text, meaningful icon,
//       essential boundary) on the light surfaces every screen renders on.
//       Fixing D1 does not fix D2 — they are independent failures.
// ===================================================================

// Comments are stripped before any scanning: they are not CSS, and leaving
// them in makes the scanners wrong in both directions — a comment can glue
// itself onto the next selector, and prose describing a colour (e.g. the word
// "white" in a rationale) can trip a value assertion.
const styleBlock = html
  .slice(html.indexOf("<style>") + 7, html.indexOf("</style>"))
  .replace(/\/\*[\s\S]*?\*\//g, "");

// Rule scanner shared by the assertions below.
const cssRules = [];
{
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let r;
  while ((r = re.exec(styleBlock))) {
    const sel = r[1].trim();
    if (sel.startsWith("@")) continue;
    cssRules.push({ sel, body: r[2] });
  }
}
const PRIMARY_REF = /var\(--store-primary(?!-glow|-light)\b|var\(--landing-red\b|var\(--consultation-red\b/;
const HARDCODED_WHITE = /#fff(?:fff)?\b|#FFF(?:FFF)?\b|#FFFDF8\b|#FFF8ED\b|\bwhite\b/;
const decls = (body) => body.split(";").map((d) => d.trim()).filter(Boolean);

// --- the accent-ink token exists and is brand-neutral ---
const inkMatch = styleBlock.match(/--accent-ink:\s*(#[0-9a-fA-F]{3,6})\s*;/);
check("--accent-ink is declared with a literal colour in :root", !!inkMatch);
const accentInk = inkMatch ? inkMatch[1] : "#FF0000";
check("--accent-ink does not resolve to the retailer primary (must stay store-agnostic)",
  !/--accent-ink:\s*var\(--store-primary/.test(styleBlock));

// --- accent-ink clears 4.5:1 on every shipped light surface ---
// These are the warm surfaces the app actually renders on (landing,
// consultation and results/handoff paper). Normal-text floor, not large-text.
for (const surface of ["#F4EFE6", "#F3EEE5", "#FBF7EF", "#FFFDF8"]) {
  const rr = ratio(accentInk, surface);
  check(`--accent-ink ${accentInk} on ${surface} >= 4.5:1 (got ${rr.toFixed(2)}:1)`, rr >= 4.5);
}

// --- D1: no hardcoded white foreground on a store-primary fill ---
const whiteOnPrimary = cssRules.filter((r) => {
  const d = decls(r.body);
  const primaryFill = d.some((x) => /^background(-color)?\s*:/.test(x) && PRIMARY_REF.test(x));
  const whiteFg = d.some((x) => /^color\s*:/.test(x) && HARDCODED_WHITE.test(x));
  return primaryFill && whiteFg;
});
check(`no rule pairs a store-primary background with a hardcoded white foreground (found ${whiteOnPrimary.length})`,
  whiteOnPrimary.length === 0);
if (whiteOnPrimary.length) whiteOnPrimary.forEach((r) => console.log(`        ${r.sel.replace(/\s+/g, " ").slice(0, 100)}`));

// --- D2: store primary is never a foreground colour ---
const primaryAsText = cssRules.filter((r) =>
  decls(r.body).some((x) => /^color\s*:/.test(x) && PRIMARY_REF.test(x)));
check(`store primary is never used as a text colour (found ${primaryAsText.length})`,
  primaryAsText.length === 0);
if (primaryAsText.length) primaryAsText.forEach((r) => console.log(`        ${r.sel.replace(/\s+/g, " ").slice(0, 100)}`));

// --- D2b: essential boundaries (state, selection, tabs, thumbs) ---
// Decorative accent bands (border-left/-top on cards) may keep the brand
// colour; a boundary that communicates STATE may not.
const ESSENTIAL = /\.selected|\.is-selected|\.is-active|\.active|tier-tab|range-thumb|slider-thumb|quiz-option|reaction-row|lang-btn|step-num|chip/i;
const primaryStateBorder = cssRules.filter((r) =>
  ESSENTIAL.test(r.sel) &&
  decls(r.body).some((x) => /^(border|outline)[a-z-]*\s*:/.test(x) && PRIMARY_REF.test(x)));
check(`no state-communicating boundary resolves to the raw store primary (found ${primaryStateBorder.length})`,
  primaryStateBorder.length === 0);
if (primaryStateBorder.length) primaryStateBorder.forEach((r) => console.log(`        ${r.sel.replace(/\s+/g, " ").slice(0, 100)}`));

// A state indicator can also be painted as a background on a pseudo-element
// (the active tier-tab underline is 2px of `background`, not a border), which
// the boundary check above would not see.
const primaryStateFill = cssRules.filter((r) =>
  ESSENTIAL.test(r.sel) && /::(after|before)/.test(r.sel) &&
  decls(r.body).some((x) => /^background(-color)?\s*:/.test(x) && PRIMARY_REF.test(x)));
check(`no state indicator painted as a pseudo-element fill uses the raw store primary (found ${primaryStateFill.length})`,
  primaryStateFill.length === 0);
if (primaryStateFill.length) primaryStateFill.forEach((r) => console.log(`        ${r.sel.replace(/\s+/g, " ").slice(0, 100)}`));

// --- the shipped primary genuinely cannot carry text (proves D2 is required,
//     and would flag a future retailer whose primary CAN, so the token stays
//     justified rather than cargo-culted) ---
{
  const rr = ratio(cfg.colors.storePrimary, "#F3EEE5");
  check(`shipped primary ${cfg.colors.storePrimary} on cream is below 4.5:1, so --accent-ink is required (got ${rr.toFixed(2)}:1)`,
    rr < 4.5);
}

// --- controls filled with store primary keep a >=3:1 boundary ---
// A filled control whose fill is ~1.5:1 against the page is not identifiable
// as a control (WCAG 1.4.11); these keep an --accent-ink hairline instead.
for (const sel of [".landing-cta-btn", ".noct-profile-cta", "#emailScreen .noct-email-send-btn"]) {
  // A selector legitimately appears in several rules (a shared layout rule
  // plus its own paint rule), so assert that SOME rule carries the boundary
  // rather than inspecting whichever one happens to come first.
  const rules = cssRules.filter((r) => r.sel.split(",").some((s) => s.trim() === sel));
  check(`${sel} keeps an --accent-ink boundary`,
    rules.length > 0 && rules.some((r) => /border[a-z-]*\s*:[^;]*var\(--accent-ink\)/.test(r.body)));
}
{
  const rr = ratio(accentInk, "#F3EEE5");
  check(`--accent-ink boundary on cream >= 3:1 non-text (got ${rr.toFixed(2)}:1)`, rr >= 3);
}

// ===================================================================
// D3 — DESCENDANTS of a store-primary-filled control.
//
// The D1 scan above is same-rule: it only sees a white foreground declared in
// the very rule that also declares the primary fill. A descendant rule such as
// `... .noct-quiz-option.selected .opt-sub { color: #FFF8ED }` paints text on
// that same fill from a different rule and slips straight past it. That is a
// real defect this suite previously missed, so the scanner is widened here.
// ===================================================================

// Selectors whose rule declares a store-primary background.
const primaryFilled = [];
for (const r of cssRules) {
  if (!decls(r.body).some((x) => /^background(-color)?\s*:/.test(x) && PRIMARY_REF.test(x))) continue;
  for (const s of r.sel.split(",")) primaryFilled.push(s.trim());
}
const descendantWhite = [];
for (const r of cssRules) {
  const white = decls(r.body).find((x) => /^color\s*:/.test(x) && HARDCODED_WHITE.test(x));
  if (!white) continue;
  for (const s of r.sel.split(",").map((x) => x.trim())) {
    // a descendant selector of a filled control: "<filled><combinator>..."
    if (primaryFilled.some((f) => f && s !== f && s.startsWith(f) && /[\s>+~]/.test(s.charAt(f.length)))) {
      descendantWhite.push({ sel: s, decl: white.trim() });
      break;
    }
  }
}
check(`no descendant of a store-primary-filled control hardcodes a white foreground (found ${descendantWhite.length})`,
  descendantWhite.length === 0);
if (descendantWhite.length) descendantWhite.forEach((r) => console.log(`        ${r.sel.slice(0, 90)}  ->  ${r.decl}`));

// --- targeted: the selected quiz option and its subtext -----------------
function ruleFor(exact) {
  return cssRules.filter((r) => r.sel.split(",").some((s) => s.trim() === exact));
}
{
  const sel = "body:has(#questionScreen.active) .noct-quiz-option.selected";
  const rules = ruleFor(sel);
  check("selected quiz option main text uses the computed on-primary token",
    rules.length > 0 && rules.some((r) => /color:\s*var\(--on-store-primary\)/.test(r.body)));

  const subRules = ruleFor(sel + " .opt-sub");
  check("selected quiz-option SUBTEXT uses the computed on-primary token",
    subRules.length > 0 && subRules.some((r) => /color:\s*var\(--on-store-primary\)/.test(r.body)));
  check("selected quiz-option subtext no longer hardcodes a near-white",
    subRules.length > 0 && !subRules.some((r) => HARDCODED_WHITE.test(r.body)));

  // Opacity is retained, so prove the COMPOSITED result, not the raw pair.
  const opacity = (() => {
    for (const r of subRules) {
      const m = r.body.match(/opacity:\s*([\d.]+)/);
      if (m) return parseFloat(m[1]);
    }
    return 1;
  })();
  const fill = cfg.colors.storePrimary;               // the actual selected fill
  const fg = pick(fill) || "#000000";                 // what the app computes
  const composite = (() => {
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [fr, fg_, fb] = hex(fg), [br, bg_, bb] = hex(fill);
    const mix = (f, b) => Math.round(f * opacity + b * (1 - opacity));
    return "#" + [mix(fr, br), mix(fg_, bg_), mix(fb, bb)]
      .map((v) => v.toString(16).padStart(2, "0")).join("");
  })();
  const rr = ratio(composite, fill);
  check(`selected subtext composited at opacity ${opacity} (${fg} over ${fill} = ${composite}) >= 4.5:1 (got ${rr.toFixed(2)}:1)`,
    rr >= 4.5);
}

// --- targeted: the Sleep System "Review Sleep Plan" control boundary ----
{
  const rules = ruleFor(".sleep-system__review-top");
  check(".sleep-system__review-top (a <button>) boundary uses --accent-ink",
    rules.length > 0 && rules.some((r) => /border[a-z-]*\s*:[^;]*var\(--accent-ink\)/.test(r.body)));
  check(".sleep-system__review-top no longer borders with the raw store primary",
    rules.length > 0 && !rules.some((r) =>
      decls(r.body).some((x) => /^border[a-z-]*\s*:/.test(x) && PRIMARY_REF.test(x))));
  const rr = ratio(accentInk, "#F3EEE5");
  check(`its boundary clears 3:1 on the Sleep System surface (got ${rr.toFixed(2)}:1)`, rr >= 3);
}

console.log(`\nContrast check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
