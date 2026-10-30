// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock DB
const mockInsert = vi.fn();

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    insert: vi.fn(() => ({ values: mockInsert.mockResolvedValue(undefined) })),
  },
}));

// Mock hash — deterministic for tests
vi.mock('@/lib/analytics/hash', () => ({
  generateVisitorHash: vi.fn(() => 'test-visitor-hash-abc123'),
}));

// Mock geo
vi.mock('@/lib/analytics/geo', () => ({
  resolveGeo: vi.fn(() => ({
    country: 'MY',
    region: '10',
    city: 'Shah Alam',
    latitude: 3.07,
    longitude: 101.52,
  })),
}));

// Mock rate limit — allow all requests by default
vi.mock('@/lib/api/rate-limit', () => ({
  ipRateLimit: vi.fn(() => null),
}));

const { POST } = await import('../route');
const { generateVisitorHash } = await import('@/lib/analytics/hash');
const { resolveGeo } = await import('@/lib/analytics/geo');
const { ipRateLimit } = await import('@/lib/api/rate-limit');
const { db } = await import('@/lib/db/drizzle');

// ── Helpers ────────────────────────────────────────────────────────────────

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function makeRequest(
  body: unknown,
  opts: { ua?: string; forwardedFor?: string; cookie?: string } = {},
) {
  return new NextRequest('http://localhost:3200/api/v1/analytics/collect', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'user-agent': opts.ua ?? CHROME_UA,
      ...(opts.forwardedFor ? { 'x-forwarded-for': opts.forwardedFor } : {}),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
  });
}

const validEvent = {
  event_name: 'pageview',
  pathname: '/artikel',
  referrer: 'https://www.google.com/',
  session_id: 'sess-abc',
  screen_width: 1440,
};

