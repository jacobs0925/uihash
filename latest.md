### uihash learn · round 129 · 2026-10-24 21:13 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 140 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 1624 | +0 | 48 | 109 | 24 | 1443 | 85 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 774 | +0 | 120 | 137 | 28 | 489 | 66 |
| primer-react | 188 | +0 | 12 | 65 | 7 | 104 | 0 |
| eui | 99 | +0 | 3 | 17 | 41 | 38 | 3 |
| primer-brand | 104 | +0 | 2 | 61 | 17 | 24 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 51 |
| vkui | 72 | +0 | 1 | 12 | 12 | 47 | 0 |
| gravity-uikit | 79 | +0 | 2 | 14 | 24 | 39 | 9 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 37 | +0 | 3 | 10 | 2 | 22 | 3 |
| fluentui | 47 | +0 | 0 | 13 | 0 | 34 | 10 |
| spectrum-web-components-2nd-gen | 54 | +0 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 6 | +0 | 0 | 3 | 0 | 3 | 1 |
| metabase | 72 | +0 | 1 | 22 | 15 | 34 | 6 |
| porsche | 43 | +0 | 0 | 35 | 1 | 7 | 0 |

Held out of training and judged on: 68 regressions, 306 intended changes, 69 mixed. Trained on 1661 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.718, unseen 0.694 (chosen); logistic-local 0.702, unseen 0.690; trees-all 0.690, unseen 0.690.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 56 | 0.525 | 0.723 | 0.082 to 0.332 | 4 → 3 | 16 → 19 | 8 → 8 | 0 → 2 | pass |
| el400-held-out | 42 | 0.765 | 0.800 | -0.040 to 0.117 | 5 → 0 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 4 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.683 | -0.070 to 0.082 | 6 → 7 | 29 → 31 | 4 → 3 | 2 → 4 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.604 | -0.124 to 0.066 | 6 → 6 | 11 → 12 | 7 → 3 | 1 → 2 | mistakes flagged: 9 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.751 | 0.004 to 0.277 | 2 → 1 | 12 → 12 | 7 → 3 | 1 → 2 | mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.742 | -0.068 to 0.154 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| porsche-held-out | 7 | n/a | n/a | n/a | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.778 | -0.556 to 0.250 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 39 | 0.534 | 0.634 | -0.184 to 0.419 | 1 → 1 | 21 → 24 | 2 → 0 | 2 → 2 | mistakes flagged: 1 vs 3 of 9 (at most 1 fewer) |
| pronghorn-held-out | 17 | 0.735 | 0.941 | 0.000 to 0.471 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 3 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.657 (logistic), 0.644 (trees).

#### Unseen repositories (logistic-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 120 | 202 | 0.656 |
| el400 | 101 | 130 | 0.732 |
| eui | 3 | 20 | 0.475 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.346 |
| gravity-uikit | 2 | 16 | 0.594 |
| heartlines | 174 | 290 | 0.669 |
| livingwitharthritis | 94 | 194 | 0.740 |
| loyal-spark | 60 | 152 | 0.676 |
| metabase | 1 | 23 | 0.609 |
| milk-me-not | 66 | 231 | 0.722 |
| porsche | 0 | 35 | n/a |
| primer-brand | 2 | 63 | 0.691 |
| primer-react | 12 | 69 | 0.749 |
| primerate | 48 | 127 | 0.630 |
| pronghorn | 23 | 73 | 0.740 |
| retail-ui | 3 | 11 | 0.636 |
| skilla | 12 | 51 | 0.627 |
| spectrum-web-components | 0 | 3 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 0.933 |
| vkui | 1 | 12 | 0.583 |

Mean 0.694, lowest 0.627: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-all did not pass the promotion gate: el400-held-out: mistakes flagged: 4 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 9 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) / primerate-held-out: mistakes flagged: 1 vs 3 of 9 (at most 1 fewer).
