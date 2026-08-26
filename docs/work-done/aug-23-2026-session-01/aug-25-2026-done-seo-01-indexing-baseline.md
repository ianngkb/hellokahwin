# Done: SEO-01, indexing push and the GSC baseline

**Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-seo-01-indexing-baseline.md`
**Date:** 25 Ogos 2026 (capture); written through local midnight into 26 Ogos
**Sprint:** 01 · SEO-01 · 2 points · head-of-seo-content

## Where the document IS

`C:\Users\Ian Ng\Documents\Code\hellokahwin\hellokahwin\docs\plans\aug-23-2026-session-01\aug-25-2026-baseline-seo-01-gsc-indexing.md`

Repo-relative: `docs/plans/aug-23-2026-session-01/aug-25-2026-baseline-seo-01-gsc-indexing.md`
Branch `feat/command-centre-dashboard`, uncommitted at time of writing.

**One external action was taken:** the sitemap was resubmitted to Google Search
Console (`mcp__gsc__submit_sitemap`, 2026-08-25 15:58 MYT). That is the only
state change this item made anywhere. **No production database writes**, as the
brief required. Everything else was read-only: URL inspections, search
analytics, and `curl` against the live site.

---

## Outcome

**8 of 28 articles are indexed. 20 have never been crawled.** That is the
number Sprint 02 scores against, and it is a better number than the impressions
because the impressions are all zero.

- **Indexed: 8** — the entire `hantaran-mas-kahwin` cluster, crawled 25 Aug.
- **Discovered, never crawled: 19** — all of P1, P3, P4, P6, P7 and two of P5.
- **Unknown to Google: 1** — `pelamin-kad-cenderahati/bunga-telur`.

All 28 return 200 and none carries a `robots` meta tag. Nothing is blocked. The
only constraint is crawl scheduling.

**The pattern has one cause.** The single indexed cluster is the one whose
pillar Google has crawled, and that pillar was crawled because a legacy article
already in the index — `mas-kahwin-ikut-negeri` — was re-parented into it.
Googlebot had a path in. The other six pillars have no legacy article and no
path in; two of them (`nikah-undang-undang`, `pelamin-kad-cenderahati`) are not
even *known* to Google, because the `/artikel` hub that links them was last
crawled 23 Aug, before those links existed.

**Impressions on the 28: zero, on every canonical URL, in every window.** The
one article with a legacy history carries 349 impressions across three
simultaneously-indexed URLs — and **zero of them on its canonical path.**

### Corrections to the record

**The union rule needs to be three-way, not two-way.** The brief and
`ceo-memory.md` both cite "44 impressions on the old path against 5 on the new
`/artikel/…` path". Those 5 impressions are on
`/artikel/idea-dan-nasihat/mas-kahwin-ikut-negeri` — the *superseded* category
from before the re-parent, not the canonical `/artikel/hantaran-mas-kahwin/…`,
which had 0 then and has 0 now. The rule as written compares one old URL to a
different old URL and reports it as old-versus-new.

**Consolidation on that article has not started.** The legacy root
`/mas-kahwin-ikut-negeri/` was last crawled **2026-07-24** — four days before
the 21 Aug migration. Google has not fetched it since the 308 went live, so it
does not yet know the redirect exists. "Still in flight" understates it.

### What moves first — argued, not assumed

The brief nominated the mas kahwin cluster and was right, but the stated reason
("already at position 10–11") is the weakest part of the case. That page turned
**344 impressions into zero clicks over 28 days** at position 12.6 — the exact
`impressions at ~0% CTR` failure mode in our own playbook. Position is not the
asset.

The asset is the **query inventory**: 28 distinct Malay queries, and among them
state-specific ones the omnibus page serves badly — `mas kahwin negeri sembilan`
(pos 34.6), `mas kahwin sabah` (37.0), `mas kahwin negeri perak` (34.0). We now
have dedicated indexed pages for exactly those states. A dedicated page
displacing an omnibus page from page four is the most reliable movement in the
dataset, and it is capture rather than defence.

Ranked: the three state pages first, then `apa-itu-mas-kahwin` on definition
intent, then the remaining indexed cluster members on a topical rather than
evidenced case, and `mas-kahwin-ikut-negeri` itself **last**. The other 20
articles cannot move until they are crawled, and I made no prediction about them
because there is no signal to base one on.

### Two findings outside the brief

1. **The sitemap lags publishing by up to a day.** Google's own 00:32 fetch on
   25 Aug returned 47 URLs; the day's articles published from 09:25. After
   resubmission: 73 URLs, 0 errors. Sitemap resubmission belongs in the publish
   routine, not in a sprint item.
2. **A second, unsubmitted taxonomy exists.** `/artikel` links 36 category URLs;
   the sitemap has 15. The other 21 are legacy WordPress categories, 200 and
   crawlable — 21 duplicate listing pages competing for crawl budget with 20
   articles that have never been fetched. Not a crawl trap (I checked; their
   article links are already canonical, so no 308 hops). Flagged, not fixed.

### Gap found

Selangor, Wilayah Persekutuan and Pulau Pinang have measured GSC impressions and
no dedicated page. The cluster is at 8 articles — the floor of the 8–15 window.
Adding these three takes it to 11 and covers the states most likely to search.
Sprint 02 candidate.

---

## What was NOT done

**Manual "Request Indexing" submissions were not performed.** The GSC API cannot
do it — URL Inspection is read-only and the Indexing API accepts only
`JobPosting` and `BroadcastEvent`. The only route is the Search Console web UI
in a browser.

I started down that path, hit a browser-selection prompt, and put the choice to
the owner. The CEO stopped it mid-item: slow, fragile, needs the owner's own
browser session, and marginal, because all 20 uncrawled URLs are already
"Discovered — currently not indexed", i.e. queued from the sitemap. Manual
requests reorder that queue; they do not create missing discovery. I agree with
the call. **The cost is possibly a few days on when those 20 get fetched. The
baseline — the actual deliverable — is unaffected.**

Recorded here as a decision with a reason, not a silent gap.

---

## Retrospective

### What the item got right, and what it got wrong

The brief was accurate about the risk that mattered — that a new-URLs-only
report would read as a collapse — and it was right to insist on the union. But
its own worked example of the union was wrong, and I only caught it because I
pulled all three URLs instead of the two the brief named. Had I unioned the two
URLs the brief listed, I would have produced a correct-looking table with the
canonical URL missing from it entirely, and reported 349 impressions as if some
of them were on the page we are trying to rank.

The brief also asked me to argue the C2.4 prediction rather than assume it, and
that instruction earned its keep. The assumed reason (position 10–11) is close to
the opposite of the truth: that position is where the page has been failing for
28 days. The real case rests on the query inventory underneath it. If I had
accepted the premise, Sprint 02 would have been scored against "did the
position-10 page improve" instead of "did the state pages capture their states",
and those measure different things.

### What went wrong in execution

I burned time on the browser path before questioning whether it was worth doing.
The API limitation is real and well known — URL Inspection is read-only — so the
moment I established that, the right move was to state the constraint, weigh the
browser route against its value, and put a recommendation in the report. Instead
I went to the owner with a browser-selection question, which spent their
attention on the most marginal part of the item. The CEO had to stop it.

The tell was available before I asked: every uncrawled URL was already
"Discovered — currently not indexed". I had that data in hand and did not read
what it implied — that discovery was not the bottleneck, so the intervention
that fixes discovery was not the lever.

### The lesson

**Establish what an action is worth before establishing how to perform it.** I
correctly identified that the browser was the only route to manual indexing
requests, and then treated "only route" as "therefore necessary". The prior
question — what does this buy, given what the inspection data already says — was
answerable from data I had already collected.

There is a second, narrower lesson. A metric comparison in the company record is
only as good as the URL list behind it, and that list is invisible in the
summary. "44 against 5" reads as old-versus-new and is in fact old-versus-older.
Comparisons should name their URLs.

### The file that must change

`docs/boardroom/ceo-memory.md`. It is read at the start of every session, and
its **Measurement rules** section carries the two-way union rule and the
misread "44 vs 5" example that would have propagated into every future
page-level report. Its **Site state** section also still records "Sitemap
submitted and Valid — 39 URLs", which is two revisions stale.

Four facts belong in it: that the union must be three-way for re-parented
articles, that the cited example compares two old URLs rather than old to new,
the 8/28 indexing baseline, and that the sitemap must be resubmitted after each
publish batch because Google's own fetch can predate the day's publishing.

**Edited below.**
