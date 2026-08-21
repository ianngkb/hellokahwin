import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import ReactDOM from 'react-dom';
import { eq, ne, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { withDeadline, startDeadlineBudget } from '@/lib/api/timeout';
import { lookupRedirect } from '@/lib/redirects/lookup';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import {
  articles,
  inspireCategories,
  articleCategories,
  articleTags,
  inspireTags,
} from '@/lib/db/schema/articles';
import { profiles } from '@/lib/db/schema/profiles';
import {
  ArticleRenderer,
  extractImageUrlsWithVariants,
  extractTextContent,
} from '@/components/inspire/article-renderer';
import { ArticleCard } from '@/components/inspire/article-card';
import type { GalleryImage } from '@/components/inspire/article-renderer';
import { ArticleSidebar } from '@/components/inspire/article-sidebar';
import { ARTICLE_PAGE_CACHE_KEY, ARTICLE_PAGE_CACHE_TAGS } from '@/lib/inspire/article-cache';

import {
  resolveDynamicBlocks,
  mergeDynamicBlocks,
  collectEmbeddedBlockIds,
} from '@/lib/inspire/dynamic-blocks';
import { ArticleCoverMobile } from '@/components/inspire/article-cover-mobile';
import { MobilePhotoBar } from '@/components/inspire/mobile-photo-bar';
import { Breadcrumbs, BreadcrumbJsonLd } from '@/components/common/breadcrumbs';
import { stripBrandSuffix, buildArticleDescription, decodeMetaEntities } from '@/lib/seo/meta';
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
      })
      .from(articles)
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
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

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';

  // Deadline-protect the metadata path so a stalled DB doesn't burn the
  // whole 5s budget on metadata alone — the page render below still gets
  // its own deadline. On deadline error, fall back to empty metadata; the
  // page render will surface the real error (or render successfully if the
  // cache warmed in between).
  // Tight deadline on metadata. NOTE: this does NOT run sequentially before the
  // page render — an earlier version of this comment claimed it did, and that
  // claim is what hid Sentry TWN-NEW-47 for so long. In Next 16 `generateMetadata`
  // and the page component are kicked off CONCURRENTLY, so both reach
  // `getArticlePageData` at the same moment. `unstable_cache` has no in-flight
  // dedupe, which meant every cold article render issued its DB fan-out twice;
  // the React `cache()` wrapper on `getArticlePageData` is what collapses them.
  //
  // The 1.5s budget still matters: page-level maxDuration=5s caps the whole
  // invocation, and metadata must not be the thing that eats it.
  let pageData;
  try {
    pageData = await withDeadline(getArticlePageData(slug), 1_500, `inspire-article-meta:${slug}`);
  } catch {
    return {};
  }
  if (!pageData) return { title: 'Not Found' };
  const { article, tags } = pageData;

  // Strip the brand suffix if the imported `metaTitle` already includes it.
  // The root layout declares `title.template = '%s | HelloKahwin'`,
  // which Next.js appends to any non-absolute title — so without this strip
  // an imported value like "Foo | HelloKahwin" renders as
  // "Foo | HelloKahwin | HelloKahwin", and longer titles
  // get truncated mid-suffix ("Foo | The Wedding  | HelloKahwin").
  // Surfaced in the GSC Crawled-not-indexed bucket on inspire articles
  // re-imported from WordPress where `meta_title` carried the suffix.
  const stripped = decodeMetaEntities(stripBrandSuffix(article.metaTitle));
  const metaTitle = stripped || article.title;
  const description = articleMetaDescription(article);
  const realAuthorName = [article.authorFirstName, article.authorLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const hasRealAuthor = realAuthorName.length > 0;
  const authorNameForMeta = hasRealAuthor ? realAuthorName : 'HelloKahwin';
  const ogImageUrl =
    getSmartCropUrl(article.coverImageSmartCrops, 'crop-16x9-og') ?? article.coverImageUrl;
  return {
    title: metaTitle,
    ...(description ? { description } : {}),
    authors: [{ name: authorNameForMeta }],
    alternates: { canonical: `/artikel/${article.categorySlug}/${slug}` },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    openGraph: {
      title: article.title,
      ...(description ? { description } : {}),
      type: 'article',
      url: `${baseUrl}/artikel/${article.categorySlug}/${slug}`,
      siteName: 'HelloKahwin',
      ...(article.publishedAt
        ? { publishedTime: new Date(article.publishedAt).toISOString() }
        : {}),
      modifiedTime: new Date(article.updatedAt).toISOString(),
      authors: [authorNameForMeta],
      ...(article.categoryName ? { section: article.categoryName } : {}),
      ...(tags.length > 0 ? { tags: tags.map((t) => t.name) } : {}),
      ...(ogImageUrl
        ? { images: [{ url: ogImageUrl, width: 1200, height: 630, alt: article.title }] }
        : {}),
    },
    twitter: {
      card: article.coverImageUrl ? 'summary_large_image' : 'summary',
      title: article.title,
      ...(description ? { description } : {}),
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

export default async function InspireArticlePage({ params }: ArticlePageProps) {
  const { category: categorySlug, slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';

  // ONE SHARED BUDGET across every sequential read in this render, not a fresh
  // deadline per read. This render now issues three of them in sequence —
  // payload, then credits (which needs `article.id`), then related articles —
  // and giving each its own ceiling would permit 3s + 1.5s + 2s = 6.5s against
  // `maxDuration = 5`, i.e. Vercel kills the function before any fallback can
  // even log. (Even before the credits read existed, 3s + 2s already sat exactly
  // on the limit.) A 4s total leaves ~1s for the render itself, and
  // `startDeadlineBudget` floors each read at 250ms so a late one still gets a
  // real attempt rather than an already-expired deadline.
  //
  // This route has no build-phase concern to carve out: `generateStaticParams`
  // returns [] (see the note there), so nothing renders this page during
  // `next build`.
  const budgetLeft = startDeadlineBudget(4_000);

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

  // Related articles (same primary category) — non-critical crawlable link
  // block. Deadline-guarded and defaults to [] so a slow/failed query never
  // breaks the article render.
  let relatedArticles: Awaited<ReturnType<typeof getRelatedArticles>> = [];
  if (article.primaryCategoryId) {
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


  const bodyImages = extractImageUrlsWithVariants(renderContent);

  const coverGalleryImage: GalleryImage | null = article.coverImageUrl
    ? {
        src: article.coverImageUrl,
        thumbnailUrl: (() => {
          const variants = article.coverImageVariants as Record<string, { url: string }> | null;
          return variants?.low?.url ?? article.coverImageUrl;
        })(),
      }
    : null;

  // LCP preload — explicit hints with media queries so the browser preload
  // scanner discovers the LCP image during initial HTML parse instead of
  // waiting for Next.js Image's auto-emitted preload (which dedupes/clashes
  // when multiple priority images render in different viewport branches).
  // Pairs the desktop hero (lg+) and mobile cover (below lg) to their
  // respective smart crops, falling back to the high webp variant.
  if (article.coverImageUrl) {
    const coverHigh =
      (article.coverImageVariants as { high?: { url: string } } | null)?.high?.url ??
      article.coverImageUrl;
    const desktopHero =
      getSmartCropUrl(article.coverImageSmartCrops, 'crop-4.3x1-desktop-hero') ?? coverHigh;
    const mobileCover =
      getSmartCropUrl(article.coverImageSmartCrops, 'crop-4x5-mobile-cover') ?? coverHigh;
    ReactDOM.preload(desktopHero, {
      as: 'image',
      fetchPriority: 'high',
      media: '(min-width: 1024px)',
    });
    ReactDOM.preload(mobileCover, {
      as: 'image',
      fetchPriority: 'high',
      media: '(max-width: 1023px)',
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
    { label: 'Inspire', href: '/artikel' },
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

  return (
    <>
      <div
          className="serif-editorial container mx-auto px-4 pb-20 lg:px-6 lg:pt-8 lg:pb-8"
          data-hide-mobile-nav
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c'),
            }}
          />
          <BreadcrumbJsonLd items={breadcrumbItems} />
          <div className="hidden lg:block">
            <Breadcrumbs items={breadcrumbItems} />
          </div>

          <div className="inspire-editorial">
            {/* Mobile cover — full-bleed 4:5 with overlay nav + curved panel.
          Prefer coverImageVariants.high.url over the legacy /{ts}-cover.{ext}
          original URL — the high webp variant is much smaller for the same
          rendered quality. Smart crops still take precedence when present. */}
            {article.coverImageUrl ? (
              (() => {
                const coverHigh =
                  (article.coverImageVariants as { high?: { url: string } } | null)?.high?.url ??
                  article.coverImageUrl;
                return (
                  <>
                    <ArticleCoverMobile
                      coverImageUrl={coverHigh}
                      smartCrops={
                        article.coverImageSmartCrops as
                          | Record<string, { url: string; width: number; height: number }>
                          | undefined
                      }
                      categoryName={article.categoryName ?? 'Tiada kategori'}
                      categorySlug={article.categorySlug ?? categorySlug}
                      title={article.title}
                      authorName={authorName}
                      authorSlug={authorSlug}
                      authorAvatarUrl={authorAvatarUrl}
                      updatedAt={article.updatedAt}
                      readTime={readTime}
                      galleryImages={galleryImages}
                      articleId={article.id}
                    />

                    {/* Desktop cover — 3.52:1 crop; box is aspect-[2.2/1] capped at 350px */}
                    <div className="rounded-card relative mb-8 hidden aspect-[2.2/1] max-h-[350px] w-full overflow-hidden lg:block">
                      <Image
                        src={
                          getSmartCropUrl(
                            article.coverImageSmartCrops,
                            'crop-4.3x1-desktop-hero',
                          ) ?? coverHigh
                        }
                        alt={article.title}
                        fill
                        sizes="(max-width: 1280px) 100vw, 1280px"
                        className="object-cover"
                        priority
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 to-transparent px-6 pb-10 text-center text-white">
                        <span className="inspire-overline text-brand-secondary">
                          {article.categoryName ?? 'Tiada kategori'}
                        </span>
                        <h1 className="mt-2 max-w-[700px] text-[2.25rem] text-white">
                          {article.title}
                        </h1>
                        <p className="mt-3 text-sm text-white/60">
                          {authorSlug ? (
                            <Link
                              href={authorArchivePath(authorSlug)}
                              className="underline-offset-2 transition-colors hover:text-white hover:underline"
                            >
                              {authorName}
                            </Link>
                          ) : (
                            authorName
                          )}
                          {article.updatedAt && (
                            <>
                              {' '}
                              &middot; Dikemas kini{' '}
                              {new Date(article.updatedAt).toLocaleDateString('ms-MY', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </>
                          )}
                          {readTime && <> &middot; {readTime}</>}
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : (
              <div className="mb-8">
                <div className="bg-muted rounded-card mb-6 aspect-[2.2/1] max-h-[350px] w-full" />
                <div className="mb-8 text-center">
                  <span className="inspire-overline text-brand-secondary">
                    {article.categoryName ?? 'Tiada kategori'}
                  </span>
                  <h1 className="mx-auto mt-2 max-w-[700px] text-[2.25rem]">{article.title}</h1>
                  <p className="text-muted-foreground mt-3 text-sm">
                    {authorSlug ? (
                      <Link
                        href={authorArchivePath(authorSlug)}
                        className="hover:text-foreground underline-offset-2 transition-colors hover:underline"
                      >
                        {authorName}
                      </Link>
                    ) : (
                      authorName
                    )}
                    {article.updatedAt && (
                      <>
                        {' '}
                        &middot; Dikemas kini{' '}
                        {new Date(article.updatedAt).toLocaleDateString('ms-MY', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </>
                    )}
                    {readTime && <> &middot; {readTime}</>}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
              {/* Main article content */}
              <article>
                <div className="mb-6">
                  <WhatsAppShare title={article.title} url={canonicalUrl} />
                </div>
                <ArticleRenderer content={renderContent} articleId={article.id} />
              </article>

              {/* Sidebar.

                  Deliberately NOT sticky. When this column was pinned
                  (`lg:sticky lg:top-[120px]`) its height was capped at the
                  viewport, and Vendor Credits — the last block in it — fell
                  below that edge on a normal laptop with no way to scroll to
                  them. Letting the column scroll with the page makes every
                  credit reachable. */}
              <div className="hidden lg:block">
                <ArticleSidebar
                  updatedAt={new Date(article.updatedAt).toISOString()}
                  categories={categories}
                  authorName={authorName}
                  authorSlug={authorSlug}
                  authorAvatarUrl={authorAvatarUrl}
                  tags={tags}
                  galleryImages={galleryImages}
                />
              </div>
            </div>

            {/* Mobile sidebar content */}
            <div className="mt-8 border-t pt-8 lg:hidden">
              <ArticleSidebar
                updatedAt={new Date(article.updatedAt).toISOString()}
                categories={categories}
                authorName={authorName}
                authorSlug={authorSlug}
                authorAvatarUrl={authorAvatarUrl}
                tags={tags}
                galleryImages={galleryImages}
                variant="mobile"
              />
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
            {relatedArticles.length > 0 && (
              <section className="mt-12 border-t pt-8" aria-labelledby="related-articles-heading">
                <h2 id="related-articles-heading" className="inspire-display mb-6 text-2xl">
                  More in {article.categoryName ?? 'Inspire'}
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedArticles.map((related) => (
                    <ArticleCard
                      key={related.id}
                      title={related.title}
                      slug={related.slug}
                      categorySlug={related.categorySlug ?? categorySlug}
                      categories={[]}
                      coverImageUrl={related.coverImageUrl}
                      coverImageVariants={
                        related.coverImageVariants as Record<
                          string,
                          { url: string; sizeBytes: number }
                        > | null
                      }
                      smartCrops={
                        related.coverImageSmartCrops as Record<
                          string,
                          { url: string; width: number; height: number }
                        > | null
                      }
                      publishedAt={null}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <MobilePhotoBar galleryImages={galleryImages} />
      </div>
    </>
  );
}
