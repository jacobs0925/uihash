// node learn/test-gate.js: the promotion gate passes a candidate that ranks as well as the current model
// and fails one that ranks worse, flags fewer mistakes or more intended changes; regressions and the
// mistake side of mixed PRs count together, and the slack grows with the set
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
assert.match(loose.sets[0].why.join(' '), /intended changes left alone: 0 vs 16 of 20/);
// same ranking, but a threshold that flags nothing
const tight = gate(rows, cur, toy(10, 0.9999));
assert.strictEqual(tight.pass, false);
assert.match(tight.sets[0].why.join(' '), /mistakes flagged: 0 vs 16 of 20/);
assert.strictEqual(gate([], cur, cur).pass, false, 'nothing to gate on: no promotion');

// a trade: the current model (feature a) flags 10 regressions the candidate (feature b) misses, and the
// candidate flags the mistake side of 10 mixed PRs the current model misses: 20 mistakes flagged each
const two = (wa, wb) => ({ kind: 'logistic', features: ['a', 'b'], mean: [0, 0], scale: [1, 1], coef: [wa, wb], intercept: -(wa + wb) / 2, thresholds: { flag: 0.5, obvious: 0.99 } });
const mixedRows = [];
const add = (pr, kind, side, a, b) => mixedRows.push({ split: 'eval', set: 'apps', pr, kind, side, triage: 'yours', x: { a, b } });
for (let i = 0; i < 10; i++) add(`r${i}`, 'regression', 'mistake', 0.9, 0.1);
for (let i = 10; i < 20; i++) add(`r${i}`, 'regression', 'mistake', 0.9, 0.9);
for (let i = 0; i < 10; i++) { add(`m${i}`, 'mixed', 'mistake', 0.1, 0.9); add(`m${i}`, 'mixed', 'deliberate', 0.1, 0.1); }
for (let i = 0; i < 20; i++) add(`d${i}`, 'deliberate', 'deliberate', 0.1, 0.1);
const trade = gate(mixedRows, two(10, 0), two(0, 10));
assert.deepStrictEqual([trade.sets[0].current.reg, trade.sets[0].candidate.reg, trade.sets[0].current.mm, trade.sets[0].candidate.mm], [20, 10, 0, 10]);
assert.strictEqual(trade.pass, true, `the same mistakes in all pass: ${trade.sets[0].why}`);

// the slack: 5 % of the PRs a side counts, at least 1. 100 deliberate PRs: 5 more flagged pass, 6 fail
const big = (k) => {
  const rs = [];
  for (let i = 0; i < 20; i++) rs.push({ split: 'eval', set: 'big', pr: `r${i}`, kind: 'regression', side: 'mistake', triage: 'yours', x: { bad: 0.9 } });
  for (let i = 0; i < 100; i++) rs.push({ split: 'eval', set: 'big', pr: `d${i}`, kind: 'deliberate', side: 'deliberate', triage: 'yours', x: { bad: i < k ? 0.55 : 0.1 } });
  return gate(rs, toy(10, 0.7), toy(10, 0.6));
};
assert.strictEqual(big(5).pass, true, `5 of 100: ${big(5).sets[0].why}`);
assert.strictEqual(big(6).pass, false);
assert.match(big(6).sets[0].why.join(' '), /intended changes left alone: 94 vs 100 of 100 \(at most 5 fewer\)/);
console.log('gate: ok');
