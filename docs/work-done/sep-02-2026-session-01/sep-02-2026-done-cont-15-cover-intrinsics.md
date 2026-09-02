# CONT-15 — the article cover plate, and the collision with UI-16

**Item:** CONT-15 · Sprint 06 · design-systems-engineer
**Shipped:** the DATABASE half only — PR #71. The render half was **built, reviewed, verified and deliberately not merged.**
**Reviewer: Claude.** Own adversarial pass, two parallel Claude subagents (correctness hunter + acceptance auditor). **`codex-reviewer` was NOT dispatched**; no OpenAI-backed review path was used, per the owner directive of 02 Sept 2026.

---

## The one-line outcome

**The DoD is MET BY UI-16's ROUTE, not by CONT-15's render change.** CONT-15's
render change is not on production and will not be. Its database half is, and it
is the input the follow-up item needs.

---

## The collision, recorded so it is findable later

Two items changed the same element on the same day from incompatible premises.

| | CONT-15 (creative-director spec) | UI-16 (shipped) |
| --- | --- | --- |
| Who owns the box shape | the **photograph** | the **design** |
| Asset | `low.webp` — correct *because* it preserves the source aspect | a named `crop-4x3-article-card-md`, 792×594 |
| Box | `aspect-ratio: var(--cover-ar)`, the file's own ratio | fixed 4:3 |
| Portrait cover keeps | **100%** of the frame, at 387×580 | **50.0%** |
| Enforcement | — | **blocking** gate checks `shaped-slot-variant` (R2), `shaped-slot-dims` (R6) |

They are mutually exclusive **in code, not merely in taste**. UI-16's R2 fires
whenever `low`/`high`/`original` enters a box carrying an explicit CSS
`aspect-ratio`. CONT-15's `.hk-cover-plate` does exactly that, by design.

Measured — master's gate pointed at the CONT-15 preview build
(`02-master-gate-vs-cont15-preview-R2-fires.log`):

```
shaped-slot-variant 5          ← one per width, all five, BLOCKING
  "served low into a box shaped aspect-ratio: 1200 / 1800 …
   Only a named crop may fill a shaped box."
image-aspect 0                 ← CONT-15 does close the defect it was written for
```

### The ruling, and its reasoning

**UI-16 stands.** The reason is in CONT-15's own brief, which neither item's
author had re-read literally:

> "DO NOT solve it by substituting an existing crop — UI-12 priced that at
> +8.2MB across the homepage and that route stays FORBIDDEN. DES-18's mid-size
> variant shipped in Sprint 05 and is the intended route."

The ban was on the **existing heavy crops**. UI-16 used a **new mid-size named
rendition at −52% bytes**, which is the route the brief named as *intended*.
UI-16 executed CONT-15's brief. The CD's spec — box follows the file, keep
`low` — was a cleverer idea that diverged from the brief it was written to
satisfy. Not a close call once the brief is read literally.

---

## The DoD, verified rather than assumed

`node scripts/ui-layout-gate.mjs --base https://hellokahwin.com`, master, live
production. Full log: `01-sitewide-gate-production-master.log`.

```
totals: empty-content 0 · rail-collapsed 0 · narrow-text-column 0
        reading-measure 0 · clipped-text 0 · viewport-overflow 0
        scroll-container-clip 0 · image-upscale 0 · image-aspect 0
        image-attr-aspect 61 (advisory, does not fail the build)
        image-unmeasurable 0 · shaped-slot-variant 0 · shaped-slot-dims 0
        category-diversity 0 · source-order 0
UILINT EXIT: 0
```

35 measurements, 7 templates × 5 widths, every row `[ ok ]`, cache HITs and build
fingerprints recorded per target.

> ⚠️ **CAVEAT ON THAT GREEN, stated rather than buried.** The sitewide sample
> contains **no portrait cover**. Its article instances are `garden-wedding`
> (1.499) and the longest-title article; neither was ever affected. A green there
> is a green over a population this item was never about. The affected slugs were
> gated directly, separately.

### Re-derived pre-fix count, current corpus

The carried figure was "12 of 86"; the spec said "14 of 92". Re-derived against
the live corpus at 20:18 UTC:

```
corpus                                    102 published covers
PRE-FIX image-aspect violations
  (fixed 3:2 box fed low.webp)             15
  0.667 ×8 · 0.748 ×1 · 0.750 ×5 · 0.753 ×1
```

