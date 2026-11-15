// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  ADMIN_NAV_GROUPS,
  findActiveTabHref,
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

  it('keeps Inspire first, led by Articles (the /admin redirect target)', () => {
    expect(ADMIN_NAV_GROUPS[0]?.id).toBe('inspire');
    expect(resolveAdminGroups()[0]?.href).toBe('/admin/inspire');
  });
});

describe('admin nav: articles homepage curation', () => {
  const groups = resolveAdminGroups();

  it('lists /admin/inspire/homepage and routes it to the inspire group', () => {
    expect(flattenAdminNav(groups).map((i) => i.href)).toContain('/admin/inspire/homepage');
    expect(findGroupForPath(groups, '/admin/inspire/homepage')?.id).toBe('inspire');
  });

  it('is findable from the ⌘K palette by "featured" and "pin"', () => {
    const flat = flattenAdminNav(groups);
    expect(searchAdminNav(flat, 'featured').map((i) => i.href)).toContain(
      '/admin/inspire/homepage',
    );
    expect(searchAdminNav(flat, 'pin').map((i) => i.href)).toContain('/admin/inspire/homepage');
  });
});

describe("admin nav: Inspire matches The Wedding Notebook's tab order", () => {
  const groups = resolveAdminGroups();
  const inspire = groups.find((g) => g.id === 'inspire')!;

  it('lists the Inspire tabs in TWN order, with TWN labels, for screens HelloKahwin has', () => {
    expect(inspire.tabs.map((t) => [t.label, t.href])).toEqual([
      ['Articles', '/admin/inspire'],
      ['Inspire Homepage', '/admin/inspire/homepage'],
      ['Media Library', '/admin/inspire/media'],
      ['Categories', '/admin/inspire/categories'],
      ['Clusters', '/admin/inspire/clusters'],
      ['Tags', '/admin/inspire/tags'],
      ['Authors', '/admin/inspire/authors'],
      ['Article Analytics', '/admin/inspire/analytics'],
      ['Navigation', '/admin/inspire/navigation'],
      ['Dynamic Blocks', '/admin/inspire/dynamic-blocks'],
    ]);
  });

  it('has no entries for TWN screens HelloKahwin lacks', () => {
    const hrefs = flattenAdminNav(groups).map((i) => i.href);
    for (const missing of [
      '/admin/inspire/vendor-credits',
      '/admin/inspire/angpow-rates',
      '/admin/pinterest-export',
    ]) {
      expect(hrefs).not.toContain(missing);
    }
  });

  it('routes every Inspire screen, the editor and the create pages to the one Inspire group', () => {
    for (const path of [
      '/admin/inspire',
      '/admin/inspire/create',
      '/admin/inspire/0b7c4f8e-1111-4222-8333-444455556666/edit',
      '/admin/inspire/media',
      '/admin/inspire/tags/merge',
      '/admin/inspire/authors',
      '/admin/inspire/dynamic-blocks/create',
    ]) {
      expect(findGroupForPath(groups, path)?.id).toBe('inspire');
    }
  });

  it('highlights the parent tab on child screens, and nothing on the editor', () => {
    expect(findActiveTabHref(inspire, '/admin/inspire/create')).toBe('/admin/inspire');
    expect(findActiveTabHref(inspire, '/admin/inspire/tags/merge')).toBe('/admin/inspire/tags');
    expect(findActiveTabHref(inspire, '/admin/inspire/dynamic-blocks/create')).toBe(
      '/admin/inspire/dynamic-blocks',
    );
    expect(findActiveTabHref(inspire, '/admin/inspire/abc/edit')).toBeNull();
  });

  it('highlights Clusters on a cluster editor, and finds it by "series"', () => {
    expect(
      findActiveTabHref(inspire, '/admin/inspire/clusters/0b7c4f8e-1111-4222-8333-444455556666'),
    ).toBe('/admin/inspire/clusters');
    expect(searchAdminNav(flattenAdminNav(groups), 'series').map((i) => i.href)).toContain(
      '/admin/inspire/clusters',
    );
  });

  it('keeps the create screens reachable from ⌘K', () => {
    const flat = flattenAdminNav(groups);
    expect(searchAdminNav(flat, 'new article').map((i) => i.href)).toContain(
      '/admin/inspire/create',
    );
    expect(searchAdminNav(flat, 'merge').map((i) => i.href)).toContain('/admin/inspire/tags/merge');
  });
});

describe('admin nav: articles homepage curation', () => {
  const groups = resolveAdminGroups();

  it('lists /admin/inspire/homepage and routes it to the Inspire group', () => {
    expect(flattenAdminNav(groups).map((i) => i.href)).toContain('/admin/inspire/homepage');
    expect(findGroupForPath(groups, '/admin/inspire/homepage')?.id).toBe('inspire');
  });

  it('is findable from the ⌘K palette by "featured" and "pin"', () => {
    const flat = flattenAdminNav(groups);
    expect(searchAdminNav(flat, 'featured').map((i) => i.href)).toContain(
      '/admin/inspire/homepage',
    );
    expect(searchAdminNav(flat, 'pin').map((i) => i.href)).toContain('/admin/inspire/homepage');
  });
});
