// Synthetic pull requests for training a triage model: operators that make a deliberate design
// change or a typical mistake on any page, from its profile (profile.js). Each returns the edits that
// turn the base page's source into the head's, or null when the page offers no target for it.
//   { css: 'set', rule, prop, value }   set a declaration in a rule of the page's stylesheet
//   { css: 'drop', rule, prop }         remove a declaration
//   { css: 'add', text }                append a rule
//   { src: from, to }                   replace a string that occurs once in the page's source
//   { js }                              run after the page has rendered (DOM changes)
// The mistakes follow the kinds of UI regression teams report (clipping, covering, knock-on rules,
// lost states and hover feedback, contrast, colours that collide, broken values, missing controls,
// truncation, typos, misalignment, one instance drifting, duplicated or missing rows, numbers); the
// deliberate changes are design work done consistently (tokens, component restyles, copy, a new
// control, spacing and type scale).

const rnd = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (r, a) => a[Math.floor(r() * a.length)];
const between = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

function declsOf(decl) {
  const out = []; let depth = 0, cur = '', q = null;
  for (const c of decl + ';') {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(') depth++; else if (c === ')') depth--;
    if (c === ';' && !depth) { const k = cur.indexOf(':'); if (k > 0) out.push([cur.slice(0, k).trim().toLowerCase(), cur.slice(k + 1).trim()]); cur = ''; } else cur += c;
  }
  return out;
}
const has = (rule, prop) => declsOf(rule.decl).find(([p]) => p === prop);
const valOf = (rule, prop) => (has(rule, prop) || [])[1];

// colours
const hex = (c) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
function parseColor(v) {
  if (!v) return null;
  let m = /^#([0-9a-f]{6})$/i.exec(v.trim()); if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = /^#([0-9a-f]{3})$/i.exec(v.trim()); if (m) return [...m[1]].map((x) => parseInt(x + x, 16));
  m = /^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/i.exec(v.trim()); if (m) return [+m[1], +m[2], +m[3]];
  return null;
}
function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360; const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}
const shiftColor = (v, dh, dl = 0, ds = 0) => { const c = parseColor(v); if (!c) return null; const [h, s, l] = toHsl(c); return hex(fromHsl([h + dh, Math.max(0, Math.min(1, s + ds)), Math.max(0, Math.min(1, l + dl))])); };
const px = (v) => { const m = /^(-?\d+(?:\.\d+)?)px$/.exec((v || '').trim()); return m ? +m[1] : null; };
const scalePx = (v, f) => (v || '').replace(/(-?\d+(?:\.\d+)?)px/g, (m, n) => `${Math.round(+n * f)}px`);
const addPx = (v, d) => (v || '').replace(/(\d+(?:\.\d+)?)px/g, (m, n) => `${Math.max(0, Math.round(+n + d))}px`);

