### uihash learn · round 17 · 2026-10-14 19:46 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 93 | 5 | 135 | 6 |
| livingwitharthritis | 174 | +0 | 43 | 91 | 13 | 27 | 10 |
| milk-me-not | 846 | +0 | 225 | 294 | 15 | 312 | 6 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 98 | +17 | 3 | 16 | 41 | 38 | 3 |
| primer-brand | 33 | +28 | 1 | 27 | 0 | 5 | 0 |
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

Held out of training and judged on: 44 regressions, 123 intended changes, 44 mixed. Trained on 758 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 0.796, logistic-local 0.808 (chosen), trees-all 0.798.

#### Promotion gate: PASS

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 43 | 0.424 | 0.773 | 0.180 to 0.514 | 2 → 5 | 6 → 9 | 6 → 5 | 2 → 1 | pass |
| eui-held-out | 4 | 0.500 | 0.750 | 0.000 to 0.500 | 0 → 0 | 0 → 1 | 1 → 1 | 0 → 0 | pass |
| livingwitharthritis-held-out | 30 | 0.459 | 0.713 | -0.020 to 0.528 | 5 → 5 | 2 → 2 | 3 → 2 | 0 → 0 | pass |
| milk-me-not-held-out | 119 | 0.434 | 0.914 | 0.370 to 0.593 | 12 → 23 | 5 → 5 | 26 → 27 | 2 → 2 | pass |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.778 | 0.889 | -0.250 to 0.556 | 2 → 2 | 1 → 2 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.719 (logistic), 0.740 (trees).

**Proposing this model**: logistic-local passed the promotion gate and raises the mean held-out AUROC from 0.519 to 0.808.
