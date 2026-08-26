# Brief - Sprint 02 - UX-01: Mobile article pages delete the site header — restore it

**Status:** APPROVED - executing.
**Repo:** the SITE worktree - C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

`[slug]/page.tsx:796` sets `data-hide-mobile-nav`; `globals.css:934-939` then hides `header:first-child` below 767px. Someone arriving from Google onto an article on their phone — 34 of the site's 43 monthly clicks — gets no logo, no brand, no navigation, no search. The only escapes are a back arrow to the category page (which on venue-perancangan lands on 'akan datang tidak lama lagi') and a footer up to 10,638px below. On mobile this is a one-page site. Written for vendor-detail surfaces, applied to the pages that receive all the search traffic.

## Definition of done (verbatim - the bar, and it is NOT narrowed)

At 390px an article renders the site header with brand and navigation — screenshot it. `header nav a` computes min-height >= 44px (it measures 33px today; the design system already meets 44 elsewhere). The bottom bar offers something other than a photo gallery, with the choice justified. Mobile cover no taller than aspect-[3/2] with the first paragraph above the fold. Every claim proved from the RENDERED page at 390px, not from source.

**A DoD is never rewritten after the sprint starts.** If this turns out
bigger than its DoD assumed, it stays open, is parked with a reason, or
carries forward. Rewriting it to fit what was achieved is the one thing that
makes velocity a lie.

## This is the highest-traffic defect in the sprint

**34 of the site's 43 monthly clicks land on an article page, on a phone.** Every
one of them arrives with no header, no brand, no navigation and no search. The only
escapes are a back arrow to the category page and a footer up to 10,638px below.

**Do NOT touch `page.tsx` (homepage), `navbar.tsx` or `pillar-body.tsx`.** UX-03
owns those and may run concurrently. You own the article route, `globals.css`'s
mobile-nav block, `article-cover-mobile.tsx`, `mobile-photo-bar.tsx` and
`inspire-nav-menu.tsx`. If you need to edit outside that set, say so rather than
racing.

**Prove it at 390px from the RENDERED page**, not from source. The CEO could not
resize the browser below 1920px in its environment; if you hit the same wall, say
so and prove it another way (deployed CSS, computed values) rather than claiming a
screenshot you did not take.

## Live state you can rely on — all verified by the CEO today, 26 Aug

- **RISK-06 shipped.** `stale-while-revalidate` is capped at 3000s, down from
  31535400 (365 days). Pages are no longer served from a year-old cache.
- **RISK-04 shipped.** Ingest now resubmits the sitemap to GSC. Google re-fetched
  it (73 to 78 URLs) and **all four articles that were "unknown to Google" this
  morning have left that state within eight hours** — two are already indexed with
  breadcrumbs. A page you publish today reaches Google quickly.
- **SEO-06 shipped.** `hantaran-kahwin` and `hantaran-tunang` are re-filed under
  `/artikel/hantaran-mas-kahwin/`. Old URLs 308 in one hop; new URLs 200. The
  pillar's empty states dropped from 3 to 1.
- **CONT-09 shipped.** 19 covers re-selected; the cover standard is live in the
  workflow and in every editorial persona.
- **PLAT-05 shipped.** The document store is merged to `main`; `/docs` exists on
  buddy with search across both repos.
- **PLAT-07 shipped.** `sprint retro N` reads back, `sprint get` prints `why`,
  `--backlog` works as a bare flag, `status-board.py` is project-scoped and puts
  the handle on the same line as its state.

## What SHIPPED means for this item, and how it is checked

**Committed is not shipped.** Three Sprint 01 items were marked done while sitting
on an unmerged branch, and the owner found all three by asking.

- **Verify by CONTENT on the default branch, never by ancestry.**
  `git merge-base --is-ancestor <branch> origin/main` **returns false forever for
  a squash-merged branch** — squashing makes a new commit and the branch tip never
  becomes an ancestor. The CEO hit this today and briefly reported shipped work as
  unshipped. Use `git cat-file -e origin/main:<a file your work added>` instead.
- **THERE ARE MORE WORKING TREES THAN YOU THINK.** Enumerate them with
  `git worktree list` and `orca worktree list` rather than from memory. On 26 Aug
  a sprint was closed on "both repos clean" having checked two of three.
- **Leave the checkout on the branch you were given.** Another agent shares some of
  these trees; a `git checkout` relocates their HEAD silently. This happened today.
- **On an auth-gated app a status code proves nothing.** `/sprints`, `/docs` and
  `/definitely-not-a-real-route` all return the same redirect. Quote content only
  the real page contains, plus a negative control — or say plainly that you cannot
  verify from outside and hand over a URL.

## Report format

**CLAIM + EVIDENCE + LIVE LINK**, per item, not a summary. Quote literal command
output. If something cannot be verified from outside, say so and name what would
verify it — never dress an inference up as a measurement.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
What did we learn that is not written down; **which document must change and who
owns the edit (name the file)**; what did we do twice; what did we nearly ship and
what caught it. **Then make the edit.**
