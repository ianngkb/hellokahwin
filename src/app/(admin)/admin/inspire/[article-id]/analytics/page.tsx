import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react';
import { eq } from 'drizzle-orm';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { createPanelLimiter } from '@/lib/admin/panel-limiter';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  getArticleDailyViews,
  getArticleTotals,
  getArticleEventBreakdown,
  getArticleScrollDepth,
  getArticleSources,
  getArticleDevices,
  type ArticleDailyPoint,
  type ArticleTotals,
  type ArticleEventRow,
  type ScrollDepthRow,
  type ArticleDimensionRow,
} from '@/lib/analytics/article-views';
import { getArticleSectionDropOff, type SectionDropOff } from '@/lib/analytics/article-sections';
import { getKLToday } from '@/lib/admin/date-range';
import { eachDayOfInterval, format } from 'date-fns';
import { ArticleAnalyticsDashboard } from './dashboard';

export const metadata: Metadata = {
  title: 'Article Analytics - Admin',
};

// Server actions and the analytics fan-out run under this page's budget; the
// broad vercel.json glob caps page routes at 30s and only route-segment config
// lifts it. The reads are all safePanel-guarded at 6s, so this is headroom, not
// an expectation.
export const maxDuration = 60;

interface PageProps {
  params: Promise<{ 'article-id': string }>;
}

/**
 * Fills a continuous daily series from the first day with data to today (KL), so
 * the chart line has no gaps on quiet days. Starts at the earliest recorded
 * view rather than the publish date because analytics only exists from when the
 * pipeline was switched on — zero-filling back to an old publish date would draw
 * a long flat pre-analytics tail that means "no data", not "no views".
 */
function fillDailySeries(points: ArticleDailyPoint[]): ArticleDailyPoint[] {
  if (points.length === 0) return [];
  const byDate = new Map(points.map((p) => [p.date, p]));
  const todayKL = format(getKLToday(), 'yyyy-MM-dd');
  const start = points[0].date;
  const end = todayKL >= start ? todayKL : start;
  return eachDayOfInterval({
    start: new Date(`${start}T00:00:00Z`),
    end: new Date(`${end}T00:00:00Z`),
  }).map((d) => {
    const date = format(d, 'yyyy-MM-dd');
    return byDate.get(date) ?? { date, views: 0, visitors: 0 };
  });
}

export default async function ArticleAnalyticsPage({ params }: PageProps) {
  await requireAdminSection('inspire');

  const { 'article-id': articleId } = await params;
  // A malformed id is a 404, not a 500 from Postgres rejecting the uuid cast.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId))
    notFound();

  const [article] = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      status: articles.status,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      categorySlug: inspireCategories.slug,
    })
    .from(articles)
    .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) notFound();

  const slug = article.slug;

  // Concurrency-capped, each panel guarded — one slow read degrades instead of
  // 500-ing the whole page. The four raw-event panels fall back to `null`, which
  // the dashboard renders as "This panel couldn't load" — never the same box as
  // a genuinely empty result (on 2026-11-07 a timeout here read as "no data" on
  // an article with 21 real visits).
  // At most three reads in flight, counted until each read really settles: a
  // panel past its 6 s deadline shows "couldn't load" but keeps its slot until
  // the database is done, so the next panels never pile on top of it (I-F13;
  // see panel-limiter.ts — `runBatched` released the slot at the deadline).
  const panel = createPanelLimiter(3);
  const [daily, totals, events, scroll, sources, devices, sections] = await Promise.all([
    panel<ArticleDailyPoint[]>('article:daily', () => getArticleDailyViews(slug), []),
    panel<ArticleTotals>('article:totals', () => getArticleTotals(slug), {
      totalViews: 0,
      uniqueVisitors: 0,
    }),
    panel<ArticleEventRow[] | null>('article:events', () => getArticleEventBreakdown(slug), null),
    panel<ScrollDepthRow[] | null>('article:scroll', () => getArticleScrollDepth(slug), null),
    panel<ArticleDimensionRow[] | null>('article:sources', () => getArticleSources(slug), null),
    panel<ArticleDimensionRow[] | null>('article:devices', () => getArticleDevices(slug), null),
    panel<SectionDropOff | null>(
      'article:sections',
      // Resolves the article's current headings itself, from the article's
      // stored content (see article-current-headings.ts).
      () => getArticleSectionDropOff(slug),
      null,
    ),
  ]);

  const liveUrl =
    article.status === 'published' && article.categorySlug && article.slug
      ? `/artikel/${article.categorySlug}/${article.slug}`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={
          <Link
            href="/admin/inspire"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.14em] uppercase"
          >
            <ArrowLeftIcon className="size-3" />
            Admin · Inspire
          </Link>
        }
        title={article.title}
        description="How this article is performing over time."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="quiet">
              <Link href={`/admin/inspire/${article.id}/edit`} prefetch={false}>
                Edit
              </Link>
            </Button>
            {liveUrl && (
              <Button asChild variant="quiet">
                <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="mr-1 size-3.5" />
                  View live
                </a>
              </Button>
            )}
          </div>
        }
      />

      <ArticleAnalyticsDashboard
        daily={fillDailySeries(daily)}
        totals={totals}
        events={events}
        scroll={scroll}
        sources={sources}
        devices={devices}
        sections={sections}
        publishedAt={article.publishedAt?.toISOString() ?? null}
      />
    </div>
  );
}
