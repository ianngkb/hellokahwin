# Done — DES-13: the display typeface is **Bodoni Moda**, and it is final, not a stand-in

**Date:** 28 Ogos 2026 · **Sprint 03, DES-13** · **Owner:** `creative-director`
**Brief:** `docs/plans/aug-28-2026-session-01/aug-28-2026-brief-des-13.md`
**Evidence:** `docs/work-done/aug-28-2026-session-01/aug-28-2026-des-13-EVIDENCE/`

Every number below is printed by a script in that directory. Where a licence is
quoted, the document and the date it was read are named at the point of use.

---

## The decision

**The display face is Bodoni Moda 2.005, and specifically the instance
`wght 400, opsz 11`.** It is no longer provisional. The five lockups on
`origin/feat/des-10-brand-page` are the final marks in the correct face, and
DES-11 and DES-12 are unblocked.

| | |
|---|---|
| **Face** | Bodoni Moda, by Owen Earl / Indestructible Type. Variable: `opsz` 6–96, `wght` 400–900. Version 2.005, 563 glyphs, 428 cmap entries, 2000 units/em. |
| **Licence** | SIL Open Font License 1.1. Read from `google/fonts@main`, `ofl/bodonimoda/OFL.txt`, 28 Ogos 2026. Copy at `…-EVIDENCE/bodonimoda-OFL.txt`. |
| **Cost** | **RM0**, perpetual, no renewal, no pageview tier, no account. |
| **Latin coverage** | Complete for this site. All 69 codepoints the site's display type actually sets are present; so are Basic Latin (95/95), Latin-1 Supplement letters (64/64) and **Latin Extended-A (128/128)**. |
| **May it ship inside an SVG?** | Yes. The OFL says so in as many words: *"The requirement for fonts to remain under this license does not apply to any document created using the fonts or their derivatives."* |
| **May we self-host the webfont?** | Yes. *"Permission is hereby granted, free of charge … to use, study, copy, merge, embed, modify, redistribute, and sell modified and unmodified copies of the Font Software"*, on two conditions: it may not be sold on its own, and the copyright notice and licence travel with any redistributed copy. |

**`ivyora-display` is rejected, and the reason is the licence, not the drawing.**
The Adobe Fonts licence forbids the two things this brand needs a display face to
do. Details in section 2.

Two things the decision does **not** do, stated up front so nobody finds them
later: it does not regenerate the SVGs, and it does not close a defect it found.
Sections 5 and 6.

---

## 1. What the site's display type actually sets

The brief says not to block a face on Malay diacritic coverage. It is stronger
than that. **The site's display type contains no diacritics at all.**

`charset.py` counted every character in every `<h1>`, `<h2>`, `<h3>` and
`<title>` across seven production pages fetched today, plus all 86 article titles
and 15 category names from DES-06's corpus census, plus the wordmark string
itself. Full census: `…-EVIDENCE/out-charset-census.txt`.

**69 distinct codepoints. Two are non-ASCII, and both are dashes:** en dash
`U+2013` (6 occurrences) and em dash `U+2014` (2). Nothing else leaves ASCII —
no acute, no grave, no circumflex, no cedilla, not one.

That is what Rumi Malay is. The 26 letters, both cases, the digits, and this
punctuation: `! & + , - . : ? |`. A face that fails this set is not a display
face, it is broken.

So coverage is answered as the DoD asks — Bodoni Moda covers the Latin set the
site needs, with 0 misses — and then it stops being interesting. **Recorded so
the gate is not re-argued: on the evidence, "Malay diacritic coverage" cannot
discriminate between any two shipping Latin typefaces.** Decision 117 was right
to demote it and, if anything, understated how far.

The wider set was checked anyway, because a publication that will one day set
*café*, *Malé* or a Portuguese-era place name should not have to re-cut its
masthead to do it:

| Range | Present |
|---|---|
| Basic Latin, printable `U+0020`–`U+007E` | 95 / 95 |
| Latin-1 Supplement letters `U+00C0`–`U+00FF` | 64 / 64 |
| **Latin Extended-A `U+0100`–`U+017F`** | **128 / 128** |
| Register punctuation — the dashes, both quote pairs, ellipsis, guillemets | 12 / 12 |
| Currency and figures — `RM` is two Latin letters; also `€ £ $ ° × − ‰` | 8 / 8 |

---

