#!/usr/bin/env bash
export PATH=/usr/bin:$PATH
cd "/c/Users/Ian Ng/orca/workspaces/hellokahwin-site/regression-testing"
R="/c/Users/Ian Ng/orca/workspaces/hellokahwin-site/regression-testing/_bmad-output/autopilot/runs/2026-11-04-homepage-nested-link"
for L in blind edge; do
  ( S=$(date +%s); claude -p --model claude-opus-5 --permission-mode bypassPermissions --strict-mcp-config --mcp-config '{"mcpServers":{}}' < "$R/review-prompt-$L.txt" > "$R/review-raw-$L.tmp" 2>&1; mv "$R/review-raw-$L.tmp" "$R/review-raw-$L.txt"; echo "$L $(( $(date +%s) - S ))" >> "$R/review-secs.txt" ) &
done
wait
echo REVIEW-LAYERS-DONE
