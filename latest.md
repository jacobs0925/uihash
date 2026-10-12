### uihash learn · round 1 · 2026-10-12 21:39 UTC

| repository | commits checked | this round | labelled regression | labelled intended | no evidence yet | no findings | failed |
|---|---|---|---|---|---|---|---|
| primer-react | 27 | +27 | 2 | 15 | 2 | 8 | 0 |
| eui | 9 | +9 | 2 | 0 | 4 | 3 | 0 |

Held out of training and judged on: 0 regressions, 1 intended changes, 1 mixed. Trained on 484 PRs (467 synthetic, 17 labelled).

Candidates (mean PR-level AUROC on the held-out commits): logistic-all 1.000 (chosen), logistic-local 0.000, trees-all 1.000.

#### Promotion gate: PASS

| set | PRs | AUROC current | AUROC candidate | 95 % interval of the difference | regressions flagged | deliberate left alone | mixed: mistake flagged | mixed: deliberate left alone | verdict |
|---|---|---|---|---|---|---|---|---|---|
| eui-held-out | 1 | 1.000 | 1.000 | 0.000 to 0.000 | 0 → 0 | 0 → 0 | 1 → 0 | 0 → 0 | pass |
| primer-react-held-out | 1 | n/a | n/a | n/a | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | pass |

Cross-validation on the training data (variant all; whole operators or repositories held out): AUROC 0.822 (logistic), 0.799 (trees).

**Collecting**: 1 of 10 held-out regressions and 2 of 10 held-out intended changes so far: too few to judge a model on.
