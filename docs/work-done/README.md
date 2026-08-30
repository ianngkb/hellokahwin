# HelloKahwin — Work Done

The completion record. Every piece of work that actually finished gets logged
here, so the company can tell what it *did* from what it *planned*.

`docs/plans/` holds intent. This folder holds outcome. A plan is not evidence
that anything shipped.

## Layout

Same date-first convention as plans — one folder per /hellokahwin session,
every file inside prefixed with the same date:

```
docs/work-done/
  aug-23-2026-session-01/
    aug-23-2026-done-<slug>.md
```

## When to log

A hire logs an entry when a briefed task is complete. The CEO logs one when a
phase closes, a plan is delivered, or infrastructure lands. Log the work when
it is DONE, not when it is started — an abandoned task is logged as abandoned,
with the reason, never quietly dropped.

### Code work is not done until it is deployed

A fix that exists only in a working tree has not happened.

On 25 Ogos 2026 a verified fix for a live, owner-rule-breaking defect — article
covers serving uncredited photographs, non-deterministically, on any page — sat
**uncommitted** in `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
while four agents worked in the same repository. The audit that produced it was
logged, thorough and correct, and it read as finished. The CEO found the gap by
running `git status`, not from any report. Nothing in this file would have
caught it, because nothing in this file asks where the code IS.

So, for any entry whose work touched code:

- **`completed` requires all three** — committed, on `origin/master`, and live
  in production with a deployment id. Miss any one and the status is
  `partial`, and the **Ship state** block below says which one.
- **Run this before writing the entry, and paste its output into Evidence:**

  ```
  git status --porcelain -- src/ scripts/ && git log --oneline origin/master..HEAD
  ```

  Two empty outputs is the only thing that earns `completed`. Anything printed
  is uncommitted or unpushed work and goes into the entry **by path** — including
  work that belongs to somebody else's task, because the agent standing in that
  tree is the one who can still ship it. Reporting another agent's unshipped fix
  is not interference; leaving it unreported is how one gets lost.
- **An entry that hands work on names the unshipped paths in its title.**
  "Fixed" and "shipped" are different words and the index has to be able to tell
  them apart at a glance.
- **Name the element by what the RENDERED page calls it, not by what the ticket
  calls it.** For any entry fixing a rendered defect, quote the selector, and
  say so when it disagrees with the ticket.

  UI-08 (31 Ogos 2026) was briefed as "the source-attribution link", with a
  rights argument attached: RIGHTS-01 had just standardised every image credit,
  so a credit hiding 60% of itself was a rights problem. The element was
  `nav[aria-label="Breadcrumb"] > ol > li > span[aria-current="page"]` — no
  `href`, no `<a>` ancestor, text identical to the page's own `<h1>`. A
  breadcrumb. The phrase was wrong in three documents before it reached the
  engineer (UI-04 §5, the tracker's DoD, the brief) because each one quoted the
  one before it. Acting on the words would have sent someone to audit `Kredit:`
  labels that were already correct.

  The measurable half of a DoD survives this; the rationale does not. Satisfy
  the measurement, and correct the description in the entry rather than
  silently.

## Entry format

```markdown
# <what was done> — <date>
**Session:** <session folder>  ·  **Owner:** <agent>  ·  **Status:** completed | partial | abandoned
**Plan:** <link to the plan/brief this fulfils, if any>

## What was done
<plain account of the work>

## Ship state
<!-- Code work only — delete this block for docs-only entries. -->
**Commit:** <sha + subject, or `UNCOMMITTED — <paths>`>
**On `origin/master`:** yes | no
**Deployed:** <deployment id + state, or `not deployed`>
**Still uncommitted in the tree:** <paths, or `none`>

## Evidence
<files produced, commands run, metrics before/after, links — how a reader verifies it>

## What it changed
<the actual effect: numbers moved, capability gained, decision unblocked>

