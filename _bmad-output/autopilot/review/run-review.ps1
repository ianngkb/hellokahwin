$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\Ian Ng\orca\workspaces\hellokahwin\inspire-fixes'
$rv = '_bmad-output\autopilot\review'
foreach ($layer in @('blind','edge','acceptance')) {
  Write-Host "=== LAYER: $layer ==="
  $p = Get-Content -Raw "$rv\prompt-$layer.txt"
  codex exec -m gpt-5.6-sol -c model_reasoning_effort=high --cd . $p 2>&1 | Tee-Object "$rv\out-$layer.txt"
}
'DONE' | Set-Content "$rv\REVIEW_DONE"
Write-Host 'ALL LAYERS COMPLETE'
