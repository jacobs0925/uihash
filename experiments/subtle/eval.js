// Subtle changes: the kind that slip through review. 1px font sizes, z-index, near-identical colours,
// letter-spacing, opacity 0.97, hover/focus-only styles, dark-mode-only styles, cursor and
// pointer-events, properties a style extractor might not read at all.
//
// Each change runs through the PR flow: base calibrated on fixtures 1..6, head = fixture 1 with the
// change appended as raw CSS (?css=), check, and a pixel diff of the same fixture before/after.
// Every change is labelled with WHERE it would show:
//   static   - in the page as loaded (what a screenshot test sees)
//   state    - only in another state: hover, focus, active, dark mode, print, selection, scrolling
//   hidpi    - only on high-density screens
//   interact - not drawn at all: cursor, pointer-events, user-select, transitions
//   noop     - nowhere (a change with no effect: z-index on an element that overlaps nothing...)
// A good checker catches every static change, as many state changes as it can reach, and stays
// quiet on no-ops (or flags them as low severity).
// Usage: node eval.js [outDir]   (ONLY=<regex> runs the cases whose id matches)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { render } = require('../../src/pr.js');
const { calibrate, check, boxOf } = require('../../src/fingerprint.js');
const { moved } = require('../../src/shift.js');
const { colorHint } = require('../../src/perceive.js');
const { diffMask, read, beforeAfter, pixelsDiffer } = require('../../src/annotate.js');
const { TOOLS, pixelTools, caught } = require('./pixeltools.js');
const { focusLost } = require('../../src/focus.js');

const OUT = process.argv[2] || path.join(__dirname, '.out');
const ROOT = 'file://' + path.join(__dirname, '..') + '/';
const CFG = { runs: 6, viewport: { width: 1280, height: 800 }, keys: 'class', freezeTime: '2026-01-15T12:00:00Z', seedRandom: 42, concurrency: 4 };
const APPS = { mailbox: 'mailbox/index.html?seed={i}', dashboard: 'dashboard/index.html?seed={i}', scroller: 'scroller/index.html?seed={i}' };
// how each state is reached: clicks, forced pseudo-classes, or emulated media
const STATES = { base: {}, menu: { actions: ['[aria-label="Settings"]'] }, hover: { force: 'hover' }, focus: { force: 'focus' }, active: { force: 'active' },
  disabled: { force: 'disabled' }, 'user-invalid': { force: 'user-invalid' },
  dark: { emulate: { colorScheme: 'dark' } }, print: { emulate: { media: 'print' } },
  // renders run with prefers-reduced-motion: reduce (steadier); 'motion' is what most users get
  motion: { emulate: { reducedMotion: 'no-preference' } }, 'forced-colors': { emulate: { forcedColors: 'active' } },
  retina: { viewport: { width: 1280, height: 800, deviceScaleFactor: 2 } },
  phone: { viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true } } };
const target = (app, state, extra = '') => ({ path: APPS[app] + extra, actions: [], ...STATES[state] });
const enc = (css, js) => (css ? `&css=${encodeURIComponent(css)}` : '') + (js ? `&js=${encodeURIComponent(js)}` : '');

