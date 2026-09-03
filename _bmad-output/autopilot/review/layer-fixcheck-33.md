# Layer: FIX-CHECK (scoped - NOT a fresh review)

You are verifying that a specific list of previously-reported findings has been
closed. This is NOT a new hunt. Do not report new findings unless a FIX ITSELF
introduced a defect.

## What to read
You are already in the worktree. The reviewed commit was `1e28ddd`; the fixes
are in `1c76429`. Read the delta:

    git diff 1e28ddd..HEAD

Read whole files where you need context. DO NOT modify anything - read only.
Context for the change is in `_bmad-output/autopilot/review/COMMON.md`. Read it.

## The 25 findings that had to be closed

- [blind/critical] scripts/backfill-image-mid.mts:411 - The crop dimension assertion runs AFTER the object is already written to production R2
- [blind/critical] scripts/backfill-image-mid.mts:507 - The undo file — the only record of the irreversible crop rewrites — is written once, at the very end
- [blind/major] scripts/backfill-image-mid.mts:350 - A crop whose HEAD fails or 404s is silently counted as under the ceiling and the run exits 0
- [blind/major] scripts/audit-body-image-bytes.mjs:20 - The named pre-ship gate cannot detect the 404 disaster it is documented to guard against
- [blind/major] scripts/backfill-image-mid.mts:598 - A crop still over the ceiling exits 0 whenever the re-encode did not come out smaller
- [blind/major] scripts/backfill-image-mid.mts:107 - A non-numeric --concurrency makes the pool run zero workers and the script reports total success
- [blind/minor] scripts/backfill-image-mid.mts:389 - The crops phase hardcodes the inspire bucket where the writer resolves the bucket per key
- [blind/minor] scripts/backfill-image-mid.mts:360 - Re-running the crops phase stacks generational loss on the crops that need it most, with no undo
- [blind/minor] src/lib/storage/image-variants.ts:99 - getDefaultPresets merges only at the preset-name level, so a partial `mid` row still breaks generation
- [blind/minor] src/lib/storage/smart-crop.ts:662 - Cover renditions are now derived from a possibly stepped-down crop buffer
- [edge/major] scripts/backfill-image-mid.mts:424 - The crop dimension assertion runs AFTER the object is already written to R2
- [edge/major] scripts/backfill-image-mid.mts:354 - A failed or content-length-less HEAD becomes bytes 0, which silently reads as under the ceiling
- [edge/major] scripts/audit-body-image-bytes.mjs:117 - The acceptance audit exits 0 when it measured nothing at all
- [edge/minor] scripts/backfill-image-mid.mts:399 - A crop that cannot be shrunk is recorded 'skipped' and vanishes from both the summary and the exit code
- [edge/minor] src/lib/storage/image-variants.ts:159 - A ceiling preset ignores the admin-supplied `quality`, so retuning `mid` down silently does nothing
- [edge/minor] src/lib/storage/image-variants.ts:99 - The merged admin row is never shape-checked, so a non-object or partial JSONB value produces junk presets
- [edge/minor] scripts/backfill-image-mid.mts:133 - A non-numeric --concurrency makes the pool run zero workers and the script reports success having done nothing
- [edge/minor] scripts/backfill-image-mid.mts:285 - The variants phase omits the `jsonb_typeof` guard its sibling query has, and `variants || …` on a non-object corrupts the column
- [edge/minor] scripts/backfill-image-mid.mts:360 - --force in the crops phase re-encodes crops that were never over the ceiling, adding a lossy generation
- [acceptance/major] scripts/backfill-image-mid.mts:224 - Backfill covers only media rows that already carry `high`, not every row lacking `mid`
- [acceptance/major] scripts/backfill-image-mid.mts:539 - Crop re-encode leaves the CDN stale by default and nothing in the verification path fails on it
- [acceptance/major] scripts/backfill-image-mid.mts:507 - No backup or export before the writes, and the undo record is only written after both phases finish
- [acceptance/minor] src/lib/storage/article-image-variant.ts:20 - Committed comment states as fact a production backfill that has not run
- [acceptance/minor] scripts/backfill-image-mid.mts:240 - Dry run does not produce the diff artifact the common rules require
- [acceptance/minor] scripts/backfill-image-mid.mts:37 - Acceptance criterion "no longer referenced by their article pages" is unmeetable for the crop example

## Two things to check especially carefully, because they were fixed by hand
1. The 13 media rows whose `variants` is a JSONB **string**, not an object.
   The fix writes their R2 `mid.webp` but skips the `UPDATE`. Confirm that
   (a) they ARE selected by `selectVariantRows`, (b) no `variants || ...` runs
   against them, and (c) the undo file's reversal SQL does not name them.
2. `generateSmartCrops` now encodes rung 0 separately and feeds it to
   `COVER_RENDITIONS`. Confirm an under-ceiling crop still produces exactly the
   pre-change bytes with only ONE encode, and that `GEOMETRY_VERSION` is
   unchanged (the existing test asserts `48c0b959`).

## Output - REQUIRED
Return ONLY this JSON object, no prose around it:
{
  "layer": "FIX-CHECK",
  "closed": ["<the finding titles you verified as CLOSED>"],
  "still_open": [
    {"title":"<finding title>","file":"<path>","line":0,"why":"<what is still wrong>"}
  ],
  "new_defects_introduced_by_fixes": [
    {"severity":"critical|major|minor","file":"<path>","line":0,
     "title":"<one line>","description":"<...>","fix":"<...>"}
  ]
}
An empty `still_open` and empty `new_defects_introduced_by_fixes` is the
expected and welcome answer if the fixes are good.
