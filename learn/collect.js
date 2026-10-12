// Collector for the self-improvement loop (HANDOFF.md, "Collect"): for every merged PR of a repository
// that ran the uihash workflow, store what uihash reported and what happened to the PR. Labels nothing.
// Usage: node learn/collect.js <owner/repo> [--raw raw] [--since 2026-01-01] [--workflow uihash.yml] [--limit 200]
// Writes raw/<owner>__<repo>/<pr>/
//   summary.json   from the `uihash-report` artifact of the PR's last uihash run (artifacts expire: run nightly)
//   meta.json      { repo, pr, title, body, labels, mergedAt, changedFiles, comment (the uihash comment as it
//                    stands, reviewer ticks included), reactions, approvedSignature, signature, run }
// Needs the GitHub CLI (`gh`) logged in with read access to the repository. Never modifies a PR.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
const ghJson = (...a) => JSON.parse(gh(...a));

function opts(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i]; else o._.push(argv[i]);
  return o;
}

// the uihash comment on a PR, as it stands (the bot's sticky comment)
function uihashComment(repo, pr) {
  const all = ghJson('api', '--paginate', '--slurp', `repos/${repo}/issues/${pr}/comments?per_page=100`).flat();
  return all.find((c) => c.body && c.body.startsWith('<!-- uihash -->')) || null;
}

// the newest uihash run of the PR's last commit that uploaded a report
function lastRun(repo, workflow, pr) {
  const runs = ghJson('run', 'list', '-R', repo, '--workflow', workflow, '--commit', pr.headRefOid, '--json', 'databaseId,event,createdAt,conclusion', '--limit', '20')
    .filter((r) => r.event === 'pull_request').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return runs[0] || null;
}

function collect(repo, { raw = 'raw', since, workflow = 'uihash.yml', limit = 200, log = console.log } = {}) {
  try { gh('workflow', 'view', workflow, '-R', repo, '--yaml'); } catch (e) { throw new Error(`${repo} has no workflow ${workflow} (pass --workflow <file name of the uihash workflow>)`); }
  const dir = path.join(raw, repo.replace('/', '__'));
  const search = since ? `merged:>=${since}` : '';
  const prs = ghJson('pr', 'list', '-R', repo, '--state', 'merged', '--limit', String(limit), '--search', search,
    '--json', 'number,title,body,labels,mergedAt,headRefOid,files');
  let stored = 0;
  for (const pr of prs) {
    const out = path.join(dir, String(pr.number));
    if (fs.existsSync(path.join(out, 'summary.json')) && fs.existsSync(path.join(out, 'meta.json'))) {
      // refresh what can still change after the merge: reviewer ticks on the comment
      const meta = JSON.parse(fs.readFileSync(path.join(out, 'meta.json'), 'utf8'));
      const c = uihashComment(repo, pr.number);
      if (c && c.body !== meta.comment) { meta.comment = c.body; meta.reactions = c.reactions; fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1)); }
      continue;
    }
    const run = lastRun(repo, workflow, pr);
    if (!run) { log(`#${pr.number}: no uihash run`); continue; }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uihash-collect-'));
    try {
      gh('run', 'download', String(run.databaseId), '-R', repo, '-n', 'uihash-report', '-D', tmp);
    } catch (e) { log(`#${pr.number}: no report artifact for run ${run.databaseId} (expired?)`); fs.rmSync(tmp, { recursive: true, force: true }); continue; }
    const c = uihashComment(repo, pr.number);
    const summary = JSON.parse(fs.readFileSync(path.join(tmp, 'summary.json'), 'utf8'));
    fs.mkdirSync(out, { recursive: true });
    fs.copyFileSync(path.join(tmp, 'summary.json'), path.join(out, 'summary.json'));
    fs.rmSync(tmp, { recursive: true, force: true });
    const approved = c && (c.body.match(/<!-- uihash-approved: (\w+) -->/) || [])[1];
    fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({
      repo, pr: pr.number, title: pr.title, body: pr.body, labels: pr.labels.map((l) => l.name), mergedAt: pr.mergedAt,
      changedFiles: (pr.files || []).map((f) => f.path), comment: c ? c.body : null, reactions: c ? c.reactions : null,
      approvedSignature: approved || null, signature: summary.signature, run: run.databaseId,
    }, null, 1));
    stored++;
    log(`#${pr.number}: stored (${summary.pages.reduce((k, p) => k + p.findings.length, 0)} findings)`);
  }
  return stored;
}

if (require.main === module) {
  const o = opts(process.argv.slice(2));
  if (!o._[0]) { console.error('usage: node learn/collect.js <owner/repo> [--raw raw] [--since YYYY-MM-DD] [--workflow uihash.yml] [--limit 200]'); process.exit(2); }
  try {
    const n = collect(o._[0], { raw: o.raw, since: o.since, workflow: o.workflow, limit: +o.limit || 200 });
    console.log(`${n} new PR(s) stored`);
  } catch (e) { console.error(e.message.split('\n')[0]); process.exit(1); }
}
module.exports = { collect };
