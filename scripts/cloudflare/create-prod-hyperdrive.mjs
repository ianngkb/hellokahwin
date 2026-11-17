// Create (once) the production Hyperdrive config `hellokahwin-db-prod`.
//
//   pwsh -NoProfile -File scripts/cloudflare/create-prod-hyperdrive.ps1
//
// The origin is the EXISTING production DATABASE_URL from Vercel (target
// Production) — the same user and password, never a new credential. Only the
// port changes when it is Supavisor's transaction pooler (6543): Hyperdrive
// keeps prepared statements across its pool, which transaction mode does not
// support, so it connects to the same pooler host in SESSION mode (5432), as
// the preview's `hellokahwin-db` does. Vercel keeps using 6543, so the two do
// not share Supavisor's per-role session cap.
//
// Credentials (injected by the .ps1, never on a command line):
//   VERCEL_TOKEN          vault vercel.twn
//   CLOUDFLARE_API_TOKEN  vault cloudflare.workers-twn
//
// Prints the config id and the origin host:port only. Never the URL.
// Idempotent: if `hellokahwin-db-prod` exists, prints its id and changes nothing.

const NAME = 'hellokahwin-db-prod';
const ACCOUNT = '249af9c6ea41ab1c7cd049f2adf80eb2';
const PROJECT = 'prj_pGV0Cq7wrZZbCHq94DNYj89Urotj';
const TEAM = 'team_Mkofv56yM7EItimRjwSkiqNC';
const ORIGIN_CONNECTION_LIMIT = 10;

for (const k of ['VERCEL_TOKEN', 'CLOUDFLARE_API_TOKEN']) {
  if (!process.env[k]) throw new Error(`${k} is not set — run through create-prod-hyperdrive.ps1`);
}

const cf = (path, init = {}) =>
  fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/hyperdrive${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'content-type': 'application/json',
    },
  }).then(async (r) => {
    const body = await r.json();
    if (!body.success) {
      // Cloudflare error messages never echo the password; print codes and messages only.
      const errs = (body.errors ?? []).map((e) => `${e.code}: ${e.message}`).join('; ');
      throw new Error(`Cloudflare ${path} HTTP ${r.status}: ${errs}`);
    }
    return body.result;
  });

const existing = (await cf('/configs')).find((c) => c.name === NAME);
if (existing) {
  console.log(
    `${NAME} already exists: ${existing.id} (${existing.origin?.host}:${existing.origin?.port})`,
  );
  process.exit(0);
}

const vercel = (path) =>
  fetch(`https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${TEAM}`, {
    headers: { authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
  }).then((r) => {
    if (!r.ok) throw new Error(`Vercel ${path.split('?')[0]}: HTTP ${r.status}`);
    return r.json();
  });

const { envs } = await vercel(`/v10/projects/${PROJECT}/env`);
const entry = envs.find((e) => e.key === 'DATABASE_URL' && e.target.includes('production'));
if (!entry) throw new Error('Vercel has no production DATABASE_URL');
const { value } = await vercel(`/v1/projects/${PROJECT}/env/${entry.id}`);

const url = new URL(value);
const pooler = url.hostname.endsWith('.pooler.supabase.com');
const port = pooler && url.port === '6543' ? 5432 : Number(url.port || 5432);

const created = await cf('/configs', {
  method: 'POST',
  body: JSON.stringify({
    name: NAME,
    origin: {
      scheme: url.protocol.replace(':', '') === 'postgresql' ? 'postgresql' : 'postgres',
      host: url.hostname,
      port,
      database: decodeURIComponent(url.pathname.replace(/^\//, '')) || 'postgres',
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    },
    caching: { disabled: true },
    origin_connection_limit: ORIGIN_CONNECTION_LIMIT,
  }),
});
console.log(
  `created ${NAME}: ${created.id} (${url.hostname}:${port}, caching off, limit ${ORIGIN_CONNECTION_LIMIT})`,
);
