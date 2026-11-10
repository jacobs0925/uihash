### uihash learn · round 219 · 2026-11-10 00:23 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 337 | +0 | 101 | 92 | 7 | 137 | 6 |
| livingwitharthritis | 457 | +40 | 113 | 198 | 75 | 71 | 274 |
| milk-me-not | 847 | +0 | 66 | 193 | 275 | 313 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 1624 | +0 | 48 | 109 | 24 | 1443 | 85 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 939 | +0 | 129 | 159 | 30 | 621 | 103 |
| primer-react | 198 | +0 | 13 | 70 | 7 | 108 | 0 |
| eui | 102 | +0 | 3 | 19 | 41 | 39 | 3 |
| primer-brand | 107 | +0 | 2 | 61 | 19 | 25 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 91 |
| vkui | 73 | +0 | 1 | 12 | 12 | 48 | 0 |
| gravity-uikit | 79 | +0 | 2 | 14 | 24 | 39 | 10 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 40 | +0 | 3 | 10 | 2 | 25 | 3 |
| fluentui | 47 | +0 | 0 | 13 | 0 | 34 | 12 |
| spectrum-web-components-2nd-gen | 54 | +0 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 8 | +0 | 0 | 5 | 0 | 3 | 1 |
| metabase | 80 | +0 | 1 | 24 | 18 | 37 | 6 |
| porsche | 44 | +0 | 0 | 36 | 1 | 7 | 0 |

Held out of training and judged on: 69 regressions, 329 intended changes, 71 mixed. Trained on 1757 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.710, unseen 0.695 (chosen); logistic-local 0.689, unseen 0.694; trees-all 0.683, unseen 0.690.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 63 | 0.537 | 0.710 | 0.060 to 0.288 | 4 → 3 | 19 → 22 | 9 → 8 | 0 → 2 | mistakes flagged: 11 vs 13 of 25 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.797 | -0.048 to 0.114 | 5 → 3 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.681 | -0.075 to 0.081 | 6 → 7 | 29 → 28 | 4 → 5 | 2 → 3 | pass |
| livingwitharthritis-held-out | 65 | 0.635 | 0.608 | -0.113 to 0.054 | 7 → 7 | 14 → 16 | 8 → 7 | 1 → 1 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.727 | -0.005 to 0.239 | 2 → 1 | 12 → 12 | 7 → 4 | 1 → 1 | mistakes flagged: 5 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 3 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.747 | -0.067 to 0.162 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| porsche-held-out | 8 | n/a | n/a | n/a | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.778 | -0.556 to 0.250 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 39 | 0.534 | 0.631 | -0.178 to 0.419 | 1 → 1 | 21 → 24 | 2 → 1 | 2 → 2 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.882 | 0.000 to 0.402 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 2 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.660 (logistic), 0.651 (trees).

#### Unseen repositories (logistic-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 129 | 230 | 0.654 |
| el400 | 101 | 130 | 0.737 |
| eui | 3 | 22 | 0.553 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.462 |
| gravity-uikit | 2 | 16 | 0.688 |
| heartlines | 174 | 290 | 0.668 |
| livingwitharthritis | 113 | 265 | 0.742 |
| loyal-spark | 60 | 152 | 0.689 |
| metabase | 1 | 25 | 0.640 |
| milk-me-not | 66 | 232 | 0.729 |
| porsche | 0 | 36 | n/a |
| primer-brand | 2 | 63 | 0.675 |
| primer-react | 13 | 74 | 0.749 |
| primerate | 48 | 127 | 0.630 |
| pronghorn | 23 | 73 | 0.742 |
| retail-ui | 3 | 11 | 0.667 |
| skilla | 12 | 51 | 0.611 |
| spectrum-web-components | 0 | 5 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 0.933 |
| vkui | 1 | 12 | 0.583 |

Mean 0.695, lowest 0.611: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-all did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 11 vs 13 of 25 (at most 1 fewer) / el400-held-out: mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 5 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
