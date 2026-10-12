#!/bin/bash
# The self-improvement loop on public data. Each round: walk the next commits of each repository
# (walk.js), relabel everything with what later commits say (label.js), rebuild the rows, retrain
# (train.py), keep the model, its report and its metrics, and append a line to history.jsonl. When a
# round finds no new commits it sleeps, then picks up whatever the repositories merged meanwhile.
#
# Usage: learn/public/loop.sh <workDir> <dataDir> [repo ...]      (repos from repos.json; default primer-react)
# Environment:
#   SYNTH   labelled synthetic PRs (generate.js output) to train on as well        (required)
#   EVAL    labelled PRs held out for evaluation, never trained on                (optional)
#   PY      a python with numpy and scikit-learn                                  (default python3)
#   BATCH   commits per repository per round                                     (default 6)
#   SINCE   oldest commit date to walk                                            (default 2026-01-01)
#   SLEEP   seconds to wait when a round finds nothing new                        (default 3600)
#   ROUNDS  stop after this many rounds                                           (default: never)
set -u
WORK=$1; DATA=$2; shift 2
REPOS=${*:-primer-react}
HERE=$(cd "$(dirname "$0")/../.." && pwd)
mkdir -p "$WORK" "$DATA/models"
round=0
while [ -z "${ROUNDS:-}" ] || [ "$round" -lt "$ROUNDS" ]; do
  round=$((round + 1)); new=0
  for r in $REPOS; do
    before=$(ls "$DATA/$r" 2>/dev/null | wc -l)
    node "$HERE/learn/public/walk.js" "$r" "$WORK" "$DATA" --since "${SINCE:-2026-01-01}" --max "${BATCH:-6}" >> "$DATA/walk-$r.log" 2>&1
    node "$HERE/learn/public/label.js" "$DATA/$r" >> "$DATA/label.log" 2>&1
    after=$(ls "$DATA/$r" 2>/dev/null | wc -l); new=$((new + after - before))
  done
  stamp=$(date -u +%Y%m%dT%H%M%SZ); m="$DATA/models/$stamp"; mkdir -p "$m"
  sets=""; for r in $REPOS; do sets="$sets $DATA/$r"; done
  node "$HERE/learn/dataset.js" --train "$SYNTH" $sets ${EVAL:+--eval "$EVAL"} > "$m/rows.jsonl"
  if "${PY:-python3}" "$HERE/learn/train.py" "$m/rows.jsonl" "$m/model.json" "$m/report.md" > "$m/train.log" 2>&1; then
    rm -f "$m/rows.jsonl"
    ln -sfn "$m" "$DATA/models/latest"
    node -e '
      const fs = require("fs"), [m, round, label] = process.argv.slice(1);
      const metrics = JSON.parse(fs.readFileSync(m + "/model.metrics.json", "utf8"));
      const last = (fs.readFileSync(label, "utf8").trim().split("\n").filter((l) => l.includes("commits checked")).pop() || "");
      console.log(JSON.stringify({ round: +round, at: new Date().toISOString(), model: m, labels: last, ...metrics }));
    ' "$m" "$round" "$DATA/label.log" >> "$DATA/history.jsonl"
  fi
  echo "$(date -u +%FT%TZ) round $round: $new new commits checked" >> "$DATA/loop.log"
  if [ "$new" -eq 0 ]; then sleep "${SLEEP:-3600}"; fi
done
