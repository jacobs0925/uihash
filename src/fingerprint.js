// Calibrated UI fingerprint.
//
//   schema = calibrate([snap1, snap2, ...])   // same build, different data / time / randomness
//   result = check(candidateSnap, schema)     // PASS, or findings with paths and property diffs
//
// Calibration is anti-unification of the canonical trees, done jointly and top-down:
//   * Positions: the root, then for each position its child *groups* (same key; see canon.js).
//     A group is aligned as [static prefix][variable middle][static suffix]: items identical in
//     every run at the same end (toolbar buttons, the five system nav items) are fixed positions;
//     the variable middle (email rows, stories) is pooled into one *template* position, however
//     many instances it has. A prefix item that looks like a middle item is moved into the middle.
//   * A position whose pooled subtree hashes are identical in every run is STATIC: one exact hash.
//   * Otherwise it is DYNAMIC: per-node *facts* (own props + text + child shape) with HOLES, the
//     properties that turned out to be data:
//       - anything that varies at a singleton position (rotating tip, avatar, "N minutes ago"),
//       - text that varies inside a template (sender, subject): data flows into text,
//       - image sources, input values, and any property set by an inline style that varies
//         (progress bar width, user label colours),
//       - style properties with more than K distinct values in a template.
//     Other style variation inside a template is a *state* (unread, starred): kept, as variants.
//
// The check is set containment:  required ⊆ candidate ⊆ known.
// A single hash cannot be invariant to *which* variants the data happens to exercise (no unread
// mail today) and still be sensitive to changes inside those variants, so the fingerprint is a set.
const { toCanon, discoverStateClasses, finish, walk, H, propString, childSeq, textOf, elKids, INHERITED } = require('./canon.js');

const K_VARIANTS = 4;
const SEP = ' > ';

function groupsOf(nodes) {
  // per instance: Map gid -> [children]
  return nodes.map((n) => { const m = new Map(); for (const k of elKids(n)) { if (!m.has(k.gid)) m.set(k.gid, []); m.get(k.gid).push(k); } return m; });
}

function findHoles(per, singleton, k) {
  const holes = new Set();
  const all = per.flat();
  const keys = new Set(['#text']);
  for (const n of all) for (const p in n.props) keys.add(p);
  for (const p of keys) {
    const val = (n) => (p === '#text' ? textOf(n) : n.props[p] === undefined ? '∅' : n.props[p]);
    const union = new Set(all.map(val));
    if (union.size <= 1) continue;
    if (singleton || p === '#text' || p === '@src' || p === '@value' || p === '@alt' || all.some((n) => n.inline.has(p)) || union.size > k) holes.add(p);
  }
  return holes;
}

const shapeOf = (n) => n.key + '|' + childSeq(n);

// Holes are typed, not "anything goes": a text hole still rejects what a data-binding bug renders.
// A run that is exactly a sentinel value, or contains unrendered template syntax, is never data
// (a title like "Undefined behavior in C" is fine; a sender that is just "undefined" is not).
const SENTINEL_RUN = /^(undefined|null|NaN|\[object Object\]|Invalid Date|None|nil|#?N\/A|-?Infinity)$/;
const TEMPLATE_SYNTAX = /\{\{[^}]*\}\}|\$\{[^}]*\}|<%[^%]*%>|\{%[^%]*%\}/;
function suspicious(n) {
  for (const k of n.kids) if (k.text && (SENTINEL_RUN.test(k.text.trim()) || TEMPLATE_SYNTAX.test(k.text))) return k.text.trim();
  for (const p of ['@alt', '@value', '@placeholder']) { const v = n.props[p]; if (v && (SENTINEL_RUN.test(v) || TEMPLATE_SYNTAX.test(v))) return `${p}="${v}"`; }
  return null;
}

