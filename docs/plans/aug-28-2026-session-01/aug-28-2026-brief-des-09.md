# DES-09 — SEO guardrails for the redesign - the things a redesign can destroy

**Sprint 03 · design track · 5 points · owner `head-of-seo-content`**

DOCS repo. You hold a VETO over anything that measurably harms rankings - that veto is the point of this item. Your guardrails gate DES-08, so write them so someone who was not here can test each one.

**Work on the current branch.** Commit and push your documents.

## Why this item exists

THE OWNER CAUGHT THIS: the design track was planned with head-of-seo-content on ZERO items, on a site where organic search IS the business. A redesign is one of the few changes that can undo Sprint 01 and Sprint 02 in a single deploy. Sprint 02 spent 77 points getting 103 URLs indexed, positions from 20 to 17.7 and impressions from 88/day to 412/day. A redesign that drops heading hierarchy, breaks internal links, strips schema, or triples LCP with hero photography gives all of that back - and the loss shows up weeks later, attributed to nothing.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: A written guardrail spec that DES-03 and DES-05 must satisfy, covering at minimum: heading hierarchy per page type (one h1, ordered h2/h3); the internal-linking model (SEO-02 removed 79 rel=nofollow links and added 68 real ones - the redesign must not regress it); which schema types each page emits today and must still emit (Article, BreadcrumbList, ItemList, FAQPage per SEO-10); Core Web Vitals budgets with numbers, especially LCP against big editorial photography; catalogue crawlability (the pagination-vs-infinite-scroll call in DES-06 is an SEO decision as much as a UX one); image weight and format budget; and what must NOT change - URLs, canonicals, the redirect layer verified 29/29. CHECKED BY: Read against the DES-03 artifact and signed off BEFORE DES-08 builds. After DES-08 ships: re-run the checks against live production and quote the numbers. BEWARE THE FALSE PASS: 'The design looks fine for SEO' is not a check. Every guardrail must be a number or a literal string that can be tested against the live page. EVIDENCE LANDS: docs/work-done/ entry with the guardrails, plus a post-ship verification with before/after numbers.

## Extra context from planning

GATE: DES-08 does not ship until these guardrails are signed off, and head-of-seo-content re-verifies AFTER the deploy. This seat has veto over anything that measurably harms rankings - that veto is the point of the item.

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


