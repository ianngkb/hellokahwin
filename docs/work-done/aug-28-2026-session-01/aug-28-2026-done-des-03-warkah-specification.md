# DES-03 — Warkah, hardened into the HTML specification artifact — 28 Ogos 2026
**Session:** aug-28-2026-session-01 · **Owner:** creative-director · **Status:** completed
**Plan:** [aug-28-2026-brief-des-03.md](../../plans/aug-28-2026-session-01/aug-28-2026-brief-des-03.md)

DOCS repo. Specification only — no production code was written or touched.

---

## The claim, in one line

Direction A (Warkah) is hardened into a self-contained, responsive HTML
specification covering the homepage, catalogue and article, plus the
not-found/error surface DES-07 found unowned — **13 states drawn as 18 pixel
frames** at exactly 360 px and exactly 1200 px, both palettes, every
text-on-background pairing carrying a measured WCAG contrast ratio, and a
two-way cross-check against DES-07's 39-state checklist that closes with no
gap remaining.

---

## What was done

### The specification

Full path: `docs/design/des-03-spesifikasi.html`
Live: **https://claude.ai/code/artifact/82d4d556-db93-4139-b1ce-84db67010522**

Thirteen sections. §1 restates the three grounds the owner chose Direction A
on as constraints this document has to satisfy, not history. §2 names two
typefaces by licence and cost (Bodoni Moda, SIL OFL, RM0; the system stack,
RM0) rather than by diacritic coverage — the CEO's correction (decision 117,
carried by DES-13) that the tracker's brief still asked for. §3 defines both
palettes together on the shared-primitives model globals.css asks for: light
complete on the base, dark redefining only the semantic tokens, checked by
`probe.mjs` counting colour literals inside dark-scoped rules — **the correct
count is zero, and it is zero** (see Findings, below — it was not zero on
first measurement). §4 sets the spacing scale and five breakpoints as numbers,
each with what it changes and why. §5 draws the three page types at their
default and length-extreme states, both palettes, both breakpoints, using live
Malay content fetched on 28 Ogos 2026. §6 counts the photo library into three
classes (four survive enlargement, three read at a landscape crop only, four
never scale past a thumbnail) and sets a byte ceiling per derivative, measured
against the real corpus. §7 draws the two states §5 does not — a missing/
disqualified cover, an empty category — and adds the not-found/error surface
as §7.4. §8–§10 specify components, heading hierarchy and schema slots (for
head-of-seo-content's review), and focus/target/announcement rules. §11 runs
the DES-07 cross-check the other way. §12 names what is deliberately absent
and who owns it. §13 states the strongest argument against the direction and
answers it with the same evidence §1 and §6 already established, rather than
re-litigating the taste question the owner already decided.

### The evidence

Full path: `docs/design/des-03-evidence/`

- `contrast.py` / `contrast-2026-08-28.txt` — every text-on-background pairing
  computed with the WCAG 2.x relative-luminance formula, both palettes, plus
  every alpha-tinted rule and boundary composited and measured against its
  ground. Smallest text pairing: gold label on parchment, **5.56:1**, clears
  AA. Control boundary tints: **3.06:1** light, **3.05:1** dark, both clear
  the 3:1 non-text floor with essentially nothing to spare — recorded as the
  disqualified `thread-500` alternative failed it at 2.95:1, so the margin is
  stated rather than implied.
- `typescale.py` / `typescale-2026-08-28.txt` — the fluid type scale as CSS
  `clamp()` tokens, evaluated back to px at all five breakpoints.
- `derivatives.py` / `derivatives-2026-08-28.txt` — four image derivatives
  re-encoded from the real DES-02 photo corpus (11 files), each measured
  against a byte ceiling set from the worst file, not the median.
- `probe.mjs` / `probe-2026-08-28.txt` — drives headless Chrome at 360 and
  1200 px against the *built* artifact (the thing a consumer receives, not
  the template source) and checks: no sideways scroll, every phone frame
  exactly 360 px and every desk frame exactly 1200 px, every control ≥44 px,
  every image decoded with alt text and explicit dimensions, the display face
  actually loaded and in use on the h1s, and the dark-literal count.
- `build.py` — assembles the artifact from `tpl/*.html` and inlines all 15
  distinct photograph derivatives as data URIs (297,192 B of image payload),
  because the Artifact viewer's CSP blocks external image hosts outright.

### Verification

```
build          : python build.py -> 13 template parts, 864,348 B written
probe @360px   : bodyOverflow.overflow=false, phones=[360]×13, desks=[1200]×5,
                 controlsUnder44=[], images.broken=0/noAlt=0/emptyAlt=0/noDims=0,
                 states.count=7 ("A-nc","A1","E2","E4","H1","K-e","K1"),
                 h1Face="Bodoni Moda", darkHexLiterals=0
probe @1200px  : identical, innerWidth=1200 confirmed
published      : Artifact tool, HTML publish OK
```

---

## Findings

### 1. The artifact's own chrome broke the rule it was specifying

First `probe.mjs` run measured **`darkHexLiterals: 9`** — nine raw hex values
sitting inside `:root[data-theme="dark"]` / `@media (prefers-color-scheme:
dark)` blocks. Not in the HelloKahwin system tokens (`.hk-light`/`.hk-dark`
were already clean — every dark redefinition there was a `var()` reference),
but in the **document's own reading-mode chrome** (`--doc-bg`, `--doc-panel`,
`--doc-accent`, and six more), which is legitimately allowed a real,
reader-facing dark mode the site itself is not. The rule in the DoD does not
carve out an exception for the spec document's own furniture, and a
false pass here — "the system is clean, just not the bit describing the
system" — is exactly what BEWARE THE FALSE PASS is warning against. Fixed by
giving the document chrome the same two-layer model: primitives once, light
semantic complete, dark semantic as `var()` references only. Re-measured: 0.

