import { describe, it, expect } from 'vitest';
import {
  MONTH_PICKER_MONTHS,
  adjacentMonths,
  currentMonthKey,
  isMonthlyPeriod,
  monthFloorKey,
  monthOptions,
  monthWindow,
  parseMonthParam,
} from '../month-window';

/**
 * The monthly report's windows and the words that describe them.
 *
 * The whole feature is "September vs August" — the comparison the rolling
 * `getPreviousPeriod` could never express — so these cases are the feature.
 * Every date is a KL calendar day; `today` is what `getKLToday()` returns, a
 * local-midnight Date.
 */

const OCT_9 = new Date(2026, 9, 9); // Thu 9 Oct 2026

describe('monthWindow — a completed month is the whole month vs the whole month before', () => {
  it('compares Sep 2026 with Aug 2026', () => {
    const w = monthWindow('2026-09', OCT_9);
    expect(w.range).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(w.prevRange).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(w.running).toBe(false);
    expect(w.label).toBe('Sep 2026');
    expect(w.comparisonLabel).toBe('Sep 2026 vs Aug 2026');
  });

  it('crosses the year end rather than staying inside it', () => {
    const w = monthWindow('2026-01', OCT_9);
    expect(w.range).toEqual({ from: '2026-01-01', to: '2026-01-31' });
    expect(w.prevRange).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(w.comparisonLabel).toBe('Jan 2026 vs Dec 2025');
  });
});

describe('monthWindow — the running month is month-to-date on equal day counts', () => {
  it('compares Oct 1–9 with Sep 1–9, not with the whole of September', () => {
    const w = monthWindow('2026-10', OCT_9);
    expect(w.range).toEqual({ from: '2026-10-01', to: '2026-10-09' });
    // The honest baseline. A full-September comparison on the 9th would make
    // every October tile read as a collapse.
    expect(w.prevRange).toEqual({ from: '2026-09-01', to: '2026-09-09' });
    expect(w.running).toBe(true);
    expect(w.label).toBe('Oct 2026 (month to date)');
    expect(w.comparisonLabel).toBe('Oct 1–9 vs Sep 1–9 (month to date)');
  });

  it('says "Nov 1 vs Oct 1" on the first of the month, never "Nov 1–1"', () => {
    const w = monthWindow('2026-11', new Date(2026, 10, 1));
    expect(w.range).toEqual({ from: '2026-11-01', to: '2026-11-01' });
    expect(w.prevRange).toEqual({ from: '2026-10-01', to: '2026-10-01' });
    expect(w.comparisonLabel).toBe('Nov 1 vs Oct 1 (month to date)');
  });

  it('clamps to the previous month when parity cannot hold, and shows the clamp', () => {
    // There is no 30 February, so 30 Mar has to compare against 28 Feb — and
    // the label has to say so rather than implying 30 days on both sides.
    const w = monthWindow('2026-03', new Date(2026, 2, 30));
    expect(w.range).toEqual({ from: '2026-03-01', to: '2026-03-30' });
    expect(w.prevRange).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(w.comparisonLabel).toBe('Mar 1–30 vs Feb 1–28 (month to date)');
  });

  it('uses the 29th in a leap year', () => {
    const w = monthWindow('2028-03', new Date(2028, 2, 29));
    expect(w.range).toEqual({ from: '2028-03-01', to: '2028-03-29' });
    expect(w.prevRange).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(w.comparisonLabel).toBe('Mar 1–29 vs Feb 1–29 (month to date)');
  });
});

describe('parseMonthParam — nonsense renders the current month, never an error', () => {
  it('takes a usable month as given', () => {
    expect(parseMonthParam('2026-09', OCT_9)).toBe('2026-09');
    expect(parseMonthParam('2026-10', OCT_9)).toBe('2026-10');
    // The picker's floor is itself usable — 18 months counting this one.
    expect(parseMonthParam(monthFloorKey(OCT_9), OCT_9)).toBe('2025-05');
  });

  it.each([
    ['2026-13', 'an impossible month date-fns would roll over into 2027'],
    ['2026-9', 'a loose shape the round-trip rejects'],
    ['Sep', 'a month name'],
    ['2026-09-01', 'a full day'],
    ['', 'an empty value'],
    ['2027-01', 'a month that has not happened'],
    ['2024-01', 'a month older than the picker floor'],
  ])('falls back to the current month for %s (%s)', (raw) => {
    expect(parseMonthParam(raw, OCT_9)).toBe('2026-10');
  });

  it('falls back when the param is absent', () => {
    expect(parseMonthParam(undefined, OCT_9)).toBe('2026-10');
  });

  it('takes the first value of a repeated key, as the lead book does', () => {
    expect(parseMonthParam(['2026-09', '2026-08'], OCT_9)).toBe('2026-09');
    expect(parseMonthParam(['nonsense', '2026-08'], OCT_9)).toBe('2026-10');
  });
});

describe('isMonthlyPeriod — only `month` leaves the weekly report', () => {
  it.each([undefined, '', 'week', 'x', 'MONTH', 'months'])('%s is weekly', (raw) => {
    expect(isMonthlyPeriod(raw)).toBe(false);
  });

  it('accepts `month`, including as the first of a repeated key', () => {
    expect(isMonthlyPeriod('month')).toBe(true);
    expect(isMonthlyPeriod(['month', 'week'])).toBe(true);
    expect(isMonthlyPeriod(['week', 'month'])).toBe(false);
  });
});

describe('the picker’s own options', () => {
  it('offers eighteen months, newest first, ending on this month', () => {
    const options = monthOptions(OCT_9);
    expect(options).toHaveLength(MONTH_PICKER_MONTHS);
    expect(options[0]).toEqual({ value: '2026-10', label: 'Oct 2026 (month to date)' });
    expect(options[1]).toEqual({ value: '2026-09', label: 'Sep 2026' });
    expect(options.at(-1)).toEqual({ value: '2025-05', label: 'May 2025' });
    expect(currentMonthKey(OCT_9)).toBe('2026-10');
    expect(monthFloorKey(OCT_9)).toBe('2025-05');
  });

  it('disables Next on the current month and Prev at the floor', () => {
    expect(adjacentMonths('2026-10', OCT_9)).toEqual({ prev: '2026-09', next: null });
    expect(adjacentMonths('2025-05', OCT_9)).toEqual({ prev: null, next: '2025-06' });
    expect(adjacentMonths('2026-01', OCT_9)).toEqual({ prev: '2025-12', next: '2026-02' });
  });
});

/**
 * Every one of these is called by the SERVER page. An export of a `'use client'`
 * module arrives there as a client-reference proxy rather than a callable, which
 * is how `describeWindow` 500'd `/admin/leads/report` outright (Sentry
 * TWN-NEW-5D). The import at the top of this file is half the assertion; this
 * is the other half.
 */
describe('all of it is plain functions, not client-reference proxies', () => {
  it.each([
    ['parseMonthParam', parseMonthParam],
    ['monthWindow', monthWindow],
    ['monthOptions', monthOptions],
    ['adjacentMonths', adjacentMonths],
    ['isMonthlyPeriod', isMonthlyPeriod],
    ['currentMonthKey', currentMonthKey],
    ['monthFloorKey', monthFloorKey],
  ])('%s', (_name, fn) => {
    expect(typeof fn).toBe('function');
    expect((fn as unknown as { $$typeof?: symbol }).$$typeof).toBeUndefined();
  });
});
