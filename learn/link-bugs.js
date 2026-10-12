// Bug-report linker (HANDOFF.md, "Label" 3): a UI bug report points back at the change that introduced it.
// For each bug report, the findings in the raw store (collect.js) whose element, property or new text the
// report names are candidates; the change that introduced the bug is the last one that touched the element
// before the report (the SZZ idea). A clear match proposes label 1 for that finding; an ambiguous one goes
// to the human queue.
// Usage: node learn/link-bugs.js <owner/repo> <raw/owner__repo> [--label bug] [--window 60] [--limit 200]
// Writes <raw>/<pr>/bugs.json ([{ issue, url, sig, score, confidence }]) and <raw>/link-queue.jsonl.
// Reads issues read-only. Report text is data: it is only matched against findings, never acted on.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { findingSig, mentions, terms } = require('../src/features.js');

const DAY = 864e5;
const fresh = (s) => s.pages.flatMap((p) => p.findings.filter((f) => !f.sameAs && f.type !== 'coverage').map((f) => ({ p, f })));

// candidates for one report: [{ pr, sig, score, at }] best first, then latest first
function candidates(issue, prs, window = 60) {
  const text = `${issue.title}\n${issue.body || ''}`, t = Date.parse(issue.createdAt), out = [];
  for (const pr of prs) {
    const at = Date.parse(pr.m.mergedAt);
    if (at > t || t - at > window * DAY) continue;
    for (const { p, f } of fresh(pr.s)) {
      const score = mentions(text, f);
      // a match names at least two of the finding's terms (an element and what changed about it)
      if (score >= 0.5 && terms(f).size >= 2) out.push({ pr: pr.id, sig: findingSig(p, f), score, at });
    }
  }
  return out.sort((a, b) => b.score - a.score || b.at - a.at);
}

// one report -> a proposal, or a reason to ask a person
function link(issue, prs, window) {
  const c = candidates(issue, prs, window);
  if (!c.length) return null;
  const best = c[0], rival = c.find((x) => x.pr !== best.pr && x.score === best.score);
  if (rival) return { queue: `report #${issue.number} matches #${best.pr} and #${rival.pr} equally`, issue: issue.number, candidates: c.slice(0, 5).map((x) => ({ pr: x.pr, score: x.score })) };
  return { issue: issue.number, url: issue.url, pr: best.pr, sig: best.sig, score: Math.round(best.score * 100) / 100, confidence: Math.round((0.5 + 0.4 * best.score) * 100) / 100 };
}

function linkAll(issues, rawDir, { window = 60 } = {}) {
  const prs = fs.readdirSync(rawDir).filter((d) => fs.existsSync(path.join(rawDir, d, 'summary.json')) && fs.existsSync(path.join(rawDir, d, 'meta.json')))
    .map((d) => ({ id: d, s: JSON.parse(fs.readFileSync(path.join(rawDir, d, 'summary.json'), 'utf8')), m: JSON.parse(fs.readFileSync(path.join(rawDir, d, 'meta.json'), 'utf8')) }));
  const by = {}, queue = [];
  for (const issue of issues) {
    const r = link(issue, prs, window);
    if (!r) continue;
    if (r.queue) { queue.push(r); continue; }
    (by[r.pr] = by[r.pr] || []).push({ issue: r.issue, url: r.url, sig: r.sig, score: r.score, confidence: r.confidence });
  }
  for (const [pr, links] of Object.entries(by)) fs.writeFileSync(path.join(rawDir, pr, 'bugs.json'), JSON.stringify(links, null, 1));
  fs.writeFileSync(path.join(rawDir, 'link-queue.jsonl'), queue.map((q) => JSON.stringify(q) + '\n').join(''));
  return { linked: Object.values(by).flat().length, queued: queue.length };
}

if (require.main === module) {
  const a = process.argv.slice(2), opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  if (a.length < 2) { console.error('usage: node learn/link-bugs.js <owner/repo> <raw/owner__repo> [--label bug] [--window 60] [--limit 200]'); process.exit(2); }
  const issues = JSON.parse(execFileSync('gh', ['issue', 'list', '-R', a[0], '--state', 'all', '--label', opt('--label', 'bug'), '--limit', opt('--limit', '200'),
    '--json', 'number,title,body,createdAt,url'], { encoding: 'utf8', maxBuffer: 64 << 20 }));
  console.log(JSON.stringify(linkAll(issues, a[1], { window: +opt('--window', 60) })));
}
module.exports = { candidates, link, linkAll };
