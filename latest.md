### uihash learn · round 15 · 2026-10-14 16:52 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 93 | 5 | 135 | 6 |
| livingwitharthritis | 174 | +0 | 43 | 91 | 13 | 27 | 9 |
| milk-me-not | 846 | +170 | 225 | 294 | 15 | 312 | 6 |
| primer-react | 186 | +1 | 12 | 63 | 7 | 104 | 0 |
| eui | 81 | +0 | 3 | 9 | 38 | 31 | 3 |
| primer-brand | 5 | +5 | 0 | 4 | 0 | 1 | 0 |
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

Held out of training and judged on: 44 regressions, 118 intended changes, 44 mixed. Trained on 732 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 0.783, logistic-local 0.797 (chosen), trees-all 0.766.

#### Promotion gate: PASS

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 43 | 0.424 | 0.776 | 0.178 to 0.522 | 2 → 5 | 6 → 9 | 6 → 6 | 2 → 1 | pass |
| eui-held-out | 3 | 0.667 | 0.667 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 1 → 1 | 0 → 0 | pass |
| livingwitharthritis-held-out | 30 | 0.459 | 0.735 | 0.009 to 0.535 | 5 → 5 | 2 → 2 | 3 → 3 | 0 → 0 | pass |
| milk-me-not-held-out | 119 | 0.434 | 0.919 | 0.373 to 0.598 | 12 → 23 | 5 → 5 | 26 → 28 | 2 → 2 | pass |
| primer-react-held-out | 11 | 0.778 | 0.889 | -0.250 to 0.556 | 2 → 2 | 1 → 2 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.689 (logistic), 0.741 (trees).

**Proposing this model**: logistic-local passed the promotion gate and raises the mean held-out AUROC from 0.552 to 0.797.
