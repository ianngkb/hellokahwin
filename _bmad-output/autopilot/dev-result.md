# Dev result — /admin/inspire fixes (4 issues)

**Date:** 2026-08-23
**Worktree:** `C:\Users\Ian Ng\orca\workspaces\hellokahwin\inspire-fixes`
**Branch:** `ianng89/inspire-fixes` (local only — nothing pushed, remote untouched)
**Spec:** `_bmad-output/autopilot/investigation-inspire-fixes.md`

---

## Commits

| Hash | Subject |
|---|---|
| `ed7b209` | fix(inspire): only authorise author changes, and key the house account on its id |
| `1fa0130` | feat(inspire): backfill imported media into the library, and register it on import |
| `998e62b` | feat(inspire): seed navigation from the category menu the site already renders |
| `889a683` | fix(inspire): remove the duplicated editor and repair the broken toolbar actions |

Base: `d37d44d`. Working tree is clean apart from the pre-existing modification
to `_bmad-output/autopilot/decisions.md` and the untracked `_bmad-output/autopilot/*`
task files (not mine to commit).

---

## Verification

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** — `tsc --noEmit -p tsconfig.typecheck.json`, no output, exit 0 |
| Tests | `npm run test` | **PASS** — `Test Files 12 passed (12)`, `Tests 139 passed (139)` |
| Lint + format | `npm run lint` | **PASS** — `✖ 115 problems (0 errors, 115 warnings)`, all warnings pre-existing (`no-explicit-any` in script catch blocks, `react-hooks` advisories); `All matched files use Prettier code style!` |
| Production build | `npm run build` | **PASS** — full route table emitted, no errors |

`scripts/` is excluded from `tsconfig.typecheck.json`, so the two scripts were
type-checked separately against a temporary config including `scripts/**` —
clean — and the temp config was removed. `scripts/backfill-media.ts` was also
executed in dry-run mode against production (read-only) and produced a correct
plan; see below.

New tests added:

- `src/lib/authors/__tests__/gate.test.ts` (9 tests) — the author guard's new
  changed-only rule, plus the house-account identity constants that drifted.
- `src/components/inspire/__tests__/article-sanitize.test.ts` (12 tests) — the
  `ol: ['type','start']` allowance, the caption attributes, and assertions that
  the sanitizer still blocks scripts, inline handlers, `javascript:` hrefs and
  off-allowlist iframe sources.

---

## What was implemented

### Issue 1 — "That author is not available for attribution."

**Root cause (both halves fixed, no production data edit required).**

- `[article-id]/edit/actions.ts:190-208` — the guard now reads the article's
  stored `author_id` and only runs the `listSelectableAuthors()` membership
  check when the submitted id *differs*. The editor posts `authorId` on every
  manual save and every 60-second autosave, so validating the value rather than
  the change made a no-op field fail on every save. The security property is
  unchanged: MOVING an article onto another profile still has to clear the list.
- The rule is a new pure predicate `isAuthorReattribution()` in
  `src/lib/authors/gate.ts`, so it is unit-testable without a database.
- `src/lib/authors/gate.ts` now exports `HOUSE_AUTHOR_ID = 'hellokahwin-editorial'`
  — the stable `profiles.id` — and `HOUSE_AUTHOR_EMAIL` corrected to
  `editorial@hellokahwin.com`. `scripts/wp-import.ts:119-120` imports both
  instead of re-spelling them. `listSelectableAuthors()`
  (`src/lib/authors/queries.ts:255,266`) now matches the house account on id.

**Verified against the real production row** (read-only SELECT): the pre-change
predicate returned zero rows; the post-change predicate returns
`hellokahwin-editorial`. So the house account becomes selectable with **no data
edit at all**.

**`create/actions.ts:32` (`authorId: user.id`) — confirmed covered.** A new
article is created with the Clerk admin id (`user_3IHG…`, a real `profiles`
row but not a selectable author). Its first save re-sends that same id, the
changed-only check short-circuits, and the save passes.

**No human profile was made a public author.** As instructed.

### Issue 2 — `/admin/inspire/media` empty

Pure data gap; the page and its queries were correct and are unchanged.