function factOf(n, holes) {
  if (n.factHoles === holes) return n.fact;                // one position, one hole set: computed once
  let ps = n.ps;
  if (ps === undefined) ps = propString(n.props, holes);
  else for (const h of holes) if (n.props[h] !== undefined) { ps = propString(n.props, holes); break; }
  n.factHoles = holes;
  n.fact = H(n.key + '|' + ps + '|' + (holes.has('#text') ? '~' : textOf(n)) + '|' + childSeq(n));
  return n.fact;
}
function factView(n, holes) {
  const props = {}; for (const p in n.props) if (!holes.has(p)) props[p] = n.props[p];
  return { props, text: holes.has('#text') ? '~' : textOf(n), seq: childSeq(n) };
}
// Where an element paints: its border box plus what draws outside it (shadows, outline, blur), so
// a box around a changed shadow covers the shadow. Extents are left/top/right/bottom in px; a
// Gaussian blur of radius r (sigma r/2) is visible to about 1.5 r.
const PX = /(-?\d*\.?\d+)px/g;
function splitTop(v) {
  const out = []; let d = 0, cur = '';
  for (const ch of v) { if (ch === '(') d++; else if (ch === ')') d--; if (ch === ',' && !d) { out.push(cur); cur = ''; } else cur += ch; }
  return [...out, cur];
}
function inkExtent(props) {
  const e = [0, 0, 0, 0];
  const add = (l, t, r, b) => { e[0] = Math.max(e[0], l); e[1] = Math.max(e[1], t); e[2] = Math.max(e[2], r); e[3] = Math.max(e[3], b); };
  const shadow = (s, spreadOk) => {
    if (/\binset\b/.test(s)) return;
    const [ox = 0, oy = 0, blur = 0, spread = 0] = [...s.replace(/[a-z]+\([^)]*\)/gi, '').matchAll(PX)].map((m) => +m[1]);
    const r = 1.5 * blur + (spreadOk ? spread : 0);
    add(r - ox, r - oy, r + ox, r + oy);
  };
  if (props['box-shadow']) splitTop(props['box-shadow']).forEach((s) => shadow(s, true));
  if (props['text-shadow'] && props['text-shadow'] !== 'none') splitTop(props['text-shadow']).forEach((s) => shadow(s, false));
  if (props['outline-style'] && props['outline-style'] !== 'none') { const r = (parseFloat(props['outline-width']) || 0) + (parseFloat(props['outline-offset']) || 0); add(r, r, r, r); }
  if (props.filter) for (const m of props.filter.matchAll(/drop-shadow\(((?:[^()]|\([^)]*\))*)\)|blur\((-?[\d.]+)px\)/g)) { if (m[2]) add(3 * m[2], 3 * m[2], 3 * m[2], 3 * m[2]); else shadow(m[1], false); }
  return e.some((x) => x > 0) ? e : null;
}
function boxOf(n) {
  const b = n.raw && n.raw.b;
  if (!b) return null;
  const e = inkExtent(n.props);
  if (!n.clip) return e ? [b[0] - e[0], b[1] - e[1], b[2] + e[0] + e[2], b[3] + e[1] + e[3]] : b;
  // only the part visible through the ancestors' overflow; nothing if it is scrolled out of view
  const [cx0, cy0, cx1, cy1] = n.clip;
  const x0 = Math.max(cx0, b[0] - (e ? e[0] : 0)), y0 = Math.max(cy0, b[1] - (e ? e[1] : 0));
  const x1 = Math.min(cx1, b[0] + b[2] + (e ? e[2] : 0)), y1 = Math.min(cy1, b[1] + b[3] + (e ? e[3] : 0));
  return x1 < x0 || y1 < y0 ? null : [x0, y0, x1 - x0, y1 - y0];
}
function serialize(n) { return { key: n.key, b: boxOf(n), m: n.merkle, props: n.props, kids: n.kids.map((k) => (k.text ? { text: k.text } : serialize(k))) }; }
const MAX_BOXES = 400;
// Run 0 of a calibration is the *reference render* (the one screenshotted as "before" in a PR report),
// so every learned position keeps its run-0 element boxes for highlighting.
// Index-aligned with the run-0 instances (null where an instance is scrolled out of view), so a
// candidate's instance k pairs with run-0 instance k; check() drops the nulls.
const boxes0 = (nodes) => nodes.slice(0, MAX_BOXES).map(boxOf);

