### uihash learn · round 14 · 2026-10-14 14:04 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 93 | 5 | 135 | 6 |
| livingwitharthritis | 174 | +0 | 43 | 91 | 13 | 27 | 7 |
| milk-me-not | 676 | +312 | 142 | 237 | 12 | 285 | 3 |
| primer-react | 185 | +0 | 12 | 63 | 7 | 103 | 0 |
| eui | 81 | +0 | 3 | 9 | 38 | 31 | 3 |
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

Held out of training and judged on: 34 regressions, 103 intended changes, 32 mixed. Trained on 625 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 0.772, logistic-local 0.791 (chosen), trees-all 0.713.

#### Promotion gate: PASS

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 43 | 0.424 | 0.777 | 0.190 to 0.529 | 2 → 6 | 6 → 8 | 6 → 6 | 2 → 1 | pass |
| eui-held-out | 3 | 0.667 | 0.667 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 1 → 1 | 0 → 0 | pass |
| livingwitharthritis-held-out | 30 | 0.459 | 0.739 | 0.021 to 0.541 | 5 → 5 | 2 → 2 | 3 → 3 | 0 → 0 | pass |
| milk-me-not-held-out | 82 | 0.442 | 0.883 | 0.276 to 0.589 | 6 → 13 | 2 → 1 | 17 → 19 | 2 → 2 | pass |
| primer-react-held-out | 11 | 0.778 | 0.889 | -0.250 to 0.556 | 2 → 2 | 1 → 2 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.719 (logistic), 0.715 (trees).

**Proposing this model**: logistic-local passed the promotion gate and raises the mean held-out AUROC from 0.554 to 0.791.
