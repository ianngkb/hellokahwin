# Undo record — putting a credited photograph on a live C2.4 article

**Written BEFORE any production write.** 25 Ogos 2026.
Production carries `pitr_enabled=false` and zero platform backups. This file and
`before-state.json` beside it are the only way back.

Target: `aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`.

---

## 1. What this run touches

**ONE row: `apa-itu-mas-kahwin`.** The other seven C2.4 slugs are captured in
`before-state.json` as a precaution and are NOT written to. If any of the seven
differs after the run, something went wrong and the run should be reversed.

The run is `pnpm ingest ... --commit --update --publish --revalidate-url`, which
is an UPSERT on the existing row. No row is created and no row is deleted, so
the slug — and therefore the URL — cannot move.

## 2. The exact before-state of the row being written

```
slug          apa-itu-mas-kahwin
id            fc26f9b1-f4ba-4982-8a26-558ba74d14b8
status        published
published_at  2026-08-24T15:46:11.393Z
updated_at    2026-08-24T15:46:14.887Z
review_status pending_review
authorship    ai
reviewed_at   null
reviewed_by   null
cover_image_url
  https://images.hellokahwin.com/inspire/apa-itu-mas-kahwin/1787586367878-apa-itu-mas-kahwin-kad-tajuk.png
content       jsonb STRING (see §5), 63 top-level blocks, 0 figureBlock nodes
```

Every column of all eight rows, plus their `article_categories`,
`article_tags`, `media` and `media_article_usage` rows, is in
`before-state.json`.

## 3. What changes, precisely

1. `content` gains ONE `figureBlock` node at top-level index 2 (between the
   second and third paragraphs). Nothing else in the body changes — the same
   markdown produces the same 63 blocks.
2. `cover_image_url` and the cover variant/crop columns are rewritten to a NEW
   R2 key, because ingest stamps every upload with the run's timestamp so it
   never overwrites an object served under `max-age=31536000, immutable`. The
   cover GRAPHIC is byte-identical; only its URL moves.
3. One new `media` row for the photograph, and one `media_article_usage` row.
4. `updated_at` moves to now. `published_at` does NOT move: `publishedAt` was
   added to the article file with the exact value above, so the upsert writes
   the same instant back.

## 4. Undo

```sql
-- Verify first. Expect exactly one row, updated today, with one figureBlock.
select id, slug, status, published_at, updated_at,
       (content::text like '%figureBlock%') as has_figure
from articles where slug = 'apa-itu-mas-kahwin';
```

To reverse, restore the four columns from `before-state.json`
(`.articles[] | select(.slug=="apa-itu-mas-kahwin")`):

```sql
begin;
  update articles set
    content                    = $1::jsonb,   -- .content, VERBATIM (see §5)
    cover_image_url            = $2,
    cover_image_variants       = $3::jsonb,
    cover_image_smart_crops    = $4::jsonb,
    cover_image_focal_point    = $5::jsonb,
    cover_image_detection_data = $6::jsonb,
    published_at               = '2026-08-24T15:46:11.393Z',
    updated_at                 = '2026-08-24T15:46:14.887Z'
  where slug = 'apa-itu-mas-kahwin';

  -- The photograph's media row. Identify it by r2_key, which is unique and
  -- carries this run's timestamp; the cover's media row is a separate row.
  delete from media_article_usage
   where media_id in (select id from media
                       where r2_key like 'inspire/apa-itu-mas-kahwin/%'
                         and r2_key like '%azlan-dupree%');
  delete from media where r2_key like 'inspire/apa-itu-mas-kahwin/%'
                      and r2_key like '%azlan-dupree%';
commit;
```

Then drop the caches, or the site keeps serving the reverted page's replacement:

```
POST https://hellokahwin.com/api/cron/revalidate-content
Authorization: Bearer $CRON_SECRET
```

