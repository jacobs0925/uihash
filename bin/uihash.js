#!/usr/bin/env node
// uihash — fingerprint a rendered web UI, ignoring data and nondeterminism.
//
//   uihash calibrate <url>... [--runs 6] [--out schema.json]   learn what varies (same build, varied data)
//   uihash check     <url>  --schema schema.json               exit 0 = same UI, 1 = changed (explained)
//   uihash digest    <url>  --schema schema.json               one hash for one render (fixed fixtures)
//   uihash approve   <url>  --schema schema.json               "this render is fine": re-learn with it included
//   uihash snapshot  <url>  --out snap.json.gz                 raw snapshot for offline use
//   uihash controls  <old> <new>                               controls (buttons, links, fields) the new
//                                                              page lacks or adds, e.g. old UI vs rebuild
//   uihash pr --base <url> --head <url> --config uihash.config.json --out uihash-report
//             [--cache-dir dir --cache-key <base sha>] [--image-base-url <url, may contain {file}>]
//             [--expect-no-change]   (the PR says it changes no UI: every finding is to check)
//                                                              PR check: base vs head, report + PR comment
// UI states (menus, dialogs, tabs): --state name=selector[;selector...] (repeatable) clicks the
// selectors in order after load; each state gets its own schema, and check/digest replay them.
// --pseudo hover,focus,active adds states with those pseudo-classes forced on every element a rule
// or interaction targets (styles a static render never shows); any pseudo-class Chromium can force
// works too (disabled, checked, user-invalid, open, ...); --state dark=@dark / print=@print
// emulate media.
// Snapshots (*.json.gz) are accepted anywhere a URL is. A URL may contain {i} (1..runs) to vary
// fixture data per calibration run, e.g. "http://localhost:3000/inbox?seed={i}".
// Common options: --width 1280 --height 800 --wait <ms> --keys class|tag --full (no lazy reads)
//                 --latent (also fingerprint closed components kept hidden in the DOM)
//                 --no-stable (skip re-extracting until two consecutive snapshots agree)
//                 --strict (warnings fail too; by default only errors do)
//                 --json (machine-readable check/digest output for CI)
const fs = require('fs');
const path = require('path');
const { newStablePage, settle, extract, stableCapture, forceState, hashAssets, saveSnapshot, loadSnapshot } = require('../src/capture.js');
const { calibrate, check, digest } = require('../src/fingerprint.js');

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      if (k === 'state') (o.state = o.state || []).push(v); else o[k] = v;
    } else o._.push(a);
  }
  return o;
}

// A state is a list of actions: CSS selectors to click, or @hover / @focus / @active (forced
// pseudo-classes) and @dark / @print (emulated media), so a saved schema replays them as recorded.
function statesOf(o) {
  const states = [{ name: 'base', actions: [] }];
  for (const spec of o.state || []) { const i = spec.indexOf('='); states.push({ name: spec.slice(0, i), actions: spec.slice(i + 1).split(';').filter(Boolean) }); }
  for (const ps of String(o.pseudo || '').split(',').filter(Boolean)) states.push({ name: ps, actions: ['@' + ps] });
  return states;
}
const MEDIA = { '@dark': { colorScheme: 'dark' }, '@print': { media: 'print' } };

