// The human queue and the weekly audit (HANDOFF.md, "Label" 5), on the command line.
// Usage: node learn/review.js queue <raw/owner__repo> <queue.jsonl>...   answer the PRs the labelers disagree on
//        node learn/review.js audit <labelled dir> [--n 20] [--seed 1]   check a random sample of labelled findings
// For every finding it shows where it is, what changed and where it comes from, and reads one answer per
// line from stdin: i (intended), m (a mistake), s (skip), q (quit).
//   queue: answers go to <raw>/<pr>/human.json (finding signature -> side), which label.js treats as a
//          person's labels (confidence 1, over comment ticks and every other labeler)
//   audit: answers go to <labelled dir>/audit.jsonl with each label's source, and the per-source accuracy is
//          printed: set the labelers' confidences from it
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { findingSig } = require('../src/features.js');
const { why } = require('../src/pr.js');

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const fresh = (s) => s.pages.flatMap((p) => p.findings.filter((f) => !f.sameAs && f.type !== 'coverage').map((f) => ({ p, f })));
const show = (p, f) => `  ${p.page} / ${p.state}${p.vp ? ' @ ' + p.vp : ''}  #${f.n}  ${f.path.split(' > ').slice(-3).join(' > ')}\n    ${f.changes.slice(0, 3).join('; ')}\n    ${why(f, p.edits) || f.triage || ''}`;

async function answers() {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  const it = rl[Symbol.asyncIterator]();
  return async (q) => { process.stdout.write(q); const r = await it.next(); if (r.done) return 'q'; const a = r.value.trim().toLowerCase(); process.stdout.write(process.stdin.isTTY ? '' : a + '\n'); return a; };
}
const SIDE = { i: 'deliberate', m: 'mistake' };

async function queue(raw, files) {
  const ask = await answers(), prs = new Set();
  for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
    const q = JSON.parse(l);
    if (q.pr) prs.add(String(q.pr));
    for (const c of q.candidates || []) prs.add(String(c.pr));
  }
  let n = 0;
  // oldest PR first (PR numbers grow with time)
  for (const pr of [...prs].sort((a, b) => (+a || 0) - (+b || 0) || a.localeCompare(b))) {
    const d = path.join(raw, pr);
    if (!fs.existsSync(path.join(d, 'summary.json'))) continue;
    const s = read(path.join(d, 'summary.json')), m = fs.existsSync(path.join(d, 'meta.json')) ? read(path.join(d, 'meta.json')) : {};
    const file = path.join(d, 'human.json'), human = fs.existsSync(file) ? read(file) : {};
    console.log(`\nPR #${pr}: ${m.title || ''}`);
    for (const { p, f } of fresh(s)) {
      const sig = findingSig(p, f);
      if (human[sig]) continue;
      console.log(show(p, f));
      const a = await ask('  intended, mistake, skip or quit? [i/m/s/q] ');
      if (a === 'q') { fs.writeFileSync(file, JSON.stringify(human, null, 1)); return n; }
      if (SIDE[a]) { human[sig] = SIDE[a]; n++; }
    }
    if (Object.keys(human).length) fs.writeFileSync(file, JSON.stringify(human, null, 1));
  }
  return n;
}

async function audit(dir, n = 20, seed = 1) {
  const { rowsOf } = require('./dataset.js');
  const rows = rowsOf(dir, 'audit');
  let s = seed >>> 0; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  // a sample from every label source, so each source's accuracy gets measured
  const by = {};
  for (const x of rows) (by[x.source] = by[x.source] || []).push(x);
  const per = Math.max(1, Math.ceil(n / Object.keys(by).length)), pick = [];
  for (const list of Object.values(by)) for (let k = 0; k < per && list.length; k++) pick.push(list.splice(Math.floor(r() * list.length), 1)[0]);
  const ask = await answers(), out = path.join(dir, 'audit.jsonl');
  for (const x of pick) {
    const pr = x.pr.split('/').pop(), root = fs.existsSync(path.join(dir, 'prs')) ? path.join(dir, 'prs') : dir;
    const s2 = read(path.join(root, pr, 'summary.json')), hit = fresh(s2).find(({ p, f }) => findingSig(p, f) === x.sig);
    if (!hit) continue;
    console.log(`\n${x.pr}`); console.log(show(hit.p, hit.f));
    const a = await ask('  intended, mistake, skip or quit? [i/m/s/q] ');
    if (a === 'q') break;
    if (SIDE[a]) fs.appendFileSync(out, JSON.stringify({ pr: x.pr, sig: x.sig, source: x.source, label: x.side, person: SIDE[a], at: new Date().toISOString() }) + '\n');
  }
  return accuracy(out);
}

// per label source: how often the label agreed with the person
function accuracy(file) {
  const acc = {};
  if (!fs.existsSync(file)) return acc;
  for (const l of fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
    const x = JSON.parse(l), a = acc[x.source] = acc[x.source] || { n: 0, agree: 0 };
    a.n++; if (x.label === x.person) a.agree++;
  }
  for (const a of Object.values(acc)) a.accuracy = Math.round((a.agree / a.n) * 100) / 100;
  return acc;
}

if (require.main === module) {
  const [mode, ...a] = process.argv.slice(2), opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const done = (x) => { console.log('\n' + JSON.stringify(x)); process.exit(0); };
  if (mode === 'queue' && a.length >= 2) queue(a[0], a.slice(1)).then((n) => done({ answered: n }));
  else if (mode === 'audit' && a[0]) audit(a[0], +opt('--n', 20), +opt('--seed', 1)).then(done);
  else { console.error('usage: node learn/review.js queue <raw/owner__repo> <queue.jsonl>... | audit <labelled dir> [--n 20] [--seed 1]'); process.exit(2); }
}
module.exports = { queue, audit, accuracy };
