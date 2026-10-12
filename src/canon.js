// Canonicalization: raw snapshot -> canonical visual tree with stable keys, paths and hashes.
//
// Principles
//  * Hash the *intent*, not the outcome: computed values from the Typed OM (`auto`, `50%`) instead of
//    used pixel values, and no boxes. Layout is a deterministic function of DOM + computed style +
//    content, so content-driven reflow cannot leak into the hash, while every CSS change that alters
//    any element's computed style still can.
//  * Dead-property elimination: drop properties that cannot affect rendering (border colour with no
//    border, flex-item props outside a flex container, ...).
//  * Text styles are recorded where text is rendered (not where they are declared), so a CSS change
//    that no rendered text inherits is invisible to the hash, as it is to the eye.
//  * Visually hidden content (sr-only, opacity 0, off-page) is pruned.
//  * Data types are normalized in text: digit runs -> '#', month/day names -> 'MON'/'DAY'.
//  * Classes are not visual. They only name things (keys); their visual effect is in computed style.
//    Classes that differ between instances of the same thing (unread, active, on) are *state*
//    classes and are dropped from keys.
const crypto = require('crypto');

// Typography read where text is drawn (extract.browser.js TYPO), recorded there like the basics.
const TYPO_INHERITED = ['font-kerning', 'font-variant-numeric', 'font-variant-ligatures', 'font-variant-east-asian', 'font-variant-position',
  'font-feature-settings', 'font-variation-settings', 'font-stretch', 'font-optical-sizing', 'font-synthesis-weight', 'font-synthesis-style',
  'font-size-adjust', 'text-rendering', '-webkit-font-smoothing', 'text-underline-offset', 'text-underline-position', 'text-decoration-skip-ink',
  'text-emphasis-style', 'text-emphasis-color', 'hyphens', 'tab-size', 'text-align-last', 'text-wrap-mode', 'text-wrap-style', 'writing-mode',
  'direction', 'line-break'];
const INHERITED = new Set(['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant-caps', 'line-height',
  'letter-spacing', 'word-spacing', 'text-align', 'text-transform', 'text-indent', 'visibility', 'white-space', 'word-break',
  'overflow-wrap', 'list-style-type', 'list-style-position', 'list-style-image', 'fill', 'stroke', 'stroke-width',
  'border-collapse', 'border-spacing', 'text-shadow', 'accent-color', ...TYPO_INHERITED]);