// rule filters
const plain = (r) => !r.at && !r.pseudo && r.visible > 0 && !/[:\[*]/.test(r.sel) && !/,/.test(r.sel) && !/^(html|body)$/.test(r.sel.trim());
const component = (r) => plain(r) && r.visible >= 2;
const textual = (r) => plain(r) && r.text > 0;
const STATE = /\.(on|active|selected|sel|current|unread|open|checked|starred|done|pressed|hl|highlight|is-[\w-]+)\b/;
const lastTag = (sel) => (sel.trim().split(/\s+|>/).pop().match(/^[a-z][a-z0-9]*/) || [])[0];

const SYN = { Settings: 'Preferences', Compose: 'New message', Inbox: 'All mail', Search: 'Find', Refresh: 'Reload', Revenue: 'Income', Users: 'Members', Overview: 'Summary', Reports: 'Analytics',
  Labels: 'Tags', Archive: 'Store', Delete: 'Remove', Export: 'Download', Filter: 'Refine', Upgrade: 'Go Pro', Help: 'Support', Starred: 'Favourites', Drafts: 'Unsent', Sent: 'Outbox', More: 'Other' };
function copyEdit(r, label) {
  if (SYN[label]) return SYN[label];
  const w = label.split(' ');
  if (w.length > 1 && r() < 0.5) return w[0] + ' ' + w.slice(1).join(' ').toLowerCase() === label ? w.map((x) => x[0].toUpperCase() + x.slice(1)).join(' ') : w[0] + ' ' + w.slice(1).join(' ').toLowerCase();
  return pick(r, ['All ', 'My ', 'View ', 'New ']) + label.toLowerCase();
}
function typo(r, s) {
  const i = between(r, 1, s.length - 2), k = pick(r, ['drop', 'swap', 'double', 'replace']);
  if (k === 'drop') return s.slice(0, i) + s.slice(i + 1);
  if (k === 'swap') return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
  if (k === 'double') return s.slice(0, i) + s[i] + s.slice(i);
  const near = 'qwertyuiopasdfghjklzxcvbnm'; return s.slice(0, i) + near[Math.floor(r() * near.length)] + s.slice(i + 1);
}
const srcEdit = (html, label, to) => {
  for (const [a, b] of [['>' + label + '<', '>' + to + '<'], [`'${label}'`, `'${to}'`], [`"${label}"`, `"${to}"`]]) if (html.split(a).length === 2) return { src: a, to: b };
  return null;
};

const D = 'deliberate', M = 'mistake';
const OPS = [
  // ------------------------------------------------------------------ deliberate design changes
  { id: 'd-radius', kind: D, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && has(x, 'border-radius') && px(valOf(x, 'border-radius')) !== null); if (!t.length) return null; const x = pick(r, t), v = px(valOf(x, 'border-radius'));
    return { edits: [{ css: 'set', rule: x.i, prop: 'border-radius', value: `${Math.max(0, v + pick(r, [-6, -4, -2, 2, 4, 6, 8]))}px` }], desc: `${x.sel}: border-radius` }; } },
  { id: 'd-padding', kind: D, make: (P, r) => { const t = P.rules.filter((x) => component(x) && has(x, 'padding')); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'padding', value: addPx(valOf(x, 'padding'), pick(r, [-2, 2, 4])) }], desc: `${x.sel}: padding` }; } },
  { id: 'd-font-size', kind: D, make: (P, r) => { const t = P.rules.filter((x) => textual(x) && px(valOf(x, 'font-size'))); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'font-size', value: `${px(valOf(x, 'font-size')) + pick(r, [-1, 1, 2])}px` }], desc: `${x.sel}: font-size` }; } },
  { id: 'd-font-weight', kind: D, make: (P, r) => { const t = P.rules.filter((x) => textual(x) && /^\d00$/.test(valOf(x, 'font-weight') || '')); if (!t.length) return null; const x = pick(r, t), w = +valOf(x, 'font-weight');
    return { edits: [{ css: 'set', rule: x.i, prop: 'font-weight', value: String(w >= 700 ? w - 100 : w + 100) }], desc: `${x.sel}: font-weight` }; } },
  { id: 'd-token', kind: D, make: (P, r) => { if (!P.vars.length) return null; const [v, val] = pick(r, P.vars); const to = shiftColor(val, pick(r, [-40, -25, 25, 40]), 0, 0); if (!to) return null;
    const x = P.rules.find((y) => y.sel === ':root' && has(y, v)); if (!x) return null;
    return { edits: [{ css: 'set', rule: x.i, prop: v, value: to }], desc: `${v} rebrand` }; } },
  { id: 'd-colour', kind: D, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && !STATE.test(x.sel) && ['background-color', 'background', 'color'].some((p) => parseColor(valOf(x, p)))); if (!t.length) return null;
    const x = pick(r, t), p = ['background-color', 'background', 'color'].find((q) => parseColor(valOf(x, q)));
    const to = shiftColor(valOf(x, p), pick(r, [-20, 20, 30]), pick(r, [-0.04, 0, 0.04])); return { edits: [{ css: 'set', rule: x.i, prop: p, value: to }], desc: `${x.sel}: ${p}` }; } },
  { id: 'd-shadow', kind: D, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && has(x, 'box-shadow') && valOf(x, 'box-shadow') !== 'none'); if (t.length) { const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'box-shadow', value: '0 4px 16px rgba(0, 0, 0, 0.08)' }], desc: `${x.sel}: softer shadow` }; }
    const c = P.rules.filter((x) => component(x) && (has(x, 'border-radius'))); if (!c.length) return null; const x = pick(r, c);
    return { edits: [{ css: 'set', rule: x.i, prop: 'box-shadow', value: '0 1px 3px rgba(0, 0, 0, 0.12)' }], desc: `${x.sel}: subtle shadow` }; } },
  { id: 'd-gap', kind: D, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && px(valOf(x, 'gap')) !== null); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'gap', value: `${Math.max(0, px(valOf(x, 'gap')) + pick(r, [-2, 2, 4]))}px` }], desc: `${x.sel}: gap` }; } },
  { id: 'd-height', kind: D, make: (P, r) => { const t = P.rules.filter((x) => component(x) && px(valOf(x, 'height')) && px(valOf(x, 'height')) < 80); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'height', value: `${px(valOf(x, 'height')) + pick(r, [2, 4, 6])}px` }], desc: `${x.sel}: taller` }; } },
  { id: 'd-width', kind: D, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && px(valOf(x, 'width')) > 150); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'width', value: `${Math.round(px(valOf(x, 'width')) * pick(r, [0.92, 1.08, 1.15]))}px` }], desc: `${x.sel}: width` }; } },
  { id: 'd-copy', kind: D, make: (P, r, html) => { if (!P.labels.length) return null; const l = pick(r, P.labels), e = srcEdit(html, l, copyEdit(r, l)); return e && { edits: [e], desc: `copy: ${l}` }; } },
  { id: 'd-new-control', kind: D, make: (P, r) => { const t = P.rules.filter((x) => component(x) && x.interactive >= 2 && /^(button|a)$/.test(x.tag)); if (!t.length) return null; const x = pick(r, t);
    const label = pick(r, ['Share', 'Print', 'Pin', 'Export', 'Snooze']);
    return { edits: [{ js: `const e = document.querySelectorAll(${JSON.stringify(x.sel)})[0]; if (e) { const c = e.cloneNode(true); for (const n of c.querySelectorAll('*')) if (!n.children.length && n.textContent.trim()) n.textContent = ${JSON.stringify(label)}; if (!c.children.length) c.textContent = ${JSON.stringify(label)}; c.setAttribute('aria-label', ${JSON.stringify(label)}); e.parentNode.appendChild(c); }` }], desc: `new ${x.sel} "${label}"` }; } },
  { id: 'd-zebra', kind: D, make: (P, r) => { if (!P.lists.length) return null; const l = pick(r, P.lists);
    return { edits: [{ css: 'add', text: `${l.parent} > ${l.item}:nth-child(even) { background-color: #f7f8fa; }` }], desc: `zebra ${l.item}` }; } },
  { id: 'd-line-height', kind: D, make: (P, r) => { const t = P.rules.filter((x) => textual(x) && x.visible >= 2); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: pick(r, ['line-height', 'letter-spacing']), value: pick(r, ['1.6', '0.01em', '1.35']) }], desc: `${x.sel}: type` }; } },
  { id: 'd-border', kind: D, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && ['border', 'border-bottom', 'border-top'].some((p) => /\d+px solid/.test(valOf(x, p) || ''))); if (!t.length) return null;
    const x = pick(r, t), p = ['border', 'border-bottom', 'border-top'].find((q) => /\d+px solid/.test(valOf(x, q) || ''));
    return { edits: [{ css: 'set', rule: x.i, prop: p, value: valOf(x, p).replace(/#[0-9a-f]{3,6}|rgba?\([^)]*\)/i, (c) => shiftColor(c, 0, -0.05) || c) }], desc: `${x.sel}: ${p}` }; } },
  { id: 'd-uppercase', kind: D, make: (P, r) => { const t = P.rules.filter((x) => textual(x) && x.visible >= 2 && (px(valOf(x, 'font-size')) || 14) <= 13); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'text-transform', value: 'uppercase' }, { css: 'set', rule: x.i, prop: 'letter-spacing', value: '0.04em' }], desc: `${x.sel}: small caps` }; } },

  { id: 'd-state-stronger', kind: D, make: (P, r) => { const t = P.rules.filter((x) => !x.at && STATE.test(x.sel) && x.visible > 0 && ['background-color', 'background', 'color', 'font-weight', 'border-bottom-color'].some((p) => has(x, p))); if (!t.length) return null;
    const x = pick(r, t), p = ['background-color', 'background', 'color', 'border-bottom-color', 'font-weight'].find((q) => has(x, q));
    const to = p === 'font-weight' ? String(Math.min(800, (+valOf(x, p) || 500) + 100)) : (shiftColor(valOf(x, p), 0, pick(r, [-0.08, -0.12]), 0.1) || valOf(x, p));
    return { edits: [{ css: 'set', rule: x.i, prop: p, value: to }], desc: `${x.sel}: stronger` }; } },
  { id: 'd-badge', kind: D, make: (P, r) => { if (!P.lists.length) return null; const l = pick(r, P.lists), word = pick(r, ['New', 'Beta', 'Pro', '3', '12']);
    return { edits: [{ css: 'add', text: `.ux-badge { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 11px; font-weight: 600; line-height: 16px; }` },
      { js: `for (const it of document.querySelectorAll(${JSON.stringify(l.parent + ' > ' + l.item)})) { const b = document.createElement('span'); b.className = 'ux-badge'; b.textContent = ${JSON.stringify(word)}; it.appendChild(b); }` }], desc: `badge on each ${l.item}` }; } },
  { id: 'd-sort', kind: D, make: (P, r) => { if (!P.lists.length) return null; const l = pick(r, P.lists), desc = r() < 0.5;
    return { edits: [{ js: `const items = [...document.querySelectorAll(${JSON.stringify(l.parent + ' > ' + l.item)})]; if (items.length > 1) { const parent = items[0].parentNode, after = items[items.length - 1].nextSibling; items.sort((a, b) => a.textContent.trim().localeCompare(b.textContent.trim()) * ${desc ? -1 : 1}); for (const it of items) parent.insertBefore(it, after); }` }], desc: `${l.item} sorted` }; } },
  { id: 'd-column', kind: D, make: (P, r) => { const t = P.rules.filter((x) => x.sel === 'th' || x.sel === 'td'); if (t.length < 2) return null; const head = pick(r, ['Team', 'Plan', 'Region', 'Owner']), val = pick(r, ['Core', 'Pro', 'EU', '—']);
    return { edits: [{ js: `for (const tr of document.querySelectorAll('tr')) { const isHead = !!tr.querySelector('th'); const c = document.createElement(isHead ? 'th' : 'td'); c.textContent = isHead ? ${JSON.stringify(head)} : ${JSON.stringify(val)}; tr.insertBefore(c, tr.lastElementChild); }` }], desc: `new column ${head}` }; } },

  // ------------------------------------------------------------------ mistakes
  { id: 'm-clip-scroll', kind: M, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && x.scroll > 0); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: pick(r, ['overflow', 'overflow-y']), value: 'hidden' }], desc: `${x.sel} no longer scrolls` }; } },
  { id: 'm-fixed-clip', kind: M, make: (P, r) => { const t = P.rules.filter((x) => textual(x) && x.height >= 24); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'height', value: `${Math.round(x.height * pick(r, [0.5, 0.6, 0.7]))}px` }, { css: 'set', rule: x.i, prop: 'overflow', value: 'hidden' }], desc: `${x.sel} clipped` }; } },
  { id: 'm-z-under', kind: M, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && /^(absolute|fixed|sticky)$/.test(x.positioned) && has(x, 'z-index')); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'z-index', value: pick(r, ['-1', '0']) }], desc: `${x.sel} under the content` }; } },
  { id: 'm-broad-rule', kind: M, make: (P, r) => { const k = pick(r, ['button { height: 22px; padding: 0 4px; }', 'a { color: inherit; }', 'span { font-size: 11px; }', 'li { margin: 0; padding: 0; }', 'th, td { padding: 1px; }',
    'div { line-height: 1; }', 'button, input { font-size: 18px; }', 'img, svg { width: 100%; }', 'nav a, nav button { display: block; width: 100%; }', 'h1, h2, h3 { margin: 24px 0; }']);
    return { edits: [{ css: 'add', text: k }], desc: `broad rule ${k.split('{')[0].trim()}` }; } },
  { id: 'm-important', kind: M, make: (P, r) => { const t = P.rules.filter((x) => !x.at && x.visible > 0 && /\..+\s.*\./.test(x.sel) && ['color', 'font-weight', 'background-color', 'background'].some((p) => has(x, p)) && lastTag(x.sel)); if (!t.length) return null;
    const x = pick(r, t), p = ['color', 'font-weight', 'background-color', 'background'].find((q) => has(x, q)), first = x.sel.trim().split(/\s+/)[0];
    const val = { color: 'inherit', 'font-weight': '400', 'background-color': 'transparent', background: 'transparent' }[p];
    return { edits: [{ css: 'add', text: `${first} ${lastTag(x.sel)} { ${p}: ${val} !important; }` }], desc: `reset beats ${x.sel}` }; } },
  { id: 'm-drift', kind: M, make: (P, r) => { if (!P.lists.length) return null; const l = pick(r, P.lists), n = between(r, 2, Math.min(5, l.n));
    const d = pick(r, ['padding-left: 0', 'margin-top: 6px', 'color: #9aa0a6', 'font-weight: 400', 'background-color: #fff3cd', 'font-size: 12px']);
    return { edits: [{ css: 'add', text: `${l.parent} > ${l.item}:nth-child(${n}) { ${d}; }` }], desc: `one ${l.item} drifts (${d})` }; } },
  { id: 'm-state-lost', kind: M, make: (P, r) => { const t = P.rules.filter((x) => !x.at && STATE.test(x.sel) && ['color', 'background-color', 'background', 'font-weight'].some((p) => has(x, p))); if (!t.length) return null; const x = pick(r, t);
    const edits = ['color', 'background-color', 'background', 'font-weight'].filter((p) => has(x, p)).map((p) => ({ css: 'drop', rule: x.i, prop: p }));
    return { edits, desc: `${x.sel} looks like the rest` }; } },
  { id: 'm-hover-lost', kind: M, make: (P, r) => { const t = P.rules.filter((x) => !x.at && /:hover/.test(x.sel) && declsOf(x.decl).length); if (!t.length) return null; const x = pick(r, t);
    return { edits: declsOf(x.decl).map(([p]) => ({ css: 'drop', rule: x.i, prop: p })), desc: `${x.sel} does nothing` }; } },
  { id: 'm-focus-lost', kind: M, make: (P, r) => ({ edits: [{ css: 'add', text: pick(r, [':focus-visible { outline: none; }', 'button:focus, a:focus, input:focus { outline: 0; }', '*:focus { outline: none !important; }']) }], desc: 'focus ring removed' }) },
  { id: 'm-contrast', kind: M, make: (P, r) => { const t = P.rules.filter((x) => textual(x) && parseColor(valOf(x, 'color')) && toHsl(parseColor(valOf(x, 'color')))[2] < 0.5); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'color', value: shiftColor(valOf(x, 'color'), 0, pick(r, [0.3, 0.38, 0.45])) }], desc: `${x.sel}: low contrast` }; } },
  { id: 'm-collide', kind: M, make: (P, r) => { const cols = P.rules.filter((x) => !x.at && x.visible > 0 && ['background-color', 'background', 'color', 'fill', 'stroke'].some((p) => parseColor(valOf(x, p))));
    const groups = {}; for (const x of cols) { const base = x.sel.replace(/\.[\w-]+$/, ''); (groups[base] = groups[base] || []).push(x); }
    const g = Object.values(groups).filter((a) => a.length >= 2 && a[0].sel !== a[1].sel); if (!g.length) return null; const a = pick(r, g), [x, y] = [a[0], a[1]];
    const p = ['background-color', 'background', 'color', 'fill', 'stroke'].find((q) => parseColor(valOf(x, q)) && parseColor(valOf(y, q))); if (!p) return null;
    return { edits: [{ css: 'set', rule: x.i, prop: p, value: shiftColor(valOf(y, p), 6, 0.02) }], desc: `${x.sel} now like ${y.sel}` }; } },
  { id: 'm-binding', kind: M, make: (P, r) => { if (!P.lists.length) return null; const l = pick(r, P.lists), v = pick(r, ['undefined', 'NaN', 'N/A', '[object Object]', 'null']);
    return { edits: [{ js: `for (const it of [...document.querySelectorAll(${JSON.stringify(l.parent + ' > ' + l.item)})].slice(0, ${between(r, 1, 3)})) { const w = document.createTreeWalker(it, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.textContent.trim().length > 2) { n.textContent = ${JSON.stringify(v)}; break; } }` }], desc: `${l.item} shows ${v}` }; } },
  { id: 'm-missing', kind: M, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && x.visible === 1 && x.interactive === 1); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'display', value: 'none' }], desc: `${x.sel} gone` }; } },
  { id: 'm-truncate', kind: M, make: (P, r) => { const t = P.rules.filter((x) => textual(x) && x.width > 60 && !has(x, 'text-overflow')); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'max-width', value: `${Math.round(x.width * pick(r, [0.4, 0.55]))}px` }, { css: 'set', rule: x.i, prop: 'overflow', value: 'hidden' }, { css: 'set', rule: x.i, prop: 'white-space', value: 'nowrap' }], desc: `${x.sel} cut` }; } },
  { id: 'm-overrun', kind: M, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && valOf(x, 'text-overflow') === 'ellipsis'); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'drop', rule: x.i, prop: 'overflow' }, { css: 'drop', rule: x.i, prop: 'text-overflow' }], desc: `${x.sel} runs over` }; } },
  { id: 'm-typo', kind: M, make: (P, r, html) => { const t = P.labels.filter((l) => l.length >= 5); if (!t.length) return null; const l = pick(r, t), e = srcEdit(html, l, typo(r, l)); return e && { edits: [e], desc: `typo in ${l}` }; } },
  { id: 'm-misalign', kind: M, make: (P, r) => { if (!P.lists.length) return null; const l = pick(r, P.lists), n = between(r, 2, Math.min(4, l.n));
    return { edits: [{ css: 'add', text: `${l.parent} > ${l.item}:nth-child(${n}) { position: relative; top: ${pick(r, [1, 2, 3])}px; }` }], desc: `${l.item} ${n} off by a few px` }; } },
  { id: 'm-sibling-size', kind: M, make: (P, r) => { const t = P.rules.filter((x) => component(x) && x.interactive >= 3 && x.height > 0); if (!t.length) return null; const x = pick(r, t), n = between(r, 1, 3);
    return { edits: [{ css: 'add', text: `${x.sel}:nth-of-type(${n}) { height: ${Math.max(10, x.height - pick(r, [6, 8, 10]))}px; padding: 0; }` }], desc: `${x.sel} ${n} smaller than the others` }; } },
  { id: 'm-duplicate', kind: M, make: (P, r) => { if (!P.lists.length) return null; const l = pick(r, P.lists), n = between(r, 0, 2);
    return { edits: [{ js: `const it = document.querySelectorAll(${JSON.stringify(l.parent + ' > ' + l.item)})[${n}]; if (it) it.after(it.cloneNode(true));` }], desc: `${l.item} duplicated` }; } },
  { id: 'm-rows-missing', kind: M, make: (P, r) => { const t = P.lists.filter((l) => l.n >= 6); if (!t.length) return null; const l = pick(r, t), k = between(r, 3, l.n - 2);
    return { edits: [{ css: 'add', text: `${l.parent} > ${l.item}:nth-child(n+${k}) { ${pick(r, ['display: none', 'visibility: hidden'])}; }` }], desc: `${l.item} past ${k - 1} not drawn` }; } },
  { id: 'm-numbers', kind: M, make: (P, r) => { const mode = pick(r, ['round', 'plus']), step = between(r, 2, 4);
    return { edits: [{ js: `const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, k = 0; while ((n = w.nextNode())) { if (!/\\d/.test(n.textContent) || !n.parentElement || !n.parentElement.offsetParent) continue; if (k++ % ${step}) continue; n.textContent = n.textContent.replace(/(\\d+)([.,]\\d+)?/, (m, a, b) => ${JSON.stringify(mode)} === 'round' && b ? a : String(+a + 1) + (b || '')); }` }], desc: `numbers changed (${mode})` }; } },
  { id: 'm-past-window', kind: M, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && x.width > 100 && x.visible <= 3); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: pick(r, ['min-width', 'margin-left']), value: `${pick(r, [1400, 1600, 900])}px` }], desc: `${x.sel} pushed past the window` }; } },
  { id: 'm-font-typo', kind: M, make: (P, r) => { const t = P.rules.filter((x) => !x.at && has(x, 'font-family')); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'font-family', value: valOf(x, 'font-family').replace(/[A-Za-z]{4,}/, (w) => typo(r, w)) }], desc: `${x.sel}: font name typo` }; } },
  { id: 'm-value-typo', kind: M, make: (P, r) => { const t = P.rules.filter((x) => component(x) && ['margin', 'padding', 'gap', 'margin-top', 'padding-left'].some((p) => /\d+px/.test(valOf(x, p) || ''))); if (!t.length) return null;
    const x = pick(r, t), p = ['margin', 'padding', 'gap', 'margin-top', 'padding-left'].find((q) => /\d+px/.test(valOf(x, q) || ''));
    return { edits: [{ css: 'set', rule: x.i, prop: p, value: pick(r, [scalePx(valOf(x, p), 10), valOf(x, p).replace(/px/g, 'em')]) }], desc: `${x.sel}: ${p} typo` }; } },
  { id: 'm-order', kind: M, make: (P, r) => { const t = P.lists.filter((l) => /flex|grid/.test(l.display || '')); if (!t.length) return null; const l = pick(r, t);
    return { edits: [{ css: 'add', text: `${l.parent} > ${l.item}:nth-child(1) { order: 9; }` }], desc: `${l.item} moved to the end` }; } },
  { id: 'm-ghost', kind: M, make: (P, r) => { const t = P.rules.filter((x) => plain(x) && x.visible >= 1 && x.interactive >= 1); if (!t.length) return null; const x = pick(r, t);
    return { edits: [{ css: 'set', rule: x.i, prop: 'opacity', value: '0' }], desc: `${x.sel} invisible but clickable` }; } },
];

