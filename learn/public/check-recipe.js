// Does a recipe in repos.json fit every version its library's Storybook config had in the walk window?
// walk.js fails a commit whose config matches none of the storiesPattern values or lacks a required
// patch anchor; this finds those versions up front, from git alone (no install, no build).
// Usage: node learn/public/check-recipe.js <repo name> <clone of the library> [--since 2025-10-01]
const { execFileSync } = require('child_process');
const R = require('./repos.json');

const [name, dir] = process.argv.slice(2);
const since = process.argv.includes('--since') ? process.argv[process.argv.indexOf('--since') + 1] : '2025-10-01';
const r = R[name];
if (!r || !dir) { console.error('usage: node learn/public/check-recipe.js <repo name> <clone> [--since date]'); process.exit(2); }
const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
const ref = `origin/${r.branch}`;
// the config as it was when the window opened, and every version since
const first = git('rev-list', '-1', `--before=${since}`, ref).trim();
const shas = [first, ...git('log', '--reverse', '--format=%H', `--since=${since}`, ref, '--', r.storybookConfig).split('\n')].filter(Boolean);
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
console.log(`${name}: ${shas.length} config versions since ${since}, ${unfit} the recipe does not fit`);
process.exit(unfit ? 1 : 0);
