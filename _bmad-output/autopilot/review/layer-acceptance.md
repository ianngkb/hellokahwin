# Layer: ACCEPTANCE AUDITOR

First read `_bmad-output/autopilot/review/COMMON.md` in this worktree. It has the
diff command, the brief paths, and the output format. Follow it exactly.

Then read the brief `C:\Users\Ian Ng\Documents\Code\tmp\2026-09-04-ahrefs-audit\hk-images-task.md`
and the common rules `...\phase23-common.md` IN FULL.

Your job is ONLY this: does the diff satisfy every stated requirement, and does
it violate any stated constraint? Go requirement by requirement.

The brief's scope items:
 1. Check the live presets FIRST and record them before changing anything.
 2. Add a `mid` preset (q72, maxWidth 1400) and point the 680px render sites at
    it. Keep `high` for the lightbox/full-view if one exists. Apply a byte
    ceiling with the quality ladder `smart-crop.ts` already uses:
    `mid` <= 350 KB, `crop-*` <= 300 KB.
 3. Backfill on R2: for every media row / variant set lacking `mid`, generate it
    from the ORIGINAL in R2, rate-limited, idempotent, resumable, dry-run count
    first. Regenerate any `crop-*` rendition over the ceiling with the ladder.
 4. Make sure the admin settings row gets the `mid` entry too, OR the code falls
    back sanely when the row lacks it.
 5. Tests for the preset selection and the ceiling ladder.

The brief's acceptance criteria, and the common rules' data-write rules
(backup/export before writes, dry-run diff first, revalidation after, never
delete rows, humanizer on written text) — check each and say which are met by
the diff, which are deferred to the run, and which are NOT addressed at all.

Constraints to check for violations:
- "do not touch article content or category rows" (another worker owns those).
- Never delete rows. Never run a write without a dry-run.
- Scripts that write to the database are code and get reviewed before running.

Report each unmet or violated requirement as a finding in the JSON shape
COMMON.md specifies. Requirements that are met need no finding.
