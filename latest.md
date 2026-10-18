### uihash learn · round 65 · 2026-10-18 15:12 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 62 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 792 | +0 | 13 | 42 | 4 | 733 | 28 |
| heartlines | 2525 | +107 | 174 | 210 | 36 | 2105 | 2 |
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

Held out of training and judged on: 53 regressions, 214 intended changes, 52 mixed. Trained on 1231 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.685, unseen 0.701 (chosen); logistic-local 0.669, unseen 0.696; trees-all 0.643, unseen 0.699.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.797 | -0.056 to 0.126 | 5 → 2 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 6 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.712 | -0.037 to 0.102 | 6 → 7 | 29 → 31 | 4 → 3 | 2 → 3 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.550 | -0.200 to 0.016 | 6 → 6 | 11 → 12 | 7 → 6 | 1 → 1 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.765 | 0.010 to 0.301 | 2 → 1 | 12 → 12 | 7 → 5 | 1 → 1 | mistakes flagged: 6 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.710 | -0.098 to 0.123 | 2 → 2 | 9 → 9 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.667 | -0.556 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.700 | -0.500 to 0.100 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.912 | 0.000 to 0.412 | 0 → 0 | 5 → 5 | 1 → 2 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.286 | 0.000 to 0.375 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.683 (logistic), 0.651 (trees).

#### Unseen repositories (logistic-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.742 |
| eui | 3 | 19 | 0.570 |
| heartlines | 174 | 290 | 0.678 |
| livingwitharthritis | 94 | 194 | 0.749 |
| loyal-spark | 60 | 152 | 0.689 |
| milk-me-not | 66 | 231 | 0.720 |
| primer-brand | 1 | 28 | 0.786 |
| primer-react | 12 | 67 | 0.715 |
| primerate | 13 | 47 | 0.612 |
| pronghorn | 23 | 73 | 0.768 |
| skilla | 12 | 51 | 0.639 |

Mean 0.701, lowest 0.612: 0 of 9 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-all did not pass the promotion gate: el400-held-out: mistakes flagged: 6 vs 10 of 20 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 6 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
