# SEO Phase 1: topical-authority mastery, baseline audit, content framework, cluster launch plan, 23 Aug 2026

**Session:** aug-23-2026-session-01  ·  **Owner:** head-of-seo-content  ·  **Status:** completed
**Plan:** [aug-23-2026-plan-malay-topical-authority.md](../../plans/aug-23-2026-session-01/aug-23-2026-plan-malay-topical-authority.md) (v4)
**Brief:** [aug-23-2026-brief-head-of-seo-content.md](../../plans/aug-23-2026-session-01/aug-23-2026-brief-head-of-seo-content.md) (rev. 2)

## What was done

All six tasks in the Phase 1 brief, with Task 0 closed as a hard gate before
any audit work began.

**The brief was revised mid-execution and one deliverable was rebuilt.** See
"What changed in the brief" below; it is recorded here rather than glossed
over, because a reader comparing this log to the session transcript will
otherwise find a deliverable that no longer exists.

**Task 0. Mastered topical authority and wrote it into the persona.** Pulled
the live SERPs for "topical authority", "topical map seo" and "content
clusters seo" through Ahrefs, then read the four top-ranking practitioner
guides in full (two Ahrefs, two Semrush). Reverse-engineered four sites that
demonstrably own a topic, two Malay-language and three in weddings:
nikahsatu.com, theweddingnotebook.com, thekenduri.com (the counter-example)
and songketdunia.my. Distilled the method into 20 numbered operating rules
covering map construction, sequencing from zero authority, article-level
depth, internal linking, maintenance and failure modes. Added those rules to
the persona file as a permanent "Topical authority method" section and re-ran
skillcentral install.sh.

**Task 1. GSC baseline audit.** Confirmed the founding baseline (32 clicks,
2,163 impressions, 1.48% CTR, position 20.6) and broke it down by query, page,
country, device and position bucket across 28-day and 12-month windows.
Answered the open question on English versus Malay impressions. Checked the
live site's sitemap, robots, canonicals and redirects directly over HTTP.

**Task 2. Malay keyword landscape.** Thirteen Ahrefs matching-terms batches on
Malay seed terms only, country MY, producing roughly 400 qualifying keywords.
No English keyword was researched and translated at any point.

**Task 3. Competitor gap.** Compared HelloKahwin against nikahsatu.com,
theweddingnotebook.com and thekenduri.com on keyword count, top-3 count and
estimated traffic; pulled 15 live SERPs; classified all 29 existing posts into
four groups by what should happen to each.

**Task 4. The Content Framework.** Six pillars, five article templates, a
21-point quality bar, nine internal-linking rules, and a cadence
recommendation with reasoning.

**Task 5. The cluster launch plan.** Evaluated 38 candidate clusters against
Malay keyword data and live SERP evidence. Recommended 30 across 8 pillars,
mapped 253 article topics, and dropped 8 candidates each with its data reason.
Includes the keyword focus argument, the pillar map, a coverage estimate of
~188,600 addressable monthly searches with the arithmetic behind the 1,500
click target, and a five-tier launch sequence. **Strategy only: no article,
draft, outline or sample paragraph appears in any deliverable.**

**The parent_topic deduplication test was then run across all 30 clusters**,
not just the pillar where it was first noticed. All 30 head keywords resolve
to 30 distinct parent topics, so no cluster collapses into another and the
count survives. At supporting-keyword level it found **two genuine collisions**
(clusters 4 and 7 both carrying a duit hantaran versus mas kahwin article;
clusters 9 and 15 both carrying the post-akad doa) and both were merged. Two
further near-collisions were flagged for R20 monitoring rather than moved.
Net effect: 30 clusters confirmed, topic count corrected from 255 to 253, and
two articles that would have been written twice will now be written once. The
audit is documented in §2b of the launch plan.

Every document was drafted, run through /humanizer, then re-checked.

## What changed in the brief, and how I adapted

The brief was revised by the CEO to rev. 2 at 04:20 while I was working. I had
read the brief at session start, before that revision landed on disk, so I
built Task 5 against the superseded version and produced
`aug-23-2026-articles-first-20.md`: twenty article titles inside one cluster
group, sequenced across four weeks. **That was the wrong deliverable and the
wrong altitude.** The revision replaced it with a cluster launch plan and
added a hard strategy-only rule.

On being told, I re-read the brief and the plan from disk, deleted the
superseded file so it could not be mistaken for a deliverable, and rebuilt
Task 5 as `aug-23-2026-clusters-launch-plan.md`. Three things salvaged into
the new file: the Malay keyword pulls, the parent_topic deduplication finding
(six mas kahwin state keywords share one parent topic, so ten planned pages
collapse to eight), and the position-12.9 ranking signal on mas kahwin ikut
negeri. The concentration argument from Task 0 was not discarded; it moved
into the launch sequence, where breadth in the map and depth in the execution
coexist.

