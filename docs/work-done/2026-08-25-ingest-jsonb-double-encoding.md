# Ingest wrote every jsonb column as a string, and nothing looked wrong

25 Aug 2026 · `scripts/ingest-article.mts` ·
`src/lib/inspire/__tests__/ingest-jsonb-encoding.test.ts`

Every article this script has ever written stored `content` as a jsonb **string
scalar** instead of an object. All 29 legacy articles hold objects. The eight
ingested on 24 Aug held strings.

```sql
select slug, jsonb_typeof(content) from articles;
-- amankila-bali        object      <- admin editor, via Drizzle
-- hantaran-kahwin      object
-- mas-kahwin-johor     string      <- ingest script
```

`cover_image_variants`, `cover_image_smart_crops`, `cover_image_focal_point`,
`cover_image_detection_data` and the same four columns on every `media` row were
all wrong the same way. Nine parameters in total.

## Why it happened

postgres.js reads the `::jsonb` cast that follows a placeholder, types the
PARAMETER from it, and then serialises the value with that type's serializer.
The json serializer is `JSON.stringify`. Hand it a value that has already been
stringified and it stringifies a second time.

Probed against a real database, which is the only way to see it:

```
${JSON.stringify(doc)}::jsonb        ->  jsonb_typeof = string
${JSON.stringify(doc)}::text::jsonb  ->  jsonb_typeof = object
${sql.json(doc)}::jsonb              ->  jsonb_typeof = object
```

The middle line is the one that makes it click: the same JS value lands as an
object or a string depending only on the cast written after it. The cast is not
decoration, it selects the serializer.

## Why it hid for a day

Drizzle's `PgJsonb.mapFromDriverValue` runs `JSON.parse` on a string value on
the way out:

```js
mapFromDriverValue(value) {
  if (typeof value === 'string') { try { return JSON.parse(value) } catch { return value } }
  return value
}
```

So every render path received a proper document and every page looked correct.
Nothing in the app could tell you. What could not recover was SQL:
`content->'content'` is NULL on a string row, so any query, migration, backfill,
sitemap builder or content audit that reaches into the document sees an empty
article and reports it as such.

That is the actual damage — not a broken page, a quietly wrong answer to
anything that asks the database a question about article content.

## The fix

All nine parameters go through `sql.json()`. The null branches were checked
separately: `${cond ? sql.json(v) : null}::jsonb` still produces SQL NULL, not a
jsonb `null` scalar.

The eight live rows were then re-ingested. `select count(*) from articles where
jsonb_typeof(content) = 'string'` is now 0 across the whole table.

Every row was deep-compared before and after. Seven reported "differs" on the
first pass, and the reason is worth knowing before someone else hits it: jsonb
canonicalises object key order, so `{"type":"text","text":…}` comes back as
`{"text":…,"type":"text"}`. That is Postgres normalising, not content moving,
and it is exactly the shape the legacy rows are in. Under a key-order-insensitive
comparison all eight bodies are identical.

## The guard

A source-level test asserts no `JSON.stringify` sits in a `::jsonb` parameter
position, and that all nine parameters use `sql.json`. Verified by reintroducing
the defect and watching it fail.

It is deliberately crude. A real integration test needs a live Postgres, which
is not available where this most needs protecting, and the failure mode is
invisible without one. A false positive costs a rename; a false negative costs
another batch of articles written in the wrong shape — and twenty more articles
are queued through this script.

The test strips comments before scanning, because the comment that explains this
defect has to quote the wrong form beside the right one, and a scanner that
flags its own documentation is a scanner somebody deletes.

`pnpm typecheck` clean · `pnpm test` 229 passed · `pnpm lint` 0 errors.

## Not fixed, and why

Two things in the image pipeline, both found while measuring this. Neither is
applied: both touch `src/lib/storage/*`, which the admin uploader and the
682-item legacy library share, so widening this change to reach them would put a
much larger blast radius behind a fix that was scoped to ingest.

- `smart-crop.ts:499` encodes the named crops at `.webp({ quality: 100 })` while
  `high`/`low` use the configured presets (80/30). On a photograph that is 4–5×:
  measured 365,746 bytes for `crop-4x3-article-card` against 68,564 for
  `high.webp` off the same source. Flat cover graphics do not show it.
- Neither `image-variants.ts` nor `smart-crop.ts` calls `.rotate()`, and Sharp
  does not auto-orient. A source carrying EXIF orientation 8 publishes sideways.
  One of the thirteen sourced photographs does.

Also observed: only COVERS consume smart crops — every call site reads
`coverImageSmartCrops`, nothing reads `media.smart_crops` — yet ingest generates
four crops for every in-article figure too. They are written to R2 and never
requested.
