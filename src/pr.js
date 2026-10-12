// PR check: does the head (PR) build render the same UI as the base build?
//
//   for every page × state in the config:
//     base: render the fixtures {i} = 1..runs  -> calibrate a schema (run 0 is the reference render)
//     head: render fixture 1                   -> check against the schema
//   findings carry element boxes in both renders -> annotated screenshots + before/after crops,
//   report.html, comment.md (for the PR) and summary.json; exit code 1 on errors.
//
// Base and head are rendered the same way: frozen clock, pinned Math.random, scroll 0, full-page
// screenshot (whose coordinates match the extracted element boxes, fixed elements included), and
// extraction repeated until two consecutive snapshots agree.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { newStablePage, trackNetwork, settle, stableCapture, forceState, hashAssets, saveSnapshot, loadSnapshot } = require('./capture.js');
const { build, elKids } = require('./canon.js');
const { calibrate, check, digest, boxOf } = require('./fingerprint.js');
const { moved } = require('./shift.js');
const { colorHint } = require('./perceive.js');
const { focusLost } = require('./focus.js');

const sha1 = (buf) => (buf ? crypto.createHash('sha1').update(buf).digest('hex') : null);
const { annotate, beforeAfter, pixelsDiffer, read } = require('./annotate.js');
const { ghosts } = require('./ghost.js');
const { ariaChanges } = require('./a11y.js');
const { confusable } = require('./palette.js');
const { listControls, markControl } = require('./explore.js');
const { styleRules, pageSheets, cssEdits, applyUndo, subjectSelector, applicable, overridden } = require('./attribute.js');
const { trees, collapsed, drifted, split, hoverLost, stateEffects, statesLost } = require('./loss.js');

// pseudoStates: forced :hover / :focus(-visible) / :active renders of every page (styles a static
// render never shows); also any other pseudo-class Chromium can force, e.g. 'disabled',
// 'user-invalid', 'checked', 'open'. media: extra renders with emulated media, e.g. { name: 'dark', colorScheme:
// 'dark' }, { name: 'print', media: 'print' }, { name: 'motion', reducedMotion: 'no-preference' } (renders
// otherwise prefer reduced motion), { name: 'high-contrast', forcedColors: 'active' }. viewports may
// emulate devices: { name: 'phone', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }.
const DEFAULTS = { runs: 6, viewport: { width: 1280, height: 800 }, keys: 'class', concurrency: 4, freezeTime: '2026-01-15T12:00:00Z', seedRandom: 42, networkIdleMs: 150,
  pseudoStates: ['hover', 'focus'], media: [] };

// Bump when extraction or canonicalization changes what a schema means: cached base calibrations
// from an older version are then not reused.
const SCHEMA_VERSION = 9;

function loadConfig(file) {
  const c = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  c.pages = c.pages.map((p) => ({ states: {}, ...p }));
  // "model": a triage model (learn/train.py's model.json), relative to the config file
  if (c.model) c.model = path.resolve(path.dirname(file), c.model);
  return c;
}

// All (page, state, viewport) triples to check: the page as loaded plus one entry per scripted
// state, at each configured viewport (`viewports: [{ name, width, height }]`, else `viewport`).
function targets(cfg) {
  const out = [];
  const all = cfg.viewports && cfg.viewports.length ? cfg.viewports : [{ name: '', ...cfg.viewport }];
  for (const p of cfg.pages) {
    const states = [['default', []], ...Object.entries(p.states || {}).map(([name, sel]) => [name, [].concat(sel)])];
    // a page may name the viewports it is checked at (default: all of them)
    const vps = p.viewports ? all.filter((v) => p.viewports.includes(v.name)) : all;
    for (const vp of vps) {
      // a viewport may emulate a device: deviceScaleFactor, isMobile, hasTouch (capture.js newStablePage)
      const device = Object.fromEntries(['deviceScaleFactor', 'isMobile', 'hasTouch'].filter((k) => vp[k] !== undefined).map((k) => [k, vp[k]]));
      const base = { page: p.name, path: p.path, vp: all.length > 1 ? vp.name : '', viewport: { width: vp.width, height: vp.height, ...device } };
      for (const [state, actions] of states) out.push({ ...base, state, actions });
      // the page as loaded, with hover / focus / active forced, and under each emulated medium
      for (const ps of p.pseudoStates || cfg.pseudoStates || []) out.push({ ...base, state: ps, actions: [], force: ps });
      for (const m of p.media || cfg.media || []) out.push({ ...base, state: m.name, actions: [], emulate: { colorScheme: m.colorScheme, media: m.media, reducedMotion: m.reducedMotion, forcedColors: m.forcedColors } });
    }
    // quick variants (`variants: [{ name, width, height, textScale }]`): the page as loaded at another
    // width, or with text made longer (as translations make it), checked on the same fixture only.
    // Base and head render the same data, so they need no calibration: 2 base renders, not runs + 1.
    for (const v of p.variants || cfg.variants || []) {
      const vp = vps[0] || all[0];
      out.push({ page: p.name, path: p.path, vp: '', state: v.name, actions: [], quick: true, textScale: v.textScale, textSpacing: v.textSpacing,
        viewport: { width: v.width || vp.width, height: v.height || vp.height } });
    }
  }
  return cfg.quick ? out.map((t) => ({ ...t, quick: true })) : out;
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tid = (t) => `${slug(t.page)}${t.state === 'default' ? '' : '--' + slug(t.state)}${t.vp ? '@' + slug(t.vp) : ''}`;

// o.after(page, snap): runs on the captured page, still in its state (attribution); its result is returned
// as extra. o.shot === false: a compared render without the screenshot.
async function render(browser, cfg, baseUrl, t, i, withScreenshot, inspect, o = {}) {
  const shoot = withScreenshot && o.shot !== false;
  const { ctx, page } = await newStablePage(browser, { ...(t.viewport || cfg.viewport), freezeTime: cfg.freezeTime ? Date.parse(cfg.freezeTime) : null, seed: cfg.seedRandom });
  // CSS coverage (opt-in): which style rules this render used, from load to capture
  let ru = null;
  const sheets = new Set();
  if (shoot && cfg.coverage && !inspect) {
    ru = await page.context().newCDPSession(page);
    ru.on('CSS.styleSheetAdded', (e) => sheets.add(e.header.styleSheetId));
    await ru.send('DOM.enable'); await ru.send('CSS.enable'); await ru.send('CSS.startRuleUsageTracking');
  }
  try {
    const quiet = trackNetwork(page);
    if (t.emulate) await page.emulateMedia(Object.fromEntries(Object.entries(t.emulate).filter(([, v]) => v !== undefined)));
    const url = new URL(t.path.replace(/\{i\}/g, String(i)), baseUrl).href;
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    if (resp && resp.status() >= 400) throw new Error(`HTTP ${resp.status()} for ${url}`);
    await quiet(cfg.networkIdleMs);
    // actions, in order: a selector to click; 'hover:<selector>' moves the mouse over an element (JS
    // hover handlers run); 'right:<selector>' right-clicks (context menus); { fill: <selector>, value }
    // types into a field; '@hover' / '@focus' / ... forces that pseudo-class once the rest is done
    let force = t.force;
    for (const a of t.actions) {
      if (typeof a === 'string' && a.startsWith('@')) { force = a.slice(1); continue; }
      const m = typeof a === 'string' && /^(hover|right):/.exec(a), kind = typeof a !== 'string' ? (a.fill ? 'fill' : 'pick') : m ? m[1] : 'click';
      // pick: a control found by its identity (explore.js), clicked like any other
      const sel = kind === 'fill' ? a.fill : kind === 'pick' ? await markControl(page, a.pick) : m ? a.slice(m[0].length) : a;
      const run = kind === 'hover' ? page.hover(sel, { timeout: 10000 }) : kind === 'fill' ? page.fill(sel, String(a.value), { timeout: 10000 })
        : page.click(sel, { timeout: 10000, button: kind === 'right' ? 'right' : 'left' });
      await run.catch((e) => { throw new Error(`could not ${kind === 'right' ? 'right-click' : kind} ${JSON.stringify(kind === 'pick' ? a.pick.split('|').pop() : sel)}: ${/Timeout/.test(e.message) ? 'no such element within 10 s' : e.message.split('\n')[0]}`); });
      if (kind === 'pick') await page.evaluate(() => { for (const x of document.querySelectorAll('[data-uihash-pick]')) x.removeAttribute('data-uihash-pick'); });
      await quiet(cfg.networkIdleMs);
    }
    await settle(page);
    if (inspect) return await inspect(page);
    // layout shifts while the page loaded (Layout Instability API; shifts right after input excluded)
    const shifts = withScreenshot ? await page.evaluate(() => new Promise((done) => {
      const out = [], name = (n) => (n && n.nodeType === 1 ? n.tagName.toLowerCase() + (n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : '') : '');
      try {
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) out.push({ v: e.value, src: (e.sources || []).map((x) => [name(x.node), Math.round(x.currentRect.y - x.previousRect.y)]) }); })
          .observe({ type: 'layout-shift', buffered: true });
      } catch (e) { /* not supported */ }
      setTimeout(() => done(out), 50);
    })).catch(() => null) : null;
    // longer text (pseudo-localization): every run of words grows by the factor, padded with its own
    // words so it still wraps like text; short strings grow more, as they do in translation (twice
    // the extra up to 20 characters, 2.5 times up to 10); numbers are left alone
    if (t.textScale) await page.evaluate((k) => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), nodes = [];
      while (w.nextNode()) nodes.push(w.currentNode);
      for (const n of nodes) {
        if (!n.parentElement || /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/.test(n.parentElement.tagName)) continue;
        const core = n.data.trim();
        if (!/[A-Za-z]{2}/.test(core)) continue;
        const extra = Math.ceil(core.length * (k - 1) * (core.length <= 10 ? 2.5 : core.length <= 20 ? 2 : 1));
        let pad = '';
        while (pad.length < extra) pad += ' ' + core;
        n.data = n.data.replace(core, core + pad.slice(0, extra).replace(/\s+$/, ''));
      }
    }, t.textScale);
    // the text spacing users may set (WCAG 1.4.12): content must not be cut off or overlap
    if (t.textSpacing) {
      await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important } p { margin-bottom: 2em !important }' });
      await settle(page);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    let forced = null;
    if (force) forced = await forceState(page, force);
    // Boxes are document coordinates at scroll 0 and the full-page screenshot draws fixed elements at
    // their scroll-0 position too, so the two line up without resizing the viewport (resizing would
    // change what 100vh computes to, i.e. feed content height back into the styles being compared).
    // The screenshot is taken right after the extraction, with no change in between.
    // the screenshotted renders (base reference, head) are the ones compared element by element
    const { raw, png } = await stableCapture(page, { screenshot: shoot, extractOpts: { occlusion: withScreenshot } });
    const snap = await hashAssets(page, JSON.parse(raw));
    if (shifts) snap.shifts = shifts;
    if (ru) {
      // the usage list has only the rules that were used: every rule comes from the sheets' text
      const { ruleUsage } = await ru.send('CSS.stopRuleUsageTracking').catch(() => ({ ruleUsage: [] }));
      const rules = new Map();
      for (const id of sheets) {
        const text = await ru.send('CSS.getStyleSheetText', { styleSheetId: id }).then((r) => r.text, () => '');
        const used = ruleUsage.filter((u) => u.styleSheetId === id);
        for (const [a, b, at] of styleRules(text)) {
          const body = ((at ? at + ' { ' : '') + text.slice(a, b)).replace(/\s+/g, ' ').trim();   // with its @media context
          const k = crypto.createHash('sha1').update(body).digest('hex').slice(0, 12), r = rules.get(k) || [k, 0, body.slice(0, 90)];
          if (used.some((u) => u.startOffset >= a - 1 && u.startOffset < b)) r[1] = 1;
          rules.set(k, r);
        }
      }
      snap.rules = [...rules.values()];                     // [hash of the rule's text, used, the start of its text]
      await ru.detach().catch(() => {});
    }
    // the accessibility tree of the renders that are compared (a11y.js)
    if (withScreenshot) snap.aria = await page.locator('body').ariaSnapshot({ timeout: 5000 }).catch(() => null);
    const extra = o.after ? await o.after(page, snap) : undefined;
    if (forced) await forced.cdp.detach().catch(() => {});
    return { snap, png, url, extra };
  } finally { await ctx.close(); }
}

