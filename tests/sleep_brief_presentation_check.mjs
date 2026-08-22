// sleep_brief_presentation_check.mjs — the Sleep Brief recomposition (Slice 2,
// corrected D1 + D2 under roadmap item 1.1, owner-authorized 2026-08-15).
//
// This suite owns the NEW D1 structural and behavioral contract. The
// historical fixture sleep_brief_baseline_572d405.json stays untouched as the
// semantic oracle for what SURVIVES the recomposition (reflection, priority
// state/copy, CTA, downstream state) — see consultation_priorities_check.mjs.
// By owner amendment, no replacement DOM golden is hand-authored; structure
// and behavior are asserted here, against the real extracted renderers.
//
// House style: EXTRACT the real production functions from index.html and
// EXECUTE them against a DOM shim; CSS text parsing for touch/focus wiring;
// independent WCAG arithmetic; fail-closed in-memory negative controls.
//
// Guards, in order:
//   1. extraction (abort hard if any source is missing)
//   2. constellation component (D2): deterministic, language-independent,
//      answer-derived, strictly decorative (aria-hidden, no text, no engine
//      reads, no randomness or clock), white-label-safe output
//   3. constellation geometry identity across all THREE surfaces (Sleep
//      Brief hero, Results header stamp, Consultation Summary stamp),
//      proven by executing the real rendering paths — container presence
//      alone is insufficient by owner amendment
//   4. D1 composition: retained heading + hero message beneath, eyebrow,
//      reflection verbatim, single-open priorities accordion with BOTH why
//      and test prose behind the disclosure, forward CTA, subdued Edit
//      Answers secondary; removed surfaces stay removed (subtitle, summary,
//      meta strip, reassurance, journey rail, category tags)
//   5. rendered accordion content equals the engine's own state (titles,
//      why, test from analytics.trialFocus — oracle-anchored transitively)
//   6. dictionaries drive the new copy (empty-dict control degrades to raw
//      keys, never silent English); ruled EN/ES strings verbatim
//   7. focus, touch, forced-colors: visible focus on the heading (no bare
//      outline:none), 44px both axes on controls, focus-visible + forced-
//      colors coverage
//   8. session safety: wipe inventory owns every rendered container;
//      language switch preserves state; no raw timers; reduced-motion
//      honored on every retained transition path
//   9. in-memory negative controls proving the load-bearing assertions bite
//
// Run: node tests/sleep_brief_presentation_check.mjs

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

// A control whose replacement silently missed would exercise UNMUTATED code
// and could pass while proving nothing.
function mustReplace(src, find, replace) {
  const out = src.replace(find, replace);
  if (out === src) throw new Error('negative-control mutation did not apply: ' + find);
  return out;
}

// ------------------------------------------------------------- extraction
section('extraction');
const sigSrc = extractFunction('function buildSleepSignatureSvg(answers)');
ok('constellation renderer source found', !!sigSrc);
if (!sigSrc) {
  console.log('\nFAIL — buildSleepSignatureSvg missing; aborting');
  process.exit(1);
}

function makeSignature(mutate = null) {
  let src = sigSrc;
  if (mutate) src = mutate(src);
  return new Function(src + '\nreturn buildSleepSignatureSvg;')();
}

// Answer fixtures. Field shapes mirror the live quiz contract exactly.
const ANSWERS_A = {
  sleep_position: 'side', temperature: 'hot', firmness: 3,
  sleep_issues: ['hot', 'hip_pain'], health_conditions: ['none'],
  partner_sleep: 'partner', partner_disturbance: 'sometimes',
  mattress_size: 'queen', body_type: 'average'
};
const ANSWERS_B = {
  sleep_position: 'back', temperature: 'cold', firmness: 8,
  sleep_issues: ['none'], health_conditions: ['getting_older'],
  partner_sleep: 'solo', mattress_size: 'king', body_type: 'average'
};
const ANSWERS_A_VARIANT = Object.assign({}, ANSWERS_A, { temperature: 'cold' });