type Row = Record<string, unknown>;
const insertedRows = (call = 0) => mockInsert.mock.calls[call][0] as Row[];

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/analytics/collect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.insert as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      values: mockInsert.mockResolvedValue(undefined),
    }));
  });

  describe('valid batch (D1)', () => {
    it('accepts 2 events from a Chrome UA as one insert of 2 human rows', async () => {
      const req = makeRequest({
        events: [
          validEvent,
          { event_name: 'Photo Gallery Opened', pathname: '/artikel', props: { photo_count: 3 } },
        ],
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, data: { accepted: 2 } });

      expect(db.insert).toHaveBeenCalledTimes(1);
      const rows = insertedRows();
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row).toMatchObject({
          visitorHash: 'test-visitor-hash-abc123',
          visitorId: null,
          isBot: false,
          botReason: null,
          userAgent: CHROME_UA,
        });
      }
      expect(rows[1]).toMatchObject({
        eventName: 'Photo Gallery Opened',
        props: { photo_count: 3 },
      });
    });

    it('parses browser / OS / device type from the request UA, server-side', async () => {
      await POST(makeRequest({ events: [validEvent] }));
      expect(insertedRows()[0]).toMatchObject({
        browser: 'Chrome',
        os: 'Windows',
        deviceType: 'desktop',
        screenWidth: 1440,
      });
    });

    it('ignores client-claimed browser fields (never trusted from the payload)', async () => {
      await POST(makeRequest({ events: [{ ...validEvent, browser: 'Netscape', os: 'BeOS' }] }));
      expect(insertedRows()[0]).toMatchObject({ browser: 'Chrome', os: 'Windows' });
    });

    it('stores geo from resolveGeo, including region and coordinates', async () => {
      await POST(makeRequest({ events: [validEvent] }));
      expect(resolveGeo).toHaveBeenCalledTimes(1);
      expect(insertedRows()[0]).toMatchObject({
        country: 'MY',
        region: '10',
        city: 'Shah Alam',
        latitude: 3.07,
        longitude: 101.52,
      });
    });

    it('stores no raw IP on the row', async () => {
      await POST(makeRequest({ events: [validEvent] }, { forwardedFor: '203.0.113.7' }));
      const row = insertedRows()[0];
      expect(Object.keys(row).some((k) => /ip/i.test(k) && k !== 'props')).toBe(false);
      expect(JSON.stringify(row)).not.toContain('203.0.113.7');
    });

    it('hashes x-real-ip in preference to x-forwarded-for', async () => {
      const req = new NextRequest('http://localhost:3200/api/v1/analytics/collect', {
        method: 'POST',
        body: JSON.stringify({ events: [validEvent] }),
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'TestBrowser/1.0',
          'x-real-ip': '10.0.0.1',
          'x-forwarded-for': '203.0.113.1, 10.0.0.1',
        },
      });
      await POST(req);
      expect(generateVisitorHash).toHaveBeenCalledWith('10.0.0.1', 'TestBrowser/1.0');
    });

    it('falls back to the LAST x-forwarded-for entry (the first is spoofable)', async () => {
      await POST(makeRequest({ events: [validEvent] }, { forwardedFor: '203.0.113.1, 10.0.0.5' }));
      expect(generateVisitorHash).toHaveBeenCalledWith('10.0.0.5', expect.any(String));
    });

    it('accepts a batch of 50 events', async () => {
      const events = Array.from({ length: 50 }, (_, i) => ({ ...validEvent, pathname: `/p-${i}` }));
      const res = await POST(makeRequest({ events }));
      expect(res.status).toBe(200);
      expect((await res.json()).data.accepted).toBe(50);
    });
  });

  describe('bot classification (D2)', () => {
    it('stores a Googlebot beacon flagged, not dropped', async () => {
      const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1)';
      const res = await POST(makeRequest({ events: [validEvent] }, { ua }));

      expect(res.status).toBe(200);
      expect((await res.json()).data.accepted).toBe(1);
      const row = insertedRows()[0];
      expect(row.isBot).toBe(true);
      expect(String(row.botReason)).toMatch(/^search/);
      expect(row.userAgent).toBe(ua);
    });

    it.each([
      ['Mozilla/5.0 GPTBot/1.0', 'ai_crawler:openai_gptbot'],
      ['Mozilla/5.0 (compatible; AhrefsBot/7.0)', 'seo:ahrefs'],
    ])('flags %s as %s', async (ua, reason) => {
      await POST(makeRequest({ events: [validEvent] }, { ua }));
      expect(insertedRows()[0]).toMatchObject({ isBot: true, botReason: reason });
    });
  });

  describe('visitor_id comes from the cookie only (D3)', () => {
    const COOKIE_VID = '11111111-2222-4333-8444-555555555555';
    const PAYLOAD_VID = '99999999-8888-4777-8666-555555555555';

    it('IGNORES a payload visitor_id when there is no cookie', async () => {
      const res = await POST(makeRequest({ events: [{ ...validEvent, visitor_id: PAYLOAD_VID }] }));
      expect(res.status).toBe(200);
      expect(insertedRows()[0]).toMatchObject({ visitorId: null, eventName: 'pageview' });
    });

    it('uses the _hk_vid cookie', async () => {
      await POST(
        makeRequest(
          { events: [{ ...validEvent, visitor_id: PAYLOAD_VID }] },
          { cookie: `_hk_vid=${COOKIE_VID}` },
        ),
      );
      expect(insertedRows()[0]).toMatchObject({ visitorId: COOKIE_VID });
    });

    it('stores NULL for a malformed cookie and still writes the row', async () => {
      const res = await POST(
        makeRequest({ events: [validEvent] }, { cookie: '_hk_vid=not-a-uuid' }),
      );
      expect(res.status).toBe(200);
      expect(insertedRows()[0]).toMatchObject({ visitorId: null, eventName: 'pageview' });
    });
  });

  describe('validation and limits (D4)', () => {
    it('returns 400 for malformed JSON', async () => {
      const req = new NextRequest('http://localhost:3200/api/v1/analytics/collect', {
        method: 'POST',
        body: '{invalid json',
        headers: { 'Content-Type': 'application/json' },
      });
      expect((await POST(req)).status).toBe(400);
    });

    it('returns 400 for a batch of 51 events', async () => {
      const events = Array.from({ length: 51 }, () => validEvent);
      expect((await POST(makeRequest({ events }))).status).toBe(400);
    });

    it('returns 400 for a negative screen_width', async () => {
      const res = await POST(makeRequest({ events: [{ ...validEvent, screen_width: -1 }] }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for an empty events array', async () => {
      expect((await POST(makeRequest({ events: [] }))).status).toBe(400);
    });

    it('returns 400 when pathname is missing', async () => {
      expect((await POST(makeRequest({ events: [{ event_name: 'pageview' }] }))).status).toBe(400);
    });

    it('does not insert anything on validation failure', async () => {
      await POST(makeRequest({ events: [] }));
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('truncates an over-long referrer / UTM value instead of rejecting the batch', async () => {
      const res = await POST(
        makeRequest({
          events: [
            {
              ...validEvent,
              referrer: `https://example.com/${'a'.repeat(3000)}`,
              utm_campaign: 'c'.repeat(500),
            },
            { ...validEvent, pathname: '/' },
          ],
        }),
      );
      expect(res.status).toBe(200);
      expect((await res.json()).data.accepted).toBe(2);
      const [row] = insertedRows();
      expect(String(row.referrer)).toHaveLength(2000);
      expect(String(row.referrer).startsWith('https://example.com/')).toBe(true);
      expect(String(row.utmCampaign)).toHaveLength(200);
    });

    it.each([
      ['more than 50 keys', Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, i]))],
      ['a key over 100 chars', { ['k'.repeat(101)]: 1 }],
      ['a nested value', { nested: { a: 1 } }],
    ])('returns 400 for props with %s', async (_label, props) => {
      const res = await POST(makeRequest({ events: [{ ...validEvent, props }] }));
      expect(res.status).toBe(400);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('clips an over-long prop string value instead of rejecting', async () => {
      const res = await POST(
        makeRequest({ events: [{ ...validEvent, props: { note: 'x'.repeat(1500) } }] }),
      );
      expect(res.status).toBe(200);
      expect(String((insertedRows()[0].props as Record<string, unknown>).note)).toHaveLength(1000);
    });

    it('returns 413 and writes nothing for a body over 64 KB (F1)', async () => {
      const req = new NextRequest('http://localhost:3200/api/v1/analytics/collect', {
        method: 'POST',
        body: JSON.stringify({ events: [{ ...validEvent, referrer: 'r'.repeat(70_000) }] }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      expect(res.status).toBe(413);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('returns 413 from a declared Content-Length over 64 KB without reading the body (F1)', async () => {
      const req = new NextRequest('http://localhost:3200/api/v1/analytics/collect', {
        method: 'POST',
        body: JSON.stringify({ events: [validEvent] }),
        headers: { 'Content-Type': 'application/json', 'content-length': '100000' },
      });
      const textSpy = vi.spyOn(req, 'text');
      const res = await POST(req);
      expect(res.status).toBe(413);
      expect(textSpy).not.toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('stores an over-long pathname clipped to 2000 chars (F3)', async () => {
      const res = await POST(
        makeRequest({ events: [{ ...validEvent, pathname: `/${'p'.repeat(3000)}` }] }),
      );
      expect(res.status).toBe(200);
      expect(String(insertedRows()[0].pathname)).toHaveLength(2000);
    });

    it('returns 400 for a pathname without a leading slash (F3)', async () => {
      const res = await POST(makeRequest({ events: [{ ...validEvent, pathname: 'artikel' }] }));
      expect(res.status).toBe(400);
    });

    it('strips NUL and repairs lone surrogates instead of losing the batch (F4)', async () => {
      const res = await POST(
        makeRequest({
          events: [
            {
              ...validEvent,
              utm_source: 'news\u0000letter\uD800',
              props: { note: 'a\u0000b' },
            },
          ],
        }),
      );
      expect(res.status).toBe(200);
      const [row] = insertedRows();
      expect(row.utmSource).toBe('newsletter\uFFFD');
      expect(row.props).toEqual({ note: 'ab' });
    });

    it.each(['', '   '])('stores an empty session_id (%j) as NULL (F5)', async (sessionId) => {
      const res = await POST(makeRequest({ events: [{ ...validEvent, session_id: sessionId }] }));
      expect(res.status).toBe(200);
      expect(insertedRows()[0].sessionId).toBeNull();
    });

    it('accepts props at the bounds', async () => {
      const props = {
        ...Object.fromEntries(Array.from({ length: 49 }, (_, i) => [`k${i}`, i])),
        ['k'.repeat(100)]: 'x'.repeat(1000),
      };
      const res = await POST(makeRequest({ events: [{ ...validEvent, props }] }));
      expect(res.status).toBe(200);
    });

    it('returns 429 when the IP rate limit trips', async () => {
      (ipRateLimit as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        new Response(JSON.stringify({ success: false, error: { message: 'Too many requests' } }), {
          status: 429,
        }),
      );
      const res = await POST(makeRequest({ events: [validEvent] }));
      expect(res.status).toBe(429);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('failure modes', () => {
    it('returns 503 and writes nothing when the salt is missing (never an unsalted hash)', async () => {
      (generateVisitorHash as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error('ANALYTICS_SALT environment variable is required');
      });
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await POST(makeRequest({ events: [validEvent] }));
      expect(res.status).toBe(503);
      expect((await res.json()).error.message).toBe('analytics_unavailable');
      expect(db.insert).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it('returns 503 analytics_unavailable when the DB write stalls past 8s (F7)', async () => {
      // A write that never settles — only the route's own withDeadline can end it.
      mockInsert.mockReturnValueOnce(new Promise(() => {}));
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const pending = POST(makeRequest({ events: [validEvent] }));
        await vi.advanceTimersByTimeAsync(7_999);
        let settled = false;
        void pending.then(() => (settled = true));
        await Promise.resolve();
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        const res = await pending;
        expect(res.status).toBe(503);
        expect((await res.json()).error.message).toBe('analytics_unavailable');
      } finally {
        vi.useRealTimers();
        errSpy.mockRestore();
      }
    });

    it('returns 500 on any other DB error', async () => {
      mockInsert.mockRejectedValueOnce(new Error('relation "analytics_events" does not exist'));
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await POST(makeRequest({ events: [validEvent] }));
      expect(res.status).toBe(500);
      errSpy.mockRestore();
    });
  });
});
