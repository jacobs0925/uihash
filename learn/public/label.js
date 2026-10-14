// Labels for the commits walk.js checked, from the evidence a public repository leaves behind:
//   reverted later ("Revert "<subject>""), or a later commit undid some of its changes (undo.js)
//       -> label 1: the undone findings are the mistake side, the rest deliberate (sides.json)
//   thrown away by a tool's restore (restores.json, from walk.js: Lovable's "Reverted to commit <sha>" puts the
//   project back to an earlier commit exactly), unless a later restore brought it back (the user changed their mind)
//       -> label 1, all findings: the person looked at the change and discarded it. A restore is never labelled
//          by restores, and the more commits one restore discards at once, the lower the confidence
//   it updated visual-test baselines, or carries a changeset describing the change, and nothing undid it
//       -> label 0 (intended)
//   in a repository with restores, nothing undid it and the person went on editing (KEPT later commits): undoing it
//   was one click away -> label 0 (intended, source "kept")
//   no evidence either way -> no label.json: the commit stays out of training until evidence arrives
// Every label says where it came from (source, confidence, evidence). Rerun after each walk: labels
// change as later commits arrive. Usage: node learn/public/label.js <dataDir>/<repo> [--window 60]
const fs = require('fs');
const path = require('path');
const { undone } = require('../undo.js');
const { hasSummary, summaryOf } = require('../dataset.js');
const { flakySigs, withoutFlaky } = require('../flaky.js');

const dir = process.argv[2];
const WINDOW = +(process.argv.includes('--window') ? process.argv[process.argv.indexOf('--window') + 1] : 60);
const KEPT = 5;
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sigOf = (p, f) => [p.page, p.state, p.vp, f.type, f.path, ...f.changes].join('|');
const day = (d) => Date.parse(d) / 864e5;

const all = fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'meta.json')) && hasSummary(path.join(dir, d)))
  .map((d) => ({ d: path.join(dir, d), meta: read(path.join(dir, d, 'meta.json')) })).sort((a, b) => a.meta.date.localeCompare(b.meta.date));
// findings that recur word for word in many commits are noise (flaky.js): left out of every summary, and listed
// for dataset.js
const flaky = flakySigs(all.map((x) => summaryOf(x.d)));
fs.writeFileSync(path.join(dir, 'flaky.json'), JSON.stringify([...flaky].sort(), null, 1));
const summary = (x) => x.s || (x.s = withoutFlaky(summaryOf(x.d), flaky));
const findings = (x) => summary(x).pages.reduce((k, p) => k + p.findings.length, 0);

// restores, in order: each throws away the commits between its target and itself; one whose target is a commit an
// earlier restore threw away brings that commit and the ones before it in the same range back (flip-flops are
// left unlabelled, and so are restores themselves)
const R = fs.existsSync(path.join(dir, 'restores.json')) ? read(path.join(dir, 'restores.json')) : null;
const thrown = new Map(), flipped = new Set(), position = new Map(R ? R.order.map((s, i) => [s, i]) : []);
if (R) {
  const restore = new Set(R.restores.map((r) => r.sha));
  for (const r of R.restores) {
    for (const [s, t] of [...thrown]) {
      const k = t.by.undone.indexOf(r.target);
      if (k >= 0 && t.by.undone.indexOf(s) <= k) { thrown.delete(s); flipped.add(s); }
    }
    const discarded = r.undone.filter((s) => !restore.has(s));
    for (const s of discarded) if (!thrown.has(s)) thrown.set(s, { by: r, n: discarded.length });
  }
  for (const s of restore) flipped.add(s);
}

const counts = { regression: 0, intended: 0, unlabelled: 0, empty: 0 };
for (let i = 0; i < all.length; i++) {
  const a = all[i], m = a.meta;
  for (const f of ['label.json', 'sides.json']) fs.rmSync(path.join(a.d, f), { force: true });
  if (!findings(a)) { counts.empty++; continue; }
  const subj = m.subject.replace(/ \(#\d+\)$/, '');
  const revert = all.slice(i + 1).find((b) => b.meta.subject.startsWith(`Revert "${subj}`));
  const undos = [];
  for (const b of all.slice(i + 1)) {
    if (day(b.meta.date) - day(m.date) > WINDOW) break;
    if (!findings(b) || !b.meta.components.some((c) => m.components.includes(c))) continue;
    for (const u of undone(summary(a), summary(b))) undos.push({ ...u, by: b.meta });
  }
  const app = m.repo, base = { app, group: app, sha: m.sha, date: m.date, pr: m.pr || null, title: m.subject };
  const t = thrown.get(m.sha);
  if (t && !revert && !flipped.has(m.sha)) {
    fs.writeFileSync(path.join(a.d, 'label.json'), JSON.stringify({ ...base, label: 1, source: 'restore', confidence: t.n <= 2 ? 0.85 : t.n <= 4 ? 0.75 : 0.6,
      evidence: `thrown away by ${t.by.sha.slice(0, 8)}, which restored ${t.by.target.slice(0, 8)} (${t.n} commit${t.n > 1 ? 's' : ''} discarded)` }, null, 1));
    counts.regression++;
  } else if (revert || undos.length) {
    const mistake = new Set(revert ? summary(a).pages.flatMap((p) => p.findings.map((f) => sigOf(p, f))) : undos.map((u) => u.a));
    const sides = {};
    for (const p of summary(a).pages) for (const f of p.findings) sides[sigOf(p, f)] = mistake.has(sigOf(p, f)) ? 'mistake' : 'deliberate';
    const fixy = revert || undos.some((u) => /\bfix|regress|revert|restore|broken/i.test(u.by.subject));
    fs.writeFileSync(path.join(a.d, 'label.json'), JSON.stringify({ ...base, label: 1, source: revert ? 'revert' : 'undo', confidence: revert ? 0.9 : fixy ? 0.85 : 0.7,
      evidence: revert ? `reverted by ${revert.meta.sha.slice(0, 8)} "${revert.meta.subject}"` : undos.slice(0, 3).map((u) => `${u.prop}: ${u.from} → ${u.to} undone by ${u.by.sha.slice(0, 8)} "${u.by.subject}"`).join('; ') }, null, 1));
    if (!revert) fs.writeFileSync(path.join(a.d, 'sides.json'), JSON.stringify(sides));
    counts.regression++;
  } else if (m.snapshotsUpdated.length || m.changeset.trim()) {
    fs.writeFileSync(path.join(a.d, 'label.json'), JSON.stringify({ ...base, label: 0, source: m.snapshotsUpdated.length ? 'baseline-update' : 'changeset',
      confidence: m.snapshotsUpdated.length ? 0.7 : 0.6, evidence: m.snapshotsUpdated.length ? `${m.snapshotsUpdated.length} visual-test baselines updated` : m.changeset.replace(/---[\s\S]*?---/, '').trim().slice(0, 300) }, null, 1));
    counts.intended++;
  } else if (R && position.has(m.sha) && !flipped.has(m.sha) && R.order.length - 1 - position.get(m.sha) >= KEPT) {
    fs.writeFileSync(path.join(a.d, 'label.json'), JSON.stringify({ ...base, label: 0, source: 'kept', confidence: 0.6,
      evidence: `not restored away or undone; ${R.order.length - 1 - position.get(m.sha)} later commits` }, null, 1));
    counts.intended++;
  } else counts.unlabelled++;
}
console.log(`${dir}: ${all.length} commits checked; ${counts.regression} labelled regression, ${counts.intended} labelled intended, ${counts.unlabelled} without evidence, ${counts.empty} with no findings (${flaky.size} recurring findings left out as noise)`);
