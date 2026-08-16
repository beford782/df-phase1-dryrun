// compare_entry_check.mjs — the Compare entry point (owner-authorized slice).
//
// The comparison machine (tray, toggleCompare, dialog semantics, static
// aligned table) shipped owner-approved but UNREACHABLE: no markup emitted
// `.compare-btn` (finding recorded at PR #31). This slice adds the entry
// controls to the top-pick and supporting result cards and localizes the
// tray's static English labels. Owner-ruled strings; the ES set is a
// provisional draft — the native-Spanish gate remains open.
//
// House style: EXTRACT the real toggleCompare / updateCompareTray /
// clearCompare and the real delegated tap handler from index.html and
// EXECUTE them against a DOM stub — plus contrast arithmetic on the actual
// results-theme tokens. Writes nothing; exit 0 = pass.
//
// Guards, in order:
//   1. both card templates emit the compare control (data-id, aria-pressed,
//      disambiguated aria-label, ruled EN/ES labels, cluster placement)
//   2. ruled tray strings verbatim; count pattern in both languages
//   3. executed selection behavior: toggle, cap at 2, aria-pressed sync,
//      tray gating, clear, wipe reset
//   4. executed handler precedence: a compare tap NEVER opens the drawer
//   5. touch floor + no legacy absolute overlay + contrast on the results
//      surface (the only screen that renders cards)
//   6. session-wipe integration (selection reset, tray hidden, slots wiped)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const norm = html.replace(/\r\n/g, '\n');

