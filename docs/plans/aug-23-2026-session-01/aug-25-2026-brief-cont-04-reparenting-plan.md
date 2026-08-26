# Brief — Head of SEO & Content — CONT-04: the legacy re-parenting PLAN

**Status:** APPROVED — executing. Sprint 01, item CONT-04, 2 points.
**Dispatch with `-PermissionMode bypassPermissions`.**

## PLAN ONLY. NOTHING IS EXECUTED IN THIS BRIEF.

Say that back to yourself before you start. This item produces a document. If you
find yourself about to change an article's category, stop — that is not this item
and it is not this sprint.

---

## The situation

Twenty-nine legacy WordPress articles sit under old categories (Idea dan nasihat,
Real Wedding, Moden Kontemporari and so on). **Thirteen are squarely on-topic for
a cluster that already exists** — `mas-kahwin-ikut-negeri` belongs in P2 · C2.4,
`kursus-kahwin` in P1 · C1.3, five venue pieces in P6, four gift and stationery
pieces in P5.

The CEO first called re-parenting them *"a database update — no writing, no
images, no licence questions"*. **That was wrong.** Article URLs are built as
`/artikel/{categorySlug}/{slug}` — confirmed at `sitemap.ts:101` and in the route
tree. **Changing an article's parent changes its URL.** It is a migration with
thirteen redirects, run while Google is still consolidating the one from 21 Aug.

## Definition of done — verbatim from the sprint file

> A written migration plan with the redirect map and a recommended date.
> NOTHING EXECUTED.

## What the plan must contain

- **The thirteen, named** — each with its current URL, proposed URL, and the
  cluster it moves into. Where you disagree with the CEO's mapping, say so; it
  was editorial judgement, not data.
- **The redirect map**, exact and complete. Every old URL to its new one, single
  hop. The existing 29 legacy redirects are verified one-hop-to-200 — do not
  create a chain.
- **What it costs.** `/dewan-kahwin/` carries 132 impressions at position 9.4 and
  five of our eight clicks. That is a live ranking signal we would be moving.
  Quantify the exposure across all thirteen from GSC, not from intuition.
- **A recommended date, with the condition that unlocks it.** My instinct is
  "after the 21 Aug migration has consolidated" — but tell me what consolidation
  looks like *in the data*, so we know when it has happened rather than guessing.
- **The honest alternative:** leave them where they are and let the new cluster
  articles carry the architecture. Argue it fairly. **A plan concluding "do not
  do this" is a good outcome, not a failure** — I would rather have that answer
  now than after thirteen redirects.

## Rules

- No production writes of any kind.
- Every figure from GSC or the live site, with the date checked.
- No fabricated numbers. If the exposure cannot be measured, say so.

## When done

Write the plan to `docs/plans/aug-23-2026-session-01/`, log completion to
`docs/work-done/aug-23-2026-session-01/`, then a **`## Retrospective`** — Stage 9,
mandatory. Name the file that must change, and edit it.
