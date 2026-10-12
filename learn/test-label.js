// node learn/test-label.js: the labelers on a small raw store (undo, approval, reviewer ticks, a
// disagreement for the human queue), and the rows dataset.js makes of what they write
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { label } = require('./label.js');
const { rowsOf } = require('./dataset.js');
const { commentMd, findingId } = require('../src/pr.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uihash-label-'));
const raw = path.join(tmp, 'raw', 'acme__app'), out = path.join(tmp, 'real-acme');
const f = (n, p, changes) => ({ n, severity: 'error', type: 'changed', path: `html > body > ${p}`, changes, head: [], base: [], triage: 'yours', places: 1, elements: 1 });
const page = (findings) => ({ page: 'Inbox', state: 'default', vp: '', pass: false, ok: false, errors: findings.length, status: 'changed', findings });
const day = (d) => new Date(Date.UTC(2026, 8, 1 + d)).toISOString();
function pr(n, d, title, findings, { approved = false, ticks = {} } = {}) {
  const s = { signature: 'sig' + n, targets: 1, changed: 1, failed: 1, fresh: 0, ms: 1, feedback: true, pages: [page(findings)] };
  let comment = commentMd(s);
  for (const [i, side] of Object.entries(ticks)) {
    const id = findingId(s.pages[0], findings[i]);
    comment = comment.replace(new RegExp(`^- \\[ \\] (.*<!-- uihash-f:${id}:${side} -->)$`, 'm'), '- [x] $1');
  }
  const dir = path.join(raw, String(n));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(s));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ repo: 'acme/app', pr: n, title, mergedAt: day(d), comment, approvedSignature: approved ? s.signature : null, labels: [] }));
}
const radius = (a, b) => f(1, 'nav > button.compose', [`border-radius: ${a} → ${b}`]);
pr(1, 0, 'Tidy the nav', [radius('16px', '12px'), f(2, 'nav > a.help', ['color: rgb(0, 0, 0) → rgb(9, 9, 9) · ΔE00 2.0, perceptible'])]);
pr(2, 2, 'Fix compose button radius', [radius('12px', '16px')]);                        // puts #1's radius back
pr(3, 3, 'Roomier toolbar', [f(1, 'header > div.toolbar', ['gap: 4px → 8px'])], { approved: true });
pr(4, 5, 'New footer', [f(1, 'footer > a', ['text: "Help" → "Hlep"']), f(2, 'footer', ['padding: 8px → 12px'])], { ticks: { 0: 'mistake', 1: 'deliberate' } });
pr(5, 6, 'Darker links', [f(1, 'main > a.more', ['color: rgb(0, 0, 200) → rgb(0, 0, 120) · ΔE00 9.0, clearly visible'])], { ticks: { 0: 'deliberate' } });
pr(6, 8, 'Revert link colour', [f(1, 'main > a.more', ['color: rgb(0, 0, 120) → rgb(0, 0, 200) · ΔE00 9.0, clearly visible'])]);
pr(7, 38, 'Newest', [f(1, 'main > h1', ['font-size: 20px → 22px'])], { approved: true });  // too recent to count as kept

const r = label(raw, out, { now: Date.parse(day(40)), window: 30 });
const L = (n) => JSON.parse(fs.readFileSync(path.join(out, String(n), 'label.json'), 'utf8'));
const S = (n) => JSON.parse(fs.readFileSync(path.join(out, String(n), 'sides.json'), 'utf8'));
assert.deepStrictEqual([L(1).label, L(1).source, L(1).confidence], [1, 'undo', 0.9]);
assert.deepStrictEqual(Object.values(S(1)).sort(), ['mistake', 'unknown'], 'only the undone change is known to be the mistake');
assert.deepStrictEqual([L(3).label, L(3).source, L(3).confidence], [0, 'approval', 0.6]);
assert.ok(!fs.existsSync(path.join(out, '3', 'sides.json')));
assert.deepStrictEqual([L(4).label, L(4).source], [1, 'human']);
assert.deepStrictEqual(Object.values(S(4)).sort(), ['deliberate', 'mistake']);
// #5: the reviewer said intended, a later PR put it back: a person decides, the reviewer's label stands meanwhile
const q = fs.readFileSync(path.join(out, 'queue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.deepStrictEqual(q.map((x) => x.pr), [5]);
assert.deepStrictEqual([L(5).label, L(5).source], [0, 'human']);
for (const n of [2, 6, 7]) assert.ok(!fs.existsSync(path.join(out, String(n))), `#${n} has no evidence yet`);
assert.strictEqual(r.queued, 1);

// rows: unknown sides are left out, the mixed PR keeps both sides
const rows = rowsOf(out, 'train');
assert.deepStrictEqual(rows.filter((x) => x.pr.endsWith('/1')).map((x) => x.side), ['mistake']);
assert.deepStrictEqual(rows.filter((x) => x.pr.endsWith('/4')).map((x) => [x.kind, x.side]).sort(), [['mixed', 'deliberate'], ['mixed', 'mistake']]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('label: ok');
