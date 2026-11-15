// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db/drizzle', () => ({ sqlClient: { fake: true } }));
const openGscSession = vi.fn();
vi.mock('@/lib/analytics/gsc/client', () => {
  class GscAuthError extends Error {}
  return { GscAuthError, openGscSession: (...a: unknown[]) => openGscSession(...a) };
});
const syncPageDaily = vi.fn();
const reresolveUnresolvedPages = vi.fn();
vi.mock('@/lib/analytics/gsc/sync', () => ({
  syncPageDaily: (...a: unknown[]) => syncPageDaily(...a),
  reresolveUnresolvedPages: (...a: unknown[]) => reresolveUnresolvedPages(...a),
  ymd: (n: number) => `day-${n}`,
}));

const { GET, PAGE_DAILY_LOOKBACK_DAYS } = await import('../route');
const { GscAuthError } = await import('@/lib/analytics/gsc/client');

const req = (auth?: string) =>
  new NextRequest('http://localhost:3200/api/cron/gsc-sync', {
    headers: auth ? { authorization: auth } : {},
  });

let logSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 's3cret');
  openGscSession.mockReset();
  syncPageDaily.mockReset();
  reresolveUnresolvedPages.mockReset();
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  logSpy.mockRestore();
  errSpy.mockRestore();
});

describe('GET /api/cron/gsc-sync', () => {
  it('is Bearer-CRON_SECRET only, like the other cron route', async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req('Bearer wrong'))).status).toBe(401);
    vi.stubEnv('CRON_SECRET', '');
    expect((await GET(req('Bearer '))).status).toBe(401);
    expect(openGscSession).not.toHaveBeenCalled();
  });

  it('syncs the trailing window (5 days back to yesterday) and re-resolves', async () => {
    const session = { token: 't', property: 'https://hellokahwin.com/' };
    openGscSession.mockResolvedValue(session);
    syncPageDaily.mockResolvedValue({
      rowsFetched: 3,
      rowsWritten: 3,
      apiCalls: 1,
      truncated: false,
    });
    reresolveUnresolvedPages.mockResolvedValue(1);
    const res = await GET(req('Bearer s3cret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      from: `day-${PAGE_DAILY_LOOKBACK_DAYS}`,
      to: 'day-1',
      rowsWritten: 3,
      reresolved: 1,
    });
    expect(syncPageDaily).toHaveBeenCalledWith(
      expect.objectContaining({ session, sql: { fake: true } }),
      { startDate: 'day-5', endDate: 'day-1', dataState: 'all' },
    );
  });

  it('a missing or refused credential answers 503 with the reason, and writes nothing', async () => {
    openGscSession.mockRejectedValue(new GscAuthError('GSC_SERVICE_ACCOUNT_JSON is not set'));
    const res = await GET(req('Bearer s3cret'));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/GSC_SERVICE_ACCOUNT_JSON/);
    expect(syncPageDaily).not.toHaveBeenCalled();
  });

  it('a failed sync answers 500 (the cron shows red), a failed re-resolve does not', async () => {
    openGscSession.mockResolvedValue({ token: 't', property: 'p' });
    syncPageDaily.mockRejectedValue(new Error('Search Console returned 403'));
    expect((await GET(req('Bearer s3cret'))).status).toBe(500);

    syncPageDaily.mockResolvedValue({
      rowsFetched: 0,
      rowsWritten: 0,
      apiCalls: 1,
      truncated: false,
    });
    reresolveUnresolvedPages.mockRejectedValue(new Error('boom'));
    expect((await GET(req('Bearer s3cret'))).status).toBe(200);
  });
});
