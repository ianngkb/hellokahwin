# CONT-05 pass 1: ingest the five C2.2 articles with the sibling cross-links
# stripped, so every remaining link resolves against articles that were already
# live. $DB is read from .env inside this script so the literal never appears on
# a typed command line.
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
$env:DB = ((Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', '') -replace '^"|"$', ''
$docs = 'C:\Users\Ian Ng\orca\workspaces\hkdocs-cont05\docs\plans\aug-23-2026-session-01\drafts\pass1-tmp'
$files = @(
  'C2-2-A2-hantaran-tunang-untuk-lelaki.md',
  'C2-2-A3-hantaran-tunang-untuk-perempuan.md',
  'C2-2-A4-berapa-dulang-hantaran-tunang.md',
  'C2-2-A5-hantaran-tunang-simple.md',
  'C2-2-A6-barang-hantaran-tunang.md'
)
$log = "$PSScriptRoot\ingest-pass1.log"
"PASS 1 START  $((Get-Date).ToUniversalTime().ToString('o'))" | Tee-Object -FilePath $log
foreach ($f in $files) {
  "`n############ $f  $((Get-Date).ToUniversalTime().ToString('o'))" | Tee-Object -FilePath $log -Append
  $out = & pnpm --silent ingest "$docs\$f" --db $env:DB --commit --publish --revalidate-url https://hellokahwin.com 2>&1
  $code = $LASTEXITCODE
  ($out | Out-String) -replace 'postgres(ql)?://[^\s]+', '<db>' | Tee-Object -FilePath $log -Append
  "exit=$code" | Tee-Object -FilePath $log -Append
  if ($code -ne 0) { "STOPPING at $f (exit $code)" | Tee-Object -FilePath $log -Append; break }
  Start-Sleep -Seconds 4
}
"PASS 1 END    $((Get-Date).ToUniversalTime().ToString('o'))" | Tee-Object -FilePath $log -Append
