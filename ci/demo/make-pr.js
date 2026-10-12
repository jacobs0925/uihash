// Build a demo "pull request": base = the testbed apps as they are, head = the same apps with a
// handful of deliberate UI changes (and one refactor that must NOT be flagged).
// Usage: node make-pr.js <outDir>   -> <outDir>/base/{mailbox,dashboard}, <outDir>/head/{...}
const fs = require('fs');
const path = require('path');
const out = process.argv[2];
const src = path.join(__dirname, '..', '..', 'experiments');
const EDITS = {
  mailbox: [
    ['.compose { display: inline-flex; align-items: center; gap: 12px; height: 56px; padding: 0 24px 0 16px; border-radius: 16px;',
     '.compose { display: inline-flex; align-items: center; gap: 12px; height: 56px; padding: 0 24px 0 16px; border-radius: 12px;'],   // 1. CTA radius
    ['--row-unread: #ffffff;', '--row-unread: #fbfdff;'],                                                                        // 2. unread row tint
    ["const toolbarBtns = MUT.has('toolbar-order') ? ['more', 'refresh'] : ['refresh', 'more'];",
     "const toolbarBtns = MUT.has('toolbar-order') ? ['more', 'refresh'] : ['refresh', 'draft', 'more'];"],                      // 3. new toolbar button
    ['<a href="#">Program Policies</a>', '<a href="#">Program policies</a>'],                                                   // 4. copy change
    ["<div class=\"${C('storage')}\">", "<div class=\"${C('storage')}\"><div style=\"display:contents\">"],                    // refactor: no-op wrapper ...
    ["<span>${storage.used} GB of ${storage.total} GB used</span></div>", "<span>${storage.used} GB of ${storage.total} GB used</span></div></div>"], // ... closed
  ],
  dashboard: [
    ['.kpi .value { font-size: 26px; font-weight: 700; margin: 6px 0; }', '.kpi .value { font-size: 24px; font-weight: 700; margin: 6px 0; }'], // 5. KPI size
  ],
};
for (const app of ['mailbox', 'dashboard']) {
  const html = fs.readFileSync(path.join(src, app, 'index.html'), 'utf8');
  let head = html;
  for (const [a, b] of EDITS[app]) { if (!head.includes(a)) throw new Error(`edit not applicable in ${app}: ${a.slice(0, 60)}`); head = head.replace(a, b); }
  for (const [side, content] of [['base', html], ['head', head]]) {
    fs.mkdirSync(path.join(out, side, app), { recursive: true });
    fs.writeFileSync(path.join(out, side, app, 'index.html'), content);
  }
}
console.log('demo PR written to', out);
