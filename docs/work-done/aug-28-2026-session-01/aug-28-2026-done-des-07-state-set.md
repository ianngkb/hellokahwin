# DES-07 — The state set: 39 screens across five surfaces, and the two findings that make the redesign urgent — 28 Ogos 2026
**Session:** aug-28-2026-session-01 · **Owner:** product-designer · **Status:** completed
**Plan:** [aug-28-2026-brief-des-07.md](../../plans/aug-28-2026-session-01/aug-28-2026-brief-des-07.md)

Design only. Nothing was built and no site code was touched. The build is a
separate item and has not been sized.

---

## The claim, in one line

Every state of every surface in the redesign is specified visually at 360 px
against the real Malay corpus — **39 screens across 5 surfaces**, all 40 cells of
the DoD's state matrix — and the measurement that produced them found that
**57 of the site's 86 headlines (66%) are silently truncated** in the card
production puts them in on a phone, and that **the 404 page renders zero
characters** of anything until JavaScript runs.

---

## What was done

### The specification

Full path: `C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/design/des-07-set-keadaan.html`
Live: **https://claude.ai/code/artifact/18d57f93-6110-4f41-a3e0-e99d2fdca383**

Twenty-seven artboards, each exactly 360 px, carrying 39 badged screens in the
production tokens with real Malay content taken from the live site. Against the
DoD, cell by cell:

| | Chrome | Homepage | Catalogue | Article | Not-found |
|---|---|---|---|---|---|
| Default | C1 | H1 | K1 | A1 | E2 |
| Loading | C3 | H2 | K2 | A2 | C3 |
| Empty | C2 | H3 | K3 K4 K5 | A3 | E2 |
| Error | C3 | H4 | K6 | A4 | E4 E5 |
| Too few | C2 | H5 | K7 | A5 | — |
| Too many | C2 | H6 | K8 K9 | A6 | — |
| Slow / no-JS | C6 | H7 | K10 | A7 | E1 |
| Longest Malay | C5 | H8 | K11 | A8 A9 | §9 |

The DoD names three page types. This document specifies **five surfaces**,
because the three are each wrapped in shared chrome and each links to a
not-found screen that belongs to none of them — which is how that screen came to
ship blank without anyone owning it.

§3 states nine rules that generate the set, each naming the option it rejected,
so a state I did not draw can be derived rather than invented. §10 specifies
keyboard paths, focus moves, live-region announcements and target sizes. §11
states what is deliberately out of scope.

### The measurement

Full path: `C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/design/des-07-evidence/`

- `reproduce.py` — fetches the sitemap, 15 categories, 86 articles, the error surfaces and the served stylesheet; prints the whole §2 findings table. No credentials.
- `probe.mjs` — drives headless Chrome at a true 360×1200 viewport for the numbers that need a layout engine.
- `corpus-2026-08-28.tsv` — 86 articles with title length, heading counts, body size, related count, gallery size.
- `categories-2026-08-28.tsv` — 15 categories with template, item counts and empty-section counts.
- `404-nojs-360.png` — the blank 404 with scripting disabled, 2,689 bytes.

---

## Evidence

Every number below was taken on 28 Ogos 2026 from the served page or the served
stylesheet, on deploy `dpl_CV6piQmHcTjeP1p5nSmH3tffd4MS`. Both scripts were run
end to end after the document was written, and two figures in the draft
disagreed with them and were corrected to match — see the retrospective.

### The truncation, measured inside the live card box

```
$ node probe.mjs
corpus: 86 titles from 86 articles

truncation in the shipped card box
  box 156px  17px/21.42px  clamp 3  Georgia, "Times New Roman", Times, serif
  Georgia (what ships)       57 of 86 cut (66%), worst 6 lines
  generic serif (Android)    31 of 86 cut (36%), worst 5 lines
  by container width: {"156px":{"cut":57},"236px":{"cut":5},"328px":{"cut":0}}
  longest title 95 chars -> 49 visible, 46 lost
  reader sees: "20 Lokasi Terbaik Pre Wedding Photoshoot di Malay"
```

**The titles are not too long; the column is too narrow.** At 328 px every one
of the 86 fits in three lines with nothing clamped. That single table decided
the layout in every catalogue and homepage screen in the document.

