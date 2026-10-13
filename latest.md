### uihash learn · round 5 · 2026-10-13 18:29 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| primer-react | 57 | +30 | 2 | 27 | 2 | 26 | 0 |
| eui | 9 | +0 | 2 | 0 | 4 | 3 | 0 |
| primer-brand | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| vkui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| gravity-uikit | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| fuselage | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| retail-ui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| fluentui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| spectrum-web-components-2nd-gen | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| spectrum-web-components | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| metabase | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| porsche | 0 | +0 | 0 | 0 | 0 | 0 | 0 |

Held out of training and judged on: 0 regressions, 3 intended changes, 1 mixed. Trained on 494 PRs (467 synthetic, 27 labelled).

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 1.000 (chosen), logistic-local 0.000, trees-all 1.000.

#### Promotion gate: PASS

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| eui-held-out | 1 | 1.000 | 1.000 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 1 → 0 | 0 → 0 | pass |
| primer-react-held-out | 3 | n/a | n/a | n/a | 0 → 0 | 0 → 1 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.860 (logistic), 0.817 (trees).

**Collecting**: 1 of 10 held-out regressions and 4 of 10 held-out intended changes so far: too few to judge a model on.