// caret-color is pinned to transparent while capturing. cursor, pointer-events, user-select and
// touch-action are not drawn but are tracked: a button that stops reacting is a UI regression too.
const NON_VISUAL = new Set(['caret-color']);
const INITIAL = {
  position: 'static', float: 'none', clear: 'none', 'z-index': 'auto', opacity: '1', 'box-shadow': 'none',
  transform: 'none', filter: 'none', 'backdrop-filter': 'none', 'clip-path': 'none', 'mix-blend-mode': 'normal',
  'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none', 'text-overflow': 'clip', 'overflow-x': 'visible',
  'overflow-y': 'visible', 'text-decoration-line': 'none', 'vertical-align': 'baseline', 'outline-style': 'none',
  'min-width': 'auto', 'min-height': 'auto', 'max-width': 'none', 'max-height': 'none', 'object-fit': 'fill',
  'object-position': '50% 50%', content: 'normal', order: '0', 'flex-grow': '0', 'flex-shrink': '1', 'flex-basis': 'auto',
  'align-self': 'auto', 'grid-column-start': 'auto', 'grid-column-end': 'auto', 'grid-row-start': 'auto', 'grid-row-end': 'auto',
  'table-layout': 'auto', 'aspect-ratio': 'auto', resize: 'none', appearance: 'none', '-webkit-line-clamp': 'none',
  top: 'auto', right: 'auto', bottom: 'auto', left: 'auto',
  cursor: 'auto', 'pointer-events': 'auto', 'user-select': 'auto', 'touch-action': 'auto',
  scale: 'none', translate: 'none', rotate: 'none', isolation: 'auto', zoom: '1', 'content-visibility': 'visible', 'column-count': 'auto',
  'column-width': 'auto', perspective: 'none', 'backface-visibility': 'visible', 'mask-image': 'none', 'border-image-source': 'none',
  'text-decoration-thickness': 'auto', 'scrollbar-color': 'auto', 'scrollbar-width': 'auto', 'scrollbar-gutter': 'auto',
  'background-attachment': 'scroll', 'background-origin': 'padding-box', 'background-blend-mode': 'normal', 'image-rendering': 'auto', 'shape-outside': 'none',
};
const FLEX_ITEM = ['flex-grow', 'flex-shrink', 'flex-basis', 'align-self', 'order'];
const GRID_ITEM = ['grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end'];
const CONTAINER = ['flex-direction', 'flex-wrap', 'justify-content', 'justify-items', 'align-items', 'align-content', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows'];

const MONTHS = /\b(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|June?|July?|Aug(ust)?|Sep(t(ember)?)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\b/g;
const DAYS = /\b(Mon(day)?|Tue(s(day)?)?|Wed(nesday)?|Thu(r(s(day)?)?)?|Fri(day)?|Sat(urday)?|Sun(day)?)\b/g;
const RELTIME = /(?<!\w)(just now|a few seconds ago|(?:an?|#) (?:second|minute|hour|day|week|month|year)s? ago|in (?:an?|#) (?:second|minute|hour|day|week|month|year)s?|yesterday|today|tomorrow)(?!\w)/gi;
// Build identifiers (a version 1.4.2, a commit hash) differ between two builds of the same fixture.
const BUILD_ID = /\bv?\d+\.\d+\.\d+(?:[-+][\w.]+)?\b|\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/gi;
function normText(t, opts = {}) {
  t = t.replace(/\s+/g, ' ').trim();
  // base and head on the same fixture (shift.js): numbers, dates and units are compared as they are
  if (opts.rawText) return t.replace(BUILD_ID, 'BUILD');
  if (opts.normalizeData !== false) {
    t = t.replace(/[+-]?\d[\d,.:  ]*\d|\d/g, '#').replace(MONTHS, 'MON').replace(DAYS, 'DAY').replace(RELTIME, 'RELTIME');
  }
  return t;
}

const GENERATED_CLASS = /^(css|sc|jsx|svelte|emotion|styled|tw)-|^_|^[a-z]{1,3}-[a-zA-Z0-9]{5,}$/;
// CSS modules: Block-module__element__Tkl8_ keeps its semantic stem, drops the per-build hash.
const CSS_MODULE_HASH = /^(.+?__[A-Za-z][\w-]*?)__[A-Za-z0-9_-]{5}$/;
const DASH_HASH = /^(.*[A-Za-z])-(?=[A-Za-z0-9]*[0-9A-Z])(?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]{5}$/; // prc-Button-ButtonBase-c50BI
function stableClasses(cls) {
  if (!cls) return [];
  return cls.split(/\s+/)
    .filter((c) => c && !GENERATED_CLASS.test(c) && !(/[A-Z]/.test(c) && /\d/.test(c) && !c.includes('-')))
    .map((c) => c.replace(CSS_MODULE_HASH, '$1').replace(DASH_HASH, '$1'));
}

// sha1, base64url, 72 bits. crypto.hash (Node >= 21.7) is the same digest without a Hash object per call.
const H = crypto.hash ? (s) => crypto.hash('sha1', s, 'base64url').slice(0, 12) : (s) => crypto.createHash('sha1').update(s).digest('base64url').slice(0, 12);

const REPLACED = new Set(['img', 'video', 'canvas', 'iframe', 'object', 'embed', 'svg', 'input', 'textarea', 'select', 'button', 'progress', 'meter']);
const SVG_PAINT = { fill: 'rgb(0, 0, 0)', stroke: 'none', 'stroke-width': '1px' };
// stroke and fill details, recorded as absolute values where they can draw (extract.browser.js svgDetail)
const SVG_DETAIL = { 'stroke-opacity': '1', 'stroke-dasharray': 'none', 'stroke-dashoffset': '0px', 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter',
  'stroke-miterlimit': '4', 'fill-opacity': '1', 'fill-rule': 'nonzero', 'paint-order': 'normal', 'vector-effect': 'none', 'shape-rendering': 'auto',
  'marker-start': 'none', 'marker-mid': 'none', 'marker-end': 'none', 'text-anchor': 'start', 'dominant-baseline': 'auto', 'stop-color': 'rgb(0, 0, 0)', 'stop-opacity': '1' };
const SVG_SHAPES = new Set(['path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan', 'textpath', 'use']);
function svgDetailApplies(p, tag, s) {
  if (tag === 'stop') return p === 'stop-color' || p === 'stop-opacity';
  if (!SVG_SHAPES.has(tag) || p === 'stop-color' || p === 'stop-opacity') return false;
  if (p.startsWith('stroke-')) return s.stroke !== 'none';
  if (p === 'fill-opacity' || p === 'fill-rule') return s.fill !== 'none';
  if (p.startsWith('marker-')) return tag === 'path' || tag === 'line' || tag === 'polyline' || tag === 'polygon';
  if (p === 'text-anchor' || p === 'dominant-baseline') return tag === 'text' || tag === 'tspan' || tag === 'textpath';
  return true;
}
const SVG_TAGS = new Set(['svg', 'path', 'g', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon', 'use', 'text', 'tspan', 'symbol', 'defs', 'mask', 'clippath', 'lineargradient', 'radialgradient', 'stop', 'pattern', 'image', 'foreignobject']);
const INLINE_NA = /^(width|height|min-width|min-height|max-width|max-height|margin-top|margin-bottom)$/;

// What each property is, decided once per property name instead of by regexes per element.
const KIND = new Map();
function kindOf(p) {
  let k = KIND.get(p);
  if (!k) {
    k = { nonVisual: NON_VISUAL.has(p), svgPaint: SVG_PAINT[p] !== undefined, svgDetail: SVG_DETAIL[p], inherited: INHERITED.has(p), inlineNA: INLINE_NA.test(p),
      padding: /^padding/.test(p), margin: /^margin/.test(p), gridTemplate: /^grid-(template|auto)/.test(p),
      replacedOnly: /^(object-fit|object-position|appearance|resize)$/.test(p), tableLayout: p === 'table-layout',
      flexItem: FLEX_ITEM.includes(p), gridItem: GRID_ITEM.includes(p), container: CONTAINER.includes(p), listStyle: /^list-style/.test(p),
      initial: Object.prototype.hasOwnProperty.call(INITIAL, p) ? INITIAL[p] : undefined };
    KIND.set(p, k);
  }
  return k;
}

function ownProps(raw, styles, parentStyle, parentDisplay, opts, parentTag) {
  const s = styles[raw.s];
  const out = {};
  const disp = s.display;
  const isFlexParent = /flex/.test(parentDisplay), isGridParent = /grid/.test(parentDisplay);
  const isContainer = /flex|grid/.test(disp);
  const isSvg = SVG_TAGS.has(raw.t), replaced = REPLACED.has(raw.t);
  const inlineText = disp === 'inline' && !replaced; // includes SVG shapes: geometry is in attributes
  const rowish = /^table-(row|row-group|header-group|footer-group|column|column-group)$/.test(disp);   // no padding
  const cellish = rowish || disp === 'table-cell';                                                    // no margin
  const gridDisp = /grid/.test(disp), tableDisp = /^table/.test(disp);
  for (const p in s) {
    let v = s[p];
    if (opts.useUsed && raw.u && raw.u[p] !== undefined) v = raw.u[p];
    const k = kindOf(p);
    if (k.nonVisual || (opts.ignoreProps && opts.ignoreProps.includes(p))) continue;   // not compared
    if (k.svgPaint) {                                 // SVG paint: only on SVG, relative to the SVG parent
      if (!isSvg) continue;
      const ref = parentStyle && SVG_TAGS.has(parentTag) ? parentStyle[p] : SVG_PAINT[p];
      if (ref !== v) out[p] = v;
      continue;
    }
    if (k.svgDetail !== undefined) { if (svgDetailApplies(p, raw.t, s) && v !== k.svgDetail) out[p] = v; continue; }
    if (k.inherited) continue;                        // text styles are recorded where text renders (textStyle)
    if (inlineText && k.inlineNA) continue;           // do not apply to non-replaced inline boxes
    if (k.padding && rowish) continue;
    if (k.margin && cellish) continue;
    if (k.gridTemplate && !gridDisp) continue;
    if (k.replacedOnly && !replaced) continue;
    if (k.tableLayout && !tableDisp) continue;
    if (k.initial === v) continue;
    if (!isFlexParent && !isGridParent && k.flexItem) continue;
    if (!isGridParent && k.gridItem) continue;
    if (!isContainer && k.container) continue;
    if (k.listStyle && disp !== 'list-item') continue;
    if (p === 'vertical-align' && !/^inline|^table-cell$/.test(disp)) continue;   // applies to inline-level boxes and table cells only
    out[p] = v;
  }
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const st = s[`border-${side}-style`], w = s[`border-${side}-width`];
    if (st === 'none' || st === 'hidden' || w === '0px') {
      delete out[`border-${side}-style`]; delete out[`border-${side}-width`]; delete out[`border-${side}-color`];
    }
  }
  const paintsBox = ['top', 'right', 'bottom', 'left'].some((d) => s[`border-${d}-width`] !== '0px' && s[`border-${d}-style`] !== 'none') ||
    s['background-color'] !== 'rgba(0, 0, 0, 0)' || s['background-image'] !== 'none' || s['box-shadow'] !== 'none' ||
    s['overflow-x'] !== 'visible' || s['outline-style'] !== 'none' || REPLACED.has(raw.t);
  for (const c of ['top-left', 'top-right', 'bottom-right', 'bottom-left']) if (!paintsBox || out[`border-${c}-radius`] === '0px') delete out[`border-${c}-radius`];
  if (inlineText && !paintsBox) { delete out['padding-top']; delete out['padding-bottom']; } // vertical padding of an unpainted inline box is invisible
  if (s['outline-style'] === 'none') { delete out['outline-width']; delete out['outline-color']; delete out['outline-offset']; }
  if (s['background-image'] === 'none') { delete out['background-size']; delete out['background-position']; delete out['background-repeat'];
    delete out['background-attachment']; delete out['background-origin']; delete out['background-blend-mode']; }
  // properties that only matter when a trigger is set (extract.browser.js DEPENDENT reads them only then)
  if (!s['mask-image'] || s['mask-image'] === 'none') for (const p of ['mask-size', 'mask-position', 'mask-repeat', 'mask-mode']) delete out[p];
  if (!s['border-image-source'] || s['border-image-source'] === 'none') for (const p of ['border-image-slice', 'border-image-width', 'border-image-outset', 'border-image-repeat']) delete out[p];
  if ((!s['column-count'] || s['column-count'] === 'auto') && (!s['column-width'] || s['column-width'] === 'auto')) for (const p of ['column-rule-style', 'column-rule-width', 'column-rule-color', 'column-fill']) delete out[p];
  if (s.float === 'none') delete out['shape-outside'];
  if (!REPLACED.has(raw.t)) delete out['image-rendering'];
  if (s['overflow-x'] === 'visible' && s['overflow-y'] === 'visible') { delete out['scrollbar-color']; delete out['scrollbar-width']; delete out['scrollbar-gutter']; }
  if (s['background-image'] === 'none' && s['background-color'] === 'rgba(0, 0, 0, 0)') delete out['background-clip'];
  if (s['text-decoration-line'] === 'none') { delete out['text-decoration-style']; delete out['text-decoration-color']; delete out['text-decoration-thickness']; }
  if (s.position === 'static') { delete out.top; delete out.right; delete out.bottom; delete out.left; if (!isFlexParent && !isGridParent) delete out['z-index']; }
  if (s['overflow-x'] === 'visible' && s['overflow-y'] === 'visible' && s['text-overflow'] === 'clip') delete out['text-overflow'];
  const clean = {};                                   // delete leaves a slow dictionary-mode object: copy it
  for (const p in out) clean[p] = out[p];
  return clean;
}

function pseudoProps(id, styles, prefix, out) {
  if (id === undefined) return;
  const ps = styles[id];
  for (const p in ps) if (ps[p] !== '' && ps[p] !== 'none' && ps[p] !== 'normal' && ps[p] !== 'auto') out[prefix + p] = ps[p];
}

// Phase 1: raw snapshot -> canonical nodes (no keys yet).
//   node = { tag, cls, role, props, kids: [node | {text}], inline: Set(prop), raw }
function toCanon(snap, opts = {}) {
  const assets = snap.assets || {}, fonts = snap.fonts || {};
  // An asset whose bytes were hashed is identified by its file name and content hash: other bytes
  // under the same URL are another image, and a bundler fingerprint in the name (logo.3f2a1b.png) or a
  // cache-busting query does not count. The same family name with another file is another font.
  const assetId = (u) => (assets[u] ? `${u.split(/[?#]/)[0].split('/').pop().replace(/[.-][0-9a-f]{6,}(?=\.\w+$)/i, '')}#${assets[u]}` : u);
  const withHashes = (v) => v.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (all, q, u) => (assets[u] ? `url("${assetId(u)}")` : all));
  const fontFiles = (v) => { const h = v.split(',').map((f) => f.replace(/['"]/g, '').trim().toLowerCase()).filter((f) => fonts[f]).map((f) => `${f}#${fonts[f]}`); return h.length ? `${v} [${h.join(' ')}]` : v; };
  const styles = Object.keys(assets).length || Object.keys(fonts).length ? snap.styles.map((st) => {
    let o = st;
    for (const p of ['background-image', 'mask-image', 'border-image-source', 'list-style-image', 'content']) if (st[p] && st[p].includes('url(')) { if (o === st) o = { ...st }; o[p] = withHashes(st[p]); }
    if (st['font-family'] && Object.keys(fonts).length) { if (o === st) o = { ...st }; o['font-family'] = fontFiles(st['font-family']); }
    return o;
  }) : snap.styles;
  // ownProps depends only on (style, parent display, tag) and, for SVG paint, the parent's style and
  // tag; styles are interned, so most elements reuse an earlier result (3x faster canonicalization)
  const styleId = new Map(styles.map((o, i) => [o, i]));
  const memo = new Map();
  const ownPropsOf = (raw, parentStyle, parentDisplay, parentTag) => {
    if (opts.useUsed) return ownProps(raw, styles, parentStyle, parentDisplay, opts, parentTag);
    const k = raw.s + '|' + parentDisplay + '|' + raw.t + (SVG_TAGS.has(raw.t) ? '|' + (parentStyle ? styleId.get(parentStyle) : -1) + '|' + parentTag : '');
    let v = memo.get(k);
    if (!v) { v = ownProps(raw, styles, parentStyle, parentDisplay, opts, parentTag); memo.set(k, v); }
    return { ...v };                                          // (spread copies ~10x faster than Object.assign here)
  };
  // clip: the part of the page (document coordinates) where this element can be seen, given its
  // ancestors' overflow: an element below the fold of an inner scroll container is not in a
  // full-page screenshot, so its box must not be drawn there (fingerprint.js boxOf).
  function conv(raw, parentStyle, parentDisplay, parentTag, inhInline, inLatent = false, clip = null, hard = null) {
    if (raw.x) return null;                                   // display:none / non-rendered
    if (raw.lat && !opts.latent) return null;                 // latent (closed) components: opt-in
    const s = styles[raw.s];
    // visually hidden content is pruned, or in latent mode kept and marked like display:none content
    const hiddenHere = opts.pruneHidden !== false && !inLatent && !raw.lat && visuallyHidden(raw, s);
    if (hiddenHere && !opts.latent) return null;
    const latent = inLatent || !!raw.lat || hiddenHere;
    // which inherited values here came from an inline style (data-driven) somewhere up the chain
    const myInline = new Set(raw.ip || []);
    const inh = new Set();
    if (inhInline.size || myInline.size) for (const p of INHERITED) if (parentStyle && parentStyle[p] === s[p] ? inhInline.has(p) : myInline.has(p)) inh.add(p);
    if ((s.display === 'contents' && opts.flattenContents !== false) || (opts.flattenWrappers !== false && neutralWrapper(raw, s, parentDisplay))) { // box-less wrapper: splice children up
      const kids = [];
      for (const c of raw.c || []) {
        if (typeof c === 'string') { const t = normText(c, opts); if (t) kids.push({ text: t, parentStyle: s, inh }); }
        else { const k = conv(c, s, parentDisplay, parentTag, inh, latent, clip, hard); if (k) kids.push(...(Array.isArray(k) ? k : [k])); }
      }
      return kids;
    }
    const props = ownPropsOf(raw, parentStyle, parentDisplay, parentTag);
    pseudoProps(raw.pb, styles, '::before.', props);
    pseudoProps(raw.pa, styles, '::after.', props);
    if (raw.pp !== undefined) for (const [k, v] of Object.entries(styles[raw.pp])) props['::placeholder.' + k] = v;
    if (raw.sel !== undefined) {                              // selection colours, when the page sets any
      const sel = styles[raw.sel];
      if (sel['background-color'] !== 'rgba(0, 0, 0, 0)') props['::selection.background-color'] = sel['background-color'];
      if (sel.color !== s.color) props['::selection.color'] = sel.color;
    }
    if (raw.cv) props['@canvas'] = raw.cv;
    if (raw.g) for (const k in raw.g) props['@' + k] = raw.g[k];
    if (raw.a && raw.a.alt !== undefined && raw.t === 'img') props['@alt'] = normText(raw.a.alt, opts);
    if (raw.a && raw.a.placeholder !== undefined) props['@placeholder'] = raw.a.placeholder;
    if (raw.f) { if (raw.f.ck) props['@checked'] = '1'; if (raw.f.dis) props['@disabled'] = '1'; if (raw.f.v) props['@value'] = normText(raw.f.v, opts); }
    if (raw.img) props['@src'] = assetId(raw.img.src);
    if (raw.media) props['@media'] = raw.t;
    if (raw.lat || hiddenHere) props['@latent'] = '1';
    if (opts.withBoxes && raw.b) props['@box'] = raw.b.map((v) => Math.round(v)).join(',');
    const node = { tag: raw.t, cls: raw.a && raw.a.class ? stableClasses(raw.a.class) : [], role: raw.a && raw.a.role, testid: raw.a && raw.a['data-testid'], props, kids: [], inline: myInline, raw };
    node.clip = s.position === 'fixed' ? null : clip;          // fixed boxes escape their ancestors' overflow
    // hardClip: the same for overflow that cannot be scrolled (hidden, clip): what is outside it is cut off
    node.hardClip = s.position === 'fixed' ? null : hard;
    let kidClip = node.clip, kidHard = node.hardClip;
    const ox = s['overflow-x'] !== undefined && s['overflow-x'] !== 'visible', oy = s['overflow-y'] !== undefined && s['overflow-y'] !== 'visible';
    if ((ox || oy) && raw.b && raw.t !== 'html' && raw.t !== 'body') {   // html/body overflow scrolls the page itself
      const [x, y, w, h] = raw.b, c = kidClip || [-Infinity, -Infinity, Infinity, Infinity];
      kidClip = [ox ? Math.max(c[0], x) : c[0], oy ? Math.max(c[1], y) : c[1], ox ? Math.min(c[2], x + w) : c[2], oy ? Math.min(c[3], y + h) : c[3]];
      const hx = /^(hidden|clip)$/.test(s['overflow-x']), hy = /^(hidden|clip)$/.test(s['overflow-y']), d = kidHard || [-Infinity, -Infinity, Infinity, Infinity];
      if (hx || hy) kidHard = [hx ? Math.max(d[0], x) : d[0], hy ? Math.max(d[1], y) : d[1], hx ? Math.min(d[2], x + w) : d[2], hy ? Math.min(d[3], y + h) : d[3]];
    }
    for (const c of raw.c || []) {
      if (typeof c === 'string') { const t = normText(c, opts); if (t) node.kids.push({ text: t }); }
      else { const k = conv(c, s, s.display, raw.t, inh, latent, kidClip, kidHard); if (k) node.kids.push(...(Array.isArray(k) ? k : [k])); }
    }
    if (s.visibility === 'hidden' && !node.kids.some((k) => !k.text)) {
      if (!opts.latent) return null;
      if (!latent) props['@latent'] = '1';          // latent mode keeps invisible content, marked
    }
    textStyle(node, s, inh);
    return node;
  }
  return conv(snap.root, null, 'block', '', new Set());
}

// A plain block in block flow with no box, paint or positioning of its own lays its children out
// exactly as its parent would: a refactor that adds or removes one is not a visual change.
const NEUTRAL = { position: 'static', float: 'none', 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none', 'box-shadow': 'none',
  'outline-style': 'none', 'overflow-x': 'visible', 'overflow-y': 'visible', opacity: '1', transform: 'none', filter: 'none', 'clip-path': 'none',
  width: 'auto', height: 'auto', 'max-width': 'none', 'max-height': 'none',
  'text-decoration-line': 'none', 'z-index': 'auto', 'mix-blend-mode': 'normal', 'backdrop-filter': 'none' }; // decorations propagate to descendants' text
const NEUTRAL_TAGS = new Set(['div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside']);
function neutralWrapper(raw, s, parentDisplay) {
  if (s.display !== 'block' || !/^(block|flow-root|list-item)$/.test(parentDisplay) || !NEUTRAL_TAGS.has(raw.t)) return false;
  if (raw.pb !== undefined || raw.pa !== undefined || (raw.ip && raw.ip.length)) return false;
  if ((raw.c || []).some((c) => typeof c === 'string' && c.trim())) return false;
  for (const p in NEUTRAL) if (s[p] !== undefined && s[p] !== NEUTRAL[p]) return false;
  for (const d of ['top', 'right', 'bottom', 'left']) {
    if (s[`margin-${d}`] && s[`margin-${d}`] !== '0px') return false;
    if (s[`padding-${d}`] && s[`padding-${d}`] !== '0px') return false;
    if (s[`border-${d}-width`] && s[`border-${d}-width`] !== '0px') return false;
  }
  if (s['min-height'] && !/^(auto|0px)$/.test(s['min-height'])) return false;
  if (s['min-width'] && !/^(auto|0px)$/.test(s['min-width'])) return false;
  return true;
}

// Rendered-but-invisible content (accessibility-only "skip to content" links, sr-only text,
// opacity:0 overlays, things parked off-page) is not part of the visual UI.
function visuallyHidden(raw, s) {
  if (s.opacity === '0') return true;
  if (/inset\(50%|circle\(0/.test(s['clip-path'] || '')) return true;
  const b = raw.b;
  if (!b) return false;
  if (b[2] <= 1 && b[3] <= 1 && (s['overflow-x'] !== 'visible' || s['overflow-y'] !== 'visible')) return true;
  if (b[0] + b[2] < 0 || b[1] + b[3] < 0) return true;
  return false;
}

// Text styles are recorded where text is rendered, with their full effective values: an element
// with its own text (or a form control, or a list marker) carries the font/colour it is drawn with;
// a block with inline-level children carries what positions them (text-align, line box). Elements
// that render no text carry none, so a change that no text inherits changes nothing — and a change
// that does is visible exactly where it shows.
const TEXT_PROPS = ['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant-caps', 'line-height', 'letter-spacing',
  'word-spacing', 'text-transform', 'text-indent', 'white-space', 'word-break', 'overflow-wrap', 'text-shadow', 'text-align', ...TYPO_INHERITED];
const LINE_PROPS = ['text-align', 'line-height', 'font-size', 'font-family'];
const TEXT_CONSUMERS = new Set(['input', 'textarea', 'select']);
const CASED = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/;
// initial values of the extra typography properties: dropped where text is recorded, so whether the
// extractor read them (it skips ones no stylesheet declares) does not change the canonical form
const TYPO_INITIAL = { 'font-kerning': 'auto', 'font-variant-numeric': 'normal', 'font-variant-ligatures': 'normal', 'font-variant-east-asian': 'normal',
  'font-variant-position': 'normal', 'font-feature-settings': 'normal', 'font-variation-settings': 'normal', 'font-stretch': '100%', 'font-optical-sizing': 'auto',
  'font-synthesis-weight': 'auto', 'font-synthesis-style': 'auto', 'font-size-adjust': 'none', 'text-rendering': 'auto', '-webkit-font-smoothing': 'auto',
  'text-underline-offset': 'auto', 'text-underline-position': 'auto', 'text-decoration-skip-ink': 'auto', 'text-emphasis-style': 'none', 'hyphens': 'manual',
  'tab-size': '8', 'text-align-last': 'auto', 'text-wrap-style': 'auto', 'line-break': 'auto', direction: 'ltr', 'writing-mode': 'horizontal-tb', 'text-wrap-mode': 'wrap' };
function textStyle(node, s, inh) {
  const ownText = node.kids.filter((k) => k.text).map((k) => k.text).join(' ');
  const marker = s.display === 'list-item' && s['list-style-type'] !== 'none';
  const hasText = ownText !== '' || TEXT_CONSUMERS.has(node.tag) || marker;
  const hasInline = node.kids.some((k) => !k.text && /^inline/.test(k.props.display || ''));
  node.subtreeText = hasText || node.kids.some((k) => !k.text && k.subtreeText);
  const props = hasText ? TEXT_PROPS : hasInline ? LINE_PROPS : [];
  for (const p of props) {
    if (p === 'text-transform' && !CASED.test(ownText)) continue;
    if (s[p] === undefined || TYPO_INITIAL[p] === s[p]) continue;   // not read (lazy extraction), or initial
    if (p === 'text-emphasis-color' && (s['text-emphasis-style'] || 'none') === 'none') continue;   // no emphasis marks drawn
    node.props[p] = s[p];
    if (inh.has(p)) node.inline.add(p);                     // inherited from a data-driven inline style
  }
  if (marker) for (const p of ['list-style-type', 'list-style-position', 'list-style-image']) node.props[p] = s[p];
  if (/^(inline-)?table$/.test(s.display)) for (const p of ['border-collapse', 'border-spacing']) node.props[p] = s[p];
  if (TEXT_CONSUMERS.has(node.tag) || node.tag === 'progress' || node.tag === 'meter') node.props['accent-color'] = s['accent-color'];
  if (!node.subtreeText) { delete node.props['text-decoration-line']; delete node.props['text-decoration-style']; delete node.props['text-decoration-color']; }
}

const elKids = (n) => n.kids.filter((k) => !k.text);
const baseKey = (n, state, keyMode) => n.tag + (keyMode === 'tag' ? '' : (() => { const c = n.cls.filter((x) => !state.has(x)).sort(); return c.length ? '.' + c.join('.') : ''; })()) + (n.role ? `[${n.role}]` : '') + (n.testid ? `[testid=${n.testid}]` : '');

// Phase 2a (calibration only): discover state classes. Level by level, over every tree at once,
// group nodes by (parent path, tag); inside a group, cluster members that share a class; classes
// that are not on *every* member of a cluster are state classes (unread, active, on, selected...).
function discoverStateClasses(roots, keyMode = 'class') {
  const state = new Set();
  if (keyMode === 'tag') return state;
  let level = roots.map((r) => ({ node: r, ppath: '' }));
  while (level.length) {
    const groups = new Map();
    for (const { node, ppath } of level) { const g = ppath + '|' + node.tag; if (!groups.has(g)) groups.set(g, []); groups.get(g).push({ node, ppath }); }
    for (const members of groups.values()) {
      const parent = members.map((_, i) => i);
      const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
      const owner = new Map();
      members.forEach((m, i) => { for (const c of m.node.cls) { if (owner.has(c)) parent[find(i)] = find(owner.get(c)); else owner.set(c, i); } });
      const clusters = new Map();
      members.forEach((m, i) => { const r = find(i); if (!clusters.has(r)) clusters.set(r, []); clusters.get(r).push(m.node); });
      for (const cl of clusters.values()) {
        if (cl.length < 2) continue;
        const all = new Set(cl.flatMap((n) => n.cls));
        for (const c of all) if (!cl.every((n) => n.cls.includes(c))) state.add(c);
      }
    }
    const next = [];
    for (const { node, ppath } of level) {
      const path = ppath + ' > ' + baseKey(node, state, keyMode);
      for (const k of elKids(node)) next.push({ node: k, ppath: path });
    }
    level = next;
  }
  return state;
}

// Phase 2b: keys, sibling groups and paths.
// A sibling *group* is all children with the same key, except that a key whose children are split
// by a "landmark" (a sibling whose key occurs once) gets one group per segment: the system nav items
// and the user labels below the "Labels" heading are different things even if styled identically.
function assignKeys(node, state, keyMode, prefix = '') {
  const keyOf = (n) => baseKey(n, state, keyMode);
  node.key = node.key || keyOf(node);
  node.path = prefix ? prefix + ' > ' + node.gid : node.key;
  const els = elKids(node);
  for (const k of els) k.key = keyOf(k);
  const freq = new Map(); for (const k of els) freq.set(k.key, (freq.get(k.key) || 0) + 1);
  let landmark = null; const firstSeg = new Map();
  for (const k of els) {
    if (freq.get(k.key) === 1) { landmark = k.key; k.gid = k.key; continue; }
    if (!firstSeg.has(k.key)) firstSeg.set(k.key, landmark);
    k.gid = firstSeg.get(k.key) === landmark ? k.key : k.key + '@' + landmark;
  }
  const nth = new Map();
  for (const k of els) { const n = nth.get(k.gid) || 0; nth.set(k.gid, n + 1); k.uid = (node.uid || node.key) + ' > ' + k.gid + (n ? '#' + n : ''); }
  for (const k of els) assignKeys(k, state, keyMode, node.path);
}

function propString(props, skip) {
  let out = '';
  for (const k of Object.keys(props).sort()) if (!(skip && skip.has(k))) out += (out ? ';' : '') + k + ':' + props[k];
  return out;
}

// Count-agnostic shape of the children: group ids in order of first appearance; text runs are '#t'.
function childSeq(node) {
  const seen = new Set(); const seq = [];
  for (const k of node.kids) { const g = k.text ? '#t' : k.gid; if (!seen.has(g)) { seen.add(g); seq.push(g); } }
  return seq.join(' ');
}

function textOf(node) { return node.kids.filter((k) => k.text).map((k) => k.text).join('␟'); }

function hashTree(node) {
  node.ps = propString(node.props);                       // props are final from here on: reused by factOf
  node.local = H(node.key + '|' + node.ps + '|' + textOf(node));
  const kidHashes = node.kids.map((k) => (k.text ? 't:' + k.text : (hashTree(k), k.gid + '=' + k.merkle)));
  node.merkle = H(node.local + '[' + kidHashes.join(',') + ']');
  return node.merkle;
}

function finish(root, state, keyMode) {
  assignKeys(root, state, keyMode);
  hashTree(root);
  return root;
}

// Convenience: one snapshot -> finished canonical tree.
function build(snap, opts = {}) {
  const root = toCanon(snap, opts);
  const state = opts.stateClasses ? new Set(opts.stateClasses) : discoverStateClasses([root], opts.keyMode);
  return finish(root, state, opts.keyMode);
}

function* walk(node) { yield node; for (const k of node.kids) if (!k.text) yield* walk(k); }
function countNodes(root) { let n = 0; for (const _ of walk(root)) n++; return n; }

module.exports = { toCanon, discoverStateClasses, finish, build, walk, H, propString, childSeq, textOf, countNodes, normText, elKids, INHERITED, stableClasses };
