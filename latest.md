### uihash learn · round 58 · 2026-10-18 00:47 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 54 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 754 | +0 | 11 | 42 | 3 | 698 | 18 |
| heartlines | 1920 | +153 | 144 | 187 | 23 | 1566 | 0 |
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

Held out of training and judged on: 50 regressions, 206 intended changes, 51 mixed. Trained on 1189 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.678, unseen 0.708; logistic-local 0.672, unseen 0.704; trees-all 0.657, unseen 0.712 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.783 | -0.065 to 0.103 | 5 → 2 | 9 → 10 | 5 → 5 | 1 → 1 | mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 71 | 0.677 | 0.717 | -0.031 to 0.119 | 6 → 7 | 27 → 27 | 4 → 4 | 2 → 3 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.547 | -0.238 to 0.049 | 6 → 6 | 11 → 11 | 7 → 6 | 1 → 1 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.695 | -0.018 to 0.173 | 2 → 1 | 12 → 12 | 7 → 6 | 1 → 2 | mistakes flagged: 7 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.736 | -0.061 to 0.135 | 2 → 2 | 9 → 9 | 7 → 5 | 1 → 3 | mistakes flagged: 7 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.833 | -0.250 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.650 | -0.556 to 0.000 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.824 | -0.118 to 0.294 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.286 | 0.000 to 0.375 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.688 (logistic), 0.693 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.739 |
| eui | 3 | 19 | 0.517 |
| heartlines | 144 | 254 | 0.692 |
| livingwitharthritis | 94 | 194 | 0.751 |
| loyal-spark | 60 | 152 | 0.669 |
| milk-me-not | 66 | 231 | 0.738 |
| primer-brand | 1 | 28 | 0.429 |
| primer-react | 12 | 67 | 0.704 |
| primerate | 11 | 47 | 0.694 |
| pronghorn | 23 | 73 | 0.775 |
| skilla | 12 | 51 | 0.645 |

Mean 0.712, lowest 0.645: 0 of 9 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: el400-held-out: mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 7 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 7 vs 9 of 16 (at most 1 fewer).
