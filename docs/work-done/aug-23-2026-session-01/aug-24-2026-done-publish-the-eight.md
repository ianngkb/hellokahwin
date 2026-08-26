# Done: the eight C2.4 articles are published

**Brief:** `docs/plans/aug-23-2026-session-01/aug-24-2026-brief-publish-the-eight.md`
**Date:** 24 Ogos 2026 · **Target:** production
**Undo record:** `aug-24-2026-undo-publish-the-eight/` — written before the first write.

**Outcome:** all eight published. The P2 pillar has dropped `noindex`. The
sitemap has risen from 39 URLs to 47. A1 was updated in place, not duplicated,
and kept its slug, its id and its November 2025 publication date.

---

## 1. What was done

Eight editorial deliverable documents were converted to the ingest file format
and written to production through `scripts/ingest-article.mts`. Not a sentence of
the reviewed prose was rewritten. The two changes to article text are §4 below,
and both were specified by the board before this run.

| | Article | Slug | URL |
|---|---|---|---|
| A1 | Mas kahwin ikut negeri 2026 | `mas-kahwin-ikut-negeri` | `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri` |
| A2 | Maksud mas kahwin | `apa-itu-mas-kahwin` | `/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin` |
| A3 | Mas kahwin Johor 2026 | `mas-kahwin-johor` | `/artikel/hantaran-mas-kahwin/mas-kahwin-johor` |
| A4 | Mas kahwin Kelantan dan Terengganu 2026 | `mas-kahwin-kelantan-terengganu` | `/artikel/hantaran-mas-kahwin/mas-kahwin-kelantan-terengganu` |
| A5 | Mas kahwin Perak 2026 | `mas-kahwin-perak` | `/artikel/hantaran-mas-kahwin/mas-kahwin-perak` |
| A6 | Mas kahwin Pahang dan Negeri Sembilan 2026 | `mas-kahwin-pahang-negeri-sembilan` | `/artikel/hantaran-mas-kahwin/mas-kahwin-pahang-negeri-sembilan` |
| A7 | Mas kahwin Sabah dan Sarawak 2026 | `mas-kahwin-sabah-sarawak` | `/artikel/hantaran-mas-kahwin/mas-kahwin-sabah-sarawak` |
| A8 | Bolehkah mas kahwin melebihi kadar minimum negeri? | `mas-kahwin-melebihi-kadar-minimum` | `/artikel/hantaran-mas-kahwin/mas-kahwin-melebihi-kadar-minimum` |

All eight: pillar P2, cluster C2.4, author `hellokahwin-editorial`,
`authorship: ai`, `review_status: pending_review`, cover `licenseClass G`,
licensor HelloKahwin, credit `Grafik: HelloKahwin`, board-approved alt text
verbatim. Ten `*[IMEJ n di sini]*` markers cut, as ruled.

Ingest bundle, reviewable and re-runnable:
`docs/plans/aug-23-2026-session-01/drafts/ingest/`.

---

## 2. Three things the brief got wrong, and what was done instead

### 2.1 The rendered covers in the drafts folder were the set the board BLOCKED

The brief said the eight covers were rendered and to re-run the generator into
the drafts directory. The generator renders **two** sets, because two approved
documents disagree, and it deliberately refuses to choose:

- `figures` — the generator brief's state-figure covers, every card carrying
  ringgit figures. Files `A1-…-cover.png`.
- `kad-tajuk` — the Editorial Review Board's data-free title cards, ruling 1,
  24 Ogos 2026: *"No cover in this batch carries a ringgit figure."*
  Files `<slug>-kad-tajuk.png`.

The files already sitting in the drafts folder were the **`figures`** set. Taking
"the eight cover images are rendered" at face value would have published eight
covers the board blocked on accuracy — including the Perak card asserting a rate
over an article whose H1 says none exists (HK-C-0005, a sustained BLOCK).

**Published: the `kad-tajuk` set.** Both sets were re-rendered so the contact
sheet still shows the CEO the side-by-side comparison the script exists to give.

