import { inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles } from '@/lib/db/schema/articles';
import { EmptyState } from '@/components/ui/empty-state';
import { Panel, PanelFailed } from '@/components/admin/analytics-panels';
import { safePanel } from '@/lib/admin/safe-panel';
import { articleDisplayStatus } from '@/components/admin/article-status-chip';
import { getArticlesCompare } from '@/lib/analytics/article-compare';
import { capMessage, MAX_COMPARE_ARTICLES } from '@/lib/analytics/compare-limits';
import { parseCompareIds } from './compare-params';
import { ComparePicker } from './compare-picker';
import { CompareDashboard, type CompareArticle, type ComparePanelsData } from './compare-dashboard';

/** A Map from the getters as a plain record (crosses the server → client boundary). */
function toRecord<T>(map: Map<string, T> | null): Record<string, T> | null {
  return map === null ? null : Object.fromEntries(map);
}

/** The Compare tab: up to MAX_COMPARE_ARTICLES articles side by side. */
export async function CompareView({ ids }: { ids: string | string[] | undefined }) {
  // Capped at MAX_COMPARE_ARTICLES HERE, before any getter runs: past six the
  // comparison getters throw a RangeError, and safePanel re-throws non-transient
  // errors, so a seventh id in a hand-edited URL would 500 the page.
  const parsed = parseCompareIds(ids);

  // Deadline-bound like every other read here: a stalled connection must blank
  // the comparison, not hang the page to Vercel's 60 s kill.
  const rows: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    publishedAt: Date | null;
    scheduledPublishAt: Date | null;
  }> | null =
    parsed.ids.length === 0
      ? []
      : await safePanel(
          'articleCompare:articles',
          () =>
            db
              .select({
                id: articles.id,
                slug: articles.slug,
                title: articles.title,
                status: articles.status,
                publishedAt: articles.publishedAt,
                scheduledPublishAt: articles.scheduledPublishAt,
              })
              .from(articles)
              .where(inArray(articles.id, parsed.ids)),
          null,
        );
  if (rows === null) {
    return (
      <Panel>
        <PanelFailed />
      </Panel>
    );
  }

  // URL order is the column (and colour) order; unknown ids are skipped.
  const byId = new Map(rows.map((r) => [r.id, r]));
  const selected: CompareArticle[] = parsed.ids.flatMap((id) => {
    const r = byId.get(id);
    return r
      ? [
          {
            id: r.id,
            slug: r.slug,
            title: r.title,
            status: articleDisplayStatus(r.status, r.scheduledPublishAt),
            publishedAt: r.publishedAt?.toISOString() ?? null,
          },
        ]
      : [];
  });
  const skipped = parsed.malformed + (parsed.ids.length - selected.length);

  // One cached statement per metric for all picked articles, each in its own
  // safePanel(…, null) inside runBatched(…, 3) — see getArticlesCompare. A
  // `null` metric renders "This panel couldn't load"; nothing runs when empty.
  let panels: ComparePanelsData | null = null;
  if (selected.length > 0) {
    const read = await getArticlesCompare(selected.map((a) => a.slug));
    panels = {
      totals: toRecord(read.totals),
      scroll: toRecord(read.scroll),
      dropOff: toRecord(read.dropOff),
      sources: toRecord(read.sources),
      devices: toRecord(read.devices),
    };
  }

  return (
    <>
      <p className="text-muted-foreground -mt-2 text-sm">
        Compare up to {MAX_COMPARE_ARTICLES} articles side by side: views, how far people read,
        where they stopped, where they came from and which devices they used.
      </p>

      <ComparePicker
        selected={selected.map((a) => ({ id: a.id, title: a.title, status: a.status }))}
      />

      {(parsed.overCap > 0 || skipped > 0) && (
        <div className="text-muted-foreground -mt-3 flex flex-col gap-1 text-xs" role="status">
          {parsed.overCap > 0 && (
            <p>
              {capMessage(MAX_COMPARE_ARTICLES)} — only the first {MAX_COMPARE_ARTICLES} in the link
              were used.
            </p>
          )}
          {skipped > 0 && (
            <p>
              {skipped === 1
                ? '1 article in the link could not be found and was skipped.'
                : `${skipped} articles in the link could not be found and were skipped.`}
            </p>
          )}
        </div>
      )}

      {selected.length === 0 || panels === null ? (
        <Panel className="p-6">
          <EmptyState
            title="Pick two or more articles to compare"
            description="Search for articles by title above. Their numbers appear here side by side."
          />
        </Panel>
      ) : (
        <>
          {selected.length === 1 && (
            <p className="text-muted-foreground -mt-3 text-xs">
              Add another article to see them side by side.
            </p>
          )}
          <CompareDashboard articles={selected} panels={panels} />
        </>
      )}
    </>
  );
}