## Follow-ups
<anything left open, and who owns it>
```

## Index

| Session | Date | Work | Owner | Status |
|---|---|---|---|---|
| 01 | Aug 23 2026 | [Company foundation & data pipeline](aug-23-2026-session-01/aug-23-2026-done-foundation-and-data-pipeline.md) | ceo-hellokahwin | completed |
| 01 | Aug 23 2026 | [SEO Phase 1: topical-authority mastery, baseline audit, content framework, first 20 articles](aug-23-2026-session-01/aug-23-2026-done-seo-phase-1.md) | head-of-seo-content | completed |
| 01 | Aug 23 2026 | [Cluster launch plan: 26 clusters, 204 article topics, SERP evidence per cluster](aug-23-2026-session-01/aug-23-2026-done-cluster-launch-plan.md) | head-of-seo-content | completed |
| 01 | Aug 23 2026 | [Production doctrine: overtaking mechanism, per-competitor case, compounding, counter-attack, stop rule](aug-23-2026-session-01/aug-23-2026-done-production-doctrine.md) | head-of-seo-content | completed |
| 01 | Aug 23 2026 | [Visual asset strategy: media audit, sourcing model, rights policy, pipeline, hire recommendation](aug-23-2026-session-01/aug-23-2026-done-visual-asset-strategy.md) | head-of-seo-content | completed |
| 01 | Aug 23 2026 | [The HelloKahwin Command Centre: internal tracking dashboard](aug-23-2026-session-01/aug-23-2026-done-internal-dashboard.md) | full-stack-engineer | completed |
| 01 | Aug 24 2026 | [Four P1 articles for C1.1 and C1.2: rukun nikah, syarat sah nikah, lafaz taklik, borang nikah](aug-23-2026-session-01/aug-24-2026-done-write-c1-nikah-procedure.md) | writer-adat-agama-prosedur | completed |
| 01 | Aug 25 2026 | [Supporting images: six graphic template specs, the article-to-graphic map, ranked rights risk, and the credit-enforcement answer](aug-23-2026-session-01/aug-25-2026-done-supporting-images-and-credit.md) | managing-editor | completed |
| 01 | Aug 25 2026 | [P1 and P6 published: eight articles live, two pillars lost `noindex`, sitemap 47 → 57](aug-23-2026-session-01/aug-25-2026-done-publish-p1-p6.md) | BMAD | completed |
| 01 | Aug 25 2026 | [The two P5 blocks re-sourced: bunga telur across three named suppliers, pelamin as an honest negative, and the price-currency rule added to the style guide and QC](aug-23-2026-session-01/aug-25-2026-done-resource-p5-blocks.md) | writer-inspirasi-vendor-venue | completed |
| 01 | Aug 26 2026 | [Vercel edge purged on ingest: pillar correct on the first request, plus an undiagnosed cold-render 502 exposure on 20 uncrawled URLs](aug-23-2026-session-01/aug-26-2026-done-edge-purge-on-ingest.md) | BMAD | completed |
| 01 | Aug 26 2026 | [PLAT-07: the sprint CLI reads back what it stores — retro, `why`, `--backlog`; the status board scoped and made parseable; the watcher stopped firing on the word "error"](aug-23-2026-session-01/aug-26-2026-done-plat-07-cli-readback.md) | BMAD | completed |
| 01 | Aug 28 2026 | [DES-04: the front-end stack decided — Tailwind stays, Radix stays, shadcn-the-dependency goes; and decision 100's description of the site corrected against production](aug-28-2026-session-01/aug-28-2026-done-des-04-stack-recommendation.md) | design-systems-engineer | completed |
| 01 | Aug 28 2026 | [DES-01: the art-direction register argued from fetched market evidence — serif is the Western signal here, not the premium one; one webfont not four; three live defects on our highest-impression article](aug-28-2026-session-01/aug-28-2026-done-des-01-art-direction-rationale.md) | creative-director | completed |
| 01 | Aug 28 2026 | [DES-06: search and catalogue specified at 360px against the live corpus — and the premise measured: the search that ships returns zero for 84.3% of real queries](aug-28-2026-session-01/aug-28-2026-done-des-06-search-and-catalogue.md) | product-designer | completed |
| 01 | Aug 28 2026 | [DES-02: three art directions on one canvas — the record, the object, the annotated reference — drawn on the live mas kahwin article, catalogue and four stress cases; and the finding that four of our eleven photographs survive being enlarged and seven do not](aug-28-2026-session-01/aug-28-2026-done-des-02-three-directions-canvas.md) | creative-director | delivered, awaiting owner's choice |
| 01 | Aug 28–29 2026 | [DES-05: the design system built against DES-03 — tokens, thirteen components and the reference page rebuilt from a pre-DES-03 proposal into the adopted, live surface at `/admin/design-system`, verified in a real authenticated session in both themes](aug-28-2026-session-01/aug-28-2026-done-des-05-design-system.md) | design-systems-engineer | completed |
| 01 | Aug 29 2026 | [SEO-04 parked a second time: the 29 Aug method fix (phone-verify → published records) never addressed decision 83's real blocker — nikahsatu.com is the venues' own operator (Zest Venture Sdn Bhd), re-confirmed live on all four candidate brands](aug-28-2026-session-01/aug-28-2026-done-seo-04-parked-second-time-same-cause.md) | head-of-seo-content | abandoned |
| 01 | Aug 29 2026 | [DES-08: homepage, catalogue and article rebuilt against DES-05's system and shipped to master — DES-09's G01 (duplicate h1) fixed 4/9→9/9, G18 closed, the DES-02-disqualified hero photo caught and swapped; plus a CSS token collision that made the accent colour near-invisible, found only by manual screenshot review and written into the production doctrine as a standing guardrail gap](aug-28-2026-session-01/aug-28-2026-done-des-08-page-rebuild.md) | design-systems-engineer | completed |
| 01 | Aug 31 2026 | [UI-04: every public template rendered at 390/768/1024/1440 with `matchMedia` proven at each width — the mobile question answered (one mobile-only defect, 10px wide), the `.s-row` bug found to start at 1024 not 1920, seven candidate findings killed by measurement including two of my own broken checks, and five new items on the board](aug-30-2026-session-01/aug-31-2026-done-ui-04-rendered-audit.md) | product-designer | completed |
| 01 | Aug 31 2026 | [RISK-09: the docs/site boundary guard built and proven — 27/27 in a throwaway clone, then INSTALLED in both live trees and re-proven against the installed hooks — refusal and a passing in-space control quoted from each repo; one install covers 15 site trees, and `pre-merge-commit` never fires here because a docs/site merge always conflicts, so `pre-commit` is the real interception point](aug-30-2026-session-01/aug-31-2026-done-risk-09-boundary-guard.md) | design-systems-engineer | completed — hooks not yet on `master`, so a fresh clone still cannot install them |
| 01 | Aug 31 2026 | [SEO-11: the SERP-shape census — 84 queries classified; the 12.2x CTR split is **intent**, not the AI Overview, which the data cannot adjudicate; the page-worthiness threshold; and CONT-13's six targets](aug-30-2026-session-01/aug-31-2026-done-seo-11-serp-shape-census.md) | head-of-seo-content | completed |
| 01 | Aug 31 2026 | [UI-02: the masthead rail wraps on desktop instead of hiding three categories — 3 of 9 links were clipped at 1280, 1440 AND 1920 because the scroller's client box was 1264px at every width, and the DoD's own viewport test found only 2 of them at 1920; 0 of 9 past the edge and 0 of 9 clipped after, measured on live production, with the keyboard, no-JS and reduced-motion states proven there too](aug-30-2026-session-01/aug-31-2026-done-ui-02-nav-overflow.md) | design-systems-engineer | completed |
| 01 | Aug 31 2026 | [PLAT-15: the sprint file and the tracker now agree item-for-item — three sprints of drift back-filled, and the mechanism closed by a gate that exits non-zero rather than a paragraph; plus two gates on `sprint import` replacing prose that had already failed once](aug-30-2026-session-01/aug-31-2026-done-plat-15-sprint-file-reconcile.md) | design-systems-engineer | completed |
| 01 | Aug 31 2026 | [RIGHTS-01: one Malay image-credit label sitewide — 115 English labels in four casings became `Kredit:`, `sOURCE:` 4 → 0 on all 86 article URLs; a second variant axis nobody had recorded (`U+00A0` after the colon, 10 credits); `Sumber:` rejected as the label because it already carries 87 FACT citations in body prose; 39 images on 3 pages named as having no owner at all; and the sweep taught to name the build it measured after twice reporting another server's numbers](aug-30-2026-session-01/aug-31-2026-done-rights-01-credit-labels.md) | managing-editor | completed |
| 01 | Aug 31 2026 | [UI-01: the homepage Terkini list gets its rank number back — all 12 headlines went from a 44px column 225–307px tall to 412×78, verified by a committed rendered-geometry gate against live production with an article page as the negative control; the fix is a RESTORATION of DES-03 §5.3's own drawing, not a new design, and option (b) would have narrowed the spec to match the build; plus the root cause nobody had recorded — `ListRow` has NO public caller, all three list surfaces hand-roll its markup, so there was no prop to forget — and the finding that UI-01 is the mirror half of a defect DES-08 fixed on mobile and shipped on desktop](aug-30-2026-session-01/aug-31-2026-done-ui-01-srow-headline-column.md) | creative-director | completed |
| 01 | Aug 31 2026 | [UI-03: the homepage hero art-directed with `<picture>` — and the finding that the slot had picked the corpus's ONE portrait photograph, so a crop-only fix would have shipped a sharp, correctly-proportioned photograph of nothing with every check green](aug-30-2026-session-01/aug-31-2026-done-ui-03-hero.md) | creative-director | completed |
| 01 | Aug 31 2026 | [UI-05: the ticket's premise measured and corrected — 37 of 44 category pages already carry photography and the 7 that do not are pillar hubs, a structurally different template; they stay text-only by a decision agreed with the creative director and argued from a contact sheet of all 38 covers at their real 80px size (two exact duplicates, four rate articles illustrated with office buildings) rather than from taste; plus two defects found while specifying and shipped — 67 pillar links had rendered in the wrong typeface since DES-08 because `.t` only ever existed as `.s-row .t`, and the empty-cluster row had no structural rule; and the counting trap that produced a number double the truth in this item's own first draft](aug-30-2026-session-01/aug-31-2026-done-ui-05-category-images.md) | product-designer | completed |
| 01 | Aug 31 2026 | [UI-08: the breadcrumb's final crumb was a fixed 200px box at every width, hiding 132px (40%) of one title and 303px (60%) of another identically at 390/768/1024/1440 — and it is a breadcrumb, not the "source-attribution link" three documents called it; plus two defects in UI-06's day-old layout gate, found while verifying: it printed `0 violation(s)` over vercel.com's login page, and its article template was exercised at a 48-character title when the corpus's longest is 95](aug-30-2026-session-01/aug-31-2026-done-ui-08-breadcrumb-crumb-width.md) | design-systems-engineer | completed |
| 01 | Aug 31 2026 | [SEO-12: the answer-type intent gate is a runnable script that exits non-zero — `mas kahwin johor` 1, `walimatul urus` 1, `doa pengantin baru rumi` 0, `idea goodies kahwin` 0; the AI Overview and the volume floor are both printed and neither touches the exit code, because SEO-11 could not confirm the first and the second would reject both PASS cases at 200/mo against a 220/mo bar; validated on OUTCOMES not on SEO-11’s labels (9.3× at p = 0.00007, holding at 32.6× and 28.1× under its two other re-cuts); the one case a marker list cannot decide settled from the term’s own demand family, with the bar firing once in 15 out-of-sample bare heads; and PRE-FLIGHT #1 rewritten, pushed AND deployed with the diff that proves it](aug-30-2026-session-01/aug-31-2026-done-seo-12-answer-type-gate.md) | head-of-seo-content | completed |
| 01 | Aug 31 2026 | [UI-07: the `/artikel` card category label wraps instead of truncating — 10px of `Hantaran & Mas Kahwin` hidden on 9 of 11 cards at 390px; and the finding that killed the item's own framing, that the SAME element hid 81px at 1024 and 17px at 1440 on the longest live category names, so the "only mobile-only defect on the site" was content-bound rather than width-bound and the obvious `sm:truncate` fix would have shipped both while passing every check; plus a committed `pnpm audit:labels` gate that tests the worst-case label read off the page, not the one that happens to be rendered, and whose negative control caught a bug in the gate itself](aug-30-2026-session-01/aug-31-2026-done-ui-07-label-clip.md) | design-systems-engineer | completed |
| 01 | Aug 31 2026 | [UI-06: a rendered-layout gate that reads computed values, watched failing on the real 44px column and the real 1,970px nav and then on itself — the pre-fix capture committed WITH the CSS that makes the 44px column exist, because content-hashed chunks stop being served the hour the fix deploys; a 59-assertion self-test that asserts each check both FIRES and CLEARS, which changed two of the five checks before they shipped; a fifth check added from UI-04 that returned ZERO on the page where UI-04 had counted nine clipped labels, because the text sat one node deeper than the condition reached; and the gate's own blocking CI job going GREEN on its first run while printing `UILINT EXIT: 1`, because `| tee` reports tee's exit status](aug-30-2026-session-01/aug-31-2026-done-ui-06-layout-gate.md) | design-systems-engineer | completed |
| 01 | Aug 31 2026 | [UI-09: the shipped search field brought up to DES-06 §8 — a focus indicator at 17.81:1 where the shipped one measured 1.98:1, a real `<label>` where the accessible name was the placeholder, a `role=status` region present from first paint where the page carried zero, 16px so iOS Safari stops zooming 79% of our traffic, and a 46px target; plus the correction that the focus ring was never MISSING — UI-04 read `boxShadow.slice(0, 60)`, Tailwind puts four empty placeholder layers first, and DES-06 had measured the real ring correctly three days earlier at 1.96:1; and the gate that did not fire, with the nine DES-06 §8 clauses that ARE a search rebuild listed rather than quietly started](aug-30-2026-session-01/aug-31-2026-done-ui-09-search-a11y.md) | design-systems-engineer | completed |
