import { unstable_cache } from 'next/cache';
import { and, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { profiles } from '@/lib/db/schema/profiles';
import { articles, articleCategories, inspireCategories } from '@/lib/db/schema/articles';
import { resolveHouseAuthorId } from './gate';

/**
 * The one place every surface reads author data from.
 *
 * The gate itself lives in `./gate` (pure, DB-free) and is expressed HERE as
 * SQL rather than as a filter in JavaScript, because these queries must not
 * pull a vendor's or a couple's profile out of the database at all — the safest
 * way for a non-public profile never to leak is for it never to be selected.
 * The two expressions have to agree, which is why `PUBLIC_AUTHOR_CONDITIONS`
 * exists as a single named list instead of being retyped per query.
 */

/** Cache tag busted by every author write. Also busted alongside `articles`. */
export const INSPIRE_AUTHORS_TAG = 'inspire-authors';

/**
 * The SQL form of `isLinkableAuthor`. Kept adjacent to its callers so the three
 * conditions can be read at a glance next to the predicate they mirror.
 */
const PUBLIC_AUTHOR_CONDITIONS = [
  eq(profiles.role, 'admin'),
  eq(profiles.isPublicAuthor, true),
  isNotNull(profiles.authorSlug),
] as const;

/**
 * A public author's own columns. `email` and `phone` are deliberately absent —
 * this payload reaches a public page.
 */
export interface PublicAuthor {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
}

/**
 * Resolve a slug to a public author, or `null`.
 *
 * `null` is what makes an unknown slug, a de-listed author, a vendor and a
 * couple all 404 through the same code path — the archive route and its
 * `generateMetadata` both simply `notFound()` on null, exactly as
 * `inspire/tag/[slug]` does for a hidden tag.
 */
export const getPublicAuthorBySlug = unstable_cache(
  async (slug: string): Promise<PublicAuthor | null> => {
    const [row] = await db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        authorSlug: profiles.authorSlug,
        avatarUrl: profiles.avatarUrl,
        authorTitle: profiles.authorTitle,
        authorBio: profiles.authorBio,
        authorWebsiteUrl: profiles.authorWebsiteUrl,
        authorInstagramUrl: profiles.authorInstagramUrl,
        authorLinkedinUrl: profiles.authorLinkedinUrl,
      })
      .from(profiles)
      .where(and(...PUBLIC_AUTHOR_CONDITIONS, eq(profiles.authorSlug, slug)))
      .limit(1);

    if (!row || !row.authorSlug) return null;

    return {
      id: row.id,
      name: [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || 'Contributor',
      slug: row.authorSlug,
      avatarUrl: row.avatarUrl,
      title: row.authorTitle,
      bio: row.authorBio,
      websiteUrl: row.authorWebsiteUrl,
      instagramUrl: row.authorInstagramUrl,
      linkedinUrl: row.authorLinkedinUrl,
    };
  },
  ['inspire-author-by-slug'],
  { tags: [INSPIRE_AUTHORS_TAG], revalidate: false },
);

/**
 * One page of an author's published articles, plus the total.
 *
 * Shaped exactly like `getTagArticles` in `inspire/tag/[slug]/page.tsx` — same
 * columns, same secondary-category join, same `{ data, total }` return — because
 * the archive renders the same `ArticleCard` grid and a divergence here would
 * show up as cards that look subtly different on one archive type.
 *
 * Tagged on BOTH `articles` and the author tag: an article being published,
 * re-attributed or retitled changes this list just as much as an edit to the
 * author's own row does.
 */
export const getAuthorArticles = unstable_cache(
  async (authorId: string, page: number, perPage: number) => {
    const offset = (page - 1) * perPage;
    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          coverImageUrl: articles.coverImageUrl,
          coverImageVariants: articles.coverImageVariants,
          coverImageSmartCrops: articles.coverImageSmartCrops,
          coverImageLqip: articles.coverImageLqip,
          publishedAt: articles.publishedAt,
          categoryName: inspireCategories.name,
          categorySlug: inspireCategories.slug,
        })
        .from(articles)
        .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
        .where(and(eq(articles.status, 'published'), eq(articles.authorId, authorId)))
        .orderBy(desc(articles.publishedAt))
        .limit(perPage)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(articles)
        .where(and(eq(articles.status, 'published'), eq(articles.authorId, authorId))),
    ]);

    const articleIds = data.map((a) => a.id);
    const secondaryCategoryRows =
      articleIds.length > 0
        ? await db
            .select({
              articleId: articleCategories.articleId,
              name: inspireCategories.name,
              slug: inspireCategories.slug,
            })
            .from(articleCategories)
            .innerJoin(inspireCategories, eq(articleCategories.categoryId, inspireCategories.id))
            .where(inArray(articleCategories.articleId, articleIds))
            .orderBy(inspireCategories.name)
        : [];

    const secondaryByArticle = new Map<string, { name: string; slug: string }[]>();
    for (const row of secondaryCategoryRows) {
      const article = data.find((a) => a.id === row.articleId);
      // The primary category is already the first chip on the card; the
      // junction table also holds it, so skip the duplicate.
      if (article && row.name === article.categoryName) continue;
      const list = secondaryByArticle.get(row.articleId) ?? [];
      list.push({ name: row.name, slug: row.slug });
      secondaryByArticle.set(row.articleId, list);
    }

    const articlesWithCategories = data.map((a) => ({
      ...a,
      categories: [
        ...(a.categoryName && a.categorySlug
          ? [{ name: a.categoryName, slug: a.categorySlug }]
          : []),
        ...(secondaryByArticle.get(a.id) ?? []),
      ],
    }));

    return { data: articlesWithCategories, total: Number(totalResult[0]?.count ?? 0) };
  },
  ['inspire-author-articles'],
  { tags: ['articles', INSPIRE_AUTHORS_TAG], revalidate: false },
);

