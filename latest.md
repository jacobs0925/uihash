### uihash learn · round 12 · 2026-10-14 08:30 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 93 | 5 | 135 | 6 |
| livingwitharthritis | 165 | +0 | 39 | 92 | 11 | 23 | 3 |
| milk-me-not | 7 | +0 | 1 | 6 | 0 | 0 | 3 |
| primer-react | 185 | +0 | 12 | 63 | 7 | 103 | 0 |
| eui | 81 | +33 | 3 | 9 | 38 | 31 | 3 |
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

Held out of training and judged on: 20 regressions, 54 intended changes, 11 mixed. Trained on 334 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 0.757, logistic-local 0.761 (chosen), trees-all 0.704.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 43 | 0.424 | 0.745 | 0.142 to 0.499 | 2 → 5 | 6 → 8 | 6 → 4 | 2 → 1 | mixed: mistake side flagged: 4 vs 6 |
| eui-held-out | 3 | 0.667 | 0.667 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 1 → 1 | 0 → 0 | pass |
| livingwitharthritis-held-out | 28 | 0.526 | 0.744 | -0.065 to 0.500 | 5 → 5 | 2 → 2 | 2 → 2 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.778 | 0.889 | -0.250 to 0.556 | 2 → 2 | 1 → 2 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.797 (logistic), 0.728 (trees).

**Keeping the current model**: logistic-local did not pass the promotion gate: el400-held-out: mixed: mistake side flagged: 4 vs 6.
