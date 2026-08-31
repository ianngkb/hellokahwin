# CONT-14 — UNDO

**Written and pushed BEFORE the production write**, per the standing rule.
Sprint 05, 01 September 2026, `writer-inspirasi-vendor-venue`.

## What the write touches

**Exactly one row. One database. No files on the site, no R2 objects, no
sitemap entry, no redirect.**

| | |
|---|---|
| Database | Supabase `nyidzlupgmyyazhyykuk` (`hellokahwin`), table `public.articles` |
| Row id | `de528bb4-650a-4c19-a1fa-5770d5963d0d` |
| Slug | `hantaran-kahwin` (**unchanged by this write**) |
| Columns written | `title`, `meta_title`, `meta_description`, `excerpt`, `content`, `updated_at` |
| Columns NOT written | `slug`, `status`, `primary_category_id`, `published_at`, every image column, every id |

No row is inserted and no row is deleted. `media_article_usage` is untouched
because no image is added or removed.

## The exact before state

Captured from production at 01 Sep 2026 before the write, and committed
verbatim next to this file:

`sep-01-2026-cont-14-EVIDENCE/before-row.json`

It carries the complete pre-write `title`, `meta_title`, `meta_description`,
`excerpt` and the whole `content` JSONB (57 nodes), plus the pre-write
`updated_at` of `2026-08-28 06:33:50.465623+00`.

Pre-write scalar values, repeated here in plain text so this document is
readable without the JSON:

- `title` and `meta_title`:
  `Hantaran kahwin: maksud, adat dan beza dengan mas kahwin`
- `meta_description`:
  `Maksud hantaran kahwin mengikut Kamus Dewan, bezanya dengan mas kahwin dan duit hantaran, berapa dulang yang lazim, dan apa yang masuk ke dalam dulang.`
- `excerpt`:
  `Hantaran kahwin ialah hadiah yang dibawa bersama wang hantaran dalam majlis perkahwinan orang Melayu, dan ia adat, bukan kewajipan agama. Maksudnya mengikut Kamus Dewan, bezanya dengan mas kahwin dan duit hantaran, siapa yang menentukan bilangan dulang, dan apa yang menggerakkan kosnya.`
- `content`: 57 top-level nodes, 22 internal links across 20 distinct targets.

## How to undo it

`sep-01-2026-cont-14-EVIDENCE/undo.sql` restores all five columns from
`before-row.json` in one statement. It is written to be run as-is:

```
psql "host=aws-0-ap-southeast-1.pooler.supabase.com port=5432 \
      user=postgres.nyidzlupgmyyazhyykuk dbname=postgres sslmode=require" \
  -v before=docs/work-done/sep-01-2026-session-01/sep-01-2026-cont-14-EVIDENCE/before-row.json \
  -f docs/work-done/sep-01-2026-session-01/sep-01-2026-cont-14-EVIDENCE/undo.sql
```

Password: vault key `supabase.hellokahwin-dbpass`, injected with
`vault.ps1 run supabase.hellokahwin-dbpass -EnvVar PGPASSWORD -- <cmd>`.

After running it, purge the edge copy the same way the write does: request
the URL twice past the TTL, because a `STALE` Vercel copy serves the previous
`<title>` on the first request past TTL and the current one on the second
(the reproduced defect recorded in `ceo-memory.md`).

Verify the undo with:

```
curl -sL https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin \
  | grep -o '<title>[^<]*</title>'
```

It should print the pre-write title above.

## Recovery of last resort

If the row is somehow lost entirely rather than merely wrong, the nightly
`pg_dump` in R2 (`hellokahwin-assets/db-backups/2026/09/…`) carries it, and
that backup path has been restore-verified (RISK-01, 25 Aug 2026).
