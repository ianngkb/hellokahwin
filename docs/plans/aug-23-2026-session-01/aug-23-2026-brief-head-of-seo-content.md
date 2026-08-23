# Brief — Head of SEO & Content — Phase 1

**From:** ceo-hellokahwin · **Date:** 23 Aug 2026 (rev. 2 — owner directive)
**Plan:** `aug-23-2026-plan-malay-topical-authority.md` (read it first)
**Deliverable due:** before the next /hellokahwin board meeting

You are dispatched to execute **Phase 1**. Read `docs/boardroom/ceo-memory.md`
and the plan above before you start.

**Owner directive, from the board — this comes BEFORE everything else:**
> Thoroughly understand topical authority. Research who currently ranks high
> for topical authority (via Ahrefs and live Google), run through their
> articles, understand it properly, and **add it to your own skill** before
> executing.

Task 0 is therefore a hard gate. Do not begin the audit until it is done.

---

## Task 0 — Master topical authority, then write it into yourself

### 0a. Research the discipline
Find and read the sources that actually rank for topical authority — the
practitioners, not the summaries. Use both:
- **Ahrefs MCP**: `serp-overview` for what genuinely ranks on queries like
  "topical authority", "topical map SEO", "content clusters", "topical
  relevance"; `site-explorer-top-pages` and `site-explorer-organic-keywords`
  on the sites that dominate, to see what their winning content looks like.
- **Live web**: WebSearch/WebFetch to read the top-ranking articles in full.
  (Note: WebSearch is US-biased — use Ahrefs SERP data with `country: my`
  when you need Malaysian SERPs.)

### 0b. Study sites that HAVE topical authority
Do not stop at articles *about* the concept. Pick 3–5 sites that demonstrably
own a topic (at least one in weddings, at least one non-English if you can
find it) and reverse-engineer them with Ahrefs:
- How many articles per topic cluster, and how deep does each cluster go?
- What does their internal-linking structure look like (pillar → cluster)?
- Article anatomy: length, heading structure, entity/subtopic coverage,
  schema, media, freshness/update patterns.
- Which pages carry the traffic, and which merely support them?
Read a representative sample of their actual articles — you are looking for
the repeatable pattern, not the vibe.

### 0c. Distil the method
Write down what topical authority actually requires, concretely enough to act
on: how a topical map is built, how completeness is judged (entity/subtopic
coverage), how clusters are linked, what "depth" means article by article,
what sequencing works when starting from near-zero authority, and the common
failure modes (thin coverage, orphan posts, cannibalisation, publishing
breadth before depth).

### 0d. Add it to your skill — MANDATORY
Update your own persona file so this expertise is permanent, not a one-off
research artefact:

`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md`

Add a **Topical authority method** section holding the operational playbook
from 0c — the rules and procedures you will apply, not an essay. Keep the
rest of the persona intact; evolve, never rewrite. Then re-run
`~/Documents/Code/buddy/skillcentral/install.sh` so the change is wired live.

Also write the research itself to
`docs/plans/aug-23-2026-session-01/aug-23-2026-research-topical-authority.md`
with sources and dates, so the board can see the evidence behind the method.

**Gate: Task 0 must be complete before Task 1 begins.**

---

## Your tools are live — use them

- **Search Console**: MCP server `gsc` (property `https://hellokahwin.com/`,
  siteFullUser). Verified 23 Aug 2026.
- **Ahrefs**: MCP server `ahrefs`, Standard plan, 400,000 units/month, ~0
  used. Malaysia country code is `my`. Call the `doc` tool for a tool's schema
  before first use. Budget your units — this is a bounded audit, not a
  fishing expedition.

## Task 1 — Baseline audit (GSC)

Establish what the site earns today and answer the open question: **why do
English queries dominate impressions when the posts are titled in Malay?**
Break clicks, impressions, CTR and position down by query and by page;
quantify the English-vs-Malay impression split; flag indexing/coverage
problems. Baseline: 32 clicks, 2,163 impressions, 1.48% CTR, position 20.6
(25 Jul – 21 Aug 2026).

## Task 2 — Malay keyword landscape (Ahrefs, MY)

Research **in Malay only** — never English keywords translated afterwards.
Start from the wedding seed set (kahwin, perkahwinan, majlis kahwin, hantaran,
pelamin, baju nikah, kenduri, akad nikah, mas kahwin, solekan pengantin, kos
kahwin, adat perkahwinan, …) and expand via matching terms, related terms and
search suggestions. Produce a ranked opportunity list scoring volume ×
difficulty × intent, prioritising **difficulty 0–3** with real volume.
Reference points (23 Aug 2026): baju nikah 1,992/KD1 · hantaran kahwin
1,725/KD0 · pelamin 1,397/KD0 · kahwin 981/KD2 · kenduri kahwin 370/KD0.

