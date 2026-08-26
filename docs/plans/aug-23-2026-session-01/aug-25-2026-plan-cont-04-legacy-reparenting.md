# Plan — CONT-04: re-parenting the legacy articles

**Sprint 01 · item CONT-04 · 2 points · owner `head-of-seo-content`**
**Brief:** `aug-25-2026-brief-cont-04-reparenting-plan.md`
**Date:** 25 August 2026 · **Session:** aug-23-2026-session-01
**Status:** PLAN. Nothing executed. No article's category was changed, no
redirect was written, no database was touched.

Every figure below carries the tool and the date it was read. Search Console
data runs to **23 August 2026**, which is as recent as the API goes today.

---

## The recommendation

**Do not run the thirteen-article migration.** Run a two-line change instead
that buys almost all of what the migration was for, and costs nothing.

Three findings drive that, in order of how much they change the decision.

**1. Category placement and URL are two different database columns.** The
pillar architecture — the up-link to the pillar, the cluster sibling block, the
article's place on the pillar hub — is driven by rows in `article_categories`.
The URL is driven by `articles.primary_category_id` and nothing else. Adding a
legacy article to its cluster is an insert into a link table. **It gives the
article the full pillar architecture without moving its URL at all.** Changing
the primary category buys one extra thing on top: the words in the URL string.

**2. The redirect map is empty.** There is nothing to write. Old article URLs
heal themselves through code that is already in production, in a single hop,
and I verified that live on three articles this morning. The migration cost the
brief was worried about is not thirteen redirects. It is zero redirects.

**3. The exposure is real but it sits on two pages, not thirteen.** Across 28
days to 23 August, eleven of the thirteen carry **20 impressions and 1 click
between them**. Two carry the rest: `/dewan-kahwin/` at 1,009 impressions and
28 clicks, and `/garden-wedding/` at 856 impressions and 4 clicks. Whatever we
decide about eleven of these pages is, measurably, a decision about nothing.

So the answer is not one answer. It is:

| Wave | What | When | Cost |
|---|---|---|---|
| **A — do now** | Link seven legacy articles to their cluster in `article_categories`. **No URL change, no redirect.** | Now. Not blocked on anything. | Zero traffic exposure |
| **B — gated** | Change the primary category (and therefore the URL) for `dewan-kahwin` and `garden-wedding` | When the condition in §6 is met, earliest review 8 September 2026 | 1,865 impressions, 32 clicks — 81% of the site's impressions |
| **C — declined** | Four articles the CEO's list includes that should not move at all | Never, on current data | — |

And one correction to the premise: **there are twelve left, not thirteen.**
`mas-kahwin-ikut-negeri` was already re-parented on 24 August as part of the
publish-the-eight run. It is the natural experiment this plan leans on.

---

## 1. What an article's URL is actually built from

The brief asked me to verify the claim rather than repeat it. I did, in the
site repo at `~/orca/workspaces/hellokahwin-site/pillars-ingest-redirects`.

**The URL shape is confirmed.** `src/app/sitemap.ts:101` emits
`/artikel/${article.categorySlug}/${article.slug}`, and `categorySlug` on line
49 comes from an inner join on `articles.primary_category_id`. The article
route builds the same path for its canonical tag and its JSON-LD. So yes —
changing the primary category changes the URL.

**But the pillar architecture does not read that column.**
`src/lib/inspire/pillar-queries.ts:195` — `getPillarUpLink` — joins
`article_categories` to `inspire_categories` and filters on `pillar_code`. It
never looks at `primary_category_id`. `getClusterSiblings` selects on
`article_categories.category_id`. The category and pillar hub page lists its
articles through `article_categories` as well
(`src/app/(public)/artikel/[category]/page.tsx:91`).

That is the finding this whole plan turns on, so here it is as a table:

| Surface | Reads from | Changes if we add a cluster link? | Changes if we change the primary? |
|---|---|---|---|
| The article's URL | `primary_category_id` | No | **Yes** |
| Sitemap entry | `primary_category_id` | No | Yes (path only) |
| Link up to the pillar | `article_categories` | **Yes** | No |
| Cluster sibling block | `article_categories` | **Yes** | No |
| Appears on the pillar hub | `article_categories` | **Yes** | No |
| Appears in siblings' blocks | `article_categories` | **Yes** | No |
| Breadcrumb | `primary_category_id` | No | Yes |