// [id, app, state, where, category, css, baseCss?, { js, baseJs }?] (base*: applied to base and head alike;
// js: a DOM change run after the page builds)
const CASES = [
  // typography
  ['subject-size-1px', 'mailbox', 'base', 'static', 'typography', '.subject{font-size:13px}'],
  ['subject-size-half-px', 'mailbox', 'base', 'static', 'typography', '.subject{font-size:14.5px}'],
  ['kpi-value-size-1px', 'dashboard', 'base', 'static', 'typography', '.kpi .value{font-size:25px}'],
  ['nav-letter-spacing', 'mailbox', 'base', 'static', 'typography', '.nav-item{letter-spacing:0.01em}'],
  ['kpi-label-spacing', 'dashboard', 'base', 'static', 'typography', '.kpi .label{letter-spacing:.05em}'],
  ['snippet-line-height', 'mailbox', 'base', 'static', 'typography', '.tip{line-height:1.3}'],
  ['chip-word-spacing', 'mailbox', 'base', 'static', 'typography', '.subject{word-spacing:1px}'],
  ['compose-weight-500-400', 'mailbox', 'base', 'static', 'typography', '.compose{font-weight:400}'],
  ['date-tabular-nums', 'mailbox', 'base', 'static', 'typography', '.date{font-variant-numeric:tabular-nums}'],
  ['font-kerning-off', 'mailbox', 'base', 'static', 'typography', 'body{font-kerning:none}'],
  ['font-feature-settings', 'dashboard', 'base', 'static', 'typography', '.kpi .value{font-feature-settings:"tnum" 1}'],
  ['underline-offset', 'mailbox', 'base', 'static', 'typography', 'footer a{text-underline-offset:3px}'],
  ['underline-thickness', 'mailbox', 'base', 'static', 'typography', 'footer a{text-decoration-thickness:2px}'],
  ['tip-capitalize', 'mailbox', 'base', 'static', 'typography', '.tip{text-transform:capitalize}'],
  ['font-stretch', 'mailbox', 'base', 'static', 'typography', '.tip{font-stretch:condensed}'],
  // colour and paint
  ['text-color-1-unit', 'mailbox', 'base', 'static', 'colour', '.subject{color:#454746}'],
  ['css-variable-tweak', 'mailbox', 'base', 'static', 'colour', ':root{--muted:#5f6369}'],
  ['border-color-1-unit', 'mailbox', 'base', 'static', 'colour', '.toolbar{border-bottom-color:#e0e3e8}'],
  ['grid-line-color', 'dashboard', 'base', 'static', 'colour', '.line-chart .grid line{stroke:#e6e7eb}'],
  ['row-opacity-097', 'mailbox', 'base', 'static', 'colour', 'li.row{opacity:0.97}'],
  ['compose-brightness', 'mailbox', 'base', 'static', 'colour', '.compose{filter:brightness(0.99)}'],
  ['card-shadow-alpha', 'dashboard', 'base', 'static', 'colour', '.card{box-shadow:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.12)}'],
  ['checkbox-accent', 'mailbox', 'base', 'static', 'colour', '.row input[type=checkbox]{accent-color:#0b57d0}'],
  ['placeholder-color', 'mailbox', 'base', 'static', 'colour', '.search input::placeholder{color:#3c4043}'],
  ['scrollbar-color', 'scroller', 'base', 'static', 'colour', 'main{scrollbar-color:#9ca3af #f3f4f6}'],
  ['scrollbar-width', 'scroller', 'base', 'static', 'colour', 'main{scrollbar-width:thin}'],
  // spacing and size
  ['row-padding-1px', 'mailbox', 'base', 'static', 'spacing', 'li.row{padding:0 15px}'],
  ['chip-padding-1px', 'mailbox', 'base', 'static', 'spacing', '.chip{padding:0 5px}'],
  ['toolbar-gap-1px', 'mailbox', 'base', 'static', 'spacing', '.toolbar{gap:9px}'],
  ['nav-icon-1px', 'mailbox', 'base', 'static', 'spacing', '.nav-item svg{width:19px;height:19px}'],
  ['search-radius-1px', 'mailbox', 'base', 'static', 'spacing', '.search{border-radius:23px}'],
  ['tip-margin-1px', 'mailbox', 'base', 'static', 'spacing', '.tip{margin:8px 16px 9px}'],
  ['table-head-1px', 'dashboard', 'base', 'static', 'spacing', '.table-head{height:41px}'],
  ['navlink-padding-1px', 'dashboard', 'base', 'static', 'spacing', '.navlink{padding:9px 11px}'],
  ['avatar-overlap-1px', 'dashboard', 'base', 'static', 'spacing', '.avatars .av{margin-left:-9px}'],
  ['hairline-border', 'mailbox', 'base', 'hidpi', 'spacing', '.toolbar{border-bottom-width:0.5px}'],
  // position and stacking
  ['compose-nudge-1px', 'mailbox', 'base', 'static', 'position', '.compose{transform:translateY(1px)}'],
  ['z-index-noop', 'mailbox', 'base', 'noop', 'position', 'header.top{z-index:6}'],
  ['toast-z-index-noop', 'dashboard', 'base', 'noop', 'position', '.toast{z-index:1}'],
  ['menu-under-header', 'mailbox', 'menu', 'static', 'position', 'header.top{z-index:auto}'],
  ['menu-z-index-down', 'mailbox', 'menu', 'static', 'position', '.menu{z-index:1}'],
  ['header-sticky', 'mailbox', 'base', 'state', 'position', 'header.top{position:sticky;top:0}'],
  // layout
  ['row-align-baseline', 'mailbox', 'base', 'static', 'layout', 'li.row{align-items:baseline}'],
  ['labels-justify', 'mailbox', 'base', 'static', 'layout', '.labels-head{justify-content:space-around}'],
  ['snippet-ellipsis-clip', 'mailbox', 'base', 'static', 'layout', '.snippet{text-overflow:clip}'],
  ['flex-item-valign-noop', 'mailbox', 'base', 'noop', 'layout', '.chip{vertical-align:top}'],
  ['pill-radius-noop', 'dashboard', 'base', 'noop', 'layout', '.pill{border-radius:998px}'],
  // states and environments
  ['row-hover-bg', 'mailbox', 'hover', 'state', 'state', 'li.row:hover{background:#eef}'],
  ['nav-hover-bg', 'dashboard', 'hover', 'state', 'state', '.navlink:hover{background:#273244}'],
  ['focus-ring-removed', 'mailbox', 'focus', 'state', 'state', '.icon-btn:focus-visible,.compose:focus-visible{outline:none}'],
  ['focus-ring-color', 'dashboard', 'focus', 'state', 'state', '.promo .cta:focus-visible{outline:2px solid #f00}'],
  ['focus-reset-global', 'mailbox', 'focus', 'state', 'state', ':focus,:focus-visible{outline:none}'],
  ['focus-ring-to-shadow', 'mailbox', 'focus', 'state', 'state', '.compose:focus-visible{outline:none;box-shadow:0 0 0 3px #0b57d0}'],
  ['compose-active', 'mailbox', 'active', 'state', 'state', '.compose:active{background:#a8d8ff}'],
  ['dark-mode-only', 'mailbox', 'dark', 'state', 'state', '@media (prefers-color-scheme: dark){body{background:#202124}}'],
  ['print-only', 'mailbox', 'print', 'state', 'state', '@media print{nav.side{display:none}}'],
  ['selection-color', 'mailbox', 'base', 'state', 'state', '::selection{background:#fde68a}'],
  ['search-focus-within', 'mailbox', 'focus', 'state', 'state', '.search:focus-within{background:#fff}'],
  ['row-hover-actions', 'mailbox', 'hover', 'state', 'state', 'li.row:hover .date{color:#1f1f1f}'],
  ['hover-scale', 'dashboard', 'hover', 'state', 'state', '.promo .cta:hover{scale:1.02}'],
  ['disabled-style', 'dashboard', 'disabled', 'state', 'state', '.promo .cta:disabled{background:#a5b4fc}'],
  ['invalid-field-style', 'mailbox', 'user-invalid', 'state', 'state', '.search input:user-invalid{color:#b3261e}'],
  ['deep-row-change', 'scroller', 'base', 'state', 'state', '.row:nth-child(55) .who{color:#b91c1c}'],
  // accessibility: an imperceptible colour change that crosses WCAG AA contrast
  ['contrast-crosses-aa', 'mailbox', 'base', 'static', 'contrast', '.toolbar .pager{color:#777777}', '.toolbar .pager{color:#767676}'],
  ['contrast-bg-darkens', 'dashboard', 'base', 'static', 'contrast', '.topbar{background:#e9ebef}', '.updated{color:#6c6c6c}'],
  // knock-on layout failures of small changes
  ['sender-column-truncates', 'mailbox', 'base', 'static', 'layout', '.sender{width:90px}'],
  ['chip-negative-margin', 'mailbox', 'base', 'static', 'layout', '.chip{margin-right:-10px}'],
  ['tip-too-wide', 'mailbox', 'base', 'static', 'layout', '.tip{min-width:1300px}'],
  ['toast-behind-content', 'dashboard', 'base', 'static', 'position', '.toast{z-index:-1}'],
  ['header-covers-menu', 'mailbox', 'menu', 'static', 'position', '.menu{top:-40px}'],
  // interaction only
  ['compose-cursor', 'mailbox', 'base', 'interact', 'interaction', '.compose{cursor:default}'],
  ['compose-pointer-events', 'mailbox', 'base', 'interact', 'interaction', '.compose{pointer-events:none}'],
  ['subject-user-select', 'mailbox', 'base', 'interact', 'interaction', '.subject{user-select:none}'],
  ['compose-transition', 'mailbox', 'base', 'interact', 'interaction', '.compose{transition:background .3s}'],
  // alignment: one element 1px off a line it shared with its neighbours
  ['kpi-label-1px-lower', 'dashboard', 'base', 'static', 'alignment', '.kpi:nth-child(2) .label{position:relative;top:1px}'],
  ['row-checkbox-1px-right', 'mailbox', 'base', 'static', 'alignment', 'li.row:nth-child(3) input{margin-left:5px}'],
  // batch 2: aimed at what a style-and-DOM fingerprint might not see
  ['chart-linecap', 'dashboard', 'base', 'static', 'svg', '.line-chart .series{stroke-linecap:round;stroke-linejoin:round}'],
  ['chart-dasharray', 'dashboard', 'base', 'static', 'svg', '.line-chart .grid line{stroke-dasharray:4 2}'],
  ['spark-stroke-opacity', 'dashboard', 'base', 'static', 'svg', '.spark polyline{stroke-opacity:.85}'],
  ['area-fill-opacity', 'dashboard', 'base', 'static', 'svg', '.line-chart .area{fill-opacity:.5}'],
  ['icon-swapped', 'mailbox', 'base', 'static', 'svg', '', '', { js: `document.querySelector('.compose svg path').setAttribute('d', 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z')` }],
  // the same pencil glyph written with arcs instead of curves: a different path, the same pixels
  ['icon-same-glyph-new-path', 'mailbox', 'base', 'noop', 'svg', '', '', { js: `document.querySelector('.compose svg path').setAttribute('d', 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z')` }],
  ['label-typo', 'mailbox', 'base', 'static', 'content', '', '', { js: `for (const s of document.querySelectorAll('.nav-item span')) if (s.textContent === 'Snoozed') s.textContent = 'Snozed'` }],
  ['canvas-drawing', 'dashboard', 'base', 'static', 'canvas', '', '', {
    baseJs: `const c = document.createElement('canvas'); c.width = 120; c.height = 24; c.id = 'cv'; document.querySelector('.updated').after(c); const g = c.getContext('2d'); g.strokeStyle = window.CVC || '#6366f1'; g.lineWidth = 2; g.beginPath(); [4,9,6,14,11,18,15,20].forEach((v, i) => g.lineTo(i * 16, 24 - v)); g.stroke();`,
    js: `window.CVC = '#4f46e5';` }],
  ['text-shadow-faint', 'mailbox', 'base', 'static', 'colour', '.subject{text-shadow:0 0 1px rgba(0,0,0,.08)}'],
  ['outline-offset-focus', 'mailbox', 'focus', 'state', 'state', '.compose:focus-visible{outline:2px solid #0b57d0;outline-offset:2px}', '.compose:focus-visible{outline:2px solid #0b57d0;outline-offset:0}'],
  ['bg-position-1px', 'mailbox', 'base', 'static', 'spacing', '.compose{background-position:1px 0}', '.compose{background-image:linear-gradient(90deg,#c2e7ff 50%,#a8d8ff 50%);background-size:8px 8px}'],
  ['same-colour-new-syntax', 'mailbox', 'base', 'noop', 'colour', '.subject{color:rgb(68 71 70 / 100%)}'],
  ['selection-color-text', 'mailbox', 'base', 'state', 'state', 'li.row::selection,li.row ::selection{background:#fde68a}'],
  ['motion-pref-only', 'mailbox', 'base', 'state', 'environment', '@media (prefers-reduced-motion: no-preference){.compose{background:#fde68a}}'],
  ['motion-pref-only@motion', 'mailbox', 'motion', 'state', 'environment', '@media (prefers-reduced-motion: no-preference){.compose{background:#fde68a}}'],
  ['forced-colors-only', 'mailbox', 'forced-colors', 'state', 'environment', '@media (forced-colors: active){.compose{border:2px solid ButtonText}}'],
  ['touch-only', 'mailbox', 'phone', 'state', 'environment', '@media (hover: none){li.row .date{color:#b3261e}}'],
  ['hidpi-only-rule@retina', 'mailbox', 'retina', 'hidpi', 'environment', '@media (min-resolution: 2dppx){.toolbar{border-bottom-color:#c4c7c5}}'],
];

