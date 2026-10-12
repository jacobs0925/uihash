"""Train uihash's triage model and test it.

Usage: python learn/train.py rows.jsonl model.json [report.md] [--variant all|local]

rows.jsonl comes from dataset.js. Rows with split=train are fitted (synthetic PRs, and later real PRs
with trusted labels); rows with split=eval are only scored, so they measure how the model does on PRs
it has never seen. Thresholds are chosen on the training rows too:
  flag     at most 10 % of the training set's deliberate PRs get a finding at or above it
  obvious  findings at or above it are 95 % on the mistake side in the training set
both on the out-of-fold scores of the cross-validation (whole operators held out), not in-sample.

--variant local leaves out the features about the PR as a whole (pr_*), which helps to tell the two
sides of a PR apart when it holds a deliberate change and a mistake.

Writes model.json (the logistic model, which src/model.js-style code can run with a dot product) and a
markdown report with every number.
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
rows = [json.loads(l) for l in open(args[0])]
out_model = args[1]
report = open(args[2], 'w') if len(args) > 2 else sys.stdout
def say(*a): print(*a, file=report); report.flush()

train = [r for r in rows if r['split'] == 'train']
test = [r for r in rows if r['split'] == 'eval']
if VARIANT == 'local':
    for r in train + test: r['x'] = {k: v for k, v in r['x'].items() if not k.startswith('pr_')}
vec = DictVectorizer(sparse=False)
Xtr = vec.fit_transform([r['x'] for r in train]); ytr = np.array([r['y'] for r in train])
names = vec.get_feature_names_out()
wtr = np.array([r['w'] for r in train]); wtr *= len(wtr) / wtr.sum()
rules_flag = lambda r: r['triage'] in ('breaks', 'check')

def model(kind):
    if kind == 'logistic': return LogisticRegression(C=0.5, class_weight='balanced', max_iter=4000)
    return GradientBoostingClassifier(n_estimators=250, max_depth=3, learning_rate=0.05, subsample=0.8, random_state=0)

def fit(kind, X, y, w):
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
        f, _ = fit(kind, Xtr[tr], ytr[tr], wtr[tr]); oof[va] = f(Xtr[va])
    OOF[kind] = oof
    res = per_pr(train, oof)
    single = [v for v in res.values() if v['kind'] != 'mixed']
    ys = [1 if v['kind'] == 'regression' else 0 for v in single]
    say(f"- {kind}: PR-level AUROC {roc_auc_score(ys, [v['max'] for v in single]):.3f} over {len(single)} single-change PRs "
        f"(the rules as a 0/1 score: {roc_auc_score(ys, [1 if v['rules'] else 0 for v in single]):.3f}); finding-level AUROC {roc_auc_score(ytr, oof):.3f}")

# ------------------------------------------------- final models; thresholds from the out-of-fold scores
fitted, best = {}, None
for kind in ('logistic', 'trees'):
    f, m = fit(kind, Xtr, ytr, wtr); ptr = OOF[kind]
    tres = per_pr(train, ptr)
    dl = sorted(v['max'] for v in tres.values() if v['kind'] == 'deliberate')
    t_flag = dl[int(math.ceil(0.9 * len(dl))) - 1] + 1e-9 if dl else 0.5
    t_obv = 0.99
    for t in np.linspace(0.5, 0.99, 50):
        sel = ytr[ptr >= t]
        if len(sel) >= 20 and sel.mean() >= 0.95: t_obv = float(t); break
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
            say(f'### {kind} + head\n'); table(res, 0.5, 'two-phase'); say('')

# ------------------------------------------------- what the logistic model learned, and the export
f, (lm, sc), t_flag, t_obv = fitted['logistic']
order = np.argsort(-np.abs(lm.coef_[0]))
say('## Strongest features (logistic model, standardized weights)\n')
say(', '.join(f'`{names[i]}` {lm.coef_[0][i]:+.2f}' for i in order[:30]))
scale = np.where(sc.scale_ == 0, 1, sc.scale_)
json.dump({'kind': 'logistic', 'variant': VARIANT, 'features': list(names), 'mean': list(sc.mean_), 'scale': list(scale),
           'coef': list(lm.coef_[0]), 'intercept': float(lm.intercept_[0]), 'thresholds': {'flag': t_flag, 'obvious': t_obv},
           'trained_on': {'prs': len({r['pr'] for r in train}), 'findings': len(train), 'sets': sorted({r['set'] for r in train})},
           'best_on_eval': best[1] if best else None}, open(out_model, 'w'), indent=1)
say(f'\nWrote the logistic model to {out_model}' + (f'; best on the evaluation PRs: {best[1]} (AUROC {best[0]:.3f})' if best else ''))
