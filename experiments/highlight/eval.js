// Are UI changes caught AND boxed in the right place?
// For every regression type of both testbeds, run the real PR flow: calibrate the base on fixtures
// 1..6 (run 0 = fixture 1 = the "before" screenshot), render the mutated head with fixture 1, check.
// Ground truth = pixel diff between the before and after screenshots (time and Math.random pinned,
// so only the mutation differs). Metrics per change:
//   detected  — check() reports an error
//   hit       — some red box overlaps changed pixels (on the image where the box is drawn)
//   cover     — share of changed pixels inside the boxes (low for layout shifts: content that moved
//               because of the boxed cause is not itself boxed — by design)
//   precision — share of boxes that contain changed pixels (boxes on unchanged areas are noise)
//   area      — boxed area as a share of the page
//   pixel flag — the report's "no pixel change in this browser" label agrees with the ground truth
//               (invisible change: every finding labelled; visible change: some finding not labelled)
// Usage: node eval.js [outDir]   (writes before|after crops for visual review)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { render } = require('../../src/pr.js');
const { calibrate, check, boxOf } = require('../../src/fingerprint.js');
const { moved } = require('../../src/shift.js');
const { beforeAfter, pixelsDiffer, diffMask, grow, read } = require('../../src/annotate.js');

const OUT = process.argv[2] || path.join(__dirname, '.out');
const ROOT = 'file://' + path.join(__dirname, '..') + '/';
const CFG = { runs: 6, viewport: { width: 1280, height: 800 }, keys: 'class', freezeTime: '2026-01-15T12:00:00Z', seedRandom: 42, concurrency: 4 };
const MAILBOX = ['compose-color', 'row-padding', 'unread-weight', 'chip-radius', 'sidebar-width', 'hide-star', 'date-align', 'font-family',
  'snippet-color', 'unread-bg', 'row-height', 'toolbar-border', 'chip-gap', 'bar-color', 'tab-badge', 'typo', 'toolbar-order', 'icon-swap',
  'attach-icon', 'pager-text', 'hover-bg', 'bind-undefined', 'bind-empty', 'bind-template', 'bind-nan'];
const DASHBOARD = ['kpi-down-color', 'chart-stroke', 'bar-radius', 'head-weight', 'pill-padding', 'nav-current-bg', 'kpi-gap', 'axis-color',
  'toast-shadow', 'avatar-ring', 'spark-color', 'cta-radius', 'degraded-color', 'copy-change', 'icon-swap', 'column-order'];
const CASES = [
  ...MAILBOX.map((m) => ({ app: 'mailbox', state: 'base', actions: [], m })),
  { app: 'mailbox', state: 'menu', actions: ['[aria-label="Settings"]'], m: 'menu-under' },
  { app: 'mailbox', state: 'compose', actions: ['nav button'], m: 'composer-width' },
  ...DASHBOARD.map((m) => ({ app: 'dashboard', state: 'base', actions: [], m })),
];

