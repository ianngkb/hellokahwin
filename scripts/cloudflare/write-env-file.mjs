// Write the docker env file a Cloudflare build/deploy of HelloKahwin needs.
//
//   node scripts/cloudflare/write-env-file.mjs <out-path>
//
// Run it through scripts/cloudflare/write-env-file.ps1, which injects the three
// credentials it reads (never on a command line):
//   VERCEL_TOKEN               vault vercel.twn            — reads the app's env from Vercel
//   CLOUDFLARE_API_TOKEN       vault cloudflare.workers-twn — passed through for wrangler
//   HK_CF_PREVIEW_CRON_SECRET  vault cron.hellokahwin-cfpreview
//
// Where each value comes from, and why:
//   - Vercel PRODUCTION env: the public, non-secret config (Clerk publishable
//     key, R2 public URLs and bucket names) so the preview renders the same
//     pages as hellokahwin.com.
//   - Vercel PREVIEW env, DATABASE_URL only: the READ-ONLY database role.
//     `next build` prerenders against it. The Worker itself reaches the
//     database through Hyperdrive, whose origin is the same read-only role.
//   - CRON_SECRET: a preview-only value, NOT production's, so the preview's
//     cache-drop route and hellokahwin.com's never share a key.
// Deliberately left out: R2 write keys, Clerk secret, Rekognition, analytics
// salt — the preview is read-only and needs none of them.
//
// The caller deletes the file as soon as docker exits. Never print it.
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
if (!out) throw new Error('usage: write-env-file.mjs <out-path>');
for (const k of ['VERCEL_TOKEN', 'CLOUDFLARE_API_TOKEN', 'HK_CF_PREVIEW_CRON_SECRET']) {
  if (!process.env[k]) throw new Error(`${k} is not set — run through write-env-file.ps1`);
}

const API = 'https://api.vercel.com';
const PROJECT = process.env.VERCEL_PROJECT_ID || 'prj_pGV0Cq7wrZZbCHq94DNYj89Urotj';
const TEAM = process.env.VERCEL_TEAM_ID || 'team_Mkofv56yM7EItimRjwSkiqNC';
const headers = { authorization: `Bearer ${process.env.VERCEL_TOKEN}` };

const FROM_PRODUCTION = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL',
  'R2_PUBLIC_URL',
  'R2_ASSETS_PUBLIC_URL',
  'R2_BUCKET_NAME',
  'R2_ASSETS_BUCKET_NAME',
];

async function decrypted(key, target) {
  const list = await (
    await fetch(`${API}/v10/projects/${PROJECT}/env?teamId=${TEAM}`, { headers })
  ).json();
  const entry = list.envs?.find((e) => e.key === key && e.target.includes(target));
  if (!entry) throw new Error(`Vercel has no ${key} for ${target}`);
  const res = await fetch(`${API}/v1/projects/${PROJECT}/env/${entry.id}?teamId=${TEAM}`, {
    headers,
  });
  if (!res.ok) throw new Error(`Vercel ${key}/${target}: HTTP ${res.status}`);
  return (await res.json()).value;
}

const env = {};
for (const key of FROM_PRODUCTION) env[key] = await decrypted(key, 'production');
env.DATABASE_URL = await decrypted('DATABASE_URL', 'preview');
env.CRON_SECRET = process.env.HK_CF_PREVIEW_CRON_SECRET;
env.HK_READ_ONLY = '1';
env.NEXT_PUBLIC_HOSTING = 'cloudflare';
env.NEXT_TELEMETRY_DISABLED = '1';
env.CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
env.CLOUDFLARE_ACCOUNT_ID = '249af9c6ea41ab1c7cd049f2adf80eb2';

for (const [k, v] of Object.entries(env)) {
  if (/[\r\n]/.test(v))
    throw new Error(`${k} contains a newline; docker env files cannot carry it`);
}
writeFileSync(
  out,
  Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n',
  { mode: 0o600 },
);
console.log(
  `wrote ${Object.keys(env).length} values to the env file (names: ${Object.keys(env).join(', ')})`,
);
