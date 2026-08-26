# UNDO: SEO-06, re-file of hantaran-kahwin and hantaran-tunang into P2, 26 Ogos 2026

Captured at `2026-08-26T14:47:24.009Z`, before the first write at `14:47:51Z`. Production Supabase has no PITR, so this folder is the way back.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` (production pooler, `DATABASE_URL` in the site worktree `.env`).

## What is here

- `before.json`: the two `articles` rows (`id`, `slug`, `primary_category_id`, `updated_at`, `status`), all six `article_categories` rows for them with their ids, and a table census.
- `undo.sql`: restore script generated from those live rows. Every literal in it was read out of the row it restores, then parsed back out of the SQL and compared. 8 of 8 verified, 0 failures, before the write. Addresses rows by `id` only.
- `undo-capture.mjs`: the script that produced both files and ran the verification.

## Pre-write census

| | |
|---|---|
| `articles` | 61 |
| `article_categories` | 131 |
| `redirects` | 0 |
| `article_category_redirects` | 0 |

## What the move did (so the undo is read against it)

| Row | Before | After |
|---|---|---|
| `articles.de528bb4…` (`hantaran-kahwin`) `primary_category_id` | `d8b9992d…` hiasan-dekorasi | `97473dfb…` hantaran-mas-kahwin |
| `articles.dd3bf19c…` (`hantaran-tunang`) `primary_category_id` | `d8b9992d…` hiasan-dekorasi | `97473dfb…` hantaran-mas-kahwin |
| `article_categories` for both | hiasan-dekorasi, idea-dan-nasihat, perancangan | pillar P2, own cluster (C2.1 / C2.2), idea-dan-nasihat, perancangan |
| `updated_at` | 25 Aug 18:01:59 / 26 Aug 13:40:15 | 26 Aug 14:47:54 (both) |

## How to run it

1. Apply `undo.sql` against the production pooler in one session (it wraps itself in `begin`/`commit`). It restores both primary categories and both original `updated_at` values, deletes the four links added (pillar + cluster for each article), and re-inserts the two `hiasan-dekorasi` links with their original ids. The four `idea-dan-nasihat` / `perancangan` inserts are no-ops on conflict; they are there so the script is complete on its own.
2. Drop the origin cache: `POST https://hellokahwin.com/api/cron/revalidate-content` with `Authorization: Bearer $CRON_SECRET`.
3. Purge the edge for the same eleven paths as the move (`../2026-08-26-seo-06-refile-hantaran-EVIDENCE/purge.mts`, run under `vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN`). The new URLs must be in the purge set, or they keep serving 200 for up to five minutes while the old ones already 308 to them.
4. Sample each URL more than once, spaced out, before calling it restored.

Never run this wholesale against anything but the two ids it names.
