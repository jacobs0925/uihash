### uihash learn · round 9 · 2026-10-14 02:52 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +334 | 101 | 93 | 5 | 135 | 6 |
| livingwitharthritis | 76 | +76 | 15 | 51 | 6 | 4 | 0 |
| milk-me-not | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| primer-react | 183 | +0 | 12 | 61 | 7 | 103 | 0 |
| eui | 30 | +0 | 3 | 0 | 16 | 11 | 0 |
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

Held out of training and judged on: 15 regressions, 44 intended changes, 11 mixed. Trained on 266 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 0.863, logistic-local 0.878 (chosen), trees-all 0.810.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 43 | 0.424 | 0.765 | 0.158 to 0.516 | 2 → 4 | 6 → 10 | 6 → 4 | 2 → 2 | mixed: mistake side flagged: 4 vs 6 |
| eui-held-out | 1 | 1.000 | 1.000 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 1 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 15 | 0.500 | 0.857 | -0.200 to 0.800 | 1 → 1 | 0 → 0 | 2 → 1 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.778 | 0.889 | -0.250 to 0.556 | 2 → 2 | 1 → 2 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.817 (logistic), 0.720 (trees).

**Keeping the current model**: logistic-local did not pass the promotion gate: el400-held-out: mixed: mistake side flagged: 4 vs 6.
