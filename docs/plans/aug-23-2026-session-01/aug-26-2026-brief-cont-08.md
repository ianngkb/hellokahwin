# Brief - Sprint 02 - CONT-08: C2.5 Nisbah, duit hantaran & etika — open and complete the cluster (8 articles)

**Status:** APPROVED - executing. Sprint 02 is in progress.
**Repo:** a DOCS worktree (path given at dispatch)
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

~2,900/mo and 0 of 8 done — the only Tier 1 cluster with nothing published. Lowest volume of the five, but the plan calls it impossible to copy from outside the culture and the best organic result on page one earns 152 visits. Assigned to the adat seat because the cluster is ratio, entitlement and etiquette rather than products and prices.

## Definition of done (verbatim - this is the bar, and it is NOT narrowed)

The dulang ratio and where the custom came from; what 5 balas 7 means across the twelve trays; what 3 balas 5 means at an engagement; whether the ratio must be odd and what happens when a family insists otherwise; what duit hantaran is, how it differs from mas kahwin and who is entitled to it; plus the remaining three mapped topics READ FROM THE CLUSTER PLAN rather than invented. EVERY claim about entitlement or religious ruling carries its authority and the date checked — this is the highest factual risk in Tier 1 and the review board blocked a fabricated quotation on similar material in August. Cluster verified at 8/8.

**A definition of done is never rewritten after the sprint starts.** If this
turns out bigger than its DoD assumed, it stays open, or it is parked with a
reason, or it carries forward. Rewriting the DoD to fit what was achieved is
the one thing that makes velocity a lie.

## Standing rules - content (these bind every article)

- **DONE MEANS SHIPPED.** Ingested to PRODUCTION, 200 on FIRST request, visible on
  its pillar page. A draft is not shipped. In August, CONT-02 was marked done with
  69 images sitting in draft front matter that no reader ever saw.
- **THE COVER RULE CHANGED TODAY - read it before you specify any cover.** The
  "photograph of people" rule is RETIRED (owner, 26 Aug). Covers are no longer
  required to contain a human. What replaces it is Rule 7, a quality bar:
  source **>= 2464x2400** so it is never upscaled; best licence pool available;
  sharp subject separated from its background with deliberate light; contrast that
  survives a 320px phone card; and it must **stand out beside its neighbours** in
  the pillar grid. Correct-but-mediocre ships ONLY with a written note naming the
  weakness. Nothing licensable and good enough leads to `cover: ESCALATE`, never a
  generic wedding photo. Full text in the workflow, Stage 6b.
- **NO TEXT CARDS.** Owner directive, absolute, cover or in-article.
- **Every image carries `credit`, `creditUrl`, `licensorName`, `licenseClass`**
  and an asset-register entry. An uncredited image is worse than a missing one.
- **NO IMEJ MARKERS.** A leftover placeholder marker is a FORMAT ERROR, malformed
  the same way a missing `pillar:` is malformed - not a style preference.
- `internalLinks` takes **article slugs only**. A pillar or hub slug there refuses
  the whole file; link hubs from body prose. This blocked a publish day in August.
- One path spelling: `images/S-name.jpg`, no `./` prefix.
- **Record a precise undo before any production write, and COMMIT it.** Sprint 01's
  undo scripts sat untracked on one laptop for two days.
- `--revalidate-url` mandatory on ingest. `pnpm --silent`, never `pnpm run`.
- Every article passes the Editorial Review Board before it ships.

## THIS CLUSTER IS THE HIGHEST FACTUAL RISK IN TIER 1

C2.5 is entirely ratio, entitlement and etiquette - **who is owed what**. In August
the review board blocked a **fabricated quotation** on similar material: a newspaper
lede and indirect speech stitched together with an ellipsis and printed as a direct
quote. It also killed a non-existent RM45 fee that had come out of our own
"verified" table.

**Every claim about entitlement or religious ruling carries its authority and the
date checked.** Where authorities differ by state or mazhab, say so rather than
picking one. Where no authority fixes a number, record that as the finding - six of
fourteen jurisdictions fix no minimum mas kahwin at all, and that fact was a
competitive weapon, not a gap.

**Read the three remaining mapped topics from the cluster plan** -
`aug-23-2026-clusters-launch-plan.md`, section C2.5 - rather than inventing them.

## You are in your own worktree

Another writer is working the docs repo concurrently. Do not `git checkout` outside
your worktree, and expect the asset register to be touched by both of you - append,
never rewrite it wholesale.

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
