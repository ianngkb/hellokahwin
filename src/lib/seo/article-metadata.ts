/**
 * The article route's `generateMetadata`, split out from `page.tsx` so the one
 * invariant that matters can be asserted instead of trusted: **a metadata
 * render never resolves to the site-default title.**
 *
 * ── THE DEFECT THIS MODULE EXISTS TO CLOSE (SEO-07) ───────────────────────
 *
 * `generateMetadata` for `/artikel/[category]/[slug]` used to end with:
 *
 *     try   { pageData = await withDeadline(getArticlePageData(slug), 1_500, …) }
 *     catch { return {} }
 *
 * `return {}` reads like "no opinion, use the defaults". It is not. Next's
 * `mergeMetadata` walks `for (const key_ in metadata)` and switches on each key
 * (`next/dist/lib/metadata/resolve-metadata.js`). An empty object has no keys,
 * so nothing is merged and the parent's ALREADY-RESOLVED title survives
 * untouched — here the root layout's
 * `title.default = 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia'`.
 * The article then serves the homepage's title.
 *
 * That alone would be a cosmetic bug that self-heals on the next request. What
 * makes it a half-life is where the value lands. The resolved title is rendered
 * inside the same RSC tree as the page, so it goes into the SAME incremental
 * cache entry the page does — and this route caches. One render that loses the
 * 1.5s race publishes the wrong title to every subsequent reader and to
 * Googlebot, for the whole life of that entry. Sprint 02 verified a repaired
 * title live and correct; it was serving the site default again 14 minutes
 * later, because a background revalidation lost the race and re-froze it.
 *
 * Measured on production 28 Ogos 2026, sequentially, one request at a time
 * (`scripts/audit-rendered-titles.mts`): of 86 article pages, 75 rendered cold
 * and 7 of those 75 — 9.3% — served the site-default title. Cold renders that
 * kept their title took a median 1,332ms end to end; the seven that lost it
 * took 2,457–4,190ms. The deadline is not defending against a stalled database.
 * It fires on an ordinary slow render, roughly one cold render in eleven, at a
 * concurrency of ONE.
 *
 * ── THE SHAPE OF THE FIX ──────────────────────────────────────────────────
 *
 * Three tiers, in `resolveArticleMetadataSource` below:
 *
 *   1. The shared full payload. Unchanged, same 1.5s ceiling, and on the happy
 *      path it costs exactly what it cost before — the React `cache()` wrapper
 *      means `generateMetadata` and the page component still share ONE fan-out.
 *
 *   2. On deadline, a CHEAPER source: one indexed row with the metadata columns
 *      only — no `content` JSONB, no tags fan-out, no dynamic-block resolve, no
 *      media join. It runs ONLY when tier 1 has already failed, so the steady
 *      state adds zero queries to a 5-wide pool. Its own cache entry carries the
 *      same tags, so once filled it answers without touching the database at all
 *      and is the near-free backstop the deadline path always needed.
 *
 *   3. If the cheap read misses too, the SLUG — a route parameter already in
 *      hand, with no I/O, no deadline and no failure mode. `titleFromSlug`
 *      below carries the measurement that ruled out the obvious alternative
 *      (throwing) and why a structural guarantee was needed instead.
 *
 * The invariant the three tiers exist to produce is one sentence, and it is
 * pinned by `__tests__/article-metadata.test.ts`: **no path through this module
 * returns metadata without a title, so the root layout's `title.default` can
 * never reach an article page.** That is a property of the code rather than of
 * how fast the database answered, which is the whole difference between this
 * and what shipped before.
 */

import type { Metadata } from 'next';
import { withDeadline } from '@/lib/api/timeout';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import { stripBrandSuffix, buildArticleDescription, decodeMetaEntities } from '@/lib/seo/meta';

/**
 * Everything the article `<head>` needs, and nothing else.
 *
 * Deliberately NOT the page payload type. `bodyText` and `tagNames` are
 * optional because the cheap tier-2 read cannot supply them — the body is the
 * large JSONB column that makes tier 1 expensive, and the tags are a second
 * query. Both degrade a secondary field (a description fallback, the og `tags`
 * array); neither can take the title down with it.
 */
