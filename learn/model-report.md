# Triage model report (variant: all)

Training rows: 4243 findings of 1718 PRs; evaluation rows: 0 findings of 0 PRs.

## Cross-validation on the training data (whole groups held out: unseen operators or apps)

- logistic: PR-level AUROC 0.912 over 1427 single-change PRs (the rules as a 0/1 score: 0.764); finding-level AUROC 0.878
- trees: PR-level AUROC 0.912 over 1427 single-change PRs (the rules as a 0/1 score: 0.764); finding-level AUROC 0.893
## Strongest features (logistic model, standardized weights)

`triage=yours` -1.86, `contrast_after` -1.85, `triage=check` +1.63, `dE` +1.48, `edit_shared_log` +1.41, `value_removed` +1.32, `pr_hot_share` +1.27, `prop=display` +1.19, `contrast_before` +1.18, `rel_size` +1.16, `text_typo_like` +1.06, `reach=token` -0.90, `reach=inside` +0.88, `triage=token` -0.85, `prop=position` +0.83, `text_numbers_only` +0.79, `pr_types` -0.73, `text_change` -0.70, `broken_value` +0.69, `triage=breaks` +0.67, `reach=elsewhere` -0.66, `prop=radius` -0.50, `struct=removed_child` +0.48, `type=loss` +0.47, `warning` -0.47, `forced_state` +0.47, `type=focus` +0.47, `kind=layout: text now truncated` -0.45, `kind=only some instances changed` -0.45, `type=drift` -0.43

Wrote the trees model to data/final/trees-all.json
