import { describe, it, expect } from 'vitest';
import { capUtf8Bytes, MAX_PATHNAME_BYTES, MAX_REFERRER_BYTES } from '../utf8-cap';

const bytes = (s: string) => Buffer.byteLength(s, 'utf8');

describe('capUtf8Bytes', () => {
  it('leaves a value that fits unchanged', () => {
    expect(capUtf8Bytes('/artikel/real-weddings/takun-villa', 1000)).toBe(
      '/artikel/real-weddings/takun-villa',
    );
    const exact = 'a'.repeat(1000);
    expect(capUtf8Bytes(exact, 1000)).toBe(exact);
  });

  it.each([
    ['ASCII', 'a', 1],
    ['2-byte', 'é', 2],
    ['3-byte', '中', 3],
    ['4-byte surrogate pair', '😀', 4],
  ])('cuts %s text to at most the cap, on a character boundary', (_n, ch, width) => {
    const s = `/artikel/${ch.repeat(1500)}`;
    const out = capUtf8Bytes(s, 1000);
    expect(bytes(out)).toBeLessThanOrEqual(1000);
    // As long as possible: one more character would not have fitted.
    expect(bytes(out) + width).toBeGreaterThan(1000);
    expect(s.startsWith(out)).toBe(true);
    expect(out).not.toMatch(/[\uD800-\uDBFF]$/);
  });

  it('counts a lone surrogate as the 3-byte replacement it is sent as', () => {
    const out = capUtf8Bytes('\uD800'.repeat(500), 999);
    expect(out.length).toBe(333);
  });

  it('caps both indexed columns at 1,000 bytes — the index entry stays under btree’s limit', () => {
    expect(MAX_PATHNAME_BYTES).toBe(1000);
    expect(MAX_REFERRER_BYTES).toBe(1000);
    // pathname + referrer + 64-byte visitor_hash + created_at + screen_width +
    // per-column headers and the tuple header: well under 2,704.
    expect(MAX_PATHNAME_BYTES + MAX_REFERRER_BYTES + 64 + 8 + 4 + 3 * 4 + 16).toBeLessThan(2704);
  });
});
