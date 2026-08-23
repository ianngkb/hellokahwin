# Company foundation & data pipeline — 23 Aug 2026
**Session:** aug-23-2026-session-01 · **Owner:** ceo-hellokahwin · **Status:** completed
**Plan:** founding /hellokahwin meeting — `docs/boardroom/meetings/2026-08-23-founding-check-in.md`

## What was done

The company was stood up and given the ability to measure itself.

- **Org chart split into shared and project-scoped agents.** Shared agents
  live in `skillcentral/agents/<Category>/` and load everywhere; project
  agents live in `skillcentral/agents/projects/<project>/` and load only in
  that repo, alongside the shared ones. `install.sh` was extended to wire
  both, skip docs files, and stop piling up backup copies on re-runs.
- **CEO hired** (`ceo-hellokahwin`, Executive) via /raiseagents, with the
  `/hellokahwin` board-meeting skill, a permanent company memory
  (`docs/boardroom/ceo-memory.md`), a decision log, meeting minutes, and a
  self-evolution rule that updates the persona and skill after every meeting.
- **Head of SEO & Content hired** (`head-of-seo-content`, Marketing) with
  /humanizer mandatory on all content and Malay-only keyword research.
- **Data pipeline built and verified live**: Search Console and Ahrefs, both
  as MCP servers, both returning real data.
- **First baseline ever pulled** for hellokahwin.com.
- **Governance corrections** after the owner caught the CEO doing the SEO
  hire's work: the CEO does no specialist work a hire owns, and all
  delegation runs in a visible, trackable terminal.
- **First growth plan produced and approved** (v3), and Phase 1 briefed.

## Evidence

| Item | Where |
|---|---|
| CEO persona | `skillcentral/agents/projects/hellokahwin/Executive/ceo-hellokahwin.md` |
| SEO persona | `skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md` |
| Meeting skill + dispatch script | `skillcentral/skills/hellokahwin/` |
| Meeting minutes | `docs/boardroom/meetings/2026-08-23-founding-check-in.md` |
| Decision log (11 decisions) | `docs/boardroom/decision-log.md` |
| Company memory | `docs/boardroom/ceo-memory.md` |
| Approved plan | `docs/plans/aug-23-2026-session-01/aug-23-2026-plan-malay-topical-authority.md` |
| Phase 1 brief | `docs/plans/aug-23-2026-session-01/aug-23-2026-brief-head-of-seo-content.md` |
| Secrets | Doppler project `hellokahwin` (dev+prd) + DPAPI vault; pointers in the /tokens registry |

**Verification performed (23 Aug 2026):**
- `gsc` MCP → `list_properties` returned `https://hellokahwin.com/`,
  permission `siteFullUser`.
- `ahrefs` MCP → subscription Standard, 400,000 units/month, ~0 used, key
  valid to 22 Aug 2027; a live Malay keyword query returned real volumes and
  consumed 160 units.
- Service account `hellokahwin-gsc@twn-new.iam.gserviceaccount.com` queried
  Search Console directly and returned the baseline below.
- hellokahwin.com response headers: `Server: Vercel`, `X-Powered-By:
  Next.js`, prerendered, cache HIT.

**Founding baseline (GSC, 28 days 25 Jul – 21 Aug 2026):**
32 clicks · 2,163 impressions · 1.48% CTR · average position 20.6.

## What it changed

- The company went from **no measurement at all** to a verified, live data
  stack — the dependency that gated every growth decision.
- The baseline exposed the core strategic problem: the site earns its
  impressions on **English** queries at position ~20, while Malay queries
  barely register, and Malay wedding keywords sit at **difficulty 0–2** with
  370–2,000 monthly searches. The audience searches in a language the site
  does not compete in. That finding is the basis of the approved plan.
- A material product assumption was corrected: hellokahwin.com is **already
  rebuilt** on Next.js + Vercel (repo `ianngkb/hellokahwin`, DB-driven
  content via Drizzle → Supabase). No rebuild is needed — only a
  content-ingest path — which removed a whole phase from the plan.

## Follow-ups

| Item | Owner |
|---|---|
| Phase 1: master topical authority, then baseline audit + content framework | `head-of-seo-content` |
| Clone `ianngkb/hellokahwin` before any site engineering | ceo-hellokahwin (Phase 3) |
| Two Malay writer hires (Phase 2), engineering decision (Phase 3) | ceo-hellokahwin — board approval when reached |
| Rotate the Ahrefs keys at some point — they passed through chat | owner |
| Social accounts — deferred, revisit next meeting | owner + ceo-hellokahwin |
