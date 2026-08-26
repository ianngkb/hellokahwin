# Board meeting — 2026-08-26 — Sprint 02 planning

**Trigger:** owner-called, immediately after `/endsprint` closed Sprint 01.

**Data reviewed:** GSC 19–25 Aug (performance by date, page and query), 11 live URL
inspections, the live sitemap, the sprint tracker, `decision-log.md`, the 24 Aug
minutes. Live visual review of the homepage, a category page and an article page.

**Unreachable / not pulled:** Ahrefs was not queried this session. `run-stats.py`
has no sprint data — it keys off `/buildit`'s ship-log, which a sprint does not
write (carried as PLAT-07's neighbour, unresolved).

## Discussion summary

The meeting opened on a performance snapshot that looked flat — 2.14 clicks/day
against a prior read of 2.67, impressions up to 101.9/day — and became something
else once the page and query breakdown was examined.

**Sprint 01's crawl work landed.** The SEO-01 baseline was 8 of 28 indexed with 19
discovered-never-crawled. Six of those formerly-uncrawled articles were inspected
and all six now report "Submitted and indexed", crawled 23–26 Aug. Six is a
sample, not a census, but against that baseline it is not noise. Removing 79
`nofollow` links and adding 68 real ones did what SEO-02 predicted.

**And then the sprint published five articles Google has never heard of.**
`sirih-junjung`, `dulang-hantaran`, `gubahan-hantaran` and `walimatul-urus` all
report "URL is unknown to Google", last crawled Never. All four are in the live
sitemap, which holds 78 URLs. Google last fetched that sitemap at 73 URLs on
25 Aug at 15:58 — before they existed. Nothing tells Google we publish; the
ingest CLI purges our own caches and stops.

The round table (Winston, the Head of SEO, Murat, the Managing Editor) converged
on closing that hole first, and split on what else matters. The Managing Editor
argued for writing nothing until it closed. Winston called that the right
instinct and the wrong conclusion — it is a small fix, close it and keep writing.
Murat's contribution changed the shape of the sprint: the CEO found this by hand,
today, because it happened to run a URL inspection. **A baseline taken once is a
photograph; what was missing is a monitor.** That became RISK-05.

The Head of SEO pressed the point the CEO would otherwise have underweighted.
Indexing was never the business problem — it was the prerequisite. `dewan
komuniti setiawangsa` is indexed, crawled, ranks 8.8, carries 34 impressions and
earns zero clicks. So does `dewan keramat` at position **4.5**. The query list is
dominated by named halls, and we answer them with a generic listicle. Eleven of
the week's fifteen clicks still go to one legacy WordPress URL, while the new path
for the same content sits at a better position earning nothing.

The CEO proposed the Indexing API as part of RISK-04 and **withdrew it during the
meeting**: Google restricts it to `JobPosting` and `BroadcastEvent`, so using it
for articles is a policy violation rather than a shortcut. The sanctioned
mechanism is sitemap resubmission with accurate `lastmod`.

The owner set scope at the full proposal and directed that venue pages and cluster
articles run **together**, modifying the 23 Aug cluster plan. Two items were added
mid-meeting at the owner's request: the buddy sidebar (PLAT-09) and a UI/UX review
of the homepage, category and article pages, which was commissioned during the
meeting and reports after it.

## Decisions

| # | Decision | Basis (data/source) | Approved by |
|---|---|---|---|
| 62 | **Sprint 02 opened at 35 points, 10 items** — "Close the publishing hole, then earn a click" | Tracker; velocity computed, not typed | Owner |
| 63 | **RISK-04 is the gate: publishing must tell Google.** Every content point is worthless until it closes | 4 URL inspections returning "unknown to Google"; sitemap fetched at 73 URLs before the articles existed | CEO, owner-endorsed |
| 64 | **The Indexing API is NOT used.** Restricted to JobPosting/BroadcastEvent; using it for articles is a policy violation. CEO proposed it and withdrew it in-meeting | Google's own API documentation | CEO |
| 65 | **RISK-05 — an indexing monitor, not another baseline.** Murat: the CEO found five dark articles by hand | SEO-01 was a one-off; nothing would have caught this | CEO |
| 66 | **Sprint 01's crawl work is confirmed landed** — 6 of 6 formerly-uncrawled articles now indexed, against an 8-of-28 baseline. Stated as a sample, not a census | GSC batch inspection, 26 Aug | CEO |
| 67 | **The venue page type (SEO-04) enters the plan**, modifying the 23 Aug cluster plan | dewan keramat position 4.5 / 0 clicks; dewan komuniti setiawangsa 34 imp, 8.8, 0 clicks | Owner |
| 68 | **Content runs BOTH lines** — venue pages and the cluster queue, not one or the other | Owner decision this meeting | Owner |
| 69 | **⚠ CEO ERROR: decision 50 was assigned on 24 Aug and never followed up.** `dewan komuniti setiawangsa` was 25 impressions at 8.9 then; it is 34 at 8.8 now, still zero clicks. The assignment produced nothing and the CEO never checked | GSC, 24 and 26 Aug | CEO, recorded against itself |
| 70 | **⚠ CEO ERROR: the Sprint 01 close reported "both repos clean" having checked two of three trees.** The site worktree held 93 uncommitted files, including the UNDO scripts for every production write Sprint 01 made | `git status` in the site worktree, 26 Aug | CEO, recorded against itself |
| 71 | **PLAT-05 widened from sprint documents to all 422**, and split: PLAT-05 the engine, PLAT-06 the Confluence-like navigation. Retros named explicitly | Owner direction; document count measured across both repos | Owner |
| 72 | **The secret-shape guard SKIPS and continues rather than refusing.** At 20 documents a hard refusal is an inconvenience; at 422 it stores nothing | The prior round table's finding that the guard would reject the /tokens registry | CEO |
| 73 | **The document page tree is derived from file paths and never hand-arranged.** Cannot drift; costs the ability to organise better than the directories are organised | Confluence's hand-arranged trees are stale in every long-lived instance | CEO |
| 74 | **PLAT-09 — the buddy sidebar carries the latest additions** | Owner request in-meeting | Owner |
| 75 | **UI/UX review of homepage, category and article pages commissioned** to a UX seat and the Head of SEO in parallel. Findings land after planning so any work is added deliberately, not absorbed | Owner request in-meeting; CEO's own visual review found a grey placeholder card, two conflicting nav bars, truncated nav text, an imageless category page showing two "coming soon" states above real content, and covers that do not depict their subject | Owner |
| 76 | **Orca terminals 26 → 1**, after verifying nothing uncommitted was at risk — which is how decision 70 was found | status-board.py: 22 IDLE/DONE, 4 UNKNOWN, nothing WORKING | CEO |

## Predictions

- **RISK-04 closes and the five dark articles become known to Google within 48h of
  the next ingest.** Falsifiable: if they are still "unknown" 48h after a
  post-RISK-04 ingest, the fix is wrong and the sitemap was not the mechanism.
- **RISK-05 catches at least one real problem in its first fortnight.** If it never
  fires, either the pipeline is healthier than we think or the monitor is wrong;
  either finding is worth the 2 points.
- **The venue pages convert where the listicle did not.** Concretely: at least one
  of the four named-hall queries earns non-zero clicks within 28 days of ship.
  This is the sprint's real bet and the one most likely to be wrong — position 4.5
  with zero clicks may be a SERP-feature problem we cannot fix with a better page.
- **Indexing count keeps rising without further linking work.** SEO-02's links are
  still being followed.
- **Total clicks stay small.** Nothing here moves a 2-clicks/day site to a large
  number in one sprint. The measure is whether the *non-legacy* URLs start earning
  a share, not the headline total.

## Actions

| Action | Owner (agent) | Due |
|---|---|---|
| RISK-04 — sitemap resubmit on ingest | BMAD | Sprint 02, first — gate |
| RISK-05 — indexing monitor + alarm | BMAD | Sprint 02, after RISK-04 |
| SEO-04 — venue page type, 4 named halls | BMAD (spec from head-of-seo-content) | Sprint 02 |
| SEO-05 — zero-CTR audit, 5 worst rewritten and shipped | head-of-seo-content | Sprint 02 |
| PLAT-05 / PLAT-06 / PLAT-07 — document store, spaces, retro read | BMAD | Sprint 02 |
| PLAT-08 — preview environment on both projects | BMAD | Sprint 02 |
| PLAT-09 — buddy sidebar | BMAD | Sprint 02 |
| CONT-05 — 4 cluster articles | writer-inspirasi-vendor-venue | Sprint 02, after RISK-04 |
| UI/UX review findings → sprint items | CEO | Reports after this meeting |

## Owner requests

**None.** Nothing in Sprint 02 touches credentials, money, outward-facing
commitments in the company's name, or irreversible destruction. The four carve-outs
are the entire list and none is engaged.

One thing for the owner's awareness rather than action: persona and skill edits
made this session load at the **next** session start, not this one.
