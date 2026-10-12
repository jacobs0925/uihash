// Generate labelled synthetic pull requests on the testbeds in experiments/ and run each through `uihash pr`.
// Usage: node learn/generate.js <outDir> <count> [firstId]   single-change PRs (even ids deliberate, odd ids mistakes)
//        node learn/generate.js <outDir> --mixed <count>     PRs that combine a deliberate change and a mistake
//        APPS=shop,admin node learn/generate.js ...          only some testbeds
//        OPS=m-typo,d-gap node learn/generate.js ...         only some operators (ids of the other kind are skipped)
// Each PR leaves <outDir>/prs/<id>/{summary.json, label.json[, sides.json]} in the labelled-PR format that
// dataset.js reads (see HANDOFF.md); screenshots are deleted to save space. Resumable: PRs that already have
// a label.json are skipped, and a PR id always gets the same change, so runs can be split across machines.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { runPR } = require('../src/pr.js');
const { profile } = require('./profile.js');
const { OPS, apply, rnd, pick } = require('./operators.js');

const OUT = path.resolve(process.argv[2]);
const MIXED = process.argv[3] === '--mixed';
const COUNT = +(MIXED ? process.argv[4] : process.argv[3]) || 10;
const FIRST = +(process.argv[4] && !MIXED ? process.argv[4] : 0);
const SRC = path.join(__dirname, '..', 'experiments');
const VP = { width: 1280, height: 800 };
const APPS = {
  mailbox: { weight: 0.45, config: { runs: 6, viewport: VP, pages: [{ name: 'Inbox', path: 'mailbox/index.html?seed={i}', states: { 'Settings menu': '[aria-label="Settings"]', Compose: 'nav button' } }] } },
  dashboard: { weight: 0.4, config: { runs: 6, viewport: VP, pages: [{ name: 'Dashboard', path: 'dashboard/index.html?seed={i}' }] } },
  scroller: { weight: 0.15, config: { runs: 6, viewport: VP, pages: [{ name: 'Mail', path: 'scroller/index.html?seed={i}' }] } },
  shop: { weight: 0.5, config: { runs: 6, viewport: VP, pages: [{ name: 'Shop', path: 'shop/index.html?seed={i}', states: { 'sort menu': '.sort-btn' } }] } },
  admin: { weight: 0.5, config: { runs: 6, viewport: VP, pages: [{ name: 'People', path: 'admin/index.html?seed={i}', states: { 'row menu': '.more' } }] } },
};
// APPS=shop,admin limits a run to some testbeds (weights are renormalized)
const ONLY = process.env.OPS ? process.env.OPS.split(',') : null;
if (process.env.APPS) for (const a of Object.keys(APPS)) if (!process.env.APPS.split(',').includes(a)) delete APPS[a];
{ const t = Object.values(APPS).reduce((k, a) => k + a.weight, 0); for (const a of Object.values(APPS)) a.weight /= t; }
const sigOf = (p, f) => [p.page, p.state, p.vp, f.type, f.path, ...f.changes].join('|');

async function profiles() {
  const file = path.join(OUT, 'profiles.json');
  const out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  if (Object.keys(APPS).every((a) => out[a])) return out;
  const browser = await chromium.launch();
  for (const app of Object.keys(APPS).filter((a) => !out[a])) {
    const html = fs.readFileSync(path.join(SRC, app, 'index.html'), 'utf8');
    fs.mkdirSync(path.join(OUT, 'base', app), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'base', app, 'index.html'), html);
    const page = await browser.newPage({ viewport: VP });
    await page.goto('file://' + path.join(OUT, 'base', app, 'index.html') + '?seed=1');
    await page.waitForTimeout(300);
    out[app] = await profile(page, html);
    await page.close();
  }
  await browser.close();
  const now = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  fs.writeFileSync(file, JSON.stringify({ ...now, ...out }));
  return out;
}

async function runOne(id, app, P, edits, label) {
  const dir = path.join(OUT, 'prs', id);
  if (fs.existsSync(path.join(dir, 'label.json'))) return JSON.parse(fs.readFileSync(path.join(dir, 'label.json'), 'utf8'));
  const html = fs.readFileSync(path.join(OUT, 'base', app, 'index.html'), 'utf8');
  const head = apply(html, P, edits);
  if (!head) return null;
  const hdir = path.join(OUT, 'heads', id);
  fs.mkdirSync(path.join(hdir, app), { recursive: true });
  fs.writeFileSync(path.join(hdir, app, 'index.html'), head);
  const t0 = Date.now();
  const s = await runPR({ baseUrl: 'file://' + path.join(OUT, 'base') + '/', headUrl: 'file://' + hdir + '/', config: APPS[app].config, outDir: dir,
    cacheDir: path.join(OUT, 'cache'), cacheKey: app });
  for (const f of fs.readdirSync(dir)) if (/\.(png|html)$/.test(f)) fs.unlinkSync(path.join(dir, f));
  fs.rmSync(hdir, { recursive: true, force: true });
  const n = s.pages.reduce((k, p) => k + p.findings.filter((f) => !f.sameAs).length, 0);
  const out = { source: 'synthetic', confidence: 1, group: label.ops.map((o) => o.op).join('+'), ...label, id, app, findings: n, ms: Date.now() - t0 };
  fs.writeFileSync(path.join(dir, 'label.json'), JSON.stringify(out, null, 1));
  return out;
}

