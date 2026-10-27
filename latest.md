### uihash learn · round 145 · 2026-10-27 18:49 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 162 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 1624 | +0 | 48 | 109 | 24 | 1443 | 85 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 849 | +0 | 121 | 145 | 28 | 555 | 90 |
| primer-react | 188 | +0 | 12 | 65 | 7 | 104 | 0 |
| eui | 100 | +0 | 3 | 17 | 41 | 39 | 3 |
| primer-brand | 104 | +0 | 2 | 61 | 17 | 24 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 72 |
| vkui | 73 | +0 | 1 | 12 | 12 | 48 | 0 |
| gravity-uikit | 79 | +0 | 2 | 14 | 24 | 39 | 9 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 37 | +0 | 3 | 10 | 2 | 22 | 3 |
| fluentui | 47 | +0 | 0 | 13 | 0 | 34 | 11 |
| spectrum-web-components-2nd-gen | 54 | +0 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 7 | +1 | 0 | 4 | 0 | 3 | 1 |
| metabase | 73 | +0 | 1 | 23 | 15 | 34 | 6 |
| porsche | 43 | +0 | 0 | 35 | 1 | 7 | 0 |

Held out of training and judged on: 68 regressions, 309 intended changes, 70 mixed. Trained on 1668 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.723, unseen 0.691; logistic-local 0.704, unseen 0.691; trees-all 0.698, unseen 0.692 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 59 | 0.537 | 0.735 | 0.078 to 0.333 | 4 → 3 | 18 → 23 | 9 → 7 | 0 → 2 | mistakes flagged: 10 vs 13 of 25 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.783 | -0.067 to 0.095 | 5 → 2 | 9 → 10 | 5 → 5 | 1 → 2 | mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.666 | -0.097 to 0.075 | 6 → 7 | 29 → 30 | 4 → 3 | 2 → 3 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.588 | -0.178 to 0.075 | 6 → 6 | 11 → 12 | 7 → 3 | 1 → 1 | mistakes flagged: 9 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.725 | -0.018 to 0.245 | 2 → 1 | 12 → 12 | 7 → 3 | 1 → 2 | mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 3 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.753 | -0.048 to 0.159 | 2 → 2 | 9 → 9 | 7 → 5 | 1 → 4 | mistakes flagged: 7 vs 9 of 16 (at most 1 fewer) |
| porsche-held-out | 7 | n/a | n/a | n/a | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | -0.250 to 0.250 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 39 | 0.534 | 0.556 | -0.266 to 0.344 | 1 → 1 | 21 → 23 | 2 → 0 | 2 → 2 | mistakes flagged: 1 vs 3 of 9 (at most 1 fewer) |
| pronghorn-held-out | 17 | 0.735 | 0.824 | -0.118 to 0.294 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.357 | 0.000 to 0.400 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 2 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.660 (logistic), 0.647 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 121 | 211 | 0.663 |
| el400 | 101 | 130 | 0.719 |
| eui | 3 | 20 | 0.442 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.442 |
| gravity-uikit | 2 | 16 | 0.688 |
| heartlines | 174 | 290 | 0.645 |
| livingwitharthritis | 94 | 194 | 0.742 |
| loyal-spark | 60 | 152 | 0.685 |
| metabase | 1 | 24 | 0.250 |
| milk-me-not | 66 | 231 | 0.737 |
| porsche | 0 | 35 | n/a |
| primer-brand | 2 | 63 | 0.540 |
| primer-react | 12 | 69 | 0.702 |
| primerate | 48 | 127 | 0.622 |
| pronghorn | 23 | 73 | 0.755 |
| retail-ui | 3 | 11 | 0.682 |
| skilla | 12 | 51 | 0.649 |
| spectrum-web-components | 0 | 4 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 0.867 |
| vkui | 1 | 12 | 0.583 |

Mean 0.692, lowest 0.622: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 10 vs 13 of 25 (at most 1 fewer) / el400-held-out: mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 9 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 7 vs 9 of 16 (at most 1 fewer) / primerate-held-out: mistakes flagged: 1 vs 3 of 9 (at most 1 fewer).