## 2. Why `ivyora-display` is out, in the words of the licence

Carats & Cake serve one family from Typekit kit `irr0rbw`: `ivyora-display`,
`font-weight:300`, `font-display:auto`. Fetched today, 200, 1,249 bytes; copy at
`…-EVIDENCE/caratsandcake-typekit-irr0rbw-2026-08-28.css`. Decision 112 recorded
this and it still holds.

The binding document is the **Adobe Fonts Service Product Specific Terms**,
effective 7 October 2024, which states on its own first page that it is
*"incorporated by reference into the Adobe General Terms of Use"*. Fetched from
Adobe on 28 Ogos; copy in the evidence directory. Three clauses decide this.

**§3.1(B), Website Publishing.** *"You may use the Web Fonts to design and
develop your Websites and to create a Web Project for such purposes. You may
reference or encode a link to the Web Project within your Website's design.*
**No other web usage is permitted.**"

**§3.4(E)(1).** You are *"expressly prohibited from … hosting the Licensed
Content on your own server or other self-hosting option or service"*.

**§3.1, the grant itself.** The licence runs *"only for as long as you maintain
an uninterrupted Adobe Subscription Plan"*.

The FAQ says the same thing in plainer words. From
`helpx.adobe.com/fonts/using/webfont-licensing.html`, Internet Archive snapshot
of **10 April 2026**:

> "No. Adobe doesn't offer the ability to host fonts locally. Our web font
> hosting delivers fonts from a globally distributed content delivery network
> (CDN). If local hosting (also known as self-hosting) is needed, you must
> purchase a license from the foundry or from an authorized reseller."

> "The web font license requires that fonts be added to your website by the
> embed code provided. **Any other method of displaying the font on your website
> isn't allowed.**"

> "No. If you cancel your Creative Cloud subscription, the web fonts will no
> longer be available to your websites. Any site using the web fonts will
> display the fallback fonts specified in your font stack or your browser's
> defaults."

One point in Adobe's favour, stated because it is real: **there is no pageview
cap.** *"No. There is no limitation on the number of monthly pageviews for web
fonts displayed on your website using an Adobe Fonts web project."* Their web
term beats the foundry's own on this point, and it still is not enough.

### What those clauses cost us specifically

**The h1 could not be self-hosted or preloaded.** DES-01 §"Type: one webfont"
specifies one display serif, subsetted, preloaded, `font-display: swap`, on a
site that ships **zero webfont bytes today** — re-confirmed this morning: 0
`woff`/`woff2` references and 0 `@font-face` rules across seven delivered
production pages, and 0 `@font-face` in the 141,795-byte stylesheet the browser
downloads. Adobe's terms make the only permitted delivery a third-party request
to `use.typekit.net` — a new origin, a new connection and a new single-point
failure in front of the LCP element, on an audience the code's own
comments describe as low-end Android on slow data, and DES-09 holds a veto over
exactly that. We would also inherit `font-display:auto` unless we overrode it,
which is a block period the reader pays for.

**The mark could not be generated the way we generate marks.** Decision 114's
lockups were produced by reading a font binary and writing out glyph outlines
with fontTools. Under §3.4(E)(4) we are prohibited from *"changing, altering,
adapting, translating, converting, modifying, creating, or making or having made
any derivative works of any portion of the Licensed Fonts"*, and under (E)(7)
from *"attempting to copy, move, or remove Licensed Fonts … from the locations or
folders on your Computer where we have installed such Licensed Fonts"*.

**This is the honest part of the argument, and it cuts against me as well as
for me.** Adobe's own FAQ, snapshot of **25 August 2026**, plainly permits the
*outcome*:

> "Yes, you can modify or decorate type that has been rasterized or converted to
> outlines. The resulting image may be copyrighted, registered as a trademark,
> or used in commercial products. However, you may not make changes to the font
> software file or create your own font software from converted outlines."

> "Any file that embeds the font data, such as PDF or image formats, and any
> text that has been rasterized or outlined will continue to display correctly.
> These types of files may be reproduced and distributed independent of your
> subscription status."

