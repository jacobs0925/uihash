// What a testbed page offers to mutate: its stylesheet's rules (with how many elements each selects
// and what those elements are), repeated items, scroll containers, overlays and static labels. The
// operators (operators.js) pick their targets from this, so they work on any page.
const { styleRules } = require('../src/attribute.js');

async function profile(page, html) {
  const css = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [])[1] || '';
  const spans = styleRules(css);
  const rules = spans.map(([a, b, at]) => {
    const body = css.slice(a, b), i = body.indexOf('{');
    return { a, b, at, sel: body.slice(0, i).trim(), decl: body.slice(i + 1, body.lastIndexOf('}')).trim() };
  });
  const info = await page.evaluate((sels) => {
    const strip = (s) => s.replace(/::?[a-z-]+(\([^)]*\))?/g, (m) => (/^:(not|is|where|has|nth-|first|last|only|empty|root)/.test(m) ? m : '')).trim() || '*';
    const out = sels.map((sel) => {
      let els = [];
      try { els = [...document.querySelectorAll(strip(sel))]; } catch (e) { return { n: -1 }; }
      const vis = els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      const cs = vis[0] ? getComputedStyle(vis[0]) : null;
      return {
        n: els.length, visible: vis.length, pseudo: /:(hover|focus|active|focus-visible|focus-within|checked|disabled)/.test(sel),
        text: vis.filter((e) => e.childNodes && [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())).length,
        scroll: vis.filter((e) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY + s.overflowX) && (e.scrollHeight > e.clientHeight + 4 || e.scrollWidth > e.clientWidth + 4); }).length,
        positioned: cs ? cs.position : '', z: cs ? cs.zIndex : '', display: cs ? cs.display : '', tag: vis[0] ? vis[0].tagName.toLowerCase() : '',
        img: vis.filter((e) => e.tagName === 'IMG').length, interactive: vis.filter((e) => /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.tagName) || e.getAttribute('role') === 'button').length,
        width: vis[0] ? Math.round(vis[0].getBoundingClientRect().width) : 0, height: vis[0] ? Math.round(vis[0].getBoundingClientRect().height) : 0,
      };
    });
    // repeated items: a parent with >= 4 element children of one tag+class
    const lists = [];
    for (const p of document.querySelectorAll('body *')) {
      const kids = [...p.children].filter((k) => k.getBoundingClientRect().height > 0);
      if (kids.length < 4) continue;
      const key = (k) => k.tagName.toLowerCase() + (k.classList[0] ? '.' + k.classList[0] : '');
      const counts = {}; for (const k of kids) counts[key(k)] = (counts[key(k)] || 0) + 1;
      const [best, n] = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
      if (n >= 4) lists.push({ parent: p.tagName.toLowerCase() + (p.classList[0] ? '.' + p.classList[0] : ''), item: best, n, display: getComputedStyle(p).display });
    }
    // static labels: short texts drawn by an element on its own
    const labels = [];
    for (const e of document.querySelectorAll('button, a, h1, h2, h3, h4, th, label, span, div')) {
      const own = [...e.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join(' ').trim();
      if (/^[A-Za-z][A-Za-z ]{3,24}$/.test(own) && e.getBoundingClientRect().width > 0) labels.push(own);
    }
    const root = getComputedStyle(document.documentElement);
    const vars = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch (e) { return []; } })
      .filter((r) => r.selectorText === ':root').flatMap((r) => [...r.style].filter((p) => p.startsWith('--')).map((p) => [p, r.style.getPropertyValue(p).trim()]));
    return { rules: out, lists, labels: [...new Set(labels)], vars, rootFont: root.fontFamily };
  }, rules.map((r) => r.sel));
  rules.forEach((r, i) => Object.assign(r, info.rules[i], { i }));
  // labels that occur exactly once in the source, so a copy edit hits that label only
  const once = (s) => html.split(s).length === 2;
  const labels = info.labels.filter((l) => once('>' + l + '<') || once(`'${l}'`) || once(`"${l}"`));
  return { css, rules, lists: info.lists, labels, vars: info.vars.filter(([, v]) => /^#[0-9a-f]{3,8}$|^rgb/i.test(v)), rootFont: info.rootFont };
}
module.exports = { profile };
