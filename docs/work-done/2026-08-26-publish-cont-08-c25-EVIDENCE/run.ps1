# CONT-08: ingest the eight C2.5 articles in dependency order, production, with
# the site caches dropped and the edge purged after each write. $DB is read from
# .env inside this script so the literal never appears on a typed command line.
# Wrap with: vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN -- pwsh -NoProfile -File .tmp-ops/cont08/run.ps1
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
$env:DB = ((Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', '') -replace '^"|"$', ''
$docs = 'C:\Users\Ian Ng\orca\workspaces\hkdocs-cont08\docs\plans\aug-23-2026-session-01\drafts\ingest'
$files = @(
  'C2-5-A1-nisbah-hantaran.md',
  'C2-5-A2-hantaran-kahwin-5-balas-7.md',
  'C2-5-A3-hantaran-tunang-3-balas-5.md',
  'C2-5-A4-bilangan-dulang-hantaran-ganjil.md',
  'C2-5-A5-duit-hantaran-kahwin.md',
  'C2-5-A6-cara-tetapkan-duit-hantaran.md',
  'C2-5-A7-adat-hantaran-berbeza-negeri.md',
  'C2-5-A8-hantaran-wajib-atau-adat.md'
)
$log = "$PSScriptRoot\ingest-run.log"
"RUN START  $((Get-Date).ToUniversalTime().ToString('o'))" | Tee-Object -FilePath $log
"VERCEL_TOKEN present: $([bool]$env:VERCEL_TOKEN)" | Tee-Object -FilePath $log -Append
foreach ($f in $files) {
  "`n############ $f  $((Get-Date).ToUniversalTime().ToString('o'))" | Tee-Object -FilePath $log -Append
  $out = & pnpm --silent ingest "$docs\$f" --db $env:DB --commit --publish --revalidate-url https://hellokahwin.com 2>&1
  $code = $LASTEXITCODE
  ($out | Out-String) -replace 'postgres(ql)?://[^\s]+', '<db>' | Tee-Object -FilePath $log -Append
  "exit=$code" | Tee-Object -FilePath $log -Append
  if ($code -ne 0) { "STOPPING at $f (exit $code)" | Tee-Object -FilePath $log -Append; break }
  Start-Sleep -Seconds 3
}
"RUN END    $((Get-Date).ToUniversalTime().ToString('o'))" | Tee-Object -FilePath $log -Append
