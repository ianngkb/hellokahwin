# Fix result — code review findings (15/15 closed)

**Date:** 2026-08-23
**Worktree:** `C:\Users\Ian Ng\orca\workspaces\hellokahwin\inspire-fixes`
**Branch:** `ianng89/inspire-fixes` (local only — nothing pushed, remote untouched)
**Findings:** `_bmad-output/autopilot/review/findings-merged.md` (reviewed HEAD `73b2275`)

All 15 findings fixed — 1 critical, 10 major, 4 minor. No deferrals.

---

## Commits

| Hash | Subject | Findings |
|---|---|---|
| `e01a36a` | fix(inspire): honour WP_IMPORT_AUTHOR_ID when resolving the house author | #7 |
| `2e22672` | fix(scripts): harden the media backfill against bad input and edge data | #3, #4, #5, #6 |
| `50d89ad` | fix(scripts): stop wp-import corrupting media on --clean re-import | #1, #8, #9, #12 |
| `3aeb046` | fix(inspire): make the nav seed safe against concurrent admins | #2 |
| `50b4e43` | fix(inspire): make nested blocks render, and repair caption/insert handling | #10, #11, #13, #14, #15 (partial) |
| `a607f8a` | fix(inspire): remove the last inert prose classes from the article renderer | #15 (completed — see Round 2) |

Base for this round: `73b2275`.

> The fix-check on the first five commits returned **14/15**, with #15 still
> open: the sweep had missed two sites. Closed in `a607f8a`; details in the
> **Round 2** section at the end of this document.

---

## Per finding

### 1 — critical — `LIKE` wildcards in `--clean` media deletion
**Commit `50d89ad`** · `scripts/wp-import.ts:1321`

`like(media.r2Key, '<prefix>%')` treated `%` and `_` — both legal in a WordPress
slug — as wildcards, so a slug containing either widened the pattern and deleted
media rows belonging to unrelated articles. Replaced with
``dsql`starts_with(${schema.media.r2Key}, ${cleanupR2Prefix})` `` — a prefix
comparison, not a pattern language, so there is nothing to escape. (Drizzle's
`sql` is imported as `dsql` because this script's postgres-js client already
owns the name `sql`.)

### 2 — major — concurrent nav seeds duplicate the menu
**Commit `3aeb046`** · `src/app/(admin)/admin/inspire/navigation/actions.ts:75`

The emptiness check ran before the transaction, so two admins clicking "Seed
from categories" at once both passed it and both inserted the full menu. The
check now runs **inside** the transaction behind
`SELECT pg_advisory_xact_lock($key::bigint)`, with the constant `NAV_SEED_LOCK_KEY`
at `:14`. An advisory lock rather than `SELECT … FOR UPDATE` because the
guarded case is an **empty** table — there are no rows to lock. It is
transaction-scoped, so it releases on COMMIT or ROLLBACK and a failed seed
cannot wedge the next attempt. The loser returns the same "already has items"
error from outside the transaction (`:132`), rolling nothing back and writing no
audit entry.

### 3 — major — `--limit 0` / negative scans everything
**Commit `2e22672`** · `scripts/backfill-media.ts:89`

`parseInt` turned `--limit 0`, `--limit -5`, `--limit abc` and a bare `--limit`
into values that all fell through the old `Number.isFinite(LIMIT) && LIMIT > 0`
guard to mean "no limit" — a typo meant to narrow a run silently widened it.
`LIMIT` is now `number | null`, validated with `Number.isSafeInteger(parsed) &&
parsed >= 1` and a hard throw otherwise. The consumer at `:319` became
`LIMIT === null ? rows : rows.slice(0, LIMIT)`. Verified: `--limit 0`,
`--limit abc` and `--limit` with no value all abort with
`--limit expects a positive whole number`.

### 4 — major — aliased URLs lose their usage links
**Commit `2e22672`** · `scripts/backfill-media.ts:397`, `:549`, `:555-566`

Two referenced URLs resolving to one original (an article using both
`high.webp` and `low.webp`, or a cover also used inline) collapse to one `media`
row whose `url` is whichever was seen first, so the runner-up matched nothing in
the `url`-keyed lookup and its article silently lost the usage row. Every
referenced URL now keeps an entry in `originalKeyByUrl` (`:397`), and usage
resolves through the canonical `r2_key` via `mediaIdByKey` (`:549`). Pairs are
de-duplicated (`:555`) because Postgres rejects a single INSERT naming one
conflict-target row twice even under `ON CONFLICT DO NOTHING`. The dry-run count
is now exact rather than an upper bound (`:468-478`).

