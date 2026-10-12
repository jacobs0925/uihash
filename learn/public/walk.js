// Real training data from public repositories: walk a component library's main branch, and for each
// commit that changes styles, build its Storybook and its parent's (only the stories of the components
// the commit touched), serve both and run `uihash pr` on those stories. Each commit leaves
//   <data>/<repo>/<sha>/{meta.json, summary.json}
// and label.js turns the evidence in meta.json and later commits into label.json (see HANDOFF.md).
// Usage: node learn/public/walk.js <repo name in repos.json> <workDir> <dataDir> [--since 2026-01-01] [--max 20] [--newest-first]
// Resumable: commits that already have a summary.json are skipped.
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFileSync, execSync } = require('child_process');
const { runPR } = require('../../src/pr.js');

const [NAME, WORK, DATA] = process.argv.slice(2);
const opt = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const REPOS = JSON.parse(fs.readFileSync(path.join(__dirname, 'repos.json'), 'utf8'));
const R = REPOS[NAME];
if (!R) throw new Error(`unknown repo ${NAME}; known: ${Object.keys(REPOS).join(', ')}`);
const clone = path.join(WORK, NAME), tree = path.join(WORK, NAME + '-build'), builds = path.join(WORK, 'builds', NAME);
const out = path.join(DATA, NAME);
const sh = (cmd, cwd, env = {}) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, ...env } });
const git = (args, cwd = clone) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
const STYLE = new RegExp(R.style), SNAP = new RegExp(R.snapshots), SRC = R.componentRoot;
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
  const raw = git(['log', '--first-parent', '--no-merges', `--since=${since}`, '--format=@@%H%x09%P%x09%ad%x09%s', '--date=short', '--name-only', `origin/${R.branch}`]);
  return raw.split('@@').slice(1).map((b) => { const [h, ...files] = b.trim().split('\n'); const [sha, parents, date, subject] = h.split('\t');
    return { sha, parent: parents.split(' ')[0], date, subject, files: files.filter(Boolean), pr: (/\(#(\d+)\)\s*$/.exec(subject) || [])[1] }; }).reverse();
}
// the component folders a commit's style changes are in: <componentRoot>/<Component>/...
function components(c) {
  const out = new Set();
  for (const f of c.files) if (STYLE.test(f) && f.startsWith(SRC + '/')) { const d = f.slice(SRC.length + 1).split('/')[0]; if (d && !/\.[a-z]+$/.test(d) && !R.skipDirs.includes(d)) out.add(d); }
  return [...out].slice(0, 4);
}

// ------------------------------------------------------------------ builds
let installedLock = null;
function build(sha, comps) {
  const key = sha.slice(0, 10) + '-' + crypto.createHash('sha1').update(comps.join(',')).digest('hex').slice(0, 6);
  const dir = path.join(builds, key);
  if (fs.existsSync(path.join(dir, 'index.json'))) return dir;
  git(['checkout', '-q', '--detach', '--force', sha], tree);
  const lock = crypto.createHash('sha1').update(fs.readFileSync(path.join(tree, R.lockfile))).digest('hex');
  if (lock !== installedLock) { log(`  install (${sha.slice(0, 8)})`); sh(R.install, tree, nodeEnv()); installedLock = lock; }
  const main = path.join(tree, R.storybookConfig), original = fs.readFileSync(main, 'utf8');
  let patched = original.replace(R.storiesPattern, () => JSON.stringify(comps.map((c) => R.storyGlob.replace('{c}', c))));
  for (const [a, b] of R.patches || []) patched = patched.split(a).join(b);
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
function stories(dir, max) {
  const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  return Object.values(idx.entries).filter((e) => e.type === 'story' && !/playground|dev|performance|test/i.test(e.id)).slice(0, max);
}

async function check(c, comps) {
  const base = build(c.parent, comps), head = build(c.sha, comps);
  const list = stories(head, +opt('stories', 24)).filter((e) => fs.existsSync(path.join(base, 'index.json')) && JSON.parse(fs.readFileSync(path.join(base, 'index.json'), 'utf8')).entries[e.id]);
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
  let list = commits(opt('since', '2026-01-01')).filter((c) => c.parent && components(c).length && known(c.parent));
  if (process.argv.includes('--newest-first')) list.reverse();
  const max = +opt('max', 20);
  let done = 0, failedInARow = 0;
  for (const c of list) {
    if (done >= max || failedInARow >= 3) break;
    const dir = path.join(out, c.sha);
    if (fs.existsSync(path.join(dir, 'summary.json'))) continue;
    const attempts = fs.existsSync(path.join(dir, 'failed.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'failed.json'), 'utf8')).attempts || 1 : 0;
    if (attempts >= 2) continue;
    const comps = components(c);
    const t0 = Date.now();
    log(`${c.sha.slice(0, 8)} ${c.date} ${c.subject.slice(0, 70)} [${comps.join(', ')}]`);
    try {
      // evidence for labelling, from the commit itself (label.js adds what later commits say)
      const changeset = c.files.filter((f) => /^\.changeset\/.*\.md$/.test(f)).map((f) => { try { return git(['show', `${c.sha}:${f}`]); } catch (e) { return ''; } }).join('\n');
      const meta = { repo: NAME, sha: c.sha, parent: c.parent, date: c.date, subject: c.subject, pr: c.pr, components: comps, files: c.files,
        snapshotsUpdated: c.files.filter((f) => SNAP.test(f)), changeset: changeset.slice(0, 4000) };
      const s = await check(c, comps);
      fs.mkdirSync(dir, { recursive: true });
      for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (/\.(png|html)$/.test(f)) fs.unlinkSync(path.join(dir, f));
      const n = s ? s.pages.reduce((k, p) => k + p.findings.filter((f) => !f.sameAs).length, 0) : 0;
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ ...meta, stories: s ? s.pages.length : 0, findings: n, ms: Date.now() - t0 }, null, 1));
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
