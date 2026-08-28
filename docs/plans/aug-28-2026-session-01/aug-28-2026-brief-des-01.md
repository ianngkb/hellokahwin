# DES-01 — Art-direction rationale with visual evidence - the reasoning gate

**Sprint 03 · design track · 5 points · owner `creative-director`**
Brief: C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-28-2026-session-01\aug-28-2026-brief-des-01.md

You work in the DOCS repo. You will need to fetch real competitor sites and read across repos, which is why you have bypassPermissions. You write no production code.

**Work on the current branch.** Commit and push your documents.

## Why this item exists

The owner named caratsandcake.com and partyslate.com as touchstones and named what premium must NOT be (Western bridal pastiche on Malay words). Nobody has defined what it positively IS for a Malaysian Muslim audience. Taste arguments are unwinnable in the abstract and cheap to settle against evidence, so the reasoning is approved before anything is drawn.

## Definition of done — verbatim from the tracker, and NOT negotiable

OBSERVABLE: A written rationale containing: what premium looks like in the Malaysian wedding market today (NAMED brands with URLs or screenshots); what our actual SERP competitors look like and where they are weak; the proposed register with its reasoning; and an explicit list of what we will NOT do, with reasons. CHECKED BY: Every market claim carries a real URL or screenshot with the date fetched. The owner approves the REASONING before DES-02 begins. BEWARE THE FALSE PASS: A rationale asserting what Malaysian couples find premium without showing a single real brand is an opinion, not evidence. Fetch them. EVIDENCE LANDS: docs/work-done/ entry, opened for the owner with its full path.

## Flags

gate-first, owner-approves-reasoning, blocks-DES-02

## Extra context from planning

GATE: DES-02 does not start until the owner approves this. A parked or redirected direction here is far cheaper than three rejected comps.

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

