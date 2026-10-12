// node learn/test-model.js [model.json ...]: the runtime scores what sklearn scored (the `checks` train.py
// stores in each model), scores land in the summary, and the comment adds model flags without ever
// dropping a rule's flag
const assert = require('assert');
const path = require('path');
const { loadModel, scoreOf, scoreSummary } = require('../src/model.js');
const { commentMd } = require('../src/pr.js');

const files = process.argv.slice(2);
if (!files.length) files.push(path.join(__dirname, 'model.json'));
for (const file of files) {
  const m = loadModel(file);
  assert.ok(m.checks && m.checks.length, `${file}: no checks`);
  for (const c of m.checks) assert.ok(Math.abs(scoreOf(m, c.x) - c.p) < 1e-6, `${file}: ${scoreOf(m, c.x)} vs sklearn ${c.p}`);
  console.log(`model ${path.basename(file)} (${m.kind}): ${m.checks.length} checks match sklearn`);
}

// a toy model: anything with the feature `broken_value` is a mistake, the rest intended
const toy = { kind: 'logistic', features: ['broken_value', 'type=changed'], mean: [0, 0], scale: [1, 1], coef: [12, 0], intercept: -6, thresholds: { flag: 0.5, obvious: 0.99 } };
const f = (n, triage, changes, type = 'changed') => ({ n, severity: 'error', type, path: `html > body > main > p.x${n}`, changes, head: [], base: [], triage, places: 1, elements: 1 });
const s = { signature: 'x', targets: 1, changed: 1, failed: 1, fresh: 0, ms: 1000,
  pages: [{ page: 'Inbox', state: 'default', vp: '', pass: false, ok: false, errors: 3, status: 'changed', findings: [
    f(1, 'yours', ['text: "12 items" → "NaN items"']),          // the model's catch: not flagged by the rules
    f(2, 'breaks', ['color: rgb(0, 0, 0) → rgb(250, 250, 250)']), // a rule flag the model scores low: kept
    f(3, 'yours', ['border-radius: 16px → 12px']),               // intended and unflagged by both
  ] }] };
assert.strictEqual(scoreSummary(s, toy), s);
const [a, b, c] = s.pages[0].findings;
assert.ok(a.score > 0.99 && a.obvious && a.modelFlag);
assert.ok(b.score < 0.01 && !b.modelFlag && !b.obvious);
assert.ok(c.score < 0.01 && !c.modelFlag);
assert.deepStrictEqual(s.model.thresholds, toy.thresholds);
const md = commentMd(s);
const first = md.split('**Look at these first:**')[1].split('\n\n')[1];
assert.match(first.split('\n')[0], /^- 🚫 model 1\.00 .*\*\*#1\*\*/, 'the obvious mistake comes first');
assert.match(first, /🚫 model 0\.00 .*\*\*#2\*\*/, 'the rule flag stays, with its score');
assert.doesNotMatch(first, /#3\*\*/, 'an intended change is not listed');
assert.match(md, /Triage model \(advisory\): 🚫 1 obvious mistake/);
// without a model nothing changes
const plain = JSON.parse(JSON.stringify(s));
delete plain.model; for (const x of plain.pages[0].findings) { delete x.score; delete x.obvious; delete x.modelFlag; }
assert.doesNotMatch(commentMd(plain), /model|🤖/);
console.log('model: ok');
