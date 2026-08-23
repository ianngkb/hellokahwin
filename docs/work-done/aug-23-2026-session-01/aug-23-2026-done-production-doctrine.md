# Production doctrine: the overtaking mechanism, the compounding case and the stop rule, 23 Aug 2026

**Session:** aug-23-2026-session-01  ·  **Owner:** head-of-seo-content  ·  **Status:** completed
**Plan:** [aug-23-2026-clusters-launch-plan.md](../../plans/aug-23-2026-session-01/aug-23-2026-clusters-launch-plan.md) (approved)
**Brief:** [aug-23-2026-brief-production-and-visuals.md](../../plans/aug-23-2026-session-01/aug-23-2026-brief-production-and-visuals.md), Part A

## What was done

Part A of the CEO's brief, all five numbered items. Strategy only: no
article, draft, outline or sample paragraph appears in the deliverable. One
worked structural example is included, a Coverage Ledger table shape, and it
names nothing real.

**Turned two quality-bar lines into a production behaviour.** Lines 3 and 4 of
the 21-point bar ("no competitor page on page one answers something this page
does not" and "at least one specific, checkable fact a competitor does not
have") were assertions with no mechanism behind them. They now have two: a
Coverage Ledger built from a dated SERP pull before drafting, and a
four-class definition of what counts as a specific fact. Both are added to
the brief template and the QC checklist, and QC now runs four gated checks in
order before a draft reaches /humanizer.

**Pulled the competitor data the argument needed rather than reusing what was
on file.** Ten new Ahrefs calls. Domain rating for all four domains, twelve
months of traffic history for the three incumbents, a 100-page article census
of ppsignature, backlink statistics for all four, and referring-domain
samples for three.

**The competitive picture changed materially.** ppsignature.com is flat over
twelve months, half its traffic is non-wedding content we already declined,
and its wedding editorial franchise is roughly 10,800 visits a month rather
than the 29,745 the cluster plan quoted for the whole site. songketdunia.my is
down 37.6% from its own February peak with 60% of its traffic on one page.
nikahsatu.com is the only one growing.

**Found a problem in our own backlink profile that no earlier document
records.** 452 referring domains, all of them spam, DR 0.0. Section 5.4 of the
document sets out what it is, why it still matters, and why I recommend no
disavow action today.

**Stated the number that would make me tell the CEO to change course**, with
30, 60 and 90 day checkpoints, and a written list of what is explicitly not a
change-of-course signal.

The document was drafted, run through /humanizer, and re-checked. The
humanizer pass changed fourteen passages: three not-X-but-Y constructions,
four announcing-the-next-point openings, two forced punchline endings, one
forced group of three, one self-praising "honest", and three headings that
were rhetorical rather than descriptive. Final check confirms zero em dashes,
zero en dashes, zero curly quotes and zero flagged AI vocabulary. Bold density
is 16 spans per 100 lines against 17 in the approved cluster plan, so the
house voice is matched rather than diverged from.

## Evidence

**File written**

`docs/plans/aug-23-2026-session-01/aug-23-2026-production-doctrine.md`,
672 lines, covering all five items in Part A of the brief: the mechanism of
overtaking with the Coverage Ledger and the Specific Fact; the per-competitor
case for ppsignature, songketdunia and nikahsatu with both halves stated; the
four compounding assets with the point at which each starts paying; the
counter-attack case; and the failure modes with a numeric stop rule.

**Findings the board should see**

| Finding | Evidence |
|---|---|
| ppsignature.com has been flat for twelve months | Global org traffic 31,056 (Aug 2025) against 31,051 (Aug 2026). Ahrefs `site-explorer-metrics-history`, monthly, 23 Aug 2026 |
| Half its traffic is not wedding traffic | 14,970 of ~29,745 MY visits (50.3%) sit on istikharah, doa jodoh, perceraian and iddah pages. Ahrefs `site-explorer-top-pages`, `my`, 2026-08-01, 23 Aug 2026 |
| Its wedding editorial franchise is ~10,800 visits/mo from ~14 articles | Same pull. This, not 29,745, is the number we are contesting |
| 19 blog articles carry 87% of its Malaysian traffic (25,771 visits) | Ahrefs `site-explorer-top-pages`, top 100, `my`, 2026-08-01, 23 Aug 2026 |
| It has four documented parent-topic cannibalisation pairs | mas kahwin (2,847 against 8), baju songket (139 against 22), dulang hantaran (275 against 36), dugaan bertunang (50 against 7). Same pull |
| Its entire editorial namespace is one flat Shopify path | Every article on `/blogs/latest-blog/<slug>`. Same pull |
| songketdunia.my is down 37.6% from its own peak | 16,971 (Feb 2026) against 10,594 (Aug 2026). Ahrefs `site-explorer-metrics-history`, monthly, 23 Aug 2026 |
| 60% of its traffic is one page | `/blogs/news/ucapan-selamat-pengantin-baru`, 6,356 of ~10,594. Ahrefs `site-explorer-top-pages`, `my`, 2026-08-01, 23 Aug 2026 |
| nikahsatu.com is the only incumbent growing | 12,254 (Aug 2025) against 13,183 (Aug 2026), up 7.6%. Same endpoint |
| Both retailers hold genuine Malaysian media links we cannot match quickly | ppsignature: says.com DR 71, therakyatpost.com DR 68, mstar.com.my DR 64. songketdunia: grab.com DR 86, mudah.my DR 71, gempak.com DR 56. Ahrefs `site-explorer-referring-domains`, dofollow only, 23 Aug 2026 |
| **Our own backlink profile is entirely spam** | 452 live referring domains, up from 12 in March 2026. The 25 highest-DR are all link-selling sites (rankyour.website DR 74, buybacklinks.agency DR 69, pbnseolinks.shop), every one nofollow. Only 13 domains link dofollow and every one is junk. DR 0.0, Ahrefs rank null. Ahrefs `site-explorer-backlinks-stats`, `site-explorer-referring-domains`, `site-explorer-refdomains-history`, 23 Aug 2026 |

**A tooling limitation, recorded rather than worked around silently.** The
`country` parameter on Ahrefs `site-explorer-metrics-history` returned an
empty error across four attempts with valid input. The three traffic-trend
series are therefore global rather than Malaysia-filtered, and the document
says so at every point of use. For ppsignature the global and Malaysian
figures are within 5% of each other, so the flat-trend reading holds; for the
other two the trend direction is global and is labelled as such.

**Ahrefs unit spend:** 30,414 units before starting, 33,693 after. **3,279
units consumed, 0.8% of the 400,000 monthly workspace allowance.** Verified
through `subscription-info-limits-and-usage`.

**Data sources, all pulled 23 Aug 2026:** `site-explorer-domain-rating` (4
domains), `site-explorer-metrics-history` (3 domains, monthly, Aug 2025 to
Aug 2026), `site-explorer-top-pages` (ppsignature top 25 and top 100,
songketdunia top 15, `my`, 2026-08-01), `site-explorer-backlinks-stats` (4
domains), `site-explorer-referring-domains` (3 domains),
`site-explorer-refdomains-history` (hellokahwin.com). Keyword, top-3 and
Malaysian traffic figures carried forward from the cluster launch plan; GSC
figures carried forward from the baseline audit; nikahsatu's internal-link
signature carried forward from the Task 0 research.

## What it changed

**The board's question now has an answer with a number attached.** The reason
we overtake is not that we write better. It is that ppsignature's entire
wedding editorial asset is about fourteen articles carrying ~10,800 visits a
month, it has not grown in a year, and our approved map is 204 topics.

**The competitor brief is more accurate and less flattering to them.** The
29,745 figure that has been quoted since the cluster plan describes a site
half of whose traffic is prayer and divorce content. The wedding number is
roughly a third of that.

**Two quality-bar lines became executable.** Line 3 was previously
unfalsifiable in review. It now resolves against a table with a SERP date on
it, which also becomes the refresh evidence under R18 and R19.

**The programme has a stop rule.** Fewer than 400 clicks in the 28 days to
21 Nov 2026, with 70 or more articles published and indexed and three clusters
at 80% coverage. Stated in advance, in writing, so that it cannot be
renegotiated in November.

**A new risk is on the register.** The spam backlink profile. No action
recommended today, re-check booked at the day 60 checkpoint.

**One claim is now off the table before anybody made it.** Our 452 referring
domains are not link parity with the incumbents. On genuine editorial links
the score is a handful each for them and zero for us.

## Follow-ups

Owned by the CEO, unchanged from the cluster plan and re-stated with their
cost:

1. Approve the two Malay writer hires. Every compounding asset in section 3 is
   a function of published volume.
2. Commission the seven pillar pages. R16 forbids orphans, so this still gates
   article one. Fifth time raised.
3. Decide on the venue directory.
4. Fix the two-hop redirect chain.

Owned by head-of-seo-content:

5. Update the brief template to carry a Coverage Ledger, and the QC checklist
   to run the four gated checks. Both are mine and neither needs approval.
6. Re-check the backlink profile at the day 60 checkpoint (22 Oct 2026) and
   escalate only if followed spam links start growing at pace.

Tooling issue, new:

7. The `country` parameter on Ahrefs `site-explorer-metrics-history` fails
   with an empty error. Worth reporting or working around with
   `site-explorer-metrics` per date if country-filtered trend data is needed
   later.

Tooling issue, still unresolved from Phase 1:

8. The `gsc` MCP server did not load in the Phase 1 session and was worked
   around through the Search Console API. Not re-tested this session, since no
   new GSC data was required.
