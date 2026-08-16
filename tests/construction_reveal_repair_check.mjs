// construction_reveal_repair_check.mjs — slices 5a (repair) + 5b (two-role
// reframe, owner ruling 2026-08-10).
//
// 5a repaired the reveal for the light drawer it actually renders in and
// removed material-reading motifs. 5b reframes the CONTENT: the four-part
// technical taxonomy (Comfort layer / Transition layer / Support core /
// Base layer) is retired, replaced by TWO functional roles — Comfort ("The
// part you feel first.") and Support ("The deeper structure that holds you
// up.") — drawn as two generic regions, identical for every mattress, with
// a variance chip ("Exact materials and construction vary by model. Ask
// your specialist about the model you're trying."). Spanish wording is
// PROVISIONAL; the native-Spanish gate remains open.
//
// House style: EXTRACT the real DFM MOTION SPIKE block and EXECUTE the real
// markup/render functions against a DOM stub — plus arithmetic the static
// suites structurally cannot do: WCAG contrast ratios computed from the
// actual authored colors on BOTH drawer themes. Writes nothing; exit 0 =
// pass.
//
// Guards, in order:
//   1. tokens + contrast on the light drawer (text 4.5:1, non-text 3:1)
//   2. contrast on the navy fallback drawer (same floors)
//   3. two abstract region fills — distinct by geometry, never motif
//   4. two-region geometry: fits the reserved stage, deliberately unequal,
//      assembled when closed, one clear gap when open, no layer classes
//   5. forced-colors fallback: border-style carries the correspondence
//   6. roles a11y: visibility (not opacity alone), disclosure semantics
//   7. region-to-role correspondence is structural (shared fill class)
//   8. exactly two roles; owner wording byte-identical; taxonomy retired;
//      no forbidden material/performance/prevalence/deictic language
//   9. markup identity across every mattress record, per language;
//      zero product/SKU input
//  10. lifecycle: fresh collapsed per render, reduced-motion expanded,
//      rapid-tap determinism, rollback declines, wipe shell replaced

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const cssNorm = html.replace(/\r\n/g, '\n');
const mattressData = JSON.parse(readFileSync(join(here, '..', 'data', 'mattresses.json'), 'utf8'));

