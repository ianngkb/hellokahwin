import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import ReactDOM from 'react-dom';
import { eq, ne, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { withDeadline, startDeadlineBudget } from '@/lib/api/timeout';
import { lookupRedirect } from '@/lib/redirects/lookup';
import { tagEdgeResponse } from '@/lib/cache/edge-tag';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import {
  articles,
  inspireCategories,
  articleCategories,
  articleTags,
  inspireTags,
} from '@/lib/db/schema/articles';
import { profiles } from '@/lib/db/schema/profiles';
import { media } from '@/lib/db/schema/media';
import {
  ArticleRenderer,
  extractImageUrlsWithVariants,
  extractTextContent,
} from '@/components/inspire/article-renderer';
import { extractHeadings } from '@/lib/inspire/heading-anchors';
import { extractSources } from '@/lib/inspire/article-sources';
import { ArticleToc, hasArticleToc } from '@/components/inspire/article-toc';
import { buildItemListJsonLd } from '@/lib/inspire/listicle-schema';
import { buildFaqPageJsonLd } from '@/lib/inspire/faq-schema';
import type { GalleryImage } from '@/components/inspire/article-renderer';
import { ArticleSidebar } from '@/components/inspire/article-sidebar';
import { ArticleRail, RAIL_TOC_HEADING_ID } from '@/design-system/components/article-rail';
import { RekodPanel } from '@/design-system/components/content';
import {
  ARTICLE_PAGE_CACHE_KEY,
  ARTICLE_META_CACHE_KEY,
  ARTICLE_PAGE_CACHE_TAGS,
  ARTICLE_RENDER_BUDGET_MS,
  READ_FLOOR_MS,
} from '@/lib/inspire/article-cache';

import {
  resolveDynamicBlocks,
  mergeDynamicBlocks,
  collectEmbeddedBlockIds,
} from '@/lib/inspire/dynamic-blocks';
import { MobileArticleBar } from '@/components/inspire/mobile-article-bar';
import { PhotoGallery } from '@/components/inspire/photo-gallery';
import {
  resolveCoverSource,
  resolveRowThumbSource,
  type CoverVariants,
} from '@/lib/storage/responsive-cover';
import { coverPlateAspect, coverPlateMaxWidth } from '@/lib/storage/cover-plate';
import '@/design-system/tokens.css';
import '@/design-system/components.css';
import { Breadcrumbs, BreadcrumbJsonLd } from '@/components/common/breadcrumbs';
import { PillarUpLinkBlock } from '@/components/inspire/pillar-up-link';
import { getPillarUpLink, getClusterSiblings } from '@/lib/inspire/pillar-queries';
import { ImageCredit } from '@/components/inspire/image-credit';
import { buildArticleDescription } from '@/lib/seo/meta';
import { resolveArticleMetadata, type ArticleMetadataSource } from '@/lib/seo/article-metadata';
import { AuthorBox } from '@/components/inspire/author-box';
import { WhatsAppShare } from '@/components/inspire/whatsapp-share';
import { INSPIRE_AUTHORS_TAG } from '@/lib/authors/queries';
import { authorArchivePath, authorDisplayName, isLinkableAuthor } from '@/lib/authors/gate';

// Cache forever; invalidate via `revalidateTag('articles')` from admin write
// paths. Time-based ISR (`revalidate = 1800`) was the cause of bot-crawl
// stampedes — when N articles all expired in the same window and a crawler
// hit them simultaneously, N regens queued on the DB pool. With event-driven
// invalidation, the cache is only rebuilt when an editor actually changes
// content. Bot crawls become free CDN hits.
export const revalidate = false;

// Hard 5s ceiling on render time. Bot crawls on cold-cache windows used to
// run this function to the 300s Vercel limit; with maxDuration=5 a stuck
// render dies fast and the instance recovers for the next 50 requests.
// Combined with per-query withDeadline(3_000) below, the worst-case user
// wait is ~5s with a real error page rather than a 5-minute hang.
export const maxDuration = 5;

interface ArticlePageProps {
  params: Promise<{ category: string; slug: string }>;
}

// Composes an article's meta description from the cleaned source fields.
// `buildArticleDescription` (in @/lib/seo/meta) decodes HTML entities and
// truncates; we feed it the extracted body text as the final fallback.
function articleMetaDescription(article: {
  metaDescription: string | null;
  excerpt: string | null;
  content: unknown;
}): string | null {
  return buildArticleDescription({
    metaDescription: article.metaDescription,
    excerpt: article.excerpt,
    bodyText: extractTextContent(article.content),
  });
}

// NESTING IS LOAD-BEARING: React `cache()` OUTSIDE, `unstable_cache` INSIDE.
// Same `[[unstable-cache-no-inflight-dedupe]]` reason as `findAdminRowByEmails`
// in src/lib/auth/admin.ts and `getVendorCreditTaxonomy` in
// src/lib/inspire/vendor-credit-types.ts.
//
// `generateMetadata` and `InspireArticlePage` both read this, and in Next 16
// they run CONCURRENTLY — not sequentially (see the corrected note in
// `generateMetadata` below). Next 16's `unstable_cache` has no in-flight
// dedupe, so on a COLD entry both callers reached the callback and every cold
// article render issued its whole DB fan-out TWICE. Against a 5-wide pool
// (src/lib/db/drizzle.ts) that doubled the demand behind Sentry TWN-NEW-47 —
// 2,716 `deadline_exceeded:inspire-article:*` errors in 48h across 89 distinct
// slugs, while the prod DB sat idle at 1 active connection. `cache()` on the
// outside collapses the two callers to one execution per request before
// `unstable_cache` is reached.
const getArticlePageDataCached = unstable_cache(
  async (slug: string) => {
    const [article] = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
        coverImageUrl: articles.coverImageUrl,
        coverImageSmartCrops: articles.coverImageSmartCrops,
        coverImageVariants: articles.coverImageVariants,
        coverImageLqip: articles.coverImageLqip,
        excerpt: articles.excerpt,
        metaTitle: articles.metaTitle,
        metaDescription: articles.metaDescription,
        status: articles.status,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
        authorId: articles.authorId,
        primaryCategoryId: articles.primaryCategoryId,
        categoryName: inspireCategories.name,
        categorySlug: inspireCategories.slug,
        authorFirstName: profiles.firstName,
        authorLastName: profiles.lastName,
        // Everything the byline, the author box and the JSON-LD `Person` need.
        // All of it rides the `profiles` join that was already here — one round
        // trip, same as before. `role`/`isPublicAuthor`/`authorSlug` are the
        // three inputs to `isLinkableAuthor`, and NOT one of them is checked
        // independently at any render site below.
        authorRole: profiles.role,
        authorIsPublic: profiles.isPublicAuthor,
        authorSlug: profiles.authorSlug,
        authorAvatarUrl: profiles.avatarUrl,
        authorTitle: profiles.authorTitle,
        authorBio: profiles.authorBio,
        authorWebsiteUrl: profiles.authorWebsiteUrl,
        authorInstagramUrl: profiles.authorInstagramUrl,
        authorLinkedinUrl: profiles.authorLinkedinUrl,
        // ── The cover image's credit, on the article's own row ──────────────
        //
        // "ALWAYS credit the original image source so it can be traced back"
        // is an owner-level rule (board 23 Aug 2026), and until 25 Aug 2026
        // this was the one piece of the page that could go missing without
        // anybody being told. It was a SECOND read — `getCoverCredit`, third
        // in a shared 4s budget, wrapped in `withDeadline` and a bare
        // `catch {}` that rendered the cover with no credit line and logged
        // nothing.
        //
        // That is not a theoretical hole. Audited against production on
        // 25 Ogos 2026: eight of the twenty-four live non-legacy articles were
        // serving a licensed photograph with no visible credit, every one of
        // them with a correct `credit`, `license_class` and `licensor_name` in
        // the database and an exact `media.url` match. The ingest gate had done
        // its job perfectly; the credit was being dropped at render and then
        // FROZEN — `revalidate = false` here plus `stale-while-revalidate=
        // 31535400` at the edge means one unlucky render publishes an
        // uncredited photograph for up to a year.
        //
        // Riding the primary join removes the failure mode rather than
        // shortening it. There is no second round trip to time out, no budget
        // to run down and nothing left to swallow: if this row answers, the
        // credit is in it, and if it does not answer the page 404s or errors
        // instead of quietly publishing an uncredited image. The join is an
        // exact match on the indexed `media.url` (`idx_media_url`) against a
        // column that is 1:1 with it in practice — verified 25 Ogos 2026, zero
        // duplicate `media.url` values on production and exactly one media row
        // per published cover.
        //
        // DO NOT move this back out into its own deadline-guarded read. The
        // credit is not a nice-to-have that may degrade; it is the courtesy
        // that earns the next licence and the record that makes the owner
        // findable years later.
        coverCredit: media.credit,
        coverCreditUrl: media.creditUrl,
      })
      .from(articles)
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .leftJoin(media, eq(media.url, articles.coverImageUrl))
      .innerJoin(profiles, eq(articles.authorId, profiles.id))
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
      .limit(1);

    if (!article) return null;

    // Secondary fetches use Promise.allSettled so a single slow query doesn't
    // crash the whole page — the affected section (tags, credits sidebar, etc.)
    // just hides. Primary entity (the article itself, fetched above) keeps
    // notFound() semantics on null.
    //
    // THREE IS THE CEILING HERE (it was four until the credits read moved out —
    // see `getArticleCredits` below). The postgres-js pool is 5 wide, and three
    // prod outages have come from concurrent fan-outs starving it (which is why
    // the admin `vendor-credits/page.tsx` and `vendor-credits/types/page.tsx`
    // reads are deliberately kept SEQUENTIAL). Only the first two entries are
    // DB queries now: `getVendorCreditTaxonomy()` is `cache()`-wrapped per
    // request and `unstable_cache`-wrapped across them, so on the overwhelming
    // majority of renders it resolves from cache and takes no connection at all
    // — the steady-state width is two. Do not add a fourth branch: a five-wide
    // fan-out can consume the entire pool on a single render, leaving nothing
    // for a concurrent request.
    const [tagsR, secondaryCategoriesR] = await Promise.allSettled([
      db
        .select({
          id: inspireTags.id,
          name: inspireTags.name,
          slug: inspireTags.slug,
        })
        .from(articleTags)
        .innerJoin(inspireTags, eq(articleTags.tagId, inspireTags.id))
        // Hidden tags are admin-only — never surface them in the sidebar.
        .where(and(eq(articleTags.articleId, article.id), eq(inspireTags.isHidden, false)))
        .orderBy(inspireTags.name),
      db
        .select({
          id: inspireCategories.id,
          name: inspireCategories.name,
          slug: inspireCategories.slug,
        })
        .from(articleCategories)
        .innerJoin(inspireCategories, eq(articleCategories.categoryId, inspireCategories.id))
        .where(
          and(
            eq(articleCategories.articleId, article.id),
            article.primaryCategoryId
              ? ne(articleCategories.categoryId, article.primaryCategoryId)
              : undefined,
          ),
        )
        .orderBy(inspireCategories.name),
    ]);

    if (tagsR.status === 'rejected')
      console.error(`[inspire-article:${slug}] tags fetch failed:`, tagsR.reason);
    if (secondaryCategoriesR.status === 'rejected')
      console.error(
        `[inspire-article:${slug}] secondary categories fetch failed:`,
        secondaryCategoriesR.reason,
      );

    // Cache-poisoning guard: with `revalidate: false` (cache forever) the
    // returned object is the cache key for this slug indefinitely. If a
    // secondary fetch rejected on a transient DB blip, returning empty
    // arrays here would cache a permanently-degraded version of the page.
    // Instead, throw so unstable_cache stores nothing — the next request
    // re-attempts the full fetch and (assuming DB recovers) caches the
    // proper result. The page-level withDeadline + Promise.allSettled
    // upstream still keeps the user response bounded.
    //
    // `taxonomyR` is deliberately NOT in this list. It decides the ORDER of
    // sidebar headings and nothing else, and its failure is recorded as `null`
    // and resolved to the frozen seed list at RENDER time (in
    // `InspireArticlePage`) rather than cached — so it cannot poison the entry
    // the way the others would. Throwing
    // the whole article's cache entry away — and re-running the fan-out on the
    // next request — because a heading order could not be read would trade a
    // cosmetic degradation for a real outage.
    //
    // The credits read is no longer in this list either: it lives in its own
    // cache entry (`getArticleCredits`) whose failure degrades the sidebar
    // alone and can no longer poison the whole article payload.
    const anyRejected = tagsR.status === 'rejected' || secondaryCategoriesR.status === 'rejected';
    if (anyRejected) {
      throw new Error(`inspire-article cached fetch rejected for slug=${slug}`);
    }

    const tags = tagsR.status === 'fulfilled' ? tagsR.value : [];
    const secondaryCategories =
      secondaryCategoriesR.status === 'fulfilled' ? secondaryCategoriesR.value : [];

    // Dynamic blocks: resolve + merge INSIDE the cached scope so block edits
    // propagate via revalidateTag('articles', ...). Always merge — it also
    // strips any manual `dynamicBlockEmbed` nodes (which generateHTML can't
    // render). A transient resolve failure deliberately THROWS — same
    // cache-poisoning rationale as the guard above: with revalidate:false,
    // swallowing it would cache a permanently block-less article. The next
    // request retries the full fill. Non-transient data states (missing/
    // draft/inactive/invalid blocks) degrade silently inside
    // mergeDynamicBlocks itself — no block, never a broken page.
    const blocks = await resolveDynamicBlocks({
      articleId: article.id,
      categoryIds: [
        ...(article.primaryCategoryId ? [article.primaryCategoryId] : []),
        ...secondaryCategories.map((c) => c.id),
      ],
      tagIds: tags.map((t) => t.id),
      embeddedBlockIds: collectEmbeddedBlockIds(article.content),
    });
    const renderContent = mergeDynamicBlocks(article.content, blocks);

    return {
      article,
      renderContent,
      tags,
      secondaryCategories,
    };
  },
  // v7: key bumped 2026-08-15 at batch-integration time. TWO separate v6 bumps
  // (author profiles, and the credits split below) landed in the same batch and
  // described DIFFERENT payload shapes under one name — one adds author columns,
  // the other removes `credits`. Reusing v6 would let an entry written under
  // either shape be served against the other. v7 is the merged shape: author
  // columns present, `credits` absent.
  // v6a: 2026-08-14 — the payload gained the author's public-profile columns
  // (slug/avatar/title/bio/socials) that drive the linked byline and the
  // end-of-article author box. With `revalidate: false` every already-cached
  // article would otherwise keep serving an entry that lacks them, and would
  // print an unlinked byline forever no matter who was opted in.
  // v6b: 2026-08-15 — `credits` LEFT this payload for its own cache entry
  // (`getArticleCredits`), and the `listings` tag left with it.
  // v5: key bumped 2026-08-12 — the payload gained `creditCategoryOrder`, the
  // admin-managed order of the sidebar's credit-category headings. With
  // `revalidate: false` every already-cached article would otherwise keep
  // serving an entry that lacks the field, fall back to the frozen seed order,
  // and never reflect an admin reorder.
  // v4: key bumped 2026-08-08 — the credits payload gained the joined
  // `listings` columns (name/city/state/status/isHidden/isDemo/images) that
  // drive the sidebar venue card. With `revalidate: false` every already-cached
  // article would otherwise serve its old, column-less credit list forever and
  // the card would never appear on it.
  // v3: key bumped 2026-07-29 — the payload gained `renderContent` (dynamic
  // blocks); old cache-forever entries lack it and must be orphaned.
  // v2: key bumped 2026-07-25 to orphan stale cache-forever entries (a
  // draft-window 404 for an article republished via direct SQL stays cached
  // until revalidateTag fires; bumping the key resets the namespace once).
  [ARTICLE_PAGE_CACHE_KEY],
  // `listings` USED TO BE IN THIS LIST AND MUST NOT COME BACK — the reason is
  // documented on `ARTICLE_PAGE_CACHE_TAGS`, which a unit test pins so the tag
  // cannot quietly return. If something on this page ever needs listing data
  // again, hang it off `getArticleCredits` (or a sibling entry with its own
  // narrow tag) rather than widening this list back out to a firehose tag.
  //
  // `inspire-authors` DOES belong, and is composed here rather than baked into
  // `ARTICLE_PAGE_CACHE_TAGS`: this entry caches author rows, so an author's
  // bio, photo or de-listing must evict every article they wrote, and the
  // authors admin fires that tag. It is added at the call site because
  // `@/lib/authors/queries` pulls in the DB client, and `article-cache.ts` is
  // imported by a unit test that must stay DB-free.
  { tags: [...ARTICLE_PAGE_CACHE_TAGS, INSPIRE_AUTHORS_TAG], revalidate: false },
);

