# UNDO — swap the eight LIVE C2.4 covers to photographs, 25 Aug 2026

Written **before** the first write, per the standing rule. Production Supabase
has `pitr_enabled=false` and zero platform backups: this file and its companion
`.sql` are the only way back.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` (production
pooler, from `.env` `DATABASE_URL` in the site worktree).

**Restore script:** `docs/work-done/2026-08-25-swap-c24-covers-UNDO.sql` — 166 KB,
generated from the live rows at capture time. It is a literal `update` per row
carrying the full pre-write jsonb, not a description of one.

## Pre-write census, captured 2026-08-25T10:52:57.170Z

| | |
|---|---|
| `articles` total | 53 |
| `articles` where `status='published'` | 53 |
| `media` total | 679 |
| `media_article_usage` total | 650 |
| `inspire_tags` total | 56 |
| `jsonb_typeof(content)` census, whole table | `{"object": 53}` — **zero string rows** |

**Another session is publishing concurrently.** The table held 50 articles at
10:45:20Z and 53 at 10:52:57Z (P3/P4/P5/P7 landing). Nothing below touches any
row outside the eight listed slugs, and this undo must never be run wholesale —
it addresses rows by `id`.

## The eight rows, verbatim before-state

Every one is **being overwritten, not created**. Undo is a restore, not a delete.

| Slug | `articles.id` | `cover_image_url` before | `updated_at` before |
|---|---|---|---|
| `apa-itu-mas-kahwin` | `fc26f9b1-f4ba-4982-8a26-558ba74d14b8` | `…/inspire/apa-itu-mas-kahwin/1787649987669-apa-itu-mas-kahwin-kad-tajuk.png` | `2026-08-25 09:26:37.416784+00` |
| `mas-kahwin-ikut-negeri` | `b1484478-a5b5-44ce-85c2-10f2c2a32d0c` | `…/inspire/mas-kahwin-ikut-negeri/1787649072308-mas-kahwin-ikut-negeri-kad-tajuk.png` | `2026-08-25 09:11:25.886601+00` |
| `mas-kahwin-johor` | `d662bad6-eab7-4d77-bcdc-abcec603a3ec` | `…/inspire/mas-kahwin-johor/1787649085884-mas-kahwin-johor-kad-tajuk.png` | `2026-08-25 09:11:31.965177+00` |
| `mas-kahwin-kelantan-terengganu` | `b62d35d0-9d88-4174-9aae-1c05ef5fac59` | `…/inspire/mas-kahwin-kelantan-terengganu/1787649091345-mas-kahwin-kelantan-terengganu-kad-tajuk.png` | `2026-08-25 09:11:37.418824+00` |
| `mas-kahwin-melebihi-kadar-minimum` | `b2191993-232b-4be5-b516-d20b6cc3a3ab` | `…/inspire/mas-kahwin-melebihi-kadar-minimum/1787649115004-mas-kahwin-melebihi-kadar-minimum-kad-tajuk.png` | `2026-08-25 09:12:07.122939+00` |
| `mas-kahwin-pahang-negeri-sembilan` | `99d59b25-a0fa-4108-94b4-7ff774bb064e` | `…/inspire/mas-kahwin-pahang-negeri-sembilan/1787649103060-mas-kahwin-pahang-negeri-sembilan-kad-tajuk.png` | `2026-08-25 09:11:49.379766+00` |
| `mas-kahwin-perak` | `abec9ae7-d323-4f11-9e69-17b610ae281c` | `…/inspire/mas-kahwin-perak/1787649097185-mas-kahwin-perak-kad-tajuk.png` | `2026-08-25 09:11:43.396225+00` |
| `mas-kahwin-sabah-sarawak` | `d2df8447-d314-4699-88b8-685502e28389` | `…/inspire/mas-kahwin-sabah-sarawak/1787649109230-mas-kahwin-sabah-sarawak-kad-tajuk.png` | `2026-08-25 09:11:55.452452+00` |

All eight prefixed `https://images.hellokahwin.com`. All eight are a `kad-tajuk`
PNG. **All eight URLs (`/artikel/hantaran-mas-kahwin/<slug>`) stay exactly as
they are** — the slug is never written, so no undo of a URL is possible or needed.

### Content fingerprints before the write

`md5(content::text)`, so a restore can be proved rather than assumed:

