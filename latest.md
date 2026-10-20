### uihash learn · round 89 · 2026-10-20 16:47 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 87 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 798 | +0 | 14 | 43 | 4 | 737 | 54 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 491 | +0 | 66 | 96 | 22 | 307 | 20 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 99 | +0 | 3 | 17 | 41 | 38 | 3 |
| primer-brand | 99 | +1 | 2 | 61 | 13 | 23 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 15 |
| vkui | 72 | +0 | 1 | 12 | 12 | 47 | 0 |
| gravity-uikit | 79 | +0 | 2 | 14 | 24 | 39 | 9 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 36 | +0 | 3 | 10 | 2 | 21 | 3 |
| fluentui | 47 | +0 | 0 | 13 | 0 | 34 | 8 |
| spectrum-web-components-2nd-gen | 54 | +0 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 4 | +0 | 0 | 2 | 0 | 2 | 1 |
| metabase | 27 | +8 | 0 | 4 | 6 | 17 | 7 |
| porsche | 43 | +4 | 0 | 35 | 1 | 7 | 0 |

Held out of training and judged on: 61 regressions, 272 intended changes, 63 mixed. Trained on 1491 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.685, unseen 0.686 (chosen); logistic-local 0.671, unseen 0.683; trees-all 0.660, unseen 0.686.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 38 | 0.459 | 0.652 | 0.076 to 0.335 | 2 → 1 | 9 → 14 | 6 → 5 | 0 → 1 | mistakes flagged: 6 vs 8 of 18 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.792 | -0.052 to 0.109 | 5 → 0 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 4 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.695 | -0.063 to 0.097 | 6 → 6 | 29 → 33 | 4 → 3 | 2 → 4 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.599 | -0.132 to 0.058 | 6 → 6 | 11 → 12 | 7 → 4 | 1 → 2 | mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.759 | 0.009 to 0.278 | 2 → 1 | 12 → 12 | 7 → 2 | 1 → 2 | mistakes flagged: 3 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.727 | -0.087 to 0.138 | 2 → 2 | 9 → 8 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| porsche-held-out | 7 | n/a | n/a | n/a | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.722 | -0.556 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.550 | -0.727 to 0.111 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.941 | 0.000 to 0.529 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.286 | 0.000 to 0.375 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 3 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.635 (logistic), 0.633 (trees).

#### Unseen repositories (logistic-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 66 | 133 | 0.585 |
| el400 | 101 | 130 | 0.734 |
| eui | 3 | 20 | 0.475 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.500 |
| gravity-uikit | 2 | 16 | 0.656 |
| heartlines | 174 | 290 | 0.672 |
| livingwitharthritis | 94 | 194 | 0.738 |
| loyal-spark | 60 | 152 | 0.669 |
| metabase | 0 | 4 | n/a |
| milk-me-not | 66 | 231 | 0.718 |
| porsche | 0 | 35 | n/a |
| primer-brand | 2 | 63 | 0.611 |
| primer-react | 12 | 67 | 0.731 |
| primerate | 14 | 49 | 0.615 |
| pronghorn | 23 | 73 | 0.756 |
| retail-ui | 3 | 11 | 0.667 |
| skilla | 12 | 51 | 0.640 |
| spectrum-web-components | 0 | 2 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 0.933 |
| vkui | 1 | 12 | 0.583 |

Mean 0.686, lowest 0.585: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-all did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 6 vs 8 of 18 (at most 1 fewer) / el400-held-out: mistakes flagged: 4 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 3 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
