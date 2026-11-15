# Build the docker env file for scripts/cloudflare/cf-docker.sh.
#   pwsh -NoProfile -File scripts/cloudflare/write-env-file.ps1 <out-path>
# Keep <out-path> OUTSIDE the checkout (a scratch dir) and delete it the moment
# docker exits. Credentials are injected from the local vault, never typed.
param([Parameter(Mandatory)][string]$Out)
$ErrorActionPreference = 'Stop'
$v = Join-Path $HOME 'Documents\Code\brain\skills\tokens\vault.ps1'
$script = Join-Path $PSScriptRoot 'write-env-file.mjs'
$inner = "& '$v' run cron.hellokahwin-cfpreview -EnvVar HK_CF_PREVIEW_CRON_SECRET -- node '$script' '$Out'"
$middle = "& '$v' run cloudflare.workers-twn -EnvVar CLOUDFLARE_API_TOKEN -- pwsh -NoProfile -Command `"$inner`""
& $v run vercel.twn -EnvVar VERCEL_TOKEN -- pwsh -NoProfile -Command $middle
exit $LASTEXITCODE
