# UNDO — CONT-07, the seven C2.1 articles

**Written BEFORE the first production write**, 27 Ogos 2026.
**Item:** CONT-07, C2.1 Hantaran kahwin completed from 1 of 8 to 8 of 8.
**Brief:** `docs/plans/aug-23-2026-session-01/aug-27-2026-brief-cont-07.md` (docs repo).
**Machine-runnable form:** `2026-08-27-publish-cont-07-c21-UNDO.sql` beside this file.
**Dry-run prover:** `.tmp-cont07/undo-dry-run.mjs`, output in
`2026-08-27-publish-cont-07-c21-EVIDENCE/undo-dry-run.txt`.

Production runs `pitr_enabled=false` with zero platform backups. This is the
only way back.

## Pre-write state, captured 2026-08-26T21:37:29.783Z UTC

| Measure | Value |
|---|---|
| `articles` | 74 |
| `articles` where `status='published'` | 74 |
| `media` | 938 |
| `inspire_tags` | 96 |
| `articles` where `jsonb_typeof(content) <> 'object'` | 0 |
| the seven target slugs present | 0 |
| sitemap `<loc>` entries | 91, of which 74 are three-segment article URLs |

**Another write-authorised run was live on the same database during this
window.** Five C2.3 articles (`hantaran-tempah-atau-buat-sendiri`,
`gubahan-hantaran-simple`, `hantaran-tema-warna`, `hantaran-coklat`,
`hidden-hantaran`) were published at 17:24Z to 17:27Z on 26 Ogos 2026 by
another session. That is why the baseline here reads 74 and not the 69 this
run first measured. **This undo names slugs, never counts**, so it cannot
touch that run's rows even if the totals move again before it is used.

## What this run writes

Seven new articles, all inserts, no updates to any existing row:

| Slug | Cluster | URL |
|---|---|---|
| `hantaran-untuk-lelaki` | C2.1 | /artikel/hantaran-mas-kahwin/hantaran-untuk-lelaki |
| `barang-hantaran-perempuan` | C2.1 | /artikel/hantaran-mas-kahwin/barang-hantaran-perempuan |
| `hantaran-kahwin-bajet` | C2.1 | /artikel/hantaran-mas-kahwin/hantaran-kahwin-bajet |
| `barang-hantaran-berguna` | C2.1 | /artikel/hantaran-mas-kahwin/barang-hantaran-berguna |
| `adat-hantaran-ikut-keluarga` | C2.1 | /artikel/hantaran-mas-kahwin/adat-hantaran-ikut-keluarga |
| `persiapan-hantaran-kahwin` | C2.1 | /artikel/hantaran-mas-kahwin/persiapan-hantaran-kahwin |
| `tempat-beli-hantaran` | C2.1 | /artikel/hantaran-mas-kahwin/tempat-beli-hantaran |

Plus, per article, its `article_categories` rows (P2 and C2.1), its
`article_tags` rows, and one `media` row per declared image. Twenty-one images
are declared across the seven, drawn from eight distinct files.

**Nothing already live is updated.** No `--update` is run, so no existing
`published_at`, cover, body or category is touched.

## The order the deletes must run in, and why

1. **`media` first.** `media.original_article_id` is `ON DELETE SET NULL`, not
   `CASCADE`. Delete the articles first and the media rows survive with a null
   article id, unfindable, forever.
2. **`articles` second.** This cascades `article_categories`, `article_tags`,
   `media_article_usage`, `article_category_redirects`, `article_edit_locks`
   and `dynamic_block_rules`.
3. **`inspire_tags` last**, and only the 15 slugs this run creates.
   `adat-hantaran` and `dulang-hantaran` are excluded by name: both already
   existed at 21:37Z on 26 Ogos 2026 and belong to articles this run does not
   own. Deleting them would break live pages.

## After running the undo

Re-assert the pre-write state with the four counts at the foot of the `.sql`
file, then purge the edge and re-warm the pillar page with ONE sequential
request. Do not sweep concurrently: a peer session measured on 27 Ogos 2026
that a six-wide concurrent sweep manufactures `generateMetadata` deadline
misses that then get cached.

## What this undo does NOT cover

- **R2 objects.** Ingest uploads each image to R2 and the derivative crops
  stay there after the rows are deleted. They are orphaned, not served, and
  cost storage only. Deleting them is a separate manual step and is not
  included here on purpose, because a half-deleted R2 key is worse than an
  orphan.
- **Google.** The sitemap is resubmitted on ingest. If Google has already
  crawled a removed URL it will 404 until Google re-crawls. That is the
  expected behaviour for a rollback and needs no action.
