"""Train uihash's triage model and test it.

Usage: python learn/train.py rows.jsonl model.json [report.md] [--variant all|local] [--kind logistic|trees]

rows.jsonl comes from dataset.js. Rows with split=train are fitted (synthetic PRs, and later real PRs
with trusted labels); rows with split=eval are only scored, so they measure how the model does on PRs
it has never seen. Thresholds are chosen on the training rows too:
  flag     at most 10 % of the training set's deliberate PRs get a finding at or above it
  obvious  findings at or above it are 95 % on the mistake side in the training set, and at most 2 % of
           the training set's deliberate PRs have one (it ships as a 🚫-level flag)
both on the out-of-fold scores of the cross-validation (whole operators held out), not in-sample.

--variant local leaves out the features about the PR as a whole (pr_*), which helps to tell the two
sides of a PR apart when it holds a deliberate change and a mistake.

Writes model.json (by default the logistic model, which src/model.js runs with a dot product; --kind trees
exports the gradient-boosted trees as arrays src/model.js walks), a markdown report with every number,
and the headline numbers as <model>.metrics.json (cross-validation and evaluation AUROCs, training sources).
"""
import json, sys, math
from collections import defaultdict
import numpy as np
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupKFold

args = [a for a in sys.argv[1:] if not a.startswith('--')]
VARIANT = sys.argv[sys.argv.index('--variant') + 1] if '--variant' in sys.argv else 'all'
if VARIANT in args: args.remove(VARIANT)
KIND = sys.argv[sys.argv.index('--kind') + 1] if '--kind' in sys.argv else 'logistic'
if KIND in args: args.remove(KIND)
rows = [json.loads(l) for l in open(args[0], encoding='utf8')]
out_model = args[1]
report = open(args[2], 'w', encoding='utf8') if len(args) > 2 else sys.stdout
def say(*a): print(*a, file=report); report.flush()

train = [r for r in rows if r['split'] == 'train']
test = [r for r in rows if r['split'] == 'eval']
# no_pixel_change: its base rate differs between apps (forced states, Storybook vs whole pages), and leaving it
# out raised every repository's AUROC when unseen (learn-data round 17, leave one repository out)
DROP = {'no_pixel_change'}
for r in train + test: r['x'] = {k: v for k, v in r['x'].items() if k not in DROP and not (VARIANT == 'local' and k.startswith('pr_'))}
# a restore throws a whole commit away, often for something off the checked routes or not visual: its labels
# are kept for evaluation, but weigh a tenth in training (unseen-repository AUROC on round 17's data, after
# flaky.js: 0.688 -> 0.720 mean, 0.641 -> 0.689 lowest, together with DROP)
RESTORE_W = 0.1
def weights(rs):
    w = np.array([r['w'] * (RESTORE_W if r.get('source') == 'restore' else 1.0) for r in rs])
    return w * len(w) / w.sum()
vec = DictVectorizer(sparse=False)
Xtr = vec.fit_transform([r['x'] for r in train]); ytr = np.array([r['y'] for r in train])
names = vec.get_feature_names_out()
wtr = weights(train); PRtr = np.array([r['pr'] for r in train])
rules_flag = lambda r: r['triage'] in ('breaks', 'check')
METRICS = {'variant': VARIANT, 'train_prs': len({r['pr'] for r in train}), 'train_findings': len(train), 'eval_prs': len({r['pr'] for r in test}),
           'train_sources': {s: len({r['pr'] for r in train if r.get('source') == s}) for s in sorted({r.get('source', '') for r in train})}}

def model(kind):
    if kind == 'logistic': return LogisticRegression(C=0.5, class_weight='balanced', max_iter=4000)
    return GradientBoostingClassifier(n_estimators=250, max_depth=3, learning_rate=0.05, subsample=0.8, random_state=0)

