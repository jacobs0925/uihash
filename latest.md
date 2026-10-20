### uihash learn · round 83 · 2026-10-20 05:43 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 81 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 798 | +0 | 14 | 43 | 4 | 737 | 48 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 491 | +0 | 66 | 96 | 22 | 307 | 14 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 99 | +0 | 3 | 17 | 41 | 38 | 3 |
| primer-brand | 98 | +0 | 2 | 61 | 12 | 23 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 9 |
| vkui | 72 | +0 | 1 | 12 | 12 | 47 | 0 |
| gravity-uikit | 76 | +0 | 2 | 12 | 24 | 38 | 9 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 36 | +0 | 3 | 10 | 2 | 21 | 3 |
| fluentui | 47 | +22 | 0 | 13 | 0 | 34 | 4 |
| spectrum-web-components-2nd-gen | 54 | +54 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 4 | +4 | 0 | 2 | 0 | 2 | 1 |
| metabase | 9 | +9 | 0 | 1 | 3 | 5 | 1 |
| porsche | 0 | +0 | 0 | 0 | 0 | 0 | 0 |

Held out of training and judged on: 61 regressions, 265 intended changes, 63 mixed. Trained on 1458 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.697, unseen 0.683; logistic-local 0.676, unseen 0.685 (chosen); trees-all 0.677, unseen 0.678.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 38 | 0.459 | 0.691 | 0.092 to 0.413 | 2 → 1 | 9 → 14 | 6 → 4 | 0 → 1 | mistakes flagged: 5 vs 8 of 18 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.817 | -0.036 to 0.145 | 5 → 2 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 6 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.689 | -0.070 to 0.092 | 6 → 6 | 29 → 32 | 4 → 3 | 2 → 4 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.617 | -0.122 to 0.096 | 6 → 6 | 11 → 12 | 7 → 4 | 1 → 2 | mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.769 | 0.012 to 0.297 | 2 → 1 | 12 → 12 | 7 → 3 | 1 → 2 | mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.736 | -0.076 to 0.152 | 2 → 2 | 9 → 8 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.778 | -0.556 to 0.250 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.450 | -0.818 to 0.000 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.853 | -0.118 to 0.353 | 0 → 0 | 5 → 5 | 1 → 0 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 3 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.659 (logistic), 0.662 (trees).

#### Unseen repositories (logistic-local, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 66 | 133 | 0.593 |
| el400 | 101 | 130 | 0.741 |
| eui | 3 | 20 | 0.475 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.423 |
| gravity-uikit | 2 | 14 | 0.679 |
| heartlines | 174 | 290 | 0.676 |
| livingwitharthritis | 94 | 194 | 0.744 |
| loyal-spark | 60 | 152 | 0.658 |
| metabase | 0 | 1 | n/a |
| milk-me-not | 66 | 231 | 0.726 |
| primer-brand | 2 | 63 | 0.651 |
| primer-react | 12 | 67 | 0.715 |
| primerate | 14 | 49 | 0.617 |
| pronghorn | 23 | 73 | 0.744 |
| retail-ui | 3 | 11 | 0.682 |
| skilla | 12 | 51 | 0.642 |
| spectrum-web-components | 0 | 2 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 0.933 |
| vkui | 1 | 12 | 0.583 |

Mean 0.685, lowest 0.593: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-local did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 5 vs 8 of 18 (at most 1 fewer) / el400-held-out: mistakes flagged: 6 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
