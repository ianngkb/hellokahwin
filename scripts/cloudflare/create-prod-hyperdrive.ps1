# Create (once) the production Hyperdrive config from the existing production
# DATABASE_URL. See create-prod-hyperdrive.mjs. Credentials are injected from
# the local vault, never typed, and never printed.
#   pwsh -NoProfile -File scripts/cloudflare/create-prod-hyperdrive.ps1
$ErrorActionPreference = 'Stop'
$v = Join-Path $HOME 'Documents\Code\brain\skills\tokens\vault.ps1'
$script = Join-Path $PSScriptRoot 'create-prod-hyperdrive.mjs'
$inner = "& '$v' run cloudflare.workers-twn -EnvVar CLOUDFLARE_API_TOKEN -- node '$script'"
& $v run vercel.twn -EnvVar VERCEL_TOKEN -- pwsh -NoProfile -Command $inner
exit $LASTEXITCODE
