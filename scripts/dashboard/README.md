# The HelloKahwin Command Centre

The company's single pane of glass. One interactive HTML page that reads the
**real files** and the **live Search Console API** every time it is generated,
so it cannot drift from the truth.

Owned by `full-stack-engineer`. Internal — it does not deploy to the public
site without board approval.

## Regenerate it

```bash
node scripts/dashboard/generate.mjs
```

Writes `docs/dashboard/index.html`. Open that file directly in a browser, or:

```bash
node scripts/dashboard/generate.mjs --open      # regenerate and open it
node scripts/dashboard/serve.mjs 3037           # preview at http://127.0.0.1:3037
```

Flags:

| Flag | What it does |
|---|---|
| `--offline` | Skip the Search Console call and use the last saved snapshot |
| `--out FILE` | Write somewhere other than `docs/dashboard/index.html` |
| `--open` | Open the page when it is written |
| `--quiet` | No console output |

No dependencies, no `npm install`. Node 18+ (uses built-in `fetch`).

## What it reads

| Source | Path | Yields |
|---|---|---|
| Boardroom | `docs/boardroom/` | company memory, decision log, meeting minutes |
| Plans | `docs/plans/<session>/` | plans, briefs, research, audits, proposals, with their Status lines |
| Article drafts | `docs/plans/<session>/drafts/` | the articles themselves, and the stage each one sits at |
| Work done | `docs/work-done/<session>/` | completion records and their evidence |
| Org chart | `skillcentral/agents/projects/hellokahwin/**` | every persona file, by department, plus the hire changelog |
| Search Console | `searchconsole.googleapis.com` | clicks, impressions, CTR, position, daily history, top queries and pages |

Paths are resolved automatically and can all be overridden by environment
variable: `HELLOKAHWIN_DOCS`, `HELLOKAHWIN_ORG_CHART`,
`HELLOKAHWIN_DASHBOARD_OUT`, `HELLOKAHWIN_GSC_SITE`,
`GSC_SERVICE_ACCOUNT_PATH`.

## The three rules it is built on

1. **Read real files. Never hand-copy.** Nothing on the page is typed in. If a
   number is not in a file or returned by an API, it is not on the page.
2. **Never fabricate a metric.** When Search Console cannot be reached, the page
   says so, in red, with the reason. It does not fall back to a remembered
   number and pretend it is current.
3. **Honest empty states.** A section with no data explains *why* it is empty.
   Coverage counts articles that are **live** — a publish-ready draft held at
   stage 7 is not coverage, and counting it as such would be the easiest way to
   make this page lie.

## How data gets in

Everything below is read from documents the team already writes. Nothing needs
a separate register to be maintained by hand.

**Articles and their pipeline stage** come from the header block of each draft
in `docs/plans/<session>/drafts/`:

```markdown
**Status:** PUBLISH-READY. Stage 4 review board, Stage 5 `/humanizer` and
Stage 6 SEO QC all complete. **Held at Stage 7:** the P2 pillar page does not
exist yet.
**Article:** A1, head of cluster C2.4 · **Pillar:** P2 Hantaran & Mas Kahwin
**Writer:** `writer-adat-agama-prosedur`
```

- `Held at Stage N` puts the card in column N and flags it as stuck, with the
  reason shown on the card.
- `Stage N … complete` puts it in column N+1.
- `published` / `live on` marks it live, and only then does it count as coverage.
- Several files for one article (draft, REVIEWED, REVISED) are de-duplicated;
  the most advanced version wins.

**Blocked items and the approvals queue** come from: any `**Status:**` line
reading DRAFT or "awaiting board approval"; a `## Follow-ups` section; a
`## What I need from the board / CEO` section; `## Owner requests`; and open
rows in a meeting's `## Actions` table.

**Predictions** are extracted from the `Prediction:` clauses in
`docs/boardroom/decision-log.md`, with their due dates worked out from `@30d`
style horizons or explicit calendar dates. Where a prediction is measured in
Search Console clicks or impressions, the live figure is shown beside it.

**Outcomes** are the one thing the dashboard cannot derive. Create
`docs/boardroom/prediction-outcomes.md` with rows in this shape and the page
will score the predictions instead of listing them all as open:

```markdown
| D7 | 150 clicks @30d | 2026-09-22 | hit | 168 clicks, cluster C2.4 carried it |
```

Columns: decision number · the claim · when it was scored · `hit`/`missed`/
`partial`/`open` · a note. Until that file exists, the page says plainly that
nothing has been scored yet — which is the honest state, not a gap.

## Layout

```
scripts/dashboard/
  generate.mjs        the entry point
  serve.mjs           local preview server (read-only, loopback only)
  lib/
    config.mjs        paths, targets, environment overrides
    md.mjs            markdown → HTML (tables, nested lists, code, quotes)
    docs.mjs          the document tree: metadata, status, sections, revisions
    org.mjs           personas, departments, reporting lines, ownership
    decisions.mjs     the decision log, predictions and their scoring
    clusters.mjs      pillars, clusters, the article register, coverage
    pipeline.mjs      the eight stages, the board, pillar readiness
    derive.mjs        timeline, blocked, approvals, activity, search index
    gsc.mjs           live Search Console (service-account JWT)
    charts.mjs        inline SVG line and bar charts
    assets.mjs        the page's CSS and behaviour
    render.mjs        assembles the HTML
  test/
    md.test.mjs       markdown renderer checks
    page.test.mjs     structural checks on the generated page
```

Run the checks with:

```bash
node scripts/dashboard/test/md.test.mjs
node scripts/dashboard/test/page.test.mjs
```

## Secrets

The Search Console credential is read from a file path and is never printed,
logged, or written into the generated page. Default location comes from the
`/tokens` registry (`~/.claude/secrets/gsc-service-account.json`, backed up in
Doppler project `hellokahwin`); override with `GSC_SERVICE_ACCOUNT_PATH`.
`docs/dashboard/data/gsc-snapshot.json` holds only aggregate metrics — no
credential material.