So an outlined `ivyora-display` wordmark, set in Illustrator and exported, would
be licensed, trademarkable, and would outlive the subscription. **The FAQ blesses
the destination and the Terms fence off our road to it.** Reading a synced font
file with a script is not "converting type to outlines in a desktop program", and
I am not going to pretend the gap is smaller than it is. The workable route
exists: set the type in an Adobe application, convert to outlines there, export.
It is a manual step, it cannot be scripted, and it has to be repeated by hand
every time the tracking is re-solved — for a mark whose whole spec is
*"regenerate rather than rescale"*, on a team that has already shipped five
lockups with **no generation script committed anywhere** (checked: the
`feat/des-10-brand-page` diff is 8 files, all page and asset, no tooling).

**That is the real objection to Adobe Fonts here — not price. It makes the
brand's most-repeated maintenance operation manual, and it makes the h1 a rented
asset with a monthly kill switch.**

---

## 3. Cost, since the DoD asks for a number

Bodoni Moda: **RM0**, once, forever.

**Adobe Fonts**, which is the only way to reach `ivyora-display` as a webfont.
`adobe.com` refused every request from this machine today (see the evidence
README), so both figures are dated and neither is a live read:

| Source | Read | Plan | Price |
|---|---|---|---|
| `adobe.com/my_en/creativecloud/compare-plans.html`, Internet Archive | 23 Jun 2025 | Single App | **RM57.59/mo** |
| same | 23 Jun 2025 | All Apps | **RM166.69/mo (incl. SST)** |
| Lowyat.NET, April 2026 | Apr 2026 | Creative Cloud Pro, standard | **RM220.32/mo** |

**RM2,000 to RM2,644 a year, recurring, and the h1 falls back to Georgia the
month it lapses.** Both numbers are older than I would like and I am not going to
present either as today's price; the decision does not turn on which is right,
because both are compared against zero and both stop working when you stop
paying.

**The other route, priced because it is the one an owner would ask about.** Ivy
Foundry sell IvyOra direct, and their own terms permit what Adobe's forbid:
self-hosting from WOFF/WOFF2, and *"Logos, images, print, packaging"* on the
desktop licence with the fonts *"outlined before export"*. Prices from the
schema.org product data in the page delivered today, `ivyfoundry.com/families/ivyora/`:

| Product | USD | ≈ MYR |
|---|---|---|
| IvyOra Display, one style, desktop, 1 user | $29.99 | RM121 |
| IvyOra Display family, 10 styles, desktop | $197.99 (from $299.90) | RM798 |
| IvyOra complete family, 22 styles, desktop, 1 user | $317.99 | RM1,282 |

Web licence is **recurring**, priced on monthly pageviews, formats WOFF and
WOFF2. Tier multipliers, read from the same page data: 10k ×1, 25k ×2.5, 100k ×5,
250k ×10, 500k ×15, 1m ×20, 2m ×30. **The multiplier is quoted; the line total is
not** — I did not take a checkout to the payment step, so a base of $29.99 at
10k pageviews is arithmetic on their multiplier, not a price I saw. At 51 clicks
and 2,869 impressions per 28 days (decision 96) we sit in the bottom tier for a
long time yet.

MYR figures use **USD→MYR 4.033**, ECB reference rate for 27 Aug 2026 via
`api.frankfurter.dev`. Rounded to the ringgit.

**So the escalation path, if the owner wants the Carats & Cake face after
reading this: buy IvyOra Display direct from Ivy Foundry, not through Adobe.**
About RM121 for the one weight, self-hostable, perpetual for the desktop half.
The option is real and it is cheap. What it does not fix is the recurring web
half, and it buys a face the market evidence says we should be more careful with,
not less — section 6.

---

## 4. The five shipped marks are Bodoni Moda. Measured, not taken on trust

Decision 116 calls the marks a stand-in "set in Bodoni Moda". Before declaring
that final I checked whether it was true, because the whole item turns on it and
nobody had verified the label.

The first path of `hellokahwin-horizontal.svg` is the `H`:

```
M1462 1500V1461H1282V39H1462V0H892V39H1092V720H433V39H632V0H62V39H242V1461H62V1500H632V1461H433V760H1092V1461H892V1500Z
```

Its distinct x coordinates are `62, 242, 433, 632, 892, 1092, 1282, 1462`.
Bodoni Moda's own `H` outline, instanced and normalised to a 1500-unit cap
height, gives:

