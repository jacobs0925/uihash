// Labelled feature rows for the triage model, one per finding, as JSON lines.
// Usage: node learn/dataset.js --train <dir>... [--eval <dir>...] [--split <dir>... [--holdout 0.2]] > rows.jsonl
//
// Every <dir> holds labelled PRs in one format, whatever produced them (generate.js, a CI collector, an
// agent, a person; see HANDOFF.md):
//   <dir>/<pr>/summary.json   what `uihash pr` wrote for the PR (or summary.json.gz, compressed)
//   <dir>/<pr>/label.json     { "label": 1 (has a regression) | 0 (all intended), "source": "...", "confidence": 0..1,
//                               "group": "<operator, app or repo>", "app": "<app or repo>" }
//   <dir>/<pr>/sides.json     optional: finding signature -> "mistake" | "deliberate" | "unknown" (left out), for PRs with both
//   <dir>/<pr>/meta.json      optional (real PRs): { title, body, ... } — the PR text features (a public
//                             commit's meta.json from learn/public/walk.js has its subject instead of a title)
//   <dir>/<pr>/intent.json    optional (real PRs): the intent judge's verdicts (learn/intent.js)
// Rows of --train dirs are fitted; rows of --eval dirs are only scored. --split dirs are divided: a PR is held
// out for evaluation, in a set named <dir>-held-out, when a hash of its name falls in the --holdout share,
// so the same PRs stay held out as a dir grows and no model trained on its other PRs ever sees them. A row:
//   { split, set, pr, group, app, kind: regression | deliberate | mixed, prY, side, y, w, x, sig, triage, type, text }
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { findingsOf } = require('../src/features.js');

const sigOf = (p, f) => [p.page, p.state, p.vp, f.type, f.path, ...f.changes].join('|');
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
// a PR's summary, plain or compressed (learn/public/round.sh stores them compressed)
const hasSummary = (d) => ['summary.json', 'summary.json.gz'].some((f) => fs.existsSync(path.join(d, f)));
const summaryOf = (d) => fs.existsSync(path.join(d, 'summary.json')) ? read(path.join(d, 'summary.json'))
  : JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d, 'summary.json.gz'))).toString('utf8'));
const heldOut = (name, share) => parseInt(crypto.createHash('sha1').update(name).digest('hex').slice(0, 8), 16) / 2 ** 32 < share;

function* prsIn(dir) {
  // a labelled-PR dir, or a dir of them (generate.js writes <out>/prs/<id>)
  const root = fs.existsSync(path.join(dir, 'prs')) ? path.join(dir, 'prs') : dir;
  for (const id of fs.readdirSync(root).sort()) {
    const d = path.join(root, id);
    if (fs.existsSync(path.join(d, 'label.json')) && hasSummary(d)) yield [id, d];
  }
}

// split: 'train', 'eval', or the share of PRs to hold out for evaluation (--split)
function rowsOf(dir, split) {
  const name = path.basename(path.resolve(dir)), out = [];
  for (const [id, d] of prsIn(dir)) {
    const L = read(path.join(d, 'label.json')), s = summaryOf(d);
    const held = typeof split === 'number' && heldOut(`${name}/${id}`, split);
    const sp = typeof split === 'number' ? (held ? 'eval' : 'train') : split, set = held ? `${name}-held-out` : name;
    const sides = fs.existsSync(path.join(d, 'sides.json')) ? read(path.join(d, 'sides.json')) : null;
    // a side of "unknown" (a labeler knows the PR, not this finding) leaves the finding out
    const sideOf = (sig) => (sides ? sides[sig] || 'mistake' : L.label ? 'mistake' : 'deliberate');
    const meta = fs.existsSync(path.join(d, 'meta.json')) ? read(path.join(d, 'meta.json')) : null;
    const intent = fs.existsSync(path.join(d, 'intent.json')) ? read(path.join(d, 'intent.json')).verdicts : null;
    const ctx = meta ? { text: `${meta.title || meta.subject || ''}\n${meta.body || ''}`, intent } : null;
    const rows = findingsOf(s, ctx).filter(({ p, f }) => sideOf(sigOf(p, f)) !== 'unknown');
    const known = new Set(rows.map(({ p, f }) => sideOf(sigOf(p, f))));
    const kind = known.size > 1 ? 'mixed' : L.label ? 'regression' : 'deliberate';
    for (const { p, f, x } of rows) {
      const sig = sigOf(p, f);
      const side = sideOf(sig);
      out.push({ split: sp, set, pr: `${set}/${id}`, group: L.group || L.app || set, app: L.app || set, kind, prY: L.label, side, y: side === 'mistake' ? 1 : 0,
        w: (L.confidence === undefined ? 1 : L.confidence) / rows.length, source: L.source || '', x, sig, triage: f.triage, type: f.type,
        text: `${f.path.split(' > ').slice(-2).join(' > ')}: ${f.changes.slice(0, 2).join('; ')}`.slice(0, 200) });
    }
  }
  return out;
}

if (require.main === module) {
  const args = process.argv.slice(2), dirs = { train: [], eval: [], split: [] };
  let mode = 'train', holdout = 0.2;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--holdout') holdout = +args[++i];
    else if (['--train', '--eval', '--split'].includes(args[i])) mode = args[i].slice(2);
    else dirs[mode].push(args[i]);
  }
  for (const m of ['train', 'eval', 'split']) for (const d of dirs[m]) for (const r of rowsOf(d, m === 'split' ? holdout : m)) process.stdout.write(JSON.stringify(r) + '\n');
}
module.exports = { rowsOf, sigOf, hasSummary, summaryOf };
