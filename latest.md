### uihash learn · round 46 · 2026-10-17 01:49 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 42 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 695 | +15 | 10 | 40 | 3 | 642 | 5 |
| heartlines | 455 | +204 | 12 | 29 | 3 | 411 | 0 |
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

Held out of training and judged on: 37 regressions, 170 intended changes, 39 mixed. Trained on 957 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.695, unseen 0.691; logistic-local 0.677, unseen 0.689; trees-all 0.673, unseen 0.693 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.763 | -0.078 to 0.081 | 5 → 5 | 9 → 10 | 5 → 5 | 1 → 1 | pass |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 10 | 0.625 | 0.688 | 0.000 to 0.320 | 1 → 1 | 4 → 4 | 0 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.572 | -0.211 to 0.080 | 6 → 6 | 11 → 11 | 7 → 7 | 1 → 2 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.666 | -0.044 to 0.139 | 2 → 2 | 12 → 12 | 7 → 7 | 1 → 1 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.742 | -0.056 to 0.139 | 2 → 2 | 9 → 9 | 7 → 5 | 1 → 1 | mistakes flagged: 7 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | 0.000 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.650 | -0.629 to 0.000 | 0 → 0 | 8 → 8 | 1 → 1 | 1 → 1 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.794 | -0.118 to 0.235 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.675 (logistic), 0.683 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.749 |
| eui | 3 | 19 | 0.517 |
| heartlines | 12 | 33 | 0.605 |
| livingwitharthritis | 94 | 194 | 0.764 |
| loyal-spark | 60 | 152 | 0.670 |
| milk-me-not | 66 | 231 | 0.713 |
| primer-brand | 1 | 28 | 0.679 |
| primer-react | 12 | 67 | 0.679 |
| primerate | 10 | 45 | 0.667 |
| pronghorn | 23 | 73 | 0.734 |
| skilla | 12 | 51 | 0.661 |

Mean 0.693, lowest 0.605: 0 of 9 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: milk-me-not-held-out: mistakes flagged: 7 vs 9 of 16 (at most 1 fewer).
