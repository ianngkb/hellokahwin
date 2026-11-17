// Push the production Worker's runtime values (`wrangler secret bulk --env production`).
//
//   pwsh -NoProfile -File scripts/cloudflare/push-prod-secrets.ps1 [-DryRun]
//
// Every value is COPIED, none is generated here:
//   - Vercel, target Production: the keys in FROM_VERCEL (the same values
//     hellokahwin.com runs on today).
//   - MEDIA_TOOLS_KEY: vault media-tools.twn-prod-key (media-tools-twn's own key).
//   - NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: Infisical `hellokahwin` / prod. The
//     same value must be in the BUILD env (write-env-file.mjs --production), or
//     Server Actions fail to decrypt. Vercel has none (it pins actions per
//     deployment itself), so this one was generated once and stored in
//     Infisical (docs/cloudflare.md, "Production secrets").
// Not pushed: DATABASE_URL (the Worker uses the Hyperdrive binding),
// HK_CRON_ENABLED (set at the switch, see docs/cloudflare.md).
//
// The values go to wrangler through a 0600 file in the OS temp dir (outside
// the checkout), deleted in `finally`. Only key NAMES are printed.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PROJECT = 'prj_pGV0Cq7wrZZbCHq94DNYj89Urotj';
const TEAM = 'team_Mkofv56yM7EItimRjwSkiqNC';
export const FROM_VERCEL = [
  'ADMIN_EMAILS',
  'ANALYTICS_SALT',
  'CLERK_SECRET_KEY',
  'CRON_SECRET',
  'GSC_SERVICE_ACCOUNT_JSON',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL',
  'R2_ACCESS_KEY_ID',
  'R2_ACCOUNT_ID',
  'R2_ASSETS_BUCKET_NAME',
  'R2_ASSETS_PUBLIC_URL',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
  'R2_SECRET_ACCESS_KEY',
  'REKOGNITION_ENABLED',
];
const FROM_ENV = ['MEDIA_TOOLS_KEY', 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY'];

for (const k of ['VERCEL_TOKEN', 'CLOUDFLARE_API_TOKEN', ...FROM_ENV]) {
  if (!process.env[k]) throw new Error(`${k} is not set — run through push-prod-secrets.ps1`);
}

const headers = { authorization: `Bearer ${process.env.VERCEL_TOKEN}` };
const vercel = async (p) => {
  const r = await fetch(`https://api.vercel.com${p}?teamId=${TEAM}`, { headers });
  if (!r.ok) throw new Error(`Vercel ${p}: HTTP ${r.status}`);
  return r.json();
};

const { envs } = await vercel(`/v10/projects/${PROJECT}/env`);
const secrets = {};
const missing = [];
for (const key of FROM_VERCEL) {
  const entry = envs.find((e) => e.key === key && e.target.includes('production'));
  if (!entry) {
    missing.push(key);
    continue;
  }
  secrets[key] = (await vercel(`/v1/projects/${PROJECT}/env/${entry.id}`)).value;
}
if (missing.length) throw new Error(`Vercel production is missing: ${missing.join(', ')}`);
for (const key of FROM_ENV) secrets[key] = process.env[key];

if (process.argv.includes('--dry-run')) {
  console.log(
    `dry run: would push ${Object.keys(secrets).length} secrets: ${Object.keys(secrets).join(', ')}`,
  );
  process.exit(0);
}

const dir = mkdtempSync(path.join(tmpdir(), 'hk-cf-'));
const file = path.join(dir, 'secrets.json');
try {
  writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
  console.log(`pushing ${Object.keys(secrets).length} secrets: ${Object.keys(secrets).join(', ')}`);
  const repo = path.resolve(import.meta.dirname, '..', '..');
  execFileSync(
    process.execPath,
    [
      path.join(repo, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
      'secret',
      'bulk',
      file,
      '--env',
      'production',
    ],
    {
      cwd: repo,
      stdio: 'inherit',
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: '249af9c6ea41ab1c7cd049f2adf80eb2' },
    },
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
