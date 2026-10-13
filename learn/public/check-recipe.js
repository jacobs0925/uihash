// Does a recipe in repos.json fit every version its library's Storybook config had in the walk window?
// walk.js fails a commit whose config matches none of the storiesPattern values or lacks a required
// patch anchor; this finds those versions up front, from git alone (no install, no build). For a "pages" recipe it
// lists the commits walk.js would check and how many pages each component has.
// Usage: node learn/public/check-recipe.js <repo name> <clone of the library> [--since 2025-10-01]
const { execFileSync } = require('child_process');
const R = require('./repos.json');

const [name, dir] = process.argv.slice(2);
const since = process.argv.includes('--since') ? process.argv[process.argv.indexOf('--since') + 1] : '2025-10-01';
const r = R[name];
const from = [since, r && r.since].filter(Boolean).sort().pop();   // a recipe's own "since" wins when later, as in walk.js
if (!r || !dir) { console.error('usage: node learn/public/check-recipe.js <repo name> <clone> [--since date]'); process.exit(2); }
const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
const ref = `origin/${r.branch}`;
// a "pages" recipe has no config to fit: list instead the style-changing commits walk.js would take and how many
// page files each component has in both the parent and the commit (one with none, a new component, gets no pages)
if (r.pages) {
  const raw = git('log', '--first-parent', ...(r.merges ? [] : ['--no-merges']), '--no-renames', `--since=${from}`, '--format=@@%H%x09%P%x09%as', '--name-only', ref);
  const STYLE = new RegExp(r.style), D = r.componentDepth || 1;
  let n = 0, none = 0;
  for (const b of raw.split('@@').slice(1)) {
    const [h, ...files] = b.trim().split('\n'), [sha, parents, date] = h.split('\t');
    const comps = [...new Set(files.filter((f) => STYLE.test(f) && f.startsWith(r.componentRoot + '/')).map((f) => f.slice(r.componentRoot.length + 1).split('/'))
      .filter((p) => p.length > D && !r.skipDirs.includes(p[0]) && !r.skipDirs.includes(p.slice(0, D).join('/'))).map((p) => p.slice(0, D).join('/')))].slice(0, 4);
    if (!comps.length || !parents) continue;
    n++;
    const at = (s) => git('ls-tree', '-r', '--name-only', s).split('\n');
    const [base, head] = [at(parents.split(' ')[0]), at(sha)];
    const count = (tree, c) => tree.filter((f) => new RegExp(r.pages.match.split('{c}').join(c)).test(f)).length;
    const per = comps.map((c) => `${c} ${Math.min(count(base, c), count(head, c))}`);
    if (comps.every((c) => !count(base, c) || !count(head, c))) none++;
    console.log(`${sha.slice(0, 8)} ${date}: ${per.join(', ')}`);
  }
  console.log(`${name}: ${n} style-changing commits since ${from}, ${none} without a page for any of their components`);
  process.exit(0);
}
// the config as it was when the window opened, and every version since
const first = git('rev-list', '-1', `--before=${from}`, ref).trim();
const shas = [first, ...git('log', '--reverse', '--format=%H', `--since=${from}`, ref, '--', r.storybookConfig).split('\n')].filter(Boolean);
let unfit = 0;
for (const sha of shas) {
  let text;
  try { text = git('show', `${sha}:${r.storybookConfig}`); } catch (e) { continue; }   // the config is not there yet (or any more)
  const date = git('log', '-1', '--format=%as', sha).trim();
  const pattern = [].concat(r.storiesPattern).find((p) => text.includes(p));
  let patched = pattern ? text.replace(pattern, () => JSON.stringify([r.storyGlob.replace('{c}', 'X')])) : text;
  const missing = [];                                   // patches apply in order, as in walk.js
  for (const [a, b, optional] of r.patches || []) { if (patched.includes(a)) patched = patched.split(a).join(b); else if (!optional) missing.push(a); }
  if (!pattern || missing.length) {
    unfit++;
    console.log(`${sha.slice(0, 8)} ${date}: ${[!pattern && 'no storiesPattern value matches', ...missing.map((a) => `missing patch anchor ${JSON.stringify(a.slice(0, 50))}`)].filter(Boolean).join('; ')}`);
  }
}
console.log(`${name}: ${shas.length} config versions since ${from}, ${unfit} the recipe does not fit`);
process.exit(unfit ? 1 : 0);
