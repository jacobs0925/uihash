# Triage model report (variant: local)

Training rows: 5330 findings of 758 PRs; evaluation rows: 1153 findings of 211 PRs.

## Cross-validation on the training data (whole groups held out: unseen operators or apps)

- logistic: PR-level AUROC 0.719 over 583 single-change PRs (the rules as a 0/1 score: 0.318); finding-level AUROC 0.690
- trees: PR-level AUROC 0.740 over 583 single-change PRs (the rules as a 0/1 score: 0.318); finding-level AUROC 0.717

## Evaluation PRs (never fitted)

### logistic

thresholds from the training data: flag ≥ 0.835, obvious ≥ 0.999

| set | good outcome | rules | model | rules or model |
|---|---|---|---|---|
| 44 regressions | a finding flagged | 16 | 26 | 35 |
| 123 deliberate changes | nothing flagged | 22 | 110 | 20 |
| 44 mixed PRs | mistake side flagged | 1 | 34 | 35 |
| 44 mixed PRs | deliberate side not flagged | 4 | 34 | 3 |

PR-level AUROC, regressions vs deliberate changes: **0.817**

At the rules' false-alarm rate on the deliberate changes (101 of 123; threshold read off the evaluation set, so for comparison only): 44 of 44 regressions flagged (rules: 16).
### trees

thresholds from the training data: flag ≥ 0.531, obvious ≥ 0.999

| set | good outcome | rules | model | rules or model |
|---|---|---|---|---|
| 44 regressions | a finding flagged | 16 | 30 | 39 |
| 123 deliberate changes | nothing flagged | 22 | 103 | 15 |
| 44 mixed PRs | mistake side flagged | 1 | 39 | 40 |
| 44 mixed PRs | deliberate side not flagged | 4 | 33 | 3 |

PR-level AUROC, regressions vs deliberate changes: **0.843**

At the rules' false-alarm rate on the deliberate changes (101 of 123; threshold read off the evaluation set, so for comparison only): 44 of 44 regressions flagged (rules: 16).
## Two-phase: model + a head fitted on the evaluation PRs of the other apps (leave one app out)

### logistic + head

| set | good outcome | rules | two-phase | rules or two-phase |
|---|---|---|---|---|
| 44 regressions | a finding flagged | 16 | 26 | 35 |
| 123 deliberate changes | nothing flagged | 22 | 112 | 20 |
| 44 mixed PRs | mistake side flagged | 1 | 32 | 33 |
| 44 mixed PRs | deliberate side not flagged | 4 | 37 | 3 |

PR-level AUROC, regressions vs deliberate changes: **0.805**

### trees + head

| set | good outcome | rules | two-phase | rules or two-phase |
|---|---|---|---|---|
| 44 regressions | a finding flagged | 16 | 30 | 39 |
| 123 deliberate changes | nothing flagged | 22 | 106 | 15 |
| 44 mixed PRs | mistake side flagged | 1 | 36 | 37 |
| 44 mixed PRs | deliberate side not flagged | 4 | 35 | 3 |

PR-level AUROC, regressions vs deliberate changes: **0.814**

## Strongest features (logistic model, standardized weights)

`contrast_after` -0.66, `prop=type` +0.47, `edit_shared_log` +0.46, `prop=size` +0.45, `prop=position` +0.44, `value_added` +0.43, `cause=all` -0.39, `kind=text contrast` +0.38, `type=contrast` +0.38, `reach=token` -0.38, `cause=none` +0.34, `struct=removed` -0.34, `type=focus` -0.33, `prop=spacing` +0.32, `contrast_before` -0.31, `prop=shadow` +0.31, `places_log` -0.29, `attr=@y` +0.28, `kind=layout: content now cut off` -0.26, `reach=inside` -0.25, `prop=border` +0.24, `attr=@height` -0.24, `triage=yours` -0.21, `prop=flex` +0.21, `reach=elsewhere` -0.20, `struct=added` -0.19, `triage=check` +0.18, `text_case_only` -0.18, `text_numbers_only` -0.18, `beats_important` +0.17

Wrote the logistic model to /home/runner/work/_temp/model.next/logistic-local.json; best on the evaluation PRs: trees (AUROC 0.843)
