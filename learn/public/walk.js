// Real training data from public repositories: walk a component library's main branch, and for each
// commit that changes styles, build its Storybook and its parent's (only the stories of the components
// the commit touched), serve both and run `uihash pr` on those stories. Each commit leaves
//   <data>/<repo>/<sha>/{meta.json, summary.json}
// and label.js turns the evidence in meta.json and later commits into label.json (see HANDOFF.md).
// Usage: node learn/public/walk.js <repo name in repos.json> <workDir> <dataDir> [--since 2026-01-01] [--max 20] [--minutes 40] [--newest-first]
// --minutes: start no new commit after that long (the one in progress finishes). Resumable: commits that
// already have a summary (summary.json, or summary.json.gz once round.sh has compacted it) are skipped.
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFileSync, execSync } = require('child_process');
const { runPR } = require('../../src/pr.js');
const { hasSummary } = require('../dataset.js');

const [NAME, WORK, DATA] = process.argv.slice(2), START = Date.now();
const opt = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const REPOS = JSON.parse(fs.readFileSync(path.join(__dirname, 'repos.json'), 'utf8'));
const R = REPOS[NAME];
if (!R) throw new Error(`unknown repo ${NAME}; known: ${Object.keys(REPOS).join(', ')}`);
const clone = path.join(WORK, NAME), tree = path.join(WORK, NAME + '-build'), builds = path.join(WORK, 'builds', NAME);
const out = path.join(DATA, NAME);
// an install or a build that takes half an hour is stuck: fail the commit rather than the whole round
const sh = (cmd, cwd, env = {}) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 1 << 28, timeout: 30 * 60e3, env: { ...process.env, ...env } });
const git = (args, cwd = clone) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
const STYLE = new RegExp(R.style), SNAP = new RegExp(R.snapshots), SRC = R.componentRoot;
// changeset files (labelling evidence); "changesets" overrides it where a monorepo keeps them per package
const CHANGESET = new RegExp(R.changesets || '^\\.changeset/.*\\.md$');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
// a repository may need its own Node version: "node": "24.19.0", or "nvmrc" for the checked-out commit's
// .nvmrc (some repositories check the exact version). Fetched once into the work dir, put first on PATH.
function nodeEnv() {
  if (!R.node) return {};
  let v = R.node === 'nvmrc' ? fs.readFileSync(path.join(tree, '.nvmrc'), 'utf8').trim().replace(/^v/, '') : R.node;
  if (!/^\d+\.\d+\.\d+$/.test(v)) return {};
  const dir = path.join(WORK, `node-v${v}-linux-x64`);
  if (!fs.existsSync(path.join(dir, 'bin', 'node'))) sh(`curl -sSL https://nodejs.org/dist/v${v}/node-v${v}-linux-x64.tar.xz | tar -xJ -C ${JSON.stringify(WORK)}`, WORK);
  return { PATH: path.join(dir, 'bin') + ':' + process.env.PATH };
}

