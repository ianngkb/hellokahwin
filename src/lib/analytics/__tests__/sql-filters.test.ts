import { describe, it, expect } from 'vitest';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import {
  isCountryCode,
  parseCountry,
  parseRegion,
  parseTrafficMode,
  regionFilter,
  countryFilter,
  trafficFilter,
} from '../sql-filters';

/** Render a SQL fragment to its text + bound params, dialect-accurately. */
const dialect = new PgDialect();
const render = (fragment: SQL): { sql: string; params: unknown[] } => {
  const q = dialect.sqlToQuery(fragment);
  return { sql: q.sql, params: q.params };
};

describe('isCountryCode', () => {
  it('accepts real ISO alpha-2 codes (case-insensitive)', () => {
    for (const code of ['US', 'MY', 'SG', 'gb', 'jp']) {
      expect(isCountryCode(code)).toBe(true);
    }
  });

  it('rejects geo-provider pseudo-codes', () => {
    // XX/ZZ = unknown, EU/AP/QO = region aggregates, T1 = Tor, A1/A2/O1 = buckets
    for (const code of ['XX', 'ZZ', 'EU', 'AP', 'QO', 'T1', 'A1', 'A2', 'O1', 'xx', 't1']) {
      expect(isCountryCode(code)).toBe(false);
    }
  });

  it('rejects malformed / empty values', () => {
    for (const v of ['', 'USA', 'U', '12', '1A', '<script>', null, undefined]) {
      expect(isCountryCode(v)).toBe(false);
    }
  });
});

describe('query-param guards (spec D9)', () => {
  it('parseCountry rejects pseudo-codes and upper-cases real ones', () => {
    expect(parseCountry('xx')).toBeUndefined();
    expect(parseCountry('my')).toBe('MY');
  });

  it('parseRegion rejects the Unknown sentinel and keeps a real code', () => {
    expect(parseRegion('Unknown')).toBeUndefined();
    expect(parseRegion('10')).toBe('10');
  });

  it('parseTrafficMode falls back to human for junk', () => {
    expect(parseTrafficMode('bogus')).toBe('human');
    expect(parseTrafficMode(undefined)).toBe('human');
    expect(parseTrafficMode('bot')).toBe('bot');
    expect(parseTrafficMode('all')).toBe('all');
  });
});

describe('trafficFilter', () => {
  it('maps each mode to its is_bot predicate', () => {
    expect(render(trafficFilter('human')).sql).toContain('is_bot = FALSE');
    expect(render(trafficFilter('bot')).sql).toContain('is_bot = TRUE');
    expect(render(trafficFilter('all')).sql).toBe('TRUE');
  });
});

describe('parseCountry', () => {
  it('normalizes real codes to uppercase', () => {
    expect(parseCountry('us')).toBe('US');
    expect(parseCountry('MY')).toBe('MY');
  });

  it('drops pseudo-codes and junk to undefined (falls back to unfiltered)', () => {
    for (const v of ['XX', 'zz', 'EU', 'T1', '', 'zzz', '<script>', null, undefined]) {
      expect(parseCountry(v)).toBeUndefined();
    }
  });
});

describe('parseRegion', () => {
  it('accepts real subdivision codes and upper-cases them (numeric, alpha, alphanumeric)', () => {
    // `10` (Selangor), `CA` (California); alpha is upper-cased so a hand-typed
    // lower-case URL still matches the stored code.
    expect(parseRegion('10')).toBe('10');
    expect(parseRegion('CA')).toBe('CA');
    expect(parseRegion('01')).toBe('01');
    expect(parseRegion('ENG')).toBe('ENG');
    expect(parseRegion('ca')).toBe('CA');
    expect(parseRegion('a1b2')).toBe('A1B2');
  });

  it('rejects empty, over-long, non-alphanumeric junk, and the Unknown sentinel', () => {
    // 'Unknown' is alphanumeric so it passes the raw shape RE, but it is the
    // missing-region bucket, not a drillable code — it must be rejected, or
    // ?region=Unknown would scope every panel to a value no row carries.
    for (const v of [
      '',
      ' ',
      '10-',
      'MY-10',
      'a b',
      'toolongregion1',
      'Unknown',
      'unknown',
      '<script>',
      null,
      undefined,
    ]) {
      expect(parseRegion(v)).toBeUndefined();
    }
  });
});

describe('regionFilter', () => {
  it('scopes to the region column and binds the code for a valid region', () => {
    const q = render(regionFilter('10'));
    expect(q.sql).toContain('region =');
    expect(q.params).toContain('10');

    const q2 = render(regionFilter('CA'));
    expect(q2.sql).toContain('region =');
    expect(q2.params).toContain('CA');
  });

  it('falls back to an unscoped TRUE (no params) for a missing/invalid region', () => {
    const q = render(regionFilter(undefined));
    expect(q.sql.toLowerCase()).toContain('true');
    expect(q.params).toHaveLength(0);
  });

  it('never scopes on the same input parseRegion would reject (boundary + SQL agree)', () => {
    for (const v of ['MY-10', '', 'a b', 'toolongregion1', 'Unknown']) {
      expect(parseRegion(v)).toBeUndefined();
      const q = render(regionFilter(v as string));
      expect(q.sql.toLowerCase()).toContain('true');
      expect(q.params).toHaveLength(0);
    }
  });

  it('countryFilter still scopes and binds alongside (sanity)', () => {
    const q = render(countryFilter('MY'));
    expect(q.sql).toContain('country =');
    expect(q.params).toContain('MY');
  });
});
