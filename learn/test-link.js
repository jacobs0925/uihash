// node learn/test-link.js: a bug report links back to the finding it names (the last PR before the report),
// ties go to the human queue, label.js turns links and a person's answers into labels
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { linkAll } = require('./link-bugs.js');
const { label } = require('./label.js');
const { findingSig } = require('../src/features.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uihash-link-'));
const raw = path.join(tmp, 'raw', 'acme__shop');
const f = (n, p, changes) => ({ n, severity: 'error', type: 'changed', path: `html > body > ${p}`, changes, head: [], base: [], triage: 'yours', places: 1, elements: 1 });
const page = (findings) => ({ page: 'Shop', state: 'default', vp: '', findings });
function pr(n, day, title, findings) {
  const d = path.join(raw, String(n));
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'summary.json'), JSON.stringify({ signature: 's' + n, pages: [page(findings)] }));
  fs.writeFileSync(path.join(d, 'meta.json'), JSON.stringify({ pr: n, title, mergedAt: new Date(Date.UTC(2026, 8, day)).toISOString(), comment: null }));
}
const cart = f(1, 'div.grid > button.add-to-cart', ['color: rgb(255, 255, 255) → rgb(240, 240, 240) · ΔE00 3.0, perceptible']);
pr(1, 1, 'Grid spacing', [cart, f(2, 'div.grid', ['gap: 8px → 12px'])]);
pr(2, 3, 'Footer links', [f(1, 'footer > a.help', ['text: "Help" → "Support"'])]);
pr(3, 4, 'Header', [f(1, 'header > nav.tabs', ['padding: 4px → 6px']), f(2, 'header > button.menu', ['border-radius: 4px → 8px'])]);
pr(4, 5, 'Header again', [f(1, 'header > nav.tabs', ['padding: 6px → 4px']), f(2, 'header > button.menu', ['border-radius: 8px → 4px'])]);
const at = (day) => new Date(Date.UTC(2026, 8, day)).toISOString();
const issues = [
  { number: 41, title: 'Add-to-cart button text unreadable', body: 'The add to cart button in the grid looks washed out.', createdAt: at(6), url: 'u41' },
  { number: 42, title: 'Help link', body: 'Something about the weather', createdAt: at(6), url: 'u42' },                  // names too little
  { number: 43, title: 'Tabs nav padding looks off', body: 'header nav tabs padding', createdAt: at(10), url: 'u43' },     // #3 and #4 equally
  { number: 44, title: 'Add-to-cart button', body: 'add to cart button grid color', createdAt: at(0), url: 'u44' },        // before the PR: no link
];
const r = linkAll(issues, raw, { window: 60 });
assert.deepStrictEqual(r, { linked: 1, queued: 1 });
const bugs = JSON.parse(fs.readFileSync(path.join(raw, '1', 'bugs.json'), 'utf8'));
assert.deepStrictEqual(bugs.map((b) => [b.issue, b.sig]), [[41, findingSig(page([]), cart)]]);
assert.ok(bugs[0].confidence > 0.5 && bugs[0].confidence <= 0.9);
const q = JSON.parse(fs.readFileSync(path.join(raw, 'link-queue.jsonl'), 'utf8'));
assert.deepStrictEqual(q.candidates.map((c) => c.pr).sort(), ['3', '4']);

// a person answers the queue: #3's tabs padding a mistake, its menu radius intended; quits at #4
const rv = spawnSync(process.execPath, [path.join(__dirname, 'review.js'), 'queue', raw, path.join(raw, 'link-queue.jsonl')], { input: 'm\ni\nq\n', encoding: 'utf8' });
assert.strictEqual(rv.status, 0, rv.stderr);
const human = JSON.parse(fs.readFileSync(path.join(raw, '3', 'human.json'), 'utf8'));
assert.deepStrictEqual(Object.values(human), ['mistake', 'deliberate']);

const out = path.join(tmp, 'out');
label(raw, out, { now: Date.parse(at(60)), window: 30 });
const L = (n) => JSON.parse(fs.readFileSync(path.join(out, String(n), 'label.json'), 'utf8'));
assert.deepStrictEqual([L(1).label, L(1).source], [1, 'bug-report']);
assert.strictEqual(L(3).source.split('+')[0], 'human');
assert.strictEqual(L(3).label, 1);

// the audit: a sample of labelled findings checked by a person, accuracy per label source
const au = spawnSync(process.execPath, [path.join(__dirname, 'review.js'), 'audit', out, '--n', '4'], { input: 'm\nm\nm\nm\nm\nm\n', encoding: 'utf8' });
assert.strictEqual(au.status, 0, au.stderr);
const acc = JSON.parse(au.stdout.trim().split('\n').pop());
assert.ok(Object.keys(acc).length >= 2 && Object.values(acc).every((a) => a.n >= 1 && a.accuracy >= 0 && a.accuracy <= 1));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('link: ok');
