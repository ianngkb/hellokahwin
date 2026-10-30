// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { countryName } from '../country-name';

describe('countryName (F41, server-side)', () => {
  it('names real ISO codes in English', () => {
    expect(countryName('MY')).toBe('Malaysia');
    expect(countryName('SG')).toBe('Singapore');
  });

  it('returns non-countries raw', () => {
    expect(countryName('Unknown')).toBe('Unknown');
    expect(countryName('XX')).toBe('XX');
  });
});
