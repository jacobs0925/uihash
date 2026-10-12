// What screenshot-diff tools would say about the same before/after renders, at their documented
// defaults. Uses Playwright's own comparator (the code behind toHaveScreenshot), so the anti-aliasing
// detection and option handling are the real ones:
//   pixelmatch  threshold 0.063  Chromatic's documented default diffThreshold (Chromatic runs its own
//                                diff service; this is pixelmatch at the same number, an approximation)
//   pixelmatch  threshold 0.1    pixelmatch's own default
//   Playwright  threshold 0.2    toHaveScreenshot's default, any differing pixel fails
//   Playwright  maxDiffPixels 100  the tolerance used in Playwright's visual-comparison docs example
//   Playwright  ssim-cie94       Playwright's experimental perceptual comparator (ΔE94 <= 1 is equal)
// A tool "catches" a change when its count exceeds its allowed pixels; a size change always fails.
const { getComparator } = require('playwright-core/lib/utils');

const compare = getComparator('image/png');
const TOOLS = [
  { id: 'pm063', label: 'pixelmatch 0.063 (Chromatic default)', opts: { threshold: 0.063 } },
  { id: 'pm1', label: 'pixelmatch 0.1 (pixelmatch default)', opts: { threshold: 0.1 } },
  { id: 'pw2', label: 'Playwright default (0.2, 0 px)', opts: { threshold: 0.2 } },
  { id: 'pw100', label: 'Playwright 0.2 + maxDiffPixels 100', opts: { threshold: 0.2 }, allow: 100 },
  { id: 'ssim', label: 'Playwright ssim-cie94 (experimental)', opts: { comparator: 'ssim-cie94' } },
];

// -> { pm063: count | 'size', ... } (count = differing pixels the tool reports); ids: only these tools
function pixelTools(before, after, ids) {
  const out = {}, tools = ids ? TOOLS.filter((t) => ids.includes(t.id)) : TOOLS;
  if (before.equals(after)) { for (const t of tools) out[t.id] = 0; return out; }   // identical files: nothing for any tool to find
  for (const t of tools) {
    const r = compare(after, before, t.opts);
    if (!r) { out[t.id] = 0; continue; }
    if (/^Expected an image/.test(r.errorMessage)) { out[t.id] = 'size'; continue; }
    const m = /(\d+) pixels/.exec(r.errorMessage);
    out[t.id] = m ? +m[1] : 0;
  }
  return out;
}
const caught = (t, n) => n === 'size' || n > (t.allow || 0);

module.exports = { TOOLS, pixelTools, caught };
