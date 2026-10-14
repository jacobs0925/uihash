#!/bin/bash
# One round of the self-improvement loop on public data, in two phases. loop.sh runs rounds back to back on
# your own machine, and so does the GitHub workflow (.github/workflows/learn.yml), each phase as a step
# with its own time limit.
#   walk   check the next commits (walk.js) for a time budget, one repository at a time: the next
#          repository in REPOS starts only when the ones before it have no commits left to check
#   train  relabel every repository (label.js) and store its summaries compressed, then retrain with
#          weekly.js on the real commits only: a fixed share of each repository's commits is held out
#          (dataset.js --split), three candidates are trained on the rest, the best on the held-out commits
#          goes through the promotion gate against the current model, and report.js adds the round's
#          summary, decision and history line.
#          The chosen model (model.json, model-report.md) and the reports go to $MODEL_OUT.
#
# Usage: learn/public/round.sh walk  <dataDir> <workDir>
#        learn/public/round.sh train <dataDir> [current model.json]
# <dataDir>/<repo>/<sha>/  what walk.js and label.js write for a commit
# <dataDir>/latest.md, history.jsonl   the last round's summary, and one line per round
# Environment:
#   REPOS          repositories from repos.json, in the order they are walked    (default: all, in file order)
#   WALK_MINUTES   the walk's time budget; a commit in progress still finishes    (default 165)
#   BATCH          at most this many commits per repository and round             (default: no limit)
#   SINCE          oldest commit date to walk                                     (default 2025-10-01)
#   MEM_FLOOR_MB   below this much free memory a commit is given up (walk.js)   (default 15 % of the machine's)
#   SYNTH          labelled synthetic PRs to train on as well (generate.js output) (default: none)
#   HOLDOUT        share of each repository's commits held out for evaluation    (default 0.2)
#   EVAL           more labelled PRs to evaluate on, never trained on (your own, say; optional)
#   MIN_EVAL, MARGIN   when a model is proposed: see report.js
#   PY             a python with numpy and scikit-learn                (default: weekly.js's choice)
#   MODEL_OUT      where the round's model and reports go             (default <dataDir>/models/latest)
#   LOGS           where the walk, label and weekly logs go          (default <dataDir>/logs)
#   KEEP_MODELS    1: also keep each round's model in <dataDir>/models/<time>/    (default 0)
set -u
PHASE=$1; DATA=$2
HERE=$(cd "$(dirname "$0")/../.." && pwd)
read -r -a repos <<< "${REPOS:-$(node -p "Object.keys(require('$HERE/learn/public/repos.json')).join(' ')")}"
LOGS=${LOGS:-$DATA/logs}
mkdir -p "$DATA" "$LOGS"

if [ "$PHASE" = walk ]; then
  WORK=$3; mkdir -p "$WORK"
  [[ ${WALK_MINUTES:-165} =~ ^[0-9]+$ ]] || { echo "WALK_MINUTES must be a whole number of minutes"; exit 2; }
  # one repository at a time, in the order of REPOS: each walks until its window is used up (or it cannot
  # get past failing commits), and only then does the next one get the time that is left. Repositories
  # already used up come first each round, but only have their new commits to check.
  end=$(( $(date +%s) + ${WALK_MINUTES:-165} * 60 ))
  for r in "${repos[@]}"; do
    while :; do
      minutes=$(( (end - $(date +%s)) / 60 ))
      [ "$minutes" -gt 0 ] || break 2
      echo "== $r: up to $minutes minutes"
      node "$HERE/learn/public/walk.js" "$r" "$WORK" "$DATA" --since "${SINCE:-2025-10-01}" --minutes "$minutes" --max "${BATCH:-100000}" 2>&1 | tee -a "$LOGS/walk-$r.log"
      # 3: the walk gave up a commit that ran the machine out of memory, and stopped; the rest is still to walk
      [ "${PIPESTATUS[0]}" = 3 ] || break
    done
  done

elif [ "$PHASE" = train ]; then
  CURRENT=${3:-}; OUT=${MODEL_OUT:-$DATA/models/latest}
  [ -n "${PY:-}" ] && export PYTHON=$PY
  args=(); [ -n "${SYNTH:-}" ] && args+=(--train "$SYNTH")      # real commits only, unless asked
  if [ -n "${EVAL:-}" ]; then read -r -a evals <<< "$EVAL"; args+=(--eval "${evals[@]}"); fi
  split=()
  for r in "${repos[@]}"; do
    [ -d "$DATA/$r" ] || continue
    node "$HERE/learn/public/label.js" "$DATA/$r" | tee -a "$LOGS/label.log"
    # keep what training needs, compressed: the summary (labels and features come from it); uihash's
    # screenshots and comment can be made again by walking the commit again
    find "$DATA/$r" -mindepth 2 -maxdepth 2 \( -name '*.png' -o -name '*.html' -o -name comment.md \) -delete
    find "$DATA/$r" -mindepth 2 -maxdepth 2 -name summary.json -exec gzip -9f {} +
    split+=("$DATA/$r")
  done
  [ ${#split[@]} -gt 0 ] && args+=(--split "${split[@]}" --holdout "${HOLDOUT:-0.2}")
  [ -n "$CURRENT" ] && [ -f "$CURRENT" ] && args+=(--current "$CURRENT")
  M=$OUT.next; rm -rf "$M"
  # weekly.js exits 1 when the gate does not pass, which is no failure here: result.json says what happened
  node "$HERE/learn/weekly.js" "${args[@]}" --out "$M" >> "$LOGS/weekly.log" 2>&1
  tail -1 "$LOGS/weekly.log"
  if [ ! -f "$M/result.json" ]; then tail -20 "$LOGS/weekly.log"; rm -rf "$M"; exit 1; fi
  CURRENT_MODEL="$CURRENT" node "$HERE/learn/public/report.js" "$DATA" "$M" "${repos[@]}" || { rm -rf "$M"; exit 1; }
  # keep the chosen model and its report; the rows and the other candidates can be made again
  best=$(node -p "require(process.argv[1]).best || ''" "$M/result.json")
  if [ -n "$best" ]; then cp "$M/$best.md" "$M/model-report.md"; fi
  rm -f "$M/rows.jsonl" "$M"/logistic-* "$M"/trees-*
  cp "$M/summary.md" "$DATA/latest.md"
  [ "${KEEP_MODELS:-0}" = 1 ] && mkdir -p "$DATA/models" && cp -r "$M" "$DATA/models/$(date -u +%Y%m%dT%H%M%SZ)"
  rm -rf "$OUT"; mkdir -p "$(dirname "$OUT")"; mv "$M" "$OUT"

else
  echo "usage: $0 walk <dataDir> <workDir> | train <dataDir> [current model.json]"; exit 2
fi
