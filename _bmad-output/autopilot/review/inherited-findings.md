# Inherited findings — a separate workstream, not attributable to `ianng89/pillars-ingest-redirects`

**Raised by:** CEO amendment, 23 Aug 2026 (brief `aug-23-2026-brief-ai-tag-and-deploy.md`)
**Written by:** Full-Stack Engineer
**Source review:** `_bmad-output/autopilot/review/findings-merged.md` — merged Blind Hunter + Edge Case Hunter + Acceptance Auditor, reviewed at HEAD `73b2275` (base `d37d44d`), i.e. the **`inspire-fixes`** workstream, *before* its fix commits landed.

---

## Why these are inherited, not ours

The CEO's amendment states these findings arrived with the `inspire-fixes` workstream that was
already on master when `ianng89/pillars-ingest-redirects` was cut. **I verified that claim
directly** rather than accepting it, by diffing `master...ianng89/pillars-ingest-redirects`:

| File carrying findings | Lines in this branch's diff |
|---|---|
| `scripts/wp-import.ts` | **0** |
| `scripts/backfill-media.ts` | **0** |
| `src/app/(admin)/admin/inspire/navigation/actions.ts` | **0** |
| `src/components/inspire/editor-toolbar.tsx` | **0** |
| `src/lib/authors/queries.ts` | **0** |
| `src/lib/inspire/content-media.ts` | **0** |
| `src/components/inspire/article-renderer.tsx` | 1 file, **12 lines** |

The single overlapping file is `article-renderer.tsx`, and this branch's entire change to it is
deleting a local `safeHref` function and importing the identical one from
`src/lib/utils/safe-href.ts`, so the new image-credit block shares one security guard instead of
duplicating it. No behavioural change. It does not touch findings 11, 14 or 15, which are
pre-existing defects elsewhere in that file.

**Conclusion: zero of these findings are attributable to this diff.** The CEO's re-scoped gate —
*zero open findings attributable to this diff* — is met.

---

## Verified current status — read this before scheduling the workstream

The CEO asked for this list "as a clearly separate workstream for me to schedule". Before handing
it over I checked each finding against **current master (`be08556`)** rather than reproducing the
stale pre-fix list. **All fifteen are already closed on master**, by the `inspire-fixes` fix
commits that merged at `be08556`. The register below records that with evidence.

**There is therefore no remediation workstream left to schedule.** The value of this document is
the proof of that, not a backlog.

Because `ianng89/pillars-ingest-redirects` contains all of master
(`git merge-base --is-ancestor master <branch>` → true; merge-base **is** master HEAD `be08556`),
**this release ships every one of these fixes to production as well.**

---

## The register

### 1. ⛔ CRITICAL — `scripts/wp-import.ts` — `--clean` LIKE-wildcard media deletion

> *Flagged critical at the CEO's explicit instruction.*

`--clean` on a slug containing `%` or `_` — both legal in a WordPress slug, both SQL `LIKE`
wildcards — widened the delete pattern and removed media rows belonging to **other** articles.

**Status: CLOSED on master** (commit `50d89ad`). Verified at `scripts/wp-import.ts:1321`. The
deletion no longer uses `LIKE` at all:

```ts
const startsWithPrefix = dsql`starts_with(${schema.media.r2Key}, ${cleanupR2Prefix})`;
```

`starts_with` is not a pattern language, so there is nothing to escape and no wildcard to widen.
The delete is additionally scoped with `notInArray(schema.media.r2Key, freshKeys)` so a re-import
cannot delete the media it just wrote.

**Residual risk: none identified.** If the CEO still wants this scheduled, the useful item is a
regression test asserting a `%`-bearing slug does not delete a neighbour's media — the defect
itself is gone.

---

### Majors

