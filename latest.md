### uihash learn · round 22 · 2026-10-15 04:11 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 174 | +0 | 43 | 81 | 23 | 27 | 15 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 191 | +0 | 18 | 34 | 1 | 138 | 5 |
| pronghorn | 408 | +408 | 6 | 21 | 0 | 381 | 2 |
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

Held out of training and judged on: 28 regressions, 104 intended changes, 27 mixed. Trained on 630 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.763, unseen 0.723; logistic-local 0.748, unseen 0.725 (chosen); trees-all 0.753, unseen 0.722.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.822 | -0.006 to 0.127 | 5 → 5 | 9 → 10 | 5 → 4 | 1 → 1 | pass |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 2 | n/a | n/a | n/a | 1 → 1 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 28 | 0.714 | 0.667 | -0.175 to 0.043 | 5 → 5 | 5 → 5 | 2 → 1 | 0 → 0 | pass |
| loyal-spark-held-out | 9 | 0.833 | 0.833 | 0.000 to 0.000 | 0 → 0 | 3 → 3 | 2 → 1 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.745 | -0.054 to 0.151 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.667 | -0.667 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| pronghorn-held-out | 6 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 2 → 2 | 1 → 1 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.736 (logistic), 0.735 (trees).

#### Unseen repositories (logistic-local, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.738 |
| eui | 3 | 19 | 0.500 |
| heartlines | 5 | 10 | 0.760 |
| livingwitharthritis | 43 | 103 | 0.758 |
| loyal-spark | 18 | 50 | 0.721 |
| milk-me-not | 66 | 231 | 0.720 |
| primer-brand | 1 | 28 | 0.679 |
| primer-react | 12 | 67 | 0.665 |
| pronghorn | 6 | 27 | 0.710 |

Mean 0.725, lowest 0.665: 0 of 7 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-local did not pass the promotion gate: milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