let failures = 0;
let checks = 0;
function ok(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { failures++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n== ${t} ==`); }

function extractFunction(anchor) {
  const start = html.indexOf(anchor);
  if (start === -1) return null;
  let i = html.indexOf('{', start);
  let depth = 1;
  i++;
  while (i < html.length && depth > 0) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return html.slice(start, i) + ';';
}

// ------------------------------------------------ card template contract
section('card templates emit the compare control');
const topPickSrc = extractFunction('function renderTopPickCard(m, tier)');
const supportSrc = extractFunction('function renderSupportingCards(mattresses, tier)');
ok('extraction: both card template builders found', !!topPickSrc && !!supportSrc);
for (const [tag, src] of [['top pick', topPickSrc], ['supporting', supportSrc]]) {
  ok(`${tag}: builds a compare-btn with data-id and state from _compareSelected`,
    src.includes(`class="compare-btn' + (isCompared ? ' selected' : '') + '"`) &&
    src.includes(`(window._compareSelected || []).indexOf(m.id) > -1`) &&
    src.includes(`data-id="' + escapeHtml(m.id) + '"`));
  ok(`${tag}: aria-pressed renders from the same selection state`,
    src.includes(`aria-pressed="' + (isCompared ? 'true' : 'false') + '"`));
  ok(`${tag}: AT name disambiguated with the model name already on the card`,
    src.includes(`aria-label="' + escapeHtml((es ? 'Comparar' : 'Compare') + ': ' + m.name) + '"`));
  ok(`${tag}: ruled visible label EN/ES`,
    src.includes(`(es ? 'Comparar' : 'Compare')`));
  ok(`${tag}: compare sits inside the action cluster between details and save`,
    /detailsBtn\s*'?\s*\+\s*compareBtn\s*\+\s*saveBtn/.test(src.replace(/\s+/g, ' ')) ||
    /\+\s+detailsBtn\s+\+\s+compareBtn\s+\+\s+saveBtn/.test(src));
  ok(`${tag}: compare control carries NO inline handler (delegated path only)`,
    !/compareBtn = [^;]*onclick/.test(src.replace(/\n/g, ' ')));
}
ok('exactly two compare-btn constructions exist (one per template)',
  (norm.match(/class="compare-btn' \+ \(isCompared \? ' selected' : ''\)/g) || []).length === 2);

// --------------------------------------------------- ruled tray strings
section('ruled tray strings — verbatim, both languages');
ok('count pattern: N of 2 selected / N de 2 seleccionados',
  norm.includes(`currentLang === 'es' ? arr.length + ' de 2 seleccionados' : arr.length + ' of 2 selected'`));
ok('clear action: Clear / Quitar todo',
  norm.includes(`currentLang === 'es' ? 'Quitar todo' : 'Clear'`));
ok('go action: Compare → / Comparar →',
  norm.includes(`currentLang === 'es' ? 'Comparar →' : 'Compare →'`));
ok('static tray defaults remain the EN set the updater always rewrites',
  /id="compareTrayCount">0 of 2 selected</.test(norm) &&
  /id="compareTrayClear"[\s\S]{0,120}?>Clear</.test(norm) &&
  /id="compareTrayGo"[\s\S]{0,120}?>Compare →</.test(norm));

// ------------------------------------------------------ executed behavior
section('executed selection behavior');
const toggleSrc = extractFunction('window.toggleCompare = function(mattressId)');
const updateSrc = extractFunction('window.updateCompareTray = function()');
const clearSrc = extractFunction('window.clearCompare = function()');
ok('extraction: toggle/update/clear found', !!toggleSrc && !!updateSrc && !!clearSrc);
if (!toggleSrc || !updateSrc || !clearSrc) { console.log('FAIL — sources missing'); process.exit(1); }

function makeEl(id) {
  const el = {
    id, style: {}, attrs: {}, textContent: '', disabled: undefined, _html: '',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => el.classList._s.add(x)); },
      remove(...c) { c.forEach((x) => el.classList._s.delete(x)); },
      toggle(c, force) {
        const has = force !== undefined ? force : !el.classList._s.has(c);
        if (has) el.classList._s.add(c); else el.classList._s.delete(c);
      },
      contains(c) { return el.classList._s.has(c); }
    },
    getAttribute(k) { return el.attrs[k]; },
    setAttribute(k, v) { el.attrs[k] = v; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; }, set(v) { el._html = v; }
  });
  return el;
}
function makeCompareEnv({ lang = 'en', cardIds = ['g2', 'g6', 'g7'] } = {}) {
  const els = {};
  for (const id of ['compareTray', 'compareTraySlots', 'compareTrayCount', 'compareTrayGo', 'compareTrayClear']) {
    els[id] = makeEl(id);
  }
  const btns = cardIds.map((id) => {
    const b = makeEl('cmp-' + id);
    b.attrs['data-id'] = id;
    b.attrs['aria-pressed'] = 'false';
    return b;
  });
  const win = {
    _compareSelected: [],
    _drawerData: Object.fromEntries(cardIds.map((id) => [id, { m: { name: 'Model ' + id.toUpperCase() } }]))
  };
  const doc = {
    getElementById: (id) => els[id] || null,
    querySelectorAll: (sel) => (sel === '.compare-btn' ? btns
      : sel === '.compare-btn.selected' ? btns.filter((b) => b.classList.contains('selected')) : [])
  };
  const src = toggleSrc + '\n' + updateSrc + '\n' + clearSrc +
    '\nreturn { toggle: window.toggleCompare, update: window.updateCompareTray, clear: window.clearCompare };';
  const api = new Function('window', 'document', 'currentLang', src)(win, doc, lang);
  return { win, els, btns, api };
}
{
  const env = makeCompareEnv();
  env.api.toggle('g2');
  ok('first selection: class + aria-pressed + tray shown with count 1',
    env.btns[0].classList.contains('selected') &&
    env.btns[0].getAttribute('aria-pressed') === 'true' &&
    env.els.compareTray.style.display === 'block' &&
    env.els.compareTrayCount.textContent === '1 of 2 selected');
  ok('go stays disabled below two selections', env.els.compareTrayGo.disabled === true);
  env.api.toggle('g6');
  ok('second selection: count 2, go enabled, slots carry both model names',
    env.els.compareTrayCount.textContent === '2 of 2 selected' &&
    env.els.compareTrayGo.disabled === false &&
    env.els.compareTraySlots.innerHTML.includes('Model G2') &&
    env.els.compareTraySlots.innerHTML.includes('Model G6'));
  ok('tray actions rewritten in EN (never stale static text)',
    env.els.compareTrayClear.textContent === 'Clear' &&
    env.els.compareTrayGo.textContent === 'Compare →');
  env.api.toggle('g7');
  ok('third selection is refused (soft cap at 2)',
    env.win._compareSelected.length === 2 &&
    !env.btns[2].classList.contains('selected') &&
    env.btns[2].getAttribute('aria-pressed') === 'false');
  env.api.toggle('g6');
  ok('deselect flips class, aria-pressed, count, and go gating back',
    !env.btns[1].classList.contains('selected') &&
    env.btns[1].getAttribute('aria-pressed') === 'false' &&
    env.els.compareTrayCount.textContent === '1 of 2 selected' &&
    env.els.compareTrayGo.disabled === true);
  env.api.clear();
  ok('clear empties the selection, resets every button, hides the tray',
    env.win._compareSelected.length === 0 &&
    env.btns.every((b) => !b.classList.contains('selected') && b.getAttribute('aria-pressed') === 'false') &&
    env.els.compareTray.style.display === 'none');
}
{
  const es = makeCompareEnv({ lang: 'es' });
  es.api.toggle('g2');
  ok('ES: count pattern is the ruled provisional draft',
    es.els.compareTrayCount.textContent === '1 de 2 seleccionados');
  ok('ES: tray actions are the ruled provisional drafts',
    es.els.compareTrayClear.textContent === 'Quitar todo' &&
    es.els.compareTrayGo.textContent === 'Comparar →');
}

// ------------------------------------------- handler precedence, executed
section('delegated handler — a compare tap never opens the drawer');
const handlerStart = html.indexOf("document.addEventListener('click', function(e) {");
const fnStart = html.indexOf('function(e) {', handlerStart);
let i = html.indexOf('{', fnStart); let depth = 1; i++;
while (i < html.length && depth > 0) { if (html[i] === '{') depth++; else if (html[i] === '}') depth--; i++; }
const handlerSrc = html.slice(fnStart, i);
ok('extraction: delegated tap handler found',
  handlerStart !== -1 && handlerSrc.includes('.compare-btn') && handlerSrc.includes('openResultCardDrawer'));
{
  const calls = { toggled: null, drawer: 0, prevented: 0, stopped: 0 };
  const win = { toggleCompare: (id) => { calls.toggled = id; }, requestStartOver: () => {} };
  const handler = new Function('window', 'openResultCardDrawer',
    'return ' + handlerSrc + ';')(win, () => { calls.drawer++; });
  const cmpBtn = { getAttribute: (k) => (k === 'data-id' ? 'g6' : null) };
  handler({
    target: { closest: (sel) => (sel === '.compare-btn' ? cmpBtn : null) },
    preventDefault: () => { calls.prevented++; },
    stopPropagation: () => { calls.stopped++; }
  });
  ok('compare tap routes to toggleCompare with the card id, drawer NEVER opens',
    calls.toggled === 'g6' && calls.drawer === 0 && calls.prevented === 1 && calls.stopped === 1);
  handler({
    target: { closest: (sel) => (sel === '.noct-toppick, .noct-support-card' ? { id: 'card' } : null) },
    preventDefault: () => {}, stopPropagation: () => {}
  });
  ok('a plain card tap still opens the drawer', calls.drawer === 1);
}

// --------------------------------------------------- CSS and contrast
section('touch floor, layout, and results-surface contrast');
const btnCss = (norm.match(/\.compare-btn \{([^}]*)\}/) || [null, ''])[1];
ok('compare-btn meets the 44px touch floor with touch-action: manipulation',
  /min-height: 44px;/.test(btnCss) && /touch-action: manipulation;/.test(btnCss));
ok('the legacy absolute overlay styling is retired (cluster flow layout)',
  !/position: absolute/.test(btnCss) && /display: inline-flex/.test(btnCss));
ok('selection is never color alone: .selected class plus aria-pressed plus fill swap',
  norm.includes(".classList.toggle('selected', on);") &&
  norm.includes("btn.setAttribute('aria-pressed', on ? 'true' : 'false');"));
ok('tray action labels never wrap mid-word',
  /\.compare-tray-clear, \.compare-tray-go \{ white-space: nowrap; \}/.test(norm));
ok('the tray forces full rows at phone widths (flex shrinks nowrap content before it wraps)',
  norm.includes('.compare-tray-inner { flex-wrap: wrap; row-gap: 0.5rem; }') &&
  norm.includes('.compare-tray-slots { flex: 1 1 100%; order: 2; }') &&
  norm.includes('.compare-tray-actions { margin-left: auto; order: 3; }'));

function hexToRgb(hex) { const h = hex.replace('#', ''); return [0, 2, 4].map((x) => parseInt(h.slice(x, x + 2), 16)); }
function lum(rgb) {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [r, g, b] = rgb.map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); }
function over(rgb, alpha, backdrop) { return rgb.map((c, i) => Math.round(alpha * c + (1 - alpha) * backdrop[i])); }
const theme = norm.match(/body:has\(#resultsScreen\.active\),[\s\S]{0,400}?--color-surface: (#[0-9A-Fa-f]{6});[\s\S]{0,400}?--color-text-subtle: (#[0-9A-Fa-f]{6});\s*--color-accent: (#[0-9A-Fa-f]{6});/);
ok('results (showroom) theme tokens located', !!theme);
if (theme) {
  const surface = hexToRgb(theme[1]);
  let r = ratio(hexToRgb(theme[2]), surface);
  ok('default compare label meets 4.5:1 on the card surface', r >= 4.5, r.toFixed(2) + ':1');
  r = ratio(hexToRgb(theme[3]), surface);
  ok('hover/focus accent meets 3:1 on the card surface', r >= 3, r.toFixed(2) + ':1');
}
const selOverride = norm.match(/#resultsScreen \.compare-btn\.selected \{\s*border-color: (#[0-9A-Fa-f]{6});\s*background: \1;\s*color: (#[0-9A-Fa-f]{6});\s*\}/);
ok('results theme restates the selected state (the saved-pick idiom)', !!selOverride);
if (selOverride && theme) {
  const fill = hexToRgb(selOverride[1]);
  let r = ratio(hexToRgb(selOverride[2]), fill);
  ok('selected label meets 4.5:1 on its fill', r >= 4.5, r.toFixed(2) + ':1');
  r = ratio(fill, hexToRgb(theme[1]));
  ok('selected fill meets 3:1 against the card surface', r >= 3, r.toFixed(2) + ':1');
}

// --------------------------- light-theme aligned modal (Codex hold fix 1)
section('aligned comparison table — themed and legible on the light modal');
const modalSurface = norm.match(
  /body:has\(#resultsScreen\.active\) \.compare-modal-inner,\s*body:has\(#hf2Screen\.active\) \.compare-modal-inner \{\s*border-color: #[0-9A-Fa-f]{6};\s*background: (#[0-9A-Fa-f]{6});/);
ok('light modal surface located', !!modalSurface, modalSurface && modalSurface[1]);
function lightCmpRule(cls) {
  const m = norm.match(new RegExp(
    `body:has\\(#resultsScreen\\.active\\) \\.${cls},\\s*body:has\\(#hf2Screen\\.active\\) \\.${cls}[^{]*\\{([^}]*)\\}`));
  return m ? m[1] : null;
}
const CMP_TEXT_DARK = ['cmp-head-name', 'cmp-val'];
const CMP_TEXT_MUTED = ['cmp-head-brand', 'cmp-label', 'cmp-val--same'];
for (const cls of CMP_TEXT_DARK.concat(CMP_TEXT_MUTED)) {
  const rule = lightCmpRule(cls === 'cmp-head-name' ? 'cmp-head-name' : cls);
  ok(`.${cls} is themed for the light modal`, !!rule && /color: #[0-9A-Fa-f]{6};/.test(rule || ''));
}
ok('.cmp-same-tag opacity is restored so the tag clears the text floor',
  /body:has\(#resultsScreen\.active\) \.cmp-same-tag,\s*body:has\(#hf2Screen\.active\) \.cmp-same-tag \{\s*opacity: 1;\s*\}/.test(norm));
ok('.cmp-diff-glyph is themed (decorative accent ink)',
  !!lightCmpRule('cmp-diff-glyph') && /color: #7D5B34;/.test(lightCmpRule('cmp-diff-glyph')));
ok('.cmp-head-row separator and .cmp-head-img well are themed',
  !!lightCmpRule('cmp-head-row') && !!lightCmpRule('cmp-head-img'));
const keyRule = lightCmpRule('cmp-row--key');
ok('.cmp-row--key keeps its emphasis with warm-theme tint and border', !!keyRule &&
  /background: rgba\(154,116,69,0\.07\);/.test(keyRule) && /border-left-color: #9A7445;/.test(keyRule));
if (modalSurface) {
  const surface = hexToRgb(modalSurface[1]);
  const darkInk = (lightCmpRule('cmp-val').match(/color: (#[0-9A-Fa-f]{6});/) || [])[1];
  const mutedInk = (lightCmpRule('cmp-label').match(/color: (#[0-9A-Fa-f]{6});/) || [])[1];
  let r = ratio(hexToRgb(darkInk), surface);
  ok('values and heading names meet 4.5:1 on the modal surface', r >= 4.5, r.toFixed(2) + ':1');
  r = ratio(hexToRgb(mutedInk), surface);
  ok('brands, row labels, and merged values meet 4.5:1', r >= 4.5, r.toFixed(2) + ':1');
  // same-tag effective contrast at its rendered opacity (parsed, not assumed)
  const tagOpacity = /body:has\(#resultsScreen\.active\) \.cmp-same-tag[\s\S]{0,120}?opacity: 1;/.test(norm) ? 1
    : parseFloat((norm.match(/\.cmp-same-tag \{[^}]*opacity: (0?\.\d+);/) || [0, '0.85'])[1]);
  const tagEff = over(hexToRgb(mutedInk), tagOpacity, surface);
  r = ratio(tagEff, surface);
  ok('the same-tag meets 4.5:1 at its rendered opacity', r >= 4.5, r.toFixed(2) + ':1 @' + tagOpacity);
  r = ratio(hexToRgb('#7D5B34'), surface);
  ok('the decorative diff glyph meets the 3:1 non-text floor', r >= 3, r.toFixed(2) + ':1');
  r = ratio(hexToRgb('#9A7445'), surface);
  ok('the key-row border meets the 3:1 non-text floor', r >= 3, r.toFixed(2) + ':1');
  const keyBg = over([154, 116, 69], 0.07, surface);
  r = ratio(hexToRgb(darkInk), keyBg);
  ok('emphasized key-row values stay 4.5:1 over their tint', r >= 4.5, r.toFixed(2) + ':1');
}
// Codex re-review 4899320843 remainder: the modal title and price tier
if (modalSurface) {
  const surface = hexToRgb(modalSurface[1]);
  ok('the modal title carries an inline color:var(--gold) (the repoint below is load-bearing)',
    /<div id="compareModalTitle" tabindex="-1" style="[^"]*color:var\(--gold\);/.test(norm));
  const titleRule = norm.match(
    /body:has\(#resultsScreen\.active\) #compareModalTitle,\s*body:has\(#hf2Screen\.active\) #compareModalTitle \{\s*--gold: (#[0-9A-Fa-f]{6});\s*\}/);
  ok('the light theme re-points the title\'s --gold custom property', !!titleRule);
  if (titleRule) {
    const r = ratio(hexToRgb(titleRule[1]), surface);
    ok('the modal title meets 4.5:1 on the light modal surface', r >= 4.5, r.toFixed(2) + ':1');
  }
  ok('base .price-tier uses var(--gold) (the light restatement is load-bearing)',
    /\.price-tier \{[^}]*color: var\(--gold\);/.test(norm));
  const tierRule = norm.match(
    /body:has\(#resultsScreen\.active\) \.cmp-head-name \.price-tier,\s*body:has\(#hf2Screen\.active\) \.cmp-head-name \.price-tier \{\s*color: (#[0-9A-Fa-f]{6});\s*\}/);
  ok('the head-name price tier is themed for the light modal', !!tierRule);
  if (tierRule) {
    const r = ratio(hexToRgb(tierRule[1]), surface);
    ok('the price tier meets 4.5:1 on the light modal surface', r >= 4.5, r.toFixed(2) + ':1');
  }
}
// mapping proof: every cream-inked base cmp text class is restated for light
for (const cls of ['cmp-head-name', 'cmp-head-brand', 'cmp-label', 'cmp-val', 'cmp-val--same', 'cmp-diff-glyph']) {
  const base = norm.match(new RegExp(`\\n    \\.${cls.replace(/[-]/g, '[-]')}[^{]*\\{[^}]*\\}`));
  ok(`base .${cls} uses cream/gold ink (the light restatement is load-bearing)`,
    !!base && /var\(--cream|var\(--gold/.test(base[0]));
}

// ------------------------------ reduced-motion tray (Codex hold fix 2)
section('tray entrance goes quiet under reduced motion');
const trayBaseIdx = norm.indexOf('.compare-tray {');
const trayBase = norm.slice(trayBaseIdx, norm.indexOf('}', trayBaseIdx));
ok('ordinary motion keeps the entrance slide',
  trayBaseIdx !== -1 && /animation: compareTraySlide 0\.25s ease-out;/.test(trayBase));
const trayReduced = norm.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\.compare-tray \{ animation: none; \}\s*\}/);
ok('reduced motion disables the slide with animation: none', !!trayReduced);
ok('the reduced override comes AFTER the base rule (source order wins)',
  !!trayReduced && norm.indexOf(trayReduced[0]) > trayBaseIdx);

// ------------------------------------------------------ wipe integration
section('session-wipe integration');
ok('the wipe resets the selection array with the other per-customer picks',
  /window\._savedPicks = \[\];\s*window\._mattressReactions = \{\};\s*window\._favoriteMattressId = '';\s*window\._compareSelected = \[\];/.test(norm));
ok('the wipe registry hides the tray and empties its slots',
  /\{ id: 'compareTray', display: 'none' \}/.test(norm) &&
  /var SESSION_CONTENT_IDS = \[[\s\S]*?'compareTraySlots'[\s\S]*?\];/.test(norm));

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
