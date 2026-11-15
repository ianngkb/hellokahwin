-- migrations-pending/analytics.sql — article analytics + Search Console sync
-- (Inspire admin port, Phases 4 / 4b). APPLIED BY HAND AT SHIP, not by drizzle.
--
-- What drizzle-kit generates from the schema (src/lib/db/schema/*) and what
-- lives here:
--
--   drizzle (generate at ship, from schema TS):
--     - gsc_pages, gsc_page_daily              (schema/gsc.ts)
--     - article_title_tests                     (schema/article-title-tests.ts)
--     - idx_analytics_events_artikel_pageview  (schema/analytics-events.ts)
--
--   this file (non-drizzle, idempotent, safe to re-run):
--     1. the analytics_events index built CONCURRENTLY, so a busy production
--        table is never write-locked while it builds;
--     2. RLS on the new tables, with NO policies, exactly as
--        0001_enable_rls_public_schema.sql / 0005 do for every other table.
--
-- ORDER AT SHIP:
--   a. Run section 1 FIRST (outside a transaction — CONCURRENTLY refuses to run
--      inside one).
--   b. Generate + apply the drizzle migration. drizzle-kit emits a plain
--      `CREATE INDEX "idx_analytics_events_artikel_pageview" …` that would fail
--      on the index section 1 already built: edit that one line in the generated
--      SQL to `CREATE INDEX IF NOT EXISTS …` (or delete it) before applying.
--   c. Run section 2 (the tables must exist first).
--
-- Nothing here touches existing rows. No backfill.

-- ── 1. Article pageview index (run first, outside a transaction) ───────────
--
-- Every article-analytics read of "human pageviews of /artikel/{cat}/{slug}"
-- repeats this predicate verbatim (ARTIKEL_PATH_SCOPE in
-- src/lib/analytics/article-views.ts), so the planner can answer it from this
-- partial index alone (pathname, created_at, visitor_hash, session_id) instead
-- of walking the heap. Pathname is byte-capped at 1,000 by /collect
-- (src/lib/analytics/utf8-cap.ts), keeping every entry under the btree limit.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_analytics_events_artikel_pageview"
  ON "analytics_events" USING btree ("pathname", "created_at", "visitor_hash", "session_id")
  WHERE event_name = 'pageview' AND is_bot = FALSE AND pathname LIKE '/artikel/%';

-- If a CONCURRENTLY build is interrupted it leaves an INVALID index behind,
-- which IF NOT EXISTS then skips. Check, and if `indisvalid` is false, drop it
-- (DROP INDEX CONCURRENTLY "idx_analytics_events_artikel_pageview";) and re-run:
--   SELECT indisvalid FROM pg_index
--   WHERE indexrelid = 'idx_analytics_events_artikel_pageview'::regclass;

-- ── 2. RLS on the new tables (after the drizzle migration) ─────────────────
--
-- On, with NO policies: closes them to Supabase's public PostgREST surface
-- while the app (the `postgres` owner role) keeps full access. See 0001.

ALTER TABLE "gsc_pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gsc_page_daily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "article_title_tests" ENABLE ROW LEVEL SECURITY;

-- article_title_tests must carry the partial unique index the start action
-- relies on (one running test per article). drizzle generates it from the
-- schema; this repeats it idempotently in case the generated SQL is edited.
CREATE UNIQUE INDEX IF NOT EXISTS "article_title_tests_one_running_idx"
  ON "article_title_tests" ("article_id") WHERE "ended_at" IS NULL;

-- ── ROLLBACK ───────────────────────────────────────────────────────────────
--
-- The code reads these objects only through safePanel-guarded panels, so
-- rolling the deploy back first and the database second is safe in either
-- order; a missing table shows "This panel couldn't load", never a 500.
--
--   DROP INDEX CONCURRENTLY IF EXISTS "idx_analytics_events_artikel_pageview";
--   DROP TABLE IF EXISTS "article_title_tests";  -- loses the test history only;
--                                                 -- the live meta titles stay
--   DROP TABLE IF EXISTS "gsc_page_daily";   -- data is re-fetchable from Google
--   DROP TABLE IF EXISTS "gsc_pages";
--
-- Also remove the `crons` entry from vercel.json (the nightly /api/cron/gsc-sync)
-- if the tables go: the route would otherwise fail every night.
--
-- (Dropping a table drops its RLS setting with it.) analytics_events itself is
-- unchanged apart from the index, and keeps every row it collected.
