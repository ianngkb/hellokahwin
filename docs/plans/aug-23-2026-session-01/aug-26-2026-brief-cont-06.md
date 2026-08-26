# Brief - Sprint 02 - CONT-06: C2.3 Gubahan & dulang hantaran — complete the cluster (5 articles)

**Status:** APPROVED - executing. Sprint 02 is in progress.
**Repo:** the DOCS repo - C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

~6,600/mo, 3 of 8 done — Sprint 01 shipped dulang-hantaran, gubahan-hantaran and sirih-junjung. Finishing what we started costs less than opening anything new, and a DR-0 shop page ranks second on this SERP with only one editorial article present.

## Definition of done (verbatim - this is the bar, and it is NOT narrowed)

Topics 3, 4, 6, 7, 8: which simple arrangement styles look expensive and which look homemade; arranging around a colour theme without buying twice; a chocolate or food hantaran that survives a hot afternoon; what hidden hantaran is and how it is done; what to commission versus make, with a realistic cost comparison. Cluster verified complete at 8/8, cross-linked, pillar shows all eight.

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

## Cluster context

C2.3 is **3 of 8 done** - Sprint 01 shipped `dulang-hantaran`, `gubahan-hantaran`
and `sirih-junjung`. You are finishing it, not opening it. Read those three before
writing so the five new ones cross-link properly and do not repeat them.

**No dependency blocks you.** RISK-04 shipped, so a published article now reaches
Google - verified today: four articles that were "unknown to Google" this morning
left that state within eight hours, two of them already indexed.

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
