### uihash learn · round 28 · 2026-10-15 15:31 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 325 | +0 | 82 | 126 | 57 | 60 | 23 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 560 | +97 | 53 | 87 | 9 | 411 | 5 |
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

Held out of training and judged on: 35 regressions, 127 intended changes, 34 mixed. Trained on 763 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.744, unseen 0.721; logistic-local 0.752, unseen 0.737 (chosen); trees-all 0.722, unseen 0.734.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.810 | -0.015 to 0.114 | 5 → 4 | 9 → 10 | 5 → 4 | 1 → 1 | mistakes flagged: 8 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 2 | n/a | n/a | n/a | 1 → 1 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 44 | 0.636 | 0.565 | -0.180 to 0.016 | 6 → 6 | 11 → 11 | 5 → 4 | 0 → 0 | pass |
| loyal-spark-held-out | 30 | 0.604 | 0.744 | 0.030 to 0.309 | 2 → 2 | 9 → 9 | 6 → 4 | 1 → 1 | mistakes flagged: 6 vs 8 of 10 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.755 | -0.048 to 0.165 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 3 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | 0.000 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| pronghorn-held-out | 6 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 2 → 2 | 1 → 1 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.719 (logistic), 0.706 (trees).

#### Unseen repositories (logistic-local, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.754 |
| eui | 3 | 19 | 0.517 |
| heartlines | 5 | 10 | 0.740 |
| livingwitharthritis | 82 | 171 | 0.754 |
| loyal-spark | 53 | 120 | 0.702 |
| milk-me-not | 66 | 231 | 0.742 |
| primer-brand | 1 | 28 | 0.714 |
| primer-react | 12 | 67 | 0.713 |
| pronghorn | 6 | 27 | 0.753 |

Mean 0.737, lowest 0.702: 0 of 7 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-local did not pass the promotion gate: el400-held-out: mistakes flagged: 8 vs 10 of 20 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 6 vs 8 of 10 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
