### uihash learn · round 72 · 2026-10-19 06:11 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 69 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 792 | +0 | 13 | 42 | 4 | 733 | 36 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 221 | +0 | 27 | 73 | 14 | 107 | 8 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 99 | +0 | 3 | 17 | 41 | 38 | 3 |
| primer-brand | 98 | +15 | 2 | 61 | 12 | 23 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 3 |
| vkui | 20 | +20 | 0 | 3 | 4 | 13 | 0 |
| gravity-uikit | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| fuselage | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| retail-ui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| fluentui | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| spectrum-web-components-2nd-gen | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| spectrum-web-components | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| metabase | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| porsche | 0 | +0 | 0 | 0 | 0 | 0 | 0 |

Held out of training and judged on: 56 regressions, 238 intended changes, 57 mixed. Trained on 1338 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.663, unseen 0.674; logistic-local 0.642, unseen 0.678; trees-all 0.658, unseen 0.678 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 23 | 0.569 | 0.613 | -0.050 to 0.167 | 0 → 0 | 6 → 11 | 5 → 4 | 0 → 0 | pass |
| el400-held-out | 42 | 0.765 | 0.802 | -0.047 to 0.122 | 5 → 2 | 9 → 10 | 5 → 5 | 1 → 2 | mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.684 | -0.072 to 0.082 | 6 → 6 | 29 → 31 | 4 → 4 | 2 → 3 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.571 | -0.203 to 0.060 | 6 → 6 | 11 → 11 | 7 → 4 | 1 → 1 | mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.714 | -0.002 to 0.193 | 2 → 1 | 12 → 12 | 7 → 4 | 1 → 2 | mistakes flagged: 5 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.734 | -0.063 to 0.140 | 2 → 2 | 9 → 9 | 7 → 5 | 1 → 4 | mistakes flagged: 7 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | 0.000 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.450 | -0.750 to -0.167 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | AUROC worse: 0.450 vs 0.900 (95 % interval of the difference -0.750 to -0.167) |
| pronghorn-held-out | 17 | 0.735 | 0.853 | -0.118 to 0.353 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.429 | 0.000 to 0.429 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.636 (logistic), 0.631 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 27 | 88 | 0.516 |
| el400 | 101 | 130 | 0.744 |
| eui | 3 | 20 | 0.425 |
| heartlines | 174 | 290 | 0.657 |
| livingwitharthritis | 94 | 194 | 0.759 |
| loyal-spark | 60 | 152 | 0.676 |
| milk-me-not | 66 | 231 | 0.738 |
| primer-brand | 2 | 63 | 0.587 |
| primer-react | 12 | 67 | 0.710 |
| primerate | 13 | 47 | 0.599 |
| pronghorn | 23 | 73 | 0.771 |
| skilla | 12 | 51 | 0.610 |
| vkui | 0 | 3 | n/a |

Mean 0.678, lowest 0.516: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: el400-held-out: mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 5 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 7 vs 9 of 16 (at most 1 fewer) / primerate-held-out: AUROC worse: 0.450 vs 0.900 (95 % interval of the difference -0.750 to -0.167).
