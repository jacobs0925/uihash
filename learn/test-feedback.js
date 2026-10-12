// node learn/test-feedback.js: the comment asks about each fresh finding, a reviewer's ticks parse into
// labels by finding id, and an updated comment keeps the ticks of the findings it still has
const assert = require('assert');
const { commentMd, findingId, feedbackOf, keepFeedback } = require('../src/pr.js');

const f = (n, changes, extra = {}) => ({ n, severity: 'error', type: 'changed', path: `html > body > p.x${n}`, changes, head: [], base: [], triage: 'yours', places: 1, elements: 1, ...extra });
const page = { page: 'Inbox', state: 'default', vp: '', pass: false, ok: false, errors: 2, status: 'changed',
  findings: [f(1, ['border-radius: 16px → 12px']), f(2, ['text: "Help" → "Hlep"']), f(3, ['border-radius: 16px → 12px'], { sameAs: { page: 'Inbox', state: 'x', n: 1 } })] };
const s = { signature: 'x', targets: 1, changed: 1, failed: 1, fresh: 0, ms: 1000, feedback: true, pages: [page] };
const md = commentMd(s);
const [id1, id2] = page.findings.slice(0, 2).map((x) => findingId(page, x));
assert.ok(md.includes(`<!-- uihash-f:${id1}:deliberate -->`) && md.includes(`<!-- uihash-f:${id2}:mistake -->`));
assert.strictEqual((md.match(/^- \[ \]/gm) || []).length, 4, 'two boxes per fresh finding, none for a repeat');
assert.doesNotMatch(commentMd({ ...s, feedback: false }), /uihash-f:/);

// a reviewer ticks #1 intended and #2 a mistake
const tick = (body, id, side) => body.replace(new RegExp(`^- \\[ \\] (.*<!-- uihash-f:${id}:${side} -->)$`, 'm'), '- [x] $1');
const reviewed = tick(tick(md, id1, 'deliberate'), id2, 'mistake');
assert.deepStrictEqual(feedbackOf(reviewed), { [id1]: 'deliberate', [id2]: 'mistake' });
// both boxes of one finding ticked: no label
assert.deepStrictEqual(feedbackOf(tick(reviewed, id1, 'mistake')), { [id2]: 'mistake' });

// a later push: #2 is gone, a new finding appears; #1's tick is kept, nothing else is ticked
const page2 = { ...page, findings: [page.findings[0], f(4, ['gap: 4px → 8px'])] };
const kept = keepFeedback(reviewed, commentMd({ ...s, pages: [page2] }));
assert.deepStrictEqual(feedbackOf(kept), { [id1]: 'deliberate' });
assert.strictEqual((kept.match(/^- \[x\]/gm) || []).length, 1);
console.log('feedback: ok');
