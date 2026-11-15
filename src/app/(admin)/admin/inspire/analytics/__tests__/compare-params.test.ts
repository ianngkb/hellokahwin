import { describe, it, expect } from 'vitest';
import { compareHref, parseCompareIds } from '../compare-params';

/** `?ids=` → the selection (R11): capped at six BEFORE any getter runs. */

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('parseCompareIds', () => {
  it('returns nothing for a missing or empty param', () => {
    expect(parseCompareIds(undefined)).toEqual({ ids: [], overCap: 0, malformed: 0 });
    expect(parseCompareIds('')).toEqual({ ids: [], overCap: 0, malformed: 0 });
    expect(parseCompareIds(' , ,')).toEqual({ ids: [], overCap: 0, malformed: 0 });
  });

  it('keeps URL order, de-duplicates and lower-cases', () => {
    expect(parseCompareIds(`${id(2)},${id(1)},${id(2).toUpperCase()}`).ids).toEqual([id(2), id(1)]);
  });

  it('keeps the first 6 of 7 and reports the overflow', () => {
    const seven = [1, 2, 3, 4, 5, 6, 7].map(id);
    const parsed = parseCompareIds(seven.join(','));
    expect(parsed.ids).toEqual(seven.slice(0, 6));
    expect(parsed.overCap).toBe(1);
  });

  it('ignores malformed ids and still keeps the rest', () => {
    const parsed = parseCompareIds(`nope,${id(1)},'; drop table x;--,${id(2)}`);
    expect(parsed.ids).toEqual([id(1), id(2)]);
    expect(parsed.malformed).toBe(2);
  });

  it('joins a repeated ?ids= param instead of trusting one', () => {
    expect(parseCompareIds([id(1), `${id(2)},${id(3)}`]).ids).toEqual([id(1), id(2), id(3)]);
  });
});

describe('compareHref', () => {
  it('round-trips through the parser', () => {
    const ids = [id(3), id(1)];
    const href = compareHref(ids);
    expect(href).toBe(`/admin/inspire/analytics?view=compare&ids=${ids.join(',')}`);
    expect(parseCompareIds(new URL(href, 'http://x').searchParams.get('ids') ?? '').ids).toEqual(
      ids,
    );
    expect(compareHref([])).toBe('/admin/inspire/analytics?view=compare');
  });
});
