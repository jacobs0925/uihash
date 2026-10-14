// Findings that come back word for word in many commits of one repository are noise, not changes: a forced hover
// or focus state that depends on timing, a toast that is shown or not. A real change happens once (its undo is the
// reverse change), so a finding seen in FLAKY or more commits of a repository is left out of its labels
// (learn/public/label.js, which writes the list to <repo>/flaky.json) and of its training rows (dataset.js reads
// it). In milk-me-not one hover finding came back in 79 commits, and its flip-flops made 34 of the 40 "undo"
// regressions: 271 of the 534 commits with findings had nothing else.
const FLAKY = 5;
const sigOf = (p, f) => [p.page, p.state, p.vp, f.type, f.path, ...f.changes].join('|');

// the signatures found in k or more of the summaries
function flakySigs(summaries, k = FLAKY) {
  const n = new Map();
  for (const s of summaries) for (const sig of new Set(s.pages.flatMap((p) => p.findings.map((f) => sigOf(p, f))))) n.set(sig, (n.get(sig) || 0) + 1);
  return new Set([...n].filter(([, c]) => c >= k).map(([sig]) => sig));
}

// a summary without those findings
const withoutFlaky = (s, flaky) => (!flaky || !flaky.size ? s
  : { ...s, pages: s.pages.map((p) => ({ ...p, findings: p.findings.filter((f) => !flaky.has(sigOf(p, f))) })) });

module.exports = { FLAKY, flakySigs, withoutFlaky };
