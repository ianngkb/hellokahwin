// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ipRateLimit, __rateLimitStoreInternals } from '../rate-limit';

const OPTS = { limit: 3, windowMs: 60_000 };

function req(headers: Record<string, string>) {
  return new NextRequest('http://localhost:3200/api/v1/analytics/collect', {
    method: 'POST',
    headers,
  });
}

beforeEach(() => {
  __rateLimitStoreInternals.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ipRateLimit', () => {
  it('allows `limit` requests, then answers 429', () => {
    for (let i = 0; i < OPTS.limit; i++) {
      expect(ipRateLimit(req({ 'x-real-ip': '10.0.0.1' }), OPTS)).toBeNull();
    }
    expect(ipRateLimit(req({ 'x-real-ip': '10.0.0.1' }), OPTS)?.status).toBe(429);
    // Another IP has its own bucket.
    expect(ipRateLimit(req({ 'x-real-ip': '10.0.0.2' }), OPTS)).toBeNull();
  });

  it('resets in a new window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-30T00:00:00Z'));
    for (let i = 0; i < OPTS.limit; i++) ipRateLimit(req({ 'x-real-ip': '10.0.0.1' }), OPTS);
    expect(ipRateLimit(req({ 'x-real-ip': '10.0.0.1' }), OPTS)?.status).toBe(429);
    vi.setSystemTime(new Date('2026-10-30T00:01:00.001Z'));
    expect(ipRateLimit(req({ 'x-real-ip': '10.0.0.1' }), OPTS)).toBeNull();
  });

  it('keeps the store bounded under many distinct IPs', () => {
    const max = __rateLimitStoreInternals.maxSize;
    for (let i = 0; i <= max; i++) {
      ipRateLimit(req({ 'x-real-ip': `ip-${i}` }), OPTS);
    }
    expect(__rateLimitStoreInternals.size()).toBeLessThanOrEqual(max);
  });

  it('keys on the LAST x-forwarded-for entry, not the spoofable first', () => {
    // Same proxy-appended last hop, different client-claimed first hops → one bucket.
    for (let i = 0; i < OPTS.limit; i++) {
      expect(ipRateLimit(req({ 'x-forwarded-for': `1.1.1.${i}, 203.0.113.9` }), OPTS)).toBeNull();
    }
    expect(ipRateLimit(req({ 'x-forwarded-for': '9.9.9.9, 203.0.113.9' }), OPTS)?.status).toBe(429);
  });
});
