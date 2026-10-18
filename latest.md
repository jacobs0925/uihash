### uihash learn · round 59 · 2026-10-18 03:41 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| el400 | 334 | +0 | 101 | 92 | 6 | 135 | 6 |
| livingwitharthritis | 354 | +0 | 94 | 140 | 57 | 63 | 56 |
| milk-me-not | 846 | +0 | 66 | 192 | 276 | 312 | 6 |
| loyal-spark | 683 | +0 | 60 | 114 | 9 | 500 | 5 |
| pronghorn | 1249 | +0 | 23 | 57 | 0 | 1169 | 11 |
| skilla | 310 | +0 | 12 | 44 | 6 | 248 | 2 |
| primerate | 768 | +14 | 11 | 42 | 4 | 711 | 24 |
| heartlines | 2051 | +131 | 155 | 192 | 24 | 1680 | 0 |
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

Held out of training and judged on: 51 regressions, 206 intended changes, 52 mixed. Trained on 1203 labelled commits, no synthetic PRs.

Candidates (mean PR-level AUROC on the held-out commits, and on unseen repositories): logistic-all 0.684, unseen 0.708; logistic-local 0.671, unseen 0.701; trees-all 0.662, unseen 0.710 (chosen).

#### Promotion gate: FAIL

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| el400-held-out | 42 | 0.765 | 0.770 | -0.091 to 0.100 | 5 → 2 | 9 → 10 | 5 → 6 | 1 → 1 | mistakes flagged: 8 vs 10 of 20 (at most 1 fewer) |
| eui-held-out | 4 | 0.750 | 0.500 | -0.500 to 0.000 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 | pass |
| heartlines-held-out | 73 | 0.681 | 0.695 | -0.059 to 0.098 | 6 → 7 | 27 → 27 | 4 → 4 | 2 → 2 | pass |
| livingwitharthritis-held-out | 48 | 0.629 | 0.556 | -0.227 to 0.054 | 6 → 6 | 11 → 11 | 7 → 7 | 1 → 1 | pass |
| loyal-spark-held-out | 38 | 0.634 | 0.703 | 0.000 to 0.168 | 2 → 2 | 12 → 12 | 7 → 6 | 1 → 1 | pass |
| milk-me-not-held-out | 53 | 0.701 | 0.727 | -0.076 to 0.136 | 2 → 3 | 9 → 9 | 7 → 5 | 1 → 3 | pass |
| primer-brand-held-out | 4 | n/a | n/a | n/a | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 | pass |
| primer-react-held-out | 11 | 0.889 | 0.833 | -0.250 to 0.000 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 | pass |
| primerate-held-out | 11 | 0.900 | 0.700 | -0.500 to 0.000 | 0 → 0 | 8 → 8 | 1 → 0 | 1 → 1 | pass |
| pronghorn-held-out | 17 | 0.735 | 0.853 | 0.000 to 0.294 | 0 → 0 | 5 → 5 | 1 → 2 | 0 → 0 | pass |
| skilla-held-out | 8 | 0.214 | 0.286 | 0.000 to 0.375 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.686 (logistic), 0.686 (trees).

#### Unseen repositories (trees-all, trained on the other repositories; goal 0.935 on each)

| repository | regressions | intended | AUROC |
|---|---|---|---|
| el400 | 101 | 130 | 0.744 |
| eui | 3 | 19 | 0.447 |
| heartlines | 155 | 264 | 0.695 |
| livingwitharthritis | 94 | 194 | 0.752 |
| loyal-spark | 60 | 152 | 0.670 |
| milk-me-not | 66 | 231 | 0.744 |
| primer-brand | 1 | 28 | 0.286 |
| primer-react | 12 | 67 | 0.683 |
| primerate | 11 | 47 | 0.693 |
| pronghorn | 23 | 73 | 0.776 |
| skilla | 12 | 51 | 0.631 |

Mean 0.710, lowest 0.631: 0 of 9 repositories with 5 or more of each are at the goal.

**Keeping the current model**: trees-all did not pass the promotion gate: el400-held-out: mistakes flagged: 8 vs 10 of 20 (at most 1 fewer).
