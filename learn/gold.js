// How close each source of labels comes to a person's: the commits of the gold set were labelled by someone looking
// at the same crops the judge sees (regression, intended or can't tell), and every other labeller is scored on
// them: the history labels label.js derives (restores, undos, kept), and each judge.js verdict file. Which labels
// the model learns from is decided here, before any of them train it.
// Usage: node learn/gold.js <goldDir> <labels.json> [--md out.md]
//   <goldDir>/<repo>/<sha>/   label.json (the history label, if any) and judge*.json (one per model or prompt)
//   <labels.json>             the person's labels: [{app, sha, verdict: regression|intended|unsure}], sha a prefix
// A labeller's score is P(regression): a judge's confidence on its side of 0.5, 0.5 when unsure; a history label
// is 1 or 0. AUROC ranks those scores against the person's labels (can't tell left out); agreement counts only
// the commits the labeller decided.
const fs = require('fs');
const path = require('path');

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
// US dollars per million input and output tokens (October 2026)
const PRICE = { 'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-5-5': [0.1, 0.5] };

// AUROC of scores (higher: regression) against labels 1/0, ties counted half
function auroc(pairs) {
  const pos = pairs.filter((p) => p.y === 1), neg = pairs.filter((p) => p.y === 0);
  if (!pos.length || !neg.length) return null;
  let s = 0;
  for (const a of pos) for (const b of neg) s += a.score > b.score ? 1 : a.score === b.score ? 0.5 : 0;
  return s / (pos.length * neg.length);
}

const scoreOf = (j) => (j.verdict === 'regression' ? 0.5 + j.confidence / 2 : j.verdict === 'intended' ? 0.5 - j.confidence / 2 : 0.5);

function compare(goldDir, labels) {
  const by = new Map();                                    // labeller -> [{app, y, score, decided, usage, model}]
  const add = (name, row) => { if (!by.has(name)) by.set(name, []); by.get(name).push(row); };
  let n = 0;
  for (const L of labels) {
    if (L.verdict !== 'regression' && L.verdict !== 'intended') continue;
    const repo = path.join(goldDir, L.app);
    const sha = fs.existsSync(repo) && fs.readdirSync(repo).find((d) => d.startsWith(L.sha));
    if (!sha) continue;
    const d = path.join(repo, sha), y = L.verdict === 'regression' ? 1 : 0;
    n++;
    if (fs.existsSync(path.join(d, 'label.json'))) {
      const h = read(path.join(d, 'label.json'));
      add('history', { app: L.app, y, score: h.label, decided: true, source: h.source });
    } else add('history', { app: L.app, y, score: 0.5, decided: false });
    for (const f of fs.readdirSync(d).filter((x) => /^judge.*\.json$/.test(x)).sort()) {
      const j = read(path.join(d, f));
      add(f.replace(/\.json$/, ''), { app: L.app, y, score: scoreOf(j), decided: j.verdict !== 'unsure', usage: j.usage, model: j.model });
    }
  }
  const rows = [...by].map(([name, rs]) => {
    const dec = rs.filter((r) => r.decided), right = dec.filter((r) => (r.score > 0.5 ? 1 : 0) === r.y);
    const recall = (y) => { const k = dec.filter((r) => r.y === y); return k.length ? k.filter((r) => (r.score > 0.5 ? 1 : 0) === y).length / k.length : null; };
    const tokens = rs.reduce((t, r) => [t[0] + ((r.usage && r.usage.input) || 0), t[1] + ((r.usage && r.usage.output) || 0)], [0, 0]);
    const price = PRICE[rs[0].model];
    const apps = [...new Set(rs.map((r) => r.app))].sort().map((app) => [app, auroc(rs.filter((r) => r.app === app))]);
    return { name, commits: rs.length, decided: dec.length, agree: dec.length ? right.length / dec.length : null,
      recallRegression: recall(1), recallIntended: recall(0), auroc: auroc(rs), apps,
      dollarsPer1000: price && rs.length ? ((tokens[0] * price[0] + tokens[1] * price[1]) / 1e6 / rs.length) * 1000 : null };
  });
  return { n, rows };
}

const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)}%`);
const num = (x) => (x == null ? '–' : x.toFixed(3));
function markdown({ n, rows }) {
  const apps = [...new Set(rows.flatMap((r) => r.apps.map(([a]) => a)))];
  return [`${n} gold commits labelled regression or intended`, '',
    `| labeller | commits | decided | agree | regressions found | intended kept | AUROC | ${apps.join(' | ')} | $ per 1000 commits |`,
    `|---|---|---|---|---|---|---|${apps.map(() => '---').join('|')}|---|`,
    ...rows.map((r) => `| ${r.name} | ${r.commits} | ${r.decided} | ${pct(r.agree)} | ${pct(r.recallRegression)} | ${pct(r.recallIntended)} | ${num(r.auroc)} | ${apps.map((a) => num((r.apps.find(([x]) => x === a) || [])[1])).join(' | ')} | ${r.dollarsPer1000 == null ? '–' : r.dollarsPer1000.toFixed(0)} |`)].join('\n');
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a.length < 2) { console.error('usage: node learn/gold.js <goldDir> <labels.json> [--md out.md]'); process.exit(2); }
  const md = markdown(compare(a[0], read(a[1])));
  console.log(md);
  if (a.includes('--md')) fs.writeFileSync(a[a.indexOf('--md') + 1], md + '\n');
}
module.exports = { auroc, scoreOf, compare, markdown };
