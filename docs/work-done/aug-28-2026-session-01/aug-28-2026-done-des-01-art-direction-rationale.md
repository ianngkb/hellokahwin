# DES-01 — Art-direction rationale: what premium is for a Malay wedding audience, argued from fetched evidence — 28 Ogos 2026

**Session:** aug-28-2026-session-01 · **Owner:** creative-director · **Status:** completed
**Plan:** [aug-28-2026-brief-des-01.md](../../plans/aug-28-2026-session-01/aug-28-2026-brief-des-01.md)

This item is a gate. Nothing was drawn and no site code was touched. DES-02
starts when the owner has approved the reasoning below.

Every market claim in this document carries a URL and the date it was fetched.
Where a site refused the fetch, it says so instead of describing the site
anyway.

---

## The short answer

| Question | Answer |
|---|---|
| What does premium look like in the Malaysian wedding market today? | Two registers, and neither is ours. At the top, imported Western luxury in English — Grazia MY's bridal roundup sells Oscar de la Renta and "fairytale". In the Malay-language middle, warm-neutral geometric sans on cream grounds — ADNAA, Rizman Ruzaini, Songket Dunia. **Nobody occupies premium and Malay-native at once.** |
| Where are our SERP competitors weak? | Not in content. In maintenance. mingguanwanita.my ships **66 distinct hex colours** and 30 `font-family` declarations on one article. nikahsatu.com ships 50 colours and **zero `<h1>`**. ppsignature.com — the measured market leader at ~29,745 visits/mo — ships **zero `<h1>`** on its top page. lanaianggun.com, ranked #1 for *kos kahwin*, is `'Arial', sans-serif !important`. |
| What is the proposed register? | **A publication of record, warmly printed.** Not a bridal magazine. The locked wordmark sits as a **masthead over a reference work** — which is what a 10:1 outlined mark is actually for. |
| What is the biggest change from the drafted register? | **One webfont, not four.** One display serif for the masthead and `<h1>`; the system stack keeps the body. That is ~25 KB instead of 120–200 KB, and it fires the DSE's own F3 falsifier as the primary specification rather than a fallback. |
| What did I find on our own live site? | Body text is **14px at line-height 1.5** in a container up to **1,248px wide**. `.hk-measure` is defined in the shipped CSS and used **zero times**. The article has **two `<h1>` elements** with identical text, and **13 `<h3>` hanging off no `<h2>`**. |

---

## How the evidence was gathered

Ahrefs and GSC MCP tools did not load in this session, so SERP competitors were
identified from live Google results for the site's own money queries, then
cross-checked against the company's existing Ahrefs work in
`docs/plans/aug-23-2026-session-01/aug-23-2026-audit-baseline.md` and decision
13. Where the two disagree, the repo's Ahrefs data wins, because it is a proper
index rather than one search from one machine.

Sites were fetched with `Invoke-WebRequest` and the HTML saved, then measured:
`font-family` declarations, webfont hosts, `woff2` references, distinct hex
values, heading counts, image counts. Stylesheets were fetched separately where
the numbers depended on them.

**One methodology caveat, stated because the number is quoted a lot below.**
"Distinct hex colours" counts colour literals in the *delivered HTML document* —
inline styles and embedded `<style>` blocks. It does not count an external
stylesheet. It is therefore a measure of how much bespoke colour a site injects
into its own markup, not of its complete rendered palette. That is why
HelloKahwin and TWN score zero: their colour lives in an external file. The
comparison between the WordPress sites is fair because they are all built the
same way; the comparison to us is not, and is not made.

**Three sites refused to be fetched and are recorded as unfetched, not
described:** aliabastamam.com (403), mimpikita.com.my (403), and
partyslate.com (202 with an empty body to `Invoke-WebRequest`, 403 to WebFetch).
PartySlate is one of the owner's two named touchstones, so its absence matters
and is flagged again at the end. Browser automation was not available to this
agent context.

---

## (a) What premium looks like in the Malaysian wedding market today

### The top of the market signals premium by importing it

**Grazia Malaysia**, *"From Aisle To Icon: 8 Luxury Bridal Boutiques Every
Malaysian It-Girl Needs To Know About"*, by Adrianna Haris, 26 June 2025 —
`https://www.grazia.my/fashion/luxury-bridal-boutiques-kl-pj/` (fetched 28 Ogos
2026). This is a Malaysian fashion publication defining Malaysian bridal luxury
for a Malaysian reader. It is written in English. Its vocabulary, quoted
verbatim: *"Say yes to the dress"*, *"a rite of passage"*, *"a fairytale
moment"*, *"nothing short of magical"*, *"princess-worthy skirts"*. The
boutiques it celebrates are defined by the Western labels they stock — Oscar de
la Renta, Mira Zwillinger, Elie Saab, Vivienne Westwood.

This is worth stating plainly, because it is the single most useful fact in this
section: **the pastiche the owner ruled out is not a hypothetical risk. It is
the incumbent definition of premium in this market, and it is already
occupied.** Building toward it would put us behind Grazia at Grazia's own game,
in Grazia's own language, for an audience that is not Grazia's.

The one site in my fetched set that uses an editorial serif confirms the
pattern. **thegownatelier.com** loads **Cormorant Garamond** from Google Fonts
(fetched 28 Ogos 2026) — and The Gown Atelier is Malaysia's exclusive Vera Wang
Bride stockist. The serif arrives with the Western label.