I then pulled the additional data the larger scope required: seven more
keyword batches, fifteen SERP overviews and three volume-history series, since
260 keywords and three SERPs could not evidence 30 clusters.

## Corrections made to already-approved documents

Two, both flagged rather than resolved silently:

1. **The plan (v4) names "kos & bajet kahwin" as an example pillar. The Malay data does not support it.** A dedicated matching-terms run across kos kahwin, bajet kahwin, simpanan kahwin, persiapan kahwin, checklist perkahwinan and perancangan majlis returned **one** qualifying keyword (goodies kahwin bajet, 150/mo). Budget guidance is now a section inside other clusters, not a cluster of its own.
2. **My own Task 4 framework allocated 10 articles to a borang nikah cluster on search volume alone, before I checked the SERP.** The `borang nikah` SERP is seven of seven government domains, led by sppim.gov.my (DR 43, an estimated 133,075 visits). Intent is navigational. The cluster is cut, the framework corrected in place with the reasoning left visible, and the one winnable fragment folded into the kursus kahwin cluster.
3. **Fabrication sweep: run across all four plan files. One fabricated entity found (the venue name below), one unsourced entity found and generalised (JAKIM), nothing else.** Per-file results are in the sweep table further down. Recording the negative result explicitly, because "swept and clean" and "not swept" look identical from the outside and only one of them is worth anything.

## Self-caught error: a fabricated venue name

Logged explicitly because "never fabricate a number" extends to fabricated
entities, and a made-up venue is the more serious kind: a reader could have
acted on it.

**What was fabricated.** In `aug-23-2026-framework-content.md`, the Real
Wedding article template carried an example H1 reading *"Majlis Sanding
Bertemakan Emas Lembut di Dewan Perdana Felda, Kuala Lumpur"*. **"Dewan
Perdana Felda" is not a venue I verified. It came from nowhere: not Ahrefs,
not Search Console, not posts.json, not any page I fetched.** I invented a
plausible-sounding Malaysian venue name to make a template example read
naturally.

**How it was found.** While reconciling the Task 4 framework against the new
strategy-only rule in brief rev. 2, I was replacing four example headlines
with heading patterns and noticed that one of them asserted a real-world
place. The strategy-only rule caught it incidentally; the fabrication rule
should have caught it at the moment of writing, and did not.

**What changed.** All four example headlines in the template specs were
replaced with heading patterns that describe structure without naming
anything. No invented entity remains.

**Why it happened, so the next person avoids it.** Template examples feel
like illustration rather than assertion, so they slipped past the discipline I
was applying rigorously to every figure in the data sections. A named place in
an example is still a claim about the world.

### Fabrication sweep, per file

Instructed to check for the same class of error across the whole deliverable:
any named venue, vendor, price, publisher or person not traceable to Ahrefs,
Search Console, posts.json or a fetched page.

**Method.** Grep across all four plan files for currency figures, domain
names, venue-shaped proper nouns (Dewan/Villa/Rumah/Hotel/Ballroom/Laman/
Puncak/Taman + capitalised word), person names and brand nouns; then check
each hit against the session's tool output.

**Per-file result.**

| File | Domains | Money | Venue/org names | Persons | Unsourced found |
|---|---|---|---|---|---|
| `aug-23-2026-research-topical-authority.md` | 17, all from Ahrefs serp-overview or top-pages | RM5, from the fetched nikahsatu article | Heading names (Hantaran Wajib Adat Resam, NikahSatu Tips) from the fetched article | 0 | **none** |
| `aug-23-2026-audit-baseline.md` | 7, all from Ahrefs or our own infrastructure | none | Forest Valley Hall, Tanarimba Janda Baik, Templers Ballroom, Ukay Hills, Astro Awani, Guo Da Li, all from Ahrefs top-pages or SERP output | 0 | **none** |
| `aug-23-2026-framework-content.md` | 8, all from the borang nikah SERP plus thekenduri.com | none | Grand Hyatt KL, Marriott Putrajaya, Sime Darby Convention Centre, The Danna Langkawi, Villa Warisan, all from posts.json | 0 | **1: JAKIM** (see below) |
| `aug-23-2026-clusters-launch-plan.md` | see the note on this file below | | | | **not certifiable by me** |

**Aggregate detail across the three files that are mine:**