// per: Array(runs) of Array(nodes at this position in that run)
function learn(per, opts, stats) {
  stats.positions++;
  const R = per.length;
  const presentRuns = per.filter((a) => a.length).length;
  const sigs = per.map((a) => a.map((n) => n.merkle).sort().join(','));
  if (presentRuns === R && sigs.every((s) => s === sigs[0])) {
    stats.static++;
    return { kind: 'static', shape: shapeOf(per[0][0]), sig: H(sigs[0]), count: per[0].length, merkles: [...new Set(per[0].map((n) => n.merkle))],
      ex: opts.exemplars === false ? undefined : per[0].slice(0, 24).map(serialize), b0: boxes0(per[0]) };
  }
  stats.dynamic++;
  const singleton = per.every((a) => a.length <= 1);
  const holes = findHoles(per, singleton, opts.kVariants || K_VARIANTS);
  const factRuns = per.map((a) => new Set(a.map((n) => factOf(n, holes))));
  const known = new Set(); factRuns.forEach((s) => s.forEach((f) => known.add(f)));
  const required = singleton ? [...known].filter((f) => factRuns.every((s) => s.has(f))) : [];
  const ex = {};
  for (const a of per) for (const n of a) { const f = factOf(n, holes); if (!ex[f]) ex[f] = { ...factView(n, holes), b0: [] }; }
  for (const n of per[0]) { const e = ex[factOf(n, holes)]; if (e.b0.length < MAX_BOXES && boxOf(n)) e.b0.push(boxOf(n)); }
  // children
  const gruns = per.map(groupsOf); // gruns[r][i] = Map for instance i of run r
  const gids = new Set(); gruns.forEach((r) => r.forEach((m) => m.forEach((_, g) => gids.add(g))));
  const groups = {};
  for (const g of gids) {
    const perInst = gruns.map((r) => r.map((m) => m.get(g) || []));          // [run][instance] -> members
    const required = per.every((a, r) => a.length === 0 || perInst[r].every((mem) => mem.length > 0));
    // Align a group as  [static prefix][variable middle][static suffix]. A pure tuple has no middle,
    // a pure list has no prefix/suffix. Only a singleton parent can have a prefix/suffix (pooled
    // parents are template instances: their children are pooled too).
    let p = 0, s = 0;
    if (singleton && per.every((a) => a.length === 1)) {
      const L = perInst.map((r) => r[0]);
      const minC = Math.min(...L.map((l) => l.length));
      while (p < minC && L.every((l) => l[p].merkle === L[0][p].merkle)) p++;
      while (s < minC - p && L.every((l) => l[l.length - 1 - s].merkle === L[0][L[0].length - 1 - s].merkle)) s++;
      const middleShapes = () => new Set(L.flatMap((l) => l.slice(p, l.length - s)).map(shapeOf));
      if (L.some((l) => l.length > p + s)) {
        // An item that looks like a middle (list) item is a list member that just didn't change.
        let ms = middleShapes();
        while (p > 0 && ms.has(shapeOf(L[0][p - 1]))) { p--; ms = middleShapes(); }
        while (s > 0 && ms.has(shapeOf(L[0][L[0].length - s]))) { s--; ms = middleShapes(); }
      }
    }
    // Inside a template (pooled parent): if >= 90% of instances have the same number c of these
    // siblings (HN's subtext links: user, age, hide, comments), they are a per-instance tuple. Each
    // index is its own pooled position, so "hide" stays checked text instead of joining the user
    // names in one hole. Instances with another count fall back to the pooled list.
    if (!(singleton && per.every((a) => a.length === 1))) {
      const counts = perInst.flat().map((m) => m.length).filter((c) => c > 0);
      if (counts.length >= 3) {
        const freq = new Map(); counts.forEach((c) => freq.set(c, (freq.get(c) || 0) + 1));
        const [cStar, nStar] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
        if (cStar >= 2 && cStar <= 8 && nStar / counts.length >= 0.9) {
          const fixed = perInst.map((r) => r.filter((m) => m.length === cStar));
          const rest = perInst.map((r) => r.filter((m) => m.length !== cStar).flat());
          groups[g] = {
            required, tupleN: cStar, prefix: [], suffix: [],
            items: Array.from({ length: cStar }, (_, i) => learn(fixed.map((r) => r.map((m) => m[i])), opts, stats)),
            middle: rest.some((x) => x.length) ? learn(rest, opts, stats) : null,
          };
          continue;
        }
      }
    }
    const middles = perInst.map((r) => r.flatMap((m) => m.slice(p, m.length - s)));
    groups[g] = {
      required,
      prefix: Array.from({ length: p }, (_, i) => learn(perInst.map((r) => [r[0][i]]), opts, stats)),
      suffix: Array.from({ length: s }, (_, i) => learn(perInst.map((r) => [r[0][r[0].length - s + i]]), opts, stats)),
      middle: middles.some((m) => m.length) ? learn(middles, opts, stats) : null,
    };
  }
  return { kind: 'dynamic', shape: shapeOf(per.find((a) => a.length)[0]), holes: [...holes].sort(), known: [...known].sort(), required: required.sort(), singleton, groups, ex,
    b0: boxes0(per[0]), f0: per[0].slice(0, MAX_BOXES).map((n) => factOf(n, holes)) };
}

function calibrate(snaps, opts = {}) {
  const t0 = Date.now();
  const roots = snaps.map((s) => toCanon(s, opts));
  const state = opts.stateClasses ? new Set(opts.stateClasses) : discoverStateClasses(roots, opts.keyMode);
  roots.forEach((r) => finish(r, state, opts.keyMode));
  const stats = { positions: 0, static: 0, dynamic: 0 };
  const tree = learn(roots.map((r) => [r]), opts, stats);
  return {
    v: 2, runs: snaps.length, stateClasses: [...state].sort(), stats, ms: Date.now() - t0,
    opts: { normalizeData: opts.normalizeData !== false, useUsed: !!opts.useUsed, withBoxes: !!opts.withBoxes, keyMode: opts.keyMode || 'class', kVariants: opts.kVariants || K_VARIANTS, latent: !!opts.latent,
      ...(opts.ignoreProps ? { ignoreProps: opts.ignoreProps } : {}) },
    tree,
  };
}

