# Run wrangler against the TWN Cloudflare account with the deploy token injected
# from the local vault. The token only ever exists as an env var inside the child.
#
#   pwsh -NoProfile -File scripts/cloudflare/cf.ps1 whoami
#   pwsh -NoProfile -File scripts/cloudflare/cf.ps1 d1 list
param([Parameter(ValueFromRemainingArguments)][string[]]$WranglerArgs)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$vault = Join-Path $HOME 'Documents\Code\brain\skills\tokens\vault.ps1'
$bin = Join-Path $repo 'node_modules\wrangler\bin\wrangler.js'
if ($WranglerArgs.Count -and $WranglerArgs[0] -eq '--') { $WranglerArgs = $WranglerArgs | Select-Object -Skip 1 }
# The TWN account id. Not a secret (it is in every dashboard URL).
if (-not $env:CLOUDFLARE_ACCOUNT_ID) { $env:CLOUDFLARE_ACCOUNT_ID = '249af9c6ea41ab1c7cd049f2adf80eb2' }
& $vault run cloudflare.workers-twn -EnvVar CLOUDFLARE_API_TOKEN -- node $bin @WranglerArgs
exit $LASTEXITCODE