### 2.2 The alt-text document the brief points at does not contain the alt text

The brief cites `aug-24-2026-done-asset-register-and-graphic-kit-spec.md`. That
document says, in its own "What I did not do": *"Did not write the eight covers'
alt text or captions."*

The approved strings are in
**`aug-24-2026-done-board-c24-cover-alt-text.md`**, ruling 3. Those were used,
verbatim, and they match `scripts/covers/c2-4-kad-tajuk-specs.mts` exactly.

### 2.3 A1's URL does change — and that is the correct outcome

The brief asked for two things that cannot both hold: re-parent A1 into P2 · C2.4,
and leave its URL unchanged. Article URLs are `/artikel/{categorySlug}/{slug}`,
so re-parenting necessarily moves the path.

| | Before | After |
|---|---|---|
| canonical URL | `/artikel/idea-dan-nasihat/mas-kahwin-ikut-negeri` | `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri` |
| slug | `mas-kahwin-ikut-negeri` | unchanged |
| article id | `b1484478-…` | unchanged |
| `published_at` | 2025-11-23 | unchanged |

**The ranking signal is not abandoned**, which was the brief's actual concern.
Three things carry it:

1. The article route compares the requested category with the article's own and
   issues a permanent redirect when they differ
   (`src/app/(public)/artikel/[category]/[slug]/page.tsx:503`), so the old path
   still resolves.
2. The legacy root permalink `/mas-kahwin-ikut-negeri` — the URL actually
   ranking at position 11–14 — still 308s, now to the new canonical.
3. One page, not two. The slug every external link uses is untouched.

Proof of all three is in §5.

---

## 3. A defect found and fixed before publishing: every cross-link was dead

The eight drafts write their sibling links as `/artikel/{article-slug}`, taken
from their own deliverable headers. **That path is a hard 404** — it resolves to
the category-hub route with the article's slug as the category. Measured before
the run:

```
/artikel/mas-kahwin-ikut-negeri   404
/artikel/apa-itu-mas-kahwin       404
```

Thirty links across the eight articles, on the pages whose entire architectural
purpose is internal linking.

**Ingest would not have caught it.** `bodyInternalLinks` validates three-segment
`/artikel/{cat}/{slug}` paths and one-segment `/{slug}` root permalinks. A
two-segment `/artikel/{x}` is treated as a category hub and skipped — so all
thirty would have published as dead links, silently, with the run reporting
"all resolved".

**Fixed by rewriting the href only** — `/artikel/{slug}` →
`/artikel/hantaran-mas-kahwin/{slug}` for the eight cluster slugs. Anchor text
untouched. `/artikel/hantaran-mas-kahwin` is the pillar hub and is already
correct; it was left alone.

**This is worth a follow-up in the parser**, because the blind spot is still
there for the next cluster: `bodyInternalLinks` should refuse a two-segment
`/artikel/{x}` whose `x` matches no category, rather than assume it is a hub.

### The consequence: the ingest had to run in two passes

Once the links were correct they became visible to the validator, which requires
every link target to be **already published**. The eight cross-link in a cycle
(A2 → A8 → A6 → A4 → … and back), so no single order satisfies it.

- **Pass 1**, order A2, A8, A6, A4, A3, A5, A7, A1 — each article published with
  links to not-yet-published siblings rendered as plain text. Three articles
  needed this: A2 (one link), A8 (one), A6 (one).
- **Pass 2** — those three re-ingested with `--update` once every target was live.

Final state carries every link. Eleven ingest runs, each one dry-run first.

---

## 4. What changed in A3 and A4

Both edits were specified by the board in kit spec §0.1 before this run, and both
replace a cut image marker with the table that marker was going to render. Every
fact in both tables is already in that article's prose or in its own
board-approved `## IMAGE NOTES` block. No new claim, no new source, no figure
that was not already on the page.

