# Ship runbook: Inspire admin database changes (version history, clusters, analytics, title tests)

HelloKahwin has one database, and it is production. Migrations are applied by
hand at ship time (`docs/verify.md`). Apply these **before** the code that uses
them is deployed, in this order.

**Re-running:** steps 1, 3, 4 and 5 are safe to re-run (`IF NOT EXISTS`,
`CREATE OR REPLACE`, `DROP … IF EXISTS`, `WHERE NOT EXISTS`). **Step 2 is
NOT** — `0006` is drizzle-generated plain `CREATE TABLE` / `ADD CONSTRAINT` /
`CREATE INDEX`, so a second run fails on "already exists". That is why step 2
applies `0006` and records it in drizzle's history **in one transaction**, and
why it starts with a check that skips it once it has been done. If a later step
fails, fix it and re-run **from that step**; never re-run step 2 by hand.

| #   | File                                                                   | Transaction                                                               | What it does                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `analytics.sql`, the `CREATE INDEX CONCURRENTLY` statement only        | **No.** Run it on its own; `CONCURRENTLY` cannot run inside a transaction | Builds the `/artikel` pageview index on `analytics_events` without locking writes                                                                                                                                                                             |
| 2   | `../migrations/0006_inspire_admin_versions_clusters_gsc.sql` (drizzle) | **Yes — one transaction that also records it** (see "Step 2" below)       | Creates `article_versions`, `article_clusters`, `article_cluster_members`, `gsc_pages`, `gsc_page_daily`, `article_title_tests`, their keys and indexes. Its copy of the step-1 index is `IF NOT EXISTS`, so it is a no-op. **Not re-runnable; skip-checked** |
| 3   | `versions.sql`                                                         | Yes (its own `BEGIN`/`COMMIT`)                                            | RLS on `article_versions`, the `article_version_capture()` function, one baseline version per article, and the two deferred triggers on `articles`                                                                                                            |
| 4   | `series.sql`                                                           | Yes                                                                       | RLS on the two cluster tables. Its `CREATE TABLE/INDEX IF NOT EXISTS` statements are no-ops after step 2                                                                                                                                                      |
| 5   | `analytics.sql`, everything after the index                            | Yes                                                                       | RLS on `gsc_pages`, `gsc_page_daily`, `article_title_tests`                                                                                                                                                                                                   |

## Step 2 — apply `0006` and record it, atomically

Drizzle records a migration as one row in `drizzle.__drizzle_migrations`:
`hash` = sha256 of the `.sql` file, `created_at` = the journal's `when`
(`node_modules/drizzle-orm/pg-core/dialect.js`, `migrate()`). `drizzle-kit
migrate` — the `pnpm db:migrate` that 0005 shipped with — writes that row in the
same transaction as the migration. For `0006`:

- `when` (`meta/_journal.json`, idx 6): `1794758324000`
- `hash`: `98ddb02dd6b9ba79df2ed2375d3482af6385daeef3c4c2d3e2fcff2b4550956f`
  (`sha256sum src/lib/db/migrations/0006_inspire_admin_versions_clusters_gsc.sql`;
  pinned by `src/lib/db/__tests__/ship-runbook.test.ts`)

**2a. Check first (read-only):**

```sql
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 3;
SELECT to_regclass('public.article_versions') AS article_versions;
```

- A row with `created_at = 1794758324000` exists → **0006 is done. Skip step 2.**
- No such row but `article_versions` is NOT null → 0006 was applied outside this
  runbook. Do **not** re-run it; record it only:
  `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('98ddb02dd6b9ba79df2ed2375d3482af6385daeef3c4c2d3e2fcff2b4550956f', 1794758324000);`
  — after confirming all six tables exist.
- Neither → go to 2b.

**2b. Apply.** Pick by what the newest history row is:

- Newest `created_at` is `1793326039600` (0005) → `pnpm db:migrate`. It applies
  only 0006 and records it in one transaction; any failure rolls both back.
- Anything else (history behind 0005, i.e. some earlier migration was applied
  by hand and never recorded) → **do NOT run `pnpm db:migrate`**: it would try
  to re-apply those earlier migrations. Apply 0006 by hand in one transaction
  instead, recording it inside the same transaction:

  ```sql
  BEGIN;
  \i src/lib/db/migrations/0006_inspire_admin_versions_clusters_gsc.sql
  INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('98ddb02dd6b9ba79df2ed2375d3482af6385daeef3c4c2d3e2fcff2b4550956f', 1794758324000);
  COMMIT;
  ```

  (`psql -v ON_ERROR_STOP=1`, so a failed statement aborts the transaction
  instead of carrying on. The `--> statement-breakpoint` markers are SQL
  comments.)

**2c. Verify:** re-run the 2a queries — one row with `created_at =
1794758324000`, and `article_versions` not null.

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