async function pool(items, n, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (next < items.length) { const k = next++; out[k] = await fn(items[k]); } }));
  return out;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  // one calibration per (app, state)
  const schemas = {};
  for (const key of [...new Set(CASES.map((c) => `${c.app}|${c.state}`))]) {
    const c = CASES.find((x) => `${x.app}|${x.state}` === key);
    const t = { path: `${c.app}/index.html?seed={i}`, actions: c.actions };
    const runs = await pool([1, 2, 3, 4, 5, 6], 4, (i) => render(browser, CFG, ROOT, t, i, i === 1));
    schemas[key] = { schema: calibrate(runs.map((r) => r.snap)), png: runs[0].png, img: read(runs[0].png), ref: runs[0].snap };
  }
  const rows = await pool(CASES, 4, async (c) => {
    const { schema, img: A, ref } = schemas[`${c.app}|${c.state}`];
    const head = await render(browser, CFG, ROOT, { path: `${c.app}/index.html?seed={i}&m=${c.m}`, actions: c.actions }, 1, true);
    const res = check(head.snap, schema);
    const B = read(head.png);
    const D = diffMask(A, B);
    const flags = res.findings.map((f) => pixelsDiffer(A, B, f.base, f.head));
    const visible = D.n > 0 || D.sizeChanged;
    const errs = res.findings.filter((f) => f.severity === 'error');
    const headBoxes = res.findings.flatMap((f) => f.head.map((b) => grow(b, 14, 2)));
    const baseBoxes = res.findings.flatMap((f) => f.base.map((b) => grow(b, 14, 2)));
    // count changed pixels inside boxes (boxes from either side; both images share coordinates
    // until the first layout shift, and the mask is computed on the overlapping area)
    const inBox = (x, y, boxes) => boxes.some(([bx, by, bw, bh]) => x >= bx && x < bx + bw && y >= by && y < by + bh);
    let covered = 0;
    const all = [...headBoxes, ...baseBoxes];
    const hitBox = new Array(all.length).fill(false);
    for (let y = 0; y < D.h; y++) for (let x = 0; x < D.w; x++) {
      if (!D.mask[y * D.w + x]) continue;
      let any = false;
      all.forEach((b, k) => { if (x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3]) { hitBox[k] = true; any = true; } });
      if (any) covered++;
    }
    const area = all.reduce((s, b) => s + b[2] * b[3], 0) / (D.w * D.h);
    // with the dashed "moved" outlines (content pushed by the change) as well
    const mv = res.pass ? { head: [], base: [], count: 0 } : moved(ref, head.snap, { ...schema.opts, stateClasses: schema.stateClasses, boxOf });
    const withMoved = [...all, ...[...mv.head, ...mv.base].map((b) => grow(b, 6, 2))];
    let coveredM = 0;
    for (let y = 0; y < D.h; y++) for (let x = 0; x < D.w; x++) if (D.mask[y * D.w + x] && inBox(x, y, withMoved)) coveredM++;
    // crops for review
    const f0 = res.findings[0];
    if (f0) { const ba = beforeAfter(A, B, f0.base, f0.head, { movedBase: mv.base, movedHead: mv.head }); if (ba) fs.writeFileSync(path.join(OUT, `${c.app}-${c.m}.png`), ba.png); }
    const flagOk = !res.findings.length ? null : visible ? flags.some((x) => x !== false) : flags.every((x) => x === false);
    return { ...c, visible, changedPx: D.n, detected: errs.length > 0, findings: res.findings.length, flagOk, hit: hitBox.some(Boolean), cover: D.n ? covered / D.n : 0,
      coverMoved: D.n ? coveredM / D.n : 0, moved: mv.count,
      precision: all.length ? hitBox.filter(Boolean).length / all.length : 0, area, boxes: all.length, first: f0 ? `${f0.type}: ${((f0.details || [])[0] || { changes: [''] }).changes[0]}` : '' };
  });
  await browser.close();
  const pct = (x) => `${Math.round(100 * x)}%`;
  console.log('| app | change | visible px | detected | findings | box hits change | changed px boxed | + moved outlines | moved | boxes on changes | boxed area | pixel flag | first finding |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.app} | ${r.m} | ${r.visible ? r.changedPx : '—'} | ${r.detected ? '✓' : r.visible ? '✗' : '–'} | ${r.findings} | ${r.findings && r.visible ? (r.hit ? '✓' : '✗') : ''} | ${r.findings && r.visible ? pct(r.cover) : ''} | ${r.findings && r.visible ? pct(r.coverMoved) : ''} | ${r.moved || ''} | ${r.findings ? pct(r.precision) + ` (${r.boxes})` : ''} | ${r.findings ? pct(r.area) : ''} | ${r.flagOk === null ? '' : r.flagOk ? '✓' : '✗'} | ${r.first.slice(0, 70)} |`);
  const vis = rows.filter((r) => r.visible);
  console.log(`\nvisible changes: ${vis.length}; detected ${vis.filter((r) => r.detected).length}; boxed on the change ${vis.filter((r) => r.detected && r.hit).length}; ` +
    `median changed-pixel coverage ${pct(vis.map((r) => r.cover).sort((a, b) => a - b)[Math.floor(vis.length / 2)])} ` +
    `(lowest ${pct(Math.min(...vis.map((r) => r.cover)))}; with moved outlines lowest ${pct(Math.min(...vis.map((r) => r.coverMoved)))}); ` +
    `invisible but flagged ${rows.filter((r) => !r.visible && r.detected).map((r) => r.m).join(', ') || 'none'}; ` +
    `pixel flag right ${rows.filter((r) => r.flagOk).length}/${rows.filter((r) => r.flagOk !== null).length}`);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(rows, null, 1));
})();
