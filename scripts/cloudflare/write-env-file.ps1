# Build the docker env file for scripts/cloudflare/cf-docker.sh.
#   pwsh -NoProfile -File scripts/cloudflare/write-env-file.ps1 <out-path>               # preview
#   pwsh -NoProfile -File scripts/cloudflare/write-env-file.ps1 <out-path> -Production   # hellokahwin.com
# Keep <out-path> OUTSIDE the checkout (a scratch dir) and delete it the moment
# docker exits. Credentials are injected from the local vault (and, for
# -Production, Infisical `hellokahwin`/prod for the Server Actions key), never typed.
param([Parameter(Mandatory)][string]$Out, [switch]$Production)
$ErrorActionPreference = 'Stop'
$v = Join-Path $HOME 'Documents\Code\brain\skills\tokens\vault.ps1'
$script = Join-Path $PSScriptRoot 'write-env-file.mjs'
if ($Production) {
  $inner = "& '$v' run cloudflare.workers-twn -EnvVar CLOUDFLARE_API_TOKEN -- node '$script' '$Out' --production"
  $middle = "& '$v' run vercel.twn -EnvVar VERCEL_TOKEN -- pwsh -NoProfile -Command `"$inner`""
  infisical run --projectId 79665911-0240-4eab-b23c-caae042efecf --env prod `
    --domain https://secrets.thepicklebase.com/api --silent -- pwsh -NoProfile -Command $middle
  exit $LASTEXITCODE
}
$inner = "& '$v' run cron.hellokahwin-cfpreview -EnvVar HK_CF_PREVIEW_CRON_SECRET -- node '$script' '$Out'"
$middle = "& '$v' run cloudflare.workers-twn -EnvVar CLOUDFLARE_API_TOKEN -- pwsh -NoProfile -Command `"$inner`""
& $v run vercel.twn -EnvVar VERCEL_TOKEN -- pwsh -NoProfile -Command $middle
exit $LASTEXITCODE
