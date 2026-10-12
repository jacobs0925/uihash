// Text/structure mutations on live pages, with ground truth from the time series: text that was the
// same in EVERY snapshot of the series is chrome (nav labels, headings, footers); text that changed
// during the series is data (titles, names, counts). Mutating chrome must be flagged; mutating data
// must not. Mutations: one-letter typo in a text node, or removing the element that holds it.
// Usage: node live-dom-mutate.js <seriesDir> [perKind]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { newStablePage, settle, extract, loadSnapshot } = require('../../src/capture.js');
const { calibrate, check } = require('../../src/fingerprint.js');

const SITES = { hn: 'https://news.ycombinator.com/', lobsters: 'https://lobste.rs/', wiki: 'https://en.wikipedia.org/wiki/Main_Page', ghtrending: 'https://github.com/trending' };

function textsOf(snap) {
  const out = new Set();
  (function w(n) { for (const c of n.c || []) { if (typeof c === 'string') { const t = c.replace(/\s+/g, ' ').trim(); if (t) out.add(t); } else if (!c.x) w(c); } })(snap.root);
  return out;
}

// In the page: pick text nodes whose (whitespace-normalized) text is in `wanted`, visible, with letters.
function pickTextNodes([wanted, n, seed]) {
  let s = seed >>> 0; const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
  const set = new Set(wanted);
  const nodes = [];
  const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = it.nextNode());) {
    const txt = t.nodeValue.replace(/\s+/g, ' ').trim();
    if (!set.has(txt) || !/[a-zA-Z]{3}/.test(txt) || txt.length > 60) continue;
    const el = t.parentElement; const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || getComputedStyle(el).visibility === 'hidden') continue;
    nodes.push(t);
  }
  const picked = [];
  while (picked.length < n && nodes.length) picked.push(nodes.splice(Math.floor(rnd() * nodes.length), 1)[0]);
  window.__uihashPicked = picked;
  return picked.map((t) => t.nodeValue.replace(/\s+/g, ' ').trim());
}
function mutate([i, kind]) {
  const t = window.__uihashPicked[i];
  if (kind === 'typo') {
    const v = t.nodeValue; const j = v.search(/[a-zA-Z]{3}/) + 1;
    window.__undo = () => { t.nodeValue = v; };
    t.nodeValue = v.slice(0, j) + (v[j] === 'x' ? 'y' : 'x') + v.slice(j + 1);
  } else {
    const el = t.parentElement; const parent = el.parentNode; const next = el.nextSibling;
    window.__undo = () => parent.insertBefore(el, next);
    el.remove();
  }
}

(async () => {
  const [seriesDir, perKind = 6] = process.argv.slice(2);
  const browser = await chromium.launch();
  for (const [name, url] of Object.entries(SITES)) {
    const files = fs.readdirSync(path.join(seriesDir, name)).filter((f) => f.endsWith('.json.gz')).sort();
    let series = files.map((f) => loadSnapshot(path.join(seriesDir, name, f)));
    const med = series.map((x) => x.stats.elements).sort((a, b) => a - b)[Math.floor(series.length / 2)];
    series = series.filter((x) => x.stats.elements >= med / 2);   // drop error pages ("upstream request failed")
    const sets = series.map(textsOf);
    const all = new Set(sets.flatMap((x) => [...x]));
    const chrome = [...all].filter((t) => sets.every((x) => x.has(t)));
    const data = [...all].filter((t) => sets.filter((x) => x.has(t)).length < sets.length);
    const { ctx, page } = await newStablePage(browser);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
      await settle(page);
      const base = await extract(page);
      const schema = calibrate([...series, base]);
      const res = {};
      for (const [cls, pool] of [['chrome', chrome], ['data', data]]) {
        const picked = await page.evaluate(pickTextNodes, [pool, +perKind, 7]).catch(() => []);
        for (const kind of ['typo', 'remove']) {
          for (let i = 0; i < picked.length; i++) {
            await page.evaluate(mutate, [i, kind]);
            const snap = await extract(page);
            await page.evaluate(() => window.__undo());
            const r = check(snap, schema);
            const k = `${cls}/${kind}`; res[k] = res[k] || [0, 0, []]; res[k][1]++; if (!r.ok) { res[k][0]++; } else if (cls === 'chrome') res[k][2].push(picked[i]);
            if (cls === 'data' && !r.ok) res[k][2].push(picked[i] + ' :: ' + r.findings.filter((f) => f.severity === 'error').map((f) => f.type + ' ' + ((f.details || [])[0] || { changes: [''] }).changes[0]).join(' | ').slice(0, 160));
          }
        }
      }
      console.log(`${name}: ${chrome.length} chrome texts / ${data.length} data texts over ${series.length} snapshots`);
      for (const [k, [f, n, ex]] of Object.entries(res)) console.log(`   ${k.padEnd(14)} flagged ${f}/${n}${ex.length ? '   ' + (k.startsWith('chrome') ? 'missed: ' : 'flagged: ') + JSON.stringify(ex.slice(0, 3)).slice(0, 300) : ''}`);
    } catch (e) { console.log(name, 'ERR', e.message.split('\n')[0]); } finally { await ctx.close(); }
  }
  await browser.close();
})();
