// In-page extractor: walks the *rendered* tree (composed through open shadow roots and slots)
// and returns a raw, lossless-enough snapshot that every canonicalizer variant can be run on
// offline. It records both what the author asked for (computed values via the CSS Typed OM:
// `auto`, `50%`, `1fr`) and what layout produced (used values + boxes), so experiments can
// compare "hash the intent" against "hash the outcome".
//
// Must be self-contained: it is serialized and injected with page.evaluate(fn).
function uihashExtract(opts) {
  opts = opts || {};
  const PROPS = [
    'display', 'position', 'float', 'clear', 'z-index', 'box-sizing',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'top', 'right', 'bottom', 'left',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    'color', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-clip',
    'opacity', 'visibility', 'overflow-x', 'overflow-y', 'text-overflow', 'white-space', 'word-break', 'overflow-wrap', '-webkit-line-clamp',
    'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant-caps', 'line-height', 'letter-spacing', 'word-spacing',
    'text-align', 'text-decoration-line', 'text-decoration-style', 'text-decoration-color', 'text-transform', 'text-indent', 'vertical-align',
    'box-shadow', 'text-shadow', 'transform', 'filter', 'backdrop-filter', 'clip-path', 'mix-blend-mode',
    'outline-style', 'outline-width', 'outline-color', 'outline-offset',
    'flex-direction', 'flex-wrap', 'justify-content', 'justify-items', 'align-items', 'align-self', 'align-content',
    'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'row-gap', 'column-gap',
    'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows',
    'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end',
    'list-style-type', 'list-style-position', 'list-style-image', 'object-fit', 'object-position', 'cursor',
    'fill', 'stroke', 'stroke-width', 'table-layout', 'border-collapse', 'border-spacing', 'aspect-ratio',
    'content', 'pointer-events', 'user-select', 'resize', 'appearance', 'accent-color', 'caret-color',
  ];
  // Typography beyond the basics (kerning, numeric/ligature variants, OpenType features, underline
  // offset...): subtle, and only meaningful where text is drawn, so lazily read only there.
  const TYPO = ['font-kerning', 'font-variant-numeric', 'font-variant-ligatures', 'font-variant-east-asian', 'font-variant-position',
    'font-feature-settings', 'font-variation-settings', 'font-stretch', 'font-optical-sizing', 'font-synthesis-weight', 'font-synthesis-style',
    'font-size-adjust', 'text-rendering', '-webkit-font-smoothing', 'text-underline-offset', 'text-underline-position', 'text-decoration-skip-ink',
    'text-emphasis-style', 'text-emphasis-color', 'hyphens', 'tab-size', 'text-align-last', 'text-wrap-mode', 'text-wrap-style', 'writing-mode',
    'direction', 'line-break', 'user-select'];
  // Not drawn, but a button with pointer-events: none is broken: read on interactive elements, and
  // on fully transparent ones (invisible but still clickable: ghost.js).
  const INTERACT = ['cursor', 'pointer-events', 'touch-action'];
  // Rarer paint and layout properties that can be set on anything.
  const PAINT2 = ['scale', 'translate', 'rotate', 'isolation', 'zoom', 'content-visibility', 'column-count', 'column-width', 'perspective',
    'backface-visibility', 'mask-image', 'border-image-source'];
  // ...and the ones that only matter when a trigger property is set (trigger: dependants)
  const DEPENDENT = [['background-image', 'none', ['background-attachment', 'background-origin', 'background-blend-mode']],
    ['mask-image', 'none', ['mask-size', 'mask-position', 'mask-repeat', 'mask-mode']],
    ['border-image-source', 'none', ['border-image-slice', 'border-image-width', 'border-image-outset', 'border-image-repeat']],
    ['column-count', 'auto', ['column-rule-style', 'column-rule-width', 'column-rule-color', 'column-fill']],
    ['float', 'none', ['shape-outside']]];
  const SCROLLBAR = ['scrollbar-color', 'scrollbar-width', 'scrollbar-gutter'];
  // SVG stroke and fill details (dashes, caps, joins, opacities, markers, gradient stops): read on the
  // SVG elements they can draw on (canon.js svgDetailApplies is the same rule). Often set as
  // presentation attributes, which no stylesheet scan sees, so never skipped as undeclared.
  const SVG_STROKE = ['stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit'];
  const SVG_SHAPES = new Set(['path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan', 'textpath', 'use']);
  function svgDetail(tag, s) {
    if (tag === 'stop') return ['stop-color', 'stop-opacity'];
    if (!SVG_SHAPES.has(tag)) return [];
    const out = ['paint-order', 'vector-effect', 'shape-rendering'];
    if (s.stroke !== 'none') out.push(...SVG_STROKE);
    if (s.fill !== 'none') out.push('fill-opacity', 'fill-rule');
    if (tag === 'path' || tag === 'line' || tag === 'polyline' || tag === 'polygon') out.push('marker-start', 'marker-mid', 'marker-end');
    if (tag === 'text' || tag === 'tspan' || tag === 'textpath') out.push('text-anchor', 'dominant-baseline');
    return out;
  }
  for (const p of [...TYPO, ...INTERACT, ...PAINT2, ...SCROLLBAR, 'text-decoration-thickness', 'image-rendering', ...DEPENDENT.flatMap((d) => d[2]),
    ...svgDetail('stop', {}), ...svgDetail('text', {}), ...svgDetail('path', {})]) if (!PROPS.includes(p)) PROPS.push(p);
  // Rare properties that no user-agent stylesheet sets: when no author style declares one, it has
  // its initial value everywhere and need not be read. Which properties are declared is found once by
  // scanning the page's rules (longhands, so shorthands count) and inline styles. Unreadable
  // (cross-origin) sheets or shadow roots make the set unknown: then everything is read.
  const SKIPPABLE = new Set([...PAINT2, ...TYPO.filter((p) => !['direction', 'writing-mode', 'user-select', 'text-wrap-mode'].includes(p))]);
  function declaredProps() {
    const set = new Set();
    const visit = (rules) => { for (const r of rules) { if (r.cssRules) visit(r.cssRules); if (r.style) for (let i = 0; i < r.style.length; i++) set.add(r.style[i]); } };
    try {
      for (const sh of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) visit(sh.cssRules);
      for (const el of document.querySelectorAll('*')) {
        if (el.shadowRoot) return null;
        if (el.style && el.style.length) for (let i = 0; i < el.style.length; i++) set.add(el.style[i]);
      }
    } catch (e) { return null; }
    return set;
  }
  const declared = opts.full ? null : declaredProps();
  // opts.match: selectors (attribute.js: the elements each edited rule selects); node.mt lists the ones
  // an element matches
  const MATCH = (opts.match || []).map((sel) => { try { document.querySelector(sel); return sel; } catch (e) { return null; } });
  const needed = (p) => !declared || !SKIPPABLE.has(p) || declared.has(p);
  const INTERACTIVE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'details', 'option']);
  const interactive = (el, tag) => INTERACTIVE_TAGS.has(tag) || el.hasAttribute('role') || el.hasAttribute('tabindex') || el.hasAttribute('onclick') || el.isContentEditable;
  // Properties whose getComputedStyle() value is the *used* value (depends on content/layout).
  // For these we also read the Typed OM computed value, which keeps `auto` / `%` / `fr`.
  const TYPED = new Set(['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'top', 'right', 'bottom', 'left', 'flex-basis', 'line-height',
    'grid-template-columns', 'grid-template-rows']);
  const PSEUDO_PROPS = ['content', 'display', 'position', 'width', 'height', 'color', 'background-color', 'background-image',
    'font-family', 'font-size', 'font-weight', 'border-top-width', 'border-top-style', 'border-top-color',
    'border-top-left-radius', 'margin-left', 'margin-right', 'padding-left', 'opacity', 'transform', 'mask-image'];
  const ATTRS = ['id', 'class', 'role', 'aria-label', 'aria-hidden', 'aria-expanded', 'aria-selected', 'aria-checked',
    'aria-current', 'aria-pressed', 'data-testid', 'data-uihash', 'type', 'name', 'href', 'title', 'alt', 'placeholder', 'for'];
  const SVG_GEOM = ['d', 'points', 'viewBox', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'href', 'transform'];

  // cyrb53: tiny, fast, decent 53-bit string hash (used only to shorten long attribute payloads).
  function h53(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  const styleTable = []; const styleIndex = new Map();
  function intern(obj) {
    const key = JSON.stringify(obj);
    let id = styleIndex.get(key);
    if (id === undefined) { id = styleTable.length; styleTable.push(obj); styleIndex.set(key, id); }
    return id;
  }
  const r2 = (v) => Math.round(v * 100) / 100;
  const sx = window.scrollX, sy = window.scrollY;
  let count = 0;

  // full mode reads every property, then keeps the per-element ones only where lazy mode reads them,
  // so both modes give the same canonical result
  function readStyle(el, cs, tag, hasText) {
    const s = {}, used = {};
    let tm = null;
    try { tm = el.computedStyleMap(); } catch (e) { /* non-element */ }
    for (const p of PROPS) {
      const v = cs.getPropertyValue(p); reads++;
      if (TYPED.has(p) && tm) {
        let tv = null;
        try { const x = tm.get(p); tv = x == null ? null : x.toString(); } catch (e) { tv = null; }
        if (tv !== null && tv !== '' && tv !== v) { s[p] = tv; used[p] = v; continue; }
      }
      s[p] = v;
    }
    if (!(hasText || tag === 'input' || tag === 'textarea' || tag === 'select' || s.display === 'list-item')) for (const p of TYPO) delete s[p];
    if (!interactive(el, tag) && s.opacity !== '0') for (const p of INTERACT) delete s[p];
    return { s, used };
  }


  // Lazy reading: skip properties that cannot affect this element's rendering, using the same
  // dead-property rules as the canonicalizer (canon.js), so the canonical hash is unchanged.
  // Inherited properties are always read: children are delta-encoded against them.
  let reads = 0;
  const INH = ['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant-caps', 'line-height', 'letter-spacing',
    'word-spacing', 'text-align', 'text-transform', 'text-indent', 'visibility', 'white-space', 'word-break', 'overflow-wrap',
    'list-style-type', 'list-style-position', 'list-style-image', 'border-collapse', 'border-spacing', 'text-shadow', 'accent-color'];
  const BASE = ['display', 'position', 'box-sizing', 'opacity', 'background-color', 'background-image', 'overflow-x', 'overflow-y',
    'text-overflow', 'text-decoration-line', 'vertical-align', 'box-shadow', 'transform', 'filter', 'backdrop-filter', 'clip-path',
    'mix-blend-mode', 'outline-style', 'float', 'clear', 'z-index', 'content', '-webkit-line-clamp', 'aspect-ratio',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'];
  const BOX = ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left'];
  const CONT = ['flex-direction', 'flex-wrap', 'justify-content', 'justify-items', 'align-items', 'align-content', 'row-gap', 'column-gap'];
  const GRIDC = ['grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows'];
  const REPLACED = new Set(['img', 'video', 'canvas', 'iframe', 'object', 'embed', 'svg', 'input', 'textarea', 'select', 'button', 'progress', 'meter']);
  function readStyleLazy(el, cs, parentDisplay, tag, hasText) {
    const s = {}, used = {};
    let tm = null;
    const typed = (p, v) => {
      if (tm === null) { try { tm = el.computedStyleMap(); } catch (e) { tm = false; } }
      if (!tm) return v;
      try { const x = tm.get(p); const tv = x == null ? '' : x.toString(); if (tv !== '' && tv !== v) { used[p] = v; return tv; } } catch (e) { /* unsupported */ }
      return v;
    };
    const rd = (p) => { reads++; return cs.getPropertyValue(p); };
    for (const p of INH) s[p] = rd(p);
    for (const p of BASE) s[p] = rd(p);
    const disp = s.display;
    const inlineText = disp === 'inline' && !REPLACED.has(tag);
    for (const p of BOX) {
      if (inlineText && (p === 'width' || p === 'height' || p.startsWith('min-') || p.startsWith('max-') || p === 'margin-top' || p === 'margin-bottom')) continue;
      const v = rd(p);
      // a used value of 0/auto/none can only come from a content-independent computed value
      // paddings / max-* that are 0 or none cannot hide a content-independent value; margins and
      // min-* can (auto), and width/height always can
      s[p] = (p.startsWith('padding') && v === '0px') || (p.startsWith('max-') && v === 'none') ? v : typed(p, v);
    }
    if (s['line-height'] !== 'normal') s['line-height'] = typed('line-height', s['line-height']);
    const sides = ['top', 'right', 'bottom', 'left'];
    let anyBorder = false;
    for (const d of sides) if (s[`border-${d}-width`] !== '0px') { anyBorder = true; s[`border-${d}-style`] = rd(`border-${d}-style`); s[`border-${d}-color`] = rd(`border-${d}-color`); }
    if (anyBorder || s['background-color'] !== 'rgba(0, 0, 0, 0)' || s['background-image'] !== 'none' || s['box-shadow'] !== 'none' || s['overflow-x'] !== 'visible' || s['outline-style'] !== 'none' || REPLACED.has(tag))
      for (const c of ['top-left', 'top-right', 'bottom-right', 'bottom-left']) s[`border-${c}-radius`] = rd(`border-${c}-radius`);
    if (s['background-image'] !== 'none') for (const p of ['background-size', 'background-position', 'background-repeat']) s[p] = rd(p);
    if (s['background-image'] !== 'none' || s['background-color'] !== 'rgba(0, 0, 0, 0)') s['background-clip'] = rd('background-clip');
    if (s['outline-style'] !== 'none') for (const p of ['outline-width', 'outline-color', 'outline-offset']) s[p] = rd(p);
    if (s['text-decoration-line'] !== 'none') for (const p of ['text-decoration-style', 'text-decoration-color', 'text-decoration-thickness', 'text-underline-offset']) s[p] = rd(p);
    if (hasText || tag === 'input' || tag === 'textarea' || tag === 'select' || disp === 'list-item') for (const p of TYPO) { if (needed(p)) s[p] = rd(p); }
    if (interactive(el, tag) || s.opacity === '0') for (const p of INTERACT) s[p] = rd(p);
    for (const p of PAINT2) if (needed(p)) s[p] = rd(p);
    for (const [trigger, none, deps] of DEPENDENT) if (s[trigger] !== undefined && s[trigger] !== none) for (const p of deps) s[p] = rd(p);
    if (s['overflow-x'] !== 'visible' || s['overflow-y'] !== 'visible') for (const p of SCROLLBAR) s[p] = rd(p);
    if (s.position !== 'static') for (const d of sides) s[d] = typed(d, rd(d));
    if (/flex|grid/.test(disp)) for (const p of CONT) s[p] = rd(p);
    if (/grid/.test(disp)) for (const p of GRIDC) s[p] = typed(p, rd(p));
    if (/flex|grid/.test(parentDisplay)) { for (const p of ['flex-grow', 'flex-shrink', 'align-self', 'order']) s[p] = rd(p); s['flex-basis'] = typed('flex-basis', rd('flex-basis')); }
    if (/grid/.test(parentDisplay)) for (const p of ['grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end']) s[p] = rd(p);
    if (REPLACED.has(tag)) for (const p of ['object-fit', 'object-position', 'appearance', 'resize', 'image-rendering']) s[p] = rd(p);
    if (el instanceof SVGElement) { for (const p of ['fill', 'stroke', 'stroke-width']) s[p] = rd(p); for (const p of svgDetail(tag, s)) s[p] = rd(p); }
    if (/^table/.test(disp)) s['table-layout'] = rd('table-layout');
    return { s, used };
  }

  function pseudo(el, which) {
    const cs = getComputedStyle(el, which);
    const c = cs.getPropertyValue('content');
    if (!c || c === 'none' || c === 'normal') return null;
    const o = {};
    for (const p of PSEUDO_PROPS) o[p] = cs.getPropertyValue(p);
    return intern(relUrls(o));
  }

  // Asset URLs relative to the page: base and head builds are served from different places (two
  // ports, two checkouts), and the same file must compare equal. Long data: URLs are hashed.
  const pageDir = new URL('.', location.href);
  function relUrl(u) {
    let x;
    try { x = new URL(u, location.href); } catch (e) { return u; }
    if (x.protocol === 'data:') return u.length > 200 ? 'data:h:' + h53(u) : u;
    if (x.origin !== pageDir.origin && !(x.protocol === 'file:' && pageDir.protocol === 'file:')) return x.href;
    const a = pageDir.pathname.split('/').filter(Boolean), b = x.pathname.split('/').filter(Boolean);
    let i = 0;
    while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
    return '../'.repeat(a.length - i) + b.slice(i).join('/') + x.search;
  }
  const URL_PROPS = ['background-image', 'mask-image', 'border-image-source', 'list-style-image', 'content', 'cursor'];
  const relUrls = (o) => { for (const p of URL_PROPS) if (o[p] && o[p].includes('url(')) o[p] = o[p].replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (all, q, u) => `url("${relUrl(u)}")`); return o; };

  const PLACEHOLDER_PROPS = ['color', 'font-size', 'font-style', 'font-weight', 'opacity', 'letter-spacing', 'text-transform'];
  function placeholder(el) {
    const cs = getComputedStyle(el, '::placeholder');
    const o = {};
    for (const p of PLACEHOLDER_PROPS) o[p] = cs.getPropertyValue(p);
    return intern(o);
  }

  // ::selection colours, where text is drawn, on pages that style selections at all
  const selectionStyled = (() => {
    const visit = (rules) => { for (const r of rules) { if (r.selectorText && r.selectorText.includes('::selection')) return true; if (r.cssRules && visit(r.cssRules)) return true; } return false; };
    for (const sh of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) { try { if (visit(sh.cssRules)) return true; } catch (e) { return true; } }
    return false;
  })();
  function selection(el) {
    const cs = getComputedStyle(el, '::selection');
    return intern({ color: cs.getPropertyValue('color'), 'background-color': cs.getPropertyValue('background-color') });
  }
  // what a <canvas> holds is pixels only: hash them (a tainted canvas cannot be read; huge ones are skipped)
  function canvasHash(el) {
    if (!el.width || !el.height || el.width * el.height > 4e6) return null;
    try { return h53(el.toDataURL()); } catch (e) { return null; }
  }

  function textOf(node, ws) {
    let t = node.nodeValue;
    if (!/^pre/.test(ws)) t = t.replace(/\s+/g, ' ');
    return t;
  }

  function childNodesOf(el) {
    if (el.shadowRoot) return Array.from(el.shadowRoot.childNodes);
    if (el.tagName === 'SLOT') {
      const a = el.assignedNodes({ flatten: true });
      return a.length ? a : Array.from(el.childNodes);
    }
    return Array.from(el.childNodes);
  }

  let latentCount = 0, inLatent = false;
  function walk(el, parentDisplay = 'block') {
    count++;
    const tag = el.tagName.toLowerCase();
    const cs = getComputedStyle(el);
    const node = { t: tag };
    const a = {};
    for (const k of ATTRS) { const v = el.getAttribute(k); if (v !== null && v !== '') a[k] = v.length > 300 ? 'h:' + h53(v) : v; }
    if (Object.keys(a).length) node.a = a;
    if (cs.display === 'none') {
      // latent mode: closed menus/dialogs kept in the DOM still have a computed style worth hashing
      if (!opts.latent || latentCount > (opts.latentMax || 4000)) { node.x = 'none'; return node; }
      node.lat = 1;
    }
    if (node.lat || inLatent) latentCount++;
    if (tag === 'script' || tag === 'style' || tag === 'template' || tag === 'noscript' || tag === 'head' || tag === 'meta' || tag === 'link') { node.x = 'meta'; return node; }
    const childNodes = childNodesOf(el);
    const hasText = childNodes.some((ch) => ch.nodeType === 3 && ch.nodeValue.trim() !== '');
    const { s, used } = opts.full ? readStyle(el, cs, tag, hasText) : readStyleLazy(el, cs, parentDisplay, tag, hasText);
    node.s = intern(relUrls(s));
    if (Object.keys(used).length) node.u = used;
    const pb = pseudo(el, '::before'), pa = pseudo(el, '::after');
    if (pb !== null) node.pb = pb; if (pa !== null) node.pa = pa;
    if ((tag === 'input' || tag === 'textarea') && el.getAttribute('placeholder')) node.pp = placeholder(el);
    if (selectionStyled && hasText) node.sel = selection(el);
    // keyboard-focusable (for the focus-indicator check, focus.js); not part of the fingerprint
    if ((el.tabIndex >= 0 && !el.disabled && !(tag === 'a' && !el.hasAttribute('href'))) || el.isContentEditable) node.fo = 1;
    if (el.style && el.style.length) { const ip = []; for (let i = 0; i < el.style.length; i++) ip.push(el.style[i]); node.ip = ip; }
    if (MATCH.length) { const mt = []; for (let i = 0; i < MATCH.length; i++) if (MATCH[i] && el.matches(MATCH[i])) mt.push(i); if (mt.length) node.mt = mt; }
    const rect = el.getBoundingClientRect();
    node.b = [r2(rect.left + sx), r2(rect.top + sy), r2(rect.width), r2(rect.height)];
    // an SVG shape's box is its geometry without the stroke (a horizontal line is 0px tall): add half
    // the stroke width as drawn, so the box covers what is painted
    if (SVG_SHAPES.has(tag) && s.stroke !== undefined && s.stroke !== 'none' && el.getScreenCTM) {
      const m = el.getScreenCTM(), half = (parseFloat(s['stroke-width']) || 0) / 2;
      const fixed = !m || s['vector-effect'] === 'non-scaling-stroke';
      const hx = r2(fixed ? half : half * Math.hypot(m.a, m.b)), hy = r2(fixed ? half : half * Math.hypot(m.c, m.d));
      if (hx || hy) node.b = [r2(node.b[0] - hx), r2(node.b[1] - hy), r2(node.b[2] + 2 * hx), r2(node.b[3] + 2 * hy)];
    }
    // occlusion (opts.occlusion; only the renders that are compared need it): what is drawn on top at
    // the centre of a text or interactive element in the viewport: another element there means it is
    // covered (a z-index or stacking change)
    // (also small positioned marks with a fill: a status dot, a badge, an indicator)
    const mark = !hasText && (cs.position === 'absolute' || cs.position === 'fixed') && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && rect.width * rect.height < 2500;
    if (opts.occlusion && (hasText || interactive(el, tag) || mark) && rect.width > 4 && rect.height > 4 && cs.visibility !== 'hidden') {
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
        const top = document.elementFromPoint(cx, cy);
        if (top && top !== el && !el.contains(top) && !top.contains(el)) node.occ = top.tagName.toLowerCase() + (top.classList.length ? '.' + [...top.classList].slice(0, 2).join('.') : '');
      }
    }
    if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.textOverflow === 'ellipsis')
        node.ov = [el.scrollWidth, el.clientWidth, el.scrollHeight, el.clientHeight];
    }
    if (tag === 'img') {
      const src = el.currentSrc || el.src || '';
      node.img = { src: relUrl(src), nw: el.naturalWidth, nh: el.naturalHeight };
      if (/^data:image\/svg|\.svg($|[?#])/i.test(src)) node.img.v = 1;     // vector: drawn sharp at any size
    }
    else if (tag === 'video' || tag === 'canvas' || tag === 'iframe') { node.media = true; if (tag === 'canvas') { const h = canvasHash(el); if (h) node.cv = h; } }
    else if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      node.f = { v: el.value == null ? '' : String(el.value).slice(0, 200), ck: !!el.checked, dis: !!el.disabled };
    }
    if (el instanceof SVGElement) {
      const g = {};
      for (const k of SVG_GEOM) { const v = el.getAttribute(k); if (v !== null) g[k] = v.length > 64 ? 'h:' + h53(v) : v; }
      if (Object.keys(g).length) node.g = g;
    }
    const kids = [];
    const wasLatent = inLatent; if (node.lat) inLatent = true;
    for (const ch of childNodes) {
      if (ch.nodeType === 3) {
        const t = textOf(ch, cs.whiteSpace);
        if (t.trim() !== '') kids.push(t);
      } else if (ch.nodeType === 1) {
        kids.push(walk(ch, s.display === 'contents' ? parentDisplay : s.display));
      }
    }
    inLatent = wasLatent;
    if (kids.length) node.c = kids;
    return node;
  }

  const t0 = performance.now();
  const root = walk(document.documentElement);
  const ms = performance.now() - t0;
  // media blocks with a width condition, by their condition and a hash of their rules: a change to
  // one matters at the widths it applies to (pr.js renders quick variants there)
  const media = [];
  const visitMedia = (rules) => {
    for (const r of rules) {
      if (r.media && r.cssRules) { if (/width/.test(r.media.mediaText)) media.push([r.media.mediaText, h53(r.cssText)]); }
      else if (r.cssRules) visitMedia(r.cssRules);
      else if (r.styleSheet) { try { visitMedia(r.styleSheet.cssRules); } catch (e) { /* cross-origin import */ } }
    }
  };
  for (const sh of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) {
    try {
      if (sh.media && sh.media.length && /width/.test(sh.media.mediaText)) media.push([sh.media.mediaText, h53([...sh.cssRules].map((r) => r.cssText).join('\n'))]);
      else visitMedia(sh.cssRules);
    } catch (e) { /* cross-origin sheet: unreadable */ }
  }
  return {
    v: 1,
    url: location.href,
    title: document.title,
    viewport: [innerWidth, innerHeight, devicePixelRatio],
    media,
    doc: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    styles: styleTable,
    root,
    stats: { elements: count, styles: styleTable.length, extractMs: Math.round(ms * 10) / 10, reads, mode: opts.full ? 'full' : 'lazy', latent: latentCount },
  };
}
if (typeof module !== 'undefined') module.exports = { uihashExtract };