| # | Location | Finding | Status | Evidence |
|---|---|---|---|---|
| 2 | `admin/inspire/navigation/actions.ts:42` | Two admins seeding concurrently both pass the pre-transaction emptiness check and duplicate the menu | **CLOSED** (`3aeb046`) | `actions.ts:75` — `SELECT pg_advisory_xact_lock(...)` taken *inside* `db.transaction`, emptiness re-checked behind it |
| 3 | `scripts/backfill-media.ts:260` | `--limit 0` or negative scans/writes everything instead of failing | **CLOSED** (`2e22672`) | `backfill-media.ts:94` — throws `--limit expects a positive whole number` |
| 4 | `scripts/backfill-media.ts:327` | Two referenced URLs resolving to one original key: second discarded, never gets a usage link | **CLOSED** (`2e22672`) | Per-URL alias map retained so every referenced URL matches for usage linking |
| 5 | `scripts/backfill-media.ts:420` | R2 object ≥ 2 GiB overflows Postgres `integer` `file_size`, aborting mid-run | **CLOSED** (`2e22672`) | `MAX_FILE_SIZE = 2147483647` at :180, clamped at :184, reported at :462. Column deliberately **not** migrated, as instructed |
| 6 | `scripts/backfill-media.ts:430` | Hard-coded `HOUSE_AUTHOR_ID` as `uploaded_by` fails FK under `WP_IMPORT_AUTHOR_ID` override | **CLOSED** (`2e22672`) | Resolves via shared helper; aborts with a clear error at :302 if the profile row is absent |
| 7 | `src/lib/authors/queries.ts:255` | App hardcodes `hellokahwin-editorial` while importer honours `WP_IMPORT_AUTHOR_ID` — override makes house author unselectable | **CLOSED** (`e01a36a`) | Single shared resolution now lives at `src/lib/authors/gate.ts:55` — `process.env.WP_IMPORT_AUTHOR_ID?.trim() \|\| HOUSE_AUTHOR_ID`; both call sites use it |
| 8 | `scripts/wp-import.ts:1238` | On conflict, `RETURNING` omits pre-existing media rows, so their article-usage rows are silently skipped | **CLOSED** (`50d89ad`) | Usage rows built from a re-select of all pending keys, inserted + pre-existing alike (`wp-import.ts:1265` comment) |
| 9 | `scripts/wp-import.ts:1280` | Stale-media deletion failure swallowed; dead media rows remain silently | **CLOSED** (`50d89ad`) | Failure pushed to `stats.integrityFailures` at :1338-1340, which drives a non-zero exit |
| 10 | `src/components/inspire/editor-toolbar.tsx:101` | Inserting a media URL already in the document updated the FIRST matching image, leaving the new one bare | **CLOSED** (`50b4e43`) | Node now built with its attributes in one `insertContent` (:108) — no post-hoc search by non-unique `src` to aim wrongly |
| 14 | `src/components/inspire/article-renderer.tsx:155` | Five nested custom-node fallbacks rendered EMPTY elements — nested gallery/figure/CTA/PDF still vanished | **CLOSED** (`50b4e43`) | Semantic fallback specs at :162-237 (`nestedGallerySpec` et al.); covered by `__tests__/article-nested-blocks.test.ts` |

### Minors

| # | Location | Finding | Status | Evidence |
|---|---|---|---|---|
| 11 | `article-renderer.tsx:949` | Regex-extracted caption attributes stayed HTML-entity-encoded (`Tom &amp; Jerry`) | **CLOSED** (`50b4e43`) | `import { decode as decodeEntities } from 'he'` at :5; applied to src/alt/caption/captionUrl at :371-378 |
| 12 | `scripts/wp-import.ts:1122/1136` | Duplicate `<img src>`: first replacement hits all, later iterations register unused duplicates as used | **CLOSED** (`50d89ad`) | Source URLs deduped before download/record |
| 13 | `src/lib/inspire/content-media.ts:33` | Gallery `data-images` with a null entry threw and skipped valid later URLs | **CLOSED** (`50b4e43`) | Per-entry `typeof img === 'object' && typeof img.src === 'string'` guard at :43-44 |
| 15 | `article-renderer.tsx:923` + `article-editor.tsx` | Dead `prose`/`prose-*`/`not-prose` classes while `@tailwindcss/typography` is not installed | **CLOSED** (`a607f8a`) | Both renderer wrappers reduced to `inspire-prose max-w-none`; decision to **not** install the plugin stands |

---

## One discrepancy worth the CEO's eye

The amendment describes the merged review as returning **"20 major and 9 minor open findings"**
(29 total). The only merged-findings artifact that exists on disk —
`_bmad-output/autopilot/review/findings-merged.md`, in both the main checkout and this worktree —
contains **15**: 1 critical, 10 major, 4 minor. I searched both checkouts and all Orca workspaces
and found no artifact carrying a 29-finding count.

Two readings, and I cannot distinguish them from what is on disk:

1. The 29 was a pre-merge tally across the three raw layer outputs (`out-blind`, `out-edge`,
   `out-acceptance`) before duplicates were merged down to 15. The merge note in
   `findings-merged.md` explicitly records collapsing duplicates across layers.
2. A later review run produced a 29-finding set whose artifact was never written to disk, or was
   written into a worktree since removed.

Either way it does not change the conclusion: under reading (1) the 15 are the deduplicated same
set, all closed; under reading (2) I cannot audit findings I cannot read, and I have flagged that
rather than assumed them away. **This is the one open question in the register.**

---

## Recommendation

- **No remediation sprint is needed** for findings 1-15. They are closed on master and ship with
  this release.
- **Worth scheduling instead:** a regression test for finding #1 (`%`/`_` in slug must not delete a
  neighbour's media). It is the only critical-severity data-loss path in the set and currently has
  no test pinning the fix in place.
- **Needs a decision:** whether the 29-finding review referenced in the amendment exists somewhere
  I could not reach. If it does, point me at it and I will audit it the same way.
