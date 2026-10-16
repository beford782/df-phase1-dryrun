import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ module: { exports: {} }, Date });
vm.runInContext(readFileSync(new URL('../shoulder/model.js', import.meta.url), 'utf8'), context);
const M = context.module.exports;
const plain = value => JSON.parse(JSON.stringify(value));
let checks = 0;
function check(label, run) {
  try { run(); checks++; console.log('PASS ' + label); }
  catch (error) { console.error('FAIL ' + label + ': ' + error.message); process.exitCode = 1; }
}
const dose = { mode: 'move', seconds: 4, reps: 10, sets: 2, rest: 0, setRest: 30, labels: [] };
const plan = { id: 'agreed-1', exercise: 'er', confirmed: true, note: 'Clinician instructions', dose };
check('new and old records never activate a treatment plan', () => {
  assert.deepEqual(plain(M.newState().plan), []);
  const migrated = M.hydrate(null, { sessions: [{ date: '2026-10-15', postPain: 2, painNight: true, flags: ['er'] }] });
  assert.equal(migrated.legacy.length, 1);
  assert.equal(migrated.sessions.length, 0);
  assert.equal(migrated.plan.length, 0);
  assert.equal(migrated.current, null);
});
check('unconfirmed and malformed plan doses cannot become active', () => {
  const result = M.hydrate({ version: 3, plan: [plan, { ...plan, confirmed: false }, { ...plan, dose: { ...dose, seconds: 0 } }] });
  assert.equal(result.plan.length, 1);
  assert.equal(result.plan[0].confirmed, true);
});
check('two sets contain twenty movements and the actual set break', () => {
  const phases = M.phases(dose);
  assert.equal(phases.filter(p => p.work).length, 20);
  assert.equal(phases.filter(p => !p.work).length, 1);
  assert.equal(phases[10].seconds, 30);
  assert.equal(phases[11].set, 2);
  assert.equal(phases.reduce((sum, p) => sum + p.seconds, 0), 110);
});
check('direction cues repeat per set without losing directions', () => {
  const phases = M.phases({ ...dose, reps: 3, sets: 2, labels: ['Clockwise', 'Counterclockwise', 'Front to back'] });
  assert.deepEqual(plain(phases.filter(p => p.work).map(p => p.label)), ['Clockwise', 'Counterclockwise', 'Front to back', 'Clockwise', 'Counterclockwise', 'Front to back']);
});
check('appointment dates handle leap years and daylight-saving weekends', () => {
  assert.equal(M.validDate('2026-02-29'), false);
  assert.equal(M.validDate('2028-02-29'), true);
  assert.equal(M.validDate('2026-02-30'), false);
  assert.equal(M.daysUntil('2026-11-02', '2026-10-31'), 2);
  assert.equal(M.daysUntil('2026-10-15', '2026-10-16'), -1);
  assert.equal(M.daysUntil('invalid', '2026-10-16'), null);
});
check('pain retains valid zero but rejects strings and out-of-range values', () => {
  assert.equal(M.pain(0), 0);
  for (const value of ['0', -1, 11, 2.5, null, undefined, Infinity]) assert.equal(M.pain(value), null);
});
check('unfinished timer always restores paused', () => {
  const result = M.hydrate({ version: 3, current: { id: 'session-1', date: '2026-10-15', items: [plan], index: 0, results: [], timer: { phase: 1, left: 3, running: true } } });
  assert.equal(result.current.timer.running, false);
  assert.equal(result.current.timer.left, 3);
});
check('malformed current items never throw or become a runnable session', () => {
  for (const item of [null, 7, {}, { exercise: 'er', dose: null }]) {
    const result = M.hydrate({ version: 3, current: { id: 'bad', date: '2026-10-15', items: [item], index: 0, results: [] } });
    assert.equal(result.current, null);
  }
});
check('malformed session results are discarded or normalized before rendering', () => {
  const result = M.hydrate({ version: 3, sessions: [{ id: 'bad-result', date: '2026-10-15', results: [null, 7, {}] }] });
  for (const s of result.sessions) for (const r of s.results) {
    assert.ok(r && typeof r === 'object');
    assert.equal(typeof r.exercise, 'string');
    assert.ok(['completed', 'skipped', 'stopped', 'not attempted'].includes(r.status));
    if (r.dose) assert.equal(M.validateDose(r.dose), true);
  }
});
check('malformed legacy records cannot crash summaries', () => {
  const result = M.hydrate({ version: 3, legacy: [null, 4, { date: '2026-10-15', flags: 'broken' }] });
  for (const item of result.legacy) {
    assert.ok(item && M.validDate(item.date));
    assert.ok(Array.isArray(item.flags));
  }
});
check('imported identifiers cannot inject markup into record controls', () => {
  const bad = '\"><img src=x onerror=alert(1)>';
  const result = M.hydrate({ version: 3, plan: [{ ...plan, id: bad }], sessions: [{ id: bad, date: '2026-10-15', results: [] }] });
  assert.equal(result.plan.length, 0);
  assert.equal(result.sessions.length, 0);
});
check('corrupt timer phase and remainder are reset before resuming', () => {
  for (const timer of [{ phase: 900, left: 2 }, { phase: 0, left: 900 }, { phase: -1, left: 2 }]) {
    const result = M.hydrate({ version: 3, current: { id: 'session-1', date: '2026-10-15', items: [plan], index: 0, results: [], timer } });
    assert.equal(result.current.timer, null);
  }
});
const swSource = readFileSync(new URL('../shoulder/sw.js', import.meta.url), 'utf8');
function worker() {
  const events = {}, saved = new Map(), deleted = [], installed = [];
  const w = { events, saved, deleted, installed, failWrite: false, failNetwork: false, networkCalls: 0, claimed: false };
  const cache = {
    async match(url) { return saved.get(url); },
    async put(url, response) { if (w.failWrite) throw Error('Storage full'); saved.set(url, response); },
    async addAll(paths) { installed.push(...paths); }
  };
  const sandbox = vm.createContext({
    URL, Response,
    self: { registration: { scope: 'https://example.org/app/shoulder/' }, addEventListener(type, fn) { events[type] = fn; }, async skipWaiting() {}, clients: { async claim() { w.claimed = true; } } },
    caches: { async open() { return cache; }, async keys() { return ['unrelated-app-v1', 'shoulder-v4', 'shoulder-guide-v5', 'shoulder-guide-v6']; }, async delete(key) { deleted.push(key); return true; } },
    async fetch() { w.networkCalls++; if (w.failNetwork) throw Error('Offline'); return new Response('fresh online file'); }
  });
  vm.runInContext(swSource, sandbox);
  w.fetch = async (path, options = {}) => {
    let answer;
    events.fetch({ request: { url: new URL(path, 'https://example.org/app/shoulder/').href, method: 'GET', mode: 'same-origin', ...options }, respondWith(value) { answer = value; } });
    return answer === undefined ? undefined : await answer;
  };
  return w;
}
async function asyncCheck(label, run) {
  try { await run(); checks++; console.log('PASS ' + label); }
  catch (error) { console.error('FAIL ' + label + ': ' + error.message); process.exitCode = 1; }
}
await asyncCheck('worker activation preserves unrelated app caches', async () => {
  const w = worker(); let work;
  w.events.activate({ waitUntil(value) { work = value; } });
  await work;
  assert.deepEqual(w.deleted.sort(), ['shoulder-guide-v5', 'shoulder-v4']);
  assert.equal(w.claimed, true);
});
await asyncCheck('worker install includes every local script needed offline', async () => {
  const w = worker(); let work;
  w.events.install({ waitUntil(value) { work = value; } });
  await work;
  for (const path of ['./index.html', './model.js', './guide.js', './guide.css', './routine.js']) assert.ok(w.installed.includes(path));
});
await asyncCheck('worker ignores POST, external, outside-scope and unknown local requests', async () => {
  const w = worker();
  assert.equal(await w.fetch('guide.js', { method: 'POST' }), undefined);
  assert.equal(await w.fetch('https://other.org/guide.js'), undefined);
  assert.equal(await w.fetch('https://example.org/another-app/index.html'), undefined);
  assert.equal(await w.fetch('private-data.json'), undefined);
  assert.equal(w.networkCalls, 0);
});
await asyncCheck('worker returns cached guide assets when offline', async () => {
  const w = worker(); w.failNetwork = true;
  w.saved.set('https://example.org/app/shoulder/model.js', new Response('saved model'));
  assert.equal(await (await w.fetch('model.js')).text(), 'saved model');
});
await asyncCheck('worker serves fresh navigation before cached content and updates cache', async () => {
  const w = worker();
  w.saved.set('https://example.org/app/shoulder/index.html', new Response('old guide'));
  const result = await w.fetch('index.html', { mode: 'navigate' });
  assert.equal(await result.text(), 'fresh online file');
  assert.equal(await w.saved.get('https://example.org/app/shoulder/index.html').text(), 'fresh online file');
});
await asyncCheck('worker preserves good network responses when cache writes fail', async () => {
  const w = worker(); w.failWrite = true;
  assert.equal(await (await w.fetch('guide.js')).text(), 'fresh online file');
});
await asyncCheck('worker offline home navigation falls back to saved index', async () => {
  const w = worker(); w.failNetwork = true;
  w.saved.set('https://example.org/app/shoulder/index.html', new Response('saved home'));
  assert.equal(await (await w.fetch('./', { mode: 'navigate' })).text(), 'saved home');
});
function guideRuntime(raw = M.newState()) {
  const mainHandlers = {}, nodes = new Map(), frames = [], stored = new Map([['shoulder-guide-v3', JSON.stringify(raw)]]);
  const element = () => ({ hidden: false, textContent: '', classList: { toggle() {} }, addEventListener() {}, querySelectorAll() { return []; } });
  for (const id of ['main', 'storage-warning', 'announcement', 'network-status']) nodes.set(id, element());
  nodes.get('main').addEventListener = (type, fn) => mainHandlers[type] = fn;
  const sandbox = vm.createContext({
    Date, URL, crypto: { randomUUID: () => 'test-session' }, setTimeout, clearTimeout, setInterval, clearInterval,
    navigator: { onLine: true }, location: { hash: '#today' },
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    document: { getElementById: id => nodes.get(id) || null, querySelector: () => element(), querySelectorAll: () => [], addEventListener() {}, createElement(tag) { const node = element(); node.tagName = tag; if (tag === 'iframe') frames.push(node); return node; } },
  });
  vm.runInContext('window = globalThis; window.addEventListener = () => {};', sandbox);
  vm.runInContext(readFileSync(new URL('../shoulder/model.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(readFileSync(new URL('../shoulder/routine.js', import.meta.url), 'utf8'), sandbox);
  let source = readFileSync(new URL('../shoulder/guide.js', import.meta.url), 'utf8');
  // Expose real closure functions in the test VM; replace only the initial DOM render.
  source = source.replace(/  render\(\);\s*\}\)\(\);\s*$/, '  window.testGuide={notesView,sessionView,finishView,followView,demoView,todayView,summaryText,getState:()=>state};\n})();');
  vm.runInContext(source, sandbox);
  return { api: sandbox.testGuide, data: sandbox.SHOULDER_GUIDE, mainHandlers, frames, stored };
}
check('nine exercises have unique, valid video metadata', () => {
  const g = guideRuntime();
  assert.equal(g.data.exercises.length, 9);
  assert.equal(new Set(g.data.exercises.map(e => e.id)).size, 9);
  for (const e of g.data.exercises) {
    assert.match(e.demo.video, /^[a-zA-Z0-9_-]{11}$/);
    for (const key of ['title', 'provider', 'caption']) assert.ok(e.demo[key].length > 0);
  }
});
check('actual overview and demo renderers do not load an iframe before play', () => {
  const g = guideRuntime();
  assert.doesNotMatch(g.api.todayView(), /<iframe/i);
  for (const e of g.data.exercises) {
    const html = g.api.demoView(e.id);
    assert.doesNotMatch(html, /<iframe/i);
    assert.match(html, /data-action="play-demo"/);
    assert.ok(html.includes('https://www.youtube.com/watch?v=' + e.demo.video));
  }
  assert.equal(g.frames.length, 0);
});
await asyncCheck('actual play handler creates only the selected privacy-enhanced video', async () => {
  const g = guideRuntime(); let inserted;
  const button = { dataset: { action: 'play-demo', exercise: 'pendulum' }, closest() { return { replaceChildren(frame) { inserted = frame; } }; } };
  await g.mainHandlers.click({ target: { closest() { return button; } } });
  assert.equal(g.frames.length, 1);
  assert.equal(inserted, g.frames[0]);
  assert.match(inserted.src, /^https:\/\/www\.youtube-nocookie\.com\/embed\/QF_ubbr_RUE\?/);
  assert.match(inserted.title, /Pendulum/);
});
check('actual note page contains exactly one writing box including follow-up route', () => {
  const g = guideRuntime();
  for (const html of [g.api.notesView(), g.api.followView()]) {
    assert.equal((html.match(/<textarea\b/g) || []).length, 1);
    assert.match(html, /id="pt-note"/);
  }
});
check('exercise and finish screens contain no extra note boxes', () => {
  const raw = plain(M.newState());
  raw.current = { id: 'session-1', date: '2026-10-15', items: [plan], index: 0, results: [], itemNote: 'Older exercise note', note: 'Older session note', timer: null };
  const g = guideRuntime(raw);
  assert.doesNotMatch(g.api.sessionView(), /<textarea\b/);
  assert.doesNotMatch(g.api.finishView(), /<textarea\b/);
});
check('existing daily, session, exercise, follow-up and general notes remain in summary', () => {
  const raw = plain(M.newState());
  raw.questions = 'General questions kept';
  raw.days = { '2026-10-15': { pain: 2, sleep: 'yes', note: 'Daily note kept' } };
  raw.sessions = [{ id: 'session-1', date: '2026-10-15', note: 'Session note kept', followNote: 'Follow-up note kept', results: [{ exercise: 'er', status: 'stopped', note: 'Exercise note kept', dose }] }];
  const g = guideRuntime(raw), summary = g.api.summaryText();
  for (const note of ['General questions kept', 'Daily note kept', 'Session note kept', 'Follow-up note kept', 'Exercise note kept']) assert.ok(summary.includes(note), note);
  assert.equal(g.api.getState().sessions[0].results[0].status, 'stopped');
});
console.log(`${checks} model, offline and renderer checks passed${process.exitCode ? '; failures above require repair' : ''}.`);
