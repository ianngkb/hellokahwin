# UNDO — publish the five staged articles + swap the kursus fee table, 26 Aug 2026

Written **before** the first write, per the standing rule. There is a verified
recovery point now (R2 dump, restored into a throwaway database and checked by
row count), but a targeted undo is cheaper than a restore and this file is it.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com` (production pooler, from
`.env` `DATABASE_URL` in the site worktree).
**Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-publish-staged-five.md` (docs repo)

## This run makes TWO kinds of change, and they undo differently

1. **Five new article rows** — inserts. Undo is a delete.
2. **One edit to an existing live row** (`kursus-kahwin`) — an in-place
   `content` rewrite. Undo is a **restore** from the byte-exact snapshot at
   `…-EVIDENCE/kursus-kahwin.BEFORE.json`, taken before anything was written.

Do not run half of this. The two halves are independent; either can be undone
without the other.

## Pre-write state, captured 2026-08-25T17:51:43.464Z (UTC)

|                                       |                                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `articles` total                      | 56                                                                                                                     |
| `articles` where `status='published'` | 56                                                                                                                     |
| `media` total                         | 757                                                                                                                    |
| `inspire_tags` total                  | 65                                                                                                                     |
| `jsonb_typeof(content)` census        | `[{"t":"object","n":56}]` — zero `string` rows                                                                         |
| any of the five target slugs present  | **none**                                                                                                               |
| `sitemap.xml` `<loc>` count           | 73 (captured 17:51:44Z, `x-vercel-cache: HIT`, `age: 1266`)                                                            |
| `kursus-kahwin` row                   | `id=1c2e96ae-340f-4226-bb32-363da8cbe3d0`, shape `object`, 23,655 content bytes, `updated_at=2026-08-25T09:25:56.828Z` |

Published per top-level category before this run:

```
busana-pengantin           3      pelamin-kad-cenderahati    3
hantaran-mas-kahwin        8      real-wedding               6   (legacy)
idea-dan-nasihat          10      sebelum-nikah              3
nikah-undang-undang        4      ucapan-doa                 3
uncategorized              0      venue-perancangan          4
```

## The five slugs, verbatim

```
dulang-hantaran                        -> /artikel/hantaran-mas-kahwin/dulang-hantaran
gubahan-hantaran                       -> /artikel/hantaran-mas-kahwin/gubahan-hantaran
sirih-junjung                          -> /artikel/hantaran-mas-kahwin/sirih-junjung
walimatul-urus                         -> /artikel/ucapan-doa/walimatul-urus
skrip-pengacara-majlis-perkahwinan     -> /artikel/ucapan-doa/skrip-pengacara-majlis-perkahwinan
```

Every one is **new** — the pre-write check found none of the five in `articles`.
Nothing is being overwritten, so undo for these is a delete, not a restore.
`--update` is **not** used on any of the five; if ingest ever refuses with "an
article already exists at slug", STOP — the assumption above no longer holds and
this undo is wrong.

## The tag slugs — and the four that must NOT be deleted

`inspire_tags` held **65 rows** before this run. The five files declare 15
distinct tag names, which slugify to 15 slugs. **Four already existed** and
belong to live articles:

```
bajet-kahwin          <-- PRE-EXISTING. DO NOT DELETE.
adat-perkahwinan      <-- PRE-EXISTING. DO NOT DELETE.
adab-tetamu-majlis    <-- PRE-EXISTING. DO NOT DELETE.
jemputan-kahwin       <-- PRE-EXISTING. DO NOT DELETE.
```

The 11 created by this run, safe to delete on undo:

```
dulang-hantaran     gubahan-hantaran   hantaran            persiapan-kahwin
sirih-junjung       walimatul-urus     kenduri-kahwin      protokol-majlis
skrip-pengacara-majlis-perkahwinan     aturcara-majlis-perkahwinan
teks-pengacara-majlis
```

`dulang-hantaran`, `gubahan-hantaran`, `sirih-junjung`, `walimatul-urus` and
`skrip-pengacara-majlis-perkahwinan` each appear as **both** an article slug and
a tag slug. Different tables; the SQL below targets each by table, so there is
no collision.

## Tables the ingest writes

`articles`, `article_categories`, `article_tags`, `inspire_tags`, `media`,
`media_article_usage`. Plus objects in R2 (originals + variants + smart crops).

FK delete rules, re-read from `information_schema` **on production this run**:

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

## The pillar hubs are NOT edited, and undo does not need to touch them

Both `/artikel/hantaran-mas-kahwin` (8 published articles) and
`/artikel/ucapan-doa` (3) already own published articles, so neither is
`noindex` today and neither changes indexability because of this run.
**No row in `inspire_categories` is written by this run and none needs
restoring.**

## Undo part 1 — the five articles

