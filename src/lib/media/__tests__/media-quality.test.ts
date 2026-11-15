import { describe, it, expect } from 'vitest';
import { displayFileSize, normalizeVariants } from '../media-quality';

const HOST = 'https://images.hellokahwin.com';

describe('normalizeVariants', () => {
  const map = { low: { url: `${HOST}/a/low.webp`, sizeBytes: 10 } };

  it('passes an object through', () => {
    expect(normalizeVariants(map)).toEqual(map);
  });

  it('parses a double-encoded JSON string', () => {
    expect(normalizeVariants(JSON.stringify(map))).toEqual(map);
  });

  it('is null for nothing, garbage, arrays and scalars', () => {
    expect(normalizeVariants(null)).toBeNull();
    expect(normalizeVariants(undefined)).toBeNull();
    expect(normalizeVariants('not json')).toBeNull();
    expect(normalizeVariants('[]')).toBeNull();
    expect(normalizeVariants(42)).toBeNull();
  });
});

describe('displayFileSize', () => {
  it('uses the row’s own size when it was measured', () => {
    expect(displayFileSize({ fileSize: 2048, variants: null })).toBe(2048);
  });

  it('never reports 0 bytes: falls back to the biggest variant, including mid', () => {
    expect(
      displayFileSize({
        fileSize: 0,
        variants: {
          low: { url: 'l', sizeBytes: 100 },
          mid: { url: 'm', sizeBytes: 300_000 },
          high: { url: 'h', sizeBytes: 0 },
        },
      }),
    ).toBe(300_000);
  });

  it('reads a JSON-string variants column too', () => {
    expect(
      displayFileSize({
        fileSize: 0,
        variants: JSON.stringify({ high: { url: 'h', sizeBytes: 900 } }),
      }),
    ).toBe(900);
  });

  it('is null — shown as "—" — when nothing was ever measured', () => {
    expect(displayFileSize({ fileSize: 0, variants: null })).toBeNull();
    expect(
      displayFileSize({ fileSize: null, variants: { low: { url: 'l', sizeBytes: 0 } } }),
    ).toBeNull();
  });
});