// ------------------------------------------------------------------ repository and commits
function ensureClone() {
  if (!fs.existsSync(clone)) execFileSync('git', ['clone', '-q', '--filter=blob:none', '--no-checkout', '--single-branch', '--branch', R.branch, R.url, clone]);
  else git(['fetch', '-q', 'origin', R.branch]);
  if (!fs.existsSync(tree)) git(['worktree', 'add', '-q', '--detach', tree, `origin/${R.branch}`]);
}
function commits(since) {
  // no rename detection: in a blob-less clone it fetches file contents commit by commit (minutes on a large history)
  const raw = git(['log', '--first-parent', '--no-merges', '--no-renames', `--since=${since}`, '--format=@@%H%x09%P%x09%ad%x09%s', '--date=short', '--name-only', `origin/${R.branch}`]);
  return raw.split('@@').slice(1).map((b) => { const [h, ...files] = b.trim().split('\n'); const [sha, parents, date, subject] = h.split('\t');
    return { sha, parent: parents.split(' ')[0], date, subject, files: files.filter(Boolean), pr: (/\(#(\d+)\)\s*$/.exec(subject) || [])[1] }; }).reverse();
}
// the component folders a commit's style changes are in: <componentRoot>/<Component>/...
// "componentDepth": 2 where components sit in group folders (<componentRoot>/<group>/<Component>/...)
const DEPTH = R.componentDepth || 1;
function components(c) {
  const out = new Set();
  for (const f of c.files) {
    if (!STYLE.test(f) || !f.startsWith(SRC + '/')) continue;
    const p = f.slice(SRC.length + 1).split('/'), d = p.slice(0, DEPTH).join('/');
    if (p.length > DEPTH && !R.skipDirs.includes(p[0]) && !R.skipDirs.includes(d)) out.add(d);
  }
  return [...out].slice(0, 4);
}

// ------------------------------------------------------------------ builds
// what is installed in the worktree, kept across runs: a new walk reinstalls only when the lockfile changed
const installed = path.join(WORK, NAME + '.installed');
let installedLock = fs.existsSync(installed) ? fs.readFileSync(installed, 'utf8') : null;
function build(sha, comps) {
  const key = sha.slice(0, 10) + '-' + crypto.createHash('sha1').update(comps.join(',')).digest('hex').slice(0, 6);
  const dir = path.join(builds, key);
  if (fs.existsSync(path.join(dir, 'index.json'))) return dir;
  git(['checkout', '-q', '--detach', '--force', sha], tree);
  const lock = crypto.createHash('sha1').update(fs.readFileSync(path.join(tree, R.lockfile))).digest('hex');
  if (lock !== installedLock) {
    log(`  install (${sha.slice(0, 8)})`); fs.rmSync(installed, { force: true });
    sh(R.install, tree, nodeEnv()); installedLock = lock; fs.writeFileSync(installed, lock);
  }
  // narrow the stories to the commit's components (storiesPattern: the config's stories value, or a list of
  // the values it had over time) and apply the patches. A config the recipe does not fit fails the commit:
  // unnarrowed or unpatched builds would check the wrong stories, or see every class name change
  const main = path.join(tree, R.storybookConfig), original = fs.readFileSync(main, 'utf8');
  const pattern = [].concat(R.storiesPattern).find((p) => original.includes(p));
  if (!pattern) throw new Error(`${R.storybookConfig} at ${sha.slice(0, 8)} has none of the recipe's storiesPattern values`);
  let patched = original.replace(pattern, () => JSON.stringify(comps.map((c) => R.storyGlob.replace('{c}', c))));
  for (const [a, b, optional] of R.patches || []) {          // a third element "optional": the anchor exists only part of the time
    if (!patched.includes(a)) { if (optional) continue; throw new Error(`${R.storybookConfig} at ${sha.slice(0, 8)} lacks the recipe's patch anchor ${JSON.stringify(a.slice(0, 60))}`); }
    patched = patched.split(a).join(b);
  }
  fs.writeFileSync(main, patched);
  try { log(`  build ${key} (${comps.join(', ')})`); sh(R.build.replace('{out}', dir), path.join(tree, R.storybookPackage), { ...nodeEnv(), NODE_OPTIONS: '--max-old-space-size=6144' }); }
  finally { fs.writeFileSync(main, original); }
  return dir;
}
function prune(keep) {
  for (const d of fs.existsSync(builds) ? fs.readdirSync(builds) : []) if (!keep.has(d)) fs.rmSync(path.join(builds, d), { recursive: true, force: true });
}

// ------------------------------------------------------------------ serving and checking
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
function serve(dir) {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      const p = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/\.\.+/g, ''));
      fs.readFile(fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p, (e, b) => {
        if (e) { r.writeHead(404); return r.end(); }
        r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b);
      });
    }).listen(0, '127.0.0.1', () => ok(s));
  });
}
// story ids to leave out (dev-only stories); "skipStories" overrides it where a library's main story is its "Playground"
const SKIP_STORIES = new RegExp(R.skipStories || 'playground|dev|performance|test', 'i');
// up to max stories, taken in turn from each of the commit's components: the index is in title order, so the
// first component would otherwise take them all. Stories of none of them come last.
function stories(dir, max, comps = []) {
  const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const groups = comps.map(() => []), rest = [];
  for (const e of Object.values(idx.entries).filter((x) => x.type === 'story' && !SKIP_STORIES.test(x.id))) {
    const i = comps.findIndex((c) => (e.importPath || '').includes(`/${c}/`));
    (i < 0 ? rest : groups[i]).push(e);
  }
  const out = [];
  for (let k = 0; out.length < max && groups.some((g) => k < g.length); k++) for (const g of groups) if (k < g.length && out.length < max) out.push(g[k]);
  return out.concat(rest).slice(0, max);
}