Full SQL in `2026-08-26-publish-staged-five-UNDO.sql`, one transaction. In
short:

```sql
begin;
delete from media where original_article_id in (
  select id from articles where slug = any(array[
    'dulang-hantaran','gubahan-hantaran','sirih-junjung',
    'walimatul-urus','skrip-pengacara-majlis-perkahwinan']));
delete from articles where slug = any(array[
  'dulang-hantaran','gubahan-hantaran','sirih-junjung',
  'walimatul-urus','skrip-pengacara-majlis-perkahwinan']);
delete from inspire_tags where slug = any(array[
  'dulang-hantaran','gubahan-hantaran','hantaran','persiapan-kahwin',
  'sirih-junjung','walimatul-urus','kenduri-kahwin','protokol-majlis',
  'skrip-pengacara-majlis-perkahwinan','aturcara-majlis-perkahwinan',
  'teks-pengacara-majlis']);
commit;
```

Expected afterwards: `articles` = 56, published = 56, `media` = 757,
`inspire_tags` = 65, `hantaran-mas-kahwin` = 8, `ucapan-doa` = 3.

## Undo part 2 — the kursus fee table

`2026-08-26-publish-staged-five-EVIDENCE/kursus-kahwin.BEFORE.json` holds the
**byte-exact** pre-write `content::text` for row
`1c2e96ae-340f-4226-bb32-363da8cbe3d0`, alongside its `id`, `slug`, `title`,
`status` and `updated_at`. (The session scratch copy is
`.tmp-ops/pub5/kursus.BEFORE.json`; the committed one is the durable route.)
Restoring is a single write of that string back into the column:

```
node docs/work-done/2026-08-26-publish-staged-five-EVIDENCE/restore-kursus.mjs --yes-really
```

which asserts the row id still matches, writes `content` back from the snapshot
with `sql.json()` (never `JSON.stringify` — see the note in
`ingest-article.mts`), and re-checks `jsonb_typeof(content) = 'object'`. The
raw SQL equivalent is in the `.sql` file.

**Only `content` and `updated_at` are written by the swap.** Title, slug,
status, meta, cover, categories, tags and every media row are untouched, so
nothing else needs restoring.

### ⚠ This row moved under us four minutes after the swap

At **18:01:59Z**, while this run was still writing up, the **SEO-02
internal-linking session added five editorial links to this same row** — blocks
11, 69 and 73, into `rukun-nikah`, `syarat-sah-nikah`, `borang-nikah`,
`lafaz-taklik` and `taaruf-maksud`. The fee section (blocks 12–31) is
byte-identical to what this run wrote; verified by key-order-normalised
comparison in `…-EVIDENCE/whochanged2.mjs`, because Postgres reorders jsonb
object keys and a naive diff calls every block changed.

**A blind restore now deletes that session's work as well as the fee table.**
`restore-kursus.mjs` was hardened for it: it compares the live document against
what this run wrote (`…-EVIDENCE/kursus-kahwin.AFTER.json`), reports any block
that has moved, and **refuses** unless also given `--i-know-it-moved`. It
currently refuses, with exit code 4, and that is correct.

To undo only the fee table without touching the newer links, splice blocks
12–31 back to the original two nodes rather than restoring the whole document.

## Then drop the caches, or the site keeps serving the undone pages

```
POST https://hellokahwin.com/api/cron/revalidate-content
Authorization: Bearer $CRON_SECRET
```

and purge the Vercel edge for the affected paths, or they stay stale for up to
300s (an hour for the sitemap):

```
/artikel/hantaran-mas-kahwin/dulang-hantaran     /artikel/hantaran-mas-kahwin
/artikel/hantaran-mas-kahwin/gubahan-hantaran    /artikel/ucapan-doa
/artikel/hantaran-mas-kahwin/sirih-junjung       /artikel/idea-dan-nasihat
/artikel/ucapan-doa/walimatul-urus               /sitemap.xml
/artikel/ucapan-doa/skrip-pengacara-majlis-perkahwinan
/artikel/idea-dan-nasihat/kursus-kahwin
```

## What this undo does NOT reverse

**R2 objects.** Originals, variants and smart crops uploaded for the 24 declared
images stay in the bucket as orphans. Unreferenced and invisible; they cost
storage, nothing else. The keys are in `.tmp-ops/pub5/ingest-run.log`. Deliberately
out of scope — a bucket delete is a worse risk than a few orphaned megabytes.

**Staging copies.** `docs/plans/aug-23-2026-session-01/drafts/ingest/` in the
docs repo gains two files (`P3-A4-walimatul-urus.md`,
`P3-A5-skrip-pengacara-majlis-perkahwinan.md`). Inert text; delete them or leave
them. The originals in `drafts/` are byte-unchanged by this run. The three C2.3
files were already staged there before this run began and are not modified.
