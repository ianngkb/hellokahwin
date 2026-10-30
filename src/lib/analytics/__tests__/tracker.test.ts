import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, cleanup } from '@testing-library/react';

// `AnalyticsTracker` reads the App Router pathname + query; drive both here.
const nav = vi.hoisted(() => ({ pathname: '/', search: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { init, trackPageview, track, flush, _getQueue, _resetForTest } from '../tracker';
import { _resetVisitorIdCacheForTest } from '../visitor-id';
import { AnalyticsTracker } from '@/components/analytics/analytics-tracker';

const mockFetch = vi.fn();

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

beforeEach(() => {
  _resetForTest();
  _resetVisitorIdCacheForTest();
  sessionStorage.clear();
  clearCookies();
  mockFetch.mockReset().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', mockFetch);
  nav.pathname = '/';
  nav.search = '';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  _resetForTest();
});

describe('track() — the preserved seam (D6)', () => {
  it('queues a custom event with pathname, session and props', () => {
    track('Photo Gallery Opened', { photo_count: 3 });

    const queue = _getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      event_name: 'Photo Gallery Opened',
      pathname: window.location.pathname,
      props: { photo_count: 3 },
    });
    expect(queue[0].session_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('flush() POSTs the batch to the collector and empties the queue', () => {
    track('Photo Gallery Opened', { photo_count: 3 });
    flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/v1/analytics/collect');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].props).toEqual({ photo_count: 3 });
    expect(_getQueue()).toHaveLength(0);
  });

  it('sends no UA-derived fields and no visitor id in the payload', () => {
    track('x');
    flush();
    const event = JSON.parse(mockFetch.mock.calls[0][1].body).events[0];
    expect(event).not.toHaveProperty('browser');
    expect(event).not.toHaveProperty('os');
    expect(event).not.toHaveProperty('device_type');
    expect(event).not.toHaveProperty('visitor_id');
  });

  it('mints the first-party _hk_vid cookie as a side effect', () => {
    track('x');
    expect(document.cookie).toMatch(/(?:^|;\s*)_hk_vid=[0-9a-f-]{36}/);
  });

  it('keeps one session id across events', () => {
    track('a');
    track('b');
    const [a, b] = _getQueue();
    expect(a.session_id).toBe(b.session_id);
  });

  it('flush() is a no-op on an empty queue', () => {
    flush();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('uses sendBeacon when the page is hidden', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    track('x');
    flush();
    expect(sendBeacon).toHaveBeenCalledWith('/api/v1/analytics/collect', expect.any(Blob));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('flushes on the 5s timer once initialised', () => {
    vi.useFakeTimers();
    try {
      init();
      track('x');
      vi.advanceTimersByTime(5_000);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('trackPageview', () => {
  it('queues a pageview with UTM params and screen width', () => {
    trackPageview('/artikel', 'https://www.google.com/', {
      utm_source: 'newsletter',
      utm_campaign: 'oct',
    });
    expect(_getQueue()[0]).toMatchObject({
      event_name: 'pageview',
      pathname: '/artikel',
      referrer: 'https://www.google.com/',
      utm_source: 'newsletter',
      utm_campaign: 'oct',
    });
  });
});

describe('exclusions (D7)', () => {
  it('records nothing from a framed render', () => {
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
    trackPageview('/artikel');
    track('Photo Gallery Opened', { photo_count: 3 });
    expect(_getQueue()).toHaveLength(0);
  });

  it('AnalyticsTracker does not fire a pageview on /draft/*', () => {
    nav.pathname = '/draft/abc';
    render(createElement(AnalyticsTracker));
    expect(_getQueue()).toHaveLength(0);
  });

  it('AnalyticsTracker fires exactly one pageview on an article', () => {
    nav.pathname = '/artikel/x/y';
    render(createElement(AnalyticsTracker));
    const queue = _getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ event_name: 'pageview', pathname: '/artikel/x/y' });
  });

  it('AnalyticsTracker captures UTMs from the landing URL only', () => {
    nav.pathname = '/';
    nav.search = 'utm_source=autopilot-verify&utm_medium=verify&utm_campaign=ship';
    const { rerender } = render(createElement(AnalyticsTracker));
    nav.pathname = '/artikel';
    rerender(createElement(AnalyticsTracker));

    const [landing, next] = _getQueue();
    expect(landing).toMatchObject({
      pathname: '/',
      utm_source: 'autopilot-verify',
      utm_medium: 'verify',
      utm_campaign: 'ship',
    });
    expect(next.pathname).toBe('/artikel');
    expect(next.utm_source).toBeUndefined();
  });
});

describe('review fixes', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('track() records nothing while on /draft/<token>', () => {
    window.history.pushState({}, '', '/draft/abc');
    track('Photo Gallery Opened', { photo_count: 3 });
    trackPageview('/draft/abc');
    expect(_getQueue()).toHaveLength(0);
  });

  it('AnalyticsTracker counts the return to A after A → /draft/x → A', () => {
    nav.pathname = '/artikel';
    const { rerender } = render(createElement(AnalyticsTracker));
    nav.pathname = '/draft/x';
    rerender(createElement(AnalyticsTracker));
    nav.pathname = '/artikel';
    rerender(createElement(AnalyticsTracker));
    expect(_getQueue().map((e) => e.pathname)).toEqual(['/artikel', '/artikel']);
  });

  it('AnalyticsTracker captures UTMs even without utm_source', () => {
    nav.pathname = '/';
    nav.search = 'utm_medium=email&utm_campaign=oct';
    render(createElement(AnalyticsTracker));
    expect(_getQueue()[0]).toMatchObject({ utm_medium: 'email', utm_campaign: 'oct' });
    expect(_getQueue()[0].utm_source).toBeUndefined();
  });

  it('track() drops non-primitive prop values', () => {
    track('x', { a: 's', b: 1, c: true, d: null, e: { nested: 1 }, f: [1], g: undefined });
    expect(_getQueue()[0].props).toEqual({ a: 's', b: 1, c: true, d: null });
  });

  it('flush() sends more than 50 queued events in chunks of 50', () => {
    for (let i = 0; i < 120; i++) track(`e${i}`);
    flush();
    const sizes = mockFetch.mock.calls.map((c) => JSON.parse(c[1].body).events.length);
    expect(sizes).toEqual([50, 50, 20]);
  });
});

describe('randomUuid', () => {
  it('falls back to getRandomValues when crypto.randomUUID is missing', async () => {
    const { randomUuid } = await import('../uuid');
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
    try {
      const id = randomUuid();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      // Passes the server's `_hk_vid` check.
      const { parseVisitorIdCookie } = await import('../visitor-id');
      expect(parseVisitorIdCookie(id)).toBe(id);
      expect(randomUuid()).not.toBe(id);
      // And the tracker keeps working without it.
      expect(() => track('x')).not.toThrow();
      expect(_getQueue()).toHaveLength(1);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: original });
    }
  });
});

describe('external review fixes', () => {
  it('F8: a malformed _hk_vid cookie is replaced with a fresh id', async () => {
    const { getOrCreateVisitorIdClient } = await import('../visitor-id');
    document.cookie = '_hk_vid=%E0%A4; Path=/';
    _resetVisitorIdCacheForTest();
    const id = getOrCreateVisitorIdClient();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(document.cookie).toContain(`_hk_vid=${id}`);
  });

  it('F14: randomUuid works with no crypto global at all', async () => {
    const { randomUuid } = await import('../uuid');
    vi.stubGlobal('crypto', undefined);
    const id = randomUuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(randomUuid()).not.toBe(id);
  });

  it('F19: falls back to fetch when sendBeacon refuses the payload', () => {
    const sendBeacon = vi.fn().mockReturnValue(false);
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    track('x');
    flush();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST', keepalive: true });
  });

  it('F20: ignores blank event names', () => {
    track('');
    track('   ');
    expect(_getQueue()).toHaveLength(0);
  });

  it('F20: clips prop strings, drops long keys, keeps the first 50 keys', () => {
    const props: Record<string, unknown> = {
      long: 'x'.repeat(1500),
      ['k'.repeat(101)]: 'dropped',
    };
    for (let i = 0; i < 60; i++) props[`p${i}`] = i;
    track('x', props);
    const sent = _getQueue()[0].props as Record<string, unknown>;
    expect(String(sent.long)).toHaveLength(1000);
    expect(sent).not.toHaveProperty('k'.repeat(101));
    expect(Object.keys(sent)).toHaveLength(50);
    expect(sent.p48).toBe(48);
    expect(sent).not.toHaveProperty('p49');
  });

  it('F22: rotates the session when the clock has gone backwards', () => {
    sessionStorage.setItem('_hk_sid', 'old-session');
    sessionStorage.setItem('_hk_sid_ts', String(Date.now() + 60_000));
    track('x');
    expect(_getQueue()[0].session_id).not.toBe('old-session');
  });

  it('keeps a live session within the timeout', () => {
    sessionStorage.setItem('_hk_sid', 'live-session');
    sessionStorage.setItem('_hk_sid_ts', String(Date.now() - 60_000));
    track('x');
    expect(_getQueue()[0].session_id).toBe('live-session');
  });
});
