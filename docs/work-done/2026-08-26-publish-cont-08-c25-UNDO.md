# UNDO — publish the eight C2.5 articles (CONT-08), 26 Aug 2026

Written **before** the first write, per the standing rule, and committed before
the first `--commit`. Undo here is a delete, not a restore: every one of the
eight slugs was absent from `articles` at capture time, and this run uses no
`--update`. If ingest ever refuses with "an article already exists at slug",
STOP: the assumption below no longer holds and this undo is wrong.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com` (production pooler, from
`.env` `DATABASE_URL` in this worktree).
**Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-cont-08.md` (docs repo)
**Drafts:** `docs/plans/aug-23-2026-session-01/drafts/ingest/C2-5-A1..A8-*.md` (docs repo)
**Companion SQL:** `2026-08-26-publish-cont-08-c25-UNDO.sql` · runnable form:
`.tmp-ops/cont08/undo-eight.mjs` (copied into the EVIDENCE folder).

## Pre-write state, captured 2026-08-26T15:29:09.924Z (UTC)

|                                       |                                                   |
| ------------------------------------- | ------------------------------------------------- |
| `articles` total                      | 61                                                |
| `articles` where `status='published'` | 61                                                |
| `media` total                         | 884                                               |
| `inspire_tags` total                  | 76                                                |
| `jsonb_typeof(content)` census        | `[{"t":"object","n":61}]` — zero `string` rows    |
| any of the eight target slugs present | **none**                                          |
| P2 `hantaran-mas-kahwin` published    | 13                                                |
| `sitemap.xml` `<loc>` count           | 78 (`x-vercel-cache: HIT`, `age: 2402`)           |

Published per top-level category before this run:

```
busana-pengantin 3   hantaran-mas-kahwin 13   idea-dan-nasihat 10   nikah-undang-undang 4
pelamin-kad-cenderahati 3   real-wedding 6   sebelum-nikah 3   ucapan-doa 5   venue-perancangan 4
```

## The eight slugs, verbatim, in ingest order

```
nisbah-hantaran                  -> /artikel/hantaran-mas-kahwin/nisbah-hantaran
hantaran-kahwin-5-balas-7        -> /artikel/hantaran-mas-kahwin/hantaran-kahwin-5-balas-7
hantaran-tunang-3-balas-5        -> /artikel/hantaran-mas-kahwin/hantaran-tunang-3-balas-5
bilangan-dulang-hantaran-ganjil  -> /artikel/hantaran-mas-kahwin/bilangan-dulang-hantaran-ganjil
duit-hantaran-kahwin             -> /artikel/hantaran-mas-kahwin/duit-hantaran-kahwin
cara-tetapkan-duit-hantaran      -> /artikel/hantaran-mas-kahwin/cara-tetapkan-duit-hantaran
adat-hantaran-berbeza-negeri     -> /artikel/hantaran-mas-kahwin/adat-hantaran-berbeza-negeri
hantaran-wajib-atau-adat         -> /artikel/hantaran-mas-kahwin/hantaran-wajib-atau-adat
```

Order matters on the way IN (each file links only to earlier siblings and to
live articles); it does not matter on the way OUT.

## Tags: the four that must NOT be deleted

`inspire_tags` held 76 rows. The eight files declare 18 distinct tag names.
**Four already existed** and belong to live articles:

```
hantaran   dulang-hantaran   adat-perkahwinan   bertunang     <-- PRE-EXISTING. DO NOT DELETE.
```

The 14 this run creates, safe to delete on undo:

```
nisbah-hantaran  hantaran-kahwin-5-balas-7  hantaran-tunang-3-balas-5  hantaran-tunang
bilangan-dulang-hantaran  duit-hantaran-kahwin  duit-hantaran  mas-kahwin  wang-hantaran
jumlah-duit-hantaran  merisik  adat-hantaran  hantaran-wajib-atau-adat  hukum-hantaran
```

## Media

Every image this run uploads gets a `media` row with `original_article_id` set
to the new article. `media.original_article_id` is **ON DELETE SET NULL, not
CASCADE**, so media rows are deleted FIRST, while the article ids still resolve.
R2 objects are not deleted by the SQL; they are orphaned, harmless, and listed in
the EVIDENCE folder's ingest transcript by key.

## Live articles this run links to, and their `published_at` at capture

None of these is written by this run. Check they are unchanged afterwards.

```
apa-itu-mas-kahwin      2026-08-24T15:46:11.393Z
cincin-tunang           2026-08-25T10:45:29.956Z
dulang-hantaran         2026-08-25T17:54:58.021Z
gubahan-hantaran        2026-08-25T17:55:20.340Z
hantaran-kahwin         2025-11-23T22:26:36.000Z
hantaran-tunang         2026-01-11T23:59:36.000Z
mas-kahwin-ikut-negeri  2025-11-23T21:56:36.000Z
sirih-junjung           2026-08-25T17:55:49.122Z
```

## How to run the undo

```
node .tmp-ops/cont08/undo-eight.mjs              # dry report: what would be deleted
node .tmp-ops/cont08/undo-eight.mjs --yes-really # one transaction, media first
```

Then `POST /api/cron/revalidate-content` with `CRON_SECRET`, and re-request
`/artikel/hantaran-mas-kahwin` and `/sitemap.xml` sequentially, a few seconds
apart, asserting the P2 count returns to 13 and the sitemap to 78.
