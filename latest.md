### uihash learn · round 80 · 2026-10-19 23:46 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 78 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 798 | +0 | 14 | 43 | 4 | 737 | 45 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 489 | +0 | 66 | 95 | 22 | 306 | 11 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 99 | +0 | 3 | 17 | 41 | 38 | 3 |
| primer-brand | 98 | +0 | 2 | 61 | 12 | 23 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 6 |
| vkui | 72 | +11 | 1 | 12 | 12 | 47 | 0 |
| gravity-uikit | 74 | +74 | 2 | 11 | 24 | 37 | 11 |
| fuselage | 31 | +31 | 2 | 21 | 0 | 8 | 1 |
| retail-ui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| fluentui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| spectrum-web-components-2nd-gen | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| spectrum-web-components | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| metabase | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| porsche | 0 | +0 | 0 | 0 | 0 | 0 | 0 |

Held out of training and judged on: 61 regressions, 256 intended changes, 62 mixed. Trained on 1419 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.648, unseen 0.680; logistic-local 0.643, unseen 0.683 (chosen); trees-all 0.643, unseen 0.674.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 38 | 0.459 | 0.655 | 0.072 to 0.346 | 2 → 1 | 9 → 14 | 6 → 5 | 0 → 1 | mistakes flagged: 6 vs 8 of 18 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.767 | -0.087 to 0.083 | 5 → 2 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 6 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.691 | -0.057 to 0.088 | 6 → 6 | 29 → 32 | 4 → 2 | 2 → 4 | mistakes flagged: 8 vs 10 of 31 (at most 1 fewer) |
| livingwitharthritis-held-out | 48 | 0.629 | 0.608 | -0.134 to 0.088 | 6 → 6 | 11 → 12 | 7 → 5 | 1 → 1 | mistakes flagged: 11 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.758 | 0.011 to 0.279 | 2 → 1 | 12 → 12 | 7 → 3 | 1 → 2 | mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.734 | -0.081 to 0.151 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | -0.250 to 0.250 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.400 | -0.818 to -0.100 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | AUROC worse: 0.400 vs 0.900 (95 % interval of the difference -0.818 to -0.100) |
| pronghorn-held-out | 17 | 0.735 | 0.853 | -0.118 to 0.353 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.650 (logistic), 0.656 (trees).

#### Unseen repositories (logistic-local, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 66 | 132 | 0.578 |
| el400 | 101 | 130 | 0.746 |
| eui | 3 | 20 | 0.475 |
| fuselage | 2 | 23 | 0.478 |
| gravity-uikit | 2 | 13 | 0.692 |
| heartlines | 174 | 290 | 0.673 |
| livingwitharthritis | 94 | 194 | 0.739 |
| loyal-spark | 60 | 152 | 0.676 |
| milk-me-not | 66 | 231 | 0.727 |
| primer-brand | 2 | 63 | 0.611 |
| primer-react | 12 | 67 | 0.719 |
| primerate | 14 | 49 | 0.595 |
| pronghorn | 23 | 73 | 0.745 |
| skilla | 12 | 51 | 0.634 |
| vkui | 1 | 12 | 0.583 |

Mean 0.683, lowest 0.578: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-local did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 6 vs 8 of 18 (at most 1 fewer) / el400-held-out: mistakes flagged: 6 vs 10 of 20 (at most 1 fewer) / heartlines-held-out: mistakes flagged: 8 vs 10 of 31 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 11 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) / primerate-held-out: AUROC worse: 0.400 vs 0.900 (95 % interval of the difference -0.818 to -0.100).
