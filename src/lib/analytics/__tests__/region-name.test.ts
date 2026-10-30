import { describe, it, expect } from 'vitest';
import { regionName } from '../region-name';

describe('regionName', () => {
  it('names Malaysian states from the ISO 3166-2:MY code', () => {
    expect(regionName('MY', '10')).toBe('Selangor');
    expect(regionName('MY', '14')).toBe('Wilayah Persekutuan Kuala Lumpur');
    expect(regionName('MY', '01')).toBe('Johor');
    expect(regionName('my', '13')).toBe('Sarawak');
  });

  it('renders any other country raw', () => {
    expect(regionName('US', 'CA')).toBe('CA');
    expect(regionName('SG', '01')).toBe('01');
  });

  it('falls back to the raw code when nothing maps (never hides it, never throws)', () => {
    expect(regionName('MY', '99')).toBe('99');
    expect(regionName(null, '10')).toBe('10');
    expect(regionName(undefined, 'CA')).toBe('CA');
  });

  it('returns Unknown for an empty/missing code or the sentinel', () => {
    expect(regionName('MY', '')).toBe('Unknown');
    expect(regionName('MY', null)).toBe('Unknown');
    expect(regionName('MY', undefined)).toBe('Unknown');
    expect(regionName('MY', 'Unknown')).toBe('Unknown');
  });
});
