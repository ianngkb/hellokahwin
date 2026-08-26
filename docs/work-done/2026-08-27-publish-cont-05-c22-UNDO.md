# UNDO — publish the five C2.2 hantaran tunang articles (CONT-05), 27 Aug 2026

Written **before** the first write, per the standing rule, and committed before
the first `--commit`.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com` (production pooler, from
`.env` `DATABASE_URL` in this worktree).
**Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-cont-05.md` (docs repo)
**Drafts:** `docs/plans/aug-23-2026-session-01/drafts/ingest/C2-2-A2..A6-*.md` (docs repo,
branch `feat/cont-05-hantaran-tunang`)
**Companion SQL:** `2026-08-27-publish-cont-05-c22-UNDO.sql`

## Pre-write state, captured 2026-08-26T21:35:06.639Z (UTC) = 05:35 MYT, 27 Ogos

|                                        |                                                |
| -------------------------------------- | ---------------------------------------------- |
| `articles` total                       | 74                                              |
| `articles` where `status='published'`   | 74                                              |
| `media` total                          | 938                                             |
| `inspire_tags` total                   | 96                                              |
| `jsonb_typeof(content)` census         | `[{"t":"object","n":74}]` — zero `string` rows  |
| any of the five target slugs present   | **none**                                        |
| P2 `hantaran-mas-kahwin` published     | 26                                              |
| `sitemap.xml` `<loc>` count            | 91 (`x-vercel-cache: HIT`, `age: 156`)          |

Published per top-level category before this run:

```
busana-pengantin 3        fotografi-videografi 1   glamor-eksklusif 2
hantaran-mas-kahwin 26    hiasan-dekorasi 1        idea-dan-nasihat 10
minimalis-mewah 1         moden-kontemporari 4     nikah-undang-undang 4
pantai-santai 1           pelamin-kad-cenderahati 3  real-wedding 6
sebelum-nikah 3           ucapan-doa 5             venue-perancangan 4
```

## The five slugs, verbatim, in ingest order

```
hantaran-tunang-untuk-lelaki     -> /artikel/hantaran-mas-kahwin/hantaran-tunang-untuk-lelaki
hantaran-tunang-untuk-perempuan  -> /artikel/hantaran-mas-kahwin/hantaran-tunang-untuk-perempuan
berapa-dulang-hantaran-tunang    -> /artikel/hantaran-mas-kahwin/berapa-dulang-hantaran-tunang
hantaran-tunang-simple           -> /artikel/hantaran-mas-kahwin/hantaran-tunang-simple
barang-hantaran-tunang           -> /artikel/hantaran-mas-kahwin/barang-hantaran-tunang
```

## Why this run writes TWICE, and why the undo is still a plain delete

The five articles cross-link each other. `scripts/ingest-article.mts` refuses a
file whose `internalLinks` or body links name a slug that is not yet a
**published** article, so a single pass cannot work: whichever file goes first
names four that do not exist yet.

So:

- **Pass 1** ingests five copies with the sibling cross-links stripped, under
  `--commit --publish`. Every remaining link resolves against articles that were
  already live before this run.
- **Pass 2** ingests the real files, cross-links restored, under
  `--commit --update --publish`, with `publishedAt:` pinned to the value pass 1
  wrote. Pinning matters: `on conflict` sets
  `published_at = excluded.published_at`, and that value is
  `frontMatter.publishedAt ?? new Date().toISOString()`
  (`scripts/ingest-article.mts:713`), so an unpinned second pass would restamp
  all five with a later timestamp.

Both passes write the same five slugs. Nothing else is touched, and `--update`
never reaches a row this run did not create, so the delete above remains
complete.

## Four tags are deliberately NOT deleted

`hantaran-tunang`, `bertunang`, `bajet-kahwin` and `adat-pertunangan` already
existed at capture time and belong to live articles. That was checked with a
query against `inspire_tags` at capture, not assumed from the draft files. The
seven that this run creates are listed in the SQL.

## How to run it

The SQL ends in `rollback;`. Read the verify row first, then change the last two
lines deliberately. Expected after undo: `articles 74`, `published 74`,
`p2_published 26`, `target_slugs_remaining 0`.

R2 objects uploaded by the run are **not** removed by this undo. They are
orphaned, not harmful, and deleting object storage has no recovery path — that
stays a CEO decision.

## What this undo does NOT cover

Nothing in this run edits an existing article, a category, a redirect rule or
the sitemap by hand. If any of those changed, this undo is the wrong instrument
and the change came from somewhere else.