export interface ArticleMetadataSource {
  title: string;
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  excerpt: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  publishedAt: Date | string | null;
  updatedAt: Date | string;
  authorFirstName: string | null;
  authorLastName: string | null;
  coverImageUrl: string | null;
  coverImageSmartCrops: unknown;
  /** Tier 1 only — the body text used as the last description fallback. */
  bodyText?: string | null;
  /** Tier 1 only — og:tags. */
  tagNames?: string[];
}

/**
 * The article title as it will be printed, brand suffix stripped and entities
 * decoded, with the row's own `title` as the floor.
 *
 * Exported because it is the thing under test. `stripBrandSuffix` can legally
 * reduce a stored `meta_title` to the empty string (a row holding exactly
 * "HelloKahwin", or "| HelloKahwin" — both real WordPress-import shapes), and
 * an empty `title` handed to Next is falsy in `resolveTitle`, which puts the
 * root default back on the page through a completely different door than the
 * deadline. `|| article.title` is the guard, and it is load-bearing.
 */
export function resolveArticleTitle(source: Pick<ArticleMetadataSource, 'title' | 'metaTitle'>) {
  const stripped = decodeMetaEntities(stripBrandSuffix(source.metaTitle)).trim();
  return stripped || source.title;
}

/**
 * Builds the `Metadata` object. Pure: no database, no clock, no environment.
 *
 * Tier 1 and tier 2 both land here, so a fallback render differs from a full
 * one in exactly two secondary fields (`og:tags`, and the body-text branch of
 * the description) and in nothing a reader or a SERP would notice.
 */