// ------------------------------------------------------------------------------------------ check
// A child-list change in words: what was added or removed (by key, with counts), else the new order.
function childChange(before, after) {
  const count = (l) => l.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
  const cb = count(before), ca = count(after);
  const net = (x, y) => [...x].filter(([k, n]) => n > (y.get(k) || 0)).map(([k, n]) => { const d = n - (y.get(k) || 0); return (d > 1 ? `${d}× ` : '') + (k === '#t' ? 'text' : k); });
  const add = net(ca, cb), rem = net(cb, ca), out = [];
  if (add.length) out.push(`added child ${add.join(', ')}`);
  if (rem.length) out.push(`removed child ${rem.join(', ')}`);
  return out.length ? out : [`reordered children: [${before.join(', ')}] → [${after.join(', ')}]`];
}
// a = candidate (head) subtree, b = reference (base) subtree, both serialized. Each entry says what
// changed and where: `head` boxes in the candidate render, `base` boxes in the reference render.
function diffNodes(a, b, path, out, limit = 12) {
  if (out.length >= limit) return;
  if (a.m && a.m === b.m) return;                           // identical subtrees
  const changed = [];
  const ak = a.kids || [], bk = b.kids || [];
  const ae = ak.filter((k) => !k.text), be = bk.filter((k) => !k.text);
  const aSeq = ae.map((k) => k.key).join(','), bSeq = be.map((k) => k.key).join(',');
  const aText = ak.filter((k) => k.text).map((k) => k.text).join(' | '), bText = bk.filter((k) => k.text).map((k) => k.text).join(' | ');
  if (aText !== bText) changed.push(`text: "${bText}" → "${aText}"`);
  const keys = new Set([...Object.keys(a.props || {}), ...Object.keys(b.props || {})]);
  for (const k of keys) {
    const x = (a.props || {})[k], y = (b.props || {})[k];
    if (x === y) continue;
    // text styles are recorded where content is drawn: when children came or went, a text style that
    // appeared or vanished with them says nothing the child change does not
    if (aSeq !== bSeq && (x === undefined || y === undefined) && INHERITED.has(k)) continue;
    changed.push(`${k}: ${y ?? '∅'} → ${x ?? '∅'}`);
  }
  const own = changed.length ? { path, changes: changed, head: [a.b], base: [b.b] } : null;
  if (own && aSeq === bSeq) out.push(own);
  if (aSeq !== bSeq) {
    // align children (weighted LCS: identical subtrees score 3, same key 1) so only the really added /
    // removed children are boxed, and recurse into the pairs
    const n = ae.length, m = be.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    const w = (x, y) => (x.key !== y.key ? 0 : x.m && x.m === y.m ? 3 : 1);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = Math.max(L[i + 1][j], L[i][j + 1], w(ae[i], be[j]) ? L[i + 1][j + 1] + w(ae[i], be[j]) : 0);
    const added = [], removed = [], pairs = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      const wij = w(ae[i], be[j]);
      if (wij && L[i][j] === L[i + 1][j + 1] + wij) { pairs.push([ae[i], be[j]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) added.push(ae[i++]); else removed.push(be[j++]);
    }
    while (i < n) added.push(ae[i++]);
    while (j < m) removed.push(be[j++]);
    out.push({ path, changes: childChange(be.map((k) => k.key), ae.map((k) => k.key)),
      head: added.length ? added.map((k) => k.b) : removed.length ? [] : [a.b], base: removed.length ? removed.map((k) => k.b) : added.length ? [] : [b.b] });
    if (own) out.push(own);                                  // the element's own changes after what came or went
    for (const [x, y] of pairs) diffNodes(x, y, path + SEP + x.key, out, limit);
    return;
  }
  for (let i = 0; i < ae.length; i++) diffNodes(ae[i], be[i], path + SEP + ae[i].key, out, limit);
}
const changeCount = (out) => out.reduce((s, d) => s + d.changes.length, 0);
const distance = (a, b) => { const out = []; diffNodes(a, b, '', out, 100); return changeCount(out); };

// Find the candidate item for a fixed (prefix/suffix) schema item, scanning from `from` towards `to`
// (exclusive): an exact match of a static item wins, else the first item with the same shape.
function matchItem(m, from, to, item, dir) {
  if (item.kind === 'static') for (let x = from; x !== to; x += dir) if (H(m[x].merkle) === item.sig) return x;
  for (let x = from; x !== to; x += dir) if (shapeOf(m[x]) === item.shape) return x;
  // same element with different children (an optional badge appeared/disappeared): align it anyway,
  // so the diff says what changed inside it rather than "missing" + "inserted"
  const key = item.shape.split('|')[0];
  if (from !== to && m[from].key === key) return from;
  return to;
}

function inserted(n, at) {
  const p = n.props;
  const brief = ['display', 'background-color', 'color', 'height', 'width'].filter((k) => p[k] !== undefined).map((k) => `${k}: ${p[k]}`).join('; ');
  const text = [...walk(n)].map(textOf).filter(Boolean).join(' ').slice(0, 80);
  return { type: 'inserted', path: at, head: [boxOf(n)], details: [{ path: at, changes: [`new ${n.key}: ${brief}${text ? ` text "${text}"` : ''}`] }] };
}

function verify(nodes, sn, path, F, explain) {
  if (!nodes.length) return;
  if (sn.kind === 'static') {
    const sig = H(nodes.map((n) => n.merkle).sort().join(','));
    if (sig === sn.sig) return;
    const f = { type: 'changed', path, head: [], base: [] };
    const knownM = new Set(sn.merkles || []);
    const changedNodes = nodes.filter((n) => !knownM.has(n.merkle));       // unchanged instances are skipped
    const candM = new Set(nodes.map((n) => n.merkle));
    if (sn.ex) {
      const details = [];
      const sameCount = nodes.length === sn.ex.length;
      for (const n of changedNodes) {
        const s = serialize(n);
        let best = sameCount ? sn.ex[nodes.indexOf(n)] : null, bd = best ? distance(s, best) : Infinity;
        if (!sameCount) for (const e of sn.ex) { if (candM.has(e.m)) continue; const d = distance(s, e); if (d < bd) { bd = d; best = e; } }
        if (best && bd > 0) diffNodes(s, best, path, details);
        if (details.length >= 12) break;
      }
      if (nodes.length !== sn.count) {
        const gone = sn.ex.filter((e) => !candM.has(e.m));
        details.push({ path, changes: [`instances: ${sn.count} → ${nodes.length}`], head: changedNodes.map(boxOf), base: nodes.length < sn.count ? gone.map((e) => e.b) : [] });
      }
      // one finding per changed element: a static subtree (a whole page that shows no data) can
      // hold several unrelated changes, each with its own path, boxes and explanation
      if (details.length) {
        for (const d of details) F.push({ type: 'changed', path: d.path || path, head: d.head || [], base: d.base || [], details: [{ path: d.path, changes: d.changes }] });
        return;
      }
    } else { f.head = changedNodes.map(boxOf); f.base = sn.b0 || []; }
    F.push(f);
    return;
  }
  const holes = new Set(sn.holes), known = new Set(sn.known);
  const seen = new Set(), unknown = new Map(), bad = [];
  for (const n of nodes) {
    const sus = (holes.has('#text') || holes.has('@alt') || holes.has('@value')) && suspicious(n);
    if (sus) bad.push([n, sus]);
    const fct = factOf(n, holes);
    seen.add(fct);
    if (!known.has(fct)) { if (!unknown.has(fct)) unknown.set(fct, []); unknown.get(fct).push(n); }
  }
  if (bad.length) F.push({ type: 'suspicious-data', path, head: bad.map(([n]) => boxOf(n)), details: [{ path, changes: [...new Set(bad.map(([, v]) => `data hole renders ${JSON.stringify(v)}`))] }] });
  const diffView = (e, mine) => {
    const ch = [];
    if (e.text !== mine.text) ch.push(`text: "${e.text}" → "${mine.text}"`);
    for (const k of new Set([...Object.keys(e.props), ...Object.keys(mine.props)])) if (e.props[k] !== mine.props[k]) ch.push(`${k}: ${e.props[k] ?? '∅'} → ${mine.props[k] ?? '∅'}`);
    if (e.seq !== mine.seq) ch.push(...childChange(e.seq.split(' ').filter(Boolean), mine.seq.split(' ').filter(Boolean)));
    return ch;
  };
  const aligned = sn.f0 && sn.f0.length === nodes.length && sn.b0 && sn.b0.length === nodes.length;
  for (const [, inst] of unknown) {
    const mine = factView(inst[0], holes);
    let best = null, bd = Infinity, base = [];
    if (aligned) {                          // same fixture on both sides: instance k was instance k before
      const ks = inst.map((n) => nodes.indexOf(n));
      base = ks.map((k) => sn.b0[k]);
      const e = sn.ex[sn.f0[ks[0]]];
      if (e) { best = diffView(e, mine); bd = best.length; }
    }
    const head = inst.map(boxOf);
    if (!best) {
      let bestE = null;
      for (const e of Object.values(sn.ex)) { const ch = diffView(e, mine); if (ch.length < bd) { bd = ch.length; best = ch; bestE = e; } }
      // "before" = where the closest known variant was drawn; not when the changed elements themselves
      // are out of view (it would box other, unchanged elements)
      base = head.every((b) => !b) ? [] : bestE && bestE.b0 && bestE.b0.length ? bestE.b0 : sn.b0 || [];
    }
    F.push({ type: 'unknown-variant', path, head, base, details: [{ path, changes: best || [] }] });
  }
  // a required variant replaced by an unknown one is one change, already reported above
  if (!unknown.size) for (const r of sn.required) if (!seen.has(r)) F.push({ type: 'missing-variant', path, head: nodes.map(boxOf), base: (sn.ex[r] && sn.ex[r].b0) || [] });
  const gi = groupsOf(nodes);
  const cand = new Set(); gi.forEach((m) => m.forEach((_, g) => cand.add(g)));
  for (const g of cand) if (!sn.groups[g]) {
    const all = gi.flatMap((m) => m.get(g) || []);
    F.push({ ...inserted(all[0], path + SEP + g), type: 'new-element', head: all.map(boxOf) });
  }
  const itemBoxes = (sg) => [...(sg.prefix || []), ...(sg.suffix || []), ...(sg.items || []), ...(sg.middle ? [sg.middle] : [])].flatMap((x) => x.b0 || []);
  // what a missing element held in the reference render (its texts: headings, button labels), so the
  // report says what went missing, not only where
  const contentOf = (sg) => {
    const pos = [...(sg.prefix || []), ...(sg.items || []), ...(sg.middle ? [sg.middle] : []), ...(sg.suffix || [])][0];
    const ex = pos && pos.ex && (Array.isArray(pos.ex) ? pos.ex[0] : Object.values(pos.ex)[0]);
    const out = [];
    (function walk(n) { for (const k of (n && n.kids) || []) { if (out.length >= 6) return; if (k.text) out.push(k.text); else walk(k); } })(ex);
    return out;
  };
  const missing = (g, sg) => { const t = contentOf(sg); return `missing: ${g}${t.length ? ` ("${t.join('", "')}")` : ''}`; };
  for (const [g, sg] of Object.entries(sn.groups)) {
    const members = gi.map((m) => m.get(g) || []);
    if (sg.required && members.some((m) => m.length === 0)) F.push({ type: 'missing', path: path + SEP + g, head: nodes.filter((_, i) => !members[i].length).map(boxOf), base: itemBoxes(sg),
      details: [{ path: path + SEP + g, changes: [missing(g, sg)] }] });
    if (sg.tupleN) {                                   // per-instance tuple inside a template
      const items = Array.from({ length: sg.tupleN }, () => []), rest = [];
      for (const m of members) { if (m.length === sg.tupleN) m.forEach((k, i) => items[i].push(k)); else rest.push(...m); }
      items.forEach((nodesI, i) => verify(nodesI, sg.items[i], `${path}${SEP}${g}{${i}}`, F, explain));
      if (rest.length) {
        if (sg.middle) verify(rest, sg.middle, `${path}${SEP}${g}[*]`, F, explain);
        else F.push({ type: 'count', path: path + SEP + g, head: rest.map(boxOf), base: itemBoxes(sg), details: [{ path: path + SEP + g, changes: [`${sg.tupleN} per instance → ${[...new Set(members.map((m) => m.length))].join('/')}`] }] });
      }
      continue;
    }
    const p = sg.prefix.length, s = sg.suffix.length;
    const middle = [];
    // a static item that is not there exactly, and whose fallback candidate is exactly another fixed
    // item, is missing (menu: Rename, Combine, Split -> Rename, Split is "Combine missing", not
    // "Combine became Split, Split became ...")
    const exactElsewhere = (n, item) => [...sg.prefix, ...sg.suffix].some((it) => it !== item && it.kind === 'static' && it.sig === H(n.merkle));
    const fallback = (m, k, item) => item.kind === 'static' && H(m[k].merkle) !== item.sig && exactElsewhere(m[k], item);
    const said = (item) => { const t = []; (function walk(n) { for (const k of (n && n.kids) || []) { if (t.length >= 3) return; if (k.text) t.push(k.text); else walk(k); } })(item.ex && item.ex[0]); return t.length ? ` ("${t.join(' ').slice(0, 40)}")` : ''; };
    for (const m of members) {
      if (!m.length) continue;
      // Align fixed items by shape so an insertion/removal is reported as such instead of as a
      // cascade of "changed" items (index alignment would compare every item to its neighbour).
      const g0 = path + SEP + g;
      let lo = 0, hi = m.length;
      for (let i = 0; i < p; i++) {
        let k = matchItem(m, lo, hi, sg.prefix[i], 1);
        if (k < hi && fallback(m, k, sg.prefix[i])) k = hi;
        if (k === hi) { F.push({ type: 'missing', path: `${g0}[${i}]`, base: sg.prefix[i].b0 || [], details: [{ path: `${g0}[${i}]`, changes: [`expected ${sg.prefix[i].shape.split('|')[0]}${said(sg.prefix[i])} not found`] }] }); continue; }
        for (let x = lo; x < k; x++) F.push(inserted(m[x], `${g0}[${i}]`));
        verify([m[k]], sg.prefix[i], `${g0}[${i}]`, F, explain); lo = k + 1;
      }
      for (let i = s - 1; i >= 0; i--) {
        let k = matchItem(m, hi - 1, lo - 1, sg.suffix[i], -1);
        if (k >= lo && fallback(m, k, sg.suffix[i])) k = lo - 1;
        if (k < lo) { F.push({ type: 'missing', path: `${g0}[-${s - i}]`, base: sg.suffix[i].b0 || [], details: [{ path: `${g0}[-${s - i}]`, changes: [`expected ${sg.suffix[i].shape.split('|')[0]}${said(sg.suffix[i])} not found`] }] }); continue; }
        for (let x = k + 1; x < hi; x++) F.push(inserted(m[x], `${g0}[-${s - i}]`));
        verify([m[k]], sg.suffix[i], `${g0}[-${s - i}]`, F, explain); hi = k;
      }
      if (sg.middle) middle.push(...m.slice(lo, hi));
      else for (let x = lo; x < hi; x++) F.push(inserted(m[x], `${g0}[${lo}]`));
    }
    if (middle.length) verify(middle, sg.middle, path + SEP + g + '[*]', F, explain);
  }
}

// Severity (after Daikon / FragGen): how much should a finding be trusted, given the calibration?
// A text-only change at a position calibration saw constant is a *warning* while the schema has
// fewer than STRONG_RUNS renders (a 3-way random value stays constant over s renders with
// probability 3^-(s-1); s = 6 gives < 0.01). Inside a template, an unseen combination of children
// that are all known there (an optional chip missing) is a warning too. Style changes, structural
// changes to chrome, and suspicious data are always errors.
const STRONG_RUNS = 6;
function severity(f, schema) {
  if (!f.details || !['changed', 'unknown-variant'].includes(f.type)) return 'error';
  const changes = f.details.flatMap((d) => d.changes);
  if (!changes.length) return 'error';
  if (changes.every((c) => c.startsWith('text:'))) return schema.runs < STRONG_RUNS ? 'warning' : 'error';
  // templates only (in chrome, a removed child is a regression): no child the template never had
  if (f.type === 'unknown-variant' && changes.every((c) => c.startsWith('removed child') || c.startsWith('reordered children'))) return 'warning';
  return 'error';
}

function dedupeBoxes(list) {
  const seen = new Set(), out = [];
  for (const b of list) { if (!b || !(b[2] > 0 || b[3] > 0)) continue; const k = b.join(','); if (!seen.has(k)) { seen.add(k); out.push(b); } }
  return out;
}

// Four sides changed the same way read as the shorthand: "border-radius: 16px → 12px".
const SHORTHANDS = [
  ['border-radius', ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']],
  ...['width', 'style', 'color'].map((x) => [`border-${x}`, ['top', 'right', 'bottom', 'left'].map((d) => `border-${d}-${x}`)]),
  ...['padding', 'margin'].map((x) => [x, ['top', 'right', 'bottom', 'left'].map((d) => `${x}-${d}`)]),
  ['overflow', ['overflow-x', 'overflow-y']], ['gap', ['row-gap', 'column-gap']],
];
function collapseShorthands(changes) {
  let out = changes;
  for (const [short, longs] of SHORTHANDS) {
    const vals = longs.map((p) => out.find((c) => c.startsWith(p + ': ')));
    if (vals.some((v) => !v)) continue;
    const rest = vals.map((v, i) => v.slice(longs[i].length));
    if (rest.some((r) => r !== rest[0])) continue;
    const at = out.indexOf(vals[0]);
    out = out.filter((c) => !vals.includes(c));
    out.splice(Math.min(at, out.length), 0, short + rest[0]);
  }
  return out;
}

// One finding per root cause: positions with the same explanation (a font change reaching every
// text element, one template edit showing in every row variant) are one change to review. The
// merged finding sits at the deepest common ancestor and keeps every element's boxes.
function commonPath(paths) {
  const segs = paths.map((p) => p.split(SEP));
  let k = 0;
  while (segs.every((s) => k < s.length && s[k] === segs[0][k])) k++;
  return segs[0].slice(0, Math.max(1, k)).join(SEP);
}
function aggregate(findings) {
  const groups = new Map();
  for (const f of findings) {
    const changes = [...new Set((f.details || []).flatMap((d) => d.changes))].sort();
    const k = f.severity + '|' + (changes.length ? changes.join('\n') : f.type + '|' + f.path);
    const g = groups.get(k);
    if (!g) { groups.set(k, { ...f, paths: [f.path] }); continue; }
    g.paths.push(f.path);
    g.head = g.head.concat(f.head); g.base = g.base.concat(f.base);
    if (g.type !== f.type) g.type = 'changed';
  }
  const out = [...groups.values()];
  for (const g of out) if (g.paths.length > 1) { g.path = commonPath(g.paths); g.head = dedupeBoxes(g.head); g.base = dedupeBoxes(g.base); }
  return out;
}

function check(snap, schema, { explain = true, group = true } = {}) {
  const t0 = process.hrtime.bigint();
  const root = finish(toCanon(snap, schema.opts), new Set(schema.stateClasses), schema.opts.keyMode);
  let findings = [];
  verify([root], schema.tree, root.key, findings, true);
  for (const f of findings) {
    f.severity = severity(f, schema);
    for (const side of ['head', 'base']) f[side] = dedupeBoxes(f[side] || []);
    for (const d of f.details || []) d.changes = collapseShorthands(d.changes);
  }
  if (group) findings = aggregate(findings);
  if (!explain) for (const f of findings) delete f.details;
  const errors = findings.filter((f) => f.severity === 'error').length;
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { pass: findings.length === 0, ok: errors === 0, errors, warnings: findings.length - errors, findings, ms };
}

// ------------------------------------------------------------------------------------------ digest
// A single hash of one render, relative to a schema: the Merkle root of the canonical tree with the
// schema's holes masked and template lists pooled as *sets* of facts. Two renders of the same
// fixture data get the same digest whatever the leftover nondeterminism (random tips, ids, clocks)
// the schema learned to ignore; any UI change changes it. With uncontrolled data (which variants
// appear is itself data) use check(); with fixed fixtures (CI) one string compare suffices.
function digestNodes(nodes, sn) {
  if (!nodes.length) return '0';
  if (sn.kind === 'static') return H(nodes.map((n) => n.merkle).sort().join(','));
  const holes = new Set(sn.holes);
  const facts = [...new Set(nodes.map((n) => factOf(n, holes) + (suspicious(n) ? '!' : '')))].sort();
  const gi = groupsOf(nodes);
  const gids = new Set(Object.keys(sn.groups)); gi.forEach((m) => m.forEach((_, g) => gids.add(g)));
  const parts = [];
  for (const g of [...gids].sort()) {
    const members = gi.map((m) => m.get(g) || []);
    const sg = sn.groups[g];
    if (!sg) { parts.push(g + '=new:' + H(members.flat().map((n) => n.merkle).join(','))); continue; }
    if (sg.tupleN) {
      const items = Array.from({ length: sg.tupleN }, () => []), rest = [];
      for (const m of members) { if (m.length === sg.tupleN) m.forEach((k, i) => items[i].push(k)); else rest.push(...m); }
      parts.push(g + '{' + items.map((nodesI, i) => digestNodes(nodesI, sg.items[i])).join('.') + '}/' + (rest.length ? (sg.middle ? digestNodes(rest, sg.middle) : 'extra:' + rest.length) : '-'));
      continue;
    }
    const p = sg.prefix.length, s = sg.suffix.length, fixed = [], middle = [];
    for (const m of members) {
      if (m.length < p + s) { fixed.push('short:' + m.length); continue; }
      for (let i = 0; i < p; i++) fixed.push(digestNodes([m[i]], sg.prefix[i]));
      for (let i = 0; i < s; i++) fixed.push(digestNodes([m[m.length - s + i]], sg.suffix[i]));
      middle.push(...m.slice(p, m.length - s));
    }
    parts.push(g + '=' + fixed.join('.') + '/' + (middle.length ? (sg.middle ? digestNodes(middle, sg.middle) : 'extra:' + middle.length) : '-'));
  }
  return H(facts.join(',') + '|' + parts.join(';'));
}
function digest(snap, schema) {
  const root = finish(toCanon(snap, schema.opts), new Set(schema.stateClasses), schema.opts.keyMode);
  return digestNodes([root], schema.tree);
}

module.exports = { calibrate, check, digest, boxOf };