The 15th is `syarat-wali-nikah`, published *after* the CD measured.

**THE CORPUS MOVED FOUR TIMES DURING THIS ITEM: 92 → 95 → 96 → 102, in one
evening.** Both counts are kept and dated rather than reconciled; reconciling
them would destroy the evidence that it moves.

### Byte cost, content-length measured

Across the 15 affected articles, `low.webp` → `crop-4x3-article-card-md`:

```
1,017,824 B → 369,502 B  =  −648,322 B  (−63.7%)
mean per affected article:  −43,221 B
corpus total: 5,034,824 → 3,296,332 B = −1,738,492 B (−34.5%)
```

That independently reproduces UI-16's own figures to the byte.

---

## What shipped: the database half (PR #71)

`scripts/backfill-cover-intrinsics.mts` — real intrinsics read from each file's
**own header** via a ranged GET, never from `media.width/height` and never from a
neighbouring record. Additive JSONB merge *inside* `cover_image_variants.low`
(a top-level `||` replaces the object and drops `sizeBytes`). No R2 write.
**102 of 102** covers recorded across three production runs; three undo files
committed.

`scripts/audit-cover-intrinsics.mjs` — **the Stage 9 retrospective edit, as a
gate rather than a paragraph.**

### Why that gate exists

`generateVariants` writes `ImageVariantMeta = { url, sizeBytes }` and was not
changed. Intrinsics are written by **backfill only**, and a value only a backfill
writes decays the moment the backfill ends. That took **24 minutes**:

```
19:08  backfill        96 of 96 recorded
19:32  re-check        4 unrecorded — three newly published, and
                       `syarat-wali-nikah` REGENERATED in admin: its low.url
                       moved …558718… → …708079… and its intrinsics stayed
                       attached to the old file
20:18  re-check        corpus 102, SIX unrecorded
20:23  after catch-up  102 of 102
```

**Verified over THREE points, not merely seen failing** — and the third was
produced by a different team fixing a real defect, which is the strongest kind of
control because nobody arranged it:

| Run | `low.width/height` | `crop-4x3-article-card-md` | Exit | What changed before it |
| --- | --- | --- | --- | --- |
| 1 · 20:20 | 96/102 | 96/102 | **1** | — (both columns genuinely incomplete) |
| 2 · 20:23 | **102/102** | 96/102 | **1** | CONT-15 ran its backfill |
| 3 · 20:38 | **102/102** | **102/102** | **0** | **UI-16** fixed the rendition defect |

Each column moved **independently, only when its own cause was addressed**. A
single "is the corpus healthy" boolean could not have produced that table, and
would have averaged the two into a lie.

…and then a **fourth** run, which is the one that matters:

| Run | `low` | `md` | Exit | |
| --- | --- | --- | --- | --- |
| 4 · 21:00 | **96/102** | **96/102** | **1** | the same six are bare again, **both columns** |

**THE BASELINE IS NOT A NUMBER. IT OSCILLATES.** `doa-masuk-rumah-baru` was
re-ingested at `20:52:59` — *after* UI-16's fix — and came back with no `-md`
rung, no `low.width/height`, and a **different `low.url`**
(`…1788295962710-images-s-keluarga-payung-kuning…`). Re-read 20 seconds later:
identical. Not a transient.

This is R9 demonstrated on a stopwatch: **22 minutes from green to red**, with no
deploy and no code change. `processSmartCrops` **replaces**
`cover_image_smart_crops` rather than merging, and the ingest CLI runs from an
agent's **own checkout**, so no deployed fix can prevent it. The decay is not a
historical anecdote in this document — it happened again while this document was
being written.

**So no green baseline is recorded with PR #71, deliberately.** Cherry-picking
the 20:38 green would have shipped a number that was already false, and taught
the next reader that this corpus is stable. It is not. The evidence file records
all four runs.

**UI-16's PR #67 reorder is what stops this being expensive**: production at
21:00 serves `crop-4x3-article-card-sm` (~23 KB) rather than the 770 KB full
crop, because the fallback is now `md → sm → card → low` — largest-that-is-still-
budgeted rather than largest. The defect recurs; its cost no longer does.

---

## Findings raised, not absorbed