export function buildArticleMetadata(
  source: ArticleMetadataSource,
  opts: { baseUrl: string },
): Metadata {
  const metaTitle = resolveArticleTitle(source);
  const description = buildArticleDescription({
    metaDescription: source.metaDescription,
    excerpt: source.excerpt,
    bodyText: source.bodyText ?? null,
  });
  const realAuthorName = [source.authorFirstName, source.authorLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const authorNameForMeta = realAuthorName.length > 0 ? realAuthorName : 'HelloKahwin';
  const ogImageUrl =
    getSmartCropUrl(source.coverImageSmartCrops, 'crop-16x9-og') ?? source.coverImageUrl;
  const canonicalPath = `/artikel/${source.categorySlug}/${source.slug}`;
  const tagNames = source.tagNames ?? [];

  return {
    title: metaTitle,
    ...(description ? { description } : {}),
    authors: [{ name: authorNameForMeta }],
    alternates: { canonical: canonicalPath },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    openGraph: {
      title: source.title,
      ...(description ? { description } : {}),
      type: 'article',
      url: `${opts.baseUrl}${canonicalPath}`,
      siteName: 'HelloKahwin',
      ...(source.publishedAt ? { publishedTime: new Date(source.publishedAt).toISOString() } : {}),
      modifiedTime: new Date(source.updatedAt).toISOString(),
      authors: [authorNameForMeta],
      ...(source.categoryName ? { section: source.categoryName } : {}),
      ...(tagNames.length > 0 ? { tags: tagNames } : {}),
      ...(ogImageUrl
        ? { images: [{ url: ogImageUrl, width: 1200, height: 630, alt: source.title }] }
        : {}),
    },
    twitter: {
      card: source.coverImageUrl ? 'summary_large_image' : 'summary',
      title: source.title,
      ...(description ? { description } : {}),
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

/**
 * The article's own slug, read back as a title. Tier 3 — the last source, and
 * the only one with no I/O, no deadline and no way to fail.
 *
 * ── WHY THIS EXISTS AND A `throw` DOES NOT ────────────────────────────────
 *
 * The first version of this module ended tier 3 with `throw`, on the reasoning
 * that an errored render caches nothing and the next request re-attempts.
 * Measured against a local production build with both deadlines forced to 1ms
 * (28 Ogos 2026), that is USUALLY what happens: first request 500 with no
 * cache entry written, second request 200 with the correct title, third a HIT.
 * Usually. One run in that session answered 200 with `x-nextjs-prerender: 1`,
 * the full 145KB article body, a correct `<h1>` — and the ROOT LAYOUT'S TITLE
 * in the `<head>`. The exact defect, straight back, through Next's own error
 * handling rather than through our `catch`.
 *
 * It was not reproduced on demand, and that is the point: an invariant this
 * item exists to guarantee cannot rest on how a framework happens to unwind a
 * throw across a streamed response. Next 16 decides whether to stream metadata
 * or block on it PER REQUEST, from the user agent (`serveStreamingMetadata` in
 * `app-render.js`), so the unwind path is not even the same for a reader and
 * for Googlebot.
 *
 * So tier 3 stops asking. The slug is already in hand — it is a route
 * parameter, it costs nothing to read, and on this site it is a Malay sentence
 * with the hyphens in: `berapa-dulang-hantaran-tunang` reads back as
 * "Berapa dulang hantaran tunang". That is a worse title than the row's own.
 * It is an incomparably better one than the homepage's, and unlike a throw it
 * cannot be undone by a framework's error path.
 *
 * The route can now emit the site default only if an article's slug is empty,
 * which the router makes impossible.
 */
export function titleFromSlug(slug: string): string {
  const words = slug
    .split('-')
    .map((w) => w.trim())
    .filter(Boolean)
    .join(' ');
  if (!words) return 'Artikel';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Which tier answered. Surfaced so the caller can log a degraded render. */
export type MetadataTier = 'full' | 'fallback' | 'slug';

export interface ResolvedArticleMetadata {
  metadata: Metadata;
  tier: MetadataTier;
}

/**
 * Resolves the article's `<head>` through the tier chain, and returns
 * `Metadata` — never `{}`, and never a shape that lets the root layout's
 * `title.default` through.
 *
 * `null` from a tier is NOT a failure. It is a real "no such published
 * article", and it short-circuits: a 404 is never retried against the cheap
 * read and never mistaken for a timeout.
 */
export async function resolveArticleMetadata(opts: {
  slug: string;
  /** The requested category, used for the canonical URL in the slug tier. */
  category: string;
  baseUrl: string;
  full: () => Promise<ArticleMetadataSource | null>;
  fallback: () => Promise<ArticleMetadataSource | null>;
  fullMs: number;
  fallbackMs: number;
  onDegrade?: (tier: Exclude<MetadataTier, 'full'>, reason: unknown) => void;
}): Promise<ResolvedArticleMetadata> {
  const build = (source: ArticleMetadataSource | null, tier: MetadataTier) => ({
    metadata: source ? buildArticleMetadata(source, { baseUrl: opts.baseUrl }) : NOT_FOUND_METADATA,
    tier,
  });

  try {
    return build(
      await withDeadline(opts.full(), opts.fullMs, `inspire-article-meta:${opts.slug}`),
      'full',
    );
  } catch (err) {
    opts.onDegrade?.('fallback', err);
  }

  try {
    return build(
      await withDeadline(
        opts.fallback(),
        opts.fallbackMs,
        `inspire-article-meta-fallback:${opts.slug}`,
      ),
      'fallback',
    );
  } catch (fallbackError) {
    opts.onDegrade?.('slug', fallbackError);
    return {
      metadata: buildSlugOnlyMetadata(opts.slug, opts.category, opts.baseUrl),
      tier: 'slug',
    };
  }
}

/** 404s are a real answer, not a degradation. */
const NOT_FOUND_METADATA: Metadata = { title: 'Not Found' };

/**
 * Tier 3's metadata: a title, a canonical, and nothing that needs a database.
 *
 * `robots.index` stays TRUE. A degraded title that Google can still see and
 * replace on the next crawl is a bad day; a `noindex` frozen into a cache entry
 * is how a page leaves the index entirely, and it would be frozen by exactly
 * the mechanism this whole module is about. Never trade a title problem for an
 * indexing one.
 */
function buildSlugOnlyMetadata(slug: string, category: string, baseUrl: string): Metadata {
  const title = titleFromSlug(slug);
  const canonicalPath = `/artikel/${category}/${slug}`;
  return {
    title,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: {
      title,
      type: 'article',
      url: `${baseUrl}${canonicalPath}`,
      siteName: 'HelloKahwin',
    },
  };
}
