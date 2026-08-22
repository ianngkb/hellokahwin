# Paths are derived from this script's own location, never hardcoded. The old
# absolute `C:\Users\Ian Ng\...` was not merely unportable: `Set-Location` to a
# missing path errors NON-terminatingly, so the script carried on and the
# relative writes below landed under whatever the caller's cwd happened to be.
# Every hellokahwin worktree contains `_bmad-output\autopilot\review\`, so the
# realistic outcome was silently overwriting ANOTHER worktree's transcripts.
# $PSScriptRoot IS the review dir; the repo root is three levels above it.
$ErrorActionPreference = 'Stop'
$rv = $PSScriptRoot
$repo = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $rv))
Set-Location -LiteralPath $repo -ErrorAction Stop

Get-Content -Raw (Join-Path $rv 'prompt-fixcheck2.txt') |
  codex exec -m gpt-5.6-sol -c model_reasoning_effort=high --cd . - 2>&1 |
  Tee-Object (Join-Path $rv 'out-fixcheck2.txt')
'DONE' | Set-Content (Join-Path $rv 'REVIEW_DONE')
Write-Host 'FIX-CHECK 2 COMPLETE'
