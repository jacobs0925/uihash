### uihash learn · round 68 · 2026-10-18 21:00 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 65 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 792 | +0 | 13 | 42 | 4 | 733 | 31 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 154 | +65 | 16 | 49 | 7 | 82 | 2 |
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

Held out of training and judged on: 55 regressions, 223 intended changes, 57 mixed. Trained on 1280 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.676, unseen 0.679 (chosen); logistic-local 0.640, unseen 0.679; trees-all 0.632, unseen 0.677.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 16 | 0.500 | 0.592 | 0.000 to 0.250 | 0 → 0 | 2 → 5 | 4 → 4 | 1 → 1 | pass |
| el400-held-out | 42 | 0.765 | 0.805 | -0.041 to 0.130 | 5 → 3 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.709 | -0.041 to 0.104 | 6 → 7 | 29 → 32 | 4 → 4 | 2 → 4 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.564 | -0.184 to 0.044 | 6 → 6 | 11 → 12 | 7 → 4 | 1 → 1 | mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.754 | 0.013 to 0.276 | 2 → 1 | 12 → 12 | 7 → 5 | 1 → 2 | mistakes flagged: 6 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.714 | -0.094 to 0.122 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.667 | -0.556 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.650 | -0.727 to 0.286 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.941 | 0.000 to 0.529 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.286 | 0.000 to 0.375 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.652 (logistic), 0.647 (trees).

#### Unseen repositories (logistic-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 16 | 57 | 0.553 |
| el400 | 101 | 130 | 0.743 |
| eui | 3 | 19 | 0.570 |
| heartlines | 174 | 290 | 0.671 |
| livingwitharthritis | 94 | 194 | 0.736 |
| loyal-spark | 60 | 152 | 0.686 |
| milk-me-not | 66 | 231 | 0.713 |
| primer-brand | 1 | 28 | 0.750 |
| primer-react | 12 | 67 | 0.717 |
| primerate | 13 | 47 | 0.588 |
| pronghorn | 23 | 73 | 0.764 |
| skilla | 12 | 51 | 0.624 |

Mean 0.679, lowest 0.553: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-all did not pass the promotion gate: el400-held-out: mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 6 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
