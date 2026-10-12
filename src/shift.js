// Knock-on layout shifts: elements that did not change themselves but moved or resized because of
// a change (a narrower sidebar slides the whole message list left). Base and head render the same
// fixture, so any element that kept its identity but not its box moved because of the PR.
//
// The two canonical trees are walked in parallel (children paired by group id, then by position in
// the group). An element is reported when its own props and text are unchanged (a changed element
// is a finding, boxed in red) and either
//   * its position changed in a way its parent's movement does not explain: a block that slides as
//     a whole is one region, not one box per descendant; or
//   * it is a leaf whose size changed (text that rewrapped). Containers that merely grew to hold a
//     grown child are not reported: every ancestor up to <html> would be.
//
// The same walk checks text contrast (WCAG 2.x 1.4.3): a text element whose contrast against its
// effective background was at or above AA in the base and falls below it in the PR is reported, even
// when the change that caused it is a one-unit colour tweak on an ancestor. The background is the
// nearest opaque background-color up the tree (translucent ones composited over it); behind a
// background image or gradient, or under opacity < 1, it is unknown and the element is skipped.
const { build, elKids, textOf } = require('./canon.js');
const { parseColor, contrast, over } = require('./perceive.js');

const WHITE = [255, 255, 255, 1];
// the effective background under a node, given its parent's (null = unknown)
function bgOf(n, parent) {
  if (parent === null) return null;
  if ((n.props['background-image'] && n.props['background-image'] !== 'none') || (n.props.opacity && +n.props.opacity < 1)) return null;
  const c = n.props['background-color'] ? parseColor(n.props['background-color']) : null;
  if (!c || c[3] === 0) return parent;
  return c[3] === 1 ? c : over(c, parent);
}
const ownText = (n) => n.kids.some((k) => k.text && /\S/.test(k.text));
// AA: 4.5:1, or 3:1 for large text (>= 24px, or >= 18.66px and bold)
function aa(n) {
  const size = parseFloat(n.props['font-size']), weight = parseFloat(n.props['font-weight']) || 400;
  return size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
}

const EPS = 0.5;
const near = (x, y) => Math.abs(x - y) <= EPS;

// Pair the members of one sibling group. Same size: by position. Otherwise a weighted LCS that
// prefers identical subtrees, so an inserted button does not pair with the one it pushed aside.
function pairGroup(la, lb) {
  const n = la.length, m = lb.length;
  // the same members in another order (a list sorted differently): each pairs with its identical
  // counterpart, and the group is marked as reordered
  if (n === m && n > 1 && la.some((x, i) => x.merkle !== lb[i].merkle) && la.map((x) => x.merkle).sort().join() === lb.map((x) => x.merkle).sort().join()) {
    const pool = new Map();
    for (const y of lb) { if (!pool.has(y.merkle)) pool.set(y.merkle, []); pool.get(y.merkle).push(y); }
    const pairs = la.map((x) => [x, pool.get(x.merkle).shift()]);
    pairs.reordered = true;
    return pairs;
  }
  if (n === m || n * m > 250000) return la.slice(0, Math.min(n, m)).map((x, i) => [x, lb[i]]);
  const w = (x, y) => (x.merkle === y.merkle ? 3 : x.local === y.local ? 2 : 1);
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = Math.max(L[i + 1][j], L[i][j + 1], L[i + 1][j + 1] + w(la[i], lb[j]));
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (L[i][j] === L[i + 1][j + 1] + w(la[i], lb[j])) pairs.push([la[i++], lb[j++]]);
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return pairs;
}