async function snapshots(targets, o, runs = 1, actions = []) {
  const out = [];
  const urls = [];
  for (const t of targets) {
    if (/\.json(\.gz)?$/.test(t)) { out.push(loadSnapshot(t)); continue; }
    for (let i = 1; i <= runs; i++) urls.push(t.replace(/\{i\}/g, String(i)));
  }
  if (urls.length) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    for (const url of urls) {
      const { ctx, page } = await newStablePage(browser, { width: +(o.width || 1280), height: +(o.height || 800) });
      for (const a of actions) if (MEDIA[a]) await page.emulateMedia(MEDIA[a]);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => page.waitForLoadState('load'));
      if (o.wait) await page.waitForTimeout(+o.wait);
      for (const sel of actions) if (!sel.startsWith('@')) { await page.click(sel, { timeout: 10000 }); await page.waitForTimeout(50); }
      await settle(page);
      for (const a of actions) if (a.startsWith('@') && !MEDIA[a]) await forceState(page, a.slice(1));
      // Stable before extracting: no change for a while and none during the extraction (or, for a page
      // that keeps changing, two consecutive extractions with the same canonical hash).
      const xo = { full: !!o.full, latent: !!o.latent };
      const snap = await hashAssets(page, o['no-stable'] ? await extract(page, xo) : JSON.parse((await stableCapture(page, { extractOpts: xo, canonOpts: { latent: !!o.latent } })).raw));
      process.stderr.write(`captured ${url}${actions.length ? ' after ' + actions.join(' → ') : ''} (${snap.stats.elements} elements, ${snap.stats.extractMs}ms)\n`);
      out.push(snap);
      await ctx.close();
    }
    await browser.close();
  }
  return out;
}

function printFindings(res) {
  // findings are one per root cause (check() merges positions with the same explanation)
  for (const f of res.findings.slice(0, 40)) {
    const n = (f.paths || []).length, els = Math.max(f.head.length, f.base.length);
    console.log(`${f.severity === 'warning' ? '⚠' : '✗'} ${f.type.padEnd(16)} ${f.path}${n > 1 ? `  (${n} places, ${els} elements)` : els > 1 ? `  (${els} elements)` : ''}`);
    for (const c of [...new Set((f.details || []).flatMap((d) => d.changes))].slice(0, 8)) console.log(`    ${c}`);
  }
  if (res.findings.length > 40) console.log(`… ${res.findings.length - 40} more`);
}

