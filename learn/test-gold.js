// node learn/test-gold.js: scoring the history labels and the judge's verdicts against a person's gold labels
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { auroc, scoreOf, compare, markdown } = require('./gold.js');

assert.strictEqual(auroc([{ y: 1, score: 0.9 }, { y: 0, score: 0.1 }]), 1);
assert.strictEqual(auroc([{ y: 1, score: 0.5 }, { y: 0, score: 0.5 }]), 0.5);
assert.strictEqual(auroc([{ y: 1, score: 0.9 }]), null);
assert.deepStrictEqual([scoreOf({ verdict: 'regression', confidence: 0.8 }), scoreOf({ verdict: 'intended', confidence: 0.8 }), scoreOf({ verdict: 'unsure', confidence: 1 })], [0.9, 0.09999999999999998, 0.5]);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uihash-gold-'));
const commit = (sha, history, judge) => {
  const d = path.join(tmp, 'app', sha); fs.mkdirSync(d, { recursive: true });
  if (history != null) fs.writeFileSync(path.join(d, 'label.json'), JSON.stringify({ label: history, source: 'restore' }));
  fs.writeFileSync(path.join(d, 'judge.json'), JSON.stringify({ model: 'claude-haiku-5-5', usage: { input: 5000, output: 1000 }, ...judge }));
};
commit('aaaa1111', 1, { verdict: 'regression', confidence: 0.9 });
commit('bbbb2222', 1, { verdict: 'intended', confidence: 0.6 });        // history and judge disagree; the person says intended
commit('cccc3333', null, { verdict: 'unsure', confidence: 0.4 });
commit('dddd4444', 0, { verdict: 'intended', confidence: 0.9 });
const labels = [{ app: 'app', sha: 'aaaa', verdict: 'regression' }, { app: 'app', sha: 'bbbb', verdict: 'intended' },
  { app: 'app', sha: 'cccc', verdict: 'regression' }, { app: 'app', sha: 'dddd', verdict: 'intended' },
  { app: 'app', sha: 'eeee', verdict: 'intended' }, { app: 'app', sha: 'aaaa', verdict: 'unsure' }];
const r = compare(tmp, labels);
assert.strictEqual(r.n, 4);                                 // the unwalked commit and the can't-tell label are left out
const h = r.rows.find((x) => x.name === 'history'), j = r.rows.find((x) => x.name === 'judge');
assert.deepStrictEqual([h.decided, h.agree, h.recallRegression, h.recallIntended], [3, 2 / 3, 1, 0.5]);
assert.deepStrictEqual([j.decided, j.agree, j.recallRegression], [3, 1, 1]);
assert.strictEqual(j.auroc, 1);                             // unsure (0.5) still ranks above both intended verdicts
assert.ok(Math.abs(j.dollarsPer1000 - 1) < 1e-9);           // 5000 × $0.10 + 1000 × $0.50 per million, per commit
assert.ok(markdown(r).includes('| judge | 4 | 3 | 100% |'));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('gold: ok');