if (process.env.ONLY) CASES.splice(0, CASES.length, ...CASES.filter((c) => new RegExp(process.env.ONLY).test(c[0])));

async function pool(items, n, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (next < items.length) { const k = next++; out[k] = await fn(items[k]); } }));
  return out;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const bases = {};
  const keyOf = (c) => JSON.stringify([c[1], c[2], c[6] || '', (c[7] || {}).baseJs || '']);
  for (const key of [...new Set(CASES.map(keyOf))]) {
    const [app, state, baseCss, baseJs] = JSON.parse(key);
    const runs = await pool([1, 2, 3, 4, 5, 6], 4, (i) => render(browser, CFG, ROOT, target(app, state, enc(baseCss, baseJs)), i, i === 1));
    bases[key] = { schema: calibrate(runs.map((r) => r.snap)), img: read(runs[0].png), png: runs[0].png, ref: runs[0].snap };
  }
  const rows = await pool(CASES, 4, async (c) => {
    const [id, app, state, where, category, css, baseCss = '', { js = '', baseJs = '' } = {}] = c;
    const { schema, img: A, png: basePng, ref } = bases[keyOf(c)];
    const head = await render(browser, CFG, ROOT, target(app, state, enc(baseCss + css, js + baseJs)), 1, true);
    const res = check(head.snap, schema);
    // the PR report's extra checks on the same pair: text contrast crossing WCAG AA
    const cmp = res.pass ? null : moved(ref, head.snap, { ...schema.opts, stateClasses: schema.stateClasses, boxOf });
    const aa = cmp ? cmp.contrast : [];
    // focus indicators (WCAG 2.4.7): each side's page as loaded against its :focus-forced render
    let lost = null;
    if (state === 'focus') {
      const plain = (extra) => render(browser, CFG, ROOT, target(app, 'base', extra), 1, false).then((r) => r.snap);
      lost = focusLost(await plain(enc(baseCss, baseJs)), ref, await plain(enc(baseCss + css, js + baseJs)), head.snap);
    }
    const B = read(head.png), D = diffMask(A, B);
    const f0 = res.findings[0];
    if (f0) { const ba = beforeAfter(A, B, f0.base, f0.head); if (ba) fs.writeFileSync(path.join(OUT, `${id}.png`), ba.png); }
    // the report's pixel label: does any finding change pixels in the state it was checked in?
    const LAYOUTISH = /^(margin|padding|width|height|min-|max-|top|right|bottom|left|gap|row-gap|column-gap|flex|grid|display|position|transform|translate|scale|rotate|font-size|line-height|letter-spacing|word-spacing|border-\w+-width|order|align|justify|float|zoom|white-space|text-indent|added child|removed child|reordered)/;
    const pixelVisible = res.findings.length ? res.findings.some((f) => pixelsDiffer(A, B, f.base, f.head) !== false
      || (cmp && cmp.count && (f.details || []).some((d) => d.changes.some((c) => LAYOUTISH.test(c))))) : null;
    return { id, app, state, where, category, css: css || js, px: D.n + (D.sizeChanged ? 1 : 0), detected: !res.ok, findings: res.findings.length, pixelVisible,
      tools: pixelTools(basePng, head.png), focusLost: lost ? [...new Set(lost.map((x) => x.label))] : null,
      contrast: aa.length ? `contrast ${aa[0].from.toFixed(2)} → ${aa[0].to.toFixed(2)}:1 (needs ${aa[0].min}) on ${aa.length}` : '',
      layout: cmp && cmp.layout.length ? [...new Set(cmp.layout.map((x) => x.kind))].map((k) => `${k} ×${cmp.layout.filter((x) => x.kind === k).length} (${cmp.layout.find((x) => x.kind === k).text.slice(0, 60)})`).join(', ') : '',
      dE: (() => { const c = f0 && ((f0.details || [])[0] || { changes: [] }).changes.find((x) => colorHint(x)); return c ? colorHint(c) : null; })(),
      first: f0 ? ((f0.details || [])[0] || { changes: [f0.type] }).changes[0] : '' };
  });
  await browser.close();
  const verdict = (r) => (r.detected ? (r.where === 'noop' ? 'flagged (no-op)' : 'CAUGHT') : r.px ? 'SLIPPED (visible!)' : r.where === 'noop' ? 'quiet (correct)' : 'slipped');
  console.log('| change | checked in | where it shows | changed px | pixel tools: ' + TOOLS.map((t) => t.id).join(' / ') + ' | result | report labels | first finding |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.id} | ${r.state} | ${r.where} | ${r.px || '—'} | ${TOOLS.map((t) => r.tools[t.id] || '—').join(' / ')} | ${verdict(r)} | ${[r.pixelVisible === false ? 'no pixel change here' : '', r.dE ? `ΔE00 ${r.dE.dE.toFixed(1)} ${r.dE.label}` : '', r.contrast, r.layout, r.focusLost && r.focusLost.length ? `focus indicator gone (WCAG 2.4.7): ${r.focusLost.join(', ')}` : ''].filter(Boolean).join('; ')} | ${r.first.slice(0, 70)} |`);
  const by = (f) => rows.filter(f);
  const line = (label, list) => console.log(`${label.padEnd(44)} caught ${list.filter((r) => r.detected).length} / ${list.length}${list.some((r) => !r.detected) ? `   missed: ${list.filter((r) => !r.detected).map((r) => r.id).join(', ')}` : ''}`);
  console.log('');
  line('changes pixels where checked', by((r) => r.px > 0));
  line('real change, but no pixel change here', by((r) => (r.where === 'static' || r.where === 'state') && !r.px));
  line('shows only in another state / environment', by((r) => r.where === 'state'));
  line('only on HiDPI screens', by((r) => r.where === 'hidpi'));
  line('interaction only (not drawn)', by((r) => r.where === 'interact'));
  console.log(`${'no-ops (should stay quiet or be low severity)'.padEnd(44)} flagged ${by((r) => r.where === 'noop' && r.detected).length} / ${by((r) => r.where === 'noop').length}` +
    `, of which labelled "no pixel change here" ${by((r) => r.where === 'noop' && r.detected && r.pixelVisible === false).length}`);
  // the same renders through screenshot-diff tools at their defaults: which visible changes pass
  console.log('');
  const visible = by((r) => r.px > 0);
  console.log(`of the ${visible.length} changes that alter pixels where checked:`);
  console.log(`${'uihash'.padEnd(44)} catches ${visible.filter((r) => r.detected).length}`);
  for (const t of TOOLS) {
    const miss = visible.filter((r) => !caught(t, r.tools[t.id]));
    console.log(`${t.label.padEnd(44)} catches ${visible.length - miss.length}${miss.length ? `   passes: ${miss.map((r) => r.id).join(', ')}` : ''}`);
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(rows, null, 1));
})();