### 5 — major — `file_size` overflows Postgres `integer`
**Commit `2e22672`** · `scripts/backfill-media.ts:182` (`clampFileSize`), `:416`

An R2 object ≥ 2 GiB would abort a **chunked** write partway through, leaving
the library half populated. Values are clamped to `MAX_FILE_SIZE = 2147483647`
(`:180`); non-finite and negative inputs become 0. Clamped rows are counted and
reported in the run output (`:441`, `:462`) so it is never silent. The column is
deliberately **not** migrated in this change.

### 6 — major — hardcoded `uploaded_by` fails the FK under an override
**Commit `2e22672`** (with `e01a36a`) · `scripts/backfill-media.ts:120`, `:293-306`

`UPLOADED_BY = resolveHouseAuthorId()` (`:120`) honours `WP_IMPORT_AUTHOR_ID`.
The profile is then verified to **exist** before a single object is listed
(`:293`), in dry run as well as `--execute`, with an actionable error naming the
missing id — previously this surfaced only as a foreign-key violation partway
through the writes, and a "passing" rehearsal told you nothing.

### 7 — major — app and importer disagreed on the house author
**Commit `e01a36a`** · `src/lib/authors/gate.ts:54` / `:69`,
`src/lib/authors/queries.ts:242`

`gate.ts` gains `resolveHouseAuthorId()` and `resolveHouseAuthorEmail()`, which
honour `WP_IMPORT_AUTHOR_ID` / `WP_IMPORT_AUTHOR_EMAIL` with the existing
constants as defaults. **Functions, not module constants**, because `gate.ts`
reaches client bundles where a non-`NEXT_PUBLIC_` env read is inlined as
`undefined` at build time; evaluating lazily keeps the read server-side and
leaves any client bundle on the correct default. `listSelectableAuthors()`
resolves once per call (`queries.ts:242`) so the SQL predicate (`:258`) and the
`isHouseAccount` flag (`:269`) cannot be computed against different ids. Both
scripts now use the same resolvers.

### 8 — major — `RETURNING` omits pre-existing rows, skipping usage
**Commit `50d89ad`** · `scripts/wp-import.ts:1266-1292`

`ON CONFLICT DO NOTHING` returns only rows it actually inserted, so an
already-registered key came back empty and its article-usage row was silently
skipped. The insert no longer uses `RETURNING`; instead every pending key is
selected back (`:1266`), covering inserted and pre-existing rows alike, and
usage is mapped content-URL → `r2Key` → id. De-duplicated via `seenMediaIds`
(`:1281`) for the same Postgres reason as #4.

### 9 — major — stale-media cleanup failure swallowed
**Commit `50d89ad`** · `scripts/wp-import.ts:652`, `:1305`, `:1341`, `:1408-1426`

Both the R2 delete and the stale-row delete now record into a new
`stats.integrityFailures` bucket (`:652`), kept separate from `stats.errors` on
purpose. A distinct `DATA INTEGRITY FAILURES` summary block prints them
(`:1408`) and the process **exits non-zero** (`:1426`). Content-level errors — a
broken source image, a post that would not convert — still exit 0 as before;
only a DB/R2 divergence fails the run, because that one is invisible until
someone opens the media library and finds a dead thumbnail.

### 10 — major — media insert updated the wrong image
**Commit `50b4e43`** · `src/components/inspire/editor-toolbar.tsx:105-121`

Searching the document for an image whose `src` matched updated the **first**
hit, so inserting an image already used earlier in the article put the variants,
quality and caption on the wrong copy and left the new one bare. The node is now
built with all its attributes in a single `insertContent({ type: 'image', attrs })`
— there is no second step to aim and nothing to find, which is exactly what
declaring those attributes on `CustomImage` bought. Strictly stronger than
capturing the insertion position: no position tracking can go stale if there is
no second transaction.

### 11 — minor — caption attributes stayed entity-encoded
**Commit `50b4e43`** · `src/components/inspire/article-renderer.tsx:360-380`

