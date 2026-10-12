# learn-data

The data of uihash's triage-model training loop. The `learn` workflow on the default branch
(`.github/workflows/learn.yml`) adds to it every two hours, so don't edit it by hand. How the loop works
is in `learn/HANDOFF.md`, under "Public data".

| path | what |
|---|---|
| `<repo>/<sha>/` | one commit of a public component library from `learn/public/repos.json`; see below |
| `synthetic/<id>/` | labelled synthetic PRs on uihash's own testbeds (`learn/generate.js`): `label.json` and `summary.json.gz` |
| `models/latest/` | the latest round's model and `report.md`, its metrics, the gate's decision (`gate.json`) and the round's `summary.md` |
| `history.jsonl` | one line per round: what each repository has, what the model scored, the decision |

Each `<repo>/<sha>/` holds:

- `meta.json`: the commit's subject, files and evidence;
- `summary.json.gz`: what `uihash pr` found between the commit's Storybook and its parent's;
- `label.json` and `sides.json`, once later history says what the change was (`learn/public/label.js`);
- `failed.json`, when the commit could not be built.

The summaries describe how the stories of [primer/react](https://github.com/primer/react) (MIT) and
[elastic/eui](https://github.com/elastic/eui) (Elastic License 2.0 / SSPL) render at the commits named.
They hold uihash's findings, not the libraries' code.