// boxOf: the box to draw for a canonical node (fingerprint.js: ink extent, clipped to scroll
// containers); null when out of view.
// Layout relations (after X-PERT / GWALI / ReDeCheck, which compare relations between elements
// instead of pixels): a small style change matters most when it breaks one. Compared per element
// between base and PR (same fixture, so content is the same):
//   clipped   - content now overflows a box that cuts it off (overflow hidden/clip, ellipsis), or
//               now scrolls inside a box that did not need to
//   overlap   - two in-flow siblings now intersect
//   protrudes - the element now reaches past the right edge of the viewport (horizontal scrolling)
//   covered   - another element is now drawn over the centre of a text or interactive element
//               (a z-index / stacking change; sampled with elementFromPoint in the viewport)
//   misaligned - an edge it shared with its neighbours is now 0.5 to 3px off (see below)
const FLOW = (n) => !/^(absolute|fixed)$/.test(n.props.position || 'static') && !(n.props.float && n.props.float !== 'none');
function overflowKind(n) {
  const ov = n.raw && n.raw.ov;
  if (!ov) return null;
  const x = ov[0] > ov[1] + 1, y = ov[2] > ov[3] + 1;
  if (!x && !y) return null;
  // the axis that overflows decides (overflow-y: hidden turns a visible overflow-x into auto)
  const scrolls = (v) => v === 'auto' || v === 'scroll';
  return (x && !scrolls(n.props['overflow-x'])) || (y && !scrolls(n.props['overflow-y'])) ? 'cut off' : 'scrolls';
}
const intersect = (p, q) => Math.min(p[0] + p[2], q[0] + q[2]) - Math.max(p[0], q[0]) > 1 && Math.min(p[1] + p[3], q[1] + q[3]) - Math.max(p[1], q[1]) > 1;

