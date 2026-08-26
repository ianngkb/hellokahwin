# UNDO — publish the five C2.3 articles (CONT-06), 27 Aug 2026

Written **before** the first write, per the standing rule, and committed before
the first `--commit`. Undo here is a delete, not a restore: every one of the
five slugs was absent from `articles` at capture time (prestate,
2026-08-26T17:20:25.409Z UTC). This run uses `--update` ONLY on two of its own
five slugs (`hantaran-tempah-atau-buat-sendiri`, `gubahan-hantaran-simple`),
minutes after their own first insert, to restore intra-batch links stripped for
dependency order — never on a pre-existing article. If ingest ever refuses with
"an article already exists at slug" on the FIRST pass, STOP: the assumption
below no longer holds and this undo is wrong.

**Target:** `aws-0-ap-southeast-1.pooler.supabase.com` (production pooler, from
`.env` `DATABASE_URL` in this worktree).
**Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-cont-06.md` (docs repo)
**Drafts:** `docs/plans/aug-23-2026-session-01/drafts/ingest/C2-3-A4..A8-*.md`
(docs repo, commit 3998f76 after review-board revision)
**Companion SQL:** `2026-08-27-publish-cont-06-c23-UNDO.sql` — runnable form:
`.tmp-ops/cont06/undo-five.mjs` (copied into the EVIDENCE folder).

## Pre-write state, captured 2026-08-26T17:20:25.409Z (UTC)

|                                       |                                                 |
| ------------------------------------- | ----------------------------------------------- |
| `articles` total                      | 69                                              |
| `articles` where `status='published'` | 69                                              |
| `media` total                         | 911                                             |
| `inspire_tags` total                  | 90                                              |
| `jsonb_typeof(content)` census        | `[{"t":"object","n":69}]` — zero `string` rows  |
| any of the five target slugs present  | **none**                                        |
| P2 `hantaran-mas-kahwin` published    | 21                                              |

Tag slugs pre-existing (never delete): gubahan-hantaran, dulang-hantaran,
persiapan-kahwin, bajet-kahwin. Will-be-new (safe to delete): hantaran-simple,
tema-hantaran, hantaran-coklat, hantaran-makanan, hidden-hantaran,
kotak-hantaran.

`published_at` of the live articles the five link to, which must be
byte-identical after the run:

```
bajet-kahwin     2026-08-25T10:13:18.957Z   hantaran-kahwin  2025-11-23T22:26:36.000Z
dulang-hantaran  2026-08-25T17:54:58.021Z   hantaran-tunang  2026-01-11T23:59:36.000Z
gubahan-hantaran 2026-08-25T17:55:20.340Z   sirih-junjung    2026-08-25T17:55:49.122Z
```

## The five slugs, in ingest order (two-pass because the link graph is cyclic)

Pass 1 — `hantaran-tempah-atau-buat-sendiri` (links to unpublished A5/A6/A7
stripped), `gubahan-hantaran-simple` (link to unpublished A5 stripped),
`hantaran-tema-warna`, `hantaran-coklat`, `hidden-hantaran`.
Pass 2 — `--update` restores the stripped links on the first two, with
`publishedAt` pinned from the DB so the publish date cannot restamp.
Then the `hidden-hantaran` cover focal-point override {x:0.15, y:0.80} (its
subject sits bottom-left; saliency would crop it out), stored in
`articles.cover_image_focal_point_override` and applied by regenerating crops.

## R2 note

Ingest uploads image objects under `inspire/`. The undo does not delete R2
objects: orphaned image objects are harmless, cost sen, and deleting them is
the kind of destructive cleanup that has no recovery path. If a full undo is
ever required, leave R2 alone.
