import { describe, it, expect } from 'vitest';
import { buildArticlePath, buildArticleSlugRedirect } from '../article-slug-change';

describe('buildArticlePath', () => {
  it('builds the canonical /artikel/{categorySlug}/{slug} shape', () => {
    expect(buildArticlePath('real-weddings', 'garden-wedding-in-kl')).toBe(
      '/artikel/real-weddings/garden-wedding-in-kl',
    );
  });

  it('never emits a trailing slash', () => {
    expect(buildArticlePath('ideas-and-advice', 'checklist-tips')).not.toMatch(/\/$/);
  });
});

describe('buildArticleSlugRedirect', () => {
  it('returns null when old and new canonical paths are equal (nothing to redirect)', () => {
    expect(
      buildArticleSlugRedirect({
        oldCategorySlug: 'real-weddings',
        oldSlug: 'same-slug',
        newCategorySlug: 'real-weddings',
        newSlug: 'same-slug',
      }),
    ).toBeNull();
  });

  it('builds a redirect for a slug-only change within the same category', () => {
    expect(
      buildArticleSlugRedirect({
        oldCategorySlug: 'ideas-and-advice',
        oldSlug: 'old-slug',
        newCategorySlug: 'ideas-and-advice',
        newSlug: 'new-slug',
      }),
    ).toEqual({
      sourcePath: '/artikel/ideas-and-advice/old-slug',
      destinationPath: '/artikel/ideas-and-advice/new-slug',
    });
  });

  it('uses the OLD category slug in the source when slug + category change in one save', () => {
    expect(
      buildArticleSlugRedirect({
        oldCategorySlug: 'love-stories',
        oldSlug: 'old-slug',
        newCategorySlug: 'real-weddings',
        newSlug: 'new-slug',
      }),
    ).toEqual({
      sourcePath: '/artikel/love-stories/old-slug',
      destinationPath: '/artikel/real-weddings/new-slug',
    });
  });

  it('still redirects a category-only move (slug unchanged, paths differ)', () => {
    expect(
      buildArticleSlugRedirect({
        oldCategorySlug: 'love-stories',
        oldSlug: 'same-slug',
        newCategorySlug: 'real-weddings',
        newSlug: 'same-slug',
      }),
    ).toEqual({
      sourcePath: '/artikel/love-stories/same-slug',
      destinationPath: '/artikel/real-weddings/same-slug',
    });
  });

  it('produces paths without trailing slashes', () => {
    const redirect = buildArticleSlugRedirect({
      oldCategorySlug: 'fashion-and-beauty',
      oldSlug: 'a',
      newCategorySlug: 'fashion-and-beauty',
      newSlug: 'b',
    });
    expect(redirect?.sourcePath).not.toMatch(/\/$/);
    expect(redirect?.destinationPath).not.toMatch(/\/$/);
  });
});
