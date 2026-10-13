// node learn/public/test-restores.js: label.js on a repository with restores (restores.json, as walk.js writes it
// for Lovable's "Reverted to commit <sha>"): discarded commits are regressions, flip-flops and restores stay
// unlabelled, and commits the person kept editing after are intended
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uihash-restores-'));
const order = 'T A B R1 C R2 D E F G H R3 J K L M N'.split(' ');
order.forEach((sha, i) => {
  const d = path.join(dir, sha);
  fs.mkdirSync(d);
  fs.writeFileSync(path.join(d, 'meta.json'), JSON.stringify({ repo: 'app', sha, parent: order[i - 1] || 'P', date: `2026-01-${String(10 + i).padStart(2, '0')}`,
    subject: sha.startsWith('R') ? 'Reverted to commit x' : `Change ${sha}`, components: [`c${i}`], files: [], snapshotsUpdated: [], changeset: '' }));
  fs.writeFileSync(path.join(d, 'summary.json'), JSON.stringify({ pages: [{ page: 'home', state: 'default', vp: '', findings: [
    { type: 'changed', path: `html > body > div.c${i}`, changes: [`padding: ${i}px → ${i + 1}px`] }] }] }));
});
fs.writeFileSync(path.join(dir, 'restores.json'), JSON.stringify({ order, restores: [
  { sha: 'R1', target: 'T', undone: ['A', 'B'] },
  { sha: 'R2', target: 'B', undone: ['R1', 'C'] },        // back to B: A and B were wanted after all, C was not
  { sha: 'R3', target: 'E', undone: ['F', 'G', 'H'] },
] }));
execFileSync(process.execPath, [path.join(__dirname, 'label.js'), dir], { encoding: 'utf8' });
const L = (sha) => { const f = path.join(dir, sha, 'label.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const got = Object.fromEntries(order.map((s) => [s, L(s) && [L(s).label, L(s).source, L(s).confidence]]));
assert.deepStrictEqual(got, {
  T: [0, 'kept', 0.6], A: null, B: null, R1: null, C: [1, 'restore', 0.85], R2: null, D: [0, 'kept', 0.6], E: [0, 'kept', 0.6],
  F: [1, 'restore', 0.75], G: [1, 'restore', 0.75], H: [1, 'restore', 0.75], R3: null,
  J: null, K: null, L: null, M: null, N: null,             // fewer than 5 later commits: too recent to count as kept
});
fs.rmSync(dir, { recursive: true, force: true });
console.log('restores: ok');
