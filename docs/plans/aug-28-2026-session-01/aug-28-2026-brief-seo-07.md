# SEO-07 — A shipped title has a half-life - generateMetadata caches its own fallback

**Sprint 03 · seo track · 3 points · owner `BMAD`**
Brief: C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-28-2026-session-01\aug-28-2026-brief-seo-07.md

You are in an ISOLATED WORKTREE of the site repo. Another agent is working in a sibling worktree on RISK-07 at the same time. Do not `git checkout` anything, do not touch the main checkout, and do not run `git stash` at all.

**Your branch is already cut and checked out: `feat/seo07-title-halflife`.** Commit there and push it; do not cut another.

## Why this item exists

THE MOST IMPORTANT ITEM IN THIS SPRINT. SEO-05 shipped repaired titles for the mas-kahwin family in Sprint 02. That family now draws ~300 impressions at positions 6.5-12.2 and earns 3 clicks. We CANNOT TELL whether the repaired titles are what Google is being served, because a correct row can render as the site-default title 14 minutes after a verified repair. Every title decision downstream of this is unmeasurable until it is fixed.  CARRIED FROM THE SPRINT 02 RETRO, verbatim, because the planning pass lost this detail: Sprint 02 retrospective, head-of-seo-content, against his own item. SEO-05 shipped five correct DATABASE ROWS. Three transforms sit between the row and the SERP: stripBrandSuffix(), the layout appending the brand suffix (14 chars against the roughly 60 Google prints), and generateMetadata returning {} under a 1.5s deadline - which renders the site-default title AND CACHES IT. That recurred 14 minutes after a full repair. The CEO verified the title live and correct at 59 chars and marked the item done; the room is right that the tracker has no field for a fix with a half-life. Related and unowned: 39 pages were serving no article title at all, a defect a row-level field audit could not see.

## Definition of done — verbatim from the tracker, and NOT negotiable

OBSERVABLE: The mechanism stated from source. The defect reproduced deliberately. The true count of affected pages stated WITH its method - the count is currently unknown. After the fix: a repaired title still correct on a cold fetch 30+ minutes later, quoted literally. CHECKED BY: Re-measure the render-level defect SEQUENTIALLY, not concurrently - the Sprint 02 note says the true count is unknown precisely because the measurement method was wrong. Then wait out the cache window and re-fetch cold. BEWARE THE FALSE PASS: Verifying a title immediately after deploy is the false pass. The defect IS the delay. A check that does not wait cannot catch it. EVIDENCE LANDS: docs/work-done/ entry with the mechanism, the count and its method, and the 30-minute cold re-fetch.  PLUS THE CARRIED-FORWARD DoD, which is more specific than the one written at planning and is NOT superseded by it: generateMetadata never caches a fallback. Under deadline it must serve the article title from a cheaper source or fail open rather than freezing {} into a prerender. Prove it by forcing the timeout and showing the response still carries the article title, then showing the same URL again from cache. Then re-run the full 69-page RENDERED title sweep - sequentially, not concurrently, because a six-wide sweep manufactures the contention it measures - and report how many pages serve no article title. The figure is currently unknown: 39 was reported, 3 was the corrected pre-existing count, and 36 were caused by the measurement itself.

## Flags

sprint-leader, blocks-measurement, merged-from-backlog

## Extra context from planning

Read Next's generateMetadata caching behaviour in source. This is the same class as decision 44 - a caching mechanism whose argument reads like an intensity.

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