```
apa-itu-mas-kahwin                 1108bf7f9c7dcca67349a440e6462cb8   media links: 8
mas-kahwin-ikut-negeri             6bf19aaac870d95a68c6c3a9502d68c0   media links: 6
mas-kahwin-johor                   b5e815706aa4aefcb5388171b0d64aae   media links: 2
mas-kahwin-kelantan-terengganu     a128b7dfc665c412dbe5b36cb4834d40   media links: 2
mas-kahwin-melebihi-kadar-minimum  56f37e67dbb55fb1858ebda7b2e6c0a2   media links: 4
mas-kahwin-pahang-negeri-sembilan  b54560947aadd7eb834bb9e3bd53b8da   media links: 3
mas-kahwin-perak                   ed30348b19bbcaed5a5a6765519d2b9c   media links: 2
mas-kahwin-sabah-sarawak           1522b0fe7570bb225575ce3463d17249   media links: 2
```

The `.sql` restores `content` as well as the cover fields. It has to: moving the
`kad-tajuk` card in-article is a change to `content`, not only to the cover.

### Fields the re-ingest writes that are already identical

Checked against the eight files before the run, so an undo does not need to
cover them — the write is a no-op on every one:

```
title, meta_description, published_at   identical in file and row, all eight
excerpt        null in row, absent from file  -> stays null
tags           none in row, none in file      -> stays none
authorship     'ai' in row, default in file   -> stays 'ai'
categories     C2.4 + P2 in row and file      -> reconciles to the same pair
review_status  'pending_review', reviewed_at null  -> reset writes the same values
```

No human sign-off is discarded by the `review_status` reset, because none of the
eight carries one.

## Undo, in order

1. **Restore the rows.**

   ```
   psql "$DB" -f docs/work-done/2026-08-25-swap-c24-covers-UNDO.sql
   ```

   It opens a transaction, updates the eight by `id`, selects them back for
   inspection, and commits. Read the select output before letting it commit if
   running interactively.

2. **Drop the content caches**, or the site keeps serving the swapped covers:

   ```
   curl -X POST -H "authorization: Bearer $CRON_SECRET" \
     https://hellokahwin.com/api/cron/revalidate-content
   ```

3. **Wait past the 300s Vercel edge TTL and request each URL twice.** The first
   request past the TTL is served the stale copy while triggering the refresh —
   the second is the real answer. This is recorded in
   `docs/work-done/2026-08-25-publish-p1-and-p6.md` and in `src/lib/cache/purge.ts`.

## What the undo deliberately does NOT cover

- **The R2 objects the swap uploads.** Eight new cover originals plus their
  variants and named crops, keyed under a fresh timestamp. They are written to
  new keys — never over an existing object, because every key carries the run's
  timestamp and is served `max-age=31536000, immutable`. After a restore they
  are unreferenced **orphans, not breakage**, and the pre-write cover objects
  they never replaced are still in place and still fetchable.
- **The `media` rows the swap inserts** for the new cover photographs, and their
  `media_article_usage` links. Same reasoning. If they must go, delete
  `media_article_usage` first, then `media` — `media.original_article_id` is
  `ON DELETE SET NULL`, not cascade, so deleting the article first strands the
  media rows permanently. (That trap is recorded in the P1/P6 undo too.)
- **The two alt-text corrections** made in the docs repo to
  `drafts/ingest/A1-mas-kahwin-ikut-negeri.md` and
  `A8-mas-kahwin-melebihi-kadar-minimum.md`. They are in git; `git diff` is the undo.

## Added after the run: what the restore actually reverses

The run wrote the eight rows **three times**, not once, because the brief was
reversed on disk at 10:56:21Z while it was mid-commit (see the build log,
"The text cards: removed, not moved"). The generations were:

```
10:55–10:58   photograph cover, kad-tajuk card moved in-article   (brief as dispatched)
10:59–11:00   three rows re-run to pick up a concurrent session's supporting images
11:04–11:06   kad-tajuk card REMOVED from the page entirely       (brief as revised)
```

**The `.sql` snapshot is unaffected by any of that and is still the way back.**
It was captured at 10:52:57Z, before the first write, so it restores the
pre-run state — the `kad-tajuk` cover and the original `content` — regardless of
how many generations were written on top. Nothing in it needs re-taking.

What a restore would NOT reverse, beyond the R2 and `media` orphans already
listed: the removal of the eight `kad-tajuk` entries from the
`drafts/ingest/A1..A8-*.md` front matter in the docs repo. Those are in git;
`git diff` is the undo. Restoring the database without restoring those files
would leave the rows and the files disagreeing, and the next `--update` run from
those files would re-apply the removal.

## Abort conditions

Stop and do not continue the run if any of these is seen:

- the ingest refuses with **"an article already exists at slug"** — that means
  `--update` was not passed and the assumption behind this undo is wrong;
- `jsonb_typeof(content)` reports any **`string`** row after a write — the
  double-encoding defect has returned and the row is worse than before;
- any of the eight `updated_at` values above has moved before the run starts —
  the concurrent session has touched a row this undo describes, and the
  snapshot is stale. Re-take it.
