# CONT-18 — UNDO, recorded and pushed BEFORE the first production write

**Item:** CONT-18, Sprint 06 · **Owner:** `writer-adat-agama-prosedur` · **Date:** 2 September 2026

This file exists so the four writes below are reversible **in fact**, not in principle.
It is pushed before the first `pnpm ingest ... --commit --publish` runs.

## What the write does

Four rows are INSERTED into `articles` on the production database, each with a new
`article_categories` link and a set of `media` rows. Nothing is updated, nothing is
deleted, no existing row is touched. The write is purely additive.

Two of the four introduce new image assets to R2 (`S-klinik-kesihatan-meru-selangor-wiki-farazi.jpg`
and `S-utc-shah-alam-angys.jpg`, registered as `HK-P-0083` and `HK-P-0084`). The
other images are already live on other pages and are re-uploaded per article by
the ingest, which is its normal behaviour.

## The exact slugs written

| # | slug | pillar / cluster | resulting URL |
|---|---|---|---|
| 1 | `syarat-wali-nikah` | P1 / C1.2 | https://hellokahwin.com/artikel/nikah-undang-undang/syarat-wali-nikah |
| 2 | `hiv-test-kahwin` | P1 / C1.3 | https://hellokahwin.com/artikel/nikah-undang-undang/hiv-test-kahwin |
| 3 | `kursus-kahwin-selangor` | P1 / C1.3 | https://hellokahwin.com/artikel/nikah-undang-undang/kursus-kahwin-selangor |
| 4 | `kad-nikah-selangor` | P1 / C1.1 | https://hellokahwin.com/artikel/nikah-undang-undang/kad-nikah-selangor |

All four sit under the SAME pillar hub, `/artikel/nikah-undang-undang`. Cluster
`C1.3` (`Kursus kahwin & saringan pra-nikah`) held zero articles before this write.

## The undo, exactly

Run against the SAME production `DATABASE_URL` the ingest used. Order matters:
the child rows go first.

```sql
BEGIN;

-- 1. the category links
DELETE FROM article_categories
WHERE article_id IN (
  SELECT id FROM articles WHERE slug IN (
    'syarat-wali-nikah','hiv-test-kahwin','kursus-kahwin-selangor','kad-nikah-selangor'
  )
);

-- 2. the articles
DELETE FROM articles WHERE slug IN (
  'syarat-wali-nikah','hiv-test-kahwin','kursus-kahwin-selangor','kad-nikah-selangor'
);

COMMIT;
```

Then drop both caches, in this order, or the deleted pages keep serving:

```bash
curl -X POST https://hellokahwin.com/api/cron/revalidate-content \
  -H "Authorization: Bearer $CRON_SECRET"
# then purge the edge for each of the four URLs above, plus /sitemap.xml,
# /artikel and the pillar hub /artikel/nikah-undang-undang
```

## Partial undo

The four are independent. To reverse one, use its slug alone in both statements
above. `kursus-kahwin-selangor` carries a body link to `hiv-test-kahwin`, so if
only `hiv-test-kahwin` is removed, that link on the surviving page goes dead and
the paragraph naming it must be edited in the same pass.

## Undo for the register rows

`docs/asset-register/asset-register.csv` gained two rows (`HK-P-0083`,
`HK-P-0084`) and had `digunakan_dalam` extended on five existing rows
(`HK-P-0015`, `HK-P-0016`, `HK-P-0034`, `HK-P-0035`, `HK-P-0063`). The file as it
stood before this item is committed alongside it as
`docs/asset-register/asset-register.csv.before-cont18`, so the undo is a copy of
that file over the live one.

## What this UNDO does NOT cover

The R2 objects uploaded for the two new images are not deleted by the SQL above.
They are unreferenced once the rows are gone, which matches how every previous
content undo on this site has been scoped, and deleting an R2 object is not
reversible.
