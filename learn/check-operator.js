// Acceptance check for an operator (HANDOFF.md, "Grow the synthetic side"), before a person reviews its code:
//   - generate.js runs it on every testbed (testbeds it cannot apply to are reported)
//   - at least 70 % of its PRs produce findings
//   - a deliberate operator trips the rules (a finding labelled breaks or check) on at most 10 % of its PRs
// Usage: node learn/check-operator.js <op-id>[,<op-id>...] [--n 6] [--out dir]   generate n PRs per testbed and check
//        node learn/check-operator.js --from data/synth                         check every operator on an existing corpus
// Exit code 1 when an operator fails.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { OPS } = require('./operators.js');

const APPS = ['mailbox', 'dashboard', 'scroller', 'shop', 'admin'];
const MIN_FINDINGS = 0.7, MAX_RULE_FLAGS = 0.1;
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// per operator: { kind, prs, withFindings, ruleFlagged, apps: { app: prs } } from a generate.js output dir
function stats(dir, only = null) {
  const out = {};
  const root = path.join(dir, 'prs');
  for (const id of fs.existsSync(root) ? fs.readdirSync(root) : []) {
    if (!id.startsWith('s')) continue;
    const d = path.join(root, id);
    if (!fs.existsSync(path.join(d, 'label.json'))) continue;
    const L = read(path.join(d, 'label.json')), op = L.ops[0];
    if (only && !only.includes(op.op)) continue;
    const st = out[op.op] = out[op.op] || { kind: op.kind, prs: 0, withFindings: 0, ruleFlagged: 0, apps: {} };
    st.prs++; st.apps[L.app] = (st.apps[L.app] || 0) + 1;
    if (L.findings > 0) st.withFindings++;
    const s = fs.existsSync(path.join(d, 'summary.json')) ? read(path.join(d, 'summary.json')) : { pages: [] };
    if (s.pages.some((p) => p.findings.some((f) => !f.sameAs && (f.triage === 'breaks' || f.triage === 'check')))) st.ruleFlagged++;
  }
  return out;
}

function verdict(st) {
  const why = [];
  const fShare = st.prs ? st.withFindings / st.prs : 0, rShare = st.prs ? st.ruleFlagged / st.prs : 0;
  if (!st.prs) why.push('no PRs');
  if (fShare < MIN_FINDINGS) why.push(`only ${(fShare * 100).toFixed(0)} % of its PRs have findings (needs ${MIN_FINDINGS * 100} %)`);
  if (st.kind === 'deliberate' && rShare > MAX_RULE_FLAGS) why.push(`the rules flag ${(rShare * 100).toFixed(0)} % of its PRs (at most ${MAX_RULE_FLAGS * 100} % for a deliberate operator)`);
  return { pass: !why.length, why, fShare, rShare };
}

function report(all) {
  let failed = 0;
  console.log('| operator | kind | PRs | with findings | rules flag | testbeds | verdict |\n|---|---|---|---|---|---|---|');
  for (const [id, st] of Object.entries(all).sort()) {
    const v = verdict(st);
    if (!v.pass) failed++;
    const missing = APPS.filter((a) => !st.apps[a]);
    console.log(`| ${id} | ${st.kind} | ${st.prs} | ${(v.fShare * 100).toFixed(0)} % | ${(v.rShare * 100).toFixed(0)} % | ${Object.keys(st.apps).length}/${APPS.length}${missing.length ? ` (not: ${missing.join(', ')})` : ''} | ${v.pass ? 'pass' : 'FAIL: ' + v.why.join('; ')} |`);
  }
  return failed;
}

if (require.main === module) {
  const a = process.argv.slice(2), opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  if (a.includes('--from')) process.exit(report(stats(opt('--from'))) ? 1 : 0);
  const ids = (a[0] || '').split(',').filter(Boolean);
  const unknown = ids.filter((id) => !OPS.some((o) => o.id === id));
  if (!ids.length || unknown.length) { console.error(unknown.length ? `unknown operator(s): ${unknown.join(', ')}` : 'usage: node learn/check-operator.js <op-id>[,...] [--n 6] [--out dir] | --from <corpus>'); process.exit(2); }
  const n = +opt('--n', 6), out = opt('--out', fs.mkdtempSync(path.join(os.tmpdir(), 'uihash-op-')));
  // ids alternate deliberate / mistake, so 2n ids give n PRs of the operator's kind per testbed
  APPS.forEach((app, i) => {
    const r = spawnSync(process.execPath, [path.join(__dirname, 'generate.js'), out, String(2 * n), String(i * 10000)],
      { env: { ...process.env, OPS: ids.join(','), APPS: app }, encoding: 'utf8' });
    if (r.status !== 0) console.error(`${app}: generate.js exited with ${r.status}\n${(r.stderr || '').slice(-400)}`);
  });
  const failed = report(stats(out, ids));
  console.log(`\noutput: ${out}`);
  process.exit(failed ? 1 : 0);
}
module.exports = { stats, verdict };
