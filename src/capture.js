// Playwright side: open a page in a deterministic-as-possible state, then run the extractor.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { uihashExtract } = require('./extract.browser.js');

// Freeze things that make two renders of the same UI differ for no reason.
const STABILIZE_CSS = `
*, *::before, *::after {
  animation-duration: 0s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important;
  transition-duration: 0s !important; transition-delay: 0s !important;
  caret-color: transparent !important; scroll-behavior: auto !important;
}`;

// A viewport may also emulate a device: deviceScaleFactor (HiDPI: 0.5px hairlines exist only there),
// isMobile and hasTouch (the (hover: none) / (pointer: coarse) styles touch screens get).
async function newStablePage(browser, { width = 1280, height = 800, deviceScaleFactor = 1, isMobile = false, hasTouch = false, freezeTime = null, seed = null } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor, isMobile, hasTouch, reducedMotion: 'reduce',
    locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light',
  });
  if (freezeTime !== null || seed !== null) {
    await ctx.addInitScript(({ freezeTime, seed }) => {
      if (seed !== null) {
        let s = seed >>> 0;
        Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      }
      if (freezeTime !== null) {
        const RealDate = Date;
        // eslint-disable-next-line no-global-assign
        Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [freezeTime])); } static now() { return freezeTime; } };
      }
    }, { freezeTime, seed });
  }
  // Change tracking from the first byte: every DOM mutation, stylesheet edit (CSS-in-JS inserts rules
  // without touching the DOM), image/font load. A page that has not changed for a while, and does not
  // change while it is extracted, is stable: no second extraction needed (see quietFor / changes).
  // The stabilizing stylesheet goes in as early as possible, so settle() adds no late mutation.
  await ctx.addInitScript((css) => {
    let n = 0, last = performance.now();
    const bump = () => { n++; last = performance.now(); };
    Object.defineProperty(window, '__uihash', { value: { changes: () => n, quietFor: () => performance.now() - last }, configurable: true });
    new MutationObserver(bump).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
    for (const m of ['insertRule', 'deleteRule', 'replace', 'replaceSync']) {
      const f = CSSStyleSheet.prototype[m];
      if (f) CSSStyleSheet.prototype[m] = function (...a) { bump(); return f.apply(this, a); };
    }
    document.addEventListener('load', bump, true);
    if (document.fonts) document.fonts.addEventListener('loadingdone', bump);
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style'); st.id = 'uihash-stabilize'; st.textContent = css; document.head.appendChild(st);
    });
  }, STABILIZE_CSS);
  const page = await ctx.newPage();
  return { ctx, page };
}

// Stability probes (null when the page has no tracker, e.g. a page opened elsewhere).
const changes = (page) => page.evaluate(() => (window.__uihash ? window.__uihash.changes() : null));
const quietFor = (page) => page.evaluate(() => (window.__uihash ? window.__uihash.quietFor() : null));

// Network quiet: no request in flight for `idle` ms. Playwright's 'networkidle' always waits a
// fixed 500 ms after the last request; what matters is that data fetched after load has arrived,
// and the stability check after it (two identical extractions) catches anything slower. Attach
// before page.goto(); returns an async waiter.
function trackNetwork(page) {
  let inflight = 0, last = Date.now();
  page.on('request', () => { inflight++; last = Date.now(); });
  const done = () => { inflight = Math.max(0, inflight - 1); last = Date.now(); };
  page.on('requestfinished', done); page.on('requestfailed', done);
  return async (idle = 150, timeout = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (inflight === 0 && Date.now() - last >= idle) return true;
      await page.waitForTimeout(Math.max(10, Math.min(50, idle - (Date.now() - last))));
    }
    return false;
  };
}