// Widths a PR's media-query changes apply to. Media blocks (condition + rule hash) of the base and head
// renders of a page are compared; for each condition whose blocks differ, one width inside its range
// (the edge, where a breakpoint bites) unless a configured viewport of the page already lies inside it.
const PX = (v, u) => (u === 'em' || u === 'rem' ? v * 16 : v);
function mediaRange(text) {
  let lo = 0, hi = Infinity;
  const num = '([\\d.]+)(px|em|rem)';
  for (const m of text.matchAll(new RegExp(`(min|max)-width:\\s*${num}`, 'g'))) { const v = PX(+m[2], m[3]); if (m[1] === 'min') lo = Math.max(lo, v); else hi = Math.min(hi, v); }
  for (const m of text.matchAll(new RegExp(`width\\s*(<=|<|>=|>)\\s*${num}`, 'g'))) { const v = PX(+m[2], m[3]); if (m[1] === '<=') hi = Math.min(hi, v); else if (m[1] === '<') hi = Math.min(hi, v - 1); else if (m[1] === '>=') lo = Math.max(lo, v); else lo = Math.max(lo, v + 1); }
  if (/\bnot\b|,/.test(text) || (lo === 0 && hi === Infinity) || lo > hi) return null;    // negations and lists: not attempted
  return [lo, hi];
}
function changedWidths(baseMedia = [], headMedia = [], configured = []) {
  const bag = (list) => { const m = new Map(); for (const [t, h] of list) m.set(t, [...(m.get(t) || []), h].sort()); return m; };
  const A = bag(baseMedia), B = bag(headMedia), out = new Set();
  for (const t of new Set([...A.keys(), ...B.keys()])) {
    if (JSON.stringify(A.get(t) || []) === JSON.stringify(B.get(t) || [])) continue;
    const r = mediaRange(t);
    if (!r || configured.some((w) => w >= r[0] && w <= r[1])) continue;
    const w = Math.round(Math.max(320, Math.min(2560, r[1] !== Infinity ? r[1] : r[0])));
    if (w >= r[0] && w <= r[1]) out.add(w);
  }
  return [...out].sort((a, b) => a - b).slice(0, 4);
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) { const k = next++; out[k] = await fn(items[k], k); } }));
  return out;
}

