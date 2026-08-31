# Why it still does not look premium — measured, 31 August 2026

**Status:** DIAGNOSIS — feeds the next sprint's scope
**Trigger:** owner, 31 Aug, after Sprint 04 closed: *"The UI/UX still does not look
premium enough."*
**Run by:** CEO, against live production with a real browser

---

## The short version

**Sprint 04 fixed defects. It did not do art direction, and the owner is right
that those are different things.** A page with a 44px headline column is broken;
fixing it makes the page *correct*. Nothing in Sprint 04 was scoped to make it
*good*.

UI-04 said this explicitly on 31 Aug and it was in my own report to the owner:

> *"what was seen was the genuinely broken desktop homepage, plus art-direction
> problems that apply at every width and are therefore just as visible on a
> phone."*

**We fixed the first half.** This document is the second half, and it is three
findings, none of which is a styling opinion.

---

## Finding 1 — the front page is ONE topic, thirteen times

**Measured on live production:** all **12** `.s-row` cards are from the single
category **Hantaran & Mas Kahwin**. The hero article is a hantaran piece too.

```
rows: 12
counts: { "Hantaran & Mas Kahwin": 12 }
```

**This is the single largest reason it does not read as a publication**, and it is
not a design problem at all. A wedding magazine whose entire front page is
dowry-tray articles looks like a thin single-subject blog no matter how it is
typeset.

**The cause is mechanical, not editorial:** the homepage is `Terkini` — latest
first — and CONT-12 published the whole C2.1 hantaran cluster most recently. So
"latest" and "all hantaran" are currently the same list.

**A front page is curated, not sorted.** That is the fix, and it costs no design
work and no bandwidth.

---

## Finding 2 — the images are small by design, and the constraint that forced it is not true at pixel level

### What the site serves

Every one of the 12 homepage covers serves `low.webp` into a **176 × 132** box:

| Cover | `low` served | Intrinsic |
|---|---|---|
| all 12 | **36–80 KB** | 1200 × 800 (one 1200 × 1800) |

### What actually exists for those same covers

Measured by fetching each variant:

| Variant | Size range | Shape |
|---|---|---|
| `low` | **36–80 KB** | the only one in use |
| `crop-16x9-og` | 223–418 KB | 1200 × 630 |
| `crop-4x3-article-card` | **488–946 KB** | 1600 × 1200 |
| `crop-4x5-mobile-cover` | **921 KB – 1.9 MB** | 1920 × 2400 |
| `crop-4.3x1-desktop-hero` | 424–826 KB | 2464 × 700 |

**Large, correctly-shaped photography exists for every cover on the front page.
It is sitting unused while the page renders thumbnails.**

### Why the design went small, and why that reasoning was partly wrong

DES-03's brief records my own decision of 28 Aug, and the first of its three
grounds was inventory:

> *"Your own DES-02 finding: four of eleven photo frames survive enlargement,
> seven do not. That is what killed B. So the spec must not assume photography it
> cannot get."*

And the brief says plainly that the three grounds were **"none of them taste."**

**That is exactly why it does not look premium.** The direction was selected to
survive a weak image library, and optimised for putting a rate table above the
fold. Taste was explicitly not a criterion. The result is a competent,
information-dense page that looks like a reference site — because that is what it
was designed to be.

**⚠ But the inventory premise does not hold at pixel level.** Every cover has
1600 × 1200 and 1920 × 2400 crops. Whatever DES-02 measured — most likely crop
aspect or subject quality — it was not "we lack pixels."

### The real gap: there is no mid-size variant

This is the actionable part, and UI-12 already priced it.

The pipeline produces **`low` (tiny, for thumbnails)** and **print-scale crops
(0.5–1.9 MB)**. There is nothing in between. So a designer choosing a frame has
two options: a thumbnail, or 8 MB of homepage.

UI-12 measured the missing rung: **528w @ q50 lands at 11–16 KB.** A proper
editorial card at 700–900px would cost **roughly what the current thumbnail costs
today** — 36–80 KB — and fill a frame five times the area.

**So "premium photography at scale" is not a budget question. It is one missing
variant in the image pipeline.**

---

## Finding 3 — no hierarchy, and a narrow column on a wide canvas

Measured at 1440:

- **12 identical rows.** Same size, same weight, same layout, twelve times. There
  is no lead story, no two-up, no full-bleed break — no rhythm of any kind after
  the hero.
- **The content column is capped at `max-w-3xl` (768px)** inside a 1440 viewport,
  so roughly **47% of the canvas is empty margin** on the most visual vertical
  there is.
- **The nav wraps to two lines** at 1440 and reads as a utility bar.

None of this is broken. All of it is the "record" direction doing exactly what it
was specified to do.

---

## What this means, and who owns it

**This is not an implementation failure.** DES-03 was built faithfully; UI-01
through UI-12 fixed real defects in that build. The ceiling is the art direction
itself, and the art direction was chosen under a constraint that measurement now
partly contradicts.

**Three tracks, in order of value-per-effort:**

| | Track | Owner | Cost |
|---|---|---|---|
| 1 | **Curate the front page** — stop showing one cluster thirteen times | `head-of-seo-content` + `managing-editor` | small, no design work |
| 2 | **Add the missing mid-size image variant** — the rung between 60 KB and 900 KB | `design-systems-engineer` | small, unblocks track 3 |
| 3 | **Re-open the art direction with photography that can now go large** — hierarchy, lead treatment, a real grid | `creative-director` | a sprint |

**Track 3 is a re-decision, not a tweak, and it is the owner's call** — it revisits
DES-01/02/03, which cost 18 points in Sprint 03. It should not start until tracks
1 and 2 land, because they change what the designer is designing for: a curated
mix of subjects, and images that can fill a frame.

**And the constraint that killed direction B should be re-tested before it is
re-applied.** If "four of eleven frames survive enlargement" was about aspect or
subject rather than resolution, say which, because a photography-led direction may
now be affordable.