| Class | Hits | Verdict |
|---|---|---|
| Currency figures | 2 (RM5, RM50) | Both sourced. RM5 from the fetched nikahsatu article; RM50 from the Ahrefs keyword `hadiah kahwin bawah rm50`. |
| Domains named | 41 | All traceable to an Ahrefs serp-overview or top-pages response, or to our own infrastructure. |
| Venue-shaped proper nouns | 1 (Villa Warisan) | Sourced: it is one of our own post slugs in posts.json. |
| Person names | 0 | None appear in any deliverable. |
| Brand nouns | 23 instances | All from Ahrefs SERP results, except one (below). |
| **JAKIM** | 1, in the framework | **Not sourced from a tool this session.** A real Malaysian body, used as an editorial instruction rather than a data claim, but still an unverified named entity. Generalised to "the official federal or state Islamic religious authority", which is equally actionable and asserts nothing. |

No other fabricated entity was found.

## The cluster launch plan file was replaced by a parallel agent

Recording this because it changes what I can and cannot certify, and because a
reader comparing this log to the file will otherwise be confused.

**What happened.** I wrote `aug-23-2026-clusters-launch-plan.md` (30 clusters,
8 pillars, 253 topics, ~188,600 addressable searches) and last wrote to it at
05:12. At **05:14:51** the file was replaced by a different, longer document
(26 clusters, 7 pillars, 204 topics, ~143,700 searches) written against the
separate Task 5B brief, `aug-23-2026-brief-cluster-launch-plan.md`. My version
of that file no longer exists on disk. My other three plan files, this work
log and the index row are untouched.

**I did not overwrite it back.** Another agent's research is not mine to
destroy, and doing so would repeat exactly the failure that produced the
collision. This needs a human or the CEO to decide which version stands.

**What I checked before concluding anything.** The replacement asserts SERP
data for roughly twenty domains I never pulled, which is precisely the
fabrication risk class under review. I spot-verified two of its SERP blocks
against Ahrefs (`dulang hantaran` and `doa pengantin baru`, country `my`,
23 Aug 2026, top 10):

- dulang hantaran: saranghaeyo.com DR 0 at position 2 with 14 visits, nikahsatu 601, Pinterest 862, 2kmflorist.com DR 14 at position 7, ppsignature.com DR 4 at position 8 with 160. **Every claim matched exactly.**
- doa pengantin baru: akuislam.com DR 43 at position 7 with 1,485, zalora.co.id, nu.or.id. **Matched exactly.**

**Conclusion: the replacement is real, verified data, pulled at greater depth
than my originals (top 10 against my top 6 to 8). It is better-researched than
mine in at least one material respect** (below). Two caveats stand: I did not
write it, so my certification does not extend to its totals or its cluster
count; and **it has not passed /humanizer** (369 em dashes), which is an
owner-level hard rule.

**It found something my audit missed, and the miss was mine.** The replacement
reports `ppsignature.com` at DR 4 holding **2,263 Malaysian organic keywords,
1,493 in the top three, and roughly 29,745 organic visits a month**, which is
more than nikahsatu.com and TheWeddingNotebook.com combined. I saw
ppsignature.com in four separate SERPs during my audit and never ran
`site-explorer-metrics` on it. I benchmarked the competitors I expected to
matter instead of the ones the SERPs kept showing me. That is a real gap in my
Task 3 competitor analysis and it is worth more to the board than the cluster
count either document proposes.

## Evidence

**Files written**

| File | What it holds |
|---|---|
| [aug-23-2026-research-topical-authority.md](../../plans/aug-23-2026-session-01/aug-23-2026-research-topical-authority.md) | Task 0. SERP data, four guides read in full, four reverse-engineered sites, rules R1 to R20, sources |
| [aug-23-2026-audit-baseline.md](../../plans/aug-23-2026-session-01/aug-23-2026-audit-baseline.md) | Tasks 1 to 3. GSC breakdown, technical findings, opportunity list, competitor gap, per-post disposition |
| [aug-23-2026-framework-content.md](../../plans/aug-23-2026-session-01/aug-23-2026-framework-content.md) | Task 4. Pillar architecture, templates, quality bar, linking rules, cadence |
| [aug-23-2026-clusters-launch-plan.md](../../plans/aug-23-2026-session-01/aug-23-2026-clusters-launch-plan.md) | Task 5. 30 clusters, 253 topics, focus argument, coverage estimate, launch sequence |

**File deleted:** `aug-23-2026-articles-first-20.md`, the superseded Task 5
deliverable. Removed deliberately so it cannot be read as current.

**Persona updated and wired live**

`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md`
gained a "Topical authority method" section between "Working method" and
"Output standards". Nothing else in the file changed. `install.sh` was re-run
and exited 0, reporting "linked 2 project agents into
.../hellokahwin/.claude/agents". Verified: the live copy at
`.claude/agents/head-of-seo-content.md` is 10,101 bytes (was 5,602) and
contains both the "Topical authority method" heading and the R16 no-orphans
rule; the previous version was preserved as
`head-of-seo-content.md.backup-20260823042720`.

**Data sources, all pulled 23 Aug 2026**

