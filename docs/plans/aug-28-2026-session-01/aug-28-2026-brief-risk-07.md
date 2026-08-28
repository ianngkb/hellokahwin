# RISK-07 — Six sitemap URLs are served noindex and Google excluded all six

**Sprint 03 · risk track · 3 points · owner `BMAD`**
Brief: C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-28-2026-session-01\aug-28-2026-brief-risk-07.md

You are in an ISOLATED WORKTREE of the site repo. Another agent is working in a sibling worktree on SEO-07 at the same time. Do not `git checkout` anything, do not touch the main checkout, and do not run `git stash` at all.

**Your branch is already cut and checked out: `feat/risk07-noindex`.** Commit there and push it; do not cut another.

## Why this item exists

Found by RISK-05 in Sprint 02, which correctly recorded it and did NOT half-fix it because it met neither of the monitor's own alarm conditions. Six URLs we are actively advertising in the sitemap tell Google not to index them. Google crawled and excluded all six. This is the cheapest available correction of a self-inflicted wound.

## Definition of done — verbatim from the tracker, and NOT negotiable

OBSERVABLE: All six URLs named explicitly. Each returns a robots meta WITHOUT noindex on a fresh request. The sitemap URL count is unchanged (103) - this is a robots fix, not a sitemap edit. At least one of the six shows its exclusion cleared in GSC URL Inspection. CHECKED BY: curl each of the six and grep the robots meta, before and after, quoted literally. GSC URL Inspection on at least one. Count the live sitemap with curl | grep -c '<loc>'. BEWARE THE FALSE PASS: Do not check the route source and call it fixed. Check the artefact the consumer receives - the live response. This is the failure shape the production doctrine names. EVIDENCE LANDS: docs/work-done/ entry naming all six URLs with before/after robots meta quoted from live HTML.

## Flags

carried-forward, unowned-until-now

## Extra context from planning

src/app/sitemap.ts. Enumerate which six and why they were excluded before changing anything - the RISK-05 finding names them.

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

