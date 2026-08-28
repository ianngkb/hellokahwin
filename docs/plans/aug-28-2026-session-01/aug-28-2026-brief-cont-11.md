# CONT-11 — Four C2.1 head terms carry ZERO volume: re-select the targets

**Sprint 03 · content · 3pt · owner `head-of-seo-content`**

DOCS repo. **Work on the current branch.** Commit and push.

A DECISION item. It may correctly produce no new articles.

---

## What already happened upstream, and is not yours to reopen

**CONT-10 decided: DO NOT MERGE. C2.1 stays at eight published articles.** Read
`aug-28-2026-done-cont-10-c21-serp-decision.md` first. This item is about the
TARGET TERMS those articles aim at, not about the article count.

**CONT-12 is complete** — the eight are live, linked on their pillar, and the
cluster head no longer duplicates two of its own children. Your re-selection has
to work against the cluster as it now stands, not as it was planned.

---

## Why this item exists

hantaran kahwin bajet, kos hantaran kahwin, adat hantaran and persiapan hantaran all carry zero volume and no parent topic, while SURROUNDING parents carry 2,400-2,700 traffic potential. The subject is real; the chosen head terms are not. This is independent of the merge decision and true regardless of how CONT-10 lands.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: Each of the four either replaced with a head term carrying stated volume and traffic potential, or explicitly dropped with a reason. Every figure quoted with its Ahrefs field name. CHECKED BY: Ahrefs Keywords Explorer, quoting `volume` (12-month average) and saying so - the standing rule after three sessions argued over a phantom. BEWARE THE FALSE PASS: NEVER derive an article's target keyword from its slug. That error scored berapa-dulang-hantaran-tunang at 15/mo when it targets a 742/mo term. For a planned cluster the target is in the brief. EVIDENCE LANDS: docs/work-done/ entry with old term, new term, and both volumes.

## Planning context

Apply the SERP-ownership rule to the replacements too - volume AND who owns position 1.

---

## Three standing rules that bind this specific item

1. **NAME THE VOLUME FIELD.** Quote Ahrefs `volume` — the 12-month average — and
   say so at the point of use. `volume_monthly` is the latest month and is a
   different number. Three sessions once argued over a phantom because nobody said
   which field they meant. SEO-08 and CONT-10 both did this correctly today; match
   them.
2. **NEVER DERIVE A TARGET KEYWORD FROM A SLUG.** That error scored
   `berapa-dulang-hantaran-tunang` at 15/mo and called it thin, when it targets
   `dulang hantaran tunang` at 742/mo. For a planned cluster the target is in the
   brief, not in the URL.
3. **Apply the SERP-ownership rule to the REPLACEMENTS, not just to what you
   kill.** Volume AND who holds position 1. Sprint 02's retro caught that rule
   being used to eliminate an option and then not run against the option that
   replaced it — which is the rule being used to justify a decision already made.

## The four terms

`hantaran kahwin bajet`, `kos hantaran kahwin`, `adat hantaran`,
`persiapan hantaran` — all zero volume, no parent topic, while surrounding parents
carry 2,400–2,700 traffic potential. The subject is real; the chosen head terms
are not. Replace each with a term carrying stated volume, or drop it with a reason.

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


