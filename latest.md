### uihash learn · round 50 · 2026-10-17 10:26 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 47 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 748 | +0 | 11 | 42 | 3 | 692 | 8 |
| heartlines | 1007 | +182 | 56 | 93 | 5 | 853 | 0 |
| dapsiwow | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
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

Held out of training and judged on: 44 regressions, 184 intended changes, 42 mixed. Trained on 1044 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.683, unseen 0.702; logistic-local 0.674, unseen 0.697; trees-all 0.681, unseen 0.702 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.777 | -0.066 to 0.098 | 5 → 2 | 9 → 10 | 5 → 5 | 1 → 1 | mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 34 | 0.570 | 0.607 | -0.119 to 0.190 | 5 → 5 | 9 → 10 | 1 → 2 | 0 → 0 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.580 | -0.194 to 0.064 | 6 → 6 | 11 → 11 | 7 → 6 | 1 → 3 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.711 | -0.002 to 0.190 | 2 → 2 | 12 → 12 | 7 → 6 | 1 → 1 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.738 | -0.060 to 0.148 | 2 → 2 | 9 → 9 | 7 → 5 | 1 → 1 | mistakes flagged: 7 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | 0.000 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.750 | -0.500 to 0.000 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.794 | -0.118 to 0.235 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.697 (logistic), 0.692 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.738 |
| eui | 3 | 19 | 0.500 |
| heartlines | 56 | 120 | 0.674 |
| livingwitharthritis | 94 | 194 | 0.766 |
| loyal-spark | 60 | 152 | 0.674 |
| milk-me-not | 66 | 231 | 0.722 |
| primer-brand | 1 | 28 | 0.607 |
| primer-react | 12 | 67 | 0.703 |
| primerate | 11 | 47 | 0.656 |
| pronghorn | 23 | 73 | 0.744 |
| skilla | 12 | 51 | 0.643 |

Mean 0.702, lowest 0.643: 0 of 9 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: el400-held-out: mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 7 vs 9 of 16 (at most 1 fewer).
