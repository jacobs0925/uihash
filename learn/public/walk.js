// Real training data from public repositories: walk a component library's main branch, and for each
// commit that changes styles, build its Storybook and its parent's (only the stories of the components
// the commit touched), serve both and run `uihash pr` on those stories. Each commit leaves
//   <data>/<repo>/<sha>/{meta.json, summary.json}
// and label.js turns the evidence in meta.json and later commits into label.json (see HANDOFF.md).
// A library without a Storybook builds its own test app instead and names the pages to check ("pages", see pageList());
// an app ("pages.routes", see appRoutes()) is built whole and checked on its routes.
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
// "changelog": where PRs add their entry to a changelog file instead; the lines the commit added to it are kept
const CHANGELOG = R.changelog ? new RegExp(R.changelog) : null;
// an app rather than a component library: any style file under componentRoot counts, and pages are routes
const APP = !!(R.pages && R.pages.routes);
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
  // no rename detection: in a blob-less clone it fetches file contents commit by commit (minutes on a large history).
  // "merges": true where PRs land as merge commits: each merge then stands for its PR (its files against the first parent).
  // A bare date is midnight UTC: git reads "2025-10-01" as that day at the current time of day
  if (/^\d{4}-\d{2}-\d{2}$/.test(since)) since += 'T00:00:00Z';
  const raw = git(['log', '--first-parent', ...(R.merges ? [] : ['--no-merges']), '--no-renames', `--since=${since}`, '--format=@@%H%x09%P%x09%ad%x09%s', '--date=short', '--name-only', `origin/${R.branch}`]);
  return raw.split('@@').slice(1).map((b) => { const [h, ...files] = b.trim().split('\n'); const [sha, parents, date, subject] = h.split('\t');
    return { sha, parent: parents.split(' ')[0], date, subject, files: files.filter(Boolean), pr: (/\(#(\d+)\)\s*$/.exec(subject) || (R.merges && /^Merge pull request #(\d+)/.exec(subject)) || [])[1] }; }).reverse();
}
// the component folders a commit's style changes are in: <componentRoot>/<Component>/...
// "componentDepth": 2 where components sit in group folders (<componentRoot>/<group>/<Component>/...)
const DEPTH = R.componentDepth || 1;
function components(c) {
  const out = new Set();
  for (const f of c.files) {
    if (!STYLE.test(f) || !f.startsWith(SRC + '/')) continue;
    const p = f.slice(SRC.length + 1).split('/'), d = p.slice(0, DEPTH).join('/');
    if (APP) { if (!R.skipDirs.includes(p[0])) out.add(p[0]); continue; }      // an app: its top-level folder or file
    if (p.length > DEPTH && !R.skipDirs.includes(p[0]) && !R.skipDirs.includes(d)) out.add(d);
  }
  return [...out].slice(0, 4);
}

// ------------------------------------------------------------------ builds
// what is installed in the worktree, kept across runs: a new walk reinstalls only when package.json or a
// lockfile changed
const installed = path.join(WORK, NAME + '.installed');
let installedLock = fs.existsSync(installed) ? fs.readFileSync(installed, 'utf8') : null;
function build(sha, comps) {
  const key = sha.slice(0, 10) + '-' + crypto.createHash('sha1').update(comps.join(',')).digest('hex').slice(0, 6);
  const dir = path.join(builds, key);
  if (fs.existsSync(path.join(dir, R.pages ? 'built' : 'index.json'))) return dir;
  git(['checkout', '-q', '--detach', '--force', sha], tree);
  // all of them count, and package.json too: "lockfile" may list several (a repository that changed
  // package manager), and a Lovable app adds a dependency to package.json and package-lock.json but leaves
  // its bun.lockb as it was
  const h = crypto.createHash('sha1');
  for (const f of ['package.json', ...[].concat(R.lockfile)]) if (fs.existsSync(path.join(tree, f))) h.update(`${f}\0`).update(fs.readFileSync(path.join(tree, f)));
  const lock = h.digest('hex');
  if (lock !== installedLock) {
    log(`  install (${sha.slice(0, 8)})`); fs.rmSync(installed, { force: true });
    sh(R.install, tree, nodeEnv()); installedLock = lock; fs.writeFileSync(installed, lock);
  }
  if (R.pages) {                            // no Storybook: the library's own test app, whole (see pageList())
    log(`  build ${key} (whole app)`);
    sh(R.build.split('{out}').join(dir), tree, { ...nodeEnv(), NODE_OPTIONS: '--max-old-space-size=6144' });
    fs.writeFileSync(path.join(dir, 'built'), sha);
    return dir;
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
  const spa = R.pages && R.pages.spa;
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let p = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/\.\.+/g, ''));
      if (spa && !fs.existsSync(p)) p = path.join(dir, spa);
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');   // the type is the file's, not the folder's
      fs.readFile(p, (e, b) => {
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
  return spread(groups, rest, max);
}
function spread(groups, rest, max) {
  const out = [];
  for (let k = 0; out.length < max && groups.some((g) => k < g.length); k++) for (const g of groups) if (k < g.length && out.length < max) out.push(g[k]);
  return out.concat(rest).slice(0, max);
}
// A library without a Storybook ("pages" in its recipe): "build", run at the root with {out} the output directory,
// builds its whole test app as a static site (a test app has no config to narrow to components the way a
// Storybook has); a build step that depends on an anchor in a file checks it and fails (grep -q), as the Storybook
// patches do. Its pages are files in the commit's tree: pages.match, a regex over tracked paths with {c} for a
// component, picks a component's page files, and pages.path (one or a list, e.g. one per color scheme), with $1...
// from the match, is each page's URL path in the build. pages.frames: a regex over a page file's content whose $1
// names a page it shows in a frame (uihash does not look inside frames), checked too at pages.framePath. pages.spa:
// the file served for a path that is no file (a single-page app that routes on the path). Up to max pages in turn
// from each component, of those the parent also has; known from git alone, so a commit with none (a new
// component) is not built
function pageList(c, max, comps) {
  const at = (sha) => git(['ls-tree', '-r', '--name-only', sha]).split('\n');
  const inBase = new Set(at(c.parent)), head = at(c.sha).filter((f) => inBase.has(f));
  const frames = (sha, f) => (R.pages.frames ? [...git(['show', `${sha}:${f}`]).matchAll(new RegExp(R.pages.frames, 'g'))].map((m) => m[1]) : []);
  const paths = (t, name) => [].concat(t).map((p) => p.split('$1').join(name));
  return spread(comps.map((k) => {
    const re = new RegExp(R.pages.match.split('{c}').join(k));
    return head.filter((f) => re.test(f)).flatMap((f) => {
      const inParent = new Set(frames(c.parent, f));
      return [...paths(R.pages.path, re.exec(f)[1]), ...[...new Set(frames(c.sha, f))].filter((n) => inParent.has(n)).flatMap((n) => paths(R.pages.framePath, n))];
    }).map((p) => ({ id: p, path: p }));
  }), [], max);
}

// An app ("pages.routes"): the routes whose page component the commit changed, found through the router file
// (pages.router: <Route path="/x" element={<X />} /> with X imported from a file), when the parent has them too,
// then the recipe's own routes (those every commit is checked on), up to pages.max (default 6). pages.skip: routes
// never checked (a page that never settles, or one that differs between two renders of the same build)
function appRoutes(c) {
  const show = (sha, f) => { try { return git(['show', `${sha}:${f}`]); } catch (e) { return ''; } };
  const found = [];
  if (R.pages.router) {
    const text = show(c.sha, R.pages.router), before = show(c.parent, R.pages.router), dir = path.posix.dirname(R.pages.router), file = {};
    // relative imports, and "@/" for src/ (the alias Lovable's Vite config sets)
    const where = (p) => (p.startsWith('@/') ? path.posix.join('src', p.slice(2)) : path.posix.join(dir, p));
    for (const m of text.matchAll(/import\s+(\w+)\s+from\s+["']((?:\.|@\/)[^"']+)["']|(\w+)\s*=\s*(?:\w+\.)?\w*[lL]azy\w*\(\s*\(\)\s*=>\s*import\(\s*["']((?:\.|@\/)[^"']+)["']/g)) file[m[1] || m[3]] = where(m[2] || m[4]);
    for (const m of text.matchAll(/<Route\s+path="([^":*]+)"\s+element=\{<(\w+)/g)) {
      const f = file[m[2]];
      if (f && before.includes(`path="${m[1]}"`) && !(R.pages.skip || []).includes(m[1]) && c.files.some((x) => x === f || x.startsWith(f + '.') || x.startsWith(f + '/'))) found.push(m[1]);
    }
  }
  return [...new Set([...found, ...R.pages.routes])].slice(0, R.pages.max || 6).map((r) => ({ id: r === '/' ? 'home' : r.slice(1), path: r }));
}

// "restores": a regex over commit subjects whose $1 names the commit a tool put the project back to (Lovable's
// "Reverted to commit <sha>" restores that commit's files exactly). Every first-parent commit between the two was
// thrown away. restores.json lists them, with the first-parent order, for label.js
function writeRestores() {
  const order = git(['log', '--first-parent', '--format=%H%x09%s', `origin/${R.branch}`]).split('\n').filter(Boolean).map((l) => l.split('\t')).reverse();
  const at = new Map(order.map(([sha], i) => [sha, i])), re = new RegExp(R.restores), restores = [];
  order.forEach(([sha, subject], i) => {
    const m = re.exec(subject);
    if (!m) return;
    let target;
    try { target = git(['rev-parse', '--verify', '-q', `${m[1]}^{commit}`]).trim(); } catch (e) { return; }   // not in the public history
    if (!at.has(target) || at.get(target) >= i) return;
    restores.push({ sha, target, undone: order.slice(at.get(target) + 1, i).map(([s]) => s) });
  });
  fs.writeFileSync(path.join(out, 'restores.json'), JSON.stringify({ order: order.map(([sha]) => sha), restores }));
  log(`${restores.length} restores in the history`);
}

async function check(c, comps) {
  const listed = APP ? appRoutes(c) : R.pages && pageList(c, +opt('stories', 24), comps);
  if (listed && !listed.length) return null;
  const base = build(c.parent, comps), head = build(c.sha, comps);
  const list = listed || stories(head, +opt('stories', 24), comps).filter((e) => fs.existsSync(path.join(base, 'index.json')) && JSON.parse(fs.readFileSync(path.join(base, 'index.json'), 'utf8')).entries[e.id]);
  if (!list.length) return null;
  const [sb, sh2] = [await serve(base), await serve(head)];
  try {
    // "keys": "tag" where styling lives in class names (Tailwind): a restyled element would otherwise look removed and
    // added. "offline": the app calls live backends, which must neither be reached nor make the two builds differ.
    // "concurrency": pages rendered at once, where forced hover and focus states depend on timing under load
    const config = { quick: true, runs: 2, viewport: { width: 1280, height: 800 }, keys: R.keys || 'class', offline: !!R.offline, pseudoStates: ['hover', 'focus'], ...(R.concurrency ? { concurrency: R.concurrency } : {}),
      pages: list.map((e) => ({ name: e.id, path: R.pages ? e.path : `iframe.html?id=${e.id}&viewMode=story` })) };
    const dir = path.join(out, c.sha);
    return await runPR({ baseUrl: `http://127.0.0.1:${sb.address().port}/`, headUrl: `http://127.0.0.1:${sh2.address().port}/`, config, outDir: dir });
  } finally { sb.close(); sh2.close(); }
}

// Out of memory, a GitHub runner is shut down and the whole round is lost, and a commit that does it would
// do it again every round. So while a commit is checked, below MEM_FLOOR_MB available (default: 15 % of the
// machine's memory) the commit is given up for good and the walk exits with status 3 (its browser goes with
// it); round.sh then walks the same repository on. Builds block the event loop and are not watched: their
// heap is capped (NODE_OPTIONS)
function memoryWatch(dir) {
  const mb = (k) => { const m = new RegExp(`^${k}:\\s+(\\d+)`, 'm').exec(fs.readFileSync('/proc/meminfo', 'utf8')); return m ? +m[1] / 1024 : 0; };
  if (!fs.existsSync('/proc/meminfo')) return null;                 // Linux only
  const floor = +process.env.MEM_FLOOR_MB || Math.max(1000, mb('MemTotal') * 0.15);
  return setInterval(() => {
    const avail = mb('MemAvailable');
    if (avail >= floor) return;
    log(`  stopped: ${avail.toFixed(0)} MB of memory left (floor ${floor.toFixed(0)} MB); this commit is given up`);
    fs.writeFileSync(path.join(dir, 'failed.json'), JSON.stringify({ attempts: 2, error: `out of memory: ${avail.toFixed(0)} MB left while checking this commit` }));
    process.exit(3);
  }, 2000);
}

(async () => {
  ensureClone();
  fs.mkdirSync(out, { recursive: true });
  if (R.restores) writeRestores();
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
    // the attempt counts from its start: a walk stopped during the commit (a time limit, a lost machine)
    // leaves this behind, so a commit that stops the walk twice is skipped like one that failed twice
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'failed.json'), JSON.stringify({ attempts: attempts + 1, error: 'the walk was stopped during this commit' }));
    const watch = memoryWatch(dir);
    try {
      // evidence for labelling, from the commit itself (label.js adds what later commits say). What the
      // author wrote about the change: changesets (.changeset/*.md), or Beachball change files (change/*.json,
      // Fluent UI), of which only the type and comment are kept (they also hold the author's email)
      const show = (f) => { try { return git(['show', `${c.sha}:${f}`]); } catch (e) { return ''; } };
      const beachball = (f) => { try { const j = JSON.parse(show(f)); return j.comment ? `${j.type || 'change'}: ${j.comment}` : ''; } catch (e) { return ''; } };
      const added = (f) => { try { return git(['diff', '-U0', '--no-color', c.parent, c.sha, '--', f]).split('\n').filter((l) => /^\+(?!\+\+ )/.test(l)).map((l) => l.slice(1)).join('\n'); } catch (e) { return ''; } };
      const changeset = c.files.map((f) => (CHANGESET.test(f) ? show(f) : CHANGELOG && CHANGELOG.test(f) ? added(f) : /^change\/.*\.json$/.test(f) ? beachball(f) : '')).filter(Boolean).join('\n');
      // a merged PR's subject is "Merge pull request #N from <branch>"; its title is the first line of the body
      const title = R.merges && /^Merge pull request #\d+/.test(c.subject) ? git(['log', '-1', '--format=%b', c.sha]).trim().split('\n')[0] : '';
      const meta = { repo: NAME, sha: c.sha, parent: c.parent, date: c.date, subject: title ? `${title} (#${c.pr})` : c.subject, pr: c.pr, components: comps, files: c.files,
        snapshotsUpdated: c.files.filter((f) => SNAP.test(f)), changeset: changeset.slice(0, 4000) };
      const s = await check(c, comps);
      for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (/\.(png|html)$/.test(f)) fs.unlinkSync(path.join(dir, f));
      const n = s ? s.pages.reduce((k, p) => k + p.findings.filter((f) => !f.sameAs).length, 0) : 0;
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ ...meta, recipe: R.version || 1, stories: s ? s.pages.length : 0, findings: n, ms: Date.now() - t0 }, null, 1));
      if (!s) fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({ pages: [] }));
      log(`  ${n} findings in ${s ? s.targets : 0} story states (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      fs.rmSync(path.join(dir, 'failed.json'), { force: true });
      done++; failedInARow = 0;
    } catch (e) {
      log(`  failed: ${(e.stderr || e.message || '').toString().split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 300)}`);
      // the end of each stream, kept apart: a build's error is often on stdout, under pages of warnings on stderr
      const tail = (t) => String(t || '').slice(-2000);
      const error = e.stdout || e.stderr ? `${String(e.message).split('\n')[0].slice(0, 300)}\n--- stdout (end)\n${tail(e.stdout)}\n--- stderr (end)\n${tail(e.stderr)}` : String(e.stack || e.message).slice(-3000);
      fs.writeFileSync(path.join(dir, 'failed.json'), JSON.stringify({ attempts: attempts + 1, error }));
      done++; failedInARow++;
    } finally { clearInterval(watch); }
    prune(new Set());                       // builds are per commit pair; keep the disk small
  }
})();
