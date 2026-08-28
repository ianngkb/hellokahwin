# DES-06 — Search and catalogue designed, and the premise it was written on measured and corrected: the search that ships answers 29% of real demand — 28 Ogos 2026
**Session:** aug-28-2026-session-01 · **Owner:** product-designer · **Status:** completed
**Plan:** [aug-28-2026-brief-des-06.md](../../plans/aug-28-2026-session-01/aug-28-2026-brief-des-06.md)

Design only. Nothing was built and no site code was touched. The build is a
separate item and has not been sized.

---

## The claim, in one line

The site does have search; it returns **zero results for 84.3% of the queries
readers actually arrive on, covering 70.9% of a month's impressions**, and this
item specifies the flows that fix it plus the catalogue decisions that go with
them, every state drawn at 360 px against the live corpus.

---

## What was done

### The specification

Full path: `C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/design/des-06-carian-katalog.html`
Live: **https://claude.ai/code/artifact/875be8c2-4d7e-4b9c-a660-154998959ab1**

Twenty screens, each drawn at exactly 360 px in the production tokens, with real
Malay copy and live article titles. Against the DoD, item by item:

| DoD requirement | Where it lives |
|---|---|
| Search entry point | §4 E1, E2 |
| Query experience | §4 Q1 typing, Q2 loading, Q3 results, Q4 exactly one |
| Results | §5 R1 many, R4 approximate |
| **NO-RESULTS** | §4 Q5 in-panel, §5 R3 full page |
| How search relates to browsing | §3.7, and the browse handoff at the foot of R1 and R3 |
| Catalogue filters | §3.5 — no filter panel, two mechanisms instead, with the reason |
| Sort | §3.6 — none, with the trigger that changes that |
| Pagination vs infinite scroll **with reasoning** | §3.4 — pagination, threshold 60, argued on crawlability / back button / return-to-position |
| Mobile-first, proved at 360 px | §4 onward; measurement below |

Beyond the DoD, because a flow whose failure states are unspecified is half a
design: F1 request failed, F2 offline, F3 no JavaScript, C3 an empty section,
C4 a one-article category, C5 pagination above the threshold, X1 the longest
real title at 95 characters in three containers, X2 the longest category label
at 38 characters, and §8 keyboard, focus order and screen-reader announcements.
§9 states what is deliberately out of scope, so the engineer does not have to
guess whether an omission was meant.

### The measurement that reframed the item

Full path: `C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/design/des-06-evidence/`

- `gsc-queries-2026-07-31-to-2026-08-27.tsv` — 248 queries, 1,823 impressions, 11 clicks
- `search-coverage-2026-08-28.tsv` — every one of those queries put through the live API, with its result count
- `corpus-2026-08-28.tsv` — all 86 articles with category and title length
- `reproduce.py` — re-runs the whole measurement against production, no credentials needed

### Documents corrected, because the premise was wrong

- `docs/boardroom/decision-log.md` — decisions **132, 133, 134** added
- `docs/sprints/sprint-03.json` — DES-06 title and `why` corrected; **the DoD is untouched**
- `docs/plans/aug-28-2026-session-01/aug-28-2026-brief-des-06.md` — correction block added above the DoD

---

## Evidence

Everything below is a number taken on 28 Ogos 2026 from production or from
Search Console, not from source I control.

### The corpus, and the two sources agree exactly

`sitemap.xml` and the fifteen rendered category pages both give **86 articles
and 15 category pages**; with `/artikel` and the homepage that is the 103 URLs
in the sitemap.

| Category | Articles | In the nav | Empty "coming soon" sections |
|---|---:|---|---|
| Hantaran & Mas Kahwin | 38 | yes | — |
| Idea dan nasihat | 10 | yes | — |
| Real Wedding | 6 | yes | — |
| Ucapan, Doa & Adab Majlis | 5 | yes | — |
| Moden Kontemporari | 4 | **no** | — |
| Nikah & Undang-undang | 4 | yes | 2 of 4 |
| Venue, Kos & Perancangan | 4 | yes | 1 of 2 |
| Busana & Penampilan Pengantin | 3 | yes | — |
| Pelamin, Kad & Cenderahati Majlis | 3 | yes | 1 of 4 |
| Sebelum Nikah: Jodoh, Merisik & Tunang | 3 | yes | 2 of 5 |
| Glamor Eksklusif | 2 | **no** | — |
| Fotografi & Videografi | 1 | **no** | — |
| Hiasan & Dekorasi | 1 | **no** | — |
| Minimalis Mewah | 1 | **no** | — |
| Pantai Santai | 1 | **no** | — |

