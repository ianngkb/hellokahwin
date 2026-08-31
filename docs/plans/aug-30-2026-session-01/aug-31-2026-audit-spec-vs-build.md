# The design artifacts vs what shipped — measured, 31 August 2026

**Status:** DIAGNOSIS — supersedes my "the art direction is the ceiling" conclusion
**Trigger:** owner, 31 Aug: *"the ui ux design elements need to be fixed too.
please refer to the design artifacts we did."*
**Artifacts read:** `docs/design/des-03-spesifikasi.html` (the specification),
rendered and compared against live production at 1440 px.

---

## ⚠ I was wrong earlier today, and this document corrects it

Two hours ago I told the owner:

> *"This is not an implementation failure. DES-03 was built faithfully… The
> ceiling is the art direction itself."*

**That was wrong, and I did not check it before saying it.** I inferred it from
the DES-03 *brief* — a summary — rather than opening the *specification*. That is
the company's own standing rule ("check the artefact, never a summary of it")
broken by the person who wrote it down.

**The specification prescribes several things that were never built**, and it
identified the single biggest complaint before the build even started.

---

## 1. The spec already found the one-topic homepage — and named a rule for it

§5.3 of the specification opens, verbatim:

> *"Measured on the live homepage today: **thirteen items, all thirteen from
> Hantaran & Mas Kahwin**, with the same 21-character eyebrow printed thirteen
> times. **The specified homepage carries the diversity rule — see H6 in §7** —
> and the drawing below shows it: the hero, then rows that name different
> categories."*

That is the finding I re-derived from scratch this afternoon and presented as
new. **It was in our own spec, written on 28 August.**

### But the rule it points to does not exist

| Check | Result |
|---|---|
| `\bH6\b` in the spec | **4 matches** — 3 are base64 noise inside embedded font data, 1 is this cross-reference itself |
| §7's actual subject | *The state set* — 7.1 Coverage, 7.2 Two states, 7.3 Loading layers, 7.4 The surface no page type owns |
| "diversity" in §7 | **0** |
| "categor" in §7 | **0** |

**`H6` is a dangling cross-reference.** The spec asserts a diversity rule, draws a
homepage that obeys it, and never writes the rule down. So no builder could have
implemented it, and the drawing was the only trace.

**This is a defect in the artifact, not in the build** — and it is the reason the
front page still shows one category thirteen times.

---

## 2. The desktop right rail was specified and is not there

The spec's §5.1 drawing puts a **300 px right rail** beside the article body,
carrying **REKOD**, then **DALAM ARTIKEL INI** (an in-article table of contents),
then **SUMBER**. §5.1 says in words:

> *"On desktop the panel is the 300 px rail; on a phone it is a full-width block
> in the same place in the reading order."*

Measured on live production, `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri`
at 1440 px:

| Element | Spec | Live |
|---|---|---|
| Article body | wide body + 300px rail | `left 120, width 594` |
| **REKOD** | in the right rail | **`left 120`** — the *same left edge as the body*, i.e. inline, the phone treatment |
| **DALAM ARTIKEL INI** | in the rail | ~~absent — 0 occurrences in the server HTML~~ **WRONG — see the correction below the table** |
| **SUMBER** | in the rail | `left 665, top 4558` — far down the page |

**The desktop composition is the mobile composition.** The rail is what fills the
canvas and makes the page read as a designed publication rather than a centred
blog post — and it is the thing whose absence leaves ~846 px of empty margin at
1440.

~~**The in-article TOC does not exist at all.** Spec mentions it twice; live HTML
mentions it zero times.~~ `<aside>` and `rail` markup *is* present in the page, so
the scaffolding partly exists and does not produce the specified layout.

