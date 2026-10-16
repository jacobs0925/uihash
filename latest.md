### uihash learn · round 32 · 2026-10-16 00:03 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 29 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 702 | +248 | 19 | 34 | 0 | 649 | 6 |
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

Held out of training and judged on: 35 regressions, 139 intended changes, 37 mixed. Trained on 832 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.753, unseen 0.719; logistic-local 0.739, unseen 0.726 (chosen); trees-all 0.745, unseen 0.722.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.818 | -0.007 to 0.121 | 5 → 5 | 9 → 10 | 5 → 4 | 1 → 1 | pass |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 2 | n/a | n/a | n/a | 1 → 1 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.570 | -0.163 to 0.040 | 6 → 6 | 11 → 11 | 7 → 8 | 1 → 1 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.747 | 0.004 to 0.260 | 2 → 2 | 12 → 12 | 7 → 5 | 1 → 1 | mistakes flagged: 7 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.732 | -0.063 to 0.139 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 3 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.722 | -0.556 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| pronghorn-held-out | 9 | 0.833 | 0.833 | 0.000 to 0.000 | 0 → 0 | 2 → 2 | 1 → 1 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.719 (logistic), 0.716 (trees).

#### Unseen repositories (logistic-local, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.749 |
| eui | 3 | 19 | 0.482 |
| heartlines | 5 | 10 | 0.740 |
| livingwitharthritis | 94 | 194 | 0.749 |
| loyal-spark | 60 | 152 | 0.681 |
| milk-me-not | 66 | 231 | 0.732 |
| primer-brand | 1 | 28 | 0.679 |
| primer-react | 12 | 67 | 0.697 |
| pronghorn | 19 | 46 | 0.736 |

Mean 0.726, lowest 0.681: 0 of 7 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-local did not pass the promotion gate: loyal-spark-held-out: mistakes flagged: 7 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