// The checks of one target: the head snapshot against the base calibration (schema) and against the
// base reference render of the same fixture (ref; probe: the base rendered again). png is the head
// screenshot; null when a snapshot is checked again without one (attribution), which leaves out the
// checks that need pixels. Every finding carries atoms: the elementary changes it reports (a property
// of an element, a relation that broke), so that a change can be followed into another check of the
// same target (null: a finding attribution cannot re-check).
const atomOf = (c) => (/^[a-z-]+: /.test(c) ? c.slice(0, c.indexOf(':')) : c);
function checkTarget({ t, id, schema, ref, refPng, probe, snap, png, cfg, results = [], log = () => {} }) {
  const res = schema.quick ? { pass: true, ok: true, findings: [], errors: 0, warnings: 0 } : check(snap, schema);
  for (const f of res.findings) f.atoms = f.details && f.details.length ? f.details.flatMap((d) => (d.changes.length ? d.changes : ['']).map((c) => `${f.type}|${d.path || f.path}|${atomOf(c)}`)) : [`${f.type}|${f.path}`];
  const add = (f) => { res.findings.push(f); res.errors++; res.ok = false; res.pass = false; };
  const same = schema.quick ? undefined : digest(snap, schema) === digest(ref, schema);
  const styleBoxes = res.findings.flatMap((f) => f.head || []);     // what the fingerprint itself reported
  // Pixel hashes: base and head render the same fixture, so identical screenshots mean nothing
  // visible changed in this state. Different screenshots with a passing check mean a change the
  // fingerprint learned to treat as data (a state that now looks like another, a colour or
  // position computed from data): see "same data" below.
  const refHash = sha1(refPng), pixSame = png ? refHash === sha1(png) : false;
  // content that moved because of the changes: same fixture on both sides, so any element that kept
  // its identity but not its box was pushed by a change
  // (a quick target has no fingerprint, so the walk also runs on identical pixels: a style change
  // that draws nothing here is still a change)
  const shift = res.pass && pixSame && !schema.quick ? null : moved(ref, snap, { ...schema.opts, stateClasses: schema.stateClasses, boxOf, rawText: true });
  // text that met WCAG AA contrast in the base and does not in the PR: one finding for the page state
  if (shift && shift.contrast.length) {
    const c = shift.contrast, worst = c.reduce((m, x) => (x.to < m.to ? x : m));
    add({ type: 'contrast', severity: 'error', path: 'text contrast (WCAG 2 AA)', paths: ['text contrast (WCAG 2 AA)'],
      head: c.map((x) => x.head).filter(Boolean), base: c.map((x) => x.base).filter(Boolean), atoms: c.map((x) => `contrast|${x.uid}`),
      details: [{ path: '', changes: [`contrast below WCAG AA on ${c.length} text element${c.length > 1 ? 's' : ''}: ${worst.from.toFixed(2)}:1 → ${worst.to.toFixed(2)}:1, needs ${worst.min}:1 (${worst.color} on ${worst.bg})`] }] });
  }
  // layout relations the change broke: content cut off, siblings overlapping, page wider than the viewport
  const LAYOUT = { clipped: 'content now cut off', scrolls: 'content now scrolls inside its box', overlap: 'elements now overlap', protrudes: 'now wider than the viewport (horizontal scrolling)',
    covered: 'now covered by another element', misaligned: 'no longer lined up with its neighbours', offscreen: 'now cut off by the window edge', image: 'image broken, blurry or cropped',
    truncated: 'text now truncated (…)' };
  for (const kind of Object.keys(LAYOUT)) {
    const items = shift ? shift.layout.filter((x) => x.kind === kind) : [];
    if (!items.length) continue;
    // an item carries one box ([x, y, w, h]) or a list of boxes (null where out of view)
    const boxes = (b) => (!b ? [] : typeof b[0] === 'number' ? [b] : b.filter(Boolean));
    add({ type: 'layout', severity: 'error', path: `layout: ${LAYOUT[kind]}`, paths: [`layout: ${LAYOUT[kind]}`],
      head: items.flatMap((x) => boxes(x.head)), base: items.flatMap((x) => boxes(x.base)), atoms: items.map((x) => `layout|${kind}|${x.uid}`),
      details: [{ path: '', changes: [`${LAYOUT[kind]}: ${items.length} case${items.length > 1 ? 's' : ''}, e.g. ${items[0].text}`] }] });
  }
  // Same data, drawn differently: elements whose own style or text differs between base and head
  // although the fixture is the same, not already part of a finding. Elements that also differ
  // between two base renders of that fixture (the probe) are noise and left out.
  if ((!pixSame || schema.quick) && shift.changed.length) {
    const noise = new Set(probe && (probe.hash !== refHash || schema.quick) ? moved(ref, probe.snap, { ...schema.opts, stateClasses: schema.stateClasses, boxOf, rawText: true }).changed.map((x) => x.key) : []);
    const near = (p, q) => p && q && p.every((v, k) => Math.abs(v - q[k]) <= 1);
    const baseBoxes = res.findings.flatMap((f) => f.base || []);   // where the fingerprint's findings were in the base (missing elements)
    // one finding per kind of element and set of changed properties: fifteen swatches that each
    // turned from their own colour to grey are one finding, with a few of the changes as examples
    const groups = new Map(), propsOf = (changes) => changes.map((c) => c.slice(0, c.indexOf(': '))).join(',');
    for (const x of shift.changed) {
      if (noise.has(x.key) || !x.changes.length || styleBoxes.some((b) => near(b, x.head)) || (x.oneSided === 'removed' && baseBoxes.some((b) => near(b, x.base)))) continue;
      const sig = x.key + '|' + propsOf(x.changes);
      if (!groups.has(sig)) groups.set(sig, { key: x.key, n: 0, head: [], base: [], changes: [], atoms: [] });
      const g = groups.get(sig); g.n++; if (x.head) g.head.push(x.head); if (x.base) g.base.push(x.base);
      for (const c of x.changes) { if (!g.changes.includes(c)) g.changes.push(c); g.atoms.push(`same|${x.uid}|${x.oneSided || atomOf(c)}`); }
    }
    for (const g of groups.values()) {
      const more = g.changes.length - 4, changes = more > 0 ? [...g.changes.slice(0, 4), `… and ${more} more like these`] : g.changes;
      add({ type: 'same-data', severity: 'error', path: `${g.key} (same data, drawn differently)`, paths: [g.key], head: g.head, base: g.base, atoms: g.atoms,
        details: [{ path: g.key, changes }] });
    }
    if (noise.size && png) log(`${id}: ${noise.size} element(s) differ between two base renders of the same fixture; not compared`);
  }
  // invisible but still clickable (ghost.js): no pixel shows it, so every state is checked
  const gh = ghosts(ref, snap, { ignore: new Set(probe ? ghosts(ref, probe.snap).map((g) => g.key) : []) });
  if (gh.length) {
    const g0 = gh[0];
    add({ type: 'layout', severity: 'error', path: 'layout: invisible but still takes clicks', paths: gh.map((g) => g.key), head: gh.map((g) => g.head), base: gh.map((g) => g.base).filter(Boolean),
      atoms: gh.map((g) => `ghost|${g.key}`), details: [{ path: '', changes: [`invisible but still takes clicks: ${gh.length} element${gh.length > 1 ? 's' : ''}, e.g. ${g0.label} (opacity 0, in the base: ${g0.was})`] }] });
  }
  // categorical colours (legend swatches, series) newly hard to tell apart (palette.js)
  if (!pixSame && cfg.palette !== false) {
    const pc = confusable(ref, snap);
    if (pc.length) {
      add({ type: 'palette', severity: 'error', path: 'colours now hard to tell apart', paths: [...new Set(pc.map((x) => x.set))],
        head: pc.flatMap((x) => x.boxes), base: [], atoms: pc.map((x) => `palette|${x.set}|${x.prop}|${[x.a, x.b].sort()}`),
        details: [{ path: '', changes: pc.slice(0, 4).map((x) => `${x.set} (${x.prop}): ${x.a} and ${x.b} now look alike${x.view === 'normal vision' ? '' : ` to people with ${x.view}`}: ΔE00 ${x.from.toFixed(1)} → ${x.to.toFixed(1)}`) }] });
      if (pc.length > 4) res.findings[res.findings.length - 1].details[0].changes.push(`… and ${pc.length - 4} more pairs`);
    }
  }
  // web fonts that loaded in the base and fail in the head (a file that is not deployed, a wrong path)
  const fontsLost = (snap.fontErrors || []).filter((f) => !(ref.fontErrors || []).includes(f) && !(probe && (probe.snap.fontErrors || []).includes(f)));
  if (fontsLost.length) {
    add({ type: 'resource', severity: 'error', path: 'web fonts', paths: ['web fonts'], head: [], base: [], atoms: fontsLost.map((f) => `font|${f}`),
      details: [{ path: '', changes: fontsLost.map((f) => `web font "${f}" failed to load; text falls back to another font`) }] });
  }
  // the page now shifts while it loads: the final frame can be the same (layout-shift score, as CLS)
  // reported: elements that moved 3px or more (Chrome's own minimum) in the head and in neither
  // base render, when the score rose
  const cls = (sn) => (sn && sn.shifts ? sn.shifts.reduce((a, e) => a + e.v, 0) : null);
  const movers = (sn) => new Set(sn && sn.shifts ? sn.shifts.flatMap((e) => e.src.filter((x) => x[0] && Math.abs(x[1]) >= 3).map((x) => x[0])) : []);
  const cb = cls(ref), ch = cls(snap), cp = probe ? cls(probe.snap) : cb, num = (v) => v.toFixed(v && v < 0.01 ? 3 : 2);
  const known = new Set([...movers(ref), ...(probe ? movers(probe.snap) : [])]), fresh = [...movers(snap)].filter((k) => !known.has(k));
  if (cb !== null && ch !== null && ch - Math.max(cb, cp === null ? cb : cp) > 0.001 && fresh.length) {
    const who = [...new Set(snap.shifts.flatMap((e) => e.src.filter((x) => fresh.includes(x[0])).map((x) => `${x[0]} (${x[1] > 0 ? '+' : ''}${x[1]}px)`)))].slice(0, 4);
    add({ type: 'layout', severity: 'error', path: 'layout: now shifts while loading', paths: ['layout: now shifts while loading'], head: [], base: [], atoms: null,
      details: [{ path: '', changes: [`now shifts while loading: layout shift ${num(Math.max(cb, cp === null ? cb : cp))} → ${num(ch)}${who.length ? `; moved: ${who.join(', ')}` : ''}`] }] });
  }
  // an explored control that changed the page in the base (pixels or URL) and does nothing in the head
  if (t.clickOf && png) {
    const r0 = results.find((r) => r.id === t.clickOf && r.res);
    if (r0) {
      const did = (before, after, u0, u1) => sha1(before) !== sha1(after) || u0 !== u1;
      const probeDid = !probe || probe.hash !== sha1(r0.refPng) || probe.snap.url !== r0.ref.url;
      if (probeDid && did(r0.refPng, refPng, r0.ref.url, ref.url) && !did(r0.head.png, png, r0.head.snap.url, snap.url)) {
        add({ type: 'behaviour', severity: 'error', path: t.state, paths: [t.state], head: [], base: [], atoms: null,
          details: [{ path: '', changes: [`${t.state.replace(/^click \d+: /, '"')}" no longer does anything when clicked (in the base it ${ref.url !== r0.ref.url ? 'went to ' + ref.url.split('/').pop() : 'changed the page'})`] }] });
      }
    }
  }
  // what the change took away (loss.js): things that looked different and now look the same, one
  // instance of a kind drifting from the others, siblings that matched and no longer do
  if (!pixSame) {
    const { A, B } = trees(ref, snap, { ...schema.opts, stateClasses: schema.stateClasses });
    const col = collapsed(A, B, boxOf), dr = drifted(A, B, boxOf), sp = split(A, B, boxOf);
    if (col.length) add({ type: 'loss', severity: 'error', path: 'no longer told apart', paths: col.map((x) => x.kind), head: col.flatMap((x) => x.head), base: col.flatMap((x) => x.base),
      atoms: col.map((x) => `collapse|${x.kind}|${x.what}`), details: [{ path: '', changes: col.slice(0, 4).map((x) => `no longer told apart: ${x.text}`) }] });
    if (dr.length) add({ type: 'drift', severity: 'error', path: 'only some instances changed', paths: dr.map((x) => x.kind), head: dr.flatMap((x) => x.head), base: dr.flatMap((x) => x.base),
      atoms: dr.map((x) => `drift|${x.kind}`), details: [{ path: '', changes: dr.slice(0, 4).map((x) => x.text) }] });
    if (sp.length) add({ type: 'drift', severity: 'error', path: 'no longer matches its siblings', paths: sp.map((x) => x.uid), head: sp.flatMap((x) => x.head), base: sp.flatMap((x) => x.base),
      atoms: sp.map((x) => `split|${x.uid}|${x.what}`), details: [{ path: '', changes: sp.slice(0, 4).map((x) => x.text) }] });
  }
  // what screen readers announce (a11y.js): same fixture, so a different tree is the PR's
  const ax = cfg.a11y === false ? [] : ariaChanges(ref.aria, snap.aria, probe && probe.snap.aria);
  if (ax.length) {
    add({ type: 'a11y', severity: 'error', path: 'accessibility tree', paths: ['accessibility tree'], head: [], base: [], atoms: ax.map((l) => `a11y|${l}`),
      details: [{ path: '', changes: ax.length > 6 ? [...ax.slice(0, 6), `… and ${ax.length - 6} more`] : ax }] });
  }
  return { res, same, shift, pixSame };
}

