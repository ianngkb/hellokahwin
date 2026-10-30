// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateVisitorHash } from '../hash';

beforeEach(() => {
  process.env.ANALYTICS_SALT = 'test-salt-for-unit-tests';
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.ANALYTICS_SALT;
});

describe('generateVisitorHash', () => {
  const ip = '203.0.113.1';
  const ua = 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0.0.0';

  it('returns a 64-character hex string (SHA-256)', () => {
    expect(generateVisitorHash(ip, ua)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('throws when ANALYTICS_SALT is unset (never an unsalted hash)', () => {
    delete process.env.ANALYTICS_SALT;
    expect(() => generateVisitorHash(ip, ua)).toThrow(
      'ANALYTICS_SALT environment variable is required',
    );
  });

  it('throws when ANALYTICS_SALT is empty', () => {
    process.env.ANALYTICS_SALT = '';
    expect(() => generateVisitorHash(ip, ua)).toThrow();
  });

  it('is equal for the same visitor within one KL day', () => {
    vi.useFakeTimers();
    // 2026-10-01 00:30 KL and 23:30 KL — both the KL day 2026-10-01.
    vi.setSystemTime(new Date('2026-09-30T16:30:00Z'));
    const morning = generateVisitorHash(ip, ua);
    vi.setSystemTime(new Date('2026-10-01T15:30:00Z'));
    const night = generateVisitorHash(ip, ua);
    expect(morning).toBe(night);
  });

  it('differs across two KL days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T04:00:00Z'));
    const day1 = generateVisitorHash(ip, ua);
    vi.setSystemTime(new Date('2026-10-02T04:00:00Z'));
    const day2 = generateVisitorHash(ip, ua);
    expect(day1).not.toBe(day2);
  });

  it('rotates at KL midnight, not UTC midnight', () => {
    vi.useFakeTimers();
    // 15:59 UTC = 23:59 KL on 1 Oct; 16:01 UTC = 00:01 KL on 2 Oct. Same UTC day.
    vi.setSystemTime(new Date('2026-10-01T15:59:00Z'));
    const before = generateVisitorHash(ip, ua);
    vi.setSystemTime(new Date('2026-10-01T16:01:00Z'));
    const after = generateVisitorHash(ip, ua);
    expect(before).not.toBe(after);
  });

  it('differs when the salt, IP or UA changes', () => {
    const base = generateVisitorHash(ip, ua);
    expect(generateVisitorHash('203.0.113.2', ua)).not.toBe(base);
    expect(generateVisitorHash(ip, 'Mozilla/5.0 Firefox/120.0')).not.toBe(base);
    process.env.ANALYTICS_SALT = 'another-salt';
    expect(generateVisitorHash(ip, ua)).not.toBe(base);
  });

  it('contains no substring of the IP', () => {
    const hash = generateVisitorHash(ip, ua);
    // Pure hex: no dotted fragment of the address (`203.0`, `113.1`, …) can
    // appear, let alone the whole thing.
    expect(hash).not.toContain('.');
    for (let i = 0; i < ip.length - 2; i++) {
      const fragment = ip.slice(i, i + 3);
      if (fragment.includes('.')) expect(hash).not.toContain(fragment);
    }
    expect(hash).not.toContain(ip);
  });
});
