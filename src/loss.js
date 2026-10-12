// Changes that take something away. A deliberate redesign restyles things; a regression more often
// loses something the UI used to do: things that looked different (selected and not, reviewed and
// deleted, each category its own colour) now look the same, a hover that showed something shows
// nothing, a state that returned to the page as it was no longer does, one instance of a component
// drifts from the others. Base and head render the same fixture, so elements pair by their kind (the
// path of tags and first classes from the root) and their order among elements of that kind.
const { build, elKids, textOf } = require('./canon.js');

// what an element looks like (paint, not geometry): canonical props, dead ones already dropped
const LOOK = /^(color|background-color|background-image|border-(top|right|bottom|left)-(color|style|width)|outline-(color|style|width)|opacity|visibility|font-weight|font-style|text-decoration-(line|color|style)|box-shadow|fill|stroke|stroke-width|stroke-dasharray|fill-opacity|stroke-opacity|filter|::(before|after)\..*)$/;
const lookOf = (n) => Object.keys(n.props).filter((p) => LOOK.test(p)).sort().map((p) => p + ':' + n.props[p]).join(';');
const kindOf = (n) => n.tag + (n.raw && n.raw.a && n.raw.a.class ? '.' + String(n.raw.a.class).trim().split(/\s+/)[0] : '');

// kind path -> elements in document order (canonical nodes), with their parent
function byKind(root) {
  const out = new Map();
  (function walk(n, path, parent) {
    const here = path + ' > ' + kindOf(n);
    if (!out.has(here)) out.set(here, []);
    out.get(here).push({ n, parent });
    for (const k of elKids(n)) walk(k, here, n);
  })(root, '', null);
  return out;
}
// both canonical trees, with the same state classes (the calibration's, else none)
function trees(base, head, opts = {}) {
  const o = { ...opts, stateClasses: opts.stateClasses || [] };
  return { A: build(base, o), B: build(head, o) };
}
const label = (n) => kindOf(n) + (textOf(n) ? ` "${textOf(n).replace(/␟/g, ' ').slice(0, 24)}"` : '');
const brief = (look, other) => {
  // the props where two looks differ, as "prop value"
  const a = new Map(look.split(';').filter(Boolean).map((x) => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1)]));
  const b = new Map(other.split(';').filter(Boolean).map((x) => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1)]));
  return [...new Set([...a.keys(), ...b.keys()])].filter((p) => a.get(p) !== b.get(p)).slice(0, 2).map((p) => `${p} ${a.get(p) || '∅'}`).join(', ');
};

// Things of one kind that looked different in the base (two looks, or two texts) and look the same in
// the head: the distinction is gone (states, review marks, categories, a highlight).
// -> [{ kind, text, from, to, head: [boxes], base: [boxes] }]
function collapsed(A, B, boxOf) {
  const ka = byKind(A), kb = byKind(B), out = [];
  for (const [path, la] of ka) {
    const lb = kb.get(path);
    if (!lb || lb.length !== la.length || la.length < 2) continue;
    for (const [what, f] of [['look', (x) => lookOf(x.n)], ['text', (x) => (elKids(x.n).length ? null : textOf(x.n) || null)]]) {
      const va = la.map(f), vb = lb.map(f);
      if (va.some((v) => v === null) || vb.some((v) => v === null)) continue;
      const da = new Set(va), db = new Set(vb);
      if (da.size < 2 || db.size >= da.size) continue;
      // two base classes that met in the head
      const first = new Map(); let hit = null;
      for (let i = 0; i < va.length && !hit; i++) {
        const prev = first.get(vb[i]);
        if (prev !== undefined && va[prev] !== va[i]) hit = [prev, i]; else if (prev === undefined) first.set(vb[i], i);
      }
      if (!hit) continue;
      const [i, j] = hit;
      if (what === 'text' && da.size < 3) continue;            // two values can be a toggle's two words
      out.push({ kind: path.split(' > ').slice(-2).join(' > '), uid: lb[j].n.uid, what, from: da.size, to: db.size,
        text: what === 'look'
          ? `${path.split(' > ').pop()}: ${da.size} different looks → ${db.size}; ${label(la[i].n)} (${brief(va[i], va[j])}) and ${label(la[j].n)} (${brief(va[j], va[i])}) now look the same`
          : `${path.split(' > ').pop()}: ${da.size} different texts → ${db.size} (${[...db].slice(0, 2).map((t) => `"${t.replace(/␟/g, ' ').slice(0, 20)}"`).join(', ')})`,
        head: lb.map((x) => boxOf(x.n)).filter(Boolean).slice(0, 40), base: la.map((x) => boxOf(x.n)).filter(Boolean).slice(0, 40) });
    }
  }
  // the outermost kind only: a row that lost its highlight also loses it on its cells
  return out.filter((x, k) => !out.some((y, m) => m !== k && y.what === x.what && x.uid && y.uid && x.uid.startsWith(y.uid + ' > ')));
}