(async () => {
  const PROF = await profiles();
  const apps = Object.keys(APPS);
  const appOf = (r) => { let x = r(); for (const a of apps) { x -= APPS[a].weight; if (x <= 0) return a; } return apps[0]; };
  if (!MIXED) {
    for (let k = FIRST; k < FIRST + COUNT; k++) {
      const id = 's' + String(k).padStart(5, '0');
      const r = rnd(7919 * (k + 1));
      let made = null, app, op;
      for (let tries = 0; tries < 30 && !made; tries++) {
        app = appOf(r);
        const kind = k % 2 ? 'mistake' : 'deliberate';
        const ops = OPS.filter((o) => o.kind === kind && (!ONLY || ONLY.includes(o.id)));
        if (!ops.length) break;
        op = pick(r, ops);
        const html = fs.readFileSync(path.join(OUT, 'base', app, 'index.html'), 'utf8');
        made = op.make(PROF[app], r, html);
        if (made && !apply(html, PROF[app], made.edits)) made = null;
      }
      if (!made) { console.error(`${id}: no applicable operator`); continue; }
      try {
        const res = await runOne(id, app, PROF[app], made.edits, { ops: [{ op: op.id, kind: op.kind, desc: made.desc, edits: made.edits }], label: op.kind === 'mistake' ? 1 : 0 });
        console.log(`${id} ${app} ${op.id} (${made.desc}): ${res ? res.findings + ' findings, ' + (res.ms / 1000).toFixed(1) + 's' : 'no change'}`);
      } catch (e) { console.error(`${id} ${app} ${op.id}: ${e.message.split('\n')[0]}`); fs.rmSync(path.join(OUT, 'heads', id), { recursive: true, force: true }); }
    }
    return;
  }
  // mixed PRs: one deliberate and one mistake single-change PR of the same app, edits combined; the
  // findings that also appear in the deliberate change alone are its side, the rest the mistake's
  const singles = fs.readdirSync(path.join(OUT, 'prs')).filter((d) => d.startsWith('s')).map((d) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, 'prs', d, 'label.json'), 'utf8')); } catch (e) { return null; } })
    .filter((x) => x && x.findings > 0);
  const r = rnd(424242);
  for (let k = 0; k < COUNT; k++) {
    const id = 'x' + String(k).padStart(5, '0');
    const app = appOf(r), dl = singles.filter((x) => x.app === app && x.label === 0), ms = singles.filter((x) => x.app === app && x.label === 1);
    if (!dl.length || !ms.length) continue;
    const a = pick(r, dl), b = pick(r, ms);
    const rules = (x) => new Set(x.ops[0].edits.filter((e) => e.rule !== undefined).map((e) => e.rule));
    if ([...rules(a)].some((i) => rules(b).has(i))) continue;
    try {
      const res = await runOne(id, app, PROF[app], [...a.ops[0].edits, ...b.ops[0].edits], { ops: [a.ops[0], b.ops[0]], label: 1, parts: [a.id, b.id] });
      if (!res) continue;
      const s = JSON.parse(fs.readFileSync(path.join(OUT, 'prs', id, 'summary.json'), 'utf8'));
      const mine = new Set(JSON.parse(fs.readFileSync(path.join(OUT, 'prs', a.id, 'summary.json'), 'utf8')).pages.flatMap((p) => p.findings.map((f) => sigOf(p, f))));
      const side = {}; for (const p of s.pages) for (const f of p.findings) side[sigOf(p, f)] = mine.has(sigOf(p, f)) ? 'deliberate' : 'mistake';
      fs.writeFileSync(path.join(OUT, 'prs', id, 'sides.json'), JSON.stringify(side));
      console.log(`${id} ${app} ${a.ops[0].op} + ${b.ops[0].op}: ${res.findings} findings`);
    } catch (e) { console.error(`${id}: ${e.message.split('\n')[0]}`); }
  }
})();
