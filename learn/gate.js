// Promotion gate (HANDOFF.md, "Retrain, evaluate, gate"): may a candidate model replace the current one?
// Usage: node learn/gate.js --current learn/model.json --candidate model.json <rows.jsonl> [--newest <set>] [--out gate.md]
// Scores the evaluation rows (split=eval, from dataset.js --eval) with both models, as uihash would
// (src/model.js), and per evaluation set checks:
//   1. PR-level AUROC (regressions vs deliberate PRs; for mixed PRs, the mistake side vs the deliberate
//      side): the candidate fails if the bootstrap 95 % interval of (candidate - current), resampling
//      PRs, lies below 0;
//   2. at each model's own flag threshold, combined with the rules as shipped (a finding is flagged when
//      the rules or the model flag it): no set loses more than one PR on either side ("regression
//      flagged", "deliberate left alone", and both sides of mixed PRs);
//   3. --newest (the newest month, held out by time): its AUROC point estimate is not lower.
// Exit code 0 when the candidate passes, 1 when it does not.
const fs = require('fs');
const { loadModel, scoreOf } = require('../src/model.js');

const rulesFlag = (r) => r.triage === 'breaks' || r.triage === 'check';

function perPR(rows, m) {
  const out = new Map();
  for (const r of rows) {
    const s = scoreOf(m, r.x), f = rulesFlag(r) || s >= m.thresholds.flag;
    const d = out.get(r.pr) || { kind: r.kind, max: 0, m: 0, d: 0, flag: false, fm: false, fd: false };
    d.max = Math.max(d.max, s); d.flag = d.flag || f;
    if (r.side === 'mistake') { d.m = Math.max(d.m, s); d.fm = d.fm || f; } else { d.d = Math.max(d.d, s); d.fd = d.fd || f; }
    out.set(r.pr, d);
  }
  return out;
}

// AUROC of positives over negatives (ties count half)
function auroc(pos, neg) {
  if (!pos.length || !neg.length) return null;
  let k = 0;
  for (const p of pos) for (const n of neg) k += p > n ? 1 : p === n ? 0.5 : 0;
  return k / (pos.length * neg.length);
}
// a set's scores to rank: regressions and mistake sides positive, deliberate PRs and sides negative
function pairs(prs) {
  const pos = [], neg = [];
  for (const v of prs) {
    if (v.kind === 'regression') pos.push(v.max);
    else if (v.kind === 'deliberate') neg.push(v.max);
    else { pos.push(v.m); neg.push(v.d); }
  }
  return [pos, neg];
}
function counts(prs) {
  const c = { reg: 0, dl: 0, mm: 0, md: 0 };
  for (const v of prs) {
    if (v.kind === 'regression') c.reg += v.flag ? 1 : 0;
    else if (v.kind === 'deliberate') c.dl += v.flag ? 0 : 1;
    else { c.mm += v.fm ? 1 : 0; c.md += v.fd ? 0 : 1; }
  }
  return c;
}

// seeded so the gate gives the same answer twice
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

function gate(rows, cur, cand, { newest = null, B = 1000 } = {}) {
  const ev = rows.filter((r) => r.split === 'eval');
  const sets = [...new Set(ev.map((r) => r.set))].sort();
  const res = [];
  for (const set of sets) {
    const rs = ev.filter((r) => r.set === set);
    const A = perPR(rs, cur), C = perPR(rs, cand), ids = [...A.keys()];
    const aA = auroc(...pairs([...A.values()])), aC = auroc(...pairs([...C.values()]));
    const why = [];
    let lo = null, hi = null;
    if (aA !== null && aC !== null) {
      const r = rng(12345), diffs = [];
      for (let b = 0; b < B; b++) {
        const pick = ids.map(() => ids[Math.floor(r() * ids.length)]);
        const x = auroc(...pairs(pick.map((i) => A.get(i)))), y = auroc(...pairs(pick.map((i) => C.get(i))));
        if (x !== null && y !== null) diffs.push(y - x);
      }
      diffs.sort((p, q) => p - q);
      lo = diffs[Math.floor(0.025 * diffs.length)]; hi = diffs[Math.floor(0.975 * diffs.length) - 1];
      if (hi < 0) why.push(`AUROC worse: ${aC.toFixed(3)} vs ${aA.toFixed(3)} (95 % interval of the difference ${lo.toFixed(3)} to ${hi.toFixed(3)})`);
      if (set === newest && aC < aA) why.push(`newest set: AUROC ${aC.toFixed(3)} < ${aA.toFixed(3)}`);
    }
    const ca = counts(A.values()), cc = counts(C.values());
    const names = { reg: 'regressions flagged', dl: 'deliberate PRs left alone', mm: 'mixed: mistake side flagged', md: 'mixed: deliberate side left alone' };
    for (const k of Object.keys(names)) if (ca[k] - cc[k] > 1) why.push(`${names[k]}: ${cc[k]} vs ${ca[k]}`);
    res.push({ set, prs: ids.length, aurocCurrent: aA, aurocCandidate: aC, lo, hi, current: ca, candidate: cc, pass: !why.length, why });
  }
  return { pass: res.length > 0 && res.every((x) => x.pass), sets: res };
}

function markdown(g) {
  const f = (x) => (x === null ? 'n/a' : x.toFixed(3));
  const L = [`# Promotion gate: ${g.pass ? 'PASS' : 'FAIL'}`, '', '| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |', '|---|---|---|---|---|---|---|---|---|---|'];
  for (const s of g.sets) L.push(`| ${s.set} | ${s.prs} | ${f(s.aurocCurrent)} | ${f(s.aurocCandidate)} | ${s.lo === null ? 'n/a' : `${f(s.lo)} to ${f(s.hi)}`} | ${s.current.reg} → ${s.candidate.reg} | ${s.current.dl} → ${s.candidate.dl} | ${s.current.mm} → ${s.candidate.mm} | ${s.current.md} → ${s.candidate.md} | ${s.pass ? 'pass' : s.why.join('; ')} |`);
  if (!g.sets.length) L.push('', 'No evaluation rows: nothing to gate on, so the candidate does not pass.');
  return L.join('\n') + '\n';
}

if (require.main === module) {
  const a = process.argv.slice(2), opt = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  const file = a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
  if (!file || !opt('--current') || !opt('--candidate')) { console.error('usage: node learn/gate.js --current <model.json> --candidate <model.json> <rows.jsonl> [--newest <set>] [--out gate.md]'); process.exit(2); }
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const g = gate(rows, loadModel(opt('--current')), loadModel(opt('--candidate')), { newest: opt('--newest') });
  const md = markdown(g);
  if (opt('--out')) fs.writeFileSync(opt('--out'), md);
  process.stdout.write(md);
  process.exit(g.pass ? 0 : 1);
}
module.exports = { gate, markdown, auroc };