// Elements of one kind that were identical in the base (every canonical prop, and text) where the head
// changed some of them and not the others: an instance drifting from the rest (a row without its
// indent, rows past the eighth not drawn). A redesign changes every instance.
function drifted(A, B, boxOf) {
  const ka = byKind(A), kb = byKind(B), out = [];
  for (const [path, la] of ka) {
    const lb = kb.get(path);
    if (!lb || lb.length !== la.length || la.length < 3) continue;
    if (new Set(la.map((x) => x.n.ps)).size !== 1) continue;
    const changed = lb.map((x, i) => x.n.ps !== la[i].n.ps);
    const k = changed.filter(Boolean).length;
    if (!k || k === la.length) continue;
    // the changed ones now carry a class the others do not: a new variant (status colours), not a drift
    const cls = (x) => String((x.n.raw && x.n.raw.a && x.n.raw.a.class) || '').trim().split(/\s+/).filter(Boolean);
    const rest = new Set(lb.filter((_, m) => !changed[m]).flatMap(cls));
    if (lb.filter((_, m) => changed[m]).every((x) => cls(x).some((c) => !rest.has(c)))) continue;
    // every n-th one (zebra stripes, a separator every few rows) is a pattern, not a drift
    const at = changed.map((c, m) => (c ? m : -1)).filter((m) => m >= 0), step = at.length > 1 ? at[1] - at[0] : 0;
    if (step > 1 && at.length >= 2 && at.every((m, q) => !q || m - at[q - 1] === step) && la.length - 1 - at[at.length - 1] < step) continue;
    const i = changed.indexOf(true), j = changed.indexOf(false);
    const diff = Object.keys({ ...la[i].n.props, ...lb[i].n.props }).filter((p) => la[i].n.props[p] !== lb[i].n.props[p]).slice(0, 3);
    out.push({ kind: path.split(' > ').slice(-2).join(' > '), uid: lb[i].n.uid,
      text: `only ${k} of ${la.length} ${path.split(' > ').pop()} changed (${diff.map((p) => `${p}: ${la[i].n.props[p] || '∅'} → ${lb[i].n.props[p] || '∅'}`).join(', ')}); e.g. ${label(lb[j].n)} did not`,
      head: lb.filter((_, m) => changed[m]).map((x) => boxOf(x.n)).filter(Boolean).slice(0, 40), base: la.filter((_, m) => changed[m]).map((x) => boxOf(x.n)).filter(Boolean).slice(0, 40) });
  }
  return out.filter((x, k) => !out.some((y, m) => m !== k && x.uid && y.uid && x.uid.startsWith(y.uid + ' > ')));
}

