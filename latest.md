### uihash learn · round 70 · 2026-10-18 23:56 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 66 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 792 | +0 | 13 | 42 | 4 | 733 | 33 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 221 | +67 | 27 | 73 | 14 | 107 | 7 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 99 | +1 | 3 | 17 | 41 | 38 | 3 |
| primer-brand | 38 | +5 | 1 | 29 | 1 | 7 | 0 |
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

Held out of training and judged on: 56 regressions, 230 intended changes, 57 mixed. Trained on 1310 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.665, unseen 0.673; logistic-local 0.631, unseen 0.676; trees-all 0.659, unseen 0.678 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 23 | 0.569 | 0.644 | -0.021 to 0.214 | 0 → 0 | 6 → 11 | 5 → 4 | 0 → 0 | pass |
| el400-held-out | 42 | 0.765 | 0.818 | -0.032 to 0.142 | 5 → 2 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 6 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.679 | -0.075 to 0.079 | 6 → 6 | 29 → 31 | 4 → 2 | 2 → 3 | mistakes flagged: 8 vs 10 of 31 (at most 1 fewer) |
| livingwitharthritis-held-out | 48 | 0.629 | 0.577 | -0.191 to 0.057 | 6 → 6 | 11 → 11 | 7 → 5 | 1 → 1 | mistakes flagged: 11 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.725 | 0.009 to 0.215 | 2 → 1 | 12 → 12 | 7 → 6 | 1 → 2 | mistakes flagged: 7 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.725 | -0.070 to 0.125 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | 0.000 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.450 | -0.889 to -0.091 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | AUROC worse: 0.450 vs 0.900 (95 % interval of the difference -0.889 to -0.091) |
| pronghorn-held-out | 17 | 0.735 | 0.882 | 0.000 to 0.353 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.357 | 0.000 to 0.400 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.646 (logistic), 0.639 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 27 | 88 | 0.502 |
| el400 | 101 | 130 | 0.740 |
| eui | 3 | 20 | 0.475 |
| heartlines | 174 | 290 | 0.670 |
| livingwitharthritis | 94 | 194 | 0.762 |
| loyal-spark | 60 | 152 | 0.679 |
| milk-me-not | 66 | 231 | 0.734 |
| primer-brand | 1 | 30 | 0.400 |
| primer-react | 12 | 67 | 0.698 |
| primerate | 13 | 47 | 0.597 |
| pronghorn | 23 | 73 | 0.772 |
| skilla | 12 | 51 | 0.628 |

Mean 0.678, lowest 0.502: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: el400-held-out: mistakes flagged: 6 vs 10 of 20 (at most 1 fewer) / heartlines-held-out: mistakes flagged: 8 vs 10 of 31 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 11 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 7 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) / primerate-held-out: AUROC worse: 0.450 vs 0.900 (95 % interval of the difference -0.889 to -0.091).
