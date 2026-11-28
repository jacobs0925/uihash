### uihash learn · round 327 · 2026-11-28 12:44 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 337 | +0 | 101 | 92 | 7 | 137 | 6 |
| livingwitharthritis | 494 | +0 | 114 | 225 | 81 | 74 | 435 |
| milk-me-not | 862 | +0 | 68 | 196 | 279 | 319 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 1624 | +0 | 48 | 109 | 24 | 1443 | 85 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 939 | +0 | 129 | 159 | 30 | 621 | 103 |
| primer-react | 202 | +0 | 13 | 72 | 7 | 110 | 0 |
| eui | 109 | +0 | 3 | 21 | 41 | 44 | 3 |
| primer-brand | 111 | +0 | 2 | 61 | 22 | 26 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 107 |
| vkui | 79 | +0 | 1 | 13 | 13 | 52 | 0 |
| gravity-uikit | 79 | +0 | 2 | 14 | 24 | 39 | 16 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 42 | +0 | 3 | 11 | 3 | 25 | 3 |
| fluentui | 47 | +0 | 0 | 13 | 0 | 34 | 17 |
| spectrum-web-components-2nd-gen | 54 | +0 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 12 | +0 | 0 | 8 | 0 | 4 | 1 |
| metabase | 88 | +0 | 1 | 25 | 19 | 43 | 6 |
| porsche | 47 | +0 | 0 | 38 | 1 | 8 | 0 |

Held out of training and judged on: 69 regressions, 337 intended changes, 71 mixed. Trained on 1794 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.711, unseen 0.691; logistic-local 0.690, unseen 0.693; trees-all 0.677, unseen 0.694 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 63 | 0.537 | 0.722 | 0.062 to 0.315 | 4 → 6 | 19 → 23 | 9 → 7 | 0 → 2 | pass |
| el400-held-out | 42 | 0.765 | 0.772 | -0.078 to 0.090 | 5 → 2 | 9 → 10 | 5 → 5 | 1 → 1 | mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.677 | -0.088 to 0.089 | 6 → 7 | 29 → 29 | 4 → 2 | 2 → 3 | pass |
| livingwitharthritis-held-out | 68 | 0.628 | 0.589 | -0.140 to 0.052 | 7 → 7 | 16 → 19 | 8 → 6 | 1 → 1 | mistakes flagged: 13 vs 15 of 20 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.706 | -0.036 to 0.212 | 2 → 1 | 12 → 12 | 7 → 4 | 1 → 1 | mistakes flagged: 5 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 3 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 55 | 0.688 | 0.709 | -0.084 to 0.145 | 2 → 2 | 9 → 9 | 6 → 4 | 1 → 4 | mistakes flagged: 6 vs 8 of 16 (at most 1 fewer) |
| porsche-held-out | 8 | n/a | n/a | n/a | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 13 | 0.818 | 0.909 | 0.000 to 0.300 | 2 → 2 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 39 | 0.534 | 0.528 | -0.303 to 0.321 | 1 → 2 | 21 → 21 | 2 → 0 | 2 → 2 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.794 | -0.118 to 0.235 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 2 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.663 (logistic), 0.661 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 129 | 230 | 0.663 |
| el400 | 101 | 130 | 0.724 |
| eui | 3 | 24 | 0.507 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.462 |
| gravity-uikit | 2 | 16 | 0.594 |
| heartlines | 174 | 290 | 0.652 |
| livingwitharthritis | 114 | 292 | 0.750 |
| loyal-spark | 60 | 152 | 0.687 |
| metabase | 1 | 26 | 0.231 |
| milk-me-not | 68 | 236 | 0.731 |
| porsche | 0 | 38 | n/a |
| primer-brand | 2 | 63 | 0.611 |
| primer-react | 13 | 76 | 0.734 |
| primerate | 48 | 127 | 0.612 |
| pronghorn | 23 | 73 | 0.759 |
| retail-ui | 3 | 12 | 0.736 |
| skilla | 12 | 51 | 0.623 |
| spectrum-web-components | 0 | 8 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 0.933 |
| vkui | 1 | 13 | 0.615 |

Mean 0.694, lowest 0.612: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: el400-held-out: mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 13 vs 15 of 20 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 5 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 8 of 16 (at most 1 fewer).
