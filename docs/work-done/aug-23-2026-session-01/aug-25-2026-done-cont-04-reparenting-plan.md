# Done: CONT-04, the legacy re-parenting plan

**Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-cont-04-reparenting-plan.md`
**Date:** 25 Ogos 2026 · **Target:** document only, no production writes
**Sprint:** 01 · CONT-04 · 2 points · head-of-seo-content

## Where the document IS

`C:\Users\Ian Ng\Documents\Code\hellokahwin\hellokahwin\docs\plans\aug-23-2026-session-01\aug-25-2026-plan-cont-04-legacy-reparenting.md`

Repo-relative: `docs/plans/aug-23-2026-session-01/aug-25-2026-plan-cont-04-legacy-reparenting.md`
Branch `feat/command-centre-dashboard`, uncommitted at time of writing.

**Nothing was executed.** No category changed, no row written, no route edited,
no file touched in the site repo. The only database access was one read-only
`SELECT` against `redirects`. There is no UNDO record because there is nothing
to undo.

---

## Outcome

The recommendation is conditional, and it splits the batch the brief treated as
one unit.

- **Move eleven of the thirteen now.** They carry 3 clicks and 38 impressions
  between them over 28 days. Nothing to protect.
- **Hold `dewan-kahwin`** until a defined trigger. It carries 26 of the site's
  35 clicks and 941 of its 2,138 impressions.
- **Drop `garden-wedding` from the batch entirely.** English page, English
  queries, position 36.5. It needs an editorial decision, not a re-parent.

Two findings reframed the item, and both contradict the brief's premise.

**There is no redirect map. Zero redirects are needed.** The article route
resolves by slug alone and self-heals to the canonical category
(`artikel/[category]/[slug]/page.tsx:545`); the legacy root-slug route
recomputes the canonical path per request. Proved live against
`mas-kahwin-ikut-negeri`, which has already made this move: even
`/artikel/real-wedding/mas-kahwin-ikut-negeri`, a category that never held it,
308s to the canonical URL. The `redirects` table holds **0 rows**, so no chain
is possible.

**The real cost is index churn on one page**, not redirect risk. Re-parenting
during the unfinished 21 Aug consolidation gives an article a third URL. GSC
shows `mas-kahwin-ikut-negeri` accumulating impressions on all three of its
addresses, including 5 on the intermediate path we had already abandoned.

## Measured exposure (GSC, `dataState=final`, queried 2026-08-25)

Final data ends **2026-08-23**; GSC runs two days behind.

| | 28d clicks | 28d impressions |
|---|---|---|
| The thirteen (union of old and new URLs) | 33 | 1,769 |
| `dewan-kahwin` alone | 26 | 941 |
| `garden-wedding` alone | 4 | 790 |
| The other eleven, combined | 3 | 38 |
| Site total | 35 | 2,138 |

Three of the thirteen returned **no rows at all** on either URL form. Their
exposure is unmeasured rather than small, and that is stated as such in the
plan rather than estimated.

The CEO's `/dewan-kahwin/` figure was verified: brief said 132 impressions, pos
9.4, five of eight clicks; measured 21 to 23 Aug gives 138 impressions, pos 9.4,
5 of the site's 8 clicks. Position and clicks match exactly.

## Trigger condition

Four measurable conditions, all of which must hold before `dewan-kahwin` moves.
Current readings in brackets.

- T1: new `/artikel/…` URLs take ≥80% of site impressions for 7 consecutive
  days [30.2%, on the single day of data that exists]
- T2: `/artikel/idea-dan-nasihat/dewan-kahwin` takes ≥80% of that article's
  union impressions [7 of 145, 4.8%]
- T3: `dewan-kahwin` union position no worse than 9.4 [9.4, holding]
- T4: GSC Pages report classifies the legacy root URLs as *Page with redirect*
  [not yet checked]

First assessment date **2026-09-06**, the earliest date a 7-day consolidated
window can exist. Likely move mid to late September, flagged in the plan as a
general expectation rather than a measurement of our site.

## Side finding handed to engineering

`admin/inspire/[article-id]/edit/actions.ts:302` gates redirect-row creation on
`current.slug !== newSlug`, so a category-only change writes no row, even though
the pure function behind it (`buildArticleSlugRedirect`) handles that case and
has a passing unit test for it. Harmless today because the route self-heals, and
here it is actively useful, since it is why a re-parent cannot create a chain.
It becomes a trap only if someone removes the self-heal believing the table
covers it. Not a CONT-04 action; recorded for a comment.

## Compliance

- `/humanizer` run on the full document. Zero em or en dashes, zero curly
  quotes, bold mini-headings and dramatic fragments removed. One factual error
  was caught in that pass and fixed: the UNDO step said "thirteen integers"
  where Wave 1 is eleven.
- Every figure carries its source and the date checked. No number is estimated
  or fabricated; unmeasurable exposure is labelled unmeasurable.
- No image work in this item, so the credit rule does not apply.

---

## Retrospective

### What the item got wrong before it started

The brief was built on a premise that was false, and the premise came from the
CEO record rather than from the brief's author. CONT-04 was scoped, pointed and
dispatched as "a migration with thirteen redirects". There are no redirects. The
route layer has self-healed category changes since it was written, and the
`redirects` table has never held a row.

Two points of sprint capacity were allocated to designing a redirect map that
could not exist. The cost this time was small because the item was plan-only.
The same false premise on an execution item would have produced thirteen
unnecessary redirect rows, and by this plan's own reasoning those rows are the
one mechanism that could manufacture the redirect chain everybody was trying to
avoid. The wrong belief would have caused the exact harm it was meant to
prevent.

The second thing worth recording is that the answer took one HTTP request to
find. `mas-kahwin-ikut-negeri` had already made the move, and a single `curl`
against its old URL settled the question. It was reachable before the item was
written, before it was pointed, and before it was dispatched.

### The lesson

A claim about how the live site behaves is checkable against the live site.
When one of those enters the CEO record, it becomes the basis for scoping
decisions across every future item, and nothing in the process re-tests it.
Route behaviour was inferred from URL structure. The inference was reasonable
and it was wrong.

### The file that must change

`docs/boardroom/ceo-memory.md`. It is read at the start of every session and it
is where "changing an article's parent changes its URL, so re-parenting is a
migration with thirteen redirects" would have kept propagating. Two facts belong
in it: that re-parenting requires no redirects, and that GSC final data runs two
days behind, which silently shortened every window I queried today.

**Edited below.**
