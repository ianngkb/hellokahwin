# DES-18 — the mid-size image variant, shipped

**Sprint 05 · track `design` · 5 points · `design-systems-engineer`**
**01 September 2026.** Merged as [PR #42](https://github.com/ianngkb/hellokahwin/pull/42),
merge commit `9114cdf`, live on <https://hellokahwin.com>.

---

## In one sentence

`crop-4x3-article-card-sm` — **528 × 396 WebP inside a 46,080 B ceiling** —
exists in the pipeline, is generated for every cover in the corpus, and is served
to the `.s-row` thumbnail on production, where it took the twelve homepage rows
from **646,824 B to 271,764 B** and the UI-06 gate from `image-aspect 5` to
**`UILINT EXIT: 0`**.

---

## 1. The gate the brief opened with, and its answer

> *Re-test whether DES-03 §6's byte ceilings are still binding now that every
> cover is confirmed to carry 1600×1200 and 1920×2400 crops. If the ceilings are
> no longer binding the item may be much smaller than 5 points.*

**Answer: they are still binding, they bind harder than DES-03 recorded, and the
premise the question rests on is false.**

### 1a. "Every cover is confirmed to carry 1600×1200 and 1920×2400 crops" — it does not

Enumerated from the production database, all 86 published articles, 01 Sept 2026.
Not tested for the expected value — enumerated, and the whole distribution printed:

```
crop-4x3-article-card          crop-4x5-mobile-cover
  69 × 1600x1200                 51 × 1920x2400
   3 × 1536x1152                  5 × 1366x1707      + 20 other sizes,
   4 ×  667x500                   4 ×  400x500         singly and in pairs
   … 12 distinct widths:          … down to 400 px wide
     667, 771, 907, 908, 911,
     1032, 1280, 1307, 1365,
     1536, 1599, 1600
```

`crop-4x3-article-card` is 1600×1200 for **69 of 86**, not 86 of 86. The crop
targets are ceilings, not promises — `generateSmartCrops` resizes with
`fit:'inside', withoutEnlargement:true` — so a source smaller than the target
yields a smaller file. Seventeen covers are smaller.

**This is load-bearing, not pedantry.** It is what sets the box. 528 is the
largest useful width that upscales *nothing*: the narrowest source is 667. An
800px box would have shortened 5 covers and a 1024px box 9, and
`withoutEnlargement` makes those silently short files rather than errors.

### 1b. DES-03 §6.2's "Measured max" column was measured on the wrong corpus

§6.2 records `crop-4x3-card-sm` (480×360 q72) as **"measured max 37,708 B —
within budget"** against a 46,080 B ceiling.

Re-run with **§6.2's own encoder**, `des-03-evidence/derivatives.py`, PIL LANCZOS
+ `method=6`, unmodified:

| corpus | n | min | median | max | vs the 46,080 B ceiling |
|---|---|---|---|---|---|
| DES-02's eleven photographs | 11 | 8,324 B | 25,500 B | **37,708 B** | within budget — reproduces §6.2 **to the byte** |
| the 86 live `crop-4x3-article-card` covers | 86 | 9,518 B | 21,344 B | **53,606 B** | **OVER by 16.3% — 1 file** |

The eleven reproducing 37,708 B exactly is what makes this a finding about the
corpus rather than about my instrument. Cross-checked with a second encoder —
sharp gave 53,370 B for the same file, 0.4% from PIL's 53,606 B — so it is not an
encoder artefact either.

The offender is **`songket-tenunan-tangan-atau-cetak`**. Handwoven songket is
close to worst-case entropy for a block encoder, and nothing like it was in the
eleven.

**§6.2 flagged this itself and was not read as flagging it.** `derivatives.py`
ends:

> *"NOTE the sources are already downsampled copies (800x600 and 900x1200), so
> these figures are the derivative sizes for THESE files. A re-encode from the
> 1920x2400 original will differ; **the ceilings are what the DSE must hit, not
> these numbers.**"*

The verdict column said `within budget` anyway. **A verdict outlives a caveat**,
and four rows of green text are what the next reader carries away.

**Corrected at source**, per the standing rule: docs line, branch
`feat/command-centre-dashboard`, commit **`f3aa0b2`**. The ceilings are *not*
corrected — they stand, and this item built to them. What is corrected is the
claim that they had been confirmed. (The correction is on the docs branch, not on
`master`: `master` has no `docs/design/des-03-*`.)

### 1c. Therefore the item is not smaller than 5 points

The ceiling is the design input, and it cannot be met by a constant. That is what
produced the quality ladder rather than a fixed `q50`.

---

## 2. What shipped

### The rendition — `src/lib/storage/midsize-cover.ts`

| | |
|---|---|
| name | `crop-4x3-article-card-sm` — R2 object key **and** `coverImageSmartCrops` key |
| box | **528 × 396** — the 176 CSS px desktop slot at DPR 3 exactly |
| ceiling | **46,080 B** — DES-03 §6.2's card ceiling, on a box 21% larger in area, so strictly tighter than DES-03 asks |
| quality | ladder `50 / 46 / 42 / 38 / 34 / 30`, first rung that fits wins |
| derived from | the stored `crop-4x3-article-card` — a **resize, not a re-crop** |

**It is not a `CROP_TARGETS` entry, and that is the entire cost model.**
`GEOMETRY_VERSION` is derived from that array and embedded in every crop URL, so
a fifth member re-cuts all 86 live covers through Rekognition + R2 — an AWS-cost
decision belonging to the owner, which UI-03 and DES-08 both declined to make.
The rendition is generated *inside* `generateSmartCrops`, in the same loop, from
the crop buffer already in memory, so every future cover gets it without the
array being touched.

Generating it there also avoids a trap: `processSmartCrops` **replaces** the whole
`coverImageSmartCrops` object on every regenerate. A rendition written only by the
backfill would be silently dropped the first time an admin moved a focal point,
the row would fall back to `low`, and nothing on the page would look wrong.

### Measured across all 86 covers

```
min 7,636 B   median 17,664 B   max 44,898 B   total 1,671,736 B
85 of 86 land on q50.  songket-tenunan-tangan-atau-cetak steps to q46.
0 over ceiling.
```

At a fixed q50 the songket would have been **47,628 B — over**. The ladder is the
ceiling made executable rather than asserted.

### The render path — `resolveRowThumbSource`

A **separate** function from `resolveCoverSource`, deliberately. That one feeds
four differently-sized slots and switching all of them to a 528px file would be a
regression in two:

| slot | box | 528px there |
|---|---|---|
| `.s-row` | 80×60 / 176×132 | 3.0× at DPR 3 — **this function** |
| `.s-card` | ~328–700 px wide | **upscales** on desktop |
| article cover figure | `aspect-[3/2]`, to 768 CSS px | **upscales at DPR 1**, wants a 1.500 asset, and is the LCP element on the highest-traffic template |

It returns the crop's **stored** width/height, so `width`/`height` on the `<img>`
state the file's real intrinsics (hero-rules R4/R6) instead of restating the CSS
box. `getSmartCropRef` returns all three or nothing, so an entry with unrecorded
dimensions degrades to `low` with `null` dimensions rather than shipping an
asserted number — the exact defect R4 exists to name.

### Files

| file | what |
|---|---|
| `src/lib/storage/midsize-cover.ts` | new — the spec, the ceiling, the ladder, and the measurements behind each |
| `src/lib/storage/smart-crop.ts` | `renderMidsizeCover` + generation inside `generateSmartCrops` |
| `src/lib/storage/responsive-cover.ts` | `resolveRowThumbSource` |
| `src/app/(public)/page.tsx`, `artikel/[category]/page.tsx`, `artikel/[category]/[slug]/page.tsx` | the three `.s-row` call sites |
| `src/app/(admin)/admin/design-system/page.tsx` | the reference-page entry, same change |
| `scripts/backfill-midsize-cover.mts` | the backfill, with the undo dump |
| `scripts/measure-above-fold-bytes.mjs` | new rig — what a reader who has not scrolled pays |
| `src/lib/storage/__tests__/midsize-cover.test.ts` | 12 tests |

---

## 3. The DoD, line by line

### "…is SERVED to at least one real surface on live production — proved by fetching that surface and quoting the variant URL and its Content-Length from the response headers"

Enumerated from the live homepage HTML — occurrences, not lines, and halved for
the copy Next.js emits twice:

```
24 crop-4x3-article-card-sm     ->  12 rows, all twelve
 0 /low.webp
```

Two of the renditions, fetched from the CDN:

```
GET https://images.hellokahwin.com/inspire/songket-tenunan-tangan-atau-cetak/
      1787654687597-images-s-songket-limar-terengganu-daderot/crop-4x3-article-card-sm.webp
HTTP/1.1 200 OK
Content-Type: image/webp
Content-Length: 44898
Cache-Control: public, max-age=31536000, immutable
      -> decoded 528 x 396 WEBP

GET https://images.hellokahwin.com/inspire/tempat-beli-hantaran/
      1787780709236-images-s-dulang-buah-hantaran-mohd-hasan/crop-4x3-article-card-sm.webp
HTTP/1.1 200 OK
Content-Type: image/webp
Content-Length: 15260
Cache-Control: public, max-age=31536000, immutable
      -> decoded 528 x 396 WEBP
```

`tempat-beli-hantaran` is the article whose portrait `low` caused all five gate
violations. Its 4:3 rendition is **15,260 B** against the 54,814 B portrait it
replaces.

A 200 proves nothing on its own, so both were decoded and their pixel dimensions
read, and the negative control is in the enumeration above: **zero** `low.webp`
on a page that carried twelve before.

### "Total bytes for the homepage above the fold measured before and after, both figures pasted"

Definition used, and it is stated because it is arguable: **every byte the
browser transfers at a stated viewport before the reader scrolls.** Not "bytes of
elements intersecting the viewport" — a reader is not billed for layout.
`scripts/measure-above-fold-bytes.mjs`, committed.

```
BEFORE  200 PRERENDER  sin1::8k2vf-1788200624979-e0445c45a51c
        css=[19b83a0982f1e330 eaa300a9560545ab 8e7508183b8deda1] dpl_4Gbs6FyA1AgXPuE7ZfJMVdUtimJV
  @390px    1,412,830 B      @1440px    1,653,985 B

AFTER   200 HIT age=14  sin1::4glmb-1788201898724-42f68ceddbfd
        css=[19b83a0982f1e330 eaa300a9560545ab 8e7508183b8deda1] dpl_CJAxiquN7Yqesa3kzMg1FgUqRbiu
  @390px      979,304 B      @1440px    1,136,689 B
                −433,526 B                 −517,296 B
                  −30.7%                     −31.3%
```

**⚠ Those two totals are NOT a like-for-like comparison and must not be quoted as
one.** Between them, other sessions published three articles and the homepage
rotated: the hero changed from `adat-hantaran-ikut-keluarga` to
`doa-makan-majlis`, whose hero crop is 283,798 B lighter at 1440px. Most of the
apparent win at 1440 is a different photograph, not this item.

**The un-confounded figure**, measured on the same twelve articles the homepage
carries now, `low` against `-sm`, by HTTP `Content-Length`:

| slug | `low.webp` | `-sm` | delta |
|---|---:|---:|---:|
| barang-hantaran-perempuan | 82,110 | 32,866 | −49,244 |
| barang-hantaran-berguna | 68,882 | 28,638 | −40,244 |
| persiapan-hantaran-kahwin | 64,276 | 27,256 | −37,020 |
| adat-hantaran-ikut-keluarga | 63,724 | 27,000 | −36,724 |
| ucapan-ulang-tahun-perkahwinan | 61,244 | 26,144 | −35,100 |
| tempat-beli-hantaran | 54,814 | 15,260 | −39,554 |
| hantaran-kahwin-bajet | 51,258 | 22,094 | −29,164 |
| berapa-dulang-hantaran-tunang | 50,532 | 22,254 | −28,278 |
| barang-hantaran-tunang | 49,856 | 23,422 | −26,434 |
| hantaran-tunang-simple | 40,182 | 17,984 | −22,198 |
| hantaran-untuk-lelaki | 36,964 | 17,664 | −19,300 |
| doa-penutup-majlis | 22,982 | 11,182 | −11,800 |
| **TOTAL** | **646,824** | **271,764** | **−375,060 (−58.0%)** |

Every row is lighter. There is no row where this costs bytes.

### "the after figure must not exceed the before figure by more than a stated budget agreed in the log"

**Budget stated and agreed here: 0 bytes.** This item is not permitted to cost the
reader anything, because the whole reason `card-thumbnail-image-rules.md` §4
stopped was that the alternative cost +8.2 MB. It came in at **−375,060 B** on
the surface it changed. The budget was never drawn on.

### "UI-06's aspect and upscale gate still passes at 0 violations after the change"

```
BEFORE                                  AFTER
image-upscale        0                  image-upscale        0
image-aspect         5                  image-aspect         0
image-attr-aspect   66 (advisory)       image-attr-aspect   61 (advisory)
image-unmeasurable   0                  image-unmeasurable   0
UILINT EXIT: 1                          UILINT EXIT: 0
```

The five were one article at five widths — `tempat-beli-hantaran`'s 1200×1800
`low` in a 1.33 box, "100% off … ~50% of the frame kept (ceiling 25%)" — exactly
as `card-thumbnail-image-rules.md` §4 named it. The whole gate now exits 0, not
just those two checks.

### "generated for every cover in the corpus"

86 at the first pass, **0 failed, 0 over ceiling**. Three articles were published
by other sessions while this was in flight, so a second pass ran: *"89 published
article(s) with smart crops · 3 to render · 86 already done"*. **89 of 89.**
Verified independently from the database rather than from the script's own report
— all 89 carry the key, all at `528x396`, enumerated.

---

## 4. Production writes, and the undo

Both additive; nothing existing was overwritten or deleted.

- **R2** — `PUT <cover-dir>/crop-4x3-article-card-sm.webp`, a key that held no
  object before this item. 89 objects, ~1.73 MB.
- **DB** — one added JSONB key on `articles.cover_image_smart_crops`. The four
  existing crop entries were read and rewritten unchanged.

Undo dumped **before the first write** and pushed:
`docs/work-done/sep-01-2026-session-01/des-18-undo-2026-09-01.json` (86 rows) and
`…-pass2.json` (3 rows) — each row's prior `cover_image_smart_crops` verbatim, the
R2 keys added, and the reversal:

```sql
UPDATE articles
   SET cover_image_smart_crops = cover_image_smart_crops - 'crop-4x3-article-card-sm'
 WHERE id IN (<the ids listed in the undo files>);
```

After a reversal the R2 objects are orphaned and safe to leave: no code path reads
a key absent from the JSONB.

---

## 5. Checks I ran against my own checks

**The re-queue guard was watched going red, twice, in the two different ways it
can be broken.**

```
control 1 — a fifth CROP_TARGETS entry:
  × still hashes to the token the live crop URLs carry
  × does not list the mid-size rendition as a crop target
  Tests  2 failed | 10 passed
control 2 — same four names, ONE dimension moved by 1px:
  AssertionError: expected 'ca15a3a1' to be '48c0b959'
  Tests  1 failed | 11 passed
restored:
  Tests  12 passed (12)
```

Control 2 matters more than control 1: it is the case the source comment invites
— *"Change dimensions freely; never change a name."* Changing a dimension is
exactly what silently re-queues every cover, and the names assertion does not see
it.

**The quality ladder was verified against the failing case, not reasoned about.**
Over all 86: 85 on q50, `songket-tenunan-tangan-atau-cetak` on q46. It fires on
the defect and clears on inputs differing in exactly that one thing.

**The measurement instrument was validated against a published number before it
was believed.** PIL on DES-03's eleven → 37,708 B, which is §6.2's printed figure
to the byte.

**No `grep -o -i -F`.** Everything counted here was enumerated
(`grep -oa … | sort | uniq -c`) and every zero was paired with a positive: "0
`low.webp`" is only meaningful beside "24 `crop-4x3-article-card-sm`" on a page
that carried twelve `low` before.

**Baseline lint checked before blaming myself.** The two `no-img-element`
warnings on `page.tsx` are identical on `master`; this item introduced none.

465 tests pass, `next build` clean, 0 lint errors.

---

## Retrospective

### What we learned that is not written down

**A verdict outlives its caveat, and this company keeps writing both.**
`derivatives.py` says in plain English that its numbers are provisional and that
"the ceilings are what the DSE must hit, not these numbers". §6.2 printed
`within budget` in green four times. Three sprints later that green text was
carried forward as settled, and this item was scoped around a constraint whose
confirmation had never existed. The caveat was in a Python docstring; the verdict
was in a table. **Nobody reads the docstring.**

**A ceiling asserted by a constant is not a ceiling.** `q50` met the budget on 85
of 86 files. The 86th was a fabric. The corpus grows every week — three articles
landed *during this item* — so any fixed quality is a claim about today's photo
library, which is the same failure shape as UI-04 measuring the labels that
happened to be on the page.

**"Every cover has X" was false and cost nothing to check.** One query. It changed
the box from a number I would have picked (1024, "a nice mid-size") to the number
the corpus permits (528), and would have shortened 9 covers if I had trusted it.

### Which document must change, and who owns the edit

1. **`docs/design/des-03-spesifikasi.html` §6.2** — Creative Director's document,
   edited by me under "the evidence wins and the file gets corrected at source".
   **Done**: commit `f3aa0b2` on `feat/command-centre-dashboard`. The verdict cell
   is now `OVER on the live corpus`, both figures are shown, and the reason §6.2's
   own script already gave is quoted in the document where the table is, not in a
   docstring.
2. **`docs/design/card-thumbnail-image-rules.md`** — Creative Director's, §4 ended
   *"Stopped and reported. Count: 86."* A reader arriving today would conclude the
   gap still exists. **Done**: new §6 records what shipped against §4's own
   predictions, which came in within 0.3%.
3. **`src/app/(admin)/admin/design-system/page.tsx`** — mine. Its UI-12 entry
   already said this slot goes to a 4:3 rendition *"the day a small rendition of
   it exists"*. **Done, in the same commit as the component change**, per the rule
   that the reference page and the real UI never diverge.

### The executable form, because prose rules do not fire

Two of the three edits above are prose and will be believed exactly as long as
someone reads them. The rule that will actually fire is in
`src/lib/storage/__tests__/midsize-cover.test.ts`:

```
GEOMETRY_VERSION is not moved by the mid-size rendition
  > still hashes to the token the live crop URLs carry     -> 48c0b959
  > does not list the mid-size rendition as a crop target
```

Anyone who adds a crop target, or nudges one by a pixel, gets a red test naming
the AWS cost — not a paragraph they might read. It was watched failing in both
directions before it was trusted.

**A second one belongs here and is not in this item.** The quality ladder bounds
the byte ceiling at *write* time, and nothing checks it afterwards: a rendition
regenerated by a future code path could exceed 46,080 B and no gate would notice.
The right home is a `ui-layout-gate.mjs` check asserting that every
`crop-4x3-article-card-sm` a page serves is within its ceiling — a byte assertion,
which that gate currently has none of. Raised as a follow-up rather than smuggled
in: it is a change to a shared gate with its own self-test suite, and it needs its
own paired assertions.

### What we did twice that we should never repeat

**Measured a rendered page against a URL instead of against a build, and got
caught by it — again.** UI-06 wrote this rule down after production changed three
times in one afternoon. I recorded deployment ids and CSS hashes as instructed,
and still had my before/after totals confounded — because the thing that moved
was neither the build nor the cache, it was **the content**: three articles
published mid-run rotated the homepage and changed the hero photograph. The
existing rule says "record the deployment id, the cache state and the CSS chunk
hashes". That is not enough on a page whose composition is a query. **A
whole-page byte total on a content-driven surface is not a repeatable
measurement, and no fingerprint fixes that** — the per-asset table is, which is
why the un-confounded figure above is a per-file comparison. `card-thumbnail-image-rules.md`
§6 and this entry both lead with the per-file number and label the page totals as
not like-for-like.

**Nearly re-derived what was already measured.** `card-thumbnail-image-rules.md`
§4 had already priced the 528px rendition against the real files. I re-measured
it independently before reading how far §4 had got, which is defensible as a
control and wasteful as a plan. Reading the neighbouring document first is the
same rule as reading the neighbouring rig first.

### What we nearly shipped, and what caught it

**A global switch in `resolveCoverSource`.** The obvious one-line change — prefer
the new rendition everywhere — would have put a 528px file into the article cover
figure: an `aspect-[3/2]` box up to 768 CSS px wide, the LCP element on the
surface that takes essentially all of this site's search traffic. It would have
*upscaled at DPR 1*, and taken `image-upscale` from 0 to non-zero on the article
template. What caught it was reading all six call sites of the function before
editing one of them, rather than editing the one the brief pointed at. The
codebase had already written the warning: `resolveCoverSource`'s own header says
it is "the cover source for every card, row **and article-cover** `<img>`".

**And the byte ceiling nearly shipped as a comment.** The first version of
`midsize-cover.ts` had `CEILING_BYTES` next to a fixed `quality: 50` — a number
documented and not enforced, which is precisely the shape of the DES-03 §6.2
defect this item was sent to re-test. The gate caught it: measuring the corpus
found the file that q50 cannot fit, four hours before any code was written.
