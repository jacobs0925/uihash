### uihash learn · round 97 · 2026-10-21 14:03 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 98 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 834 | +0 | 11 | 39 | 13 | 771 | 68 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 654 | +52 | 112 | 122 | 25 | 395 | 30 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 99 | +0 | 3 | 17 | 41 | 38 | 3 |
| primer-brand | 100 | +0 | 2 | 61 | 14 | 23 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 21 |
| vkui | 72 | +0 | 1 | 12 | 12 | 47 | 0 |
| gravity-uikit | 79 | +0 | 2 | 14 | 24 | 39 | 9 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 36 | +0 | 3 | 10 | 2 | 21 | 3 |
| fluentui | 47 | +0 | 0 | 13 | 0 | 34 | 9 |
| spectrum-web-components-2nd-gen | 54 | +0 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 4 | +0 | 0 | 2 | 0 | 2 | 1 |
| metabase | 71 | +0 | 1 | 22 | 15 | 33 | 6 |
| porsche | 43 | +0 | 0 | 35 | 1 | 7 | 0 |

Held out of training and judged on: 64 regressions, 279 intended changes, 66 mixed. Trained on 1562 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.695, unseen 0.691; logistic-local 0.672, unseen 0.695; trees-all 0.666, unseen 0.696 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 50 | 0.489 | 0.703 | 0.109 to 0.350 | 4 → 3 | 13 → 18 | 8 → 7 | 0 → 2 | mistakes flagged: 10 vs 12 of 24 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.777 | -0.071 to 0.094 | 5 → 2 | 9 → 10 | 5 → 6 | 1 → 2 | mistakes flagged: 8 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.698 | -0.053 to 0.096 | 6 → 7 | 29 → 31 | 4 → 3 | 2 → 3 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.568 | -0.192 to 0.053 | 6 → 6 | 11 → 11 | 7 → 3 | 1 → 1 | mistakes flagged: 9 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.709 | -0.026 to 0.221 | 2 → 1 | 12 → 12 | 7 → 2 | 1 → 1 | mistakes flagged: 3 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.749 | -0.050 to 0.160 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 3 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| porsche-held-out | 7 | n/a | n/a | n/a | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | -0.250 to 0.250 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.300 | -0.889 to -0.300 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | AUROC worse: 0.300 vs 0.900 (95 % interval of the difference -0.889 to -0.300) |
| pronghorn-held-out | 17 | 0.735 | 0.882 | 0.000 to 0.353 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 3 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.651 (logistic), 0.641 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 112 | 183 | 0.627 |
| el400 | 101 | 130 | 0.726 |
| eui | 3 | 20 | 0.392 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.538 |
| gravity-uikit | 2 | 16 | 0.750 |
| heartlines | 174 | 290 | 0.646 |
| livingwitharthritis | 94 | 194 | 0.741 |
| loyal-spark | 60 | 152 | 0.680 |
| metabase | 1 | 23 | 0.348 |
| milk-me-not | 66 | 231 | 0.728 |
| porsche | 0 | 35 | n/a |
| primer-brand | 2 | 63 | 0.532 |
| primer-react | 12 | 67 | 0.733 |
| primerate | 11 | 45 | 0.675 |
| pronghorn | 23 | 73 | 0.761 |
| retail-ui | 3 | 11 | 0.682 |
| skilla | 12 | 51 | 0.646 |
| spectrum-web-components | 0 | 2 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 0.867 |
| vkui | 1 | 12 | 0.583 |

Mean 0.696, lowest 0.627: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 10 vs 12 of 24 (at most 1 fewer) / el400-held-out: mistakes flagged: 8 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 9 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 3 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) / primerate-held-out: AUROC worse: 0.300 vs 0.900 (95 % interval of the difference -0.889 to -0.300).