**Live proof that the architecture renders.** `mas-kahwin-ikut-negeri` — a
legacy WordPress article, re-parented yesterday — serves all of it today
(read from live HTML, 25 August 2026):

```
/artikel/hantaran-mas-kahwin              anchor "hantaran dan mas kahwin"   (pillar up-link)
/artikel/hantaran-mas-kahwin#cluster-38d5e19a…  anchor "mas kahwin ikut negeri"  (cluster)
five sibling links: apa-itu-mas-kahwin, mas-kahwin-johor, mas-kahwin-perak,
                    mas-kahwin-pahang-negeri-sembilan, mas-kahwin-melebihi-kadar-minimum
```

That page still carries a link to `/artikel/idea-dan-nasihat` too, because its
old category link was kept. Both sets of links coexist, which is the behaviour
Wave A depends on.

**One honest limit.** I verified in code that the up-link reads
`article_categories`, and I verified in production that the up-link renders on
an article whose primary *is* in the pillar family. I have not observed a
secondary-link-only article in production, because none exists yet. §5 makes
the first one a pilot for exactly that reason.

---

## 2. The redirect map

**It is empty. There is nothing to write.**

The route layer generates every redirect at request time. In
`src/app/(public)/artikel/[category]/[slug]/page.tsx`, the article is fetched
by slug alone; the category segment is not part of the lookup. Lines 545–547
then compare the requested category with the article's real one and issue a
permanent redirect when they differ. The legacy root resolver at
`src/app/(public)/[slug]/page.tsx` computes the canonical path from the
article's *current* primary category on every request.

Both are derived, not stored. Re-parent an article and both start pointing at
the new path on the next request, with no row written anywhere.

**Verified live, 25 August 2026:**

```
/artikel/idea-dan-nasihat/mas-kahwin-ikut-negeri  308 → /artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri  (1 hop, 200)
/mas-kahwin-ikut-negeri/                          308 → /artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri  (1 hop, 200)
/artikel/venue-perancangan/dewan-kahwin           308 → /artikel/idea-dan-nasihat/dewan-kahwin
/artikel/real-wedding/kursus-kahwin               308 → /artikel/idea-dan-nasihat/kursus-kahwin   (1 hop, 200)
/artikel/pelamin-kad-cenderahati/goodies-kahwin   308 → /artikel/hiasan-dekorasi/goodies-kahwin   (1 hop, 200)
```

The third line is the important one. A wrong-category URL that has never
existed still 308s to the right place, which means the redirect for a move we
have not made yet already works.

**All fourteen legacy root URLs, one hop to 200, checked 25 August 2026:**

| Legacy URL | Hops | Final | Code |
|---|---|---|---|
| `/dewan-kahwin/` | 1 | `/artikel/idea-dan-nasihat/dewan-kahwin` | 200 |
| `/sewa-dewan-kahwin/` | 1 | `/artikel/idea-dan-nasihat/sewa-dewan-kahwin` | 200 |
| `/majlis-kahwin/` | 1 | `/artikel/idea-dan-nasihat/majlis-kahwin` | 200 |
| `/garden-wedding/` | 1 | `/artikel/idea-dan-nasihat/garden-wedding` | 200 |
| `/pelamin-kahwin-dewan/` | 1 | `/artikel/idea-dan-nasihat/pelamin-kahwin-dewan` | 200 |
| `/cara-buat-kad-kahwin-digital/` | 1 | `/artikel/idea-dan-nasihat/cara-buat-kad-kahwin-digital` | 200 |
| `/kursus-kahwin/` | 1 | `/artikel/idea-dan-nasihat/kursus-kahwin` | 200 |
| `/hadiah-untuk-pengantin/` | 1 | `/artikel/idea-dan-nasihat/hadiah-untuk-pengantin` | 200 |
| `/tempat-honeymoon-di-malaysia/` | 1 | `/artikel/idea-dan-nasihat/tempat-honeymoon-di-malaysia` | 200 |
| `/wedding-planner-terbaik-di-malaysia/` | 1 | `/artikel/idea-dan-nasihat/wedding-planner-terbaik-di-malaysia` | 200 |
| `/goodies-kahwin/` | 1 | `/artikel/hiasan-dekorasi/goodies-kahwin` | 200 |
| `/hantaran-tunang/` | 1 | `/artikel/hiasan-dekorasi/hantaran-tunang` | 200 |
| `/hantaran-kahwin/` | 1 | `/artikel/hiasan-dekorasi/hantaran-kahwin` | 200 |
| `/lokasi-pre-wedding-photoshoot-terbaik/` | 1 | `/artikel/fotografi-videografi/lokasi-pre-wedding-photoshoot-terbaik` | 200 |