## Task 3 — Competitor gap

Compare against TheWeddingNotebook.com and the Malay wedding publishers that
actually rank for the target keywords. Where do they win, what do they not
cover, and which of our 29 existing posts
(`data/hellokahwin-export/content/posts.json`) should be upgraded rather than
replaced?

## Task 4 — The Content Framework (main deliverable)

Deliver a production system built on the method from Task 0, not a list:
- **Topical map**: pillars → clusters → the articles each cluster needs for
  genuine coverage (justified by your topical-authority research).
- **Article templates** by type (panduan, senarai, Real Wedding feature,
  soal-jawab): structure, length, heading pattern, what makes each good.
- **Quality bar**: what a publishable HelloKahwin article must have.
- **Internal-linking rules** for cluster architecture.
- **Proposed cadence**, justified against the plan's 80-articles-in-90-days
  goal and competitor publishing rates — recommend with reasoning; the CEO
  decides.

## Task 5 — The cluster launch plan (OWNER DIRECTIVE — the main strategic ask)

The owner wants **strategy, not content**. Write nothing publishable in this
task. Deliver the plan for what we will own and why.

**Target: at least 20 topical-authority clusters — as many as the data
genuinely supports.** If the data supports 30, propose 30. If a candidate
cluster does not stand up to the evidence, say so and drop it rather than
padding to hit a number; the owner asked for "as many as possible **if it
makes sense**". Justify the final count.

For **each cluster**, give:

1. **Cluster name** (Malay) and the audience need it serves.
2. **Head keyword** + its volume, difficulty, and intent (Ahrefs, `my`, with
   the date pulled).
3. **Why this cluster — the data argument.** Not "weddings are popular":
   the actual case. Search volume, difficulty, who currently ranks and how
   weakly, whether the SERP is dominated by forums/marketplaces we can beat,
   seasonality, and commercial or audience value to HelloKahwin. State the
   evidence and let it carry the decision.
4. **Supporting keywords** — the cluster's long tail, each with volume and
   difficulty, showing the cluster has genuine depth rather than one keyword
   wearing a hat.
5. **TOPICS, not content** — the list of article topics that would make this
   cluster complete: one line each, saying what question the article answers
   and for whom. Enough topics that the cluster achieves real coverage of the
   subject (this is the whole point of topical authority — apply the
   completeness standard from your Task 0 research). **Do not draft, outline,
   or write any article.**
6. **Priority tier** — launch order, with reasoning (quickest authority wins
   first, per your Task 0 findings on sequencing from zero authority).
7. **Supply lever per topic** where obvious: translate-and-localize from TWN
   vs original Malay.

Then, across the whole set:

- **The keyword focus argument.** Which keywords we are choosing to fight for
  overall and — explicitly — **why those and not others**. Name what you
  deliberately excluded and the data reason (too hard, too thin, wrong
  intent, wrong audience).
- **The map**: how clusters interlink into pillars, and which clusters
  reinforce each other's authority.
- **Coverage estimate**: total addressable monthly search volume across the
  proposed clusters, so the board can sanity-check the plan's 1,500
  clicks/28d target against it.
- **Launch sequence**: which clusters go first, second, third, and why.

Deliver as `aug-23-2026-clusters-launch-plan.md`.

## Rules

- **Task 0 gates everything.** Method first, then application.
- **Malay-only keyword research.** Non-negotiable.
- **Everything you write passes /humanizer** before it is done.
- **Never fabricate a number.** Every figure cites tool + date. If a source is
  unreachable, say so.
- **STRATEGY ONLY — write no content.** Owner directive: no articles, no
  drafts, no outlines, no sample paragraphs. Topics and reasoning only. The
  deliverable is a plan the board can approve, not prose.
- **Do not publish anything.** Deliver files; publication is a separate,
  board-approved phase.
- **Do not hire.** Recommend to the CEO if you need someone.

## Output

Write to `docs/plans/aug-23-2026-session-01/`:
- `aug-23-2026-research-topical-authority.md` (Task 0 evidence)
- `aug-23-2026-audit-baseline.md` (Tasks 1–3)
- `aug-23-2026-framework-content.md` (Task 4)
- `aug-23-2026-clusters-launch-plan.md` (Task 5 — the main strategic ask)

Plus the updated persona file (Task 0d) and a re-run of install.sh.

**When you finish, log the work** in
`docs/work-done/aug-23-2026-session-01/aug-23-2026-done-seo-phase-1.md`,
following the format in `docs/work-done/README.md`: what you did, evidence a
reader can verify, what it changed, and open follow-ups. Add your row to the
index table in that README. If you could not complete something, log it as
partial or abandoned with the reason — never quietly drop it.

Then report in this terminal: what topical authority actually demands of us,
the three findings that most change what we should do, and anything you need
from the CEO.
