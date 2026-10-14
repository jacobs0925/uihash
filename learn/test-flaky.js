// node learn/test-flaky.js: a finding that comes back word for word in 5 or more commits is noise (flaky.js);
// the commit's other findings stay
const assert = require('assert');
const { flakySigs, withoutFlaky } = require('./flaky.js');

const hover = { type: 'loss', path: 'hover feedback', changes: ['hovering no longer changes 1 element: button.x'] };
const commit = (i) => ({ pages: [{ page: 'about', state: 'hover', findings: [hover, { type: 'same-data', path: `div.c${i}`, changes: [`padding: ${i}px → ${i + 1}px`] }] }] });
const five = [0, 1, 2, 3, 4].map(commit);
const flaky = flakySigs(five);
assert.strictEqual(flaky.size, 1, 'only the hover finding recurs');
assert.deepStrictEqual(withoutFlaky(five[2], flaky).pages[0].findings.map((f) => f.path), ['div.c2']);
assert.strictEqual(flakySigs(five.slice(0, 4)).size, 0, 'four commits are not enough');
assert.strictEqual(withoutFlaky(five[0], null), five[0]);
console.log('flaky: ok');