let failures = 0;
let checks = 0;
function ok(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { failures++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n== ${t} ==`); }

// ---------------------------------------------------------------- extraction
const beginMark = '// ===== DFM MOTION SPIKE (begin) =====';
const endMark = '// ===== DFM MOTION SPIKE (end) =====';
const b = html.indexOf(beginMark);
const e = html.indexOf(endMark);
if (b === -1 || e === -1) { console.log('FAIL — spike fences not found'); process.exit(1); }
const spikeSrc = html.slice(b, e);
const spikeSrcFlagOff = spikeSrc.replace(/enabled:\s*true\s*,/, 'enabled: false,');

// ------------------------------------------------------------ color helpers
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function channelLin(c8) {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(rgb) {
  const [r, g, bch] = rgb.map(channelLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bch;
}
function ratio(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function over(rgba, alpha, backdrop) {
  return rgba.map((c, i) => Math.round(alpha * c + (1 - alpha) * backdrop[i]));
}
function fmt(r) { return r.toFixed(2) + ':1'; }

// --------------------------------------------------------- authored palette
section('authored palette extraction');
const baseTok = cssNorm.match(
  /\n    \.dfm-cons \{[\s\S]{0,600}?--dfm-cons-ink: (#[0-9A-Fa-f]{6});\s*--dfm-cons-wash: (#[0-9A-Fa-f]{6});\s*--dfm-cons-edge: (#[0-9A-Fa-f]{6});/);
ok('base (navy fallback) theme declares the three reveal tokens', !!baseTok);
const lightTok = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.dfm-cons \{\s*--dfm-cons-ink: (#[0-9A-Fa-f]{6});\s*--dfm-cons-wash: (#[0-9A-Fa-f]{6});\s*--dfm-cons-edge: (#[0-9A-Fa-f]{6});\s*\}/);
ok('light theme declares the three reveal tokens (the 5a repair)', !!lightTok);
const drawerLight = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.mattress-drawer \{[\s\S]{0,900}?background: (#[0-9A-Fa-f]{6});/);
ok('light drawer surface color located', !!drawerLight);
const drawerNavy = cssNorm.match(
  /\.mattress-drawer \{[\s\S]{0,900}?linear-gradient\(180deg,\s*(#[0-9A-Fa-f]{6})\s*,?\s*(#[0-9A-Fa-f]{6})\)/);
ok('navy drawer gradient stops located', !!drawerNavy);
const lightBtn = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.dfm-cons-btn \{\s*background: (#[0-9A-Fa-f]{6});\s*color: (#[0-9A-Fa-f]{6});\s*\}/);
ok('light theme restates the toggle ink', !!lightBtn);
const lightBtnOpen = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.dfm-cons-btn\[aria-expanded="true"\] \{\s*background: rgba\((\d+), (\d+), (\d+), (0?\.\d+)\);\s*border-color: (#[0-9A-Fa-f]{6});\s*color: (#[0-9A-Fa-f]{6});\s*\}/);
ok('light theme restates the expanded toggle ink', !!lightBtnOpen);
const lightRoles = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.dfm-cons-roles \{\s*color: (#[0-9A-Fa-f]{6});\s*\}/);
const lightChip = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.dfm-cons-chip \{\s*color: (#[0-9A-Fa-f]{6});\s*\}/);
ok('light theme restates roles and chip ink', !!lightRoles && !!lightChip);
const rolesOpen = cssNorm.match(/\.dfm-cons\.is-open \.dfm-cons-roles \{ opacity: (1|0?\.\d+); visibility: visible; \}/);
const chipOpacity = cssNorm.match(/\.dfm-cons-chip \{[\s\S]{0,200}?opacity: (0?\.\d+);/);
ok('roles open-opacity and chip opacity located', !!rolesOpen && !!chipOpacity);
const baseBtnOpen = cssNorm.match(
  /\.dfm-cons-btn\[aria-expanded="true"\] \{\s*background: rgba\((\d+), (\d+), (\d+), (0?\.\d+)\);\s*border-color: var\(--gold, (#[0-9A-Fa-f]{6})\);\s*color: var\(--gold, (#[0-9A-Fa-f]{6})\);/);
ok('base expanded toggle ink located', !!baseBtnOpen);

if (failures) { console.log(`\nFAIL — ${checks - failures}/${checks}`); process.exit(1); }

const NAVY = [hexToRgb(drawerNavy[1]), hexToRgb(drawerNavy[2])];
const LIGHT = hexToRgb(drawerLight[1]);
const base = { ink: hexToRgb(baseTok[1]), wash: hexToRgb(baseTok[2]), edge: hexToRgb(baseTok[3]) };
const light = { ink: hexToRgb(lightTok[1]), wash: hexToRgb(lightTok[2]), edge: hexToRgb(lightTok[3]) };
const CREAM = hexToRgb('#F5EFE4'); // var(--cream) fallback, the base btn/roles ink
const OP_ROLES = parseFloat(rolesOpen[1]);
const OP_CHIP = parseFloat(chipOpacity[1]);

// ------------------------------------------------- light drawer contrast
section('light drawer contrast (the production surface)');
{
  const btnBg = hexToRgb(lightBtn[1]);
  const btnInk = hexToRgb(lightBtn[2]);
  let r = ratio(btnInk, btnBg);
  ok('toggle text meets 4.5:1', r >= 4.5, fmt(r));
  r = ratio(light.edge, LIGHT);
  ok('toggle/region/swatch borders meet 3:1 on the panel', r >= 3, fmt(r));
  const openBg = over([+lightBtnOpen[1], +lightBtnOpen[2], +lightBtnOpen[3]], parseFloat(lightBtnOpen[4]), LIGHT);
  r = ratio(hexToRgb(lightBtnOpen[6]), openBg);
  ok('expanded toggle text meets 4.5:1 over its tint', r >= 4.5, fmt(r));
  r = ratio(hexToRgb(lightBtnOpen[5]), openBg);
  ok('expanded toggle border meets 3:1 over its tint', r >= 3, fmt(r));
  r = ratio(light.ink, LIGHT);
  ok('region ink meets 3:1 on the panel', r >= 3, fmt(r));
  r = ratio(light.ink, light.wash);
  ok('region ink meets 3:1 on its own wash (internal legibility)', r >= 3, fmt(r));
  r = ratio(light.edge, light.wash);
  ok('region separation (edge on wash) meets 3:1', r >= 3, fmt(r));
  const rolesEff = over(hexToRgb(lightRoles[1]), OP_ROLES, LIGHT);
  r = ratio(rolesEff, LIGHT);
  ok('role text meets 4.5:1 at its rendered opacity', r >= 4.5, fmt(r));
  const chipEff = over(hexToRgb(lightChip[1]), OP_CHIP, LIGHT);
  r = ratio(chipEff, LIGHT);
  ok('variance chip meets 4.5:1 at its rendered opacity', r >= 4.5, fmt(r));
}

// -------------------------------------------------- navy drawer contrast
section('navy fallback drawer contrast (both gradient stops)');
for (const stop of NAVY) {
  const tag = '#' + stop.map((c) => c.toString(16).padStart(2, '0')).join('');
  const btnBg = over([255, 255, 255], 0.05, stop);
  let r = ratio(CREAM, btnBg);
  ok(`toggle text meets 4.5:1 on ${tag}`, r >= 4.5, fmt(r));
  const openBg = over([+baseBtnOpen[1], +baseBtnOpen[2], +baseBtnOpen[3]], parseFloat(baseBtnOpen[4]), stop);
  r = ratio(hexToRgb(baseBtnOpen[6]), openBg);
  ok(`expanded toggle text meets 4.5:1 on ${tag}`, r >= 4.5, fmt(r));
  r = ratio(base.ink, stop);
  ok(`region ink meets 3:1 on ${tag}`, r >= 3, fmt(r));
  r = ratio(base.edge, stop);
  ok(`borders meet 3:1 on ${tag}`, r >= 3, fmt(r));
  const rolesEff = over(CREAM, OP_ROLES, stop);
  r = ratio(rolesEff, stop);
  ok(`role text meets 4.5:1 on ${tag}`, r >= 4.5, fmt(r));
  const chipEff = over(CREAM, OP_CHIP, stop);
  r = ratio(chipEff, stop);
  ok(`variance chip meets 4.5:1 on ${tag}`, r >= 4.5, fmt(r));
}
{
  let r = ratio(base.ink, base.wash);
  ok('region ink meets 3:1 on its own wash', r >= 3, fmt(r));
  r = ratio(base.edge, base.wash);
  ok('region separation (edge on wash) meets 3:1', r >= 3, fmt(r));
}

// -------------------------------------------- abstract fills, no motifs
section('two abstract region fills — distinct by geometry, never motif');
const fillRules = {};
for (const k of ['comfort', 'support']) {
  const m = cssNorm.match(new RegExp(`\\.dfm-cons-fill--${k} \\{ background: ([^;]+); \\}`));
  fillRules[k] = m ? m[1] : null;
}
ok('both region fill classes exist', Object.values(fillRules).every(Boolean));
const stripe = {};
for (const k of ['comfort', 'support']) {
  const m = (fillRules[k] || '').match(
    /^repeating-linear-gradient\((\d+)deg, var\(--dfm-cons-ink\) 0 (\d+)px, var\(--dfm-cons-wash\) \2px (\d+)px\)$/);
  stripe[k] = m ? { angle: +m[1], on: +m[2], period: +m[3] } : null;
}
ok('both fills are pure ink/wash stripe treatments', Object.values(stripe).every(Boolean));
if (Object.values(stripe).every(Boolean)) {
  ok('stripe angles distinct (non-hue channel one)',
    stripe.comfort.angle !== stripe.support.angle, stripe.comfort.angle + '/' + stripe.support.angle + 'deg');
  ok('stripe weights distinct (non-hue channel two)',
    stripe.comfort.on !== stripe.support.on, stripe.comfort.on + '/' + stripe.support.on + 'px');
  const density = (s) => s.on / s.period;
  ok('ink density steps between the regions (value channel)',
    Math.abs(density(stripe.comfort) - density(stripe.support)) >= 0.15,
    density(stripe.comfort).toFixed(2) + ' vs ' + density(stripe.support).toFixed(2));
  ok('no vertical pinstripe (90deg reads as an innerspring)',
    stripe.comfort.angle !== 90 && stripe.support.angle !== 90);
}
const consRuleBodies = [...cssNorm.matchAll(/[^{}]*dfm-cons[^{}]*\{([^{}]*)\}/g)]
  .map((m) => m[1].replace(/\/\*[\s\S]*?\*\//g, ''));
ok('reveal CSS scanned (rules found)', consRuleBodies.length > 10, String(consRuleBodies.length));
ok('no radial/conic/image motif anywhere in the reveal CSS',
  consRuleBodies.every((body) => !/radial-gradient|conic-gradient|url\(|circle|ellipse/i.test(body)));
ok('no vertical-pinstripe declaration anywhere in the reveal CSS',
  consRuleBodies.every((body) => !/\b90deg/.test(body)));

// --------------------------------------------------------- region geometry
section('two-region geometry — assembled closed, one clear gap open');
const comfortRule = cssNorm.match(
  /\.dfm-cons-region--comfort \{\s*bottom: (\d+)px;\s*height: (\d+)px;\s*transform: translateY\((\d+)px\);\s*\}/);
const supportRule = cssNorm.match(
  /\.dfm-cons-region--support \{\s*bottom: 0;\s*height: (\d+)px;\s*\}/);
ok('comfort region geometry located (bottom/height/closed travel)', !!comfortRule);
ok('support region geometry located (grounded, fixed)', !!supportRule);
if (comfortRule && supportRule) {
  const cb = +comfortRule[1], ch = +comfortRule[2], travel = +comfortRule[3];
  const sh = +supportRule[1];
  ok('open state fits the reserved 122px stage (no layout shift)', cb + ch <= 122, `${cb + ch}px`);
  ok('closed state reads assembled: hairline seam, no overlap',
    cb - travel >= sh && cb - travel - sh <= 4, `seam ${cb - travel - sh}px`);
  ok('open state shows ONE clear gap between the regions', cb - sh >= 20, `gap ${cb - sh}px`);
  ok('region heights are deliberately unequal (never an enumeration)', ch !== sh, `${ch}px vs ${sh}px`);
}
ok('the stage still reserves its height', /\.dfm-cons-stage \{[\s\S]{0,200}?height: 122px;/.test(cssNorm));
ok('the four-layer classes are fully retired from CSS and markup',
  !/dfm-cons-layer/.test(cssNorm) && !/dfm-cons-labels/.test(cssNorm));

// ------------------------------------------------- forced-colors fallback
section('forced-colors fallback — correspondence without hue or gradient');
const fcBlock = [...cssNorm.matchAll(/@media \(forced-colors: active\) \{[\s\S]*?\n    \}/g)]
  .map((m) => m[0]).find((t) => t.includes('dfm-cons-fill'));
ok('a forced-colors block covers the region fills', !!fcBlock);
if (fcBlock) {
  const styles = ['comfort', 'support'].map((k) => {
    const m = fcBlock.match(new RegExp(`\\.dfm-cons-fill--${k} \\{ border-style: (\\w+); \\}`));
    return m ? m[1] : null;
  });
  ok('each region fill maps to a border-style', styles.every(Boolean), styles.join('/'));
  ok('the two border-styles are distinct', !!styles[0] && styles[0] !== styles[1]);
  ok('regions and swatches widen their borders so the styles read',
    /\.dfm-cons-region, \.dfm-cons-swatch \{ border-width: 3px; \}/.test(fcBlock));
}

// ----------------------------------------------- roles accessibility CSS
section('roles accessibility — visibility, not opacity alone');
ok('collapsed roles leave the accessibility tree (visibility: hidden)',
  /\.dfm-cons-roles \{[\s\S]{0,300}?opacity: 0;\s*visibility: hidden;\s*\}/.test(cssNorm));
ok('open roles are exposed (visibility: visible)',
  cssNorm.includes('.dfm-cons.is-open .dfm-cons-roles { opacity: 1; visibility: visible; }'));
ok('gated close delays visibility until the fade completes',
  /body\.dfm-motion \.dfm-cons-roles \{\s*transition: opacity var\(--dfm-settle\) var\(--dfm-e-settle\), visibility 0s var\(--dfm-settle\);/.test(cssNorm));
ok('gated open flips visibility immediately so the fade-in shows',
  /body\.dfm-motion \.dfm-cons\.is-open \.dfm-cons-roles \{\s*transition: opacity var\(--dfm-settle\) var\(--dfm-e-settle\), visibility 0s;/.test(cssNorm));
ok('the reduced-motion defensive block names the higher-specificity is-open variant',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*body\.dfm-motion \.dfm-cons\.is-open \.dfm-cons-roles \{ transition: none; \}/.test(cssNorm));

// ------------------------------------------------------- executed markup
section('executed markup — disclosure semantics and correspondence');
function makeClock() {
  let now = 0; let nextId = 1; let tasks = [];
  return {
    setTimeout(fn, ms) { const id = nextId++; tasks.push({ id, at: now + ms, fn }); return id; },
    clearTimeout(id) { tasks = tasks.filter((t) => t.id !== id); },
    advance(ms) { now += ms; }
  };
}
function makeEl(id) {
  const el = {
    id, children: [], className: '', textContent: '', style: {}, attrs: {}, listeners: {}, parentNode: null,
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => el.classList._s.add(x)); },
      remove(...c) { c.forEach((x) => el.classList._s.delete(x)); },
      contains(c) { return el.classList._s.has(c); }
    },
    setAttribute(k, v) { el.attrs[k] = v; },
    getAttribute(k) { return el.attrs[k]; },
    addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
    fire(t, evt) { (el.listeners[t] || []).forEach((fn) => fn(evt || { type: t })); },
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { el.children = el.children.filter((x) => x !== c); c.parentNode = null; return c; },
    createElementNS: () => makeEl('svg')
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html || ''; },
    set(v) { el._html = v; if (v === '') el.children = []; }
  });
  return el;
}
function makeConsEnv({ hostname = 'localhost', search = '?motion=1', reduced = false, lang = 'en', withHost = true, flagOff = false, model = null } = {}) {
  const clock = makeClock();
  const els = {};
  els.dfmGatherLayer = makeEl('dfmGatherLayer');
  const calls = { frames: 0, timers: 0, inserted: '' };
  if (withHost) {
    const parent = makeEl('drawerScrollParent');
    const host = makeEl('drawerDifferentiators');
    parent.appendChild(host);
    host.insertAdjacentHTML = (pos, htmlStr) => {
      calls.inserted = htmlStr;
      if (pos !== 'afterend') throw new Error('expected sibling insertion, got ' + pos);
      if (htmlStr.includes('id="dfmConstructionSection"')) {
        els.dfmConstructionSection = makeEl('dfmConstructionSection');
        els.dfmConstructionSection._markup = htmlStr;
        parent.appendChild(els.dfmConstructionSection);
      }
      if (htmlStr.includes('id="dfmConstructionPanel"')) {
        els.dfmConstructionPanel = makeEl('dfmConstructionPanel');
        els.dfmConstructionSection.appendChild(els.dfmConstructionPanel);
      }
      if (htmlStr.includes('id="dfmConsToggle"')) {
        els.dfmConsToggle = makeEl('dfmConsToggle');
        els.dfmConsToggle.setAttribute('aria-expanded', 'false');
        els.dfmConstructionPanel.appendChild(els.dfmConsToggle);
      }
    };
    els.drawerDifferentiators = host;
    els.drawerScrollParent = parent;
  }
  const bodyEl = makeEl('body');
  const win = {
    location: { hostname, search },
    matchMedia: () => ({ matches: reduced }),
    innerWidth: 1024, innerHeight: 768,
    // tripwires: a future closure over any of these must not change output
    currentDrawerMattress: model, _drawerMattress: model, selectedMattress: model
  };
  const doc = {
    body: bodyEl,
    getElementById: (id) => {
      if (id === 'dfmConstructionSection' && els.dfmConstructionSection &&
          !els.dfmConstructionSection.parentNode) return null;
      return els[id] || null;
    },
    createElementNS: (ns, tag) => makeEl(tag)
  };
  const src = (flagOff ? spikeSrcFlagOff : spikeSrc) +
    '\nreturn { consMarkup: window.dfmConstructionMarkup, consRender: window.dfmConstructionRender };';
  const fn = new Function('window', 'document', 'URLSearchParams', 'sessionTimeout',
    'sessionFrame', 'clearTimeout', 'currentLang', src);
  const api = fn(win, doc, URLSearchParams,
    (f, ms) => { calls.timers++; return clock.setTimeout(f, ms); },
    (f) => { calls.frames++; return clock.setTimeout(f, 0); },
    (id) => clock.clearTimeout(id), lang);
  return { clock, els, calls, api };
}

const markupEn = makeConsEnv().api.consMarkup();
const markupEs = makeConsEnv({ lang: 'es' }).api.consMarkup();
ok('toggle is a disclosure: aria-expanded=false + aria-controls at rest',
  markupEn.includes('id="dfmConsToggle" aria-expanded="false" aria-controls="dfmConsRoles"'));
ok('the roles list carries the stable controlled id',
  markupEn.includes('<dl class="dfm-cons-roles" id="dfmConsRoles">'));
ok('the toggle carries no aria-pressed (one state vocabulary, not two)',
  !markupEn.includes('aria-pressed'));
ok('the stage stays decorative (aria-hidden)',
  markupEn.includes('class="dfm-cons-stage" aria-hidden="true"'));
const KEYS = ['comfort', 'support'];
ok('the stage holds exactly two regions, Comfort above Support',
  (markupEn.match(/dfm-cons-region /g) || []).length === 2 &&
  KEYS.every((k) => markupEn.includes(`class="dfm-cons-region dfm-cons-region--${k} dfm-cons-fill--${k}"`)) &&
  markupEn.indexOf('dfm-cons-region--comfort') < markupEn.indexOf('dfm-cons-region--support'));
const EN_ROLES = [['Comfort', 'The part you feel first.'], ['Support', 'The deeper structure that holds you up.']];
const ES_ROLES = [['Confort', 'La parte que sientes primero.'], ['Soporte', 'La estructura más profunda que te sostiene.']];
function roleItems(markup) {
  return [...markup.matchAll(/<div class="dfm-cons-role"><dt><span class="dfm-cons-swatch dfm-cons-fill--(\w+)" aria-hidden="true"><\/span>([^<]+)<\/dt> <dd>([^<]+)<\/dd><\/div>/g)]
    .map((m) => ({ key: m[1], term: m[2], desc: m[3] }));
}
for (const [markup, roles, tag] of [[markupEn, EN_ROLES, 'EN'], [markupEs, ES_ROLES, 'ES']]) {
  const items = roleItems(markup);
  ok(`${tag}: exactly two primary semantic roles`, items.length === 2, String(items.length));
  ok(`${tag}: role terms and descriptions match the owner ruling verbatim`,
    items.length === 2 && items.every((it, i) => it.term === roles[i][0] && it.desc === roles[i][1]),
    items.map((it) => it.term + ': ' + it.desc).join(' | '));
  ok(`${tag}: role swatches correspond to the regions (comfort, support)`,
    items.length === 2 && items.every((it, i) => it.key === KEYS[i]));
}

// -------------------------------------------------- wording byte-identity
section('customer-facing wording — byte-identical to the ruled strings');
const EXPECTED_EN = 'Construction demonstration' + 'Separate the layers' +
  'Comfort The part you feel first.' + 'Support The deeper structure that holds you up.' +
  'Exact materials and construction vary by model. Ask your specialist about the model you’re trying.';
const EXPECTED_ES = 'Demostración de construcción' + 'Separar las capas' +
  'Confort La parte que sientes primero.' + 'Soporte La estructura más profunda que te sostiene.' +
  'Los materiales y la construcción exactos varían según el modelo. Pregúntale a tu especialista sobre el modelo que estás probando.';
ok('EN rendered text is byte-identical to the ruled string set',
  markupEn.replace(/<[^>]+>/g, '') === EXPECTED_EN);
ok('ES rendered text is byte-identical to the ruled string set (PROVISIONAL, gate open)',
  markupEs.replace(/<[^>]+>/g, '') === EXPECTED_ES);
ok('close labels preserved verbatim in both languages',
  spikeSrc.includes("'Reassemble the layers'") && spikeSrc.includes("'Reunir las capas'"));
ok('the retired taxonomy appears nowhere in either rendering',
  ['Comfort layer', 'Transition layer', 'Support core', 'Base layer',
   'Capa de confort', 'Capa de transición', 'Núcleo de soporte', 'Capa base']
    .every((l) => !markupEn.includes(l) && !markupEs.includes(l)));

// forbidden-language sweep over every rendered string, both languages
const FORBIDDEN = [
  ['material', /\b(foam|memory\s*foam|visco\w*|coils?|innerspring|springs?|latex|gel|copper|wool|cashmere|silk|graphite|titanium|bamboo|pocketed|marshall|quilt\w*|tufted)\b/i],
  ['material-es', /\b(espuma|viscoel\w*|resortes?|muelles?|l[aá]tex|cobre|lana|cachemira|seda|grafito|bamb[uú]|embolsad\w+|acolchad\w+)\b/i],
  ['quantity', /\d|%|\b(inch|inches|cm|pulgadas?|coil count|percent|por ciento)\b/i],
  ['prevalence', /\b(typical\w*|usually|most (mattresses|beds)|standard|industry[- ]standard|t[ií]pic\w+|normalmente|la mayor[ií]a|est[aá]ndar)\b/i],
  ['deictic-construction', /\b(this mattress (has|contains)|inside this mattress|este colch[oó]n (tiene|contiene)|dentro de este colch[oó]n)\b/i],
  ['performance', /\b(cool\w*|isolat\w*|pressure[- ]relie\w*|durab\w*|breathab\w*|fresc\w+|aisl\w+|alivio|durader\w+)\b/i],
  ['medical-condition', /\b(pain|snor\w*|apnea|reflux|circulat\w*|arthrit\w*|dolor|ronquid\w*|reflujo)\b/i]
];
for (const [tag, text] of [['EN', markupEn.replace(/<[^>]+>/g, ' ')], ['ES', markupEs.replace(/<[^>]+>/g, ' ')]]) {
  for (const [name, rx] of FORBIDDEN) {
    ok(`${tag} rendered text carries no ${name} language`, !rx.test(text),
      rx.test(text) ? JSON.stringify(text.match(rx)[0]) : '');
  }
}

// --------------------------------------- generic identity across the data
section('one generic schematic — identical markup for every mattress record');
const allModels = ['gold', 'silver', 'bronze'].flatMap((t) => mattressData[t] || []);
ok('mattress records loaded', allModels.length >= 20, String(allModels.length) + ' models');
ok('markup function is zero-arity', /dfmConstructionMarkup = function\(\)/.test(spikeSrc));
const consSrcStart = spikeSrc.indexOf('window.dfmConstructionMarkup');
const consSrcStop = spikeSrc.indexOf('// The styling hook is withheld');
const consSrc = spikeSrc.slice(consSrcStart, consSrcStop);
const modelKeys = [...new Set(allModels.flatMap((m) => Object.keys(m)))];
ok('markup source reads no per-model field (full key union, ' + modelKeys.length + ' keys)',
  modelKeys.every((k) => !new RegExp(`\\.${k}\\b`).test(consSrc)) &&
  !/currentDrawerMattress|selectedMattress|quizAnswers|answers\[|userProfile/.test(consSrc));
for (const lang of ['en', 'es']) {
  const outs = new Set(allModels.map((m) => makeConsEnv({ lang, model: m }).api.consMarkup()));
  ok(`${lang}: markup is identical across all ${allModels.length} models`, outs.size === 1);
}

// ------------------------------------------------------------- lifecycle
section('lifecycle — fresh collapsed per render; reduced expanded; rollback');
{
  const env = makeConsEnv();
  ok('render starts collapsed with aria-expanded=false',
    env.api.consRender() === true &&
    !env.els.dfmConstructionPanel.classList.contains('is-open') &&
    env.els.dfmConsToggle.getAttribute('aria-expanded') === 'false');
  env.els.dfmConsToggle.fire('click');
  ok('open flips aria-expanded to true with the reassemble label',
    env.els.dfmConstructionPanel.classList.contains('is-open') &&
    env.els.dfmConsToggle.getAttribute('aria-expanded') === 'true' &&
    env.els.dfmConsToggle.textContent === 'Reassemble the layers');
  for (let i = 0; i < 11; i++) env.els.dfmConsToggle.fire('click');
  ok('11 rapid taps land deterministically (odd count from open = closed)',
    !env.els.dfmConstructionPanel.classList.contains('is-open') &&
    env.els.dfmConsToggle.getAttribute('aria-expanded') === 'false');
  env.els.dfmConsToggle.fire('click'); // leave open before the nav re-render
  env.api.consRender(); // mattress navigation re-render
  const sections = env.els.drawerScrollParent.children.filter((c) => c.id === 'dfmConstructionSection');
  ok('mattress navigation renders ONE fresh collapsed panel (approved lifecycle)',
    sections.length === 1 &&
    !env.els.dfmConstructionPanel.classList.contains('is-open') &&
    env.els.dfmConsToggle.getAttribute('aria-expanded') === 'false');
  env.els.dfmConstructionSection.innerHTML = ''; // session wipe empties the shell
  env.api.consRender();
  ok('after a wipe the shell is replaced by ONE fresh collapsed panel',
    env.els.drawerScrollParent.children.filter((c) => c.id === 'dfmConstructionSection').length === 1 &&
    !env.els.dfmConstructionPanel.classList.contains('is-open'));
  ok('the scene scheduled zero frames and zero timers throughout',
    env.calls.frames === 0 && env.calls.timers === 0);
}
{
  const es = makeConsEnv({ lang: 'es' });
  es.api.consRender();
  es.api.consRender(); // language-change re-render path
  ok('language re-render carries ES markup in ONE fresh section',
    es.els.drawerScrollParent.children.filter((c) => c.id === 'dfmConstructionSection').length === 1 &&
    es.els.dfmConstructionSection._markup.includes('Demostración de construcción'));
}
{
  const reduced = makeConsEnv({ reduced: true });
  ok('reduced motion renders fully expanded with the roles exposed',
    reduced.api.consRender() === true &&
    reduced.els.dfmConstructionPanel.classList.contains('is-open') &&
    reduced.els.dfmConsToggle.getAttribute('aria-expanded') === 'true');
  reduced.els.dfmConsToggle.fire('click');
  ok('reduced toggle still works, instantly, with zero frames/timers',
    !reduced.els.dfmConstructionPanel.classList.contains('is-open') &&
    reduced.calls.frames === 0 && reduced.calls.timers === 0);
}
{
  const rollback = makeConsEnv({ hostname: 'beford782.github.io', flagOff: true, search: '?motion=1' });
  ok('rollback declines: no markup, no section, drawer stays legacy',
    rollback.api.consMarkup() === '' && rollback.api.consRender() === false &&
    rollback.calls.inserted === '');
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
