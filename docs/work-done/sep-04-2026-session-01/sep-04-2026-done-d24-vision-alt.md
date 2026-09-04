# D24 — The 369 photo-essay images nobody had described

**Every image on the fourteen real-wedding photo essays now says what is in the
frame. Verified against the live site: 369 described, 0 still positional.**

## What was wrong

`scripts/seo/backfill-image-alt.mts` closed the Ahrefs "missing alt text"
finding on 3 September by putting a value in every empty `alt` in published
content, on a four-rung chain. 369 of them reached the last rung and were stored
as `${article.title} — gambar ${n}`.

That string is true, and it is a great deal better than the `alt=""` it replaced
— which is a positive declaration that a photograph is decorative. But it is not
a description. On `amankila-bali` it was the same sentence forty-three times
down a page of forty-three different photographs: a screen-reader user heard the
article's title and a number, over and over, and learned nothing about any
picture. These are the photo essays, where fifteen consecutive images share one
paragraph and the document distinguishes none of them, so no rule over the text
could have done better. Somebody had to look at them.

The previous run said so in its own report rather than letting the gap hide
behind a filled column. This item is that worklist, finished.

## What shipped

| | |
|---|---|
| images described | **369**, across **14** published articles |
| length | 63–115 characters against a 125 budget, mean 92 |
| language | Bahasa Malaysia |
| production write | 14 `articles.content` rows, `alt` values only |
| backup | `articles_backup_20260904t155750z_visionalt` (102 rows) |
| undo | [`…-d24-vision-alt-UNDO.md`](./sep-04-2026-done-d24-vision-alt-UNDO.md) |

Each description was written by a vision pass that opened the image itself — the
`mid.webp` rung, 1400px and under 350 KB, all 369 confirmed present before the
run started — with the article's own prose alongside it as the only source a
venue or vendor name was allowed to come from. No personal names, even where a
place card or a welcome sign spelled one out in the frame. No venue named where
the picture alone could not settle which of the article's places it was.

Every batch went through the `humanizer` skill, and a 40-row sample of the final
text went through it again. That second pass caught a split the batches could
not see: six articles had acquired a terminal full stop and eight had not, so
171 alts were trimmed for consistency with the rest of the corpus. It also
caught `menjulang` used figuratively of a cake and a flower, three display verbs
(`memperlihatkan`) where the subject should simply lead, two `lengkap dengan`
fillers, and `baju melayu` where the corpus capitalises `Baju Melayu` ten times
out of thirteen.

## The code

`scripts/seo/vision-alt.mts` extends the Phase 2 machinery rather than replacing
it: the same `_db.mts` guarantees, the same `_content-apply.mts` ordering, the
same backup-and-manifest discipline.

A target is found by recomputing `fallbackImageAlt(title, ordinal)` and matching
it **exactly**, never by a regex for `— gambar N` — a regex would also match an
alt an editor happened to write that way, and could not notice an ordinal that
had drifted. That only works while this script and the backfill agree on what
counts as an image and in what order, so the walk moved into
`scripts/seo/_content-images.mts` and both use it. Two walkers that disagreed
would hand a photograph a description of a different one.

Each description carries the `src` it was written from, and the apply refuses
when that no longer matches the image at the ordinal. `id` + `ordinal` names a
position, and a position can be handed a different picture.

Every rule fails the **whole run**, never one row: a half-described article
looks finished and is not.

## Evidence

Live, after the write and the cache purge —
`node scripts/seo/verify-content-acceptance.mjs`, section 6, resolving all
fourteen paths through the sitemap at run time:

```
PASS  all 14 essays are in the sitemap  none missing
PASS  /artikel/glamor-eksklusif/amankila-bali  45 images: 43 described, 0 still positional
PASS  /artikel/moden-kontemporari/perkahwinan-romantis-di-jen-shangri-la-puteri-harbour  49 images: 45 described, 0 still positional
PASS  /artikel/pantai-santai/perkahwinan-indah-di-laman-fajar-menyinsing-port-dickson  36 images: 36 described, 0 still positional
…
PASS  no positional alt left on any essay  369 described across 14 articles, 0 positional
ALL CHECKS PASSED
```

Before the write, the same three pages served 43, 45 and 36 positional alts.

Nothing else moved. Read back from production before and after, identical both
times:

```
{"articles":102,"published":102,"ai_badge":74,"pending_review":102,"human":28,"reviewed":0}
```

`updated_at` does move, on 14 rows, and the UNDO document says why rather than
burying it.

## Review

Three layers on Claude Opus 5 (`config/review-policy.json` primary, rung 0),
then a scoped fix-check. **20 findings, all fixed, none deferred**; verdict
`clean`, 0 open, stamped against the shipped commit. Two were worth the run:

- The apply computed a fresh manifest, discarded it, and wrote only what the
  stored one named — so descriptions appended after the dry run passed every
  check, were never written, and the run reported success over a partial
  application. It now refuses when the two disagree.
- A description was bound to an ordinal, not to a photograph. See above.

The reviewer also caught the walk crashing on data this repo already documents
as reachable: a null or bare-string entry in a gallery's `data-images` threw and
took the whole migration with it. It now costs its own ordinal and nothing more,
which is the rule `content-media.ts` states for the same data.

Two ordinal rules changed after the backfill had already written 369 alts
against the old ones, which would be silent damage on any article they
renumbered. Checked against production rather than assumed — across all 102
published articles: **zero** src-less figures, **zero** gallery blocks, and the
extract picks a byte-identical set of 369 targets across the same 14 articles
before and after the change.

## Carried forward

The census in the paragraph above is a recorded result, not a committed script,
while `_content-images.mts` tells a future reader to "rerun that census". Worth
ten lines in `scripts/seo/` next time somebody is in there.
