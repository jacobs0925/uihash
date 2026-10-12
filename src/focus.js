// Focus indicators (WCAG 2.4.7 Focus Visible). A keyboard user must be able to see which control has
// focus; a stylesheet change such as `:focus { outline: none }` removes that without changing anything
// a static render shows.
//
// The page as loaded and the same page with :focus forced (capture.js forceState) have the same DOM,
// so the two raw trees pair node for node. A focusable element (raw.fo) whose subtree is styled
// differently when focused (its own style, ::before/::after, anything below it) has a focus indicator.
// Boxes are not compared: a box moves because of a style change (already counted) or because the
// two page loads differ (an image that loaded later), which is no indicator. Comparing that per
// element between base and head finds the controls whose indicator the PR removed. Elements pair
// between base and head by their path of tags and stable classes, then by order among elements with
// the same path.
const { stableClasses } = require('./canon.js');

// not drawn, or pinned while capturing
const IGNORE = new Set(['caret-color', 'cursor', 'pointer-events', 'touch-action', 'user-select']);

function styleDiff(sa, sb, out) {
  for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
    if (!IGNORE.has(k) && sa[k] !== sb[k]) out.push(`${k}: ${sa[k] === undefined ? '∅' : sa[k]} → ${sb[k] === undefined ? '∅' : sb[k]}`);
  }
}
const elems = (n) => (n.c || []).filter((c) => typeof c !== 'string');
const keyOf = (raw) => raw.t + stableClasses((raw.a && raw.a.class) || '').map((c) => '.' + c).join('');

// -> Map("path#n" -> { label, box, diffs }) for every focusable element
function indicators(plain, focused) {
  const out = new Map(), seen = new Map();
  const walk = (a, b, path) => {
    const diffs = [];
    if (a.t !== b.t) return ['(structure differs)'];
    if (!!a.x !== !!b.x) diffs.push(a.x ? 'shown when focused' : 'hidden when focused');
    else if (a.x) return diffs;
    if (a.s !== undefined && b.s !== undefined) styleDiff(plain.styles[a.s], focused.styles[b.s], diffs);
    for (const [ps, name] of [['pb', '::before'], ['pa', '::after']]) {
      const x = a[ps] === undefined ? null : JSON.stringify(plain.styles[a[ps]]), y = b[ps] === undefined ? null : JSON.stringify(focused.styles[b[ps]]);
      if (x !== y) diffs.push(`${name} ${x === null ? 'added' : y === null ? 'removed' : 'changed'}`);
    }
    const here = path + ' > ' + keyOf(a), ka = elems(a), kb = elems(b);
    const sub = [];
    if (ka.length === kb.length) for (let i = 0; i < ka.length; i++) sub.push(...walk(ka[i], kb[i], here));
    const all = diffs.concat(sub);
    if (a.fo) {
      const n = seen.get(here) || 0; seen.set(here, n + 1);
      out.set(`${here}#${n}`, { label: keyOf(a), box: b.b, diffs: all });
    }
    return all;
  };
  walk(plain.root, focused.root, '');
  return out;
}

// Focusable elements that had a visible focus indicator in the base and have none in the head.
function focusLost(base, basef, head, headf) {
  const B = indicators(base, basef), H = indicators(head, headf), lost = [];
  for (const [k, b] of B) {
    const h = H.get(k);
    if (b.diffs.length && h && !h.diffs.length) lost.push({ label: b.label, was: b.diffs, base: b.box, head: h.box });
  }
  return lost;
}

module.exports = { indicators, focusLost };
