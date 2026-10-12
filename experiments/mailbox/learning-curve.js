// How many calibration runs does the schema need? For k = 1..8, draw k "same build" snapshots at
// random as calibration, then measure false positives on the held-out same-build snapshots and
// detection on the regression snapshots whose change is actually rendered.
const fs = require('fs');
const path = require('path');
const { loadSnapshot } = require('../../src/capture.js');
const { calibrate, check } = require('../../src/fingerprint.js');

const CACHE = process.env.UIHASH_CACHE || path.join(__dirname, '.cache');
const files = fs.readdirSync(CACHE).filter((f) => f.endsWith('.json.gz'));
const pool = files.filter((f) => /^(calib|same-ui)_/.test(f)).map((f) => loadSnapshot(path.join(CACHE, f)));
const INVISIBLE = new Set(['regression_hover-bg', 'regression_attach-icon_10', 'regression_attach-icon_14']);
const regs = files.filter((f) => /^regression_/.test(f) && ![...INVISIBLE].some((p) => f.startsWith(p)))
  .map((f) => ({ f, snap: loadSnapshot(path.join(CACHE, f)) }));
const keyMode = process.argv[2] || 'tag';

let seed = 7;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
console.log(`pool=${pool.length} same-build snapshots, ${regs.length} visible regression snapshots, keyMode=${keyMode}`);
console.log('k | FP rate, any finding | FP rate, errors only | TP rate, any finding | TP rate, errors only | static/dynamic positions');
for (const k of [1, 2, 3, 4, 6, 8]) {
  let fp = 0, fpN = 0, tp = 0, tpN = 0, fpE = 0, tpE = 0; let st = 0, dy = 0; const DRAWS = 10;
  for (let d = 0; d < DRAWS; d++) {
    const idx = pool.map((_, i) => i).sort(() => rand() - 0.5);
    const cal = idx.slice(0, k).map((i) => pool[i]);
    const held = idx.slice(k).map((i) => pool[i]);
    const schema = calibrate(cal, { keyMode });
    st += schema.stats.static; dy += schema.stats.dynamic;
    for (const s of held) { fpN++; const r = check(s, schema, { explain: false }); if (!r.pass) fp++; if (!r.ok) fpE++; }
    for (const g of regs) { tpN++; const r = check(g.snap, schema, { explain: false }); if (!r.pass) tp++; if (!r.ok) tpE++; }
  }
  const pc = (a, b) => `${(100 * a / b).toFixed(1)}%`;
  console.log(`${k} | ${pc(fp, fpN)} | ${pc(fpE, fpN)} | ${pc(tp, tpN)} | ${pc(tpE, tpN)} | ${(st / DRAWS).toFixed(0)}/${(dy / DRAWS).toFixed(0)}`);
}
