// Periodically snapshot real, data-driven sites whose UI code is (almost certainly) unchanged
// over a few hours but whose content churns. Raw snapshots are stored so any later canonicalizer
// can be evaluated on the whole time series. Usage: node capture-live.js <outDir> [rounds] [minutes]
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { newStablePage, settle, extract, saveSnapshot } = require('../../src/capture.js');

const SITES = {
  hn: 'https://news.ycombinator.com/',
  hnnew: 'https://news.ycombinator.com/newest',
  lobsters: 'https://lobste.rs/',
  wiki: 'https://en.wikipedia.org/wiki/Main_Page',
  ghtrending: 'https://github.com/trending',
};

async function round(browser, outDir, stamp) {
  for (const [name, url] of Object.entries(SITES)) {
    const { ctx, page } = await newStablePage(browser);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.waitForLoadState('load'));
      await settle(page);
      const t0 = Date.now();
      const snap = await extract(page);
      snap.stats.wallMs = Date.now() - t0;
      const t1 = Date.now();
      const png = await page.screenshot({ fullPage: true });
      snap.stats.screenshotMs = Date.now() - t1;
      const dir = path.join(outDir, name);
      saveSnapshot(path.join(dir, `${stamp}.json.gz`), snap);
      fs.writeFileSync(path.join(dir, `${stamp}.png`), png);
      console.log(new Date().toISOString(), name, snap.stats);
    } catch (e) {
      console.log(new Date().toISOString(), name, 'ERR', e.message.split('\n')[0]);
    } finally { await ctx.close(); }
  }
}

(async () => {
  const outDir = process.argv[2] || 'live-data';
  const rounds = +(process.argv[3] || 1);
  const minutes = +(process.argv[4] || 20);
  for (let i = 0; i < rounds; i++) {
    const browser = await chromium.launch();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await round(browser, outDir, stamp);
    await browser.close();
    if (i < rounds - 1) await new Promise((r) => setTimeout(r, minutes * 60000));
  }
})();
