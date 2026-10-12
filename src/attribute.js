// Which edit of the PR's CSS caused each change (counterfactual attribution, after delta debugging:
// Zeller, "Yesterday, my program worked. Today, it does not. Why?", 1999).
//
// The stylesheets of the base and head renders of a page state are read through the DevTools protocol
// and compared rule by rule: a rule the head changed, added or removed is one edit. In the live head
// page each edit is then undone on its own (CSS.setStyleSheetText: no reload, the DOM, scripts and
// state stay as they are), the page is extracted again and checked against the base again: a change
// that goes away when an edit is undone was caused by that edit. Undoing every edit at once tells
// changes that come from the CSS from changes that come from markup, scripts or data.
//
// Each edit's selector is also matched against the page, so a change can be told apart by how it got
// to its element: on an element the edited rule selects (or inside one), or elsewhere, through a custom
// property (a design token) the edit redefined, or through inheritance or layout.
const crypto = require('crypto');

const norm = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};:,>+~])\s*/g, '$1').trim();

// The style rules in a stylesheet's text, as [start, end) offsets and their @-context: blocks with a
// selector and no block inside (rules nested in @media / @supports included; @font-face, @keyframes
// frames and @page left out: undoing every edit at once still covers them).
function styleRules(text) {
  const out = [], stack = [];
  let start = 0, inner = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 1; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < text.length && text[j] !== c) j += text[j] === '\\' ? 2 : 1; i = j; continue; }
    if (c === '{') { stack.push([start, text.slice(start, i).trim()]); start = i + 1; inner = false; }
    else if (c === '}') {
      const [s0, prelude] = stack.pop() || [0, ''];
      if (!inner && prelude && !prelude.startsWith('@') && !/^(from|to|\d+%)/.test(prelude) && !stack.some(([, p]) => /^@(keyframes|font-face|page)/.test(p)))
        out.push([s0, i + 1, stack.map(([, p]) => p).filter((p) => p.startsWith('@')).join(' { ')]);
      inner = true; start = i + 1;
    } else if (c === ';' && stack.length === 0) start = i + 1;
  }
  return out.map(([a, b, at]) => { while (/\s/.test(text[a]) || text.startsWith('/*', a)) a = text.startsWith('/*', a) ? text.indexOf('*/', a) + 2 : a + 1; return [a, b, at]; });
}

function rulesOf(text) {
  return styleRules(text).map(([a, b, at]) => {
    const body = text.slice(a, b), i = body.indexOf('{');
    const sel = norm(body.slice(0, i)), decl = norm(body.slice(i + 1, body.lastIndexOf('}')));
    return { a, b, at: norm(at), sel, decl, text: body, key: norm(at) + '|' + sel + '{' + decl };
  });
}

// declarations of a rule body, as [property, value] (property lower-cased; !important kept in the value)
function declsOf(decl) {
  const out = [];
  let depth = 0, cur = '', q = null;
  for (const c of decl + ';') {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(') depth++; else if (c === ')') depth--;
    if (c === ';' && !depth) { const k = cur.indexOf(':'); if (k > 0) out.push([cur.slice(0, k).trim().toLowerCase(), cur.slice(k + 1).trim()]); cur = ''; } else cur += c;
  }
  return out;
}
// what an edit changed in its rule: "gap: 4px → 14px", "+ max-width: 400px", "− color"
function declDiff(before, after) {
  const A = new Map(declsOf(before)), B = new Map(declsOf(after)), out = [];
  for (const [p, v] of B) if (!A.has(p)) out.push(`+ ${p}: ${v}`); else if (A.get(p) !== v) out.push(`${p}: ${A.get(p)} → ${v}`);
  for (const p of A.keys()) if (!B.has(p)) out.push(`− ${p}`);
  return out;
}