**No chain is possible through the existing configuration, and here is why.**
The `redirects` table is consulted only on the 404 path, after the article
lookup fails. A re-parented article never 404s on its old category path — the
mismatch guard catches it first — so no stored row is ever reached. The
middleware's pattern redirects (`src/lib/redirects/patterns.ts`) only rewrite
`/category/…`, `/tag/…` and archive shapes into category hubs; none of them
produces an article path. There is no surface on which two hops can form.

**One thing engineering must know before Wave B runs.** The admin editor writes
its automatic redirect only when the *slug* changes:
`src/app/(admin)/admin/inspire/[article-id]/edit/actions.ts:302` guards on
`current.slug !== newSlug`. A category-only change therefore writes no row and
leaves no entry in the article's redirect history. That is correct behaviour —
no row is needed — but it means the move leaves no audit trail in the redirect
table. Whoever runs Wave B should record it in the work-done log instead.

---

## 3. The twelve, named, with what each one is actually worth

The CEO's list has thirteen. `mas-kahwin-ikut-negeri` is already done (moved
24 August, `aug-24-2026-done-publish-the-eight.md` §2.3), so twelve remain. I
have added `lokasi-pre-wedding-photoshoot-terbaik`, which the list omitted and
which belongs in the same conversation, making fourteen rows below.

**Source:** Google Search Console API, property `https://hellokahwin.com/`,
28 days 2026-07-27 → 2026-08-23, pulled 25 August 2026. Site totals for that
window: **37 clicks, 2,298 impressions.** Each row unions the legacy root URL
and the current `/artikel/` path, per the standing measurement rule.

| # | Article | Current URL | Proposed URL | Cluster | Clicks | Impr. | % of site impr. | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | dewan kahwin | `/artikel/idea-dan-nasihat/dewan-kahwin` | `/artikel/venue-perancangan/dewan-kahwin` | P6 · C6.1 | **28** | **1,009** | 43.9% | **Wave B** |
| 2 | garden wedding | `/artikel/idea-dan-nasihat/garden-wedding` | `/artikel/venue-perancangan/garden-wedding` | P6 · C6.1 | 4 | 856 | 37.2% | **Wave B**, with the rewrite |
| 3 | hantaran tunang | `/artikel/hiasan-dekorasi/hantaran-tunang` | unchanged | P2 · C2.2 | 0 | 7 | 0.3% | **Wave A** |
| 4 | goodies kahwin | `/artikel/hiasan-dekorasi/goodies-kahwin` | unchanged | P5 · C5.4 | 1 | 7 | 0.3% | **Wave A** |
| 5 | pelamin kahwin dewan | `/artikel/idea-dan-nasihat/pelamin-kahwin-dewan` | unchanged | P5 · C5.1 | 0 | 3 | 0.1% | **Wave A** |
| 6 | hantaran kahwin | `/artikel/hiasan-dekorasi/hantaran-kahwin` | unchanged | P2 · C2.1 | 0 | 2 | 0.1% | **Wave A** |
| 7 | kursus kahwin | `/artikel/idea-dan-nasihat/kursus-kahwin` | unchanged | P1 · C1.3 | 0 | 1 | 0.0% | **Wave A** |
| 8 | cara buat kad kahwin digital | `/artikel/idea-dan-nasihat/cara-buat-kad-kahwin-digital` | unchanged | P5 · C5.2 | 0 | 0 | 0.0% | **Wave A** |
| 9 | hadiah untuk pengantin | `/artikel/idea-dan-nasihat/hadiah-untuk-pengantin` | unchanged | P5 · C5.4 | 0 | 0 | 0.0% | **Wave A** |
| 10 | sewa dewan kahwin | `/artikel/idea-dan-nasihat/sewa-dewan-kahwin` | — | — | 1 | 2 | 0.1% | **Declined — merge instead** |
| 11 | majlis kahwin | `/artikel/idea-dan-nasihat/majlis-kahwin` | — | — | 1 | 15 | 0.7% | **Declined — merge instead** |
| 12 | tempat honeymoon di malaysia | `/artikel/idea-dan-nasihat/tempat-honeymoon-di-malaysia` | — | — | 0 | 1 | 0.0% | **Declined — outside the map** |
| 13 | wedding planner terbaik di malaysia | `/artikel/idea-dan-nasihat/wedding-planner-terbaik-di-malaysia` | — | — | 0 | 0 | 0.0% | **Declined — outside the map** |
| 14 | lokasi pre-wedding photoshoot | `/artikel/fotografi-videografi/lokasi-pre-wedding-photoshoot-terbaik` | — | — | 0 | 0 | 0.0% | **Declined — outside the map** |
| | **All fourteen** | | | | **35** | **1,903** | **82.8%** | |

