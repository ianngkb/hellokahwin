# DES-12 — Adopt the wordmark in the site header, and retire the current one

**Sprint 03 · design · 3pt · owner `design-systems-engineer`**

**ISOLATED WORKTREE of the site repo**, cut off `master`. Your branch is checked out.
Do NOT `git checkout`, do NOT `git stash`, do NOT touch the main checkout.

**This is the last item in Sprint 03.** Everything it needs is already on `master`.

## What already exists — use it, do not rebuild it

| What | Where |
|---|---|
| **Five outlined lockups**, cut at `opsz 6` | `public/brand/logos/` on master |
| **The typed asset registry**, with min-heights and ratios | `src/components/brand/brand-assets.ts` |
| **The design system** — tokens and components | `src/design-system/` |
| **The public brand page**, live | `/brand` |

## THE CONSTRAINT THAT DECIDES THIS ITEM

**The mark must fit beside a reachable search affordance at 360px.** This is not a
nicety — it is the reason direction C was rejected and the reason `/brand` states an
18px minimum:

- **Mobile is 64% of impressions at position 8.7**; desktop is 28.9. Two-thirds of
  readers meet the header on a phone.
- Carats & Cake's sister brand ships its wordmark at **250 × 22**, which on a 360px
  phone is **69% of the viewport** and leaves 78px for search and menu. **We measured
  that and decided we cannot afford it.**
- `/brand` advertises **min-height 18px for the horizontal** and **14px for the
  monogram**. Those numbers are true only because the marks were re-cut at `opsz 6`
  — DES-13 found the axis barely moves the stems (1.1% across its whole range) but
  nearly erases the hairline. **Do not use the horizontal below 18px. That is what
  the monogram is for.**

**If the horizontal cannot fit beside search at 360px, that is a FINDING to bring
back — not a licence to breach the stated minimum.** The vertical and monogram
lockups exist precisely for that case.

## Do not regress what shipped today

DES-08 rebuilt all three page types hours ago and four of this sprint's SEO fixes
live on those templates. The header is in the ROOT LAYOUT, so a change there touches
every page on the site. Before you finish, run
`docs/work-done/aug-28-2026-session-01/aug-28-2026-des-09-EVIDENCE/check-guardrails.py`
and confirm **G08 stays at 11/11 nav spine** — DES-08 explicitly refused a Masthead
that capped desktop nav at 3 categories because it would have regressed exactly that.

---

## Why this item exists

A brand page nobody applies is a document, not a rebrand. The header is where the mark actually earns its keep - and where the locked register is most at risk, because Bliss & Bone ships at 250x22, which is 69% of a 360px viewport and leaves 78px for search and menu.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: The wordmark live in the production header at both breakpoints. At 360px the header holds the mark AND a reachable search affordance simultaneously - screenshot or measured widths proving both fit. Monogram used below 18px, per the brand page's own minimum. CHECKED BY: Load production at 360px and at desktop. Measure the rendered mark width against the viewport. If the horizontal does not fit beside search, the vertical or the monogram is the answer - not shrinking the mark past its stated minimum. BEWARE THE FALSE PASS: Checking only desktop is how this ships broken - 64% of impressions arrive on mobile, at position 8.7 against desktop's 28.9. EVIDENCE LANDS: docs/work-done/ entry with both measurements.

## Planning context

If the horizontal cannot fit beside search at 360px, that is a finding to bring back, not a reason to violate the minimum height. DES-13 CLOSED 28 Aug: the face is FINAL - Bodoni Moda 2.005, SIL Open Font License 1.1, RM0, complete Latin coverage. The wordmark is no longer provisional and this item is unblocked on the face. It still sits behind DES-10, which must re-cut the five lockups at wght 400 opsz 6: the shipped files were cut at the font's DEFAULT opsz 11, where the hairline composites to 2.94:1 at the brand page's own 18px minimum on a DPR 1 display - under the 3:1 WCAG 2.2 non-text floor. Numbers and the per-lockup instance table: docs/work-done/aug-28-2026-session-01/aug-28-2026-done-des-13-display-typeface.md

---

## One gap the CEO wants closed if it is cheap

DES-08 established that **no automated check here compares a computed colour or a
contrast ratio** — an invisible-gold-text bug would have shipped sitewide with every
check green. The wordmark is `currentColor`. **State the measured contrast of the
mark against its header ground, in both themes**, rather than assuming it inherits
something safe.

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


