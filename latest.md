### uihash learn · round 23 · 2026-10-15 07:00 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 174 | +0 | 43 | 81 | 23 | 27 | 16 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 345 | +154 | 41 | 38 | 9 | 257 | 5 |
| pronghorn | 408 | +0 | 6 | 21 | 0 | 381 | 2 |
| skilla | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| primerate | 0 | +0 | 0 | 0 | 0 | 0 | 0 |
| heartlines | 251 | +0 | 5 | 9 | 2 | 235 | 0 |
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

Held out of training and judged on: 32 regressions, 103 intended changes, 28 mixed. Trained on 653 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.778, unseen 0.706; logistic-local 0.744, unseen 0.721 (chosen); trees-all 0.755, unseen 0.709.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.815 | -0.013 to 0.124 | 5 → 5 | 9 → 10 | 5 → 5 | 1 → 1 | pass |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 2 | n/a | n/a | n/a | 1 → 1 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 28 | 0.714 | 0.605 | -0.266 to 0.000 | 5 → 5 | 5 → 5 | 2 → 2 | 0 → 0 | pass |
| loyal-spark-held-out | 13 | 0.571 | 0.857 | 0.000 to 0.600 | 2 → 2 | 3 → 3 | 3 → 2 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.761 | -0.037 to 0.166 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.667 | -0.667 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| pronghorn-held-out | 6 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 2 → 2 | 1 → 1 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.714 (logistic), 0.696 (trees).

#### Unseen repositories (logistic-local, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.741 |
| eui | 3 | 19 | 0.517 |
| heartlines | 5 | 10 | 0.760 |
| livingwitharthritis | 43 | 103 | 0.760 |
| loyal-spark | 41 | 62 | 0.651 |
| milk-me-not | 66 | 231 | 0.717 |
| primer-brand | 1 | 28 | 0.714 |
| primer-react | 12 | 67 | 0.671 |
| pronghorn | 6 | 27 | 0.747 |

Mean 0.721, lowest 0.651: 0 of 7 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-local did not pass the promotion gate: milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
