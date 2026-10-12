// Controlled experiment on the Mailbox testbed. Ground truth is known for every scenario:
//   same-ui   : same build, different data seed / time / random widgets  -> must PASS
//   refactor  : code changes with no visual effect (class rename, wrapper, shorthand) -> should PASS
//   regression: a real visual change (CSS / markup / copy)               -> must FAIL
// Usage: node eval.js [--fresh]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { PNG } = require('playwright-core/lib/utilsBundle');
const { newStablePage, settle, extract, saveSnapshot, loadSnapshot } = require('../../src/capture.js');
const { build } = require('../../src/canon.js');
const { calibrate, check, digest } = require('../../src/fingerprint.js');

const APP = 'file://' + path.join(__dirname, 'index.html');
const CACHE = process.env.UIHASH_CACHE || path.join(__dirname, '.cache');
const FRESH = process.argv.includes('--fresh');

const REGRESSIONS = ['compose-color', 'row-padding', 'unread-weight', 'chip-radius', 'sidebar-width', 'hide-star', 'date-align',
  'font-family', 'snippet-color', 'unread-bg', 'row-height', 'toolbar-border', 'chip-gap', 'bar-color', 'tab-badge',
  'typo', 'toolbar-order', 'icon-swap', 'attach-icon', 'pager-text', 'hover-bg',
  'bind-undefined', 'bind-empty', 'bind-template', 'bind-nan'];   // data-binding bugs inside data holes
const REFACTORS = ['class-rename', 'wrapper-div', 'shorthand-refactor'];
const CALIB = [1, 2, 3, 4, 5, 6];   // ≥ 6 renders, as recommended
const SAME = Array.from({ length: 20 }, (_, i) => 10 + i);
const TEST = [10, 11, 12, 13, 14];
const DAY = 86400e3, T0 = Date.UTC(2026, 9, 7, 15, 30);

function scenarios() {
  const S = [];
  // calibration: different data, a different "now", random tips & ids
  for (const s of CALIB) S.push({ group: 'calib', seed: s, now: T0 + (s - 1) * 3 * DAY });
  for (const s of SAME) S.push({ group: 'same-ui', seed: s, now: T0 + (s % 7) * DAY + s * 3600e3 });
  for (const m of REFACTORS) for (const s of TEST) S.push({ group: 'refactor', name: m, seed: s, m });
  for (const m of REGRESSIONS) for (const s of TEST) S.push({ group: 'regression', name: m, seed: s, m });
  for (const n of [0, 1, 2, 150]) S.push({ group: 'edge', name: `n=${n}`, seed: 10, n });
  // same fixture data as the regression renders, no mutation: two independent renders each (random
  // tip / ids differ) -> baseline for the single-hash (digest) comparison
  for (const s of TEST) for (const r of [1, 2]) S.push({ group: 'rerun', name: `r${r}`, seed: s });
  for (const st of ['menu', 'compose']) {
    for (const s of CALIB) S.push({ group: `calib-${st}`, seed: s, state: st, now: T0 + (s - 1) * 3 * DAY });
    for (const s of TEST) S.push({ group: `same-ui-${st}`, seed: s, state: st });
    const m = st === 'menu' ? 'menu-under' : 'composer-width';
    for (const s of TEST) S.push({ group: `regression-${st}`, name: m, seed: s, state: st, m });
  }
  return S.map((sc) => ({ ...sc, id: [sc.group, sc.name || '', sc.seed, sc.state || '', sc.n ?? ''].join('_') }));
}

function url(sc) {
  const q = new URLSearchParams({ seed: sc.seed });
  if (sc.m) q.set('m', sc.m);
  if (sc.state) q.set('state', sc.state);
  if (sc.now) q.set('now', sc.now);
  if (sc.n !== undefined) q.set('n', sc.n);
  return APP + '?' + q;
}

async function captureAll(S) {
  fs.mkdirSync(CACHE, { recursive: true });
  const todo = S.filter((sc) => FRESH || !fs.existsSync(path.join(CACHE, sc.id + '.json.gz')));
  if (!todo.length) return;
  const browser = await chromium.launch();
  const { ctx, page } = await newStablePage(browser);
  for (const sc of todo) {
    await page.goto(url(sc));
    await settle(page);
    const t0 = Date.now();
    const snap = await extract(page);
    snap.stats.wallMs = Date.now() - t0;
    snap.html = crypto.createHash('sha1').update(await page.content()).digest('hex');
    const t1 = Date.now();
    const png = await page.screenshot({ fullPage: true });
    snap.stats.screenshotMs = Date.now() - t1;
    saveSnapshot(path.join(CACHE, sc.id + '.json.gz'), snap);
    fs.writeFileSync(path.join(CACHE, sc.id + '.png'), png);
  }
  await ctx.close(); await browser.close();
}

