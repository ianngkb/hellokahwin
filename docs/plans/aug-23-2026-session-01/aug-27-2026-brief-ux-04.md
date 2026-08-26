# Brief - Sprint 02 - UX-04: Cards go grey because they lazy-load with no placeholder — LQIP and a JS audit

**Status:** APPROVED - executing.
**Repo:** a NEW site worktree (path given at dispatch)
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

The CEO reported a broken card-image variant. WRONG, disproved by measurement: every homepage image resolves at naturalWidth 1600. Cards 3-12 are loading=lazy over a bg-muted plate with no blur placeholder, so until the WebP decodes the card IS a grey box. Measured FCP 3,040ms with a warm cache on a fast connection: TTFB 22ms, HTML 147KB, CSS 135KB, and 542KB of JavaScript across 14 files for a page of static prose.

## Definition of done (verbatim - the bar, NOT narrowed)

Cards and covers render a base64 LQIP via placeholder=blur — no flat grey plate at any point during load. FCP re-measured under the same conditions against the 3,040ms baseline. JS payload enumerated per file with keep/defer/drop decided for each; if it cannot be reduced, the blocking dependency is named.

**A DoD is never rewritten after the sprint starts.** If this turns out
bigger than its DoD assumed, it stays open, is parked with a reason, or
carries forward.

## Measure before and after, on the same conditions

The baseline is **FCP 3,040ms** on an article, warm cache, fast connection:
TTFB 22ms, HTML 147KB, CSS 135KB, and **542KB of JavaScript across 14 files**
for a page of static prose.

The grey card is a lazy-load with **no blur placeholder** over a `bg-muted`
plate — `page.tsx:211` sets `priority` for the first two cards only, so cards
3–12 decode visibly. **It is NOT a broken image variant**; every homepage image
resolves at `naturalWidth: 1600`. The CEO reported it as a broken variant and
was wrong. Do not go looking for a crop-engine bug.

For the JS audit: **enumerate per file with a keep / defer / drop decision for
each.** If the payload cannot be reduced, name the blocking dependency rather
than leaving it open.

**You own image loading and the JS payload.** UX-02 owns `article-renderer.tsx`;
UX-03 owns the homepage layout, nav and `pillar-body.tsx`. You will both be in
`page.tsx` — UX-03 is deleting the nav rail at lines 161-177 and changing the
hero preset at 122; you are changing `priority`/`placeholder` at ~211.
**Coordinate: rebase onto their merge rather than racing, and say so.**

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
