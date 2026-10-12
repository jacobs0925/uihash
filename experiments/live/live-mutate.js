// Mutation testing on real sites. One page load per site; snapshot it unmutated, then apply M
// realistic class-level CSS regressions one at a time (each reverted before the next), snapshotting
// and screenshotting each. Ground truth for "visible" = pixel difference vs. the unmutated render of
// the same load, so data cannot be confused with the mutation.
// Usage: node live-mutate.js <outDir> [mutationsPerSite]
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { newStablePage, settle, extract, saveSnapshot } = require('../../src/capture.js');

const SITES = process.env.SITES ? JSON.parse(process.env.SITES) : {
  hn: 'https://news.ycombinator.com/',
  lobsters: 'https://lobste.rs/',
  wiki: 'https://en.wikipedia.org/wiki/Main_Page',
  ghtrending: 'https://github.com/trending',
};

// Runs in the page: choose a random visible element that has a class, and write a rule for that
// class (so every instance changes, as a real stylesheet edit would).
function pickMutation(seed) {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const els = [...document.querySelectorAll('body [class]')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < 3000 && getComputedStyle(e).visibility !== 'hidden';
  });
  if (!els.length) return null;
  const el = els[Math.floor(rnd() * els.length)];
  const classes = [...el.classList].filter((c) => /^[a-zA-Z_][\w-]*$/.test(c));
  if (!classes.length) return null;
  const cls = classes[Math.floor(rnd() * classes.length)];
  const cs = getComputedStyle(el);
  const shift = (rgb) => {
    const m = rgb.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    if (p.length === 4 && p[3] === 0) return null;
    p[0] = p[0] > 127 ? p[0] - 40 : p[0] + 40;
    return `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
  };
  const px = (v, d) => { const n = parseFloat(v); return isNaN(n) ? null : `${n + d}px`; };
  const kinds = [
    () => ['color', shift(cs.color)],
    () => ['background-color', shift(cs.backgroundColor)],
    () => ['padding-left', px(cs.paddingLeft, 4)],
    () => ['padding-top', px(cs.paddingTop, 3)],
    () => ['margin-left', px(cs.marginLeft, 6)],
    () => ['font-size', px(cs.fontSize, 2)],
    () => ['font-weight', cs.fontWeight === '700' ? '400' : '700'],
    () => ['border-radius', px(cs.borderTopLeftRadius, 5)],
    () => ['display', 'none'],
    () => ['text-transform', 'uppercase'],
    () => ['letter-spacing', '1px'],
    () => ['opacity', '0.6'],
    () => ['text-decoration', 'underline'],
    () => ['line-height', px(cs.lineHeight, 4) || '30px'],
  ];
  for (let tries = 0; tries < 10; tries++) {
    const [prop, value] = kinds[Math.floor(rnd() * kinds.length)]();
    if (!value) continue;
    return { selector: '.' + CSS.escape(cls), prop, value, tag: el.tagName.toLowerCase(), instances: document.getElementsByClassName(cls).length };
  }
  return null;
}

const { PNG } = require('playwright-core/lib/utilsBundle');
function pixelsDifferIn(a, b, boxes) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return true;
  const inBox = (x, y) => !boxes || boxes.some(([bx, by, bw, bh]) => x >= bx - 3 && x <= bx + bw + 3 && y >= by - 3 && y <= by + bh + 3);
  for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
    const i = (y * A.width + x) * 4;
    if ((A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2]) && inBox(x, y)) return true;
  }
  return false;
}

(async () => {
  const outDir = process.argv[2] || 'live-mut';
  const M = +(process.argv[3] || 25);
  const browser = await chromium.launch();
  for (const [name, url] of Object.entries(SITES)) {
    const { ctx, page } = await newStablePage(browser);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.waitForLoadState('load'));
      await settle(page);
      const dir = path.join(outDir, name);
      fs.mkdirSync(dir, { recursive: true });
      const base = await extract(page);
      const basePng = await page.screenshot({ fullPage: true });
      saveSnapshot(path.join(dir, 'base.json.gz'), base);
      fs.writeFileSync(path.join(dir, 'base.png'), basePng);
      const meta = [];
      for (let i = 0; i < M; i++) {
        const mut = await page.evaluate(pickMutation, 1000 + i * 7919);
        if (!mut) continue;
        // ground truth: pixels inside the matched elements' boxes, right before vs right after
        const boxes = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height]; }), mut.selector);
        const pre = await page.screenshot({ fullPage: true });
        await page.evaluate((m) => {
          const st = document.createElement('style'); st.id = 'uihash-mutation';
          st.textContent = `${m.selector} { ${m.prop}: ${m.value} !important; }`;
          document.head.appendChild(st);
        }, mut);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const snap = await extract(page);
        const png = await page.screenshot({ fullPage: true });
        const boxesAfter = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height]; }), mut.selector);
        mut.visible = pixelsDifferIn(pre, png, boxes.concat(boxesAfter));
        mut.visibleAnywhere = pixelsDifferIn(pre, png, null);
        saveSnapshot(path.join(dir, `mut${i}.json.gz`), snap);
        fs.writeFileSync(path.join(dir, `mut${i}.png`), png);
        await page.evaluate(() => document.getElementById('uihash-mutation').remove());
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        meta.push({ i, ...mut });
      }
      // re-snapshot after reverting everything: must equal base (sanity check of the harness)
      const after = await extract(page);
      saveSnapshot(path.join(dir, 'base-after.json.gz'), after);
      fs.writeFileSync(path.join(dir, 'mutations.json'), JSON.stringify(meta, null, 1));
      console.log(name, 'mutations', meta.length);
    } catch (e) { console.log(name, 'ERR', e.message.split('\n')[0]); } finally { await ctx.close(); }
  }
  await browser.close();
})();
