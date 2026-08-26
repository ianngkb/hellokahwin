# UNDO — publish P3 + P4 + P7 (nine articles), 25 Aug 2026

Written **before** the first write, per the standing rule. Production Supabase
has `pitr_enabled=false` and zero platform backups: this file is the only way
back.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com` (production pooler, from
`.env` `DATABASE_URL` in the site worktree).

## Pre-write state, captured 2026-08-25T10:37:55.363Z

| | |
|---|---|
| `articles` total | 44 |
| `articles` where `status='published'` | 44 |
| `media` total | 667 |
| `inspire_tags` total | **22** (NOT empty — see the tag section) |
| `jsonb_typeof(content)` census | `[{"t":"object","count":"44"}]` — zero `string` rows |
| any of the nine target slugs present | **none** |
| `sitemap.xml` `<loc>` count | 57 |

Published per pillar before this run:

```
P1 nikah-undang-undang      4
P2 hantaran-mas-kahwin      8
P3 ucapan-doa               0   <-- this run
P4 busana-pengantin         0   <-- this run
P5 pelamin-kad-cenderahati  0   BLOCKED, not touched
P6 venue-perancangan        4
P7 sebelum-nikah            0   <-- this run
```

## The nine slugs, verbatim

```
ucapan-pengantin-baru
doa-pengantin-baru
doa-majlis-perkahwinan
baju-pengantin-sewa-atau-beli
songket-tenunan-tangan-atau-cetak
inai-tangan-pengantin
cincin-tunang
taaruf-maksud
doa-majlis-pertunangan
```

**Nine, not ten.** The brief's table lists nine articles and its prose says
"ten"; the tenth in the verification batch was
`C5-2-A1-contoh-kad-jemputan-kahwin`, which the same brief then blocks along
with the rest of P5. Nine is the set that is not blocked. See the work-done log.

Every one of them is **new** — the pre-write check found none of the nine in
`articles`. Nothing is being overwritten, so undo is a delete, not a restore.
`--update` is not used on this run; if ingest ever refuses with "an article
already exists at slug", STOP — that means the assumption above no longer holds
and this undo is wrong.

## Nothing under P5 is touched

`pelamin-kad-cenderahati` owns zero published articles before this run and owns
zero after it. `C5-1-A1-pelamin`, `C5-4-A1-bunga-telur` and
`C5-2-A1-contoh-kad-jemputan-kahwin` are not ingested, not staged, and not
referenced by any command in this run.

## The tag slugs — and the two that must NOT be deleted

`inspire_tags` held **22 rows** before this run, so unlike the P1/P6 undo this
one cannot delete the whole tag set the batch mentions. Two of the 36 tag slugs
this batch needs **already existed** and belong to the live P1/P2/P6 articles:

```
akad-nikah      <-- PRE-EXISTING. DO NOT DELETE.
kos-kahwin      <-- PRE-EXISTING. DO NOT DELETE.
```

The 34 created by this run, safe to delete on undo:

```
adab-berdoa            adab-majlis            adab-tetamu-majlis
adat-pertunangan       aturcara-majlis        baju-pengantin
baju-pengantin-songket bertunang              busana-pengantin
cincin-merisik         cincin-nikah           cincin-tunang
doa-jodoh              doa-majlis-perkahwinan doa-majlis-pertunangan
doa-pengantin-baru     doa-perkahwinan        hukum-emas-lelaki
inai                   inai-pengantin         inai-tangan
istikharah-jodoh       jemputan-kahwin        kain-songket
khalwat                majlis-pertunangan     maksud-taaruf
pembaca-doa            penampilan-pengantin   putus-tunang
sewa-baju-pengantin    songket-terengganu     taaruf
ucapan-pengantin-baru
```

## Tables the ingest writes

`articles`, `article_categories`, `article_tags`, `inspire_tags`, `media`,
`media_article_usage`. Plus objects in R2 (originals + variants + smart crops).

FK delete rules, read from `information_schema` on production this run:

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
  select id from articles where slug = any(array[
    'ucapan-pengantin-baru','doa-pengantin-baru','doa-majlis-perkahwinan',
    'baju-pengantin-sewa-atau-beli','songket-tenunan-tangan-atau-cetak',
    'inai-tangan-pengantin','cincin-tunang','taaruf-maksud',
    'doa-majlis-pertunangan'
  ])
);

-- 2. The articles. Cascades article_categories, article_tags, media_article_usage.
delete from articles where slug = any(array[
  'ucapan-pengantin-baru','doa-pengantin-baru','doa-majlis-perkahwinan',
  'baju-pengantin-sewa-atau-beli','songket-tenunan-tangan-atau-cetak',
  'inai-tangan-pengantin','cincin-tunang','taaruf-maksud',
  'doa-majlis-pertunangan'
]);

-- 3. The 34 tags this run created. `akad-nikah` and `kos-kahwin` are
--    DELIBERATELY ABSENT from this list — they pre-date the run.
delete from inspire_tags where slug = any(array[
  'adab-berdoa','adab-majlis','adab-tetamu-majlis','adat-pertunangan',
  'aturcara-majlis','baju-pengantin','baju-pengantin-songket','bertunang',
  'busana-pengantin','cincin-merisik','cincin-nikah','cincin-tunang',
  'doa-jodoh','doa-majlis-perkahwinan','doa-majlis-pertunangan',
  'doa-pengantin-baru','doa-perkahwinan','hukum-emas-lelaki','inai',
  'inai-pengantin','inai-tangan','istikharah-jodoh','jemputan-kahwin',
  'kain-songket','khalwat','majlis-pertunangan','maksud-taaruf','pembaca-doa',
  'penampilan-pengantin','putus-tunang','sewa-baju-pengantin',
  'songket-terengganu','taaruf','ucapan-pengantin-baru'
]);

-- Expected afterwards: articles = 44, published = 44, media = 667,
-- inspire_tags = 22.
commit;
```

Then drop the caches, or the site keeps serving the deleted pages for up to 300s:

```
POST https://hellokahwin.com/api/cron/revalidate-content
Authorization: Bearer $CRON_SECRET
```

## What this undo does NOT reverse

**R2 objects.** The originals, variants and smart crops uploaded for the twelve
images stay in the bucket as orphans. They are unreferenced and invisible; they
cost storage, nothing else. Removing them needs the keys, which are recorded in
`.tmp-ops/ingest-p3-p4-p7-run.log` alongside this run. Deliberately out of
scope: a bucket delete is a worse risk than a few orphaned megabytes.

**Staging copies.** `docs/plans/aug-23-2026-session-01/drafts/ingest/` in the
docs repo gains nine files. They are inert text; delete them or leave them.
The originals in `drafts/` are not modified by this run at all.

## Ready-to-run

`.tmp-ops/undo-p3-p4-p7.mjs` in the site worktree executes exactly the SQL
above, in one transaction, and prints the row counts before and after. It
requires `--yes-really` on the command line; without it, it only reports what it
would delete.
