// node learn/test-demo.js [model.json]: the demo PR (ci/demo, five deliberate UI changes and a no-op refactor)
// run with the shipped triage model: every finding carries a score, and none is flagged by the model at
// its shipped threshold. Renders in Chromium, about a minute.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');
const { runPR, loadConfig } = require('../src/pr.js');

const model = path.resolve(process.argv[2] || path.join(__dirname, 'model.json'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uihash-demo-'));
execFileSync(process.execPath, [path.join(__dirname, '..', 'ci', 'demo', 'make-pr.js'), tmp]);
(async () => {
  const config = { ...loadConfig(path.join(__dirname, '..', 'ci', 'demo', 'uihash.config.json')), model };
  const s = await runPR({ baseUrl: pathToFileURL(path.join(tmp, 'base')).href + '/', headUrl: pathToFileURL(path.join(tmp, 'head')).href + '/', config, outDir: path.join(tmp, 'report') });
  const fresh = s.pages.flatMap((p) => p.findings.filter((f) => !f.sameAs && f.type !== 'coverage').map((f) => ({ p, f })));
  assert.ok(fresh.length >= 5, `expected the demo's changes, got ${fresh.length} findings`);
  assert.ok(s.model && fresh.every(({ f }) => typeof f.score === 'number'), 'every finding is scored');
  const flagged = fresh.filter(({ f }) => f.modelFlag || f.obvious);
  for (const { p, f } of fresh) console.log(`  ${f.score.toFixed(3)} ${f.modelFlag ? 'FLAG' : '    '} ${p.page}/${p.state} #${f.n} ${f.changes[0].slice(0, 70)}`);
  assert.strictEqual(flagged.length, 0, `the model flags ${flagged.length} deliberate demo change(s) at threshold ${s.model.thresholds.flag.toFixed(3)}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`demo: ok (${fresh.length} findings, highest score ${Math.max(...fresh.map(({ f }) => f.score)).toFixed(3)}, flag threshold ${s.model.thresholds.flag.toFixed(3)})`);
})().catch((e) => { console.error(e.message); console.error(`report kept in ${tmp}`); process.exit(1); });
