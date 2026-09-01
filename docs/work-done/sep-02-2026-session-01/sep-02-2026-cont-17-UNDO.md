# CONT-17 — UNDO, recorded and pushed BEFORE the first production write

**Item:** CONT-17, Sprint 06 · **Owner:** `writer-inspirasi-vendor-venue` · **Date:** 2 September 2026

This file exists so the six writes below are reversible **in fact**, not in principle.
It is pushed before the first `pnpm ingest ... --commit --publish` runs.

## What the write does

Six rows are INSERTED into `articles` on the production database, each with a new
`article_categories` link and a set of `media` rows. Nothing is updated, nothing is
deleted, no existing row is touched. The write is purely additive.

**One exception, and it is deliberate.** `doa-untuk-isteri` is written TWICE. Its body
links to two siblings in the same batch, and the ingest refuses a body link whose target
is not yet published, so it goes in first without those two links and is re-ingested with
`--commit --publish --update` once the batch is live. The second write is an UPDATE of the
row created by the first. Both are covered by the same DELETE below.

No new image files are introduced. All eight photographs are already in
`docs/asset-register/asset-register.csv` and already live on other pages; the ingest
re-uploads them per article, which is its normal behaviour.

## The exact slugs written

| # | slug | pillar / cluster | resulting URL |
|---|---|---|---|
| 1 | `doa-untuk-isteri` | P3 / C3.2 | https://hellokahwin.com/artikel/ucapan-doa/doa-untuk-isteri |
| 2 | `doa-malam-pertama` | P3 / C3.2 | https://hellokahwin.com/artikel/ucapan-doa/doa-malam-pertama |
| 3 | `doa-keluarga-bahagia` | P3 / C3.2 | https://hellokahwin.com/artikel/ucapan-doa/doa-keluarga-bahagia |
| 4 | `doa-untuk-suami` | P3 / C3.2 | https://hellokahwin.com/artikel/ucapan-doa/doa-untuk-suami |
| 5 | `doa-masuk-rumah-baru` | P3 / C3.2 | https://hellokahwin.com/artikel/ucapan-doa/doa-masuk-rumah-baru |
| 6 | `doa-pembuka-majlis` | P3 / C3.2 | https://hellokahwin.com/artikel/ucapan-doa/doa-pembuka-majlis |

All six sit under the SAME pillar hub, `/artikel/ucapan-doa`, in cluster `C3.2`
(`Doa perkahwinan`), which held five articles before this write.

The order in the table is the ingest order, and it is a dependency order: every body
link in an article points at a page already published when that article goes in.

## The undo, exactly

Run against the SAME production `DATABASE_URL` the ingest used. Order matters:
the child rows go first.

```sql
BEGIN;

-- 1. the category links
DELETE FROM article_categories
WHERE article_id IN (
  SELECT id FROM articles WHERE slug IN (
    'doa-untuk-isteri','doa-malam-pertama','doa-keluarga-bahagia',
    'doa-untuk-suami','doa-masuk-rumah-baru','doa-pembuka-majlis'
  )
);

-- 2. the articles
DELETE FROM articles WHERE slug IN (
  'doa-untuk-isteri','doa-malam-pertama','doa-keluarga-bahagia',
  'doa-untuk-suami','doa-masuk-rumah-baru','doa-pembuka-majlis'
);

COMMIT;
```

Then drop both caches, in this order, or the deleted pages keep serving:

```bash
curl -X POST https://hellokahwin.com/api/cron/revalidate-content \
  -H "Authorization: Bearer $CRON_SECRET"
# then purge the edge for each of the six URLs above, plus /sitemap.xml,
# /artikel and the pillar hub /artikel/ucapan-doa
```

## Partial undo

The six are NOT independent. They link to one another in the body, so removing one
leaves dead links on the survivors. The dependency map, read as "X carries a body link
to Y":

| removing this slug | breaks a body link on |
|---|---|
| `doa-untuk-isteri` | `doa-malam-pertama`, `doa-untuk-suami`, `doa-keluarga-bahagia` |
| `doa-malam-pertama` | `doa-untuk-isteri`, `doa-keluarga-bahagia` |
| `doa-untuk-suami` | `doa-untuk-isteri` |
| `doa-keluarga-bahagia` | `doa-untuk-suami`, `doa-masuk-rumah-baru` |
| `doa-masuk-rumah-baru` | nothing |
| `doa-pembuka-majlis` | nothing |

To reverse one, use its slug alone in both statements above **and** edit the paragraph
naming it on each page in the right-hand column, then re-ingest those pages with
`--commit --publish --update`. Removing `doa-masuk-rumah-baru` or `doa-pembuka-majlis`
alone needs no follow-up edit.

## Undo for the register rows

`docs/asset-register/asset-register.csv` gains NO new rows. Eight existing rows have
`digunakan_dalam` extended: `HK-P-0003`, `HK-P-0005`, `HK-P-0015`, `HK-P-0016`,
`HK-P-0020`, `HK-P-0021`, `HK-P-0027`, `HK-P-0033`, `HK-P-0072`, plus
`HK-P-0012`, `HK-P-0019`, `HK-P-0026` and `HK-P-0042`. The file as it stood before this
item is committed alongside it as `docs/asset-register/asset-register.csv.before-cont17`,
so the undo is a copy of that file over the live one.

## What this UNDO does NOT cover

Nothing new is uploaded to R2 by this item beyond re-uploads of photographs already in
the library, so there is no orphaned object to clean up that was not already there.

The GSC sitemap submission fired by the ingest cannot be un-submitted. It is a request
to re-crawl `/sitemap.xml`; once the rows are deleted and the caches dropped, the
sitemap no longer lists the six URLs and the request resolves itself.
