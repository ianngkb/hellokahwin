#!/usr/bin/env node
/**
 * Drop the production content caches after a direct database write.
 *
 * WHY THIS IS NOT OPTIONAL AFTER A CLI WRITE. The public read layer caches
 * with `revalidate: false` and relies entirely on `revalidateTag` firing from
 * the admin write paths. These SEO scripts write to Postgres from outside the
 * running app, so none of those paths fire, and Vercel's Data Cache survives a
 * redeploy — shipping new code does NOT clear it. Without this call the rows
 * are correct in the database and the old page is still what the site serves.
 * `src/app/api/cron/revalidate-content/route.ts` carries the full trace.
 *
 * ── THE SECRET NEVER TOUCHES DISK ─────────────────────────────────────────
 * `CRON_SECRET` lives in the project's Vercel production environment. This
 * reads it through the Vercel REST API into memory and sends it straight back
 * out as a Bearer token. It is deliberately NOT `vercel env pull`, which
 * writes every production secret to a file in the working tree, and it is
 * never logged: the only thing printed is the HTTP status and the route's own
 * JSON reply.
 *
 * Usage (VERCEL_TOKEN injected, never typed):
 *   pwsh -File scripts/seo/run-with-vercel.ps1 pnpm exec tsx scripts/seo/revalidate-production.mts
 */
const token = process.env.VERCEL_TOKEN;
if (!token)
  throw new Error('VERCEL_TOKEN is not set. Run through scripts/seo/run-with-vercel.ps1.');

const PROJECT = 'hellokahwin';
const TEAM = 'thewednotebook';
const SITE = 'https://hellokahwin.com';
const api = async (path: string) => {
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Vercel API ${path} -> ${res.status} ${res.statusText}`);
  return res.json() as Promise<Record<string, unknown>>;
};

const team = (await api(`/v2/teams?slug=${TEAM}`)) as { id?: string };
const teamId = team.id;
if (!teamId) throw new Error(`could not resolve the ${TEAM} team`);

const envs = (await api(`/v9/projects/${PROJECT}/env?teamId=${teamId}`)) as {
  envs: { id: string; key: string; target?: string[] }[];
};
const row = envs.envs.find(
  (e) => e.key === 'CRON_SECRET' && (e.target ?? []).includes('production'),
);
if (!row) throw new Error('no production CRON_SECRET on the hellokahwin project');

const decrypted = (await api(
  `/v9/projects/${PROJECT}/env/${row.id}?teamId=${teamId}&decrypt=true`,
)) as { value?: string };
if (!decrypted.value) throw new Error('Vercel returned no value for CRON_SECRET');

const res = await fetch(`${SITE}/api/cron/revalidate-content`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${decrypted.value}` },
});
const body = await res.text();
console.log(`POST ${SITE}/api/cron/revalidate-content -> ${res.status} ${res.statusText}`);
console.log(body);
if (!res.ok) process.exit(1);
