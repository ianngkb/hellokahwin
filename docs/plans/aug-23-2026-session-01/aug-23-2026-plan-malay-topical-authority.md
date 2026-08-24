# Plan — Malay Topical Authority (first growth plan)

**Status:** APPROVED 23 Aug 2026 (v3 — board raised the target and added the
topical-authority mastery gate)
**Session:** aug-23-2026-session-01 (/hellokahwin founding check-in)
**Author:** ceo-hellokahwin
**Date:** 23 Aug 2026

---

## Objective

Grow hellokahwin.com organic search traffic from **32 clicks / 28 days** to
**1,500+ clicks / 28 days by 21 Nov 2026 (90 days)** — a ~47x lift — by
owning the Malay-language wedding-advice space that the site currently does
not compete in at all.

Secondary objective, tracked but not the target: lift average position from
20.6 into the top 10 for the keyword set we choose to own.

**Why this number is reachable, not wishful** (board raised the ambition
23 Aug): the target keywords sit at difficulty 0–2, where a competent article
can reach the top 10 in weeks rather than quarters. At **80 published
articles** averaging ~600 monthly searches each, we address ~48,000 monthly
searches. Ranking top-10 on 60% of them at a 5% CTR yields ~1,440 clicks/mo.
The maths works only if the content engine actually produces 80 articles —
so volume capacity, not keyword difficulty, is the binding constraint, and
the hiring plan below is sized for it.

## Current baseline (all figures sourced)

**Google Search Console, 28 days 25 Jul – 21 Aug 2026** (pulled 23 Aug 2026):

| Metric | Value |
|---|---|
| Clicks | 32 |
| Impressions | 2,163 |
| CTR | 1.48% |
| Average position | 20.6 |

**Ahrefs Keywords Explorer, country MY** (pulled 23 Aug 2026, sample of 5):

| Keyword | Volume/mo | Difficulty |
|---|---|---|
| baju nikah | 1,992 | 1 |
| hantaran kahwin | 1,725 | 0 |
| pelamin | 1,397 | 0 |
| kahwin | 981 | 2 |
| kenduri kahwin | 370 | 0 |

**Content inventory:** 29 posts, 24 categories (WordPress export, 21 Aug 2026).

### What the data says

1. **The site is invisible in search.** 32 clicks/month is a rounding error;
   position 20.6 means page 2–3, where almost nobody clicks.
2. **It is competing in the wrong language.** The impressions it does earn
   come largely from ENGLISH queries ("garden wedding malaysia", "beautiful
   wedding venues"), while Malay queries barely register ("berapa mas kahwin":
   1 impression). The audience searches in Malay; the site surfaces in English.
3. **The Malay wedding space is wide open.** Difficulty **0–2** on keywords
   with 370–2,000 monthly searches each. This is not a hard market to enter —
   it is an unclaimed one. The constraint is coverage, not competition.
4. **29 posts cannot hold topical authority.** Google rewards depth across a
   topic. A 29-post site competing against established publishers on breadth
   will lose; a site that owns *every question a Malay couple asks* can win.

**Open question the audit must answer:** why do English queries dominate
impressions when the posts are titled in Malay? (Legacy domain signals?
Migrated TWN content? Indexing gaps?) The answer changes the sequencing.

## Product reality check (CEO due diligence, 23 Aug 2026)

Correcting the record from earlier in this session — this materially improves
the plan:

- **The site is already rebuilt and live on Next.js + Vercel.** Response
  headers confirm `Server: Vercel`, `X-Powered-By: Next.js`, prerendered and
  cache-HIT. WordPress is genuinely gone, and it was *replaced*, not merely
  removed.
- **The live site's code is `ianngkb/hellokahwin` on GitHub** (Next.js,
  Drizzle ORM, Clerk, Tailwind/shadcn; last push 22 Aug 2026). Content is
  database-driven via Drizzle → Supabase (`nyidzlupgmyyazhyykuk`), not
  markdown files.
- **That repo is NOT cloned on this machine.** The local folder
  `~/Documents/Code/hellokahwin/hellokahwin` is the older Electron
  *migration tool*, a different codebase. Any site work needs the real repo
  cloned first.

**Consequence: we are not blocked on a rebuild.** A publishing pipeline
exists. The gap is the path from "approved article" to "row in the database",
which is a small engineering task, not a platform project.

## Strategy

**Own the Malay wedding-advice long tail before anyone else claims it.**

Three bets, in order:

