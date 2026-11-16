# Push the production Worker's secrets. See push-prod-secrets.mjs.
#   pwsh -NoProfile -File scripts/cloudflare/push-prod-secrets.ps1 [-DryRun]
# Every credential is injected (Infisical, then the local vault), never typed
# and never printed. The vault injections are innermost, so they win over any
# same-named value Infisical carries.
param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
$v = Join-Path $HOME 'Documents\Code\brain\skills\tokens\vault.ps1'
$script = Join-Path $PSScriptRoot 'push-prod-secrets.mjs'
$l3 = "& '$v' run media-tools.twn-prod-key -EnvVar MEDIA_TOOLS_KEY -- node '$script'$(if ($DryRun) { ' --dry-run' })"
$l2 = "& '$v' run cloudflare.workers-twn -EnvVar CLOUDFLARE_API_TOKEN -- pwsh -NoProfile -Command `"$l3`""
$l1 = "& '$v' run vercel.twn -EnvVar VERCEL_TOKEN -- pwsh -NoProfile -Command '$($l2 -replace "'", "''")'"
# Infisical project `hellokahwin`, env prod: NEXT_SERVER_ACTIONS_ENCRYPTION_KEY.
infisical run --projectId 79665911-0240-4eab-b23c-caae042efecf --env prod `
  --domain https://secrets.thepicklebase.com/api --silent -- pwsh -NoProfile -Command $l1
exit $LASTEXITCODE
