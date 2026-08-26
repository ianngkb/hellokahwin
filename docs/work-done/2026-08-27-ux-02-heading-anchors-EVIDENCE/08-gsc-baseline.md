# UX-02 baseline — Google Search Console, read 2026-08-27

Property `https://hellokahwin.com/`. Window `2026-07-30 → 2026-08-27` (28 days),
`data_state` default (matches the GSC dashboard). Everything below is read
BEFORE any UX-02 code reached production, so it is the "before" to measure
against.

## The DoD's named baseline

**`dewan komuniti setiawangsa`** — the query the DoD names.

| metric | DoD says | measured 2026-08-27 |
| --- | --- | --- |
| impressions | 104 | **100** |
| position | 9.0 | **9.0** |
| clicks | 0 | **0** |

Position and clicks reproduce exactly. Impressions read **100, not 104**. Summed
day by day over the same window the daily rows also total 100, so this is not a
rounding artefact — GSC restates the most recent days for up to ~3 days, so 104
was plausibly correct when the CEO read it. **I could not reproduce 104 and am
not going to write it down as if I had.** 100 is the number this item will be
measured against.

## The finding that matters more than the exact number

Those impressions **do not land on the article's own URL.** They land on the
legacy WordPress path:

```
query "dewan komuniti setiawangsa"
  page  https://hellokahwin.com/dewan-kahwin/          100 impressions  pos 9.0  0 clicks
  page  https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin   (not present)
```

`/dewan-kahwin/` is a 308 to the canonical article — proven, with a negative
control, in `09-live-verification.txt`. So the anchors and `ItemList` UX-02 adds
to `/artikel/idea-dan-nasihat/dewan-kahwin` are on the page Google actually
serves for these queries; the URL in the report is just still the old one.

Whole-page totals over the window:

| page | clicks | impressions | position |
| --- | --- | --- | --- |
| `https://hellokahwin.com/dewan-kahwin/` | 29 | 980 | 9.3 |
| `https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin` | 1 | 41 | 8.9 |

## Every hall-name query the page already ranks for, and earns nothing from

This is the item's whole thesis in one table. Google is already matching this
page to searches for **halls by name**, at page-one positions, and getting zero
clicks — because the result it can show is a generic listicle title with no
entity behind it.

| query | impressions | position | clicks |
| --- | --- | --- | --- |
| pusat komuniti setiawangsa | 189 | 9.6 | 0 |
| dewan komuniti setiawangsa | 100 | 9.0 | 0 |
| dewan pusat komuniti setiawangsa | 5 | 8.6 | 0 |
| dewan setiawangsa au2 | 5 | 5.4 | 0 |
| dewan perdana keramat mall | 4 | 17.0 | 0 |
| dewan setiawangsa | 4 | 7.8 | 0 |
| dewan keramat | 3 | 6.7 | 0 |
| dewan perdana keramat hall | 2 | 9.5 | 0 |
| dewan serbaguna setiawangsa | 2 | 20.0 | 0 |
| pusat komuniti setiawangsa photos | 2 | 1.5 | 0 |
| pusat komuniti setiawangsa reviews | 2 | 9.0 | 0 |
| dewan serbaguna keramat jaya 2 | 1 | 5.0 | 0 |
| dewan perdana keramat mall reviews | 1 | 10.0 | 0 |

**319 impressions across named-hall queries. Zero clicks. Every one of them.**

## Index and rich-result state, before

`urlInspection` on `https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin`:

```
verdict              PASS
coverage_state       Submitted and indexed
last_crawled         2026-08-26 15:48
google_canonical     https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin
rich_results.verdict PASS
rich_results.detected_types  ["Breadcrumbs"]
```

**`detected_types` is `["Breadcrumbs"]` and nothing else** — the before-state for
the `ItemList` this item adds. Re-running the same inspection after Google
recrawls is the check that it landed.

## What this baseline cannot tell us yet

Ranking movement is not observable on the day of a deploy. The honest next
readings are: `rich_results.detected_types` gaining `ItemList` once Google
recrawls (days), and the named-hall queries in the table above moving off zero
clicks (weeks). Both are re-runs of the exact queries recorded here.
