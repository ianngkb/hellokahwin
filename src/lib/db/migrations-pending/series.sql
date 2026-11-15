-- series.sql — PENDING, not a drizzle migration yet.
--
-- Article clusters ("series") for /admin/inspire/clusters, ported from The
-- Wedding Notebook's 20261107175319_article_clusters.sql and
-- 20261109181637_article_clusters_series_box.sql, collapsed to their END STATE
-- (HelloKahwin never had the intermediate shape, so the column-by-column ADD
-- and the FK-rename shims are unnecessary).
--
-- The Drizzle schema is src/lib/db/schema/article-clusters.ts. The controller
-- generates the real numbered migration from it at integration; this file is
-- the hand-written equivalent plus the parts drizzle-kit cannot express
-- (RLS, column comments), and is the reference for that review.
--
--   article_clusters         one row per cluster (name, optional unique slug,
--                            the series-box intro/label/switch)
--   article_cluster_members  one row per (cluster, article), ordered by position
--
-- Cascades, both directions:
--   * delete a cluster  → its membership rows go (ON DELETE CASCADE); the
--                         articles are untouched.
--   * delete an article → its membership rows go (ON DELETE CASCADE); the
--                         cluster stays. The admin "delete" is a soft delete
--                         (status = 'deleted'), which fires no cascade; the app
--                         reads hide those members.
--
-- SAFETY: series_enabled is NOT NULL DEFAULT false, so applying this puts
-- nothing on the public site. Both tables are new and empty — no rewrite, no
-- long lock on any existing table (the FK to articles takes a brief SHARE ROW
-- EXCLUSIVE lock on `articles` while it is added; that is metadata-only on an
-- empty referencing table).
--
-- RLS: the same treatment as every other public table in
-- 0001_enable_rls_public_schema.sql and 0005_analytics_events.sql — ENABLE ROW
-- LEVEL SECURITY with NO policies. That closes both tables to Supabase's
-- PostgREST surface (the anon/authenticated roles see nothing), while the app,
-- which connects as the owning `postgres` role, bypasses RLS (FORCE is
-- deliberately not set). This differs from TWN, which adds a RESTRICTIVE
-- deny_all policy plus REVOKE/GRANT; HelloKahwin's convention is "no policies".
--
-- IDEMPOTENT: every statement is IF NOT EXISTS / guarded, so a re-run is a no-op.
--
-- ROLLBACK (safe once the app code that reads these tables is rolled back;
-- this deletes every cluster and membership — there is no other copy):
--   DROP TABLE IF EXISTS public.article_cluster_members;
--   DROP TABLE IF EXISTS public.article_clusters;
-- (Dropping the members table first; the FKs, unique constraints, index and
-- RLS state go with the tables. Nothing in `articles` changes either way.)

CREATE TABLE IF NOT EXISTS public.article_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text CONSTRAINT article_clusters_slug_key UNIQUE,
  description text,
  eyebrow text,
  series_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.article_cluster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK names are the ones drizzle's `.references()` derives
  -- (<table>_<col>_<foreign table>_<foreign col>_fk), so drizzle-kit sees no drift.
  cluster_id uuid NOT NULL
    CONSTRAINT article_cluster_members_cluster_id_article_clusters_id_fk
    REFERENCES public.article_clusters (id) ON DELETE CASCADE,
  article_id uuid NOT NULL
    CONSTRAINT article_cluster_members_article_id_articles_id_fk
    REFERENCES public.articles (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- One article at most once per cluster. The add action relies on this to
  -- turn a duplicate add into "Already in this cluster", not a 500. Its index
  -- leads with cluster_id, so "members of cluster X" is already indexed.
  CONSTRAINT article_cluster_members_unique UNIQUE (cluster_id, article_id)
);

-- Serves the article-side cascade and "which clusters is this article in"
-- (the article editor's Series panel).
CREATE INDEX IF NOT EXISTS article_cluster_members_article_id_idx
  ON public.article_cluster_members (article_id);

-- RLS on, NO policies (see header). Re-running ENABLE is a no-op.
ALTER TABLE public.article_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_cluster_members ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.article_clusters.description IS
  'Plain-text intro shown under the series title in the public Series box. NULL = not written yet; the app refuses to switch the box on without it.';
COMMENT ON COLUMN public.article_clusters.eyebrow IS
  'Optional small label above the series title in the public Series box. NULL = no label line is rendered.';
COMMENT ON COLUMN public.article_clusters.series_enabled IS
  'Whether the Series box is shown to readers on this cluster''s member articles. Default false: no cluster becomes public by deploying.';

-- Post-apply check (expect: 2 tables, rls on, 0 enabled series):
--   SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('article_clusters', 'article_cluster_members');
--   SELECT count(*) FROM public.article_clusters WHERE series_enabled;
