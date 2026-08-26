# Alt text — the eight C2.4 covers — FOR EDITORIAL REVIEW BOARD

**Status:** DRAFT, awaiting board pass. Not ingested.
**Date:** 24 Ogos 2026
**Register rows:** `HK-C-0001` … `HK-C-0008` (currently `BELUM DIISI`)
**Blocks:** publication of all eight C2.4 articles.

---

## Read this first — a contradiction the board must settle

**Two approved documents specify different covers, and the alt text below is
only correct for one of them.**

| Document | What the cover carries |
|---|---|
| Spec §7 `kad-tajuk` | *"It carries **no data**. Every attempt to put the state table on the cover fails at 3.52:1."* Skop line, title line, `Disemak Ogos 2026`. Nothing else. |
| `aug-24-2026-brief-cover-graphic-generator.md` | A *"mas kahwin state-figure cover"* — A1 *"the full state-by-state comparison"*, A3 *"Johor's figure"*, A4/A6/A7 *"two states"* |

The spec gives its reason and the reason is geometric, not aesthetic: the source
is 2464 × 700 (3.52:1) and every other crop target is narrower, down to 4:5. Only
a centred 1600 × 700 safe area survives all four. A figure set large enough to
read on a phone inside that band, alongside a two-line title, is the case the
spec tested and rejected.

**This is the same risk the crop gate was created to catch.** A state-figure
cover is a data-bearing card at 2464 × 700 — precisely what smart-crop slices.

**The alt text below is written for the spec's data-free `kad-tajuk`.** If the
board rules for figure-bearing covers, all eight sentences change, because alt
text must describe the card that actually renders. It cannot be written before
that ruling. Recommendation: hold to `kad-tajuk`, and let the article's own
tables carry the figures, where they are accessible, selectable and uncropped.

---

## The eight

Each card renders exactly three text elements: skop line, title line, and
`Disemak Ogos 2026`. The alt text conveys those, because on a typographic card
the text *is* the content.

| Id | Slug | Alt text (BM) |
|---|---|---|
| HK-C-0001 | `mas-kahwin-ikut-negeri` | Kad tajuk artikel bagi semua negeri: “Kadar minimum mas kahwin mengikut negeri”. Disemak Ogos 2026. |
| HK-C-0002 | `apa-itu-mas-kahwin` | Kad tajuk artikel asas: “Apa itu mas kahwin”. Disemak Ogos 2026. |
| HK-C-0003 | `mas-kahwin-johor` | Kad tajuk artikel bagi Johor: “Kadar mas kahwin di Johor”. Disemak Ogos 2026. |
| HK-C-0004 | `mas-kahwin-kelantan-terengganu` | Kad tajuk artikel bagi Kelantan dan Terengganu: “Kadar mas kahwin dan fi nikah”. Disemak Ogos 2026. |
| HK-C-0005 | `mas-kahwin-perak` | Kad tajuk artikel bagi Perak: “Kadar mas kahwin dan fi rasmi di Perak”. Disemak Ogos 2026. |
| HK-C-0006 | `mas-kahwin-pahang-negeri-sembilan` | Kad tajuk artikel bagi Pahang dan Negeri Sembilan: “Kadar mas kahwin dan bayaran rasmi”. Disemak Ogos 2026. |
| HK-C-0007 | `mas-kahwin-sabah-sarawak` | Kad tajuk artikel bagi Sabah dan Sarawak: “Mas kahwin di bawah dua undang-undang berasingan”. Disemak Ogos 2026. |
| HK-C-0008 | `mas-kahwin-melebihi-kadar-minimum` | Kad tajuk artikel bagi semua negeri: “Mas kahwin melebihi kadar minimum”. Disemak Ogos 2026. |

### Front-matter block for each

```yaml
cover:
  file: ./<slug>-kad-tajuk.png
  alt: "<the sentence above>"
  credit: "Grafik: HelloKahwin"
  licenseClass: G
  licensorName: HelloKahwin
```

---

## Notes for the board

**1. No alt text carries a figure, and that is deliberate.** Not one of the eight
names a ringgit amount. Three of the eight states carry rates the A1 table marks
*belum disahkan sebagai kadar semasa* — Johor RM22.50, Sabah RM100, Sarawak
RM120 — and four set no minimum at all (Perak, Kelantan, Terengganu, and by the
same table Perlis, Kedah, Pulau Pinang). A cover that prints an unconfirmed
figure asserts as settled what the article spends its length qualifying. A
data-free card cannot make that error.

**2. The alt necessarily echoes the H1.** A screen-reader user meets
*"Kad tajuk artikel bagi Johor: Kadar mas kahwin di Johor"* immediately above an
H1 reading *"Mas kahwin Johor 2026: RM22.50 dan asal usul angkanya"*. That
redundancy is inherent to a typographic cover and is the honest description of
what is on screen. Flagging it rather than disguising it with invented detail.

**3. Parser conformance.** `alt` is `.trim().min(1)`; all eight are non-empty and
untrimmed-clean. `licenseClass: G` is in `LICENSE_CLASSES` (`['V','C','O','S','G']`,
`article-file.ts:27`). `credit` and `licensorName` non-empty. Verified against
the parser, not against a strategy document.

**4. Not yet through `/humanizer`.** These are audience-facing strings. The pass
runs after the board settles the §0 contradiction, since a ruling for
figure-bearing covers rewrites all eight.

## The gate, unchanged

Nothing ingests until one real card has been rendered and all four crops
inspected — `crop-16x9-og`, `crop-4x3-article-card`, `crop-4x5-mobile-cover`,
`crop-4.3x1-desktop-hero`. Owner's rule, 24 Ogos 2026.