*(Already done: `mas-kahwin-ikut-negeri`, moved to `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri` on 24 August. Union exposure at the time of the move: 344 impressions at average position 12.6.)*

Note that Wave A's seven articles carry **1 click and 20 impressions** —
**2.7% of the site's clicks and 0.9% of its impressions**. Even if a Wave A
move went wrong in every way, the loss would not clear the noise floor of a
site earning one click a day.

### 3.1 What the two big pages are really ranking for

The brief called `/dewan-kahwin/` a live ranking signal, and it is. It is not
the signal it looks like.

**`/dewan-kahwin/`** — 28 clicks, 1,009 impressions, average position 9.4
(28 days to 23 Aug). Query breakdown, same window, same source:

| Query | Clicks | Impr. | Position |
|---|---|---|---|
| pusat komuniti setiawangsa | 0 | 202 | 9.6 |
| dewan komuniti setiawangsa | 0 | 96 | 9.0 |
| dewan kahwin murah | 0 | 5 | 6.2 |
| dewan setiawangsa au2 | 0 | 5 | 5.4 |
| harga sewa dewan kahwin | **1** | 3 | 1.0 |
| *36 named queries in total* | **1** | **368** | |

**Two-thirds of this page's impressions cannot be read at all, and of the third
that can, 81% are people looking for a community hall in Setiawangsa.** Only 1
of the 28 clicks is attributable to a named query; the other 27 sit inside
Google's anonymised-query threshold, so I cannot tell you what they were for.
I am not going to guess.

Those Setiawangsa queries were investigated in full on 24 August
(`aug-24-2026-done-setiawangsa-venue-gap.md`) and the conclusion was that they
are civic-facility demand, not wedding demand — Google's own related-search
chip for the term is "pusat komuniti setiawangsa badminton". Ahrefs `my`,
25 August 2026: `pusat komuniti setiawangsa` 300/mo, KD 0, local intent, and
its own parent topic. We rank ninth for it and get nothing.

**`/garden-wedding/`** — 4 clicks, 856 impressions, average position **36.4**.
All 39 named queries are English: `garden wedding` (152 impressions, position
29.1), `garden wedding kl` (121, 49.0), `garden wedding malaysia` (118, 41.4),
`outdoor wedding venue` (23, 36.8). Zero clicks on every one of them.

This is the failure mode named in our own doctrine — an English-titled page
accumulating impressions at near-zero CTR on a Malay-first site — and the
approved cluster plan already has an answer for it. C6.1 topic 5 exists to
retarget this exact page.

---

## 4. Where I disagree with the mapping, and the data behind it

