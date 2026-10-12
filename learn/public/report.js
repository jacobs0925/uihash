// The end of a round (round.sh train): what the round found, and whether to propose its model. weekly.js
// has trained the candidates, picked the best on the held-out commits and run the promotion gate (gate.js)
// against the current model. The gate asks that a candidate be no worse; a round every two hours also
// asks that it be better, or every round would propose a model, and that the held-out sets be big enough
// for either to mean something:
//   wait     no candidate, or fewer than MIN_EVAL held-out regressions or intended changes so far
//   propose  there is no current model yet, or the gate passed and the candidate raises the mean held-out
//            AUROC by MARGIN (default 0.005) or more
//   keep     otherwise
// Writes <modelDir>/decision.json and <modelDir>/summary.md (the round as markdown: GitHub's job summary
// and the model PR's description) and appends a line to <dataDir>/history.jsonl.
// Usage: node learn/public/report.js <dataDir> <modelDir> <repo>...      (modelDir: weekly.js --out)
const fs = require('fs');
const path = require('path');
const { markdown } = require('../gate.js');

const [DATA, M, ...REPOS] = process.argv.slice(2);
const MIN = +(process.env.MIN_EVAL || 10), MARGIN = +(process.env.MARGIN || 0.005);
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const result = read(path.join(M, 'result.json'));
// train.py's numbers for the chosen candidate (any candidate's, for the training data, when none was chosen)
const metricsFile = path.join(M, `${result.best || result.candidates[0].name}.metrics.json`);
const metrics = fs.existsSync(metricsFile) ? read(metricsFile) : {};
const historyFile = path.join(DATA, 'history.jsonl');
const history = fs.existsSync(historyFile) ? fs.readFileSync(historyFile, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const last = history[history.length - 1];

// what each repository's walk has produced so far
const repos = {};
for (const r of REPOS) {
  const dir = path.join(DATA, r), c = repos[r] = { checked: 0, regression: 0, intended: 0, unlabelled: 0, empty: 0, failed: 0 };
  for (const sha of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const d = path.join(dir, sha), has = (f) => fs.existsSync(path.join(d, f));
    if (!has('meta.json')) { if (has('failed.json')) c.failed++; continue; }
    c.checked++;
    if (has('label.json')) c[read(path.join(d, 'label.json')).label ? 'regression' : 'intended']++;
    else if (read(path.join(d, 'meta.json')).findings) c.unlabelled++;
    else c.empty++;
  }
  c.new = c.checked - ((last && last.repos && last.repos[r] && last.repos[r].checked) || 0);
}

// the PRs the candidates were judged on
const held = { regression: new Set(), deliberate: new Set(), mixed: new Set() };
const rowsFile = path.join(M, 'rows.jsonl');
for (const l of fs.existsSync(rowsFile) ? fs.readFileSync(rowsFile, 'utf8').split('\n') : []) {
  if (!l) continue;
  const r = JSON.parse(l);
  if (r.split === 'eval') held[r.kind].add(r.pr);
}
const n = { regression: held.regression.size, deliberate: held.deliberate.size, mixed: held.mixed.size };
const pos = n.regression + n.mixed, neg = n.deliberate + n.mixed;

// mean AUROC of the current model and of the candidate over the sets the gate scored both on
const both = result.gate.sets.filter((s) => s.aurocCurrent !== null && s.aurocCandidate !== null);
const mean = (k) => both.reduce((a, s) => a + s[k], 0) / both.length;
let decision, reason;
if (!result.best) {
  decision = 'wait'; reason = 'no held-out set has both regressions and intended changes yet';
} else if (pos < MIN || neg < MIN) {
  decision = 'wait'; reason = `${pos} of ${MIN} held-out regressions and ${neg} of ${MIN} held-out intended changes so far: too few to judge a model on`;
} else if (result.pass && !result.gate.sets.length) {
  decision = 'propose'; reason = `${result.best} is the first model (there is no current one)`;
} else if (!result.pass) {
  decision = 'keep'; reason = `${result.best} did not pass the promotion gate: ${result.gate.sets.filter((s) => !s.pass).map((s) => `${s.set}: ${s.why.join('; ')}`).join(' / ')}`;
} else if (both.length && mean('aurocCandidate') >= mean('aurocCurrent') + MARGIN) {
  decision = 'propose'; reason = `${result.best} passed the promotion gate and raises the mean held-out AUROC from ${mean('aurocCurrent').toFixed(3)} to ${mean('aurocCandidate').toFixed(3)}`;
} else {
  decision = 'keep'; reason = `${result.best} passed the promotion gate but does not beat the current model by ${MARGIN} (mean held-out AUROC ${both.length ? `${mean('aurocCandidate').toFixed(3)} against ${mean('aurocCurrent').toFixed(3)}` : 'not comparable'})`;
}
const at = new Date().toISOString(), run = process.env.GITHUB_RUN_NUMBER ? +process.env.GITHUB_RUN_NUMBER : history.length + 1;
fs.writeFileSync(path.join(M, 'decision.json'), JSON.stringify({ decision, reason, propose: decision === 'propose', best: result.best, min: MIN, margin: MARGIN, held_out: n }, null, 1));
fs.appendFileSync(historyFile, JSON.stringify({ round: run, at, repos, decision, reason, best: result.best, pass: result.pass, held_out: n,
  candidates: result.candidates, gate: result.gate.sets.map((s) => ({ set: s.set, prs: s.prs, current: s.aurocCurrent, candidate: s.aurocCandidate, pass: s.pass })), ...metrics }) + '\n');

const f3 = (x) => (x === null || x === undefined ? 'n/a' : x.toFixed(3));
const src = metrics.train_sources || {}, synthetic = src.synthetic || 0;
const md = [
  `### uihash learn · round ${run} · ${at.slice(0, 16).replace('T', ' ')} UTC`, '',
  '| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |', '|---|---|---|---|---|---|---|---|',
  ...REPOS.map((r) => { const c = repos[r]; return `| ${r} | ${c.checked} | +${c.new} | ${c.regression} | ${c.intended} | ${c.unlabelled} | ${c.empty} | ${c.failed} |`; }), '',
  `Held out of training and judged on: ${n.regression} regressions, ${n.deliberate} intended changes, ${n.mixed} mixed.` +
    (metrics.train_prs ? ` Trained on ${metrics.train_prs} PRs (${synthetic} synthetic, ${metrics.train_prs - synthetic} labelled).` : ''), '',
  `Candidates (mean PR-level AUROC on the held-out commits): ${result.candidates.map((c) => `${c.name} ${f3(c.auroc)}${c.name === result.best ? ' (chosen)' : ''}`).join(', ')}.`, '',
  ...(result.gate.sets.length ? [markdown(result.gate).replace(/^# /, '#### ')] : []),
  ...(metrics.cv_auc_trees ? [`Cross-validation on the training data (variant ${metrics.variant}; whole operators or repositories held out): AUROC ${f3(metrics.cv_auc_logistic)} (logistic), ${f3(metrics.cv_auc_trees)} (trees).`, ''] : []),
  `**${{ wait: 'Collecting', propose: 'Proposing this model', keep: 'Keeping the current model' }[decision]}**: ${reason}.`, '',
];
fs.writeFileSync(path.join(M, 'summary.md'), md.join('\n'));
console.log(`${decision}: ${reason}`);
