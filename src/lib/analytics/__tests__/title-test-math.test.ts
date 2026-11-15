import { describe, expect, it } from 'vitest';
import { googleDay, sideStats, titleTestVerdict, titleTestWindows } from '../title-test-math';

// The real first test: changed at 02:14 on 13 Nov in Malaysia.
const started = new Date('2026-11-12T18:14:15Z');

describe('googleDay', () => {
  it("places the change on Google's (US Pacific) calendar", () => {
    expect(googleDay(started)).toBe('2026-11-12');
    expect(googleDay(new Date('2026-11-13T07:59:00Z'))).toBe('2026-11-12');
    expect(googleDay(new Date('2026-11-13T08:01:00Z'))).toBe('2026-11-13');
  });
});

describe('titleTestWindows', () => {
  it('has no windows until Google reports a full day after the change', () => {
    expect(titleTestWindows(started, null, '2026-11-12')).toMatchObject({
      days: 0,
      after: null,
      before: null,
    });
    expect(titleTestWindows(started, null, null).days).toBe(0);
  });

  it('skips the mixed change day and mirrors the after window before it', () => {
    const w = titleTestWindows(started, null, '2026-11-19');
    expect(w.changeDay).toBe('2026-11-12');
    expect(w.days).toBe(7);
    expect(w.after).toEqual({ from: '2026-11-13', to: '2026-11-19' });
    expect(w.before).toEqual({ from: '2026-11-05', to: '2026-11-11' });
  });

  it('stops growing at 28 days', () => {
    const w = titleTestWindows(started, null, '2027-01-31');
    expect(w.days).toBe(28);
    expect(w.after).toEqual({ from: '2026-11-13', to: '2026-12-10' });
    expect(w.before).toEqual({ from: '2026-10-15', to: '2026-11-11' });
  });

  it('an ended test stops at the last full day before it ended', () => {
    const w = titleTestWindows(started, new Date('2026-11-25T20:00:00Z'), '2026-12-31');
    expect(w.after).toEqual({ from: '2026-11-13', to: '2026-11-24' });
    expect(w.days).toBe(12);
  });
});

describe('titleTestVerdict', () => {
  // Position 6 usually earns 5% of clicks.
  const at6 = (impressions: number, clicks: number) =>
    sideStats({ impressions, clicks, positionSum: impressions * 6 });

  it('waits for 7 days', () => {
    expect(titleTestVerdict(6, at6(1000, 10), at6(1000, 50)).kind).toBe('waiting');
  });

  it('waits for enough Google views on both sides', () => {
    expect(titleTestVerdict(10, at6(299, 3), at6(1000, 50)).kind).toBe('waiting');
    expect(titleTestVerdict(10, at6(1000, 10), at6(299, 30)).kind).toBe('waiting');
  });

  it('calls a clear rise a win and a clear drop a loss', () => {
    expect(titleTestVerdict(14, at6(1000, 16), at6(1000, 30)).kind).toBe('winning');
    expect(titleTestVerdict(14, at6(1000, 30), at6(1000, 16)).kind).toBe('losing');
    expect(titleTestVerdict(14, at6(1000, 20), at6(1000, 22)).kind).toBe('flat');
  });

  it('judges the click rate against what the position usually earns', () => {
    // Same 2% click rate, but after the change the article sits at position 3
    // (which usually earns 11%), so the title is doing WORSE for its spot.
    const before = sideStats({ impressions: 1000, clicks: 20, positionSum: 6000 });
    const after = sideStats({ impressions: 1000, clicks: 20, positionSum: 3000 });
    expect(titleTestVerdict(14, before, after).kind).toBe('losing');
  });

  it('no clicks before and some after is a win', () => {
    expect(titleTestVerdict(14, at6(1000, 0), at6(1000, 5)).kind).toBe('winning');
  });
});
