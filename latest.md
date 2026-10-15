### uihash learn · round 31 · 2026-10-15 21:12 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 27 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +81 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 454 | +46 | 6 | 21 | 0 | 427 | 2 |
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

Held out of training and judged on: 35 regressions, 136 intended changes, 37 mixed. Trained on 809 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.735, unseen 0.726; logistic-local 0.723, unseen 0.727; trees-all 0.742, unseen 0.729 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.786 | -0.073 to 0.114 | 5 → 5 | 9 → 10 | 5 → 4 | 1 → 1 | pass |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 2 | n/a | n/a | n/a | 1 → 1 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.579 | -0.185 to 0.068 | 6 → 6 | 11 → 11 | 7 → 6 | 1 → 2 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.684 | -0.047 to 0.174 | 2 → 2 | 12 → 11 | 7 → 6 | 1 → 1 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.753 | -0.050 to 0.162 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 2 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | 0.000 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| pronghorn-held-out | 6 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 2 → 2 | 1 → 1 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.703 (logistic), 0.705 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.758 |
| eui | 3 | 19 | 0.465 |
| heartlines | 5 | 10 | 0.760 |
| livingwitharthritis | 94 | 194 | 0.765 |
| loyal-spark | 60 | 152 | 0.672 |
| milk-me-not | 66 | 231 | 0.720 |
| primer-brand | 1 | 28 | 0.679 |
| primer-react | 12 | 67 | 0.644 |
| pronghorn | 6 | 27 | 0.784 |

Mean 0.729, lowest 0.644: 0 of 7 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