// Alignment. People see a break in edges that used to line up at hyperacuity scale (vernier acuity:
// a few seconds of arc, while one CSS pixel at a normal viewing distance is about a minute), but
// hardly notice a whole region moving by a pixel. So a 1px change matters when it breaks an edge
// shared with neighbours: edges (left, right, centre, top, bottom) of what is drawn that were within
// 0.5px of each other in the base, on elements stacked close together (a column of rows, a row of
// cards), and are 0.5 to 3px apart in the PR. Larger moves are plainly visible and reported anyway.
const REPLACED = new Set(['img', 'svg', 'canvas', 'video', 'input', 'button', 'select', 'textarea', 'iframe']);
const num = (v) => parseFloat(v) || 0;
// the rectangle that is drawn: the border box if it paints a box (or is replaced), the content box
// of an element with its own text, else nothing; and which of its edges are visible
function drawn(n) {
  const b = n.raw && n.raw.b, p = n.props;
  if (!b || b[2] < 1 || b[3] < 1) return null;
  const bg = p['background-color'] && parseColor(p['background-color']);
  const box = (bg && bg[3] > 0) || (p['background-image'] && p['background-image'] !== 'none') || (p['box-shadow'] && p['box-shadow'] !== 'none')
    || ['top', 'right', 'bottom', 'left'].some((d) => num(p[`border-${d}-width`]) > 0);
  if (box || REPLACED.has(n.tag)) return { r: b, edges: ['L', 'R', 'CX', 'T', 'B', 'CY'] };
  if (!ownText(n)) return null;
  const l = num(p['padding-left']) + num(p['border-left-width']), t = num(p['padding-top']) + num(p['border-top-width']);
  const r = [b[0] + l, b[1] + t, b[2] - l - num(p['padding-right']) - num(p['border-right-width']), b[3] - t - num(p['padding-bottom']) - num(p['border-bottom-width'])];
  if (/inline/.test(p.display || '')) return { r, edges: ['L', 'R', 'T', 'B', 'CY'], text: true };    // the box is the text
  const ta = p['text-align'] || 'start';                                                  // a block: text lines up on one side
  return { r, edges: [/right|end/.test(ta) ? 'R' : /center/.test(ta) ? 'CX' : 'L', 'T'], text: true };
}
const EDGE = { L: (r) => r[0], R: (r) => r[0] + r[2], CX: (r) => r[0] + r[2] / 2, T: (r) => r[1], B: (r) => r[1] + r[3], CY: (r) => r[1] + r[3] / 2 };
const EDGE_NAME = { L: 'left edges', R: 'right edges', CX: 'centres', T: 'top edges', B: 'bottom edges', CY: 'middles' };
const NEAR = 96;                                                                          // px between neighbours (a card gap and its padding)
function misaligned(pairs, boxOf, limit) {
  const items = [];
  const drawnPairs = pairs.map(([a, b]) => [a, b, drawn(a), drawn(b)]).filter((x) => x[2] && x[3]);
  for (const e of Object.keys(EDGE)) {
    const vertical = e === 'L' || e === 'R' || e === 'CX';                               // the edge is a vertical line (else horizontal)
    // the top and bottom of a text box follow its font metrics: not comparable once its size changed
    const metrics = (x) => (e === 'T' || e === 'B' || e === 'CY') && x[3].text && (x[0].props['font-size'] !== x[1].props['font-size'] || x[0].props['line-height'] !== x[1].props['line-height'] || x[0].props['font-family'] !== x[1].props['font-family']);
    const pts = drawnPairs.filter((x) => x[2].edges.includes(e) && x[3].edges.includes(e) && !metrics(x)).map((x) => ({ a: x[0], b: x[1], v: EDGE[e](x[2].r), w: EDGE[e](x[3].r), r: x[2].r }))
      .sort((p, q) => p.v - q.v);
    // equal base edges, then chains of elements close together along the edge
    for (let i = 0; i < pts.length && items.length < limit;) {
      let j = i; while (j < pts.length && pts[j].v - pts[i].v <= EPS) j++;
      const same = pts.slice(i, j).sort((p, q) => (vertical ? p.r[1] - q.r[1] : p.r[0] - q.r[0]));
      i = j;
      let chain = [same[0]];
      const flush = () => {
        if (chain.length >= 2) { const it = breakIn(chain, e); if (it) items.push(it); }
      };
      for (let k = 1; k < same.length; k++) {
        const p = chain[chain.length - 1].r, q = same[k].r;
        const gap = vertical ? q[1] - (p[1] + p[3]) : q[0] - (p[0] + p[2]);
        if (gap <= NEAR) chain.push(same[k]); else { flush(); chain = [same[k]]; }
      }
      flush();
    }
  }
  function breakIn(chain, e) {
    const ws = chain.map((m) => m.w).sort((x, y) => x - y);
    if (ws[ws.length - 1] - ws[0] <= EPS) return null;                                    // still aligned (perhaps moved together)
    // the edge most members are on now; the others broke away from it
    const groups = [];
    for (const w of ws) { const g = groups[groups.length - 1]; if (g && w - g[0] <= EPS) g.push(w); else groups.push([w]); }
    groups.sort((x, y) => y.length - x.length);
    if (groups.length > 1 && groups[0].length === groups[1].length) return null;          // no edge the rest still share
    const main = groups[0][0];
    const off = chain.filter((m) => Math.abs(m.w - main) > EPS);
    if (off.some((m) => Math.abs(m.w - main) > 3)) return null;                           // a bigger move: visible anyway
    const on = chain.filter((m) => Math.abs(m.w - main) <= EPS);
    // box the elements that broke away and, for each, its nearest neighbour still on the line: the
    // pair whose edges no longer meet
    const along = (m) => (e === 'L' || e === 'R' || e === 'CX' ? m.r[1] + m.r[3] / 2 : m.r[0] + m.r[2] / 2);
    const shown = new Set(off);
    for (const m of off) shown.add(on.reduce((best, x) => (Math.abs(along(x) - along(m)) < Math.abs(along(best) - along(m)) ? x : best)));
    const names = (ms) => { const ks = [...new Set(ms.map((m) => m.b.key))]; return ks.slice(0, 2).join(', ') + (ks.length > 2 ? ', …' : '') + (ms.length > 1 ? ` (${ms.length})` : ''); };
    const d = Math.abs(off[0].w - main).toFixed(1).replace(/\.0$/, '');
    return { kind: 'misaligned', edges: [EDGE_NAME[e]], head: [...shown].map((m) => boxOf(m.b)).filter(Boolean), base: [...shown].map((m) => boxOf(m.a)).filter(Boolean), key: off[0].b.key, uid: off[0].b.uid,
      text: `${EDGE_NAME[e]} of ${names(off)} and ${names(on)} no longer line up (${d}px apart)` };
  }
  // one item per set of elements that broke away, naming every edge they broke
  const merged = new Map();
  for (const it of items) {
    const k = JSON.stringify(it.head), m = merged.get(k);
    if (!m) merged.set(k, it);
    else if (!m.edges.includes(it.edges[0])) { m.edges.push(it.edges[0]); m.text = m.text.replace(/^[^ ]+( and [^ ]+)* of /, `${m.edges.join(', ').replace(/, ([^,]+)$/, ' and $1')} of `); }
  }
  return [...merged.values()];
}

