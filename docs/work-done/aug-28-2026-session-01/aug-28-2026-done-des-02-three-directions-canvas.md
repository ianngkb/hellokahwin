# Done — DES-02: three art directions on one canvas, drawn on the live `mas kahwin ikut negeri` page

**Date:** 28 Ogos 2026 · **Sprint 03, DES-02** · **Owner:** `creative-director`
**Brief:** [`aug-28-2026-brief-des-02.md`](../../plans/aug-28-2026-session-01/aug-28-2026-brief-des-02.md)
**Binds:** [`aug-28-2026-done-des-01-art-direction-rationale.md`](aug-28-2026-done-des-01-art-direction-rationale.md) (register approved by the CEO, 28 Ogos), [`aug-28-2026-done-des-13-display-typeface.md`](aug-28-2026-done-des-13-display-typeface.md) (Bodoni Moda 2.005)

## THE CANVAS

**https://claude.ai/code/artifact/1936d75a-b30a-47ec-9239-fde2c232c0b9**

Eleven artboards across four pages. Open on page 1 and read **Nota — baca dulu**
first; it carries the case and the cost for each direction, the shared numbers,
my recommendation and the strongest argument against it.

| Page | Artboards |
|---|---|
| **Nota & tiga arah** | The reading, then the same live article drawn three ways at 1440px |
| **Telefon, terang & gelap** | Each direction at 390px, light and dark side by side |
| **Katalog** | Each direction applied to `Hantaran & Mas Kahwin`, the real 38-article category |
| **Ujian** | Four cases a static mock omits, drawn in all three directions |

**The item is not closed. It is waiting on one decision: which direction.**
Everything downstream of that answer is mine and does not come back to the
owner.

---

## The three, in one line each

| | Idea | Case | Cost |
|---|---|---|---|
| **A · Warkah** — the record | The answer sits above the fold; the photograph works inside the grid at column width | Our highest-impression page is a rate table, and six of fourteen jurisdictions fix no minimum — no competitor prints that. A puts it in the first screen, and it is the cheapest to load | The least emotional of the three. A couple planning a wedding meets a gazette |
| **B · Dulang** — the object | The photograph is the page. Full bleed, 4:5 on a phone, headline on its own parchment ground | Every competitor measured for DES-01 is photographically empty. Restraint everywhere else exists so one picture can land, and B is the direction that spends it | It spends the LCP budget on the first screen for a reader who came for a number, and it breaks outright when a cover is missing |
| **C · Margin** — the annotated reference | A 68ch column beside a permanent 268px rail carrying the record's meta; the table is the one moment the spread opens | The only direction that gives the meta a permanent home. Absorbs a long Malay title better than either of the others | The rail is a desktop idea and 64% of impressions are mobile. It lies down as a ruled band on a phone, which is a real answer, but the distinctive part is what most readers never see |

**My recommendation is A**, and the reason is the library rather than my taste.
See the finding below.

**They vary in composition and photographic scale, not in palette.** That is
what DES-01 section (h) said DES-02 would do, and it is what these do. All
three obey the approved register: the same four colours, the same type scale,
Bodoni Moda on the masthead and `h1` only, no motif as ornament, no text cards,
no text set over a photograph anywhere.

---

## What is real in these comps

Nothing here is placeholder.

| | Source |
|---|---|
| Article | `https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri`, fetched 28 Ogos 2026, 200, 156,866 bytes |
| Headline, deck, body, section headings | Copied from that page's delivered HTML |
| The rate table | The live table's own rows: Selangor RM300, WP RM300, N. Sembilan RM200/RM100, Melaka RM100, Pahang RM100, Johor RM22.50 *belum disahkan*, and the four jurisdictions that set nothing |
| Category page | `Hantaran & Mas Kahwin`, 38 articles, from `docs/design/des-06-evidence/corpus-2026-08-28.tsv` |
| Article titles in the catalogue | Real, live, in the pairing the live site already uses |
| The 95-character stress title | *"20 Lokasi Terbaik Pre Wedding Photoshoot di Malaysia – Dari Alam Semula Jadi Hingga Urban City!"* — the longest in the 86-title corpus |
| Photographs | Eleven files pulled from `images.hellokahwin.com`, all licensed, all credited in the comps in the site's own `Kredit:` format |
| Empty-category case | `Pantai Santai` — one article in the corpus, the thinnest real category we have |

**The Ujian artboard's pictures are stand-ins and the artboard says so on its
face.** That artboard tests wrapping and emptiness, not cover selection.
Everywhere else the photograph sits with the article the live site already
pairs it with, and I did not reshuffle them to flatter any direction.

---

## Findings

### 1. Our photo library splits four to seven, and that decides A against B

I pulled eleven photographs off our own CDN for this canvas, taking each from
the page that uses it. **Four are close-up object frames** — brass tepak sirih
on a dulang, a Quran in a white cage, two frames of stacked dulang under red
cloth and lace. They hold at any size. **Seven are documentary group
snapshots**, several of them 2009-era Flickr, and they come apart above roughly
300px.

