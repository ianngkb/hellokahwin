import 'server-only';
import { and, gte, ilike, lt, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { toUtcRange, type DateRange } from '@/lib/admin/date-range';
import { safePanel } from '@/lib/admin/safe-panel';
import { runBatched } from '@/lib/admin/run-batched';
import { articleDisplayStatus } from '@/components/admin/article-status-chip';
import type { ArticlePeriod } from '@/lib/analytics/article-period';
import {
  getArticleDailySeries,
  getArticleLaunches,
  getArticlePeriodGoogle,
  getArticlePeriodViews,
  getArticleReadThrough,
  getSiteReadThrough,
  toPeriodWindow,
  type DailyPoint,
  type LaunchRow,
  type PeriodGoogle,
  type ReadThrough,
  type SiteReadThrough,
} from '@/lib/analytics/article-performance';
import {
  buildRows,
  pickAttention,
  pickMovers,
  sortRows,
  UNREAD_CANDIDATES,
  type ArticleMeta,
  type AttentionLists,
  type LeaderboardSort,
  type LeaderRow,
} from '@/lib/analytics/article-leaderboard';

export const PAGE_SIZE = 25;

export interface OverviewFilters {
  q: string;
  /** Category slug, or '' for all. */
  category: string;
  /** Only articles that went live during the period. */
  fresh: boolean;
  sort: LeaderboardSort;
  page: number;
}

export interface CategoryOption {
  slug: string;
  name: string;
}

/** Per-panel `null` = that read failed ("This panel couldn't load"). */
export interface OverviewData {
  tiles: {
    views: { cur: number; prev: number } | null;
    readers: { cur: number; prev: number } | null;
    google: { cur: number; prev: number; dailyThrough: string | null } | null;
    readThrough: SiteReadThrough | null;
  };
  /** The period's own days, oldest → newest. */
  daily: DailyPoint[] | null;
  leaderboard: {
    rows: LeaderRow[];
    total: number;
    page: number;
    pageCount: number;
    /** Read-through for the visible rows, by slug. */
    readThrough: Record<string, ReadThrough> | null;
  };
  /** Which metric columns could not load (shown as "—" with a note). */
  failed: {
    /** The article list itself could not load: the table shows "couldn't load". */
    articles: boolean;
    views: boolean;
    google: boolean;
  };
  google: PeriodGoogle | null;
  movers: { risers: LeaderRow[]; fallers: LeaderRow[] } | null;
  launches: Array<LaunchRow & { id: string; title: string }> | null;
  attention: AttentionLists | null;
  categories: CategoryOption[];
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function loadArticles(filters: OverviewFilters, range: DateRange): Promise<ArticleMeta[]> {
  const conds: SQL[] = [];
  if (filters.q) conds.push(ilike(articles.title, `%${escapeLike(filters.q)}%`));
  if (filters.category) {
    conds.push(sql`EXISTS (
      SELECT 1 FROM article_categories ac
      JOIN inspire_categories c ON c.id = ac.category_id
      WHERE ac.article_id = ${articles.id} AND c.slug = ${filters.category}
    )`);
  }
  if (filters.fresh) {
    const { start, endExclusive } = toUtcRange(range);
    conds.push(sql`${articles.status} = 'published'`);
    conds.push(gte(articles.publishedAt, new Date(start)));
    conds.push(lt(articles.publishedAt, new Date(endExclusive)));
  }
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      status: articles.status,
      publishedAt: articles.publishedAt,
      scheduledPublishAt: articles.scheduledPublishAt,
    })
    .from(articles)
    .where(conds.length ? and(...conds) : undefined);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: articleDisplayStatus(r.status, r.scheduledPublishAt),
    publishedAt: r.publishedAt?.toISOString() ?? null,
  }));
}

async function loadCategories(): Promise<CategoryOption[]> {
  const rows = await db
    .select({ slug: inspireCategories.slug, name: inspireCategories.name })
    .from(inspireCategories)
    .orderBy(inspireCategories.name);
  return rows;
}

const sumBy = <T>(xs: readonly T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);