// Rule-level edits between two versions of a stylesheet: rules kept as they are pair by a longest
// common subsequence (between the common prefix and suffix); of the rest, rules with the same
// selector in the same @-context are changed, the others added or removed. Each edit carries the
// splice of the head text that undoes it.
function sheetEdits(baseText, headText) {
  const A = rulesOf(baseText), B = rulesOf(headText);
  let p = 0;
  while (p < A.length && p < B.length && A[p].key === B[p].key) p++;
  let s = 0;
  while (s < A.length - p && s < B.length - p && A[A.length - 1 - s].key === B[B.length - 1 - s].key) s++;
  const a = A.slice(p, A.length - s), b = B.slice(p, B.length - s);
  const pairOf = new Map();                          // base index -> head index (kept or changed)
  for (let k = 0; k < p; k++) pairOf.set(k, k);
  for (let k = 0; k < s; k++) pairOf.set(A.length - 1 - k, B.length - 1 - k);
  const keptA = new Set(), keptB = new Set();
  if (a.length && b.length) {
    const L = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i].key === b[j].key ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    for (let i = 0, j = 0; i < a.length && j < b.length;) {
      if (a[i].key === b[j].key) { pairOf.set(p + i, p + j); keptA.add(i); keptB.add(j); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
    }
  }
  const edits = [];
  const restA = a.map((r, i) => [r, i]).filter(([, i]) => !keptA.has(i)), restB = b.map((r, j) => [r, j]).filter(([, j]) => !keptB.has(j));
  const usedB = new Set();
  for (const [r, i] of restA) {
    const m = restB.find(([x, j]) => !usedB.has(j) && x.at === r.at && x.sel === r.sel);
    if (m) {
      usedB.add(m[1]); pairOf.set(p + i, p + m[1]);
      edits.push({ kind: 'changed', at: r.at, sel: m[0].sel, before: r.text, after: m[0].text, what: declDiff(r.decl, m[0].decl), splice: [m[0].a, m[0].b, r.text] });
    }
  }
  for (const [x, j] of restB) if (!usedB.has(j)) edits.push({ kind: 'added', at: x.at, sel: x.sel, before: null, after: x.text, what: declsOf(x.decl).map(([k, v]) => `${k}: ${v}`), splice: [x.a, x.b, ''] });
  for (const [r, i] of restA) {
    if (pairOf.has(p + i)) continue;
    // undo a removal: put the rule back after the nearest earlier rule the head still has, inside the
    // same @-block; else at the end of the sheet, wrapped in its @-context
    let at = -1;
    for (let k = p + i - 1; k >= 0; k--) if (pairOf.has(k) && A[k].at === r.at) { at = B[pairOf.get(k)].b; break; }
    const wrap = r.at ? r.at.split(' { ') : [];
    const insert = at >= 0 ? '\n' + r.text : '\n' + wrap.map((w) => w + ' { ').join('') + r.text + wrap.map(() => ' }').join('');
    edits.push({ kind: 'removed', at: r.at, sel: r.sel, before: r.text, after: null, what: declsOf(r.decl).map(([k, v]) => `${k}: ${v}`), splice: at >= 0 ? [at, at, insert] : [headText.length, headText.length, insert] });
  }
  return edits;
}

// --- stylesheets of a live page