Page 3 of the canvas shows it without an argument. B's catalogue runs six
covers at 330px; three are object frames and look expensive, three are group
snapshots and look like a family album. Same grid, same treatment, same
palette.

**So the choice between A and B is not really a taste question.** B stakes the
whole first screen on the picture, and we have the smaller half of a library to
stake it with. If the owner picks B, a picture commission comes first, and it
is not budgeted. This is a sharper version of DES-01's photography section,
which knew the covers had to depict their subject but had not counted what the
library can actually carry at scale.

### 2. A tint of the four is not a fifth colour, and it holds the ONE COLOUR RULE

DES-01 fixed the rule at four palette values per page plus photography, and
then listed a raised ground `#E3DFD4` and a hairline `#B9B2A4` as separate
tokens. Obeying both is impossible: rules and stripes take you to six.

Every rule, stripe and boundary in these comps is drawn as an alpha tint of the
ink or the parchment, so the page renders in exactly four hexes. Measured:

| Tint | Composites to | On its ground | Job |
|---|---|---|---|
| Ink at 5% on parchment | `#E2DFD6` | 1.11:1 | Table stripe |
| Ink at 12% on parchment | `#D3D0C8` | 1.28:1 | Field separator |
| Ink at 22% on parchment | `#BEBBB3` | 1.59:1 | Section rule |
| **Ink at 47% on parchment** | **`#88857E`** | **3.06:1** | **Control boundary** |
| Parchment at 20% on night | `#3F3C37` | 1.71:1 | Section rule |
| **Parchment at 37% on night** | **`#64615B`** | **3.05:1** | **Control boundary** |

**The last two rows close the gap DES-01 named and DES-05 needs**: a token at
≥3:1 against its own ground for input borders and focus rings. Thread gold
`#A8823C` measures 2.95:1 on parchment and still cannot do that job.

### 3. No text over a photograph, in any direction

A contrast ratio against a photograph cannot be measured, so it does not get
asserted. B overlaps the headline onto the cover on a parchment card — the
device PartySlate uses and DES-01 recorded — and every credit sits on the
ground. This is stated so the DSE does not later "improve" B by dropping the
card.

### 4. Two composition defects the render caught, both fixed

The three article artboards were rendered in Chrome and measured before
publishing, not eyeballed in source.

- **A** left 300px of dead rail beside the photograph. The section index and
  the source list moved up into it. A rail that is empty for a screen and a
  half is not restraint, it is a hole.
- **C** ran the text column dry for ~360px while the rail was still going, and
  its masthead nav collided with the search label because the 268px rail leaves
  836px for a wordmark plus three long Malay category names that need 897px.
  Two real paragraphs from the live article filled the column; the nav dropped
  to two items plus *Lagi*. **The nav cost is C's, and it is a real one** — the
  rail is paid for in header width.

---

## Contrast, verified rather than asserted

Computed with the WCAG 2.x relative-luminance formula, not quoted.

**Light, on parchment `#EDEAE1`** — ink `#16130F` **15.39:1**, muted `#4A443C`
**8.00:1**, gold `#725825` **5.56:1**.
**Dark, on night `#14110D`** — parchment `#EDEAE1` **15.65:1**, muted
`#C9C3B6` **10.72:1**, gold `#C9A253` **7.87:1**.

Every pairing is AA or better, and the smallest text on the page (13px labels
in gold) is the 5.56:1 one. Dark is drawn beside light on page 2 rather than
translated from it; the 2026-07-14 decision that dark stays unreachable to a
reader still stands.

---

## Type, as shipped in the comps

One webfont. **Bodoni Moda 2.005**, SIL OFL, loaded as a variable face and
pinned per surface: the wordmark at `wght 400, opsz 6` with 0.092em tracking
(decision 143), the `h1` at `wght 400, opsz 11` with −0.022em tracking. Nothing
else uses it. Deck, body, tables, labels and nav are the system stack, which is
what the site ships today and costs nothing.

Body is 17px on a phone and 18px on desktop at 1.65/1.7, capped at 68ch. The
live article ships 14px at 1.5 in a container up to 1,248px wide. The full
scale is on the Nota artboard with sizes, leading and measures at both ends.

---

## Verification

```
canvas artboards           : 11, seeded and checked -> "ok: ... 23 files"
rendered heights, Chrome   : Nota 4738 · Main 2511 · Dulang 2715 · Margin 2093
                             Ujian 1943 · katalog 1710/1426/1402 · telefon 1000 x3
                             every frame in canvas.json is >= its content, so nothing clips
live article fetch         : 200, 156,866 bytes, 28 Ogos 2026
live homepage fetch        : 200, 80,782 bytes, 28 Ogos 2026
photographs                : 11 files, 200 each, from images.hellokahwin.com
published artifact         : HTTP 200
```

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**The library, not the register, decides how much page a photograph can own.**
Four of eleven frames survive being enlarged; seven do not. Nothing in DES-01,
the visual asset strategy or the workflow document records this, and it is the
single fact that separates two of the three directions. A rule that says
"covers depict their subject" is about *what* is in the frame. Nobody had
written down anything about *how big the frame can get*.

