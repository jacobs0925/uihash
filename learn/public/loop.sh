#!/bin/bash
# The self-improvement loop on public data, on your own machine: rounds of round.sh (walk the next commits,
# then relabel, retrain and gate) back to back. When a round finds no new commits it sleeps, then picks
# up whatever the repositories merged meanwhile. The GitHub workflow (.github/workflows/learn.yml) runs the
# same rounds every two hours.
#
# Usage: learn/public/loop.sh <workDir> <dataDir> [repo ...]        (repos from repos.json)
# Environment: as for round.sh, plus
#   CURRENT  the model to beat                                        (default learn/model.json, if there is one)
#   SLEEP    seconds to wait when a round finds nothing new          (default 3600)
#   ROUNDS   stop after this many rounds                             (default: never)
# Each round's model is kept in <dataDir>/models/<time>/ (KEEP_MODELS=0 keeps only models/latest).
set -u
WORK=$1; DATA=$2; shift 2
HERE=$(cd "$(dirname "$0")" && pwd)
[ $# -gt 0 ] && export REPOS="$*"
export KEEP_MODELS=${KEEP_MODELS:-1}
checked() { find "$DATA" -mindepth 3 -maxdepth 3 -name meta.json 2>/dev/null | wc -l; }
round=0
while [ -z "${ROUNDS:-}" ] || [ "$round" -lt "$ROUNDS" ]; do
  round=$((round + 1)); before=$(checked)
  "$HERE/round.sh" walk "$DATA" "$WORK"
  "$HERE/round.sh" train "$DATA" "${CURRENT:-$HERE/../model.json}"
  new=$(( $(checked) - before ))
  echo "$(date -u +%FT%TZ) round $round: $new new commits checked" >> "$DATA/loop.log"
  if [ "$new" -eq 0 ]; then sleep "${SLEEP:-3600}"; fi
done
