# CEO Memory — HelloKahwin company context

The CEO's living knowledge of the product and company. Read this at the start
of every meeting/session; update it whenever reality changes. Facts only —
opinions and plans belong in meeting minutes and the decision log.

_Last updated: 2026-08-23 (founding meeting)._

## The product

- **hellokahwin.com** — Malay-language wedding media site for the Malaysian
  Malay market ("Idea & Panduan Perkahwinan Malaysia"). The Malay counterpart
  concept to TheWeddingNotebook.com (TWN, English).
- **Site is LIVE** (verified 2026-08-23): Real Wedding + Idea dan nasihat
  sections, venue/deco/style categories, © 2026 footer.
- **WordPress is permanently removed** (owner statement, 2026-08-23 board
  meeting). The WP backend is not the publishing path anymore. A full export
  of the WordPress content was taken 2026-08-21 and lives in this repo at
  `data/hellokahwin-export/` — this export is the content source of truth.
- **The site is ALREADY REBUILT and live on Next.js + Vercel** (verified
  2026-08-23 from response headers: `Server: Vercel`, `X-Powered-By:
  Next.js`, prerendered, cache HIT). WordPress was replaced, not just removed.
- **The live site's code is the GitHub repo `ianngkb/hellokahwin`** — Next.js
  + Drizzle ORM + Clerk + Tailwind/shadcn, last push 2026-08-22. Content is
  DATABASE-DRIVEN (Drizzle → Supabase `nyidzlupgmyyazhyykuk`), not markdown.
  Supporting infra: Clerk production instance on hellokahwin.com, R2 media
  buckets in the TWN Cloudflare account, Vercel project `hellokahwin` (team
  `thewednotebook`).
- **⚠ The live-site repo is NOT cloned on this machine.** The local folder
  `~/Documents/Code/hellokahwin/hellokahwin` (where the boardroom lives) is
  the OLDER Electron migration tool — a different codebase. Clone
  `ianngkb/hellokahwin` before any site engineering work.
- **Publish pipeline therefore EXISTS.** The remaining gap is the path from an
  approved article to a row in the Supabase content tables — a small
  engineering task, not a platform project. Until that path is confirmed, new
  content is produced as publish-ready files, not published.

## Content inventory (export of 2026-08-21)

- 29 posts, 2 pages, 24 categories, 682 media library items (~6.7k files).
- Category spread: Idea dan nasihat (15), Real Wedding (14), Perancangan (9),
  Venue (5), Warisan Tradisi (5), Moden Kontemporari (4), Hiasan & Dekorasi
  (3), plus small style categories (Glamor Eksklusif, Tropikal, Rustik, …).
