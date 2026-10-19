### uihash learn · round 74 · 2026-10-19 09:06 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 71 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 792 | +0 | 13 | 42 | 4 | 733 | 37 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 261 | +40 | 49 | 75 | 18 | 119 | 8 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 99 | +0 | 3 | 17 | 41 | 38 | 3 |
| primer-brand | 98 | +0 | 2 | 61 | 12 | 23 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 3 |
| vkui | 20 | +0 | 0 | 3 | 4 | 13 | 0 |
| gravity-uikit | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| fuselage | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| retail-ui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| fluentui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| spectrum-web-components-2nd-gen | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| spectrum-web-components | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| metabase | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| porsche | 0 | +0 | 0 | 0 | 0 | 0 | 0 |

Held out of training and judged on: 60 regressions, 237 intended changes, 59 mixed. Trained on 1357 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.660, unseen 0.676; logistic-local 0.625, unseen 0.678 (chosen); trees-all 0.624, unseen 0.675.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 28 | 0.497 | 0.595 | -0.006 to 0.247 | 2 → 1 | 6 → 8 | 5 → 4 | 0 → 1 | mistakes flagged: 5 vs 7 of 14 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.813 | -0.034 to 0.131 | 5 → 3 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.708 | -0.047 to 0.104 | 6 → 6 | 29 → 33 | 4 → 2 | 2 → 4 | mistakes flagged: 8 vs 10 of 31 (at most 1 fewer) |
| livingwitharthritis-held-out | 48 | 0.629 | 0.601 | -0.130 to 0.069 | 6 → 6 | 11 → 12 | 7 → 4 | 1 → 1 | mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.777 | 0.026 to 0.295 | 2 → 1 | 12 → 12 | 7 → 4 | 1 → 2 | mistakes flagged: 5 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.717 | -0.085 to 0.120 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.722 | -0.556 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.400 | -0.818 to -0.100 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | AUROC worse: 0.400 vs 0.900 (95 % interval of the difference -0.818 to -0.100) |
| pronghorn-held-out | 17 | 0.735 | 0.824 | -0.118 to 0.294 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.665 (logistic), 0.662 (trees).

#### Unseen repositories (logistic-local, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 49 | 102 | 0.547 |
| el400 | 101 | 130 | 0.747 |
| eui | 3 | 20 | 0.542 |
| heartlines | 174 | 290 | 0.675 |
| livingwitharthritis | 94 | 194 | 0.748 |
| loyal-spark | 60 | 152 | 0.691 |
| milk-me-not | 66 | 231 | 0.717 |
| primer-brand | 2 | 63 | 0.675 |
| primer-react | 12 | 67 | 0.708 |
| primerate | 13 | 47 | 0.557 |
| pronghorn | 23 | 73 | 0.743 |
| skilla | 12 | 51 | 0.646 |
| vkui | 0 | 3 | n/a |

Mean 0.678, lowest 0.547: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-local did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 5 vs 7 of 14 (at most 1 fewer) / el400-held-out: mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) / heartlines-held-out: mistakes flagged: 8 vs 10 of 31 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 5 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) / primerate-held-out: AUROC worse: 0.400 vs 0.900 (95 % interval of the difference -0.818 to -0.100).
