/**
 * Pure ordering logic for the /admin/inspire view-column sort (Total / Last 7
 * days / Last 30 days).
 *
 * Kept in its own module (no `server-only`, no DB) so the client table can
 * share the key/dir types and the unit tests can exercise the ordering without
 * a database. The page loads the metrics and the filtered article list; this
 * only decides the order.
 *
 * WHY SORT IN JS AND NOT SQL: the metrics live in the analytics rollup keyed by
 * URL slug, the list lives in `articles`. Joining them in one statement would
 * tie the article list to the heavy analytics scan and lose the `safePanel`
 * degrade (a slow analytics read must fall back to the default order, not 500
 * the list). The filtered set is a few thousand tiny rows, so sort + slice in
 * memory is cheap.
 */

export type ViewSortKey = 'views' | 'week' | 'month';
export type ViewSortDir = 'asc' | 'desc';
export interface ViewSort {
  key: ViewSortKey;
  dir: ViewSortDir;
}

const SORT_KEYS: readonly ViewSortKey[] = ['views', 'week', 'month'];

/**
 * Read `?sort=` / `?dir=` from the URL. An unknown sort means "no view sort"
 * (default newest-first order); an unknown dir falls back to `desc`, which is
 * what an editor asking "what's performing?" wants first.
 */
export function parseViewSort(sort?: string, dir?: string): ViewSort | null {
  if (!sort || !(SORT_KEYS as readonly string[]).includes(sort)) return null;
  return { key: sort as ViewSortKey, dir: dir === 'asc' ? 'asc' : 'desc' };
}

/** Structural subset of `ArticleViewMetrics` — avoids importing a server-only module. */
interface ViewMetricsLike {
  totalViews: number;
  wow: { current: number };
  mom: { current: number };
}

export interface SortableArticle {
  id: string;
  slug: string;
  createdAt: Date | string;
}

function metricFor(m: ViewMetricsLike | undefined, key: ViewSortKey): number {
  if (!m) return 0; // never viewed counts as zero, so ascending lists it first
  if (key === 'views') return m.totalViews;
  if (key === 'week') return m.wow.current;
  return m.mom.current;
}

/**
 * Article ids ordered by the chosen view number. The period sorts rank by the
 * period's view COUNT, not its % growth (a 2 → 6 article is not "hotter" than a
 * 900 → 1,000 one). Ties break by newest `createdAt` first REGARDLESS of `dir`
 * — flipping the direction should reverse the ranking, not re-shuffle equal
 * rows — then by id so the order is fully stable across page loads (pagination
 * slices this list, so an unstable order would repeat or skip articles).
 */
export function sortByViews(
  rows: readonly SortableArticle[],
  metrics: ReadonlyMap<string, ViewMetricsLike>,
  key: ViewSortKey,
  dir: ViewSortDir,
): string[] {
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((r) => ({
      id: r.id,
      value: metricFor(metrics.get(r.slug), key),
      created: new Date(r.createdAt).getTime(),
    }))
    .sort((a, b) => {
      if (a.value !== b.value) return sign * (a.value - b.value);
      if (a.created !== b.created) return b.created - a.created;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .map((r) => r.id);
}