// Siblings that matched in the base and no longer do: a button now shorter than the others in its
// toolbar (heights of the items of a flex or grid row that draw a box: a background, a border, a
// shadow; plain text has the height of its line), two text blocks of the same tag and the same
// type style (size, weight, family, style, colour, line height) now in different weights. Only a
// value that splits counts: siblings that all changed the same way still match.
const TYPE = ['font-size', 'font-weight', 'font-family', 'font-style', 'color', 'line-height'];
function split(A, B, boxOf) {
  const out = [];
  const seen = (c) => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c);
  const boxed = (n) => seen(n.props['background-color']) || (n.props['background-image'] || 'none') !== 'none' || (n.props['box-shadow'] || 'none') !== 'none'
    || ['top', 'right', 'bottom', 'left'].some((d) => parseFloat(n.props[`border-${d}-width`]) > 0 && seen(n.props[`border-${d}-color`]));
  const height = (n) => (n.raw && n.raw.b && n.raw.b[3] >= 4 && boxed(n) ? String(Math.round(n.raw.b[3])) : null);
  const type = (n) => (textOf(n) ? TYPE.map((p) => n.props[p] || '').join('|') : null);
  (function walk(a, b) {
    const xa = elKids(a), xb = elKids(b);
    if (xa.length === xb.length && xa.length >= 2 && xa.every((x, i) => kindOf(x) === kindOf(xb[i]))) {
      const row = /flex|grid/.test(a.props.display || '') && !/column/.test(a.props['flex-direction'] || '');
      for (const [what, f, same] of [['height', height, () => row], ['type', type, (i, j) => xa[i].tag === xa[j].tag]]) {
        const groups = new Map();
        xa.forEach((x, i) => { const v = f(x); if (v !== null) { const k = v + '|' + (what === 'type' ? x.tag : ''); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); } });
        for (const [, idx] of groups) {
          if (idx.length < 2 || !same(idx[0], idx[1])) continue;
          const before = f(xa[idx[0]]), now = idx.map((i) => f(xb[i]));
          if (now.some((v) => v === null) || new Set(now).size < 2) continue;
          const off = idx.filter((i, m) => now[m] !== before), on = idx.filter((i, m) => now[m] === before);
          // type: one of two peers restyled is a deliberate emphasis (a bigger name next to its count);
          // report when no peer kept the shared style, or when one of three or more drifted
          if (what === 'type' && on.length && !(idx.length >= 3 && off.length === 1)) continue;
          const props = what === 'height' ? [`height ${before}px → ${[...new Set(off.map((i) => f(xb[i])))].join(' / ')}px`]
            : TYPE.filter((p, k) => new Set(now.map((v) => v.split('|')[k])).size > 1).map((p) => `${p} ${xa[idx[0]].props[p]} → ${[...new Set(off.map((i) => xb[i].props[p]))].join(' / ')}`);
          out.push({ uid: xb[off[0]].uid, what, text: `${off.map((i) => label(xb[i])).slice(0, 2).join(', ')} no longer ${what === 'height' ? 'the same height' : 'in the same type'} as ${on.length ? on.map((i) => label(xb[i])).slice(0, 2).join(', ') : 'each other'} (${props.join(', ')})`,
            head: idx.map((i) => boxOf(xb[i])).filter(Boolean), base: idx.map((i) => boxOf(xa[i])).filter(Boolean) });
        }
      }
    }
    if (xa.length === xb.length) for (let i = 0; i < xa.length; i++) if (kindOf(xa[i]) === kindOf(xb[i])) walk(xa[i], xb[i]);
  })(A, B);
  return out;
}