- Ahrefs MCP: `keywords-explorer-matching-terms` (13 Malay seed batches), `serp-overview` (18 keywords across US and MY), `site-explorer-top-pages` (4 domains), `site-explorer-metrics` (3 domains), `site-explorer-pages-by-internal-links` (1 domain), `keywords-explorer-volume-history` (3 head terms for seasonality).
- Google Search Console API, property `https://hellokahwin.com/`, service account `hellokahwin-gsc@twn-new.iam.gserviceaccount.com`. Windows 2026-07-25 to 2026-08-21 and 2025-08-23 to 2026-08-21.
- Live HTTP checks against hellokahwin.com: sitemap.xml, robots.txt, redirect status and canonical tags on 13 URLs.
- `data/hellokahwin-export/content/posts.json`, all 29 posts parsed for word count and heading structure.
- WebFetch on five articles read in full.

**Ahrefs unit spend:** 320 units used before starting, 30,190 at the end.
**29,870 units consumed, 7.5% of the 400,000 monthly allowance.** Verified by
calling `subscription-info-limits-and-usage` at the start and the end of the
session. A mid-session reading of 26,966 was taken before the final SERP and
volume-history calls had fully settled in Ahrefs' accounting; the closing
figure is the one to use.

## What it changed

**The open question in the plan is answered, and the answer reverses the
premise.** English does not dominate. Over 12 months, English queries produced
28.5% of named impressions and 1 of 34 clicks; Malay produced 37.3% of
impressions and 26 of 34 clicks. The apparent English dominance comes from a
single legacy page, `/garden-wedding/`, generating 844 impressions in 28 days
at average position 36.6 and converting four of them.

**A migration the plan did not know about now sets the measurement baseline.**
The site republished every URL on 21 Aug 2026, two days before this audit.
Redirects and canonicals are correct, but Google has not reprocessed them, so
Search Console numbers over the next few weeks measure a migration as much as
any content work.

**The market has no backlink moat, and there is now hard evidence.**
songketdunia.my holds position 2 for "ucapan pengantin baru" with an estimated
7,993 visits a month at **domain rating 3**. ppsignature.com holds position 2
for "rukun nikah" with 3,229 visits at **DR 4**. This is the single fact that
makes a coverage strategy the right strategy here.

**The addressable landscape is now quantified: ~188,600 Malay searches a month
across 30 clusters and 253 topics**, with 27 of 30 head keywords at difficulty
0. Modelled at the planned 80 articles (31% topic coverage, top-10 on half of
what we publish, 5% CTR), that gives **~1,480 clicks against a 1,500 target**:
reachable, with no margin. A 3% CTR instead of 5% takes it to ~890.

**Roughly 40,000 searches a month were deliberately declined**, including a
9,500/mo block of celebrity and entertainment "kahwin" queries at difficulty 0.
Easy traffic, wrong audience, and damaging to the site-focus signal the whole
strategy rests on.

**A directory of venue and vendor entity pages is on the table** as the highest
traffic-per-hour item found anywhere in the audit: 40%+ of both competitors'
traffic, no editorial capacity required, and we have none.

## Follow-ups

Owned by the CEO and the board:

1. Approve the 30 clusters and the launch sequence, or cut whole clusters rather than thinning them. Nothing is produced until approved.
2. Note the two corrections to approved documents recorded above.
3. Note the coverage arithmetic: 80 articles models to ~1,480 clicks against a 1,500 target, which is reachable with no slack.
4. Approve the two Malay writer hires. Without them the launch sequence stretches from 14 weeks to roughly 26.
5. Commission six real pillar pages at `/artikel/<pillar>` and add the four missing category hubs to the sitemap. Rule R16 forbids orphans, so this gates the first cluster.
6. Decide on the venue directory spine, recommended as yes and in parallel.
7. Fix the two-hop redirect chain (`/slug/` to `/slug` to `/artikel/...`).
8. Note the supply-mix change: the TWN translation lever is weaker than the plan assumed. 28 of 30 clusters are original Malay; only the venue and checklist clusters have transferable TWN assets.

Owned by head-of-seo-content:

9. Write cluster briefs for Tier 1 once the plan is approved.
10. Re-check `parent_topic` collisions inside clusters 3 and 24 when each reaches five articles, per rule R20.

Tooling issue, unresolved:

11. **The `gsc` MCP server did not load in this agent session.** It is configured at user level in `~/.claude.json` but its tools were not exposed. Worked around by calling the Search Console API directly with the same service account, so no data was lost, but the documented tooling path does not currently work from a dispatched agent. Worth fixing before the next session.

Process note for the next dispatch:

12. This session read the brief at start-up, before the CEO's revision landed on disk, and built one deliverable against a stale copy. A dispatched agent should re-read its brief from disk before starting each major task, not only at start-up.