// Which edit of the PR's CSS causes each finding of a target (attribute.js). The base and the head are
// rendered once more in the target's state; in the head page the CSS edits are undone, all at once and
// then one at a time, and the snapshot is checked again each time. A finding whose atoms go away
// when every edit is undone comes from the CSS; one that stays comes from markup, scripts or data.
// Sets f.cause = { css: 'all' | 'some' | 'none' | null (not seen again), edits: [edit ids that
// remove some of its atoms], reach: { id: how that edit gets to the finding's elements } } where reach
// is 'selected' (the edited rule selects the element), 'inside' (it selects an ancestor), 'token' (the
// edit redefines a custom property the element's styles use), 'elsewhere', or 'unknown' (the elements
// are not in the head render); and r.edits.
async function attributeTarget(browser, cfg, baseUrl, headUrl, r, results) {
  const sheetsOf = async (page) => { const states = await stateEffects(page); const { cdp, list } = await pageSheets(page); await cdp.detach().catch(() => {}); return { list, doc: page.url(), states }; };
  const b = await render(browser, cfg, baseUrl, r.t, 1, true, null, { shot: false, after: sheetsOf });
  let states = null;
  const h = await render(browser, cfg, headUrl, r.t, 1, true, null, { shot: false, after: async (page) => {
    states = await stateEffects(page);
    const { cdp, list } = await pageSheets(page);
    try {
      const { edits, all } = cssEdits(b.extra.list, list, b.extra.doc, page.url());
      if (!all.length) return { edits };
      const ok = await applicable(page, edits);
      const tried = edits.filter((e, k) => ok[k] || e.kind === 'sheet-removed').slice(0, cfg.attributeMax || 24);
      // marks: the elements each edited rule selects, then those of the rules its !important beats
      const over = [...overridden(edits, list, b.extra.list)].flatMap(([id, hits]) => hits.map((x) => ({ id, ...x })));
      const match = [...edits.map((e) => subjectSelector(e.sel) || ':not(*)'), ...over.map((x) => subjectSelector(x.sel) || ':not(*)')];
      const cap = async () => {
        const { raw } = await stableCapture(page, { screenshot: false, extractOpts: { occlusion: true, match } });
        const s = await hashAssets(page, JSON.parse(raw));
        s.aria = await page.locator('body').ariaSnapshot({ timeout: 5000 }).catch(() => null);
        return s;
      };
      const again = await cap();
      let restore = await applyUndo(cdp, page, all);
      const none = await cap(); await restore();
      const each = [];
      for (const e of tried) { restore = await applyUndo(cdp, page, [e.undo]); each.push([e.id, await cap()]); await restore(); }
      return { edits, over, tried: tried.map((e) => e.id), again, none, each };
    } finally { await cdp.detach().catch(() => {}); }
  } });
  // states that showed in the base and no longer do (loss.js), from the same two renders
  const sl = statesLost(b.extra.states, states);
  if (sl.length) {
    r.res.findings.push({ type: 'loss', severity: 'error', path: 'states no longer shown', paths: sl.map((x) => x.key), head: [], base: [], atoms: null,
      details: [{ path: '', changes: sl.slice(0, 4).map((x) => `${x.label} looks the same with and without its "${x.cls}" class (it did not in the base)`) }] });
    r.res.errors++; r.res.ok = false; r.res.pass = false; r.status = 'changed';
  }
  const { edits, over = [], again, none, each = [] } = h.extra || {};
  if (!edits) return;
  r.edits = edits.map(({ id, kind, sheet, at, sel, what, tokens }) => ({ id, kind, sheet, at, sel, what, tokens }));
  if (!again) { for (const f of r.res.findings) if (f.atoms) f.cause = { css: 'none', edits: [], reach: {} }; return; }   // the PR changed no CSS
  const ctx = { t: r.t, id: r.id, schema: r.schema, ref: r.ref, refPng: r.refPng, probe: r.probe, png: null, cfg, results };
  const atomsIn = (snap) => new Set(checkTarget({ ...ctx, snap }).res.findings.flatMap((f) => f.atoms || []));
  const A0 = atomsIn(again), A1 = atomsIn(none), per = each.map(([id, s]) => [id, atomsIn(s)]);
  // the elements each edited rule selects, marked in the re-render (raw.mt), by element and by group path
  const own = new Map(), anc = new Map(), byPath = new Map();
  (function walk(n, up) {
    const mine = new Set((n.raw && n.raw.mt) || []);
    own.set(n.uid || n.key, mine); anc.set(n.uid || n.key, up);
    if (!byPath.has(n.path)) byPath.set(n.path, []);
    byPath.get(n.path).push(n.uid || n.key);
    const down = new Set([...up, ...mine]);
    for (const k of elKids(n)) walk(k, down);
  })(build(again, { ...r.schema.opts, stateClasses: r.schema.stateClasses }), new Set());
  const uidsOf = (atom) => {
    const [kind, a, b] = atom.split('|');
    if (kind === 'same' || kind === 'contrast') return [a];
    if (kind === 'layout') return b.split(' + ');
    if (kind === 'split') return [a];
    if (['ghost', 'palette', 'font', 'a11y', 'collapse', 'drift'].includes(kind)) return [];
    return byPath.get(a.replace(/\[(\*|-?\d+)\]/g, '')) || [];          // fingerprint findings: a group path (with positions)
  };
  // a rule the edit's !important beats on one of the finding's elements (marks after the edits')
  const beaten = (f, k) => {
    const uids = f.atoms.flatMap(uidsOf);
    return [...new Set(over.filter((x, j) => x.id === k && uids.some((u) => own.has(u) && own.get(u).has(edits.length + j))).map((x) => x.sel))];
  };
  const reachOf = (f, k) => {
    const uids = f.atoms.flatMap(uidsOf).filter((u) => own.has(u));
    if (!uids.length) return 'unknown';                                // elements not in the head render (removed, hidden)
    if (uids.some((u) => own.get(u).has(k))) return 'selected';
    // an edit that only redefines custom properties reaches other elements through them (they inherit
    // from :root down, so "inside" says nothing)
    const tokenOnly = edits[k].tokens.length && edits[k].tokens.length === edits[k].what.length;
    if (!tokenOnly && uids.some((u) => anc.get(u).has(k))) return 'inside';
    return edits[k].tokens.length ? 'token' : 'elsewhere';
  };
  for (const f of r.res.findings) {
    if (!f.atoms) continue;
    const here = f.atoms.filter((a) => A0.has(a));
    if (!here.length) { f.cause = { css: null, edits: [], reach: {} }; continue; }
    const fromCss = here.filter((a) => !A1.has(a)).length;
    const by = per.filter(([, s]) => here.some((a) => !s.has(a))).map(([id]) => id);
    const beats = Object.fromEntries(by.map((k) => [k, beaten(f, k)]).filter(([, l]) => l.length));
    f.cause = { css: fromCss === here.length ? 'all' : fromCss ? 'some' : 'none', edits: by, reach: Object.fromEntries(by.map((k) => [k, reachOf(f, k)])), ...(Object.keys(beats).length ? { beats } : {}) };
  }
}

