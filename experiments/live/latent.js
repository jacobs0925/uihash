// Latent components: closed menus / dialogs that stay in the DOM as display:none. Mutate classes that
// occur ONLY inside hidden subtrees (so the change is invisible in this state), then check in normal
// mode (should pass: nothing visible changed) and in latent mode (should flag the closed component).
// Usage: node latent.js [mutationsPerSite]
const { chromium } = require('playwright');
const { newStablePage, settle, extract } = require('../../src/capture.js');
const { calibrate, check } = require('../../src/fingerprint.js');

const SITES = { ghtrending: 'https://github.com/trending', wiki: 'https://en.wikipedia.org/wiki/Main_Page', lobsters: 'https://lobste.rs/', hn: 'https://news.ycombinator.com/' };

function latentOnlyClasses() {
  const hidden = new Set(), shown = new Set();
  const isHidden = (el) => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) if (getComputedStyle(e).display === 'none') return true; return false; };
  for (const el of document.querySelectorAll('body [class]')) {
    const set = isHidden(el) ? hidden : shown;
    for (const c of el.classList) if (/^[a-zA-Z_][\w-]*$/.test(c)) set.add(c);
  }
  return [...hidden].filter((c) => !shown.has(c));
}

(async () => {
  const M = +(process.argv[2] || 12);
  const browser = await chromium.launch();
  for (const [name, url] of Object.entries(SITES)) {
    const { ctx, page } = await newStablePage(browser);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
      await settle(page);
      const b1 = await extract(page, { latent: true });
      const b2 = await extract(page, { latent: true });
      const normal = calibrate([b1, b2]), latent = calibrate([b1, b2], { latent: true });
      const classes = await page.evaluate(latentOnlyClasses);
      const props = [['color', 'rgb(200, 30, 30)'], ['padding-left', '13px'], ['font-weight', '800'], ['border-radius', '9px'], ['background-color', 'rgb(250, 240, 200)']];
      let nFlag = 0, lFlag = 0, tried = 0; const examples = [];
      for (let i = 0; i < Math.min(M, classes.length); i++) {
        const cls = classes[Math.floor((i * classes.length) / Math.min(M, classes.length))];
        const [prop, value] = props[i % props.length];
        await page.evaluate(([c, p, v]) => { const st = document.createElement('style'); st.id = 'mut'; st.textContent = `.${CSS.escape(c)} { ${p}: ${v} !important; }`; document.head.appendChild(st); }, [cls, prop, value]);
        const snap = await extract(page, { latent: true });
        await page.evaluate(() => document.getElementById('mut').remove());
        tried++;
        const rn = check(snap, normal, { explain: false }), rl = check(snap, latent);
        if (!rn.pass) nFlag++;
        if (!rl.pass) { lFlag++; if (examples.length < 2) examples.push(`.${cls} {${prop}} → ${rl.findings[0].type} ${rl.findings[0].path.split(' > ').slice(-2).join(' > ')} :: ${((rl.findings[0].details || [])[0] || { changes: [''] }).changes[0]}`.slice(0, 200)); }
      }
      const sane = check(b2, latent).pass && check(b2, normal).pass;
      console.log(`${name}: ${b1.stats.latent} latent elements, ${classes.length} latent-only classes; mutations of latent-only classes: flagged in normal mode ${nFlag}/${tried}, in latent mode ${lFlag}/${tried}; re-extraction passes: ${sane}`);
      for (const e of examples) console.log('   ', e);
    } catch (e) { console.log(name, 'ERR', e.message.split('\n')[0]); } finally { await ctx.close(); }
  }
  await browser.close();
})();
