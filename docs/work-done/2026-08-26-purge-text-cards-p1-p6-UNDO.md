# UNDO — purge the text cards from the eight live P1/P6 articles, 26 Aug 2026

Written **before** the first write, per the standing rule. Production Supabase
has `pitr_enabled=false` and zero platform backups: this file and its companion
`.sql` are the only way back.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` (production
pooler, from `.env` `DATABASE_URL` in the site worktree).

**Restore script:** `docs/work-done/2026-08-26-purge-text-cards-p1-p6-UNDO.sql`
— 168 KB, generated from the live rows at capture time. Every value in it is a
literal read out of the live row, not a description of one.

**It was verified, not assumed.** `.tmp-textcard-purge/verify-undo.mjs` parses
every `content`, `cover_image_*`, `title`, `meta_description`, `excerpt`,
`author_id`, `published_at` and `updated_at` literal back out of the generated
SQL and deep-compares each against the live row it came from. **8 of 8 rows
verified byte-equivalent, 0 failures**, before the first mutation. 8 `update`
statements, 70 idempotent `insert`s, one `begin`/`commit` pair.

## Pre-write census, captured 2026-08-25T16:26:06.034Z (26 Aug 00:26 MYT)

| | |
|---|---|
| `articles` total | 56 |
| `articles` where `status='published'` | 56 |
| `media` total | 747 |
| `media_article_usage` total | 718 |
| `article_categories` / `article_tags` / `inspire_tags` | 121 / 87 / 65 |
| `jsonb_typeof(content)` census, whole table | `{"object": 56}` — zero string rows |

Nothing below touches any row outside the eight listed slugs, and this undo must
never be run wholesale — it addresses rows by `id`.

## The eight rows, verbatim before-state

Every one is **being overwritten, not created**. Undo is a restore, not a delete.

| Slug | `articles.id` | Text card in body | Body figures before | `updated_at` before |
|---|---|---|---|---|
| `bajet-kahwin` | `9f737846-4fe2-4cfd-ae61-b5823cc9935c` | `C6-2-A4-bajet-kahwin-cover.png` @ node 1 | 1 | 2026-08-25T10:13:21.643Z |
| `borang-nikah` | `ce836c00-fb6c-4875-b438-bd42216518d7` | `cover-borang-nikah.png` @ node 1 | 1 | 2026-08-25T10:11:29.872Z |
| `checklist-kahwin` | `fdf457e4-ef04-4bdb-a6fa-1e4bf8dd47a7` | `C6-2-A2-checklist-kahwin-cover.png` @ node 1 | 1 | 2026-08-25T10:12:55.141Z |
| `harga-sewa-dewan-kahwin` | `a6dab084-8ab5-44a5-a28d-a2336f4c9879` | `C6-2-A1-harga-sewa-dewan-kahwin-cover.png` @ node 1 | 2 | 2026-08-25T10:12:41.093Z |
| `lafaz-taklik` | `a6276a80-a292-45f0-947d-ee9e7ef59783` | `cover-lafaz-taklik.png` @ node 1 | 1 | 2026-08-25T10:12:14.292Z |
| `pakej-dewan-kahwin` | `250da087-60ec-456f-bf98-f8250bddc275` | `C6-2-A3-pakej-dewan-kahwin-cover.png` @ node 1 | 1 | 2026-08-25T10:13:07.918Z |
| `rukun-nikah` | `c11fcb8a-734c-4af5-9eec-0bcc02d0347a` | `cover-rukun-nikah.png` @ node 1 | 2 | 2026-08-25T10:11:47.809Z |
| `syarat-sah-nikah` | `afe75eec-6961-41f6-ae23-cd485b75eb48` | `cover-syarat-sah-nikah.png` @ node 1 | 1 | 2026-08-25T10:12:00.638Z |

The full pre-write `content` document for each — every prose block, every
figure — is in the `.sql`, plus `cover_image_url`, all five `cover_image_*`
jsonb columns, `meta_title`, `meta_description`, `status`, `author_id`,
`primary_category_id`, `published_at`, `authorship`, `review_status`,
`reviewed_at`, `reviewed_by`, `is_ai_generated`, `human_reviewed_at` and
`updated_at`. Those are exactly the columns the ingest script's `on conflict do
update` clause overwrites, plus the ones it nulls.

## The eight `media_article_usage` rows this run deletes

The brief says **unreference the cards, do not delete the PNGs**. Deleting the
usage row is the unreference; the `media` row and the R2 object both stay. The
undo puts each row back by id.

| Article | Card | `media.id` |
|---|---|---|
| `bajet-kahwin` | `C6-2-A4-bajet-kahwin-cover.png` | `e326cfb1-99b7-4cbf-b94b-b0ad5d3462a7` |
| `borang-nikah` | `cover-borang-nikah.png` | `fd7275df-5fb4-4291-bce7-8cf9e6e5b852` |
| `checklist-kahwin` | `C6-2-A2-checklist-kahwin-cover.png` | `a0cbb545-0828-4c5e-8356-5c94c3a5ad63` |
| `harga-sewa-dewan-kahwin` | `C6-2-A1-harga-sewa-dewan-kahwin-cover.png` | `50f7bdb7-e962-4ee2-a70c-7057e607ac3f` |
| `lafaz-taklik` | `cover-lafaz-taklik.png` | `6b0f3a38-82fd-4eb9-9d61-b43455444912` |
| `pakej-dewan-kahwin` | `C6-2-A3-pakej-dewan-kahwin-cover.png` | `85000828-a8d2-4cbf-9989-73c437606550` |
| `rukun-nikah` | `cover-rukun-nikah.png` | `5ea12c41-0072-4e67-ae30-00e9e7242451` |
| `syarat-sah-nikah` | `cover-syarat-sah-nikah.png` | `3812de50-96f8-490c-a6a9-2089dff636f1` |

All 18 pre-existing usage rows on the eight articles — not just these eight —
are re-inserted by the undo, so a partial failure mid-run still restores whole.

## What the undo does NOT reverse, said plainly

1. **The R2 objects and `media` rows a re-ingest creates.** `scripts/ingest-article.mts`
   stamps every upload with a fresh `Date.now()` prefix on purpose — a replaced
   byte-stream under `max-age=31536000, immutable` is unfixable for a year — so
   re-ingesting an article writes NEW objects and NEW `media` rows rather than
   overwriting the old ones. Restoring the article row points it back at the old
   URLs, which still exist. The new ones become orphans. Orphans are cost and
   clutter, not breakage.
2. **The CDN caches.** After running the `.sql`, drop them or the site keeps
   serving the purged version:
   `curl -X POST -H "authorization: Bearer $CRON_SECRET" https://hellokahwin.com/api/cron/revalidate-content`

## How to run it

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/work-done/2026-08-26-purge-text-cards-p1-p6-UNDO.sql
```

Single transaction. It either restores all eight or none.
