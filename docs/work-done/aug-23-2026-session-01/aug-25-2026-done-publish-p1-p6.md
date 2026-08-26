# P1 and P6 published — eight articles live, two pillars lost `noindex` — 25 Aug 2026

**Session:** aug-23-2026-session-01 · **Owner:** BMAD · **Status:** completed
**Plan:** [aug-25-2026-brief-publish-p1-p6.md](../../plans/aug-23-2026-session-01/aug-25-2026-brief-publish-p1-p6.md)

## What was done

Eight board-cleared articles ingested into the production database and
published — four into P1 `/artikel/nikah-undang-undang/` (borang-nikah,
rukun-nikah, syarat-sah-nikah, lafaz-taklik) and four into P6
`/artikel/venue-perancangan/` (harga-sewa-dewan-kahwin, checklist-kahwin,
pakej-dewan-kahwin, bajet-kahwin).

An undo record was written before the first write, since production runs
`pitr_enabled=false` with no platform backups. Nothing was rolled back — it was
never needed.

Three decisions the brief asked to be settled:

- **Cover path convention: relative to the article file, no `./` prefix.** The
  feared disagreement between the P1 and P6 sets did not exist — no `./` appears
  in any of the eight files, and all 18 image references resolved on disk. The
  convention is now written down in two places so it stops costing review time.
- **The `articles.content` double-encoding bug was already fixed** by a previous
  run, and verified fixed against the database before ingesting: zero rows of
  `jsonb_typeof(content) = 'string'` across the whole table, before and after.
- **Ingest order was not constrained.** The eight do not cross-link to each
  other; all seven of their link targets were already published. Order was
  chosen for failure containment instead — P1 complete before P6 began.

## Evidence

Full technical log, with every literal request and response, lives with the code
that produced it: **`docs/work-done/2026-08-25-publish-p1-and-p6.md`** in the
site repo (`hellokahwin-site`). Undo record beside it at
`docs/work-done/2026-08-25-publish-p1-p6-UNDO.md`.

Headline numbers, all measured against production:

| | Before | After |
|---|---|---|
| `sitemap.xml` URLs | 47 | **57** |
| Published articles | 36 | **44** |
| Pillars with live articles | 1 (P2) | **3 (P1, P2, P6)** |
| `/artikel/nikah-undang-undang` | `noindex, follow` | **no robots meta — indexable** |
| `/artikel/venue-perancangan` | `noindex, follow` | **no robots meta — indexable** |

All eight new URLs returned **200 on their first ever request**, cold
(`x-vercel-cache: MISS`), with no `noindex`. Each pillar hub links exactly its
four articles. Credits render with the licensor's own wording, linked to source.

## What it changed

The site went from **one live pillar to three**. Two pillar hubs that Google was
being told not to index are now indexable and in the sitemap, and ten new URLs
are crawlable.

## Retrospective

*Stage 9. First run under the rule — and the rule caught this entry itself. See
finding 1.*

### 1. What did we learn that is not already written down?

**Stage 9's gate names one log, and this workflow writes two.** The gate reads
*"the work-done entry carries a `## Retrospective` section."* This workflow
produces a site-repo build log **and** a docs-repo company entry. The
retrospective was written in full into the site-repo log
(`docs/work-done/2026-08-25-publish-p1-and-p6.md`, line 366) and this entry — the
one the CEO reads — got a one-line pointer to it instead. Both files existed,
the work was done, and the gate still failed, because the section was not where
the reader looks. **A gate that names an artifact ambiguously is not a gate.**

**`--revalidate-url` does not clear the cache that actually serves readers.** The
script reports *"Content caches dropped — the article is visible on the site
now."* True of the Next data cache inside the origin; false of the Vercel edge in
front of it. 457 seconds after the last write — past the 300s edge TTL —
`/artikel/nikah-undang-undang` returned `x-vercel-cache: STALE`, `age: 717`,
`<meta name="robots" content="noindex, follow"/>`. Waiting is not sufficient: the
first request past the TTL is the one that triggers the refresh and is served the
old copy while doing it. The second request, 17 seconds later, was correct.

**The three traps the brief warned about resolved as one real, two phantom** —
and the cost of the phantoms was not zero:

| Trap | What actually happened |
|---|---|
| Path convention mismatch (`images/…` vs `./images/…`) | **Phantom.** `grep` found no `./` in any of the eight files; all 18 image refs resolved on disk. `resolve()` treats both spellings identically, so the difference was pure review cost. Settled as *relative to the article file, no `./` prefix*. No path edited. |
| Cross-link ordering | **Phantom.** The eight do **not** cross-link to each other. All seven link targets were already published. Extracting links with the parser's own `bodyInternalLinks` regex and resolving each slug against production took two minutes and replaced an elaborate ordering exercise with a list. |
| `content` double-encoded as jsonb `string` | **Real, and already fixed** by commit `12182d6` before this run. Verified twice before writing: census returned 36 rows all `object`, zero `string`. Post-run: 44 rows, all `object`. No bad rows written. |