### The Malay-native premium brands do something different, and it is measurable

Every one of these was fetched 28 Ogos 2026 and its type and colour read out of
the delivered HTML.

| Brand | URL | Display/body typefaces found | Distinct hex in HTML | Reading |
|---|---|---|---|---|
| **ADNAA** — premium Baju Melayu, nikah couple sets | `https://www.adnaa.com.my/` | `--font-montserrat`, `--font-poppins`, `--font-roboto` | 106 | Geometric sans. No serif anywhere. |
| **Rizman Ruzaini** — one of the largest Malay bridal couture houses | `https://rizmanruzaini.com/` | Montserrat (8 self-hosted `woff`/`woff2`), Felix Titling | 73 | Sans-led. Ground `#ffffff` ×92, ink `#232323` ×45. |
| **Songket Dunia** — sampin songket, baju nikah | `https://songketdunia.my/` | **Jost** (8 self-hosted files), Arial fallback | 28 | Ground `#f4eee1` ×31, ink `#302205` ×22, second ground `#f7f4ec` ×14. |
| **Dentelle Bridal** — bespoke, modest, nikah-to-reception | `https://www.dentellebridal.com/` | Figtree, Nunito (10 self-hosted files) | **5** | `#f6f0ed`, `#e4d8dc`, `#945e69`, `#5a505e`, `#fcfcfc`. |
| **The Gown Atelier** — Vera Wang Bride stockist | `https://thegownatelier.com/` | **Cormorant Garamond** via Google Fonts | 59 | The one serif. Also the most Western-facing brand in the set. |

Two things fall out of this table and both are load-bearing for the register.

**First: serif display is not the Malaysian premium signal. It is the Western
one.** Four of the five Malay-audience-native brands use geometric or humanist
sans. The single serif belongs to the Vera Wang stockist. Any rationale that
begins "premium means serif" is arguing from a bridal-magazine reflex, not from
this market.

**Second, and more useful: the locked palette is already native here.** Songket
Dunia — a brand that literally sells songket — grounds its site on `#f4eee1`
with `#302205` ink. Our locked palette is `#EDEAE1` parchment with `#16130F`
ink. Those are the same decision. A brand whose entire product is the motif
chose warm parchment and deep brown *and used no motif as ornament anywhere on
the page*. That is a real independent confirmation of two of our locked
decisions at once, and it is the strongest single piece of evidence in this
document.

Dentelle's **five colours** is the other number worth keeping. A bespoke bridal
house with a five-value palette against a mass-market publisher with 66 is the
whole argument about restraint, made by the market rather than by me.

---

## (b) Our actual SERP competitors, and where they are weak

### Who they actually are

Identified from live Google results on 28 Ogos 2026 for the site's own money
queries — *mas kahwin ikut negeri 2026 kadar minimum*, *hantaran kahwin lengkap
panduan dulang*, *dewan kahwin murah selangor kl bajet bawah RM5000*, *kursus
kahwin 2026 daftar syarat tempat Malaysia*. HelloKahwin itself returned on three
of the four.

The repo's prior Ahrefs work sets the ranking. Decision 13: **ppsignature.com is
the real market leader** — DR 4, 2,263 MY keywords, 1,493 top-three, ~29,745
visits/month, from a blog attached to a dress shop (Ahrefs Site Explorer, index
2026-08-01). And the correction the company already paid for once, from
`ceo-memory.md`: **nikahsatu.com is the venue operator's own site, not a
publisher.** It is in this table as a SERP occupant, not as a competitor to
out-publish.

### What they look like, measured

All fetched 28 Ogos 2026.

| Site | Page fetched | `font-family` decls | Distinct hex | `<h1>` | `<h2>` | `<img>` |
|---|---|---|---|---|---|---|
| **ppsignature.com** — the leader | `/blogs/latest-blog/kadar-mas-kahwin-di-malaysia-mengikut-negeri` | 3 (Lato via Google Fonts, Arial, Georgia) | 27 | **0** | 4 | 7 |
| **kahwinstudio.com** — the closest thing to a real rival | `/blog/kursus-kahwin` | 3 (Playfair Display, Amiri, Dancing Script) | 12 | 1 | 11 | **2** |
| **mingguanwanita.my** — mass publisher | `/mas-kahwin-mengikut-negeri-2026/` | **30** | **66** | 1 | 8 | 24 |
| **nikahsatu.com** — venue operator | `/` | 4 (system stack, 'Circular', 18 `woff` refs, almost all icon fonts) | 50 | **0** | 59 | 91 |
| **lanaianggun.com** — #1 for *kos kahwin* at DR 2 | `/blog/10-Dewan-Kahwin-Cantik-Murah-di-Selangor-2025` | 1 — `'Arial', sans-serif !important` | 0 | 1 (`"Our Blog"`) | 5 | 4 |
| **theweddingnotebook.com** — the English reference point | `/` | — | 0 | 2 | 5 | 49 |

### Where the weakness actually is

It is not content and it is not budget. **It is that these sites visibly have
nobody in charge of how they look.**