// Same `[[unstable-cache-no-inflight-dedupe]]` nesting as `getArticlePageData`.
const getArticlePageData = cache(getArticlePageDataCached);

// Related articles in the same primary category, most recent first. Renders a
// crawlable article→article link block at the foot of every article — the main
// mechanism (alongside the sitemap) for distributing crawl depth across the
// ~2,250 articles, the vast majority of which previously had zero inbound
// internal links. Non-critical: callers deadline-guard and default to [].
const getRelatedArticles = unstable_cache(
  async (categoryId: string, excludeArticleId: string) => {
    return db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        coverImageUrl: articles.coverImageUrl,
        coverImageVariants: articles.coverImageVariants,
        coverImageSmartCrops: articles.coverImageSmartCrops,
        coverImageLqip: articles.coverImageLqip,
        publishedAt: articles.publishedAt,
        categorySlug: inspireCategories.slug,
      })
      .from(articles)
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .where(
        and(
          eq(articles.status, 'published'),
          eq(articles.primaryCategoryId, categoryId),
          ne(articles.id, excludeArticleId),
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(6);
  },
  ['inspire-related-articles'],
  { tags: ['articles'], revalidate: 1800 },
);

// Build-time pre-render stays DEFERRED. Returning [] means no inspire article
// pages are pre-rendered at build — every article renders on-demand on first
// request, then is cached per the page-level `revalidate = false` + tag-based
// invalidation.
//
// ATTEMPTED AGAIN 2026-08-15 AND REVERTED. The original note here recorded that
// a 500-entry `generateStaticParams` blew the build-phase Drizzle pool
// (EMAXCONNSESSION at pool_size: 15) and suggested "(c) use a much smaller limit
// like 50". That suggestion was tried — 100 entries, ranked by 30-day non-bot
// pageviews, against a build-phase pool already reduced to 2 connections per
// worker — and it STILL fails, in a worse way than a connection error:
//
//   Generating static pages using 31 workers (174/349)
//   Error occurred prerendering page "/artikel/real-weddings/…"
//   Error [DeadlineExceededError]: … timeoutMs: 120000
//
// The article render is heavy (a multi-query payload plus a large TipTap
// document), and 31 workers rendering it concurrently do not merely queue on
// the pool — individual renders fail to complete inside TWO MINUTES. The build
// then exits non-zero, and because `.github/workflows/deploy-production.yml` is
// the deploy gate, a flaky build blocks every production deploy in the batch.
//
// That trade is not worth it. The caching fixes above are the actual remedy for
// TWN-NEW-47 and carry the whole corpus; pre-rendering would only have covered
// the top ~61% of human pageviews while making deploys fragile.
//
// A future attempt needs to fix the CONCURRENCY, not the count — e.g. a
// build-phase semaphore around the page's DB reads, or `experimental.workerThreads`
// / `cpus` turned down for the export phase — and must be proven by a green
// `doppler run --project twn-new --config dev -- pnpm build` before landing.
// Raising the limit alone will not work.
export async function generateStaticParams(): Promise<Array<{ category: string; slug: string }>> {
  return [];
}

