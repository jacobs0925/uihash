// Labels for the commits walk.js checked, from the evidence a public repository leaves behind:
//   reverted later ("Revert "<subject>""), or a later commit undid some of its changes (undo.js)
//       -> label 1: the undone findings are the mistake side, the rest deliberate (sides.json)
//   it updated visual-test baselines, or carries a changeset describing the change, and nothing undid it
//       -> label 0 (intended)
//   no evidence either way -> no label.json: the commit stays out of training until evidence arrives
// Every label says where it came from (source, confidence, evidence). Rerun after each walk: labels
// change as later commits arrive. Usage: node learn/public/label.js <dataDir>/<repo> [--window 60]
const fs = require('fs');
const path = require('path');
const { undone } = require('../undo.js');
const { hasSummary, summaryOf } = require('../dataset.js');

const dir = process.argv[2];
const WINDOW = +(process.argv.includes('--window') ? process.argv[process.argv.indexOf('--window') + 1] : 60);
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sigOf = (p, f) => [p.page, p.state, p.vp, f.type, f.path, ...f.changes].join('|');
const day = (d) => Date.parse(d) / 864e5;

const all = fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'meta.json')) && hasSummary(path.join(dir, d)))
  .map((d) => ({ d: path.join(dir, d), meta: read(path.join(dir, d, 'meta.json')) })).sort((a, b) => a.meta.date.localeCompare(b.meta.date));
const summary = (x) => x.s || (x.s = summaryOf(x.d));
const findings = (x) => summary(x).pages.reduce((k, p) => k + p.findings.length, 0);

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
  if (revert || undos.length) {
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
  } else counts.unlabelled++;
}
console.log(`${dir}: ${all.length} commits checked; ${counts.regression} labelled regression, ${counts.intended} labelled intended, ${counts.unlabelled} without evidence, ${counts.empty} with no findings`);
