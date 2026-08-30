# Ingest: figures were serving the original, and could only land at the end

25 Aug 2026 · `scripts/ingest-article.mts`, `src/lib/inspire/article-file.ts`

Two changes, both found while putting the first credited photograph onto a live
article (`apa-itu-mas-kahwin`). Neither needs a deploy: the ingest script runs
locally and the page is correct because the row now holds the right URL.

## 1. The figure `src` was the original upload, and the original is what shipped

`toFigureBlock` stored `up.url` — the object ingest had just PUT, i.e. the
untouched source file.

That is served whole, and the reason is a chain of three things that are each
individually fine:

- `next.config.ts` sets `images.unoptimized: true`, because variants are made by
  Sharp at upload time. So `<Image>` emits the `src` verbatim and there is no
  optimiser behind it. No srcset either — one request, one URL.
- The renderer calls `getArticleVariantUrl(src, 'high')`, whose `VARIANT_PATTERN`
  only matches a URL already ending `high.webp`, `low.webp` or
  `original.<ext>`. An original keyed `inspire/<slug>/1787-foto.jpg` matches
  none of them, so it is returned untouched.
- `generateVariants` had already written `high.webp` and `low.webp` next to it.
  Nothing pointed at them.

Measured on the image that shipped: the page requests **68,564 bytes**; the
original beside it is **799,808**. The sourced set for the next articles
includes files of 13.6 MB and 15.0 MB, and those would have gone to a phone
whole.

`figureSrc()` now returns `variants.high.url`, falling back to the original only
when there are no variants at all (the `--skip-media` local path). That is also
the shape all 29 existing articles already store, so the renderer's low/high
swap now works on an ingested figure exactly as it does everywhere else.

## 2. Figures could only be appended after the body

Every credited figure went after the last top-level block. On the C2.4 articles
that is after the final FAQ answer — the worst place on the page, and the
opposite of what an editor wants for a lede image.

The original comment gave the reason not to place them inline: "Placing them
inline would mean guessing where the writer wanted each one, and ingest does not
guess." That reasoning stands, so the position is now DECLARED rather than
inferred. A body image may carry `placeAfter: <n>` — the number of top-level
blocks it sits below. Omit it and the figure is appended exactly as before, so
no existing file changes behaviour.

An out-of-range `placeAfter` is a refusal, listed with every other problem before
anything is uploaded — `markdownToTiptap` moved above the refuse gate so the
block count is known there. It is deliberately not clamped: a figure quietly
landing at the end of an article the editor wanted illustrated at the top is the
exact failure the field exists to remove.

Insertions run from the highest declared position downwards, so an earlier
splice cannot shift an index that has not been used yet.

`pnpm typecheck` clean · `pnpm test` 227 passed (3 new, covering the field's
acceptance, its default, and refusal of negative and fractional values) ·
`pnpm lint` 0 errors.

## Found, not fixed

`articles.content` is double-encoded on every article this script has written:
`jsonb_typeof(content)` returns `string` on all eight ingested rows and `object`
on all 29 legacy ones. `${JSON.stringify(doc)}::jsonb` through postgres.js lands
as a jsonb string scalar, not an object.

The site is unaffected — Drizzle's `jsonb` column runs `JSON.parse` on a string
value on the way out, so the renderer receives a proper document either way. But
SQL that reaches into `content->…` finds nothing on these rows, which will
mislead the next query, migration or audit that tries.

Not fixed here because the fix rewrites the stored shape of eight live rows, and
this change set was scoped to a single production article write. It wants its
own change, its own before-state capture, and a re-ingest of all eight.
