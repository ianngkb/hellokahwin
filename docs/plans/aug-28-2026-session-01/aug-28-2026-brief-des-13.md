# DES-13 — Confirm the display typeface, or the wordmark is provisional

**Sprint 03 · design track · 2 points · owner `creative-director`**

DOCS repo. Unblocks DES-11 and DES-12, both of which are currently blocked because the wordmark is set in a STAND-IN face. Licence and cost are the real constraints - NOT diacritic coverage: Malay in Rumi script is essentially plain Latin, and an earlier CEO claim overstated that gate. Do not block a face on glyph coverage.

**Work on the current branch.** Commit and push your documents.

## Why this item exists

The marks are set in Bodoni Moda as a STAND-IN for ivyora-display, the Adobe face Carats & Cake actually use. In a text logo the typeface IS the logo, so this is not a detail - it decides whether the shipped mark is final or provisional.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: A decision naming the face, its licence, its cost, and whether it covers the Latin set the site needs. If a face other than Bodoni Moda is chosen, all five SVGs are regenerated from it and the ratios re-measured. CHECKED BY: State the licence terms and where they were read. Regenerate rather than rescale. BEWARE THE FALSE PASS: Correction to an earlier CEO claim: Malay in Rumi script is essentially plain Latin, so 'Malay diacritic coverage' is a much weaker gate than three personas were written to believe. Do not block a face on it - check licence and cost, which are the real constraints. EVIDENCE LANDS: docs/work-done/ entry and a decision-log entry.

## Extra context from planning

Until this closes, the wordmark on /brand is provisional and should be described as such to anyone outside the company.

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


