import { inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories, inspireTags } from '@/lib/db/schema/articles';
import { profiles } from '@/lib/db/schema/profiles';
import { authorDisplayName } from '@/lib/authors/gate';

/**
 * Resolves analytics `pathname`s (e.g. `/artikel/pakaian/baju-nikah`) into
 * human-readable page titles for the admin site-analytics panels and page
 * search. Titles are display-only — the raw pathname remains the filter value.
 *
 * Static routes come from a fixed map (in the site's own Malay labels);
 * dynamic content routes are resolved by slug against the relevant table.
 * Lookups are batched (one query per content type) via `inArray` — never
 * `= ANY(array)`, which trips a Drizzle array-binding bug (22P02).
 * Unresolvable pathnames are simply absent from the returned map, and callers
 * fall back to showing the raw path.
 */

const STATIC_ROUTE_TITLES: Record<string, string> = {
  '/': 'Laman Utama',
  '/artikel': 'Semua Artikel',
  '/brand': 'Brand',
};

// Second segments under `/artikel` that are route prefixes, not categories.
const ARTIKEL_RESERVED = new Set(['tag', 'author']);

type Kind = 'article' | 'category' | 'tag' | 'author';

/** Strip query string, hash, and trailing slashes; `''` collapses to `/`. */
export function normalizePathname(pathname: string): string {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

/**
 * Classify a pathname into the content lookup it needs, or `null` when it is a
 * static/unknown route (handled by the static map or left unresolved).
 */
export function classifyPathname(pathname: string): { kind: Kind; slug: string } | null {
  const segs = normalizePathname(pathname).split('/').filter(Boolean);
  if (segs[0] !== 'artikel') return null;

  // /artikel/tag/{slug}, /artikel/author/{slug}
  if (segs[1] === 'tag') return segs.length === 3 ? { kind: 'tag', slug: segs[2] } : null;
  if (segs[1] === 'author') return segs.length === 3 ? { kind: 'author', slug: segs[2] } : null;

  // /artikel/{category}/{article}
  if (segs.length === 3) return { kind: 'article', slug: segs[2] };
  // /artikel/{category}
  if (segs.length === 2 && !ARTIKEL_RESERVED.has(segs[1])) {
    return { kind: 'category', slug: segs[1] };
  }

  return null;
}

function applyLookup(
  slugToPaths: Map<string, string[]>,
  rows: Array<{ slug: string | null; title: string }>,
  out: Map<string, string>,
): void {
  const titleBySlug = new Map(rows.map((r) => [r.slug, r.title]));
  for (const [slug, paths] of slugToPaths) {
    const title = titleBySlug.get(slug);
    if (!title) continue;
    for (const p of paths) out.set(p, title);
  }
}

export async function resolvePageTitles(pathnames: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (pathnames.length === 0) return result;

  const byKind: Record<Kind, Map<string, string[]>> = {
    article: new Map(),
    category: new Map(),
    tag: new Map(),
    author: new Map(),
  };

  for (const pathname of pathnames) {
    const staticTitle = STATIC_ROUTE_TITLES[normalizePathname(pathname)];
    if (staticTitle) {
      result.set(pathname, staticTitle);
      continue;
    }
    const c = classifyPathname(pathname);
    if (!c) continue;
    const slugMap = byKind[c.kind];
    slugMap.set(c.slug, [...(slugMap.get(c.slug) ?? []), pathname]);
  }

  const jobs: Array<Promise<void>> = [];
  const jobKinds: Kind[] = [];

  if (byKind.article.size > 0) {
    jobKinds.push('article');
    jobs.push(
      db
        .select({ slug: articles.slug, title: articles.title })
        .from(articles)
        .where(inArray(articles.slug, [...byKind.article.keys()]))
        .then((rows) => applyLookup(byKind.article, rows, result)),
    );
  }
  if (byKind.category.size > 0) {
    jobKinds.push('category');
    jobs.push(
      db
        .select({ slug: inspireCategories.slug, title: inspireCategories.name })
        .from(inspireCategories)
        .where(inArray(inspireCategories.slug, [...byKind.category.keys()]))
        .then((rows) => applyLookup(byKind.category, rows, result)),
    );
  }
  if (byKind.tag.size > 0) {
    jobKinds.push('tag');
    jobs.push(
      db
        .select({ slug: inspireTags.slug, title: inspireTags.name })
        .from(inspireTags)
        .where(inArray(inspireTags.slug, [...byKind.tag.keys()]))
        .then((rows) => applyLookup(byKind.tag, rows, result)),
    );
  }
  if (byKind.author.size > 0) {
    jobKinds.push('author');
    jobs.push(
      db
        .select({
          slug: profiles.authorSlug,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
        })
        .from(profiles)
        .where(inArray(profiles.authorSlug, [...byKind.author.keys()]))
        .then((rows) =>
          applyLookup(
            byKind.author,
            rows.map((r) => ({ slug: r.slug, title: authorDisplayName(r) })),
            result,
          ),
        ),
    );
  }

  // allSettled (not all): a single failing lookup (e.g. statement timeout on one
  // content type) must not throw away the titles that did resolve.
  // Unresolved pathnames simply fall back to the raw path.
  // Each failure is logged, so a broken lookup shows up in the logs instead of
  // silently reading as "no title".
  const settled = await Promise.allSettled(jobs);
  settled.forEach((outcome, i) => {
    if (outcome.status === 'rejected') {
      console.warn('[analytics-titles]', jobKinds[i], outcome.reason);
    }
  });
  return result;
}

/** Convenience wrapper for resolving a single pathname (e.g. the active filter). */
export async function resolvePageTitle(pathname: string): Promise<string | null> {
  const map = await resolvePageTitles([pathname]);
  return map.get(pathname) ?? null;
}
