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
| 01 | Aug 31 2026 | [RISK-09: the docs/site boundary guard built and proven — 27/27 cases in a throwaway clone, refusal and negative control both quoted; and the finding that `pre-merge-commit` never fires here because a docs/site merge always conflicts, so `pre-commit` is the real interception point](aug-30-2026-session-01/aug-31-2026-done-risk-09-boundary-guard.md) | design-systems-engineer | partial — built and tested, INSTALL PENDING the CEO's green-light |
| 01 | Aug 31 2026 | [SEO-11: the SERP-shape census — 84 queries classified; the 12.2x CTR split is **intent**, not the AI Overview, which the data cannot adjudicate; the page-worthiness threshold; and CONT-13's six targets](aug-30-2026-session-01/aug-31-2026-done-seo-11-serp-shape-census.md) | head-of-seo-content | completed |
| 01 | Aug 31 2026 | [UI-02: the masthead rail wraps on desktop instead of hiding three categories — 3 of 9 links were clipped at 1280, 1440 AND 1920 because the scroller's client box was 1264px at every width, and the DoD's own viewport test found only 2 of them at 1920; 0 of 9 past the edge and 0 of 9 clipped after, measured on live production, with the keyboard, no-JS and reduced-motion states proven there too](aug-30-2026-session-01/aug-31-2026-done-ui-02-nav-overflow.md) | design-systems-engineer | completed |
| 01 | Aug 31 2026 | [PLAT-15: the sprint file and the tracker now agree item-for-item — three sprints of drift back-filled, and the mechanism closed by a gate that exits non-zero rather than a paragraph; plus two gates on `sprint import` replacing prose that had already failed once](aug-30-2026-session-01/aug-31-2026-done-plat-15-sprint-file-reconcile.md) | design-systems-engineer | completed |
