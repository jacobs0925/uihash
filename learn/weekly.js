// Weekly retrain (HANDOFF.md, "Retrain, evaluate, gate"): rows, three candidates, the promotion gate, a
// dataset manifest, and (with --pr) a pull request with the new model for a person to merge.
// Usage: node learn/weekly.js --train <dir>... --eval <dir>... [--newest <dir>] [--current learn/model.json]
//                             [--split <dir>... [--holdout 0.2]] [--out data/weekly/<date>] [--pr]
//   --train   synthetic sets and real sets labelled above the confidence floor (label.js output)
//   --eval    frozen evaluation sets (never trained on, never relabelled by agents) and --newest
//   --newest  the newest month of real PRs, held out by time (also an evaluation set)
//   --split   sets that are both: a fixed share of each, chosen by hash, is held out (dataset.js --split;
//             the public repositories of learn/public/round.sh)
// The candidate is whichever of logistic, logistic --variant local and trees has the best mean PR-level
// AUROC over the evaluation sets; it replaces --current only if the gate passes. Agents never merge:
// --pr opens a pull request, a person merges it. Python: $PYTHON, else .venv's.
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const { gate, markdown, auroc } = require('./gate.js');
const { loadModel, scoreOf } = require('../src/model.js');

const ROOT = path.join(__dirname, '..');
const PY = process.env.PYTHON || [path.join(ROOT, '.venv', 'Scripts', 'python.exe'), path.join(ROOT, '.venv', 'bin', 'python')].find(fs.existsSync) || 'python3';
const CANDIDATES = [['logistic', 'all'], ['logistic', 'local'], ['trees', 'all']];

function args(argv) {
  const o = { train: [], eval: [], split: [] };
  let list = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--train' || a === '--eval' || a === '--split') list = a.slice(2);
    else if (a === '--pr') o.pr = true;
    else if (a.startsWith('--')) { o[a.slice(2)] = argv[++i]; list = null; }
    else if (list) o[list].push(a);
  }
  if (o.newest) o.eval.push(o.newest);
  return o;
}