`/artikel` links to **12 of the 86**. One category holds 44% of the corpus.
Six of fifteen categories are live and indexed but absent from the navigation.

### The search coverage measurement

```
$ python docs/design/des-06-evidence/reproduce.py
queries tested   248
request errors   0
zero results     209/248 queries (84.3%)
                 1292/1823 impressions (70.9% of real demand)

biggest zero-result queries
    185 imp  pos   9.6   pusat komuniti setiawangsa
    116 imp  pos  49.3   garden wedding kl
    116 imp  pos  41.2   garden wedding malaysia
    105 imp  pos  46.5   garden wedding kuala lumpur
    103 imp  pos   9.0   dewan komuniti setiawangsa
     35 imp  pos   6.1   mas kahwin terengganu
```

`mas kahwin terengganu` is the site's highest-clicking query: 3 of the 11 clicks
earned in those 28 days, 27% of the total. Its article exists and is titled
*"Mas kahwin Kelantan dan Terengganu 2026: tiada kadar tetap"*. The query
`terengganu` alone returns it. The phrase does not, because the matcher needs a
contiguous substring.

### The diagnosis, verified query by query against production

| Query | GSC imp. | Live result | The article that exists |
|---|---:|---:|---|
| `mas kahwin terengganu` | 35 | 0 | Mas kahwin Kelantan dan Terengganu 2026 |
| `mas kahwin pahang 2026` | 19 | 0 | Mas kahwin Pahang dan Negeri Sembilan 2026 |
| `maksud walimatul urus` | 10 | 0 | Walimatul urus: maksud, hukum dan adab jemputan |
| `doa pengantin baru rumi` | 6 | 0 | Doa pengantin baru: lafaz penuh, rumi dan maksudnya |
| `mas kahwin negeri sembilan` | 12 | 0 | Mas kahwin Pahang dan Negeri Sembilan 2026 |

Every token is present in every one of those titles. Only the order differs.

### What the proposed rule would recover, simulated

| Rule | Zero-result queries | Real demand answered |
|---|---:|---:|
| Shipped today, **measured against production** | 209 of 248 (84.3%) | **29.1%** |
| Stage 1: all tokens in title + slug | 140 (56.5%) | 51.6% |
| + stage 2: category name as a fallback field | 132 (53.2%) | 52.5% |
| + stage 3: ranked partial match, labelled approximate | 58 (23.4%) | **76.7%** |

Rows 2–4 are simulated over titles, slugs and category names only. The live
index also carries excerpts, so they understate the gain; that limit is stated
in the artifact too. The residual 23.3% is content that does not exist —
`pusat komuniti setiawangsa` alone is 185 impressions — which is a brief for
head-of-seo-content, not a search problem.

### Read out of the deployed bundle, not from source

Chunk `/_next/static/chunks/8ba930556a144518.js`, deploy `dpl_F5167dU7CpzegpfMXWnVDTB6Y8j2`:

- The `catch` branch sets results to `[]`, so **a failed request renders the
  same "Tiada hasil dijumpai" as a genuine zero-result.** A reader on a dropping
  connection is told the publication has nothing on their topic.
- `onKeyDown` handles Escape only. **Enter does nothing**; there is no `<form>`.
- No arrow-key handling and no `aria-activedescendant`: the results are
  unreachable by keyboard.
- The field's accessible name is a placeholder, which disappears on the first
  keystroke.
- `role="listbox"` is nested inside `role="listbox"`.
- The API caps at **20 results regardless of `&limit=`** (verified: `limit=100`
  returns 20) and returns **no total**, so a truthful "12 hasil" is not currently
  expressible.

### Contrast and target sizes, computed from the served stylesheet

