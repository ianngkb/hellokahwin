import 'server-only';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles } from '@/lib/db/schema/articles';
import { articleTitleTests } from '@/lib/db/schema/article-title-tests';
import { safePanel } from '@/lib/admin/safe-panel';
import { googleTitleOf } from './title-test-title';
import {
  sideStats,
  titleTestVerdict,
  titleTestWindows,
  type GoogleSide,
  type SideStats,
  type TitleTestVerdict,
  type TitleTestWindows,
} from '@/lib/analytics/title-test-math';

export { googleTitleOf };

export interface TitleTestResult {
  id: string;
  articleId: string;
  articleTitle: string;
  oldTitle: string;
  newTitle: string;
  startedAt: Date;
  endedAt: Date | null;
  windows: TitleTestWindows;
  /** null = the Google read failed (shown as "couldn't load", never as zero). */
  google: { before: SideStats; after: SideStats; verdict: TitleTestVerdict } | null;
}

export interface TitleTestsData {
  /** null = the list itself could not be read. */
  tests: TitleTestResult[] | null;
  /** Last day Google has reported (it lags 2–3 days). */
  dailyThrough: string | null;
}

const ZERO: GoogleSide = { clicks: 0, impressions: 0, positionSum: 0 };

async function readGoogleSides(
  articleId: string,
  w: TitleTestWindows,
): Promise<{ before: GoogleSide; after: GoogleSide }> {
  if (!w.before || !w.after) return { before: ZERO, after: ZERO };
  const inRange = (r: { from: string; to: string }) =>
    sql`d.date BETWEEN ${r.from}::text::date AND ${r.to}::text::date`;
  const [row] = await db.execute<{
    b_clicks: number;
    b_impr: number;
    b_pos: number;
    a_clicks: number;
    a_impr: number;
    a_pos: number;
  }>(sql`
    SELECT
      COALESCE(SUM(d.clicks) FILTER (WHERE ${inRange(w.before)}), 0)::int AS b_clicks,
      COALESCE(SUM(d.impressions) FILTER (WHERE ${inRange(w.before)}), 0)::int AS b_impr,
      COALESCE(SUM(d.position_sum) FILTER (WHERE ${inRange(w.before)}), 0)::float8 AS b_pos,
      COALESCE(SUM(d.clicks) FILTER (WHERE ${inRange(w.after)}), 0)::int AS a_clicks,
      COALESCE(SUM(d.impressions) FILTER (WHERE ${inRange(w.after)}), 0)::int AS a_impr,
      COALESCE(SUM(d.position_sum) FILTER (WHERE ${inRange(w.after)}), 0)::float8 AS a_pos
    FROM gsc_page_daily d
    JOIN gsc_pages p ON p.id = d.page_id
    WHERE p.article_id = ${articleId}::uuid
      AND d.date BETWEEN ${w.before.from}::text::date AND ${w.after.to}::text::date
  `);
  return {
    before: {
      clicks: Number(row?.b_clicks ?? 0),
      impressions: Number(row?.b_impr ?? 0),
      positionSum: Number(row?.b_pos ?? 0),
    },
    after: {
      clicks: Number(row?.a_clicks ?? 0),
      impressions: Number(row?.a_impr ?? 0),
      positionSum: Number(row?.a_pos ?? 0),
    },
  };
}

export async function loadTitleTests(): Promise<TitleTestsData> {
  const [list, through] = await Promise.all([
    safePanel(
      'titleTests:list',
      () =>
        db
          .select({
            id: articleTitleTests.id,
            articleId: articleTitleTests.articleId,
            articleTitle: articles.title,
            oldTitle: articleTitleTests.oldTitle,
            newTitle: articleTitleTests.newTitle,
            startedAt: articleTitleTests.startedAt,
            endedAt: articleTitleTests.endedAt,
          })
          .from(articleTitleTests)
          .innerJoin(articles, eq(articles.id, articleTitleTests.articleId))
          .orderBy(desc(articleTitleTests.startedAt))
          .limit(50),
      null,
    ),
    safePanel(
      'titleTests:dailyThrough',
      async () => {
        const [r] = await db.execute<{ d: string | null }>(
          sql`SELECT MAX(date)::text AS d FROM gsc_page_daily`,
        );
        return r?.d ?? null;
      },
      null,
    ),
  ]);
  if (!list) return { tests: null, dailyThrough: through };

  const tests = await Promise.all(
    list.map(async (t): Promise<TitleTestResult> => {
      const windows = titleTestWindows(t.startedAt, t.endedAt, through);
      const sides = await safePanel(
        `titleTests:google:${t.id}`,
        () => readGoogleSides(t.articleId, windows),
        null,
      );
      let google: TitleTestResult['google'] = null;
      if (sides) {
        const before = sideStats(sides.before);
        const after = sideStats(sides.after);
        google = { before, after, verdict: titleTestVerdict(windows.days, before, after) };
      }
      return { ...t, windows, google };
    }),
  );
  return { tests, dailyThrough: through };
}

export interface TitleTestCandidate {
  id: string;
  title: string;
  status: string;
  googleTitle: string;
  /** A test already running on this article (one at a time). */
  runningTestId: string | null;
}

/** The article a "Start a title test" link points at, or null if it is gone. */
export async function loadTitleTestCandidate(
  articleId: string,
): Promise<TitleTestCandidate | null> {
  if (!/^[0-9a-f-]{36}$/i.test(articleId)) return null;
  return safePanel(
    'titleTests:candidate',
    async () => {
      const [a] = await db
        .select({
          id: articles.id,
          title: articles.title,
          metaTitle: articles.metaTitle,
          status: articles.status,
          runningTestId: sql<string | null>`(
            SELECT t.id::text FROM article_title_tests t
            WHERE t.article_id = ${articles.id} AND t.ended_at IS NULL LIMIT 1
          )`,
        })
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);
      if (!a) return null;
      return {
        id: a.id,
        title: a.title,
        status: a.status,
        googleTitle: googleTitleOf(a),
        runningTestId: a.runningTestId,
      };
    },
    null,
  );
}
