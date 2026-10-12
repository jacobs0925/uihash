// Draw findings onto screenshots: numbered red boxes, merged where they touch, plus side-by-side
// before/after crops per finding. Pure pixel work on PNG buffers (no browser needed).
const { PNG } = require('playwright-core/lib/utilsBundle');

const RED = [220, 38, 38], WHITE = [255, 255, 255], GREY = [229, 231, 235], AMBER = [217, 119, 6];

// 5x7 bitmap digits for box numbers
const DIGITS = ['01110100011001110101110011000101110', '00100011000010000100001000010001110', '01110100010000100110010001000011111',
  '11110000010000101110000010000111110', '00010001100101010010111110001000010', '11111100001111000001000011000101110',
  '00110010001000011110100011000101110', '11111000010001000100010000100001000', '01110100011000101110100011000101110',
  '01110100011000101111000010001001100'];
const LETTERS = { A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', E: '11111100001000011110100001000011111',
  F: '11111100001000011110100001000010000', O: '01110100011000110001100011000101110', R: '11110100011000111110101001001010001',
  T: '11111001000010000100001000010000100' };

function read(buf) { return PNG.sync.read(buf); }
function write(img) { return PNG.sync.write(img, { filterType: 4 }); }   // Paeth only: ~3x faster than adaptive, ~5% larger
// accept PNG buffers or already decoded images (decode a full-page screenshot once per report)
const decoded = (x) => (Buffer.isBuffer(x) ? read(x) : x);
function clone(img) { const c = new PNG({ width: img.width, height: img.height }); img.data.copy(c.data); return c; }
function blank(w, h, rgb = WHITE) {
  const img = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h * 4; i += 4) { img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255; }
  return img;
}
function setPx(img, x, y, rgb, a = 1) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = Math.round(img.data[i] * (1 - a) + rgb[0] * a);
  img.data[i + 1] = Math.round(img.data[i + 1] * (1 - a) + rgb[1] * a);
  img.data[i + 2] = Math.round(img.data[i + 2] * (1 - a) + rgb[2] * a);
  img.data[i + 3] = 255;
}
function fillRect(img, x, y, w, h, rgb, a = 1) {
  for (let yy = Math.max(0, y); yy < Math.min(img.height, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(img.width, x + w); xx++) setPx(img, xx, yy, rgb, a);
}
function strokeRect(img, [x, y, w, h], rgb = RED, t = 3) {
  fillRect(img, x - t, y - t, w + 2 * t, t, rgb); fillRect(img, x - t, y + h, w + 2 * t, t, rgb);
  fillRect(img, x - t, y, t, h, rgb); fillRect(img, x + w, y, t, h, rgb);
}
function label(img, x, y, text, rgb, scale = 2) {
  [...text].forEach((ch, k) => { const bits = LETTERS[ch]; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (bits[r * 5 + c] === '1') fillRect(img, x + k * 6 * scale + c * scale, y + r * scale, scale, scale, rgb); });
}
// dashed outline: content that moved because of a change (drawn under the red boxes)
function dashRect(img, [x, y, w, h], rgb = AMBER, t = 2, on = 8, off = 5) {
  for (let i = 0; i < w + 2 * t; i += on + off) { fillRect(img, x - t + i, y - t, Math.min(on, w + 2 * t - i), t, rgb); fillRect(img, x - t + i, y + h, Math.min(on, w + 2 * t - i), t, rgb); }
  for (let i = 0; i < h; i += on + off) { fillRect(img, x - t, y + i, t, Math.min(on, h - i), rgb); fillRect(img, x + w, y + i, t, Math.min(on, h - i), rgb); }
}
function badge(img, x, y, n) {
  const s = String(n), scale = 2, cw = 6 * scale, w = s.length * cw + 4, h = 7 * scale + 6;
  fillRect(img, x, y, w, h, RED);
  [...s].forEach((d, k) => { const bits = DIGITS[+d]; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (bits[r * 5 + c] === '1') fillRect(img, x + 3 + k * cw + c * scale, y + 3 + r * scale, scale, scale, WHITE); });
  return [w, h];
}

// Make tiny boxes visible (an SVG path can be 3x13 px) and keep them on the image.
function grow(b, min = 18, pad = 3) {
  let [x, y, w, h] = b;
  x -= pad; y -= pad; w += 2 * pad; h += 2 * pad;
  if (w < min) { x -= (min - w) / 2; w = min; }
  if (h < min) { y -= (min - h) / 2; h = min; }
  return [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
}
// Union boxes that overlap or nearly touch, so 30 changed rows read as one changed list region.
function mergeBoxes(boxes, gap = 6) {
  let list = boxes.map((b) => [...b]);
  for (let changed = true; changed;) {
    changed = false;
    outer: for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const [a, b] = [list[i], list[j]];
      if (a[0] <= b[0] + b[2] + gap && b[0] <= a[0] + a[2] + gap && a[1] <= b[1] + b[3] + gap && b[1] <= a[1] + a[3] + gap) {
        const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
        list[i] = [x, y, Math.max(a[0] + a[2], b[0] + b[2]) - x, Math.max(a[1] + a[3], b[1] + b[3]) - y];
        list.splice(j, 1); changed = true; break outer;
      }
    }
  }
  return list;
}

// boxesByFinding: [{ n: 1, boxes: [[x,y,w,h]...] }] -> annotated PNG buffer; moved: boxes of content
// that shifted because of the changes (dashed, under the red boxes)
function annotate(png, boxesByFinding, moved = []) {
  const img = Buffer.isBuffer(png) ? read(png) : clone(png);
  for (const b of mergeBoxes(moved.map((x) => grow(x, 6, 2)), 10)) dashRect(img, b);
  for (const { n, boxes } of boxesByFinding) {
    for (const b of mergeBoxes(boxes.map((x) => grow(x)))) {
      strokeRect(img, b, RED, 3);
      // badge outside the box: above it if there is room, else to its left, else inside the corner
      const bw = 6 * 2 * String(n).length + 4, bh = 20;
      const [bx, by] = b[1] - 3 - bh >= 0 ? [b[0] - 3, b[1] - 3 - bh] : b[0] - 3 - bw >= 0 ? [b[0] - 3 - bw, b[1] - 3] : [b[0], b[1]];
      badge(img, Math.max(0, bx), Math.max(0, by), n);
    }
  }
  return write(img);
}

function crop(img, [x, y, w, h]) {
  x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
  w = Math.min(img.width - x, Math.round(w)); h = Math.min(img.height - y, Math.round(h));
  const out = blank(Math.max(1, w), Math.max(1, h));
  for (let r = 0; r < h; r++) img.data.copy(out.data, r * out.width * 4, ((y + r) * img.width + x) * 4, ((y + r) * img.width + x + w) * 4);
  return out;
}

// One region to show for a finding on both sides: the union of its boxes (both renders), padded,
// limited in size around the first box so a 50-row change still yields a readable crop. A first box
// larger than the limit (a full-width row) widens the limit up to a cap; a box beyond the cap (a
// full-height sidebar) shows its top-left part.
function regionFor(allBoxes, imgW, imgH, { pad = 48, maxW = 900, maxH = 420, capW = 1100, capH = 640 } = {}) {
  if (!allBoxes.length) return null;
  const limW = Math.min(capW, Math.max(maxW, allBoxes[0][2])), limH = Math.min(capH, Math.max(maxH, allBoxes[0][3]));
  const take = [allBoxes[0]];
  for (const b of allBoxes.slice(1)) { const u = union([...take, b]); if (u[2] <= limW && u[3] <= limH) take.push(b); }
  let [x, y, w, h] = union(take);
  x -= pad; y -= pad; w = Math.min(w, limW) + 2 * pad; h = Math.min(h, limH) + 2 * pad;
  x = Math.max(0, Math.min(x, imgW - 1)); y = Math.max(0, Math.min(y, imgH - 1));
  return [x, y, Math.min(w, imgW - x), Math.min(h, imgH - y)];
}
function union(boxes) {
  const x = Math.min(...boxes.map((b) => b[0])), y = Math.min(...boxes.map((b) => b[1]));
  return [x, y, Math.max(...boxes.map((b) => b[0] + b[2])) - x, Math.max(...boxes.map((b) => b[1] + b[3])) - y];
}

// Before | after crop for one finding, boxes drawn on each side, each side labelled. Side by side
// when the region is narrow, stacked when it is wide (a full-width row stays legible).
function beforeAfter(basePng, headPng, baseBoxes, headBoxes, { movedBase = [], movedHead = [] } = {}) {
  const A = decoded(basePng), B = decoded(headPng);
  const boxes = [...headBoxes, ...baseBoxes].map((b) => grow(b)), W = Math.min(A.width, B.width), Hh = Math.max(A.height, B.height);
  let region = regionFor(boxes, W, Hh);
  if (!region) return null;
  // stacked when wide and short (a full-width row stays legible), else side by side
  const stacked = region[2] > 560 && region[2] > 1.4 * Math.min(region[3], 240 + 96);
  if (stacked) region = regionFor(boxes, W, Hh, { maxH: 240, capH: 240 });
  const HEAD = 24;
  const side = (img, boxes, text, rgb, moved) => {
    const c = crop(img, region);
    for (const b of mergeBoxes(moved.map((x) => grow(x, 6, 2)), 10)) {
      const r = [b[0] - region[0], b[1] - region[1], b[2], b[3]];
      if (r[0] + r[2] < 0 || r[1] + r[3] < 0 || r[0] > c.width || r[1] > c.height) continue;
      dashRect(c, r);
    }
    for (const b of boxes.map((x) => grow(x, 14, 2))) {
      const r = [b[0] - region[0], b[1] - region[1], b[2], b[3]];
      if (r[0] + r[2] < 0 || r[1] + r[3] < 0 || r[0] > c.width || r[1] > c.height) continue;
      strokeRect(c, r, RED, 2);
    }
    const out = blank(c.width, c.height + HEAD, [243, 244, 246]);
    label(out, 8, 5, text, rgb);
    for (let r = 0; r < c.height; r++) c.data.copy(out.data, ((r + HEAD) * out.width) * 4, r * c.width * 4, (r + 1) * c.width * 4);
    return out;
  };
  const a = side(A, baseBoxes, 'BEFORE', [75, 85, 99], movedBase), b = side(B, headBoxes, 'AFTER', RED, movedHead);
  const gap = 12;
  const out = stacked ? blank(Math.max(a.width, b.width), a.height + b.height + gap, GREY) : blank(a.width + b.width + gap, Math.max(a.height, b.height), GREY);
  const paste = (src, ox, oy) => { for (let r = 0; r < src.height; r++) src.data.copy(out.data, ((r + oy) * out.width + ox) * 4, r * src.width * 4, (r + 1) * src.width * 4); };
  paste(a, 0, 0); if (stacked) paste(b, 0, a.height + gap); else paste(b, a.width + gap, 0);
  return { png: write(out), region, stacked, width: out.width, height: out.height };
}

// Does a finding change any pixel in this browser? Compares each element before and after (boxes
// paired by index when both sides list the same number). A change of intent can render identically
// here: a font that is not installed, a weight the font lacks, an underline hidden under a border.
// Returns true / false, or null when it cannot tell (added or removed elements, unpaired boxes).
function pixelsDiffer(basePng, headPng, baseBoxes, headBoxes) {
  if (!baseBoxes.length || !headBoxes.length || baseBoxes.length !== headBoxes.length) return null;
  const A = decoded(basePng), B = decoded(headPng);
  const px = (b) => [Math.floor(b[0]), Math.floor(b[1]), Math.ceil(b[0] + b[2]), Math.ceil(b[1] + b[3])];
  for (let k = 0; k < headBoxes.length; k++) {
    const [ax0, ay0, ax1, ay1] = px(baseBoxes[k]), [bx0, by0, bx1, by1] = px(headBoxes[k]);
    if (ax1 - ax0 !== bx1 - bx0 || ay1 - ay0 !== by1 - by0) return true;     // the element changed size
    if (baseBoxes[k].some((v, i) => Math.abs(v - headBoxes[k][i]) > 0.5)) return true;   // ...or moved: visible on the page
    for (let y = 0; y < ay1 - ay0; y++) {
      const ya = ay0 + y, yb = by0 + y;
      if (ya < 0 || yb < 0 || ya >= A.height || yb >= B.height) continue;
      for (let x = 0; x < ax1 - ax0; x++) {
        const xa = ax0 + x, xb = bx0 + x;
        if (xa < 0 || xb < 0 || xa >= A.width || xb >= B.width) continue;
        const i = (ya * A.width + xa) * 4, j = (yb * B.width + xb) * 4;
        if (A.data[i] !== B.data[j] || A.data[i + 1] !== B.data[j + 1] || A.data[i + 2] !== B.data[j + 2]) return true;
      }
    }
  }
  return false;
}

// Pixel ground truth for tests: boxes of the changed pixels between two same-size renders.
function diffMask(aPng, bPng) {
  const A = decoded(aPng), B = decoded(bPng);
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const mask = new Uint8Array(w * h); let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * A.width + x) * 4, j = (y * B.width + x) * 4;
    if (A.data[i] !== B.data[j] || A.data[i + 1] !== B.data[j + 1] || A.data[i + 2] !== B.data[j + 2]) { mask[y * w + x] = 1; n++; }
  }
  return { mask, w, h, n, sizeChanged: A.width !== B.width || A.height !== B.height };
}

module.exports = { annotate, beforeAfter, pixelsDiffer, mergeBoxes, grow, regionFor, union, diffMask, read, write };
