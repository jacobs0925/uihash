// Second, independent testbed: an ops dashboard with dynamic patterns the mailbox does not have
// (data-driven SVG geometry, inline bar heights, virtualized rows positioned by inline transforms,
// relative times, money/percent formats, a random A/B layout and a random toast).
// Ground truth for "visible": the same render with Math.random pinned, mutated vs. not, pixel diff.
// Usage: node eval.js [--fresh]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { PNG } = require('playwright-core/lib/utilsBundle');
const { newStablePage, settle, extract, saveSnapshot, loadSnapshot } = require('../../src/capture.js');
const { calibrate, check, digest } = require('../../src/fingerprint.js');

const APP = 'file://' + path.join(__dirname, 'index.html');
const CACHE = path.join(__dirname, '.cache');
const FRESH = process.argv.includes('--fresh');
const REGRESSIONS = ['kpi-down-color', 'chart-stroke', 'bar-radius', 'head-weight', 'pill-padding', 'nav-current-bg', 'kpi-gap', 'axis-color',
  'toast-shadow', 'avatar-ring', 'spark-color', 'cta-radius', 'degraded-color', 'copy-change', 'icon-swap', 'column-order'];
const CAL = [1, 2, 3, 4, 5, 6], SAME = Array.from({ length: 20 }, (_, i) => 20 + i), TEST = [20, 21, 22, 23, 24];
const T0 = Date.UTC(2026, 9, 7, 15, 30);

function scenarios() {
  const S = [];
  for (const s of CAL) S.push({ g: 'calib', seed: s, now: T0 + s * 5400e3 });
  for (const s of SAME) S.push({ g: 'same', seed: s, now: T0 + s * 3600e3 });
  for (const s of CAL) S.push({ g: 'calib-cij', seed: s, m: 'rehash-classes', now: T0 + s * 5400e3 });
  for (const s of TEST) S.push({ g: 'same-cij', seed: s, m: 'rehash-classes' });
  for (const s of TEST) S.push({ g: 'refactor', name: 'wrapper-block', seed: s, m: 'wrapper-block' });
  for (const s of TEST) S.push({ g: 'refactor', name: 'rehash-classes (plain baseline)', seed: s, m: 'rehash-classes' });
  for (const m of REGRESSIONS) for (const s of TEST) {
    S.push({ g: 'reg', name: m, seed: s, m });
    S.push({ g: 'truth', name: m, seed: s, m, pin: 1 }, { g: 'truth0', name: m, seed: s, pin: 1 });
  }
  for (const m of ['kpi-down-color', 'chart-stroke', 'copy-change']) for (const s of TEST) S.push({ g: 'reg-cij', name: m, seed: s, m: 'rehash-classes,' + m });
  for (const s of TEST) for (const r of [1, 2]) S.push({ g: 'rerun', name: 'r' + r, seed: s });
  return S.map((x) => ({ ...x, id: [x.g, x.name || '', x.seed, x.m || '', x.pin || ''].join('_').replace(/[^\w.-]+/g, '-') }));
}
const url = (x) => APP + '?' + new URLSearchParams({ seed: x.seed, ...(x.m ? { m: x.m } : {}), ...(x.now ? { now: x.now } : {}) });

async function captureAll(S) {
  fs.mkdirSync(CACHE, { recursive: true });
  const todo = S.filter((x) => FRESH || !fs.existsSync(path.join(CACHE, x.id + '.json.gz')));
  if (!todo.length) return;
  const browser = await chromium.launch();
  for (const x of todo) {
    const { ctx, page } = await newStablePage(browser, { width: 1280, height: 900, seed: x.pin ? 42 : null });
    await page.goto(url(x)); await settle(page);
    saveSnapshot(path.join(CACHE, x.id + '.json.gz'), await extract(page));
    if (x.pin) fs.writeFileSync(path.join(CACHE, x.id + '.png'), await page.screenshot({ fullPage: true }));
    await ctx.close();
  }
  await browser.close();
}
function differ(a, b) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return true;
  for (let i = 0; i < A.data.length; i++) if (A.data[i] !== B.data[i]) return true;
  return false;
}