The brief invited disagreement and said the mapping was editorial judgement.
Four of the thirteen fail the cannibalisation test in our own playbook — rule
4, deduplicate on Ahrefs `parent_topic` before writing. All figures Ahrefs
Keywords Explorer, country `my`, pulled 25 August 2026.

**`sewa-dewan-kahwin` should not move into C6.1. It should be merged.**
`sewa dewan kahwin` (150/mo, KD 0) has parent topic **`dewan kahwin`** — the
same parent as the `dewan-kahwin` article. Two of our pages chasing one parent
topic is the definition of an accidental split. Moving both into one cluster
puts them side by side under a single pillar and makes the collision worse, not
better. The already-live `/artikel/venue-perancangan/harga-sewa-dewan-kahwin`
sits in the same family. **Merge `sewa-dewan-kahwin` into whichever of those
two survives, then redirect the loser.** That is a content decision with a real
redirect attached, and it is a different item from this one.

**`majlis-kahwin` should not move into C6.1 either.** `majlis kahwin` (300/mo,
KD 0) has parent topic **`checklist kahwin`** — which is the target of
`/artikel/venue-perancangan/checklist-kahwin`, published this week. Re-parenting
would place a duplicate parent topic directly next to the page that owns it.

**`garden-wedding` should move only as part of its rewrite, not before it.**
Moving the category changes the URL. Rewriting the page changes the title, the
language and the target. Both are the same intervention on the same page, and
doing them a fortnight apart makes Google re-evaluate twice for one outcome.
C6.1 topic 5 is already scoped and approved. Do it once.

**Three are outside the approved map entirely and should stay where they are.**
`tempat-honeymoon-di-malaysia` (parent topic `honeymoon malaysia`, 200/mo) —
honeymoon is not a cluster in the 26-cluster plan. `wedding-planner-terbaik-di-
malaysia` (`wedding planner malaysia`, 90/mo, KD 27, parent topic `moments`) —
low volume, English title, no cluster. `lokasi-pre-wedding-photoshoot-terbaik` —
the cluster plan explicitly rejected pre-wedding photoshoot as English-language
demand with vendor-owned SERPs and nothing underneath. Filing a page into a
pillar it does not belong to dilutes the pillar; that is the whole argument for
having pillars.

**Where the mapping is right, and I want that on the record.** The seven Wave A
articles all sit on distinct parent topics from the live articles they would
join, and three of them are named in the approved cluster plan as existing
articles to upgrade:

| Article | Parent topic | Volume | Cluster | Nearest live sibling | Its parent topic | Collision? |
|---|---|---|---|---|---|---|
| hantaran-kahwin | barang hantaran lelaki | 2,000 | C2.1 | — | — | No |
| hantaran-tunang | hantaran tunang | 4,700 | C2.2 | — | — | No |
| goodies-kahwin | doorgift kahwin | 1,500 | C5.4 | bunga-telur | bunga telur | No |
| hadiah-untuk-pengantin | hadiah kahwin | 1,600 | C5.4 | bunga-telur | bunga telur | No |
| cara-buat-kad-kahwin-digital | kad kahwin digital | 1,200 | C5.2 | contoh-kad-jemputan-kahwin | contoh kad kahwin | No |
| pelamin-kahwin-dewan | pelamin kahwin dewan | 50 | C5.1 | pelamin | wedding pelamin | No |
| kursus-kahwin | kursus kahwin | 3,500 | C1.3 | — | — | No |

`goodies kahwin` is itself the parent of `doorgift kahwin` (1,400/mo), so that
one page fronts about 2,900 searches a month and currently sits under
"Hiasan & Dekorasi" with no pillar link at all. `kursus-kahwin` fronts 3,500 a
month and holds position 1.0 on the single impression it has recorded.
`pelamin-kahwin-dewan` at 50/mo is genuinely marginal; I am including it only
because it is free.

---

## 5. The plan

### Wave A — link seven articles to their cluster. No URL change.

One row per article in `article_categories`, pointing at the cluster category
seeded on 23 August. The legacy category link stays. Nothing else changes.