1. **Framework before volume.** A repeatable production system — topical map,
   article templates, quality bar, internal-linking rules — so that bulk
   production is consistent instead of 40 one-off articles. (Owner directive,
   and the difference between authority and noise.)
2. **Cluster depth, not scattered posts.** Pick 4–6 pillars (e.g. hantaran,
   pelamin & dekorasi, baju & solekan, kos & bajet kahwin, adat & majlis,
   venue) and cover each exhaustively. Depth in a few clusters beats one post
   in twenty.
3. **Zero-difficulty first.** Publish against difficulty 0–3 keywords with
   real volume before touching anything competitive. Early wins compound into
   the domain authority needed for harder terms later.

**Content supply, decided per topic by data:** translate-and-localize TWN
content where Malay demand matches an existing English piece; write original
Malay content where the demand is culturally specific (adat, agama, kos) and
no TWN equivalent exists. Every piece passes /humanizer before it is done.

## Team & delegation

| Role | Agent | Status |
|---|---|---|
| Strategy, approvals, reporting | `ceo-hellokahwin` | Active |
| SEO & content strategy, briefs, QC | `head-of-seo-content` | Hired 23 Aug — dispatch pending |
| Malay content writers (volume) | — | **2 hires proposed, Phase 2** — 80 articles in 90 days is ~7/week sustained; one writer plus an SEO head doing QC cannot hold that rate |
| Site engineering (publish path) | — | **Decide Phase 3**: hire, or use /autopilot |

**How work is dispatched:** every delegated task runs in a **visible Windows
Terminal tab** the owner can watch and interrupt — never a hidden background
job — via
`skillcentral/skills/hellokahwin/scripts/dispatch-agent.ps1 -Agent <name>
-BriefFile <brief>`. The CEO does not do specialist work personally.

## Execution phases

### Phase 1 — Topical authority mastery, baseline audit & framework (this week)
**Owner:** `head-of-seo-content` · **Brief:** `aug-23-2026-brief-head-of-seo-content.md`

0. **Master topical authority first (board directive, hard gate).** Research
   what actually ranks on the discipline via Ahrefs SERP data and live
   reading; reverse-engineer 3–5 sites that demonstrably own a topic (cluster
   depth, internal linking, article anatomy, sequencing from zero authority);
   distil the operational method and **write it permanently into the
   head-of-seo-content persona file**, then re-run install.sh. Evidence goes
   to `aug-23-2026-research-topical-authority.md`. No audit work begins until
   this is done — we are betting the company's growth on this discipline, so
   the team masters it before applying it.
1. Full GSC baseline: every query, page, and the English-vs-Malay split;
   answer the open question above.
2. Malay keyword landscape via Ahrefs (MY): matching terms, related terms and
   search suggestions across the wedding seed set; build the opportunity list
   (volume × difficulty × intent).
3. Competitor gap vs TheWeddingNotebook.com and Malay wedding publishers.
4. Deliver the **Content Framework**: topical map (pillars → clusters →
   article list), article templates by type, quality bar, internal-linking
   rules, and a proposed publishing cadence with reasoning.
5. **The cluster launch plan** (board directive — the main strategic ask):
   **at least 20 topical-authority clusters** for the Malay audience, as many
   as the data genuinely supports. Per cluster: head keyword with volume,
   difficulty and intent; the data argument for why we should own it (who
   ranks now and how weakly, SERP beatability, seasonality, audience value);
   supporting long-tail keywords proving real depth; and the **topics** —
   not content — that would make the cluster complete. Across the set: which
   keywords we fight for and explicitly why not the ones excluded, the pillar
   map, total addressable search volume, and the launch sequence.

**Strategy only at this stage — no content is written.** The board wants to
approve what we will own and why before a single article exists.

**Gate:** CEO reviews → presented to the board for approval. No production of
any kind before the framework and cluster plan are approved.

### Phase 2 — Content engine (after framework approval)
- Hire **two Malay content writers** via /raiseagents (one invocation each).
  At ~7 articles/week sustained, a single writer plus an SEO head doing QC is
  not enough capacity — and the SEO head must stay on strategy and quality,
  not become the drafting bottleneck.
- Produce cluster by cluster against the approved framework, writers working
  in parallel on separate clusters.
- Every piece: draft → /humanizer → SEO QC → CEO spot-check.
- Watch the weekly article count from week one; it is the leading indicator
  for the whole plan.

