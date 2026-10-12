// Learned triage at check time: a model trained by learn/train.py scores each finding with the
// probability that the change was not intended. Advisory only: the rules stay the floor, the score can
// add flags and reorder the list, never remove a 🚫 or approve anything (see learn/HANDOFF.md).
//
// model.json (written by train.py):
//   { kind: 'logistic', features: [...], mean: [...], scale: [...], coef: [...], intercept, thresholds: { flag, obvious } }
//   { kind: 'trees', features: [...], init, rate, trees: [{ feature: [...], threshold: [...], left: [...], right: [...], value: [...] }], thresholds }
// A feature the finding does not have counts as 0; a feature the model does not know is ignored.
const fs = require('fs');
const { findingsOf } = require('./features.js');

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

function loadModel(file) {
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!['logistic', 'trees'].includes(m.kind) || !Array.isArray(m.features) || !m.thresholds) throw new Error(`${file}: not a uihash triage model`);
  return m;
}

// score of one feature dict x
function scoreOf(m, x) {
  if (m.kind === 'logistic') {
    let z = m.intercept;
    for (let i = 0; i < m.features.length; i++) z += m.coef[i] * ((x[m.features[i]] || 0) - m.mean[i]) / (m.scale[i] || 1);
    return sigmoid(z);
  }
  // gradient-boosted trees (sklearn's binomial deviance): log-odds = init + rate · Σ tree(x)
  const v = m.features.map((f) => x[f] || 0);
  let z = m.init;
  for (const t of m.trees) {
    let k = 0;
    while (t.left[k] !== -1) k = v[t.feature[k]] <= t.threshold[k] ? t.left[k] : t.right[k];
    z += m.rate * t.value[k];
  }
  return sigmoid(z);
}

// Adds `score` (0..1) to every fresh finding of a summary.json, `obvious: true` at or above the
// model's obvious-mistake threshold and `modelFlag: true` at or above its flag threshold, plus
// summary.model describing the model. Returns the summary.
function scoreSummary(s, m) {
  for (const { f, x } of findingsOf(s)) {
    const p = scoreOf(m, x);
    f.score = Math.round(p * 1000) / 1000;
    if (p >= m.thresholds.flag) f.modelFlag = true;
    if (p >= m.thresholds.obvious) f.obvious = true;
  }
  s.model = { kind: m.kind, variant: m.variant || 'all', thresholds: m.thresholds, ...(m.trained_on ? { trainedOn: m.trained_on.prs } : {}) };
  return s;
}

module.exports = { loadModel, scoreOf, scoreSummary };