# labels the rest of the training data contradicts: out-of-fold logistic scores on the training rows (folds by PR);
# a row scored more than CLEAN away from its label weighs nothing. Only ever on the rows a model is fitted on
# (unseen-repository AUROC on round 17's data, after flaky.js: +0.011 mean, +0.017 lowest)
CLEAN = 0.7
def cleaned(X, y, w, prs):
    g = {p: i for i, p in enumerate(sorted(set(prs)))}
    if len(g) < 2 or len(set(y)) < 2: return w
    G = np.array([g[p] for p in prs]); oof = y.astype(float).copy()
    for a, b in GroupKFold(n_splits=min(5, len(g))).split(X, y, G):
        if len(set(y[a])) < 2: continue
        sc = StandardScaler().fit(X[a]); m = LogisticRegression(C=0.5, class_weight='balanced', max_iter=4000).fit(sc.transform(X[a]), y[a], sample_weight=w[a])
        oof[b] = m.predict_proba(sc.transform(X[b]))[:, 1]
    w = np.where(np.abs(y - oof) > CLEAN, 0.0, w)
    return w * len(w) / w.sum()

def fit(kind, X, y, w, prs=None):
    if prs is not None: w = cleaned(X, y, w, prs)
    if kind == 'logistic':
        sc = StandardScaler().fit(X); m = model(kind).fit(sc.transform(X), y, sample_weight=w)
        return (lambda Z: m.predict_proba(sc.transform(Z))[:, 1]), (m, sc)
    m = model(kind).fit(X, y, sample_weight=w)
    return (lambda Z: m.predict_proba(Z)[:, 1]), (m, None)

def per_pr(rs, scores, t=None):
    """PR-level outcomes: highest score, overall and per side, and whether the rules flag anything"""
    res = {}
    for r, s in zip(rs, scores):
        d = res.setdefault(r['pr'], {'kind': r['kind'], 'app': r['app'], 'max': 0.0, 'm': 0.0, 'd': 0.0, 'rules': False, 'rm': False, 'rd': False})
        d['max'] = max(d['max'], s); f = rules_flag(r); d['rules'] |= f
        if r['side'] == 'mistake': d['m'] = max(d['m'], s); d['rm'] |= f
        else: d['d'] = max(d['d'], s); d['rd'] |= f
    return res

def table(res, t, label='model'):
    reg = [v for v in res.values() if v['kind'] == 'regression']; dl = [v for v in res.values() if v['kind'] == 'deliberate']; mx = [v for v in res.values() if v['kind'] == 'mixed']
    say(f'| set | good outcome | rules | {label} | rules or {label} |'); say('|---|---|---|---|---|')
    if reg: say(f"| {len(reg)} regressions | a finding flagged | {sum(v['rules'] for v in reg)} | {sum(v['max'] >= t for v in reg)} | {sum(v['rules'] or v['max'] >= t for v in reg)} |")
    if dl: say(f"| {len(dl)} deliberate changes | nothing flagged | {sum(not v['rules'] for v in dl)} | {sum(v['max'] < t for v in dl)} | {sum(not (v['rules'] or v['max'] >= t) for v in dl)} |")
    if mx:
        say(f"| {len(mx)} mixed PRs | mistake side flagged | {sum(v['rm'] for v in mx)} | {sum(v['m'] >= t for v in mx)} | {sum(v['rm'] or v['m'] >= t for v in mx)} |")
        say(f"| {len(mx)} mixed PRs | deliberate side not flagged | {sum(not v['rd'] for v in mx)} | {sum(v['d'] < t for v in mx)} | {sum(not (v['rd'] or v['d'] >= t) for v in mx)} |")
    if reg and dl:
        auc = roc_auc_score([1] * len(reg) + [0] * len(dl), [v['max'] for v in reg] + [v['max'] for v in dl])
        say(f'\nPR-level AUROC, regressions vs deliberate changes: **{auc:.3f}**')
        return auc
    return None

say(f'# Triage model report (variant: {VARIANT})\n')
say(f"Training rows: {len(train)} findings of {len({r['pr'] for r in train})} PRs; evaluation rows: {len(test)} findings of {len({r['pr'] for r in test})} PRs.\n")