// ── THE CHEAP TITLE SOURCE (SEO-07 tier 2) ────────────────────────────────
//
// The metadata columns and nothing else: no `content` (the large TipTap JSONB
// that makes the full payload expensive to ship and to parse), no tags query,
// no secondary-categories query, no `resolveDynamicBlocks`, no `media` join.
// One indexed lookup on `articles.slug` plus the two joins the byline and the
// canonical URL cannot do without.
//
// IT DOES NOT RUN ON THE HAPPY PATH. `resolveArticleMetadataSource` only
// reaches for it after the full payload has already missed its deadline, so
// the steady-state query count against the 5-wide pool
// (`src/lib/db/drizzle.ts`) is unchanged — this does not widen the fan-out the
// rest of this file spends so much effort keeping narrow.
//
// `revalidate: false` with the same tags as the page payload: once an article
// has filled this entry it answers from cache, taking no connection at all, so
// the deadline path gets cheaper the more it is used. An editor's save evicts
// it through `articles` exactly like everything else.
const getArticleMetadataFallback = unstable_cache(
  async (slug: string): Promise<ArticleMetadataSource | null> => {
    const [row] = await db
      .select({
        title: articles.title,
        slug: articles.slug,
        metaTitle: articles.metaTitle,
        metaDescription: articles.metaDescription,
        excerpt: articles.excerpt,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
        coverImageUrl: articles.coverImageUrl,
        coverImageSmartCrops: articles.coverImageSmartCrops,
        categoryName: inspireCategories.name,
        categorySlug: inspireCategories.slug,
        authorFirstName: profiles.firstName,
        authorLastName: profiles.lastName,
      })
      .from(articles)
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .leftJoin(profiles, eq(articles.authorId, profiles.id))
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
      .limit(1);
    return row ?? null;
  },
  [ARTICLE_META_CACHE_KEY],
  { tags: [...ARTICLE_PAGE_CACHE_TAGS, INSPIRE_AUTHORS_TAG], revalidate: false },
);

// `profiles` is INNER-joined in the page payload and LEFT-joined here on
// purpose. The page needs an author to render a byline and an author box; the
// `<head>` does not — `buildArticleMetadata` falls back to "HelloKahwin" for
// the author name. An orphaned `author_id` must not be able to turn the last
// line of defence into a second way to lose the title.

