// Categorical colours that the PR made hard to tell apart. Legend swatches, series and status colours
// are told apart by colour alone; a palette change can make two of them nearly the same (a yellow
// that became a second orange) for everyone, or only for the 1 in 12 men with a colour-vision
// deficiency, while each colour still passes contrast.
//
// A categorical set: the elements at one path of tags and stable classes (legend > row > swatch)
// whose colour property takes at least 3 distinct opaque values. Base and head render the same
// fixture, so the elements pair by order. A pair is reported when its two colours were apart in the
// base (CIEDE2000 >= T) and are not in the head, for normal vision or under a simulated protanopia,
// deuteranopia or tritanopia (Machado, Oliveira & Fernandes 2009, severity 1, in linear RGB, as in
// Chrome's emulation).
const { parseColor, deltaE2000 } = require('./perceive.js');
const { stableClasses } = require('./canon.js');

const T = 10;  // CIEDE2000: below this, small marks read as one category (small marks need larger differences: Szafir 2018)
const MACHADO = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900],
};
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = (c) => { c = Math.min(1, Math.max(0, c)); return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055); };
function simulate(rgb, m) {
  const [r, g, b] = rgb.map(toLin);
  return [m[0] * r + m[1] * g + m[2] * b, m[3] * r + m[4] * g + m[5] * b, m[6] * r + m[7] * g + m[8] * b].map(toSrgb);
}
const VIEWS = [['normal vision', (c) => c], ...Object.entries(MACHADO).map(([k, m]) => [k, (c) => simulate(c, m)])];
const PROPS = ['background-color', 'fill', 'stroke'];
const keyOf = (raw) => raw.t + stableClasses((raw.a && raw.a.class) || '').map((c) => '.' + c).join('');

// -> Map("path|prop" -> [rgb | null per element, in document order]); boxes alongside (.boxes)
function sets(snap) {
  const out = new Map();
  (function walk(n, path) {
    if (!n || typeof n !== 'object' || n.x) return;
    const here = path + ' > ' + keyOf(n), s = n.s !== undefined ? snap.styles[n.s] : {};
    for (const p of PROPS) {
      const c = s[p] && parseColor(s[p]);
      const k = here + '|' + p;
      if (!out.has(k)) { out.set(k, []); out.get(k).boxes = []; }
      out.get(k).push(c && c[3] > 0.5 ? c.slice(0, 3) : null);
      out.get(k).boxes.push(n.b || null);
    }
    for (const c of n.c || []) if (typeof c !== 'string') walk(c, here);
  })(snap.root, '');
  for (const [k, list] of out) if (new Set(list.filter(Boolean).map(String)).size < 3) out.delete(k);
  return out;
}

const hex = (c) => `rgb(${c.map(Math.round).join(', ')})`;
// -> [{ set, view, a, b, from, to }] one per newly confusable pair of colours (and view)
function confusable(base, head) {
  const A = sets(base), B = sets(head), out = [], seen = new Set();
  for (const [k, hb] of B) {
    const ha = A.get(k);
    if (!ha || ha.length !== hb.length) continue;
    // the same colours in another order (a list sorted differently): nothing was recoloured
    const bag = (l) => l.map(String).sort().join(';');
    if (bag(ha) === bag(hb)) continue;
    // distinct colour pairs in the head, with the base colours of the same elements
    const pairs = new Map();
    for (let i = 0; i < hb.length; i++) for (let j = i + 1; j < hb.length; j++) {
      if (!hb[i] || !hb[j] || !ha[i] || !ha[j] || String(ha[i]) === String(ha[j])) continue;
      const key = [ha[i], ha[j], hb[i], hb[j]].map(String).join('|');
      if (!pairs.has(key)) pairs.set(key, [ha[i], ha[j], hb[i], hb[j], []]);
      pairs.get(key)[4].push(hb.boxes[i], hb.boxes[j]);
    }
    for (const [a1, a2, b1, b2, boxes] of pairs.values()) {
      for (const [view, f] of VIEWS) {
        const before = deltaE2000(f(a1), f(a2)), after = deltaE2000(f(b1), f(b2));
        if (before < T || after >= T) continue;
        const id = `${k}|${view}|${[String(b1), String(b2)].sort()}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ set: k.split('|')[0].split(' > ').slice(-3).join(' > '), prop: k.split('|')[1], view, from: before, to: after, a: hex(b1), b: hex(b2),
          boxes: [...new Set(boxes.filter(Boolean).map(String))].map((x) => x.split(',').map(Number)) });
        break;                               // the first view in which the pair collapses is enough
      }
    }
  }
  // what everyone sees first, then the closest pairs
  return out.sort((x, y) => (x.view !== 'normal vision') - (y.view !== 'normal vision') || x.to - y.to);
}

module.exports = { confusable, simulate, MACHADO, T };
