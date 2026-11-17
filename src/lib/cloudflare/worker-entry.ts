/**
 * The testable half of `cf-worker.ts` (the Cloudflare Worker entry). That file
 * imports the generated `.open-next/worker.js`, which only exists after a
 * Cloudflare build, so the decisions it makes live here. Nothing in the Next
 * app imports this module.
 */

export type WorkerEnv = {
  HK_NOINDEX?: string;
  /** The git SHA this version was built from (cf-production.yml: `--var HK_BUILD_SHA:<sha>`). */
  HK_BUILD_SHA?: string;
  HK_CRON_ENABLED?: string;
  CRON_SECRET?: string;
  NEXT_PUBLIC_SITE_URL?: string;
} & Record<string, unknown>;

/**
 * Cron schedule -> the route Vercel Cron used to call for it. Must match
 * `triggers.crons` in wrangler.jsonc env.production and `crons` in vercel.json.
 */
export const CRON_ROUTES: Readonly<Record<string, string>> = {
  '30 19 * * *': '/api/cron/gsc-sync',
};

/** `X-Robots-Tag: noindex` for the read-only preview and any workers.dev address. */
export function wantsNoindex(request: Request, env: WorkerEnv): boolean {
  if (env.HK_NOINDEX === '1') return true;
  try {
    return new URL(request.url).hostname.endsWith('.workers.dev');
  } catch {
    return false;
  }
}

/** Scheduled jobs run only once the switch has set HK_CRON_ENABLED=1. */
export function isCronEnabled(env: WorkerEnv): boolean {
  return env.HK_CRON_ENABLED === '1';
}

/**
 * The request a Cron Trigger sends into Next: a GET with the bearer secret,
 * as Vercel Cron sent it. The host is the site's own; it never leaves the
 * isolate (the request is handed straight to the OpenNext handler).
 */
export function cronRequest(path: string, env: WorkerEnv): Request {
  const origin = (env.NEXT_PUBLIC_SITE_URL || 'https://hellokahwin.com').replace(/\/+$/, '');
  const headers = new Headers({ 'user-agent': 'cloudflare-cron' });
  if (env.CRON_SECRET) headers.set('authorization', `Bearer ${env.CRON_SECRET}`);
  return new Request(`${origin}${path}`, { method: 'GET', headers });
}

/** Response header that names the build a Worker response came from. */
export const BUILD_HEADER = 'x-hk-build';

/**
 * The headers `cf-worker.ts` adds to a response, or `null` when it adds none
 * (so the response passes through untouched). `x-hk-build` lets a deploy check
 * prove WHICH version answered (cf-production.yml, verify-deploy.mjs).
 */
export function responseStamps(request: Request, env: WorkerEnv): Record<string, string> | null {
  const stamps: Record<string, string> = {};
  if (wantsNoindex(request, env)) stamps['x-robots-tag'] = 'noindex, nofollow';
  if (env.HK_BUILD_SHA) stamps[BUILD_HEADER] = env.HK_BUILD_SHA;
  return Object.keys(stamps).length > 0 ? stamps : null;
}
