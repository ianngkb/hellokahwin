-- Enable Row Level Security on every table in `public`, with NO policies.
--
-- WHY THIS IS NOT OPTIONAL: Supabase auto-exposes the `public` schema through
-- PostgREST at https://<ref>.supabase.co/rest/v1/. The `anon` key that reaches
-- it is public by design — it ships in browser code. With RLS disabled, any
-- holder of that key can read AND write every row in these tables. Verified on
-- 2026-08-22: `GET /rest/v1/profiles?select=id,email` returned 200 with a body
-- (empty only because the table had no rows yet), not a permission error.
--
-- NO POLICIES IS THE POINT. RLS with zero policies denies everything to `anon`
-- and `authenticated`. This app never uses PostgREST or the anon key: it talks
-- to Postgres directly via the transaction pooler as the `postgres` role
-- (src/lib/db/drizzle.ts), and a table's OWNER bypasses RLS unless FORCE ROW
-- LEVEL SECURITY is set — which it deliberately is not. So the app keeps full
-- access and the public REST surface is closed.
--
-- If a future feature genuinely needs anon reads (e.g. serving published
-- articles straight from PostgREST), add an explicit, column-scoped policy for
-- that ONE table rather than disabling RLS.

ALTER TABLE "admin_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "article_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "article_category_redirects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "article_edit_locks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "article_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dynamic_block_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dynamic_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspire_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspire_nav_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspire_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "legacy_image_redirects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media_article_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "redirects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "seo_indexnow_submissions" ENABLE ROW LEVEL SECURITY;