**And the general version, which is the one worth keeping: a design direction
that depends on an asset class you do not hold is a commissioning decision
wearing a layout costume.** B is not a more beautiful version of A. B is a
budget request.

**Second: obeying the ONE COLOUR RULE literally requires a device nobody had
named.** DES-01 set the ceiling at four values and then listed six tokens.
Drawing every rule and stripe as an alpha tint of the ink resolves it, holds
the count at four, and produced a control-boundary token at 3.06:1 that DES-01
had flagged as missing and DES-05 was going to need. The rule got stricter and
gained a token in the same move.

**Third, about method: I rendered the comps in a browser and measured them
before publishing, and it caught two defects I would have shipped.** A dead
300px rail in A and a nav collision plus a dry column in C. Both are the kind
of thing that reads fine in source and looks broken on screen. **Authoring a
comp is not the same as looking at it, and I had been treating them as the same
act.**

### 2. Which document must change, and who owns that edit?

**`.claude/agents/creative-director.md`, line 129 — and I have NOT edited it,
deliberately.** It still opens its hard rules with *"HUMAN PHOTOGRAPHY ONLY,
and a cover must depict its subject. Company rule, not your preference."* That
was superseded on 26 Ogos 2026 by the owner directive in
`aug-23-2026-workflow-content-production.md` and corrected by DES-01. The file
is my own configuration, and an agent brief cannot authorise me to rewrite my
own persona. **`ceo-hellokahwin` owns this edit**, through skillcentral and
`/endsprint`, and it should be made before the next agent reads it as binding.

Six of nineteen live covers are already published under the later reading. Had
I followed my persona's wording literally today, the akad photograph on the
article comps would have been the only admissible cover and the dulang
photographs in the catalogue — objects, not people — would have been
disqualified. **The retired rule would have thrown out the four best frames we
own.**

**`docs/sprints/sprint-03.json`, DES-02** — the item's state and the canvas
URL. **I own this** and have made it below.

**`docs/boardroom/decision-log.md`** — the three directions, the tint rule and
its control-boundary token, and the library finding. **I own this** and have
made it below.

**`docs/work-done/README.md`** — the index row. **Mine, made below.**

### 3. What did we do twice that we should never repeat?

**We failed the same correction twice, in exactly the way DES-01's own
retrospective said we must not.** DES-01 wrote the rule — *"when a directive is
superseded, grep for its old wording and fix every copy in the same change"* —
then reported that `sprint-03.json` was the only surviving copy. It was not.
`.claude/agents/creative-director.md` carries it too. The grep was scoped to
tracked files, and that file is untracked by design (decision 20), so it fell
through a gap between two correct decisions.

**The rule needs one word added: grep the working tree, not the index.** A
superseded instruction is dangerous because an agent reads it, and an agent
reads files on disk. Git does not know which of those the next agent will
believe.

**The near-duplicate:** I read my own persona's photography rule at the start
of this item, recognised it as retired from DES-01, and worked from the
corrected version. The next agent has no guarantee of doing that, which is why
it is question 2's answer rather than a footnote.

### 4. What did we nearly ship, and what caught it?

**Alt text describing photographs I had not looked at.** I named eleven images
from their CDN slugs — `dulang-kek-coklat-buah-hantaran`,
`tujuh-dulang-hantaran-rombongan` — and wrote alt text from the slugs. When I
finally built a contact sheet, `c-kek` was a bride seated with her family and a
cake on the floor, and `c-tujuh` was a group standing in front of a house. The
slugs were not wrong, they were partial: they named the object and omitted that
the frame is mostly people. **Every alt attribute in the canvas was wrong, on
an accessibility surface, in a document arguing for care.** Rebuilding the
contact sheet caught it, and the same look produced finding 1.

**The rule: a photograph is not sourced until it has been looked at.** A
filename is metadata about a picture, not the picture.

**And a smaller one: I nearly used the live cover for the mas kahwin article**,
which is a bersanding/pelamin frame — decorative for a page about minimum
rates. The akad photograph depicts the moment the article is about, and the
live figcaption says so in as many words. The swap is an art-direction call and
is recorded here rather than made quietly.

---

## Edits made from this retrospective

Both edits I own were made in this change, not deferred. The third is named,
scoped, assigned, and explicitly not made.

1. **`docs/sprints/sprint-03.json`, DES-02** — state moved from `todo` to
   `blocked` with a new `awaiting-owner-choice` flag, and the canvas URL
   appended to the brief. **It is not marked `done`,** because the DoD says the
   owner names the winner and the owner has not yet. Narrowing that to match
   what I got would be exactly the thing the standing rules forbid.
2. **`docs/boardroom/decision-log.md`** — decisions 149 to 152 added.
3. **`docs/work-done/README.md`** — this entry added to the index.
4. **`.claude/agents/creative-director.md`** — NOT edited. Named, assigned to
   `ceo-hellokahwin`, with the reason above.