`src`, `alt`, `data-caption` and `data-caption-url` are regex-extracted from
**already-sanitized** HTML, where sanitize-html has entity-encoded the values;
React then escaped them again, so `Tom & Jerry` reached the page as
`Tom &amp; Jerry` and a caption URL lost its query-string separators. Decoded
once on extraction with `he` (`:371-375`), already a project dependency. Safe:
sanitize-html parses and validates schemes on the **decoded** value — that is
how it rejects `javascript:` however it is spelled — and only re-encodes on
output, so this cannot resurrect anything it already refused. The gallery path
(`:381-382` of the old file) reads `n.attrs` JSON, not HTML, and needs no
decoding.

### 12 — minor — duplicate `<img src>` uploads an orphan copy
**Commit `50d89ad`** · `scripts/wp-import.ts:352`

The rewrite is a global `split(imgUrl).join(newUrl)`, so the first pass over a
repeated source replaced every occurrence; later passes found nothing to rewrite
but still downloaded the image, uploaded a second copy to R2 under a fresh key
and registered a `media` row for an object no article references.
`extractImageUrls` now collects into a `Set` and returns first-appearance order.

### 13 — minor — a null gallery entry drops later valid URLs
**Commit `50b4e43`** · `src/lib/inspire/content-media.ts:39-49`

Reading `.src` off a null entry threw, and the surrounding catch turned that
into "this gallery has no images at all", dropping the valid URLs that came
after it. The array is now `Array.isArray`-checked and each entry is guarded as
a non-null object with a string `src`, so a bad entry costs its own entry and
nothing more.

### 14 — major — nested-block fallbacks rendered empty
**Commit `50b4e43`** · `src/components/inspire/article-renderer.tsx:148-283`

The previous stubs stopped the `generateHTML` throw but emitted empty divs that
sanitize-html stripped — trading a crash for a quieter version of the same data
loss. Each definition now declares the attributes it needs
(`NESTED_BLOCK_ATTRS`, `:172`) and renders real output in `renderHTML` (`:225`):

- `galleryBlock` → one `<figure><img>` per image, with `<figcaption>` and an
  optional caption link (`nestedGallerySpec`, `:186`)
- `figureBlock` → image plus `<figcaption>`; keeps the content hole for the
  legacy inline-caption shape when there is no `src`
- `ctaButtonBlock` → a real `<a>` (with `target`/`rel` when `data-new-tab`),
  degrading to a bare `<p>` label when the URL is missing
- `pdfLinkBlock` → a real download `<a>`, same degradation
- `sectionBlock` → transparent wrapper (`0` content hole), children unchanged

Deliberately unstyled and non-interactive: this is the degraded path for
content that should have been top-level, not a second renderer competing with
the React one.

### 15 — minor — dead typography classes
**Commit `50b4e43`** · `src/app/(admin)/admin/inspire/[article-id]/edit/article-editor.tsx:1863`,
`src/components/inspire/article-renderer.tsx:868`, `:950`, `:977`

`@tailwindcss/typography` is not installed and stays uninstalled (decision
unchanged — it would restyle the public site), so `prose` and `not-prose`
matched nothing. Removed at the four named sites; `.inspire-prose` and
`.ProseMirror` in `globals.css` already do the work. A comment at the editor
site records why the class is absent so it does not get "restored".

> Observed but **not** changed:
> `src/app/(admin)/admin/inspire/dynamic-blocks/[block-id]/edit/block-editor.tsx:444`
> carries the identical dead `prose` class. It is outside the reviewed diff and
> outside the named sites, so it was left alone rather than taken as a
> drive-by. Worth closing in a separate change.

---

## New tests

| File | Tests | Covers |
|---|---|---|
| `src/components/inspire/__tests__/article-nested-blocks.test.ts` | 7 | #14 end to end — each block type nested in a blockquote, rendered through `generateHTML` + the real sanitizer, asserting URLs and captions survive; plus malformed `data-images` not throwing, and CTA/PDF keeping their label with no URL |

`extensions` is now exported from `article-renderer.tsx` for this, alongside the
already-exported `sanitizeOptions`.

Suite total went 139 → **146**.

---

## Gate results