| Article | Cluster category slug | Pillar |
|---|---|---|
| `hantaran-kahwin` | `hantaran-kahwin-panduan` | `hantaran-mas-kahwin` |
| `hantaran-tunang` | `hantaran-tunang-panduan` | `hantaran-mas-kahwin` |
| `goodies-kahwin` | `doorgift-bunga-telur-hadiah` | `pelamin-kad-cenderahati` |
| `hadiah-untuk-pengantin` | `doorgift-bunga-telur-hadiah` | `pelamin-kad-cenderahati` |
| `cara-buat-kad-kahwin-digital` | `kad-kahwin-jemputan` | `pelamin-kad-cenderahati` |
| `pelamin-kahwin-dewan` | `pelamin-idea` | `pelamin-kad-cenderahati` |
| `kursus-kahwin` | `kursus-kahwin-saringan-pra-nikah` | `nikah-undang-undang` |

All seven cluster hubs are live and return 200 (checked 25 August 2026).

**Run `hantaran-kahwin` alone first, as a pilot.** It carries 2 impressions, so
there is nothing to lose, and it answers the one question §1 leaves open: does
a secondary-only link render the pillar up-link and the sibling block? Confirm
in live HTML, then run the other six.

**What Wave A does not do.** It does not satisfy rule 16. Appearing on a pillar
hub is navigation, not an editorial link. Each of the seven still needs a body
link from its pillar page before it counts as properly placed, and that is a
separate editorial pass I will schedule with the writers.

### Wave B — two URL moves, gated on §6.

`dewan-kahwin` and `garden-wedding`. Both get their Wave A cluster link now,
along with the other seven; only the primary category change waits.

`garden-wedding` moves as part of the C6.1 topic 5 rewrite, not before it.

### Wave C — declined.

`sewa-dewan-kahwin` and `majlis-kahwin` go to a merge decision, not a move.
`tempat-honeymoon-di-malaysia`, `wedding-planner-terbaik-di-malaysia` and
`lokasi-pre-wedding-photoshoot-terbaik` stay where they are.

### One consequence to handle if Wave B ever grows

Ten of the fourteen sit in `idea-dan-nasihat`. If enough of them moved, that
category would empty. An empty category still returns 200 — it renders an empty
grid (`src/app/(public)/artikel/[category]/page.tsx:398` 404s only on a missing
category row) — and it drops out of the sitemap, because `sitemap.ts` filters
categories with no live articles. A 200 page with no content is a soft-404
candidate, and `/category/idea-dan-nasihat/` currently 301s into it.

Under this plan it cannot happen: Wave A moves nothing and Wave B moves two, so
`idea-dan-nasihat` keeps eight articles. Flagging it because a future decision
to move the rest would need a redirect for the category hub itself, and that is
the one redirect this whole exercise would actually require.

---

## 6. The unlock condition for Wave B

The brief asked what consolidation looks like in the data rather than in
anybody's judgement. Here it is, and here is where we actually are.

### Where we are: consolidation started on 23 August and is at 2.6%

**Source:** GSC API, daily page-level, pulled 25 August 2026.

| Date | Legacy root URLs (impr. / clicks) | `/artikel/` URLs (impr. / clicks) | New-path share |
|---|---|---|---|
| 14 Aug | 84 / 0 | 0 / 0 | 0.0% |
| 15 Aug | 82 / 0 | 0 / 0 | 0.0% |
| 16 Aug | 77 / 2 | 0 / 0 | 0.0% |
| 17 Aug | 85 / 1 | 0 / 0 | 0.0% |
| 18 Aug | 55 / 1 | 0 / 0 | 0.0% |
| 19 Aug | 82 / 0 | 0 / 0 | 0.0% |
| 20 Aug | 67 / 1 | 0 / 0 | 0.0% |
| 21 Aug — *migration* | 79 / 3 | 0 / 0 | 0.0% |
| 22 Aug | 109 / 1 | 0 / 0 | 0.0% |
| 23 Aug | 81 / 1 | **35 / 2** | **30.2%** |

**23 August is the first day any `/artikel/` URL appeared in Search Console at
all.** Two days after the migration, Google was still serving every old path.
On the third day, ten `/artikel/` paths appeared at once.