(async () => {
  const o = args(process.argv.slice(2));
  const cmd = o._.shift();
  if (cmd === 'calibrate') {
    const out = { v: 'uihash-states-1', states: {} };
    for (const st of statesOf(o)) {
      const snaps = await snapshots(o._, o, +(o.runs || 6), st.actions);
      if (snaps.length < 2) console.error('warning: calibrating from a single render — nothing can be learned to vary; use --runs ≥ 6 with varied data');
      const schema = calibrate(snaps, { keyMode: o.keys || 'class', latent: !!o.latent });
      out.states[st.name] = { actions: st.actions, schema };
      snaps.forEach((sn, i) => saveSnapshot(path.join((o.out || 'uihash.schema.json') + '.d', st.name, `${i}.json.gz`), sn));
      console.log(`state "${st.name}": ${schema.runs} runs, ${schema.stats.static} static / ${schema.stats.dynamic} dynamic positions${schema.stateClasses.length ? `, state classes [${schema.stateClasses.join(', ')}]` : ''}`);
    }
    const file = o.out || 'uihash.schema.json';
    fs.writeFileSync(file, JSON.stringify(out));
    console.log(`schema → ${file} (calibration renders kept in ${file}.d/ for \`approve\`)`);
  } else if (cmd === 'check' || cmd === 'digest') {
    if (!o.schema) throw new Error('--schema required');
    const file = JSON.parse(fs.readFileSync(o.schema));
    const states = file.states || { base: { actions: [], schema: file } };
    let failed = 0; const report = {};
    for (const [name, { actions, schema }] of Object.entries(states)) {
      const [snap] = await snapshots(o._.slice(0, 1), { ...o, latent: schema.opts.latent }, 1, actions);
      if (cmd === 'digest') { if (o.json) report[name] = digest(snap, schema); else console.log(`${digest(snap, schema)}  ${name}`); continue; }
      const res = check(snap, schema);
      if (o.json) { report[name] = { pass: res.pass, ok: res.ok, errors: res.errors, warnings: res.warnings, findings: res.findings }; if (!res.ok || (o.strict && !res.pass)) failed++; continue; }
      if (res.pass) console.log(`✓ ${name}: same UI (${res.ms.toFixed(1)}ms)`);
      else if (res.ok && !o.strict) { console.log(`⚠ ${name}: same UI, ${res.warnings} warning(s) (${res.ms.toFixed(1)}ms)${schema.runs < 6 ? ` — calibrated on ${schema.runs} renders; use ≥ 6 to make text changes errors` : ''}`); printFindings(res); }
      else { failed++; console.log(`✗ ${name}: UI changed, ${res.errors} error(s), ${res.warnings} warning(s) (${res.ms.toFixed(1)}ms)`); printFindings(res); }
    }
    if (o.json) console.log(JSON.stringify(report, null, 1));
    process.exitCode = failed ? 1 : 0;
  } else if (cmd === 'approve') {
    // Like a snapshot-test update: the flagged render is accepted as "same UI, other data", and every
    // state is re-learned from its stored calibration renders plus this one.
    if (!o.schema) throw new Error('--schema required');
    const file = JSON.parse(fs.readFileSync(o.schema));
    for (const [name, st] of Object.entries(file.states)) {
      const dir = path.join(o.schema + '.d', name);
      const prev = fs.readdirSync(dir).filter((f) => f.endsWith('.json.gz')).map((f) => loadSnapshot(path.join(dir, f)));
      const [snap] = await snapshots(o._.slice(0, 1), { ...o, latent: st.schema.opts.latent }, 1, st.actions);
      saveSnapshot(path.join(dir, `${prev.length}.json.gz`), snap);
      st.schema = calibrate([...prev, snap], st.schema.opts);
      console.log(`state "${name}": re-learned from ${prev.length + 1} renders`);
    }
    fs.writeFileSync(o.schema, JSON.stringify(file));
  } else if (cmd === 'pr') {
    if (!o.base || !o.head || !o.config) throw new Error('pr needs --base <url> --head <url> --config <file>');
    const { runPR } = require('../src/pr.js');
    const config = { ...require('../src/pr.js').loadConfig(o.config), ...(o['expect-no-change'] ? { expectNoChange: true } : {}) };
    const s = await runPR({ baseUrl: o.base, headUrl: o.head, config, outDir: o.out || 'uihash-report', cacheDir: o['cache-dir'], cacheKey: o['cache-key'], imageBaseUrl: o['image-base-url'], log: (m) => process.stderr.write(m + '\n') });
    for (const p of s.pages) {
      if (p.status === 'new') console.log(`• ${p.page} / ${p.state}: new, no baseline on the base build${p.message ? ` (${p.message})` : ''}`);
      else if (p.status === 'error') console.log(`✗ ${p.page} / ${p.state}: failed to render: ${p.message}`);
      else console.log(`${p.pass ? '✓' : p.ok ? '⚠' : '✗'} ${p.page} / ${p.state}${p.vp ? ` @ ${p.vp}` : ''}${p.pass ? '' : `: ${p.errors} error(s), ${p.warnings} warning(s)`}`);
    }
    console.log(`report → ${path.join(o.out || 'uihash-report', 'report.html')} (${(s.ms / 1000).toFixed(1)}s)`);
    process.exitCode = s.failed ? 1 : 0;
  } else if (cmd === 'controls') {
    if (o._.length < 2) throw new Error('controls needs <old url|snapshot> <new url|snapshot>');
    const { controlsDiff } = require('../src/controls.js');
    const [a, b] = await snapshots(o._.slice(0, 2), { ...o, latent: o.latent !== false });
    const d = controlsDiff(a, b);
    console.log(d.removed.length ? `only in the old page (${d.removed.length}):\n${d.removed.map((x) => '  - ' + x).join('\n')}` : 'nothing the old page had is missing');
    if (d.added.length) console.log(`only in the new page (${d.added.length}):\n${d.added.map((x) => '  + ' + x).join('\n')}`);
    process.exitCode = d.removed.length ? 1 : 0;
  } else if (cmd === 'snapshot') {
    const [snap] = await snapshots(o._.slice(0, 1), o);
    saveSnapshot(o.out || 'snapshot.json.gz', snap);
  } else {
    const lines = fs.readFileSync(__filename, 'utf8').split('\n').slice(1);
    console.log(lines.slice(0, lines.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  }
})().catch((e) => { console.error(e.message); process.exit(2); });
