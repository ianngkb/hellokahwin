# Paths are derived from this script's own location, never hardcoded — see the
# note in run-fixcheck.ps1 for why the old absolute path was a real hazard and
# not just an unportability wart.
# $PSScriptRoot IS the review dir; the repo root is three levels above it.
$rv = $PSScriptRoot
$repo = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $rv))
# Terminating for the one thing that must not be allowed to fail silently...
Set-Location -LiteralPath $repo -ErrorAction Stop
# ...then back to Continue, so one failing layer does not abort the others.
$ErrorActionPreference = 'Continue'

foreach ($layer in @('blind','edge','acceptance')) {
  Write-Host "=== LAYER: $layer ==="
  $p = Get-Content -Raw (Join-Path $rv "prompt-$layer.txt")
  codex exec -m gpt-5.6-sol -c model_reasoning_effort=high --cd . $p 2>&1 |
    Tee-Object (Join-Path $rv "out-$layer.txt")
}
'DONE' | Set-Content (Join-Path $rv 'REVIEW_DONE')
Write-Host 'ALL LAYERS COMPLETE'
