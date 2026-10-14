### uihash learn · round 10 · 2026-10-14 05:41 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 93 | 5 | 135 | 6 |
| livingwitharthritis | 165 | +89 | 39 | 92 | 11 | 23 | 3 |
| milk-me-not | 7 | +7 | 1 | 6 | 0 | 0 | 3 |
| primer-react | 185 | +2 | 12 | 63 | 7 | 103 | 0 |
| eui | 48 | +18 | 3 | 0 | 26 | 19 | 0 |
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

Held out of training and judged on: 20 regressions, 52 intended changes, 11 mixed. Trained on 327 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 0.839, logistic-local 0.843 (chosen), trees-all 0.819.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 43 | 0.424 | 0.740 | 0.138 to 0.494 | 2 → 5 | 6 → 10 | 6 → 3 | 2 → 1 | mixed: mistake side flagged: 3 vs 6 |
| eui-held-out | 1 | 1.000 | 1.000 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 1 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 28 | 0.526 | 0.744 | -0.065 to 0.500 | 5 → 5 | 2 → 2 | 2 → 2 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.778 | 0.889 | -0.250 to 0.556 | 2 → 2 | 1 → 2 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.790 (logistic), 0.735 (trees).

**Keeping the current model**: logistic-local did not pass the promotion gate: el400-held-out: mixed: mistake side flagged: 3 vs 6.