(async () => {
  const S = scenarios();
  await captureAll(S);
  const snap = (x) => loadSnapshot(path.join(CACHE, x.id + '.json.gz'));
  const of = (g, name) => S.filter((x) => x.g === g && (name === undefined || x.name === name));
  const visible = (x) => { const t = S.find((y) => y.g === 'truth' && y.name === x.name && y.seed === x.seed), t0 = S.find((y) => y.g === 'truth0' && y.name === x.name && y.seed === x.seed);
    return differ(fs.readFileSync(path.join(CACHE, t.id + '.png')), fs.readFileSync(path.join(CACHE, t0.id + '.png'))); };
  const rows = [];
  for (const [label, opts, calG, sameG] of [['class keys', {}, 'calib', 'same'], ['tag keys', { keyMode: 'tag' }, 'calib', 'same']]) {
    for (const k of [4, 6]) {
      const schema = calibrate(of(calG).slice(0, k).map(snap), opts);
      const fp = of(sameG).filter((x) => !check(snap(x), schema, { explain: false }).pass);
      const ref = {}; for (const x of of('refactor')) { ref[x.name] = ref[x.name] || [0, 0]; ref[x.name][1]++; if (!check(snap(x), schema, { explain: false }).pass) ref[x.name][0]++; }
      let vis = 0, det = 0, invis = 0, invisFlag = 0; const per = {};
      for (const x of of('reg')) {
        const t = S.find((y) => y.g === 'truth' && y.name === x.name && y.seed === x.seed);
        const v = visible(x), d = !check(snap(t), schema, { explain: false }).pass;
        per[x.name] = per[x.name] || [0, 0, 0]; if (v) { per[x.name][1]++; if (d) per[x.name][0]++; } else { per[x.name][2]++; }
        if (v) { vis++; if (d) det++; } else { invis++; if (d) invisFlag++; }
      }
      rows.push(`| ${label}, k=${k} | ${fp.length}/${of(sameG).length} | ${Object.entries(ref).map(([n, [a, b]]) => `${n} ${a}/${b}`).join('; ')} | ${det}/${vis} | ${invisFlag}/${invis} |`);
      if (k === 6 && label === 'class keys') {
        console.log('per regression (detected/visible, +invisible renders):', Object.entries(per).map(([n, [d, v, i]]) => `${n} ${d}/${v}${i ? ` (+${i} invisible)` : ''}`).join(', '));
        for (const x of fp.slice(0, 3)) { const r = check(snap(x), schema); console.log('  FP', x.id, r.findings.slice(0, 2).map((f) => f.type + ' ' + f.path.split(' > ').slice(-2).join(' > ') + ' :: ' + ((f.details && f.details[0] && f.details[0].changes.slice(0, 2).join('; ')) || '')).join(' || ').slice(0, 300)); }
      }
    }
  }
  // CSS-in-JS app: baseline and candidates are both builds with per-build hashed class names
  for (const km of ['class', 'tag']) {
    const cij = calibrate(of('calib-cij').map(snap), { keyMode: km });
    const cijFP = of('same-cij').filter((x) => !check(snap(x), cij, { explain: false }).pass).length;
    const cijTP = of('reg-cij').filter((x) => !check(snap(x), cij, { explain: false }).pass).length;
    rows.push(`| CSS-in-JS app (hashed classes, new hash every build), ${km} keys, k=6 | ${cijFP}/${of('same-cij').length} | — | ${cijTP}/${of('reg-cij').length} (kpi-down/chart/copy; not visibility-filtered) | — |`);
  }
  console.log('\n| configuration | FP: same build, other data | refactors flagged | visible regressions detected | invisible renders flagged |\n|---|---|---|---|---|\n' + rows.join('\n'));
  // single-hash digest with fixed fixtures
  const schema = calibrate(of('calib').map(snap), { keyMode: 'tag' });
  let same = 0; for (const s of TEST) { const [a, b] = S.filter((x) => x.g === 'rerun' && x.seed === s).map((x) => digest(snap(x), schema)); if (a === b) same++; }
  console.log(`\ndigest: two renders of the same fixture identical ${same}/${TEST.length} (random A/B layout and toast differ between them)`);
})();
