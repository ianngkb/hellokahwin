# Set the GitHub secrets/variables cf-production.yml needs. See the .mjs.
#   pwsh -NoProfile -File scripts/cloudflare/set-github-deploy-secrets.ps1 [-DryRun]
# Credentials are injected (Infisical, the local vault, gh's stored ianngkb
# token), never typed or printed. The active gh account is not changed.
param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
$v = Join-Path $HOME 'Documents\Code\brain\skills\tokens\vault.ps1'
$script = Join-Path $PSScriptRoot 'set-github-deploy-secrets.mjs'
$env:GH_TOKEN = (gh auth token --user ianngkb)
try {
  $l2 = "& '$v' run cloudflare.workers-twn -EnvVar CLOUDFLARE_API_TOKEN -- node '$script'$(if ($DryRun) { ' --dry-run' })"
  $l1 = "& '$v' run vercel.twn -EnvVar VERCEL_TOKEN -- pwsh -NoProfile -Command `"$l2`""
  # Infisical project `hellokahwin`, env prod: NEXT_SERVER_ACTIONS_ENCRYPTION_KEY.
  infisical run --projectId 79665911-0240-4eab-b23c-caae042efecf --env prod `
    --domain https://secrets.thepicklebase.com/api --silent -- pwsh -NoProfile -Command $l1
  exit $LASTEXITCODE
} finally {
  Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
}