# ------------------------------------------------- cross-validation on the training data, by group
say('## Cross-validation on the training data (whole groups held out: unseen operators or apps)\n')
groups = sorted({r['group'] for r in train}); gi = {g: i for i, g in enumerate(groups)}
G = np.array([gi[r['group']] for r in train])
OOF = {}
for kind in ('logistic', 'trees'):
    oof = np.zeros(len(train))
    for tr, va in GroupKFold(n_splits=min(5, len(groups))).split(Xtr, ytr, G):
        f, _ = fit(kind, Xtr[tr], ytr[tr], wtr[tr], PRtr[tr]); oof[va] = f(Xtr[va])
    OOF[kind] = oof
    res = per_pr(train, oof)
    single = [v for v in res.values() if v['kind'] != 'mixed']
    ys = [1 if v['kind'] == 'regression' else 0 for v in single]
    METRICS[f'cv_auc_{kind}'] = round(float(roc_auc_score(ys, [v['max'] for v in single])), 4)
    say(f"- {kind}: PR-level AUROC {roc_auc_score(ys, [v['max'] for v in single]):.3f} over {len(single)} single-change PRs "
        f"(the rules as a 0/1 score: {roc_auc_score(ys, [1 if v['rules'] else 0 for v in single]):.3f}); finding-level AUROC {roc_auc_score(ytr, oof):.3f}")

# ------------------------------------------------- unseen repositories: the goal is 0.935 on every one
# every other app's rows (training and held out) fit a model of this run's kind, which scores this app's rows,
# ranked as learn/gate.js ranks them: regressions and mistake sides against deliberate PRs and deliberate sides
GOAL, MIN_EACH = 0.935, 5
def pairs(rs, scores):
    d = {}
    for r, v in zip(rs, scores):
        e = d.setdefault(r['pr'], {'kind': r['kind'], 'max': 0.0, 'm': 0.0, 'd': 0.0})
        e['max'] = max(e['max'], v)
        if r['side'] == 'mistake': e['m'] = max(e['m'], v)
        else: e['d'] = max(e['d'], v)
    pos = [e['max'] for e in d.values() if e['kind'] == 'regression'] + [e['m'] for e in d.values() if e['kind'] == 'mixed']
    neg = [e['max'] for e in d.values() if e['kind'] == 'deliberate'] + [e['d'] for e in d.values() if e['kind'] == 'mixed']
    return pos, neg
allrows = train + test
LORO = {}
for app in sorted({r['app'] for r in allrows}):
    rest = [r for r in allrows if r['app'] != app]; mine = [r for r in allrows if r['app'] == app]
    if len({r['y'] for r in rest}) < 2: continue
    v2 = DictVectorizer(sparse=False); X2 = v2.fit_transform([r['x'] for r in rest])
    f2, _ = fit(KIND, X2, np.array([r['y'] for r in rest]), weights(rest), [r['pr'] for r in rest])
    pos, neg = pairs(mine, f2(v2.transform([r['x'] for r in mine])))
    auc = roc_auc_score([1] * len(pos) + [0] * len(neg), pos + neg) if pos and neg else None
    LORO[app] = [None if auc is None else round(float(auc), 4), len(pos), len(neg)]
scored = [v[0] for v in LORO.values() if v[0] is not None and v[1] >= MIN_EACH and v[2] >= MIN_EACH]
METRICS['loro'] = LORO; METRICS['loro_goal'] = GOAL
if scored:
    METRICS['loro_mean'] = round(float(np.mean(scored)), 4); METRICS['loro_min'] = round(float(min(scored)), 4)
    METRICS['loro_at_goal'] = sum(v >= GOAL for v in scored); METRICS['loro_scored'] = len(scored)
say(f'\n## Unseen repositories ({KIND}: trained on the other apps; goal {GOAL} on each with {MIN_EACH}+ of both)\n')
say('| repository | regressions | intended | AUROC |'); say('|---|---|---|---|')
for app, (auc, p_, n_) in LORO.items(): say(f"| {app} | {p_} | {n_} | {'n/a' if auc is None else f'{auc:.3f}'} |")
if scored: say(f"\nMean {np.mean(scored):.3f}, lowest {min(scored):.3f}; {sum(v >= GOAL for v in scored)} of {len(scored)} repositories at the goal.\n")