### Phase 3 — Publishing path (parallel with Phase 2)
- Clone `ianngkb/hellokahwin`; document how an article becomes a live page.
- Build/confirm the ingest path from approved content to the Supabase content
  tables, with correct slugs, meta, categories, and media.
- Ship via /autopilot under an approved scope; production deploys stay a
  board-approval action.

### Phase 4 — Measure & iterate (continuous)
- Weekly: GSC clicks/impressions/position by cluster.
- Each board meeting: performance vs the predictions below, what the data
  changed, next cluster priority.
- Build the in-house analytics dashboard once there is enough flow to warrant
  it (standing mandate, not yet scheduled).

## Metrics & review cadence

| Metric | OLD baseline (28d to 21 Aug, **dead URLs**) | RE-BASELINE (21–24 Aug, new URLs) | 30 days | 60 days | 90 days |
|---|---|---|---|---|---|
| Clicks / 28d | 32 | **~65 equivalent** (7 clicks in 3 days) | 150 | 500 | **1,500** |
| Impressions / 28d | 2,163 | **~2,290 equivalent** (245 in 3 days) | 12,000 | 40,000 | 90,000 |
| CTR | 1.48% | **2.86%** | — | — | — |
| Avg position | 20.6 | **16.9** | 18 | 14 | 10 |
| Malay-query share of impressions | ~minimal | to be quantified | 40% | 60% | 75% |
| Published Malay articles (new, cumulative) | 0 | 0 | 25 | 55 | **80** |

**⚠ Corrected 24 Aug 2026.** The original baseline was captured on the OLD
WordPress URLs, every one of which was replaced in the 21 Aug migration — so
the checkpoints were comparing a dead structure to a live one. The re-baseline
above is measured on the new structure. Three days is a small sample and the
equivalents are extrapolations, not measurements; treat them as directional
until a full 28 days of post-migration data exists. **The early read is that
the migration helped**: the click rate roughly doubled, CTR nearly doubled,
and average position improved by 3.7 places.

The article count is the leading indicator — if it slips, the click target
slips with it, and that shows up 30 days before the traffic does.

Reviewed at every /hellokahwin meeting; predictions logged in the decision log
and scored against reality.

## Risks

| Risk | Mitigation |
|---|---|
| SEO lag — rankings take 3–6 months; 90-day target may land late | Zero-difficulty keywords rank fastest; track impressions (leading) not just clicks (lagging) |
| **Volume shortfall — 80 articles in 90 days is the whole plan** | Two writers hired in Phase 2; weekly article count reported at every meeting so a slip is visible 30 days before it hits traffic |
| Bulk production degrades quality | Framework + templates + /humanizer + SEO QC gate before publish. If quality and volume conflict, quality wins and I bring the trade-off to the board rather than shipping filler |
| Publish path harder than expected | Phase 3 starts in parallel, not after; scoped as a spike first |
| Translated content reads like translation | /humanizer mandatory; original content for culturally-specific topics |
| Ahrefs API units (400k/mo) burned on exploration | Research is one bounded audit, not continuous polling |
| Local repo ≠ live site causes wasted work | Clone the real repo before any site work (Phase 3 step 1) |

## What I need from the board

1. **Approve this plan** (or redirect it) — nothing executes while it reads DRAFT.
2. **Approve dispatching `head-of-seo-content`** for Phase 1 in a visible terminal.
3. **Note for later, no action now:** the two Malay writer hires (Phase 2) and
   the engineering decision (Phase 3) come back for approval when reached.

## Revision history

- **v4 (23 Aug 2026)** — board directive: Phase 1 Task 5 becomes a **cluster
  launch plan** (≥20 topical-authority clusters for the Malay audience, data-
  justified, with topics rather than content) instead of a first-20-articles
  list. Strategy only — nothing is written until the board approves what we
  will own and why.
- **v3 (23 Aug 2026)** — board directive: the team must **master topical
  authority before applying it**. Added Phase 1 Task 0 as a hard gate —
  research the discipline (Ahrefs SERP + live reading), reverse-engineer
  sites that own a topic, and write the distilled method permanently into the
  head-of-seo-content persona. Plan APPROVED at this revision.
- **v2 (23 Aug 2026)** — board raised the ambition: 90-day target 500 →
  **1,500 clicks/28d**; article goal 50 → **80**; writer hires 1 → **2**;
  added 60-day checkpoint and a volume-shortfall risk with the weekly article
  count as the early-warning signal.
- v1 (23 Aug 2026) — first draft, 500 clicks/28d.
