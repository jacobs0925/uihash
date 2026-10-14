### uihash learn · round 19 · 2026-10-14 22:34 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 93 | 5 | 135 | 6 |
| livingwitharthritis | 174 | +0 | 43 | 91 | 13 | 27 | 12 |
| milk-me-not | 846 | +0 | 225 | 294 | 15 | 312 | 6 |
| loyal-spark | 183 | +183 | 17 | 30 | 1 | 135 | 2 |
| heartlines | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
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

Held out of training and judged on: 44 regressions, 128 intended changes, 46 mixed. Trained on 798 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 0.779, logistic-local 0.819 (chosen), trees-all 0.794.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 43 | 0.424 | 0.779 | 0.176 to 0.522 | 2 → 5 | 6 → 9 | 6 → 5 | 2 → 1 | pass |
| eui-held-out | 4 | 0.500 | 0.750 | 0.000 to 0.500 | 0 → 0 | 0 → 1 | 1 → 1 | 0 → 0 | pass |
| livingwitharthritis-held-out | 30 | 0.459 | 0.717 | -0.012 to 0.531 | 5 → 5 | 2 → 2 | 3 → 1 | 0 → 0 | mistakes flagged: 6 vs 8 of 10 (at most 1 fewer) |
| loyal-spark-held-out | 7 | 0.500 | 0.857 | 0.000 to 0.714 | 0 → 0 | 2 → 2 | 2 → 1 | 0 → 0 | pass |
| milk-me-not-held-out | 119 | 0.434 | 0.919 | 0.375 to 0.596 | 12 → 23 | 5 → 5 | 26 → 27 | 2 → 2 | pass |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.778 | 0.889 | -0.250 to 0.556 | 2 → 2 | 1 → 2 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.728 (logistic), 0.723 (trees).

**Keeping the current model**: logistic-local did not pass the promotion gate: livingwitharthritis-held-out: mistakes flagged: 6 vs 8 of 10 (at most 1 fewer).