> ### ⚠ CORRECTION — 01 September 2026, UI-18
>
> **The in-article contents list existed on 63 of the 86 articles in the sitemap.**
> It was labelled `Isi Kandungan`, not `Dalam artikel ini`, and it carried 822
> anchors of which **none** were dangling. `.hk-eyebrow` sets
> `text-transform: uppercase`, so the served text is uppercase while the source is
> mixed case — the identical shape as `REKOD` and `SUMBER`, which this same audit
> documents two sections later as the trap that nearly sent an agent on a hunt.
> Searching the HTML for the string `DALAM ARTIKEL INI` could only ever return a
> number about the searcher's assumption.
>
> What WAS wrong, and what UI-18 shipped in PR #38:
>
> - the component's floor was **four** `<h2>`, not two, which withheld the list
>   from `/hiasan-dekorasi/goodies-kahwin` (3 h2) and
>   `/idea-dan-nasihat/tempat-honeymoon-di-malaysia` (2 h2). Now **65 of 86**.
> - the label was not the spec's. It is `Dalam artikel ini` now, in the eyebrow
>   and on the `aria-label` landmark.
> - nothing measured any of it. `scripts/audit-article-toc.mjs` walks the sitemap
>   at run time and asserts the RELATIONSHIP — a contents list if and only if the
>   body carries ≥ 2 `<h2>`, every `href="#…"` resolved against the document that
>   served it. It never tests for a string, and every article it finds without a
>   contents list is printed with its actual heading census beside it.
>
> **§2's finding about the RAIL is untouched and still stands.** The rail is
> absent, the desktop composition is the phone composition, and that is UI-17's
> item. `ArticleToc` now styles itself from bare `nav.article-toc` rules, so the
> rail can render it outside `.inspire-prose` and it will arrive styled.
>
> Not in scope, raised here because it is the reason 21 articles still carry no
> contents list: **7 of them use `<h3>` as their section level with no `<h2>` at
> all** (e.g. `/hantaran-mas-kahwin/mas-kahwin-ikut-negeri`, `h3=7 h4=5`). An
> `<h1>` followed by an `<h3>` is a skipped heading level and an accessibility
> defect in its own right. The other 14 carry no headings at all.

---

## 3. What WAS built to spec, and should be credited

Not everything drifted, and the parts that held are the parts written as
enforceable rules rather than drawings:

- **Hero eligibility by cover class.** §5.3 says the homepage hero must come from
  a class O or P cover and must fall back to a no-hero variant *"rather than
  enlarging a frame that cannot take it."* UI-03 implemented exactly this as
  `HERO_INELIGIBLE_SLUGS` (R8a), `resolveHeroCrops` (R8b) and
  `isHeroFrameEligible` / `HERO_ASPECT` / `MIN_RETAINED_FRAME` (R8c). The spec
  predicted production's then-hero would be disqualified, and it now is.
- **Type, colour and the token system** — DES-05 shipped and the reference page
  holds.

**The pattern is the company's own central finding, again:** the rules that
survived into production were the ones expressible as code. The diversity rule and
the rail composition existed only as prose and a drawing, and neither shipped.

---

## 4. What this changes about the recommendation

My earlier three tracks stand, but the ownership changes and one gets much cheaper.

| | Track | Was | Now |
|---|---|---|---|
| 1 | **Front-page diversity** | "curation change" | **Write the missing H6 rule into the spec, then build it.** The spec already committed to it |
| 2 | **Mid-size image variant** | unchanged | unchanged — the pipeline has no rung between 60 KB and 900 KB |
| 3 | **Art direction** | "re-open DES-01/02/03, a sprint, owner's call" | **Mostly not needed.** Build the rail and the TOC that were already specified before re-deciding anything |

**Track 3 was the expensive one and it is now the smallest.** We do not need a new
art direction to stop looking like a blog post; we need the composition the
existing spec already drew. Re-deciding the direction should wait until the site
actually implements the one we have.

**The one genuinely open question stays open:** §6's "three frame classes and
their byte ceilings" is what constrained photography scale, and I have not yet
tested whether it is still binding now that every cover is confirmed to carry
1600 × 1200 and 1920 × 2400 crops.