**mingguanwanita.my is the clearest case.** Thirty `font-family` declarations on
one article — Poppins, Montserrat, Muli, Lato, Futura, Helvetica, and a
`-apple-system` stack, several of them carrying `!important`. Sixty-six distinct
hex colours, including `#4db2ec` (cyan, 29 times), `#dd3333` (red, 23 times) and
`#ec1c24` (a *second, different* red, 19 times). Two reds that are not the same
red, on the same page, is not a style — it is the absence of one. Their `<h1>`
is 101 characters: *"Mas Kahwin Mengikut Negeri 2026: Semak Kadar Terkini
Sebelum Nikah, Jangan Keliru Dengan Wang Hantaran"*. Good headline. Nothing in
the page is set up to carry it.

**ppsignature.com is the instructive one, because it is winning.** ~29,745
visits a month, and its top page ships Lato with Arial and Georgia fallbacks,
27 colours, and **no `<h1>` at all**. The market leader is not beating us on
design. It is beating us on having published first. That is worth stating
because it sets the correct expectation for this redesign: **design is not what
closes the ranking gap, and decision 102 already says not to score this work on
SEO.** Design is what makes the traffic we win worth having.

**kahwinstudio.com is the one to actually watch.** It is the only competitor
reaching for an editorial register, and it is the only one whose HTML shows a
deliberate palette — 12 colours, led by `#c4727c` (dusty rose, 25 uses) on
`#faf3f0` and `#fffbf8` grounds with `#2e2826` ink. That is a considered
system. Where it fails is the face selection and the pictures: **Playfair
Display + Amiri + Dancing Script** puts a script face into a procedural article
about course registration, which drops the whole page from publication to
wedding stationery. And a complete guide to *kursus kahwin* ships **two
images**.

So the gap in this market is specific and it is not "be prettier". It is:

> Every site ranking for these queries is either typographically undisciplined,
> photographically empty, or both. Not one of them looks like a publication that
> someone maintains.

That is the hole, and it is a hole we can occupy with care rather than with
budget.

---

## (c) The touchstones, measured

**caratsandcake.com** — fetched 28 Ogos 2026.

The important finding is the discipline, and it is a number. Their homepage HTML
carries **two distinct hex colours**: `#faf9f8` and `#ffffff`. Fifty-five
images, 476 links, one editorial `<h1>`: *"The Art of the Wedding"*, with
"of the" set in italic inside the headline. Hero photography occupies roughly
60–70% of the viewport above the fold; the homepage carries around 18–21
editorial features.

**Their entire display system is one family at one weight.** Typekit kit
`irr0rbw` — `https://use.typekit.net/irr0rbw.css`, fetched 28 Ogos 2026, HTTP
200, 1,248 bytes — declares exactly one family, `ivyora-display`, at
`font-weight: 300`, `font-style: normal`. No second weight. No italic file. No
second family. This confirms decision 116 from the source and it is the single
most transferable thing about them: the restraint people read as expense is one
face, one weight, and two greys.

Worth noting so we do not copy it: they ship **three `<h1>` elements** on the
homepage. DES-09 will not allow that here, and it is not part of what we are
taking.

**partyslate.com — NOT FETCHED.** Returned HTTP 202 with a zero-byte body to
`Invoke-WebRequest` and HTTP 403 to WebFetch on 28 Ogos 2026, from two different
user-agent strings. I have no measurements for it and have not described it.
This is a gap in the evidence for one of the owner's two named touchstones, and
it is the one thing in this document I would fix before DES-02 if the owner
wants it fixed. Decision 101 already records the relevant point about both
touchstones — they are vendor marketplaces and we chose editorial — so the gap
does not block the register.

---

## (d) What our own site actually does today

Measured from the artefact the reader receives: `https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri`
and its shipped stylesheet `/_next/static/chunks/398a50629b70b299.css`
(141,378 bytes), both fetched 28 Ogos 2026.

**The site already has editorial typography. It just has no typeface.**

```css
.hk-display{font-family:var(--font-serif);letter-spacing:-.022em;text-wrap:balance;font-weight:400;line-height:1.08}
```

That is a well-set display rule. Negative tracking, balanced wrapping, tight
leading — someone knew what they were doing. And `--font-serif` resolves through
`--font-cormorant` to `Georgia, "Times New Roman", Times, serif`. The
`@font-face` count in the shipped stylesheet is **0**.

So the headline problem is not that nobody thought about display type. It is
that **the display face is Georgia** — a 1993 screen face drawn for
low-resolution CRTs, doing the job the locked wordmark's register asks
`ivyora-display` to do. That reframes this whole redesign: we are not
introducing editorial structure, we are supplying the face the existing
structure was written for.

**Four defects found on the live page, all reproducible:**

1. **Body text is 14px.**
   `.inspire-prose,.inspire-prose p,.inspire-prose span,.inspire-prose a{font-family:var(--font-prose);font-size:.875rem;line-height:1.5}`
   Fourteen pixels at 1.5 leading, on long-form Malay procedural content, for an
   audience that is 64% mobile.

2. **There is no measure.** The article body element is
   `<div class="inspire-prose max-w-none">`. Its nearest constraining ancestor
   is `max-w-7xl px-2 lg:px-4` — 1,280px less 32px of padding, so up to
   **1,248px** of running text. At 14px in a system sans, taking a conventional
   average advance of 0.5em, that is roughly **175 characters per line**;
   even on a conservative 0.55em estimate it is about 160. The comfortable range
   is 45–75. The character figure is an estimate from the container width and
   the font size, both of which are measured; the advance width is not, because
   the face is whatever the reader's OS supplies.