export async function loadOverview(
  period: ArticlePeriod,
  filters: OverviewFilters,
): Promise<OverviewData> {
  const w = toPeriodWindow(period.range, period.prevRange);
  const lifetime = period.key === 'lifetime';

  // Four cached reads, three at a time, each in its own safePanel: one slow
  // metric blanks its own column or tile, never the page.
  const [views, daily, google, siteRead] = await runBatched(
    [
      () => safePanel('articlePerf:views', () => getArticlePeriodViews(w), null),
      () => safePanel('articlePerf:daily', () => getArticleDailySeries(w), null),
      () => safePanel('articlePerf:google', () => getArticlePeriodGoogle(w, lifetime), null),
      () => safePanel('articlePerf:siteRead', () => getSiteReadThrough(w), null),
    ] as const,
    3,
  );

  // Every read on this page is deadline-bound, the plain table reads too: a
  // stalled DB connection once hung the bare article-list read until Vercel
  // killed the page at 60 s (2026-11-12). Now it blanks its panel instead.
  const [articleList, categories, launchesRaw] = await Promise.all([
    safePanel('articlePerf:articles', () => loadArticles(filters, period.range), null),
    safePanel('articlePerf:categories', () => loadCategories(), [] as CategoryOption[]),
    safePanel(
      'articlePerf:launches',
      () => getArticleLaunches(period.range.from, period.range.to),
      null,
    ),
  ]);

  const allRows = buildRows(articleList ?? [], {
    views: new Map(views ?? []),
    google: new Map(google?.rows ?? []),
  });
  // Unpublished articles only when they actually did something in the period.
  const rows = allRows.filter((r) => r.status === 'published' || r.views > 0 || r.impressions > 0);
  const sorted = sortRows(rows, filters.sort);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pageCount);
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Read-through is the one per-article metric that needs raw events, so it is
  // read only for the visible page plus the most-viewed candidates for the
  // "not being read" list — never for the whole catalogue.
  const byViews = sortRows(rows, 'views').slice(0, UNREAD_CANDIDATES);
  const readSlugs = Array.from(new Set([...visible, ...byViews].map((r) => r.slug)));
  const readThrough = await safePanel(
    'articlePerf:readThrough',
    () => getArticleReadThrough(readSlugs, period.range.from, period.range.to),
    null,
  );
  const readMap = new Map(readThrough ?? []);

  // The tiles and chart always describe ALL articles; movers, launches and
  // "needs attention" follow the table's filters, like the table itself.
  const curDays = daily?.filter((d) => d.date >= period.range.from) ?? null;
  // Both bounds of the comparison window: on 12 Nov the running month compares
  // Oct 1–12, and the series also holds Oct 13–31, which must not count.
  const prev = period.prevRange;
  const prevDays =
    daily?.filter((d) => prev !== null && d.date >= prev.from && d.date <= prev.to) ?? null;

  const launchIds = new Map(allRows.map((r) => [r.slug, r]));
  const launches =
    launchesRaw?.flatMap((l) => {
      const a = launchIds.get(l.slug);
      return a ? [{ ...l, id: a.id, title: a.title }] : [];
    }) ?? null;

  return {
    tiles: {
      views:
        curDays && prevDays
          ? { cur: sumBy(curDays, (d) => d.views), prev: sumBy(prevDays, (d) => d.views) }
          : null,
      readers:
        curDays && prevDays
          ? { cur: sumBy(curDays, (d) => d.readers), prev: sumBy(prevDays, (d) => d.readers) }
          : null,
      google: google
        ? {
            cur: sumBy(google.rows, ([, g]) => g.clicks),
            prev: sumBy(google.rows, ([, g]) => g.prevClicks),
            dailyThrough: google.dailyThrough,
          }
        : null,
      readThrough: siteRead,
    },
    daily: curDays,
    leaderboard: {
      rows: visible,
      total: sorted.length,
      page,
      pageCount,
      readThrough: readThrough ? Object.fromEntries(readMap) : null,
    },
    failed: {
      articles: articleList === null,
      views: views === null,
      google: google === null,
    },
    google,
    movers:
      articleList && views && period.prevRange ? pickMovers(rows, period.prevRange.from) : null,
    launches: articleList ? launches : null,
    attention:
      articleList && (views || google)
        ? pickAttention(rows, readThrough ? readMap : new Map(), Boolean(period.prevRange))
        : null,
    categories,
  };
}
