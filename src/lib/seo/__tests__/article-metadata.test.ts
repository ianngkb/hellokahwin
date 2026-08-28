import { describe, expect, it, vi } from 'vitest';
import {
  buildArticleMetadata,
  resolveArticleMetadata,
  resolveArticleTitle,
  titleFromSlug,
  type ArticleMetadataSource,
} from '../article-metadata';
import { SITE_DEFAULT_TITLE } from '../site-title';

const source: ArticleMetadataSource = {
  title: 'Berapa Dulang Hantaran Tunang Yang Sesuai?',
  slug: 'berapa-dulang-hantaran-tunang',
  metaTitle: 'Berapa Dulang Hantaran Tunang Yang Sesuai? | HelloKahwin',
  metaDescription: 'Panduan bilangan dulang hantaran untuk majlis pertunangan.',
  excerpt: null,
  categorySlug: 'hantaran-mas-kahwin',
  categoryName: 'Hantaran & Mas Kahwin',
  publishedAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  authorFirstName: 'Nur',
  authorLastName: 'Aisyah',
  coverImageUrl: 'https://cdn.example/cover.jpg',
  coverImageSmartCrops: {
    'crop-16x9-og': { url: 'https://cdn.example/og.jpg', width: 1200, height: 630 },
  },
};

const never = () => new Promise<never>(() => {});

describe('resolveArticleTitle', () => {
  it('strips the brand suffix the root template re-appends', () => {
    expect(resolveArticleTitle(source)).toBe('Berapa Dulang Hantaran Tunang Yang Sesuai?');
  });

  it('falls back to the row title when the strip empties meta_title', () => {
    // Both of these are real WordPress-import shapes, and both used to resolve
    // to '' — which Next treats as falsy and replaces with the ROOT DEFAULT.
    // A second door to exactly the SEO-07 defect, with no deadline involved.
    expect(resolveArticleTitle({ title: 'Adat Merisik', metaTitle: '| HelloKahwin' })).toBe(
      'Adat Merisik',
    );
    expect(resolveArticleTitle({ title: 'Adat Merisik', metaTitle: 'HelloKahwin' })).toBe(
      'Adat Merisik',
    );
    expect(resolveArticleTitle({ title: 'Adat Merisik', metaTitle: '   ' })).toBe('Adat Merisik');
    expect(resolveArticleTitle({ title: 'Adat Merisik', metaTitle: null })).toBe('Adat Merisik');
  });

  it('decodes entities so a title never prints &#8217;', () => {
    expect(
      resolveArticleTitle({ title: 'x', metaTitle: 'Kahwin &#038; Cinta | HelloKahwin' }),
    ).toBe('Kahwin & Cinta');
  });
});

describe('buildArticleMetadata', () => {
  it('always carries the article title, never the site default', () => {
    const meta = buildArticleMetadata(source, { baseUrl: 'https://hellokahwin.com' });
    expect(meta.title).toBe('Berapa Dulang Hantaran Tunang Yang Sesuai?');
    expect(meta.title).not.toBe(SITE_DEFAULT_TITLE);
  });

  it('still carries a title from the cheap tier-2 shape (no body, no tags)', () => {
    // This is the shape `getArticleMetadataFallback` returns. If the title
    // survives here, the deadline path can no longer publish the site default.
    const meta = buildArticleMetadata(source, { baseUrl: 'https://hellokahwin.com' });
    expect(meta.title).toBeTruthy();
    expect(meta.title).not.toBe(SITE_DEFAULT_TITLE);
    expect(meta.openGraph?.title).toBe(source.title);
    expect(meta.alternates?.canonical).toBe(
      '/artikel/hantaran-mas-kahwin/berapa-dulang-hantaran-tunang',
    );
  });

  it('uses the body text only as the last description fallback', () => {
    const withBody = { ...source, metaDescription: null, excerpt: null, bodyText: 'Teks badan.' };
    expect(buildArticleMetadata(withBody, { baseUrl: 'x' }).description).toBe('Teks badan.');
    expect(
      buildArticleMetadata({ ...withBody, excerpt: 'Petikan.' }, { baseUrl: 'x' }).description,
    ).toBe('Petikan.');
  });

  it('degrades og:tags rather than the title when tags are missing', () => {
    const full = buildArticleMetadata({ ...source, tagNames: ['tunang'] }, { baseUrl: 'x' });
    const cheap = buildArticleMetadata(source, { baseUrl: 'x' });
    expect(full.openGraph && 'tags' in full.openGraph ? full.openGraph.tags : null).toEqual([
      'tunang',
    ]);
    expect(
      cheap.openGraph && 'tags' in cheap.openGraph ? cheap.openGraph.tags : undefined,
    ).toBeUndefined();
    expect(cheap.title).toBe(full.title);
  });
});

