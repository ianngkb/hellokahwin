# Brief - Sprint 02 - PLAT-05: Document store — all 422 documents ingested, searchable and readable in buddy

**Status:** APPROVED - executing. Sprint 02 is in progress.
**Repo:** a BUDDY worktree (path given at dispatch)
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

Owner direction 26 Aug: an Atlassian-like place for all our documents, and make sure retros are stored. 422 markdown documents across two repos and no way to find any of them. Retros named explicitly — Sprint 01's was written to a repo root because nothing said where it belonged, and the previous spec omitted them.

## Definition of done (verbatim - this is the bar, and it is NOT narrowed)

Both repos synced. Search any phrase at buddy.ian.ng/docs and get the document with its space, path and a highlighted snippet. Sprint 01's retro findable by searching a phrase from inside it. Re-running sync reports every document unchanged and moves no updated_at. A document containing a connection string is SKIPPED and named, and every other document still stores. Proof from the response body with a negative control.

**A definition of done is never rewritten after the sprint starts.** If this
turns out bigger than its DoD assumed, it stays open, or it is parked with a
reason, or it carries forward. Rewriting the DoD to fit what was achieved is
the one thing that makes velocity a lie.

## Repo-specific traps that have cost time before

- **`apps/web` imports LEAF SUBPATHS ONLY**, never a bare package name.
  `@buddy/db/sprints`, not `@buddy/db`. Turbopack will not resolve `./errors.js`
  to `errors.ts`, and the failure prints dozens of "Module not found" errors
  pointing at the PACKAGE's files, never at the import that caused it. **Decide the
  leaf and add its `exports` entry before you write the web import** - one line
  that saves an hour.
- **`date` columns are Kuala Lumpur calendar days.** Use `klToday()` from
  `@buddy/db/sprints`. `new Date().toISOString().slice(0,10)` is the UTC day and is
  *yesterday* here for eight hours out of twenty-four - it already stamped a sprint
  with the wrong date on 26 Aug at 01:07.
- **All UI from `@buddy/design-system`**, never `@chakra-ui/react` directly. Tokens
  not hex, `textStyle` not font sizes. If you touch a shared component or token,
  **update `apps/web/app/(app)/design-system/reference.tsx` in the same PR** -
  that is a maintenance contract, not a suggestion.
- **You are in your own worktree.** Do not `git checkout` in the main buddy
  checkout; another session is live there and a checkout would relocate its HEAD.

## One more thing the CEO hit today

`sprint get <KEY>` does not print the `why` field at all - it is stored and
unreadable. PLAT-07 covers that, but if your work touches the same CLI surface,
fixing it while you are in there is welcome. Two more found today: the status board
is not project-scoped, and it prints a handle on the line AFTER its state, which is
the exact shape that produced a wrong dispatch map in Sprint 01.

## Report format

**CLAIM + EVIDENCE + LIVE LINK**, per item, not a summary. Quote literal command
output. If something cannot be verified from outside, say so plainly and name what
would verify it - never dress an inference up as a measurement.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** - Stage 9, mandatory.
Four questions: what did we learn that is not written down; **which document must
change and who owns the edit (name the file)**; what did we do twice that we should
never repeat; what did we nearly ship and what caught it. **Then make the edit.**
A retrospective that names a file and does not change it has failed.
