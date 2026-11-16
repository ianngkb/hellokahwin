// Write the docker env file a Cloudflare build/deploy of HelloKahwin needs.
//
//   node scripts/cloudflare/write-env-file.mjs <out-path> [--production]
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
if (!out) throw new Error('usage: write-env-file.mjs <out-path> [--production]');
const production = process.argv.includes('--production');
const required = production
  ? ['VERCEL_TOKEN', 'CLOUDFLARE_API_TOKEN', 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY']
  : ['VERCEL_TOKEN', 'CLOUDFLARE_API_TOKEN', 'HK_CF_PREVIEW_CRON_SECRET'];
for (const k of required) {
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
if (production) {
  // The production Worker (`--env production`). Same build inputs as the
  // preview — prerendering still reads through the READ-ONLY role — minus the
  // read-only switch, plus the Server Actions key, which Next embeds at build
  // time and must equal the Worker's runtime secret (push-prod-secrets.mjs).
  env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY;
  env.NEXT_PUBLIC_SITE_URL = 'https://hellokahwin.com';
} else {
  env.CRON_SECRET = process.env.HK_CF_PREVIEW_CRON_SECRET;
  env.HK_READ_ONLY = '1';
}
env.NEXT_PUBLIC_HOSTING = 'cloudflare';
env.NEXT_TELEMETRY_DISABLED = '1';
// wrangler/OpenNext read the platform proxy before a deploy and refuse a
// Hyperdrive binding without a LOCAL connection string. It is only used to
// emulate Hyperdrive in `wrangler dev`; a deploy never connects to it, so a
// placeholder pointing nowhere is correct here.
env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE =
  'postgres://local:local@127.0.0.1:5432/local';
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