3. **`.hk-measure` exists and is never used.** `max-width:40rem;margin-inline:auto`
   is defined in the shipped stylesheet. Occurrences of `hk-measure` in the
   delivered HTML of that article: **0**. Someone specified the measure and it
   was never applied.

4. **The heading outline is broken, twice over.** The page ships **two `<h1>`
   elements with identical text** — `<h1 class="hk-display mt-3 text-[1.75rem]">`
   and `<h1 class="hk-display mt-3 text-[2.5rem]">` — one per breakpoint, both in
   the DOM, one hidden by CSS. And the body's 13 subheadings are all `<h3>`; the
   page's only `<h2>` is *"Lagi dalam Hantaran & Mas Kahwin"*, a related-articles
   module. The document outline goes `h1 → h1 → h3 ×13`.

Defect 4 is not just an SEO finding for DES-09. It tells us how the current
system solves responsive type: **by duplicating the DOM node.** Any type scale I
specify has to be fluid, so that nobody ever has to do that again.

---

## (e) The proposed register

### The name and the idea

**A publication of record, warmly printed.**

Not a bridal magazine. A reference work that someone keeps.

The reasoning starts from what we actually publish. Our highest-impression page
is a table of minimum mas kahwin rates by state. The pillar set is *Nikah &
Undang-undang*, *Hantaran & Mas Kahwin*, *Ucapan, Doa & Adab Majlis*, *Sebelum
Nikah*. The real titles read *"Mas kahwin Johor 2026: RM22.50 dan asal usul
angkanya"* and *"Lafaz Taklik: Apa Suami Baca Selepas Akad, dan Apa Ertinya"*.
A reader arrives at these pages with a question that has a **correct answer**,
and they need to trust the answer and be able to find it.

That is not what a bridal magazine is for, and designing like one fights the
content. It is what a gazette, a state religious department's published
schedule, or a well-set reference book is for — registers Malaysian readers
already trust, and which carry no Western bridal freight at all. It is also a
register whose premium signal is **evident care**, which is exactly the axis on
which every competitor in section (b) is weak.

### How this resolves decision 111 honestly

Decision 111 recorded a real contradiction and left it standing: the owner
locked a 10:1 outlined wordmark, which is mostly the air between its letters,
while decision 101's direction argued that whitespace-as-luxury is culturally
specific and wrong for a Malay audience. The log says the density thesis softens
and the register bends around the mark.

It bends like this. **The mark carries the whitespace. The page carries the
density.** A masthead is supposed to be mostly air — that is what makes it a
masthead rather than a headline. A record underneath it is supposed to be
dense — that is what makes it useful. They are doing two different jobs, at two
different scales, which is why both halves of the recorded objection can be
true at once. What we are not doing is spreading the mark's proportions across
the page as vast editorial whitespace, which is the thing the CEO was right to
object to.

Whitespace on our pages has a stated job: **it separates the fields of a
record** — state, rate, issuing authority, date checked — so they can be
scanned. It is not there to signal expense.

### Type: one webfont, and it is the display

This is the significant change from the register drafted in
`tokens.css` on `feat/des-05-design-system-reference`, which names four faces —
Fraunces, Archivo, IBM Plex Mono and Bodoni Moda. DES-04 priced that at
120–200 KB against a site that currently ships **zero** webfont bytes on
purpose, for an audience its own code comments describe as low-end Android on
slow data, and recorded falsifier F3 for exactly this.

**I am firing F3 as the primary specification rather than as a fallback.**

| Role | Face | Bytes |
|---|---|---|
| Wordmark / masthead | Already outlined SVG paths — decision 114, largest file 2.8 KB | **0 font bytes** |
| Article `<h1>` and section display | **One display serif, one weight, subsetted Latin + Malay diacritics.** Provisionally Bodoni Moda; DES-13 decides the face | ~20–30 KB |
| Everything else — deck, body, tables, labels, nav | **System stack, kept** | **0** |
| Monospace | **Dropped entirely** | **0** |

Four reasons, in order of weight.

**One. The body's problem is not its typeface.** It is 14px in a 1,248px
container with no measure. Fixing size, leading and measure costs nothing and
recovers most of the readability. Buying a body webfont spends the entire budget
on the element readers are least able to name.

**Two. The display face must be the same face as the wordmark.** The mark is
outlined SVG. If the `<h1>` beneath it is set in a different serif, the masthead
and the headline disagree, and that disagreement is visible on every article
page. One face, used twice, is both cheaper and more coherent.

**Three. The mono goes because we have no code.** The argument for IBM Plex Mono
would be the rate tables, and system stacks already give us `font-variant-numeric:
tabular-nums`. Figures align without a font file.

**Four. It fits DES-09.** A ~25 KB single-weight subset preloaded with
`font-display: swap` on `<h1>` only is a budget an LCP guardrail can accept
next to full-bleed photography. 120–200 KB, on this audience, probably is not —
and DES-09 holds a veto that is the point of the item.

Type scale, stated as numbers and **fluid**, so nobody duplicates a DOM node
again:

| Role | Mobile 360px | Desktop ≥1024px | Line-height | Measure |
|---|---|---|---|---|
| Masthead | wordmark SVG, min-height 18px per the brand page | wordmark SVG | — | — |
| Article `<h1>` | 30px | 44px | 1.08 | 22ch–30ch |
| `<h2>` | 22px | 26px | 1.25 | ≤ 34ch |
| `<h3>` | 19px | 21px | 1.3 | ≤ 40ch |
| Deck | 18px | 20px | 1.5 | ≤ 60ch |
| **Body** | **17px** | **18px** | **1.65 / 1.7** | **cap 68ch** |
| Table / figure | 16px | 16px | 1.45 | full column |
| Caption, credit | 14px | 14px | 1.45 | ≤ 60ch |
| Label, eyebrow | 13px | 13px | 1.2, tracking +0.08em | — |

Body goes 14px → 17px on mobile, and the measure is capped at 68ch instead of
uncapped. Those two changes are the largest single readability gain available on
this site and neither costs a byte.

**Why the sans should stay neutral and slightly narrow when it is eventually
bought.** Malay compounds run long — *Perkahwinan*, *Perbandaran*,
*Kontemporari*, *Persediaan* — and the live title set runs to 95 characters
(*"20 Lokasi Terbaik Pre Wedding Photoshoot di Malaysia – Dari Alam Semula Jadi
Hingga Urban City!"*). Wide geometric sans of the Montserrat / Poppins / Jost
family, which is what the Malay premium brands in section (a) actually use, set
those strings longer and wrap them worse. If a body face is ever bought, a
narrower grotesque — Archivo is the drafted register's own choice and is a good
one — sets the same string shorter. That is a reason to prefer it *over* the
market's default, not to follow the market.

### Colour: the locked palette, with a rule about how many appear at once

The palette is locked and I am not reopening it. What I am adding is the
discipline, because a palette is a list and a discipline is a decision.

**The rule: any single page renders in at most four palette values plus
photography.** That is the measurable difference against mingguanwanita's 66 and
nikahsatu's 50, and it is the thing a reader feels as *someone is in charge
here*.

Every pairing below was computed, not asserted, using the WCAG 2.x relative
luminance formula.

**Light — ground `#EDEAE1` parchment**

| Pairing | Ratio | Verdict | Use |
|---|---|---|---|
| `#16130F` ink | **15.39:1** | AAA | Body, headings |
| `#4A443C` muted ink | **8.00:1** | AAA | Decks, captions, credits |
| `#5A5348` lighter muted | **6.31:1** | AA | Meta, timestamps — floor for small text |
| `#725825` songket gold | **5.56:1** | AA | Labels, eyebrows, links |
| `#6B2130` oxblood | **9.26:1** | AAA | Warnings and gates only |
| `#16130F` on `#E3DFD4` raised | **13.91:1** | AAA | Cards, table stripes |
| `#725825` on `#E3DFD4` raised | **5.03:1** | AA | Labels on cards |

**Dark — ground `#14110D` night**

| Pairing | Ratio | Verdict | Use |
|---|---|---|---|
| `#EDEAE1` parchment | **15.65:1** | AAA | Body, headings |
| `#C9C3B6` muted | **10.72:1** | AAA | Decks, captions |
| `#A89C88` dimmer | **6.97:1** | AA | Meta — floor for small text |
| `#C9A253` gold | **7.87:1** | AAA | Labels, links |
| `#D98C7A` oxblood-light | **7.15:1** | AAA | Warnings |
| `#EDEAE1` on `#1E1A15` raised | **14.38:1** | AAA | Cards |
| `#C9A253` on `#1E1A15` raised | **7.23:1** | AAA | Labels on cards |

**Three findings the DSE needs before building anything.**

`#A8823C` thread gold measures **2.95:1 on parchment**. The brand page already
says "structural hairlines only, never text". My measurement sharpens that: at
2.95:1 it also fails the **3:1 non-text bar of WCAG 1.4.11**, so it may not draw
the boundary of a control either — not an input border, not a focus ring. It is
a decorative rule and nothing else.

Decorative hairlines measure **1.75:1** (`#B9B2A4` on parchment) and **1.57:1**
(`#3A3630` on night). Fine as rules. The register still needs a token at ≥3:1
against its own ground for control boundaries, which is the same gap DES-04
flagged and the live site already solved once with `--border-strong` at 3.01:1.

**No pure black, no pure white.** Ink on pure white measures 18.52:1 — harsher
than the 15.39:1 the warm ground gives, for no gain. The locked palette's warm
bias is the right call and the numbers support it.

**Dark mode is a live collision and I am flagging it rather than assuming.**
`globals.css` records a deliberate decision of 2026-07-14: the dark palette is
maintained and correct, but there is no ThemeProvider and no class toggle on
`<html>`, so dark is not user-reachable. DES-03 and DES-05 both require light
and dark. Either that decision is reversed as part of this work, or the two DoDs
need a note. **This is the owner's call, not mine, and it is the second thing I
need a decision on.**

### Photography: fewer pictures, much larger

Competitors ship two images on a long guide (kahwinstudio) or 91 thumbnails with
no hierarchy (nikahsatu). Carats & Cake runs a hero at 60–70% of the viewport.

The rules that already bind us — the cover depicts its subject, no text cards
ever, licensed and credited — stay exactly as written in
`aug-23-2026-workflow-content-production.md`. What I am adding is **scale and
count**:

- The cover runs full-bleed to the measure at **4:5 on mobile**, using the
  `crop-4x5-mobile-cover` derivative that already exists at 1920×2400. Mobile is
  64% of impressions and 4:5 is the crop that survives a portrait frame.
- **One supporting photograph per major section, and no more.** The workflow
  document already says "aim for one per major H2". I am making the ceiling
  explicit: a picture that is not carrying a section is removed, not shrunk.
- Photographs sit **flush to the measure**, not inset in a card with a border
  and a shadow. Elevation is not doing any work here and the drafted register's
  `--elevation: none` is right.

**One correction to the brief, on the record.** The DES-02 brief in
`sprint-03.json` says *"Human photography only"*. That was superseded on 26 Ogos
2026 by an owner directive recorded verbatim in
`aug-23-2026-workflow-content-production.md`: *"Lets not lock it to humans only.
Instead I want to focus on high quality images — high definition, ideally taken
by a wedding photographer, high contrast and stands out, looks premium."* Six of
the nineteen current covers are buildings and counters, published under that
reading. I am designing to the later directive. What remains absolute is **no
text cards** and **the cover depicts its subject**. The sprint file's brief text
should be corrected so the next agent does not re-litigate this.

---

## (f) What we will NOT do, and why

1. **No batik, songket or Islamic geometry as border, background, header or
   divider.** Motif-as-ornament is costume. The market proves the point better
   than I can: Songket Dunia sells songket and its site is Jost on cream with no
   motif on the page. The motif informs palette temperature and proportion. It
   does not get applied.

2. **No serif everywhere.** The evidence in (a) says serif display is the
   Western signal in this market, and the one serif site in my set is the Vera
   Wang stockist. The serif stays on the masthead and the `<h1>` — a small
   enough surface that it reads as a masthead rather than as fancy dress.

3. **No English luxury vocabulary, and no visual equivalent of it.** Grazia MY
   already owns "fairytale", "It-Girl" and "Say yes to the dress". That register
   is occupied, it is in the wrong language for our reader, and it is the
   pastiche the owner ruled out.

4. **No script or handwriting faces, ever.** kahwinstudio ships Dancing Script
   on a course-registration guide and it drops the page from publication to
   stationery.

5. **No vendor-marketplace layout.** Decision 101 — both touchstones monetise
   listings and the owner chose editorial. A catalogue designed as a directory is
   a different product, and building one by visual drift is how we would end up
   with it without deciding.

6. **No design investment in category and pillar pages beyond consistency.**
   Decision 86: ~16 impressions and zero clicks across every category URL in 30
   days. They are internal-link plumbing. They get the tokens and nothing else.

7. **No carousels, no autoplay, no parallax, no scroll-triggered animation.**
   DES-09 sets an LCP budget and 64% of impressions are mobile. Motion spends
   that budget on the one thing this audience did not come for.

8. **No pure black and no pure white.** Measured: 18.52:1 versus 15.39:1, for no
   readability gain and a harsher page.

9. **No text cards, as covers or in-article.** Already absolute. Restated
   because it is the rule most likely to be quietly broken when a photograph is
   hard to source, and the correct response is escalation.

10. **No grey-on-grey.** Every text-on-background pairing ships with a measured
    ratio and WCAG AA is the floor, not the target. Restraint that becomes
    unreadable is not restraint.

11. **No second display face, and no mono.** One face for the mark and the
    headline. See (e).

---

## (g) The strongest argument against this direction, and my answer

**The objection.** *You have written a rationale about not looking generic and
then specified the generic default for most of the pixels on the page. Body text
is 90% of what a reader looks at. On the Android phones that are 64% of our
traffic, your system stack resolves to Roboto — the most widely-seen typeface in
the world. You are buying one display face for the headline and leaving the
brand's actual voice to whatever Google shipped with the handset.*

That is the real hit and I do not think it is wrong about the facts.

**The answer.** It is the correct trade at this budget, for a reason that is
specific rather than convenient. What reads as generic on the current site is
not the body face. It is 14px body in a 1,248px container with no measure, a
display class rendering in Georgia, three font variables that all resolve to the
same system stack, and no colour discipline at all. Every one of those is fixed
by decisions that cost zero bytes: 17px, 68ch, fluid scale, four colours a page,
one display serif, photography at scale. A page with those decisions reads as
maintained even when the body is Roboto — and a page without them does not read
as premium even in Archivo.

Meanwhile the 30 KB a body face costs is spent against DES-09's LCP budget, on
cheap Android, on the exact audience the zero-webfont decision was made for, to
change the element readers are least able to name.

I am not claiming the question is closed. **If DES-09's post-ship LCP
measurements show headroom, a subsetted narrow grotesque for body is the first
upgrade I would make, and the DES-03 artifact will carry it as a named, costed
option rather than pretending the trade does not exist.**

There is a second objection worth answering briefly. *A "publication of record"
sounds austere, and couples planning a wedding want to feel something.* True,
and the answer is the photography, not the type. The register is austere in its
furniture — rules, tables, labels, four colours — precisely so that a
full-bleed photograph of a dulang at 4:5 carries all the feeling on the page.
Restraint everywhere else is what makes one picture land.

---

## (h) What this changes downstream

| Item | Effect |
|---|---|
| **DES-02** | Unblocked on approval. The three directions will differ in *composition and photographic scale*, not in palette — the palette is locked. Real Malay titles at real length, including the 95-character one. |
| **DES-03** | Type scale, colour table and contrast ratios above go in as-is. Must add: the two-`<h1>` fix, a fluid scale, the 68ch measure, and the dark-mode decision once the owner rules. |
| **DES-04** | No contradiction. Tailwind v4 stays, Radix stays, `globals.css` is the replacement surface. My change is inside the register the DSE priced, and it fires their own F3. |
| **DES-05** | Needs a control-boundary token at ≥3:1. `#A8823C` cannot be it — measured 2.95:1. |
| **DES-09** | Webfont budget is now ~25 KB, not 120–200 KB. The two-`<h1>` defect and the `h1 → h3` outline are live findings, not redesign risks. |
| **DES-13** | Mine, and it now decides one face rather than one of four. Carats & Cake use `ivyora-display` at weight 300 only — confirmed from their Typekit CSS. Adobe Fonts, subscription. Bodoni Moda is OFL and free. |

---

## Decisions I need from the owner

1. **Approve or redirect the register** — "a publication of record, warmly
   printed", with the serif confined to the masthead and `<h1>`. This is the
   gate.
2. **Dark mode.** The 2026-07-14 decision made it deliberately unreachable.
   DES-03 and DES-05 require it. Reverse the decision, or amend the two DoDs.
3. **Optional:** whether to spend more time getting PartySlate fetched. It is
   one of your two named touchstones and it is the one measurement I could not
   take.

---

## Evidence

All fetches 28 Ogos 2026. Saved HTML in the session scratchpad; commands
reproducible as written.

```powershell
Invoke-WebRequest -Uri https://caratsandcake.com/          # 200, 83,545 bytes
Invoke-WebRequest -Uri https://use.typekit.net/irr0rbw.css # 200, 1,248 bytes -> ivyora-display, weight 300 only
Invoke-WebRequest -Uri https://www.partyslate.com/         # 202, 0 bytes  -> NOT FETCHED
Invoke-WebRequest -Uri https://aliabastamam.com/           # 403           -> NOT FETCHED
Invoke-WebRequest -Uri https://mimpikita.com.my/           # 403           -> NOT FETCHED
Invoke-WebRequest -Uri https://www.adnaa.com.my/           # 200, 1,031,802 bytes
Invoke-WebRequest -Uri https://rizmanruzaini.com/          # 200, 394,775 bytes
Invoke-WebRequest -Uri https://songketdunia.my/            # 200, 299,827 bytes
Invoke-WebRequest -Uri https://www.dentellebridal.com/     # 200, 166,092 bytes
Invoke-WebRequest -Uri https://thegownatelier.com/         # 200, 222,166 bytes
Invoke-WebRequest -Uri https://www.grazia.my/fashion/luxury-bridal-boutiques-kl-pj/  # 200, 248,854 bytes
Invoke-WebRequest -Uri https://www.ppsignature.com/blogs/latest-blog/kadar-mas-kahwin-di-malaysia-mengikut-negeri  # 200, 210,609
Invoke-WebRequest -Uri https://www.kahwinstudio.com/blog/kursus-kahwin  # 200, 172,753
Invoke-WebRequest -Uri https://www.mingguanwanita.my/mas-kahwin-mengikut-negeri-2026/  # 200, 651,525
Invoke-WebRequest -Uri https://nikahsatu.com/              # 200, 491,393
Invoke-WebRequest -Uri https://lanaianggun.com/blog/10-Dewan-Kahwin-Cantik-Murah-di-Selangor-2025  # 200, 43,512
Invoke-WebRequest -Uri https://theweddingnotebook.com/     # 200, 246,582
Invoke-WebRequest -Uri https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri  # 200, 150,992
Invoke-WebRequest -Uri https://hellokahwin.com/_next/static/chunks/398a50629b70b299.css  # 200, 141,378
```

Key extractions, verbatim from the fetched artefacts:

```
hellokahwin shipped CSS  : @font-face count = 0
hellokahwin shipped CSS  : .hk-display{font-family:var(--font-serif);letter-spacing:-.022em;
                           text-wrap:balance;font-weight:400;line-height:1.08}
hellokahwin shipped CSS  : --font-cormorant:Georgia,"Times New Roman",Times,serif
hellokahwin shipped CSS  : .inspire-prose,...{font-family:var(--font-prose);font-size:.875rem;line-height:1.5}
hellokahwin shipped CSS  : .hk-measure{max-width:40rem;margin-inline:auto}
hellokahwin article HTML : occurrences of "hk-measure" = 0
hellokahwin article HTML : <h1 class="hk-display mt-3 text-[1.75rem]">Mas kahwin ikut negeri 2026: ...</h1>
                           <h1 class="hk-display mt-3 text-[2.5rem]">Mas kahwin ikut negeri 2026: ...</h1>
hellokahwin article HTML : <div class="inspire-prose max-w-none"> inside <div class="mx-auto max-w-7xl px-2 lg:px-4">
hellokahwin article HTML : h2 count = 1 ("Lagi dalam Hantaran & Mas Kahwin"), h3 count = 13

caratsandcake HTML       : distinct hex = 2 (#faf9f8, #ffffff); img=55; a=476; h1=3
use.typekit.net/irr0rbw  : font-family "ivyora-display"; font-weight 300; font-style normal  (one family, one weight)

mingguanwanita HTML      : font-family declarations = 30; distinct hex = 66
                           #4db2ec x29, #dd3333 x23, #ec1c24 x19
nikahsatu HTML           : distinct hex = 50; h1 = 0; h2 = 59
ppsignature HTML         : h1 = 0; distinct hex = 27; Lato via fonts.googleapis.com + Arial + Georgia
kahwinstudio HTML        : var(--font-playfair-display), var(--font-amiri), var(--font-dancing-script)
                           distinct hex = 12; #c4727c x25 on #faf3f0/#fffbf8; img = 2
lanaianggun HTML         : font-family: 'Arial', sans-serif !important
songketdunia HTML        : Jost; #f4eee1 x31, #302205 x22, #f7f4ec x14
dentellebridal HTML      : Figtree, Nunito; distinct hex = 5
thegownatelier HTML      : Cormorant Garamond via fonts.googleapis.com
```

Contrast ratios computed with the WCAG 2.x relative-luminance formula
(sRGB linearisation, 0.2126R + 0.7152G + 0.0722B, `(L1+0.05)/(L2+0.05)`).
Full matrix in section (e).

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**Serif display is the Western signal in this market, not the premium one.**
Four of the five Malay-audience-native premium brands I fetched use geometric or
humanist sans; the one that uses a serif is the Vera Wang stockist. Nothing in
the repo says this, and every instinct in the brief points the other way. It is
the reason the register puts the serif on a short leash instead of everywhere.

**And the corollary nobody had written down: the locked palette is
independently confirmed by the market.** Songket Dunia grounds on `#f4eee1` with
`#302205` ink and uses no motif as ornament. Our locked `#EDEAE1`/`#16130F` is
the same decision, reached separately, by a brand that sells songket. That is a
much stronger defence of the palette than anything in the decision log, which
records it as a choice rather than as a confirmed one.

**Third, and the most immediately useful: our site already has the editorial
typography and is missing only the face.** `.hk-display` sets negative tracking,
balanced wrapping and 1.08 leading, and then renders in Georgia. The redesign is
narrower than everyone has been assuming.

### 2. Which document must change, and who owns that edit?

**`docs/sprints/sprint-03.json`** — the DES-02 `brief` field still reads *"Human
photography only, and covers must depict their subject - company rule, applies
to comps too."* That was superseded on 26 Ogos 2026 by the owner directive in
`aug-23-2026-workflow-content-production.md`. Six live covers are already
published under the later reading. **I own this edit** and have made it below.

**`docs/boardroom/decision-log.md`** — the register decision, the one-webfont
call, and the dark-mode collision need recording. **I own this** and have made
it below.

### 3. What did we do twice that we should never repeat?

**Re-litigating the human-photography rule.** It was decided on 25 Ogos, caused
the defect it was meant to prevent, was corrected on 26 Ogos, and the
superseded wording still sat in the sprint file on 28 Ogos waiting to be
believed by the next agent. The general rule: **when a directive is superseded,
grep for its old wording and fix every copy in the same change.** A correction
that lives in one file and not the other three is not a correction.

The near-duplicate: **"Malay diacritic coverage" as a typeface gate** appears in
my own persona and was retracted by decision 117. I read the retraction before
acting on the persona. The next agent might not.

### 4. What did we nearly ship, and what caught it?

**A rationale that assumed serif display equals premium.** The brief names
Carats & Cake, the wordmark is locked to a didone, and the drafted `tokens.css`
already names two serifs. Everything pointed at "set it all in a serif and call
it editorial". Fetching five Malay-audience premium brands caught it — the
market said the opposite, and it said so in measurable numbers rather than in
my opinion.

**And a four-webfont register.** I would have inherited the drafted
Fraunces/Archivo/Plex Mono/Bodoni set without pricing it. Reading DES-04's F3
falsifier before writing caught it. That the engineer had already written the
fallback I independently arrived at is the useful signal here: **when two people
reach the same answer from different directions, promote it from fallback to
specification.**

---

## Edits made from this retrospective

Both edits named in question 2 were made in this change, not deferred.

**1. `docs/sprints/sprint-03.json`, DES-02 `brief` (line 246) — rewritten.**
The retired *"Human photography only"* wording is gone. The field now carries
the 26 Ogos owner directive verbatim, states that six of the nineteen current
covers are places rather than people under the later reading, and names what
still binds: the cover depicts its subject, the photograph is high-quality and
licensed, and no text cards — that last one absolute. The file was re-parsed
after the edit and still validates: 26 items.

**2. `docs/boardroom/decision-log.md` — decisions 125 to 129 added.**
125 records the register and how it resolves decision 111's contradiction. 126
records that the market independently confirms the locked palette. 127 records
the four-faces-to-one webfont cut and that it promotes DES-04's own F3
falsifier. 128 records the three live defects on the highest-impression article,
including that the current system solves responsive type by duplicating the DOM
node. 129 records the two open owner decisions and the one touchstone I could
not fetch.

**3. `docs/work-done/README.md`** — this entry added to the completion index.

**And the general rule from question 3, now applied rather than only stated.**
After correcting `sprint-03.json` I grepped the whole repo for the retired
wording. Every other occurrence is either a historical record correctly
describing what happened, or a brief that already says the rule is RETIRED.
`sprint-03.json` was the only place a superseded instruction was still waiting
to be believed. It no longer is.
