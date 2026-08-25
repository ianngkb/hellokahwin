import { describe, it, expect } from 'vitest';
import {
  ARTICLE_PAGE_CACHE_KEY,
  ARTICLE_PAGE_CACHE_TAGS,
  ARTICLE_CREDITS_CACHE_KEY,
  ARTICLE_CREDITS_CACHE_TAGS,
} from '../article-cache';

// These tests exist because of Sentry TWN-NEW-47: 2,716 `deadline_exceeded`
// errors on /inspire/[category]/[slug] in 48 hours, spread across 89 distinct
// slugs, while the production DB sat at 1 active connection. The cause was not
// a slow query — it was ~2,286 article cache entries being thrown away every
// time any vendor touched any listing, then re-rendered cold against a 5-lane
// DB pool.
//
// The regression is a one-word edit (putting 'listings' back on the article
// payload tags), so it gets a test rather than only a comment.

describe('article payload cache identity', () => {
  it('does NOT carry the listings tag', () => {
    // The whole fix. `revalidateTag('listings', 'max')` fires from ~30 admin and
    // vendor write paths — every listing edit, every vendor photo upload. While
    // this tag was on the article payload, each of those evicted all ~2,286
    // published articles at once.
    expect(ARTICLE_PAGE_CACHE_TAGS).not.toContain('listings');
  });

  it('carries only the tags that describe article content itself', () => {
    // The route composes `INSPIRE_AUTHORS_TAG` on top of this at the call site
    // (that constant's module pulls in the DB client, and this test must stay
    // DB-free). What this pins is that `listings` is not here.
    expect([...ARTICLE_PAGE_CACHE_TAGS]).toEqual([
      'articles',
      'inspire-categories',
      'inspire-tags',
    ]);
  });

  it('uses a v8 key so no cached entry can serve an uncredited cover', () => {
    // v8 added `coverCredit`/`coverCreditUrl` to the payload. With
    // `revalidate: false` a surviving v7 entry has neither field, and would
    // render the cover with no credit line — the exact defect the change was
    // made to end. The key bump is what makes the fix reach already-cached
    // articles instead of only new ones.
    //
    // v7 itself resolved two conflicting v6 shapes that landed in one batch
    // (author profile columns added, `credits` removed).
    expect(ARTICLE_PAGE_CACHE_KEY).toBe('inspire-article-page-v8');
  });
});

describe('vendor-credit cache identity', () => {
  it('DOES carry the listings tag', () => {
    // Load-bearing for correctness, not performance: the sidebar venue card
    // caches a listing's status/isHidden/isDemo visibility gate. Without this
    // tag a hidden or unpublished venue would stay advertised and linked on
    // every article crediting it, indefinitely.
    expect(ARTICLE_CREDITS_CACHE_TAGS).toContain('listings');
  });

  it('is a separate cache entry from the article payload', () => {
    expect(ARTICLE_CREDITS_CACHE_KEY).not.toBe(ARTICLE_PAGE_CACHE_KEY);
  });

  it('is still busted by article writes', () => {
    expect(ARTICLE_CREDITS_CACHE_TAGS).toContain('articles');
  });
});