async function runPR({ baseUrl, headUrl, config, outDir, cacheDir, cacheKey, imageBaseUrl, keepImages = false, log = () => {} }) {
  const cfg = typeof config === 'string' ? loadConfig(config) : { ...DEFAULTS, ...config };
  const T = targets(cfg);
  fs.mkdirSync(outDir, { recursive: true });
  const t0 = Date.now();
  const browser = await chromium.launch();
  const results = [];
  try {
    // 1. base: calibrate every target (cached per base build when a cache key is given)
    const cfgHash = crypto.createHash('sha1').update(JSON.stringify({ SCHEMA_VERSION, T, runs: cfg.runs, viewport: cfg.viewport, keys: cfg.keys, freezeTime: cfg.freezeTime, seedRandom: cfg.seedRandom, coverage: !!cfg.coverage })).digest('hex').slice(0, 10);
    const baseJobs = [];
    const cached = {};
    for (const t of T) {
      const cdir = cacheDir && cacheKey ? path.join(cacheDir, `${cacheKey}-${cfgHash}`, tid(t)) : null;
      if (cdir && fs.existsSync(path.join(cdir, 'schema.json'))) {
        const probe = path.join(cdir, 'probe.json.gz');
        cached[tid(t)] = { schema: JSON.parse(fs.readFileSync(path.join(cdir, 'schema.json'))), snap: loadSnapshot(path.join(cdir, 'ref.json.gz')), png: fs.readFileSync(path.join(cdir, 'ref.png')), cdir,
          probe: fs.existsSync(probe) ? { snap: loadSnapshot(probe), hash: fs.readFileSync(path.join(cdir, 'probe.sha1'), 'utf8') } : null };
      } else {
        for (let i = 1; i <= (t.quick ? 1 : cfg.runs); i++) baseJobs.push({ t, i, cdir });
        baseJobs.push({ t, i: 1, cdir, probe: true });     // the reference fixture again: how reproducible the base is
      }
    }
    // a page or state that fails to render is reported, not fatal: on the base side it is new in this
    // PR (no baseline), on the head side it is broken (a selector that no longer exists, an HTTP error)
    const safe = (p) => p.then((r) => r, (e) => ({ error: String((e && e.message) || e).split('\n')[0] }));
    const tb = Date.now();
    const baseRenders = await pool(baseJobs, cfg.concurrency, (j) => safe(render(browser, cfg, baseUrl, j.t, j.i, j.i === 1)));
    log(`base: ${baseJobs.length} renders in ${((Date.now() - tb) / 1000).toFixed(1)}s (${Object.keys(cached).length} targets from cache)`);
    const th = Date.now();
    const headRenders = await pool(T, cfg.concurrency, (t) => safe(render(browser, cfg, headUrl, t, 1, true)));
    log(`head: ${T.length} renders in ${((Date.now() - th) / 1000).toFixed(1)}s`);
    // media queries the PR changed, at widths no configured viewport covers: quick variants there
    if (cfg.mediaWidths !== false) {
      const auto = [];
      for (const [k, t] of T.entries()) {
        if (t.state !== 'default' || t.quick || headRenders[k].error) continue;
        const id = tid(t), x = baseJobs.findIndex((j) => j.t === t && j.i === 1 && !j.probe);
        const ref = cached[id] ? cached[id].snap : x >= 0 && !baseRenders[x].error ? baseRenders[x].snap : null;
        if (!ref) continue;
        const configured = T.filter((u) => u.page === t.page && !u.quick).map((u) => u.viewport.width);
        for (const w of changedWidths(ref.media, headRenders[k].snap.media, configured))
          if (!auto.some((a) => a.page === t.page && a.viewport.width === w))
            auto.push({ page: t.page, path: t.path, vp: '', state: `${w}px (media query changed)`, actions: [], quick: true, viewport: { width: w, height: t.viewport.height } });
      }
      if (auto.length) {
        const ta = Date.now(), jobs = auto.flatMap((t) => [{ t, i: 1, cdir: null }, { t, i: 1, cdir: null, probe: true }]);
        baseRenders.push(...await pool(jobs, cfg.concurrency, (j) => safe(render(browser, cfg, baseUrl, j.t, j.i, true))));
        baseJobs.push(...jobs);
        headRenders.push(...await pool(auto, cfg.concurrency, (t) => safe(render(browser, cfg, headUrl, t, 1, true))));
        T.push(...auto);
        log(`media queries changed: quick variants at ${auto.map((a) => a.viewport.width + 'px').join(', ')} (${jobs.length + auto.length} renders in ${((Date.now() - ta) / 1000).toFixed(1)}s)`);
      }
    }
    // controls nobody configured a state for (explore.js, opt-in: `explore: true` or a number of
    // controls, per page or for all): the page after clicking each, on both sides. Repeated controls
    // (the same path and label, e.g. a menu button on every row) are clicked once.
    {
      const more = [];
      for (const [k, t] of T.entries()) {
        const ex = (cfg.pages.find((p) => p.name === t.page) || {}).explore ?? cfg.explore;
        if (!ex || t.state !== 'default' || t.quick || headRenders[k].error || T.slice(0, k).some((u) => u.page === t.page && u.state === 'default')) continue;
        const [lb, lh] = await Promise.all([baseUrl, headUrl].map((u) => safe(render(browser, cfg, u, t, 1, false, listControls))));
        if (lb.error || lh.error) { log(`explore ${t.page}: ${lb.error || lh.error}`); continue; }
        const inHead = new Set(lh.map((c) => c.id)), keys = new Set();
        const picked = lb.filter((c) => { const key = c.id.replace(/#\d+$/, ''); if (!inHead.has(c.id) || keys.has(key)) return false; keys.add(key); return true; })
          .slice(0, typeof ex === 'number' ? ex : 24);
        picked.forEach((c, n) => more.push({ ...t, state: `click ${n + 1}: ${c.label || c.tag}`, actions: [...t.actions, { pick: c.id }], quick: true, clickOf: tid(t) }));
      }
      if (more.length) {
        const ta = Date.now(), jobs = more.flatMap((t) => [{ t, i: 1, cdir: null }, { t, i: 1, cdir: null, probe: true }]);
        baseRenders.push(...await pool(jobs, cfg.concurrency, (j) => safe(render(browser, cfg, baseUrl, j.t, j.i, true))));
        baseJobs.push(...jobs);
        headRenders.push(...await pool(more, cfg.concurrency, (t) => safe(render(browser, cfg, headUrl, t, 1, true))));
        T.push(...more);
        log(`explored ${more.length} controls (${jobs.length + more.length} renders in ${((Date.now() - ta) / 1000).toFixed(1)}s)`);
      }
    }

    for (const [k, t] of T.entries()) {
      const id = tid(t), head = headRenders[k];
      let schema, ref, refPng, probe;
      if (cached[id]) ({ schema, snap: ref, png: refPng, probe } = cached[id]);
      else {
        const all = baseJobs.map((j, x) => [j, baseRenders[x]]).filter(([j]) => j.t === t);
        const pr = all.find(([j]) => j.probe);
        probe = pr && !pr[1].error ? { snap: pr[1].snap, hash: sha1(pr[1].png) } : null;
        const mine = all.filter(([j]) => !j.probe).sort((a, b) => a[0].i - b[0].i).map(([, r]) => r);
        const okRuns = mine.filter((r) => !r.error);
        if (mine[0].error || (!t.quick && okRuns.length < 2)) { results.push({ t, id, head, status: head.error ? 'error' : 'new', message: head.error || (mine.find((r) => r.error) || {}).error }); continue; }
        if (okRuns.length < mine.length) log(`warning: ${id}: ${mine.length - okRuns.length} base render(s) failed, calibrated on ${okRuns.length}`);
        schema = t.quick ? { quick: true, opts: {}, stateClasses: [] } : calibrate(okRuns.map((r) => r.snap), { keyMode: cfg.keys });
        ref = mine[0].snap; refPng = mine[0].png;
        const cdir = baseJobs.find((j) => j.t === t).cdir;
        if (cdir) {
          fs.mkdirSync(cdir, { recursive: true }); fs.writeFileSync(path.join(cdir, 'schema.json'), JSON.stringify(schema)); saveSnapshot(path.join(cdir, 'ref.json.gz'), ref); fs.writeFileSync(path.join(cdir, 'ref.png'), refPng);
          if (probe) { saveSnapshot(path.join(cdir, 'probe.json.gz'), probe.snap); fs.writeFileSync(path.join(cdir, 'probe.sha1'), probe.hash); }
        }
      }
      if (head.error) { results.push({ t, id, head, status: 'error', message: head.error }); continue; }
      const { res, same, shift, pixSame } = checkTarget({ t, id, schema, ref, refPng, probe, snap: head.snap, png: head.png, cfg, results, log });
      results.push({ t, id, res, same, head, ref, refPng, shift, pixSame, schema, probe, status: res.pass ? 'same' : res.ok ? 'warnings' : 'changed' });
    }
    // focus indicators (WCAG 2.4.7): the page as loaded against its :focus-forced render, in the base
    // and in the head; a control that showed focus in the base and shows none in the head is reported
    // on the focus render, where the before/after crops show the indicator that went away
    for (const rf of results.filter((r) => r.res && r.t.force === 'focus')) {
      const r0 = results.find((r) => r.res && r.t.state === 'default' && r.t.page === rf.t.page && r.t.vp === rf.t.vp);
      if (!r0) continue;
      const lost = focusLost(r0.ref, rf.ref, r0.head.snap, rf.head.snap);
      if (!lost.length) continue;
      const pad = (b) => b && [b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8];      // the ring is drawn around the box
      const names = [...new Set(lost.map((x) => x.label))];
      rf.res.findings.push({ type: 'focus', severity: 'error', path: 'focus indicator (WCAG 2.4.7)', paths: ['focus indicator (WCAG 2.4.7)'],
        head: lost.map((x) => pad(x.head)).filter(Boolean), base: lost.map((x) => pad(x.base)).filter(Boolean),
        details: [{ path: '', changes: [`no visible focus indicator any more on ${lost.length} focusable element${lost.length > 1 ? 's' : ''} (WCAG 2.4.7 Focus Visible): ${names.slice(0, 4).join(', ')}${names.length > 4 ? ', …' : ''}; when focused it used to change ${lost[0].was.slice(0, 3).join(', ')}`] }] });
      rf.res.errors++; rf.res.ok = false; rf.res.pass = false; rf.status = 'changed';
    }

    // hover feedback the head lost (loss.js): the page as loaded against its :hover-forced render
    for (const rh of results.filter((r) => r.res && r.t.force === 'hover')) {
      const r0 = results.find((r) => r.res && r.t.state === 'default' && r.t.page === rh.t.page && r.t.vp === rh.t.vp);
      if (!r0) continue;
      const lost = hoverLost(r0.ref, rh.ref, r0.head.snap, rh.head.snap);
      if (!lost.length) continue;
      const names = [...new Set(lost.map((x) => x.label))];
      rh.res.findings.push({ type: 'loss', severity: 'error', path: 'hover feedback', paths: ['hover feedback'], atoms: null,
        head: lost.map((x) => x.head).filter(Boolean), base: lost.map((x) => x.base).filter(Boolean),
        details: [{ path: '', changes: [`hovering no longer changes ${lost.length} element${lost.length > 1 ? 's' : ''}: ${names.slice(0, 4).join(', ')}${names.length > 4 ? ', …' : ''}; in the base hover changed ${lost[0].was.slice(0, 2).join(', ')}`] }] });
      rh.res.errors++; rh.res.ok = false; rh.res.pass = false; rh.status = 'changed';
    }
    // a state that came back to the page as loaded in the base (a change undone, a menu closed again)
    // and no longer does: the base reference and probe of the state are pixel for pixel the page as loaded
    for (const r of results.filter((x) => x.res && x.t.state !== 'default' && x.t.actions.length && !x.t.force && !x.t.emulate && !x.t.clickOf && x.head.png)) {
      const r0 = results.find((x) => x.res && x.t.state === 'default' && x.t.page === r.t.page && x.t.vp === r.t.vp && x.head.png);
      if (!r0 || sha1(r.refPng) !== sha1(r0.refPng) || (r.probe && r.probe.hash !== sha1(r0.refPng)) || sha1(r.head.png) === sha1(r0.head.png)) continue;
      r.res.findings.push({ type: 'loss', severity: 'error', path: 'no longer back to the page as loaded', paths: ['no longer back to the page as loaded'], atoms: null, head: [], base: [],
        details: [{ path: '', changes: [`after "${r.t.state}" the page looked exactly as loaded in the base; in the head it does not`] }] });
      r.res.errors++; r.res.ok = false; r.res.pass = false; r.status = 'changed';
    }

    // keys of elements each target gained (added children, inserted elements): a "missing" element whose
    // key gained a class is restyled, not removed (triageOf)
    for (const r of results.filter((x) => x.res)) {
      const all = r.res.findings.flatMap((f) => (f.details || []).flatMap((d) => d.changes));
      const added = all.map((c) => (/^(?:added child|new) ([^\s:]+)/.exec(c) || [])[1]).filter(Boolean);
      const addedTexts = all.filter((c) => /^(new |added)/.test(c)).flatMap((c) => [...c.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
      for (const f of r.res.findings) { f.added = added; f.addedTexts = addedTexts; }
    }
    // which edit of the PR's CSS causes each change (attribute.js; `attribute: false` turns it off)
    // The same change seen in several states (a token change shows everywhere) is attributed once: a
    // target whose findings were all seen in a target attributed before takes their causes.
    if (cfg.attribute !== false) {
      const sigOf = (f) => [f.type, f.path, ...(f.details || []).flatMap((d) => d.changes)].join('\u0001');
      const todo = [], copy = [], seen = new Set();
      for (const r of results.filter((x) => x.res && !x.res.pass && x.res.findings.some((f) => f.atoms))) {
        const sigs = r.res.findings.filter((f) => f.atoms).map(sigOf);
        if (sigs.every((g) => seen.has(g))) copy.push(r); else { todo.push(r); for (const g of sigs) seen.add(g); }
      }
      const ta = Date.now();
      await pool(todo, cfg.concurrency, (r) => attributeTarget(browser, cfg, baseUrl, headUrl, r, results).catch((e) => log(`attribution ${r.id}: ${String(e.message || e).split('\n')[0]}`)));
      const from = new Map();
      for (const r of todo) for (const f of r.res.findings) if (f.cause && !from.has(sigOf(f))) from.set(sigOf(f), { cause: f.cause, edits: r.edits });
      for (const r of copy) for (const f of r.res.findings) {
        const src = from.get(sigOf(f));
        if (src) { f.cause = src.cause; if (!r.edits) r.edits = src.edits; }
      }
      if (todo.length) log(`attribution: ${todo.length} target(s) in ${((Date.now() - ta) / 1000).toFixed(1)}s (${copy.length} more with the same changes)`);
    }

    // 2. images + report. The same change seen in several states of a page (or on several pages: a
    // shared header) is reported in full once; later occurrences point back to the first (no crop).
    // CSS changes no checked state shows (coverage: true). A rule the head added or changed that no head
    // render used, or one it removed that no base render used, was never seen by this check: the PR
    // comment says so instead of passing silently (rule usage from CDP CSS.startRuleUsageTracking).
    if (cfg.coverage) {
      // pages usually share their stylesheets: a rule counts as seen when any checked state of any page used it
      const rs = results.filter((r) => r.res && r.ref && r.head && r.head.snap);
      const rulesOf = (list) => list.flatMap((x) => x || []);
      const baseRules = rulesOf(rs.map((r) => r.ref.rules)), headRules = rulesOf(rs.map((r) => r.head.snap.rules));
      if (baseRules.length && headRules.length) {
        const baseAll = new Set(baseRules.map((x) => x[0])), headAll = new Map(headRules.map((x) => [x[0], x]));
        const usedBase = new Set(baseRules.filter((x) => x[1]).map((x) => x[0])), usedHead = new Set(headRules.filter((x) => x[1]).map((x) => x[0]));
        const sel = (text) => text.split('{')[0].trim();
        const added = [...headAll.values()].filter((x) => !baseAll.has(x[0]) && !usedHead.has(x[0]));
        const addedSel = new Set(added.map((x) => sel(x[2])));
        const removed = [...new Map(baseRules.map((x) => [x[0], x])).values()].filter((x) => !headAll.has(x[0]) && !usedBase.has(x[0]) && !addedSel.has(sel(x[2])));
        if (added.length || removed.length) {
          const r0 = rs.find((r) => r.t.state === 'default') || rs[0];
          const changes = [...added.map((x) => `a changed rule no checked state uses: ${x[2]}`), ...removed.map((x) => `a removed rule no checked state used: ${x[2]}`)];
          r0.res.findings.push({ type: 'coverage', severity: 'warning', path: 'CSS changes no checked state shows', paths: ['CSS changes no checked state shows'], head: [], base: [],
            details: [{ path: '', changes: changes.length > 5 ? [...changes.slice(0, 5), `… and ${changes.length - 5} more`] : changes }] });
          r0.res.warnings++;
          if (r0.res.pass) { r0.res.pass = false; r0.status = 'warnings'; }
        }
      }
    }
    const pages = [], firstSeen = new Map();
    for (const r of results) {
      if (!r.res) {
        pages.push({ page: r.t.page, state: r.t.state, forced: !!r.t.force, vp: r.t.vp, id: r.id, url: r.head.url || new URL(r.t.path.replace(/\{i\}/g, '1'), headUrl).href, status: r.status, message: r.message || '', ok: r.status !== 'error', pass: r.status !== 'error', errors: r.status === 'error' ? 1 : 0, warnings: 0, findings: [] });
        continue;
      }
      const entry = { page: r.t.page, state: r.t.state, forced: !!r.t.force, vp: r.t.vp, id: r.id, url: r.head.url, status: r.status, ok: r.res.ok, pass: r.res.pass, errors: r.res.errors, warnings: r.res.warnings, digestEqual: r.same, moved: r.shift ? r.shift.count : 0, findings: [], ...(r.edits ? { edits: r.edits } : {}) };
      // the screenshots compared, for callers that want them (not written to summary.json)
      if (keepImages) Object.defineProperty(entry, 'images', { value: { base: r.refPng, head: r.head.png }, enumerable: false });
      const mv = r.shift || { base: [], head: [] };
      if (!r.res.pass) {
        const A = read(r.refPng), B = read(r.head.png);
        // errors before warnings; changes that alter pixels here before intent-only ones; within those,
        // elements that came or went before style differences (often their consequence)
        const STRUCTURAL = new Set(['missing', 'inserted', 'count', 'missing-variant']);
        const rank = (f) => (f.severity === 'error' ? 0 : 4) + (f.visible === false ? 2 : 0) + (STRUCTURAL.has(f.type) ? 0 : 1);
        // "no pixel change here" only when nothing on the page moved because of it: a 1px margin leaves
        // its own element untouched and shifts everything after it
        const LAYOUTISH = /^(margin|padding|width|height|min-|max-|top|right|bottom|left|gap|row-gap|column-gap|flex|grid|display|position|transform|translate|scale|rotate|font-size|line-height|letter-spacing|word-spacing|border-\w+-width|order|align|justify|float|zoom|white-space|text-indent|added child|removed child|reordered)/;
        const visibleOf = (f) => {
          if (r.pixSame || ['a11y', 'behaviour', 'coverage'].includes(f.type)) return false; // identical screenshots, or not drawn at all
          const v = pixelsDiffer(A, B, f.base, f.head);
          return v === false && r.shift && r.shift.count && (f.details || []).some((d) => d.changes.some((c) => LAYOUTISH.test(c))) ? null : v;
        };
        const findings = r.res.findings.map((f, x) => ({ ...f, x, visible: visibleOf(f) }))
          .sort((a, b) => rank(a) - rank(b) || a.x - b.x).map((f, x) => ({ ...f, n: x + 1 }));
        fs.writeFileSync(path.join(outDir, `${r.id}.base.png`), annotate(A, findings.map((f) => ({ n: f.n, boxes: f.base })), mv.base));
        // a missing element's head boxes are the parents it is missing from: show where it was instead
        const headBoxesOf = (f) => (f.type === 'missing' ? [] : f.head);
        fs.writeFileSync(path.join(outDir, `${r.id}.head.png`), annotate(B, findings.map((f) => ({ n: f.n, boxes: headBoxesOf(f) })), mv.head));
        for (const f of findings) {
          // colour changes say how different they look (CIEDE2000): "imperceptible" (< 1) to "clearly visible"
          const changes = [...new Set((f.details || []).flatMap((d) => d.changes))].slice(0, 8)
            .map((c) => { const h = colorHint(c); return h ? `${c} · ΔE00 ${h.dE.toFixed(1)}, ${h.label}` : c; });
          const sig = [f.severity, f.type, f.path, ...changes].join('\n'), sameAs = firstSeen.get(sig);
          if (!sameAs) firstSeen.set(sig, { page: r.t.page, state: r.t.state, forced: !!r.t.force, vp: r.t.vp, n: f.n });
          const ba = sameAs ? null : beforeAfter(A, B, f.base, headBoxesOf(f), { movedBase: mv.base, movedHead: mv.head });
          const img = ba ? `${r.id}.${f.n}.png` : null;
          if (ba) fs.writeFileSync(path.join(outDir, img), ba.png);
          entry.findings.push({ n: f.n, severity: f.severity, type: f.type, path: f.path, places: (f.paths || [f.path]).length, elements: Math.max(f.head.length, f.base.length),
            visible: f.visible, changes, head: f.head, base: f.base, image: img, imageWidth: ba ? ba.width : 0, ...(sameAs ? { sameAs } : {}), ...(f.cause ? { cause: f.cause } : {}), triage: triageOf(f, cfg),
            ...(!f.head.length && !f.base.length && !['a11y', 'behaviour', 'resource', 'coverage'].includes(f.type) ? { outOfView: true } : {}) });
        }
      }
      pages.push(entry);
    }
    // The signature names exactly this set of changes: an approval given for one set (the
    // `ui-change-approved` label in CI) must not carry over to a later push that changes something else.
    const sigOf = (p) => [p.page, p.state, p.status, ...p.findings.map((f) => [f.severity, f.type, f.path, ...f.changes].join('\u0001')).sort()].join('\u0002');
    const signature = crypto.createHash('sha1').update(pages.filter((p) => !p.pass || p.status === 'new').map(sigOf).sort().join('\u0003')).digest('hex').slice(0, 16);
    const summary = { base: baseUrl, head: headUrl, ms: Date.now() - t0, targets: pages.length, changed: pages.filter((p) => !p.pass).length, failed: pages.filter((p) => !p.ok).length,
      fresh: pages.filter((p) => p.status === 'new').length, signature, ...(cfg.expectNoChange ? { expectNoChange: true } : {}), ...(cfg.feedback ? { feedback: true } : {}), pages };
    // advisory learned triage: a score per finding, never part of the signature
    if (cfg.model) { const { loadModel, scoreSummary } = require('./model.js'); scoreSummary(summary, typeof cfg.model === 'string' ? loadModel(cfg.model) : cfg.model); }
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
    fs.writeFileSync(path.join(outDir, 'report.html'), reportHtml(summary));
    fs.writeFileSync(path.join(outDir, 'comment.md'), commentMd(summary, imageBaseUrl || cfg.imageBaseUrl));
    return summary;
  } finally { await browser.close(); }
}

// Triage: how likely a finding is to be intended, from what it reports and where it comes from.
//   breaks  a property the UI should keep whatever the design: contrast, content cut off or covered,
//           focus, clicks, fonts, broken values, distinctions or hover feedback lost, a state that no
//           longer returns to the page as loaded
//   check   something gone (an element, an item, an accessible name), text newly truncated with an
//           ellipsis (truncation the design provides for), one instance drifting from the
//           others, numbers that changed on the same data, a CSS edit that reaches an element its rule
//           does not select, or wins over a more specific rule only by !important
//   token   from a CSS edit that redefined a custom property (a design token) the element's styles use
//   yours   from a CSS edit whose rule selects the element (or an ancestor)
//   other   from markup, scripts or data, not a loss: reported as a change
// A PR that declares it changes no UI (cfg.expectNoChange: a refactor, a dependency bump) gets every
// finding as at least check.
const BREAK_TYPES = new Set(['contrast', 'layout', 'palette', 'focus', 'resource', 'behaviour', 'suspicious-data', 'loss']);
function triageOf(f, cfg = {}) {
  const t = triage0(f);
  return cfg.expectNoChange && t !== 'breaks' ? 'check' : t;
}
function triage0(f) {
  const changes = (f.details || []).flatMap((d) => d.changes);
  if (f.path === 'layout: text now truncated (…)') return 'check';     // truncation the design provides for
  if (BREAK_TYPES.has(f.type)) return 'breaks';
  if (f.type === 'a11y' && changes.some((c) => /\(no accessible name\)|^removed:/.test(c))) return 'breaks';
  const nums = (t) => (t.match(/\d+(?:[.,]\d+)*/g) || []).join(' ');
  // an element whose key gained a class is restyled, not gone ("missing span.pill" + "added child span.pill.s-lost")
  const gained = (k) => (f.added || []).some((a) => a.split('.')[0] === k.split('.')[0] && k.split('.').slice(1).every((c) => a.split('.').includes(c)));
  const lostKey = (c) => { const m = /^removed child (\S+)/.exec(c); return m ? m[1] : null; };
  // an element whose content shows up as added elsewhere moved (a list sorted differently)
  const moved = changes.some((c) => { const m = /^expected \S+ \("(.+)"\) not found/.exec(c); return m && (f.addedTexts || []).includes(m[1]); });
  const removes = (['missing', 'missing-variant'].includes(f.type) && !moved && !gained(f.path.split(' > ').pop().replace(/\[[^\]]*\]$/, '').replace(/@.*$/, '')))
    || changes.some((c) => /^removed:/.test(c) || (lostKey(c) && !gained(lostKey(c))))
    || (f.type === 'count' && changes.some((c) => { const m = /^(\d+) per instance → ([\d/]+)/.exec(c); return m && m[2].split('/').every((x) => +x < +m[1]); }));
  const numbers = changes.some((c) => { const m = /^text: "(.*)" → "(.*)"/.exec(c); return m && nums(m[1]) && nums(m[2]) && nums(m[1]) !== nums(m[2]); });
  const duplicates = changes.some((c) => /^added \(duplicates/.test(c));
  if (f.type === 'drift' || removes || numbers || duplicates) return 'check';
  const c = f.cause;
  if (c && c.css === 'all' && c.edits.length) {
    const r = Object.values(c.reach);
    if (c.beats || r.includes('elsewhere')) return 'check';
    return r.includes('token') ? 'token' : 'yours';
  }
  return 'other';
}

// ------------------------------------------------------------------------------------- outputs
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shortPath = (p) => p.split(' > ').slice(-3).join(' › ').replace(/\[\*\]/g, '').replace(/\{(\d+)\}/g, '[$1]');
const scope = (f) => (f.elements > 1 ? `${f.elements} elements${f.places > 1 ? ` in ${f.places} places` : ''}` : '');
const OUT_OF_VIEW = 'Not in the screenshot: the changed elements are scrolled out of view inside a scroll container (or off-page).';
// findings about things that are not drawn (what a screen reader announces, what a click does, files)
const NOT_DRAWN = new Set(['a11y', 'behaviour', 'resource', 'coverage']);
const INTENT_ONLY = 'No pixel change in the CI browser: the styles changed but render the same here (e.g. a font or weight this machine lacks). Users may still see it.';

// Triage labels, and where a finding comes from (attribution), in words
const TRIAGE = { breaks: ['🚫', 'breaks something'], check: ['⚠️', 'check: likely unintended'], token: ['🎨', 'through a design token'], yours: ['✏️', 'from your CSS edit'], other: ['▫️', 'markup, script or data change'] };
function why(f, edits = []) {
  const c = f.cause;
  if (!c || c.css === null) return '';
  if (c.css === 'none') return 'Not from a CSS change: the markup, a script or the data changed.';
  const ed = (k) => edits.find((e) => e.id === +k);
  const rule = (e) => (e.kind === 'sheet-removed' ? `the stylesheet ${e.sheet}, missing in the PR` : `${e.kind === 'added' ? 'new rule' : e.kind === 'removed' ? 'removed rule' : 'rule'} \`${e.sel}\`${e.at ? ` (${e.at})` : ''}`);
  const what = (e) => (e.what && e.what.length && e.kind === 'changed' ? `: ${e.what.slice(0, 2).join('; ')}${e.what.length > 2 ? '; …' : ''}` : '');
  const parts = c.edits.slice(0, 2).map((k) => {
    const e = ed(k); if (!e) return null;
    const r = c.reach[k], beats = c.beats && c.beats[k];
    const head = r === 'token' ? `through ${e.tokens.map((t) => `\`${t}\``).join(', ')}, redefined in ${rule(e)}${what(e)}`
      : r === 'elsewhere' ? `a knock-on of ${rule(e)}${what(e)}, which does not select this element`
      : r === 'inside' ? `from ${rule(e)}${what(e)}, on an element around it` : `from ${rule(e)}${what(e)}`;
    return head + (beats ? `; it wins over the more specific \`${beats[0]}\` only because of !important` : '');
  }).filter(Boolean);
  if (!parts.length) return c.css === 'some' ? 'Partly from the PR\'s CSS, partly from markup, scripts or data.' : 'From the PR\'s CSS edits together.';
  const text = `${c.css === 'some' ? 'partly ' : ''}${parts.join('; and ')}${c.edits.length > 2 ? ` (and ${c.edits.length - 2} more edits)` : ''}${c.css === 'some' ? '; the rest from markup, scripts or data' : ''}.`;
  return text[0].toUpperCase() + text.slice(1);
}

// Markdown with text taken from the page: render it as literal code (entities for every character
// markdown would act on, so page text can neither format nor link).
const mdc = (s) => '<code>' + String(s).replace(/[&<>"'*_`|[\]~\\#!]/g, (c) => `&#${c.charCodeAt(0)};`) + '</code>';
const mdt = (s) => String(s).replace(/[&<>"'*_`|[\]~\\#!]/g, (c) => `&#${c.charCodeAt(0)};`);
// forced pseudo-class renders are synthetic (every hover style at once): say so where states are named
const stateLabel = (st, forced) => (forced ? `:${st} forced` : st);
const where = (x) => `${x.page} — ${stateLabel(x.state, x.forced)}${x.vp ? ` · ${x.vp}` : ''}`;
const status = (p) => ({ new: '🆕 new, no baseline', error: '❌ failed to render', same: '✅ same' })[p.status] || (p.ok ? `⚠️ ${p.warnings} warning(s)` : `❌ ${p.errors} change(s)`);
const tidOf = (x) => tid({ page: x.page, state: x.state, vp: x.vp });
// a finding's signature in the labelled-PR format (learn/dataset.js), and a short id of it for the comment
const findingSig = (p, f) => [p.page, p.state, p.vp, f.type, f.path, ...f.changes].join('|');
const findingId = (p, f) => crypto.createHash('sha1').update(findingSig(p, f)).digest('hex').slice(0, 10);
function imageUrl(base, file) { return base.includes('{file}') ? base.replace('{file}', file) : `${base.replace(/\/$/, '')}/${file}`; }

const ruled = (f) => f.triage === 'breaks' || f.triage === 'check';
const modelNote = (f) => `model ${f.score.toFixed(2)}`;
function commentMd(s, imageBaseUrl) {
  const L = ['<!-- uihash -->', `<!-- uihash-signature: ${s.signature} -->`];
  const broken = s.pages.filter((p) => p.status === 'error').length;
  const verdict = s.failed ? `❌ **${s.failed} of ${s.targets} page states ${broken === s.failed ? 'failed to render' : broken ? 'changed or failed to render' : 'changed'}**`
    : s.changed ? `⚠️ **${s.changed} of ${s.targets} page states have warnings only**` : `✅ **No UI changes** in ${s.targets - s.fresh} page states`;
  L.push('### uihash — visual check', '', verdict + ` (checked in ${(s.ms / 1000).toFixed(1)}s)` + (s.fresh ? `; ${s.fresh} new page state(s) without a baseline on the base branch` : ''), '');
  if (!s.changed && !s.fresh) return L.join('\n') + '\n';
  const fresh = s.pages.flatMap((p) => p.findings.filter((f) => !f.sameAs && f.triage));
  if (fresh.length) {
    const n = (l) => fresh.filter((f) => f.triage === l).length;
    L.push(Object.keys(TRIAGE).filter(n).map((l) => `${TRIAGE[l][0]} ${n(l)} ${TRIAGE[l][1]}`).join(' · '), '');
    if (s.model) {
      const obv = fresh.filter((f) => f.obvious).length, extra = fresh.filter((f) => f.modelFlag && !ruled(f) && !f.obvious).length;
      if (obv || extra) L.push(`<sub>Triage model (advisory): ${[obv && `🚫 ${obv} obvious mistake${obv > 1 ? 's' : ''}`, extra && `🤖 ${extra} more likely unintended`].filter(Boolean).join(' · ')}. It adds flags and orders the list; it never removes a rule's flag or approves a change.</sub>`, '');
    }
    if (s.expectNoChange) L.push('<sub>This PR says it changes no UI (a refactor, a dependency update), so every change below is one to check.</sub>', '');
    // what to look at first: the findings that break something or are likely unintended, and with a
    // triage model the ones it flags; the model's obvious mistakes first, then breaks, then by score
    const hot = s.pages.flatMap((p) => p.findings.filter((f) => !f.sameAs && (ruled(f) || f.modelFlag || f.obvious)).map((f) => ({ p, f })))
      .sort((x, y) => (x.f.obvious ? 0 : 1) - (y.f.obvious ? 0 : 1) || (x.f.triage === 'breaks' ? 0 : 1) - (y.f.triage === 'breaks' ? 0 : 1) || (y.f.score || 0) - (x.f.score || 0));
    const mark = (f) => (f.obvious ? `🚫 ${modelNote(f)}` : ruled(f) ? `${TRIAGE[f.triage][0]}${f.score !== undefined ? ` ${modelNote(f)}` : ''}` : `🤖 ${modelNote(f)}`);
    if (hot.length) {
      L.push('**Look at these first:**', '');
      for (const { p, f } of hot.slice(0, 8)) L.push(`- ${mark(f)} ${mdt(where(p))} **#${f.n}**: ${mdc(f.changes[0].slice(0, 140))}`);
      if (hot.length > 8) L.push(`- … and ${hot.length - 8} more below`);
      L.push('');
    }
  }
  L.push('| page | state | result |', '|---|---|---|');
  for (const p of s.pages) L.push(`| ${mdt(p.page)} | ${mdt(stateLabel(p.state, p.forced))}${p.vp ? ` · ${mdt(p.vp)}` : ''} | ${status(p)} |`);
  for (const p of s.pages.filter((x) => x.status === 'error')) L.push('', `#### ${mdt(where(p))}`, '', `❌ Could not render this state in the PR build: ${mdc(p.message)}`);
  for (const p of s.pages.filter((x) => !x.pass && x.status !== 'error')) {
    L.push('', `#### ${mdt(where(p))}`, '');
    const fresh = p.findings.filter((f) => !f.sameAs), seen = p.findings.filter((f) => f.sameAs);
    for (const f of fresh) {
      L.push(`**${f.n}.** ${f.severity === 'warning' ? '⚠️' : '❌'} ${f.obvious && f.triage !== 'breaks' ? '🚫 ' : ''}${f.triage ? `${TRIAGE[f.triage][0]} ` : ''}${f.modelFlag && !ruled(f) && !f.obvious ? '🤖 ' : ''}${mdc(shortPath(f.path))} — ${f.changes.slice(0, 3).map(mdc).join(', ')}${scope(f) ? ` _(${scope(f)})_` : ''}`);
      const w = why(f, p.edits);
      if (w) L.push('', `<sub>${f.triage ? `${TRIAGE[f.triage][1]}. ` : ''}${mdt(w).replace(/&#96;([^&]*?)&#96;/g, (m, x) => `<code>${x}</code>`)}</sub>`);
      if (f.score !== undefined && (f.modelFlag || ruled(f))) L.push('', `<sub>Triage model: ${f.obvious ? 'an obvious mistake' : f.modelFlag ? 'likely unintended' : 'probably intended'} (${modelNote(f)}).</sub>`);
      if (f.visible === false && !NOT_DRAWN.has(f.type)) L.push('', `<sub>${INTENT_ONLY}</sub>`);
      if (f.outOfView) L.push('', `<sub>${OUT_OF_VIEW}</sub>`);
      if (f.image) L.push('', imageBaseUrl ? `<img src="${imageUrl(imageBaseUrl, f.image)}" alt="before and after"${f.imageWidth > 760 ? ' width="760"' : ''}>` : `_before/after image: \`${f.image}\` in the report artifact_`);
      L.push('');
    }
    if (p.moved) L.push(`<sub>Dashed outlines: ${p.moved} element${p.moved > 1 ? 's' : ''} that did not change but moved or resized because of the changes above.</sub>`, '');
    if (seen.length) {
      const by = new Map();
      for (const f of seen) { const k = where(f.sameAs); by.set(k, [...(by.get(k) || []), f.sameAs.n]); }
      L.push(`${fresh.length ? 'Also' : 'Only'} the change${seen.length > 1 ? 's' : ''} shown above: ${[...by].map(([k, ns]) => `${mdt(k)} ${ns.map((n) => '#' + n).join(', ')}`).join('; ')}.`, '');
    }
  }
  // per-finding feedback (config "feedback": true): a reviewer ticks whether each change was meant. The
  // workflow keeps the ticks when it updates the comment; learn/collect.js reads them as labels.
  const asked = s.feedback ? s.pages.flatMap((p) => p.findings.filter((f) => !f.sameAs && f.type !== 'coverage').map((f) => ({ p, f }))) : [];
  if (asked.length) {
    L.push('<details><summary>Was each change intended? Tick one box per change (optional: it trains the triage model)</summary>', '');
    for (const { p, f } of asked.slice(0, 30)) {
      const id = findingId(p, f);
      L.push(`- [ ] ✅ intended: ${mdt(where(p))} **#${f.n}** <!-- uihash-f:${id}:deliberate -->`, `- [ ] ❌ a mistake: ${mdt(where(p))} **#${f.n}** <!-- uihash-f:${id}:mistake -->`);
    }
    L.push('', '</details>', '');
  }
  L.push('<sub>BEFORE = base branch, AFTER = this PR; red boxes mark what changed. If a change is intended, merge as usual: the base branch is the new baseline.</sub>');
  return L.join('\n') + '\n';
}

function reportHtml(s) {
  const card = (p) => `
  <section class="target ${p.status === 'new' ? 'new' : p.pass ? 'same' : p.ok ? 'warn' : 'fail'}">
    <h2><span class="dot"></span>${esc(p.page)} <small>${esc(stateLabel(p.state, p.forced))}${p.vp ? ` · ${esc(p.vp)}` : ''}</small>
      <em>${p.status === 'new' ? 'new: no baseline on the base branch' : p.status === 'error' ? 'failed to render' : p.pass ? 'same UI' : p.ok ? `${p.warnings} warning(s)` : `${p.errors} change(s)`}</em></h2>
    <p class="url">${esc(p.url)} ${p.digestEqual ? '· digest equal' : ''}</p>
    ${p.message ? `<p class="note">${esc(p.message)}</p>` : ''}
    ${p.findings.map((f) => f.sameAs ? `
    <div class="finding same" id="${p.id}-${f.n}"><div class="fh"><b>${f.n}</b><span class="sev ${f.severity}">${f.severity}</span><code>${esc(shortPath(f.path))}</code>
      <span class="type">same change as <a href="#${tidOf(f.sameAs)}-${f.sameAs.n}">${esc(where(f.sameAs))} #${f.sameAs.n}</a></span></div></div>` : `
    <div class="finding" id="${p.id}-${f.n}">
      <div class="fh"><b>${f.n}</b><span class="sev ${f.severity}">${f.severity}</span>${f.triage ? `<span class="tri ${f.triage}">${TRIAGE[f.triage][0]} ${TRIAGE[f.triage][1]}</span>` : ''}${f.score !== undefined ? `<span class="tri ${f.obvious ? 'breaks' : f.modelFlag ? 'check' : 'other'}" title="triage model: probability the change was not intended">model ${f.score.toFixed(2)}</span>` : ''}<code>${esc(shortPath(f.path))}</code><span class="type">${esc(f.type)}${scope(f) ? ` · ${scope(f)}` : ''}</span></div>
      <ul>${f.changes.map((c) => `<li><code>${esc(c)}</code></li>`).join('')}</ul>
      ${why(f, p.edits) ? `<p class="why">${esc(why(f, p.edits)).replace(/`([^`]*)`/g, '<code>$1</code>')}</p>` : ''}
      ${f.visible === false && !NOT_DRAWN.has(f.type) ? `<p class="note">${INTENT_ONLY}</p>` : ''}
      ${f.outOfView ? `<p class="note">${OUT_OF_VIEW}</p>` : ''}
      ${f.image ? `<img class="ba" src="${f.image}" alt="before and after" style="max-width:min(100%,${f.imageWidth}px)">` : ''}
    </div>`).join('')}
    ${p.moved ? `<p class="note">Dashed outlines: ${p.moved} element${p.moved > 1 ? 's' : ''} that did not change but moved or resized because of the changes above.</p>` : ''}
    ${p.pass || p.status === 'error' ? '' : `<details><summary>Full screenshots</summary><div class="full"><img src="${p.id}.base.png" alt="base"><img src="${p.id}.head.png" alt="head"></div></details>`}
  </section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>uihash report</title><style>
:root{--bg:#f7f7f5;--card:#fff;--ink:#1d1d1b;--mut:#6b6b66;--line:#e4e4df;--red:#dc2626;--amber:#b45309;--green:#15803d}
@media (prefers-color-scheme:dark){:root{--bg:#161615;--card:#1f1f1d;--ink:#ecece8;--mut:#a3a39c;--line:#33332f}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px}
h1{font-size:22px;margin:0 0 4px} .sub{color:var(--mut);margin:0 0 20px}
.target{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:0 0 16px}
.target h2{font-size:17px;margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap} .target h2 small{color:var(--mut);font-weight:500}
.target h2 em{margin-left:auto;font-style:normal;font-size:13px;color:var(--mut)}
.dot{width:10px;height:10px;border-radius:50%;background:var(--green)} .fail .dot{background:var(--red)} .warn .dot{background:var(--amber)} .new .dot{background:var(--mut)}
.url{color:var(--mut);font-size:12px;margin:2px 0 8px;word-break:break-all}
.finding{border-top:1px solid var(--line);padding:12px 0 4px}
.fh{display:flex;align-items:center;gap:8px;flex-wrap:wrap} .fh b{background:var(--red);color:#fff;border-radius:6px;padding:0 7px;font-size:13px}
.sev{font-size:12px;border-radius:999px;padding:0 8px;border:1px solid currentColor} .sev.error{color:var(--red)} .sev.warning{color:var(--amber)}
.type{color:var(--mut);font-size:12px} code{font-size:12.5px;word-break:break-word}
.note{margin:4px 0;padding:6px 10px;border-left:3px solid var(--amber);background:color-mix(in srgb,var(--amber) 8%,transparent);font-size:13px;color:var(--mut)}
ul{margin:6px 0;padding-left:20px} img.ba,.full img{max-width:100%;border:1px solid var(--line);border-radius:8px;display:block;margin-top:8px}
.finding.same .fh{opacity:.75} a{color:inherit}
.tri{font-size:12px;border-radius:999px;padding:0 8px;background:color-mix(in srgb,var(--mut) 14%,transparent)} .tri.breaks{background:color-mix(in srgb,var(--red) 16%,transparent)} .tri.check{background:color-mix(in srgb,var(--amber) 18%,transparent)}
.why{margin:2px 0 6px;font-size:13px;color:var(--mut)}
.full{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px} details summary{cursor:pointer;color:var(--mut);margin-top:8px}
@media (max-width:640px){.full{grid-template-columns:1fr}}
</style></head><body><main>
<h1>uihash visual check</h1>
<p class="sub">${s.failed ? `${s.failed} of ${s.targets} page states changed` : s.changed ? `warnings only` : 'no UI changes'} · base <code>${esc(s.base)}</code> vs head <code>${esc(s.head)}</code> · ${(s.ms / 1000).toFixed(1)}s</p>
${s.pages.filter((p) => !p.pass).map(card).join('')}${s.pages.filter((p) => p.pass).map(card).join('')}
</main></body></html>`;
}

// the reviewer's ticks in a comment body: finding id -> 'deliberate' | 'mistake' (both ticked: dropped)
function feedbackOf(body) {
  const out = {}, both = new Set();
  for (const m of String(body).matchAll(/^- \[[xX]\] .*<!-- uihash-f:([0-9a-f]+):(deliberate|mistake) -->/gm)) { if (out[m[1]] && out[m[1]] !== m[2]) both.add(m[1]); out[m[1]] = m[2]; }
  for (const id of both) delete out[id];
  return out;
}
// carry the ticks of an earlier comment over to a new one (same finding ids)
function keepFeedback(oldBody, newBody) {
  const ticked = new Set([...String(oldBody).matchAll(/^- \[[xX]\] .*(<!-- uihash-f:[0-9a-f]+:\w+ -->)/gm)].map((m) => m[1]));
  return newBody.replace(/^- \[ \] (.*(<!-- uihash-f:[0-9a-f]+:\w+ -->))$/gm, (line, rest, mark) => (ticked.has(mark) ? `- [x] ${rest}` : line));
}

module.exports = { runPR, loadConfig, targets, render, reportHtml, commentMd, why, triageOf, findingSig, findingId, feedbackOf, keepFeedback };

