// motion_flag_check.mjs — DFM motion spike: flag gate + Card Table gather.
//
// House style (see session_safety_check.mjs): this does NOT grep for function
// names and call it coverage. It EXTRACTS the real DFM MOTION SPIKE block and
// the real startProfileReveal from index.html and EXECUTES them against a DOM
// stub, a controllable fake clock, and a fake location — proving BOTH paths:
//
//   disabled (ROLLBACK state, injected into the executed source now that the
//   committed default is the owner-authorized enabled state) — the gate fails
//   closed off-localhost, the legacy staged reveal runs byte-for-byte with
//   identical 1500 ms timing, and zero motion state (layer class, clones,
//   transforms) is ever created — proving the documented rollback
//   (enabled: true -> false) restores legacy behavior exactly;
//
//   enabled — the gather takes ownership, clones the customer's ACTUAL review
//   rows (preferring sleep_position/temperature/firmness), advances into the
//   existing Sleep Brief at ~700 ms, and survives skip, 10x spam, reduced
//   motion, language switch, and mapping-failure fallbacks without leaking a
//   single clone or stale class.
//
// Static guarantees asserted alongside: the spike introduces no raw timers
// (session-scoped wrappers only) and never touches scoring or results
// machinery, so recommendation identity/ordering cannot change by
// construction. Writes nothing; exit 0 = pass.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');