It also shows the truncation rate is not a property of the site: it is 66% under
Georgia and 36% under the generic serif, because **the site ships no webfont at
all** — zero `@font-face` rules, zero `woff2` references, `document.fonts` empty,
and `--font-cormorant` computing to `Georgia,"Times New Roman",Times,serif`.

### The chrome

```
  rail: {"links":9,"scrollW":2130,"clientW":360,"hidden":1770,"pctHidden":83}
  breadcrumb: {"text":"Sebelum Nikah: Jodoh, Merisik & Tunang","chars":38,
               "given":200,"needed":260,"truncated":true,"maxWidth":"200px"}
  webfonts: {"loaded":0,"status":"loaded",
             "serifResolvesTo":"Georgia,\"Times New Roman\",Times,serif"}
  first headline at y=676px
  empty-section copy: ["Artikel untuk merisik akan datang tidak lama lagi.",
                       "Artikel untuk mandi bunga akan datang tidak lama lagi."]
```

The category rail is 2,130 px wide inside a 360 px window — 83% of the site's
only navigation is off-screen — and it lists 9 of the 15 categories that exist.

### The loading state, which does not exist

```
navigation feedback after tapping a category link
  sampled for 2797 ms: url changed false, content changed false,
                       any loading indicator false
```

Sampled every 220 ms after a tap: at 2,790 ms the URL, the content, the opacity
and the absence of any spinner, progress bar or `aria-busy` are exactly as they
were before the tap. Nothing on screen says the tap registered. No skeleton
markup appears in any of the 103 server-rendered pages.

That silence is not brief:

```
first-request render time, slowest five
   25.88s  /artikel/glamor-eksklusif
   22.25s  /artikel/hantaran-mas-kahwin/mas-kahwin-perak
   21.99s  /artikel/real-wedding/yasaka-shrine
   21.93s  /artikel/ucapan-doa/walimatul-urus
   21.91s  /artikel/moden-kontemporari/marriott-putrajaya
```

RISK-08 owns the cause. The consequence for this item is that an unacknowledged
tap lasts as long as the render does.

### The 404, which is the worst thing in the document

```
404 body
  scripting OFF: <main> present false, 0 characters
  scripting ON : <main> present true, 131 characters
                 "404 Halaman tidak dijumpai Maaf, halaman yang anda cari tiad"
```

The `<body>` of every 404 the site serves contains one empty hidden `div`. No
`<main>`, no header, no footer, no message, no link. The design exists only in
the client payload. And it is not a flicker: `/cari?q=mas+kahwin` — the results
URL DES-06 specifies, not built yet — **returned its empty 404 after 23.79
seconds**. That is 23.79 seconds of blank white screen for a reader who tapped
search.

Contrast with the three real page types, measured the same way with scripting
disabled: homepage 1,343 characters of `<main>`, catalogue 1,584, article
10,318. All three render fully from the server. Only the error surface does not.

### The rest, from `reproduce.py`

```
category templates: 8 grid, 7 cluster
empty "akan datang" sections: 6
categories in the nav: 9 of 15
homepage: 13 items, 13 of them from 'hantaran-mas-kahwin' (1 distinct categories)
articles with two <h1>: 86 of 86
articles with no related block: 4
articles over 4000 chars with no contents list: 12
longest title: 95 chars
longest body: 25955 chars   shortest body: 616 chars
pages shipping any skeleton markup: 0 of 103
@font-face rules in the served stylesheet: 0
```

Three of those deserve a sentence each:

- **The entire front page is one subject.** Hero plus all twelve cards come from
  Hantaran & Mas Kahwin; the same 21-character eyebrow is printed 13 times.
- **The contents list fires on heading count, not length.** Twelve articles over
  4,000 characters ship without one — including the site's longest at 25,955
  characters and every `mas-kahwin-*` page, which is where DES-06 measured the
  clicks are.
- **One sentence is used for two different situations and is false in one.**
  `?sub=bertema` on Real Wedding returns "Artikel real wedding akan datang tidak
  lama lagi" on a category holding 14 published articles.

### The error boundary, measured in the page's own context

Rendered inside `.hk-public`, the shipped boundary's retry button is **40 px
tall** against the 44 px the site's own `.hk-btn` holds everywhere else, with a
fully-rounded pill radius on a site whose every other control is square. Its
`font-bold` is dead code: `.hk-public h1` forces weight 400.