describe('titleFromSlug', () => {
  it('reads a slug back as the Malay sentence it already is', () => {
    expect(titleFromSlug('berapa-dulang-hantaran-tunang')).toBe('Berapa dulang hantaran tunang');
    expect(titleFromSlug('sentosa-janda-baik')).toBe('Sentosa janda baik');
  });

  it('never yields an empty title, whatever it is handed', () => {
    for (const s of ['', '-', '---', '  ']) {
      expect(titleFromSlug(s)).not.toBe('');
      expect(titleFromSlug(s)).not.toBe(SITE_DEFAULT_TITLE);
    }
  });
});

describe('resolveArticleMetadata', () => {
  const base = {
    slug: 'berapa-dulang-hantaran-tunang',
    category: 'hantaran-mas-kahwin',
    baseUrl: 'https://hellokahwin.com',
    fullMs: 50,
    fallbackMs: 50,
  };

  it('uses the full payload and never touches the cheap read on the happy path', async () => {
    const fallback = vi.fn(async () => source);
    const { metadata, tier } = await resolveArticleMetadata({
      ...base,
      full: async () => ({ ...source, bodyText: 'Teks.', tagNames: ['tunang'] }),
      fallback,
    });
    expect(tier).toBe('full');
    expect(metadata.title).toBe('Berapa Dulang Hantaran Tunang Yang Sesuai?');
    // The steady state must not add a query to a 5-wide pool.
    expect(fallback).not.toHaveBeenCalled();
  });

  it('falls back to the cheap read when the full payload misses its deadline', async () => {
    const onDegrade = vi.fn();
    const { metadata, tier } = await resolveArticleMetadata({
      ...base,
      full: never,
      fallback: async () => source,
      onDegrade,
    });
    expect(tier).toBe('fallback');
    expect(metadata.title).toBe('Berapa Dulang Hantaran Tunang Yang Sesuai?');
    expect(onDegrade).toHaveBeenCalledWith('fallback', expect.anything());
  });

  it('falls back to the SLUG when both reads miss, and still never the site default', async () => {
    const onDegrade = vi.fn();
    const { metadata, tier } = await resolveArticleMetadata({
      ...base,
      full: never,
      fallback: never,
      onDegrade,
    });
    expect(tier).toBe('slug');
    expect(metadata.title).toBe('Berapa dulang hantaran tunang');
    expect(metadata.alternates?.canonical).toBe(
      '/artikel/hantaran-mas-kahwin/berapa-dulang-hantaran-tunang',
    );
    expect(onDegrade).toHaveBeenCalledWith('slug', expect.anything());
  });

  it('keeps the emergency tier INDEXABLE — a frozen noindex is the worse bug', async () => {
    // A degraded title is replaced on the next crawl. A `noindex` frozen into a
    // cache entry by the same mechanism removes the page from the index
    // outright. Never trade a title problem for an indexing one.
    const { metadata } = await resolveArticleMetadata({ ...base, full: never, fallback: never });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it('THE INVARIANT: no tier can resolve to metadata without a title', async () => {
    // This is SEO-07 in one assertion. `return {}` — the line this item exists
    // to delete — passes no `title` key, so Next's `mergeMetadata` leaves the
    // ROOT LAYOUT's `title.default` in place and then freezes the homepage
    // title into the article's cache entry for the life of that entry.
    const tiers = [
      { full: async () => source, fallback: never },
      { full: never, fallback: async () => source },
      { full: never, fallback: never },
      { full: async () => Promise.reject(new Error('ECONNRESET')), fallback: never },
    ];
    for (const t of tiers) {
      const { metadata } = await resolveArticleMetadata({ ...base, ...t });
      expect(metadata.title).toBeTruthy();
      expect(metadata.title).not.toBe(SITE_DEFAULT_TITLE);
      expect(Object.keys(metadata)).toContain('title');
    }
  });

  it('propagates a real 404 without retrying it as if it were a timeout', async () => {
    const fallback = vi.fn(async () => source);
    const { metadata, tier } = await resolveArticleMetadata({
      ...base,
      full: async () => null,
      fallback,
    });
    expect(tier).toBe('full');
    expect(metadata).toEqual({ title: 'Not Found' });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('falls through when the full read REJECTS, not only when it hangs', async () => {
    const { tier } = await resolveArticleMetadata({
      ...base,
      full: async () => {
        throw new Error('connection terminated unexpectedly');
      },
      fallback: async () => source,
    });
    expect(tier).toBe('fallback');
  });
});
