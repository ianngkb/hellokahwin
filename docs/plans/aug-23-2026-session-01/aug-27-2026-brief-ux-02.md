# Brief - Sprint 02 - UX-02: Named halls are invisible to Google as entities — heading anchors, TOC, ItemList

**Status:** APPROVED - executing.
**Repo:** C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/risk05-indexing-monitor
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

The highest-expected-value finding on the site. Our best page is a listicle with 11 h2s naming specific halls, and the rendered DOM has ZERO id attributes on any heading, zero in-page anchors, no TOC, no table, and JSON-LD carrying only Article + BreadcrumbList. `article-renderer.tsx` has no slugify logic at all, so this is true of every article. Someone searches one hall by name; Google has no entity to match and shows a generic listicle title. The cheap 60% of what SEO-04 completes.

## Definition of done (verbatim - the bar, NOT narrowed)

Every h2/h3 carries a deterministic slugified id — quote three from live HTML. Articles with >=4 h2s render a TOC with working anchors. Listicle-shaped articles emit ItemList and Place JSON-LD, validated against a schema validator with the validator's output shown. Applied by the renderer, not per-article. Baseline recorded for dewan komuniti setiawangsa (104 impressions, position 9.0, zero clicks over 28 days).

**A DoD is never rewritten after the sprint starts.** If this turns out
bigger than its DoD assumed, it stays open, is parked with a reason, or
carries forward.

## This is the highest-expected-value item left in the sprint

Our best page names ten halls across eleven `<h2>`s and **not one carries an
`id`**. No anchors, no table of contents, no `ItemList` schema — and
`article-renderer.tsx` has no slugify logic at all, so it is true of EVERY
article on the site.

**You own `article-renderer.tsx` and the JSON-LD.** UX-03 owns the homepage, the
nav and `pillar-body.tsx`; UX-04 owns image loading and the JS payload. Do not
edit theirs.

**Validate the schema with a real validator and show its output** — a JSON-LD
block that looks right and fails validation is worse than none, because it
silently stops being eligible for rich results.

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