// --------------------------------------------- constellation component (D2)
section('constellation — deterministic, language-independent, decorative');
{
  const build = makeSignature();
  const one = build(ANSWERS_A);
  const two = build(ANSWERS_A);
  ok('same answers render byte-identical geometry (deterministic)', one === two);
  ok('different answers render different geometry (answer-derived)',
    build(ANSWERS_A) !== build(ANSWERS_B));
  ok('a single changed answer changes the geometry',
    build(ANSWERS_A) !== build(ANSWERS_A_VARIANT));
  ok('output is a single decorative svg: aria-hidden, focusable=false',
    /^<svg [^>]*\baria-hidden="true"/.test(one) && /focusable="false"/.test(one)
    && one.lastIndexOf('<svg') === 0);
  ok('no text content and no text-capable elements in the geometry',
    !/<text|<tspan|<title|<desc/.test(one)
    && !/>\s*[A-Za-z]/.test(one.replace(/<[^>]*>/g, m => m.replace(/[A-Za-z]/g, ''))));
  ok('white-label safe: currentColor only — no hex colors, no store tokens',
    !/#[0-9a-fA-F]{3,8}\b/.test(one) && !/store-primary|landing-red/.test(one)
    && /currentColor/.test(one));
  ok('geometry survives sparse answers without throwing (missing fields default)',
    typeof build({}) === 'string' && build({}).indexOf('<svg') === 0);
  ok('sparse-answer geometry is itself deterministic', build({}) === build({}));
}
ok('renderer is language-independent at the source level (no lang reads)',
  !/currentLang|\bL\(|\bt\(|['"]es['"]/.test(sigSrc));
ok('renderer is pure: no DOM, window, analytics, or engine-state reads',
  !/document\.|window\.|analytics\.|_resultsState|calculateScores/.test(sigSrc));
ok('renderer is clock- and randomness-free (deterministic by construction)',
  !/Math\.random|Date\.now|new Date/.test(sigSrc));
ok('renderer never reads scoring inputs by another route (answers arg only)',
  !/quizTags|firmnessScore|meetsMatchThreshold|\bscores\b/.test(sigSrc));

// ---------------------------------------------------- negative controls (D2)
section('negative controls — constellation assertions genuinely bite');
{
  const build = makeSignature((s) => mustReplace(s, 'function buildSleepSignatureSvg(answers) {',
    'function buildSleepSignatureSvg(answers) { var __jitter = Math.random();'));
  // The determinism observable: injected randomness must be caught either by
  // the source ban (checked above on the pristine source) or — if it reaches
  // the geometry — by double-execution divergence. Prove the source ban's
  // regex actually matches the injected form.
  ok('control: injected Math.random is detected by the source ban',
    /Math\.random/.test(sigSrc.replace('function buildSleepSignatureSvg(answers) {',
      'function buildSleepSignatureSvg(answers) { var __jitter = Math.random();')));
  ok('control: the mutated build still executes (the control exercises real code)',
    typeof build(ANSWERS_A) === 'string');
}
{
  const build = makeSignature((s) => mustReplace(s, 'aria-hidden="true"', 'aria-hidden="false"'));
  ok('control: a dropped decorative shield is detected',
    !/aria-hidden="true"/.test(build(ANSWERS_A)));
}

// ============================================================ D1 composition
// Everything below EXECUTES the real production renderers against a DOM shim.
const dictEn = JSON.parse(readFileSync(join(here, '..', 'data', 'dict-en.json'), 'utf8'));
const dictEs = JSON.parse(readFileSync(join(here, '..', 'data', 'dict-es.json'), 'utf8'));

const profileSrc = extractFunction('function showProfileScreen()');
const toggleSrc = extractFunction('window._toggleBriefPriority = function(index)');
const chromeSrc = extractFunction('function renderResultsChrome()');
const hf2BriefSrc = extractFunction('function renderHf2Brief()');
const revealSrc = extractFunction('window.startProfileReveal = function()');
section('extraction — the real rendering and entry paths');
ok('showProfileScreen, the disclosure toggle, renderResultsChrome, renderHf2Brief and startProfileReveal all found',
  !!profileSrc && !!toggleSrc && !!chromeSrc && !!hf2BriefSrc && !!revealSrc);
if (!profileSrc || !toggleSrc || !chromeSrc || !hf2BriefSrc || !revealSrc) {
  console.log('\nFAIL — a production rendering path is missing; aborting');
  process.exit(1);
}

function makeEl(id) {
  const el = {
    id, style: {}, attrs: {}, textContent: '', _html: '', hidden: false, _focusCount: 0,
    children: [],
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => el.classList._s.add(x)); },
      remove(...c) { c.forEach((x) => el.classList._s.delete(x)); },
      contains(c) { return el.classList._s.has(c); }
    },
    getAttribute(k) { return el.attrs[k]; },
    setAttribute(k, v) { el.attrs[k] = v; },
    focus() { el._focusCount++; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) {
      el._html = v;
      // Row count is all the toggle reads off `children`.
      const rows = (String(v).match(/<li class="noct-profile-priority-row">/g) || []).length;
      el.children = new Array(rows).fill(null).map((_, i) => ({ i }));
    }
  });
  return el;
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// One environment, all three surfaces: the SAME answers object drives the
// Sleep Brief render, the Results header chrome and the Consultation Summary
// card, exactly as a live session does.
function makeEnv({ lang = 'en', answers = ANSWERS_A, dict = null, reduced = false,
                   entry = false, openPriority = null, mutate = null } = {}) {
  const els = new Map();
  const frames = [];
  const doc = {
    getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); }
  };
  const D = dict || (lang === 'es' ? dictEs : dictEn);
  const win = { _sleepSignatureEntry: entry };
  const analytics = { trialFocus: [], tierViews: {}, logged: [], log(ev, d) { this.logged.push({ ev, d }); } };
  const screens = [];
  let src = sigSrc + '\n' + profileSrc + '\n' + toggleSrc + '\n' + chromeSrc + '\n'
    + hf2BriefSrc + '\n' + revealSrc + '\n';
  if (mutate) src = mutate(src);
  const api = new Function(
    'document', 'window', 'answers', 'currentLang', 'analytics', 'D', 'escapeHtml',
    'dfmReducedMotion', 'resolveConsultationSummary', 'financingEnabled',
    'savingsPassEnabled', 'FC', 'renderResultsFinancing', 'showScreen', 'sessionFrame',
    '__open',
    `"use strict";
    function t(k) { return Object.prototype.hasOwnProperty.call(D, k) ? D[k] : k; }
    var _briefOpenPriority = __open;
    ${src}
    // Classic top-level script semantics: the declaration is reachable as a
    // window property, which is how the reveal path calls it in production.
    window.showProfileScreen = showProfileScreen;
    return {
      brief: showProfileScreen,
      toggle: function(i) { return window._toggleBriefPriority(i); },
      results: renderResultsChrome,
      hf2: renderHf2Brief,
      reveal: function() { return window.startProfileReveal(); },
      openPriority: function() { return _briefOpenPriority; }
    };`
  )(
    doc, win, JSON.parse(JSON.stringify(answers)), lang, analytics, D, esc,
    () => reduced,
    () => ({ context: 'ctx', who: 'who', profile: 'prof' }),
    () => false, () => false, () => '', () => {},
    (id) => screens.push(id),
    // The session-owned frame mechanism, captured rather than executed: a
    // reveal that runs during the render would be invisible on the device,
    // which is exactly the defect this models.
    (fn) => { frames.push(fn); return frames.length; },
    openPriority
  );
  // Drains one generation of scheduled frames at a time, the way the browser
  // would across successive paints.
  const drainFrames = (generations = 1) => {
    for (let g = 0; g < generations; g++) {
      const due = frames.splice(0, frames.length);
      due.forEach((fn) => fn());
    }
  };
  return { api, get: (id) => doc.getElementById(id), win, analytics, screens, els,
    frames, drainFrames };
}

