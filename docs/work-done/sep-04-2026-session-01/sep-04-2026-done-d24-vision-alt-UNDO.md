# D24 — UNDO for the production write

**One write, 14 rows, one column. Every prior value is captured twice — in a
backup table inside the same database and in a per-article JSON file — and the
write is reversible from either.**

| | |
|---|---|
| when | 04 September 2026 |
| target | `aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` — production (`nyidzlupgmyyazhyykuk`), session pooler |
| table | `articles` |
| column | `content` (JSONB) — nothing else. `updated_at` moves, see below. |
| rows | **14** published articles, **369** image `alt` values inside them |
| R2 | **nothing.** No image byte was written, moved or deleted. |
| script | `scripts/seo/vision-alt.mts --apply` |

## What changed in each row

Only the `alt` attribute of `image` nodes whose stored value was exactly
`${article.title} — gambar ${n}` — the positional fallback
`scripts/seo/backfill-image-alt.mts` wrote on 3 September when it had nothing
better. Every one is replaced with a Malay sentence describing what is in the
frame. No other node, attribute or key is touched.

```jsonc
// before
{ "type": "image", "attrs": { "src": "…/high.webp",
  "alt": "Majlis Perkahwinan Mewah dan Berkonsep Organik di Amankila, Bali — gambar 22" } }
// after
{ "type": "image", "attrs": { "src": "…/high.webp",
  "alt": "Empat penari api berpakaian tradisional membuka tangan memegang kipas berapi dalam kegelapan" } }
```

## `updated_at` moves, and that is deliberate

`applyContentMigration` sets `updated_at = now()`, which surfaces in three
places: the visible "Disemak" date on the article, JSON-LD `dateModified`, and
sitemap `lastmod`. Fourteen articles are therefore re-dated to 4 September.

That was raised in review as a possible defect and is being accepted, not
overlooked. The rendered HTML of these pages genuinely changed — 369 `alt`
attributes are different bytes served to every reader and every crawler — so a
`dateModified` that stayed put would be the false claim, not this one. The
repo's own rule (`page.tsx`, §9.2: "the visible claim and the schema claim
cannot disagree") ties the displayed date to `dateModified`, so they move
together or the page contradicts its own schema. Freezing the timestamp would
also have meant changing a helper that three already-shipped scripts share, on
the day of the write.

## The undo, two ways

**1. The backup table**, taken inside the same transaction as the write, before
it:

```
articles_backup_20260904t155750z_visionalt
```

It holds `id`, `content` and `updated_at` for **every** row of `articles` as
they stood at that instant, with `id` as an explicit primary key so a restore is
a join rather than a scan:

```sql
UPDATE articles a
   SET content = b.content, updated_at = b.updated_at
  FROM articles_backup_20260904t155750z_visionalt b
 WHERE a.id = b.id
   AND a.id IN (<the 14 ids listed in _manifest.json>);
```

**2. The per-article JSON files**, written by the dry run before the apply was
authorised:

```
C:\Users\Ian Ng\Documents\Code\tmp\2026-09-04-ahrefs-audit\visionalt\undo\
  _manifest.json              the 14 ids, slugs, updated_at and content hashes
  <slug>.json                 that article's complete prior `content` document
```

The apply refuses to run unless each of those files parses, names the row it
claims to, and hashes to the exact document about to be replaced — so a
directory left over from another migration cannot stand in for it.

## Why this write is hard to get wrong, and what would stop it

Every check below aborts the **whole** run rather than skipping a row; a
half-described article looks finished and is not.

- No article may be open in the admin editor (`article_edit_locks`).
- Every row is `SELECT … FOR UPDATE`, and must still match the dry run's slug,
  `updated_at::text` and content hash.
- The transform is re-run against the freshly locked row and must hash to what
  the dry run promised.
- The `UPDATE` is conditional on `updated_at::text` and asserts exactly one
  affected row.
- Each description carries the `src` it was written from, and must still be the
  image at that ordinal — a photograph swapped between the extract and the apply
  stops the run instead of inheriting the previous picture's description.
- `--expect 369` stops the run if the corpus no longer holds the number this
  work was scoped against.

## Verification after the fact

`node scripts/seo/verify-content-acceptance.mjs`, section 6, reads the live HTML
of all fourteen essays — resolved through the sitemap, so a recategorised
article is followed rather than reported as a 404 — and asserts zero remaining
positional alts, every alt within 125 characters, and no repeated accessible
name inside an article body. It prints thirty of the stored alts for a human to
read, because no string check can tell whether a sentence describes the
photograph above it.
