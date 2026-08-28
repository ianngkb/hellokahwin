# DES-05 — Build the design system: tokens, components, and the reference page

**Sprint 03 · design · 8pt · owner `design-systems-engineer`**

**ISOLATED WORKTREE of the site repo.** SEO-09 is working a sibling worktree
concurrently — do NOT `git checkout`, do NOT `git stash`, do NOT touch the main
checkout. Your branch is cut and checked out; commit and push there.

Both your gates are closed. **Read these two first — they bind you:**

- **DES-04 (yours, already shipped)** — `aug-28-2026-done-des-04-stack-recommendation.md`.
  Tailwind v4 STAYS. Radix STAYS. **The theme layer is what gets replaced.**
- **DES-03 (the spec)** — `docs/design/des-03-spesifikasi.html`, 865 KB, and its
  artifact at https://claude.ai/code/artifact/82d4d556-db93-4139-b1ce-84db67010522
  **If a state is not in that spec it is not specified** — raise it as a finding,
  do not invent it.

---

## THREE THINGS ALREADY EXIST. Do not rebuild them, and do not silently diverge.

1. **A reference page is already built and pushed**, on branch
   `feat/des-05-design-system-reference` in the site repo:
   `src/app/(admin)/admin/design-system/page.tsx` plus `tokens.css` beside it,
   registered in the admin nav. It is scoped to `.hk-ds` deliberately so nothing
   leaks while DES-04 was undecided. **DES-04 is decided now.** Your job includes
   reconciling that page with the real system — either adopt it as the reference
   surface or replace it, and say which in your work-done entry.
2. **The token values are measured, not guessed.** Four contrast failures were
   found and corrected: gold on light 3.93 → 4.56, muted on raised 3.78 → 4.55,
   oxblood on dark 3.31 → 4.54, sage on raised 3.91 → 4.52. **Do not silently
   change a colour without re-running the numbers.**
3. **The wordmark is cut at `opsz 6`, not the font default 11** — DES-13's finding
   that Bodoni Moda's opsz axis barely moves the stems (1.1% across the whole
   range) but nearly erases the hairline. The article `<h1>` webfont stays pinned
   at `opsz 11`. **They are different surfaces. Do not unify them.**

## DARK MODE — CEO ruling, 28 Aug

The 2026-07-14 decision **stands**: dark is NOT user-reachable, and you are not
shipping a ThemeProvider or a toggle. **But the system still defines both palettes
together** — light complete on the base, dark redefining ONLY the semantic tokens,
and no colour whose sole definition sits inside a dark block. `globals.css` already
asks for exactly this. Define both; expose only light.

---

## Why this item exists

Owner decision: the system lives INSIDE the hellokahwin site repo (src/design-system/) with a private /design-system reference page, matching what buddy already does. One repo, one consumer, no versioning ceremony until a second surface exists.

## Definition of done — verbatim from the tracker, NOT negotiable

OBSERVABLE: Tokens (colour, type scale, spacing, radii, shadows, motion) as primitive AND semantic layers, light and dark defined together. Components consume SEMANTIC tokens only. A live /design-system reference page that reads tokens from the system itself. Zero hex literals outside the token modules. CHECKED BY: grep the component tree for hex literals - the count must be zero. Load /design-system in both themes. Every text-on-background pairing quotes its contrast ratio. BEWARE THE FALSE PASS: Reading your own source proves what you intended. Fetch the BUILT page and read the rendered CSS. EVIDENCE LANDS: docs/work-done/ entry with the live reference-page URL. DARK MODE, CEO RULING 28 Aug (DES-01 asked): the 2026-07-14 decision STANDS - dark stays user-unreachable, no ThemeProvider, no toggle. But the SYSTEM still defines both palettes together: light complete on the base, dark redefining ONLY the semantic tokens, and NO colour whose sole definition sits inside a dark block. That is what globals.css already asks for ('keep this palette in sync so dark can be switched on later'). So specify and define both; expose only light. This DoD is AMENDED, not narrowed - it gains a constraint rather than losing one.

## Planning context

The reference page is the regression test for taste, not documentation. It updates in the SAME change as any token or component. DONE MEANS SHIPPED - merged, deployed, visible. head-of-seo-content REVIEWS the component set for heading semantics and internal-link affordances.

---

## One correction to carry

**Malay diacritic coverage is not a real gate** (decision 117). Rumi Malay is
essentially plain Latin. The CEO overstated this in three personas and DES-13
correctly refused to be blocked by it. Judge a face on **licence and cost**.

## What DES-08 will hold you to

DES-08 implements the three pages against YOUR system. Every token or shared
component you add updates the reference page **in the same change** — a reference
that has drifted from the real UI is worse than none, because people trust it.

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


