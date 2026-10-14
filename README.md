# learn-gold

The gold set for uihash's triage model: 140 commits a person labels as regression, intended or can't tell,
from the same before/after crops a vision judge sees. `learn/gold-pack.py` packs each walked commit here
(`<repo>/<sha>/`: `summary.json`, `meta.json`, the history label `label.json` if any, and the crops the judge
is shown, as JPEG); the `judge-gold` workflow adds `judge-<model>.json`; `learn/gold.js` scores every
labeller against the person's labels. See learn/HANDOFF.md on `main`, "Labels for what is visible".

Commits come from public, openly licensed repositories walked by the learn loop (learn/public/repos.json).
The person's labels are not stored here.
