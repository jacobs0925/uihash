// States nobody configured: what each control on a page does when clicked. The controls of a page
// (buttons, links within the page, role=button/menuitem/tab/..., checkboxes, and anything drawn with
// cursor: pointer) are listed in the base and in the head and paired by identity: their path of tags
// and classes, their label, and the occurrence of that pair. Each paired control becomes a quick
// target (the page after clicking it, same fixture on both sides), so a menu, dialog or panel that
// broke is compared like any configured state, and a control that changed the page in the base and
// does nothing in the head is reported as dead (crawling a GUI to compare versions: Crawljax and the
// state-flow-graph regression work after it).

// In the page: the clickable controls, outermost first, in document order.
const LIST = `window.__uihashClickables = function () {
  const SEL = 'a[href], button, summary, input[type=checkbox], input[type=radio], [role=button], [role=link], [role=menuitem], [role=menuitemcheckbox], [role=tab], [role=checkbox], [role=switch], [role=option], [onclick]';
  const cand = [];
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (!(el.matches(SEL) || cs.cursor === 'pointer')) continue;
    if (el.disabled || el.closest('[inert]') || (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (el.tagName === 'A') { const h = el.getAttribute('href') || ''; if (h && !h.startsWith('#') && !h.startsWith('javascript:')) continue; }   // navigation: another page
    cand.push(el);
  }
  const set = new Set(cand), out = [], seen = new Map();
  for (const el of cand) {
    let p = el.parentElement, inner = false;
    while (p) { if (set.has(p)) { inner = true; break; } p = p.parentElement; }
    if (inner) continue;
    const path = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) path.unshift(e.tagName.toLowerCase() + [...e.classList].filter((c) => !/\\d{3}|^(on|active|open|sel|selected|current|is-|has-)/.test(c)).slice(0, 2).map((c) => '.' + c).join(''));
    const label = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
    const key = path.join(' > ') + '|' + label, n = seen.get(key) || 0;
    seen.set(key, n + 1);
    out.push({ id: key + '#' + n, label, tag: path[path.length - 1], el });
  }
  return out;
};`;

async function listControls(page) {
  await page.evaluate(LIST);
  return page.evaluate(() => window.__uihashClickables().map(({ id, label, tag }) => ({ id, label, tag })));
}
// mark the control with this identity so Playwright can click it (actionability checks included)
async function markControl(page, id) {
  await page.evaluate(LIST);
  const ok = await page.evaluate((id) => {
    for (const x of document.querySelectorAll('[data-uihash-pick]')) x.removeAttribute('data-uihash-pick');
    const c = window.__uihashClickables().find((x) => x.id === id);
    if (c) c.el.setAttribute('data-uihash-pick', '');
    return !!c;
  }, id);
  if (!ok) throw new Error('no such control: ' + id.split('|').pop());
  return '[data-uihash-pick]';
}

module.exports = { listControls, markControl };
