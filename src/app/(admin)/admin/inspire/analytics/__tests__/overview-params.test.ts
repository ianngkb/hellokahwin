import { describe, expect, it } from 'vitest';
import { resolveArticlePeriod } from '@/lib/analytics/article-period';
import { currentParams, overviewHref, parseFilters } from '../overview-params';

const today = new Date(2026, 10, 12);

describe('parseFilters', () => {
  it('reads and sanitises the filters', () => {
    expect(
      parseFilters({ q: '  rings ', category: 'jewellery', fresh: '1', sort: 'google', page: '3' }),
    ).toEqual({
      q: 'rings',
      category: 'jewellery',
      fresh: true,
      sort: 'google',
      page: 3,
    });
    expect(parseFilters({ page: '-2', sort: 'nope' })).toMatchObject({
      page: 1,
      sort: 'views',
      fresh: false,
    });
  });
});

describe('overview links', () => {
  it('the default view is the bare URL', () => {
    const p = currentParams(resolveArticlePeriod({}, today), parseFilters({}));
    expect(p).toEqual({});
    expect(overviewHref(p, {})).toBe('/admin/inspire/analytics');
  });

  it('changing the period keeps filters, resets the page, drops a stale month', () => {
    const p = currentParams(
      resolveArticlePeriod({ period: 'month', month: '2026-10' }, today),
      parseFilters({ q: 'rings', page: '2', sort: 'readers' }),
    );
    expect(p).toEqual({
      period: 'month',
      month: '2026-10',
      q: 'rings',
      page: '2',
      sort: 'readers',
    });
    expect(overviewHref(p, { period: '7d', month: null })).toBe(
      '/admin/inspire/analytics?period=7d&q=rings&sort=readers',
    );
  });

  it('paging keeps everything else', () => {
    const p = currentParams(resolveArticlePeriod({ period: 'lifetime' }, today), parseFilters({}));
    expect(overviewHref(p, { page: '2' })).toBe('/admin/inspire/analytics?period=lifetime&page=2');
  });
});
