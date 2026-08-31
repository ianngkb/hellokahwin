# PLAT-19 — Fourteen stale site worktrees are still standing, one holding a change that would REVERT shipped work

**Sprint 05 — *Build where the click is*** · track `platform` · **2 points** · owner `BMAD`
**Dispatched:** 01 September 2026
**Your item in the tracker:** `pnpm --silent sprint get PLAT-19 --sprint 5` (run from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

MEASURED 01 Sept 2026: git worktree list in hellokahwin-site shows the main checkout plus FOURTEEN orca worktrees from Sprint 04 and earlier. One of them, ui-01-ship, holds an UNCOMMITTED change that would revert UI-03's hero work and its HEAD is 79 commits behind master. It was left untouched deliberately at sprint close rather than reset. Every one of these is a live checkout of a repo whose central hazard is that a checkout in the wrong tree swaps the company record for the site source.

## DEFINITION OF DONE — verbatim, and it is not narrowed

Every worktree whose work is provably shipped is removed, and the count of remaining trees is stated with a one-line reason for each survivor. 'Provably shipped' means TWO INDEPENDENT SIGNALS per tree before removal - the branch's content is an ancestor of origin/master AND a second reading - never a name match. The ui-01-ship change is DISCARDED, not merged, and the discard is recorded with what was discarded and why (it would revert UI-03). A negative control is shown: at least one tree that was NOT removed, with the signal that stopped it.

## BRIEF

TWO INDEPENDENT SIGNALS BEFORE ANY DESTRUCTIVE REMOVAL - this is the standing rule and the reason is on the record: in Sprint 03 a grep for 'RISK-07' against a tree named 'risk07' returned nothing on a case mismatch and would have deleted worktrees whose work was fully shipped. Sprint 04 also found three trees showing commits ahead of their own branch ref that were all ancestors of origin/master by CONTENT - merge commits pulling master in, the mirror of the squash-merge trap. Test by content, never by ref position or name. If a tree is ambiguous, LEAVE IT and say so; an extra worktree costs disk, a wrong removal costs work.

## HOW TO RECORD YOUR RESULT

Run from `~/Documents/Code/buddy`:

```
pnpm --silent sprint set-state PLAT-19 in_progress --sprint 5
pnpm --silent sprint add-evidence PLAT-19 --sprint 5 \
  --claim "<what is now true>" --proof "<the literal output/command/measurement>" --link "<url>"
```

**Do NOT set your own item to `done`.** The CEO verifies every item against
production or the artefact itself before that happens — that is the standing rule,
and it exists because agent completion reports have been wrong in the optimistic
direction. Record your evidence and report; the CEO closes it.

---

## STANDING RULES — these bind you, and they are not optional

**DONE MEANS SHIPPED.** Owner directive, 26 Aug 2026. Not built, not committed, not
"working locally" — shipped, and reachable by the owner. Site code: merged to the
default branch AND deployed AND visible on a live URL. Content: ingested to
production AND the URL returns 200 AND a reader can find it. A document or log:
committed and pushed — a file on one machine is not a deliverable.

**YOUR DoD IS NEVER NARROWED.** If the item turns out bigger than its DoD assumed,
it stays open, gets `parked` with a reason, or carries forward. Rewriting the DoD to
fit what you achieved is the one thing that makes velocity a lie. Bring it back
instead — a parked item with a clear reason is a good outcome.

**A GATE IN YOUR DoD IS ALLOWED TO KILL THIS ITEM.** If your brief opens with a
gate and the gate fails: STOP and report. Do not build with invented figures and do
not quietly downgrade to an option already rejected. On a site whose entire claim is
that its numbers carry sources, a plausible fabrication is the worst outcome
available and the hardest to detect later.

**VERIFY YOUR OWN CHECKS. The company has twelve tabulated instances of the same
failure: checked a proxy, with a pattern nobody tested.**
- When a check returns a surprising ABSENCE, **verify the CHECK first.**
- **Enumerate what IS there** (`grep -oai <pat> | sort | uniq -c`) rather than
  testing for what you assume is there. The second form can only ever return a
  number about your assumption.
- **NEVER COMBINE `grep -o -i -F`.** It returns **0** in GNU grep 3.0 (this Git Bash
  build) and reproduces on a 23-byte file. On 01 Sept it returned 0 for `REKOD` and
  `SUMBER` on a page carrying them ×24 and ×20. Use the committed helper:
  `bash scripts/measure/count-in-html.sh <url|file> "PATTERN" ...`
- **A FIX IS NOT VERIFIED UNTIL IT IS RUN AGAINST THE FAILING CASE.** The first fix
  for that grep bug was itself wrong, and was caught only by running it. "I
  understand the cause" is not a test.
- **A status code proves nothing on its own.** A 200 carrying the right string can
  still be a shell — a preview once returned 200 with the right marker and rendered
  zero articles. Compare structurally against production where it should not differ.

**PRODUCTION WRITES: record and push a precise UNDO first.** Name the exact slugs,
paths or row ids. That is what makes a write reversible in fact rather than in
principle. Additive and reversible writes proceed on your authority; anything with
no recovery path stops and comes back to the CEO.

**STAGE 9 — THE RETROSPECTIVE IS PART OF THIS ITEM, NOT AN EXTRA.**
Write it into your `docs/work-done/` entry under `## Retrospective`, answering:
what did we learn that is not written down; **which document must change and who
owns the edit — name the file**; what did we do twice that we should never repeat;
what did we nearly ship, and what caught it. **Then make the edit.** A retrospective
that names a document and does not change it has failed. Prefer an executable form —
a DoD clause, a script, a gate — over prose: **prose rules do not fire.**

**LOG YOUR WORK** in `docs/work-done/sep-01-2026-session-01/sep-01-2026-done-<slug>.md`
with evidence a reader who was not here can verify, and update
`docs/work-done/README.md`.

**REPORT A BLOCK THE MOMENT IT HAPPENS.** Do not sit on it. If you are blocked on a
credential, that means your SESSION lacks permission — say so precisely, because
that is a different problem from the company lacking the credential.

**When your work contradicts something the CEO wrote, the evidence wins** and the
file gets corrected at source. Four agents corrected the CEO in Sprint 04 and every
one was right. Put it in your log where it will be read.

**All reader-facing content passes `/humanizer` before it is done.**

---

## When you finish

Print, at the start of a line, exactly:

```
ITEM EXIT: 0
```

`ITEM EXIT: <n>` is the ONLY string that means this ITEM is done. Gates you run may
print their own `NAME EXIT: n` lines — those are that gate's outcome, not yours, and
they wake the CEO for nothing. Use a non-zero code if you are stopping without
completing the DoD, and say why immediately above it.

## ⚠ YOUR CENSUS IS PINNED. THESE ARE THE ONLY TREES IN SCOPE.

The CEO is creating NEW worktrees for Sprint 05 items at the same time you run.
Those are live work and are **out of scope for you**. Your scope is exactly the
trees below, captured at dispatch on 01 Sept 2026 before any Sprint 05 tree existed.
If you find a tree that is not on this list, LEAVE IT and say so in your log.

```
C:/Users/Ian Ng/Documents/Code/hellokahwin-site                            72f9735 [master]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects  06a377b [ianng89/pillars-ingest-redirects]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/rights01-credits          0d9deb5 [ianng89/rights01-credits]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui-01-ship                105e79d [ship/ui-01-s-row-index]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui01-srow                 ef1716e [ianng89/ui01-srow]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui02-nav                  d934570 [ianng89/ui02-nav]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui03-hero                 7a746d2 [ianng89/ui03-hero]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui05-category-images      c1632d1 [ianng89/ui05-category-images]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui06-layout-gate          116990b [ianng89/ui06-layout-gate]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui07-label-clip           00e7267 [ianng89/ui07-label-clip]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui08-attrib-link          73ab99b [ianng89/ui08-attrib-link]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui09-search-a11y          8b1ee87 [ianng89/ui09-search-a11y]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui10-measure              fc9769a [ianng89/ui10-measure]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui11-tap-targets          be0b1f0 [ianng89/ui11-tap-targets]
C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/ui12-thumb-geometry       96403d7 [ianng89/ui12-s4c-honesty]
```

`origin/master` at dispatch: `72f9735`

**The `ui-01-ship` tree is the named hazard**: HEAD `105e79d`, and it holds an uncommitted change that would REVERT UI-03's hero work. It is DISCARDED, not merged.
