# CONT-15 — UNDO for the production write

**One write. It is additive, it touches no image bytes, and it is fully
reversible from the two files named below.**

| | |
|---|---|
| when | 02 September 2026 |
| target | `aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` — production (`nyidzlupgmyyazhyykuk`) |
| table | `articles` |
| column | `cover_image_variants` (JSONB) |
| rows | **96**, plus **4** in a catch-up run for articles ingested mid-item |
| R2 | **nothing.** Not one byte of image data was written, moved or deleted. |
| script | `scripts/backfill-cover-intrinsics.mts` (`pnpm backfill:cover-intrinsics`) |

## What changed in each row

`cover_image_variants.low` gained two keys, `width` and `height`, holding the
pixel dimensions read out of that file's **own header** via a ranged GET.
Nothing was replaced. `low.url`, `low.sizeBytes`, and the whole of `high` and
`original` were read and rewritten unchanged.

```jsonc
// before
"low": { "url": "…/low.webp", "sizeBytes": 54814 }
// after
"low": { "url": "…/low.webp", "width": 1200, "height": 1800, "sizeBytes": 54814 }
```

Verified after the fact, on production, rather than assumed:

```
rows whose low.sizeBytes was lost by the write: 0
```

## The undo files — they ship in PR #71, not here

- `docs/undo/cont-15-cover-intrinsics.json` — 96 rows
- `docs/undo/cont-15-cover-intrinsics-catchup.json` — 4 rows
- `docs/undo/cont-15-cover-intrinsics-catchup-2.json` — a later catch-up

The script that made this write and all three undo files belong to the
design-systems-engineer's PR #71 (CONT-15's database half), so that one PR
carries the write, its reversal and its standing audit together. This document
is the editorial half's pointer to them, not a second copy.

Each carries every affected **row id**, that row's **prior**
`cover_image_variants` in full, and the reversal SQL. Recovery is either:

**1. the surgical reversal** — needs nothing but the id list in the undo file:

```sql
UPDATE articles
   SET cover_image_variants = jsonb_set(
         cover_image_variants, '{low}',
         (cover_image_variants -> 'low') - 'width' - 'height')
 WHERE id IN (<the ids listed in the undo file>);
```

**2. or a wholesale restore** of each row's dumped prior value.

## Why reverting is safe, and why it is also unnecessary

**No render path reads `low.width` or `low.height`.** CONT-15's plate — the only
consumer ever written for them — was superseded by UI-16 and is not on `master`.
So this write cannot have changed a pixel on the site, and reverting it cannot
either. It is data waiting for a consumer, and the script's own header says so.

Re-running the backfill without `--force` writes nothing:

```
96 published article(s) with cover variants · 0 to measure · 96 already recorded · 0 with no low.url
would write 0, unmeasurable 0
```

## Note for whoever reverts

The script refuses to overwrite an existing `--undo` path. That is deliberate:
the file is recovery data for a run that already happened, and the run most
likely to clobber it is the harmless-looking `--dry-run` you do to check state
afterwards. Point `--undo` somewhere new instead of deleting these.