1. **A LIVE 4.7 MB BYTE REGRESSION ON UI-16's FALLBACK PATH.** Six articles
   ingested 20:14–20:16 UTC — *after* UI-16 deployed at 19:51 — carry every other
   crop including DES-18's `-sm` but **not** UI-16's `-md`, so
   `resolveArticleCoverSource` falls through to the **full** `crop-4x3-article-card`.
   Measured live: `doa-pembuka-majlis` serves **770,140 B** at 1600×1200, painted
   350.0×262.5 @390 — a **4.57× downscale**; the control `garden-wedding` serves
   792×594 at 2.26×. All six total **4,742,962 B** (mean 790 KB on the LCP
   element) where their `low` totals 378,182 B — **~12.5×**. That is the +8.2 MB
   route UI-12 forbade, reached as a *fallback* rather than as a choice.
   **No blocking check catches it**: box 4:3, file 4:3 → `image-aspect` 0; a
   downscale → `image-upscale` 0; a named crop → R2 passes. A pure byte defect
   with no rule. Cause not asserted — belongs to UI-16's owner.

   **RESOLVED by UI-16 the same evening, and the cause was neither of the two
   hypotheses I offered.** Not "crops generated before the deploy":
   `doa-untuk-isteri` HAD the `-md` rung at 20:00 and did not at 20:12, so it was
   **re-ingested**, and `processSmartCrops` **replaces** the whole
   `cover_image_smart_crops` object instead of merging into it. The ingest CLI
   runs from an agent's **own checkout**, not from the deployed app — so UI-16's
   19:51 fix to `generateSmartCrops` could not reach an article ingested at
   20:12 by an unrebased worktree, and **no deploy can stop it**. `-sm` survived
   on all six only because that rung has been on `master` since Sprint 05 and the
   stale checkouts already had it.

   That last part is larger than either item and is escalated to the owner rather
   than absorbed by either of us. **I offered two hypotheses and both were wrong;
   the value was in labelling them as hypotheses and handing the element to its
   owner rather than guessing in public.**

   UI-16 also reordered the fallback to `md → sm → card → low` (PR #67,
   `b62e9c1`) — largest-that-is-still-budgeted rather than largest — so the same
   failure mode now costs ~23 KB per article instead of ~790 KB, with a
   regression test verified red against the old ordering.

2. **The editorial defect, carried forward as a named item** (below).

3. **`.inspire-prose` body images** still declare a hard-coded `width="1200"
   height="800"` for e.g. a 1527×2264 file — 122% off. Advisory
   (`image-attr-aspect` 61 sitewide). Different element, different item.

4. **I could not read the specification artifact.** The Artifact tool returned
   *"not found — it may have been deleted, or it has not been shared with you"*
   and it was absent from a `scope=all` listing. Built from
   `_cont15-build-artifact.mjs` + `_cont15-plates.json` (its generator). If any
   number was hand-edited into the artifact after generation, the spec I built
   against was stale and nothing would have revealed it.

---

## Retrospective — what changed in the repo, and why

