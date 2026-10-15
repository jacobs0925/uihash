### uihash learn · round 20 · 2026-10-15 01:22 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 93 | 5 | 135 | 6 |
| livingwitharthritis | 174 | +0 | 43 | 91 | 13 | 27 | 13 |
| milk-me-not | 846 | +0 | 225 | 294 | 15 | 312 | 6 |
| loyal-spark | 191 | +8 | 18 | 34 | 1 | 138 | 5 |
| heartlines | 251 | +251 | 5 | 9 | 2 | 235 | 0 |
| pronghorn | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| skilla | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 98 | +0 | 3 | 16 | 41 | 38 | 3 |
| primer-brand | 33 | +0 | 1 | 27 | 0 | 5 | 0 |
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

Held out of training and judged on: 46 regressions, 130 intended changes, 46 mixed. Trained on 813 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 0.763, logistic-local 0.799, trees-all 0.815 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 43 | 0.773 | 0.789 | -0.061 to 0.097 | 5 → 9 | 9 → 6 | 5 → 8 | 1 → 1 | intended changes left alone: 7 vs 10 of 31 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 2 | n/a | n/a | n/a | 1 → 1 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 30 | 0.713 | 0.687 | -0.182 to 0.096 | 5 → 6 | 2 → 2 | 2 → 3 | 0 → 0 | pass |
| loyal-spark-held-out | 9 | 0.833 | 0.944 | 0.000 to 0.333 | 0 → 0 | 3 → 3 | 2 → 2 | 0 → 0 | pass |
| milk-me-not-held-out | 119 | 0.914 | 0.945 | 0.010 to 0.056 | 23 → 23 | 5 → 5 | 27 → 30 | 2 → 2 | pass |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.778 | -0.400 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.685 (logistic), 0.669 (trees).

**Keeping the current model**: trees-all did not pass the promotion gate: el400-held-out: intended changes left alone: 7 vs 10 of 31 (at most 1 fewer).