- **New `scripts/backfill-media.ts`.** Walks every article's Tiptap document
  plus `cover_image_url`, resolves each referenced URL back to its **original**
  R2 object, and registers one `media` row per distinct object.
  - Resolution uses one `ListObjectsV2` per `inspire/<slug>/` prefix rather
    than a `HeadObject` per file: the listing yields the original key, its
    size, and the sibling `high`/`low` variants in a single request. ~29
    requests instead of ~4,000, and `file_size` comes back real rather than 0.
    (`file_size` falls back to 0 only when the object is missing from R2 —
    reported explicitly in the run output.)
  - `r2_key` / `original_url` point at the original; `url` is the exact string
    the article references, which is what `syncMediaUsage()` matches on.
  - Covers inherit the variants / smart crops / focal point already stored on
    the article by the importer.
  - Then populates `media_article_usage` for content images (bulk equivalent of
    `syncMediaUsage()`).
  - **Dry run is the default.** `--execute` writes. Idempotent via
    `ON CONFLICT DO NOTHING` on `idx_media_r2_key_unique` and
    `media_article_usage_unique`. Also `--verbose`, `--limit N`.
- `extractImageUrlsFromContent()` moved out of the server action into
  `src/lib/inspire/content-media.ts` and imported by both, so the backfill and
  the per-save sync can never drift on which node types count as media.
- `scripts/wp-import.ts` now builds a `media` row beside every `uploadToR2()`
  (cover and inline) and inserts them, plus the usage junction, **inside the
  same transaction as the article**. A `--clean` re-import additionally removes
  the stale media rows whose R2 objects it just deleted (excluding the keys the
  current run wrote), since `original_article_id` is `ON DELETE SET NULL` and
  would otherwise leave library entries with no file.

**Dry run against production (read-only):**

```
Articles scanned: 29
Listing 29 R2 prefix(es)… 1985 object(s) found
Distinct in-bucket media referenced: 623
  already registered: 0
  to insert:          623
  covers / inline:    29 / 594
  with variants:      623
--- media_article_usage ---
  up to 594 link(s) across 29 article(s)
```

Zero off-bucket URLs, zero missing originals, zero rows would get `file_size = 0`.

### Issue 3 — Site structure shows no navigation

- **New `seedNavFromCategoriesAction`** in `navigation/actions.ts`. Takes
  `getCategoryFallbackNav()`'s output — literally the menu the public masthead
  is already rendering — and inserts equivalent `inspire_nav_items`:
  `type: 'category'` rows with label, resolved `categoryId`, `position`, and
  children carrying `parentId`. Runs in one transaction, writes an audit event,
  and calls `revalidateAll()` which busts `revalidateTag('inspire-nav')`.
  **Refuses to run when the table already has rows** — it is a one-time
  handover, not a reset.
- `getCategoryFallbackNav` is now exported from `src/lib/services/inspire-nav.ts`
  so the seed and the public fallback are the same function.
- **Empty-state UI.** `navigation/page.tsx` reads the fallback count (only when
  the table is empty) and passes `fallbackNavCount` to `NavManager`. The empty
  state now explains the public menu is auto-generated from N top-level
  categories and offers a **"Seed from categories"** button beside "Add Item".
- The page's nav query moved to `navigation/queries.ts` and is shared with the
  action, so the seeded rows the action hands back to the client are exactly
  what a reload would render (the manager holds `items` in local state, which a
  revalidation alone would not update).

**Simulated against production data:** the fallback yields 2 top-level entries
("Idea dan nasihat", "Real Wedding" — "Uncategorized" is filtered out for
having no published articles) with 5 and 8 children, i.e. **15 nav rows**.

### Issue 4 — Editor formatting

In the order the investigation prescribed:

1. **Deleted the corrupted duplicate sidebar** (`article-editor.tsx`, old lines
   1935-2614). Diffed both sidebar ranges first: everything unique to sidebar #1
   was the spliced `EditorRoot`/`EditorContent`/`EditorToolbar` copy; sidebar #2
   uniquely holds the Delete + Master Delete block. File went 3226 → 2544 lines
   and the grid now has exactly two children (`1557-1932` main, `1934-2515`
   sidebar).
2. **Toolbar gated on read-only.** `EditorToolbar` takes a `disabled` prop and
   wraps its bar in a `<fieldset disabled>`; the editor passes `isReadOnly`.
3. **Embed fixed, not removed.** It inserted `embedBlock`, which does not exist.
   `EditorToolbar` now takes `dynamicBlocks` (fed from the editor's
   `publishedDynamicBlocks`) and the item became a submenu listing published
   blocks, each inserting a real `dynamicBlockEmbed` with `blockId`/`blockName`.
   With no published blocks the item is not offered — the node is a reference
   and is meaningless blank.
