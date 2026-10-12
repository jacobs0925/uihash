// Changes a later PR undid. A finding of PR A ("prop: x → y" on an element) and a finding of a later
// PR B on the same page state and element with "prop: y → x" mean B put back what A changed. A change
// that gets reverted within days was most likely not meant: this is the cheapest regression label the
// self-improvement loop can mine from a repository's history (SZZ-style, see HANDOFF.md).
//
// undone(summaryA, summaryB) -> [{ a, b, prop, from, to }]   (a, b: finding signatures)
// Usage: node learn/undo.js <summaryA.json> <summaryB.json>
const fs = require('fs');

const strip = (v) => v.replace(/ · ΔE00 .*$/, '').replace(/ · .*$/, '').trim();
function changesOf(f) {
  const out = [];
  for (const c of f.changes) {
    const m = /^([@a-z-]+|--[a-z0-9-]+|text): (.*?) → (.*)$/.exec(c);
    if (m) out.push({ prop: m[1], from: strip(m[2]), to: strip(m[3]) });
  }
  return out;
}
const where = (p, f) => [p.page, p.state, p.vp, f.path].join('|');
const sig = (p, f) => [p.page, p.state, p.vp, f.type, f.path, ...f.changes].join('|');

function undone(A, B) {
  const later = new Map();
  for (const p of B.pages) for (const f of p.findings) for (const c of changesOf(f)) later.set(`${where(p, f)}|${c.prop}|${c.to}|${c.from}`, sig(p, f));
  const out = [];
  for (const p of A.pages) for (const f of p.findings) for (const c of changesOf(f)) {
    const b = later.get(`${where(p, f)}|${c.prop}|${c.from}|${c.to}`);
    if (b) out.push({ a: sig(p, f), b, prop: c.prop, from: c.from, to: c.to });
  }
  return out;
}

if (require.main === module) {
  const [a, b] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  for (const u of undone(a, b)) console.log(`${u.prop}: ${u.from} → ${u.to}, undone later   (${u.a.split('|').slice(0, 2).join(' / ')})`);
}
module.exports = { undone, changesOf };
