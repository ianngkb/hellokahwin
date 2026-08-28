# CONT-12 — Complete C2.1 - article count set by CONT-10's decision

**Sprint 03 · content track · 12 points · owner `writer-inspirasi-vendor-venue`**

DOCS repo. CONT-10 has DECIDED: DO NOT MERGE - C2.1 stays at eight published articles, no URL changes. Read docs/work-done/aug-28-2026-session-01/aug-28-2026-done-cont-10-c21-serp-decision.md FIRST; it sets your article count and it is not yours to reopen. All copy goes through /humanizer.

**Work on the current branch.** Commit and push your documents.

## Why this item exists

C2.1 is the last open Tier 1 cluster. Its article count CANNOT be fixed until CONT-10 decides whether the cluster merges - which is why this item is sized on the larger shape and explicitly declared blocked rather than given a count it might not keep.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: Every article ingested to production, 200 on FIRST request, appearing under its correct pillar, with the pillar no longer advertising it as 'akan datang'. Sitemap count rises by exactly the number published. CHECKED BY: curl each first-request. Load the parent pillar and confirm each is linked. Count the sitemap before and after. BEWARE THE FALSE PASS: Sprint 02 failure mode 5: when work transforms a document, check what the transformation CARRIED THROUGH. An English SOURCE NOTES block with struck-through internal claims went live on a Malay reader page and sat there a day. EVIDENCE LANDS: docs/work-done/ entry with every URL and its first-request status code.

## Extra context from planning

BLOCKED until CONT-10 decides. Do not start writing against a count that may change. All content runs through /humanizer - company-wide rule, decision 3.

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