// ---------------------------------------------------------------------------------------- methods
function dhash(png) {
  const img = PNG.sync.read(png); const W = 9, Hh = 8; const g = new Float64Array(W * Hh); const c = new Float64Array(W * Hh);
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const i = (y * img.width + x) * 4; const gx = Math.min(W - 1, Math.floor(x * W / img.width)), gy = Math.min(Hh - 1, Math.floor(y * Hh / img.height));
    g[gy * W + gx] += 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]; c[gy * W + gx]++;
  }
  let bits = '';
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W - 1; x++) bits += (g[y * W + x] / c[y * W + x]) > (g[y * W + x + 1] / c[y * W + x + 1]) ? '1' : '0';
  return bits;
}
const hamming = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };
function pixelDiffFrac(a, b) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return 1;
  let d = 0; const n = A.width * A.height;
  for (let i = 0; i < n * 4; i += 4) {
    if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) > 30) d++;
  }
  return d / n;
}

function main() {
  const S = scenarios();
  return captureAll(S).then(() => {
    const load = (sc) => ({ snap: loadSnapshot(path.join(CACHE, sc.id + '.json.gz')), png: fs.readFileSync(path.join(CACHE, sc.id + '.png')) });
    const data = new Map(S.map((sc) => [sc.id, load(sc)]));
    const baseOf = (sc) => S.find((x) => x.group === (sc.state ? `calib-${sc.state}` : 'calib') && x.seed === 1);
    const calibFor = {}, calibTag = {};
    const tCal = Date.now();
    for (const st of ['', 'menu', 'compose']) {
      const cs = S.filter((x) => x.group === (st ? `calib-${st}` : 'calib'));
      calibFor[st] = calibrate(cs.map((x) => data.get(x.id).snap));
      calibTag[st] = calibrate(cs.map((x) => data.get(x.id).snap), { keyMode: 'tag' });
    }
    console.log('schema stats', JSON.stringify(calibFor[''].stats), 'state classes', calibFor[''].stateClasses.join(','));
    const calMs = Date.now() - tCal;
    const memo = new Map();
    const treeHash = (id, opts) => { const k = id + JSON.stringify(opts); if (!memo.has(k)) memo.set(k, build(data.get(id).snap, opts).merkle); return memo.get(k); };
    const METHODS = {
      'pixel-sha': (sc, b) => crypto.createHash('sha1').update(data.get(sc.id).png).digest('hex') !== crypto.createHash('sha1').update(data.get(b.id).png).digest('hex'),
      'pixel-diff>0.5%': (sc, b) => pixelDiffFrac(data.get(sc.id).png, data.get(b.id).png) > 0.005,
      'dhash(d>4)': (sc, b) => hamming(dhash(data.get(sc.id).png), dhash(data.get(b.id).png)) > 4,
      'dom-sha': (sc, b) => data.get(sc.id).snap.html !== data.get(b.id).snap.html,
      'tree:used+boxes': (sc, b) => treeHash(sc.id, { useUsed: true, withBoxes: true, normalizeData: false }) !== treeHash(b.id, { useUsed: true, withBoxes: true, normalizeData: false }),
      'tree:intent+norm': (sc, b) => treeHash(sc.id, {}) !== treeHash(b.id, {}),
      'fingerprint': (sc) => !check(data.get(sc.id).snap, calibFor[sc.state || ''], { explain: false }).pass,
      'fp:tag-keys': (sc) => !check(data.get(sc.id).snap, calibTag[sc.state || ''], { explain: false }).pass,
    };
    const groups = {};
    const rows = [];
    for (const sc of S) {
      if (sc.group.startsWith('calib')) continue;
      const b = baseOf(sc);
      const r = { sc };
      for (const [name, fn] of Object.entries(METHODS)) r[name] = fn(sc, b);
      rows.push(r);
    }
    const flagRate = (rs, m) => `${rs.filter((r) => r[m]).length}/${rs.length}`;
    const out = [];
    const header = ['scenario', ...Object.keys(METHODS)];
    const line = (cells) => '| ' + cells.join(' | ') + ' |';
    out.push(line(header), line(header.map(() => '---')));
    const byGroup = (pred) => rows.filter(pred);
    const addRow = (label, rs) => out.push(line([label, ...Object.keys(METHODS).map((m) => flagRate(rs, m))]));
    addRow('**same-ui** (20 data seeds) — flags = false positives', byGroup((r) => r.sc.group === 'same-ui'));
    for (const st of ['menu', 'compose']) addRow(`same-ui, ${st} open`, byGroup((r) => r.sc.group === `same-ui-${st}`));
    for (const m of REFACTORS) addRow(`refactor: ${m} — flags = FP`, byGroup((r) => r.sc.group === 'refactor' && r.sc.name === m));
    for (const m of REGRESSIONS) addRow(`regression: ${m}`, byGroup((r) => r.sc.group === 'regression' && r.sc.name === m));
    for (const st of ['menu', 'compose']) addRow(`regression (${st}): ${st === 'menu' ? 'menu-under' : 'composer-width'}`, byGroup((r) => r.sc.group === `regression-${st}`));
    for (const r of byGroup((r) => r.sc.group === 'edge')) addRow(`edge: ${r.sc.name}`, [r]);
    console.log(out.join('\n'));
    const regs = rows.filter((r) => r.sc.group.startsWith('regression') && r.sc.name !== 'hover-bg');
    const same = rows.filter((r) => r.sc.group.startsWith('same-ui'));
    const refs = rows.filter((r) => r.sc.group === 'refactor');
    console.log('\nsummary (hover-bg excluded: invisible in a static render)');
    for (const m of Object.keys(METHODS)) console.log(`${m.padEnd(18)} FP(data) ${flagRate(same, m).padEnd(6)} FP(refactor) ${flagRate(refs, m).padEnd(6)} TP(regression) ${flagRate(regs, m)}`);
    const st = [...data.values()].map((d) => d.snap.stats);
    const avg = (k) => Math.round(st.reduce((s, x) => s + x[k], 0) / st.length);
    console.log(`\ncapture: elements≈${avg('elements')} extract≈${avg('extractMs')}ms (wall ${avg('wallMs')}ms) screenshot≈${avg('screenshotMs')}ms; calibration of 3 schemas: ${calMs}ms`);
    const checks = rows.slice(0, 40).map((r) => check(data.get(r.sc.id).snap, calibFor[r.sc.state || ''], { explain: false }).ms);
    console.log(`check (build+compare, no explain): median ${checks.sort((a, b) => a - b)[20].toFixed(1)}ms`);
    if (process.argv.includes('--explain')) {
      for (const r of rows) {
        const res = check(data.get(r.sc.id).snap, calibFor[r.sc.state || '']);
        const expectPass = !r.sc.group.startsWith('regression');
        if (res.pass !== expectPass || process.argv.includes('--all')) {
          console.log(`\n### ${r.sc.id}  pass=${res.pass}`);
          for (const f of res.findings.slice(0, 6)) console.log(' ', f.type, f.path, JSON.stringify(f.details || '').slice(0, 400));
        }
      }
    }
    // ---- single-hash (digest) mode: fixed fixture data, one string compare per render
    const dg = (id, schema) => digest(data.get(id).snap, schema);
    const reruns = S.filter((x) => x.group === 'rerun');
    for (const [label, sch] of [['class keys', calibFor['']], ['tag keys', calibTag['']]]) {
      let same = 0, sameN = 0; const det = {}; const tD = Date.now(); let nD = 0;
      for (const seed of TEST) {
        const [a, b] = reruns.filter((x) => x.seed === seed).map((x) => dg(x.id, sch)); nD += 2;
        sameN++; if (a === b) same++;
        for (const sc of S.filter((x) => (x.group === 'regression' || x.group === 'refactor') && x.seed === seed)) {
          const d = dg(sc.id, sch); nD++;
          det[sc.name] = det[sc.name] || [0, 0]; det[sc.name][1]++; if (d !== a) det[sc.name][0]++;
        }
      }
      console.log(`\ndigest (${label}): identical for two renders of the same fixture ${same}/${sameN}; avg ${((Date.now() - tD) / nD).toFixed(1)}ms per digest`);
      console.log('  digest differs from the fixture baseline: ' + Object.entries(det).map(([k, [x, n]]) => `${k} ${x}/${n}`).join(', '));
    }
    fs.writeFileSync(path.join(__dirname, 'results.md'), out.join('\n') + '\n');
  });
}
main().catch((e) => { console.error(e); process.exit(1); });
