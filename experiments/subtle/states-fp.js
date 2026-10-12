// False positives in forced states and media variants: calibrate each state on fixtures 1..6, then
// check 14 fresh fixtures (other data, same build). Any finding is a false alarm. The same renders
// also test the focus-indicator check (focus.js): fixture 1 against each fresh one must lose nothing.
const path = require('path');
const { chromium } = require('playwright');
const { render } = require('../../src/pr.js');
const { calibrate, check } = require('../../src/fingerprint.js');
const { focusLost } = require('../../src/focus.js');

const ROOT = 'file://' + path.join(__dirname, '..') + '/';
const CFG = { runs: 6, viewport: { width: 1280, height: 800 }, keys: 'class', freezeTime: '2026-01-15T12:00:00Z', seedRandom: 42 };
const APPS = { mailbox: 'mailbox/index.html?seed={i}', dashboard: 'dashboard/index.html?seed={i}', scroller: 'scroller/index.html?seed={i}' };
const STATES = { default: {}, hover: { force: 'hover' }, focus: { force: 'focus' }, active: { force: 'active' }, dark: { emulate: { colorScheme: 'dark' } }, print: { emulate: { media: 'print' } } };

async function pool(items, n, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (next < items.length) { const k = next++; out[k] = await fn(items[k]); } }));
  return out;
}
(async () => {
  const browser = await chromium.launch();
  let total = 0, fp = 0, ftotal = 0, ffp = 0;
  const kept = {};
  for (const app of Object.keys(APPS)) for (const [state, how] of Object.entries(STATES)) {
    const t = { path: APPS[app], actions: [], ...how };
    const cal = await pool([1, 2, 3, 4, 5, 6], 4, (i) => render(browser, CFG, ROOT, t, i, false));
    const schema = calibrate(cal.map((r) => r.snap));
    const probes = await pool(Array.from({ length: 14 }, (_, k) => 7 + k), 4, (i) => render(browser, CFG, ROOT, t, i, false));
    const bad = probes.map((r, k) => [7 + k, check(r.snap, schema)]).filter(([, res]) => !res.pass);
    total += probes.length; fp += bad.length;
    console.log(`${app.padEnd(10)} ${state.padEnd(8)} false alarms ${bad.length} / ${probes.length}${bad.length ? '   e.g. seed ' + bad[0][0] + ': ' + bad[0][1].findings.slice(0, 2).map((f) => f.path.split(' > ').slice(-2).join(' > ') + ' ' + ((f.details || [])[0] || { changes: [''] }).changes[0]).join(' | ') : ''}`);
    kept[`${app}|${state}`] = { cal, probes };
    if (state === 'focus') {
      const D = kept[`${app}|default`], lost = probes.map((pf, k) => focusLost(D.cal[0].snap, cal[0].snap, D.probes[k].snap, pf.snap)).filter((l) => l.length);
      ftotal += probes.length; ffp += lost.length;
      console.log(`${app.padEnd(10)} focus indicators: false "gone" ${lost.length} / ${probes.length}${lost.length ? '   e.g. ' + lost[0].map((x) => x.label).join(', ') : ''}`);
    }
  }
  console.log(`total false alarms ${fp} / ${total}; focus-indicator false alarms ${ffp} / ${ftotal}`);
  await browser.close();
})();