| Instance | x coordinates of `H` |
|---|---|
| `opsz 6, wght 400` | 86, 267, 457, 656, 916, 1116, 1307, 1486 |
| **`opsz 11, wght 400`** | **62, 242, 433, 632, 892, 1092, 1282, 1462** |
| `opsz 40, wght 400` | 40, 219, 410, 610, 870, 1070, 1259, 1440 |
| `opsz 96, wght 400` | 37, 216, 407, 607, 867, 1067, 1256, 1437 |

Exact on every coordinate at `opsz 11`, and wrong at every other instance
tested. The marks are Bodoni Moda, at `wght 400, opsz 11`, in raw font units
with the cap height at 1500 of 2000 units per em.

**`opsz 11` is the font's own default** — Google Fonts' `METADATA.pb` carries
`registry_default_overrides { key: "opsz" value: 11.0 }`. So the optical size
was never chosen. It is what came out of the tin.

That matters more than it sounds, and it is section 5.

The ratios, re-measured from the viewBox of each file as it exists on
`origin/feat/des-10-brand-page`, agree with decision 114 and with
`brand-assets.ts`:

| File | viewBox | Ratio | Bytes |
|---|---|---|---|
| `hellokahwin-horizontal.svg` | 18000 × 1800 | **10.00 : 1** | 2,753 |
| `hellokahwin-horizontal-wide.svg` | 22283 × 1800 | 12.38 : 1 | 2,755 |
| `hellokahwin-vertical.svg` | 10835 × 3930 | 2.76 : 1 | 2,806 |
| `hellokahwin-shortmark.svg` | 12208 × 1800 | 6.78 : 1 | 1,153 |
| `hellokahwin-monogram.svg` | 3334 × 1800 | 1.85 : 1 | 530 |

**`/brand` is not live.** `https://hellokahwin.com/brand` and
`/brand/logos/hellokahwin-horizontal.svg` both return **404** today; the root
returns 200. The branch is pushed and unmerged, which is what DES-11 says. One
consequence worth naming: decision 116 ruled the mark must be *described* as
provisional to anyone outside the company, and the page never carried that
sentence — there is no "provisional" or "stand-in" anywhere in the branch's
`page.tsx`, `brand-assets.ts` or `brand.css`. Nobody outside the company was
misled, because nobody outside the company could reach it. That is luck, not
process, and it goes in the retrospective.

---

## 5. The defect this item found, which I am reporting rather than fixing

Confirming the face meant instancing the variable font, and instancing it made
something visible that a static label hides.

**`opsz` in Bodoni Moda barely touches the stems and almost erases the
hairlines.** Measured at `wght 400`, normalised to a 1500-unit cap height
(`out-opsz.txt`):

| `opsz` | Hairline (thin stroke of `o`) | Thick stroke | Contrast | Set width of "HelloKahwin" |
|---|---|---|---|---|
| **6** | **72** | 201 | 2.79 : 1 | 12,263 |
| 8 | 58 | 203 | 3.48 : 1 | 12,153 |
| **11 — as shipped** | **38** | 206 | 5.42 : 1 | 11,992 |
| 14 | 30 | 206 | 6.69 : 1 | 11,932 |
| 24 | 17 | 208 | 11.84 : 1 | 11,821 |
| 48 | 7 | 209 | 29.58 : 1 | 11,735 |
| 96 | 4 | 210 | 52.50 : 1 | 11,708 |

Across the axis the thick stroke moves 201 → 210, about 4%. **The hairline moves
72 → 4, a 94% collapse**, and the stroke contrast goes 2.79:1 to 52.50:1. The
`opsz` axis on this face is a contrast axis wearing a size label.

The marks are outlined paths, so whichever instance they were cut at is frozen
into the file and cannot respond to how large the mark is drawn. They were cut at
the default.

### What that does at the sizes the brand page itself specifies

A vector stroke thinner than one device pixel is not dropped, it is
antialiased — which is arithmetically the same as compositing ink over the ground
at an alpha equal to its width in device pixels. So the didone's thin strokes do
not vanish at small sizes; they go grey while the stems stay black. Ink
`#16130F` on parchment `#EDEAE1` is 15.39:1 at full strength. Composited
(`out-hairline.txt`):

| Mark height | DPR | Hairline, device px | Composites to | Contrast vs parchment |
|---|---|---|---|---|
| 16px | 1 | 0.41 | `#96938C` | **2.55 : 1** |
| **18px — the brand page's stated minimum** | **1** | **0.46** | **`#8B8881`** | **2.94 : 1** |
| 18px | 2 | 0.91 | `#292621` | 12.53 : 1 |
| 18px | 3 | 1.37 | `#16130F` | 15.39 : 1 |
| 22px | 1 | 0.56 | `#75726C` | 3.99 : 1 |
| 40px | 1 | 1.01 | `#16130F` | 15.39 : 1 |

