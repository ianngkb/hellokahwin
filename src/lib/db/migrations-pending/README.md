# Ship runbook: Inspire admin database changes (version history, analytics, title tests)

HelloKahwin has one database, and it is production. Migrations are applied by
hand at ship time (`docs/verify.md`). Apply these **before** the code that uses
them is deployed, in this order.

The clusters feature is not in this runbook's tables: its only database change
is the Clusters build's own `0006_cluster_series_box` (two columns on
`inspire_categories`), which is step 1 here because drizzle applies migrations
in journal order and `0007` comes after it.

**Re-running:** steps 2, 4 and 5 are safe to re-run (`IF NOT EXISTS`,
`CREATE OR REPLACE`, `DROP … IF EXISTS`, `WHERE NOT EXISTS`). **Steps 1 and 3
are NOT** — `0006` and `0007` are drizzle-generated plain `ADD COLUMN` /
`CREATE TABLE` / `ADD CONSTRAINT` / `CREATE INDEX`, so a second run fails on
"already exists". That is why each is applied and recorded in drizzle's history
**in one transaction**, and why each starts with a check that skips it once it
has been done. If a later step fails, fix it and re-run **from that step**;
never re-run step 1 or step 3 by hand.

| #   | File                                                            | Transaction                                                               | What it does                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `../migrations/0006_cluster_series_box.sql` (drizzle, Clusters) | **Yes — one transaction that also records it** (see "Step 1" below)       | Adds `series_enabled` (default off) and `series_description` to `inspire_categories`. Additive; nothing a reader sees changes. **Not re-runnable; skip-checked** (skip it if Clusters shipped it)              |
| 2   | `analytics.sql`, the `CREATE INDEX CONCURRENTLY` statement only | **No.** Run it on its own; `CONCURRENTLY` cannot run inside a transaction | Builds the `/artikel` pageview index on `analytics_events` without locking writes                                                                                                                              |
| 3   | `../migrations/0007_inspire_admin_versions_gsc.sql` (drizzle)   | **Yes — one transaction that also records it** (see "Step 3" below)       | Creates `article_versions`, `gsc_pages`, `gsc_page_daily`, `article_title_tests`, their keys and indexes. Its copy of the step-2 index is `IF NOT EXISTS`, so it is a no-op. **Not re-runnable; skip-checked** |
| 4   | `versions.sql`                                                  | Yes (its own `BEGIN`/`COMMIT`)                                            | RLS on `article_versions`, the `article_version_capture()` function, one baseline version per article, and the two deferred triggers on `articles`                                                             |
| 5   | `analytics.sql`, everything after the index                     | Yes                                                                       | RLS on `gsc_pages`, `gsc_page_daily`, `article_title_tests`                                                                                                                                                    |

Drizzle records a migration as one row in `drizzle.__drizzle_migrations`:
`hash` = sha256 of the `.sql` file, `created_at` = the journal's `when`
(`node_modules/drizzle-orm/pg-core/dialect.js`, `migrate()`). `drizzle-kit
migrate` — the `pnpm db:migrate` that 0005 shipped with — writes that row in the
same transaction as the migration, and applies every journal entry newer than
the newest recorded `created_at`.

The hashes below are of the files **as committed (LF line endings)**. A Windows
checkout with `core.autocrlf=true` has CRLF copies on disk, whose sha256 is
different; hash or apply from an LF copy (`git show HEAD:<path>`), not the
working file.

## Step 1 — `0006_cluster_series_box`, applied and recorded atomically

- `when` (`meta/_journal.json`, idx 6): `1794756782032`
- `hash`: `97f6cfa8cb1128a949b4f2ad4a9731b4a6756f522720f45de95075253bf51936`

**1a. Check first (read-only):**

```sql
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 3;
SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'inspire_categories'
    AND column_name IN ('series_enabled', 'series_description');
```

- A row with `created_at = 1794756782032` exists → **0006 is done (the Clusters
  ship applied it). Skip step 1.**
- No such row but both columns exist → 0006 was applied outside drizzle. Do
  **not** re-run it; record it only:
  `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('97f6cfa8cb1128a949b4f2ad4a9731b4a6756f522720f45de95075253bf51936', 1794756782032);`
- Neither → apply it by hand in one transaction, recording it inside the same
  transaction (do **not** use `pnpm db:migrate` here: it would also apply 0007
  before step 2's index exists):

  ```sql
  BEGIN;
  \i src/lib/db/migrations/0006_cluster_series_box.sql
  INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('97f6cfa8cb1128a949b4f2ad4a9731b4a6756f522720f45de95075253bf51936', 1794756782032);
  COMMIT;
  ```

**1b. Verify:** re-run the 1a queries — one row with `created_at =
1794756782032`, and both columns listed.

## Step 3 — apply `0007` and record it, atomically

- `when` (`meta/_journal.json`, idx 7): `1794763886068`
- `hash`: `c30002eccaac86940e21c7a73acb916ed5b9e948d6bdec3092d90dec2a2f9682`
  (sha256 of `src/lib/db/migrations/0007_inspire_admin_versions_gsc.sql` as
  committed; pinned by `src/lib/db/__tests__/ship-runbook.test.ts`)

**3a. Check first (read-only):**

```sql
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 3;
SELECT to_regclass('public.article_versions') AS article_versions;
```

- A row with `created_at = 1794763886068` exists → **0007 is done. Skip step 3.**
- No such row but `article_versions` is NOT null → 0007 was applied outside this
  runbook. Do **not** re-run it; record it only:
  `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('c30002eccaac86940e21c7a73acb916ed5b9e948d6bdec3092d90dec2a2f9682', 1794763886068);`
  — after confirming all four tables exist.
- Neither → go to 3b.

**3b. Apply.** Pick by what the newest history row is:

- Newest `created_at` is `1794756782032` (0006, step 1) → `pnpm db:migrate`. It
  applies only 0007 and records it in one transaction; any failure rolls both
  back.
- Anything else (history behind 0006, i.e. some earlier migration was applied
  by hand and never recorded) → **do NOT run `pnpm db:migrate`**: it would try
  to re-apply those earlier migrations. Apply 0007 by hand in one transaction
  instead, recording it inside the same transaction:

  ```sql
  BEGIN;
  \i src/lib/db/migrations/0007_inspire_admin_versions_gsc.sql
  INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('c30002eccaac86940e21c7a73acb916ed5b9e948d6bdec3092d90dec2a2f9682', 1794763886068);
  COMMIT;
  ```

  (`psql -v ON_ERROR_STOP=1`, so a failed statement aborts the transaction
  instead of carrying on. The `--> statement-breakpoint` markers are SQL
  comments.)

**3c. Verify:** re-run the 3a queries — one row with `created_at =
1794763886068`, and `article_versions` not null.

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
  `DROP TABLE IF EXISTS article_title_tests, gsc_page_daily, gsc_pages, article_versions;`
- `DROP INDEX CONCURRENTLY IF EXISTS idx_analytics_events_artikel_pageview;`
- The two `inspire_categories` columns from step 1 belong to the Clusters
  feature; roll them back only with it, as its own ship notes say.