// ------------------------------------- cross-surface geometry identity (D2)
section('constellation geometry is identical on all three surfaces (real paths)');
for (const [label, answers] of [['A', ANSWERS_A], ['B', ANSWERS_B]]) {
  for (const lang of ['en', 'es']) {
    const env = makeEnv({ lang, answers });
    env.api.brief();
    env.api.results();
    env.api.hf2();
    const brief = env.get('profileSignature').innerHTML;
    const results = env.get('resultsSignature').innerHTML;
    const hf2 = env.get('hf2Signature').innerHTML;
    ok(`[${label}/${lang}] Sleep Brief, Results header and Consultation Summary render byte-identical geometry`,
      brief.length > 0 && brief === results && results === hf2,
      `${brief.length}b`);
    ok(`[${label}/${lang}] every rendered stamp is the decorative figure (aria-hidden, no text)`,
      [brief, results, hf2].every((s) => /^<svg [^>]*aria-hidden="true"/.test(s) && !/<text/.test(s)));
  }
}
{
  const en = makeEnv({ lang: 'en', answers: ANSWERS_A });
  const es = makeEnv({ lang: 'es', answers: ANSWERS_A });
  en.api.brief(); es.api.brief();
  ok('a language switch redraws the identical figure (language-independent in the real path)',
    en.get('profileSignature').innerHTML === es.get('profileSignature').innerHTML);
  const other = makeEnv({ answers: ANSWERS_B });
  other.api.brief();
  ok('a different customer renders a different figure through the real path',
    en.get('profileSignature').innerHTML !== other.get('profileSignature').innerHTML);
}

