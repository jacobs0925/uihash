### uihash learn · round 55 · 2026-10-17 19:02 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 51 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 752 | +0 | 11 | 42 | 3 | 696 | 14 |
| heartlines | 1611 | +226 | 124 | 169 | 24 | 1294 | 0 |
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

Held out of training and judged on: 49 regressions, 203 intended changes, 47 mixed. Trained on 1159 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.669, unseen 0.704 (chosen); logistic-local 0.683, unseen 0.701; trees-all 0.672, unseen 0.701.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.800 | -0.048 to 0.120 | 5 → 3 | 9 → 10 | 5 → 5 | 1 → 1 | mistakes flagged: 8 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 63 | 0.641 | 0.689 | -0.040 to 0.132 | 6 → 7 | 22 → 22 | 1 → 3 | 2 → 2 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.556 | -0.176 to 0.009 | 6 → 6 | 11 → 12 | 7 → 7 | 1 → 1 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.749 | -0.003 to 0.271 | 2 → 1 | 12 → 12 | 7 → 5 | 1 → 1 | mistakes flagged: 6 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.714 | -0.089 to 0.126 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 3 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.556 | -0.667 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.800 | -0.364 to 0.200 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.794 | 0.000 to 0.176 | 0 → 0 | 5 → 5 | 1 → 2 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.286 | 0.000 to 0.375 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.690 (logistic), 0.697 (trees).

#### Unseen repositories (logistic-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.736 |
| eui | 3 | 19 | 0.553 |
| heartlines | 124 | 225 | 0.686 |
| livingwitharthritis | 94 | 194 | 0.747 |
| loyal-spark | 60 | 152 | 0.691 |
| milk-me-not | 66 | 231 | 0.721 |
| primer-brand | 1 | 28 | 0.714 |
| primer-react | 12 | 67 | 0.690 |
| primerate | 11 | 47 | 0.668 |
| pronghorn | 23 | 73 | 0.754 |
| skilla | 12 | 51 | 0.639 |

Mean 0.704, lowest 0.639: 0 of 9 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-all did not pass the promotion gate: el400-held-out: mistakes flagged: 8 vs 10 of 20 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 6 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
