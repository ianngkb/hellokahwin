# Brief - Sprint 02 - SEO-06: The Hantaran pillar advertises its own ranking articles as missing

**Status:** APPROVED - executing. Sprint 02 is in progress.
**Repo:** the SITE worktree - C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

/artikel/hantaran-mas-kahwin renders THREE 'akan datang tidak lama lagi' empty states — Hantaran kahwin, Hantaran tunang, Duit hantaran — and we have published, indexed, RANKING articles for the first two: hiasan-dekorasi/hantaran-kahwin at position 6.5, and hiasan-dekorasi/hantaran-tunang at 49 impressions position 9.6. They are filed under hiasan-dekorasi, so the pillar never links down to them and tells a reader the section is empty. That breaks the bidirectional pillar rule and strands two of our better-ranking pages. Taxonomy, not design.

## Definition of done (verbatim - this is the bar, and it is NOT narrowed)

Both articles re-filed into hantaran-mas-kahwin with the redirect verified as ONE hop to 200 — CONT-04 established that re-parenting needs no redirect-table entry because the route self-heals, so confirm which applies rather than assuming. The pillar shows them as real entries and the three empty states drop to at most one. Old URLs still resolve. Sitemap reflects the move. GSC positions for both recorded before and after so a ranking loss would be visible. COORDINATE WITH UX-03 — it touches the same pillar rendering and these two must not run concurrently on the same files.

**A definition of done is never rewritten after the sprint starts.** If this
turns out bigger than its DoD assumed, it stays open, or it is parked with a
reason, or it carries forward. Rewriting the DoD to fit what was achieved is
the one thing that makes velocity a lie.

## Sequencing - this item unblocks two others

**CONT-05 and CONT-07 are waiting on you.** Their seed articles are the two you are
re-filing, and until they move, those writers would be adding to a cluster whose
pillar still advertises itself as empty. Report the moment the re-file is live.

**Do NOT touch homepage or nav rendering.** UX-03 owns `page.tsx`, `navbar.tsx` and
the nav scrollers, and it touches `pillar-body.tsx` too. You own the taxonomy and
the article rows. If you find yourself editing pillar *rendering*, stop and say so
rather than racing UX-03 into the same file.

## What CONT-04 established in August, so you do not redo it

Re-parenting an article needs **no redirect-table entry** - the route self-heals,
and the redirects table holds zero rows. That was proven, and the CEO's contrary
claim was disproved by the team. **Confirm it still holds for these two rather than
assuming**, then say which applies.

## Live state you can rely on, verified today

RISK-04 shipped: the sitemap now resubmits on ingest, GSC re-fetched it (73 to 78
URLs), and four articles that were "unknown to Google" this morning have left that
state - two already indexed with breadcrumbs. RISK-06 shipped: the 365-day stale
window is capped at 3000s. So a change you make today reaches Google quickly, and
pages are no longer served from a year-old cache.

## Report format

**CLAIM + EVIDENCE + LIVE LINK**, per item, not a summary. Quote literal command
output. If something cannot be verified from outside, say so plainly and name what
would verify it - never dress an inference up as a measurement.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** - Stage 9, mandatory.
Four questions: what did we learn that is not written down; **which document must
change and who owns the edit (name the file)**; what did we do twice that we should
never repeat; what did we nearly ship and what caught it. **Then make the edit.**
A retrospective that names a file and does not change it has failed.
