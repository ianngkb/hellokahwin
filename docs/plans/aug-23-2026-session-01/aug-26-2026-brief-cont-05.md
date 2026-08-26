# Brief - Sprint 02 - CONT-05: C2.2 Hantaran tunang — complete the cluster (5 articles)

**Status:** APPROVED - executing.
**Repo:** a DOCS worktree (path given at dispatch)
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

Highest-volume INCOMPLETE Tier 1 cluster at ~7,000/mo, and we hold 1 of 6 mapped topics. The plan's own rule is finish Tier 1 before opening others. SERP is weak: 4,700 head at KD 0, flat all year, one editorial incumbent, six of nine slots social. DEPENDENCY: the seed article is STRANDED in hiasan-dekorasi, so SEO-06 must land before or with this or we write into a cluster whose pillar still says 'akan datang tidak lama lagi'.

## Definition of done (verbatim - the bar, and it is NOT narrowed)

Topics 2-6: what goes on his trays at an engagement with prices; the same for hers; how many trays and who decides; a simple engagement hantaran done well at a stated budget; which items are kept, returned or carried to the wedding. Cluster verified complete at 6/6, cross-linked, pillar showing them as real entries rather than a coming-soon state.

**A DoD is never rewritten after the sprint starts.** If this turns out
bigger than its DoD assumed, it stays open, is parked with a reason, or
carries forward. Rewriting it to fit what was achieved is the one thing that
makes velocity a lie.

## Standing rules - content

- **DONE MEANS SHIPPED**: ingested to PRODUCTION, 200 on FIRST request, visible on
  its pillar page. A draft is not shipped.
- **THE COVER RULE CHANGED TODAY.** The "photograph of people" requirement is
  RETIRED — it is what put anonymous guests on articles about trays. Rule 7 is a
  QUALITY bar: source **>= 2464x2400** so it is never upscaled; best licence pool
  available; sharp subject separated from its background with deliberate light;
  contrast that survives a 320px phone card; and it must **stand out beside its
  neighbours** in the pillar grid. Correct-but-mediocre ships ONLY with a written
  note naming the weakness. Nothing good enough → `cover: ESCALATE`, never a
  generic wedding photo. Full text in the workflow, Stage 6b.
- **NO TEXT CARDS**, absolute. **NO IMEJ MARKERS** — a leftover placeholder is a
  FORMAT ERROR, not a style note.
- Every image carries `credit`, `creditUrl`, `licensorName`, `licenseClass` and an
  asset-register entry.
- `internalLinks` takes **article slugs only** — a hub slug refuses the whole file.
- **Record a precise undo before any production write, and COMMIT it.**
- `--revalidate-url` mandatory. `pnpm --silent`, never `pnpm run`.
- Every article passes the Editorial Review Board before it ships.

## Your blocker cleared an hour ago

SEO-06 shipped: `hantaran-tunang` is now filed under `/artikel/hantaran-mas-kahwin/`
and the pillar lists it as a real entry rather than "akan datang tidak lama lagi".
**Read it before writing** — you are completing its cluster, and the five new
articles must cross-link with it rather than repeat it.

C2.2 is **1 of 6**. You are writing topics 2-6.

## You are in your own worktree

Two other writers are working the docs repo concurrently (CONT-06, CONT-08). Do not
`git checkout` outside your worktree. The asset register is shared — **append,
never rewrite it wholesale.**

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