async function settle(page) {
  if (!(await page.evaluate(() => !!document.getElementById('uihash-stabilize')).catch(() => false))) await page.addStyleTag({ content: STABILIZE_CSS }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// Return the snapshot as one JSON string: Playwright's structured serializer is ~3x slower than the
// extraction itself on a 0.5 MB nested object; a single string costs a few milliseconds.
const EXTRACT_SRC = uihashExtract.toString();
async function extractRaw(page, opts = {}) {
  return page.evaluate(`JSON.stringify((${EXTRACT_SRC})(${JSON.stringify(opts)}))`);
}
async function extract(page, opts = {}) { return JSON.parse(await extractRaw(page, opts)); }

// Force CSS pseudo-classes through the DevTools protocol (what the DevTools ":hov" panel does). A
// static render never shows hover, focus or active styles, so a regression there slips past any
// screenshot test. Every element that a :hover / :focus / :active rule targets (from same-origin
// stylesheets), plus every interactive element, is put into the state at once: not a state a user
// can reach, but a deterministic one in which every such style is on screen and compared.
// Returns the CDP session (forced states last while it is attached) and the number of elements.
// hover / focus / active are bundles (focus also brings :focus-within to ancestors in Chromium); any
// other pseudo-class CDP can force (disabled, checked, user-invalid, placeholder-shown, open, target,
// visited, ...) is forced on its own
const FORCED = { hover: ['hover'], focus: ['focus', 'focus-visible', 'focus-within'], active: ['active', 'hover', 'focus', 'focus-visible'] };
const FORCEABLE = new Set(['active', 'hover', 'focus', 'focus-visible', 'focus-within', 'target', 'target-current', 'enabled', 'disabled', 'valid', 'invalid',
  'user-valid', 'user-invalid', 'required', 'optional', 'read-only', 'read-write', 'in-range', 'out-of-range', 'visited', 'link', 'checked', 'indeterminate',
  'placeholder-shown', 'autofill', 'open']);
const INTERACTIVE_SEL = 'a[href], button, input, select, textarea, summary, [tabindex], [role=button], [role=link], [role=tab], [role=menuitem], [role=option], [role=checkbox], [role=switch], [contenteditable=""], [contenteditable=true]';
async function forceState(page, state, { max = 3000 } = {}) {
  const pseudo = FORCED[state] || (FORCEABLE.has(state) ? [state] : null);
  if (!pseudo) throw new Error(`cannot force :${state} (forceable: ${[...FORCEABLE].join(', ')})`);
  const n = await page.evaluate(({ state, interactive, max }) => {
    const names = state === 'focus' ? ['focus-visible', 'focus-within', 'focus'] : state === 'active' ? ['active', 'hover', 'focus-visible', 'focus'] : [state];
    const re = new RegExp(':(' + names.join('|') + ')(?![\\w-])', 'g');
    const subjects = new Set();
    const add = (sel) => { try { for (const el of document.querySelectorAll(sel)) { if (subjects.size >= max) return; subjects.add(el); } } catch (e) { /* not a valid selector once cut */ } };
    // the element a pseudo-class applies to: the selector up to the end of the compound holding it,
    // without the pseudo-class ("ul > li.row:hover .x" -> "ul > li.row")
    const subjectOf = (sel) => {
      const m = sel.search(re);
      if (m < 0) return null;
      let depth = 0, end = sel.length;
      for (let i = m; i < sel.length; i++) {
        const c = sel[i];
        if (c === '(' || c === '[') depth++; else if (c === ')' || c === ']') depth--;
        else if (depth === 0 && /[\s>+~]/.test(c)) { end = i; break; }
      }
      if (/:not\([^)]*$/.test(sel.slice(0, m))) return null;            // inside :not(...): forcing would un-match
      const cut = sel.slice(0, end).replace(re, '').trim();
      return cut && !/[>+~]$/.test(cut) ? cut : null;
    };
    const split = (text) => { const out = []; let depth = 0, cur = ''; for (const c of text) { if (c === '(' || c === '[') depth++; else if (c === ')' || c === ']') depth--; if (c === ',' && !depth) { out.push(cur); cur = ''; } else cur += c; } return [...out, cur].map((x) => x.trim()); };
    const visit = (rules) => { for (const r of rules) { if (r.cssRules) visit(r.cssRules); if (r.selectorText) for (const sel of split(r.selectorText)) { const sub = subjectOf(sel); if (sub) add(sub); } } };
    for (const sheet of document.styleSheets) { try { visit(sheet.cssRules); } catch (e) { /* cross-origin sheet: unreadable */ } }
    add(interactive);
    for (const el of subjects) el.setAttribute('data-uihash-force', '');
    return subjects.size;
  }, { state, interactive: INTERACTIVE_SEL, max });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-uihash-force]' });
  await Promise.all(nodeIds.map((nodeId) => cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: pseudo })));
  await page.evaluate(() => { for (const el of document.querySelectorAll('[data-uihash-force]')) el.removeAttribute('data-uihash-force'); });
  return { cdp, n };
}

