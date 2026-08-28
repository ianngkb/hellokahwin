# UNDO — CONT-12, the C2.1 seed `hantaran-kahwin` re-angled, 28 Ogos 2026

Written **before** the write and committed before it ran.

**Article:** `hantaran-kahwin`, id `de528bb4-650a-4c19-a1fa-5770d5963d0d`,
live at <https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin>.
It is a WordPress-migration row (`wp_id` 492), so no source file exists for its
pre-change body. The before-state below is the only copy.

**Why:** CONT-10 measured the seed's SERP against `barang-hantaran-perempuan` at
Jaccard 40% (25% with the family's two constant URLs removed), level with the
within-article baseline, because the live seed's centre of gravity is
*20 Idea Hantaran Kahwin Lelaki & Perempuan* — the job that
`hantaran-untuk-lelaki` and `barang-hantaran-perempuan` were published to do on
27 Ogos. Decision 120 assigns the re-angle to CONT-12: move the seed onto the
definitional and money questions its own People-also-ask box asks, and let it
link down to the angle pages for the lists. One body, not the count.

## What changes

Six columns on one row. **No URL changes, no redirect, no new article, no
category change, and `published_at` is not touched.**

| Column | Before | After |
|---|---|---|
| `content` | 152 top-level nodes | 57 top-level nodes (55 from markdown + 2 `figureBlock`) |
| `title` | Hantaran Kahwin Lengkap Untuk Lelaki dan Perempuan – Panduan & Tips Bajet Terkini | Hantaran kahwin: maksud, adat dan beza dengan mas kahwin |
| `meta_title` | same as `title` | same as new `title` |
| `meta_description` | the WordPress excerpt, ending in an ellipsis | new, counted under 155 characters |
| `excerpt` | the WordPress excerpt | new |
| `updated_at` | 2026-08-26T14:47:54.711Z | now |

`media_article_usage` is reconciled the way `syncMediaUsage()` reconciles it:
the 25 rows for the legacy WordPress images leaving the body are deleted, and
two rows are inserted for the two licensed photographs entering it. It is a
derived index rebuilt from the body, not article content.

## Exact before-state

- `aug-28-2026-cont-12-EVIDENCE/seed-hantaran-kahwin-content-BEFORE.json` — the
  full TipTap document read out of the **database**, not the rendered page.
- `aug-28-2026-cont-12-EVIDENCE/seed-hantaran-kahwin-fields-BEFORE.json` — the
  six columns above plus `published_at`, `status`, `cover_image_url`.
- `aug-28-2026-cont-12-EVIDENCE/seed-media-usage-BEFORE.json` — the 25
  `media_article_usage` rows, with `media_id` and filename.

## To undo

```bash
# from C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects
# with .env DATABASE_URL pointing at production
npx tsx .tmp-cont12/undo.mts
```

The saved before-state was proved deep-equal to the live row before the write:
`JSON.stringify(db.content) === JSON.stringify(savedFile)` returned **true**,
152 nodes on both sides. Byte counts differ between the two representations
(`length(content::text)` reads 36,807, `JSON.stringify` reads 34,652) because
postgres renders jsonb with spaces; the documents are identical, and node count
plus deep equality are the checks to use, not byte length.

`undo.mts` restores `content` from `seed-hantaran-kahwin-content-BEFORE.json`,
restores the five scalar columns from `seed-hantaran-kahwin-fields-BEFORE.json`,
deletes every `media_article_usage` row for the article and re-inserts exactly
the 25 in `seed-media-usage-BEFORE.json`. It sets `updated_at` and touches
nothing else. The script is committed alongside this file at
`aug-28-2026-cont-12-EVIDENCE/undo.mts`.

Then drop the caches: `POST /api/cron/revalidate-content` with `CRON_SECRET`,
or re-run any ingest with `--revalidate-url https://hellokahwin.com`, and allow
up to 300s for the Vercel edge copy of
`/artikel/hantaran-mas-kahwin/hantaran-kahwin` to expire.

## What this undo does not cover

- **The cover image is not touched by this run and not restored by this undo.**
  `…/inspire/hantaran-kahwin/1787396480698-cover.jpg` stays exactly as it is. It
  is a legacy WordPress asset with no demonstrable licence, and replacing it is
  Stage 6b work for `managing-editor`, not a writer's database edit.
- **The 25 legacy image files stay on R2 and their `media` rows stay in the
  database.** Only the body references and the derived usage index change. If
  the undo above is run, the body references come back and the images render
  again.
- **The one legacy-root link removed with the old body**
  (`Artikel Lain:` → `https://hellokahwin.com/kursus-kahwin/`) is part of the
  known site-wide legacy-root defect that SEO owns. This run does not fix the
  other 40; it removes one because the paragraph carrying it is gone.
