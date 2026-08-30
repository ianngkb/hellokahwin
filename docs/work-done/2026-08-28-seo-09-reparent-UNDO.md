# UNDO — SEO-09, re-parent the legacy articles, 28 Aug 2026

Written **before** the first write, per the standing rule. Production Supabase
has `pitr_enabled=false` and zero platform backups, so this file and its
companion `.sql` are the only way back.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`, session
mode, user `postgres.nyidzlupgmyyazhyykuk`. Password from vault key
`supabase.hellokahwin-dbpass`.

**Restore script:** `docs/work-done/2026-08-28-seo-09-reparent-UNDO.sql`.

## What makes this undo small

SEO-09 is additive and nothing is overwritten. It inserts seven rows into
`article_categories`, the link table that drives the pillar architecture. It
does **not** touch `articles`, does not change any `primary_category_id`, and
therefore does not move a single URL. `article_category_redirects` and
`redirects` are not written to at all.

Undo is a `DELETE` of exactly seven `(article, category)` pairs. There is no
prior value to restore because none of the seven pairs existed.

## Pre-write census, captured 2026-08-28

| | |
|---|---|
| `article_categories` total | 183 |
| `articles` where `status='published'` | 86 |
| Live sitemap URL count | 103 |

The full pre-write category links for the nine articles in scope are in
`2026-08-28-seo-09-reparent-EVIDENCE/pre-write-article-categories.txt`, 23 rows,
captured from the live database before the first insert.

## The seven pairs

| Article | Cluster inserted | Pillar it reaches |
|---|---|---|
| `cara-buat-kad-kahwin-digital` | `kad-kahwin-jemputan` (C5.2) | P5 `pelamin-kad-cenderahati` |
| `goodies-kahwin` | `doorgift-bunga-telur-hadiah` (C5.4) | P5 `pelamin-kad-cenderahati` |
| `hadiah-untuk-pengantin` | `doorgift-bunga-telur-hadiah` (C5.4) | P5 `pelamin-kad-cenderahati` |
| `pelamin-kahwin-dewan` | `pelamin-idea` (C5.1) | P5 `pelamin-kad-cenderahati` |
| `kursus-kahwin` | `kursus-kahwin-saringan-pra-nikah` (C1.3) | P1 `nikah-undang-undang` |
| `dewan-kahwin` | `dewan-venue-majlis` (C6.1) | P6 `venue-perancangan` |
| `garden-wedding` | `dewan-venue-majlis` (C6.1) | P6 `venue-perancangan` |

## Concurrency

RISK-08 is working a sibling worktree of this repository against the same
production database. Nothing in the undo addresses a row outside the seven pairs
above, and it must never be run wholesale.

## After the undo, drop the caches in this order

1. `POST https://hellokahwin.com/api/cron/revalidate-content`, `Authorization:
   Bearer $CRON_SECRET` — empties the origin data cache.
2. `POST https://api.vercel.com/v1/edge-cache/dangerously-delete-by-tags` with
   the nineteen paths in
   `2026-08-28-seo-09-reparent-EVIDENCE/purge-paths.txt` as `tags`.

Reversing that order leaves the CDN serving the pillar links for up to the
`s-maxage` window plus the stale allowance. See `src/lib/cache/purge.ts`.
