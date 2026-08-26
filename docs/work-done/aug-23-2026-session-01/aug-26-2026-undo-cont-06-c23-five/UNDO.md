# Undo record — CONT-06, the five C2.3 articles (A4–A8)

**RECONSTRUCTED AFTER THE WRITE, and says so.** The standing rule is that this
file is committed BEFORE the production write. The session that ran the ingest
on 26 Aug 2026 (17:24–17:27 UTC) died on an auth failure between the ingest and
this commit, so the record was rebuilt on 27 Aug 2026 by querying production
directly. Every id and timestamp below is read from the production database,
not from memory of the run.

Target: `aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` (the
`DATABASE_URL` in `hellokahwin-site/.env`).

---

## Rows the ingest CREATED — five new slugs, pure inserts

None of the five existed before this run. Deleting them returns the database to
its prior state exactly. Ids and timestamps as read from production, 27 Aug 2026:

| slug | id | created_at (UTC) | media rows | category links |
|---|---|---|---|---|
| `hantaran-tempah-atau-buat-sendiri` | `c348bb71-6aef-4d70-a38e-ed2263f0135a` | 2026-08-26T17:24:59.595Z | 8 | 2 |
| `gubahan-hantaran-simple` | `a4f8800a-c62c-461c-98ee-c8a8d9002fce` | 2026-08-26T17:25:29.518Z | 8 | 2 |
| `hantaran-tema-warna` | `7a4e6c59-36b8-41e6-b438-ec618a2d3f86` | 2026-08-26T17:26:05.895Z | 4 | 2 |
| `hantaran-coklat` | `147cbfb2-0de5-483b-ae9c-027606424591` | 2026-08-26T17:26:49.935Z | 3 | 2 |
| `hidden-hantaran` | `44118ddc-6aa7-492d-833c-dce7d52723a7` | 2026-08-26T17:27:25.079Z | 4 | 2 |

Each article's `published_at` equals the `publishedAt:` stamped back into its
draft in `docs/plans/aug-23-2026-session-01/drafts/ingest/C2-3-A4..A8-*.md`
(committed as "publishedAt write-backs from the A4-A8 production ingest").

## Undo for the five

```sql
-- Verify first. Expect exactly 5 rows, all created 26 Aug 2026 17:24–17:28 UTC.
select id, slug, status, created_at from articles
where slug in ('gubahan-hantaran-simple','hantaran-tema-warna','hantaran-coklat',
               'hidden-hantaran','hantaran-tempah-atau-buat-sendiri');

begin;
  create temp table doomed as
    select id from articles where slug in (
      'gubahan-hantaran-simple','hantaran-tema-warna','hantaran-coklat',
      'hidden-hantaran','hantaran-tempah-atau-buat-sendiri');

  delete from media_article_usage where article_id in (select id from doomed);
  delete from article_tags        where article_id in (select id from doomed);
  delete from article_categories  where article_id in (select id from doomed);
  delete from media               where original_article_id in (select id from doomed);
  delete from articles            where id in (select id from doomed);
commit;
```

Then drop the content caches, or the site keeps serving the deleted pages:

```
POST https://hellokahwin.com/api/cron/revalidate-content
Authorization: Bearer $CRON_SECRET
```

R2 objects for the covers and supporting images live under
`inspire/<slug>/<stamp>-*`. They are new timestamped keys; after the delete
above they are orphaned and cost storage only. No existing R2 object was
overwritten.

## What is NOT touched

- The three Sprint 01 C2.3 articles (`dulang-hantaran`, `gubahan-hantaran`,
  `sirih-junjung`) — their rows were not updated by this run. Their live pages
  link to the five new articles through the related-articles module, which
  renders from the category, not from stored rows, so the links disappear on
  their own if the five are deleted.
- No category, tag or profile row was created or altered.
- No `redirects` table row.