// Hover feedback the head lost: elements whose own style (or ::before / ::after) changes when hovered
// in the base and no longer changes in the head. The page as loaded and its :hover-forced render
// have the same DOM, so raw trees pair node for node (as for focus indicators, focus.js).
const IGNORE = new Set(['caret-color', 'cursor', 'pointer-events', 'touch-action', 'user-select']);
const elems = (n) => (n.c || []).filter((c) => typeof c !== 'string');
const rawText = (n) => (n.c || []).map((c) => (typeof c === 'string' ? c : rawText(c))).join(' ').replace(/\s+/g, ' ').trim();
const rawKey = (raw) => raw.t + (raw.a && raw.a.class ? '.' + String(raw.a.class).trim().split(/\s+/)[0] : '');
function ownFeedback(plain, hovered) {
  const out = new Map(), seen = new Map();
  (function walk(a, b, path) {
    if (a.t !== b.t) return;
    const here = path + ' > ' + rawKey(a), diffs = [];
    if (!!a.x !== !!b.x) diffs.push(a.x ? 'shown on hover' : 'hidden on hover');
    else if (!a.x) {
      if (a.s !== undefined && b.s !== undefined) {
        const sa = plain.styles[a.s], sb = hovered.styles[b.s];
        for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) if (!IGNORE.has(k) && sa[k] !== sb[k]) diffs.push(`${k}: ${sa[k] === undefined ? '∅' : sa[k]} → ${sb[k] === undefined ? '∅' : sb[k]}`);
      }
      for (const [ps, name] of [['pb', '::before'], ['pa', '::after']]) {
        const x = a[ps] === undefined ? null : JSON.stringify(plain.styles[a[ps]]), y = b[ps] === undefined ? null : JSON.stringify(hovered.styles[b[ps]]);
        if (x !== y) diffs.push(`${name} ${x === null ? 'appears' : y === null ? 'goes away' : 'changes'}`);
      }
    }
    // elements pair by their path and what they say (then their order): a list sorted differently
    // still pairs each item with itself
    const id = here + '|' + rawText(a).slice(0, 40), n = seen.get(id) || 0; seen.set(id, n + 1);
    out.set(`${id}#${n}`, { label: rawKey(a), box: b.b, diffs });
    const ka = elems(a), kb = elems(b);
    if (!a.x && ka.length === kb.length) for (let i = 0; i < ka.length; i++) walk(ka[i], kb[i], here);
  })(plain.root, hovered.root, '');
  return out;
}
// -> [{ label, was: [diffs], head: box, base: box }]
function hoverLost(base, baseHover, head, headHover) {
  const B = ownFeedback(base, baseHover), H = ownFeedback(head, headHover), lost = [];
  for (const [k, b] of B) {
    const h = H.get(k);
    if (b.diffs.length && h && !h.diffs.length) lost.push({ key: k, label: b.label, was: b.diffs, base: b.box, head: h.box });
  }
  // the outermost elements that lost all of it
  return lost.filter((x) => !lost.some((y) => y !== x && x.key.startsWith(y.key.replace(/\|[^|]*#\d+$/, '') + ' > ')));
}

// States that no longer show. For every element with a class that names a state (on, active,
// selected, current, checked, open, reviewed, ...), the page is asked what the element (and what it
// contains) looks like without that class: in the live page, the class is taken off, the paint read,
// and the class put back. A state that changed the look in the base and changes nothing in the head
// is lost (a toggle whose "on" now looks like "off"), even when only one such element is on the page.
// -> { "path#n.class": true | false } (true: removing the class changes the look)
async function stateEffects(page) {
  return page.evaluate(() => {
    const STATE = /^(on|off|active|selected|sel|current|checked|open|opened|expanded|collapsed|hl|highlight|highlighted|pressed|done|reviewed|deleted|attached|error|invalid|warning|success|disabled|unread|new|is-[\w-]+|has-[\w-]+)$/;
    const PAINT = ['color', 'background-color', 'background-image', 'border-top-color', 'border-left-color', 'border-top-width', 'border-left-width', 'border-top-style',
      'outline-style', 'outline-color', 'opacity', 'visibility', 'display', 'font-weight', 'text-decoration-line', 'box-shadow', 'fill', 'stroke', 'stroke-width',
      'stroke-dasharray', 'fill-opacity', 'transform', 'left', 'top'];
    const look = (el) => {
      const out = [];
      for (const e of [el, ...el.querySelectorAll('*')].slice(0, 40)) {
        const cs = getComputedStyle(e);
        out.push(PAINT.map((p) => cs.getPropertyValue(p)).join('|'));
        for (const ps of ['::before', '::after']) { const c = getComputedStyle(e, ps); if (c.content && c.content !== 'none') out.push(ps + c.content + c.backgroundColor + c.left + c.transform + c.color); }
      }
      return out.join('#');
    };
    const name = (e) => e.tagName.toLowerCase() + (e.classList.length ? '.' + e.classList[0] : '');
    const path = (e) => { const p = []; for (let x = e; x && x !== document.body; x = x.parentElement) p.unshift(name(x)); return p.join(' > '); };
    const res = {}, seen = new Map();
    for (const el of document.body.querySelectorAll('[class]')) {
      const states = [...el.classList].slice(1).filter((c) => STATE.test(c));
      if (!states.length) continue;
      const k0 = path(el) + '|' + (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), n = seen.get(k0) || 0;   // with its text: a sorted list still pairs
      seen.set(k0, n + 1);
      for (const c of states) {
        const before = look(el);
        el.classList.remove(c);
        const after = look(el);
        el.classList.add(c);
        res[`${k0}#${n}.${c}`] = before !== after;
      }
    }
    return res;
  }).catch(() => ({}));
}
// -> [{ key, cls, label }] states that showed in the base and no longer do
function statesLost(base, head) {
  const out = [];
  for (const [k, v] of Object.entries(base || {})) if (v && head && head[k] === false) {
    const cls = k.slice(k.lastIndexOf('.') + 1), el = k.slice(0, k.lastIndexOf('#')).split('|')[0].split(' > ').pop();
    out.push({ key: k, cls, label: el });
  }
  return out;
}

module.exports = { trees, collapsed, drifted, split, hoverLost, stateEffects, statesLost, lookOf, kindOf };
