# SEO-09 — Re-parent the 13 legacy articles

**Sprint 03 · seo · 3pt · owner `BMAD`**

ISOLATED WORKTREE of the site repo. RISK-08 is working a sibling worktree concurrently - do NOT git checkout, do NOT git stash, do NOT touch the main checkout. CONT-04 produced the plan in Sprint 01 and found it needs NO redirects; read it rather than re-deriving. DES-09 shipped a RUNNABLE checker at docs/work-done/aug-28-2026-session-01/aug-28-2026-des-09-EVIDENCE/check-guardrails.py - run it before and after, because re-parenting touches the exact link graph those guardrails protect.

**Branch cut and checked out: `feat/seo09-reparent`.** Commit and push there.

## Why

CONT-04 produced the plan in Sprint 01 and established it needs NO redirects. Deferred from Sprint 02 only because the venue and zero-CTR work touched the same pillar pages, and two agents on one file is how Sprint 01 nearly lost work. That collision risk does not exist this sprint if it is sequenced away from SEO-10.

## Definition of done — verbatim, NOT negotiable

OBSERVABLE: All 13 articles live at their new paths, each returning 200 on FIRST request. No redirect added. Sitemap count unchanged at 103. Each appears under its correct pillar. CHECKED BY: curl all 13 with -w '%{http_code}' on a first request each. Count the live sitemap. Load each parent pillar and confirm the article is linked from it. BEWARE THE FALSE PASS: Check the PILLAR shows them, not just that the URL resolves. Sprint 02's failure mode 3 was a layer reading done from above while the layer below was 404. EVIDENCE LANDS: docs/work-done/ entry listing all 13 old->new paths with status codes.

## Planning context

CONT-04's Sprint 01 plan is the input. Do not re-derive it.

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