For `/dewan-kahwin/` specifically, over the 7 days to 23 August: the legacy path
took 264 impressions and 8 clicks, the new path took 7 impressions and 0 clicks
— **a 2.6% share.** That is the number Wave B is waiting on.

### The condition

For each URL in Wave B, over a trailing 7-day Search Console window, all three
must hold:

1. **The new path carries ≥80% of the pair's impressions.** Currently 2.6% for
   `/dewan-kahwin/`. This is the primary gate.
2. **The pair's total impressions per day sit within 25% of the 14-day
   pre-migration baseline.** This catches a move that consolidated cleanly and
   still lost traffic.
3. **The new path's average position is within 2.0 places of the legacy path's
   pre-migration position.**

Both baselines are measured over 7–20 August 2026, the fourteen days before the
migration (GSC, pulled 25 August 2026):

| URL | 14-day impr. | Impr./day | Acceptance band (±25%) | Position | Must hold |
|---|---|---|---|---|---|
| `/dewan-kahwin/` | 509 | 36.4 | 27.3 – 45.4 | 9.7 | 11.7 or better |
| `/garden-wedding/` | 423 | 30.2 | 22.7 – 37.8 | 37.6 | 39.6 or better |

`/garden-wedding/`'s position baseline is a formality — a page at 37.6 with
zero clicks has nothing to protect. Its real gate is the rewrite, not the
number.

Condition 1 alone would let a page pass while halving its traffic. Conditions 2
and 3 are what make it a consolidation test rather than a URL-swap test.

### The date

**First review: 8 September 2026.** That is sixteen days after the first
`/artikel/` impressions appeared, allowing for the API's two-day lag. If the
condition is not met, re-check weekly.

**8 September is a review date, not a move date.** The move happens on the
first weekly check where all three conditions hold, whenever that is. I am
deliberately not promising a week, because I have no measurement of this site's
own consolidation speed — 23 August is the only data point that exists. Google
typically resolves a 301 at this scale in two to eight weeks. **That is an
industry expectation, not a measurement of us**, and if the 8 September check
reads 40% instead of 80% the answer is to wait, not to proceed.

**A stop rule.** If the new-path share is still under 20% on 6 October 2026 —
six weeks after the first `/artikel/` impression — the problem is not
consolidation speed and someone should look for a technical cause before any
further URL moves.

---

## 7. The honest alternative: leave everything where it is

The brief asked for this argued fairly, and it deserves to be, because most of
it is right.

**The case for doing nothing.**

*Category is not a ranking factor.* Google ranks pages. There is no evidence
that a Malay word in a URL path segment moves a Malay query, and the words
already appear in the title, the H1 and the body.

*The new articles already carry the architecture.* Twenty-seven articles have
published into the seven pillars since 23 August, each with its up-link, its
cluster block and its siblings. The topical structure exists and is growing
without any legacy page in it.

*The legacy pages contribute almost nothing to move.* Eleven of thirteen carry
20 impressions between them. Reorganising pages nobody reaches is administration
dressed as strategy.

*The two that do contribute are the two we can least afford to disturb.*
`/dewan-kahwin/` is 76% of our clicks. Moving it mid-consolidation, when Google
has resolved 2.6% of the first move, means asking it to resolve to a second
destination before it has finished with the first.

*And our time buys more elsewhere.* At the rate the pillars are filling, a week
of writing produces more than a week of reorganising.

**Why I am not recommending it, in one sentence.** Because Wave A is not the
thing this argument defeats — it costs no URL change, no redirect and no
consolidation risk, and it turns seven pages that currently sit outside the
architecture into pages that link up to a pillar and sideways to their siblings,
which is the compounding mechanism the whole strategy rests on.

**What I would say if Wave A did require moving URLs.** Then the answer would
be no, at least until October. The gain would not be worth it.

**If the CEO prefers to do nothing at all**, the cost is bounded and I will say
so plainly: seven pages stay orphaned from the pillar graph, `goodies-kahwin`
keeps fronting 2,900 monthly searches with no structural link to anything, and
we revisit when the pillars are fuller. That is a defensible decision. It is
just not the one the data supports, because the price of Wave A is genuinely
zero.

