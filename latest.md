### uihash learn · round 37 · 2026-10-16 08:37 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 33 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 906 | +0 | 22 | 49 | 0 | 835 | 9 |
| skilla | 310 | +104 | 12 | 44 | 6 | 248 | 2 |
| primerate | 110 | +110 | 9 | 25 | 2 | 74 | 0 |
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

Held out of training and judged on: 37 regressions, 157 intended changes, 39 mixed. Trained on 918 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.676, unseen 0.698; logistic-local 0.682, unseen 0.702; trees-all 0.680, unseen 0.707 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.792 | -0.054 to 0.111 | 5 → 2 | 9 → 10 | 5 → 4 | 1 → 1 | mistakes flagged: 6 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 2 | n/a | n/a | n/a | 1 → 1 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.539 | -0.248 to 0.038 | 6 → 6 | 11 → 11 | 7 → 6 | 1 → 2 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.690 | -0.033 to 0.168 | 2 → 2 | 12 → 12 | 7 → 6 | 1 → 1 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.749 | -0.051 to 0.149 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 2 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | 0.000 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 9 | 0.875 | 0.750 | -0.375 to 0.000 | 0 → 0 | 6 → 6 | 1 → 0 | 1 → 1 | pass |
| pronghorn-held-out | 14 | 0.750 | 0.750 | -0.143 to 0.143 | 0 → 0 | 3 → 3 | 1 → 1 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.214 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.674 (logistic), 0.683 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.748 |
| eui | 3 | 19 | 0.588 |
| heartlines | 5 | 10 | 0.740 |
| livingwitharthritis | 94 | 194 | 0.747 |
| loyal-spark | 60 | 152 | 0.677 |
| milk-me-not | 66 | 231 | 0.717 |
| primer-brand | 1 | 28 | 0.679 |
| primer-react | 12 | 67 | 0.728 |
| primerate | 9 | 29 | 0.640 |
| pronghorn | 22 | 64 | 0.710 |
| skilla | 12 | 51 | 0.654 |

Mean 0.707, lowest 0.640: 0 of 9 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: el400-held-out: mistakes flagged: 6 vs 10 of 20 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
