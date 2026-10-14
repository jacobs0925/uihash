### uihash learn · round 7 · 2026-10-14 00:05 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| primer-react | 183 | +47 | 12 | 61 | 7 | 103 | 0 |
| eui | 30 | +21 | 3 | 0 | 16 | 11 | 0 |
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

Held out of training and judged on: 2 regressions, 9 intended changes, 1 mixed. Trained on 64 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 0.944 (chosen), logistic-local 0.944, trees-all 0.889.

#### Promotion gate: PASS

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| eui-held-out | 1 | 1.000 | 1.000 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 1 → 1 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.778 | 0.889 | -0.250 to 0.556 | 2 → 2 | 1 → 2 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.373 (logistic), 0.742 (trees).

**Collecting**: 3 of 10 held-out regressions and 10 of 10 held-out intended changes so far: too few to judge a model on.