async function check(c, comps) {
  const base = build(c.parent, comps), head = build(c.sha, comps);
  const list = stories(head, +opt('stories', 24), comps).filter((e) => fs.existsSync(path.join(base, 'index.json')) && JSON.parse(fs.readFileSync(path.join(base, 'index.json'), 'utf8')).entries[e.id]);
  if (!list.length) return null;
  const [sb, sh2] = [await serve(base), await serve(head)];
  try {
    const config = { quick: true, runs: 2, viewport: { width: 1280, height: 800 }, keys: 'class', pseudoStates: ['hover', 'focus'],
      pages: list.map((e) => ({ name: e.id, path: `iframe.html?id=${e.id}&viewMode=story` })) };
    const dir = path.join(out, c.sha);
    return await runPR({ baseUrl: `http://127.0.0.1:${sb.address().port}/`, headUrl: `http://127.0.0.1:${sh2.address().port}/`, config, outDir: dir });
  } finally { sb.close(); sh2.close(); }
}

(async () => {
  ensureClone();
  fs.mkdirSync(out, { recursive: true });
  // a commit whose parent is outside the clone's history (the shallow boundary) cannot be compared
  const known = (sha) => { try { git(['cat-file', '-e', sha + '^{commit}']); return true; } catch (e) { return false; } };
  // a recipe's own "since" wins when later: the commits before it cannot be built with this recipe
  let list = commits([opt('since', '2026-01-01'), R.since].filter(Boolean).sort().pop()).filter((c) => c.parent && components(c).length && known(c.parent));
  if (process.argv.includes('--newest-first')) list.reverse();
  const max = +opt('max', 20), until = START + +opt('minutes', 1e6) * 60e3;
  let done = 0, failedInARow = 0;
  for (const c of list) {
    if (done >= max || failedInARow >= 3 || Date.now() > until) break;
    const dir = path.join(out, c.sha);
    // done: checked with the current version of the recipe (raise "version" to check again what an older one got wrong)
    if (hasSummary(dir) && fs.existsSync(path.join(dir, 'meta.json')) && (JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')).recipe || 1) >= (R.version || 1)) continue;
    const attempts = fs.existsSync(path.join(dir, 'failed.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'failed.json'), 'utf8')).attempts || 1 : 0;
    if (attempts >= 2) continue;
    const comps = components(c);
    const t0 = Date.now();
    log(`${c.sha.slice(0, 8)} ${c.date} ${c.subject.slice(0, 70)} [${comps.join(', ')}]`);
    try {
      // evidence for labelling, from the commit itself (label.js adds what later commits say). What the
      // author wrote about the change: changesets (.changeset/*.md), or Beachball change files (change/*.json,
      // Fluent UI), of which only the type and comment are kept (they also hold the author's email)
      const show = (f) => { try { return git(['show', `${c.sha}:${f}`]); } catch (e) { return ''; } };
      const beachball = (f) => { try { const j = JSON.parse(show(f)); return j.comment ? `${j.type || 'change'}: ${j.comment}` : ''; } catch (e) { return ''; } };
      const changeset = c.files.map((f) => (CHANGESET.test(f) ? show(f) : /^change\/.*\.json$/.test(f) ? beachball(f) : '')).filter(Boolean).join('\n');
      const meta = { repo: NAME, sha: c.sha, parent: c.parent, date: c.date, subject: c.subject, pr: c.pr, components: comps, files: c.files,
        snapshotsUpdated: c.files.filter((f) => SNAP.test(f)), changeset: changeset.slice(0, 4000) };
      const s = await check(c, comps);
      fs.mkdirSync(dir, { recursive: true });
      for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (/\.(png|html)$/.test(f)) fs.unlinkSync(path.join(dir, f));
      const n = s ? s.pages.reduce((k, p) => k + p.findings.filter((f) => !f.sameAs).length, 0) : 0;
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ ...meta, recipe: R.version || 1, stories: s ? s.pages.length : 0, findings: n, ms: Date.now() - t0 }, null, 1));
      if (!s) fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({ pages: [] }));
      log(`  ${n} findings in ${s ? s.targets : 0} story states (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      fs.rmSync(path.join(dir, 'failed.json'), { force: true });
      done++; failedInARow = 0;
    } catch (e) {
      log(`  failed: ${(e.stderr || e.message || '').toString().split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 300)}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'failed.json'), JSON.stringify({ attempts: attempts + 1, error: String((e.stdout || '') + (e.stderr || '') + e.message).slice(-3000) }));
      done++; failedInARow++;
    }
    prune(new Set());                       // builds are per commit pair; keep the disk small
  }
})();
