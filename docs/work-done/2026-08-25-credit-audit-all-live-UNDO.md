# UNDO — credit audit of every live article, 25 Ogos 2026

Written **before** anything was done to production, per the standing rule.
Production Supabase has `pitr_enabled=false` and zero platform backups: this
file and its companion `.sql` are the only way back.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` (production
pooler, from `.env` `DATABASE_URL` in the `pillars-ingest-redirects` worktree —
**not** `.env.local`, which points at `127.0.0.1:5433`).

**Restore script:** `docs/work-done/2026-08-25-credit-audit-all-live-UNDO.sql`
— 1.35 MB, generated from the live rows at capture time. Every statement is a
literal `update ... where id = '<uuid>'` carrying the full pre-write value, not a
description of one. Nothing in it creates or deletes a row.

## Two captures, and why the second one exists

| | Captured | `articles` | `media` | `media_article_usage` | `inspire_tags` |
|---|---|---|---|---|---|
| First | 2026-08-25T11:21:43.329Z | 53 | 739 | 710 | 56 |
| **Current** | **2026-08-25T11:40:17.027Z** | **56** | **747** | **718** | **65** |

**A concurrent CEO-approved run published the P5 `pelamin-kad-cenderahati`
pillar while this audit was in progress** — `contoh-kad-jemputan-kahwin`
(11:24:56Z), `bunga-telur` (11:30:25Z) and `pelamin` (11:31:49Z), with eight new
`media` rows. The first capture was therefore incomplete, and an undo that does
not match the current row set is not an undo. It was re-taken.

**The first capture never went stale for the rows it held.** Checked at
re-capture time:

```sql
select count(*) from articles
  where updated_at > '2026-08-25T11:21:43.329Z'
    and created_at <= '2026-08-25T11:21:43.329Z';   -- 0
select count(*) from media
  where updated_at > '2026-08-25T11:21:43.329Z'
    and created_at <= '2026-08-25T11:21:43.329Z';   -- 0
```

Zero pre-existing rows modified in the window. The change is purely additive, so
the current file is a **strict superset** of the first — not a correction of it —
and both describe the same values for the 53 articles and 739 media rows they
share.

## NEVER RUN THIS FILE WHOLESALE

Another run writes to this database concurrently. Every statement addresses one
row by `id`; run only the statements for rows the run you are undoing actually
wrote. **Running Section 2 in full would revert any article a different run has
changed since 11:40:17Z.** The `.sql` carries the same warning in its header.

## What the script restores

**Section 1 — 747 statements, one per `media` row.** Restores `credit`,
`credit_url`, `license_class`, `licensor_name`. These are the only four columns
this brief was permitted to touch on an image.

**Section 2 — 56 statements, one per published article.** Restores
`cover_image_url`, `cover_image_variants`, `cover_image_smart_crops`,
`cover_image_focal_point`, `cover_image_detection_data` and `content`. Present
because `pnpm ingest --update` rewrites all of those on the way past, so an undo
that covered only the media columns would not be an undo of the tool the brief
told me to use.

Run whichever section you need. `begin;` / `commit;` wrap both.

## What it deliberately does NOT restore

- **R2 objects.** Nothing here uploads, replaces or deletes one. If a future run
  does, its own undo has to carry the keys — orphaned objects are wasted bytes,
  not breakage.
- **Cache state.** A purge or a warm cannot be undone and does not need to be:
  the next render rebuilds from whatever the database says, so restoring the
  database restores the pages.
- **`updated_at`.** Left alone deliberately, so a restore is visible as a
  restore rather than pretending nothing happened.

## Outcome — the undo was never needed

**No production write was made, and none is planned.** Every database statement
this run issued was a `select`. The audit found the data already correct: all
109 media rows behind the (now) 27 live non-legacy articles carry `credit`,
`license_class` and `licensor_name`, with zero exceptions — including the three
P5 articles a concurrent run published mid-audit. The missing credits were being
lost at render time, not stored missing. Details in
`2026-08-25-credit-audit-all-live.md`.

The snapshot is kept anyway. It is dated evidence of the state of every credit
column on production at 11:40:17Z on 25 Ogos 2026, which is worth more than the
disk it costs.