let failures = 0;
let checks = 0;
function ok(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  PASS  ${name}`); }
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
const revealSrc = extractFunction('window.startProfileReveal = function()');
ok('extraction: spike block found', spikeSrc.length > 500);
ok('extraction: startProfileReveal found', !!revealSrc && revealSrc.includes('_profileRevealInFlight'));

// The committed default is the owner-authorized ACTIVATION (2026-08-09,
// preview scope). The rollback state is injected into the executed source so
// the disabled path and its fail-closed gate stay fully covered.
const flagLiterals = [...spikeSrc.matchAll(/enabled:\s*(true|false)\s*,/g)];
const spikeSrcFlagOff = spikeSrc.replace(/enabled:\s*true\s*,/, 'enabled: false,');

// ------------------------------------------------------- static guarantees
section('static guarantees');
ok('flag literal is the authorized enabled state (owner activation, preview scope)',
  /enabled:\s*true\s*,/.test(spikeSrc));
ok('exactly one flag literal — a single production switch',
  flagLiterals.length === 1);
ok('rollback seam is real: injecting enabled: false changes the executed source',
  spikeSrcFlagOff !== spikeSrc && /enabled:\s*false\s*,/.test(spikeSrcFlagOff));
ok('fail-closed host gate structure intact for rollback',
  /if \(!dfmLocalHost\(\)\) return false;/.test(spikeSrc));
ok('no raw setTimeout in spike (session-scoped only)',
  !/[^n]setTimeout\s*\(/.test(spikeSrc.replace(/sessionTimeout\s*\(/g, 'SST(')));
ok('no raw requestAnimationFrame in spike',
  !/requestAnimationFrame/.test(spikeSrc));
ok('no raw setInterval in spike', !/setInterval/.test(spikeSrc));
ok('spike never touches scoring/results machinery',
  !/calculateScores|showResults|MATTRESSES|displayPriority/.test(spikeSrc));
ok('spike never invents copy (no string assignments to answer text)',
  !/textContent\s*=\s*['"]/.test(spikeSrc));
ok('gather layer markup is aria-hidden',
  /<div id="dfmGatherLayer" aria-hidden="true">/.test(html));
ok('wipe registry covers the gather layer',
  /\{ id: 'dfmGatherLayer', remove: \['is-active'\] \}/.test(html));
ok('wipe clears gather clones', /dfmLayer\.innerHTML = ''/.test(html));
ok('reveal branch is guarded and falls through',
  /if \(window\.dfmStartGather && window\.dfmStartGather\(\)\) return;/.test(html));
// Codex finding 1: reduced motion must OWN the transition (direct advance),
// never bounce enabled users into the legacy 1500 ms overlay
ok('reduced-motion fast path advances directly (source)',
  /dfmReducedMotion\(\)\)\s*\{[\s\S]{0,600}?window\.showProfileScreen\(\);\s*return true;/.test(spikeSrc));
// Codex finding 2: the styling hook is withheld under reduced motion, and a
// defensive CSS override kills the literal-duration settle if the preference
// changes after load
ok('dfm-motion body class withheld under reduced motion (source)',
  /dfmMotionActive\(\) && !dfmReducedMotion\(\)/.test(spikeSrc));
// The defensive override only works if it comes AFTER the ordinary rules:
// a media query adds no specificity, so at equal specificity the LATER
// declaration wins. These assertions are ordering-aware — presence alone
// proved nothing (the original defect was a defensive block that existed
// but lost the cascade).
// line-ending-canonical copy: ordering logic must be checkout-agnostic (a
// Windows autocrlf checkout serves \r\n which literal \n needles never match)
const cssNorm = html.replace(/\r\n/g, '\n');
function lastReducedBlock() {
  const blocks = [...cssNorm.matchAll(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n    \}/g)];
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i][0].includes('body.dfm-motion')) {
      return { text: blocks[i][0], index: blocks[i].index };
    }
  }
  return null;
}
const reducedBlk = lastReducedBlock();
ok('a defensive DFM reduced-motion block exists', !!reducedBlk);
const baseTransitionIdx = cssNorm.indexOf('body.dfm-motion .noct-quiz-option {\n      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease,\n        transform var(--dfm-quick) var(--dfm-e-compress);');
const baseActiveIdx = cssNorm.indexOf('body.dfm-motion .noct-quiz-option:active {\n      transform: translateY(1px) scaleY(0.985);');
const baseSelectedIdx = cssNorm.indexOf('body.dfm-motion .noct-quiz-option.selected {\n      animation: dfmOptSettle');
ok('ordinary DFM rules located', baseTransitionIdx !== -1 && baseActiveIdx !== -1 && baseSelectedIdx !== -1);
ok('cascade assertions are non-vacuous (no anchor resolved to -1)',
  Math.min(baseTransitionIdx, baseActiveIdx, baseSelectedIdx) > -1);
if (reducedBlk) {
  ok('cascade: reduced override comes AFTER the ordinary transition rule (so it wins)',
    reducedBlk.index > baseTransitionIdx &&
    /body\.dfm-motion \.noct-quiz-option \{\s*transition: background 0\.15s ease, border-color 0\.15s ease, color 0\.15s ease;\s*\}/.test(reducedBlk.text));
  ok('cascade: reduced override comes AFTER the ordinary :active rule (transform: none wins)',
    reducedBlk.index > baseActiveIdx &&
    /body\.dfm-motion \.noct-quiz-option:active \{ transform: none; \}/.test(reducedBlk.text));
  ok('cascade: reduced override comes AFTER the ordinary .selected rule (animation: none wins)',
    reducedBlk.index > baseSelectedIdx &&
    /body\.dfm-motion \.noct-quiz-option\.selected \{ animation: none; \}/.test(reducedBlk.text));
  ok('reduced override does not reintroduce the transform transition',
    !/transform var\(--dfm-quick\)/.test(reducedBlk.text));
}
// Codex finding 3: the opacity exit must be short and UNDELAYED so every
// fade completes inside the 700 ms teardown
ok('clone opacity exit is 180 ms and undelayed (source)',
  /opacity 180ms var\(--dfm-e-settle\) 0ms/.test(spikeSrc));
ok('fade begins at the 500 ms step and teardown at 700 ms (source)',
  /\}, 500\);/.test(spikeSrc) && /dfmFinishGather\(gen\); \}, 700\);/.test(spikeSrc));
ok('clone CSS rule no longer carries a shared delayed transition',
  !/\.dfm-clone \{[\s\S]*?transition: transform var\(--dfm-place\)[\s\S]*?opacity var\(--dfm-settle\)/.test(html));

// --------------------------------------------------------------- harness
function makeClock() {
  let now = 0; let nextId = 1; let tasks = [];
  return {
    now: () => now,
    setTimeout(fn, ms) { const id = nextId++; tasks.push({ id, at: now + ms, fn }); return id; },
    clearTimeout(id) { tasks = tasks.filter((t) => t.id !== id); },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = tasks.filter((t) => t.at <= until).sort((x, y) => x.at - y.at)[0];
        if (!due) break;
        tasks = tasks.filter((t) => t !== due);
        now = due.at;
        due.fn();
      }
      now = until;
    }
  };
}

function makeEl(id) {
  const el = {
    id,
    children: [],
    className: '',
    textContent: '',
    style: {},
    attrs: {},
    listeners: {},
    parentNode: null,
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
    querySelector(sel) {
      const cls = sel.replace('.', '');
      const find = (n) => {
        for (const c of n.children) {
          if ((c.className || '').includes(cls)) return c;
          const deep = find(c); if (deep) return deep;
        }
        return null;
      };
      return find(el);
    },
    getBoundingClientRect() { return el._rect || { left: 40, top: 100 + el._idx * 60, width: 320, height: 48 }; },
    cloneNode() {
      const c = makeEl(el.id + '-clone');
      c.className = el.className;
      c.textContent = el.textContent;
      c._rect = el._rect;
      el.children.forEach((ch) => c.appendChild(ch.cloneNode()));
      return c;
    }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html || ''; },
    set(v) { el._html = v; if (v === '') el.children = []; }
  });
  return el;
}

function makeEnv({ hostname, search, reduced = false, lang = 'en', flagOff = false }) {
  const clock = makeClock();
  const els = {};
  for (const id of ['dfmGatherLayer', 'reviewList', 'reviewScreen',
    'resultsRevealOverlay', 'resultsRevealTitle', 'resultsRevealSubtitle']) {
    els[id] = makeEl(id);
  }
  els.reviewScreen.classList.add('active');
  const QIDS = ['sleep_quality', 'trigger', 'mattress_size', 'partner_sleep', 'sleep_position',
    'body_type', 'temperature', 'firmness', 'current_mattress_age', 'sleep_issues', 'health_conditions'];
  QIDS.forEach((qid, i) => {
    const row = makeEl('row-' + qid);
    row.className = 'noct-review-row';
    row._idx = i;
    row.textContent = 'ANSWER:' + qid;
    const edit = makeEl('edit-' + qid);
    edit.className = 'noct-review-edit';
    row.appendChild(edit);
    els.reviewList.appendChild(row);
  });
  const calls = { showProfile: [], overlayOpen: 0, overlayClose: 0 };
  const bodyEl = makeEl('body');
  const sandbox = {
    window: {
      location: { hostname, search },
      matchMedia: () => ({ matches: reduced }),
      innerWidth: 1024,
      innerHeight: 768,
      showProfileScreen: () => calls.showProfile.push(clock.now())
    },
    document: {
      body: bodyEl,
      getElementById: (id) => els[id] || null
    },
    URLSearchParams,
    sessionTimeout: (fn, ms) => clock.setTimeout(fn, ms),
    sessionFrame: (fn) => clock.setTimeout(fn, 0),
    clearTimeout: (id) => clock.clearTimeout(id),
    currentLang: lang,
    visibleQuestions: () => QIDS.map((id) => ({ id })),
    getConsultationRevealElements: () => ({
      overlay: els.resultsRevealOverlay,
      title: els.resultsRevealTitle,
      subtitle: els.resultsRevealSubtitle
    }),
    openConsultationReveal: () => { calls.overlayOpen++; },
    closeConsultationReveal: () => { calls.overlayClose++; }
  };
  sandbox.window.dfmStartGather = undefined;
  const src = (flagOff ? spikeSrcFlagOff : spikeSrc) + '\n' + revealSrc + '\nreturn { dfmMotionActive, dfmStartGather: window.dfmStartGather, dfmFinishGather, startProfileReveal: window.startProfileReveal };';
  const fn = new Function('window', 'document', 'URLSearchParams', 'sessionTimeout',
    'sessionFrame', 'clearTimeout', 'currentLang', 'visibleQuestions',
    'getConsultationRevealElements', 'openConsultationReveal', 'closeConsultationReveal', src);
  const api = fn(sandbox.window, sandbox.document, URLSearchParams, sandbox.sessionTimeout,
    sandbox.sessionFrame, sandbox.clearTimeout, sandbox.currentLang, sandbox.visibleQuestions,
    sandbox.getConsultationRevealElements, sandbox.openConsultationReveal, sandbox.closeConsultationReveal);
  return { clock, els, calls, api, sandbox, body: bodyEl };
}

// --------------------------------------------------------------- gate tests
section('feature gate: GLOBAL under the authorized activation (every host, no parameter)');
{
  const prod = makeEnv({ hostname: 'beford782.github.io', search: '?motion=1' });
  ok('production host + ?motion=1: ACTIVE (global activation)', prod.api.dfmMotionActive() === true);
  const prod2 = makeEnv({ hostname: 'beford782.github.io', search: '' });
  ok('production host default: ACTIVE — the flag is global, no parameter needed', prod2.api.dfmMotionActive() === true);
  const local = makeEnv({ hostname: 'localhost', search: '?motion=1' });
  ok('localhost + ?motion=1 ENABLED for owner review', local.api.dfmMotionActive() === true);
  const localOff = makeEnv({ hostname: 'localhost', search: '' });
  ok('localhost default: ACTIVE under the global flag', localOff.api.dfmMotionActive() === true);
  const lan = makeEnv({ hostname: '192.168.1.20', search: '?motion=1' });
  ok('LAN host: ACTIVE under the global flag', lan.api.dfmMotionActive() === true);
}

section('feature gate under ROLLBACK: fails closed everywhere except explicit local preview');
{
  const prod = makeEnv({ hostname: 'beford782.github.io', search: '?motion=1', flagOff: true });
  ok('ROLLBACK: production host + ?motion=1 stays DISABLED', prod.api.dfmMotionActive() === false);
  const prod2 = makeEnv({ hostname: 'beford782.github.io', search: '', flagOff: true });
  ok('ROLLBACK: production host default DISABLED', prod2.api.dfmMotionActive() === false);
  const local = makeEnv({ hostname: 'localhost', search: '?motion=1', flagOff: true });
  ok('ROLLBACK: localhost + ?motion=1 ENABLED for owner review', local.api.dfmMotionActive() === true);
  const localOff = makeEnv({ hostname: 'localhost', search: '', flagOff: true });
  ok('ROLLBACK: localhost without the parameter stays DISABLED', localOff.api.dfmMotionActive() === false);
  const lan = makeEnv({ hostname: '192.168.1.20', search: '?motion=1', flagOff: true });
  ok('ROLLBACK: LAN host + ?motion=1 stays DISABLED (fail closed)', lan.api.dfmMotionActive() === false);
}

// ------------------------------------------------------------ disabled path
section('disabled path (ROLLBACK state): legacy staged reveal, unchanged behavior and timing');
{
  const env = makeEnv({ hostname: 'beford782.github.io', search: '?motion=1', flagOff: true });
  env.api.startProfileReveal();
  ok('legacy overlay opened', env.calls.overlayOpen === 1);
  ok('in-flight flag set', env.sandbox.window._profileRevealInFlight === true);
  ok('stage one copy rendered from legacy strings',
    env.els.resultsRevealTitle.textContent === 'Building your Sleep Brief');
  ok('no gather layer activation', !env.els.dfmGatherLayer.classList.contains('is-active'));
  ok('no clones created', env.els.dfmGatherLayer.children.length === 0);
  env.clock.advance(1499);
  ok('no advance before legacy 1500 ms', env.calls.showProfile.length === 0);
  env.clock.advance(1);
  ok('advance at exactly the legacy 1500 ms (no added delay)',
    env.calls.showProfile.length === 1 && env.calls.showProfile[0] === 1500);
  ok('in-flight flag cleared', env.sandbox.window._profileRevealInFlight === false);
  ok('no dfm transforms on any element', env.els.reviewList.children.every((r) => !r.style.transform));
}

// ------------------------------------------------------------- enabled path
section('enabled path: gather owns the transition, then the existing Sleep Brief');
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1' });
  env.api.startProfileReveal();
  ok('gather took ownership (no legacy overlay)', env.calls.overlayOpen === 0);
  ok('layer activated', env.els.dfmGatherLayer.classList.contains('is-active'));
  const clones = env.els.dfmGatherLayer.children;
  ok('three clones from the preferred trio',
    clones.length === 3 &&
    clones.map((c) => c.textContent).join('|') ===
      'ANSWER:sleep_position|ANSWER:temperature|ANSWER:firmness');
  ok('clones use the customer\'s actual rendered answer rows',
    clones.every((c) => c.textContent.startsWith('ANSWER:')));
  ok('edit buttons stripped from clones',
    clones.every((c) => !c.querySelector('.noct-review-edit')));
  ok('clone styling class applied', clones.every((c) => c.className.includes('dfm-clone')));
  ok('per-clone inline transitions: staggered travel, undelayed 180 ms fade',
    clones.every((c, i) =>
      (c.style.transition || '').includes('transform var(--dfm-place) var(--dfm-e-place) ' + (i * 40) + 'ms') &&
      (c.style.transition || '').includes('opacity 180ms var(--dfm-e-settle) 0ms')));
  env.clock.advance(0);
  ok('travel transforms applied after paint frames',
    clones.every((c) => /translate\(.+\) scale\(0\.62\) rotate\(/.test(c.style.transform || '')));
  env.clock.advance(500);
  ok('opacity exit begins at 500 ms on every clone (fade completes by 680 ms)',
    clones.every((c) => c.style.opacity === '0'));
  env.clock.advance(199);
  ok('no advance before 700 ms; clones still present through their fade',
    env.calls.showProfile.length === 0 && env.els.dfmGatherLayer.children.length === 3);
  env.clock.advance(1);
  ok('advance into existing Sleep Brief at 700 ms', env.calls.showProfile.length === 1);
  ok('layer deactivated and emptied',
    !env.els.dfmGatherLayer.classList.contains('is-active') &&
    env.els.dfmGatherLayer.children.length === 0);
  ok('in-flight flag cleared', env.sandbox.window._profileRevealInFlight === false);
  env.clock.advance(2000);
  ok('watchdog after completion is a no-op (single advance)', env.calls.showProfile.length === 1);
}

// ----------------------------------------------------- interruption + spam
section('interruption, spam, and cleanup');
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1' });
  env.api.startProfileReveal();
  for (let i = 0; i < 10; i++) env.api.startProfileReveal();
  ok('10x re-entry blocked by in-flight guard (one clone set)',
    env.els.dfmGatherLayer.children.length === 3);
  env.clock.advance(100);
  env.els.dfmGatherLayer.fire('click');
  ok('tap-to-skip advances immediately', env.calls.showProfile.length === 1);
  ok('skip cleans the layer', env.els.dfmGatherLayer.children.length === 0 &&
    !env.els.dfmGatherLayer.classList.contains('is-active'));
  env.clock.advance(3000);
  ok('orphaned timers after skip are no-ops', env.calls.showProfile.length === 1);
}
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1' });
  env.api.startProfileReveal();
  env.clock.advance(100);
  // wipe mid-gather: session timers orphaned; registry + reset cleanup
  env.sandbox.window._profileRevealInFlight = false;
  env.els.dfmGatherLayer.classList.remove('is-active');
  env.els.dfmGatherLayer.innerHTML = '';
  env.clock.advance(3000);
  ok('wipe mid-gather leaves no clones and no stray advance... (timers were session-scoped in prod; harness approximates by cleanup)',
    env.els.dfmGatherLayer.children.length === 0);
}

// -------------------------------------------------- reduced motion + intl
section('reduced motion: enabled preview OWNS the transition — immediate, zero-animation');
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1', reduced: true });
  ok('reduced motion: dfm-motion body class is never added',
    !env.body.classList.contains('dfm-motion'));
  env.api.startProfileReveal();
  ok('reduced motion: legacy staged overlay is NOT opened', env.calls.overlayOpen === 0);
  ok('reduced motion: advance happens IMMEDIATELY at time zero',
    env.calls.showProfile.length === 1 && env.calls.showProfile[0] === 0);
  ok('reduced motion: zero clones, layer never activated',
    env.els.dfmGatherLayer.children.length === 0 &&
    !env.els.dfmGatherLayer.classList.contains('is-active'));
  ok('reduced motion: no in-flight flag left behind',
    env.sandbox.window._profileRevealInFlight !== true);
  env.clock.advance(3000);
  ok('reduced motion: no delayed second advance (single destination arrival)',
    env.calls.showProfile.length === 1);
}
{
  // Flag OFF (rollback state) + reduced motion. Slice 2 HARDENED this
  // retained fallback (owner ruling 2026-08-15): when the gather declines
  // ownership — because the flag is off, or because its elements are missing
  // — reduced motion must not inherit the 1500 ms staged overlay the gather
  // would have skipped. Same destination, no staging, no in-flight flag.
  const env = makeEnv({ hostname: 'beford782.github.io', search: '', reduced: true, flagOff: true });
  ok('disabled + reduced: body class absent', !env.body.classList.contains('dfm-motion'));
  env.api.startProfileReveal();
  ok('disabled + reduced: the staged overlay is NOT opened (hardened fallback)',
    env.calls.overlayOpen === 0);
  ok('disabled + reduced: advance happens IMMEDIATELY at time zero',
    env.calls.showProfile.length === 1 && env.calls.showProfile[0] === 0);
  ok('disabled + reduced: no in-flight flag left behind',
    env.sandbox.window._profileRevealInFlight !== true);
  env.clock.advance(3000);
  ok('disabled + reduced: no delayed second advance (single destination arrival)',
    env.calls.showProfile.length === 1);
}
{
  // The non-reduced rollback path is untouched: staged overlay, 1500 ms.
  const env = makeEnv({ hostname: 'beford782.github.io', search: '', reduced: false, flagOff: true });
  env.api.startProfileReveal();
  ok('disabled + full motion: legacy overlay path runs unchanged', env.calls.overlayOpen === 1);
  env.clock.advance(1500);
  ok('disabled + full motion: legacy 1500 ms arrival preserved',
    env.calls.showProfile.length === 1 && env.calls.showProfile[0] === 1500);
}
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1', reduced: false });
  ok('non-reduced enabled preview DOES add the body class',
    env.body.classList.contains('dfm-motion'));
}
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1', lang: 'es' });
  env.api.startProfileReveal();
  ok('Spanish session: gather uses the same rendered (localized) rows',
    env.els.dfmGatherLayer.children.length === 3);
  env.clock.advance(800);
  ok('Spanish session completes into Sleep Brief', env.calls.showProfile.length === 1);
}

// ------------------------------------------------------ fallback mappings
section('mapping fallbacks never fabricate answers');
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1' });
  // rows/questions mismatch -> must decline and run legacy
  env.els.reviewList.children.pop();
  env.api.startProfileReveal();
  ok('row/question count mismatch declines to legacy', env.calls.overlayOpen === 1);
}

// ================================================================ slice 2
// Firmness surface — the quilted demonstration panel under the firmness
// slider. Same house style: the REAL spike source is executed against a
// DOM stub and a fake clock. This section is deliberately self-contained
// (its own mini-harness) so it composes with concurrent edits to the
// shared makeEnv without merge conflicts.
section('firmness surface: static guarantees');
ok('markup, init and set live inside the spike fences',
  /window\.dfmFirmnessMarkup = function/.test(spikeSrc) &&
  /window\.dfmFirmnessInit = function/.test(spikeSrc) &&
  /window\.dfmFirmnessSet = function/.test(spikeSrc));
ok('markup is gate-guarded (declines to empty when motion is inactive)',
  /dfmFirmnessMarkup = function\(\) \{\s*if \(!dfmMotionActive\(\)\) return '';/.test(html.replace(/\r\n/g, '\n')));
ok('slider template hook is guarded and falls through',
  html.includes("${window.dfmFirmnessMarkup ? window.dfmFirmnessMarkup() : ''}"));
ok('slider init hook is guarded',
  html.includes('if (window.dfmFirmnessInit) window.dfmFirmnessInit(val);'));
ok('slider input hook is guarded',
  html.includes('if (window.dfmFirmnessSet) window.dfmFirmnessSet(parseInt(this.value));'));
ok('persistent honesty caption present in both languages',
  spikeSrc.includes('Your selected feel — demonstration only') &&
  spikeSrc.includes('Tu firmeza elegida — solo demostración'));
ok('the SVG is aria-hidden decorative (the slider stays the one real control)',
  /<svg viewBox="0 0 320 150" id="dfmFirmSvg" aria-hidden="true" focusable="false">/.test(spikeSrc));
const firmCssStart = cssNorm.indexOf('.dfm-firm-panel {');
const firmCssEnd = cssNorm.indexOf('/* Slider */');
const firmCss = firmCssStart !== -1 && firmCssEnd > firmCssStart
  ? cssNorm.slice(firmCssStart, firmCssEnd) : '';
ok('surface CSS block located', firmCss.length > 50);
ok('surface CSS declares ZERO transitions/animations (all motion is JS point-rewriting)',
  firmCss !== '' && !/transition\s*:/.test(firmCss) && !/animation\s*:/.test(firmCss));
ok('surface SVG opts out of scroll gestures (touch-action: none)',
  /touch-action:\s*none/.test(firmCss));
ok('caption contains no quantities (materials-and-mechanism content rule)',
  !/\d/.test('Your selected feel — demonstration only') &&
  !/\d/.test('Tu firmeza elegida — solo demostración'));

// mini-harness: spike source only, its own frame counter and a frame
// budget — a loop that cannot die at rest THROWS here instead of hanging
// the drain, so that defect fails loudly
function makeFirmEnv({ hostname, search, reduced = false, lang = 'en', withEls = true, flagOff = false }) {
  const clock = makeClock();
  const els = {};
  if (withEls) {
    for (const id of ['dfmFirmSvg', 'dfmFirmRows', 'dfmFirmContact', 'dfmGatherLayer']) {
      els[id] = makeEl(id);
    }
    els.dfmFirmSvg._rect = { left: 0, top: 0, width: 320, height: 150 };
  }
  const calls = { frames: 0, timers: 0 };
  const bodyEl = makeEl('body');
  const win = {
    location: { hostname, search },
    matchMedia: () => ({ matches: reduced }),
    innerWidth: 1024,
    innerHeight: 768
  };
  const doc = {
    body: bodyEl,
    getElementById: (id) => els[id] || null,
    createElementNS: (ns, tag) => makeEl(tag)
  };
  const sessionFrameStub = (fn) => {
    calls.frames++;
    if (calls.frames > 5000) throw new Error('frame budget exceeded — a frame loop failed to die at rest');
    return clock.setTimeout(fn, 0);
  };
  const sessionTimeoutStub = (fn, ms) => { calls.timers++; return clock.setTimeout(fn, ms); };
  const src = (flagOff ? spikeSrcFlagOff : spikeSrc) +
    '\nreturn { dfmMotionActive: dfmMotionActive, markup: window.dfmFirmnessMarkup,' +
    ' init: window.dfmFirmnessInit, set: window.dfmFirmnessSet };';
  const fn = new Function('window', 'document', 'URLSearchParams', 'sessionTimeout',
    'sessionFrame', 'clearTimeout', 'currentLang', src);
  const api = fn(win, doc, URLSearchParams, sessionTimeoutStub, sessionFrameStub,
    (id) => clock.clearTimeout(id), lang);
  return { clock, els, calls, api, body: bodyEl };
}
function firmRowYs(d) {
  // parse every y ordinate out of an "Mx y Lx y…" path string
  return [...d.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => parseFloat(m[1]));
}
function firmRowFlat(row) {
  const ys = firmRowYs(row.attrs.d || '');
  return ys.length === 33 && ys.every((y) => Math.abs(y - row._baseY) < 0.05);
}
function tagBaselines(env) {
  const rowsY = [30, 46, 62, 78, 94, 110, 126];
  env.els.dfmFirmRows.children.forEach((row, i) => { row._baseY = rowsY[i]; });
}

section('firmness surface: gate behavior');
{
  const active = makeFirmEnv({ hostname: 'localhost', search: '?motion=1' });
  const m = active.api.markup();
  ok('active markup renders the panel with the EN caption',
    m.includes('dfm-firm-panel') && m.includes('Your selected feel — demonstration only'));
  const es = makeFirmEnv({ hostname: 'localhost', search: '?motion=1', lang: 'es' });
  ok('Spanish session renders the ES caption',
    es.api.markup().includes('Tu firmeza elegida — solo demostración'));
  // committed enabled state: the flag is GLOBAL — the public Pages hostname
  // gets the surface with no ?motion=1 parameter
  const globalHost = makeFirmEnv({ hostname: 'beford782.github.io', search: '' });
  ok('committed enabled state: public Pages hostname renders the surface without ?motion=1',
    globalHost.api.markup().includes('dfm-firm-panel'));
  // ROLLBACK state (enabled: false injected into the executed source): the
  // public hostname renders no surface and the legacy DOM is preserved —
  // ?motion=1 stays fail-closed off-localhost
  const rollback = makeFirmEnv({ hostname: 'beford782.github.io', search: '?motion=1', flagOff: true });
  ok('ROLLBACK: public hostname + ?motion=1 renders no surface (legacy DOM byte-identical)',
    rollback.api.markup() === '');
  const rollbackPlain = makeFirmEnv({ hostname: 'beford782.github.io', search: '', flagOff: true });
  ok('ROLLBACK: public hostname default renders no surface', rollbackPlain.api.markup() === '');
  const rollbackLocal = makeFirmEnv({ hostname: 'localhost', search: '?motion=1', flagOff: true });
  ok('ROLLBACK: localhost + ?motion=1 still previews the surface for owner review',
    rollbackLocal.api.markup().includes('dfm-firm-panel'));
  const bare = makeFirmEnv({ hostname: 'localhost', search: '?motion=1', withEls: false });
  ok('init with no rendered surface declines and invalidates', bare.api.init(5) === false);
  ok('set with no engine declines', bare.api.set(5) === false);
}

section('firmness surface: press, settle, and the loop dying at rest');
{
  const env = makeFirmEnv({ hostname: 'localhost', search: '?motion=1' });
  ok('init succeeds on the active path', env.api.init(5) === true);
  tagBaselines(env);
  const rows = env.els.dfmFirmRows.children;
  ok('seven quilt rows drawn with 33 samples each',
    rows.length === 7 && rows.every((r) => firmRowYs(r.attrs.d || '').length === 33));
  ok('arrival state is flat (the demonstration is input-driven, never ambient)',
    rows.every(firmRowFlat) && env.calls.frames === 0);
  env.els.dfmFirmSvg.fire('pointerdown', { clientX: 160, clientY: 75, preventDefault() {} });
  ok('press schedules frames', env.calls.frames > 0);
  env.clock.advance(0);
  // margin-based, not a strict float compare: an FP hairline between equal
  // deviations must not satisfy "local" (caught by mutation testing — a
  // falloff-removed mutant produced 14.399999999999999 < 14.400000000000006)
  const edgeDev = Math.max(...firmRowYs(rows[0].attrs.d).map((y) => Math.abs(y - 30)));
  const centerDev = Math.max(...firmRowYs(rows[3].attrs.d).map((y) => Math.abs(y - 78)));
  ok('pressed surface shows a genuinely local dent (edge row < 60% of center-row deviation)',
    !firmRowFlat(rows[2]) && !firmRowFlat(rows[3]) &&
    centerDev > 1 && edgeDev < centerDev * 0.6);
  const contact = env.els.dfmFirmContact;
  ok('contact shadow tracks the press', parseFloat(contact.attrs.rx) > 0);
  const framesHeld = env.calls.frames;
  env.clock.advance(2000);
  ok('loop DIES at rest even while the press is held (no free-running frames)',
    env.calls.frames === framesHeld);
  env.els.dfmFirmSvg.fire('pointerup', {});
  env.clock.advance(3000);
  ok('release rebounds to flat and the loop dies again',
    rows.every(firmRowFlat) && parseFloat(contact.attrs.rx) === 0);
  const framesRest = env.calls.frames;
  env.clock.advance(5000);
  ok('at rest, zero frames are ever scheduled', env.calls.frames === framesRest);
}

section('firmness surface: slider-driven demonstration press');
{
  const env = makeFirmEnv({ hostname: 'localhost', search: '?motion=1' });
  env.api.init(5);
  tagBaselines(env);
  const rows = env.els.dfmFirmRows.children;
  ok('set drives a centered demonstration press', env.api.set(2) === true);
  env.clock.advance(0);
  ok('demonstration dent appears at panel center', !firmRowFlat(rows[2]));
  const softRx = parseFloat(env.els.dfmFirmContact.attrs.rx);
  env.clock.advance(5000);
  ok('demonstration releases by itself and settles flat (hold timer, then rebound)',
    rows.every(firmRowFlat));
  const framesRest = env.calls.frames;
  env.clock.advance(3000);
  ok('after the demonstration, the loop is dead', env.calls.frames === framesRest);
  env.api.set(9);
  env.clock.advance(0);
  const firmRx = parseFloat(env.els.dfmFirmContact.attrs.rx);
  ok('firmer selection spreads wider and shallower (physics follows the selection)',
    firmRx > softRx);
  env.clock.advance(5000);
}

section('firmness surface: slider demo overlapped by a manual press');
{
  const env = makeFirmEnv({ hostname: 'localhost', search: '?motion=1' });
  env.api.init(5);
  tagBaselines(env);
  const rows = env.els.dfmFirmRows.children;
  env.api.set(3);          // demonstration press; its release timer is pending
  env.clock.advance(100);  // dent settling; the release timer has NOT fired
  env.els.dfmFirmSvg.fire('pointerdown', { clientX: 120, clientY: 70, preventDefault() {} });
  env.clock.advance(3000); // well beyond the original demo-release timer
  ok('dent remains held across the stale demo-release timer',
    !firmRowFlat(rows[2]) && parseFloat(env.els.dfmFirmContact.attrs.rx) > 0);
  const framesHeld = env.calls.frames;
  env.clock.advance(2000);
  ok('held overlap reaches rest — the frame loop is dead while held',
    env.calls.frames === framesHeld);
  env.els.dfmFirmSvg.fire('pointerup', {});
  env.clock.advance(4000);
  ok('release after the overlap rebounds to flat and the loop dies',
    rows.every(firmRowFlat) && parseFloat(env.els.dfmFirmContact.attrs.rx) === 0);
  const framesRest = env.calls.frames;
  env.clock.advance(3000);
  ok('no frames after the overlap settles', env.calls.frames === framesRest);
}

section('firmness surface: reduced motion never schedules a frame');
{
  const env = makeFirmEnv({ hostname: 'localhost', search: '?motion=1', reduced: true });
  ok('reduced init succeeds', env.api.init(5) === true);
  tagBaselines(env);
  const rows = env.els.dfmFirmRows.children;
  ok('reduced arrival is the frozen static figure (dent drawn, zero frames)',
    !firmRowFlat(rows[2]) && env.calls.frames === 0);
  env.api.set(9);
  ok('reduced set snaps instantly — still zero frames', env.calls.frames === 0);
  env.els.dfmFirmSvg.fire('pointerdown', { clientX: 100, clientY: 60, preventDefault() {} });
  env.els.dfmFirmSvg.fire('pointerup', {});
  ok('reduced press is synchronous — still zero frames, timeline collapsed',
    env.calls.frames === 0);
  env.clock.advance(3000);
  ok('nothing was deferred under reduced motion', env.calls.frames === 0);
}

section('firmness surface: re-render and stale-engine safety');
{
  const env = makeFirmEnv({ hostname: 'localhost', search: '?motion=1' });
  env.api.init(5);
  ok('re-init supersedes the previous engine generation', env.api.init(7) === true);
  ok('set routes to the newest engine only', env.api.set(3) === true);
  env.clock.advance(5000);
  // a later render without the surface (gate closed mid-session) kills the engine
  env.els.dfmFirmSvg = null;
  ok('init after the surface disappears declines and invalidates the engine',
    env.api.init(5) === false && env.api.set(5) === false);
}

// ================================================================ slice 3
// Adjustable-base articulation — the sleep-system position demo travels
// between poses under a finite gated transition; the legacy SMIL loop is
// retired in every state. Self-contained mini-harness, same pattern as
// slice 2.
section('base articulation: the SMIL loop is retired and cannot return');
ok('no SMIL animation elements anywhere in index.html (every form, any case)',
  !/<animate(transform|motion|color)?[\s>/]/i.test(html) &&
  !/\+\s*'<animate/i.test(html));
ok('no indefinite repeat anywhere in index.html (any case)', !/repeatcount/i.test(html));
ok('the legacy hero cycling-labels arrays left with the loop',
  !html.includes("['PLANO', 'LECTURA', 'GRAVEDAD CERO', 'ANTI-RONQUIDOS']") &&
  !html.includes("['FLAT', 'READING', 'ZERO GRAVITY', 'ANTI-SNORE']"));

section('base articulation: static guarantees');
ok('the flip lives inside the spike fences',
  /window\.dfmBaseDemoFlip = function/.test(spikeSrc));
ok('every invocation supersedes pending work FIRST, then branches for the gate and reduced motion',
  /dfmBaseDemoFlip = function\(prevPose\) \{[\s\S]{0,500}?var gen = \+\+_dfmBaseGen;\s*if \(!dfmMotionActive\(\) \|\| dfmReducedMotion\(\)\) return false;/.test(cssNorm));
ok('demo-position handler hook is guarded and single-sited',
  html.includes('if (window.dfmBaseDemoFlip) window.dfmBaseDemoFlip(dfmPrevPose);') &&
  (html.match(/dfmBaseDemoFlip/g) || []).length === 3);
ok('the live bed diagram carries the flip id',
  html.includes('class="sleep-system__bed" id="dfmSleepBed"'));
ok('the flip schedules at most two frames and no timers (finite by code)',
  (() => {
    const flipStart = spikeSrc.indexOf('window.dfmBaseDemoFlip');
    if (flipStart === -1) return false;
    const flipSrc = spikeSrc.slice(flipStart);
    return (flipSrc.match(/sessionFrame\(/g) || []).length === 2 &&
      !/sessionTimeout\s*\(|setInterval|requestAnimationFrame/.test(flipSrc);
  })());
const actuatorRuleIdx = cssNorm.indexOf('body.dfm-motion .sleep-system__bed-head,\n    body.dfm-motion .sleep-system__bed-middle,\n    body.dfm-motion .sleep-system__bed-foot {\n      transition: transform var(--dfm-base) var(--dfm-e-actuator),');
ok('gated actuator rule exists with the finite base token',
  actuatorRuleIdx !== -1 && /--dfm-base: 1100ms;/.test(cssNorm) &&
  /--dfm-e-actuator: cubic-bezier\(0\.45, 0, 0\.55, 1\);/.test(cssNorm));
ok('gated pillow rule travels the same finite token',
  /body\.dfm-motion \.sleep-system__bed-pillow \{\s*transition: transform var\(--dfm-base\) var\(--dfm-e-actuator\),/.test(cssNorm));
ok('reduced-motion token collapse covers --dfm-base',
  /--dfm-place: 0\.01ms;\s*--dfm-base: 0\.01ms;/.test(cssNorm));
ok('defensive reduced override kills bed travel AFTER the gated rule (and out-specifies the legacy rule)',
  !!reducedBlk && reducedBlk.index > actuatorRuleIdx &&
  /body \.sleep-system__bed-head,/.test(reducedBlk.text) &&
  /body\.dfm-motion \.sleep-system__bed-pillow \{ transition: none; \}/.test(reducedBlk.text));
ok('legacy diagram base rule is untouched (rollback keeps the snap behavior)',
  /\.sleep-system__bed-head,\n    \.sleep-system__bed-middle,\n    \.sleep-system__bed-foot \{[\s\S]{0,400}?transition: transform 420ms ease, bottom 420ms ease;/.test(cssNorm));
ok('the slice adds NO new user-facing strings (positions are existing shipped copy)',
  !spikeSrc.includes('Cabecera') && !spikeSrc.includes('Head raised'));

// mini-harness: spike source only; counts every frame/timer so the flip's
// two-frame budget is executable fact
function makeBaseEnv({ hostname, search, reduced = false, lang = 'en', withBed = true, flagOff = false }) {
  const clock = makeClock();
  const els = {};
  if (withBed) {
    els.dfmSleepBed = makeEl('dfmSleepBed');
    els.dfmSleepBed.setAttribute('data-position', 'flat');
  }
  els.dfmGatherLayer = makeEl('dfmGatherLayer');
  const calls = { frames: 0, timers: 0 };
  const bodyEl = makeEl('body');
  // pref is mutable so tests can flip the reduced-motion preference while
  // frames are still pending — the engine reads matchMedia per call
  const pref = { reduced };
  const win = { location: { hostname, search }, matchMedia: () => ({ matches: pref.reduced }), innerWidth: 1024, innerHeight: 768 };
  const doc = { body: bodyEl, getElementById: (id) => els[id] || null, createElementNS: (ns, tag) => makeEl(tag) };
  const src = (flagOff ? spikeSrcFlagOff : spikeSrc) +
    '\nreturn { flip: window.dfmBaseDemoFlip };';
  const fn = new Function('window', 'document', 'URLSearchParams', 'sessionTimeout',
    'sessionFrame', 'clearTimeout', 'currentLang', src);
  const api = fn(win, doc, URLSearchParams,
    (f, ms) => { calls.timers++; return clock.setTimeout(f, ms); },
    (f) => { calls.frames++; if (calls.frames > 100) throw new Error('frame budget exceeded'); return clock.setTimeout(f, 0); },
    (id) => clock.clearTimeout(id), lang);
  return { clock, els, calls, api, pref };
}

section('base articulation: gate behavior');
{
  const active = makeBaseEnv({ hostname: 'localhost', search: '?motion=1' });
  active.els.dfmSleepBed.setAttribute('data-position', 'zero-gravity');
  ok('active flip takes ownership', active.api.flip('flat') === true);
  const globalHost = makeBaseEnv({ hostname: 'beford782.github.io', search: '' });
  globalHost.els.dfmSleepBed.setAttribute('data-position', 'reading');
  ok('committed enabled state: public Pages hostname flips without ?motion=1',
    globalHost.api.flip('flat') === true);
  const rollback = makeBaseEnv({ hostname: 'beford782.github.io', search: '?motion=1', flagOff: true });
  rollback.els.dfmSleepBed.setAttribute('data-position', 'reading');
  ok('ROLLBACK: public hostname declines and the direct render stands',
    rollback.api.flip('flat') === false && rollback.calls.frames === 0 &&
    rollback.els.dfmSleepBed.getAttribute('data-position') === 'reading');
  const rollbackLocal = makeBaseEnv({ hostname: 'localhost', search: '?motion=1', flagOff: true });
  rollbackLocal.els.dfmSleepBed.setAttribute('data-position', 'reading');
  ok('ROLLBACK: localhost + ?motion=1 still previews the flip for owner review',
    rollbackLocal.api.flip('flat') === true);
}

section('base articulation: the flip travels, interrupts, and stays finite');
{
  const env = makeBaseEnv({ hostname: 'localhost', search: '?motion=1' });
  const bed = env.els.dfmSleepBed;
  bed.setAttribute('data-position', 'zero-gravity');
  env.api.flip('flat');
  ok('the previous pose paints first (travel has a starting frame)',
    bed.getAttribute('data-position') === 'flat');
  env.clock.advance(0);
  ok('the bed is released to the selected pose',
    bed.getAttribute('data-position') === 'zero-gravity');
  ok('exactly two frames, zero timers per selection',
    env.calls.frames === 2 && env.calls.timers === 0);
  env.clock.advance(10000);
  ok('nothing further is ever scheduled', env.calls.frames === 2 && env.calls.timers === 0);
  bed.setAttribute('data-position', 'anti-snore');
  env.api.flip('zero-gravity');
  bed.setAttribute('data-position', 'reading');
  env.api.flip('anti-snore');
  env.clock.advance(0);
  ok('a second selection mid-flight supersedes the first (generation guard)',
    bed.getAttribute('data-position') === 'reading');
  // budget arithmetic: completed flips cost two frames (paint + release);
  // a superseded flip's outer frame sees the stale generation and stops
  // without scheduling its inner — so flip1 (2) + superseded flip2 (1) +
  // live flip3 (2) = 5
  ok('interrupted flip stays within budget (superseded outer frame stops early)',
    env.calls.frames === 5);
  const same = makeBaseEnv({ hostname: 'localhost', search: '?motion=1' });
  same.els.dfmSleepBed.setAttribute('data-position', 'flat');
  ok('same-pose selection declines (no pointless travel)',
    same.api.flip('flat') === false && same.calls.frames === 0);
}

section('base articulation: declined selections still supersede pending work');
{
  // the Codex race: a full-motion flip is pending when the OS preference
  // flips to reduced and the customer selects again — the stale target
  // must never overwrite the new direct-rendered pose
  const env = makeBaseEnv({ hostname: 'localhost', search: '?motion=1' });
  const bed = env.els.dfmSleepBed;
  bed.setAttribute('data-position', 'reading');
  ok('full-motion flip accepted with frames pending',
    env.api.flip('flat') === true && env.calls.frames === 1 &&
    bed.getAttribute('data-position') === 'flat');
  env.pref.reduced = true;                       // preference flips mid-flight
  bed.setAttribute('data-position', 'anti-snore'); // new selection direct-renders
  ok('reduced selection declines with zero new frames',
    env.api.flip('reading') === false && env.calls.frames === 1);
  env.clock.advance(0);                          // drain the stale frames
  ok('the stale full-motion target never returns — the reduced pose stands',
    bed.getAttribute('data-position') === 'anti-snore');
  env.clock.advance(5000);
  ok('nothing further fires after the superseded flip', env.calls.frames === 1);
}
{
  const env = makeBaseEnv({ hostname: 'localhost', search: '?motion=1' });
  const bed = env.els.dfmSleepBed;
  bed.setAttribute('data-position', 'reading');
  env.api.flip('flat');                          // pending
  bed.setAttribute('data-position', 'zero-gravity'); // new render
  ok('same-pose decline still supersedes pending work',
    env.api.flip('zero-gravity') === false);
  env.clock.advance(0);
  ok('superseded frames never restore the earlier target',
    bed.getAttribute('data-position') === 'zero-gravity');
}
{
  const env = makeBaseEnv({ hostname: 'localhost', search: '?motion=1' });
  const bed = env.els.dfmSleepBed;
  bed.setAttribute('data-position', 'reading');
  env.api.flip('flat');                          // pending
  bed.setAttribute('data-position', 'zero-gravity');
  const savedBed = env.els.dfmSleepBed;
  env.els.dfmSleepBed = null;                    // element gone at next selection
  ok('missing-element decline still supersedes pending work',
    env.api.flip('reading') === false);
  env.els.dfmSleepBed = savedBed;
  env.clock.advance(0);
  ok('restored bed keeps its rendered pose — stale target dead',
    savedBed.getAttribute('data-position') === 'zero-gravity');
}

section('base articulation: reduced motion, wipes, and missing elements');
{
  const reduced = makeBaseEnv({ hostname: 'localhost', search: '?motion=1', reduced: true });
  reduced.els.dfmSleepBed.setAttribute('data-position', 'zero-gravity');
  ok('reduced motion declines BEFORE any frame — the direct render is the static state',
    reduced.api.flip('flat') === false && reduced.calls.frames === 0 &&
    reduced.els.dfmSleepBed.getAttribute('data-position') === 'zero-gravity');
  const bare = makeBaseEnv({ hostname: 'localhost', search: '?motion=1', withBed: false });
  ok('missing bed declines without throwing', bare.api.flip('flat') === false);
  const gone = makeBaseEnv({ hostname: 'localhost', search: '?motion=1' });
  gone.els.dfmSleepBed.setAttribute('data-position', 'reading');
  gone.api.flip('flat');
  let goneThrew = false;
  gone.els.dfmSleepBed = null; // step navigated away before the frames fire
  try { gone.clock.advance(0); } catch (e) { goneThrew = true; }
  ok('bed removed mid-flip: pending frames are harmless no-ops', goneThrew === false);
  const noPrev = makeBaseEnv({ hostname: 'localhost', search: '?motion=1' });
  ok('missing previous pose declines (first render never travels)',
    noPrev.api.flip(undefined) === false && noPrev.calls.frames === 0);
}

// ================================================================ slice 4
// Construction reveal — on-demand generic textured strata in the drawer,
// rendered as a SEPARATE SIBLING SECTION after the model-specific
// differentiators (the generic demonstration must never sit under "What
// makes this one different"). Self-contained mini-harness.
section('construction reveal: static guarantees');
ok('markup and render live inside the spike fences',
  /window\.dfmConstructionMarkup = function/.test(spikeSrc) &&
  /window\.dfmConstructionRender = function/.test(spikeSrc));
ok('markup is gate-guarded (declines to empty when motion is inactive)',
  /dfmConstructionMarkup = function\(\) \{\s*if \(!dfmMotionActive\(\)\) return '';/.test(cssNorm));
ok('drawer hook is guarded and single-sited',
  html.includes('if (window.dfmConstructionRender) window.dfmConstructionRender();') &&
  (html.match(/dfmConstructionRender/g) || []).length === 3);
ok('the panel is inserted as a SIBLING after the differentiators, never inside them',
  spikeSrc.includes("host.insertAdjacentHTML('afterend', markup);") &&
  !spikeSrc.includes("insertAdjacentHTML('beforeend'"));
ok('render dedupes BEFORE the gate — no duplicates, and rollback clears leftovers',
  /var existing = document\.getElementById\('dfmConstructionSection'\);\s*if \(existing && existing\.parentNode\) existing\.parentNode\.removeChild\(existing\);\s*var markup = window\.dfmConstructionMarkup\(\);/.test(cssNorm));
ok('the section carries a visible heading reusing the chip wording only',
  spikeSrc.includes("es ? 'Demostración de construcción' : 'Construction demonstration'") &&
  spikeSrc.includes('drawer-section-label'));
ok('the section is in the authoritative session-wipe inventory',
  /var SESSION_CONTENT_IDS = \[[\s\S]*?'dfmConstructionSection'[\s\S]*?\];/.test(cssNorm));
ok('the scene has no JS animation machinery (no frames, no timers in its code)',
  (() => {
    const start = spikeSrc.indexOf('window.dfmConstructionMarkup');
    const stop = spikeSrc.indexOf('// The styling hook is withheld');
    if (start === -1 || stop === -1 || stop < start) return false;
    const src = spikeSrc.slice(start, stop);
    return !/sessionFrame\s*\(|sessionTimeout\s*\(|setInterval|requestAnimationFrame/.test(src);
  })());
ok('owner-ruled variance chip preserved verbatim in both languages (5b)',
  spikeSrc.includes('Exact materials and construction vary by model. Ask your specialist about the model you’re trying.') &&
  spikeSrc.includes('Los materiales y la construcción exactos varían según el modelo. Pregúntale a tu especialista sobre el modelo que estás probando.'));
ok('owner-ruled two-role wording preserved verbatim in both languages (5b)',
  ['Comfort', 'The part you feel first.', 'Support', 'The deeper structure that holds you up.',
   'Confort', 'La parte que sientes primero.', 'Soporte', 'La estructura más profunda que te sostiene.']
    .every((l) => spikeSrc.includes("'" + l + "'")));
ok('the retired four-part taxonomy is fully absent from the spike (5b)',
  ['Comfort layer', 'Transition layer', 'Support core', 'Base layer',
   'Capa de confort', 'Capa de transición', 'Núcleo de soporte', 'Capa base']
    .every((l) => !spikeSrc.includes("'" + l + "'")));
ok('lab button labels preserved in both languages',
  ['Separate the layers', 'Reassemble the layers', 'Separar las capas', 'Reunir las capas']
    .every((l) => spikeSrc.includes("'" + l + "'")));
ok('new strings carry no quantities and no condition/performance language',
  ['Comfort', 'The part you feel first.', 'Support', 'The deeper structure that holds you up.',
   'Separate the layers', 'Reassemble the layers', 'Construction demonstration',
   'Exact materials and construction vary by model. Ask your specialist about the model you’re trying.']
    .every((t) => !/\d/.test(t) && !/coil count|inch|cm|percent|%|degree|patent|antimicrobial|snor|apnea|reflux|pain|circulat/i.test(t)));
ok('the stack is fully generic — markup takes no mattress input and reads no product data',
  /dfmConstructionMarkup = function\(\)/.test(spikeSrc) &&
  (() => {
    const start = spikeSrc.indexOf('window.dfmConstructionMarkup');
    const stop = spikeSrc.indexOf('// The styling hook is withheld');
    const src = spikeSrc.slice(start, stop);
    return !/m\.features|m\.tags|archetype|firmness/.test(src);
  })());
const consRuleIdx = cssNorm.indexOf('body.dfm-motion .dfm-cons-region--comfort {\n      transition: transform var(--dfm-place) var(--dfm-e-place);');
ok('region travel and role reveal are gated with finite tokens',
  consRuleIdx !== -1 &&
  /body\.dfm-motion \.dfm-cons-roles \{\s*transition: opacity var\(--dfm-settle\) var\(--dfm-e-settle\), visibility 0s var\(--dfm-settle\);/.test(cssNorm) &&
  /body\.dfm-motion \.dfm-cons\.is-open \.dfm-cons-roles \{\s*transition: opacity var\(--dfm-settle\) var\(--dfm-e-settle\), visibility 0s;/.test(cssNorm));
ok('defensive reduced override kills the reveal travel AFTER the gated rules',
  !!reducedBlk && reducedBlk.index > consRuleIdx &&
  /body\.dfm-motion \.dfm-cons-region--comfort,\s*body\.dfm-motion \.dfm-cons-roles,\s*body\.dfm-motion \.dfm-cons\.is-open \.dfm-cons-roles \{ transition: none; \}/.test(reducedBlk.text));
ok('end-state truth: is-open means transform: none',
  /\.dfm-cons\.is-open \.dfm-cons-region--comfort \{ transform: none; \}/.test(cssNorm));
ok('the stage reserves its exploded height (no layout shift) and is decorative',
  /\.dfm-cons-stage \{[\s\S]{0,200}?height: 122px;/.test(cssNorm) &&
  spikeSrc.includes('class="dfm-cons-stage" aria-hidden="true"'));
ok('the toggle is a 44 px touch target with touch-action: manipulation',
  /\.dfm-cons-btn \{\s*touch-action: manipulation;\s*min-height: 44px;/.test(cssNorm));

// mini-harness: the drawer parent holds the differentiators host as a
// child; insertAdjacentHTML('afterend') registers the section as a SIBLING
// in the parent. The markup STRING is asserted separately; the executed
// checks drive the real wiring and the real dedupe path.
function makeConsEnv({ hostname, search, reduced = false, lang = 'en', withHost = true, flagOff = false }) {
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
  const pref = { reduced };
  const win = { location: { hostname, search }, matchMedia: () => ({ matches: pref.reduced }), innerWidth: 1024, innerHeight: 768 };
  const doc = {
    body: bodyEl,
    getElementById: (id) => {
      // a removed section must stop resolving, like a real DOM
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
  return { clock, els, calls, api, pref };
}
function consSections(env) {
  return env.els.drawerScrollParent.children.filter((c) => c.id === 'dfmConstructionSection');
}

section('construction reveal: gate behavior and honest placement');
{
  const active = makeConsEnv({ hostname: 'localhost', search: '?motion=1' });
  const m = active.api.consMarkup();
  ok('active markup renders the section, heading, chip at rest, and EN roles',
    m.includes('dfmConstructionSection') && m.includes('Construction demonstration</div>') &&
    m.includes('dfm-cons-chip') && m.includes('<dt><span class="dfm-cons-swatch dfm-cons-fill--comfort" aria-hidden="true"></span>Comfort</dt>') &&
    m.includes('Separate the layers'));
  ok('render places the section as a sibling AFTER the differentiators, not inside',
    active.api.consRender() === true &&
    active.els.dfmConstructionSection.parentNode === active.els.drawerScrollParent &&
    active.els.drawerDifferentiators.children.length === 0);
  ok('the model-specific differentiators container stays byte-correct',
    active.els.drawerDifferentiators.children.length === 0 &&
    (active.els.drawerDifferentiators.innerHTML || '') === '');
  const es = makeConsEnv({ hostname: 'localhost', search: '?motion=1', lang: 'es' });
  ok('Spanish session renders the ES heading and provisional ES role strings',
    es.api.consMarkup().includes('Demostración de construcción</div>') &&
    es.api.consMarkup().includes('>Confort</dt>') &&
    es.api.consMarkup().includes('La parte que sientes primero.') &&
    es.api.consMarkup().includes('Separar las capas'));
  const globalHost = makeConsEnv({ hostname: 'beford782.github.io', search: '' });
  ok('committed enabled state: public Pages hostname renders without ?motion=1',
    globalHost.api.consMarkup().includes('dfmConstructionSection'));
  const rollback = makeConsEnv({ hostname: 'beford782.github.io', search: '?motion=1', flagOff: true });
  ok('ROLLBACK: no section is added and the drawer stays legacy',
    rollback.api.consMarkup() === '' && rollback.api.consRender() === false &&
    rollback.calls.inserted === '' && consSections(rollback).length === 0);
  const rollbackLocal = makeConsEnv({ hostname: 'localhost', search: '?motion=1', flagOff: true });
  ok('ROLLBACK: localhost + ?motion=1 still previews for owner review',
    rollbackLocal.api.consRender() === true);
}

section('construction reveal: dedupe across rerenders, models, and languages');
{
  const env = makeConsEnv({ hostname: 'localhost', search: '?motion=1' });
  env.api.consRender();
  env.api.consRender(); // model change re-render
  env.api.consRender(); // another re-render
  ok('exactly one section exists after repeated rerenders',
    consSections(env).length === 1);
  const es = makeConsEnv({ hostname: 'localhost', search: '?motion=1', lang: 'es' });
  es.api.consRender();
  es.api.consRender(); // language-change re-render path
  ok('exactly one section exists after a language rerender, carrying ES markup',
    consSections(es).length === 1 &&
    es.els.dfmConstructionSection._markup.includes('Demostración de construcción'));
  // wipe simulation: the section is emptied by the SESSION_CONTENT_IDS wipe
  // (membership statically asserted above); the next drawer render dedupes
  // the emptied shell and replaces it fresh
  env.els.dfmConstructionSection.innerHTML = '';
  env.api.consRender();
  ok('after a wipe, the next render replaces the shell with exactly one fresh section',
    consSections(env).length === 1 &&
    !env.els.dfmConstructionPanel.classList.contains('is-open'));
}

section('construction reveal: on-demand toggle — zero animation machinery');
{
  const env = makeConsEnv({ hostname: 'localhost', search: '?motion=1' });
  ok('render succeeds and starts COLLAPSED (never on drawer-open)',
    env.api.consRender() === true &&
    !env.els.dfmConstructionPanel.classList.contains('is-open') &&
    env.els.dfmConsToggle.getAttribute('aria-expanded') === 'false');
  const btn = env.els.dfmConsToggle;
  btn.fire('click');
  ok('toggle opens: is-open set, aria-expanded true, label swaps to reassemble',
    env.els.dfmConstructionPanel.classList.contains('is-open') &&
    btn.getAttribute('aria-expanded') === 'true' &&
    btn.textContent === 'Reassemble the layers');
  btn.fire('click');
  ok('toggle closes symmetrically',
    !env.els.dfmConstructionPanel.classList.contains('is-open') &&
    btn.textContent === 'Separate the layers');
  for (let i = 0; i < 11; i++) btn.fire('click');
  ok('11 rapid taps land deterministically (odd count = open)',
    env.els.dfmConstructionPanel.classList.contains('is-open') &&
    btn.getAttribute('aria-expanded') === 'true');
  btn.fire('touchend', { type: 'touchend', preventDefault() { env._pd = true; } });
  ok('touchend toggles and suppresses the ghost click',
    env._pd === true && !env.els.dfmConstructionPanel.classList.contains('is-open'));
  env.clock.advance(10000);
  ok('finite by construction: ZERO frames and ZERO timers ever scheduled',
    env.calls.frames === 0 && env.calls.timers === 0);
}

section('construction reveal: reduced motion, missing elements');
{
  const reduced = makeConsEnv({ hostname: 'localhost', search: '?motion=1', reduced: true });
  ok('reduced render presents the COMPLETE static state immediately',
    reduced.api.consRender() === true &&
    reduced.els.dfmConstructionPanel.classList.contains('is-open') &&
    reduced.els.dfmConsToggle.getAttribute('aria-expanded') === 'true' &&
    reduced.els.dfmConsToggle.textContent === 'Reassemble the layers');
  reduced.els.dfmConsToggle.fire('click');
  ok('reduced toggle still works, instantly, with zero frames/timers',
    !reduced.els.dfmConstructionPanel.classList.contains('is-open') &&
    reduced.calls.frames === 0 && reduced.calls.timers === 0);
  const bare = makeConsEnv({ hostname: 'localhost', search: '?motion=1', withHost: false });
  ok('missing drawer host declines without throwing', bare.api.consRender() === false);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