/**
 * Every public author with at least one published article — the sitemap's list.
 *
 * `latestPublishedAt` comes back as an ISO STRING, not a `Date`, on purpose:
 * `unstable_cache` persists its value as JSON, so a Date in the payload
 * silently becomes a string on a cache HIT while the types still claim Date —
 * a bug that only shows up in production, and only after the entry warms. The
 * caller does the `new Date()`. Same hazard `cachedJson` exists to prevent.
 */
export const getSitemapAuthors = unstable_cache(
  async (): Promise<{ slug: string; latestPublishedAt: string | null }[]> => {
    const rows = await db
      .select({
        slug: profiles.authorSlug,
        latestPublishedAt: sql<string | null>`MAX(${articles.publishedAt})`,
      })
      .from(profiles)
      // INNER join to `articles`: an opted-in author with nothing published has
      // no page (the route 404s a zero-count author), so listing them would be
      // advertising a 404 to Google. The join does the filtering for free.
      .innerJoin(
        articles,
        and(eq(articles.authorId, profiles.id), eq(articles.status, 'published')),
      )
      .where(and(...PUBLIC_AUTHOR_CONDITIONS))
      .groupBy(profiles.authorSlug);

    return rows
      .filter((r): r is { slug: string; latestPublishedAt: string | null } => r.slug !== null)
      .map((r) => ({
        slug: r.slug,
        // Normalised to ISO here so the shape is the same on a cache miss (the
        // driver may hand back a Date) and a cache hit (JSON gives a string).
        latestPublishedAt: r.latestPublishedAt ? new Date(r.latestPublishedAt).toISOString() : null,
      }));
  },
  ['inspire-sitemap-authors'],
  { tags: ['articles', INSPIRE_AUTHORS_TAG], revalidate: 3600 },
);

/** An author as offered in the admin's article-attribution dropdowns. */
export interface SelectableAuthor {
  id: string;
  name: string;
  slug: string | null;
  isPublicAuthor: boolean;
  isHouseAccount: boolean;
}

/**
 * Who an article may be attributed to.
 *
 * Every opted-in public author, PLUS the house account whether or not it is
 * opted in — and it deliberately is not. Without that second half there would
 * be no way to move an article BACK to the unattributed house byline once it
 * had been credited to a person, which the I/O matrix requires.
 *
 * Not cached-forever like the reads above: this one is admin-only, changes the
 * moment someone is opted in, and a stale list would silently withhold a
 * just-created author from the picker. A 5-minute TTL plus the tag (busted by
 * the author actions) is the same arrangement `cached-lists.ts` uses for the
 * editor's category and tag vocabularies.
 */
export const listSelectableAuthors = unstable_cache(
  async (): Promise<SelectableAuthor[]> => {
    // Resolved once per call so the SQL and the `isHouseAccount` flag below
    // can never be computed against two different ids.
    const houseAuthorId = resolveHouseAuthorId();
    const rows = await db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        email: profiles.email,
        authorSlug: profiles.authorSlug,
        isPublicAuthor: profiles.isPublicAuthor,
      })
      .from(profiles)
      .where(
        and(
          eq(profiles.role, 'admin'),
          or(
            and(eq(profiles.isPublicAuthor, true), isNotNull(profiles.authorSlug)),
            eq(profiles.id, houseAuthorId),
          ),
        ),
      )
      .orderBy(profiles.firstName, profiles.lastName);

    return rows.map((r) => ({
      id: r.id,
      name: [r.firstName, r.lastName].filter(Boolean).join(' ').trim() || r.email,
      slug: r.authorSlug,
      isPublicAuthor: r.isPublicAuthor,
      isHouseAccount: r.id === houseAuthorId,
    }));
  },
  ['inspire-selectable-authors'],
  { tags: [INSPIRE_AUTHORS_TAG], revalidate: 300 },
);