**At its own stated minimum height on a 1× display, the horizontal lockup's thin
strokes render at 2.94:1 — under the 3:1 floor WCAG 2.2 §1.4.11 sets for
non-text content.** This is the same failure decision 124 found in the palette
(`--rule` at 1.52:1, `--rule-accent` at 2.95:1) and the same one the live site
already solved once with `--border-strong` at 3.01:1. Third instance, same shape.

Scope, stated honestly rather than dramatised: **this is a desktop problem.**
64% of impressions arrive on mobile (decision 113), and phones run at DPR 2 or 3,
where the same mark clears comfortably. Desktop is where DPR 1 is still normal.

The recipe for a `#16130F` hairline to reach one full device pixel:

| | DPR 1 | DPR 2 | DPR 3 |
|---|---|---|---|
| As shipped, `opsz 11` | 39.5px tall (395px wide) | 19.7px | 13.2px |
| Re-cut at `opsz 6` | 20.8px tall (208px wide) | 10.4px | 6.9px |

At `opsz 6` the 18px mark composites to `#33302C`, **10.91:1**. The fix costs
nothing and buys 3.7× the contrast at the size the brand page already sanctions.

### Why I am not doing it in this item

Cutting at `opsz 6` moves the set width of "HelloKahwin" from 11,992 to 12,263
units, **+2.26%**. Decision 114 says the primary lockup's 10.0:1 was reached by
*solving the tracking*, so a 2.26% change is inside what tracking absorbs and the
10.0:1 ratio can be held.

**The re-cut belongs to DES-10, which is mine.** DES-10 owns the five lockups;
DES-11 owns the page that displays them. So this is not a hand-off to somebody
else, and I am not going to dress it up as one. Two reasons it is not done inside
this item, and both are about where the files live rather than who should touch
them.

**One. `feat/des-10-brand-page` is sitting in front of the owner for merge.**
DES-10's own brief reads *"BUILT AND PUSHED, NOT MERGED … BLOCKED ON THE OWNER"*.
Rewriting five assets on a branch somebody is being asked to approve changes what
they are approving, without their asking. That is a confirmation, not a
judgement call I get to make in a font decision.

**Two. This item's brief scopes it to the docs repo and this branch** — *"Work on
the current branch. Commit and push your documents."* The lockups live in the
site repo. Pushing there is a different branch in a different repository and
outside what was asked for.

**So: the face is decided and final; DES-10 comes off `blocked` and back to
`todo` carrying the re-cut, with the instance table below as its specification.**
The DoD's regeneration trigger — *"if a face other than Bodoni Moda is
chosen"* — does not fire, because the face is unchanged. I am not using that to
make the work vanish: the re-cut is real work, it is mine, it is written into
`sprint-03.json` in this change, and it is the next thing I do on DES-10 once the
owner says whether they want the branch re-pushed or merged first.

### The specification, so nobody has to interpret an adjective

| Lockup | Cut at | Reason |
|---|---|---|
| `horizontal` (primary) | **`wght 400, opsz 6`** | Used from 18px in headers. Needs the thickest hairline the face has. |
| `horizontal-wide` | `wght 400, opsz 6` | Footers and print; same small-use exposure. |
| `vertical` | `wght 400, opsz 6` | Narrow columns, small. |
| `shortmark` | `wght 400, opsz 6` | Stated minimum 16px — the worst case on the page. |
| `monogram` | `wght 400, opsz 6` | Favicon and avatar. Smallest use on the site. |
| Article `<h1>` webfont | `wght 400, opsz` pinned at **11** | 30px mobile / 44px desktop. At DPR 1 the 30px h1 hairline is 0.57px → `#726F69`, 4.16:1, which clears AA for text at that size; at DPR 2+ it is full strength. |

All five marks go to the same instance, so **the ratios are re-solved once and
the "regenerate rather than rescale" rule is satisfied in one pass.** After the
re-cut, the stated minimum heights hold as written (18px horizontal, 16px
shortmark, 14px monogram) rather than needing to be raised.

---

## 6. The strongest argument against this decision, and my answer

