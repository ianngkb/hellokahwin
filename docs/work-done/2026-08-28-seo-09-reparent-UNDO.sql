-- UNDO for SEO-09 — re-parent the legacy articles, 28 Aug 2026.
--
-- SEO-09 is PURELY ADDITIVE: it inserts seven rows into `article_categories`
-- and changes nothing else. No `articles` row is touched, no
-- `primary_category_id` is changed, no URL moves, no redirect row is written.
-- Undo is therefore a DELETE of exactly those seven pairs, not a restore.
--
-- Pre-write census, captured 2026-08-28 from the production pooler
-- (aws-0-ap-southeast-1.pooler.supabase.com:5432, session mode):
--     article_categories total .... 183
--     articles where published .... 86
--     sitemap URL count (live) .... 103
--
-- After the seven inserts: article_categories = 190. Everything else unchanged.
--
-- Addressed by (article.slug, inspire_categories.slug) rather than by row id so
-- that it stays correct if the rows are re-created; the unique constraint
-- `article_categories_unique` guarantees one row per pair.
--
-- Other sessions are writing this database concurrently (RISK-08 in a sibling
-- worktree). Nothing below touches a row outside the seven pairs listed.

BEGIN;

DELETE FROM article_categories ac
USING articles a, inspire_categories c
WHERE ac.article_id = a.id
  AND ac.category_id = c.id
  AND (a.slug, c.slug) IN (
    ('cara-buat-kad-kahwin-digital', 'kad-kahwin-jemputan'),               -- C5.2 → P5
    ('goodies-kahwin',               'doorgift-bunga-telur-hadiah'),       -- C5.4 → P5
    ('hadiah-untuk-pengantin',       'doorgift-bunga-telur-hadiah'),       -- C5.4 → P5
    ('pelamin-kahwin-dewan',         'pelamin-idea'),                      -- C5.1 → P5
    ('kursus-kahwin',                'kursus-kahwin-saringan-pra-nikah'),  -- C1.3 → P1
    ('dewan-kahwin',                 'dewan-venue-majlis'),                -- C6.1 → P6
    ('garden-wedding',               'dewan-venue-majlis')                 -- C6.1 → P6
  );

-- Expect 183.
SELECT count(*) AS article_categories_total FROM article_categories;

COMMIT;

-- After running this, the caches must be dropped in this order or the site
-- keeps serving the pillar links for up to an hour:
--   1. POST https://hellokahwin.com/api/cron/revalidate-content  (Bearer CRON_SECRET)
--   2. POST https://api.vercel.com/v1/edge-cache/dangerously-delete-by-tags
--      with the nineteen paths in `2026-08-28-seo-09-reparent-EVIDENCE/purge-paths.txt`
