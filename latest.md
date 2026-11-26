### uihash learn · round 314 · 2026-11-26 06:54 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 337 | +0 | 101 | 92 | 7 | 137 | 6 |
| livingwitharthritis | 494 | +0 | 114 | 225 | 81 | 74 | 414 |
| milk-me-not | 853 | +0 | 66 | 195 | 279 | 313 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 1624 | +0 | 48 | 109 | 24 | 1443 | 85 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 939 | +0 | 129 | 159 | 30 | 621 | 103 |
| primer-react | 202 | +0 | 13 | 72 | 7 | 110 | 0 |
| eui | 108 | +0 | 3 | 21 | 41 | 43 | 3 |
| primer-brand | 110 | +0 | 2 | 61 | 21 | 26 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 106 |
| vkui | 79 | +0 | 1 | 13 | 13 | 52 | 0 |
| gravity-uikit | 79 | +0 | 2 | 14 | 24 | 39 | 15 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 42 | +0 | 3 | 11 | 3 | 25 | 3 |
| fluentui | 47 | +0 | 0 | 13 | 0 | 34 | 16 |
| spectrum-web-components-2nd-gen | 54 | +0 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 12 | +0 | 0 | 8 | 0 | 4 | 1 |
| metabase | 88 | +0 | 1 | 25 | 19 | 43 | 6 |
| porsche | 47 | +0 | 0 | 38 | 1 | 8 | 0 |

Held out of training and judged on: 69 regressions, 336 intended changes, 71 mixed. Trained on 1792 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.713, unseen 0.693 (chosen); logistic-local 0.689, unseen 0.693; trees-all 0.688, unseen 0.692.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 63 | 0.537 | 0.698 | 0.051 to 0.280 | 4 → 3 | 19 → 23 | 9 → 8 | 0 → 2 | mistakes flagged: 11 vs 13 of 25 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.783 | -0.060 to 0.105 | 5 → 1 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 5 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.688 | -0.067 to 0.085 | 6 → 7 | 29 → 30 | 4 → 3 | 2 → 3 | pass |
| livingwitharthritis-held-out | 68 | 0.628 | 0.614 | -0.099 to 0.062 | 7 → 7 | 16 → 19 | 8 → 4 | 1 → 2 | mistakes flagged: 11 vs 15 of 20 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.738 | 0.005 to 0.253 | 2 → 1 | 12 → 12 | 7 → 3 | 1 → 1 | mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 3 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 54 | 0.699 | 0.729 | -0.083 to 0.157 | 2 → 2 | 9 → 9 | 6 → 4 | 1 → 4 | mistakes flagged: 6 vs 8 of 16 (at most 1 fewer) |
| porsche-held-out | 8 | n/a | n/a | n/a | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 13 | 0.818 | 0.818 | -0.417 to 0.364 | 2 → 2 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 39 | 0.534 | 0.614 | -0.172 to 0.361 | 1 → 1 | 21 → 24 | 2 → 0 | 2 → 2 | mistakes flagged: 1 vs 3 of 9 (at most 1 fewer) |
| pronghorn-held-out | 17 | 0.735 | 0.912 | 0.000 to 0.471 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 3 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.662 (logistic), 0.657 (trees).

#### Unseen repositories (logistic-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 129 | 230 | 0.652 |
| el400 | 101 | 130 | 0.733 |
| eui | 3 | 24 | 0.576 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.500 |
| gravity-uikit | 2 | 16 | 0.656 |
| heartlines | 174 | 290 | 0.668 |
| livingwitharthritis | 114 | 292 | 0.735 |
| loyal-spark | 60 | 152 | 0.692 |
| metabase | 1 | 26 | 0.615 |
| milk-me-not | 66 | 234 | 0.730 |
| porsche | 0 | 38 | n/a |
| primer-brand | 2 | 63 | 0.635 |
| primer-react | 13 | 76 | 0.727 |
| primerate | 48 | 127 | 0.625 |
| pronghorn | 23 | 73 | 0.743 |
| retail-ui | 3 | 12 | 0.722 |
| skilla | 12 | 51 | 0.624 |
| spectrum-web-components | 0 | 8 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 1.000 |
| vkui | 1 | 13 | 0.615 |

Mean 0.693, lowest 0.624: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-all did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 11 vs 13 of 25 (at most 1 fewer) / el400-held-out: mistakes flagged: 5 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 11 vs 15 of 20 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 8 of 16 (at most 1 fewer) / primerate-held-out: mistakes flagged: 1 vs 3 of 9 (at most 1 fewer).
