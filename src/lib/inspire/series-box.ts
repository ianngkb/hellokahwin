/**
 * The "Dalam siri ini" box: which items it lists, in what order, and whether
 * it renders at all. Pure, so every state is unit-tested without a database.
 *
 * Inputs are data the article page ALREADY loads — the pillar up-link (which
 * carries the cluster's series settings) and the cluster siblings (which feed
 * the related grid). The box costs no extra query, so it cannot add a read to
 * the page's deadline budget.
 */

/** Siblings listed, not counting the current article. */
export const SERIES_BOX_MAX_SIBLINGS = 8;

export interface SeriesBoxLinkInput {
  slug: string;
  anchor: string;
  cluster: {
    anchor: string;
    seriesEnabled?: boolean | null;
    seriesDescription?: string | null;
  } | null;
}

export interface SeriesBoxSibling {
  title: string;
  slug: string;
  categorySlug: string | null;
  publishedAt: Date | string | null;
}

export interface SeriesBoxItem {
  key: string;
  title: string;
  /** `null` for the current article: marked, never linked. */
  href: string | null;
  current: boolean;
}

export interface SeriesBoxModel {
  title: string;
  description: string | null;
  items: SeriesBoxItem[];
  pillarHref: string;
  pillarAnchor: string;
}

function time(d: Date | string | null | undefined): number {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function buildSeriesBox(
  link: SeriesBoxLinkInput | null | undefined,
  current: { title: string; slug: string; publishedAt: Date | string | null },
  siblings: readonly SeriesBoxSibling[],
): SeriesBoxModel | null {
  const cluster = link?.cluster;
  if (!link || !cluster || cluster.seriesEnabled !== true) return null;

  // A sibling without a primary category has no canonical URL; skip it rather
  // than link to /artikel/null/…, the same guard the pillar view applies.
  const linked = siblings
    .filter((s) => s.categorySlug && s.slug !== current.slug)
    .slice(0, SERIES_BOX_MAX_SIBLINGS);
  // "At least one other live article" — a box listing only the article you
  // are reading is noise.
  if (linked.length === 0) return null;

  const items: SeriesBoxItem[] = linked.map((s) => ({
    key: s.slug,
    title: s.title,
    href: `/artikel/${s.categorySlug}/${s.slug}`,
    current: false,
  }));

  // Newest first, matching the siblings query; the current article slots in by
  // its own publish date (an unpublished preview goes first).
  const currentTime = time(current.publishedAt) || Number.MAX_SAFE_INTEGER;
  let at = linked.findIndex((s) => time(s.publishedAt) < currentTime);
  if (at === -1) at = linked.length;
  items.splice(at, 0, { key: current.slug, title: current.title, href: null, current: true });

  const description = cluster.seriesDescription?.trim();
  return {
    title: cluster.anchor,
    description: description ? description : null,
    items,
    pillarHref: `/artikel/${link.slug}`,
    pillarAnchor: link.anchor,
  };
}
