import { describe, expect, it } from 'vitest';
import {
  categoryTreeIds,
  DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
  inspireHomepageConfigSchema,
  parseInspireHomepageConfig,
  resolveInspireHomepage,
  type InspireHomepageArticle,
  type InspireHomepageConfig,
} from '../homepage-curation';

const UUIDS = Array.from(
  { length: 20 },
  (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
);

function article(index: number): InspireHomepageArticle {
  return {
    id: UUIDS[index],
    title: `Article ${index + 1}`,
    slug: `article-${index + 1}`,
    coverImageUrl: `https://images.example/${index + 1}.jpg`,
    coverImageVariants: null,
    coverImageSmartCrops: null,
    publishedAt: new Date(2026, 0, 20 - index),
    categoryName: 'Ideas',
    categorySlug: 'ideas',
  };
}

function resolve(
  config: InspireHomepageConfig,
  overrides: Partial<Parameters<typeof resolveInspireHomepage>[0]> = {},
) {
  const globalLatest = Array.from({ length: 16 }, (_, index) => article(index));
  return resolveInspireHomepage({
    config,
    globalLatest,
    pinnedById: new Map(globalLatest.map((item) => [item.id, item])),
    featuredCategory: [],
    latestCategory: [],
    categoryExists: new Set(),
    ...overrides,
  });
}

describe('Inspire homepage curation', () => {
  it('preserves newest-first as the default 3 + 9 layout', () => {
    const result = resolve(DEFAULT_INSPIRE_HOMEPAGE_CONFIG);

    expect(result.featured.map((item) => item.article.id)).toEqual(UUIDS.slice(0, 3));
    expect(result.latest.map((item) => item.article.id)).toEqual(UUIDS.slice(3, 12));
    expect([...result.featured, ...result.latest].every((item) => item.source === 'latest')).toBe(
      true,
    );
    expect(result.warnings).toEqual([]);
  });

  it('places valid pins first, in their saved order, then fills automatically', () => {
    const config: InspireHomepageConfig = {
      ...DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      featured: {
        source: 'latest',
        categoryId: null,
        pinnedArticleIds: [UUIDS[8], UUIDS[6]],
      },
    };

    const result = resolve(config);

    expect(result.featured.map((item) => [item.article.id, item.source])).toEqual([
      [UUIDS[8], 'pinned'],
      [UUIDS[6], 'pinned'],
      [UUIDS[0], 'latest'],
    ]);
  });

  it('reserves Latest pins before Featured fills automatically', () => {
    const config: InspireHomepageConfig = {
      ...DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      latest: {
        source: 'latest',
        categoryId: null,
        pinnedArticleIds: [UUIDS[1], UUIDS[8]],
      },
    };

    const result = resolve(config);
    const ids = [...result.featured, ...result.latest].map((item) => item.article.id);

    expect(result.featured).toHaveLength(3);
    expect(result.latest).toHaveLength(9);
    expect(result.latest.slice(0, 2).map((item) => [item.article.id, item.source])).toEqual([
      [UUIDS[1], 'pinned'],
      [UUIDS[8], 'pinned'],
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.featured.map((item) => item.article.id)).not.toContain(UUIDS[1]);
    expect(result.featured.map((item) => item.article.id)).not.toContain(UUIDS[8]);
    expect(result.warnings).toEqual([]);
  });

  it('keeps Featured first when an invalid config repeats a pin across zones', () => {
    const config: InspireHomepageConfig = {
      ...DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      featured: {
        source: 'latest',
        categoryId: null,
        pinnedArticleIds: [UUIDS[5]],
      },
      latest: {
        source: 'latest',
        categoryId: null,
        pinnedArticleIds: [UUIDS[5]],
      },
    };

    const result = resolve(config);
    const ids = [...result.featured, ...result.latest].map((item) => item.article.id);

    expect(result.featured[0]).toMatchObject({
      article: { id: UUIDS[5] },
      source: 'pinned',
    });
    expect(result.latest.some((item) => item.article.id === UUIDS[5])).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.warnings).toContain(
      'Latest: a pinned article was already used above and was skipped.',
    );
  });

  it('uses a selected category, then labels newest-article backfills', () => {
    const categoryId = UUIDS[18];
    const config: InspireHomepageConfig = {
      ...DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      featured: { source: 'category', categoryId, pinnedArticleIds: [] },
    };

    const result = resolve(config, {
      featuredCategory: [article(7)],
      categoryExists: new Set([categoryId]),
    });

    expect(result.featured.map((item) => item.source)).toEqual([
      'category',
      'fallback',
      'fallback',
    ]);
    expect(result.warnings).toContain(
      'Featured: the category ran short, so 2 spaces used the newest articles.',
    );
  });

  it('ignores an invalid pin and backfills without leaving a hole', () => {
    const config: InspireHomepageConfig = {
      ...DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      featured: { source: 'latest', categoryId: null, pinnedArticleIds: [UUIDS[15]] },
    };
    const globalLatest = Array.from({ length: 12 }, (_, index) => article(index));

    const result = resolve(config, {
      globalLatest,
      pinnedById: new Map(),
    });

    expect(result.featured).toHaveLength(3);
    expect(result.featured.every((item) => item.source === 'latest')).toBe(true);
    expect(result.warnings).toContain(
      'Featured: a pinned article is no longer published with a cover and was replaced.',
    );
  });

  it('warns for a missing category and falls back to global newest articles', () => {
    const config: InspireHomepageConfig = {
      ...DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      latest: { source: 'category', categoryId: UUIDS[19], pinnedArticleIds: [] },
    };

    const result = resolve(config);

    expect(result.latest).toHaveLength(9);
    expect(result.latest.every((item) => item.source === 'fallback')).toBe(true);
    expect(result.warnings).toContain(
      'Latest: the selected category no longer exists; newest articles were used.',
    );
  });

  it('warns when the eligible global pool cannot fill every space', () => {
    const globalLatest = Array.from({ length: 10 }, (_, index) => article(index));
    const result = resolve(DEFAULT_INSPIRE_HOMEPAGE_CONFIG, {
      globalLatest,
      pinnedById: new Map(globalLatest.map((item) => [item.id, item])),
    });

    expect(result.featured).toHaveLength(3);
    expect(result.latest).toHaveLength(7);
    expect(result.warnings).toContain(
      'Latest: 2 spaces could not be filled because there are not enough published articles with covers.',
    );
  });

  it('includes all levels of descendants in category membership', () => {
    expect(
      categoryTreeIds(UUIDS[0], [
        { id: UUIDS[0], parentId: null },
        { id: UUIDS[1], parentId: UUIDS[0] },
        { id: UUIDS[2], parentId: UUIDS[1] },
        { id: UUIDS[3], parentId: null },
      ]),
    ).toEqual([UUIDS[0], UUIDS[1], UUIDS[2]]);
  });

  it('rejects missing category choices, over-capacity pins, and cross-zone duplicates', () => {
    const result = inspireHomepageConfigSchema.safeParse({
      version: 1,
      featured: {
        source: 'category',
        categoryId: null,
        pinnedArticleIds: UUIDS.slice(0, 4),
      },
      latest: { source: 'latest', categoryId: null, pinnedArticleIds: [UUIDS[0]] },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          'Choose a category for every category-based section.',
          'Too big: expected array to have <=3 items',
          'The same article cannot be pinned in Featured and Latest.',
        ]),
      );
    }
  });

  it('treats "nothing saved" as the newest-first default, not as an invalid config', () => {
    // Production before anyone curates: no admin_settings row at all.
    expect(parseInspireHomepageConfig(null)).toEqual({
      config: DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      invalid: false,
    });
    expect(DEFAULT_INSPIRE_HOMEPAGE_CONFIG.featured.source).toBe('latest');
    expect(DEFAULT_INSPIRE_HOMEPAGE_CONFIG.latest.source).toBe('latest');
  });

  it('falls back to the default config when a stored version is invalid', () => {
    expect(parseInspireHomepageConfig({ version: 99 })).toEqual({
      config: DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      invalid: true,
    });
  });
});