**A3 `mas-kahwin-johor`** — a five-row dated table added at the end of the H3
*Dari mana datangnya angka RM22.50?*, per §0.1 (*"The chronology is in the prose
but split across three H2s. A table makes it one object"*). Rows: 1935,
2019/2020, 2022, Mac 2024, Ogos 2026, each with what was recorded and its source.
The IMEJ 1 marker was cut.

**A4 `mas-kahwin-kelantan-terengganu`** — a four-row two-column table placed
exactly where the IMEJ 1 marker sat, per §0.1 (*"The contrast is stated in prose
but never assembled side by side"*). Rows: kadar minimum, sumber, tarikh, fi
nikah utama, Kelantan against Terengganu.

Both are new published content and, per §0.1, **both should go back through the
board.** They have not.

---

## 5. Proof

Published 15:45–15:47 UTC. The 300s edge window was waited out; every request
below is the **first** request to that URL afterwards, at 15:51:56 UTC. No crawl
was invited and nothing was submitted to Search Console.

### The eight article URLs

```
mas-kahwin-ikut-negeri               HTTP 200  5.850s
apa-itu-mas-kahwin                   HTTP 200  0.107s
mas-kahwin-johor                     HTTP 200  0.099s
mas-kahwin-kelantan-terengganu       HTTP 200  4.069s
mas-kahwin-perak                     HTTP 200  0.118s
mas-kahwin-pahang-negeri-sembilan    HTTP 200  4.067s
mas-kahwin-sabah-sarawak             HTTP 200  4.057s
mas-kahwin-melebihi-kadar-minimum    HTTP 200  3.990s
```

All eight render their full body, their `kad-tajuk` cover and their JSON-LD:

```
slug                                cover tables jsonld body words
mas-kahwin-ikut-negeri                1     1      1     2021
apa-itu-mas-kahwin                    1     3      1     2568
mas-kahwin-johor                      1     1      1     1262   <- incl. the new table
mas-kahwin-kelantan-terengganu        1     3      1     1382   <- incl. the new table
mas-kahwin-perak                      1     1      1     1186
mas-kahwin-pahang-negeri-sembilan     1     1      1     1381
mas-kahwin-sabah-sarawak              1     3      1     1294
mas-kahwin-melebihi-kadar-minimum     1     0      1     1086
```

### `/artikel/hantaran-mas-kahwin` — the outcome that matters

```
status:       HTTP 200
robots meta:  (no robots meta emitted)
noindex:      GONE          <- was `noindex, follow` before this run
articles listed on the pillar page: 8
```

All eight appear under their cluster on the pillar page.

### Sitemap

```
before:  39 URLs
after:   47 URLs   (+8: the seven new articles and the P2 pillar)
```

The pillar itself entered the sitemap because `hasLiveArticles` now returns true
for P2 — it had nothing beneath it before.

### A1 — unchanged where it counts, redirected where it moved

```
/mas-kahwin-ikut-negeri                             308 -> /artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri
/artikel/idea-dan-nasihat/mas-kahwin-ikut-negeri    308 -> /artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri
/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri 200
```

Both old paths — including the legacy root permalink that carries the position
11–14 ranking — resolve with a permanent redirect to the one new canonical.

Content updated, identity preserved:

```
h1:            Mas kahwin ikut negeri 2026: kadar minimum setiap negeri
old title:     absent ("Paling Tinggi" -> 0 matches)
article id:    b1484478-a5b5-44ce-85c2-10f2c2a32d0c   (unchanged)
JSON-LD datePublished:  2025-11-23T21:56:36.000Z      (unchanged)
JSON-LD dateModified:   2026-08-24T15:45:54.751Z
JSON-LD url:            .../artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri
body cross-links:       5 distinct 3-segment URLs, all resolving
published articles:     29 -> 36
```

---

## 5a. REFUSED — and it is the biggest thing on this page

**Every article page on the site serves the site-wide default `<title>` and
`<meta name="description">`, and emits no canonical and no Open Graph tags.**

```
/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri   (published tonight)
/artikel/hantaran-mas-kahwin/mas-kahwin-johor         (published tonight)
/artikel/idea-dan-nasihat/majlis-kahwin               (WordPress migration)
/artikel/glamor-eksklusif/amankila-bali               (WordPress migration)
  -> all four:  <title>HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia</title>
                <meta name="description" content="Idea, tips dan panduan …">
                no rel=canonical, no og:*, 4 meta tags total
```

**This is pre-existing and site-wide — it is not caused by this run.** The
migrated articles have behaved this way since 21 August. It is reported here
because eight pages went live tonight for the express purpose of being found in
search, and right now none of them tells Google its own title.

**It is specific to the article route.** The pillar page one level up is fine:

```
/artikel/hantaran-mas-kahwin
  -> <title>Hantaran &amp; Mas Kahwin | Inspire | HelloKahwin</title>
     <meta name="description" content="Artikel Hantaran &amp; Mas Kahwin di HelloKahwin.">
```

**Prime suspect**, `src/app/(public)/artikel/[category]/[slug]/page.tsx:391`:

```ts
try {
  pageData = await withDeadline(getArticlePageData(slug), 1_500, `inspire-article-meta:${slug}`);
} catch {
  return {};                     // <- silently falls back to the root layout's metadata
}
```

A 1.5s deadline on the metadata query, and on timeout an empty object — which
Next resolves to the root layout's title and description. Cold article renders
measured 4.0–5.9s tonight against the `ap-southeast-1` pooler, so a 1.5s budget
timing out routinely is consistent with what is served. **Not proven**: the route
is `revalidate = false`, so its HTML is fully cached and a query string does not
force a fresh render — the mechanism cannot be isolated from outside. It needs
someone with logs.

What still reaches Google, so this is a degradation and not a blackout: the H1 is
correct, and the JSON-LD `Article` block carries the right `headline`,
`description`, `url`, `datePublished` and `dateModified` on every one of the
eight.

**Recommendation: fix this before inviting any crawl.** Submitting eight URLs
whose title tag is the homepage's invites exactly the Crawled-not-indexed
outcome the code comment two lines above it says was already fought once.

---

## 6. Notes and things left open

**The render gate was satisfied, not skipped.** The board's standing rule was
*"nothing ingests until one real card has been rendered and all four crops
inspected."* One card (`mas-kahwin-ikut-negeri-kad-tajuk.png`, 2464 × 3080) was
put through `processSmartCrops` and all four crops — `crop-16x9-og`,
`crop-4x3-article-card`, `crop-4x5-mobile-cover`, `crop-4.3x1-desktop-hero` —
were cut and looked at before the first ingest. Nothing clipped, the 700px safe
area intact in all four, no ringgit figure on the card. The four probe objects
that run wrote to R2 under `gate/` were deleted afterwards.

**`content` is stored double-encoded by ingest.** Ingest writes
`${JSON.stringify(content)}::jsonb`, and the eight rows land with
`jsonb_typeof(content) = 'string'`; the 29 migrated articles hold `'object'`.
**No user-visible impact and no action taken:** Drizzle returns an identical
parsed object for both, `extractTextContent` works, the pages render. It matters
only to SQL that reaches into the column — `content->'content'` returns null on
these eight — and nothing in the codebase does that today. Flagged so the next
person writing a JSONB query or index on `content` does not lose an afternoon.

**A1 keeps its two legacy WordPress categories** (`idea-dan-nasihat`,
`perancangan`). Ingest only reconciles categories carrying a `pillar_code`,
deliberately. A1 therefore still appears in the `idea-dan-nasihat` hub listing.
That is the ingest script's existing design decision, not a choice made here.

**Carried forward, unchanged from the board's own list:**

- The A1 state-comparison card, the cluster's only entry into a position-1 image
  pack. Still unbuilt.
- A7's H1 suffix needs its own board slot.
- `Disemak Ogos 2026` is baked into eight PNGs and eight alt strings. Book
  "regenerate eight covers" into the January 2027 refresh.
- No crawl was invited. Nothing was submitted to Search Console.
