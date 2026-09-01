# CONT-13 — UNDO, recorded and pushed BEFORE the first production write

**Item:** CONT-13, Sprint 05 · **Owner:** `writer-inspirasi-vendor-venue` · **Date:** 1 September 2026

This file exists so the six writes below are reversible **in fact**, not in principle.
It is pushed before the first `pnpm ingest ... --commit` runs.

## What the write does

Six rows are INSERTED into `articles` on the production database, each with a new
`article_categories` link and a set of `media` rows. Nothing is updated, nothing is
deleted, no existing row is touched. The write is purely additive.

## The exact slugs written

| # | slug | pillar / cluster | resulting URL |
|---|---|---|---|
| 1 | `doa-penutup-majlis` | P3 / C3.2 | https://hellokahwin.com/artikel/ucapan-doa/doa-penutup-majlis |
| 2 | `doa-makan-majlis` | P3 / C3.2 | https://hellokahwin.com/artikel/ucapan-doa/doa-makan-majlis |
| 3 | `doa-selamat-majlis` | P3 / C3.2 | https://hellokahwin.com/artikel/ucapan-doa/doa-selamat-majlis |
| 4 | `ucapan-ulang-tahun-perkahwinan` | P3 / C3.3 | https://hellokahwin.com/artikel/ucapan-doa/ucapan-ulang-tahun-perkahwinan |
| 5 | `lafaz-akad-nikah` | P1 / C1.2 | https://hellokahwin.com/artikel/nikah-undang-undang/lafaz-akad-nikah |
| 6 | `doa-jodoh` | P7 / C7.1 | https://hellokahwin.com/artikel/sebelum-nikah/doa-jodoh |

## The undo, exactly

Run against the SAME production `DATABASE_URL` the ingest used. Order matters:
the child rows go first.

```sql
BEGIN;

-- 1. the category links
DELETE FROM article_categories
WHERE article_id IN (
  SELECT id FROM articles WHERE slug IN (
    'doa-penutup-majlis','doa-makan-majlis','doa-selamat-majlis',
    'ucapan-ulang-tahun-perkahwinan','lafaz-akad-nikah','doa-jodoh'
  )
);

-- 2. the articles
DELETE FROM articles WHERE slug IN (
  'doa-penutup-majlis','doa-makan-majlis','doa-selamat-majlis',
  'ucapan-ulang-tahun-perkahwinan','lafaz-akad-nikah','doa-jodoh'
);

COMMIT;
```

Then drop both caches, in this order, or the deleted pages keep serving:

```bash
curl -X POST https://hellokahwin.com/api/cron/revalidate-content \
  -H "Authorization: Bearer $CRON_SECRET"
# then purge the edge for each of the six URLs above, plus /sitemap.xml
# and the three category hubs /artikel/ucapan-doa, /artikel/nikah-undang-undang,
# /artikel/sebelum-nikah
```

## Partial undo

Each row is independent. To reverse ONE article, substitute its single slug in
both statements. Nothing in this batch depends on anything else in it.

## The media rows

The `media` rows are keyed `inspire/<slug>/<timestamp>-<name>.<ext>` and are
namespaced per article slug, so they cannot collide with any existing article's
objects. They are left in place by the undo above: an orphan R2 object costs
storage and nothing else, while deleting objects served under
`max-age=31536000, immutable` is the one step in this pipeline with no recovery
path. If they must go, they are enumerable with:

```sql
SELECT r2_key FROM media WHERE r2_key LIKE 'inspire/doa-penutup-majlis/%'
   OR r2_key LIKE 'inspire/doa-makan-majlis/%'
   OR r2_key LIKE 'inspire/doa-selamat-majlis/%'
   OR r2_key LIKE 'inspire/ucapan-ulang-tahun-perkahwinan/%'
   OR r2_key LIKE 'inspire/lafaz-akad-nikah/%'
   OR r2_key LIKE 'inspire/doa-jodoh/%';
```

## Sitemap

`<loc>` count before this write: **103**, measured 1 September 2026 by
`curl -s https://hellokahwin.com/sitemap.xml | grep -o "<loc>" | wc -l`.
Expected after: **109**. The undo returns it to 103.

---

## ADDENDUM, added 1 September 2026 AFTER the write it describes

**This addendum was written after the change it covers, not before, and that is
stated rather than tidied.** The six inserts above were all covered before the
first ingest. A seventh production write was then required by
`editorial-verification-lead`'s binding placement condition on `lafaz akad
nikah`, and it is an UPDATE to an existing article rather than an insert, which
the original undo did not contemplate.

### What the seventh write did

One paragraph added to `rukun-nikah`, in the `## 5. Sighah: ijab dan qabul`
section, linking out to the new `lafaz-akad-nikah` page. Nothing removed, nothing
reworded, and `published_at` deliberately unchanged (verified after the write:
`datePublished":"2026-08-25` on the live page, the same value it carried before).

The condition it satisfies: `rukun-nikah` must link out to `lafaz-akad-nikah` and
must not restate the ijab/qabul wording, or the two pages cannibalise each other.
The second half was already true and remains true.

### The undo for it

The article's pre-change body is the version in git at
`docs/plans/aug-23-2026-session-01/drafts/rukun-nikah.md` as of commit `e71b3d9`,
which is the last commit before the paragraph was added.

```bash
git show e71b3d9:docs/plans/aug-23-2026-session-01/drafts/rukun-nikah.md \
  > /tmp/rukun-nikah-before.md
# then re-ingest that file over the live row:
pnpm ingest /tmp/rukun-nikah-before.md --db "$PROD" --commit --publish --update \
  --revalidate-url https://hellokahwin.com
```

That restores the exact prior body. It is reversible without touching the
database by hand because the article's source of truth is a file in this repo.

**The added paragraph, verbatim, so a reviewer can see exactly what would go:**

> Rukun ini satu-satunya yang boleh gagal pada hari majlis itu sendiri, kerana ia
> bergantung pada apa yang disebut. Perkataan yang mesti ada di dalamnya, dan
> tiga perkara yang orang sangka membatalkan akad tetapi tidak, diterangkan penuh
> dalam [lafaz akad nikah](/artikel/nikah-undang-undang/lafaz-akad-nikah).
