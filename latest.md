### uihash learn · round 35 · 2026-10-16 05:46 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 32 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 906 | +204 | 22 | 49 | 0 | 835 | 9 |
| skilla | 206 | +0 | 6 | 32 | 3 | 165 | 1 |
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

Held out of training and judged on: 36 regressions, 150 intended changes, 38 mixed. Trained on 875 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.676, unseen 0.712; logistic-local 0.661, unseen 0.716; trees-all 0.698, unseen 0.721 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.795 | -0.050 to 0.113 | 5 → 4 | 9 → 10 | 5 → 5 | 1 → 1 | pass |
| eui-held-out | 4 | 0.750 | 0.750 | 0.000 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 2 | n/a | n/a | n/a | 1 → 1 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.561 | -0.213 to 0.057 | 6 → 6 | 11 → 11 | 7 → 8 | 1 → 2 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.693 | -0.015 to 0.154 | 2 → 2 | 12 → 12 | 7 → 5 | 1 → 1 | mistakes flagged: 7 vs 9 of 11 (at most 1 fewer) |
| milk-me-not-held-out | 53 | 0.701 | 0.757 | -0.048 to 0.157 | 2 → 2 | 9 → 9 | 7 → 5 | 1 → 2 | mistakes flagged: 7 vs 9 of 16 (at most 1 fewer) |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | 0.000 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| pronghorn-held-out | 14 | 0.750 | 0.786 | -0.143 to 0.286 | 0 → 0 | 3 → 3 | 1 → 1 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.357 | 0.000 to 0.400 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.692 (logistic), 0.694 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.750 |
| eui | 3 | 19 | 0.482 |
| heartlines | 5 | 10 | 0.740 |
| livingwitharthritis | 94 | 194 | 0.771 |
| loyal-spark | 60 | 152 | 0.677 |
| milk-me-not | 66 | 231 | 0.717 |
| primer-brand | 1 | 28 | 0.571 |
| primer-react | 12 | 67 | 0.698 |
| pronghorn | 22 | 64 | 0.715 |
| skilla | 6 | 35 | 0.700 |

Mean 0.721, lowest 0.677: 0 of 8 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: loyal-spark-held-out: mistakes flagged: 7 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 7 vs 9 of 16 (at most 1 fewer).
