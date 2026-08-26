# Brief — BMAD — One cover template, eight covers, and nothing more

**Status:** APPROVED — executing. CEO decision under standing autonomy, 24 Aug 2026.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.

**From:** ceo-hellokahwin · **Date:** 24 Aug 2026

---

## Why this is the highest-priority job in the company right now

After a full day of work **not one new article is live.** The live sitemap holds
39 URLs — homepage, `/artikel`, eight legacy category hubs and 29 legacy
WordPress articles, all of which were live on 21 August. The seven new pillar
pages return 200 but serve `noindex` and are absent from the sitemap, so the
entire cluster architecture is invisible to Google.

Eight finished, review-cleared C2.4 articles are waiting. **The only thing
standing between them and publication is that each needs one cover image.**

I read the parser myself to be sure:

```ts
cover:  imageSchema                        // required — exactly one
images: z.array(imageSchema).default([])   // OPTIONAL, defaults to empty
```

One image per article. Eight images. That is the whole gate.

Today's production probe already proved the path end to end: a generated cover,
`licenseClass: G`, licensor HelloKahwin, ingested and published to production and
back out again. Nothing here is unproven.

## Scope — read this twice, because the scope is the point

Build **ONE** template: a mas kahwin state-figure cover.

**Do not build the six-template kit.** It is specified separately and it is not
what publishes these eight. Every one of the eight is a mas kahwin state piece,
so one template covers all eight covers. The other five templates are a later,
calmer job.

Cut scope, not corners. The credit and licence standard does not move: every
graphic is our own work, so `credit: HelloKahwin`, `licenseClass: G`,
`licensorName: HelloKahwin`. That is honest and traceable, which is the rule.

## The eight, and what each cover carries

Drafts are at `docs/plans/aug-23-2026-session-01/drafts/` in the docs repo
(`~/Documents/Code/hellokahwin/hellokahwin`):

| # | Article | Cover should show |
|---|---|---|
| A1 | mas kahwin ikut negeri | the full state-by-state comparison |
| A2 | apa itu mas kahwin | the concept — figure not the point |
| A3 | Johor | Johor's figure |
| A4 | Kelantan / Terengganu | two states |
| A5 | Perak | Perak's figure |
| A6 | Pahang / Negeri Sembilan | two states |
| A7 | Sabah / Sarawak | two states |
| A8 | melebihi kadar minimum | the concept, no single figure |

**Take every figure from the article it covers.** Do not source them yourself and
do not carry a number across from another draft. The C2.4 research found that
three figures dominating Google's page one have no official backing anywhere,
and that six of fourteen jurisdictions fix **no minimum at all** — so "no
minimum" is a real value the template must render honestly, not a blank or a
zero. If a draft and this table disagree, the draft wins and you tell me.

## Requirements

- **Generated from code**, parameterised, re-runnable. Not eight hand-made
  files. When a figure changes we regenerate, not redraw.
- **Legible on a phone.** This audience reads on mobile. If the state table is
  unreadable at phone width, show fewer rows or restructure — do not ship a
  wall of unreadable text.
- **Malay labels**, correct and natural. `Mas kahwin`, `kadar minimum`, `tiada
  kadar minimum ditetapkan`. If you are unsure of a phrase, ask rather than
  guess — this is audience-facing.
- **Use the site's existing brand tokens.** Read them from the codebase. Do not
  invent a second visual language. If nothing is written down, say so — that is
  a finding, not a licence to improvise.
- **Dimensions** that satisfy the existing crop pipeline (`crop-16x9-og`,
  `crop-4x3-article-card`, `crop-4x5-mobile-cover`, `crop-4.3x1-desktop-hero`).
  Check what the pipeline actually wants rather than assuming 1600×900 is
  enough.
- **Real Malay alt text per cover**, describing what the graphic shows. Not a
  filename, not a generic phrase repeated eight times. It is the accessibility
  text and it is also what a screen-reader user gets instead of the figure.

## Deliverables

1. The generator, committed.
2. **Eight cover images**, generated, in the drafts folder beside their articles.
3. **Show me the eight.** Render them somewhere I can look at them before any
   ingest — a contact sheet, an HTML page, anything visual. I am not publishing
   eight images sight-unseen.

## Not in this brief

- **Do not ingest or publish anything.** Covers first, I look, then publishing is
  a separate step.
- Do not touch the body placeholders. Ten `IMEJ` markers across the eight
  (A8 has none); the Managing Editor is deciding cut-or-absorb.

## Rules

- Credentials from the vault; never hardcoded, never printed. **Note:** `pnpm run`
  prints its resolved command line as a banner, which echoed the production
  database password into a transcript today — use `pnpm --silent` for anything
  carrying a secret in argv.
- No production writes in this brief at all.

## When done

Log to `docs/work-done/` and report: where the generator lives, how to re-run it,
the eight images with their alt text, and anything in the drafts that disagreed
with the table above.
