// Labelers for the self-improvement loop (HANDOFF.md, "Label"), cheapest evidence first, on the raw store
// collect.js fills. Each labelled PR becomes a labelled-PR directory dataset.js reads; PRs the labelers
// disagree on go to a human queue instead.
// Usage: node learn/label.js <raw/owner__repo> <outDir> [--now 2026-10-12] [--window 30]
//   1. reviewer ticks in the uihash comment (src/pr.js feedback): confidence 1, per finding
//   2. undo miner: a later PR (within --window days) put a change back: label 1, confidence 0.8
//      (0.9 when the later PR's title says fix, revert, regression...)
//   3. outcome: approved with `ui-change-approved` for exactly what it showed, and nothing of it undone
//      --window days later: label 0, confidence 0.6 (people also approve to get unblocked)
// Writes <outDir>/<pr>/{summary.json, label.json[, sides.json]} and <outDir>/queue.jsonl. A side of
// "unknown" in sides.json means no labeler knows that finding: dataset.js leaves it out.
const fs = require('fs');
const path = require('path');
const { undone } = require('./undo.js');
const { findingSig, findingId, feedbackOf } = require('../src/pr.js');

const FIX = /\b(fix|fixes|fixed|revert|reverts|regression|restore|restores|broke|broken|bug|hotfix|undo)\b/i;
const DAY = 864e5;
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const fresh = (s) => s.pages.flatMap((p) => p.findings.filter((f) => !f.sameAs && f.type !== 'coverage').map((f) => ({ p, f })));

function loadRaw(dir) {
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'summary.json')) && fs.existsSync(path.join(dir, d, 'meta.json')))
    .map((d) => ({ id: d, dir: path.join(dir, d), s: read(path.join(dir, d, 'summary.json')), m: read(path.join(dir, d, 'meta.json')) }))
    .sort((a, b) => a.m.mergedAt.localeCompare(b.m.mergedAt));
}

// every labeler's verdict on one PR: [{ source, label, confidence, sides: { sig: side }, evidence }]
function verdicts(pr, later, { window = 30, now = Date.now() } = {}) {
  const out = [], all = fresh(pr.s);
  // 1. reviewer ticks
  if (pr.m.comment) {
    const ticks = feedbackOf(pr.m.comment), sides = {};
    for (const { p, f } of all) { const t = ticks[findingId(p, f)]; if (t) sides[findingSig(p, f)] = t; }
    const n = Object.keys(sides).length, mistakes = Object.values(sides).filter((v) => v === 'mistake').length;
    if (mistakes) out.push({ source: 'human', label: 1, confidence: 1, sides, evidence: `reviewer marked ${mistakes} of ${all.length} changes a mistake` });
    else if (n && n === all.length) out.push({ source: 'human', label: 0, confidence: 1, sides, evidence: 'reviewer marked every change intended' });
  }
  // 2. undo miner
  const t0 = Date.parse(pr.m.mergedAt), back = {};
  let by = null;
  for (const q of later) {
    const t = Date.parse(q.m.mergedAt);
    if (t <= t0 || t - t0 > window * DAY) continue;
    const u = undone(pr.s, q.s);
    if (!u.length) continue;
    for (const x of u) back[x.a] = 'mistake';
    if (!by || FIX.test(q.m.title)) by = q;
  }
  if (by) out.push({ source: 'undo', label: 1, confidence: FIX.test(by.m.title) ? 0.9 : 0.8, sides: back,
    evidence: `${Object.keys(back).length} change(s) put back by #${by.m.pr} ("${String(by.m.title).slice(0, 80)}") within ${window} days` });
  // 3. approved and kept
  const approved = pr.m.approvedSignature && pr.m.approvedSignature === pr.s.signature;
  if (approved && !by && now - t0 >= window * DAY)
    out.push({ source: 'approval', label: 0, confidence: 0.6, sides: null, evidence: `approved with ui-change-approved, nothing undone within ${window} days` });
  return out;
}

// one label from the verdicts, or a reason to ask a person
function decide(vs, all) {
  if (!vs.length) return { skip: 'no evidence yet' };
  const human = vs.find((v) => v.source === 'human');
  // a person's per-finding ticks against another labeler on the same finding
  for (const v of vs.filter((x) => x !== human && x.sides)) for (const [sig, side] of Object.entries(v.sides))
    if (human && human.sides[sig] && human.sides[sig] !== side) return { queue: `${v.source} says ${side}, the reviewer ${human.sides[sig]}`, keep: human };
  if (!human && new Set(vs.map((v) => v.label)).size > 1) return { queue: vs.map((v) => `${v.source}: ${v.label}`).join(' vs ') };
  const best = human || vs.sort((a, b) => b.confidence - a.confidence)[0];
  // per-finding sides: the union of what the labelers know; with label 0 every finding is deliberate
  let sides = null;
  if (best.label === 1) {
    sides = {};
    for (const { p, f } of all) sides[findingSig(p, f)] = 'unknown';
    for (const v of vs) if (v.sides) Object.assign(sides, v.sides);
    if (human) Object.assign(sides, human.sides);
    // a PR with one finding: the PR's label is that finding's label
    if (all.length === 1) for (const k of Object.keys(sides)) if (sides[k] === 'unknown') sides[k] = 'mistake';
  }
  return { label: best.label, source: vs.map((v) => v.source).join('+'), confidence: Math.max(...vs.filter((v) => v.label === best.label).map((v) => v.confidence)),
    evidence: vs.map((v) => v.evidence).join('; '), sides };
}

function label(rawDir, outDir, opts = {}) {
  const prs = loadRaw(rawDir), queue = [], counts = {};
  const repo = path.basename(rawDir);
  fs.mkdirSync(outDir, { recursive: true });
  prs.forEach((pr, i) => {
    const all = fresh(pr.s);
    if (!all.length) return;
    let d = decide(verdicts(pr, prs.slice(i + 1), opts), all);
    if (d.queue) { queue.push({ repo, pr: pr.m.pr, title: pr.m.title, why: d.queue }); if (!d.keep) return; d = decide([d.keep], all); }
    if (d.skip) { counts.skipped = (counts.skipped || 0) + 1; return; }
    const out = path.join(outDir, pr.id);
    fs.mkdirSync(out, { recursive: true });
    fs.copyFileSync(path.join(pr.dir, 'summary.json'), path.join(out, 'summary.json'));
    fs.writeFileSync(path.join(out, 'label.json'), JSON.stringify({ label: d.label, source: d.source, confidence: d.confidence, group: repo, app: repo, evidence: d.evidence, pr: pr.m.pr, mergedAt: pr.m.mergedAt }, null, 1));
    if (d.sides) fs.writeFileSync(path.join(out, 'sides.json'), JSON.stringify(d.sides, null, 1));
    else fs.rmSync(path.join(out, 'sides.json'), { force: true });
    counts[d.source] = (counts[d.source] || 0) + 1;
  });
  fs.writeFileSync(path.join(outDir, 'queue.jsonl'), queue.map((q) => JSON.stringify(q) + '\n').join(''));
  return { counts, queued: queue.length };
}

if (require.main === module) {
  const a = process.argv.slice(2), opt = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  if (a.length < 2) { console.error('usage: node learn/label.js <raw/owner__repo> <outDir> [--now YYYY-MM-DD] [--window 30]'); process.exit(2); }
  const r = label(a[0], a[1], { window: +opt('--window') || 30, now: opt('--now') ? Date.parse(opt('--now')) : Date.now() });
  console.log(JSON.stringify(r));
}
module.exports = { label, verdicts, decide, loadRaw };
