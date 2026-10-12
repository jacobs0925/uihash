// How noticeable is a change? Colour difference (CIEDE2000) and text contrast (WCAG 2.x).
//
//  * deltaE2000(a, b): CIEDE2000 between two sRGB colours (Sharma, Wu & Dalal, Color Research &
//    Application 2005; the reference formulation). Around 1 is the usual just-noticeable difference.
//  * contrast(fg, bg): WCAG 2.x contrast ratio (L1 + 0.05) / (L2 + 0.05) from relative luminance.
//    AA needs 4.5:1 for text, 3:1 for large text (>= 24px, or >= 18.66px and bold).

function parseColor(s) {
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(String(s).trim());
  if (!m) return null;
  let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4];
  return [+m[1], +m[2], +m[3], a];
}
// alpha-composite fg over an opaque bg
const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function contrast(fg, bg) {
  const a = luminance(fg[3] < 1 ? over(fg, bg) : fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function lab([r, g, b]) {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
function deltaE2000(c1, c2) { return dE00Lab(lab(c1), lab(c2)); }
function dE00Lab([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (b, a) => { const x = Math.atan2(b, a) / rad; return x < 0 ? x + 360 : x; };
  const h1p = C1p ? h(b1, a1p) : 0, h2p = C2p ? h(b2, a2p) : 0;
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lpm = (L1 + L2) / 2, Cpm = (C1p + C2p) / 2;
  let hpm = h1p + h2p;
  if (C1p * C2p) hpm = Math.abs(h1p - h2p) <= 180 ? hpm / 2 : (h1p + h2p < 360 ? (hpm + 360) / 2 : (hpm - 360) / 2);
  const T = 1 - 0.17 * Math.cos((hpm - 30) * rad) + 0.24 * Math.cos(2 * hpm * rad) + 0.32 * Math.cos((3 * hpm + 6) * rad) - 0.2 * Math.cos((4 * hpm - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hpm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lpm - 50) ** 2) / Math.sqrt(20 + (Lpm - 50) ** 2), Sc = 1 + 0.045 * Cpm, Sh = 1 + 0.015 * Cpm * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

// A hint for a colour change line "prop: rgb(...) → rgb(...)": how different the colours look.
const COLOR_PROPS = /^(color|background-color|border-(top|right|bottom|left)-color|border-color|outline-color|fill|stroke|text-decoration-color|column-rule-color|accent-color|::(before|after|placeholder|selection)\.(color|background-color)|stop-color)$/;
function colorHint(change) {
  const m = /^([\w:.-]+): (rgba?\([^)]*\)) → (rgba?\([^)]*\))$/.exec(change);
  if (!m || !COLOR_PROPS.test(m[1])) return null;
  const a = parseColor(m[2]), b = parseColor(m[3]);
  if (!a || !b) return null;
  const white = [255, 255, 255, 1];
  const dE = deltaE2000(a[3] < 1 ? over(a, white) : a, b[3] < 1 ? over(b, white) : b);
  return { dE, label: dE < 1 ? 'imperceptible' : dE < 2 ? 'barely perceptible' : dE < 5 ? 'noticeable side by side' : 'clearly visible' };
}

module.exports = { parseColor, contrast, deltaE2000, dE00Lab, colorHint, over, luminance };
