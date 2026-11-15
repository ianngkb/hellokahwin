// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  ADMIN_NAV_GROUPS,
  findGroupForPath,
  flattenAdminNav,
  resolveAdminGroups,
  searchAdminNav,
} from '../admin-nav-sections';

describe('admin nav: site analytics (D11)', () => {
  const groups = resolveAdminGroups();

  it('lists /admin/site-analytics as a destination', () => {
    const flat = flattenAdminNav(groups);
    expect(flat.map((i) => i.href)).toContain('/admin/site-analytics');
  });

  it('routes /admin/site-analytics to the analytics group', () => {
    expect(findGroupForPath(groups, '/admin/site-analytics')?.id).toBe('analytics');
  });

  it('is findable from the ⌘K palette by "traffic"', () => {
    const hits = searchAdminNav(flattenAdminNav(groups), 'traffic');
    expect(hits.map((i) => i.href)).toContain('/admin/site-analytics');
  });

  it('keeps Articles first (the /admin redirect target)', () => {
    expect(ADMIN_NAV_GROUPS[0]?.id).toBe('articles');
  });
});

describe('admin nav: articles homepage curation', () => {
  const groups = resolveAdminGroups();

  it('lists /admin/inspire/homepage and routes it to the articles group', () => {
    expect(flattenAdminNav(groups).map((i) => i.href)).toContain('/admin/inspire/homepage');
    expect(findGroupForPath(groups, '/admin/inspire/homepage')?.id).toBe('articles');
  });

  it('is findable from the ⌘K palette by "featured" and "pin"', () => {
    const flat = flattenAdminNav(groups);
    expect(searchAdminNav(flat, 'featured').map((i) => i.href)).toContain(
      '/admin/inspire/homepage',
    );
    expect(searchAdminNav(flat, 'pin').map((i) => i.href)).toContain('/admin/inspire/homepage');
  });
});