# ------------------------------------------------- final models; thresholds from the out-of-fold scores
fitted, best = {}, None
for kind in ('logistic', 'trees'):
    f, m = fit(kind, Xtr, ytr, wtr, PRtr); ptr = OOF[kind]
    tres = per_pr(train, ptr)
    dl = sorted(v['max'] for v in tres.values() if v['kind'] == 'deliberate')
    t_flag = dl[int(math.ceil(0.9 * len(dl))) - 1] + 1e-9 if dl else 0.5
    t_obv = 0.999
    for t in np.linspace(0.5, 0.999, 500):
        sel = ytr[ptr >= t]
        if len(sel) >= 20 and sel.mean() >= 0.95 and (not dl or sum(v >= t for v in dl) <= 0.02 * len(dl)): t_obv = float(t); break
    fitted[kind] = (f, m, t_flag, t_obv)

if test:
    say('\n## Evaluation PRs (never fitted)\n')
    Xte = vec.transform([r['x'] for r in test])
    for kind, (f, m, t_flag, t_obv) in fitted.items():
        p = f(Xte); res = per_pr(test, p)
        say(f'### {kind}\n\nthresholds from the training data: flag ≥ {t_flag:.3f}, obvious ≥ {t_obv:.3f}\n')
        auc = table(res, t_flag)
        dl = [v for v in res.values() if v['kind'] == 'deliberate']; reg = [v for v in res.values() if v['kind'] == 'regression']
        if dl and reg:
            k = sum(v['rules'] for v in dl); ds = sorted((v['max'] for v in dl), reverse=True)
            t_eq = ds[k] + 1e-9 if len(ds) > k else 0
            say(f"\nAt the rules' false-alarm rate on the deliberate changes ({k} of {len(dl)}; threshold read off the evaluation set, "
                f"so for comparison only): {sum(v['max'] >= t_eq for v in reg)} of {len(reg)} regressions flagged (rules: {sum(v['rules'] for v in reg)}).")
        obv = [(r, s) for r, s in zip(test, p) if s >= t_obv]
        if obv:
            kinds = defaultdict(set)
            for r, _ in obv: kinds[r['kind']].add(r['pr'])
            n = defaultdict(set)
            for r in test: n[r['kind']].add(r['pr'])
            say(f"\nObvious mistakes (score ≥ {t_obv:.2f}): {len(obv)} findings, {sum(r['y'] for r, _ in obv) / len(obv):.0%} of them on the mistake side; "
                + ', '.join(f"{len(kinds[k])} of {len(n[k])} {k} PRs have one" for k in ('regression', 'deliberate', 'mixed') if n[k]) + '.\n')
        if auc is not None and (best is None or auc > best[0]): best = (auc, kind)
        if auc is not None: METRICS[f'eval_auc_{kind}'] = round(float(auc), 4)
        if obv: METRICS[f'obvious_precision_{kind}'] = round(sum(r['y'] for r, _ in obv) / len(obv), 4); METRICS[f'obvious_n_{kind}'] = len(obv)

    # two-phase: the model's score and the rules' flags as the only inputs of a small head fitted on
    # evaluation PRs of the other apps (leave one app out), threshold from those apps' deliberate PRs
    apps = sorted({r['app'] for r in test})
    if len(apps) >= 2:
        say('## Two-phase: model + a head fitted on the evaluation PRs of the other apps (leave one app out)\n')
        yte = np.array([r['y'] for r in test]); wte = np.array([r['w'] for r in test])
        for kind, (f, m, _, _) in fitted.items():
            q = np.clip(f(Xte), 1e-4, 1 - 1e-4)
            Z = np.c_[np.log(q / (1 - q)), [1.0 if rules_flag(r) else 0.0 for r in test], [1.0 if r['triage'] == 'breaks' else 0.0 for r in test]]
            out = np.zeros(len(test)); thr = np.zeros(len(test))
            for a in apps:
                tr = np.array([r['app'] != a for r in test]); te = ~tr
                if len(set(yte[tr])) < 2: continue
                head = LogisticRegression(C=1.0, class_weight='balanced', max_iter=2000).fit(Z[tr], yte[tr], sample_weight=wte[tr])
                out[te] = head.predict_proba(Z[te])[:, 1]
                fr = per_pr([r for r, k in zip(test, tr) if k], head.predict_proba(Z[tr])[:, 1])
                dl = sorted(v['max'] for v in fr.values() if v['kind'] == 'deliberate')
                thr[te] = dl[int(math.ceil(0.9 * len(dl))) - 1] + 1e-9 if dl else 0.5
            # per-row thresholds: compare each row with its own app's threshold
            res = per_pr(test, out - thr + 0.5)
            say(f'### {kind} + head\n'); a2 = table(res, 0.5, 'two-phase'); say('')
            if a2 is not None: METRICS[f'eval_auc_{kind}_twophase'] = round(float(a2), 4)

