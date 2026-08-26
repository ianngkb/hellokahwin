# CONT-05 pass 2: re-ingest the five C2.2 articles with the sibling cross-links
# restored, now that all five are live so every link resolves. --update is
# deliberate and reaches only rows this same run created minutes ago.
# publishedAt is pinned in every file to the value pass 1 wrote, so this pass
# does NOT restamp the publish dates.
# Wrap with: vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN -- pwsh -NoProfile -File .tmp-ops/cont05/run-pass2.ps1
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
$env:DB = ((Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', '') -replace '^"|"$', ''
$docs = 'C:\Users\Ian Ng\orca\workspaces\hkdocs-cont05\docs\plans\aug-23-2026-session-01\drafts\ingest'
$files = @(
  'C2-2-A2-hantaran-tunang-untuk-lelaki.md',
  'C2-2-A3-hantaran-tunang-untuk-perempuan.md',
  'C2-2-A4-berapa-dulang-hantaran-tunang.md',
  'C2-2-A5-hantaran-tunang-simple.md',
  'C2-2-A6-barang-hantaran-tunang.md'
)
$log = "$PSScriptRoot\ingest-pass2.log"
"PASS 2 START  $((Get-Date).ToUniversalTime().ToString('o'))" | Tee-Object -FilePath $log
"VERCEL_TOKEN present: $([bool]$env:VERCEL_TOKEN)" | Tee-Object -FilePath $log -Append
foreach ($f in $files) {
  "`n############ $f  $((Get-Date).ToUniversalTime().ToString('o'))" | Tee-Object -FilePath $log -Append
  $out = & pnpm --silent ingest "$docs\$f" --db $env:DB --commit --update --publish --revalidate-url https://hellokahwin.com 2>&1
  $code = $LASTEXITCODE
  ($out | Out-String) -replace 'postgres(ql)?://[^\s]+', '<db>' | Tee-Object -FilePath $log -Append
  "exit=$code" | Tee-Object -FilePath $log -Append
  if ($code -ne 0) { "STOPPING at $f (exit $code)" | Tee-Object -FilePath $log -Append; break }
  Start-Sleep -Seconds 4
}
"PASS 2 END    $((Get-Date).ToUniversalTime().ToString('o'))" | Tee-Object -FilePath $log -Append
