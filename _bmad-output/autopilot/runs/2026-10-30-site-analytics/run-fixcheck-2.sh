#!/usr/bin/env bash
# Fix-check round 2 (F17 only): one headless Opus session, 15-min cap.
cd "C:/Users/Ian Ng/orca/workspaces/hellokahwin/analytics" || exit 1
R=_bmad-output/autopilot/runs/2026-10-30-site-analytics
t0=$(date +%s); echo "[$(date +%T)] start fixcheck-2"
timeout 900 claude -p --model claude-opus-5-5 --permission-mode bypassPermissions \
  < "$R/review-prompt-fixcheck-2.txt" > "$R/fixcheck-2-raw.txt" 2>&1
rc=$?; t1=$(date +%s)
printf 'fixcheck-2\t%s\t%s\t%s\n' "$((t1-t0))" "$rc" "$t0" > "$R/fixcheck-2-timing.tsv"
echo "[$(date +%T)] done fixcheck-2 rc=$rc $((t1-t0))s"
