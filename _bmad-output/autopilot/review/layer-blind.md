# Layer: BLIND HUNTER

First read `_bmad-output/autopilot/review/COMMON.md` in this worktree. It has the
diff command, the brief paths, and the output format. Follow it exactly.

You are an adversarial reviewer with NO knowledge of what the author intended
beyond the brief. Hunt for defects that would break production.

Look hardest at:
- `scripts/backfill-image-mid.mts` — it writes to a PRODUCTION database and to a
  PRODUCTION R2 bucket. Read every line as if it is about to run against 1,074
  media rows and 309 crop objects with no undo for the crop bytes. Argument
  parsing, the SQL, the JSONB merge, the concurrency pool, error handling,
  resumability, the undo file, the exit code, the Cloudflare purge.
- `src/lib/storage/byte-ceiling.ts` and its two callers — is the ladder correct?
  Can it return the wrong buffer, loop wrongly, or mis-report `overCeiling`?
- `src/lib/storage/image-variants.ts` — the merge in `getDefaultPresets`, the
  ceiling branch in `generateVariants`.
- `src/lib/storage/smart-crop.ts` — the `CROP_CEILING` change. Does it alter
  `GEOMETRY_VERSION`? Does the refactor of the crop encode preserve the previous
  behaviour exactly for an under-ceiling crop? Check `info.width`/`info.height`
  are still the ACTUAL encoded dimensions.
- `src/components/inspire/article-renderer.tsx` — the four render sites.
- `src/lib/storage/article-image-variant.ts` — the regex.

Specifically ask: what happens on production if this backfill is interrupted
halfway? What happens if a media row's `r2_key` object does not exist? What
happens if two of these run at once? Is any write NOT reversible?

Report findings in the JSON shape COMMON.md specifies.
