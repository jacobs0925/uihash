// Features of a finding for the triage model: what kind of change it is, which properties, how big,
// where it comes from (CSS attribution), what it breaks or takes away, and the PR around it. The
// same function runs at training time (on summary.json files) and at check time (src/model.js).
const LAYOUT_KIND = /^(layout: [a-z ,]+|accessibility tree|text contrast|no longer matches its siblings|colours now hard to tell apart|no longer told apart|states no longer shown|hover feedback|only some instances changed|round trip[a-z ]*)/;
const PROP_GROUPS = [
  ['colour', /^(color|background-color|background|fill|stroke|border-[a-z-]*color|outline-color|caret-color|text-decoration-color|accent-color|--)/],
  ['radius', /radius/], ['shadow', /shadow/],
  ['spacing', /^(margin|padding|gap|row-gap|column-gap)/],
  ['size', /^(width|height|min-|max-|inline-size|block-size|flex-basis|aspect-ratio)/],
  ['type', /^(font|letter-spacing|line-height|text-transform|text-decoration|word-spacing|white-space|text-align|text-indent|text-overflow)/],
  ['position', /^(top|left|right|bottom|z-index|position|transform|translate|scale|rotate|order|float|inset)/],
  ['display', /^(display|visibility|opacity|overflow|clip|content-visibility|pointer-events|cursor)/],
  ['flex', /^(flex|align|justify|grid|place-)/],
  ['border', /^(border|outline)/],
];
const lev = (a, b) => { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; };
const BROKEN = /\b(undefined|NaN|null|N\/A)\b|\[object Object\]|\{\{|\$\{/;
// typing slips: two neighbouring letters swapped, or a letter replaced by a key next to it
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const near = (x, y) => { for (let r = 0; r < 3; r++) { const i = ROWS[r].indexOf(x); if (i < 0) continue; for (let q = Math.max(0, r - 1); q <= Math.min(2, r + 1); q++) { const j = ROWS[q].indexOf(y); if (j >= 0 && Math.abs(j - i) <= 1) return true; } } return false; };
function slip(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  if (a.length === b.length) {
    const d = [...a].map((c, i) => i).filter((i) => a[i] !== b[i]);
    if (d.length === 2 && d[1] === d[0] + 1 && a[d[0]] === b[d[1]] && a[d[1]] === b[d[0]]) return 'swap';
    if (d.length === 1 && near(a[d[0]], b[d[0]])) return 'near-key';
  }
  if (Math.abs(a.length - b.length) === 1) { const [l, s] = a.length > b.length ? [a, b] : [b, a]; for (let i = 0; i < l.length; i++) if (l.slice(0, i) + l.slice(i + 1) === s) return l[i] === l[i - 1] || l[i] === l[i + 1] ? 'doubled' : 'dropped'; }
  return null;
}

function textFeatures(changes, x) {
  for (const c of changes) {
    const m = /^text: "(.*)" → "(.*)"/.exec(c);
    if (!m) continue;
    const [a, b] = [m[1], m[2]];
    x.text_change = 1;
    if (a.toLowerCase() === b.toLowerCase()) { x.text_case_only = 1; continue; }
    if (/\d/.test(a + b) && a.replace(/[\d.,]+/g, '#') === b.replace(/[\d.,]+/g, '#')) { x.text_numbers_only = 1; continue; }
    if (BROKEN.test(b) && !BROKEN.test(a)) x.text_broken_value = 1;
    const wa = a.split(/\s+/), wb = b.split(/\s+/);
    if (wa.length === wb.length) {
      const diffs = wa.map((w, i) => [w, wb[i]]).filter(([p, q]) => p !== q);
      const ed = Math.max(0, ...diffs.map(([p, q]) => lev(p.toLowerCase(), q.toLowerCase())));
      const len = Math.max(1, ...diffs.map(([p]) => p.length));
      x.text_word_edit = Math.min(ed, 6);
      if (diffs.length === 1 && ed <= 2 && len >= 4) x.text_typo_like = 1;
      if (diffs.length === 1) { const k = slip(diffs[0][0], diffs[0][1]); if (k) x['text_slip=' + k] = 1; }
    } else x.text_words_changed = 1;
  }
}

// rows: one per fresh finding of a summary.json, with the PR-level context each finding needs
function findingsOf(s) {
  const all = s.pages.flatMap((p) => p.findings.filter((f) => !f.sameAs && f.type !== 'coverage').map((f) => ({ p, f })));
  const edits = Math.max(0, ...s.pages.map((p) => (p.edits || []).length));
  const byEdit = {};
  for (const { f } of all) for (const e of (f.cause && f.cause.edits) || []) byEdit[e] = (byEdit[e] || 0) + 1;
  const types = new Set(all.map(({ f }) => f.type));
  const hot = all.filter(({ f }) => f.triage === 'breaks' || f.triage === 'check').length;
  return all.map(({ p, f }) => {
    const x = { bias: 1 };
    x['type=' + f.type] = 1;
    const kind = (LAYOUT_KIND.exec(f.path) || [])[1];
    if (kind) x['kind=' + kind.trim()] = 1;
    x['triage=' + (f.triage || 'none')] = 1;
    if (f.severity === 'warning') x.warning = 1;
    if (f.visible === false) x.no_pixel_change = 1;
    if (p.forced) x.forced_state = 1;
    const c = f.cause || {};
    x['cause=' + (c.css || 'none')] = 1;
    for (const r of Object.values(c.reach || {})) x['reach=' + r] = 1;
    if (c.beats) x.beats_important = 1;
    const shared = Math.max(0, ...((c.edits || []).map((e) => byEdit[e] || 0)));
    x.edit_shared_log = Math.log1p(shared);
    x.n_changes_log = Math.log1p(f.changes.length);
    x.elements_log = Math.log1p(f.elements || 1);
    x.places_log = Math.log1p(f.places || 1);
    let dE = 0, rel = 0, dpx = 0;
    for (const ch of f.changes) {
      const prop = (/^([a-z-]+|@[a-z]+|--[a-z0-9-]+):/.exec(ch) || [])[1];
      if (prop) for (const [g, re] of PROP_GROUPS) if (re.test(prop)) x['prop=' + g] = 1;
      if (prop && prop.startsWith('@')) x['attr=' + prop] = 1;
      if (/^(added child|removed child|added:|removed:|added \(|missing:|new )/.test(ch)) x['struct=' + ch.split(/[ :(]/)[0] + (ch.startsWith('added child') || ch.startsWith('removed child') ? '_child' : '')] = 1;
      const e = /ΔE00 ([\d.]+)/.exec(ch); if (e) dE = Math.max(dE, +e[1]);
      const m = /(-?[\d.]+)px → (-?[\d.]+)px/.exec(ch); if (m) { const [a, b] = [+m[1], +m[2]]; dpx = Math.max(dpx, Math.abs(b - a)); rel = Math.max(rel, Math.abs(b - a) / Math.max(Math.abs(a), 1)); }
      if (/ → ∅$/.test(ch)) x.value_removed = 1;
      if (/^∅ → |: ∅ → /.test(ch)) x.value_added = 1;
      if (/!important/.test(ch)) x.important = 1;
      const ct = /([\d.]+):1 → ([\d.]+):1/.exec(ch); if (ct) { x.contrast_before = +ct[1]; x.contrast_after = +ct[2]; }
      if (BROKEN.test(ch.split('→').pop() || '')) x.broken_value = 1;
    }
    x.dE = Math.min(dE, 60) / 10;
    x.dpx_log = Math.log1p(dpx);
    x.rel_size = Math.min(rel, 5);
    textFeatures(f.changes, x);
    x.pr_findings_log = Math.log1p(all.length);
    x.pr_types = types.size;
    x.pr_hot_share = all.length ? hot / all.length : 0;
    x.pr_edits_log = Math.log1p(edits);
    return { p, f, x };
  });
}

module.exports = { findingsOf, lev };
