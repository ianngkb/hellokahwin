# Brief - Sprint 02 - CONT-07: C2.1 Hantaran kahwin — complete the cluster (7 articles)

**Status:** APPROVED - executing.
**Repo:** `C:/Users/Ian Ng/orca/workspaces/hkdocs-cont08` - REUSE this worktree.
CONT-08 finished in it and pushed; **pull first**, then cut your own branch.
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.**

## Why (verbatim from the tracker)

~5,900/mo, 1 of 8 done. Half of page one is Pinterest, Shopee and Facebook — not editorial content. The incumbent worth naming is songketdunia.my at DR 3 with 823 organic keywords, a shop blog rather than a publication. DEPENDENCY: the seed article is STRANDED in hiasan-dekorasi — SEO-06 first. CAPACITY FLAG: this plus CONT-05 and CONT-06 puts 17 of the sprint's 25 articles on one seat.

## Definition of done (verbatim - the bar, NOT narrowed)

Topics 2-8: groom's trays by category with real price bands; the same for the bride's; a complete hantaran under a stated budget without looking cheap; what people actually give and what gets quietly discarded; how hantaran differs by state and family tradition and how to handle two families who disagree; what to prepare and how far ahead at eight weeks out; where to buy, commission or rent and what each route costs. Cluster verified at 8/8.

**A DoD is never rewritten after the sprint starts.** If this turns out bigger
than its DoD assumed, it stays open, is parked with a reason, or carries forward.

## Your blocker cleared

SEO-06 shipped: `hantaran-kahwin` is now filed under
`/artikel/hantaran-mas-kahwin/` and the pillar lists it as a real entry.
**Read it before writing** - you are completing its cluster, and the seven new
articles must cross-link with it rather than repeat it.

C2.1 is **1 of 8**. You are writing topics 2-8.

## The bar CONT-08 just set in this same worktree - match it

CONT-08 opened and completed C2.5 tonight: 8 articles, all 200 on first request,
every cover credited, zero text cards, zero IMEJ markers, 8 new register rows,
and **the undo committed BEFORE the first write** (site repo `0098727`) with a
dry run proving it. Its work-done log carries a real Stage 9 retrospective that
named two documents and edited both. Read
`docs/work-done/aug-23-2026-session-01/aug-26-2026-done-cont-08-c25-nisbah.md`
before you start - it is the shape of a finished item here.

## Standing rules - content

- **DONE MEANS SHIPPED**: ingested to PRODUCTION, 200 on FIRST request, visible
  on its pillar page. A draft is not shipped.
- **THE COVER RULE CHANGED**: the "photograph of people" requirement is RETIRED -
  it is what put anonymous guests on articles about trays. Rule 7 is a QUALITY
  bar: source **>= 2464x2400** so it is never upscaled; best licence pool
  available; sharp subject separated from its background with deliberate light;
  contrast that survives a 320px phone card; and it must **stand out beside its
  neighbours** in the pillar grid. Correct-but-mediocre ships ONLY with a written
  note naming the weakness. Nothing good enough -> `cover: ESCALATE`, never a
  generic wedding photo. Full text in the workflow, Stage 6b.
- **NO TEXT CARDS**, absolute. **NO IMEJ MARKERS** - a leftover placeholder is a
  FORMAT ERROR, not a style note.
- Every image carries `credit`, `creditUrl`, `licensorName`, `licenseClass` and
  an asset-register entry. **Append to the register, never rewrite it wholesale**
  - other writers are appending concurrently.
- `internalLinks` takes **article slugs only** - a hub slug refuses the whole file.
- **Record a precise undo before any production write, and COMMIT it FIRST.**
- `--revalidate-url` mandatory. `pnpm --silent`, never `pnpm run`.
- Every article passes the Editorial Review Board before it ships.

## Live state, CEO-verified - do not re-derive

RISK-04 shipped, so publishing now tells Google: the sitemap resubmits on ingest
and four articles that were "unknown to Google" left that state within eight
hours. RISK-06 shipped: the 365-day stale window is capped at 3000s. The Hantaran
pillar now carries 21 articles and has **zero** "akan datang" empty states.

## Shipping checks that avoid a false negative

- **Verify by CONTENT on the default branch, never ancestry.**
  `git merge-base --is-ancestor` returns false forever for a squash-merged branch.
- **Enumerate working trees** with `git worktree list` / `orca worktree list`.
  Seven other agents are live right now; stay inside your own.

## Report format

**CLAIM + EVIDENCE + LIVE LINK** per article, not a summary. Quote literal
command output.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** - Stage 9, mandatory.
What did we learn that is not written down; **which document must change and who
owns the edit (name the file)**; what did we do twice; what did we nearly ship
and what caught it. **Then make the edit.**