- Content style: listicles ("19 Tempat Honeymoon di Malaysia…", "14 Wedding
  Planner Terbaik…") and Real Wedding showcases (venue-anchored features).
- Takeaway: the content base is SMALL (29 posts). Topical authority in the
  Malay wedding space is the mandate and has a long runway.

## This repo (the tool, not the site)

- **TWN→HelloKahwin migration tool**: Electron + React frontend, Node/Express
  backend, SQLite. Discovers TWN WordPress content, machine-translates to
  Malay, review/edit side-by-side, publishing queue. See
  `TWN-HelloKahwin-Migration-Tool-PRD.md`.
- `scripts/export-hellokahwin.js` — the WP REST export that produced
  `data/hellokahwin-export/` (re-runnable; but WP is being retired).
- Dev ports pinned to this machine's band; `npm run dev:full` runs backend
  (3001) + Electron frontend.

## Data & measurement stack

- **Google Search Console** — LIVE ✔ (verified 2026-08-23). MCP server `gsc`
  (`uvx mcp-search-console`), service account
  `hellokahwin-gsc@twn-new.iam.gserviceaccount.com` with siteFullUser on
  `https://hellokahwin.com/`; JSON at
  `~/.claude/secrets/gsc-service-account.json`, backup in Doppler. No GA4.
- **Ahrefs** — LIVE ✔ (verified 2026-08-23). MCP server `ahrefs`
  (https://api.ahrefs.com/mcp/mcp) with MCP-key auth; keys in the vault
  (`ahrefs.hellokahwin`, `ahrefs-mcp.hellokahwin`) and Doppler project
  `hellokahwin`. Keyword research must be done in MALAY (seed terms: kahwin,
  perkahwinan, majlis kahwin, hantaran, pelamin, …) — never English results
  translated after the fact.
- **FOUNDING BASELINE (GSC, 28d 2026-07-25 → 2026-08-21):** 32 clicks,
  2,163 impressions, CTR 1.48%, avg position 20.6. Impressions are largely
  ENGLISH queries ("garden wedding malaysia", "beautiful wedding venues")
  ranking poorly — Malay-keyword coverage is nearly absent (e.g. "berapa mas
  kahwin" imp=1). Confirms the Malay-first topical-authority strategy: the
  site currently isn't competing where its audience searches.
- **Secrets map**: Doppler project `hellokahwin` (default workplace, dev+prd:
  AHREFS_API_KEY, AHREFS_MCP_KEY, GSC_SERVICE_ACCOUNT_JSON) + the DPAPI
  vault; full pointers in the /tokens registry.
- **In-house analytics dashboard** — standing mandate to build, once data
  flows exist.
- **Social** — no accounts yet. Deferred by owner until content is being
  generated; revisit at the next meeting.

## Media & R2 (verified 2026-08-23)

- **Bucket `hellokahwin-images` already exists** in the TWN Cloudflare account
  and we have confirmed READ + WRITE (probed with put/delete). No new bucket
  needed — the owner's ask to create one is already satisfied.
- A **derivative pipeline already runs**: each original yields `high.webp`,
  `low.webp` and named crops (`crop-16x9-og`, `crop-4.3x1-desktop-hero`,
  `crop-4x3-article-card`, `crop-4x5-mobile-cover`). Content sits under an
  `inspire/` prefix. Do not rebuild this; extend it.
- **`images.hellokahwin.com` is bound to `hellokahwin-images`** and already
  serves it publicly with immutable year-long caching (verified 2026-08-23).
  The public delivery path is DONE.
- A second bucket **`hellokahwin-assets` exists but is empty** — available for
  non-image assets.
- ✅ **Master R2 credentials rolled by the owner 2026-08-23 and fully
  verified**: list buckets, object read/write, and bucket create/delete all
  work. Vault keys `cloudflare.twn` (account API token),
  `r2.twn-master-keyid`, `r2.twn-master-secret`. R2 is entirely unblocked —
  no further credential is needed.
- **Rights position (owner decision 2026-08-23):** no Visual & Rights
  Coordinator hire — we are a small startup. We approach image owners for
  permission directly. **ALWAYS credit the original image source** so it can
  be traced back; this is now a hard rule in every editorial persona.

## Owner directives (standing)

- North star: organic traffic & audience growth; monetization later.
- Strategy focus: build TOPICAL AUTHORITY in the Malaysian Malay wedding
  space — ideas/advice for getting married in Malaysia, targeting the Malay
  audience. Develop a strong content-production framework FIRST, then
  produce quality in bulk.
- Content mix: data decides per topic (Ahrefs Malay data) — translate-and-
  localize TWN content where it ranks, original Malay content where the gap
  demands.
- ALL produced content passes through the /humanizer skill before it is
  considered done — no AI-sounding copy ever ships.
- All plans need board approval at /hellokahwin meetings until autonomy is
  granted. /autopilot is granted for approved development work.

## Team roster

- `ceo-hellokahwin` (Executive) — the CEO. Founding hire, 2026-08-23.
- `head-of-seo-content` (Marketing) — approved 2026-08-23; owns keyword
  strategy, Malay content calendar, competitor gap vs TWN, translation lever.
- Pre-existing project agents in the repo (from earlier work, available to
  use): prd-task-decomposer, product-requirements-generator, ux-design-expert.
