#!/usr/bin/env bash
# Fix-check round 1: one headless Opus session, 15-min cap.
cd "C:/Users/Ian Ng/orca/workspaces/hellokahwin/analytics" || exit 1
R=_bmad-output/autopilot/runs/2026-10-30-site-analytics
t0=$(date +%s); echo "[$(date +%T)] start fixcheck-1"
timeout 900 claude -p --model claude-opus-5-5 --permission-mode bypassPermissions \
  < "$R/review-prompt-fixcheck.txt" > "$R/fixcheck-1-raw.txt" 2>&1
rc=$?; t1=$(date +%s)
printf 'fixcheck-1\t%s\t%s\t%s\n' "$((t1-t0))" "$rc" "$t0" > "$R/fixcheck-1-timing.tsv"
echo "[$(date +%T)] done fixcheck-1 rc=$rc $((t1-t0))s"
