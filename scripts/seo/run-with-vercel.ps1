# Run a script with VERCEL_TOKEN injected from the vault key `vercel.twn`
# (the TWN account token, which covers the hellokahwin project).
#
#   pwsh -File scripts/seo/run-with-vercel.ps1 pnpm exec tsx scripts/seo/revalidate-production.mts
#
# Same shape and same reason as run-with-db.ps1: the token exists only in the
# child process's environment and never reaches a command line or a file.
param([Parameter(ValueFromRemainingArguments)][string[]]$Cmd)
$ErrorActionPreference = 'Stop'
if (-not $Cmd) { throw 'nothing to run' }
$vault = Join-Path $HOME 'Documents\Code\brain\skills\tokens\vault.ps1'
& $vault run vercel.twn -EnvVar VERCEL_TOKEN -- @Cmd
exit $LASTEXITCODE
