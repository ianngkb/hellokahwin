# DES-07 — The state set - empty, loading, error, and long Malay headlines

**Sprint 03 · design track · 3 points · owner `product-designer`**

DOCS repo. Design only. DES-06 is DONE and corrected its own brief: the site HAS search, and it returns zero results for 84.3% of real arrival queries covering 70.9% of impressions. Read that entry first - your state set must cover that reality, not the premise it replaced.

**Work on the current branch.** Commit and push your documents.

## Why this item exists

This is what separates a design that survives production from one that does not. Sprint 02 shipped a homepage with a grey placeholder card, a category page with two 'coming soon' empty states above its real content, and nav text truncated mid-word. Every one is an unspecified state, not a bug.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: For every surface in the redesign: default, loading, empty, error, too-few-items, too-many-items, slow/no-JS, and the LONGEST plausible Malay content. Each specified visually, not described. CHECKED BY: Cross-check against the three page types in DES-03. Any state present in neither document is a gap. BEWARE THE FALSE PASS: A specification showing only the happy path is not finished - the missing states get invented by whoever builds it. EVIDENCE LANDS: docs/work-done/ entry.

## Extra context from planning

Real Malay headlines at real length. English placeholders hide the wrap problems entirely.

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