// the text in a subtree, for naming an element that is only on one side
const textDeep = (n) => n.kids.map((k) => (k.text ? k.text : textDeep(k))).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

function propDiff(a, b) {
  const out = [];
  for (const p of new Set([...Object.keys(a.props), ...Object.keys(b.props)])) {
    if (a.props[p] !== b.props[p]) out.push(`${p}: ${a.props[p] === undefined ? '∅' : a.props[p]} → ${b.props[p] === undefined ? '∅' : b.props[p]}`);
  }
  const ta = textOf(a), tb = textOf(b);
  // a template that printed a missing value: undefined, null, NaN, [object Object], {{ ... }}
  const broken = (t) => /\b(undefined|NaN|null)\b|\[object Object\]|\{\{|\}\}/.test(t);
  if (ta !== tb) out.push(`text: "${ta.slice(0, 40)}" → "${tb.slice(0, 40)}"${broken(tb) && !broken(ta) ? ' (looks like a value that failed to load)' : ''}`);
  return out;
}

// rawText: compare text as it is (numbers, units, dates), for two renders of the same fixture
function moved(refSnap, headSnap, { stateClasses = [], keyMode = 'class', boxOf, limit = 2000, ignoreProps, rawText = false } = {}) {
  const opts = { stateClasses, keyMode, ignoreProps, rawText };
  const A = build(refSnap, opts), B = build(headSnap, opts);
  const out = { base: [], head: [], count: 0, contrast: [], layout: [], changed: [] };
  const pairsAll = [];                              // every paired element, for the alignment check
  const rigid = (a, b) => { const ka = elKids(a), kb = elKids(b); for (let i = 0; i < ka.length && i < kb.length; i++) { pairsAll.push([ka[i], kb[i]]); rigid(ka[i], kb[i]); } };
  const vw = (headSnap.viewport || [1280])[0], vwBase = (refSnap.viewport || [1280])[0];
  const vh = (headSnap.viewport || [0, 800])[1], vhBase = (refSnap.viewport || [0, 800])[1];
  // A page whose html or body does not scroll (overflow hidden: app shells) cannot bring into view
  // what lies past the bottom or right edge of the window, unless a scroll container holds it.
  const noScroll = (root) => [root, ...elKids(root).filter((k) => k.tag === 'body')].some((n) => /^(hidden|clip)$/.test(n.props['overflow-y'] || ''));
  const stuckA = noScroll(A), stuckB = noScroll(B);
  const unreachable = (n, w, h, stuck) => stuck && !n.clip && n.props.position !== 'fixed' && n.raw && n.raw.b && n.raw.b[2] > 1 && n.raw.b[3] > 1
    && (n.raw.b[1] + n.raw.b[3] > h + 2 || n.raw.b[0] + n.raw.b[2] > w + 2);
  // a fixed element cannot be scrolled into view: any part past the window is cut off
  const pastWindow = (n, w, h) => n.props.position === 'fixed' && n.raw && n.raw.b && (n.raw.b[0] < -1 || n.raw.b[1] < -1 || n.raw.b[0] + n.raw.b[2] > w + 1 || n.raw.b[1] + n.raw.b[3] > h + 1);
  // being covered is not a style: a subtree whose styles are unchanged is still walked when
  // something in it is drawn over (raw.occ), on either side
  const occMemo = new Map();
  // a subtree whose container now cuts more of it off is walked too
  const sameCut = (a, b) => JSON.stringify(a.hardClip || null) === JSON.stringify(b.hardClip || null) || !elKids(b).length;
  const occIn = (n) => { if (!occMemo.has(n)) occMemo.set(n, !!(n.raw && n.raw.occ) || elKids(n).some(occIn)); return occMemo.get(n); };
  // how much an image is magnified on screen (device pixels per image pixel; 0: it did not load)
  const dprA = (refSnap.viewport || [0, 0, 1])[2] || 1, dprB = (headSnap.viewport || [0, 0, 1])[2] || 1;
  const imgScale = (n, dpr) => {
    const im = n.raw && n.raw.img, bx = n.raw && n.raw.b;
    if (n.tag !== 'img' || !im || !bx || bx[2] < 8 || bx[3] < 8 || im.v || /\.svg($|[?#])/i.test(im.src || '')) return null;
    if (!im.nw || !im.nh) return 0;
    const sx = bx[2] * dpr / im.nw, sy = bx[3] * dpr / im.nh, fit = n.props['object-fit'] || 'fill';
    return fit === 'cover' ? Math.max(sx, sy) : fit === 'contain' ? Math.min(sx, sy) : fit === 'none' ? 1 : fit === 'scale-down' ? Math.min(1, sx, sy) : Math.max(sx, sy);
  };
  // the share of an image its box cuts off (object-fit: cover, or none on a smaller box)
  const imgCrop = (n) => {
    const im = n.raw && n.raw.img, bx = n.raw && n.raw.b;
    if (n.tag !== 'img' || !im || !im.nw || !im.nh || !bx || bx[2] < 8 || bx[3] < 8) return 0;
    const fit = n.props['object-fit'] || 'fill', ra = bx[2] / bx[3], ri = im.nw / im.nh;
    if (fit === 'cover') return 1 - Math.min(ra / ri, ri / ra);
    if (fit === 'none') return Math.max(0, 1 - (Math.min(bx[2], im.nw) * Math.min(bx[3], im.nh)) / (im.nw * im.nh));
    return 0;
  };
  // the part of a text, replaced or interactive element that a container which does not scroll cuts
  // off: "12px at the top" (null: none)
  const cutOff = (n) => {
    const c = n.hardClip, bx = n.raw && n.raw.b;
    if (!c || !bx || bx[2] < 2 || bx[3] < 2 || !(ownText(n) || REPLACED.has(n.tag) || /^(a|label)$/.test(n.tag))) return null;
    const sides = [['left', c[0] - bx[0]], ['top', c[1] - bx[1]], ['right', bx[0] + bx[2] - c[2]], ['bottom', bx[1] + bx[3] - c[3]]].filter(([, d]) => d > 2);
    return sides.length ? sides.map(([side, d]) => `${Math.round(Math.min(d, side === 'left' || side === 'right' ? bx[2] : bx[3]))}px at the ${side}`).join(', ') : null;
  };
  (function walk(a, b, px, py, pbgA, pbgB, outA, outB, inCutB) {
    pairsAll.push([a, b]);
    // the element itself is drawn differently (its own props or text): with the same data on both
    // sides, a change even where the fingerprint learned "this is data" (pr.js uses it when the pixels differ)
    if (a.local !== b.local && out.changed.length < limit) out.changed.push({ key: b.key, uid: b.uid, head: boxOf(b), base: boxOf(a), changes: propDiff(a, b) });
    // newly cut off / scrolling
    const kb = overflowKind(b), ka = overflowKind(a);
    // (text that ends in an ellipsis is truncated by design: "truncated", a softer kind)
    if (kb && kb !== ka && out.layout.length < limit) out.layout.push({ kind: kb === 'scrolls' ? 'scrolls' : b.props['text-overflow'] === 'ellipsis' ? 'truncated' : 'clipped', head: boxOf(b), base: boxOf(a), key: b.key, uid: b.uid,
      text: `${b.key}: ${b.raw.ov[0] > b.raw.ov[1] + 1 ? `${b.raw.ov[0]}px of content in ${b.raw.ov[1]}px` : `${b.raw.ov[2]}px of content in ${b.raw.ov[3]}px`}` });
    // newly cut off by a container that does not scroll (overflow hidden / clip): a menu or a popover
    // positioned outside its container, which the container's own overflow does not count (reported
    // for the outermost element only)
    const cutA = cutOff(a), cutB = cutOff(b);
    if (cutB && !cutA && !inCutB && out.layout.length < limit) out.layout.push({ kind: 'clipped', head: b.raw.b, base: boxOf(a), key: b.key, uid: b.uid,
      text: `${b.key}: now cut off by its container (${cutB})` });
    // an image that no longer loads, is now drawn larger than its pixels (blurry), or now cropped
    const ia = imgScale(a, dprA), ib = imgScale(b, dprB), ca = imgCrop(a), cb = imgCrop(b);
    if (cb > 0.1 && ca < 0.02 && out.layout.length < limit) out.layout.push({ kind: 'image', head: boxOf(b), base: boxOf(a), key: b.key, uid: b.uid,
      text: `${b.key}: the image is now cropped, ${Math.round(cb * 100)}% of it cut off (object-fit: ${b.props['object-fit'] || 'fill'})` });
    if (ib !== null && out.layout.length < limit) {
      if (ib === 0 && ia !== 0) out.layout.push({ kind: 'image', head: boxOf(b), base: boxOf(a), key: b.key, uid: b.uid, text: `${b.key}: the image no longer loads (${String(b.raw.img.src).slice(0, 60)})` });
      else if (ib > 1.25 && (ia === null || (ia > 0 && ia <= 1.25))) out.layout.push({ kind: 'image', head: boxOf(b), base: boxOf(a), key: b.key, uid: b.uid,
        text: `${b.key}: now drawn at ${ib.toFixed(1)}× its pixels, blurry (${b.raw.img.nw}×${b.raw.img.nh} image in a ${Math.round(b.raw.b[2])}×${Math.round(b.raw.b[3])} box)` });
    }
    // newly covered by another element
    if (b.raw && b.raw.occ && !(a.raw && a.raw.occ) && out.layout.length < limit) out.layout.push({ kind: 'covered', head: boxOf(b), base: boxOf(a), key: b.key, uid: b.uid, text: `${b.key} now under ${b.raw.occ}` });
    // a fixed element (menu, pop-up, panel) newly reaching past the window
    if (pastWindow(b, vw, vh) && !pastWindow(a, vwBase, vhBase) && out.layout.length < limit) {
      const [x, y, w, h] = b.raw.b, side = y + h > vh + 1 ? 'bottom' : x + w > vw + 1 ? 'right' : y < -1 ? 'top' : 'left';
      out.layout.push({ kind: 'offscreen', head: boxOf(b), base: boxOf(a), key: b.key, uid: b.uid, text: `${b.key}: past the ${side} edge of the ${vw}×${vh} window` });
    }
    if (unreachable(b, vw, vh, stuckB) && !unreachable(a, vwBase, vhBase, stuckA) && !inCutB && out.layout.length < limit) {
      const [x, y, w, h] = b.raw.b;
      const below = y + h > vh + 2;
      out.layout.push({ kind: 'offscreen', head: boxOf(b), base: boxOf(a), key: b.key, uid: b.uid,
        text: `${b.key}: ${Math.round(below ? y + h - vh : x + w - vw)}px of it now past the ${below ? 'bottom' : 'right'} edge of the ${vw}×${vh} window, and the page does not scroll` });
    }
    // newly past the right edge of the viewport (reported for the outermost element only)
    // (content cut off by an ancestor's overflow does not make the page scroll)
    const right = (n) => Math.min(n.raw.b[0] + n.raw.b[2], n.clip ? n.clip[2] : Infinity);
    const pa = a.raw && a.raw.b && right(a) > vwBase + 1, pb = b.raw && b.raw.b && right(b) > vw + 1;
    let inA = outA, inB = outB;
    const kidCutB = inCutB || !!cutB || (unreachable(b, vw, vh, stuckB) && !unreachable(a, vwBase, vhBase, stuckA));
    if (pb && !pa && !outB && b.props.position !== 'fixed' && out.layout.length < limit) out.layout.push({ kind: 'protrudes', head: boxOf(b), base: boxOf(a), key: b.key, uid: b.uid, text: `${b.key}: right edge at ${Math.round(b.raw.b[0] + b.raw.b[2])}px, viewport ${vw}px` });
    if (pb) inB = true; if (pa) inA = true;
    const bgA = bgOf(a, pbgA), bgB = bgOf(b, pbgB);
    if (bgA && bgB && ownText(b) && a.props.color && b.props.color) {
      const fa = parseColor(a.props.color), fb = parseColor(b.props.color);
      if (fa && fb) {
        const ca = contrast(fa, bgA), cb = contrast(fb, bgB), min = aa(b);
        if (ca >= min && cb < min) out.contrast.push({ key: b.key, uid: b.uid, head: boxOf(b), base: boxOf(a), from: ca, to: cb, min, color: b.props.color, bg: `rgb(${bgB.slice(0, 3).map(Math.round).join(', ')})` });
      }
    }
    const ba = a.raw && a.raw.b, bb = b.raw && b.raw.b;
    let dx = px, dy = py, resized = false;
    if (ba && bb) {
      dx = bb[0] - ba[0]; dy = bb[1] - ba[1];
      resized = !near(bb[2], ba[2]) || !near(bb[3], ba[3]);
      const shifted = !near(dx, px) || !near(dy, py);
      if ((shifted || (resized && !elKids(b).length)) && a.local === b.local && out.count < limit) {
        const x = boxOf(a), y = boxOf(b);
        if (x || y) { out.count++; if (x) out.base.push(x); if (y) out.head.push(y); }
      }
    }
    const sameBg = (bgA === null) === (bgB === null) && (!bgA || bgA.every((v, i) => Math.abs(v - bgB[i]) < 0.01));
    if (a.merkle === b.merkle && !resized && sameBg && !occIn(a) && !occIn(b) && sameCut(a, b)) { rigid(a, b); return; }   // same subtree, size, backdrop and clip: nothing inside differs
    const ga = new Map(), gb = new Map();
    for (const k of elKids(a)) { if (!ga.has(k.gid)) ga.set(k.gid, []); ga.get(k.gid).push(k); }
    for (const k of elKids(b)) { if (!gb.has(k.gid)) gb.set(k.gid, []); gb.get(k.gid).push(k); }
    // Elements on one side only: with the same fixture on both sides, a row, a menu item or a marker
    // the PR added or removed (the fingerprint lets lists vary in length, so it does not see this).
    // (added items that repeat what their siblings already say are duplicates: a list merged twice)
    const oneSided = (list, how, kept = []) => {
      if (!list.length || out.changed.length >= limit) return;
      const texts = list.map((x) => textDeep(x).slice(0, 40)).filter(Boolean);
      const have = new Set(kept.map((x) => textDeep(x).slice(0, 40)).filter(Boolean));
      const dup = how === 'added' && texts.length === list.length && texts.every((t) => have.has(t));
      const desc = `${how}${dup ? ' (duplicates of items already there)' : ''}: ${list.length > 1 ? list.length + ' × ' : ''}${list[0].key}${texts.length ? ` (${texts.slice(0, 3).map((t) => `"${t}"`).join(', ')}${texts.length > 3 ? ', …' : ''})` : ''}`;
      for (const x of list) out.changed.push({ key: x.key, uid: x.uid, head: how === 'added' ? boxOf(x) : null, base: how === 'removed' ? boxOf(x) : null, changes: [desc], oneSided: how });
    };
    const pairs = [];
    for (const [g, la] of ga) {
      const lb = gb.get(g), pg = lb ? pairGroup(la, lb) : [];
      for (const pr of pg) pairs.push(pr);
      if (pg.reordered && out.changed.length < limit) {
        const names = (l) => l.slice(0, 3).map((x) => `"${textDeep(x).slice(0, 20)}"`).join(', ');
        out.changed.push({ key: b.key, uid: b.uid, head: boxOf(b), base: boxOf(a), changes: [`reordered: ${la.length} × ${la[0].key} (${names(la)} → ${names(lb)}${la.length > 3 ? ', …' : ''})`], reordered: true });
      }
      if (!lb || pg.length < Math.max(la.length, lb.length)) {
        const used = new Set(pg.flat());
        oneSided(la.filter((x) => !used.has(x)), 'removed');
        if (lb) oneSided(lb.filter((x) => !used.has(x)), 'added', lb.filter((x) => used.has(x)));
      }
    }
    for (const [g, lb] of gb) if (!ga.has(g)) oneSided(lb, 'added');
    // newly overlapping in-flow siblings (all pairs for small groups, neighbours for long lists)
    const sib = pairs.filter(([x, y]) => FLOW(x) && FLOW(y) && x.raw.b && y.raw.b && x.raw.b[2] * x.raw.b[3] > 0 && y.raw.b[2] * y.raw.b[3] > 0);
    for (let i = 0; i < sib.length && out.layout.length < limit; i++) for (let j = i + 1; j < (sib.length <= 60 ? sib.length : Math.min(sib.length, i + 2)); j++) {
      const [ai, bi] = sib[i], [aj, bj] = sib[j];
      if (intersect(bi.raw.b, bj.raw.b) && !intersect(ai.raw.b, aj.raw.b))
        out.layout.push({ kind: 'overlap', head: [boxOf(bi), boxOf(bj)], base: [boxOf(ai), boxOf(aj)], key: `${bi.key} + ${bj.key}`, uid: `${bi.uid} + ${bj.uid}`, text: `${bi.key} and ${bj.key} now overlap` });
    }
    for (const [x, y] of pairs) walk(x, y, dx, dy, bgA, bgB, inA, inB, kidCutB);
  })(A, B, 0, 0, WHITE, WHITE, false, false, false);
  out.layout.push(...misaligned(pairsAll, boxOf, Math.max(0, Math.min(200, limit - out.layout.length))));
  out.layout.push(...unmarked(pairsAll, boxOf, vw * vh));
  return out;
}

// Markers that no longer sit on what they mark: an empty, positioned, painted box (a highlight, a
// selection frame) that covered all or most of a text or graphic in the base and does not in the PR
// (a highlight shifted off its label). Same fixture, so the pairs are the same things.
function unmarked(pairs, boxOf, viewArea) {
  const area = (r) => Math.max(0, r[2]) * Math.max(0, r[3]);
  const inter = (p, q) => Math.max(0, Math.min(p[0] + p[2], q[0] + q[2]) - Math.max(p[0], q[0])) * Math.max(0, Math.min(p[1] + p[3], q[1] + q[3]) - Math.max(p[1], q[1]));
  const marker = (n) => /^(absolute|fixed)$/.test(n.props.position || '') && !n.kids.length && drawn(n) && n.raw.b && area(n.raw.b) > 16 && area(n.raw.b) < viewArea / 8;
  const target = (n) => n.raw && n.raw.b && area(n.raw.b) > 4 && (ownText(n) || n.tag === 'text' || n.tag === 'img');
  const ms = pairs.filter(([a, b]) => marker(a) && marker(b)), ts = pairs.filter(([a, b]) => target(a) && target(b));
  const out = [];
  for (const [ma, mb] of ms) {
    for (const [ta, tb] of ts) {
      const before = inter(ma.raw.b, ta.raw.b) / area(ta.raw.b), after = inter(mb.raw.b, tb.raw.b) / area(tb.raw.b);
      // it held all of it and no longer does, or held most of it and now half as much
      if ((before >= 0.95 && after < 0.9) || (before >= 0.6 && after < before / 2)) {
        out.push({ kind: 'misaligned', head: [boxOf(mb), boxOf(tb)].filter(Boolean), base: [boxOf(ma), boxOf(ta)].filter(Boolean), key: `${mb.key} + ${tb.key}`, uid: `${mb.uid} + ${tb.uid}`,
          text: `${mb.key} no longer over the ${tb.key} it marks (covers ${Math.round(after * 100)}% of it, was ${Math.round(before * 100)}%)` });
        break;
      }
    }
  }
  return out;
}

module.exports = { moved };
