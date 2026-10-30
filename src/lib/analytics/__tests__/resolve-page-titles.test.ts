// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { articles, inspireCategories, inspireTags } from '@/lib/db/schema/articles';
import { profiles } from '@/lib/db/schema/profiles';

// Rows each table "returns", keyed by the table object the query selects from.
const tableRows = vi.hoisted(() => new Map<unknown, unknown[] | Error>());
const fromCalls = vi.hoisted(() => [] as unknown[]);

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        fromCalls.push(table);
        const rows = tableRows.get(table);
        return {
          where: () => (rows instanceof Error ? Promise.reject(rows) : Promise.resolve(rows ?? [])),
        };
      },
    }),
  },
}));

const { resolvePageTitles, resolvePageTitle, classifyPathname } =
  await import('../resolve-page-titles');

beforeEach(() => {
  fromCalls.length = 0;
  tableRows.clear();
  tableRows.set(articles, [{ slug: 'baju-nikah', title: 'Baju Nikah Pilihan 2026' }]);
  tableRows.set(inspireCategories, [{ slug: 'pakaian', title: 'Pakaian' }]);
  tableRows.set(inspireTags, [{ slug: 'hantaran', title: 'Hantaran' }]);
  tableRows.set(profiles, [{ slug: 'aisyah', firstName: 'Aisyah', lastName: 'Rahman' }]);
});

describe('resolvePageTitles (D10)', () => {
  it('resolves an article path to the article title', async () => {
    const titles = await resolvePageTitles(['/artikel/pakaian/baju-nikah']);
    expect(titles.get('/artikel/pakaian/baju-nikah')).toBe('Baju Nikah Pilihan 2026');
  });

  it('resolves a tag path to the tag name', async () => {
    expect(await resolvePageTitle('/artikel/tag/hantaran')).toBe('Hantaran');
  });

  it('resolves static routes in Malay without touching the DB', async () => {
    const titles = await resolvePageTitles(['/', '/artikel', '/brand']);
    expect(titles.get('/')).toBe('Laman Utama');
    expect(titles.get('/artikel')).toBe('Semua Artikel');
    expect(titles.get('/brand')).toBe('Brand');
    expect(fromCalls).toHaveLength(0);
  });

  it('resolves category and author paths', async () => {
    const titles = await resolvePageTitles(['/artikel/pakaian', '/artikel/author/aisyah']);
    expect(titles.get('/artikel/pakaian')).toBe('Pakaian');
    expect(titles.get('/artikel/author/aisyah')).toBe('Aisyah Rahman');
  });

  it('leaves unknown paths absent', async () => {
    const titles = await resolvePageTitles(['/unknown', '/artikel/pakaian/no-such-article']);
    expect(titles.has('/unknown')).toBe(false);
    expect(titles.has('/artikel/pakaian/no-such-article')).toBe(false);
  });

  it('keeps the titles that resolved when one lookup fails', async () => {
    tableRows.set(inspireTags, new Error('canceling statement due to statement timeout'));
    const titles = await resolvePageTitles(['/artikel/pakaian/baju-nikah', '/artikel/tag/x']);
    expect(titles.get('/artikel/pakaian/baju-nikah')).toBe('Baju Nikah Pilihan 2026');
  });
});

describe('classifyPathname', () => {
  it('does not mistake the tag/author index segments for categories', () => {
    expect(classifyPathname('/artikel/tag')).toBeNull();
    expect(classifyPathname('/artikel/author')).toBeNull();
  });

  it('ignores trailing slashes and query strings', () => {
    expect(classifyPathname('/artikel/pakaian/baju-nikah/?utm_source=x')).toEqual({
      kind: 'article',
      slug: 'baju-nikah',
    });
  });

  it('returns null outside /artikel', () => {
    expect(classifyPathname('/some-legacy-slug')).toBeNull();
  });
});
