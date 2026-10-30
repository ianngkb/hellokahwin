// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  getPreviousPeriod,
  isBoundedRange,
  parseDateParam,
  resolveRange,
  toUtcRange,
} from '../date-range';

describe('toUtcRange (D8)', () => {
  it('maps one KL day to a half-open UTC window starting at 16:00Z the day before', () => {
    expect(toUtcRange({ from: '2026-10-01', to: '2026-10-01' })).toEqual({
      start: '2026-09-30T16:00:00.000Z',
      endExclusive: '2026-10-01T16:00:00.000Z',
    });
  });

  it('ends at KL midnight after the inclusive `to` day', () => {
    expect(toUtcRange({ from: '2026-10-01', to: '2026-10-31' })).toEqual({
      start: '2026-09-30T16:00:00.000Z',
      endExclusive: '2026-10-31T16:00:00.000Z',
    });
  });

  it('returns ISO strings, not Dates (raw sql binds reject Dates)', () => {
    const { start, endExclusive } = toUtcRange({ from: '2026-10-01', to: '2026-10-02' });
    expect(typeof start).toBe('string');
    expect(typeof endExclusive).toBe('string');
  });
});

describe('getPreviousPeriod (D8)', () => {
  it('returns the immediately preceding range of equal length', () => {
    expect(getPreviousPeriod('2026-10-02', '2026-10-31')).toEqual({
      from: '2026-09-02',
      to: '2026-10-01',
    });
  });

  it('handles a single day', () => {
    expect(getPreviousPeriod('2026-10-01', '2026-10-01')).toEqual({
      from: '2026-09-30',
      to: '2026-09-30',
    });
  });
});

describe('parseDateParam (D8)', () => {
  const fb = new Date(2026, 0, 1);

  it('falls back on a rolled-over date', () => {
    expect(parseDateParam('2026-13-45', fb)).toBe(fb);
    expect(parseDateParam('2026-02-30', fb)).toBe(fb);
  });

  it('falls back on loose shapes, arrays and empties', () => {
    expect(parseDateParam('2026-7-1', fb)).toBe(fb);
    expect(parseDateParam(['2026-10-01', '2026-10-02'], fb)).toBe(fb);
    expect(parseDateParam('', fb)).toBe(fb);
    expect(parseDateParam(undefined, fb)).toBe(fb);
  });

  it('parses a real yyyy-MM-dd day', () => {
    const d = parseDateParam('2026-10-01', fb);
    expect(d).not.toBe(fb);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 1]);
  });
});

describe('resolveRange', () => {
  // KL today, as getKLToday() returns it: local midnight of the KL date.
  const today = new Date(2026, 9, 30);

  it('keeps a valid range unchanged', () => {
    expect(resolveRange({ from: '2026-10-01', to: '2026-10-15' }, today)).toEqual({
      from: '2026-10-01',
      to: '2026-10-15',
    });
  });

  it('defaults to the last 30 days ending today', () => {
    expect(resolveRange({}, today)).toEqual({ from: '2026-10-01', to: '2026-10-30' });
  });

  it('clamps a future `to` to today', () => {
    expect(resolveRange({ from: '2026-10-20', to: '2027-01-01' }, today)).toEqual({
      from: '2026-10-20',
      to: '2026-10-30',
    });
  });

  it('resets from > to to the default 30-day window', () => {
    expect(resolveRange({ from: '2026-10-20', to: '2026-10-10' }, today)).toEqual({
      from: '2026-10-01',
      to: '2026-10-30',
    });
  });

  it('caps a span over 366 days by pulling `from` forward', () => {
    expect(resolveRange({ from: '2020-01-01', to: '2026-10-30' }, today)).toEqual({
      from: '2025-10-30',
      to: '2026-10-30',
    });
  });
});

describe('isBoundedRange', () => {
  it('accepts an ordered range of up to 366 days', () => {
    expect(isBoundedRange('2025-10-30', '2026-10-30')).toBe(true);
    expect(isBoundedRange('2026-10-01', '2026-10-01')).toBe(true);
  });

  it('rejects malformed, reversed and over-long ranges', () => {
    expect(isBoundedRange('2026-13-45', '2026-10-30')).toBe(false);
    expect(isBoundedRange('2026-10-30', '2026-10-01')).toBe(false);
    expect(isBoundedRange('2025-10-29', '2026-10-30')).toBe(false);
  });
});