/**
 * How long the metadata path may spend on each tier, in milliseconds.
 *
 * Environment-tunable for two reasons, and neither is a test hook that leaked.
 * The first is operational: 1,500ms was chosen against a 5-wide pool and a
 * given render cost, and both move — a knob is cheaper than a deploy when the
 * next pool change reveals it was the wrong number. The second is evidential:
 * the whole point of SEO-07 is a defect that only appears when the deadline
 * fires, and a claim that the fallback works is worth nothing if a reader
 * cannot force the deadline to fire for themselves. Setting
 * `INSPIRE_META_DEADLINE_MS=1` reproduces the timeout deterministically on any
 * deployment, which is the condition under which the evidence in
 * `docs/work-done/2026-08-28-seo-07-title-halflife.md` was gathered.
 *
 * Read at module scope, NOT per request: `process.env` is a plain object on the
 * server and reading it does not opt the route out of static rendering the way
 * `headers()` or `cookies()` would. Nothing here can make this route dynamic.
 */
const META_DEADLINE_MS = Number(process.env.INSPIRE_META_DEADLINE_MS ?? 1_500);
const META_FALLBACK_DEADLINE_MS = Number(process.env.INSPIRE_META_FALLBACK_DEADLINE_MS ?? 1_200);

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';

  // Deadline-protect the metadata path so a stalled DB doesn't burn the whole
  // 5s budget on metadata alone — the page render below still gets its own
  // deadline. NOTE: this does NOT run sequentially before the page render — an
  // earlier version of this comment claimed it did, and that claim is what hid
  // Sentry TWN-NEW-47 for so long. In Next 16 `generateMetadata` and the page
  // component are kicked off CONCURRENTLY, so both reach `getArticlePageData`
  // at the same moment. `unstable_cache` has no in-flight dedupe, which meant
  // every cold article render issued its DB fan-out twice; the React `cache()`
  // wrapper on `getArticlePageData` is what collapses them.
  //
  // ── WHAT USED TO BE HERE, AND WHY IT WAS THE WORST LINE ON THE SITE ──────
  //
  //     catch { return {}; }
  //
  // `{}` is not "no metadata". Next merges by walking the returned object's own
  // keys, so an empty one overrides nothing and the ROOT LAYOUT'S
  // `title.default` survives onto the article — the homepage title, on a
  // wedding guide, in the SERP. And because the resolved title is rendered
  // inside the same RSC tree as the page, it lands in the SAME cache entry: one
  // unlucky render published it to every later reader and to Googlebot. SEO-05
  // shipped five correct database rows in Sprint 02 and a verified-correct
  // title was serving the site default again FOURTEEN MINUTES LATER, because a
  // background revalidation lost this race and re-froze the shell. No title
  // decision downstream of that is measurable.
  //
  // Measured sequentially against production on 28 Ogos 2026
  // (`pnpm audit:titles`): 7 of 75 cold article renders — 9.3%, at a
  // concurrency of ONE — lost the 1.5s race and served the site default. This
  // deadline does not fire only when the database has stalled. It fires on an
  // ordinary slow render, roughly one cold render in eleven.
  //
  // The tier chain and the reasoning for each tier live in
  // `@/lib/seo/article-metadata`. The rule it enforces: this function never
  // returns a metadata object without a title in it.
  const { metadata } = await resolveArticleMetadata({
    slug,
    category,
    baseUrl,
    full: async () => {
      const pageData = await getArticlePageData(slug);
      if (!pageData) return null;
      const { article, tags } = pageData;
      return {
        ...article,
        bodyText: extractTextContent(article.content),
        tagNames: tags.map((t) => t.name),
      };
    },
    fallback: () => getArticleMetadataFallback(slug),
    fullMs: META_DEADLINE_MS,
    fallbackMs: META_FALLBACK_DEADLINE_MS,
    // Loud on purpose. The old `catch {}` swallowed this entirely, which is why
    // a defect reproducing on ~9% of cold renders went a whole sprint without a
    // single log line to name it. `[inspire-article-meta:*]` is the string to
    // grep in Vercel logs to find out how often the deadline path is used, and
    // a `tier=slug` line means the database missed TWICE and that article's
    // `<head>` is running on its slug alone.
    onDegrade: (tier, reason) => {
      console.warn(
        `[inspire-article-meta:${slug}] degraded to tier=${tier} ` +
          `(deadlines ${META_DEADLINE_MS}ms/${META_FALLBACK_DEADLINE_MS}ms):`,
        reason instanceof Error ? reason.message : reason,
      );
    },
  });
  return metadata;
}

