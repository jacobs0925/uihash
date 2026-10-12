// Evaluate the fingerprint on real sites.
//  1. Drift: snapshots of the same site over time (content churns, UI code does not). Online
//     learning: calibrate on snapshots [0, t) and check snapshot t. A finding is a false positive.
//  2. Sensitivity: class-level CSS mutations injected into one live page load. Ground truth for
//     "visible" is a pixel diff against the unmutated render of the same load. Schema = all
//     snapshots of the site including the unmutated base, so any finding is caused by the mutation.
//     Also checks that the explanation names the mutated property (localization).
// Usage: node live-eval.js <seriesDir> <mutDir> [keyMode]
const fs = require('fs');
const path = require('path');
const { PNG } = require('playwright-core/lib/utilsBundle');
const { loadSnapshot } = require('../../src/capture.js');
const { calibrate, check } = require('../../src/fingerprint.js');

const [seriesDir, mutDir, keyMode = 'class'] = process.argv.slice(2);
const minCal = +(process.env.MIN_CAL || 2);
// The stored series mixes extractor versions: the first snapshots read cursor/pointer-events on every
// element, later (lazy) ones never read them. Compare like with like.
const ignoreProps = ['cursor', 'pointer-events', 'user-select', 'touch-action'];

function pixelsDiffer(a, b) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return true;
  for (let i = 0; i < A.data.length; i++) if (A.data[i] !== B.data[i]) return true;
  return false;
}
const LONGHANDS = { 'border-radius': /radius/, 'text-decoration': /text-decoration/, display: /./, 'line-height': /line-height|height/ };

for (const site of fs.readdirSync(mutDir)) {
  const series = fs.existsSync(path.join(seriesDir, site))
    ? fs.readdirSync(path.join(seriesDir, site)).filter((f) => f.endsWith('.json.gz')).sort().map((f) => ({ f, snap: loadSnapshot(path.join(seriesDir, site, f)) }))
    : [];
  const base = loadSnapshot(path.join(mutDir, site, 'base.json.gz'));
  const all = [...series, { f: 'mut-base', snap: base }];
  console.log(`\n=== ${site}: ${all.length} snapshots over time, ~${base.stats.elements} elements`);
  // 1. drift
  for (let t = minCal; t < all.length; t++) {
    const schema = calibrate(all.slice(0, t).map((x) => x.snap), { keyMode, ignoreProps });
    const r = check(all[t].snap, schema);
    const summary = r.findings.slice(0, 4).map((f) => `${f.type} ${f.path.split(' > ').slice(-2).join(' > ')} ${(f.details && f.details[0] && f.details[0].changes.slice(0, 2).join('; ')) || ''}`.slice(0, 220));
    console.log(`drift: cal=${t} -> ${all[t].f}: ${r.pass ? 'PASS' : `FAIL (${r.findings.length})`}  [static ${schema.stats.static} / dynamic ${schema.stats.dynamic}]  check ${r.ms.toFixed(1)}ms`);
    for (const s of summary) console.log('     ', s);
  }
  // 2. sensitivity
  const schema = calibrate(all.map((x) => x.snap), { keyMode, ignoreProps });
  const after = check(loadSnapshot(path.join(mutDir, site, 'base-after.json.gz')), schema);
  const meta = JSON.parse(fs.readFileSync(path.join(mutDir, site, 'mutations.json')));
  const basePng = fs.readFileSync(path.join(mutDir, site, 'base.png'));
  let vis = 0, visDet = 0, inv = 0, invDet = 0, loc = 0;
  const misses = [];
  for (const m of meta) {
    const snap = loadSnapshot(path.join(mutDir, site, `mut${m.i}.json.gz`));
    const visible = m.visible !== undefined ? m.visible : pixelsDiffer(basePng, fs.readFileSync(path.join(mutDir, site, `mut${m.i}.png`)));
    const r = check(snap, schema);
    const detected = !r.pass;
    const re = LONGHANDS[m.prop] || new RegExp(m.prop.replace(/-/g, '-'));
    const named = r.findings.some((f) => (f.details || []).some((d) => d.changes.some((c) => re.test(c.split(':')[0]) || /child|instances|element/.test(c))) || /missing|count/.test(f.type));
    if (visible) { vis++; if (detected) { visDet++; if (named) loc++; } else misses.push(m); } else { inv++; if (detected) invDet++; }
  }
  console.log(`sensitivity: visible mutations detected ${visDet}/${vis} (explanation names the property: ${loc}/${visDet}); invisible-in-pixels but flagged ${invDet}/${inv}; revert sanity ${after.pass ? 'ok' : 'FAILED'}`);
  for (const m of misses) console.log('   missed:', JSON.stringify(m));
}
