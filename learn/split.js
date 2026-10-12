// Split a labelled-PR corpus by app, for leave-one-app-out evaluation: the held-out testbed plays the
// part of an app the model has never seen (the synthetic stand-in for a frozen set of real PRs).
// Usage: node learn/split.js <corpus> <outDir> --hold <app>[,<app>...]
//   -> <outDir>/train/<pr>, <outDir>/eval-<app>/<pr>   (hard links: no copies)
// Mixed PRs go with their app; a held-out app's mixed PRs are held out too.
const fs = require('fs');
const path = require('path');

function split(corpus, out, hold) {
  const root = fs.existsSync(path.join(corpus, 'prs')) ? path.join(corpus, 'prs') : corpus;
  const n = {};
  for (const id of fs.readdirSync(root)) {
    const d = path.join(root, id);
    if (!fs.existsSync(path.join(d, 'label.json'))) continue;
    const app = JSON.parse(fs.readFileSync(path.join(d, 'label.json'), 'utf8')).app;
    const to = path.join(out, hold.includes(app) ? `eval-${app}` : 'train', id);
    fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(d)) {
      const dst = path.join(to, f);
      if (!fs.existsSync(dst)) fs.linkSync(path.join(d, f), dst);
    }
    const k = hold.includes(app) ? `eval-${app}` : 'train';
    n[k] = (n[k] || 0) + 1;
  }
  return n;
}

if (require.main === module) {
  const a = process.argv.slice(2), i = a.indexOf('--hold');
  if (a.length < 2 || i < 0) { console.error('usage: node learn/split.js <corpus> <outDir> --hold <app>[,<app>...]'); process.exit(2); }
  console.log(JSON.stringify(split(a[0], a[1], a[i + 1].split(','))));
}
module.exports = { split };