export default async function InspireArticlePage({ params }: ArticlePageProps) {
  const { category: categorySlug, slug } = await params;

  // Make this page's CDN entry deletable by name — see the pillar page and
  // `@/lib/cache/edge-tag`. A brand-new slug has no edge entry to purge, so
  // this earns its keep on the OTHER path: `pnpm ingest --update`, which
  // rewrites an article that has been live long enough to be cached.
  await tagEdgeResponse(`/artikel/${categorySlug}/${slug}`);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';

  // ONE SHARED BUDGET across every sequential read in this render, not a fresh
  // deadline per read. Giving each its own ceiling would permit 3s + 1.5s + 2s
  // = 6.5s against `maxDuration = 5`, i.e. Vercel kills the function before any
  // fallback can even log. `startDeadlineBudget` floors each read at 250ms so a
  // late one still gets a real attempt rather than an already-expired deadline
  // -- which means the floors add to the total, and the total is derived from
  // `maxDuration` rather than picked to sit near it. See below.
  //
  // It covers TWO sequential reads now, not three. The cover credit was the
  // middle one and it is gone — folded into the payload's own join on
  // 25 Ogos 2026, because losing that race silently published an uncredited
  // photograph (see `coverCredit` above). What is left is the payload and the
  // related-articles block, and the related block is genuinely allowed to
  // degrade: an absent sideways link costs crawl depth, not a licence.
  //
  // This route has no build-phase concern to carve out: `generateStaticParams`
  // returns [] (see the note there), so nothing renders this page during
  // `next build`.
  //
  // 4_000 was a number chosen next to `maxDuration`, not derived from it, and
  // the difference is the 502. `startDeadlineBudget` floors each read, so the
  // floors ADD: 4,000 + 250 + 250 + 250 = 4,750ms of database waiting against a
  // 5,000ms ceiling, leaving 250ms to render and flush. Overrunning a STREAMING
  // response is not a slow page or an error page -- it is
  // `502 FUNCTION_RESPONSE_STREAM_INCOMPLETE`, which is what the first request
  // ever made to a new article URL returned in Sprint 01. Every fallback in
  // this file needs the function to still be alive to run.
  //
  // `ARTICLE_RENDER_BUDGET_MS` is derived from `maxDuration` in
  // `@/lib/inspire/article-cache` and its arithmetic is asserted by that
  // module's test, including that the literal on line 70 above still agrees.
  const budgetLeft = startDeadlineBudget(ARTICLE_RENDER_BUDGET_MS, READ_FLOOR_MS);

  const pageData = await withDeadline(
    getArticlePageData(slug),
    budgetLeft(),
    `inspire-article:${slug}`,
  );
  if (!pageData) {
    // Slug/category changes write exact 301s into `redirects`
    // (buildArticleSlugRedirect) — serve them here, on the 404 path only, so
    // an old article URL keeps resolving after a rename. twn-new served these
    // from Edge middleware; this port consults the table in the route layer.
    const dbRedirect = await lookupRedirect(`/artikel/${categorySlug}/${slug}`);
    if (dbRedirect) permanentRedirect(dbRedirect.destinationPath);
    notFound();
  }

  const { article, tags, secondaryCategories } = pageData;

  // Article content with dynamic blocks merged in (falls back to the raw
  // content for any straggler cache entries from before the field existed).
  const renderContent = pageData.renderContent ?? article.content;

  // An article whose primary category was deleted (FK is ON DELETE SET NULL)
  // has no canonical URL: without this guard it renders under EVERY
  // /artikel/{anything}/{slug} path and emits `canonical=/artikel/null/{slug}`,
  // which is duplicate content pointing at a 404. Same guard as the draft route.
  if (!article.categorySlug) notFound();

  // Redirect to correct category URL if slug doesn't match (e.g. after category change)
  if (article.categorySlug !== categorySlug) {
    permanentRedirect(`/artikel/${article.categorySlug}/${slug}`);
  }

  // The link back UP to this article's pillar. The approved plan requires every
  // article to link up with the pillar's Malay entity phrase as anchor text;
  // deriving it from the category tree makes that structural rather than
  // something a writer can forget or a rename can break. Returns null for the
  // legacy articles outside the pillar architecture, which render as before.
  // A failure DEGRADES this block; it must never silently delete it — see the
  // catch, which is where the interesting decision lives.
  let pillarUpLink: Awaited<ReturnType<typeof getPillarUpLink>> = null;
  try {
    pillarUpLink = await withDeadline(
      getPillarUpLink(article.id),
      budgetLeft(),
      `inspire-pillar-uplink:${slug}`,
    );
  } catch {
    // NOT "non-critical", which is what this used to say. The plan's rule is
    // that every article links back up to its pillar and nothing is orphaned;
    // a swallowed timeout silently removed that backlink while the page
    // rendered looking perfectly fine, so nobody would ever have noticed.
    //
    // Degrade instead of vanish. The primary category IS the pillar under this
    // model, and its name and slug are already in hand from the article query
    // — no second read, no extra deadline, nothing left to fail. The anchor
    // falls back to the category name rather than the Malay entity phrase,
    // which is a slightly weaker link; a slightly weaker link beats none.
    if (article.categorySlug && article.categoryName) {
      pillarUpLink = {
        slug: article.categorySlug,
        name: article.categoryName,
        anchor: article.categoryName,
        cluster: null,
      };
    }
  }

  // The cover image's credit. In-article images carry theirs in the figure
  // caption, which the renderer already emits; the cover has no figcaption and
  // would otherwise be the largest photograph on the page with no attribution
  // anywhere. Owner-level requirement, board 23 Aug 2026.
  //
  // It arrives ON `article`, from the primary join — see the long note on
  // `coverCredit` in `getArticlePageDataCached`. It used to be a third
  // sequential read against this render's shared budget, and eight live
  // articles were serving uncredited licensed photographs because of it.
  const coverCredit = article.coverCredit
    ? { credit: article.coverCredit, creditUrl: article.coverCreditUrl }
    : null;

  // Related articles — non-critical crawlable link block. Deadline-guarded and
  // defaults to [] so a slow/failed query never breaks the article render.
  //
  // Scoped to the article's CLUSTER when it has one. "Same primary category"
  // was right when a category held a dozen articles; under the pillar model the
  // primary category IS the pillar, which the plan maps at up to 38 articles —
  // far too loose an association for a sideways link, and the plan is explicit
  // that siblings link inside their own cluster. Articles outside the pillar
  // architecture keep the original behaviour via the fallback below.
  let relatedArticles: Awaited<ReturnType<typeof getRelatedArticles>> = [];
  if (pillarUpLink?.cluster) {
    try {
      relatedArticles = await withDeadline(
        getClusterSiblings(pillarUpLink.cluster.id, article.id, 6),
        budgetLeft(),
        `inspire-cluster-siblings:${slug}`,
      );
    } catch {
      // Non-critical — fall through to the primary-category block below.
    }
  }
  if (relatedArticles.length === 0 && article.primaryCategoryId) {
    try {
      relatedArticles = await withDeadline(
        getRelatedArticles(article.primaryCategoryId, article.id),
        budgetLeft(),
        `inspire-related:${slug}`,
      );
    } catch {
      // Non-critical — render the article without the related block.
    }
  }

  // The one onward link the mobile bottom bar carries. Deliberately the SAME
  // article as the first card in the related grid at the foot of the page —
  // the bar is a shortcut to the best next read, not a second opinion about
  // what it is. Costs no extra query: `relatedArticles` is already loaded, and
  // is already cluster-scoped (or category-scoped for pre-pillar articles), so
  // the bar inherits that relevance for free. Null when an article has no
  // siblings at all, and the bar handles that.
  const nextUp = relatedArticles[0];
  const nextArticle = nextUp
    ? {
        title: nextUp.title,
        href: `/artikel/${nextUp.categorySlug ?? categorySlug}/${nextUp.slug}`,
        thumbnailUrl:
          (nextUp.coverImageVariants as Record<string, { url: string }> | null)?.low?.url ??
          nextUp.coverImageUrl,
        lqip: nextUp.coverImageLqip,
      }
    : null;

  const bodyImages = extractImageUrlsWithVariants(renderContent);

  // The rail's `Sumber` block — UI-17, DES-03 §5.1. Read from the article's
  // own `Sumber:` citations and from nothing else: `articles` has no sources
  // column and never has, and inventing one on a site whose whole claim is
  // that its numbers carry sources is the worst outcome available. Empty on
  // the 52 of 86 articles that carry no citation, which is a CONTENT gap owned
  // by the editorial seat rather than a layout one. Read from `renderContent`
  // so a citation that arrives inside a dynamic block is found — the same
  // input the body renders, not the raw column.
  const sourceCensus = extractSources(renderContent);

  // Computed once and asked about BEFORE the rail renders. `<ArticleToc>`
  // returns null below `TOC_MIN_HEADINGS`, but a React element is truthy even
  // when it renders nothing, so passing it unconditionally leaves an empty
  // wrapper in the rail's flex column — measured 0px tall and still worth 56px
  // of `gap` between Rekod and Sumber on the preview build. `hasArticleToc` is
  // the component's OWN floor, exported rather than re-implemented here.
  const articleHeadings = extractHeadings(article.content);

  const coverGalleryImage: GalleryImage | null = article.coverImageUrl
    ? {
        src: article.coverImageUrl,
        thumbnailUrl: (() => {
          const variants = article.coverImageVariants as Record<string, { url: string }> | null;
          return variants?.low?.url ?? article.coverImageUrl;
        })(),
      }
    : null;

  // LCP preload — ONE hint, no media query, because the redesigned cover is
  // ONE `<img>` at every breakpoint (spec §5.1) rather than the mobile/desktop
  // pair this route used to render. That pair needed two media-scoped preloads
  // and each had to stay byte-identical to whichever branch would render, or
  // the browser fetched both at high priority and the preload stopped being a
  // preload. One element, one hint, nothing left to drift.
  //
  // `resolveCoverSource` is the single definition of what that element loads —
  // the same call the figure below makes, so the two cannot disagree.
  const coverPreload = article.coverImageUrl
    ? resolveCoverSource(
        article.coverImageVariants as CoverVariants | null,
        article.coverImageSmartCrops,
        article.coverImageUrl,
      )
    : null;
  // UI-12 S1: `imageSrcSet`/`imageSizes` are gone with the `srcSet` the figure
  // no longer carries. A preload whose candidate list differs from the rendered
  // element's is not a preload — the browser resolves the hint against the hint's
  // own srcset/sizes and fetches a second file at high priority. Now there is one
  // URL in both places and nothing to keep in step. It is also the byte fix:
  // `sizes` resolved to 768px here, so every DPR ≥ 1.33 display was selecting the
  // `1600w` candidate and preloading 488–946 KB of `crop-4x3-article-card`; this
  // preloads `low` at 36–80 KB (measured, 31 Ogos 2026).
  if (coverPreload) {
    ReactDOM.preload(coverPreload.src, {
      as: 'image',
      fetchPriority: 'high',
    });
  }

  const galleryImages: GalleryImage[] = [
    ...(coverGalleryImage ? [coverGalleryImage] : []),
    ...bodyImages,
  ];

  const imageUrls = galleryImages.map((img) => img.src);

  const authorName = authorDisplayName({
    firstName: article.authorFirstName,
    lastName: article.authorLastName,
  });

  // THE gate — one predicate, three conditions, called here and nowhere
  // re-implemented. Everything author-shaped below (the linked byline on the
  // hero, the mobile cover, the sidebar, the author box, the JSON-LD `url`)
  // keys off this single boolean, so the house account and every non-opted-in
  // profile keep exactly today's unlinked behaviour by construction rather
  // than by five separate checks agreeing.
  const linkableAuthor = isLinkableAuthor({
    role: article.authorRole,
    isPublicAuthor: article.authorIsPublic,
    authorSlug: article.authorSlug,
  });
  const authorSlug = linkableAuthor ? article.authorSlug : null;
  const authorAvatarUrl = linkableAuthor ? article.authorAvatarUrl : null;

  const categories = [
    ...(article.categoryName && article.categorySlug
      ? [{ name: article.categoryName, slug: article.categorySlug }]
      : []),
    ...secondaryCategories,
  ];

  const breadcrumbItems = [
    { label: 'Utama', href: '/' },
    { label: 'Artikel', href: '/artikel' },
    {
      label: article.categoryName ?? 'Category',
      href: `/artikel/${article.categorySlug ?? categorySlug}`,
    },
    { label: article.title },
  ];

  // Estimate read time (~200 words per minute)
  let readTime: string | null = null;
  let wordCount = 0;
  const text = extractTextContent(article.content);
  if (text) {
    wordCount = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(wordCount / 200));
    readTime = `${minutes} min bacaan`;
  }

  // JSON-LD Article schema
  const jsonLdDescription = articleMetaDescription(article);
  // 16:9 smart-cropped OG asset (same one generateMetadata feeds to og:image),
  // so the Article image's asserted 1200×630 dimensions are actually true.
  const jsonLdImageUrl =
    getSmartCropUrl(article.coverImageSmartCrops, 'crop-16x9-og') ?? article.coverImageUrl;
  const hasRealAuthor = authorName !== 'HelloKahwin';
  // A `Person` with a `url` is the whole E-E-A-T point: it ties the article to a
  // verifiable human whose page declares the same Person (`ProfilePage` →
  // `mainEntity` on the archive). A named-but-not-published author still gets a
  // bare `Person` — that is today's behaviour and dropping the name would be a
  // regression — but only a LINKABLE one gets a url, because a url pointing at
  // a 404 is worse than no url at all.
  const jsonLdAuthor = hasRealAuthor
    ? {
        '@type': 'Person' as const,
        name: authorName,
        ...(authorSlug ? { url: `${baseUrl}${authorArchivePath(authorSlug)}` } : {}),
      }
    : { '@type': 'Organization' as const, name: 'HelloKahwin', url: baseUrl };
  const canonicalUrl = `${baseUrl}/artikel/${categorySlug}/${slug}`;
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    ...(jsonLdDescription ? { description: jsonLdDescription } : {}),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/artikel/${categorySlug}/${slug}`,
    },
    // Use the 16:9 smart-cropped OG asset (the same one og:image uses) so the
    // asserted 1200×630 dimensions are actually true. coverImageUrl is the raw
    // original at an arbitrary aspect ratio — claiming 1200×630 on it was false
    // and risks Google distrusting the Article image.
    ...(jsonLdImageUrl
      ? {
          image: {
            '@type': 'ImageObject',
            url: jsonLdImageUrl,
            width: 1200,
            height: 630,
          },
        }
      : {}),
    ...(tags.length > 0 ? { keywords: tags.map((t) => t.name).join(', ') } : {}),
    ...(article.publishedAt ? { datePublished: new Date(article.publishedAt).toISOString() } : {}),
    dateModified: new Date(article.updatedAt).toISOString(),
    author: jsonLdAuthor,
    publisher: {
      '@type': 'Organization',
      name: 'HelloKahwin',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/hellokahwin-logo.png`,
        width: 886,
        height: 290,
      },
    },
    url: `${baseUrl}/artikel/${categorySlug}/${slug}`,
    ...(wordCount > 0 ? { wordCount } : {}),
    ...(article.categoryName ? { articleSection: article.categoryName } : {}),
  };

  // ItemList for listicle-shaped articles. Derived from the article's own
  // numbered `<h2>`s and the anchors the renderer gives them — the SAME
  // `extractHeadings` call the renderer makes, so every `url` in the list
  // resolves to a heading that exists on the page. `null` for anything that is
  // not a list. See `lib/inspire/listicle-schema.ts` for why a list entry only
  // becomes a `Place` when the heading names both a venue and a locality.
  const itemListJsonLd = buildItemListJsonLd({
    title: article.title,
    canonicalUrl,
    headings: extractHeadings(article.content),
  });

  // FAQPage for articles that end in a `Soalan lazim` block. Derived from the
  // article's own body, so every question and answer it asserts is text the
  // reader can see -- the condition Google puts on FAQ markup. `null` for
  // anything without a block. See `lib/inspire/faq-schema.ts` for why the block
  // is found by heading text rather than by heading level.
  const faqJsonLd = buildFaqPageJsonLd({ content: article.content });

  return (
    <>
      {/* NO `data-hide-mobile-nav` HERE. It was on this div until UX-01
          (26 Aug 2026), which hid the site header below 767px — the attribute
          was written for chromeless vendor-detail surfaces and applied to the
          route that receives essentially all of the site's search traffic, on
          phones. A reader from Google got no logo, no brand, no navigation and
          no search, with the footer 12,000px away as the nearest escape. If you
          are about to re-add it here, read the block above the rule in
          globals.css first. */}
      <div className="hk serif-editorial s-pad container mx-auto pb-20 lg:pt-8 lg:pb-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c'),
          }}
        />
        {itemListJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(itemListJsonLd).replace(/</g, '\\u003c'),
            }}
          />
        )}
        {faqJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
            }}
          />
        )}
        <BreadcrumbJsonLd items={breadcrumbItems} />
        <Breadcrumbs items={breadcrumbItems} />

        <div className="inspire-editorial">
          {/* ── UI-17: the composition, DES-03 §5.1 ──────────────────────────
              `.hk-article-grid` is 756 + 64 + 300 at any container wider than
              1120px, and one column below 1024. Placement is EXPLICIT, not
              source order: the rail sits between the header and the figure in
              the DOM — where a phone needs the record, above the fold and
              ahead of the photograph — and is lifted into column 2 spanning
              all three rows on desktop.

              Before this, production rendered the mobile composition at every
              width: measured at 1440 on 31 Aug, body 120..714 and Rekod
              120..888, the SAME left edge. `pt-4` moved here from the header
              so both columns start at the same y.

              ONE MOUNT. The two-copy idiom (`lg:hidden` + `hidden lg:block`)
              is what put two `<h1>`s on 85 of 85 articles (DES-09 G01) and two
              `<aside>`s on every article until this change; check R6 of
              `scripts/measure-article-rail.mjs` fails if any rail block is
              ever in the DOM more than once. */}
          <div className="hk-article-grid pt-4">
            {/* ── The record above the fold — spec §5.1 ────────────────────────
              ONE header, ONE `<h1>`, at every breakpoint. This replaces the
              two-block mobile/desktop pair that put the same headline in the
              DOM twice (DES-09 G01: 85 of 85 articles emitted two `<h1>`).
              `.s-h1`'s clamp() is what makes one node work at both sizes —
              spec §2.2: "every size below is one clamp(), which retires the
              second h1 as a side effect".

              Order is the composition: eyebrow, headline, deck, then the
              Rekod panel — "the reader searching mas kahwin Perak has the
              answer before the photograph loads" — and the figure after it. */}
            {/* UI-10, 31 Ogos 2026 — `mx-auto` came off this header and off the
              cover figure below it. It centred a 768px block inside the 1200px
              shell while the body column below it starts at the grid's left
              edge, so at 1440 the headline began 216px to the RIGHT of its own
              first paragraph (measured: header left 336, body left 120), and at
              1920 the offset was 344px. It was survivable while the body ran
              888px wide and nearly reached the headline's right edge; once
              UI-10 capped the body at the reading measure (594px) the two
              blocks no longer shared an edge OR a right margin, and the page
              read as two unrelated columns. See
              `…-ui-10-EVIDENCE/screens/compose-after-1440px.png`.

              Left-aligning is a no-op below 768 (the cell is narrower than
              768px there) and strictly better at every width above it, so it is
              unconditional rather than an `lg:` variant. The stack now hangs
              off ONE left edge — eyebrow, headline, deck, Rekod, cover, body —
              with a ragged right: the headline may run wider than the reading
              column, and the photograph wider still. That is the composition,
              not an oversight. */}
            <header className="hk-article-head max-w-3xl">
              <span className="s-label" style={{ color: 'var(--accent)' }}>
                {article.categoryName ?? 'Tiada kategori'}
              </span>
              <h1 className="s-h1 mt-3">{article.title}</h1>
              {article.excerpt && <p className="s-deck mt-4">{article.excerpt}</p>}
            </header>

            {/* ── The rail — UI-17, DES-03 §5.1 ────────────────────────────────
              "On desktop the panel is the 300 px rail; on a phone it is a
              full-width block in the same place in the reading order."

              Mounted HERE, between the deck and the photograph, because that
              is the phone's reading order: eyebrow, headline, deck, Rekod,
              figure, body — "the reader searching mas kahwin Perak has the
              answer before the photograph loads". `.hk-article-grid` lifts it
              into column 2 at >= 1024px. One node, two positions; never two
              nodes.

              `toc` is UI-18's, deliberately not passed yet: the rail accepts
              an empty contents slot so neither item blocks the other, and the
              `Dalam artikel ini` heading renders only when the slot is filled.
              Container contract agreed with UI-18 on 01 Sep 2026 — this
              component owns the container and the heading, UI-18 owns the
              list, and a rail child lays out in a measured 268px.

              `extra` is the old `<ArticleSidebar>`, now mounted ONCE. It was
              rendered twice — `hidden lg:block` plus a separate `lg:hidden`
              copy — which is why production served two `<aside>` elements per
              article, one of them measuring 0x0 at every width. */}
            <ArticleRail
              rekod={
                /* Every field is a fact this page already holds — nothing
                 invented. "Disemak" is the same `updatedAt` the Article
                 schema's `dateModified` asserts (spec §9.2: "the visible claim
                 and the schema claim cannot disagree").

                 `RekodPanel` from the design system, not the hand-rolled copy
                 that stood here: the copy had drifted to a bare `<span
                 className="s-label">` where the component uses `<Label muted>`,
                 so the panel on the live article and the panel on the
                 reference page were two different components wearing the same
                 class. */
                <RekodPanel
                  fields={[
                    { label: 'Kategori', value: article.categoryName ?? 'Tiada kategori' },
                    {
                      label: 'Penulis',
                      value: authorSlug ? (
                        <Link
                          href={authorArchivePath(authorSlug)}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {authorName}
                        </Link>
                      ) : (
                        authorName
                      ),
                    },
                    ...(readTime ? [{ label: 'Bacaan', value: readTime }] : []),
                    {
                      label: 'Disemak',
                      accent: true,
                      value: new Date(article.updatedAt).toLocaleDateString('ms-MY', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }),
                    },
                  ]}
                />
              }
              toc={
                /* UI-18's component, with `labelledBy` set so it drops its
                 own heading, its own `aria-label` and the inline callout's
                 border, fill, radius and `lg:max-w-[680px]` — a card inside a
                 card in a 300px column. It keeps its `<nav class="article-toc">`
                 and its links; the rail renders the heading it points at.

                 Built from `article.content`, the same input `ArticleRenderer`
                 feeds `injectHeadingIds()`, so every `href="#…"` resolves to a
                 heading that exists — see `lib/inspire/heading-anchors.ts`.

                 UI-18 merged the component and the prop but did NOT relocate
                 the list, so the relocation lands here: `showToc={false}` below
                 is what stops the page carrying two. */
                hasArticleToc(articleHeadings) ? (
                  <ArticleToc headings={articleHeadings} labelledBy={RAIL_TOC_HEADING_ID} />
                ) : null
              }
              sources={sourceCensus.sources}
              extra={
                <ArticleSidebar
                  updatedAt={new Date(article.updatedAt).toISOString()}
                  categories={categories}
                  authorName={authorName}
                  authorSlug={authorSlug}
                  authorAvatarUrl={authorAvatarUrl}
                  tags={tags}
                  galleryImages={galleryImages}
                />
              }
            />

            {/* The cover, with its caption and credit as one figure — spec §5.1
              and DES-09 G38: the credit is part of the component contract, not
              an appended line that a component swap can drop. */}
            {article.coverImageUrl &&
              (() => {
                const cover = resolveCoverSource(
                  article.coverImageVariants as CoverVariants | null,
                  article.coverImageSmartCrops,
                  article.coverImageUrl,
                );
                if (!cover) return null;
                // CONT-15 — emitted when and ONLY when the resolver returned
                // real measured dimensions. Emitting neither property is what
                // makes the unrecorded case reproduce today's geometry exactly:
                // `.hk-cover-plate`'s own `3 / 2` and `756px` fallbacks take
                // over. An empty string or a `0 / 0` here would be an invalid
                // value that beats the fallback and collapses the box.
                const plateVars =
                  cover.width !== null && cover.height !== null
                    ? ({
                        '--cover-ar': coverPlateAspect(cover.width, cover.height),
                        '--cover-max-w': coverPlateMaxWidth(cover.width, cover.height),
                      } as CSSProperties)
                    : undefined;
                return (
                  <figure
                    className="hk-article-figure mt-6 mb-10 max-w-3xl"
                    // `margin: '24px auto 40px'` until UI-10. The inline `auto`
                    // beat the class, so dropping `mx-auto` above without also
                    // changing this line would have left the figure centred and
                    // the header alone on the new left edge — the exact
                    // half-fixed state that reads as a bug. Written long-hand so
                    // the horizontal margin is a value, not an `auto` waiting to
                    // re-centre it.
                    style={{ marginTop: 24, marginBottom: 40, marginLeft: 0, marginRight: 0 }}
                  >
                    {/* UI-12 S5 — `lg:aspect-[2.4/1]` deleted. 2.4:1 matched no
                      derivative this pipeline produces: `CROP_TARGETS` yields
                      exactly four aspects — 0.800, 1.333, 1.905, 3.520 — and
                      nothing yields 2.4. Per hero-rules R1, if no derivative
                      matches the box you want you do not have that box; 2.4:1
                      was drawn, not derived, and no asset on this site can fill
                      it. Measured on production 31 Ogos 2026: a 2.400 box fed
                      `low` at 1.4993 is 60% off and reports a 1.17× upscale —
                      4 gate failures.

                      CONT-15 — `aspect-[3/2]` deleted for the same reason one
                      step further out. A FIXED box fed a RESIZE is a box that
                      only fits the modal photograph: `low.webp` carries the
                      source's own aspect, and 14 of the 92 published covers are
                      portrait (0.667 ×8, 0.748, 0.750 ×4, 0.753). Measured on
                      production 02 September 2026, this element was 125% off the
                      gate's 25% ceiling on the 0.667 covers and kept 44.5% of
                      the frame. `.hk-cover-plate` derives the box from the file
                      instead — a box derived from the file cannot deviate from
                      it — and both custom properties fall back to today's exact
                      geometry when the intrinsics are unrecorded. Zero bytes:
                      same `low.webp`, same URL, no new R2 object. */}
                    <div
                      className="hk-cover-plate"
                      style={{
                        ...plateVars,
                        ...(article.coverImageLqip
                          ? {
                              backgroundImage: `url(${article.coverImageLqip})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : null),
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- see responsive-cover.ts */}
                      {/* UI-12 S1/S5: no `srcSet`, no `sizes` (inert without one).
                        CONT-15: `width`/`height` are the FILE's real recorded
                        pixels, not the box's. They were hard-coded 1200×800,
                        which reserved a 1.500 box for a 0.667 file on 14
                        articles and fired `image-attr-aspect` at 125% — the same
                        R6 defect UI-03 found on the homepage hero, one layer
                        down. When nothing is recorded they stay 1200×800, which
                        is `low`'s modal intrinsic and matches the 3 / 2 the plate
                        falls back to, so the reservation and the box still agree.
                        The `absolute inset-0 h-full w-full object-cover`
                        utilities are gone because `.hk-cover-plate img` states
                        all five: one definition, in the same rule as the box it
                        has to fill. */}
                      <img
                        src={cover.src}
                        alt={article.title}
                        width={cover.width ?? 1200}
                        height={cover.height ?? 800}
                        fetchPriority="high"
                        decoding="async"
                      />
                    </div>
                    <figcaption
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 24,
                        flexWrap: 'wrap',
                        paddingTop: 9,
                      }}
                    >
                      <ImageCredit
                        credit={coverCredit?.credit}
                        creditUrl={coverCredit?.creditUrl}
                        className="s-cred"
                      />
                      {galleryImages.length > 0 && (
                        <PhotoGallery
                          images={galleryImages}
                          trigger={
                            <span className="s-btn">Lihat semua foto ({galleryImages.length})</span>
                          }
                        />
                      )}
                    </figcaption>
                  </figure>
                );
              })()}

            {/* Row 3, column 1. The old wrapper here was a SECOND grid —
              `lg:grid-cols-[minmax(0,1fr)_280px]` — that produced a 280px
              column of tags and credits beside the body while the specified
              300px rail did not exist at all. Two right-hand columns of
              different widths, one of them the wrong one. The sidebar's
              contents moved into `<ArticleRail extra={…}>` above, mounted
              once; this is now a plain cell. */}
            <div className="hk-article-body" data-hk-body-col>
              <article>
                <div
                  className="mb-8 flex flex-wrap items-center justify-between gap-4 py-4"
                  style={{
                    borderTop: '1px solid var(--rule)',
                    borderBottom: '1px solid var(--rule)',
                  }}
                >
                  <span className="s-label" style={{ color: 'var(--fg-muted)' }}>
                    Kongsi artikel ini
                  </span>
                  <WhatsAppShare title={article.title} url={canonicalUrl} />
                </div>
                <ArticleRenderer content={renderContent} articleId={article.id} showToc={false} />
                {/* Link back up to the pillar. Inside <article> and immediately
                  after the body, so it reads as part of the piece rather than
                  as chrome, and so it sits above the fold of the related block. */}
                <PillarUpLinkBlock link={pillarUpLink} />
              </article>
            </div>
            {/* ── end .hk-article-grid ─────────────────────────────────────── */}
          </div>

          {/* End-of-article author box. Rendered ONLY for a linkable author,
                which is why the house account's articles look exactly as they
                do today: no box, no photo, no link. */}
          {authorSlug && (
            <AuthorBox
              name={authorName}
              slug={authorSlug}
              avatarUrl={article.authorAvatarUrl}
              title={article.authorTitle}
              bio={article.authorBio}
              websiteUrl={article.authorWebsiteUrl}
              instagramUrl={article.authorInstagramUrl}
              linkedinUrl={article.authorLinkedinUrl}
            />
          )}

          {/* Related articles — crawlable internal links to same-category content.
          The primary mechanism (with the sitemap) for distributing crawl depth
          across deep/older articles that otherwise have no inbound links. */}
          {/* The literal `Lagi dalam ` prefix on an `<h2>` is DES-09's G05, and
              this block is what supplies the difference between a median of 8
              inbound links per article and a median of 4 (G40). The heading
              text and level are the contract; only the row styling changed. */}
          {relatedArticles.length > 0 && (
            <section
              className="mt-16 pt-10"
              style={{ borderTop: '1px solid var(--rule)' }}
              aria-labelledby="related-articles-heading"
            >
              <h2
                id="related-articles-heading"
                className="s-label"
                style={{
                  color: 'var(--fg-muted)',
                  borderTop: '2px solid var(--fg)',
                  paddingTop: 12,
                  display: 'block',
                }}
              >
                {article.categoryName ? 'Lagi dalam ' + article.categoryName : 'Artikel berkaitan'}
              </h2>
              <div>
                {relatedArticles.map((related, i) => {
                  const cover = resolveRowThumbSource(
                    related.coverImageVariants as CoverVariants | null,
                    related.coverImageSmartCrops,
                    related.coverImageUrl,
                  );
                  return (
                    <a
                      key={related.id}
                      href={`/artikel/${related.categorySlug ?? categorySlug}/${related.slug}`}
                      className={cover ? 's-row' : 's-imgless'}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <span className="s-idx">{String(i + 1).padStart(2, '0')}</span>
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element -- see responsive-cover.ts
                        /* UI-12 S1/S2: still no `srcSet` and no `sizes`. The
                           box is 176×132 on desktop and 80×60 below 1024px,
                           both 1.33333.

                           DES-18: fed `crop-4x3-article-card-sm`, 528×396 —
                           the 4:3 asset this slot has wanted since UI-12 S2
                           made the box 4:3 and could not serve one, because
                           the only 4:3 file was the 488–946 KB full crop.
                           Median 17,664 B, lighter than the `low` it replaces.
                           `width`/`height` are the file's REAL intrinsics when
                           the rendition is present (hero-rules R4/R6), and the
                           box's own 176×132 when it is not. */
                        <img
                          src={cover.src}
                          alt=""
                          width={cover.width ?? 176}
                          height={cover.height ?? 132}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <h3 className="t">{related.title}</h3>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <MobileArticleBar nextArticle={nextArticle} galleryImages={galleryImages} />
      </div>
    </>
  );
}
