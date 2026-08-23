# Brief — Full-Stack Engineer — The HelloKahwin Command Centre

**From:** ceo-hellokahwin · **Date:** 23 Aug 2026
**Board directive:** build an interactive HTML dashboard that lists, tracks
and updates everything — *"almost our own dashboard to track history of our
chats, what has been updated and so on… the visual representation of the work
we will be doing."* Plus, explicitly: **People and Org Chart, with each
agent's `.md` file viewable.**

**Build this through `/autopilot`** — owner directive. Plan, build,
self-review, ship. Not ad-hoc coding.

---

## What this is

The company's single pane of glass. Everything HelloKahwin has decided,
planned, done and measured, in one interactive page that **reads the real
files** so it can never drift from the truth.

Read `docs/boardroom/ceo-memory.md` first — it is the authority on the
product's state, including the two-repo trap you must not fall into.

## Data sources — all real, none hand-maintained

| Source | Path | What it yields |
|---|---|---|
| Boardroom | `docs/boardroom/` | `ceo-memory.md`, `decision-log.md`, `meetings/*.md` |
| Plans | `docs/plans/<session>/` | plans, briefs, research, audits, proposals — with Status lines |
| Work done | `docs/work-done/<session>/` | completion records with evidence |
| **Org chart** | `skillcentral/agents/projects/hellokahwin/**/*.md` | every agent's persona file, by department |
| Search Console | `gsc` MCP server | clicks, impressions, CTR, position |
| Ahrefs | `ahrefs` MCP server | keyword and competitor data (mind the unit budget) |

Never hand-copy content into the dashboard. If it is not read from a file or
an API, it does not belong on the page.

## Required sections

### 1. Timeline
Every meeting, decision, plan and completed piece of work in date order.
Filterable by session, owner and status. This is the "history of our chats"
the board asked for — the record of what happened and when.

### 2. Decision tracker
Every decision with: what was decided, the evidence behind it, what was
predicted, and **what actually happened**. Predictions get scored against
reality — that is the part that makes this more than a filing cabinet. Show
open predictions with their due dates.

### 3. Plans
Every plan with its Status (DRAFT / APPROVED / SUPERSEDED / ABANDONED),
revision history, and what it superseded. Render the markdown readable
in-page, not as a download link.

### 4. Work done
Completion records with their evidence, so "we shipped X" is always one click
from the proof. Show anything logged partial or abandoned just as prominently
as completed — hiding those defeats the point.

### 5. People & Org Chart — **explicitly requested**
- **The chart**: visual hierarchy showing who reports to whom, by department
  (Executive, Editorial, Marketing, Engineering).
- **Per person**: role, what they own, what they cannot do, who they report
  to, when hired, and their **full persona `.md` file rendered readable
  in-page** — the board wants to read each one.
- **Activity**: what each agent has produced, pulled from work-done.
- Show blocking authority explicitly: the Editorial Verification Lead can
  block publication and that is a structural fact worth seeing on the chart.

### 6. Metrics
GSC clicks, impressions, CTR and average position over time, against the
plan's checkpoints (150 clicks @30d, 500 @60d, 1,500 @90d). Plus the
**weekly article count** — the leading indicator; when it slips, everything
slips 30 days later. Flag the 21 Aug URL migration on any time axis so nobody
misreads migration noise as performance.

## My brainstorm — what else this should hold

The board asked what else it could include. My list, in priority order:

1. **Cluster progress board.** All 26 approved clusters with coverage
   percentage — topics mapped versus articles live. The clearest possible
   answer to "how far through the strategy are we?"
2. **The content pipeline.** Every article as a card moving through the eight
   workflow stages (brief → source → draft → review board → humanize → SEO QC
   → ingest → measure), showing where each one is and what is stuck. A
   kanban of the assembly line.
3. **Review board outcomes.** What each review changed, which seat raised it,
   and how often. Recurring failure modes are supposed to be fixed upstream
   in the brief — this is how we spot them.
4. **The currency register.** Every claim that can expire, its source, when
   it was last verified, and what is overdue. Turns the Verification Lead's
   register into something the board can see at a glance.
5. **Blocked items.** Anything a verification block, a missing approval or a
   dependency is holding up. Short list, high value.
6. **Competitor tracker.** ppsignature.com, nikahsatu.com, songketdunia.my,
   theweddingnotebook.com — DR, keyword count, top-3 count, estimated traffic
   over time. We found ppsignature late; never be surprised again.
7. **Keyword rank movement** for the clusters we are actively building.
8. **Decision-quality scorecard.** Predictions made versus outcomes, over
   time. Whether this CEO's judgement is actually any good, measured.
9. **Approvals queue.** What is sitting with the board right now, and how
   long it has been waiting.
10. **Search across everything** — one box over every document in the tree.
11. **What changed since you last looked** — a diff-style feed of new and
    updated documents.

Build sections 1–6 as required. From the brainstorm, prioritise **1, 2, 5 and
9** in the first version; they change decisions weekly. The rest are
valuable and can follow.

## How it must work

- **Regenerates on demand** so it is always current, never another stale
  document.
- Self-contained and interactive — filters, expandable documents, working
  navigation.
- Readable on a phone. The board will check it away from a desk.
- Markdown rendered properly in-page, including tables.
- Honest empty states: when a section has no data, say so plainly rather than
  showing a hopeful zero.

## Rules

- **Build through /autopilot.**
- **Read real files; never hand-copy content.**
- **Never fabricate a metric.** If a source is unreachable, the dashboard says
  so on the page.
- Secrets come from the `/tokens` registry and the vault — never hardcoded.
- This is internal. It does not deploy to the public site without board
  approval.

## When done

Log it in `docs/work-done/aug-23-2026-session-01/` per that README's format,
and report in this terminal: where the dashboard lives, how to regenerate it,
what you built beyond the required six, and anything you need from me.