R2 objects are left in place deliberately. They are addressed by a timestamped
key nothing else points at, they are immutable, and deleting bytes is the one
step of this that cannot itself be undone.

## 5. A trap in the restore — read before running it

`articles.content` on all eight of these rows is a jsonb **string**, not a jsonb
object: `jsonb_typeof(content)` returns `string`. Every one of the 29 legacy
articles returns `object`. The site renders both because Drizzle's `jsonb`
column parses a string value on the way out, but the shapes are not the same.

So when restoring `content`, write back the value in `before-state.json`
**exactly as captured** — do not "fix" it into an object on the way in. A
restore that changes the shape is not a restore.

The double-encoding itself is a defect in `scripts/ingest-article.mts` and is
reported separately. It is NOT fixed by this run.


---

# Run 2 — the jsonb shape fix across all eight, 25 Ogos 2026

Authorised by the CEO after run 1. Two things happen in one pass: every one of
the eight rows is rewritten with correctly-encoded jsonb, and photographs are
added to two more articles.

`before-state-run2.json` beside this file is the capture taken immediately
before it, and it carries a `jsonbShapes` block recording the shape of every
jsonb column on every row, per the instruction to capture the before-shape.

## The before-shape, exactly

```
slug                                content  cover_variants  cover_crops  focal   detection
apa-itu-mas-kahwin                  object   object          object       object  object     <- fixed in run 1
mas-kahwin-ikut-negeri              string   string          string       string  string
mas-kahwin-johor                    string   string          string       string  string
mas-kahwin-kelantan-terengganu      string   string          string       string  string
mas-kahwin-melebihi-kadar-minimum   string   string          string       string  string
mas-kahwin-pahang-negeri-sembilan   string   string          string       string  string
mas-kahwin-perak                    string   string          string       string  string
mas-kahwin-sabah-sarawak            string   string          string       string  string
```

All 29 legacy articles read `object` on `content` and always did. The eight
above are the only rows in the table with the string shape, and every one of
them was written by `scripts/ingest-article.mts`.

After this run all eight read `object`, and `content->'content'` is queryable on
every one of them.

## What changes

1. `content`, `cover_image_variants`, `cover_image_smart_crops`,
   `cover_image_focal_point`, `cover_image_detection_data` and the matching
   `media` columns change SHAPE, from a jsonb string to the jsonb object it
   always should have been. The decoded VALUE is unchanged.
2. `mas-kahwin-ikut-negeri` gains one `figureBlock` at index 2.
   `mas-kahwin-melebihi-kadar-minimum` gains one at index 5.
   The other six gain nothing; their bodies are byte-identical after decoding.
3. All eight get new timestamped R2 keys for their cover, so `cover_image_url`
   and the crop URLs move. The cover graphics themselves are unchanged.
4. `updated_at` moves to now on all eight. `published_at` does NOT move on any
   of them: `publishedAt` is now carried in all eight article files with the
   exact value recorded in `before-state-run2.json`.

## Undo

Same shape as run 1, applied to whichever rows need reverting. Restore
`content`, the five cover columns and `published_at` / `updated_at` per row from
`before-state-run2.json`.

**The trap from §5 is now REVERSED, and it matters.** Run 1's warning said to
write the captured value back verbatim because the stored shape was a string.
That is still true of `before-state-run2.json` — it captured strings for seven
rows — so a restore from it puts the double-encoded shape BACK. That is a
correct restore of the data, and it is also a reintroduction of the defect.

If you are reverting because the photographs are wrong, revert only `content`
and leave the shape fix in place. If you are reverting because the shape fix
broke something, revert the whole row and reopen the script change.

Reverting the shape alone, without a full restore:

```sql
-- Turns a double-encoded row back into a proper object in place. Safe to run
-- on a row already in the object shape: the guard makes it a no-op.
update articles
   set content = (content #>> '{}')::jsonb
 where slug = $1 and jsonb_typeof(content) = 'string';
```

Then drop the caches, as in run 1.
