# Brief - Sprint 02 - UX-03: The cheap cluster — hero crop, duplicate nav, hidden pillars, empty clusters, search

**Status:** APPROVED - executing.
**Repo:** C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/seo05-titles
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

Six small fixes the review measured and located. The homepage hero requests crop-4x3-article-card into a 1905x560 box, discarding 61% of the frame and upscaling 19%, when crop-4.3x1-desktop-hero already exists at near-exact ratio and pads above detected faces. Two nav bars exist because two different queries feed them. THERE ARE NINE PILLARS, NOT SIX — 850px is clipped off-screen with the scrollbar hidden, so three pillars are invisible. Empty clusters render above real content, and on venue-perancangan the empty one is the exact cluster matching our only real search demand. Search EXISTS and works but nothing in the masthead links to it. hk-chip borders compute 1.36:1 against WCAG's 3:1.

## Definition of done (verbatim - the bar, NOT narrowed)

Hero uses the desktop-hero preset — source and rendered dimensions before and after. Duplicate homepage rail deleted. Both scrollers show a right-edge affordance and all nine pillars reachable at 1400px — screenshot. Empty clusters sort below non-empty. Search reachable from the masthead on every page. hk-chip border contrast >= 3:1 with computed values shown.

**A DoD is never rewritten after the sprint starts.** If this turns out
bigger than its DoD assumed, it stays open, is parked with a reason, or
carries forward.

## Six small fixes, each already located for you

The measurements are done; you are implementing, not re-investigating.

1. **Hero crop.** `page.tsx:122` requests `crop-4x3-article-card` (1600×1200)
   into a 1905×560 box — 61% of the frame discarded, source upscaled 19%.
   `crop-4.3x1-desktop-hero` already exists at `smart-crop.ts:79` (2464×700,
   near-exact ratio) and pads 30% above detected faces. The article page already
   uses it. This is a one-line preset change.
2. **Two nav bars, two data sources.** `navbar.tsx:27` reads the admin nav table;
   `page.tsx:89` auto-derives from article counts and pulls in CHILD categories
   that were never pillars. Delete the homepage rail (`page.tsx:161-177`).
3. **There are NINE pillars, not six.** `scrollWidth 1986` vs `clientWidth 1136`
   — 850px is off-screen and `navbar.tsx:47` hides the scrollbar, so three
   pillars are invisible with no indication they exist. Add a right-edge
   affordance; consider `max-w-6xl` → `max-w-7xl`.
4. **Empty clusters render ABOVE real content** in `pillar-body.tsx:42-59`.
   **CHECK FIRST — CONT-06 and CONT-08 shipped 13 articles tonight and the
   Hantaran pillar's empty states are now ZERO.** Measure which pillars still
   have any before you change the sort.
5. **Search exists and works** (`inspire-article-search.tsx`, mounted on
   `/artikel`) — nothing in the masthead links to it. Placement, not a build.
6. **`hk-chip` borders compute 1.36:1** against WCAG 1.4.11's 3:1.
   `--border-strong` already measures 3.0:1.

**Do not touch `article-renderer.tsx`** — UX-02 owns it and is live now.
**Do not undo UX-01's mobile work**, which is already on master.

## Live state — CEO-verified tonight. Do not re-derive it, and do not regress it.

- **UX-01 SHIPPED and is on master.** `data-hide-mobile-nav` is gone from the
  article route; live articles render a `<header>` with real nav links. It also
  raised nav tap targets to 44px and cut the mobile cover so the first paragraph
  sits ~176px above the fold. **Do not undo any of that.**
- **RISK-06 shipped**: `stale-while-revalidate` capped at 3000s (was 365 days).
  Check it still reads 3000 after anything you merge.
- **RISK-04 shipped**: ingest resubmits the sitemap; four articles that were
  "unknown to Google" left that state within eight hours.
- **RISK-05 shipped**: an indexing monitor runs from master and its alarm has
  fired for real (issue #5).
- **SEO-06 shipped**: `hantaran-kahwin`/`hantaran-tunang` re-filed into P2.
- **CONT-06 and CONT-08 shipped 13 articles.** The Hantaran pillar went from 13
  to **26** articles tonight and its "akan datang tidak lama lagi" empty states
  are now **ZERO** — so anything you write about empty clusters must be measured,
  not assumed from an older reading.
- **CONT-09 shipped** the cover standard; **the people rule is RETIRED**, replaced
  by a quality bar (never upscaled, ≥2464×2400, sharp, high contrast, stands out
  in the grid).

**A NEW DEFECT was handed over by RISK-05 and is unowned:** six sitemap URLs are
served with `noindex`, and Google crawled and excluded all six. `src/app/sitemap.ts`.
If it falls inside your item, take it and say so. If not, leave it — do not
half-fix it.

## Shipping — the checks, and the two false negatives that have already bitten

**Committed is not shipped.** Tonight PLAT-06 was found finished but 6 commits
unpushed and 7 ahead of main; the CEO had to push, PR and merge it. Do not leave
your work on a branch and call it done.

- **Verify by CONTENT on the default branch, never ancestry.**
  `git merge-base --is-ancestor` returns false forever for a squash-merged
  branch. Use `git cat-file -e origin/master:<a file your work added>`.
- **Check for the RIGHT filename.** A PLAT-06 check reported "no backlinks
  migration" because it grepped for `backlink`; the file is `document_links.sql`.
  Checking the wrong name is not the same as the thing being absent.
- **Enumerate trees** with `git worktree list` and `orca worktree list`. Several
  agents are live in sibling worktrees of this repo right now.
- **Stay on the branch you were given**, and never `git checkout` a path in a
  tree another agent is using — one refused to do exactly that tonight and was
  right to.
- **On production, prove it from the RESPONSE BODY plus a negative control.** A
  status code proves nothing on an auth-gated app, and `/artikel/<nonsense>`
  returning 404 is what shows you are reading real routing.

## Report format

**CLAIM + EVIDENCE + LIVE LINK**, per item. Quote literal command output. If
something cannot be verified from outside, say so and name what would verify it.
Two agents tonight reported honestly that they could not reproduce a number the
CEO had given them — both were right and the CEO was wrong. Do that.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
What did we learn that is not written down; **which document must change and who
owns the edit (name the file)**; what did we do twice; what did we nearly ship
and what caught it. **Then make the edit.**
