# Board meeting — 2026-08-23 — Founding check-in
**Trigger:** owner-called (/hellokahwin, no agenda handed down)
**Data reviewed:** hellokahwin.com live check (2026-08-23, reachable — site live and maintained); repo inspection (2026-08-23 — migration tool + WP export of 2026-08-21: 29 posts, 2 pages, 24 categories, 682 media items). Unreachable: Search Console (no access yet), Ahrefs (no access yet), social (no accounts exist).

## Discussion summary
First board meeting; no baseline existed. The CEO reported zero reachable traffic data and proposed "measurement before strategy" as the founding priority, plus one hire (Head of SEO & Content) directly serving the traffic north star. The owner approved both, specifying that data access will come via MCP servers (official Ahrefs MCP; mcp-gsc for Search Console) with the owner's help. The owner corrected the record on two fronts: WordPress is permanently removed (the 2026-08-21 export in the repo is the content source of truth; publish pipeline is TBD), and no social accounts exist — social is deferred until content production flows, to be revisited next meeting. The owner directed the CEO to learn the product inside out before hiring; the CEO completed a repo/product deep-dive and recorded it in a new permanent `ceo-memory.md`. The owner added a company-wide content rule: everything produced passes the /humanizer skill (installed machine-wide during the meeting), and directed that keyword research use Malay-language data (seed terms like "kahwin"), with strategy focused on topical authority in the Malaysian Malay wedding space — framework first, then quality in bulk.

## Decisions
| # | Decision | Basis (data/source) | Approved by |
|---|---|---|---|
| 1 | Founding priority: establish the data pipeline (Ahrefs MCP + GSC MCP) before proposing growth bets | Zero reachable metrics at meeting time | Owner |
| 2 | Hire Head of SEO & Content via /raiseagents (executed this meeting: `head-of-seo-content`, Marketing/) | Traffic north star runs through organic search/content; small content base (29 posts) | Owner |
| 3 | ALL content passes /humanizer before it ships — company-wide hard rule | Owner directive | Owner |
| 4 | Keyword research in Malay only (kahwin, perkahwinan, …); strategy = topical authority in Malaysian Malay wedding space; framework first, then bulk quality | Owner directive | Owner |
| 5 | Social deferred until content flows; revisit next meeting | No accounts exist; content engine not running yet | Owner |
| 6 | CEO maintains permanent product context in `docs/boardroom/ceo-memory.md` | Owner directive ("know your product before hiring") | Owner |

## Predictions
No metric predictions yet — none are honest without a baseline. Prediction for next meeting: with Ahrefs + GSC MCP access wired, the CEO presents a full organic baseline (current rankings/clicks, Malay keyword landscape, TWN gap analysis) and the Head of SEO & Content's topical-authority framework for approval.

## Actions
| Action | Owner (agent) | Due |
|---|---|---|
| Wire Ahrefs MCP + mcp-gsc MCP servers (owner assists) | Owner + ceo-hellokahwin | Before next meeting |
| Produce topical-authority content framework (Malay keyword map, pillars/clusters, article templates, quality bar) — draft pending data access | head-of-seo-content | Next meeting |
| Pull organic baseline + TWN gap analysis once MCP access exists | head-of-seo-content | Next meeting |
| Propose publish-pipeline options (site rebuild from export) as a product decision | ceo-hellokahwin | Next meeting |
| Keep ceo-memory.md current | ceo-hellokahwin | Standing |

## Addendum — planning continuation (same session)

After the data pipeline went live (both MCP servers verified), the owner
caught the CEO doing the SEO hire's keyword research personally. Two
governance rules resulted: the CEO does no specialist work a hire owns, and
every delegated task runs in a **visible terminal** the owner can watch
(`dispatch-agent.ps1`). CEO due diligence then corrected a material product
assumption: hellokahwin.com is **already rebuilt** on Next.js + Vercel from
repo `ianngkb/hellokahwin` (DB-driven content via Drizzle → Supabase) — the
local folder is the old Electron migration tool, and the live repo is not
cloned here. No rebuild is needed, only a content-ingest path.

The CEO then produced the first growth plan (`docs/plans/`, new per-session
structure). The board raised the target from 500 to **1,500 clicks/28d**,
which pushed the article goal to 80 and the writer hires to 2, and added a
hard gate: the team must **master topical authority** — researching it via
Ahrefs SERP data and live reading, reverse-engineering sites that own a
topic, and writing the distilled method permanently into its own persona —
before any audit work begins. Plan APPROVED at v3 and Phase 1 dispatched.

## Owner requests
1. Help wiring the two MCP servers (Ahrefs, mcp-gsc) — credentials/setup session.
2. Confirm where MCP credentials should live (the /tokens registry?).
