// Highlighting in an app that scrolls inside an inner container: boxes must stay inside what the
// screenshot shows. A change to rows below the container's fold is reported, but not drawn on top of
// whatever happens to be at those page coordinates.
const path = require('path');
const { chromium } = require('playwright');
const { render } = require('../../src/pr.js');
const { calibrate, check } = require('../../src/fingerprint.js');
const { diffMask, read } = require('../../src/annotate.js');

const ROOT = 'file://' + path.join(__dirname, '..') + '/';
const CFG = { runs: 6, viewport: { width: 1280, height: 800 }, freezeTime: '2026-01-15T12:00:00Z', seedRandom: 42 };
(async () => {
  const browser = await chromium.launch();
  const t = { path: 'scroller/index.html?seed={i}', actions: [] };
  const runs = [];
  for (let i = 1; i <= 6; i++) runs.push(await render(browser, CFG, ROOT, t, i, i === 1));
  const schema = calibrate(runs.map((r) => r.snap));
  const A = read(runs[0].png);
  const visibleRect = [0, 0, A.width, A.height];
  let ok = true;
  for (const m of ['', 'row-text', 'deep-badge', 'header-pad']) {
    const head = await render(browser, CFG, ROOT, { path: `scroller/index.html?seed={i}${m ? '&m=' + m : ''}`, actions: [] }, 1, true);
    const res = check(head.snap, schema), D = diffMask(A, read(head.png));
    const boxes = res.findings.flatMap((f) => f.head);
    const outside = boxes.filter((b) => b[1] + b[3] > 800 + 1 || b[1] < 0).length;   // the page never scrolls: 800 px tall
    const outOfView = res.findings.filter((f) => !f.head.length && !f.base.length).length;
    console.log(`${(m || '(no change)').padEnd(12)} changed px ${String(D.n).padStart(6)}  findings ${res.findings.length}  boxes ${boxes.length}  boxes beyond the fold ${outside}  out-of-view findings ${outOfView}  ${res.findings.map((f) => (f.details || [])[0]?.changes[0]).join(' | ')}`);
    if (outside) ok = false;
    if (m === '' && res.findings.length) ok = false;
    if (m === 'deep-badge' && (res.findings.length !== 1 || outOfView !== 1)) ok = false;
    if ((m === 'row-text' || m === 'header-pad') && (!boxes.length || outOfView)) ok = false;
  }
  console.log(ok ? 'PASS' : 'FAIL', `(screenshot ${A.width}x${A.height})`);
  await browser.close();
  process.exitCode = ok ? 0 : 1;
})();
