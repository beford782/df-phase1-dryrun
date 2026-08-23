// compare_modal_check.mjs — compare-modal dialog semantics (the standing
// prerequisite in front of the static comparison-alignment slice).
//
// House style (see motion_flag_check.mjs): this does NOT grep for function
// names and call it coverage. It EXTRACTS the real openCompareModal,
// closeCompareModal and compareModalKeydown from index.html and EXECUTES
// them against a DOM stub with real focus tracking — proving the dialog
// contract end to end: localized accessible name and close label on every
// open, initial focus on the title, Tab/Shift+Tab containment, Escape
// closing and restoring the exact connected opener, detached openers never
// focused, stored opener state nulled, keydown bound exactly once across
// repeated opens, and the session wipe's null-before-close ordering that
// keeps focus out of a torn-down session. Writes nothing; exit 0 = pass.

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
  if (cond) { console.log(`  PASS  ${name}`); }
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

const openSrc = extractFunction('window.openCompareModal = function()');
const closeSrc = extractFunction('window.closeCompareModal = function()');
const keySrc = extractFunction('function compareModalKeydown(e)');
ok('extraction: openCompareModal found', !!openSrc && openSrc.includes('_compareReturnFocus'));
ok('extraction: closeCompareModal found', !!closeSrc && closeSrc.includes('_compareReturnFocus'));
ok('extraction: compareModalKeydown found', !!keySrc && keySrc.includes('Escape'));
if (!openSrc || !closeSrc || !keySrc) {
  console.log('FAIL — required sources missing');
  process.exit(1);
}

// ------------------------------------------------------- static contract
section('static contract: the markup is a real labelled dialog');
const modalTag = (norm.match(/<div id="compareModal"[^>]*>/) || [''])[0];
ok('role="dialog"', modalTag.includes('role="dialog"'));
ok('aria-modal="true"', modalTag.includes('aria-modal="true"'));
ok('aria-labelledby points at the title', modalTag.includes('aria-labelledby="compareModalTitle"'));
ok('the title is focus-receivable (tabindex="-1")',
  /<div id="compareModalTitle" tabindex="-1"/.test(norm));
ok('the close button is identified', /<button class="compare-modal-close" id="compareModalClose"/.test(norm));
ok('WIPE ORDERING: the stored opener is nulled BEFORE the wipe closes the modal',
  /window\._compareOrigin = '';\s*(?:\/\/[^\n]*\s*)*window\._compareReturnFocus = null;\s*if \(typeof window\.closeCompareModal === 'function'\) window\.closeCompareModal\(\);/.test(norm));

// --------------------------------------------------------------- harness
function makeEnv({ lang = 'en', diffs = null, priorities = null, reactions = null } = {}) {
  let active = null;
  const els = {};
  function makeEl(id) {
    const el = {
      id, style: {}, attrs: {}, listeners: {}, textContent: '',
      offsetParent: {}, disabled: undefined, _detached: false,
      classList: {
        _s: new Set(),
        add(...c) { c.forEach((x) => el.classList._s.add(x)); },
        remove(...c) { c.forEach((x) => el.classList._s.delete(x)); },
        contains(c) { return el.classList._s.has(c); }
      },
      setAttribute(k, v) { el.attrs[k] = v; },
      getAttribute(k) { return k in el.attrs ? el.attrs[k] : null; },
      addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
      focus() { active = el; el._focused = (el._focused || 0) + 1; }
    };
    return el;
  }
  for (const id of ['compareModal', 'compareModalTitle', 'compareModalClose', 'compareCols']) {
    els[id] = makeEl(id);
  }
  els.compareModal.querySelectorAll = () => [els.compareModalTitle, els.compareModalClose];
  const opener = makeEl('compareTrayGo');
  const doc = {
    getElementById: (id) => els[id] || null,
    get activeElement() { return active; },
    contains: (el) => !!el && !el._detached
  };
  const win = {
    _compareSelected: ['g2', 'g6'],
    _drawerData: {
      g2: { m: { id: 'g2', name: 'A', brand: 'B', firmness: 5, imageUrl: '' }, tier: 'gold', firmFeel: 'Medium' },
      g6: { m: { id: 'g6', name: 'C', brand: 'D', firmness: 7, imageUrl: '' }, tier: 'gold', firmFeel: 'Firm' }
    },
    _mattressReactions: reactions || {},
    _compareOrigin: '',
    clearCompare: () => { win._clearCalls = (win._clearCalls || 0) + 1; }
  };
  const stub = (v) => () => v;
  const src = keySrc + '\n' + openSrc + '\n' + closeSrc +
    '\nreturn { open: window.openCompareModal, close: window.closeCompareModal, keydown: compareModalKeydown };';
  const fn = new Function('window', 'document', 'currentLang', 't',
    'buildMattressPriorities', 'hf2ReasonFor', 'reactionLabel', 'mattressResponseLabel',
    'mattressDifferentiators', 'mattressDifferenceText', 'escapeHtml', 'priceTierSymbol',
    src);
  // Slice 5 C2: the modal title now resolves through t('compare.modal_title').
  const api = fn(win, doc, lang, (k) => (lang === 'es' ? 'ES:' : 'EN:') + k,
    priorities || stub([]), stub('reason'), stub('ok'), stub('resp'),
    diffs || stub([{ detail: 'diff' }]), stub('difftext'), (s) => String(s), stub('$'));
  return {
    els, win, doc, opener, api,
    focusOpener() { opener.focus(); },
    key(k, shift) {
      const e = { key: k, shiftKey: !!shift, _pd: 0, preventDefault() { this._pd++; } };
      api.keydown(e);
      return e;
    }
  };
}

