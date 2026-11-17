// Give .github/workflows/cf-production.yml what it needs to deploy the
// production Worker on a master push. Every value is COPIED, none generated:
//   CLOUDFLARE_API_TOKEN                vault cloudflare.workers-twn (injected)
//   CLOUDFLARE_ACCOUNT_ID               the TWN account id (not secret)
//   CF_PREVIEW_DATABASE_URL             Vercel Preview DATABASE_URL (read-only role)
//   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   Vercel Production
//   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY  Infisical hellokahwin/prod (injected)
// and the public repository variables NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL,
// R2_PUBLIC_URL, R2_ASSETS_PUBLIC_URL (Vercel Production).
//
// It does NOT set HK_CF_PROD_DEPLOY: that switch is flipped at the domain switch.
//
//   pwsh -NoProfile -File scripts/cloudflare/set-github-deploy-secrets.ps1 [-DryRun]
//
// Values reach `gh` on stdin, never on a command line, and are never printed.
// gh acts as ianngkb through GH_TOKEN (injected); the active gh account is untouched.
import { execFileSync } from 'node:child_process';

const REPO = 'ianngkb/hellokahwin';
const PROJECT = 'prj_pGV0Cq7wrZZbCHq94DNYj89Urotj';
const TEAM = 'team_Mkofv56yM7EItimRjwSkiqNC';
const dryRun = process.argv.includes('--dry-run');

for (const k of [
  'VERCEL_TOKEN',
  'CLOUDFLARE_API_TOKEN',
  'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY',
  'GH_TOKEN',
]) {
  if (!process.env[k])
    throw new Error(`${k} is not set — run through set-github-deploy-secrets.ps1`);
}

const headers = { authorization: `Bearer ${process.env.VERCEL_TOKEN}` };
const vercel = async (p) => {
  const r = await fetch(`https://api.vercel.com${p}?teamId=${TEAM}`, { headers });
  if (!r.ok) throw new Error(`Vercel ${p}: HTTP ${r.status}`);
  return r.json();
};
const { envs } = await vercel(`/v10/projects/${PROJECT}/env`);
const fromVercel = async (key, target) => {
  const e = envs.find((x) => x.key === key && x.target.includes(target));
  if (!e) throw new Error(`Vercel has no ${key} for ${target}`);
  return (await vercel(`/v1/projects/${PROJECT}/env/${e.id}`)).value;
};

const secrets = {
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: '249af9c6ea41ab1c7cd049f2adf80eb2',
  CF_PREVIEW_DATABASE_URL: await fromVercel('DATABASE_URL', 'preview'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: await fromVercel(
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'production',
  ),
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,
};
const variables = {
  NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL: await fromVercel(
    'NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL',
    'production',
  ),
  R2_PUBLIC_URL: await fromVercel('R2_PUBLIC_URL', 'production'),
  R2_ASSETS_PUBLIC_URL: await fromVercel('R2_ASSETS_PUBLIC_URL', 'production'),
};

const gh = (args, input) =>
  execFileSync('gh', args, { input, stdio: ['pipe', 'ignore', 'inherit'], env: process.env });

for (const [name, value] of Object.entries(secrets)) {
  if (!value) throw new Error(`${name} is empty`);
  if (!dryRun) gh(['secret', 'set', name, '-R', REPO], value);
  console.log(`${dryRun ? 'would set' : 'set'} secret ${name}`);
}
for (const [name, value] of Object.entries(variables)) {
  if (!dryRun) gh(['variable', 'set', name, '-R', REPO], value);
  console.log(`${dryRun ? 'would set' : 'set'} variable ${name}`);
}
