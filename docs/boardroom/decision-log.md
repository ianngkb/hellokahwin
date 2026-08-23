# HelloKahwin — decision log

One entry per decision: date, decision, basis, prediction. Reviewed at later
meetings against what actually happened. Newest first.

## 2026-08-23 — Production deploy approved
15. **Pillar pages + content-ingest path + single-hop redirect fix APPROVED for production deploy.** Basis: built and verified locally by `full-stack-engineer` on branch `ianng89/pillars-ingest-redirects` (9 commits, never pushed, no preview or production deploy). Unblocks eight finished C2.4 articles currently held at stage 7 as orphans-in-waiting.
16. **AI authorship tag added to the same release** (owner directive: "tag it as AI in the articles section so we can manually review it later"). Article record gains `authorship` (ai / ai_assisted / human, not nullable, default ai for pipeline output) and `review_status` (pending_review / reviewed / needs_changes) plus reviewed_at/by. Surfaced in the articles admin view with an AI badge, filters, one-click mark-reviewed, and pending-first sort. **Internal review tracking only — not a public disclosure banner**, though the field is built so it could be surfaced publicly if the board later decides. Legacy 29 migrated posts tagged `human` unless evidence says otherwise.
17. **The eight C2.4 articles do NOT publish in this release.** They stay held until the pillar pages are live and verified; publishing them is a separate CEO decision.
18. **Review board validated on first use.** 27 blocks across 8 articles, every one raised by the verification seat, none traded against the run — including a fabricated quotation (newspaper lede + indirect speech stitched with an ellipsis, printed as a direct quote), a false premise the writer built a thesis on, an error originating in the CEO's own brief, and a non-existent RM45 fee that came out of our own "verified" table. Basis: `docs/work-done/aug-23-2026-session-01/aug-23-2026-done-cluster-01-production.md`.
19. **Cluster C2.4's competitive weapon, from primary sources:** six of fourteen Malaysian jurisdictions fix no minimum mas kahwin at all, and three figures dominating Google's page one (Perak RM101, Penang RM24, Kedah RM22.50) have no official backing anywhere. Reshaped five of eight briefs.

## 2026-08-23 — Cluster plan approved
12. **Cluster Launch Plan APPROVED by the board.** 26 clusters, 204 mapped topics, ~143,700 Malay searches/mo. Basis: Ahrefs `my` data pulled 23 Aug 2026 (14,892 units); rejections justified on seasonality, intent, SERP shape and topical radius. Supersedes the framework's topical map. Prediction: first movement in weeks on Tier 1 clusters (mas kahwin ikut negeri — already position 12.9 — hantaran kahwin, gubahan dulang hantaran); 60/90-day checkpoints are the scoreboard, 30-day is directional only because of the 21 Aug URL migration.
13. **ppsignature.com identified as the real competitor** — DR 4, 2,263 MY keywords, 1,493 top-three, ~29,745 visits/mo, from a blog attached to a dress shop; more than nikahsatu and TWN combined. Was absent from the Phase 1 competitor set. Basis: Ahrefs Site Explorer, index 2026-08-01. Consequence: the market is unclaimed rather than hard, and this site belongs in every future report.
14. **Two gaps opened by the board on approval**, dispatched to `head-of-seo-content`: (a) the production doctrine — how the writing system overtakes incumbents over time, compounding, counter-attack case, and a stop rule; (b) **visual assets — a genuine hole**: nothing in the framework or plan says where a single photograph comes from, against 204 topics requiring 1,000+ images. Includes a rights audit of the 682 inherited media items (ownership unverified) and a hire recommendation if warranted.

## 2026-08-23 — Founding check-in (planning continuation)
7. **Malay Topical Authority plan APPROVED (v3).** Target raised by the board: 32 → **1,500 clicks/28d by 21 Nov 2026**, **80 articles**, **2 writer hires** in Phase 2. Basis: GSC baseline (32 clicks, 2,163 imp, pos 20.6) + Ahrefs MY difficulty 0–2 on 370–2,000-volume Malay keywords. Prediction: 150 clicks @30d, 500 @60d, 1,500 @90d; article count is the leading indicator.
8. **Topical authority mastery gate added.** Board directive: the team masters the discipline (Ahrefs SERP research + reverse-engineering sites that own a topic) and writes the method permanently into its own persona BEFORE any audit work. Basis: we are betting company growth on this discipline.
9. **CEO does not do specialist work; all delegation runs in a VISIBLE terminal.** Basis: owner caught the CEO doing the SEO hire's keyword research. Persona and /hellokahwin skill updated; `dispatch-agent.ps1` added.
10. **Product correction — the site is already rebuilt.** hellokahwin.com runs Next.js on Vercel from repo `ianngkb/hellokahwin` (Drizzle → Supabase, DB-driven content); the local folder is the old Electron migration tool and the live repo is NOT cloned here. Consequence: no rebuild is needed, only a content-ingest path. Basis: response headers + GitHub inspection, 23 Aug 2026.
11. **Phase 1 dispatched** to `head-of-seo-content` in a visible terminal.

## 2026-08-23 — Founding check-in
1. **Data pipeline first** — no growth bets before a baseline. Basis: zero reachable metrics. Prediction: full organic baseline at next meeting via Ahrefs MCP + GSC MCP.
2. **Hired Head of SEO & Content** (`head-of-seo-content`). Basis: traffic north star; 29-post content base needs a topical-authority engine. Prediction: approved content framework + data-backed calendar by next meeting.
3. **/humanizer on all content** — company-wide rule. Basis: owner directive; no AI-sounding copy ships.
4. **Malay-first keyword research; topical authority; framework → bulk quality.** Basis: owner directive; Malay search demand is its own landscape.
5. **Social deferred** until content flows; revisit next meeting. Basis: no accounts; nothing to feed them yet.
6. **ceo-memory.md established** as the CEO's permanent product context. Basis: owner directive — know the product inside out.
