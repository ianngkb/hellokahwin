import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDateWithWeekday,
  formatDateFull,
  formatDateWithRelative,
  EMPTY_DATE,
} from '../format-date';

describe('formatDate', () => {
  it('renders the house format for an instant', () => {
    // 06:32 UTC is 14:32 in Kuala Lumpur (UTC+8).
    expect(formatDate('2026-07-31T06:32:00Z')).toBe("Jul 31 '26");
  });

  it('accepts a Date object and a unix-ms number', () => {
    expect(formatDate(new Date('2026-07-31T06:32:00Z'))).toBe("Jul 31 '26");
    expect(formatDate(Date.parse('2026-07-31T06:32:00Z'))).toBe("Jul 31 '26");
  });

  it('rolls to the next calendar day past 16:00 UTC', () => {
    // The bug this helper exists to fix: an unpinned server render would show
    // Jul 31 here, because Vercel's clock is UTC.
    expect(formatDate('2026-07-31T18:00:00Z')).toBe("Aug 01 '26");
  });

  it('treats a bare YYYY-MM-DD as a calendar date with no timezone shift', () => {
    expect(formatDate('2026-12-31')).toBe("Dec 31 '26");
    expect(formatDate('2026-01-01')).toBe("Jan 01 '26");
  });

  it('zero-pads the day', () => {
    expect(formatDate('2026-03-04T00:00:00Z')).toBe("Mar 04 '26");
  });

  it.each([null, undefined, ''])('renders an em-dash for %s', (value) => {
    expect(formatDate(value)).toBe(EMPTY_DATE);
  });

  it('renders an em-dash for unparseable input instead of throwing', () => {
    expect(() => formatDate('not-a-date')).not.toThrow();
    expect(formatDate('not-a-date')).toBe(EMPTY_DATE);
    expect(formatDate(new Date('nope'))).toBe(EMPTY_DATE);
  });
});

describe('formatDateWithWeekday', () => {
  it('prefixes the short weekday', () => {
    expect(formatDateWithWeekday('2026-07-31T06:32:00Z')).toBe("Fri, Jul 31 '26");
  });

  it('uses the Kuala Lumpur day, not the UTC one', () => {
    // 18:00 UTC on Friday is already Saturday in Malaysia.
    expect(formatDateWithWeekday('2026-07-31T18:00:00Z')).toBe("Sat, Aug 01 '26");
  });

  it('renders an em-dash for missing input', () => {
    expect(formatDateWithWeekday(null)).toBe(EMPTY_DATE);
  });
});

describe('formatDateTime', () => {
  it('appends a 24-hour time in Kuala Lumpur', () => {
    expect(formatDateTime('2026-07-31T06:32:00Z')).toBe("Jul 31 '26, 14:32");
  });

  it('uses a 24-hour clock rather than emitting 24:00 at midnight', () => {
    // 16:00 UTC == 00:00 MYT the following day.
    expect(formatDateTime('2026-07-31T16:00:00Z')).toBe("Aug 01 '26, 00:00");
  });

  it('renders an em-dash for missing input', () => {
    expect(formatDateTime(null)).toBe(EMPTY_DATE);
  });
});

describe('formatDateFull', () => {
  it('renders the long form used in tooltips', () => {
    expect(formatDateFull('2026-07-31T06:32:00Z')).toBe('31 July 2026, 14:32');
  });

  it('renders an em-dash for missing input', () => {
    expect(formatDateFull(undefined)).toBe(EMPTY_DATE);
  });
});

describe('formatDateWithRelative', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T06:32:00Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('pairs the short display with a long + relative title', () => {
    const { display, title } = formatDateWithRelative('2026-07-31T06:32:00Z');
    expect(display).toBe("Jul 31 '26");
    expect(title).toBe('31 July 2026, 14:32 · 2 days ago');
  });

  it('has no title when there is nothing to describe', () => {
    expect(formatDateWithRelative(null)).toEqual({ display: EMPTY_DATE, title: undefined });
    expect(formatDateWithRelative('not-a-date')).toEqual({
      display: EMPTY_DATE,
      title: undefined,
    });
  });
});