Shipped as instruments and rules, not as prose in a document nobody re-reads:
`scripts/audit-cover-intrinsics.mjs` (PR #71) and **R9 / R10 / R11** in
`docs/design/hero-image-rules.md` — the file people actually read before touching
a cover, and the one UI-16 cites as "hero-rules R2".

**1. AN INSTRUMENT CAN REPORT SUCCESS ABOUT A THING IT IS NOT LOOKING AT, AND
THIS HAPPENED TWICE ON THE SAME SLOT IN ONE EVENING.** That makes it a pattern,
not an incident, and it is worth more than either bug:

- CONT-15's scratch script `continue`d past six incomplete rows before counting
  them and returned a comfortable "0 missing" — which I was about to hand up as
  *independent corroboration of a ruling that had already gone against me*.
- UI-16's merge deployed green, `ui-layout-gate.mjs` printed `UILINT EXIT: 0`
  across all seven templates, and the page was still serving a 213 KB fallback
  because the payload caches with `revalidate: false`.

Neither had a failing assertion. One looked at a filtered list, the other at a
cached payload. → **R11**: assert against the **served object** (`HEAD` the URL
the page actually references), and treat a rendered measurement as belonging to a
build *and a cache state*, never to a URL.

**2. A CONVENIENT NUMBER IS THE HARDEST KIND TO DOUBT.** Mine was not caught by a
test failing — it was caught by noticing the number was *pleasant*. It confirmed
a decision already made, which is exactly when scrutiny is lowest. → **R10**:
enumerate, then count.

**3. THE CORPUS MOVED FOUR TIMES DURING ONE ITEM: 92 → 95 → 96 → 102.** Every
count in a spec is a timestamp, not a fact. Both the spec's 92/15 and the
re-derived 102/15 are kept and dated; reconciling them would destroy the evidence
that it moves.

**4. THREE PASSES TO FIND ONE CAUSE.** The pnpm outage was called a permanent
bump, then transient flakiness, then correctly diagnosed as Vercel selecting
pnpm 11 by a creation-date heuristic — and PLAT-16 found the part nobody had:
`onlyBuiltDependencies` was **renamed to `allowBuilds` and changed from a list to
a map**, so moving the key verbatim fails *byte-identically*. An error message
that is unchanged after a fix is not evidence the fix was wrong about the cause.

**5. I WAS ORDERED TO OPEN A PR AND DECLINED, AND THAT WAS CORRECT.** The
instruction was "split it out and merge **on merit**". The merit case was
disproven between the order and the execution, so the condition attached to the
instruction failed and the instruction lapsed with it. The commits are preserved
on `ianng89/pnpm-pin-hardening` rather than deleted, because the diagnosis was
right about the mechanism even though the fix was superseded.

---

## NEXT ITEM, scoped not built: the synthesis

**Item:** **`UI-21`** — *"Portrait covers lose half the frame to the 4:3 named
crop — the synthesis both CONT-15 and UI-16 independently called correct"*.
Backlog, `todo`, design track, 5pt, owner `creative-director`, created
2026-09-01T20:22Z.

> ⚠️ **IT ALREADY EXISTED AND I ALMOST FILED A DUPLICATE.** This was drafted as
> "CONT-17", which is a live 12-point content item (*Deepen the doa pillar*,
> `writer-inspirasi-vendor-venue`). The next guess, CONT-19, is also taken
> (backlog, `lafaz taklik`). Two different items under one id in one sprint is
> unrecoverable a fortnight later. **Read the tracker; never infer an id from
> the last number you saw in a brief.**

Both CONT-15 and UI-16 independently reached the same synthesis and both said it
should not be built the same night. Agreed; named and scoped here.

**The defect it closes.** `tempat-beli-hantaran` (1200×1800) discards **50.0%** of
a photograph an editor deliberately framed tall. It clears R8(c)'s 33% floor, so
it is **not a rule violation** — it is a taste defect, and the reason it needs an
item rather than a gate change.

**The change.** Drive `--cover-ar` from the rendition's **stored `width`/`height`**
instead of a hardcoded `4/3`. The box then follows the asset *and* the asset is a
named crop — satisfying UI-16's R2 and the CD's principle at once, with no rule
relaxed.

**What it needs first, and why it is not one line.** A **portrait rendition at
sane weight**. `crop-4x5-mobile-cover` is 943 KB – 2.0 MB and is not usable on the
LCP element; it needs the DES-18 resize rung that produced 792×594 —
`renderCoverRendition` + a `COVER_RENDITIONS` entry, no new Rekognition call and
no `GEOMETRY_VERSION` move.

**Its input already exists**, and that is what CONT-15's database half is for:
102/102 covers now carry measured source intrinsics, so *which* covers need a
portrait rung is a query rather than a guess.

**Do not start it** until finding 1 above is resolved — it touches the same
fallback chain.

---

## Not merged, and why

**PR #63** carries the render half — `.hk-cover-plate`, `cover-plate.ts`, the
article-page change, the reference-page section, the `CoverSource`
width/height change. It is green on all four blocking checks and verified at
**0.00% deviation at all five widths** (350.0×525.0 @390, 386.7×580.0 @768/1024/
1440/1920; landscape control pixel-for-pixel unchanged at 756.0×504.2). It
**loses to UI-16** and should be closed rather than merged.

**The pnpm pin** (`ianng89/pnpm-pin-hardening`, `f32d2b0`) was taken off this
branch and **no PR was opened**. PLAT-16's `f49b8ec` (PR #66) superseded it and
found the thing the pin never had to confront: in pnpm 11 `onlyBuiltDependencies`
was not merely relocated, it was **renamed to `allowBuilds` and changed from a
list to a map**, so moving the key verbatim fails byte-identically. Pinning to
pnpm 10 would make PLAT-16's `pnpm-workspace.yaml` inert and leave the pnpm 11
path untested — a regression of a fix that landed twenty minutes earlier,
dressed as hardening.