**"Both of the owner's touchstones pay for their type, and you have just chosen
the free option."**

That is the real objection and it is accurate. Carats & Cake license
`ivyora-display` through Adobe. PartySlate ship Gotham A, a Hoefler face, at
three weights (decision 130). Neither brand reached for Google Fonts. A brand
that wants to read like them and buys nothing is, on its face, buying the cheap
version of the reference.

Three answers, in order of weight.

**One. The measured Malaysian market says the spend is not where the premium
read comes from.** Of seven Malaysian premium bridal brands measured for DES-01
(decisions 125, 135), six run on geometric or humanist sans — Montserrat,
Poppins, Jost, Inter, Figtree — and every one of those is free. The seventh,
`thegownatelier.com`, runs Cormorant Garamond, also free, and is the Vera Wang
Bride stockist. **Not one premium brand in our actual market is spending on
type.** They read expensive on restraint: five colours, one family, few weights.
Decision 135 moved the register's spine to colour count for precisely this
reason, and decision 130 says the transferable thing is discipline, not the
typeface. Buying a face would be buying the half of the lesson that does not
transfer.

**Two. Nobody can identify an outlined wordmark.** The mark ships as paths with
solved tracking at a proportion no other site has. There is no `font-family` to
read, no network request to inspect, no rendering fingerprint. The reader who
would recognise Bodoni Moda in the masthead is a typographer, and a typographer
looking at a 10:1 didone lockup on parchment is looking at the tracking, the
ratio and the ink temperature — all of which are ours and none of which came out
of the tin.

**Three. The thing that would actually cheapen the mark is the defect in section
5, and it is free to fix.** A wordmark whose hairlines composite to 2.94:1 on a
desktop header looks thin and grey and slightly broken. That is what a reader
notices. It has nothing to do with what the font cost.

**Where the objection survives.** If the owner reads section 5 and concludes the
mark should have been drawn rather than typeset, that is a different and better
argument than "buy a licence", and this decision does not answer it. Drawing a
custom wordmark is a commission, not a font purchase, and it is not in this
sprint. And if the owner simply wants IvyOra because it is what Carats & Cake
use — that is their call under decision 104, the route is **Ivy Foundry direct at
about RM121, not Adobe**, and I would ask that the `opsz` finding be applied to
whatever face wins, because it is a property of high-contrast display serifs and
not of this one.

---

## 7. The webfont, priced in bytes

DES-01 §"Type: one webfont" and decision 127 set the budget: one display serif,
one weight, subsetted, on the masthead and `<h1>` only, roughly 20–30 KB, against
a site that ships zero webfont bytes. Measured (`out-subset.txt`):

| Subset | Glyphs | TTF | **WOFF2** |
|---|---|---|---|
| Measured site set only, axes kept | 106 | 49,476 | 26,152 |
| Measured site set only, `opsz` pinned 11 | 106 | 28,200 | **14,216** |
| Site set + Latin-1 + punctuation, axes kept | 219 | 78,520 | 39,028 |
| **Site set + Latin-1 + punctuation, `opsz` pinned 11** | **219** | 44,524 | **21,388** |
| Site set + Latin-1 + punctuation, `opsz` pinned 6 | 219 | 44,492 | 21,168 |

For comparison, the `latin` subset Google Fonts serves for this family is
**53,756 bytes** of woff2 — fetched today from `fonts.gstatic.com`, both axes
live.

**Specified for DES-05/DES-09: ship the 219-glyph subset with `opsz` pinned at
11, self-hosted, preloaded, `font-display: swap`. 21,388 bytes.** Keeping the
variable axes costs 17,640 bytes for a range the `<h1>` never uses, and pinning
is what brings the file inside the budget at all. The wider Latin set costs
7,172 bytes over the bare minimum and is worth it — it is the difference between
a masthead that can set a borrowed word and one that has to be re-cut to do it.

---

## 8. Falsifiers

Written down so a later reader can knock this over cheaply rather than argue
with it.

**F1 — the antialiasing model.** Section 5 treats a sub-pixel stroke as ink
composited at alpha = width in device pixels. That is the standard coverage
model, not a screenshot. **To falsify:** render `hellokahwin-horizontal.svg` at
18px tall on a DPR 1 display, sample a hairline pixel, and compare the value to
`#8B8881`. If the renderer's gamma handling puts it materially darker, the 2.94:1
figure moves and the WCAG conclusion may not hold. The direction of the finding
would survive; the exact number might not.

