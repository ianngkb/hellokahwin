// @vitest-environment node
//
// On a Cloudflare Worker there is no DATABASE_URL: every database client must
// come from the request's HYPERDRIVE binding. This pins that for the raw
// postgres-js client (`getSqlClient`) and for the one route that uses it, the
// nightly GSC sync the Worker's Cron Trigger calls.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const syncPageDaily = vi.fn();
const reresolveUnresolvedPages = vi.fn();
vi.mock('@/lib/analytics/gsc/sync', () => ({
  syncPageDaily: (...a: unknown[]) => syncPageDaily(...a),
  reresolveUnresolvedPages: (...a: unknown[]) => reresolveUnresolvedPages(...a),
  ymd: (n: number) => `day-${n}`,
}));
vi.mock('@/lib/analytics/gsc/client', () => ({
  GscAuthError: class extends Error {},
  openGscSession: async () => ({ token: 't', property: 'https://hellokahwin.com/' }),
}));

const { getSqlClient, sqlClient } = await import('../drizzle');
const { GET } = await import('@/app/api/cron/gsc-sync/route');

const CTX = Symbol.for('__cloudflare-context__');
const g = globalThis as Record<symbol, unknown>;
const HYPERDRIVE_URL = 'postgres://hd_user:hd_pass@hyperdrive.internal:5432/postgres';

type Opts = { options: { host: string[]; user: string } };
const hostOf = (sql: unknown) => (sql as Opts).options.host[0];

afterEach(() => {
  delete g[CTX];
  vi.unstubAllEnvs();
});

describe('getSqlClient', () => {
  it('is the module-level DATABASE_URL pool outside a Worker (Vercel, CLI, tests)', () => {
    expect(getSqlClient()).toBe(sqlClient);
  });

  it('is a per-request client on the HYPERDRIVE binding inside a Worker request', () => {
    const ctx = { env: { HYPERDRIVE: { connectionString: HYPERDRIVE_URL } } };
    g[CTX] = ctx;
    const a = getSqlClient();
    expect(a).not.toBe(sqlClient);
    expect(hostOf(a)).toBe('hyperdrive.internal');
    expect((a as unknown as Opts).options.user).toBe('hd_user');
    // Same request, same client; a new request context gets its own.
    expect(getSqlClient()).toBe(a);
    g[CTX] = { env: { HYPERDRIVE: { connectionString: HYPERDRIVE_URL } } };
    expect(getSqlClient()).not.toBe(a);
  });
});

describe('the GSC cron on a Worker', () => {
  it('syncs through the HYPERDRIVE client, never the DATABASE_URL pool', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret');
    g[CTX] = { env: { HYPERDRIVE: { connectionString: HYPERDRIVE_URL } } };
    syncPageDaily.mockResolvedValue({
      rowsFetched: 0,
      rowsWritten: 0,
      apiCalls: 1,
      truncated: false,
    });
    reresolveUnresolvedPages.mockResolvedValue(0);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const res = await GET(
      new NextRequest('https://hellokahwin.com/api/cron/gsc-sync', {
        headers: { authorization: 'Bearer s3cret' },
      }),
    );
    expect(res.status).toBe(200);

    const used = (syncPageDaily.mock.calls[0][0] as { sql: unknown }).sql;
    expect(used).not.toBe(sqlClient);
    expect(hostOf(used)).toBe('hyperdrive.internal');
    expect(reresolveUnresolvedPages.mock.calls[0][0]).toBe(used);
  });
});
