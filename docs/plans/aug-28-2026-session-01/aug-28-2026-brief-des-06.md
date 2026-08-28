# DES-06 — Design search and catalogue browse - the search that ships answers 29% of real demand

**Sprint 03 · design track · 5 points · owner `product-designer`**
Brief: C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-28-2026-session-01\aug-28-2026-brief-des-06.md

You work in the DOCS repo. Fetch the real live site to walk the flows — a flow designed against an imagined content set fails on contact.

**Work on the current branch.** Commit and push your documents.

## Why this item exists

Decision 76 found no search anywhere on a site whose demand is overwhelmingly named-entity lookups - readers arrive hunting a specific hall, a specific state's rate, a specific hantaran question. The owner put this in scope: the catalogue redesign is close to meaningless without it.

> **⚠ CORRECTED 28 Ogos 2026 by the item owner. See decision 132.**
> The premise above is wrong. The site DOES have search: an `InspireArticleSearch`
> combobox on `/artikel`, backed by `GET /api/v1/search`, reached from a header
> magnifier on every page. The fault is the **matching rule**, which requires the
> query to appear as a contiguous substring of a title or excerpt. Measured on
> 28 Ogos by putting all 248 GSC queries from 31 Jul–27 Aug through the live API:
> **209 return zero — 84.3% of queries, 70.9% of impressions** — including
> `mas kahwin terengganu`, which is 27% of every click the site earned that month.
> Reproduce with `python docs/design/des-06-evidence/reproduce.py`.
>
> A near-identical correction was already written on 26 Ogos in
> `aug-26-2026-brief-cont-09-cover-standard.md` ("There is. It works.") and did not
> reach decision 76, this brief, or the tracker — and it was itself wrong in the
> other direction, because nobody had measured it either.
>
> **The DoD below is unchanged and was met in full.** Only the premise was wrong.

## Definition of done — verbatim from the tracker, and NOT negotiable

OBSERVABLE: Specified flows for: search entry point, query experience, results, NO-RESULTS, and how search relates to browsing. Catalogue filters, sort, and the pagination-vs-infinite-scroll decision WITH its reasoning (SEO crawlability, back button, return-to-position). Mobile-first, proved at 360px. CHECKED BY: Walked against the REAL site - real category counts, real article titles, including the thin categories. BEWARE THE FALSE PASS: A flow designed against an imagined content set fails on contact. Fetch the actual categories and use their real counts. EVIDENCE LANDS: docs/work-done/ entry, full path stated to the owner.

## Flags

design-only, build-is-separate, owner-put-this-in-scope, seo-review-required

## Extra context from planning

DESIGN ONLY. Building search is a separate item, sized after this exists - do not assume designing it means it ships this sprint. head-of-seo-content CO-OWNS the pagination-vs-infinite-scroll decision. It is an SEO call (crawl depth, link equity, back-button) as much as a UX one, and DES-09's guardrails bind it.

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