// ------------------------------------------------------- entry animation (D1)
section('entry animation performs once, on the quiz-completion entry only');
{
  const env = makeEnv({ entry: true });
  env.api.brief();
  // Device gate 2026-08-15: the reveal was applied DURING the render, so it
  // had already played by the time the Sleep Brief was painted — invisible on
  // the iPad with Reduce Motion off. It must be scheduled on the session-owned
  // frame mechanism and start only after the screen is visibly painted.
  ok('the reveal is NOT applied during the render (it would play before paint)',
    !env.get('profileSignature').classList.contains('is-entering'));
  ok('the reveal is scheduled on the session-owned frame mechanism',
    env.frames.length === 1, `${env.frames.length} frame(s) scheduled`);
  env.drainFrames(1);
  ok('one frame is not enough — the reveal waits for a painted screen (second frame)',
    !env.get('profileSignature').classList.contains('is-entering')
    && env.frames.length === 1);
  env.drainFrames(1);
  ok('the quiz-completion entry animates the signature once the screen has painted',
    env.get('profileSignature').classList.contains('is-entering'));
  ok('the entry flag is consumed by the render (one performance, not every render)',
    env.win._sleepSignatureEntry === false);
  env.api.brief();
  env.drainFrames(2);
  ok('the immediate re-render redraws statically',
    !env.get('profileSignature').classList.contains('is-entering'));
}
{
  const env = makeEnv({ entry: true, reduced: true });
  env.api.brief();
  ok('reduced motion renders statically and immediately — no frames scheduled at all',
    env.frames.length === 0
    && !env.get('profileSignature').classList.contains('is-entering'));
}
{
  const env = makeEnv({ entry: false });
  env.api.brief();
  ok('a re-render schedules no reveal work',
    env.frames.length === 0);
}
section('hero scale — the Sleep Brief figure is a hero, the stamps stay stamps');
{
  // Device gate 2026-08-15 (second pass): the reveal was visible but the
  // figure still read as a stamp on the mounted iPad. The hero is enlarged;
  // the two stamp placements are deliberately untouched.
  const heroBase = norm.match(/\.noct-profile-signature \.sleep-signature \{\s*\n\s*width: clamp\((\d+)px, ([\d.]+)vw, (\d+)px\);/);
  ok('the hero width is located as a clamp', !!heroBase);
  if (heroBase) {
    const [, min, , max] = heroBase.map(Number);
    ok('landscape/desktop hero sits in the ruled 220-260px band', min >= 220 && max <= 260,
      `${min}-${max}px`);
  }
  const portrait = norm.match(/@media \(max-width: 900px\), \(orientation: portrait\) \{[\s\S]*?\n    \}\n/);
  const pBlock = portrait ? portrait[0] : '';
  const heroPortrait = pBlock.match(/\.noct-profile-signature \.sleep-signature \{\s*\n\s*width: clamp\((\d+)px, ([\d.]+)vw, (\d+)px\);/);
  ok('a tablet-portrait hero width is declared', !!heroPortrait);
  if (heroPortrait) {
    const [, min, , max] = heroPortrait.map(Number);
    ok('tablet portrait hero meets the ruled 260-300px band', min >= 260 && max <= 300,
      `${min}-${max}px`);
  }
  // Several 560px blocks exist; take the one that owns the profile rules.
  const phBlock = [...norm.matchAll(/@media \(max-width: 560px\) \{[\s\S]*?\n    \}\n/g)]
    .map((m) => m[0]).find((b) => b.includes('.noct-profile-secondary')) || '';
  ok('the phone block that owns the profile rules is located', phBlock.length > 0);
  ok('phones get a smaller explicit override so the figure cannot overflow',
    /\.noct-profile-signature \.sleep-signature \{\s*\n\s*width: min\(\d+px, \d+vw\);/.test(phBlock));
  {
    const phoneMax = Number((phBlock.match(/\.noct-profile-signature \.sleep-signature \{\s*\n\s*width: min\((\d+)px/) || [, 0])[1]);
    const tabletMin = heroPortrait ? Number(heroPortrait[1]) : 0;
    ok('the phone override is genuinely smaller than the tablet minimum',
      phoneMax > 0 && phoneMax < tabletMin, `${phoneMax}px < ${tabletMin}px`);
  }
  ok('the hero is placed deliberately in its field, not left clustered in a corner',
    /\.noct-profile-signature \.sleep-signature \{[^}]*margin-inline: auto;/.test(norm)
    || /\.noct-profile-signature \{[^}]*justify-content: center;/.test(norm));
  // The stamps are NOT part of this change.
  ok('the Results header stamp keeps its 54px size',
    /\.noct-results-signature \.sleep-signature \{\s*\n\s*width: 54px;\s*\n\s*\}/.test(norm));
  ok('the Consultation Summary stamp keeps its 48px size',
    /\.hf2-review-signature \.sleep-signature \{\s*\n\s*width: 48px;\s*\n\s*\}/.test(norm));
  ok('neither stamp is resized by a portrait or phone override',
    !/noct-results-signature \.sleep-signature/.test(pBlock + phBlock)
    && !/hf2-review-signature \.sleep-signature/.test(pBlock + phBlock));
  // Sizing stays in CSS: the SVG bytes are answer-derived and must not change.
  ok('the renderer emits no sizing attributes (scale is CSS, the SVG bytes are unchanged)',
    !/\swidth="/.test(sigSrc) && !/\sheight="/.test(sigSrc));
}

section('the reveal is perceptible: a line draw, then the nodes');
{
  const drawKeys = norm.match(/@keyframes sleepSignatureDraw \{[\s\S]*?\n    \}/);
  ok('the line-draw keyframes animate stroke geometry, not opacity alone',
    !!drawKeys && /stroke-dashoffset/.test(drawKeys[0]));
  const nodeKeys = norm.match(/@keyframes sleepSignatureNode \{[\s\S]*?\n    \}/);
  ok('a separate node-appearance animation exists', !!nodeKeys);
  const drawRule = norm.match(/\.noct-profile-signature\.is-entering \.sleep-signature polyline \{([^}]*)\}/);
  const nodeRule = norm.match(/\.noct-profile-signature\.is-entering \.sleep-signature circle \{([^}]*)\}/);
  ok('the polyline draws and the circles appear as distinct animations',
    !!drawRule && /sleepSignatureDraw/.test(drawRule[1])
    && !!nodeRule && /sleepSignatureNode/.test(nodeRule[1]));
  ok('the nodes are staggered so the reveal reads as a sequence, not a flash',
    (norm.match(/\.sleep-signature circle:nth-of-type\(\d+\)/g) || []).length >= 5);
  // Perceptibility floor: the old 900ms opacity/scale fade read as nothing on
  // the device. The draw alone must run long enough to be seen.
  const drawMs = drawRule ? Number((drawRule[1].match(/(\d+)ms/) || [, 0])[1]) : 0;
  ok('the line draw runs long enough to be perceptible (>= 900ms)', drawMs >= 900,
    drawMs + 'ms');
  ok('reduced motion still suppresses the whole reveal in CSS as a backstop',
    /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]{0,400}?\.noct-profile-signature\.is-entering[\s\S]{0,200}?animation: none/.test(norm));
}
{
  const env = makeEnv({ entry: false });
  env.api.brief();
  ok('re-entry and language switches never animate (no entry flag set)',
    !env.get('profileSignature').classList.contains('is-entering'));
}
{
  const env = makeEnv({ entry: true, reduced: true });
  env.api.brief();
  ok('reduced motion never animates, even on the quiz-completion entry',
    !env.get('profileSignature').classList.contains('is-entering'));
  ok('...and still consumes the entry flag (no deferred animation waiting)',
    env.win._sleepSignatureEntry === false);
}

// ------------------------------------------------------- D1 composition (D1)
section('D1 composition — heading retained, hero beneath, removed surfaces gone');
{
  const env = makeEnv();
  env.api.brief();
  ok('the fixed heading is retained and rendered from the governed dictionary',
    env.get('profileName').textContent === dictEn['brief.heading']
    && dictEn['brief.heading'] === 'Your Sleep Brief');
  ok('the ruled hero message renders BENEATH the heading, never replacing it',
    env.get('profileHero').textContent === 'Made from your answers'
    && norm.indexOf('id="profileName"') < norm.indexOf('id="profileHero"'));
  ok('the heading remains the focus anchor: first-populated, non-empty, tabindex -1',
    /<h1 class="noct-profile-name" id="profileName" tabindex="-1"><\/h1>/.test(norm)
    && env.get('profileName').textContent.length > 0);
  ok('the constellation carries its ruled eyebrow',
    env.get('profileSignatureEyebrow').textContent === 'Your sleep signature');
  ok('the reflection sentence renders verbatim from the engine (unchanged by the recomposition)',
    /You are shopping for a Queen, share the bed with a partner/.test(env.get('profileReflection').textContent));
  ok('the forward CTA keeps its owner-ruled label and Results route',
    env.get('profileCta').textContent === 'See My Matches →'
    && /id="profileCta" onclick="window\.startResultsReveal\(\)"/.test(norm));
  ok('Edit Answers is retained as the subdued secondary action',
    env.get('profileSecondary').textContent === '← Edit my answers');
  ok('showScreen(profileScreen) is still the render\'s last act (Gate 2A ordering)',
    env.screens.length === 1 && env.screens[0] === 'profileScreen');
}
{
  // The removed surfaces must be gone from the MARKUP, not merely unwritten.
  for (const id of ['profileSubtitle', 'profileSummary', 'profileMetaStrip',
                    'profileReassurance', 'profileJourneySteps', 'profileJourneyHeading',
                    'profileJourneyCopy', 'profileEyebrow']) {
    ok(`removed surface is absent from the document: #${id}`, !norm.includes(`id="${id}"`));
  }
  ok('the retired category-tag markup and its CSS are gone',
    !/noct-profile-priority-tag/.test(norm) && !/tag-preference/.test(norm));
  ok('the retired journey-rail and meta-strip CSS are gone',
    !/profile-launch__journey/.test(norm) && !/noct-profile-meta/.test(norm));
}
{
  const env = makeEnv();
  env.api.brief();
  const out = env.get('profileName').textContent + env.get('profileHero').textContent
    + env.get('profileSignatureEyebrow').textContent + env.get('profileReflection').textContent
    + env.get('profilePriorities').innerHTML;
  ok('no archetype nickname or answer-derived subtitle reaches the customer',
    !/Ache Fighter|Goldilocks|Peacekeeper|Heat Beater|Hot Side Sleeper|Shared Bed/.test(out));
  ok('no percentage, ring or score is rendered', !/\d\s*%|stroke-dasharray|score/i.test(out));
  ok('no provenance or availability claim is rendered',
    !/texas|hecho en|in stock|disponible/i.test(out));
}

// ------------------------------ the subtitle: DOM-removed, computation kept
section('subtitle removed from the DOM with its computation preserved');
{
  const env = makeEnv();
  env.api.brief();
  ok('analytics.profileSubtitle is still computed and populated',
    env.analytics.profileSubtitle === 'Hot Side Sleeper · Shared Bed');
  ok('...bilingually, for the email fallback and downstream screens',
    !!env.analytics.profileSubtitleByLang.en && !!env.analytics.profileSubtitleByLang.es
    && env.analytics.profileSubtitleByLang.es !== env.analytics.profileSubtitleByLang.en);
  ok('...while no rendered element carries it',
    !JSON.stringify([...env.els.keys()]).includes('profileSubtitle'));
}

// ------------------------------------------- single-open disclosure (D1)
section('priorities — single-open disclosure carrying BOTH why and test prose');
{
  const env = makeEnv();
  env.api.brief();
  const html = env.get('profilePriorities').innerHTML;
  const rows = [...html.matchAll(/<li class="noct-profile-priority-row">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  ok('one row per engine priority, in engine order, at the engine\'s own count',
    rows.length === env.analytics.trialFocus.length && rows.length > 1);
  ok('row order equals the stored engine order (position is the order)',
    rows.map((r) => (r.match(/priority-title">([\s\S]*?)<\/span>/) || [, ''])[1]).join('|')
    === env.analytics.trialFocus.map((p) => p.en).join('|'));
  ok('every toggle is a real button with aria-expanded and aria-controls',
    rows.every((r, i) => new RegExp(`<button type="button"[^>]*id="briefPriorityToggle-${i}"[^>]*aria-expanded="(true|false)"[^>]*aria-controls="briefPriorityPanel-${i}"`).test(r)));
  ok('the toggle\'s accessible name is the bilingual priority title',
    rows.every((r) => /priority-title">[^<]+<\/span>/.test(r)));
  ok('BOTH the reason and the testing prose sit inside the disclosure panel',
    rows.every((r) => {
      const panel = (r.match(/<div class="noct-profile-priority-panel"[\s\S]*$/) || [''])[0];
      return /priority-why">[^<]+<\/p>/.test(panel) && /priority-test"><strong>[^<]*<\/strong>[^<]+<\/p>/.test(panel);
    }));
  ok('every panel starts closed and hidden (visibility, not opacity)',
    (html.match(/aria-expanded="false"/g) || []).length === rows.length
    && (html.match(/class="noct-profile-priority-panel" id="briefPriorityPanel-\d+" hidden>/g) || []).length === rows.length);
  ok('the panel prose is the engine\'s own stored why/test, not a fabrication',
    rows.every((r, i) => r.includes(esc(env.analytics.trialFocus[i].why.en))
      && r.includes(esc(env.analytics.trialFocus[i].test.en))));
  ok('the "Try this" label resolves from the governed dictionary',
    html.includes(esc(dictEn['brief.try_this'])));
  ok('Invariant 10: the shipped onclick + ontouchend pair with preventDefault',
    rows.every((r) => /onclick="window\._toggleBriefPriority\(\d\)"/.test(r)
      && /ontouchend="event\.preventDefault\(\);window\._toggleBriefPriority\(\d\);"/.test(r)));
}
{
  const env = makeEnv();
  env.api.brief();
  env.api.toggle(1);
  ok('opening a row sets aria-expanded and unhides exactly that panel',
    env.get('briefPriorityToggle-1').getAttribute('aria-expanded') === 'true'
    && env.get('briefPriorityPanel-1').hidden === false
    && env.get('briefPriorityPanel-0').hidden === true);
  env.api.toggle(0);
  ok('SINGLE-OPEN: opening another row closes the first',
    env.get('briefPriorityToggle-0').getAttribute('aria-expanded') === 'true'
    && env.get('briefPriorityToggle-1').getAttribute('aria-expanded') === 'false'
    && env.get('briefPriorityPanel-1').hidden === true);
  env.api.toggle(0);
  ok('re-pressing the open row closes it (all closed is a reachable state)',
    env.get('briefPriorityToggle-0').getAttribute('aria-expanded') === 'false'
    && env.get('briefPriorityPanel-0').hidden === true
    && env.api.openPriority() === null);
  ok('toggling never re-renders the screen (the pressed control keeps focus)',
    env.screens.length === 1);
}
{
  // A language switch re-renders through the same function; the customer's
  // open row must survive the copy swap.
  const env = makeEnv({ lang: 'es', openPriority: 1 });
  env.api.brief();
  const html = env.get('profilePriorities').innerHTML;
  ok('a re-render in the other language preserves the open row',
    /id="briefPriorityToggle-1" aria-expanded="true"/.test(html)
    && /id="briefPriorityPanel-1">/.test(html));
  ok('ES panels carry the Spanish prose and the Spanish disclosure label',
    html.includes(esc(dictEs['brief.try_this']))
    && html.includes(esc(env.analytics.trialFocus[1].test.es)));
}
{
  // Edit Answers → revised completion. The customer leaves the Brief with a
  // row open, edits an answer, and finishes the quiz again: the rebuilt Brief
  // must open with every disclosure closed. Executed through the REAL entry
  // path (startProfileReveal), whose reduced-motion branch lands directly on
  // the real showProfileScreen.
  const env = makeEnv({ openPriority: 1, reduced: true });
  env.api.brief();
  ok('precondition: the returning customer\'s row is open before the revision',
    /id="briefPriorityToggle-1" aria-expanded="true"/.test(env.get('profilePriorities').innerHTML));
  env.api.reveal();
  const html = env.get('profilePriorities').innerHTML;
  ok('a revised quiz completion opens the Brief with every disclosure CLOSED',
    env.api.openPriority() === null
    && !/aria-expanded="true"/.test(html)
    && (html.match(/ hidden>/g) || []).length === env.analytics.trialFocus.length);
  ok('...and the entry still reaches the Brief (the reset does not swallow the entry)',
    env.screens.filter((s) => s === 'profileScreen').length === 2);
}
{
  // The reset belongs to the quiz-finish entry only — never to the shared
  // re-render, which is what the language switch goes through.
  const env = makeEnv({ openPriority: 2 });
  env.api.brief();
  ok('a plain re-render never resets the disclosure (language-switch path)',
    env.api.openPriority() === 2
    && /id="briefPriorityToggle-2" aria-expanded="true"/.test(env.get('profilePriorities').innerHTML));
}

// ------------------------------------------------------------- ruled copy
section('governed dictionaries drive the D1 copy (EN + ES verbatim)');
ok('EN dict carries the ruled D1 strings verbatim',
  dictEn['brief.heading'] === 'Your Sleep Brief'
  && dictEn['brief.hero'] === 'Made from your answers'
  && dictEn['brief.signature_eyebrow'] === 'Your sleep signature'
  && dictEn['brief.quiz_finish'] === 'See my sleep signature');
ok('ES dict carries the ruled D1 strings verbatim',
  dictEs['brief.heading'] === 'Tu Resumen de Sueño'
  && dictEs['brief.hero'] === 'Creada con tus respuestas'
  && dictEs['brief.signature_eyebrow'] === 'Tu firma de sueño'
  && dictEs['brief.quiz_finish'] === 'Ver mi firma de sueño');
ok('dict parity: every brief.* key exists in both languages with distinct values',
  Object.keys(dictEn).filter((k) => k.startsWith('brief.'))
    .every((k) => k in dictEs && dictEn[k] !== dictEs[k])
  && Object.keys(dictEs).filter((k) => k.startsWith('brief.')).length
     === Object.keys(dictEn).filter((k) => k.startsWith('brief.')).length);
ok('the quiz finish control is relabeled through the dictionary, not a literal',
  /nextBtn\.textContent = t\('brief\.quiz_finish'\)/.test(norm)
  && !/Looks good/.test(norm));
ok('the quiz finish label is the ruled D1 wording exactly — no decorative arrow',
  !/→|&rarr;/.test(dictEn['brief.quiz_finish'] + dictEs['brief.quiz_finish'])
  && /id="reviewNextBtn">See my sleep signature<\/button>/.test(norm));
{
  const env = makeEnv({ dict: {} });
  env.api.brief();
  ok('control: an empty dictionary degrades to raw keys, never silent English',
    env.get('profileName').textContent === 'brief.heading'
    && env.get('profileHero').textContent === 'brief.hero');
}

// ------------------------------------------------- focus, touch, forced colors
section('focus, touch targets and forced colors on the recomposed screen');
{
  const headingCss = (norm.match(/\.noct-profile-name \{([^}]*)\}/) || [null, ''])[1];
  ok('the focus destination no longer suppresses its own indicator',
    !/outline:\s*none/.test(headingCss));
  // Brace-anchored, not a fixed character window: the consolidated block grows
  // whenever a surface joins it (the trust gate added the quiz headline), and
  // a window that overflows falls through to the forced-colors twin — a
  // vacuous pass here and a red suite on the next merge (found in review).
  const focusGroup = norm.match(/\.fin-btn:focus-visible,[^{}]*\{[^}]*\}/);
  ok('heading, disclosure toggles and both buttons joined the consolidated focus ring',
    !!focusGroup
    && ['.noct-profile-name:focus-visible', '.noct-profile-priority-toggle:focus-visible',
        '.noct-profile-cta:focus-visible', '.noct-profile-secondary:focus-visible']
       .every((sel) => focusGroup[0].includes(sel)));
  const forced = norm.match(/@media \(forced-colors: active\)\s*\{[\s\S]*?\n    \}/);
  ok('...and the forced-colors twin covers the same four surfaces',
    !!forced && ['.noct-profile-name:focus-visible', '.noct-profile-priority-toggle:focus-visible',
      '.noct-profile-cta:focus-visible', '.noct-profile-secondary:focus-visible']
      .every((sel) => forced[0].includes(sel)));
}
{
  const toggleCss = (norm.match(/\.noct-profile-priority-toggle \{([^}]*)\}/) || [null, ''])[1];
  ok('the disclosure toggle clears 44px in BOTH axes with touch-action: manipulation',
    /min-height: 44px;/.test(toggleCss) && /min-width: 44px;/.test(toggleCss)
    && /touch-action: manipulation;/.test(toggleCss));
  const actionCss = (norm.match(/\.noct-profile-cta,\s*\n\s*\.noct-profile-secondary \{([^}]*)\}/) || [null, ''])[1];
  ok('the CTA and secondary clear 44px in both axes',
    /min-height: 48px;/.test(actionCss) && /min-width: 44px;/.test(actionCss));
  // Every rule that sets the secondary's height — the base rule and the
  // narrow-viewport override alike — must stay at or above the floor.
  const secondaryHeights = [...norm.matchAll(/\.noct-profile-secondary \{([^}]*)\}/g)]
    .map((m) => (m[1].match(/min-height:\s*(\d+)px/) || [, null])[1])
    .filter(Boolean).map(Number);
  ok('every rule that sets the secondary height keeps it at or above 44px',
    secondaryHeights.length > 0 && secondaryHeights.every((h) => h >= 44),
    secondaryHeights.join('px, ') + 'px');
}
{
  // Independent WCAG arithmetic on the tokens this screen actually paints.
  const hexToRgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((x) => parseInt(h.slice(x, x + 2), 16)); };
  const lum = (rgb) => {
    const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const [r, g, b] = rgb.map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const identityBg = '#EEE7DC';   // the darker end of the identity gradient
  const panelBg = '#FAF6EF';      // the priority row fill
  const pairs = [
    ['hero message', (norm.match(/\.noct-profile-hero \{[^}]*color: (#[0-9A-Fa-f]{6})/) || [])[1], identityBg],
    ['reflection', (norm.match(/\.profile-launch__reflection \{[^}]*color: (#[0-9A-Fa-f]{6})/) || [])[1], identityBg],
    ['priority title', (norm.match(/\.noct-profile-priority-toggle \{[\s\S]*?color: (#[0-9A-Fa-f]{6})/) || [])[1], panelBg],
    ['panel prose', (norm.match(/\.noct-profile-priority-why,[\s\S]*?color: (#[0-9A-Fa-f]{6})/) || [])[1], panelBg]
  ];
  for (const [label, fg, bg] of pairs) {
    ok(`${label} ink located and clears 4.5:1 on its own surface`,
      !!fg && ratio(hexToRgb(fg), hexToRgb(bg)) >= 4.5,
      fg ? ratio(hexToRgb(fg), hexToRgb(bg)).toFixed(2) + ':1' : 'not found');
  }
}

// ------------------------------------------- tablet portrait (device gate)
section('tablet portrait layout — no dead zone, no collision with fixed controls');
{
  const portrait = norm.match(/@media \(max-width: 900px\), \(orientation: portrait\) \{[\s\S]*?\n    \}\n/);
  ok('the tablet portrait block is located', !!portrait);
  const block = portrait ? portrait[0] : '';
  // Device gate 2026-08-15: the card was pinned to 100dvh, leaving ~330px of
  // empty card below the action row at 834x1108.
  ok('portrait does not stretch the card to the full viewport below the actions',
    !/min-height: 100dvh/.test(block) && /\.noct-profile \{[^}]*min-height: auto;/.test(block));
  // The fixed session utility bar (top 8px, ~56px tall) shares the top band
  // with the heading in portrait; the heading box ended 2px from it, so its
  // focus ring overlapped the controls.
  ok('a named clearance token for the fixed utility bar exists',
    /--session-utility-clearance:\s*(\d+)px/.test(norm));
  const clearance = Number((norm.match(/--session-utility-clearance:\s*(\d+)px/) || [, 0])[1]);
  // 64px is the bar's own bottom edge; the heading's focus ring extends 8px
  // above its box, so the token must clear both with visible separation.
  ok('the clearance covers the bar, the heading\'s focus ring, and a visible gap',
    clearance >= 80, clearance + 'px');
  ok('portrait carries the card surface beneath the content (no empty band, no filler)',
    /body:has\(#profileScreen\.active\) #profileScreen \{[^}]*background: var\(--color-surface\);/.test(block));
  ok('portrait reserves that clearance above the heading, honoring the safe area',
    /padding-top: calc\(var\(--session-utility-clearance\) \+ env\(safe-area-inset-top\)\)/.test(block));
  ok('the signature and the reflection it explains are grouped compactly in portrait',
    /\.noct-profile-signature \{[^}]*margin-bottom: 10px;/.test(block));
}

// -------------------------------------------------------- session integrity
section('session integrity — wipe ownership, timers, engine boundary');
{
  const contentIds = (norm.match(/SESSION_CONTENT_IDS = \[[\s\S]*?\]/) || [''])[0];
  ok('the wipe inventory owns every container this slice renders into',
    ['profileName', 'profilePriorities', 'profileSignature', 'profileHero',
     'profileReflection', 'resultsSignature', 'hf2Signature']
      .every((id) => contentIds.includes(`'${id}'`)));
  ok('the inventory no longer names the removed containers',
    !contentIds.includes("'profileMetaStrip'") && !contentIds.includes("'profileJourneySteps'"));
  ok('the wipe strips a stale reveal marker from the signature container',
    /\{ id: 'profileSignature', remove: \['is-entering'\] \}/.test(norm));
  ok('the wipe closes every disclosure and disarms the entry animation',
    /_briefOpenPriority = null;/.test(norm.slice(norm.indexOf('function resetSessionState')))
    && /window\._sleepSignatureEntry = false;/.test(norm.slice(norm.indexOf('function resetSessionState'))));
}
ok('no raw timers or animation frames entered any Slice 2 render path',
  !/setTimeout|setInterval|requestAnimationFrame/.test(sigSrc + profileSrc + toggleSrc + chromeSrc + hf2BriefSrc));
ok('the retained legacy reveal fallback honors reduced motion before staging',
  /if \(dfmReducedMotion\(\)\) \{\s*\n\s*window\._sleepSignatureEntry = true;\s*\n\s*window\.showProfileScreen\(\);\s*\n\s*return;/
    .test(norm.slice(norm.indexOf('window.startProfileReveal = function'))));
ok('the constellation is never an engine input (absent from the scoring path)',
  !/buildSleepSignatureSvg|sleepSignature/.test(extractFunction('function calculateScores()') || ''));
ok('the engine block inside the render is untouched: cap, sort and state exports intact',
  /priorities\.sort\(function\(a, b\) \{ return b\.score - a\.score; \}\);/.test(profileSrc)
  && /var topPriorities = priorities\.slice\(0, 3\);/.test(profileSrc)
  && /analytics\.trialFocus = topPriorities\.map\(/.test(profileSrc));

// ----------------------------------------------- negative controls (D1)
section('negative controls — the D1 assertions genuinely bite');
{
  const env = makeEnv({
    mutate: (s) => mustReplace(s, "var open = _briefOpenPriority === i;", "var open = true;")
  });
  env.api.brief();
  ok('control: an all-open accordion is detected',
    (env.get('profilePriorities').innerHTML.match(/aria-expanded="true"/g) || []).length > 1);
}
{
  const env = makeEnv({
    mutate: (s) => mustReplace(s, "+ '<p class=\"noct-profile-priority-why\">' + escapeHtml(p.why) + '</p>'", "")
  });
  env.api.brief();
  ok('control: a reason dropped from the disclosure panel is detected',
    !/priority-why/.test(env.get('profilePriorities').innerHTML));
}
{
  const env = makeEnv({
    mutate: (s) => mustReplace(s, "resultsSignature.innerHTML = buildSleepSignatureSvg(answers)",
      "resultsSignature.innerHTML = ''")
  });
  env.api.brief();
  env.api.results();
  ok('control: a Results stamp that stops sharing the geometry is detected',
    env.get('resultsSignature').innerHTML !== env.get('profileSignature').innerHTML);
}
{
  const env = makeEnv({
    entry: true,
    mutate: (s) => mustReplace(s, "window._sleepSignatureEntry = false;", "")
  });
  env.api.brief();
  env.api.brief();
  ok('control: an entry flag that is never consumed (animation on every render) is detected',
    env.win._sleepSignatureEntry === true);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