Focus ring as shipped is `focus:ring-ring/30`, which composites to `#b7b6b4`
on `--background #fcfbfa`: **1.96:1**, under the 3:1 floor in WCAG 2.2 SC 1.4.11.
At 50% it reaches 3.44:1, at 60% 4.78:1, at full opacity 17.81:1.

Text tokens recomputed independently and they agree with decision 121 exactly:
`--foreground` 17.81:1, `--muted-foreground` 6.88:1, `--border-strong` 3.01:1.

### Proved at 360 px

Headless Chrome, the document loaded in an iframe pinned to a true 360×1200
viewport, both themes:

```
viewport               360x1200
docScrollW             360        (equal to the viewport)
horizontal overflow    False
elements overflowing   []
frame widths           {360: 20}  (all 20 artboards exactly 360 px)
content overflowing a frame  []
interactive elements under 44px   0
light theme body bg    rgb(233,236,239)
dark theme body bg     rgb(18,21,25)
```

Also rendered and inspected at 360 px as PNG in both themes. Cormorant Garamond
and IBM Plex resolve; nothing falls back silently.

### Cold-render timings, which is why F3 exists

First-request curl of the fifteen category pages: twelve returned in
0.37–1.83 s; `moden-kontemporari` **12.5 s**, `fotografi-videografi` **22.5 s**,
`minimalis-mewah` **23.5 s**. RISK-08 owns the cause. The consequence for this
design is that a search which only works after hydration sometimes does not
exist, which is what the no-JS form in F3 answers.

---

## What it changed

- **The item's premise, corrected with a number.** "No search anywhere" became
  "search that answers 29% of real demand", which is a different item with a
  different fix. Decision 132.
- **A method the company did not have.** Take the GSC query export, run every
  query through the site's own search, count the zeros. It took under an hour and
  it is now committed as a script anyone can re-run.
- **Three defects found that no one had reported**: a failed request rendering as
  a zero-result, a focus ring below the WCAG floor, and an empty state on
  `venue-perancangan` that tells readers an article is coming while six live
  articles on that exact subject sit two headings above it.
- **A decision recorded rather than left to the build**: pagination over infinite
  scroll at a 60-item threshold, argued rather than asserted, and explicitly open
  to head-of-seo-content's veto.

---

## Follow-ups

- **head-of-seo-content** — three things need your signature, all argued in §3.2,
  §3.4 and C1 of the artifact: `/cari` as `noindex,follow` and robots-disallowed;
  pagination over infinite scroll at 60 items; and the `/artikel` index change,
  which adds one inbound internal link to all 86 articles and should be read
  against the SEO-02 model. Written as proposals because DES-09 does not exist
  yet. Flagged `seo-review-required`, as the item is.
- **Whoever builds this** — three API changes gate every screen: a `total` in the
  response, an honoured `limit`/`offset`, and an error status distinguishable
  from an empty array. Without the third, F1 cannot be built and the defect that
  costs the most stays shipped.
- **head-of-seo-content (your document, edited by me)** — production doctrine
  §5.5 is new and attributed to this item. Review it or cut it; it is your
  document and I have said so in the section itself.
- **head-of-seo-content (content, not SEO review)** — the 424 impressions no
  matcher can answer are a content brief. `pusat komuniti setiawangsa` at 185 and
  `dewan komuniti setiawangsa` at 103 sit inside SEO-04's scope; the outdoor and
  garden-wedding English tail sits inside SEO-08's.
- **managing-editor** — whether an empty section should render its heading at all
  (C3), and whether the `venue-perancangan` empty state should be fixed now
  rather than waiting for the redesign. It is currently untrue.
- **creative-director** — every screen here is drawn in the tokens production
  ships today so the layout could be judged against something real. They should
  be re-rendered once DES-01/02/03 choose a direction. Nothing in the spec
  depends on the palette staying as it is.
- **Not done and not claimed**: the build. DES-06 is design only.

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**That the company had never measured a shipped feature against its own demand,
and doing it costs an hour.** Search Console tells you what people search for
before they arrive. The site's own search API is public. Joining those two — run
every real query through your own search and count the zeros — is a complete
quality audit, and it produced the number that reframed this whole item. Nothing
in the doctrine describes it. It generalises past search: the same join would
score internal linking, related-article blocks, and category naming.

