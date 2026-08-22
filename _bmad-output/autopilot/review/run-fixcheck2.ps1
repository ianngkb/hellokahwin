Set-Location 'C:\Users\Ian Ng\orca\workspaces\hellokahwin\inspire-fixes'
$rv = '_bmad-output\autopilot\review'
Get-Content -Raw "$rv\prompt-fixcheck2.txt" | codex exec -m gpt-5.6-sol -c model_reasoning_effort=high --cd . - 2>&1 | Tee-Object "$rv\out-fixcheck2.txt"
'DONE' | Set-Content "$rv\REVIEW_DONE"
