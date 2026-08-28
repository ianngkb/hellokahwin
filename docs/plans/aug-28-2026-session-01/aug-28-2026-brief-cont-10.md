# CONT-10 — C2.1 merge decision - settle it on SERP evidence, not parent_topic

**Sprint 03 · content track · 3 points · owner `head-of-seo-content`**
Brief: C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-28-2026-session-01\aug-28-2026-brief-cont-10.md

You work in the DOCS repo. You will need the Ahrefs MCP tools; they are deferred, so load their schemas with ToolSearch first.

**Work on the current branch.** Commit and push your documents.

## Why this item exists

C2.1 (barang hantaran lelaki) is DELIBERATELY undecided. CONT-07 found three C2.1 articles plus the legacy seed on one parent. C2.2 was decided DO-NOT-MERGE on decisive SERP evidence - Google's own People-also-ask box carries two C2.2 titles near verbatim. C2.1 has had NO SERP check, and deciding on parent_topic alone would repeat the exact error this whole thread corrected. The parent_topic signal is demonstrably noisy in Malay long-tail: Ahrefs gives the head hantaran tunang a traffic potential of 400 while four of its children score 1,100-1,300, which is impossible.

## Definition of done — verbatim from the tracker, and NOT negotiable

OBSERVABLE: A written decision - merge or do not merge - resting on a SERP check, not on parent_topic. Specifically: does the MY SERP split the groom/bride angles, and do sub-angle pages rank independently? CHECKED BY: Ahrefs SERP overview on the C2.1 head terms. Name the volume field used. The resolver is the SERP, not the field. BEWARE THE FALSE PASS: The playbook's own rules conflict here - SEO rule 4 says a shared parent means merge, rule 2 says every question over 100/mo gets a page, and in C2.2 both were followed. This item does not resolve that conflict globally; it decides THIS cluster on evidence. EVIDENCE LANDS: docs/work-done/ entry and a decision-log entry. CONT-12's article count comes from this decision.

## Flags

blocks-CONT-12, decision-item

## Extra context from planning

Run the parent_topic check at PLANNING time - that is the interim guard all three sessions adopted.

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