4. **`handleMediaSelect` fixed** to `.setImage(...)` then locate the node and
   `.setNodeSelection(pos).updateAttributes('image', …)`, copying the pattern at
   `article-editor.tsx:1430-1443`. **`custom-image.ts`** now spreads
   `...this.parent?.()` and declares `data-caption` / `data-caption-url`.
5. **`article-renderer.tsx` sanitizer** allows `ol: ['type', 'start']`.
6. **Render-only definitions registered** for `galleryBlock`, `sectionBlock`,
   `figureBlock`, `ctaButtonBlock`, `pdfLinkBlock` (`sectionBlock` as a
   `block+` container, the rest as atoms). They emit a `data-` div that
   sanitize-html drops, so a nested block degrades instead of throwing. The
   previously silent `catch {}` now `console.error`s with the article id, part
   index and node types, and still skips gracefully.
7. **`.ProseMirror h1…h6` rules added** to `globals.css` — sizes, weights and
   margins, with h5 and h6 visually distinct — mirroring the public
   `.inspire-prose` scale.
8. **Link popover double-fire fixed** by removing `onPressedChange` from the
   `Toggle` inside `PopoverTrigger asChild` and letting the Popover own `open`.

**`@tailwindcss/typography` was NOT installed** and existing `prose` classes
were left untouched, per the logged decision.

---

## Intentionally not done

- **No production writes.** The media backfill was run dry-run only; the nav
  seed action was not invoked against production. Both are listed below for the
  orchestrator to run at ship time.
- **No human profile promoted to public author.** Explicitly out of scope, and
  it would publish an author archive page — a publishing decision, not a fix.
- **The other two `catch {}` sites** in `article-renderer.tsx` (~:1038, :1063)
  were left alone. They already surface "Unable to render content." to the
  reader, so they are not silent, and the task named only the `~:862` one.
- **The partial WordPress import** (29 articles present; code comments reference
  a ~2,235-article catalogue) was not addressed — it is not one of the four
  issues. Note the ordering consequence in "Open questions" below.

---

## Production data steps (for the orchestrator, at ship time)

Run from the worktree root, which has a production `.env.local`. Both steps are
idempotent and safe to re-run.

### 1. Media backfill

```bash
# Rehearse — prints the plan, writes nothing. Expect ~623 rows to insert.
npx tsx scripts/backfill-media.ts

# Apply.
npx tsx scripts/backfill-media.ts --execute
```

Expected on success: `media rows inserted: 623. usage links created: 594.`
Verify at `/admin/inspire/media` (48 per page, so ~13 pages).

Re-running after that is a no-op — both inserts conflict-do-nothing on their
unique indexes.

### 2. Navigation seed

Not a script — it is an in-admin action, deliberately, so it is auditable and
cannot be run against the wrong database:

1. Deploy, then open **`/admin/inspire/navigation`**.
2. The empty state will read *"The public menu is currently generated
   automatically from your 2 top-level categories with published articles."*
3. Click **"Seed from categories"**. Expect a toast: `Seeded 15 navigation items`.
4. The list should then show **Idea dan nasihat** (5 children) and
   **Real Wedding** (8 children), matching the live masthead.

The action refuses to run if the table is non-empty, so a double-click or a
second admin repeating it cannot duplicate the menu.

### 3. Nothing to do for Issue 1

The house account is selectable on the existing production row as-is. No
profile edit, no migration.

---

## Open questions / flags for the orchestrator

- **Import ordering.** If the remaining ~2,200 WordPress articles are going to
  be imported, the media backfill will need re-running afterwards to pick up
  their images — though the patched `wp-import.ts` now registers media as it
  goes, so a *future* import needs no backfill at all. Backfilling now still
  makes sense: it repairs the 29 articles already live.
- **Author picker still shows only "HelloKahwin".** That is correct behaviour
  given the data — no human has opted in as a public author. Saving works now
  regardless. Promoting Ian to a public author (which publishes
  `/artikel/author/<slug>`) remains a product decision.
- **Issue 4 wants a live confirmation pass.** The duplicate-editor deletion is
  structurally verified and the build passes, but "which button felt dead" was
  never pinned down live. Worth re-checking in the deployed admin: H5/H6 now
  render distinctly, Embed lists blocks, the media-library insert keeps its
  caption, and a/A/i/I numbering survives to the public page.
