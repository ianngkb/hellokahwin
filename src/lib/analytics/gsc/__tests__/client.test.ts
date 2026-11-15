// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
const readGscServiceAccount = vi.fn();
const mintGscAccessToken = vi.fn();
vi.mock('@/lib/seo/gsc-auth', () => ({
  readGscServiceAccount: () => readGscServiceAccount(),
  mintGscAccessToken: (...a: unknown[]) => mintGscAccessToken(...a),
}));
vi.mock('@/lib/seo/gsc-sitemap', () => ({
  gscPropertyFor: (base: string) => `${new URL(base).origin}/`,
}));

const { openGscSession, searchAnalyticsAll, GscAuthError, GSC_MAX_ROW_LIMIT } =
  await import('../client');

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  readGscServiceAccount.mockReset();
  mintGscAccessToken.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const session = { token: 'tok', property: 'https://hellokahwin.com/' };
const req = {
  startDate: '2026-11-08',
  endDate: '2026-11-12',
  dimensions: ['date', 'page'] as const,
};

describe('openGscSession', () => {
  it('mints one token with the existing service-account flow, for the site property', async () => {
    readGscServiceAccount.mockReturnValue({ client_email: 'sa@x', private_key: 'k' });
    mintGscAccessToken.mockResolvedValue({ token: 'tok', detail: 'ok' });
    expect(await openGscSession('https://hellokahwin.com')).toEqual(session);
  });

  it('no credential, or a refused exchange, is a GscAuthError carrying Google’s words', async () => {
    readGscServiceAccount.mockReturnValue(null);
    await expect(openGscSession('https://hellokahwin.com')).rejects.toBeInstanceOf(GscAuthError);
    readGscServiceAccount.mockReturnValue({ client_email: 'sa@x', private_key: 'k' });
    mintGscAccessToken.mockResolvedValue({ detail: 'token exchange HTTP 400 invalid_grant' });
    await expect(openGscSession('https://hellokahwin.com')).rejects.toThrow(/invalid_grant/);
  });
});

describe('searchAnalyticsAll', () => {
  it('posts to the encoded property with a bearer token and returns the rows', async () => {
    fetchMock.mockResolvedValue(
      ok({ rows: [{ keys: ['d', 'u'], clicks: 1, impressions: 2, ctr: 0.5, position: 3 }] }),
    );
    const r = await searchAnalyticsAll(session, { ...req, dimensions: ['date', 'page'] });
    expect(r).toMatchObject({ apiCalls: 1, truncated: false });
    expect(r.rows).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fhellokahwin.com%2F/searchAnalytics/query',
    );
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toMatchObject({
      dimensions: ['date', 'page'],
      rowLimit: GSC_MAX_ROW_LIMIT,
      startRow: 0,
      type: 'web',
    });
  });

  it('pages on a full page, stops on a short one', async () => {
    const full = Array.from({ length: GSC_MAX_ROW_LIMIT }, () => ({
      keys: [],
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    }));
    fetchMock.mockResolvedValueOnce(ok({ rows: full })).mockResolvedValueOnce(ok({}));
    const r = await searchAnalyticsAll(
      session,
      { ...req, dimensions: ['date', 'page'] },
      { pauseMs: 0 },
    );
    expect(r.apiCalls).toBe(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).startRow).toBe(GSC_MAX_ROW_LIMIT);
  });

  it('retries a 503 and fails fast on a 403 with a plain reason', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(ok({ rows: [] }));
    const r = await searchAnalyticsAll(
      session,
      { ...req, dimensions: ['date', 'page'] },
      { baseDelayMs: 0 },
    );
    expect(r.rows).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('forbidden', { status: 403 }));
    await expect(
      searchAnalyticsAll(session, { ...req, dimensions: ['date', 'page'] }, { baseDelayMs: 0 }),
    ).rejects.toThrow(/not a user on this property/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