### The artifact, probed rather than read

Loaded in an iframe pinned to a true 360×1200 viewport:

```
viewport 360 x 1200 | overflow False | frames {'n': 27, 'widths': [360]}
overflowing viewport [] | overflowing a frame []
controls under 44px 0 of 140 | screens 39
```

All 27 artboards exactly 360 px, no horizontal overflow, no content escaping a
frame, zero drawn controls under 44 px, all 39 screens present. Checked in both
themes and at 1,180 px: the document zone flips light/dark correctly, the screen
zone stays light because the public site ships light only, which the CSS says in
a comment so it reads as a decision rather than an omission.

---

## What it changed

- **A layout decision settled by measurement instead of taste.** Two columns at
  360 px cuts 66% of the corpus; one column cuts none. The same 86 titles, three
  container widths, one table.
- **A defect nobody had reported, on the screen readers hit when things are
  already wrong.** The 404 has been shipping zero server-rendered characters, and
  on a cold route that is 23.79 seconds of white.
- **The false empty-state copy identified with its counter-example.** "Akan
  datang tidak lama lagi" on a category with 14 published articles.
- **Three shipped defects with numbers attached**: an error screen in a visual
  language used nowhere else with a 40 px control; a 2,130 px navigation rail
  83% off-screen; a breadcrumb that cuts the longest category name at 200 of the
  260 px it needs.
- **A fifth surface named.** The not-found and error screen belongs to no page
  type, which is exactly why it shipped blank.

---

## Follow-ups

- **creative-director** — DES-03's DoD names three page types. It must add the
  not-found and error surface; §11.2 lists the 5 states it has to carry, and the
  39 states across all five surfaces as its checklist. **The two-way cross-check
  the DES-07 DoD requires is owed and cannot run until DES-03 exists** — see the
  next section, this is flagged as a dependency, not a narrowing.
- **design-systems-engineer** — six components carry every state here: row, empty
  block, error block, chip-with-count, loading bar, image placeholder. The empty
  and error blocks must be distinguishable at a glance. The error boundary needs
  rebuilding in the site's own vocabulary (E3 → E4), and the focus ring at 1.96:1
  is still under the WCAG floor.
- **Whoever builds this** — three hard dependencies. An API error status
  distinguishable from an empty array, or K6, A4 and DES-06's F1 cannot exist.
  Category counts available at render time, or the counts throughout C1, C2, K1,
  K5, K7, K9 and E2 cannot be printed. And a server-rendered 404.
- **managing-editor** — two copy calls are yours: whether an empty section should
  render its heading at all, and whether the "akan datang" lines should be
  corrected now rather than waiting for DES-08, given one of them is currently
  untrue.
- **head-of-seo-content** — H6's diversity rule changes which articles the
  homepage links to, so it should be read against the SEO-02 model. Separately,
  the twelve articles over 4,000 characters with no contents list are all the
  `mas-kahwin-*` pages, which is where the clicks are.
- **ceo-hellokahwin** — the site ships no webfont. DES-01 recommends one. Until
  it ships, the truncation rate moves between 66% and 36% depending on the
  reader's device.
- **Not done and not claimed**: the build; a real-device check of the Android
  serif fallback (the 36% figure is a Chrome-on-Windows proxy, and the artifact
  says so); and the DES-03 cross-check.

### The one part of the DoD that could not be completed, stated plainly

The DoD says: *CHECKED BY: Cross-check against the three page types in DES-03.
Any state present in neither document is a gap.* **DES-03 does not exist.** It
is `todo` in `docs/sprints/sprint-03.json`, blocked by DES-02, which is blocked
by DES-01's owner-approval gate — verified 28 Ogos 2026.

I did not rewrite the DoD to match what I could reach. What I did instead: ran
the check one way, against DES-03's stated page types and against production;
published the 40-cell matrix; and wrote §11.2 as the binding checklist DES-03
must satisfy, with the fifth surface its own DoD is missing. **The other
direction is owed and is handed to `creative-director` above.**

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**That the layout was tuned to a font the site does not ship, and that nobody had
measured the corpus against the box it goes in.** The site has zero `@font-face`
rules; every serif is whatever the device supplies. So the same 86 titles in the
same 156 px card truncate at 66% on a laptop and 36% on a phone, and neither
number was known. The general lesson is not about fonts: **a text container is a
measurement, not a design choice, and the measurement is one loop over the real
corpus inside the live box.** It took about four minutes to run and it decided
every layout in this document.