section('executed: localization on every open');
{
  const en = makeEnv({ lang: 'en' });
  en.focusOpener();
  en.api.open();
  // Slice 5 C2 (D5b): the title labelled an ARBITRARY compare pair as
  // "finalists". It now resolves through t('compare.modal_title'); the
  // sandbox's t() stamps the language so the key AND the language are pinned.
  ok('EN title set on open through the dictionary key', en.els.compareModalTitle.textContent === 'EN:compare.modal_title');
  ok('EN close label set on open', en.els.compareModalClose.getAttribute('aria-label') === 'Close comparison');
  const es = makeEnv({ lang: 'es' });
  es.focusOpener();
  es.api.open();
  ok('ES title set on open through the dictionary key', es.els.compareModalTitle.textContent === 'ES:compare.modal_title');
  ok('ES close label set on open', es.els.compareModalClose.getAttribute('aria-label') === 'Cerrar comparación');
  en.api.close();
  en.els.compareModalClose.setAttribute('aria-label', 'stale');
  en.focusOpener();
  en.api.open();
  ok('the close label is RE-set on every open (stale label replaced)',
    en.els.compareModalClose.getAttribute('aria-label') === 'Close comparison');
}

section('executed: focus lifecycle');
{
  const env = makeEnv();
  env.focusOpener();
  env.api.open();
  ok('the modal becomes visible', env.els.compareModal.classList.contains('visible') &&
    env.els.compareModal.style.display === 'flex');
  ok('initial focus lands on the title', env.doc.activeElement === env.els.compareModalTitle);
  ok('the exact opener is stored', env.win._compareReturnFocus === env.opener);
  env.els.compareModalClose.focus();
  const tabEvt = env.key('Tab', false);
  ok('Tab from the last focusable wraps to the first (title)',
    tabEvt._pd === 1 && env.doc.activeElement === env.els.compareModalTitle);
  const shiftEvt = env.key('Tab', true);
  ok('Shift+Tab from the first focusable wraps to the last (close)',
    shiftEvt._pd === 1 && env.doc.activeElement === env.els.compareModalClose);
  const esc = env.key('Escape', false);
  ok('Escape prevents default and closes',
    esc._pd === 1 && !env.els.compareModal.classList.contains('visible') &&
    env.els.compareModal.style.display === 'none');
  ok('Escape restores the exact connected opener', env.doc.activeElement === env.opener);
  ok('the stored opener is nulled after close', env.win._compareReturnFocus === null);
}
{
  const env = makeEnv();
  env.focusOpener();
  env.api.open();
  env.api.close();
  ok('direct close also restores the exact opener', env.doc.activeElement === env.opener);
  ok('direct close nulls the stored opener', env.win._compareReturnFocus === null);
}
{
  const env = makeEnv();
  env.focusOpener();
  env.api.open();
  env.opener._detached = true; // wiped/re-rendered away while the modal was up
  const beforeFocusCount = env.opener._focused || 0;
  env.api.close();
  ok('a detached opener is never focused',
    env.doc.activeElement !== env.opener || (env.opener._focused || 0) === beforeFocusCount);
  ok('the stored opener is still nulled', env.win._compareReturnFocus === null);
}