// The page's own stylesheets (not user-agent or inspector ones), in a stable order: linked sheets by
// URL, embedded ones (<style>, script-made, constructed) by position in the source, then creation.
async function pageSheets(page) {
  const cdp = await page.context().newCDPSession(page);
  const headers = [];
  cdp.on('CSS.styleSheetAdded', (e) => headers.push(e.header));
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  await new Promise((r) => setTimeout(r, 30));          // the events for sheets already there
  const doc = page.url().split(/[?#]/)[0];
  const list = [];
  for (const h of headers) {
    if (h.origin !== 'regular') continue;
    const r = await cdp.send('CSS.getStyleSheetText', { styleSheetId: h.styleSheetId }).catch(() => null);
    if (!r) continue;
    const url = (h.sourceURL || '').split(/[?#]/)[0];
    list.push({ id: h.styleSheetId, linked: !!url && url !== doc && !h.isConstructed, url, line: h.startLine || 0, col: h.startColumn || 0, owner: h.ownerNode || 0, text: r.text });
  }
  list.sort((x, y) => (x.linked - y.linked) || (x.linked ? (x.url < y.url ? -1 : 1) : x.line - y.line || x.col - y.col || x.owner - y.owner));
  return { cdp, list };
}

// Pair the base and head sheets: linked ones by their path relative to the page (then with content
// hashes taken out of file names: app.3f9a1c.css), embedded ones in order with unchanged sheets as
// anchors (a longest common subsequence on their text).
function pairSheets(base, head, baseDoc, headDoc) {
  const dir = (u) => u.slice(0, u.lastIndexOf('/') + 1);
  const rel = (s, doc) => (s.url.startsWith(dir(doc)) ? s.url.slice(dir(doc).length) : s.url.replace(/^\w+:\/\/[^/]*/, ''));
  const unhash = (u) => u.replace(/[.-][0-9a-f]{6,}(?=\.css$)/i, '').replace(/[.-][0-9a-f]{6,}\./i, '.');
  const pairs = [], usedB = new Set(), usedH = new Set();
  const lb = base.filter((s) => s.linked), lh = head.filter((s) => s.linked);
  for (const f of [(s, doc) => rel(s, doc), (s, doc) => unhash(rel(s, doc))]) {
    for (const x of lb) {
      if (usedB.has(x)) continue;
      const y = lh.find((h) => !usedH.has(h) && f(h, headDoc) === f(x, baseDoc));
      if (y) { pairs.push([x, y]); usedB.add(x); usedH.add(y); }
    }
  }
  const eb = base.filter((s) => !s.linked), eh = head.filter((s) => !s.linked);
  const L = Array.from({ length: eb.length + 1 }, () => new Int32Array(eh.length + 1));
  for (let i = eb.length - 1; i >= 0; i--) for (let j = eh.length - 1; j >= 0; j--) L[i][j] = eb[i].text === eh[j].text ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  // between two anchors, the sheets left over pair in order
  let i = 0, j = 0, gapB = [], gapH = [];
  const flush = () => { for (let k = 0; k < Math.min(gapB.length, gapH.length); k++) { pairs.push([gapB[k], gapH[k]]); usedB.add(gapB[k]); usedH.add(gapH[k]); } gapB = []; gapH = []; };
  while (i < eb.length && j < eh.length) {
    if (eb[i].text === eh[j].text) { flush(); pairs.push([eb[i], eh[j]]); usedB.add(eb[i]); usedH.add(eh[j]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) gapB.push(eb[i++]); else gapH.push(eh[j++]);
  }
  while (i < eb.length) gapB.push(eb[i++]);
  while (j < eh.length) gapH.push(eh[j++]);
  flush();
  return { pairs, baseOnly: base.filter((s) => !usedB.has(s)), headOnly: head.filter((s) => !usedH.has(s)) };
}

// Every edit of the head's CSS against the base's, with how to undo it in the head page.
//   { id, kind: changed | added | removed | sheet-removed, sheet, at, sel, what, undo: { sheetId, text } | { create } }
function cssEdits(baseSheets, headSheets, baseDoc, headDoc) {
  const { pairs, baseOnly, headOnly } = pairSheets(baseSheets, headSheets, baseDoc, headDoc);
  const name = (s) => (s.linked ? s.url.split('/').pop() : `<style> at line ${s.line + 1}`);
  const edits = [];
  for (const [x, y] of [...pairs, ...headOnly.map((h) => [{ text: '' }, h])]) {
    if (x.text === y.text) continue;
    for (const e of sheetEdits(x.text, y.text)) {
      const [a, b, ins] = e.splice;
      edits.push({ ...e, sheet: name(y), undo: { sheetId: y.id, text: y.text.slice(0, a) + ins + y.text.slice(b) } });
    }
  }
  for (const x of baseOnly) edits.push({ kind: 'sheet-removed', sheet: name(x), at: '', sel: '', what: [`${rulesOf(x.text).length} rules`], undo: { create: x.text } });
  edits.forEach((e, k) => { e.id = k; e.splice = undefined; e.tokens = (e.what || []).map((w) => (/^[+−]? ?(--[\w-]+)/.exec(w) || [])[1]).filter(Boolean); });
  // undoing everything at once: each changed sheet back to its base text, new sheets emptied, missing ones added
  const all = [...pairs.filter(([x, y]) => x.text !== y.text).map(([x, y]) => ({ sheetId: y.id, text: x.text })), ...headOnly.map((h) => ({ sheetId: h.id, text: '' })), ...baseOnly.map((x) => ({ create: x.text }))];
  return { edits, all, sheets: { paired: pairs.length, baseOnly: baseOnly.length, headOnly: headOnly.length } };
}

// Apply undo steps in the head page; returns a function that restores the head's CSS.
async function applyUndo(cdp, page, steps) {
  const restore = [];
  for (const st of steps) {
    if (st.create !== undefined) {
      const { frameTree } = await cdp.send('Page.getFrameTree');
      const { styleSheetId } = await cdp.send('CSS.createStyleSheet', { frameId: frameTree.frame.id });
      await cdp.send('CSS.setStyleSheetText', { styleSheetId, text: st.create });
      restore.push({ sheetId: styleSheetId, text: '' });
    } else {
      const { text } = await cdp.send('CSS.getStyleSheetText', { styleSheetId: st.sheetId });
      await cdp.send('CSS.setStyleSheetText', { styleSheetId: st.sheetId, text: st.text });
      restore.push({ sheetId: st.sheetId, text });
    }
  }
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return async () => {
    for (const st of restore.reverse()) await cdp.send('CSS.setStyleSheetText', { styleSheetId: st.sheetId, text: st.text });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  };
}

// The elements an edit's rule selects, as a selector to match in the page: dynamic pseudo-classes and
// pseudo-elements left out (".tool[data-tip]:hover::after" selects .tool[data-tip]).
function subjectSelector(sel) {
  if (!sel) return null;
  const s = sel.replace(/::?(before|after|placeholder|marker|selection|first-line|first-letter|backdrop|file-selector-button|-webkit-[\w-]+|-moz-[\w-]+)\b(\([^)]*\))?/g, '')
    .replace(/:(hover|focus-visible|focus-within|focus|active|visited|target)\b/g, '').replace(/(^|,)\s*(?=,|$)/g, '$1*');
  return s.trim() || null;
}

// Does this edit apply to the page state at all (its @media / @supports context holds, its selector
// matches something)? Edits that cannot are not tried one by one.
async function applicable(page, edits) {
  return page.evaluate((list) => list.map(({ at, sel }) => {
    try {
      for (const ctx of at ? at.split(' { ') : []) {
        if (ctx.startsWith('@media')) { if (!matchMedia(ctx.slice(6).trim()).matches) return false; }
        else if (ctx.startsWith('@supports')) { if (!CSS.supports(ctx.slice(9).trim())) return false; }
      }
      return !sel || !!document.querySelector(sel);
    } catch (e) { return true; }
  }), edits.map((e) => ({ at: e.at, sel: subjectSelector(e.sel) })));
}

// Specificity of one complex selector, as [ids, classes / attributes / pseudo-classes, types /
// pseudo-elements]; :is() / :not() / :has() count their most specific argument, :where() nothing.
const cmpSpec = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
function specificity(sel) {
  let a = 0, b = 0, c = 0, s = sel;
  s = s.replace(/:(is|not|has|matches|where)\(((?:[^()]|\([^()]*\))*)\)/g, (m, fn, args) => {
    if (fn !== 'where') { const best = splitList(args).map(specificity).reduce((x, y) => (cmpSpec(x, y) >= 0 ? x : y), [0, 0, 0]); a += best[0]; b += best[1]; c += best[2]; }
    return '';
  });
  s = s.replace(/\[[^\]]*\]/g, () => { b++; return ''; }).replace(/\([^)]*\)/g, '');
  a += (s.match(/#[\w-]+/g) || []).length;
  b += (s.match(/\.[\w-]+|(?<!:):(?!:)[\w-]+/g) || []).length;
  c += (s.match(/(^|[\s>+~])[a-zA-Z][\w-]*|::[\w-]+/g) || []).length;
  return [a, b, c];
}
function splitList(text) {
  const out = []; let depth = 0, cur = '';
  for (const ch of text) { if (ch === '(' || ch === '[') depth++; else if (ch === ')' || ch === ']') depth--; if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch; }
  return [...out, cur.trim()].filter(Boolean);
}
const maxSpec = (sel) => splitList(sel).map(specificity).reduce((x, y) => (cmpSpec(x, y) >= 0 ? x : y), [0, 0, 0]);
const family = (p) => p.replace(/^(border|margin|padding|inset|outline|text-decoration|font|background|flex|grid|gap|overflow|list-style)(-.*)?$/, '$1');

// Rules an edit's !important declarations now beat although they are more specific: the PR's rule
// wins only because of !important (a reset in a new stylesheet flattening a component's own style).
// Candidates: rules the PR left as they are that declare a property of the same family without
// !important and whose selector is more specific. -> Map(edit id -> [{ sel, props }])
function overridden(edits, headSheets, baseSheets) {
  const baseKeys = new Set(baseSheets.flatMap((x) => rulesOf(x.text).map((r) => r.key)));
  const kept = headSheets.flatMap((x) => rulesOf(x.text)).filter((r) => baseKeys.has(r.key));
  const out = new Map();
  for (const e of edits) {
    if (e.kind !== 'added' && e.kind !== 'changed') continue;
    const imp = declsOf(e.after.slice(e.after.indexOf('{') + 1, e.after.lastIndexOf('}'))).filter(([, v]) => /!\s*important$/i.test(v)).map(([p]) => family(p));
    if (!imp.length) continue;
    const mine = maxSpec(e.sel), hits = [];
    for (const r of kept) {
      const props = declsOf(r.decl).filter(([p, v]) => imp.includes(family(p)) && !/!\s*important$/i.test(v)).map(([p]) => p);
      if (props.length && cmpSpec(maxSpec(r.sel), mine) > 0) hits.push({ sel: r.sel, props });
    }
    if (hits.length) out.set(e.id, hits);
  }
  return out;
}

const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

module.exports = { styleRules, rulesOf, sheetEdits, declDiff, pageSheets, pairSheets, cssEdits, applyUndo, subjectSelector, applicable, specificity, overridden, sha };
