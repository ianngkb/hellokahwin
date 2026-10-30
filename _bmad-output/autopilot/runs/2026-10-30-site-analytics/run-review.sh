#!/usr/bin/env bash
# Launches every review layer x chunk as its own headless Opus session, 8 at a time, 15-min cap each.
cd "C:/Users/Ian Ng/orca/workspaces/hellokahwin/analytics" || exit 1
RUN=_bmad-output/autopilot/runs/2026-10-30-site-analytics
: > $RUN/review-timings.tsv
one() {
  job=$1; RUN=_bmad-output/autopilot/runs/2026-10-30-site-analytics
  t0=$(date +%s); echo "[$(date +%T)] start $job"
  timeout 900 claude -p --model claude-opus-5-5 --permission-mode bypassPermissions \
    < "$RUN/review-prompt-$job.txt" > "$RUN/review-raw-$job.txt" 2>&1
  rc=$?; t1=$(date +%s)
  printf '%s\t%s\t%s\t%s\n' "$job" "$((t1-t0))" "$rc" "$t0" >> $RUN/review-timings.tsv
  echo "[$(date +%T)] done  $job rc=$rc $((t1-t0))s"
}
export -f one
jobs=""
for c in 1 2 3 4 5 6 7 8; do for l in blind edge acceptance; do jobs="$jobs $l-c$c"; done; done
printf '%s\n' $jobs | xargs -P 8 -I{} bash -c 'one {}'
date -u +%FT%TZ > $RUN/review-ALLDONE
echo ALL DONE
