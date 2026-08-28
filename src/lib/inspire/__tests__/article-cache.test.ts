import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  ARTICLE_PAGE_CACHE_KEY,
  ARTICLE_PAGE_CACHE_TAGS,
  ARTICLE_CREDITS_CACHE_KEY,
  ARTICLE_CREDITS_CACHE_TAGS,
  ARTICLE_MAX_DURATION_MS,
  ARTICLE_RENDER_BUDGET_MS,
  RENDER_RESERVE_MS,
  READ_FLOOR_MS,
  FLOORED_READS_AFTER_PAYLOAD,
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

// RISK-08. The first request ever made to a new article URL returned
// `502 FUNCTION_RESPONSE_STREAM_INCOMPLETE` — the status Vercel produces when
// `maxDuration` kills a function that is already streaming. The reader gets a
// truncated response, not a slow page and not an error page, and neither does
// any of this route's carefully-written fallbacks get to run.
//
// The route can only reach that state if it is allowed to spend its whole
// ceiling on database waiting, and it was: `startDeadlineBudget` floors every
// read, so the floors add on top of the shared budget. These tests pin the
// arithmetic that stops them adding up past `maxDuration`.
describe('the article render can never spend maxDuration on database waiting', () => {
  it('leaves the render its reserve even when every read takes its floor', () => {
    const worstCaseDbWait = ARTICLE_RENDER_BUDGET_MS + FLOORED_READS_AFTER_PAYLOAD * READ_FLOOR_MS;
    expect(worstCaseDbWait).toBe(ARTICLE_MAX_DURATION_MS - RENDER_RESERVE_MS);
    expect(worstCaseDbWait).toBeLessThan(ARTICLE_MAX_DURATION_MS);
  });

  it('counts one floored read for each deadline-guarded read after the payload', () => {
    // The pillar up-link, the cluster siblings and the related-articles
    // fallback. Adding a fourth without raising this count is how the worst
    // case creeps back over the ceiling — so the count is asserted against the
    // route file itself, not trusted.
    const route = readFileSync(
      join(process.cwd(), 'src/app/(public)/artikel/[category]/[slug]/page.tsx'),
      'utf8',
    );
    const budgetedReads = route.match(/budgetLeft\(\)/g) ?? [];
    // One for the payload read, which gets the full budget rather than a floor.
    expect(budgetedReads.length).toBe(FLOORED_READS_AFTER_PAYLOAD + 1);
  });

  it('agrees with the maxDuration the route actually declares', () => {
    // Next requires a route segment's `maxDuration` to be a literal it can read
    // statically, so `page.tsx` cannot import `ARTICLE_MAX_DURATION_MS`. Read
    // the file as TEXT — importing it would drag in the whole article renderer,
    // which is the same constraint that put these constants in this module.
    const route = readFileSync(
      join(process.cwd(), 'src/app/(public)/artikel/[category]/[slug]/page.tsx'),
      'utf8',
    );
    const declared = route.match(/^export const maxDuration = (\d+);$/m);
    expect(declared, 'page.tsx must declare maxDuration as a literal').not.toBeNull();
    expect(Number(declared![1]) * 1_000).toBe(ARTICLE_MAX_DURATION_MS);
  });
});