---

## 8. Risks, and what each one costs

| Risk | Likelihood | Cost | Handling |
|---|---|---|---|
| A secondary-only link does not render the up-link | Low — verified in code, not in production | One wasted insert | The `hantaran-kahwin` pilot answers it before the other six run |
| Wave B disturbs `/dewan-kahwin/` mid-consolidation | Real, and the reason for §6 | Up to 28 clicks / 1,009 impressions | The three-part gate; nothing moves until it passes |
| An article appears under two categories in navigation | Certain — by design | Cosmetic; canonical stays single | Accept. `mas-kahwin-ikut-negeri` already does this today |
| Wave B leaves no audit trail in the redirect table | Certain | Traceability only | Record the move in the work-done log |
| `idea-dan-nasihat` empties and soft-404s | Not under this plan | Would need a category redirect | §5 — flagged for any future wave |
| Cold-start latency on the redirect | Observed | A 504 on a first request | `/artikel/venue-perancangan/dewan-kahwin` returned 504 once and 308 on retry, 25 Aug. Pre-existing, unrelated to this plan, worth an engineering look |

---

## 9. What this plan does not do

Nothing in it was executed. No category was changed, no `article_categories`
row was written, no redirect was created, no database was touched. Every live
check was a GET.

Wave A needs the CEO's word before anything runs. Wave B needs Wave A, the
§6 gate, and the C6.1 rewrite for `garden-wedding`.

Two items fall out of this work and belong on someone's list, not mine today:
the `sewa-dewan-kahwin` / `dewan-kahwin` / `harga-sewa-dewan-kahwin` merge, and
the `majlis-kahwin` / `checklist-kahwin` overlap. Both are content decisions
with real redirects attached.

---

## Data provenance

**Google Search Console API**, property `https://hellokahwin.com/`, service
account `hellokahwin-gsc@twn-new.iam.gserviceaccount.com`, all queries run
**25 August 2026**. Data available to **23 August 2026**; the API runs one to
two days behind.

- Site totals, 28 days 2026-07-27 → 2026-08-23: 37 clicks, 2,298 impressions
- Page-level, same window, 27 pages with data
- Page-level, 7 days 2026-08-17 → 2026-08-23: 11 clicks, 604 impressions
- Daily page-level, 2026-08-14 → 2026-08-23, for the consolidation table
- Query-level filtered to `/dewan-kahwin/` and `/garden-wedding/`, 28-day window

**Ahrefs Keywords Explorer**, country `my`, pulled **25 August 2026** — volume,
difficulty, parent topic and intent for 27 keywords across the fourteen
candidates and their live siblings.

**Live site**, read **25 August 2026** — `sitemap.xml` (74 URLs: 56 articles,
15 category pages, 3 static), redirect hop audit on all fourteen legacy root
URLs plus five wrong-category paths, cluster hub status checks, and the rendered
HTML of `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri`.

**Site repository**, `~/orca/workspaces/hellokahwin-site/pillars-ingest-redirects`,
read **25 August 2026** — `src/app/sitemap.ts`,
`src/app/(public)/artikel/[category]/[slug]/page.tsx`,
`src/app/(public)/artikel/[category]/page.tsx`, `src/app/(public)/[slug]/page.tsx`,
`src/middleware.ts`, `src/lib/redirects/{lookup,patterns,article-slug-change}.ts`,
`src/lib/inspire/pillar-queries.ts`, `src/lib/inspire/pillars.ts`,
`src/app/(admin)/admin/inspire/[article-id]/edit/actions.ts`,
`scripts/seed-pillars.ts`.

**Repository documents** — `aug-23-2026-clusters-launch-plan.md` (C1.3, C2.1,
C2.2, C5.1, C5.2, C5.4, C6.1, C6.2 and the rejection list),
`aug-24-2026-done-publish-the-eight.md` §2.3 (the `mas-kahwin-ikut-negeri`
move), `aug-24-2026-done-setiawangsa-venue-gap.md` (the Setiawangsa diagnosis),
`data/hellokahwin-export/content/posts.json` (the legacy 29 and their original
categories).
