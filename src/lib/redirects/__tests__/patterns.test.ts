import { describe, it, expect } from 'vitest';
import { getPatternRedirect, normalizePathname } from '../patterns';

describe('normalizePathname', () => {
  it('collapses duplicate slashes and strips trailing slash', () => {
    expect(normalizePathname('//category//foo/')).toBe('/category/foo');
    expect(normalizePathname('/')).toBe('/');
  });
});

describe('getPatternRedirect — legacy WP shapes', () => {
  it('maps category archives, including nested, to /artikel/{slug}', () => {
    expect(getPatternRedirect('/category/perancangan')).toEqual({
      destinationPath: '/artikel/perancangan',
      statusCode: 301,
    });
    expect(getPatternRedirect('/category/idea/bajet-perkahwinan')?.destinationPath).toBe(
      '/artikel/bajet-perkahwinan',
    );
  });

  it('maps tag archives to /artikel/tag/{slug}', () => {
    expect(getPatternRedirect('/tag/kahwin-bajet')?.destinationPath).toBe(
      '/artikel/tag/kahwin-bajet',
    );
  });

  it('sends author archives to the directory', () => {
    expect(getPatternRedirect('/author/admin')?.destinationPath).toBe('/artikel');
  });

  it('maps feeds to their source page', () => {
    expect(getPatternRedirect('/feed')?.destinationPath).toBe('/');
    expect(getPatternRedirect('/hadiah-untuk-pengantin/feed')?.destinationPath).toBe(
      '/hadiah-untuk-pengantin',
    );
  });

  it('maps attachment pages to the parent post', () => {
    expect(getPatternRedirect('/some-post/attachment/img-01')?.destinationPath).toBe('/some-post');
  });

  it('maps date archives to the directory', () => {
    expect(getPatternRedirect('/2026/01')?.destinationPath).toBe('/artikel');
    expect(getPatternRedirect('/2026/01/15')?.destinationPath).toBe('/artikel');
  });

  it('strips /page/N pagination suffixes', () => {
    expect(getPatternRedirect('/category/perancangan/page/2')?.destinationPath).toBe(
      '/artikel/perancangan',
    );
    expect(getPatternRedirect('/page/3')?.destinationPath).toBe('/');
  });

  it('leaves normal paths alone', () => {
    expect(getPatternRedirect('/artikel/perancangan/some-post')).toBeNull();
    expect(getPatternRedirect('/')).toBeNull();
    expect(getPatternRedirect('/hadiah-untuk-pengantin')).toBeNull();
  });
});
