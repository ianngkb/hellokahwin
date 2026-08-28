# DES-04 — Front-end stack recommendation - does Tailwind stay, do shadcn primitives stay

**Sprint 03 · design track · 3 points · owner `design-systems-engineer`**
Brief: C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-28-2026-session-01\aug-28-2026-brief-des-04.md

Your recommendation lands in the DOCS repo, but you must READ the site code at C:/Users/Ian Ng/Documents/Code/hellokahwin-site to ground it. Read only — do not edit the site in this item.

**Work on the current branch.** Commit and push your documents.

## Why this item exists

The owner deliberately did NOT pre-decide the stack; it is the engineer's call, argued against the art direction once it exists rather than against a hypothetical one. The site runs Tailwind + shadcn defaults on Geist - the generic look being replaced. The visual defaults are the problem; the accessibility primitives are valuable.

## Definition of done — verbatim from the tracker, and NOT negotiable

OBSERVABLE: A written recommendation answering, separately and explicitly: does Tailwind stay and what exactly changes; do shadcn/Radix primitives stay; the cost of each option in work and risk; and what would make the recommendation wrong. CHECKED BY: Read against the DES-01 rationale and the DES-03 artifact. STOPS and reports before any system work begins. BEWARE THE FALSE PASS: Conflating 'shadcn looks generic' with 'Radix accessibility must go' is how teams throw away accessibility to fix a look. Answer the two questions separately. EVIDENCE LANDS: docs/work-done/ entry and a decision-log entry.

## Flags

gate-first, blocks-DES-05, owner-opened-this-question

## Extra context from planning

GATE: DES-05 does not start until this is decided and recorded.

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

