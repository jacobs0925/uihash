### uihash learn · round 76 · 2026-10-19 14:57 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 74 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 798 | +6 | 14 | 43 | 4 | 737 | 42 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 400 | +66 | 62 | 91 | 19 | 228 | 8 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 99 | +0 | 3 | 17 | 41 | 38 | 3 |
| primer-brand | 98 | +0 | 2 | 61 | 12 | 23 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 3 |
| vkui | 20 | +0 | 0 | 3 | 4 | 13 | 0 |
| gravity-uikit | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| fuselage | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| retail-ui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| fluentui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| spectrum-web-components-2nd-gen | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| spectrum-web-components | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| metabase | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| porsche | 0 | +0 | 0 | 0 | 0 | 0 | 0 |

Held out of training and judged on: 61 regressions, 242 intended changes, 62 mixed. Trained on 1379 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.635, unseen 0.682 (chosen); logistic-local 0.637, unseen 0.679; trees-all 0.635, unseen 0.680.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 37 | 0.460 | 0.642 | 0.066 to 0.333 | 2 → 1 | 8 → 13 | 6 → 5 | 0 → 1 | mistakes flagged: 6 vs 8 of 18 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.803 | -0.042 to 0.122 | 5 → 0 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 4 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.702 | -0.053 to 0.102 | 6 → 6 | 29 → 35 | 4 → 1 | 2 → 4 | mistakes flagged: 7 vs 10 of 31 (at most 1 fewer) |
| livingwitharthritis-held-out | 48 | 0.629 | 0.595 | -0.132 to 0.057 | 6 → 6 | 11 → 12 | 7 → 3 | 1 → 2 | mistakes flagged: 9 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.762 | 0.015 to 0.282 | 2 → 1 | 12 → 12 | 7 → 3 | 1 → 2 | mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.713 | -0.100 to 0.124 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.722 | -0.556 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.350 | -0.889 to -0.125 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | AUROC worse: 0.350 vs 0.900 (95 % interval of the difference -0.889 to -0.125) |
| pronghorn-held-out | 17 | 0.735 | 0.912 | 0.000 to 0.471 | 0 → 0 | 5 → 5 | 1 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.286 | 0.000 to 0.375 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.636 (logistic), 0.617 (trees).

#### Unseen repositories (logistic-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 62 | 126 | 0.556 |
| el400 | 101 | 130 | 0.744 |
| eui | 3 | 20 | 0.525 |
| heartlines | 174 | 290 | 0.667 |
| livingwitharthritis | 94 | 194 | 0.741 |
| loyal-spark | 60 | 152 | 0.693 |
| milk-me-not | 66 | 231 | 0.715 |
| primer-brand | 2 | 63 | 0.698 |
| primer-react | 12 | 67 | 0.716 |
| primerate | 14 | 49 | 0.602 |
| pronghorn | 23 | 73 | 0.756 |
| skilla | 12 | 51 | 0.627 |
| vkui | 0 | 3 | n/a |

Mean 0.682, lowest 0.556: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-all did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 6 vs 8 of 18 (at most 1 fewer) / el400-held-out: mistakes flagged: 4 vs 10 of 20 (at most 1 fewer) / heartlines-held-out: mistakes flagged: 7 vs 10 of 31 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 9 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) / primerate-held-out: AUROC worse: 0.350 vs 0.900 (95 % interval of the difference -0.889 to -0.125).