**And that "measure the corpus against its container" generalises the same way
DES-06's demand-coverage audit did.** DES-06 joined GSC queries to the site's own
search and counted the zeros. This item joined the corpus to the site's own
layout and counted the truncations. Both are the same move — take the real
content, put it through the real system, count the failures — and neither was in
the doctrine before this week.

**A third thing, smaller but sharp:** the states that fail worst are the ones no
page type owns. The homepage, catalogue and article all render fully without
JavaScript. The 404 — which belongs to none of them — renders nothing, and has
done so unnoticed because no item's DoD ever listed it.

### 2. Which document must change, and who owns that edit?

Two, and I own both.

1. **`docs/plans/aug-23-2026-session-01/aug-23-2026-production-doctrine.md`** —
   §5.5 is DES-06's demand-coverage audit. The corpus-fit audit is its sibling
   and belongs beside it, not buried in one design document, for exactly the
   reason DES-06 gave: a method nobody can find is a method nobody runs.
   **Done**: §5.6, "The corpus-fit audit", written as a four-step method with the
   numbers from its first run and the rule it generates.
2. **`docs/sprints/sprint-03.json`** — DES-03's DoD names three page types and no
   error surface, which is the direct cause of the blank 404 nobody owned. Its
   `brief` also needs the DES-07 cross-check named so the next agent does not have
   to rediscover that it is owed. **Done**: a dated correction added to DES-03's
   `brief`; **its DoD is untouched**, following the same rule DES-06 used — the
   finding is recorded where the next agent reads it, and the owner decides
   whether the DoD itself changes.

### 3. What did we do twice that we should never repeat?

**Trusted a viewport override instead of checking it.** The first three artifact
probes reported a 360 px measurement from a viewport that was actually 980 px,
because `Emulation.setDeviceMetricsOverride` silently does not apply to `file://`
in this Chrome. Every number in that run was wrong and looked fine. It was caught
only because the frame widths came back as 345 rather than 360 and that number
made no sense. **Assert the viewport inside the probe before trusting anything
the probe says** — `innerWidth` is one extra field and it is now in every script
in the evidence folder.

**Then shipped a fix that was still wrong.** The 345 px was a scrollbar squeezing
`max-width:100%`, and my first instinct was to accept it as close enough. It is
not: a drawing 15 px narrower than it claims is a different measurement, and this
whole item exists because 15 px of column width is the difference between 0% and
66% truncation. The artboard now holds 360 px exactly and scrolls inside its own
rail instead of shrinking.

### 4. What did we nearly ship, and what caught it?

**Two numbers in the document that the committed script contradicted.** The draft
said the generic serif truncates 32 of 86 titles and that a broken image drops a
71-character alt string. Running `probe.mjs` end to end after writing the
document returned 31 and 72. Both came from an earlier ad-hoc measurement over a
slightly different title extraction; the committed script is the one a reader can
run, so the document was corrected to match it rather than the other way round.
**Small numbers, and that is the point: the failure mode is a document whose
prose and whose evidence script disagree, which a reader discovers before I do.**

**A cold-render ceiling stated as if it were fixed.** The draft said the worst
route takes 23.0 s, from the first fetch pass. The second pass an hour later hit
25.9 s on a different route. The document now gives both and says the ceiling is
not fixed, because "23 seconds" was about to become a number other items planned
against.

**An accessibility claim that repeated DES-06's near-miss in a new form.** §10.3
asserts every drawn control is at least 44 px. The first probe of my own artifact
returned 11 failures — which turned out to be the count spans nested *inside*
44 px chips, a selector artefact rather than a real defect. I nearly recorded a
pass without looking at what the 11 were, and I nearly recorded a failure without
looking either. Both would have been wrong. The count is genuinely zero of 140,
and the selector that produces it is committed.

**And one thing that was true and I almost repeated anyway.** The brief says
Sprint 02 shipped "a category page with two 'coming soon' empty states above its
real content." Measured today, every empty section renders *last* within its
page. The claim may have been true when it was written, but it is not true now,
and copying it forward would have put a fourth unmeasured assertion into the
record on a project that has already corrected the same claim three times. The
document states what is on the page today and says so.