**F2 — the coverage census is of today's corpus.** 69 codepoints, 86 articles.
A pillar page that quotes an Arabic transliteration with macrons, or a venue
whose registered name carries a diacritic, would extend the set. Bodoni Moda's
Latin Extended-A is complete, so the face survives it — but if content ever needs
Jawi, this decision says nothing at all about that and a separate face is
required.

**F3 — the Adobe prices are stale.** RM166.69 is from June 2025 and RM220.32 is
second-hand. If the current Malaysian price is materially lower, the *cost*
argument weakens. The *licence* argument does not: self-hosting is prohibited at
any price.

**F4 — the Ivy Foundry web line total is derived.** Their multipliers are
quoted; the annual figure at 10k pageviews is my arithmetic on those multipliers
against the $29.99 style price. A checkout would settle it.

**F5 — `opsz 6` might not be the right cut.** I chose the axis minimum because
the marks are used small and the hairline is the failure mode. If the owner or
DES-11 finds the 2.79:1 stroke contrast at `opsz 6` reads as too sturdy for a
didone at large sizes, the answer is two cuts — `opsz 6` for shortmark and
monogram, something nearer 8 for the horizontal — and the 10:1 ratio is re-solved
per lockup. I did not split it because five files at one instance is a rule
people follow and five files at two instances is a rule people get wrong.

---

## 9. Follow-ups

- **Owner — one question, and it is the only thing this item needs from you.**
  The face itself is a downstream decision under decision 104 and needs no
  approval. But section 5 means the five lockups on `feat/des-10-brand-page`
  should be re-cut before that branch merges, and the branch is currently in
  front of you awaiting merge. **Do you want it re-pushed with the corrected
  marks, or merged as-is and corrected after?** I have not touched it either
  way. Separately: read section 6 if you want to overrule the face; the
  escalation route is Ivy Foundry direct at about RM121, not an Adobe
  subscription.
- **DES-10 (`creative-director` — mine)** — moved from `blocked` back to `todo`.
  Re-cut all five lockups at `wght 400, opsz 6`, re-solve the tracking to hold
  10.0:1 on the primary, re-measure all five ratios and update them in
  `brand-assets.ts`. Record the face, version and instance in that file's header
  comment — "Bodoni Moda 2.005, `wght 400, opsz 6`" — so the next person who
  reads "regenerate rather than rescale" knows what to regenerate *from*.
- **DES-10, second item:** commit the generation script. Five outlined lockups
  exist with no tooling anywhere in the site repo, so "regenerate" is currently
  an instruction nobody can follow, including me.
- **DES-11 (`design-systems-engineer`)** — unblocked on the face. It stays
  behind DES-10 for the re-cut, because the page ships the files and the
  `brand-assets.ts` ratios.
- **DES-12 (`design-systems-engineer`)** — unblocked. The 360px header question
  is unchanged by this decision; the mark is the same shape and the same
  proportion.
- **DES-05 / DES-09 (`design-systems-engineer`)** — the display webfont is
  Bodoni Moda 2.005, `opsz` pinned 11, 219-glyph subset, **21,388 bytes woff2**,
  self-hosted, preloaded, `font-display: swap`. Section 7.
- **`managing-editor` / `head-of-seo-content`:** no action. Recorded only so the
  finding is not lost — the site's display type is 69 codepoints and two of them
  are dashes.

---

## Retrospective

**1. What did we learn that is not written down anywhere?**

**Naming a variable font does not name a typeface.** "Set in Bodoni Moda" reads
like a complete answer and specifies almost nothing: across this face's own
`opsz` axis the hairline moves by 94% and the set width by 4.5%. The company had
five shipped lockups, a brand page, two blocked items and a decision-log entry
all resting on a two-word face name, and the actual instance — `opsz 11` — was
never chosen by anyone. It was the default in the metadata file. **For any
variable face, the identity is `family + version + axis coordinates`, and
anything less is a label rather than a specification.**

Second thing, smaller: **an unfetchable primary source is not always a dead
end.** `adobe.com` and `helpx.adobe.com` refused this machine on every path
tried. The binding contract was a PDF served from a different Adobe host and came
back first try, and the two FAQs came back complete from the Internet Archive
with quotable snapshot dates. Decision 131 established that a source which could
disagree with you is an open risk rather than a footnote; the corollary is that
"the site blocks us" is a reason to try three more doors, not a reason to write
"could not be verified".

