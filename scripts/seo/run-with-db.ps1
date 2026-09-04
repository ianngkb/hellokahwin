# Run a script with DATABASE_URL built from the vault, so the password is never
# typed on a command line, written to a .env, or printed.
#
#   pwsh -File scripts/seo/run-with-db.ps1 -Cmd pnpm,exec,tsx,scripts/seo/rewrite-internal-hrefs.mts
#
# Host and user come from brain's token registry (session-mode pooler on 5432 —
# 6543 is the transaction pooler the app itself uses, and CLI work stays off
# the app's lanes). The password is injected as PGPASSWORD by vault.ps1 and
# consumed here; it never leaves this process tree.
param([Parameter(ValueFromRemainingArguments)][string[]]$Cmd)
$ErrorActionPreference = 'Stop'
if (-not $Cmd) { throw 'nothing to run' }
$vault = Join-Path $HOME 'Documents\Code\brain\skills\tokens\vault.ps1'
$inner = @'
$pw = [uri]::EscapeDataString($env:PGPASSWORD)
$env:DATABASE_URL = "postgresql://postgres.nyidzlupgmyyazhyykuk:$pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
$env:PGPASSWORD = $null
& __CMD__
exit $LASTEXITCODE
'@
$quoted = ($Cmd | ForEach-Object { "'" + ($_ -replace "'", "''") + "'" }) -join ' '
# .Replace(), NOT -replace. The replacement side of -replace is a regex
# substitution, so a '$' anywhere in an argument (a path, a flag value) would
# be read as a capture-group reference and silently mangle the command.
$inner = $inner.Replace('__CMD__', $quoted)
& $vault run supabase.hellokahwin-dbpass -EnvVar PGPASSWORD -- pwsh -NoProfile -Command $inner
exit $LASTEXITCODE
