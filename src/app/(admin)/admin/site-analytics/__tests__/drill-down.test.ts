// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { countryHref, clearCountryHref, regionHref, clearRegionHref } from '../drill-down';

const PATH = '/admin/site-analytics';
const SEARCH = 'from=2026-10-01&to=2026-10-30&country=MY&region=10';

describe('drill-down hrefs', () => {
  it('a different country drops the region and keeps the range', () => {
    const href = countryHref(PATH, SEARCH, 'SG')!;
    const q = new URL(href, 'http://x').searchParams;
    expect(q.get('country')).toBe('SG');
    expect(q.has('region')).toBe(false);
    expect(q.get('from')).toBe('2026-10-01');
    expect(q.get('to')).toBe('2026-10-30');
  });

  it('non-country rows are not links', () => {
    expect(countryHref(PATH, SEARCH, 'Unknown')).toBeUndefined();
    expect(countryHref(PATH, SEARCH, 'XX')).toBeUndefined();
  });

  it('a state row sets region; the Unknown state row is not a link', () => {
    const q = new URL(regionHref(PATH, SEARCH, '14')!, 'http://x').searchParams;
    expect(q.get('region')).toBe('14');
    expect(q.get('country')).toBe('MY');
    expect(regionHref(PATH, SEARCH, 'Unknown')).toBeUndefined();
  });

  it('clearing region keeps country; clearing country drops both', () => {
    expect(clearRegionHref(PATH, SEARCH)).toBe(`${PATH}?from=2026-10-01&to=2026-10-30&country=MY`);
    expect(clearCountryHref(PATH, SEARCH)).toBe(`${PATH}?from=2026-10-01&to=2026-10-30`);
    expect(clearCountryHref(PATH, 'country=MY')).toBe(PATH);
  });
});