**2. Which document must change, and who owns that edit?**

Four, all made in this change except where noted:

- **`docs/sprints/sprint-03.json`** — mine. DES-11's and DES-12's briefs both
  carry *"The marks are set in a STAND-IN face"*. That is now false and would
  send both items back to a question that is closed. Corrected, both unblocked
  on the face. **DES-10 reopened from `blocked` to `todo`** carrying the `opsz`
  re-cut and the generation script, because it owns the five files. DES-13 set
  to `done`.
- **`creative-director.md`** — mine, my own persona. Its line 105 required
  naming a typeface's *"Malay diacritic coverage"*. Replaced with two rules the
  evidence supports: name a variable face by family, version and axis
  coordinates; and price a face in bytes as well as money.
- **`design-systems-engineer.md`** — my direct report, same false gate on line
  94, same correction, plus the 21,388-byte subset figure.
- **`docs/boardroom/decision-log.md`** — mine. Entries 138–142.

  **Where those two persona files actually live, because it matters.** Not in
  this repo. They are at
  `C:\Users\Ian Ng\Documents\Code\buddy\skillcentral\agents\projects\hellokahwin\Design\`,
  and `.claude/agents/` here is a derived copy that `install.sh` regenerates —
  decision 20 deliberately kept it out of this repo so there would not be two
  sources of truth. Both source files are edited, and
  `skillcentral/agents/projects/hellokahwin/CHANGELOG.md` carries a dated entry,
  which is that directory's own convention. **They are edited but not committed
  by me**: `buddy` is a different repository with its own working state and this
  item's brief scopes me to this branch. Flagged for whoever next commits that
  repo, and named here rather than left as a surprise.

**Correction to decision 117 while making these edits.** It records the diacritic
gate as *"written into THREE personas"*. A machine-wide grep for "diacritic"
returns exactly **two** persona files, both in `Design/`. The only third hit in
the company's own documents is
`docs/plans/aug-23-2026-session-01/aug-24-2026-spec-graphic-template-kit.md`,
which says *"diacritic-free"* — it already agrees with the correction and needs
no edit. **The correction to an overstatement was itself overstated by 50%, in
the same entry that named overstatement as the failure.** Left in place as
written and corrected here rather than edited quietly, because the log is a
contemporaneous record.

**3. What did we do twice that we should never repeat?**

Measured the wrong stroke. My first pass at the `opsz` axis measured the `H`
stem, found it moving 181 → 179 units across the whole axis, and I had a
paragraph half-written saying the axis was cosmetic and the "optical size saves
the small mark" argument was unsupported. **The `H` is the one letter in a didone
where every stroke is thick.** Measuring the `o` — where the bowl thins — gave
72 → 4. Same font, same axis, opposite conclusion, and the first version would
have shipped a confident claim built on a glyph chosen for convenience. The rule:
**when you measure a property of a typeface, measure it on the glyph where that
property lives.**

Also, twice now across this sprint, a design item has spent its first half
fighting `Invoke-WebRequest` against a hostile host. DES-01 lost `partyslate.com`
that way (decision 129, closed by decision 130) and this item lost `adobe.com`.
The Internet Archive `id_` raw-content endpoint worked both times it was tried
today and is not in anyone's method notes.

**4. What did we nearly ship, and what caught it?**

**A decision confirming a face nobody had checked was the face.** The whole item
could have been written from decision 116's sentence — Bodoni Moda, OFL, free,
done, two points. What caught it was running the shipped SVG's own path data
against the font's outlines. That check returned the answer the label predicted,
which is the boring outcome, **and it also returned `opsz 11`, which nobody had
chosen and which puts the primary lockup's hairlines under the WCAG 1.4.11 floor
at the exact size the brand page tells people to use.** The finding did not come
from doubting the label. It came from insisting on measuring something that was
almost certainly true.

Nearly shipped a second time: the sentence *"the opsz axis is why Bodoni Moda is
right for a mark used at 18px"*, written before any of it was measured, on the
assumption that optical size axes do what optical size axes usually do. They do
here — but only on the thin strokes, and in the direction that made the shipped
cut wrong rather than right. An argument I had reached for as support turned into
the item's main finding once it was pointed at the correct glyph.
