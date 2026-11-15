# Ship runbook: Inspire admin database changes (version history, clusters, analytics, title tests)

HelloKahwin has one database, and it is production. Migrations are applied by
hand at ship time (`docs/verify.md`). Apply these **before** the code that uses
them is deployed, in this order. Every step is safe to re-run.

| #   | File                                                                   | Transaction                                                               | What it does                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `analytics.sql`, the `CREATE INDEX CONCURRENTLY` statement only        | **No.** Run it on its own; `CONCURRENTLY` cannot run inside a transaction | Builds the `/artikel` pageview index on `analytics_events` without locking writes                                                                                                                                          |
| 2   | `../migrations/0006_inspire_admin_versions_clusters_gsc.sql` (drizzle) | Yes                                                                       | Creates `article_versions`, `article_clusters`, `article_cluster_members`, `gsc_pages`, `gsc_page_daily`, `article_title_tests`, their keys and indexes. Its copy of the step-1 index is `IF NOT EXISTS`, so it is a no-op |
| 3   | `versions.sql`                                                         | Yes (its own `BEGIN`/`COMMIT`)                                            | RLS on `article_versions`, the `article_version_capture()` function, one baseline version per article, and the two deferred triggers on `articles`                                                                         |
| 4   | `series.sql`                                                           | Yes                                                                       | RLS on the two cluster tables. Its `CREATE TABLE/INDEX IF NOT EXISTS` statements are no-ops after step 2                                                                                                                   |
| 5   | `analytics.sql`, everything after the index                            | Yes                                                                       | RLS on `gsc_pages`, `gsc_page_daily`, `article_title_tests`                                                                                                                                                                |

Then record `0006` in drizzle's migration history the way previous ships did
(see the run log's drizzle-history caveat).

## Before deploying the code

- `CRON_SECRET` must exist in Vercel, and the Search Console service account
  must have access to the property, or the nightly `/api/cron/gsc-sync` fails.
- Set the tracking start constants (`SCROLL_TRACKING_SINCE`,
  `LINK_CLICKS_SINCE`, `SERIES_BOX_SINCE`, `SECTION_TRACKING_SINCE`) to the real
  deploy date if it is not 2026-11-16.

## Rollback

Each file carries its own rollback notes. In short:

- Stop version capture at once (saves are never affected either way):
  `DROP TRIGGER IF EXISTS trg_article_version_capture ON articles;`
  `DROP TRIGGER IF EXISTS trg_article_version_capture_insert ON articles;`
  `DROP FUNCTION IF EXISTS article_version_capture();`
- Remove the new tables (deletes only their own data; `articles` is untouched):
  `DROP TABLE IF EXISTS article_title_tests, gsc_page_daily, gsc_pages, article_cluster_members, article_clusters, article_versions;`
- `DROP INDEX CONCURRENTLY IF EXISTS idx_analytics_events_artikel_pageview;`
