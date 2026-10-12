// Invisible but still clickable. An element drawn fully transparent (opacity: 0 on it or an
// ancestor) still takes clicks, unlike one hidden with visibility: hidden or display: none: a layer
// "hidden" with opacity: 0 stays selectable, and a modal backdrop faded out but left in the page
// blocks everything under it. No screenshot shows this, and the fingerprint prunes invisible content.
//
// Base and head render the same fixture, so elements pair by their path of tags and stable classes
// (then by order among elements with the same path), as in focus.js. Reported: elements that take
// clicks while invisible in the head and did not in the base (hidden another way, not rendered, or
// pointer-events: none), and invisible click-takers new in the head that cover a quarter of the
// window or more. Form controls are left out: an invisible native input over a custom-drawn one is
// the accessible way to style a checkbox. Only the outermost such element is reported.
const { stableClasses } = require('./canon.js');

const CONTROLS = new Set(['input', 'select', 'textarea', 'button', 'a', 'label', 'summary', 'option']);
const keyOf = (raw) => raw.t + stableClasses((raw.a && raw.a.class) || '').map((c) => '.' + c).join('');

// -> Map("path#n" -> { ghost, top, box, label, why })
function hitMap(snap) {
  const out = new Map(), seen = new Map();
  (function walk(n, path, faded, pe, parentGhost) {
    if (!n || typeof n !== 'object') return;
    const here = path + ' > ' + keyOf(n), k = seen.get(here) || 0;
    seen.set(here, k + 1);
    if (n.x) { out.set(`${here}#${k}`, { ghost: false, why: 'not rendered' }); return; }
    const s = n.s !== undefined ? snap.styles[n.s] : {};
    const f = faded || s.opacity === '0', p = s['pointer-events'] || pe;     // pointer-events inherits
    const ghost = f && s.visibility !== 'hidden' && p !== 'none' && !CONTROLS.has(n.t) && !!n.b && n.b[2] > 0 && n.b[3] > 0;
    out.set(`${here}#${k}`, { ghost, top: ghost && !parentGhost, box: n.b, label: keyOf(n),
      why: s.visibility === 'hidden' ? 'visibility: hidden' : p === 'none' ? 'pointer-events: none' : f ? '' : 'visible' });
    for (const c of n.c || []) if (typeof c !== 'string') walk(c, here, f, p, ghost);
  })(snap.root, '', false, 'auto', false);
  return out;
}

// -> [{ key, label, head: box, base: box | null, was }]
function ghosts(base, head, { ignore = new Set() } = {}) {
  const A = hitMap(base), B = hitMap(head), out = [];
  const [vw, vh] = head.viewport || [1280, 800];
  for (const [k, h] of B) {
    if (!h.top || ignore.has(k)) continue;
    const a = A.get(k);
    if (a ? a.ghost : h.box[2] * h.box[3] < 0.25 * vw * vh) continue;
    out.push({ key: k, label: h.label, head: h.box, base: a && a.box ? a.box : null, was: a ? a.why : 'not in the base' });
  }
  return out;
}

module.exports = { ghosts, hitMap };
