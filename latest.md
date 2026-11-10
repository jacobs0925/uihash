### uihash learn · round 223 · 2026-11-10 01:44 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 337 | +0 | 101 | 92 | 7 | 137 | 6 |
| livingwitharthritis | 467 | +0 | 113 | 202 | 80 | 72 | 279 |
| milk-me-not | 847 | +0 | 66 | 193 | 275 | 313 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 1624 | +0 | 48 | 109 | 24 | 1443 | 85 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 939 | +0 | 129 | 159 | 30 | 621 | 103 |
| primer-react | 199 | +0 | 13 | 70 | 7 | 109 | 0 |
| eui | 102 | +0 | 3 | 19 | 41 | 39 | 3 |
| primer-brand | 108 | +0 | 2 | 61 | 19 | 26 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 92 |
| vkui | 73 | +0 | 1 | 12 | 12 | 48 | 0 |
| gravity-uikit | 79 | +0 | 2 | 14 | 24 | 39 | 11 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 40 | +0 | 3 | 10 | 2 | 25 | 3 |
| fluentui | 47 | +0 | 0 | 13 | 0 | 34 | 12 |
| spectrum-web-components-2nd-gen | 54 | +0 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 8 | +0 | 0 | 5 | 0 | 3 | 1 |
| metabase | 81 | +0 | 1 | 24 | 18 | 38 | 6 |
| porsche | 44 | +0 | 0 | 36 | 1 | 7 | 0 |

Held out of training and judged on: 69 regressions, 329 intended changes, 71 mixed. Trained on 1761 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.708, unseen 0.695 (chosen); logistic-local 0.692, unseen 0.694; trees-all 0.685, unseen 0.692.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 63 | 0.537 | 0.700 | 0.053 to 0.281 | 4 → 3 | 19 → 23 | 9 → 8 | 0 → 2 | mistakes flagged: 11 vs 13 of 25 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.728 | -0.114 to 0.028 | 5 → 0 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 4 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.683 | -0.069 to 0.080 | 6 → 7 | 29 → 31 | 4 → 3 | 2 → 4 | pass |
| livingwitharthritis-held-out | 65 | 0.637 | 0.606 | -0.123 to 0.051 | 7 → 7 | 15 → 17 | 8 → 4 | 1 → 2 | mistakes flagged: 11 vs 15 of 20 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.743 | 0.012 to 0.255 | 2 → 1 | 12 → 12 | 7 → 3 | 1 → 2 | mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 3 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.739 | -0.068 to 0.154 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| porsche-held-out | 8 | n/a | n/a | n/a | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.778 | -0.556 to 0.250 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 39 | 0.534 | 0.637 | -0.157 to 0.408 | 1 → 1 | 21 → 24 | 2 → 0 | 2 → 2 | mistakes flagged: 1 vs 3 of 9 (at most 1 fewer) |
| pronghorn-held-out | 17 | 0.735 | 0.912 | 0.000 to 0.471 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 3 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.656 (logistic), 0.658 (trees).

#### Unseen repositories (logistic-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 129 | 230 | 0.652 |
| el400 | 101 | 130 | 0.737 |
| eui | 3 | 22 | 0.568 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.423 |
| gravity-uikit | 2 | 16 | 0.656 |
| heartlines | 174 | 290 | 0.665 |
| livingwitharthritis | 113 | 268 | 0.742 |
| loyal-spark | 60 | 152 | 0.697 |
| metabase | 1 | 25 | 0.640 |
| milk-me-not | 66 | 232 | 0.727 |
| porsche | 0 | 36 | n/a |
| primer-brand | 2 | 63 | 0.659 |
| primer-react | 13 | 74 | 0.748 |
| primerate | 48 | 127 | 0.619 |
| pronghorn | 23 | 73 | 0.740 |
| retail-ui | 3 | 11 | 0.788 |
| skilla | 12 | 51 | 0.623 |
| spectrum-web-components | 0 | 5 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 0.933 |
| vkui | 1 | 12 | 0.583 |

Mean 0.695, lowest 0.619: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-all did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 11 vs 13 of 25 (at most 1 fewer) / el400-held-out: mistakes flagged: 4 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 11 vs 15 of 20 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) / primerate-held-out: mistakes flagged: 1 vs 3 of 9 (at most 1 fewer).
