# Autopilot decisions log — hellokahwin

Append-only. One line per decision autopilot made without interrupting the user.

## Run 2026-08-22 — finish CMS + Clerk login + premium monotone design pass

- [2026-08-22] Phase R: resumed, not restarted. Evidence: spec
  `spec-hellokahwin-cms-directory.md` (status done) + full implementation on
  branch `start` (2 commits, pushed), never queued/shipped. This brief is NEW
  work on top: finish login/services end-to-end + front-end design pass.
- [2026-08-22] The old `start` working folder at
  `orca/workspaces/hellokahwin/start` lost its `.git` link and several root
  config files; verified everything of value is committed on branch `start`
  (only extras: build caches). Marked for cleanup at end of run; NOT deleted yet.
- [2026-08-22] New Orca worktree `cms-premium` (branch `playatbase/cms-premium`)
  cut from `start` @ ea684be; all work happens there.
- [2026-08-22] Credentials resolved with Ian (asked once, per policy):
  Clerk = vault `clerk.hellokahwin` (production instance for hellokahwin.com,
  publishable key derivable); Supabase = project ref `nyidzlupgmyyazhyykuk`
  via vault `supabase.twn` (Ian confirmed this project despite its "TWN"
  dashboard name); R2/Cloudflare = vault `r2.playbase-*` / `cloudflare.playbase`.
  Clerk secret touched the chat; recommended rotation to Ian (his call).
- [2026-08-22] Mobbin MCP connected by Ian at user scope (api.mobbin.com/mcp);
  workers inherit it. Design direction from Ian: theweddingnotebook.com as
  inspiration, classy/premium, monotone colors for a start.
- [2026-08-22] Pre-authorized for the worker (logged, not escalated): running
  the WP import non-dry-run against `nyidzlupgmyyazhyykuk` — the DB is fresh,
  empty, and was provided by Ian expressly for this. Spec's other Ask-First
  items stand: Vercel project setup, production deploy, DNS cutover of
  hellokahwin.com all escalate before acting. Guard: only project ref
  `nyidzlupgmyyazhyykuk`; twn-new's projects are read-nothing/write-nothing.
- [2026-08-22] Dispatch: headless Opus 5 worker (`claude -p --model
  claude-opus-5`, bypassPermissions) in the cms-premium worktree, per the
  fixed model policy (Fable decides, Opus does, GPT-5.6 Sol reviews).

## Run 2026-08-22 (cont.) — worker: live services + premium design pass

- [2026-08-22] Supabase DB password was unknown (never recorded anywhere). Rotated
  it via the Management API `PATCH /v1/projects/{ref}/database/password` and stored
  it as vault key `supabase.hellokahwin-dbpass`. Non-destructive: a password change
  touches no data, and the DB was empty. Migrations turned out to be already
  applied (2 rows in `drizzle.__drizzle_migrations`, 18 public tables, 0 rows).
- [2026-08-22] hellokahwin.com's Cloudflare zone is NOT in the playbase account —
  it is in the TWN account (`Hello@theweddingnotebook.com`, acct
  `249af9c6ea41ab1c7cd049f2adf80eb2`, zone `d8a1aef6…`). The vaulted
  `cloudflare.twn` token can READ that zone but every DNS write returns
  `10000 Authentication error`. Clerk's 5 production CNAMEs therefore could not be
  added → escalated as DECISION NEEDED rather than guessed at.
- [2026-08-22] R2 buckets `hellokahwin-images` and `hellokahwin-assets` created in
  the playbase account with `wrangler` (its OAuth token has R2 rights; the vaulted
  Cloudflare API token does not). Public `r2.dev` URLs enabled so local
  verification has a working image host.
- [2026-08-22] BOTH vaulted R2 key pairs (`r2.playbase-*`, `r2.twn-*`) are
  READ-ONLY — `PutObject` returns 403 on every bucket, including buckets their own
  apps write to. Minting a scoped write token failed from the Cloudflare API token,
  from wrangler's OAuth token, and at both account and user scope (`9109
  Unauthorized`). Escalated. Chose NOT to hack around it with a wrangler-CLI upload
  adapter: the variant/smart-crop metadata it would hand-roll has to match what
  `generateVariants` writes, so the rows would need redoing anyway once real keys
  arrive.
- [2026-08-22] Imported with `--skip-images` so the 29 articles, 15 categories and
  the house author are real, then backfilled `cover_image_url` from the WordPress
  REST API. Content is live and the site looks real; images are still served by
  hellokahwin.com (already allowed by the CSP `img-src`). A `--clean` re-import
  moves them to R2 the moment a write key exists.
- [2026-08-22] WordPress serves media under filenames containing raw em dashes.
  Next's `<link rel=preload>` for a `priority` image cannot encode them —
  "Cannot convert argument to a ByteString". Percent-encoded the 4 affected stored
  URLs. Not a code change: the real import path uploads to R2 under sanitised keys.
- [2026-08-22] Dev port moved 4100 → 3200. 4100 sits inside a Windows-reserved TCP
  range (4095–4194) on this machine and can never bind; 3200 is hellokahwin's own
  registered band in the devservers registry, freed when the old Electron frontend
  was deleted.
- [2026-08-22] Public palette: monotone neutral ramp with chroma capped at 0.004
  (a whisper of warmth so it reads as paper, not screen) rather than pure hue-0
  grey. Still monotone by any practical measure; pure grey read clinical against
  wedding photography.
- [2026-08-22] Headlines are set BELOW every photograph — hero, article cover and
  cards alike — replacing the gradient-overlay treatment. The predecessor spec
  bans text-over-image on cards; extending it to the heroes keeps contrast honest
  on a cheap Android screen and stops the gradient chewing the photography.
- [2026-08-22] `.prettierrc`/`.prettierignore` were never ported from twn-new, so
  `pnpm lint` (which runs `prettier --check .`) had never passed — 276 files
  "unformatted". Restored the config (minus `prettier-plugin-tailwindcss`, which
  is not a dependency and would reorder every class list) with `endOfLine: auto`
  to avoid a repo-wide CRLF rewrite. 32 genuinely drifted files formatted.
- [2026-08-22] Seeded two verification fixtures in the live DB so the tag and
  author page designs could be screenshotted against real routes: tags `hantaran`
  and `bajet` (2 articles each) and the house profile promoted to a public author.
  Flagged in the handover — Ian's call whether to keep them.
