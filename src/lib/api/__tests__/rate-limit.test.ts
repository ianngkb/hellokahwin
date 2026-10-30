// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ipRateLimit, rateLimitIdentity, __rateLimitStoreInternals } from '../rate-limit';

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

  it('puts two IPv6 addresses in one /64 in the same bucket (F6)', () => {
    for (let i = 0; i < OPTS.limit; i++) {
      expect(ipRateLimit(req({ 'x-real-ip': `2001:db8:1:2::${i + 1}` }), OPTS)).toBeNull();
    }
    expect(
      ipRateLimit(req({ 'x-real-ip': '2001:0db8:0001:0002:ffff:eeee:dddd:cccc' }), OPTS)?.status,
    ).toBe(429);
    // A different /64 is a different bucket.
    expect(ipRateLimit(req({ 'x-real-ip': '2001:db8:1:3::1' }), OPTS)).toBeNull();
  });
});

describe('rateLimitIdentity', () => {
  it('leaves IPv4 unchanged', () => {
    expect(rateLimitIdentity('203.0.113.9')).toBe('203.0.113.9');
  });

  it('keys IPv6 on its expanded, lower-cased /64', () => {
    expect(rateLimitIdentity('2001:DB8::1')).toBe('2001:db8:0:0::/64');
    expect(rateLimitIdentity('2001:db8:a:b:1:2:3:4')).toBe('2001:db8:a:b::/64');
    expect(rateLimitIdentity('::1')).toBe('0:0:0:0::/64');
    expect(rateLimitIdentity('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
  });

  it('treats an IPv4-mapped IPv6 address as its IPv4', () => {
    expect(rateLimitIdentity('::ffff:203.0.113.9')).toBe('203.0.113.9');
  });
});
