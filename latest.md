### uihash learn · round 285 · 2026-11-21 00:59 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 337 | +0 | 101 | 92 | 7 | 137 | 6 |
| livingwitharthritis | 494 | +0 | 114 | 225 | 81 | 74 | 372 |
| milk-me-not | 847 | +0 | 66 | 193 | 275 | 313 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 1624 | +0 | 48 | 109 | 24 | 1443 | 85 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 939 | +0 | 129 | 159 | 30 | 621 | 103 |
| primer-react | 201 | +0 | 13 | 72 | 7 | 109 | 0 |
| eui | 108 | +0 | 3 | 21 | 41 | 43 | 3 |
| primer-brand | 109 | +0 | 2 | 61 | 20 | 26 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 105 |
| vkui | 74 | +0 | 1 | 13 | 12 | 48 | 0 |
| gravity-uikit | 79 | +0 | 2 | 14 | 24 | 39 | 15 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 41 | +0 | 3 | 11 | 2 | 25 | 3 |
| fluentui | 47 | +0 | 0 | 13 | 0 | 34 | 15 |
| spectrum-web-components-2nd-gen | 54 | +0 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 11 | +0 | 0 | 7 | 0 | 4 | 1 |
| metabase | 86 | +0 | 1 | 25 | 19 | 41 | 6 |
| porsche | 45 | +0 | 0 | 37 | 1 | 7 | 0 |

Held out of training and judged on: 69 regressions, 335 intended changes, 71 mixed. Trained on 1789 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.716, unseen 0.692; logistic-local 0.683, unseen 0.691; trees-all 0.692, unseen 0.693 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 63 | 0.537 | 0.735 | 0.077 to 0.321 | 4 → 3 | 19 → 23 | 9 → 8 | 0 → 2 | mistakes flagged: 11 vs 13 of 25 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.781 | -0.083 to 0.104 | 5 → 2 | 9 → 10 | 5 → 6 | 1 → 1 | mistakes flagged: 8 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.678 | -0.087 to 0.081 | 6 → 7 | 29 → 30 | 4 → 3 | 2 → 3 | pass |
| livingwitharthritis-held-out | 68 | 0.628 | 0.585 | -0.150 to 0.048 | 7 → 7 | 16 → 18 | 8 → 6 | 1 → 2 | mistakes flagged: 13 vs 15 of 20 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.717 | -0.013 to 0.226 | 2 → 1 | 12 → 12 | 7 → 4 | 1 → 1 | mistakes flagged: 5 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 3 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.749 | -0.054 to 0.156 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| porsche-held-out | 8 | n/a | n/a | n/a | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 13 | 0.818 | 0.909 | -0.200 to 0.364 | 2 → 2 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 39 | 0.534 | 0.546 | -0.291 to 0.338 | 1 → 1 | 21 → 24 | 2 → 1 | 2 → 2 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.824 | 0.000 to 0.235 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.286 | 0.000 to 0.375 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 2 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.662 (logistic), 0.658 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 129 | 230 | 0.654 |
| el400 | 101 | 130 | 0.726 |
| eui | 3 | 24 | 0.521 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.462 |
| gravity-uikit | 2 | 16 | 0.563 |
| heartlines | 174 | 290 | 0.652 |
| livingwitharthritis | 114 | 292 | 0.749 |
| loyal-spark | 60 | 152 | 0.683 |
| metabase | 1 | 26 | 0.231 |
| milk-me-not | 66 | 232 | 0.730 |
| porsche | 0 | 37 | n/a |
| primer-brand | 2 | 63 | 0.556 |
| primer-react | 13 | 76 | 0.717 |
| primerate | 48 | 127 | 0.611 |
| pronghorn | 23 | 73 | 0.753 |
| retail-ui | 3 | 12 | 0.681 |
| skilla | 12 | 51 | 0.650 |
| spectrum-web-components | 0 | 7 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 0.933 |
| vkui | 1 | 13 | 0.615 |

Mean 0.693, lowest 0.611: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 11 vs 13 of 25 (at most 1 fewer) / el400-held-out: mistakes flagged: 8 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 13 vs 15 of 20 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 5 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
