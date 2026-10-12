// How good is a repository's history as training data for uihash's triage model? One year of main, from git alone:
// style-changing commits, reverts, fix-ups, visual-baseline updates, changesets, stories, visual-test tooling.
// Usage: git clone --filter=blob:none --no-checkout --single-branch --shallow-since=<date> <url> <dir>; node learn/public/assess.js <dir> [...]
const { execFileSync } = require('child_process');
const git = (dir, args, opts = {}) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });

const STYLE = /\.(css|scss|sass|less|styl)$|\.css\.(ts|js)$|(^|\/)(styles?|theme|themes|tokens|recipes?)(\/|\.|$)|\.styles?\.(ts|tsx|js|jsx)$|\.recipe\.(ts|js)$|Styles?\.(ts|tsx|js)$|styled\.(ts|tsx|js)$/i;
const SNAP = /(__image_snapshots__|-snapshots\/|\/snapshots?\/|__screenshots__|\.loki\/|\/vrt\/|visual).*\.(png|jpe?g)$/i;
const STORY = /\.stories\.(tsx?|jsx?|mdx|svelte|vue)$/;

function assess(dir) {
  const raw = git(dir, ['log', '--no-merges', '--format=@@%H%x09%ad%x09%s', '--date=short', '--name-only']);
  const commits = [];
  for (const block of raw.split('@@').slice(1)) {
    const [head, ...files] = block.trim().split('\n');
    const [sha, date, subject] = head.split('\t');
    commits.push({ sha, date, subject, files: files.filter(Boolean), pr: (/\(#(\d+)\)\s*$/.exec(subject) || [])[1] });
  }
  commits.reverse();                                     // oldest first
  const style = commits.filter((c) => c.files.some((f) => STYLE.test(f)) && !/^revert/i.test(c.subject));
  // reverts: name the commit they undo (by PR number or quoted subject)
  const reverts = commits.filter((c) => /^revert/i.test(c.subject));
  const reverted = new Set();
  for (const r of reverts) {
    const q = /^Revert\s+"(.+?)(?: \(#\d+\))?"/i.exec(r.subject);
    const hit = commits.find((c) => c !== r && q && c.subject.startsWith(q[1]));
    if (hit) reverted.add(hit.sha);
  }
  // fix-ups: a later commit within 14 days, titled as a fix, touching one of the same style files
  const day = (d) => Date.parse(d) / 864e5;
  const fixed = new Set();
  for (let i = 0; i < style.length; i++) {
    const a = style[i], sf = new Set(a.files.filter((f) => STYLE.test(f)));
    for (let j = i + 1; j < style.length && day(style[j].date) - day(a.date) <= 14; j++) {
      const b = style[j];
      if (/\bfix|regression|broken|revert|restore/i.test(b.subject) && b.files.some((f) => sf.has(f))) { fixed.add(a.sha); break; }
    }
  }
  const snapUpdates = commits.filter((c) => c.files.some((f) => SNAP.test(f)));
  const changesets = commits.filter((c) => c.files.some((f) => /^\.changeset\/.*\.md$/.test(f)));
  const styleWithChangeset = style.filter((c) => c.files.some((f) => /^\.changeset\/.*\.md$/.test(f)));
  const head = git(dir, ['rev-parse', 'HEAD']).trim();
  const tree = git(dir, ['ls-tree', '-r', '--name-only', head]).split('\n');
  const stories = tree.filter((f) => STORY.test(f)).length;
  const storybook = tree.some((f) => /(^|\/)\.storybook\/main\.(ts|js|cjs|mjs)$/.test(f));
  // visual-testing tools named in the root package.json and CI workflows
  const files = ['package.json', ...tree.filter((f) => /^\.github\/workflows\/.*\.ya?ml$/.test(f))];
  let text = '';
  for (const f of files.slice(0, 40)) { try { text += git(dir, ['show', `${head}:${f}`]); } catch (e) { /* lazy fetch failed */ } }
  const tools = ['chromatic', 'percy', 'argos', 'loki', 'lost-pixel', 'happo', 'reg-suit', 'backstopjs', 'toHaveScreenshot', 'playwright'].filter((t) => text.toLowerCase().includes(t.toLowerCase()));
  return {
    repo: dir.split('/').pop(), commits: commits.length, prs: commits.filter((c) => c.pr).length, style: style.length,
    reverted: [...reverted].filter((s) => style.some((c) => c.sha === s)).length, fixedSoon: fixed.size, snapUpdates: snapUpdates.length,
    changesets: changesets.length, styleWithChangeset: styleWithChangeset.length, stories, storybook, tools,
    first: commits[0] && commits[0].date, last: commits[commits.length - 1] && commits[commits.length - 1].date,
  };
}

const rows = process.argv.slice(2).map((d) => { try { return assess(d); } catch (e) { return { repo: d, error: e.message.split('\n')[0] }; } });
console.log('| repo | commits (1 yr) | style-changing | reverted | fixed within 14 days | visual-baseline updates | changesets (style PRs with one) | stories | Storybook | visual-test tooling |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  if (r.error) { console.log(`| ${r.repo} | error: ${r.error} |`); continue; }
  console.log(`| ${r.repo} | ${r.commits} | ${r.style} | ${r.reverted} | ${r.fixedSoon} (${(100 * r.fixedSoon / Math.max(1, r.style)).toFixed(0)} %) | ${r.snapUpdates} | ${r.changesets} (${r.styleWithChangeset}) | ${r.stories} | ${r.storybook ? 'yes' : 'no'} | ${r.tools.join(', ') || '—'} |`);
}
