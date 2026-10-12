// Labelled feature rows for the triage model, one per finding, as JSON lines.
// Usage: node learn/dataset.js --train <dir> [<dir> ...] [--eval <dir> [<dir> ...]] > rows.jsonl
//
// Every <dir> holds labelled PRs in one format, whatever produced them (generate.js, a CI collector, an
// agent, a person; see HANDOFF.md):
//   <dir>/<pr>/summary.json   what `uihash pr` wrote for the PR
//   <dir>/<pr>/label.json     { "label": 1 (has a regression) | 0 (all intended), "source": "...", "confidence": 0..1,
//                               "group": "<operator, app or repo>", "app": "<app or repo>" }
//   <dir>/<pr>/sides.json     optional: finding signature -> "mistake" | "deliberate" | "unknown" (left out), for PRs with both
//   <dir>/<pr>/meta.json      optional (real PRs): { title, body, ... } — the PR text features
//   <dir>/<pr>/intent.json    optional (real PRs): the intent judge's verdicts (learn/intent.js)
// Rows of --train dirs are fitted; rows of --eval dirs are only scored. A row:
//   { split, set, pr, group, app, kind: regression | deliberate | mixed, prY, side, y, w, x, sig, triage, type, text }
const fs = require('fs');
const path = require('path');
const { findingsOf } = require('../src/features.js');

const sigOf = (p, f) => [p.page, p.state, p.vp, f.type, f.path, ...f.changes].join('|');
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

function* prsIn(dir) {
  // a labelled-PR dir, or a dir of them (generate.js writes <out>/prs/<id>)
  const root = fs.existsSync(path.join(dir, 'prs')) ? path.join(dir, 'prs') : dir;
  for (const id of fs.readdirSync(root).sort()) {
    const d = path.join(root, id);
    if (fs.existsSync(path.join(d, 'label.json')) && fs.existsSync(path.join(d, 'summary.json'))) yield [id, d];
  }
}

function rowsOf(dir, split) {
  const set = path.basename(path.resolve(dir)), out = [];
  for (const [id, d] of prsIn(dir)) {
    const L = read(path.join(d, 'label.json')), s = read(path.join(d, 'summary.json'));
    const sides = fs.existsSync(path.join(d, 'sides.json')) ? read(path.join(d, 'sides.json')) : null;
    // a side of "unknown" (a labeler knows the PR, not this finding) leaves the finding out
    const sideOf = (sig) => (sides ? sides[sig] || 'mistake' : L.label ? 'mistake' : 'deliberate');
    const meta = fs.existsSync(path.join(d, 'meta.json')) ? read(path.join(d, 'meta.json')) : null;
    const intent = fs.existsSync(path.join(d, 'intent.json')) ? read(path.join(d, 'intent.json')).verdicts : null;
    const ctx = meta ? { text: `${meta.title || ''}\n${meta.body || ''}`, intent } : null;
    const rows = findingsOf(s, ctx).filter(({ p, f }) => sideOf(sigOf(p, f)) !== 'unknown');
    const known = new Set(rows.map(({ p, f }) => sideOf(sigOf(p, f))));
    const kind = known.size > 1 ? 'mixed' : L.label ? 'regression' : 'deliberate';
    for (const { p, f, x } of rows) {
      const sig = sigOf(p, f);
      const side = sideOf(sig);
      out.push({ split, set, pr: `${set}/${id}`, group: L.group || L.app || set, app: L.app || set, kind, prY: L.label, side, y: side === 'mistake' ? 1 : 0,
        w: (L.confidence === undefined ? 1 : L.confidence) / rows.length, source: L.source || '', x, sig, triage: f.triage, type: f.type,
        text: `${f.path.split(' > ').slice(-2).join(' > ')}: ${f.changes.slice(0, 2).join('; ')}`.slice(0, 200) });
    }
  }
  return out;
}

if (require.main === module) {
  const args = process.argv.slice(2), dirs = { train: [], eval: [] };
  let mode = 'train';
  for (const a of args) if (a === '--train' || a === '--eval') mode = a.slice(2); else dirs[mode].push(a);
  for (const split of ['train', 'eval']) for (const d of dirs[split]) for (const r of rowsOf(d, split)) process.stdout.write(JSON.stringify(r) + '\n');
}
module.exports = { rowsOf, sigOf };
