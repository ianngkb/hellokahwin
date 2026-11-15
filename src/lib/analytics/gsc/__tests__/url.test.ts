import { describe, it, expect } from 'vitest';
import { classifyGscPath, normalizeGscUrl, parseGscUrl } from '../url';

describe('normalizeGscUrl', () => {
  it('collapses host, case, trailing slash, query string and double slashes', () => {
    expect(normalizeGscUrl('https://www.hellokahwin.com/Artikel/Adat/Merisik/?utm=x')).toBe(
      '/artikel/adat/merisik',
    );
    expect(normalizeGscUrl('https://hellokahwin.com//artikel//adat/merisik')).toBe(
      '/artikel/adat/merisik',
    );
    expect(normalizeGscUrl('https://hellokahwin.com/')).toBe('/');
    expect(normalizeGscUrl('https://hellokahwin.com')).toBe('/');
  });

  it('decodes percent-encoded slugs, and keeps a malformed one as-is', () => {
    expect(normalizeGscUrl('https://hellokahwin.com/artikel/a/caf%C3%A9')).toBe('/artikel/a/café');
    expect(normalizeGscUrl('https://hellokahwin.com/artikel/a/%E0%A4')).toBe('/artikel/a/%e0%a4');
  });

  it('rejects a host we do not own, and junk', () => {
    expect(normalizeGscUrl('https://theweddingnotebook.com/artikel/a/b')).toBeNull();
    expect(normalizeGscUrl('not a url')).toBeNull();
  });
});

describe('classifyGscPath', () => {
  it('articles key on the slug; the category is reporting only', () => {
    expect(classifyGscPath('/artikel/persiapan/hantaran')).toEqual({
      entityType: 'article',
      slug: 'hantaran',
      categorySlug: 'persiapan',
    });
  });

  it('catches tag and author pages before the article shape', () => {
    expect(classifyGscPath('/artikel/tag/songket').entityType).toBe('tag');
    expect(classifyGscPath('/artikel/author/aisyah').entityType).toBe('author');
  });

  it('home, category hubs, static pages and the rest', () => {
    expect(classifyGscPath('/').entityType).toBe('home');
    expect(classifyGscPath('/artikel/persiapan')).toEqual({
      entityType: 'category',
      slug: 'persiapan',
      categorySlug: 'persiapan',
    });
    expect(classifyGscPath('/artikel').entityType).toBe('static');
    expect(classifyGscPath('/cari').entityType).toBe('static');
    expect(classifyGscPath('/a/b/c/d').entityType).toBe('other');
    expect(classifyGscPath('/artikel/a/b/c').entityType).toBe('other');
  });

  it('a WordPress-era /{slug} URL is attributed to its article', () => {
    expect(classifyGscPath('/cara-daftar-nikah')).toEqual({
      entityType: 'article',
      slug: 'cara-daftar-nikah',
      categorySlug: null,
    });
  });

  it('parseGscUrl = normalise + classify', () => {
    expect(parseGscUrl('https://hellokahwin.com/artikel/a/b/')?.classification.slug).toBe('b');
    expect(parseGscUrl('https://elsewhere.com/x')).toBeNull();
  });
});