// Content hashes of the assets a page draws: <img> sources, CSS url() images, and @font-face files.
// Images are otherwise identified by URL and fonts by family name, so a new logo or a new font
// version shipped under the same name would look like no change at all. Each asset is fetched once
// (from the browser cache) and hashed; cross-origin assets the page may not read keep URL identity.
// Adds snap.assets = { url: hash } and snap.fonts = { family: hash }, and snap.fontErrors: the web
// fonts the page asked for that failed to load (document.fonts), by family.
async function hashAssets(page, snap) {
  const urls = new Set();
  const addCss = (v) => { if (v && v.includes('url(')) for (const m of v.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) urls.add(m[2]); };
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.img && n.img.src) urls.add(n.img.src);
    for (const c of n.c || []) walk(c);
  })(snap.root);
  for (const st of snap.styles) for (const p of ['background-image', 'mask-image', 'border-image-source', 'list-style-image', 'content']) addCss(st[p]);
  const res = await page.evaluate(async (list) => {
    const hex = (buf) => [...new Uint8Array(buf)].slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('');
    const hash = async (url) => {
      if (url.startsWith('data:')) return null;                    // the URL is the content
      try { const r = await fetch(url, { cache: 'force-cache' }); if (!r.ok) return null; return hex(await crypto.subtle.digest('SHA-1', await r.arrayBuffer())); } catch (e) { return null; }
    };
    const assets = {};
    await Promise.all(list.map(async (u) => { const h = await hash(new URL(u, location.href).href); if (h) assets[u] = h; }));
    // @font-face files by family (several faces of one family hash together, in source order)
    const faces = [];
    const visit = (rules) => { for (const r of rules) { if (r.cssRules) visit(r.cssRules); if (r instanceof CSSFontFaceRule) faces.push([r.style.getPropertyValue('font-family'), r.style.getPropertyValue('src'), r.parentStyleSheet.href || location.href]); } };
    for (const sh of document.styleSheets) { try { visit(sh.cssRules); } catch (e) { /* cross-origin */ } }
    const fam = {};
    for (const [family, src, base] of faces) {
      const m = /url\(\s*(['"]?)([^'")]+)\1\s*\)/.exec(src);
      const key = family.replace(/['"]/g, '').trim().toLowerCase();
      const h = m ? await hash(new URL(m[2], base).href) : null;
      fam[key] = (fam[key] ? fam[key] + '+' : '') + (h || 'url:' + (m ? m[2] : src));
    }
    const fontErrors = [...new Set([...(document.fonts || [])].filter((f) => f.status === 'error').map((f) => f.family.replace(/['"]/g, '')))];
    return { assets, fonts: fam, fontErrors };
  }, [...urls]).catch(() => ({ assets: {}, fonts: {}, fontErrors: [] }));
  snap.assets = res.assets; snap.fonts = res.fonts; snap.fontErrors = res.fontErrors;
  return snap;
}

// Capture a stable snapshot (and optionally the full-page screenshot that matches it).
// Normally one extraction: the page has had no change for QUIET_MS and none happens while it is
// extracted and screenshotted. A page that keeps changing (a live counter, a spinner) falls back to
// two consecutive extractions that agree canonically: the hash ignores what churns.
const QUIET_MS = 100;
async function stableCapture(page, { screenshot = false, extractOpts = {}, canonOpts = {}, budgetMs = 600 } = {}) {
  // scale 'css': one image pixel per CSS pixel at any deviceScaleFactor, so boxes map onto the image
  const shot = () => (screenshot ? page.screenshot({ fullPage: true, caret: 'initial', scale: 'css' }) : null);
  const until = Date.now() + budgetMs;
  for (;;) {
    const q = await quietFor(page);
    if (q === null || Date.now() >= until) break;
    if (q < QUIET_MS) { await page.waitForTimeout(Math.ceil(QUIET_MS - q)); continue; }
    const c0 = await changes(page);
    const raw = await extractRaw(page, extractOpts), png = await shot();
    if ((await changes(page)) === c0) return { raw, png, extractions: 1 };
  }
  const { build } = require('./canon.js');
  let raw = await extractRaw(page, extractOpts), png = null, n = 1;
  for (let k = 0; k < 5; k++) {
    if (screenshot) png = await shot(); else await page.waitForTimeout(100);
    const again = await extractRaw(page, extractOpts); n++;
    const same = again === raw || build(JSON.parse(again), canonOpts).merkle === build(JSON.parse(raw), canonOpts).merkle;
    raw = again;
    if (same) break;
  }
  return { raw, png, extractions: n };
}

function saveSnapshot(file, snap) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(snap)));
}
function loadSnapshot(file) {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString());
}

module.exports = { newStablePage, trackNetwork, settle, extract, extractRaw, changes, quietFor, stableCapture, forceState, hashAssets, saveSnapshot, loadSnapshot, STABILIZE_CSS };