section('executed: idempotence and the wipe contract');
{
  const env = makeEnv();
  env.focusOpener();
  env.api.open();
  env.api.close();
  env.focusOpener();
  env.api.open();
  env.api.close();
  env.focusOpener();
  env.api.open();
  ok('repeated openings bind exactly one keydown listener',
    (env.els.compareModal.listeners.keydown || []).length === 1);
  ok('each reopen re-focuses the title', env.doc.activeElement === env.els.compareModalTitle);
  // the wipe's exact contract, in its committed order: null first, close second
  env.win._compareReturnFocus = null;
  env.api.close();
  ok('a wipe (null-then-close) cannot restore focus into the torn-down session',
    env.doc.activeElement !== env.opener);
}

// ------------------------------------------------ aligned comparison rows
// The static comparison-alignment slice: same attribute, same horizontal
// row, feature identity restored, differences emphasized structurally.
section('aligned comparison: static contract');
const compareCss = norm.slice(norm.indexOf('.compare-cols > .compare-rows'), norm.indexOf('.card-name'));
ok('aligned CSS block located', compareCss.length > 200);
ok('head row and value rows share ONE grid template (alignment by construction)',
  /\.cmp-head-row,\n    \.cmp-row \{\n      display: grid;\n      grid-template-columns: minmax\(64px, 22%\) 1fr 1fr;/.test(norm));
ok('the rows grid spans the legacy two-column wrapper',
  compareCss.includes('.compare-cols > .compare-rows { grid-column: 1 / -1; }'));
ok('purely static: no transitions or animations anywhere in the aligned CSS',
  !/transition\s*:/.test(compareCss) && !/animation\s*:/.test(compareCss));
ok('the difference glyph is a real aria-hidden span, not CSS-generated content',
  !/\.cmp-label::after/.test(norm) && /\.cmp-diff-glyph \{ color:/.test(norm));
ok('identical values merge into a spanning cell (structural cue)',
  /\.cmp-val--same \{\s*grid-column: 2 \/ 4;/.test(norm));
ok('narrow layout keeps the two mattresses side by side',
  /@media \(max-width: 520px\) \{\s*\.cmp-head-row,\s*\.cmp-row \{ grid-template-columns: 1fr 1fr; \}/.test(norm));

section('aligned comparison: executed rows, EN');
{
  const env = makeEnv({
    diffs: (m) => [{ title: 'KF-' + m.id, detail: 'WB-' + m.id }],
    priorities: (m) => [{ title: 'P-' + m.id, desc: 'd-' + m.id }],
    reactions: { g2: 'good' }
  });
  env.focusOpener();
  env.api.open();
  const out = env.els.compareCols.innerHTML;
  ok('one aligned grid renders', (out.match(/class="compare-rows"/g) || []).length === 1);
  ok('the head row carries both mattress identities',
    out.includes('cmp-head-row') && out.includes('>A <') && out.includes('>C <'));
  const order = [...out.matchAll(/data-cmp="([a-z]+)"/g)].map((m) => m[1]).join(',');
  ok('rows appear in the scan order: feel, response, tier, fit, feature, benefit, reaction',
    order === 'feel,response,tier,fit,feature,benefit,reaction');
  ok('differing feel keeps two emphasized cells on one row',
    /data-cmp="feel"[^>]*>[\s\S]*?Medium 5\/10[\s\S]*?Firm 7\/10/.test(out) &&
    /cmp-row--diff" role="row" data-cmp="feel"/.test(out));
  ok('identical tier merges into one quiet cell with the text tag',
    /cmp-row--same" role="row" data-cmp="tier"/.test(out) &&
    /data-cmp="tier"[\s\S]*?Gold[\s\S]*?Same for both/.test(out));
  ok('the KEY FEATURE row restores both differentiator TITLES',
    /cmp-row--key cmp-row--diff" role="row" data-cmp="feature"/.test(out) &&
    out.includes('KF-g2') && out.includes('KF-g6'));
  ok('the WHY IT HELPS row carries both differentiator details',
    /cmp-row--key cmp-row--diff" role="row" data-cmp="benefit"/.test(out) &&
    out.includes('WB-g2') && out.includes('WB-g6'));
  ok('the strongest customer-fit priority renders per mattress',
    out.includes('P-g2 — d-g2') && out.includes('P-g6 — d-g6'));
  ok('a missing reaction falls back to the vetted placeholder on its side only',
    /data-cmp="reaction"[\s\S]*?ok[\s\S]*?Not recorded yet/.test(out));
  env.api.close();
}

section('aligned comparison: Spanish and missing-data fallbacks');
{
  const es = makeEnv({
    lang: 'es',
    diffs: (m) => [{ title: 'KF-' + m.id, detail: 'WB-' + m.id }]
  });
  es.focusOpener();
  es.api.open();
  const out = es.els.compareCols.innerHTML;
  ok('ES row labels render (Característica clave / En qué ayuda)',
    out.includes('Característica clave') && out.includes('En qué ayuda') &&
    out.includes('Sensación') && out.includes('Por qué está aquí'));
  ok('ES same-tag renders (Igual en ambos)', out.includes('Igual en ambos'));
  ok('ES missing reaction falls back to the vetted ES placeholder',
    out.includes('Aún no registrada'));
  es.api.close();
}
{
  // Claim retirement (owner ruling 2026-08-12): an EMPTY differentiator
  // list now means the model's copy was WITHDRAWN. This block previously
  // pinned the superseded behavior (generic fallback text resurrecting in
  // the feature/benefit cells); the ruled behavior is total omission when
  // both sides are retired — no fallback, no all-empty row. Mixed pairings
  // ("—" on the retired side only) are pinned by
  // tests/claim_retirement_check.mjs.
  const bare = makeEnv({ diffs: () => [] }); // both models retired
  bare.focusOpener();
  bare.api.open();
  const out = bare.els.compareCols.innerHTML;
  ok('retired both sides: feature and benefit rows are omitted entirely',
    !out.includes('data-cmp="feature"') && !out.includes('data-cmp="benefit"'));
  ok('retired both sides: the remaining rows still render',
    out.includes('data-cmp="feel"') && out.includes('data-cmp="fit"') &&
    out.includes('data-cmp="reaction"'));
  ok('dialog lifecycle unchanged through the aligned render (focus on title)',
    bare.doc.activeElement === bare.els.compareModalTitle);
  bare.api.close();
}

// -------------------------------------- table semantics and associations
// The matrix must be a real table to assistive technology: mattress
// column headers, attribute row headers, cells associated with both, and
// the merged cell spanning both mattress columns.
section('aligned comparison: programmatic table associations');
function tableChecks(out, tag, labels) {
  ok(tag + ': the matrix is a labelled table (role + aria-labelledby)',
    out.includes('class="compare-rows" role="table" aria-labelledby="compareModalTitle"'));
  ok(tag + ': the head row holds three column headers (corner + both mattresses)',
    /cmp-head-row" role="row"/.test(out) &&
    (out.match(/role="columnheader"/g) || []).length === 3);
  ok(tag + ': every attribute row is a role row with a rowheader label',
    (out.match(/class="cmp-row[^"]*" role="row"/g) || []).length === 7 &&
    (out.match(/role="rowheader"/g) || []).length === 7);
  ok(tag + ': differing rows expose two plain cells under the mattress columns',
    [...out.matchAll(/cmp-row--diff" role="row" data-cmp="[a-z]+">([\s\S]*?)<\/div><\/div>/g)]
      .every((m) => (m[0].match(/role="cell"(?! aria-colspan)/g) || []).length === 2));
  ok(tag + ': merged rows expose one cell spanning both columns (aria-colspan="2")',
    [...out.matchAll(/cmp-row--same" role="row"[\s\S]*?data-cmp="[a-z]+">/g)].length > 0 &&
    [...out.matchAll(/cmp-row--same" role="row"[^>]*>[\s\S]*?(<div class="cmp-val[^>]*>)/g)]
      .every((m) => m[1].includes('role="cell" aria-colspan="2"')));
  ok(tag + ': the glyph is aria-hidden inside diff rowheaders only',
    /role="rowheader">[^<]*<span class="cmp-diff-glyph" aria-hidden="true">≠<\/span>/.test(out) &&
    !/cmp-row--same"[^>]*>[\s\S]{0,200}?cmp-diff-glyph/.test(out));
  ok(tag + ': row headers carry the attribute wording',
    labels.every((l) => new RegExp('role="rowheader">' + l).test(out)));
}
{
  const env = makeEnv({
    diffs: (m) => [{ title: 'KF-' + m.id, detail: 'WB-' + m.id }],
    reactions: { g2: 'good' }
  });
  env.focusOpener();
  env.api.open();
  tableChecks(env.els.compareCols.innerHTML, 'EN',
    ['Feel', 'Response', 'Tier', 'Why it is here', 'Key feature', 'Why it helps', 'Your reaction']);
  env.api.close();
}
{
  const es = makeEnv({ lang: 'es', diffs: (m) => [{ title: 'KF-' + m.id, detail: 'WB-' + m.id }] });
  es.focusOpener();
  es.api.open();
  tableChecks(es.els.compareCols.innerHTML, 'ES',
    ['Sensación', 'Respuesta', 'Nivel', 'Por qué está aquí', 'Característica clave', 'En qué ayuda', 'Tu reacción']);
  es.api.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
