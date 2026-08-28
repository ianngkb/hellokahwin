# RISK-08 — Cold renders take 5-22s against a route declaring maxDuration=5

**Sprint 03 · risk track · 5 points · owner `BMAD`**

ISOLATED WORKTREE of the site repo. Another agent works a sibling worktree on SEO-10 concurrently. Same rules: no git checkout, no stash, do not touch the main checkout. RISK-05 monitor data now exists - use it rather than guessing, and a null finding ("the monitor shows this no longer bites") is a legitimate and predicted outcome.

**Your branch is cut and checked out: `feat/risk08-cold-render`.** Commit and push there; do not cut another.

## Why this item exists

Measured in Sprint 01, never root-caused, deferred from Sprint 02 deliberately because RISK-04 and RISK-05 changed what Googlebot meets first. RISK-05's monitor has now been running, so Sprint 03 revisits this with data rather than by guessing - which is exactly the condition the deferral was written against. One new article URL also returned 502 FUNCTION_RESPONSE_STREAM_INCOMPLETE.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: The monitor's actual series quoted for the affected routes. Either a stated root cause with the fix deployed and a cold-path measurement showing the new figure, OR a stated finding that the monitor shows this no longer bites, with the series that proves it. CHECKED BY: Reproduce deliberately on a COLD path. A warmed cache proves nothing - RISK-06 in Sprint 02 established that the CEO's own earlier requests hid a defect present on 50 of 61 pages. BEWARE THE FALSE PASS: 'Could not reproduce' is a statement about conditions, not about the site. If it cannot be reproduced, say what conditions were tested and why they were cold. EVIDENCE LANDS: docs/work-done/ entry with the monitor series and the literal timings.

## Extra context from planning

Read the mechanism in source before measuring. Reading the source first is what made RISK-06's 50/61 appear on the first try.

## Standing rules — these bind you

- **DONE MEANS SHIPPED.** Not built, not committed, not "working locally".
  Merged to the default branch AND deployed AND visible, or ingested to
  production AND reachable. If your item's result is a document, it is
  committed and PUSHED. A file on one machine is not a deliverable.
- **Check the artefact the CONSUMER receives**, never the input you control.
  Reading your own source proves what you intended, not what shipped.
- **A status code is not a measurement.** If a check needs a header, a
  cookie, a session or a flag to reproduce, that condition goes in the claim
  itself. A reader who cannot reproduce your number will conclude you made
  it up.
- **Never narrow this DoD.** If the item turns out bigger than it assumed,
  stop and report — do not rewrite what "done" means to match what you got.
- **Verify, don't assert.** curl the URL, run the query, list the files.
- **/humanizer on any reader-facing copy.** Company rule.
- **Real Malay at real length** in anything user-facing. English placeholder
  text hides the wrap problems that are the whole point.

## Stage 9 — the retrospective is part of the item

Before you report done, write a `## Retrospective` section into your
`docs/work-done/` entry answering four questions:
1. What did we learn that is not written down anywhere?
2. **Which document must change, and who owns that edit?** Name the file.
3. What did we do twice that we should never repeat?
4. What did we nearly ship, and what caught it?

Then MAKE the edits you named. A retrospective that names a document and
does not change it has failed.

## When you finish

Report in this terminal with **CLAIM + EVIDENCE + LIVE LINK**, not a summary.
Print a line starting `ITEM EXIT: 0` (or non-zero) so the watcher wakes.


