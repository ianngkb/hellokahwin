# UNDO — publish P1 + P6 (eight articles), 25 Aug 2026

Written **before** the first write, per the standing rule. Production Supabase
has `pitr_enabled=false` and zero platform backups: this file is the only way
back.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com` (production pooler, from
`.env` `DATABASE_URL` in the site worktree).

## Pre-write state, captured 2026-08-25T10:08:44.637Z

| | |
|---|---|
| `articles` total | 36 |
| `articles` where `status='published'` | 36 |
| `media` total | 649 |
| `inspire_tags` total | **0** (table empty) |
| any of the eight target slugs present | **none** |

## The eight slugs, verbatim

```
borang-nikah
rukun-nikah
syarat-sah-nikah
lafaz-taklik
harga-sewa-dewan-kahwin
checklist-kahwin
pakej-dewan-kahwin
bajet-kahwin
```

Every one of them is **new**. Nothing is being overwritten, so undo is a delete,
not a restore. No `--update` is used on this run; if the ingest ever refuses with
"an article already exists at slug", STOP — that means the assumption above no
longer holds and this undo is wrong.

## The 22 tag slugs this run creates

`inspire_tags` held **zero rows** before this run, so every tag below is created
by it and every one is safe to delete on undo.

```
akad-nikah  bajet-kahwin  borang-nikah  checklist-kahwin  dewan-kahwin
e-munakahat  kebenaran-berkahwin  kos-kahwin  lafaz-taklik  mahkamah-syariah
pakej-dewan-kahwin  pendaftaran-nikah  perancangan-majlis  persediaan-kahwin
rukun-nikah  saksi-nikah  sewa-dewan  sppim  syarat-sah-nikah  taklik-nikah
undang-undang-keluarga-islam  wali-nikah
```

## Tables the ingest writes

`articles`, `article_categories`, `article_tags`, `inspire_tags`, `media`,
`media_article_usage`. Plus objects in R2 (originals + variants + smart crops).

FK delete rules, read from `information_schema` on production:

```
article_categories.article_id  -> articles  ON DELETE CASCADE
article_tags.article_id        -> articles  ON DELETE CASCADE
media_article_usage.article_id -> articles  ON DELETE CASCADE
media.original_article_id      -> articles  ON DELETE SET NULL   <-- the trap
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
    'borang-nikah','rukun-nikah','syarat-sah-nikah','lafaz-taklik',
    'harga-sewa-dewan-kahwin','checklist-kahwin','pakej-dewan-kahwin','bajet-kahwin'
  ])
);

-- 2. The articles. Cascades article_categories, article_tags, media_article_usage.
delete from articles where slug = any(array[
  'borang-nikah','rukun-nikah','syarat-sah-nikah','lafaz-taklik',
  'harga-sewa-dewan-kahwin','checklist-kahwin','pakej-dewan-kahwin','bajet-kahwin'
]);

-- 3. The tags. Safe ONLY because inspire_tags was empty before this run.
delete from inspire_tags where slug = any(array[
  'akad-nikah','bajet-kahwin','borang-nikah','checklist-kahwin','dewan-kahwin',
  'e-munakahat','kebenaran-berkahwin','kos-kahwin','lafaz-taklik','mahkamah-syariah',
  'pakej-dewan-kahwin','pendaftaran-nikah','perancangan-majlis','persediaan-kahwin',
  'rukun-nikah','saksi-nikah','sewa-dewan','sppim','syarat-sah-nikah','taklik-nikah',
  'undang-undang-keluarga-islam','wali-nikah'
]);

-- Expected afterwards: articles = 36, published = 36, media = 649, inspire_tags = 0.
commit;
```

Then drop the caches, or the site keeps serving the deleted pages for up to 300s:

```
POST https://hellokahwin.com/api/cron/revalidate-content
Authorization: Bearer $CRON_SECRET
```

## What this undo does NOT reverse

**R2 objects.** The originals, variants and smart crops uploaded for the 13
images stay in the bucket as orphans. They are unreferenced and invisible; they
cost storage, nothing else. Removing them needs the keys, which are recorded in
`.tmp-ops/ingest-p1-p6-*.log` alongside this run. Deliberately out of scope: a
bucket delete is a worse risk than a few orphaned megabytes.

## Ready-to-run

`.tmp-ops/undo-p1-p6.mjs` in the site worktree executes exactly the SQL above,
in one transaction, and prints the row counts before and after. It requires
`--yes-really` on the command line; without it, it only reports what it would
delete.