### 2. The library's usable range is three classes, not two

DES-02 measured "four of eleven survive enlargement, seven do not," which is
correct as a *count* but not yet a *rule a build can apply*, because it does
not say what the seven are allowed to do. §6 splits them further: three of
the seven (`akad`, `c-organza`, `c-kek`) hold at a landscape crop up to
760×507 — which is exactly the size the article cover is already drawn at in
§5.1 — and the remaining four are safe only up to card scale, 480×360, never
a hero or a cover. This resolves what would otherwise have been a real
inconsistency: the article's live cover photo (`akad`) is one of DES-02's
"seven that come apart," and without the three-class split this document
would have been directly contradicting its own §1 ground while drawing the
article default state.

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

The photo library's "four survive, seven don't" finding (DES-02) was a count,
not a rule. A build needs to know not just *how many* photographs are safe at
scale but *which ones, and safe up to what specific size* — otherwise the
finding sits in a retrospective as a fact everyone nods at and nobody can
apply. §6.1's per-file table (11 rows, class assigned, ceiling stated) is the
first place that assignment exists as something checkable rather than
something remembered. It resolved a live contradiction in this document's own
draft (Finding 2, above) that would not have surfaced without doing the
classification explicitly rather than citing the DES-02 count.

### 2. Which document must change, and who owns that edit?

**`docs/design/des-07-set-keadaan.html` §11.3**, owned by product-designer
(author) but editable here because it names creative-director's own
handover row. That row said the not-found surface and the §11.2 cross-check
were owed by DES-03 "when the artifact exists." The artifact now exists — the
edit is made: the row now records the closure, links this artifact, and
names this work-done file as the full record, so a reader of DES-07 does not
have to go hunting for whether DES-03 ever discharged what DES-07 flagged.

### 3. What did we do twice that we should never repeat?

This document's own build started, stalled on a session interruption
mid-sprint, and had to be **resumed by inspecting five completed template
files, three evidence scripts and their output, and a table of contents
promising eight more sections** — with no checkpoint note anywhere saying
what was decided, what was left, or why. Reconstructing "why does §5.3 say
`class O or class P` when no class P had been defined yet" from file contents
alone cost real time that a single `STATUS.md` — even three lines: sections
done, section in progress, open questions — would have saved entirely. Any
multi-session build of a document this size should write that file before
the first interruption, not reconstruct its own state from evidence after
one.

### 4. What did we nearly ship, and what caught it?

The document nearly shipped specifying "no colour whose sole definition sits
inside a dark block" while itself violating that exact rule in its own
chrome — see Finding 1. `probe.mjs`'s literal count, run against the *built*
file before publishing rather than trusting the source, is what caught it.
Had the probe only checked the `.hk-*` system tokens (the thing the rule was
originally written about) and not every dark-scoped rule in the document,
this would have shipped clean by the letter of the check and wrong by its
intent.
