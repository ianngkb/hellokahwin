# CONT-02 ship — the ingest run.
#
# Expects PGPASSWORD and (for the commit pass) VERCEL_TOKEN already in the
# environment, injected by nested vault.ps1 `run` calls so neither value ever
# reaches a command line.
#
#   $env:HK_MODE = 'dry'     -> validate + plan only, no writes
#   $env:HK_MODE = 'commit'  -> write, publish, revalidate, purge
param()
$ErrorActionPreference = 'Continue'

$enc = [uri]::EscapeDataString($env:PGPASSWORD)
$db = "postgresql://postgres.nyidzlupgmyyazhyykuk:$enc@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
$D = "C:\Users\Ian Ng\Documents\Code\hellokahwin\hellokahwin\docs\plans\aug-23-2026-session-01\drafts"

# The 23 articles whose draft carries an image production lacks, in the order
# the audit reported them. Every one of these was proved, block by block, to
# reproduce its live prose exactly — see .tmp-cont02/plan.json.
$targets = @(
  'ingest\C4-1-A1-baju-pengantin-sewa-atau-beli.md',
  'ingest\C4-2-A1-inai-tangan-pengantin.md',
  'ingest\C4-1-A2-songket-tenunan-tangan-atau-cetak.md',
  'ingest\A3-mas-kahwin-johor.md',
  'ingest\A4-mas-kahwin-kelantan-terengganu.md',
  'ingest\A6-mas-kahwin-pahang-negeri-sembilan.md',
  'ingest\A5-mas-kahwin-perak.md',
  'ingest\A7-mas-kahwin-sabah-sarawak.md',
  'borang-nikah.md',
  'lafaz-taklik.md',
  'rukun-nikah.md',
  'syarat-sah-nikah.md',
  'ingest\C5-2-A1-contoh-kad-jemputan-kahwin.md',
  'ingest\P7-A1-cincin-tunang.md',
  'ingest\P7-A3-doa-majlis-pertunangan.md',
  'ingest\P7-A2-taaruf-maksud.md',
  'ingest\P3-A3-doa-majlis-perkahwinan.md',
  'ingest\P3-A2-doa-pengantin-baru.md',
  'ingest\P3-A1-ucapan-pengantin-baru.md',
  'ingest\C6-2-A4-bajet-kahwin.md',
  'ingest\C6-2-A2-checklist-kahwin.md',
  'ingest\C6-2-A1-harga-sewa-dewan-kahwin.md',
  'ingest\C6-2-A3-pakej-dewan-kahwin.md'
)
# The four P6 files live at the drafts ROOT, not under ingest/ — the root copy
# IS the canonical one for them. Fix the four paths rather than hand-maintaining
# two lists.
$targets = $targets | ForEach-Object { $_ -replace '^ingest\\C6-2-', 'C6-2-' }

$fail = 0
$i = 0
foreach ($t in $targets) {
  $i++
  $path = Join-Path $D $t
  if (-not (Test-Path $path)) { Write-Output "MISSING FILE: $path"; $fail++; continue }
  Write-Output ""
  Write-Output "===== [$i/$($targets.Count)] $t ====="
  if ($env:HK_MODE -eq 'commit') {
    pnpm --silent ingest $path --db $db --commit --update --publish --revalidate-url https://hellokahwin.com
  }
  else {
    pnpm --silent ingest $path --db $db --update --publish
  }
  if ($LASTEXITCODE -ne 0) { Write-Output "EXIT $LASTEXITCODE on $t"; $fail++ }
}

Write-Output ""
Write-Output "==== $($targets.Count) files, $fail failure(s), mode=$($env:HK_MODE) ===="
if ($fail -gt 0) { exit 1 }
