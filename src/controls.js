// The controls a page offers (buttons, links, fields, tabs, menu items), by role and label, from a raw
// snapshot; and the difference between two pages. Meant for "did the rebuilt UI drop anything the old
// one had?": render the old UI and the new one on the same data and compare. A control's label is
// its aria-label, else its text, else placeholder / title / alt / name. Content hidden with
// display: none is not in a snapshot unless it was taken with { latent: true } (closed menus).
const INTERACTIVE = new Set(['a', 'button', 'input', 'select', 'textarea', 'summary']);
const ROLES = new Set(['button', 'link', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'checkbox', 'switch', 'option', 'radio',
  'combobox', 'textbox', 'searchbox', 'slider']);
const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
const textIn = (n) => (n.c || []).map((c) => (typeof c === 'string' ? c : c.x ? '' : textIn(c))).join(' ');

function roleOf(n) {
  const a = n.a || {};
  if (a.role && ROLES.has(a.role)) return a.role;
  if (!INTERACTIVE.has(n.t)) return null;
  if (n.t === 'a') return a.href !== undefined ? 'link' : null;
  if (n.t === 'input') return a.type === 'checkbox' || a.type === 'radio' ? a.type : a.type === 'button' || a.type === 'submit' ? 'button' : 'field';
  if (n.t === 'textarea') return 'field';
  return n.t;                                                   // button, select, summary
}

function controlsOf(snap) {
  const out = [];
  (function walk(n) {
    if (!n || typeof n !== 'object' || n.x) return;
    const role = roleOf(n);
    if (role) {
      const a = n.a || {};
      out.push({ role, label: norm(a['aria-label'] || textIn(n) || a.placeholder || a.title || a.alt || a.name || ''), box: n.b || null });
      return;                                                     // what is inside a control is its label
    }
    for (const c of n.c || []) walk(c);
  })(snap.root);
  return out;
}

// -> { removed: ['button: Download all files', ...], added: [...] } (with ×n when one of several went)
function controlsDiff(oldSnap, newSnap) {
  const key = (c) => `${c.role}: ${c.label || '(no label)'}`;
  const count = (list) => { const m = new Map(); for (const c of list) m.set(key(c), (m.get(key(c)) || 0) + 1); return m; };
  const A = count(controlsOf(oldSnap)), B = count(controlsOf(newSnap));
  const lost = (X, Y) => [...X].filter(([k, n]) => (Y.get(k) || 0) < n).map(([k, n]) => k + (n - (Y.get(k) || 0) > 1 ? ` ×${n - (Y.get(k) || 0)}` : ''));
  return { removed: lost(A, B), added: lost(B, A) };
}

module.exports = { controlsOf, controlsDiff };
