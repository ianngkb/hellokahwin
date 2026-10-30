// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { formatCount } from '../format-count';

describe('formatCount (F39, F46)', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1_000, '1.0k'],
    [12_345, '12.3k'],
    [999_949, '999.9k'],
    [999_950, '1.0M'],
    [999_999, '1.0M'],
    [1_000_000, '1.0M'],
    [4_560_000, '4.6M'],
  ])('%d → %s', (n, expected) => {
    expect(formatCount(n)).toBe(expected);
  });
});