**And that the same claim has now been wrong three times, in three different
directions, because nobody measured it.** Decision 76 (26 Ogos): "no search
anywhere." The CONT-09 brief the same day: "There is. It works. It is simply not
linked from the masthead." Both wrong. It exists, it is linked from the masthead
on every page, and it does not work. The second correction never reached decision
76, never reached the sprint file, and was itself an unmeasured assertion. Two
corrections in one week, neither of which touched the record the next agent
reads.

### 2. Which document must change, and who owns that edit?

Four, and I own all four because the finding is mine and every one of them is a
record another agent reads before working:

1. **`docs/boardroom/decision-log.md`** — decision 76 states the false premise and
   nothing downstream can correct it in place. **Done**: decisions 132, 133 and
   134 added, following the log's own `⚠ CORRECTION TO DECISION N` convention.
2. **`docs/sprints/sprint-03.json`** — DES-06's title and `why` carried the false
   premise into the tracker every agent reads. **Done**: both corrected, the DoD
   deliberately untouched, the correction dated and attributed.
3. **`docs/plans/aug-28-2026-session-01/aug-28-2026-brief-des-06.md`** — the brief
   I was handed. **Done**: title corrected and a dated correction block added
   above the DoD, which is left verbatim.
4. **`docs/plans/aug-23-2026-session-01/aug-23-2026-production-doctrine.md`** —
   the audit method from question 1 belongs in the doctrine, not in one design
   document. **Done**: section **5.5, "The demand-coverage audit"**, written as
   a four-step method with the numbers it produced on its first run and the rule
   it generates. My first instinct was to file it as a suggestion instead,
   because the doctrine is head-of-seo-content's document. That instinct was
   wrong and I overruled it: a method nobody can find is a method nobody runs,
   which is this company's named failure shape, and it is exactly how the
   26 Ogos correction to this same claim failed to reach anything. The section is
   dated, attributed to this seat, and opens by asking that seat to review it —
   which respects the ownership without leaving the finding somewhere it will be
   lost.

### 3. What did we do twice that we should never repeat?

**Specified a matching rule before testing it.** I wrote "token-AND over title,
excerpt and category" into the spec, then ran it against the real corpus and got
39 results for `mas kahwin` instead of 9, because every article in the Hantaran
category inherits "mas kahwin" from its category name. The rule had to be
rebuilt as three stages with the category demoted to a fallback field. Testing
first would have cost two minutes; the rewrite cost twenty. **A matching rule is
executable. Execute it before you write it down.**

**Ran 248 network calls serially, hit the two-minute timeout, and ran them again
in parallel.** Trivially avoidable.

### 4. What did we nearly ship, and what caught it?

**An accessibility specification whose own drawings broke its own rule.** §8 of
the artifact states that every interactive element is at least 44×44 px. A
headless-Chrome probe of the artifact found **26 interactive elements between 14
and 42 px tall** in my own screens — list rows at 42, chips at 38, jump-rail
links at 21. The document asserted the right thing and demonstrated the wrong
thing, which is precisely the false pass the DoD warns about: had it shipped, the
engineer would have built from the drawings, not the prose. Caught by measuring
the artifact instead of reading it. Fixed, re-probed, and the count is now zero.

**Three unverified assertions, caught by checking before publishing.** "Twelve
legacy titles carry an en dash" — the real answer is six. "No word in the corpus
exceeds the content width" — asserted from intuition, replaced with the measured
longest word (*Membatalkannya*, 14 characters). "The API returns null excerpts
for a substantial share of articles" — replaced with the counted 7 of 20.

**A promise the build cannot keep.** The offline state originally read
*"Artikel yang anda dah buka masih boleh dibaca"* — articles you have already
opened can still be read. The site ships no service worker, so that is false.
Caught on the `/humanizer` pass over the Malay copy, which is exactly the class
of thing that rule exists for. The line is now one sentence with nothing promised.

**Also nearly missed, and caught by the same instinct:** the report almost went
out claiming the shipped search dropdown has no border or shadow and merges into
the page. It does have both, `--radius-card` and `--shadow-md`. I read the
markup, assumed the visual consequence, and did not check the stylesheet until
afterwards. The three real defects survived that check; that one did not, and it
would have been the fourth item in a list where every other entry was measured.