function run(cmd, a, opts = {}) {
  const r = spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} ${a.slice(0, 2).join(' ')} failed:\n${(r.stderr || r.stdout || '').slice(-2000)}`);
  return r.stdout;
}

// mean PR-level AUROC of a model over the evaluation sets (as gate.js ranks them)
function meanAuroc(rows, m) {
  const ev = rows.filter((r) => r.split === 'eval'), out = [];
  for (const set of new Set(ev.map((r) => r.set))) {
    const per = new Map();
    for (const r of ev.filter((x) => x.set === set)) {
      const s = scoreOf(m, r.x), d = per.get(r.pr) || { kind: r.kind, max: 0, m: 0, d: 0 };
      d.max = Math.max(d.max, s); if (r.side === 'mistake') d.m = Math.max(d.m, s); else d.d = Math.max(d.d, s);
      per.set(r.pr, d);
    }
    const pos = [], neg = [];
    for (const v of per.values()) if (v.kind === 'regression') pos.push(v.max); else if (v.kind === 'deliberate') neg.push(v.max); else { pos.push(v.m); neg.push(v.d); }
    const a = auroc(pos, neg); if (a !== null) out.push(a);
  }
  return out.length ? out.reduce((k, x) => k + x, 0) / out.length : null;
}

// what the model was trained on: PRs per set and per label source, with their confidences
function manifest(rows) {
  const sets = {};
  for (const r of rows) {
    const s = sets[r.set] = sets[r.set] || { split: r.split, prs: new Set(), findings: 0, sources: {} };
    s.prs.add(r.pr); s.findings++;
    s.sources[r.source || 'unknown'] = s.sources[r.source || 'unknown'] || new Set();
    s.sources[r.source || 'unknown'].add(r.pr);
  }
  return Object.fromEntries(Object.entries(sets).map(([k, s]) => [k, { split: s.split, prs: s.prs.size, findings: s.findings, sources: Object.fromEntries(Object.entries(s.sources).map(([src, p]) => [src, p.size])) }]));
}

function weekly(o) {
  const date = new Date().toISOString().slice(0, 10);
  const out = path.resolve(o.out || path.join(ROOT, 'data', 'weekly', date));
  fs.mkdirSync(out, { recursive: true });
  const rowsFile = path.join(out, 'rows.jsonl');
  fs.writeFileSync(rowsFile, run(process.execPath, [path.join(__dirname, 'dataset.js'), '--train', ...o.train, ...(o.eval.length ? ['--eval', ...o.eval] : []),
    ...(o.split.length ? ['--split', ...o.split, '--holdout', o.holdout || '0.2'] : [])]));
  const rows = fs.readFileSync(rowsFile, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const cands = CANDIDATES.map(([kind, variant]) => {
    const name = `${kind}-${variant}`, file = path.join(out, `${name}.json`);
    run(PY, [path.join(__dirname, 'train.py'), rowsFile, file, path.join(out, `${name}.md`), '--kind', kind, '--variant', variant]);
    const m = loadModel(file);
    return { name, file, m, auroc: meanAuroc(rows, m) };
  });
  const best = cands.filter((c) => c.auroc !== null).sort((a, b) => b.auroc - a.auroc)[0] || null;
  const L = [`# Weekly triage model: ${date}`, '', '## Candidates (mean PR-level AUROC over the evaluation sets)', '',
    ...cands.map((c) => `- ${c.name}: ${c.auroc === null ? 'no evaluation PRs' : c.auroc.toFixed(3)}${c === best ? ' (chosen)' : ''}`), ''];
  let g = { pass: false, sets: [] };
  if (!best) L.push('No evaluation sets with both kinds of PR: nothing to choose or gate on, no promotion.');
  else if (!o.current || !fs.existsSync(o.current)) { g = { pass: true, sets: [] }; L.push(`No current model: the candidate is the first one (a person reviews it before it ships).`); }
  else { g = gate(rows, loadModel(o.current), best.m, { newest: o.newest ? path.basename(path.resolve(o.newest)) : null }); L.push(markdown(g).replace(/^# /, '## ')); }
  const man = manifest(rows);
  L.push('## Dataset manifest', '', '| set | split | PRs | findings | label sources (PRs) |', '|---|---|---|---|---|',
    ...Object.entries(man).map(([k, s]) => `| ${k} | ${s.split} | ${s.prs} | ${s.findings} | ${Object.entries(s.sources).map(([a, n]) => `${a} ${n}`).join(', ')} |`), '',
    'Label accuracy per source comes from the weekly human audit of a random sample of each source; set the labelers\' confidences from it.');
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(man, null, 1));
  fs.writeFileSync(path.join(out, 'weekly.md'), L.join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ date, best: best && best.name, pass: g.pass,
    candidates: cands.map((c) => ({ name: c.name, auroc: c.auroc })), gate: g }, null, 1));
  if (best) fs.copyFileSync(best.file, path.join(out, 'model.json'));
  let pr = null;
  if (o.pr && best && g.pass) pr = openPR(out, best, date, L.join('\n'));
  return { out, best: best && best.name, pass: g.pass, pr };
}

// a branch with the new model and its report, and a pull request for a person to merge
function openPR(out, best, date, body) {
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
  if (git('status', '--porcelain', '--', 'learn/model.json', 'learn/model-report.md')) throw new Error('learn/model.json has uncommitted changes: not opening a PR');
  const branch = `model-${date}`, back = git('rev-parse', '--abbrev-ref', 'HEAD');
  git('switch', '-c', branch);
  try {
    fs.copyFileSync(best.file, path.join(ROOT, 'learn', 'model.json'));
    fs.copyFileSync(path.join(out, `${best.name}.md`), path.join(ROOT, 'learn', 'model-report.md'));
    git('add', 'learn/model.json', 'learn/model-report.md');
    git('commit', '-m', `Triage model ${date} (${best.name}): passed the promotion gate`);
    git('push', '-u', 'origin', branch);
    return execFileSync('gh', ['pr', 'create', '--head', branch, '--title', `Triage model ${date}`, '--body', body + '\n\nOpened by learn/weekly.js. A person reviews and merges; agents never merge model PRs.'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } finally { git('switch', back); }
}

if (require.main === module) {
  const o = args(process.argv.slice(2));
  if (!o.train.length) { console.error('usage: node learn/weekly.js --train <dir>... --eval <dir>... [--newest <dir>] [--current learn/model.json] [--out dir] [--pr]'); process.exit(2); }
  try {
    const r = weekly(o);
    console.log(`${r.out}/weekly.md: candidate ${r.best || 'none'}, gate ${r.pass ? 'passed' : 'not passed'}${r.pr ? `, ${r.pr}` : ''}`);
    process.exit(r.pass ? 0 : 1);
  } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { weekly, meanAuroc, manifest };
