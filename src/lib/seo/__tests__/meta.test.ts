import { describe, it, expect } from 'vitest';
import {
  stripBrandSuffix,
  decodeMetaEntities,
  truncateForMeta,
  buildArticleDescription,
} from '../meta';

describe('stripBrandSuffix', () => {
  it('strips a complete trailing brand suffix', () => {
    expect(stripBrandSuffix('Reliving High School Days | HelloKahwin')).toBe(
      'Reliving High School Days',
    );
  });

  it('strips a partial-brand truncation (the import bug)', () => {
    expect(stripBrandSuffix('A Rustic Tuscan Wedding | HelloKah')).toBe('A Rustic Tuscan Wedding');
    expect(stripBrandSuffix('An Intimate Wedding at Kayu Puti | Hello')).toBe(
      'An Intimate Wedding at Kayu Puti',
    );
  });

  it('strips a bare dangling separator', () => {
    expect(stripBrandSuffix('A Minimalist All-White Wedding |')).toBe(
      'A Minimalist All-White Wedding',
    );
  });

  it('preserves a trailing fragment that is not a brand prefix', () => {
    expect(stripBrandSuffix('Tied the Knot | The Knot')).toBe('Tied the Knot | The Knot');
  });

  it('preserves an internal pipe in a real title', () => {
    expect(stripBrandSuffix('Tips | Tricks for Weddings | HelloKahwin')).toBe(
      'Tips | Tricks for Weddings',
    );
  });

  it('does NOT split on intra-word hyphens', () => {
    expect(stripBrandSuffix('A Minimalist All-White Destination Wedding')).toBe(
      'A Minimalist All-White Destination Wedding',
    );
  });

  it('returns empty string when the title is only a brand suffix', () => {
    expect(stripBrandSuffix('| HelloKahwin')).toBe('');
  });

  it('drops a bare brand with no separator', () => {
    expect(stripBrandSuffix('HelloKahwin')).toBe('');
  });

  it('handles null / undefined / blank', () => {
    expect(stripBrandSuffix(null)).toBe('');
    expect(stripBrandSuffix(undefined)).toBe('');
    expect(stripBrandSuffix('   ')).toBe('');
  });
});

describe('decodeMetaEntities', () => {
  it('decodes numeric and named WordPress entities', () => {
    expect(decodeMetaEntities('Arthur &#8217;s day &amp; night &hellip;')).toBe(
      'Arthur ’s day & night …',
    );
    expect(decodeMetaEntities('Niseko Photography &#038; Guiding')).toBe(
      'Niseko Photography & Guiding',
    );
  });

  it('returns empty string for null/undefined', () => {
    expect(decodeMetaEntities(null)).toBe('');
    expect(decodeMetaEntities(undefined)).toBe('');
  });

  it('fully resolves double-encoded entities (idempotency)', () => {
    expect(decodeMetaEntities('Tom &amp;amp; Jerry')).toBe('Tom & Jerry');
    // Already-decoded input is stable.
    expect(decodeMetaEntities('Tom & Jerry')).toBe('Tom & Jerry');
  });
});

describe('truncateForMeta', () => {
  it('returns short text untouched', () => {
    expect(truncateForMeta('Hello world', 155)).toBe('Hello world');
  });

  it('truncates long text on a word boundary with an ellipsis', () => {
    const long = 'word '.repeat(60).trim(); // 299 chars
    const out = truncateForMeta(long, 50);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith('…')).toBe(true);
    // Cut lands on a word boundary → only whole "word" tokens before the ellipsis.
    expect(out).toMatch(/^(word )*word…$/);
  });

  it('cuts mid-token when there is no nearby space (no boundary to honor)', () => {
    const out = truncateForMeta('A'.repeat(300), 50);
    expect(out).toBe(`${'A'.repeat(50)}…`);
  });
});

describe('buildArticleDescription', () => {
  it('prefers decoded metaDescription', () => {
    expect(
      buildArticleDescription({ metaDescription: 'A &amp; B', excerpt: 'x', bodyText: 'y' }),
    ).toBe('A & B');
  });

  it('falls back to excerpt then body, decoding each', () => {
    expect(buildArticleDescription({ metaDescription: '', excerpt: 'C &#038; D' })).toBe('C & D');
    expect(buildArticleDescription({ bodyText: 'E &amp; F' })).toBe('E & F');
  });

  it('returns null when nothing usable exists', () => {
    expect(buildArticleDescription({})).toBeNull();
    expect(buildArticleDescription({ metaDescription: '   ' })).toBeNull();
  });
});
