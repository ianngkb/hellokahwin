import { describe, expect, it, vi } from 'vitest';

/**
 * Review F1 (ianngkb/search): a `published` article dated in the future is
 * scheduled, not live, and must not reach the search API or /cari — both of
 * which go through `searchArticles` / `getVisibleSearchCorpus`.
 */

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/drizzle', () => ({ db: {} }));

const NOW = Date.parse('2026-11-15T12:00:00Z');

const row = (id: string, title: string, publishedAt: string | null) => ({
  id,
  title,
  slug: id,
  href: `/artikel/hantaran-mas-kahwin/${id}`,
  categorySlug: 'hantaran-mas-kahwin',
  categoryName: 'Hantaran & Mas Kahwin',
  excerpt: null,
  thumbnailUrl: null,
  publishedAt,
});

const corpus = [
  row('live', 'Hantaran kahwin bajet 2026', '2026-11-01T00:00:00Z'),
  row('undated', 'Hantaran untuk lelaki', null),
  row('scheduled', 'Hantaran rahsia yang belum terbit', '2026-11-16T00:00:00Z'),
];

// Replace the Data Cache wrapper so the corpus loader returns the fixture
// instead of querying the database.
vi.mock('@/lib/cache/cached-json', () => ({
  cachedJson: () => async () => corpus,
}));

const { searchArticles, getVisibleSearchCorpus } = await import('../article-search');

describe('scheduled (future-dated) published articles', () => {
  it('are left out of the corpus readers see', async () => {
    const ids = (await getVisibleSearchCorpus(NOW)).map((a) => a.id);
    expect(ids).toEqual(['live', 'undated']);
  });

  it('never appear in search results, while live ones still do', async () => {
    const res = await searchArticles('hantaran', { limit: 20, offset: 0 }, NOW);
    const ids = res.articles.map((a) => a.id);
    expect(ids).toContain('live');
    expect(ids).toContain('undated');
    expect(ids).not.toContain('scheduled');
    expect(res.total).toBe(2);
  });

  it('cannot be found even by their own title', async () => {
    const res = await searchArticles('rahsia belum terbit', { limit: 20, offset: 0 }, NOW);
    expect(res.articles.map((a) => a.id)).not.toContain('scheduled');
  });

  it('appear once their date has passed, with no cache refresh needed', async () => {
    const later = Date.parse('2026-11-16T00:00:01Z');
    const res = await searchArticles('hantaran', { limit: 20, offset: 0 }, later);
    expect(res.articles.map((a) => a.id)).toContain('scheduled');
  });
});
