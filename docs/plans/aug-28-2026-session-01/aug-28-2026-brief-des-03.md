# DES-03 — Harden the chosen direction into the HTML specification artifact

**Sprint 03 · design · 5pt · owner `creative-director`**

DOCS repo. You write NO production code — this artifact is a SPECIFICATION artifact,
not the implementation.

**Work on the current branch.** Commit and push.

---

## THE DIRECTION IS CHOSEN — CEO decision, 28 Aug

**A · Warkah — the record.** Decided on three grounds, none of them taste, and you
should know them because they constrain what you harden:

1. **Inventory.** Your own DES-02 finding: four of eleven photo frames survive
   enlargement, seven do not. That is what killed B. **So the spec must not assume
   photography it cannot get** — specify frames at sizes the library actually
   supports, and say what happens when a cover is one of the seven.
2. **Intent.** A puts the answer above the fold, and our highest-impression page is
   a rate table. A reader searching *mas kahwin Perak* wants the number.
3. **Device mix.** Mobile is 64% of impressions at position 8.7, desktop 28.9. C was
   rejected because its identity lived in a rail that collapses on a phone.
   **Whatever makes A recognisable must survive at 390px.**

Everything downstream of that pick is yours and does not come back to the owner.

---

## Why this item exists

A canvas decides a look; it does not specify a build. The HTML artifact IS the specification the Design Systems Engineer builds against - real type, real breakpoints, real light and dark, and the states a static mock always omits.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: A self-contained responsive HTML artifact covering homepage, catalogue and article, carrying: real fonts, real breakpoints, light AND dark, and the awkward cases - a three-line Malay headline beside a one-line one, a missing cover image, an empty category. Type scale, spacing scale and colour stated as NUMBERS with contrast ratios. CHECKED BY: Open it at 360px and at desktop, in both themes. Every text-on-background pairing quotes its measured contrast ratio, WCAG AA floor. BEWARE THE FALSE PASS: If it is not in the artifact it is not specified. Do not leave a state out and expect it built. EVIDENCE LANDS: Artifact URL + docs/work-done/ entry. DARK MODE, CEO RULING 28 Aug (DES-01 asked): the 2026-07-14 decision STANDS - dark stays user-unreachable, no ThemeProvider, no toggle. But the SYSTEM still defines both palettes together: light complete on the base, dark redefining ONLY the semantic tokens, and NO colour whose sole definition sits inside a dark block. That is what globals.css already asks for ('keep this palette in sync so dark can be switched on later'). So specify and define both; expose only light. This DoD is AMENDED, not narrowed - it gains a constraint rather than losing one.

## Planning context

Name every typeface with its licence AND its Malay diacritic coverage. Display faces routinely ship broken diacritics and it is found in production. head-of-seo-content REVIEWS this artifact before it is treated as the spec - heading hierarchy and schema slots are design decisions, not implementation details. CORRECTED 28 Ogos 2026 by product-designer from DES-07, DoD deliberately UNTOUCHED: this DoD names three page types (homepage, catalogue, article) and no not-found/error surface. That surface belongs to no page type, is linked from all three, and is why the 404 shipped rendering ZERO server-side characters - measured on production 28 Ogos 2026, a blank page, and 23.79s of blank on /cari?q=. DES-07 specifies it as E1-E5 and lists in section 11.2 the 39 states across five surfaces this artifact must carry. ALSO OWED: DES-07's own DoD requires a cross-check against these three page types. DES-03 did not exist when DES-07 shipped, so that check ran one way only. Whoever writes DES-03 runs the other direction against docs/design/des-07-set-keadaan.html section 11.2.

---

## Two corrections to carry, both the CEO's

- **Malay diacritic coverage is NOT a real gate.** The tracker's brief for this item
  still says to name each typeface's diacritic coverage. Rumi Malay is essentially
  plain Latin; that criterion was overstated by the CEO in three personas
  (decision 117) and DES-13 correctly refused to be blocked by it. Name the
  **licence** and the **cost**. Those are the real constraints.
- **Dark mode: the 2026-07-14 decision STANDS** (CEO ruling, 28 Aug). Dark is not
  user-reachable and you are not shipping a toggle. But the artifact still
  **specifies both palettes together** — light complete on the base, dark
  redefining only the semantic tokens, no colour whose sole definition sits inside
  a dark block. Specify both; expose only light.

## What DES-05 will hold you to

The Design Systems Engineer builds against this artifact. **If a state is not in it,
it is not specified**, and you do not get to be disappointed later. DES-07 shipped
39 screens across 5 surfaces covering all 40 cells of its state matrix — read
`aug-28-2026-done-des-07-state-set.md` and make sure this artifact and that state set
do not disagree.

## Standing rules — these bind you

- **DONE MEANS SHIPPED.** Not built, not committed, not "working locally".
  Merged to the default branch AND deployed AND visible, or ingested to
  production AND reachable. If your item's result is a document, it is
  committed and PUSHED. A file on one machine is not a deliverable.
- **Check the artefact the CONSUMER receives**, never the input you control.
  Reading your own source proves what you intended, not what shipped.
- **A status code is not a measurement.** If a check needs a header, a
  cookie, a session or a flag to reproduce, that condition goes in the claim
  itself. A reader who cannot reproduce your number will conclude you made
  it up.
- **Never narrow this DoD.** If the item turns out bigger than it assumed,
  stop and report — do not rewrite what "done" means to match what you got.
- **Verify, don't assert.** curl the URL, run the query, list the files.
- **/humanizer on any reader-facing copy.** Company rule.
- **Real Malay at real length** in anything user-facing. English placeholder
  text hides the wrap problems that are the whole point.

## Stage 9 — the retrospective is part of the item

Before you report done, write a `## Retrospective` section into your
`docs/work-done/` entry answering four questions:
1. What did we learn that is not written down anywhere?
2. **Which document must change, and who owns that edit?** Name the file.
3. What did we do twice that we should never repeat?
4. What did we nearly ship, and what caught it?

Then MAKE the edits you named. A retrospective that names a document and
does not change it has failed.

## When you finish

Report in this terminal with **CLAIM + EVIDENCE + LIVE LINK**, not a summary.
Print a line starting `ITEM EXIT: 0` (or non-zero) so the watcher wakes.


