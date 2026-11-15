import { describe, expect, it } from 'vitest';
import {
  articleMonthOptions,
  daysIn,
  parseArticleMonth,
  parsePeriodKey,
  resolveArticlePeriod,
  shiftDay,
  VIEWS_TRACKING_SINCE,
} from '../article-period';

// 12 Nov 2026, KL — built the way getKLToday() builds it (local midnight).
// HelloKahwin's page-view tracking began 30 Oct 2026.
const today = new Date(2026, 10, 12);

describe('parsePeriodKey', () => {
  it('defaults to the last 30 days', () => {
    expect(parsePeriodKey(undefined)).toBe('30d');
    expect(parsePeriodKey('junk')).toBe('30d');
  });
  it('takes the first value of a repeated key', () => {
    expect(parsePeriodKey(['7d', 'lifetime'])).toBe('7d');
  });
});

describe('resolveArticlePeriod', () => {
  it('last 7 days includes today and compares with the 7 days before', () => {
    const p = resolveArticlePeriod({ period: '7d' }, today);
    expect(p.range).toEqual({ from: '2026-11-06', to: '2026-11-12' });
    expect(p.prevRange).toEqual({ from: '2026-10-30', to: '2026-11-05' });
    expect(p.label).toBe('Last 7 days');
    expect(p.comparisonLabel).toBe('vs the 7 days before');
  });

  it('last 90 days', () => {
    const p = resolveArticlePeriod({ period: '90d' }, today);
    expect(p.range).toEqual({ from: '2026-08-15', to: '2026-11-12' });
    expect(daysIn(p.range)).toBe(90);
    // The 90 days before lie wholly before tracking began: no comparison
    // rather than "+100%" against an empty window.
    expect(p.prevRange).toBeNull();
    expect(p.comparisonLabel).toBeNull();
  });

  it('lifetime starts when tracking began and has no comparison', () => {
    const p = resolveArticlePeriod({ period: 'lifetime' }, today);
    expect(p.range).toEqual({ from: VIEWS_TRACKING_SINCE, to: '2026-11-12' });
    expect(p.prevRange).toBeNull();
    expect(p.comparisonLabel).toBeNull();
    expect(p.label).toBe('Lifetime (since 30 Oct 2026)');
  });

  // 15 Dec 2026: a month after tracking began, so months have a "before".
  const later = new Date(2026, 11, 15);

  it('a past month runs whole and compares with the month before', () => {
    const p = resolveArticlePeriod({ period: 'month', month: '2026-11' }, later);
    expect(p.range).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(p.prevRange).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(p.label).toBe('Nov 2026');
    expect(p.comparisonLabel).toBe('vs Oct 2026');
  });

  it('the running month stops at today and compares like-for-like days', () => {
    const p = resolveArticlePeriod({ period: 'month', month: '2026-12' }, later);
    expect(p.range).toEqual({ from: '2026-12-01', to: '2026-12-15' });
    expect(p.prevRange).toEqual({ from: '2026-11-01', to: '2026-11-15' });
  });

  it('the month tracking began has no comparison (September has no data)', () => {
    const p = resolveArticlePeriod({ period: 'month', month: '2026-10' }, later);
    expect(p.prevRange).toBeNull();
    expect(p.comparisonLabel).toBeNull();
  });
});

describe('parseArticleMonth', () => {
  it('falls back to the current month for junk, the future and before tracking', () => {
    expect(parseArticleMonth('2026-13', today)).toBe('2026-11');
    expect(parseArticleMonth('2026-9', today)).toBe('2026-11');
    expect(parseArticleMonth('2026-12', today)).toBe('2026-11');
    expect(parseArticleMonth('2026-09', today)).toBe('2026-11');
    expect(parseArticleMonth('2026-10', today)).toBe('2026-10');
  });
});

describe('articleMonthOptions', () => {
  it('lists newest first, back to the month tracking began', () => {
    const opts = articleMonthOptions(today);
    expect(opts[0]).toEqual({ value: '2026-11', label: 'November 2026 (so far)' });
    expect(opts.at(-1)).toEqual({ value: '2026-10', label: 'October 2026' });
    expect(opts).toHaveLength(2);
  });
});

describe('day helpers', () => {
  it('shiftDay crosses month ends', () => {
    expect(shiftDay('2026-11-01', -1)).toBe('2026-10-31');
  });
});
