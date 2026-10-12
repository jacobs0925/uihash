// The accessibility tree: what a screen reader announces. A button whose aria-label was dropped, a
// section marked aria-hidden, a heading turned into plain text, a toggle that no longer reports its
// state: none of these changes a pixel or a style. Base and head render the same fixture, so their
// trees (Playwright's ARIA snapshot: role, accessible name, states, one line per node, indented by
// depth) should be identical; lines that differ are the PR's, except lines that also differ between
// two base renders of that fixture (the probe).

// Longest common subsequence of two line lists, on the window between their common prefix and suffix
// (a PR changes a few lines of a long tree). Very large windows fall back to multiset difference.
function diffLines(a, b) {
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const A = a.slice(p, a.length - s), B = b.slice(p, b.length - s);
  if (A.length * B.length > 4e6) {
    const count = (l) => l.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
    const ca = count(A), cb = count(B);
    return { removed: A.filter((x) => (cb.get(x) || 0) < (ca.get(x) || 0)), added: B.filter((x) => (ca.get(x) || 0) < (cb.get(x) || 0)) };
  }
  const L = Array.from({ length: A.length + 1 }, () => new Int32Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const removed = [], added = [];
  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) removed.push(A[i++]); else added.push(B[j++]);
  }
  while (i < A.length) removed.push(A[i++]);
  while (j < B.length) added.push(B[j++]);
  return { removed, added };
}

const node = (line) => line.trim().replace(/^- /, '').replace(/:$/, '');
const roleOf = (line) => node(line).split(/[\s"[:]/)[0];
// what only assistive technology gets: controls, landmarks, headings, dialogs, images and their names
// and states. Plain text, paragraphs, list items and table cells are drawn, and their changes are
// already reported by the visual checks.
const KEEP = new Set(['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'tablist', 'tabpanel', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
  'menuitemradio', 'combobox', 'textbox', 'searchbox', 'slider', 'spinbutton', 'option', 'listbox', 'dialog', 'alertdialog', 'heading', 'img',
  'navigation', 'main', 'banner', 'contentinfo', 'region', 'form', 'search', 'complementary', 'alert', 'status', 'progressbar', 'tooltip', 'tree',
  'treeitem', 'grid', 'table', 'list', 'group', 'toolbar']);

// -> ['button "Archive" → button (no name)', 'removed: heading "Labels" [level=3]', ...]
function ariaChanges(base, head, probe) {
  if (typeof base !== 'string' || typeof head !== 'string' || base === head) return [];
  const lines = (t) => t.split('\n').filter((l) => l.trim() && KEEP.has(roleOf(l)));
  const noise = new Set();
  if (typeof probe === 'string' && probe !== base) { const d = diffLines(lines(base), lines(probe)); for (const l of [...d.removed, ...d.added]) noise.add(node(l)); }
  const { removed, added } = diffLines(lines(base), lines(head));
  const rem = removed.filter((l) => !noise.has(node(l))), add = added.filter((l) => !noise.has(node(l)));
  const out = [];
  // a node of the same role on both sides: its name or state changed
  for (const r of [...rem]) {
    const k = add.findIndex((a) => roleOf(a) === roleOf(r));
    if (k < 0) continue;
    const a = add.splice(k, 1)[0];
    rem.splice(rem.indexOf(r), 1);
    const nameless = (l) => !/"/.test(node(l)) && /^(button|link|checkbox|radio|textbox|combobox|menuitem|tab|switch|img)\b/.test(node(l));
    out.push(`${node(r)} → ${node(a)}${nameless(a) && !nameless(r) ? ' (no accessible name)' : ''}`);
  }
  for (const r of rem) out.push(`removed: ${node(r)}`);
  for (const a of add) out.push(`added: ${node(a)}`);
  return out;
}

module.exports = { ariaChanges, diffLines };