The lesson is not "the brief was wrong." It is that **a brief's warnings are
hypotheses, and each one is cheaper to test than to design around.** Two minutes
of `grep` retired two of three.

**Two smaller ones.** Publishing takes two keys — `status: published` in the file
*and* `--publish` on the command; neither alone does anything and the failure is
silent, an inserted draft. And `media.original_article_id` is
`ON DELETE SET NULL`, not cascade, so an undo that deletes articles first strands
its media rows permanently.

### 2. Which document must change, and who owns the edit?

| File | Edit | Owner | Status |
|---|---|---|---|
| `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md` (docs repo) | **Stage 9 gate** rewritten to name the docs-repo company entry as the canonical carrier of `## Retrospective`, with the site-repo log optional; **Stage 1** now requires every brief to quote the Stage 9 gate verbatim in its "When done" section | BMAD, this run | **Edited** |
| `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md` — Stage 7 | The exact command, the two-key publish rule, `--revalidate-url`, the five-minute wait, the never-baseline-the-proof-URL rule, the undo requirement and its `SET NULL` trap, link-driven ingest order, image path convention | BMAD, this run | **Edited** (earlier in run) |
| `src/lib/cache/purge.ts` (site repo) | New closing section: the Vercel edge is a second cache `revalidateTag` cannot reach, with today's measured numbers | BMAD, this run | **Edited** (earlier in run) |
| `src/lib/inspire/article-file.ts` (site repo) | `imageSchema.file` comment states the one path spelling and why it is convention, not validation | BMAD, this run | **Edited** (earlier in run) |

### 3. What did we do twice that we should never do again?

**Baselined the URL whose after-state is the deliverable.** The 24 Aug log
records it plainly: *"The edge handed back the copy my own baseline request had
caused it to store, and never asked the origin."* Today the same request was
taken again at 10:09:49Z, for the same good reason — to have a before-number —
and it poisoned the proof again in exactly the same way, down to the `noindex`
meta tag. The eight article URLs are the control: never requested before
publishing, every one `MISS` and correct on the first request. **The before-state
can be had from the database and the sitemap, neither of which is edge-cached
per-URL.** Now written into Stage 7.

**Wrote the retrospective in the wrong file, twice over.** Not a repeat within
this run, but the same shape as the failure Stage 9 was created to fix: learning
recorded somewhere real, in a place the organisation does not read. On 23–24 Aug
it was the CEO persona and a changelog. Today it was the site-repo build log.
Fixed at the gate, not by trying harder.

Also, more cheaply: re-derived how to run ingest by reading
`scripts/ingest-article.mts` end to end. The flags were in a work-done log and in
code comments, nowhere in the workflow anyone follows. Stage 7 now carries the
command.

### 4. What did we nearly ship that we caught?

**A false failure report.** The pillar-page proof request returned `200` with
`noindex` still present. Reported as-is, that reads *"the publish did not work"* —
and the plausible next move is re-running ingest with `--update` against
production, or executing the undo. Both are destructive responses to a publish
that had already succeeded, against a database with `pitr_enabled=false` and zero
platform backups.

**What caught it:** recording `x-vercel-cache` and `age` on every proof request.
`age: 717` on a 457-second-old write is arithmetically impossible for a fresh
render, which identified the response as our own baseline echo rather than the
origin's answer. That habit came from
`docs/work-done/2026-08-24-production-proof-and-branch-filter.md`, which recorded
the same headers for the same reason a day earlier. **Keep the mechanism:** a
status code alone cannot tell you whether you are looking at your own echo.

**Second near-miss:** the ordering exercise the brief implied. Taken on trust, it
would have produced a dependency graph for a dependency that does not exist —
and, worse, an ingest order defended as load-bearing when nothing was bearing on
it.

## Follow-ups

- **Stage 8 measurement** — `head-of-seo-content` checks all eight at 14 and 45
  days: **8 Sep** and **9 Oct 2026**.
- **All eight sit at `review_status: pending_review`** in the owner's queue, as
  every ingested article does. Live and awaiting review are not exclusive.
- **Ingest-time edge purge is still not built.** Every publish carries a window
  of up to 300 seconds where readers get the pre-write page. Documented with
  measurements in `src/lib/cache/purge.ts` in the site repo.
- **Retrospective (Stage 9) is in the site-repo log**, with the three documents
  it named already edited.