# ------------------------------------------------- what the logistic model learned, and the export
f, (lm, sc), t_flag, t_obv = fitted['logistic']
order = np.argsort(-np.abs(lm.coef_[0]))
say('## Strongest features (logistic model, standardized weights)\n')
say(', '.join(f'`{names[i]}` {lm.coef_[0][i]:+.2f}' for i in order[:30]))
scale = np.where(sc.scale_ == 0, 1, sc.scale_)
common = {'variant': VARIANT, 'features': list(names),
          'trained_on': {'prs': len({r['pr'] for r in train}), 'findings': len(train), 'sets': sorted({r['set'] for r in train})},
          'best_on_eval': best[1] if best else None,
          # its AUROC on each repository when trained without it (the goal: GOAL on every one); later rounds compare
          'unseen': {k: METRICS[k] for k in ('loro_mean', 'loro_min', 'loro_at_goal', 'loro_scored') if k in METRICS}}
if KIND == 'logistic':
    out = {'kind': 'logistic', **common, 'mean': list(sc.mean_), 'scale': list(scale), 'coef': list(lm.coef_[0]),
           'intercept': float(lm.intercept_[0]), 'thresholds': {'flag': t_flag, 'obvious': t_obv}}
else:
    # each regression tree as arrays (left = -1 at a leaf; x[feature] <= threshold goes left) and the
    # prior log-odds, so that log-odds = init + rate * (sum of the leaves reached)
    _, (gm, _), tt_flag, tt_obv = fitted['trees']
    trees = [{'feature': [int(v) for v in e.tree_.feature], 'threshold': [float(v) for v in e.tree_.threshold],
              'left': [int(v) for v in e.tree_.children_left], 'right': [int(v) for v in e.tree_.children_right],
              'value': [float(v) for v in e.tree_.value[:, 0, 0]]} for e in gm.estimators_[:, 0]]
    init = float(gm._raw_predict_init(Xtr[:1])[0, 0])
    z = init + gm.learning_rate * sum(np.array(t['value'])[e.apply(Xtr.astype(np.float32))] for t, e in zip(trees, gm.estimators_[:, 0]))
    assert np.allclose(1 / (1 + np.exp(-z)), gm.predict_proba(Xtr)[:, 1], atol=1e-6), 'the tree export does not reproduce sklearn'
    out = {'kind': 'trees', **common, 'init': init, 'rate': float(gm.learning_rate), 'trees': trees, 'thresholds': {'flag': tt_flag, 'obvious': tt_obv}}
# a few training findings with sklearn's scores, so the JavaScript runtime can check it scores the same
pick = np.linspace(0, len(train) - 1, num=min(8, len(train))).astype(int)
out['checks'] = [{'x': train[i]['x'], 'p': float(fitted[KIND][0](Xtr[i:i + 1])[0])} for i in pick]
json.dump(out, open(out_model, 'w'), indent=1)
json.dump(METRICS, open(out_model.replace('.json', '') + '.metrics.json', 'w'), indent=1)
say(f'\nWrote the {KIND} model to {out_model}' + (f'; best on the evaluation PRs: {best[1]} (AUROC {best[0]:.3f})' if best else ''))
