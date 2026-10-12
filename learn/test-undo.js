// node learn/test-undo.js: a change and its revert pair up; an unrelated later change does not
const assert = require('assert');
const { undone } = require('./undo.js');
const pr = (findings) => ({ pages: [{ page: 'Inbox', state: 'default', vp: '', findings }] });
const A = pr([{ type: 'changed', path: 'html > body > nav.side > button.compose[0]', changes: ['border-radius: 16px → 12px', 'color: rgb(1, 2, 3) → rgb(4, 5, 6) · ΔE00 1.2, barely perceptible'] },
  { type: 'changed', path: 'html > body > footer > a', changes: ['text: "Help" → "Hlep"'] }]);
const B = pr([{ type: 'changed', path: 'html > body > nav.side > button.compose[0]', changes: ['border-radius: 12px → 16px'] },
  { type: 'changed', path: 'html > body > footer > a', changes: ['text: "Hlep" → "Help"'] },
  { type: 'changed', path: 'html > body > main', changes: ['gap: 4px → 8px'] }]);
const u = undone(A, B);
assert.deepStrictEqual(u.map((x) => x.prop).sort(), ['border-radius', 'text']);
assert.strictEqual(undone(B, A).length, 2);
assert.strictEqual(undone(A, pr([{ type: 'changed', path: 'html > body > main', changes: ['gap: 4px → 8px'] }])).length, 0);
console.log('undo: ok');
