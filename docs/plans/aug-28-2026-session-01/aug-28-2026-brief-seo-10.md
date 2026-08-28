# SEO-10 — 31 articles emit no FAQ schema on a site whose long tail is question-shaped

**Sprint 03 · seo track · 3 points · owner `BMAD`**

ISOLATED WORKTREE of the site repo. Another agent works a sibling worktree on RISK-08 concurrently. Do NOT git checkout anything, do NOT touch the main checkout, and do NOT run git stash at all. Evidence from Sprint 02 already exists: docs/work-done/2026-08-27-seo-05-titles-EVIDENCE/faq-schema-gap.json - read it rather than re-deriving the gap.

**Your branch is cut and checked out: `feat/seo10-faq-schema`.** Commit and push there; do not cut another.

## Why this item exists

Found during SEO-05. Question-and-answer blocks are earning no rich result on a site whose entire Malay long tail is question-shaped - which is the cheapest rich-result opportunity we have. Recorded as ONE emitter fix, not 31 article fixes. The original owner (full-stack-engineer) was retired to BMAD, which is why this has sat unowned.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: The emitter fixed. FAQPage JSON-LD present in the live HTML of at least five named articles that carry Q&A blocks. Validated against Google's Rich Results Test or the schema spec, with the result quoted. CHECKED BY: curl each of the five and extract the JSON-LD block literally. Do not infer from the route source. BEWARE THE FALSE PASS: Evidence file from Sprint 02 exists: docs/work-done/2026-08-27-seo-05-titles-EVIDENCE/faq-schema-gap.json. Read it rather than re-deriving the gap. EVIDENCE LANDS: docs/work-done/ entry with the JSON-LD quoted from live HTML for five articles.

## Extra context from planning

Fix the emitter, THEN correct the writer instruction so it describes what actually happens - the instruction currently describes behaviour the code does not have.

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


