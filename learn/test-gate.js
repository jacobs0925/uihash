// node learn/test-gate.js: the promotion gate passes a candidate that ranks as well as the current model
// and fails one that ranks worse or flags more deliberate PRs
const assert = require('assert');
const { gate, auroc } = require('./gate.js');

assert.strictEqual(auroc([0.9, 0.8], [0.1, 0.8]), 0.875);
// toy models on one feature `bad`: the current one scores it, an inverted one scores the opposite
const toy = (coef, flag = 0.5) => ({ kind: 'logistic', features: ['bad'], mean: [0], scale: [1], coef: [coef], intercept: -coef / 2, thresholds: { flag, obvious: 0.99 } });
const rows = [];
for (let i = 0; i < 40; i++) {
  const reg = i % 2 === 1;
  rows.push({ split: 'eval', set: 'frozen', pr: `p${i}`, kind: reg ? 'regression' : 'deliberate', side: reg ? 'mistake' : 'deliberate', triage: 'yours', x: { bad: reg ? (i % 10 === 1 ? 0.3 : 0.9) : (i % 10 === 0 ? 0.6 : 0.1) } });
}
const cur = toy(10);
assert.strictEqual(gate(rows, cur, toy(10)).pass, true, 'the same model passes');
const worse = gate(rows, cur, toy(-10));
assert.strictEqual(worse.pass, false);
assert.match(worse.sets[0].why.join(' '), /AUROC worse/);
// same ranking, but a threshold that flags many more deliberate PRs
const loose = gate(rows, cur, toy(10, 0.01));
assert.strictEqual(loose.pass, false);
assert.match(loose.sets[0].why.join(' '), /deliberate PRs left alone/);
assert.strictEqual(gate([], cur, cur).pass, false, 'nothing to gate on: no promotion');
console.log('gate: ok');