| Gate | Command | Result |
|---|---|---|
| Typecheck (app) | `npm run typecheck` | **PASS** — `tsc --noEmit -p tsconfig.typecheck.json`, no output, exit 0 |
| Typecheck (scripts) | `tsc --noEmit -p` temp config including `scripts/**` | **PASS** — no output. `scripts/` is excluded from `tsconfig.typecheck.json`, so it was checked separately as before; the temp config was removed afterwards |
| Tests | `npm run test` | **PASS** — `Test Files 13 passed (13)`, `Tests 146 passed (146)` |
| Lint + format | `npm run lint` | **PASS** — `✖ 115 problems (0 errors, 115 warnings)`; all warnings pre-existing (`no-explicit-any` in script catch blocks, `react-hooks` advisories). `All matched files use Prettier code style!` |
| Production build | `npm run build` | **PASS** — full route table emitted, no errors |
| Backfill dry run | `npx tsx scripts/backfill-media.ts` | **PASS** — see below |

Backfill dry run against production (read-only, unchanged plan):

```
=== Media backfill — DRY RUN (no writes) ===

Uploader: hellokahwin-editorial
Articles scanned: 29
Listing 29 R2 prefix(es)… 1985 object(s) found

Distinct in-bucket media referenced: 623
  already registered: 0
  to insert:          623
  covers / inline:    29 / 594
  with variants:      623

--- media_article_usage ---
  594 link(s) across 29 article(s)

DRY RUN — nothing was written. Re-run with --execute to apply.
```

No off-bucket URLs, no missing originals, no clamped sizes, no `file_size = 0`
rows, and the new `Uploader:` line confirms the pre-flight profile check passes.
The usage figure is now the exact de-duplicated count rather than the previous
upper bound; it happens to be the same number, which means no article in the
current data references two variants of one original.

---

## Unchanged from the previous round

The production data steps in `_bmad-output/autopilot/dev-result.md` still stand
and are unaffected by these fixes:

1. `npx tsx scripts/backfill-media.ts` (rehearse), then `--execute`.
2. Deploy, open `/admin/inspire/navigation`, click **Seed from categories**
   (expect `Seeded 15 navigation items`).
3. Nothing to do for the author fix — the house account is selectable on the
   existing production row as-is.

---

## Round 2 — finding #15 reopened and closed

**Commit `a607f8a`** · `src/components/inspire/article-renderer.tsx:1055`, `:1149`

The fix-check returned 14/15 with #15 STILL_OPEN, correctly. The first sweep
found four sites and missed two, and the miss was self-inflicted: both remaining
sites carry `inspire-prose` **and** the dead `prose*` classes in the same
`className`, and the grep used to locate them filtered out every line containing
`inspire-prose` to avoid false positives on the real class — so it hid exactly
the lines that had both.

Removed:

| Line | Was | Now |
|---|---|---|
| `:1055` | `inspire-prose prose prose-base lg:prose-lg prose-headings:tracking-tight prose-p:leading-relaxed prose-img:rounded-md max-w-none` | `inspire-prose max-w-none` |
| `:1149` | `inspire-prose prose max-w-none prose-headings:tracking-tight prose-img:rounded-md` | `inspire-prose max-w-none` |

No visual change: `@tailwindcss/typography` is not installed and stays
uninstalled, so every `prose*` class above matched nothing. What they claimed to
do is already hand-rolled in `globals.css`, verified before removing —
heading `letter-spacing` (`:1097` and the sibling heading rules), paragraph
`line-height` (`:1080-1086`), and `.inspire-prose img { border-radius:
var(--radius-md) }` (`:1343`). `max-w-none` is a plain Tailwind utility and is
kept.

Full sweep result for the two files in scope — `grep -n "prose"` now returns
only `inspire-prose` usages and the comments explaining the absence:

```
article-renderer.tsx:1050,1054  comment
article-renderer.tsx:1055       className="inspire-prose max-w-none"
article-renderer.tsx:1089       comment (mentions .inspire-prose ol[type=…])
article-renderer.tsx:1148       comment
article-renderer.tsx:1149       wrapperClassName = 'inspire-prose max-w-none'
article-editor.tsx:1858         comment explaining why `prose` is absent
```

`block-editor.tsx:444` remains untouched by design — out of scope, already
recorded above.

### Round 2 gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** — no output, exit 0 |
| Tests | `npm run test` | **PASS** — `Test Files 13 passed (13)`, `Tests 146 passed (146)` |
| Lint + format | `npm run lint` | **PASS** — `0 errors, 115 warnings` (all pre-existing); `All matched files use Prettier code style!` |
