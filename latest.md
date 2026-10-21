### uihash learn · round 106 · 2026-10-21 22:41 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 108 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 837 | +0 | 11 | 39 | 13 | 774 | 80 |
| heartlines | 2534 | +0 | 174 | 210 | 36 | 2114 | 2 |
| dapsiwow | 764 | +0 | 120 | 135 | 28 | 481 | 40 |
| primer-react | 186 | +0 | 12 | 63 | 7 | 104 | 0 |
| eui | 99 | +0 | 3 | 17 | 41 | 38 | 3 |
| primer-brand | 102 | +0 | 2 | 61 | 15 | 24 | 0 |
| siemens-ix | 0 | +0 | 0 | 0 | 0 | 0 | 27 |
| vkui | 72 | +0 | 1 | 12 | 12 | 47 | 0 |
| gravity-uikit | 79 | +0 | 2 | 14 | 24 | 39 | 9 |
| fuselage | 35 | +0 | 2 | 24 | 1 | 8 | 3 |
| retail-ui | 37 | +0 | 3 | 10 | 2 | 22 | 3 |
| fluentui | 47 | +0 | 0 | 13 | 0 | 34 | 10 |
| spectrum-web-components-2nd-gen | 54 | +0 | 1 | 14 | 12 | 27 | 2 |
| spectrum-web-components | 4 | +0 | 0 | 2 | 0 | 2 | 1 |
| metabase | 71 | +0 | 1 | 22 | 15 | 33 | 6 |
| porsche | 43 | +0 | 0 | 35 | 1 | 7 | 0 |

Held out of training and judged on: 64 regressions, 283 intended changes, 66 mixed. Trained on 1579 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.697, unseen 0.692; logistic-local 0.692, unseen 0.694 (chosen); trees-all 0.672, unseen 0.693.

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| dapsiwow-held-out | 54 | 0.515 | 0.694 | 0.070 to 0.306 | 4 → 3 | 15 → 20 | 8 → 6 | 0 → 2 | mistakes flagged: 9 vs 12 of 24 (at most 1 fewer) |
| el400-held-out | 42 | 0.765 | 0.798 | -0.044 to 0.112 | 5 → 3 | 9 → 10 | 5 → 4 | 1 → 2 | mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| fluentui-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| fuselage-held-out | 5 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| gravity-uikit-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| heartlines-held-out | 83 | 0.673 | 0.681 | -0.064 to 0.076 | 6 → 6 | 29 → 32 | 4 → 2 | 2 → 4 | mistakes flagged: 8 vs 10 of 31 (at most 1 fewer) |
| livingwitharthritis-held-out | 48 | 0.629 | 0.628 | -0.098 to 0.092 | 6 → 6 | 11 → 12 | 7 → 4 | 1 → 3 | mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) |
| loyal-spark-held-out | 38 | 0.634 | 0.753 | 0.011 to 0.270 | 2 → 1 | 12 → 12 | 7 → 3 | 1 → 2 | mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) |
| metabase-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.742 | -0.066 to 0.151 | 2 → 2 | 9 → 8 | 7 → 4 | 1 → 4 | mistakes flagged: 6 vs 9 of 16 (at most 1 fewer) |
| porsche-held-out | 7 | n/a | n/a | n/a | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 | pass |
| primer-brand-held-out | 13 | n/a | n/a | n/a | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.889 | -0.250 to 0.250 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.450 | -0.818 to 0.000 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.882 | 0.000 to 0.402 | 0 → 0 | 5 → 5 | 1 → 1 | 0 → 0 | pass |
| retail-ui-held-out | 2 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.286 | 0.000 to 0.200 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| spectrum-web-components-2nd-gen-held-out | 5 | 0.800 | 1.000 | 0.000 to 0.600 | 0 → 0 | 1 → 3 | 1 → 1 | 0 → 0 | pass |
| spectrum-web-components-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |
| vkui-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant local; whole operators or repositories held out): AUROC 0.660 (logistic), 0.664 (trees).

#### Unseen repositories (logistic-local, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| dapsiwow | 120 | 200 | 0.651 |
| el400 | 101 | 130 | 0.741 |
| eui | 3 | 20 | 0.458 |
| fluentui | 0 | 13 | n/a |
| fuselage | 2 | 26 | 0.346 |
| gravity-uikit | 2 | 16 | 0.625 |
| heartlines | 174 | 290 | 0.670 |
| livingwitharthritis | 94 | 194 | 0.733 |
| loyal-spark | 60 | 152 | 0.663 |
| metabase | 1 | 23 | 0.478 |
| milk-me-not | 66 | 231 | 0.723 |
| porsche | 0 | 35 | n/a |
| primer-brand | 2 | 63 | 0.556 |
| primer-react | 12 | 67 | 0.728 |
| primerate | 11 | 45 | 0.645 |
| pronghorn | 23 | 73 | 0.735 |
| retail-ui | 3 | 11 | 0.591 |
| skilla | 12 | 51 | 0.646 |
| spectrum-web-components | 0 | 2 | n/a |
| spectrum-web-components-2nd-gen | 1 | 15 | 0.933 |
| vkui | 1 | 12 | 0.667 |

Mean 0.694, lowest 0.645: 0 of 10 repositories with 5 or more of each are at the goal.

**Keeping the current model**: logistic-local did not pass the promotion gate: dapsiwow-held-out: mistakes flagged: 9 vs 12 of 24 (at most 1 fewer) / el400-held-out: mistakes flagged: 7 vs 10 of 20 (at most 1 fewer) / heartlines-held-out: mistakes flagged: 8 vs 10 of 31 (at most 1 fewer) / livingwitharthritis-held-out: mistakes flagged: 10 vs 13 of 18 (at most 1 fewer) / loyal-spark-held-out: mistakes flagged: 4 vs 9 of 11 (at most 1 fewer) / milk-me-not-held-out: mistakes flagged: 6 vs 9 of 16 (at most 1 fewer).
