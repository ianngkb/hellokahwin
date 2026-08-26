# UNDO — publish P5, the seventh and last pillar (three articles), 25 Aug 2026

Written **before** the first write, per the standing rule. Production Supabase
has `pitr_enabled=false` and zero platform backups: this file is the only way
back.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com` (production pooler, from
`.env` `DATABASE_URL` in the site worktree).

## Pre-write state, captured 2026-08-25T11:20:59.255Z

| | |
|---|---|
| `articles` total | 53 |
| `articles` where `status='published'` | 53 |
| `media` total | 739 |
| `inspire_tags` total | **56** (NOT empty — see the tag section) |
| `jsonb_typeof(content)` census | `[{"t":"object","count":"53"}]` — zero `string` rows |
| any of the three target slugs present | **none** |
| `sitemap.xml` `<loc>` count | 69 (captured 11:21:11.429Z) |

Published per pillar before this run:

```
P1 nikah-undang-undang      4
P2 hantaran-mas-kahwin      8
P3 ucapan-doa               3
P4 busana-pengantin         3
P5 pelamin-kad-cenderahati  0   <-- this run
P6 venue-perancangan        4
P7 sebelum-nikah            3
   idea-dan-nasihat        10   (legacy, no pillar_code)
   real-wedding             6   (legacy, no pillar_code)
```

## The three slugs, verbatim

```
pelamin
contoh-kad-jemputan-kahwin
bunga-telur
```

Every one of them is **new** — the pre-write check found none of the three in
`articles`. Nothing is being overwritten, so undo is a delete, not a restore.
`--update` is not used on this run; if ingest ever refuses with "an article
already exists at slug", STOP — that means the assumption above no longer holds
and this undo is wrong.

## The `pelamin` row carries one owner-approved text change

Recorded here so the undo is complete. `pelamin`'s `metaDescription` was trimmed
169 -> 160 characters before ingest, because `articleFileSchema` refuses anything
over 160 and the file was otherwise unpublishable. **Owner-approved**, via the
team lead.

```
BEFORE (169): Jenis pelamin rumah, mini dan dewan, saiz dalam kaki, dan empat perkara yang menggerakkan harga. Hampir tiada vendor menyiarkan harga, jadi ini cara menilai sebut harga.
AFTER  (160): Jenis pelamin rumah, mini dan dewan, saiz dalam kaki, empat perkara yang menggerakkan harga. Hampir tiada vendor menyiarkan harga; ini cara menilai sebut harga.
```

The change lives ONLY in the staging copy at `drafts/ingest/C5-1-A1-pelamin.md`
and in the `articles.meta_description` column. **`drafts/C5-1-A1-pelamin.md` is
byte-unchanged** and still reads 169 — so the full undo below restores the
original state exactly, with no text to put back.

To change the field alone WITHOUT deleting the row, edit the staging copy and
re-ingest; do not hand-edit the column:

```
pnpm --silent ingest drafts/ingest/C5-1-A1-pelamin.md --db "$DB" --commit --update --publish --revalidate-url https://hellokahwin.com
```

Note that the original's 169 characters cannot be restored to production by any
route — the schema refuses it. Restoring it means shortening it differently.

## The pillar hub is NOT edited, and undo does not need to re-`noindex` it

`/artikel/pelamin-kad-cenderahati` is `noindex,follow` today because
`src/app/(public)/artikel/[category]/page.tsx:264-283` emits it for any hub
whose category tree owns **zero** published articles. It is a computed property
of the article rows, not a stored flag. Deleting the three articles restores
`total = 0` and the hub goes back to `noindex` by itself. **No row in
`inspire_categories` is written by this run and none needs restoring.**

## The tag slugs — and the two that must NOT be deleted

`inspire_tags` held **56 rows** before this run. Two of the 11 tag slugs this
batch needs **already existed** and belong to live P1/P2/P4/P6/P7 articles:

```
kos-kahwin          <-- PRE-EXISTING. DO NOT DELETE.
perancangan-majlis  <-- PRE-EXISTING. DO NOT DELETE.
```

The 9 created by this run, safe to delete on undo:

```
adat-perkahwinan   bunga-pahar   bunga-telur
dekorasi-majlis    doorgift      jemputan
kad-jemputan-kahwin  kad-kahwin  pelamin
```

Note `bunga-telur` and `pelamin` appear as both an article slug and a tag slug.
Different tables; the SQL below targets each by table, so there is no collision.

## Tables the ingest writes

`articles`, `article_categories`, `article_tags`, `inspire_tags`, `media`,
`media_article_usage`. Plus objects in R2 (originals + variants + smart crops).

FK delete rules, re-read from `information_schema` on production this run —
unchanged from the P3/P4/P7 undo:

```
article_categories.article_id         -> articles  ON DELETE CASCADE
article_category_redirects.article_id -> articles  CASCADE
article_edit_locks.article_id         -> articles  CASCADE
article_tags.article_id               -> articles  CASCADE
dynamic_block_rules.article_id        -> articles  CASCADE
media_article_usage.article_id        -> articles  CASCADE
legacy_image_redirects.article_id     -> articles  SET NULL
media.original_article_id             -> articles  SET NULL   <-- the trap
seo_indexnow_submissions.article_id   -> articles  SET NULL
```

`media` does **not** cascade. Delete the media rows FIRST, while
`original_article_id` still points at the articles; once the articles are gone
the link is NULL and the media rows can no longer be found this way.

## Undo, in order

```sql
begin;

-- 1. Media first — ON DELETE SET NULL means this must happen before step 2.
delete from media
where original_article_id in (
  select id from articles
  where slug = any(array['pelamin','contoh-kad-jemputan-kahwin','bunga-telur'])
);

-- 2. The articles. Cascades article_categories, article_tags,
--    media_article_usage.
delete from articles
where slug = any(array['pelamin','contoh-kad-jemputan-kahwin','bunga-telur']);

-- 3. The 9 tags this run created. `kos-kahwin` and `perancangan-majlis` are
--    DELIBERATELY ABSENT from this list — they pre-date the run.
delete from inspire_tags where slug = any(array[
  'adat-perkahwinan','bunga-pahar','bunga-telur','dekorasi-majlis','doorgift',
  'jemputan','kad-jemputan-kahwin','kad-kahwin','pelamin'
]);

-- Expected afterwards: articles = 53, published = 53, media = 739,
-- inspire_tags = 56, and P5 published = 0 (hub returns to noindex on its own).
commit;
```

Then drop the caches, or the site keeps serving the deleted pages for up to 300s:

```
POST https://hellokahwin.com/api/cron/revalidate-content
Authorization: Bearer $CRON_SECRET
```

## What this undo does NOT reverse

**R2 objects.** The originals, variants and smart crops uploaded for the eight
images stay in the bucket as orphans. They are unreferenced and invisible; they
cost storage, nothing else. Removing them needs the keys, which are recorded in
`.tmp-ops/ingest-p5-run.log` alongside this run. Deliberately out of scope: a
bucket delete is a worse risk than a few orphaned megabytes.

**Staging copies.** `docs/plans/aug-23-2026-session-01/drafts/ingest/` in the
docs repo gains three files. They are inert text; delete them or leave them.
The originals in `drafts/` are not modified by this run at all.

## Ready-to-run

`.tmp-ops/undo-p5.mjs` in the site worktree executes exactly the SQL above, in
one transaction, and prints the row counts before and after. It requires
`--yes-really` on the command line; without it, it only reports what it would
delete.