// Apply edits to a page's source: CSS edits inside the page's first stylesheet, then source edits,
// then scripts after the page's own.
function apply(html, P, edits) {
  let css = P.css;
  const byRule = new Map();
  for (const e of edits.filter((x) => x.css === 'set' || x.css === 'drop')) (byRule.get(e.rule) || byRule.set(e.rule, []).get(e.rule)).push(e);
  for (const i of [...byRule.keys()].sort((a, b) => P.rules[b].a - P.rules[a].a)) {
    const x = P.rules[i], ds = declsOf(x.decl);
    for (const e of byRule.get(i)) {
      const k = ds.findIndex(([p]) => p === e.prop);
      if (e.css === 'drop') { if (k >= 0) ds.splice(k, 1); } else if (k >= 0) ds[k][1] = e.value; else ds.push([e.prop, e.value]);
    }
    css = css.slice(0, x.a) + `${x.sel} { ${ds.map(([p, v]) => `${p}: ${v}`).join('; ')}${ds.length ? ';' : ''} }` + css.slice(x.b);
  }
  const added = edits.filter((x) => x.css === 'add').map((x) => x.text);
  if (added.length) css += '\n' + added.join('\n') + '\n';
  let out = html.replace(P.css, () => css);
  for (const e of edits.filter((x) => x.src)) { if (out.split(e.src).length !== 2) return null; out = out.replace(e.src, () => e.to); }
  const js = edits.filter((x) => x.js).map((x) => `try { ${x.js} } catch (e) {}`);
  if (js.length) out = out.replace('</body>', () => `<script>${js.join('\n')}</script>\n</body>`);
  return out === html ? null : out;
}

module.exports = { OPS, apply, rnd, pick, declsOf };
