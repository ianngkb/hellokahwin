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
- [2026-08-22] Code review: 2 rounds via the codex-reviewer agent (GPT-5.6 Sol,
  high reasoning), inside the 3-cycle budget. Round 1: 1 critical + 1 major +
  3 minor, all patched. Round 2 on the fix commit: NO_FINDINGS.
- [2026-08-22] Updated the devservers registry (hellokahwin band 3200–3201 now
  "web (Next.js) 3200"), recording that 4095–4194 is Windows-reserved on this
  machine. Synced to the canonical copy at
  `buddy/skillcentral/skills/devservers/SKILL.md` but left UNCOMMITTED there —
  buddy is not this run's repo.
- [2026-08-22] `package-lock.json` sits untracked in the worktree and predates
  this run (the repo uses pnpm). Left alone, not committed — not this run's file.

## Run 2026-08-22 (cont.) — orchestrator: Vercel setup (Ian's green light)
- [2026-08-22] Ian approved hosting setup mid-run: new Vercel project `hellokahwin`
  created in the SAME team as The Wedding Notebook (`thewednotebook`), per his
  explicit choice. Linked from the cms-premium worktree (.vercel/, gitignored).
- [2026-08-22] All 15 env vars from the worker's verified `.env.local` set on
  Production via stdin piping (values never printed/committed); first pass had
  trailing-newline contamination from PowerShell piping — wiped and re-set clean.
  R2 keys currently stored are the READ-ONLY pair; must be replaced when write
  keys exist (open escalation).
- [2026-08-22] Preview environment deliberately NOT populated: the Vercel CLI
  only accepts preview values via `--value` on the command line (secrets in argv
  — vault iron rule forbids), and the ship flow deploys Production only.
- [2026-08-22] GitHub repo NOT yet connected to the Vercel project — deferred to
  ship time so mid-run pushes don't trigger failing preview builds.
- [2026-08-22] Ian granted a TWN-account Cloudflare API token (vault
  `cloudflare.hellokahwin`; R2 edit + DNS edit scoped to hellokahwin.com; Ian
  will rotate it post-run). Working TWN R2 object-write keys found in twn-new's
  production env, vaulted as `r2.twn-rw-*`. Worker resumed with all three
  escalations answered: DNS approved (self-serve), buckets to TWN + delete
  playbase pair, fixtures removed.

## Run 2026-08-22 (cont.) — worker: rulings applied

- [2026-08-22] Ruling 3 (fixtures) DONE: deleted the seeded `hantaran`/`bajet`
  tags and their article links, and reverted the house profile to
  non-public (`author_slug` null, `is_public_author` false, title/bio cleared).
  Live DB now holds only real imported content: 29 published articles,
  15 categories, 0 tags, 0 public authors.
- [2026-08-22] Rulings 1 and 2 are BLOCKED on the same cause and could not be
  executed: the new token in vault `cloudflare.hellokahwin` is READ-ONLY.
  Evidence, not inference — introspected it via
  `GET /accounts/249af9c6…/tokens/81c43eae2e12c78bb3e9a1f6c036bbb2` (the token
  carries "Account API Tokens Read", so it can describe itself): it is named
  "master-token", is active, last modified 2026-08-22T09:14:10Z, and every one
  of its ~190 permission groups across both policies ends in "Read". There is
  no Edit/Write group anywhere on it. Consistent with the observed behaviour:
  zone GET and R2 bucket LIST both succeed; `POST dns_records` and
  `POST r2/buckets` both return `10000 Authentication error`. Ian's own
  verification ("sees the zone, lists the buckets") only exercised reads.
  Also confirmed distinct from `cloudflare.twn` (different SHA-256 prefix), so
  this is a genuinely new token that was minted/edited with read groups only.
- [2026-08-22] Did NOT delete the playbase R2 buckets despite the ruling. The
  instruction was conditional on TWN replacements existing; they do not, so
  deleting now would leave the app with no image bucket at all. Deferred until
  the TWN buckets are created and the import has written to them.
- [2026-08-22] Also confirmed the two fallback paths are dead ends, so this is
  a real block and not a missing idea: wrangler's OAuth is scoped to the
  playbase account and cannot act on the TWN account, and the
  `r2.twn-rw-*` S3 keys are object-scoped (CreateBucket → AccessDenied), which
  matches Ian's own note about them.
- [2026-08-22] Verified the Vercel Production env against `.env.local` by
  SHA-256 fingerprint per key (pull to a gitignored temp file, compare, delete;
  no value ever printed). All 15 of our variables match byte-for-byte — the
  earlier trailing-newline contamination is gone. The 9 non-matching keys are
  Vercel's own injected variables (VERCEL*, TURBO_*, NX_DAEMON, OIDC token),
  which have no counterpart in `.env.local`. No refresh was needed because the
  R2 move is blocked, so no value changed.
- [2026-08-22] No codex review this cycle: the run produced zero source changes
  (fixture deletion is data, the rest is docs). Nothing new to review.
- [2026-08-22] Ruling 1 (Clerk DNS) DONE: `DNS Write` appeared on token
  81c43eae, and all 5 Clerk CNAMEs were created on hellokahwin.com as
  DNS-only (proxied=false, TTL auto), each tagged with a comment identifying
  it as Clerk production. Additive only — the WordPress A records on
  35.213.180.130 were not touched, so the live site is unaffected.
- [2026-08-22] Re-checked the token before starting the R2 half, per orders:
  its non-Read groups are now DNS Write, Zone Write, Zone Settings Write, Zone
  Versioning Write, Zone DNS Settings Write, Zone Custom Asset Write and
  Workers R2 Data Catalog Write. `Workers R2 Storage Write`
  (bf7481a1826f439697cb59a20b22293e) is still absent — note that "R2 Data
  Catalog Write" is the R2 SQL/Iceberg catalog permission, NOT bucket
  management, so it does not substitute.
- [2026-08-22] `Workers R2 Storage Write` appeared on token 81c43eae at 09:45.
  Ruling 2 executed: buckets `hellokahwin-images` and `hellokahwin-assets`
  created in the TWN account (location hint apac), custom domains
  `images.hellokahwin.com` / `assets.hellokahwin.com` attached via the R2
  custom-domain API (which wrote their DNS records itself, using the same
  token's DNS Write). Object read/write with `r2.twn-rw-*` verified against
  both new buckets before committing to the import.
- [2026-08-22] `.env.local` rewritten for the TWN account. Supabase, Clerk and
  cron values were carried over from the previous file verbatim rather than
  re-derived, so the already-verified bytes are untouched and only the six R2
  values changed.
- [2026-08-22] Vercel Production refreshed via the **REST API**, not the CLI.
  The CLI path (`env rm` + `env add` piping the value on stdin) failed with
  exit 1 on all six from a spawned process; checked immediately and confirmed
  the removes had NOT gone through either, so Production was never left
  incomplete. `PATCH /v9/projects/{id}/env/{envId}` carries the value in a JSON
  body — no argv exposure, and no window where the variable is missing.
  Re-verified afterwards: all 15 variables match `.env.local` byte-for-byte.
- [2026-08-22] Ran the import WITHOUT `--skip-smart-crops` (an earlier attempt
  with the flag was killed after 30s). The Editorial Monotone layout reads
  `crop-4x5-mobile-cover`, `crop-4x3-article-card` and `crop-4.3x1-desktop-hero`
  directly; skipping crop generation would have silently degraded every hero
  and card to an un-cropped variant.
- [2026-08-22] Clerk production activation: DNS is correct but the Frontend API
  is NOT live yet, and the cause is now identified rather than assumed. The
  error page served at `https://clerk.hellokahwin.com` is titled
  **"DNS points to prohibited IP | clerk.hellokahwin.com | Cloudflare"** —
  Cloudflare Error 1000 — and the TLS certificate presented is our own zone's
  Universal SSL (`CN=hellokahwin.com`, SAN `*.hellokahwin.com`), not a
  Clerk-issued one. For comparison, TWN's working instance presents
  `CN=clerk.theweddingnotebook.com`. So: our grey-cloud CNAME resolves to
  Cloudflare anycast IPs, Cloudflare matches the SNI to OUR zone (which has no
  edge origin for it) and returns 1000. This clears the moment Clerk registers
  `clerk.hellokahwin.com` as a Cloudflare-for-SaaS custom hostname, at which
  point the SaaS zone wins the SNI.
- [2026-08-22] That registration is not reachable from Clerk's Backend API:
  `PATCH /v1/domains/{id}` succeeds but changes nothing observable, and
  `POST /v1/domains/{id}/verify|deploy|ssl`, `/v1/instance/deploy` and
  `/v1/instance/verify_domain` all 404. `GET /v1/instance` exposes no status
  field. So there is no API lever left — it is either Clerk's background job or
  a dashboard action.
- [2026-08-22] Deliberately did NOT "fix" Clerk's Error 1000 by turning the
  proxy on. Tempting, because the R2 custom domains Cloudflare created for us
  in the same zone ARE proxied (`images/assets.hellokahwin.com -> public.r2.dev`,
  orange cloud) and they work. But that is Cloudflare proxying to Cloudflare's
  own R2, a different mechanism. The evidence says our Clerk config is already
  correct: TWN's working `clerk.theweddingnotebook.com` presents a dedicated
  single-hostname certificate (`CN=clerk.theweddingnotebook.com`), which is the
  signature of a grey-cloud record fronted by an ACTIVE Cloudflare-for-SaaS
  custom hostname — exactly our setup minus the activation. Proxying Clerk's
  FAPI would make Cloudflare terminate TLS with our wildcard cert and is not a
  configuration Clerk supports. So: leave it grey-cloud and wait for Clerk.
- [2026-08-22] Caught mid-import: smart crops were failing on EVERY image with
  "AWS_REKOGNITION_REGION env var is not set". Two bugs behind it. (a) The
  committed `.env.example` documents `AWS_REGION` / `AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY`, but the code reads `AWS_REKOGNITION_*` — those
  conventional names are never read by anything in this repo, so my `.env.local`
  (copied from the template) configured nothing. (b) `getRekognitionClient()`
  THROWS when they are absent, so the "pure-Sharp fallback used when absent"
  the template promises never runs. The supported AWS-free path is the
  documented switch `REKOGNITION_ENABLED=false`, which short-circuits detection
  and lets crops fall back to the Sharp saliency focal point.
  Fixed `.env.example` (committed) and `.env.local`, dropped the dead
  `AWS_REGION` from Vercel Production and added `REKOGNITION_ENABLED=false`.
- [2026-08-22] Killed the in-flight import at 12/29 and restarted it `--clean`
  rather than finishing and patching afterwards. The Editorial Monotone layout
  reads `crop-4x5-mobile-cover`, `crop-4x3-article-card` and
  `crop-4.3x1-desktop-hero` directly; 29 articles of un-cropped covers would
  have shipped a visibly worse site and needed the same re-run later anyway.
  Confirmed on the restart: "✓ Smart crops generated (method: saliency)".
- [2026-08-22] Playbase R2 buckets deleted, on positive evidence: the only
  object in either was my own `_probe.txt` write test (fetched and read back to
  confirm before deleting); `hellokahwin-assets` was empty; `.env.local` and
  Vercel Production both point at the TWN account; and a repo-wide grep for the
  playbase account id and the two `pub-*.r2.dev` hostnames found hits only in
  stale `.next` build output, never in source. Both buckets are gone from the
  playbase account.
- [2026-08-22] Two real defects surfaced when verifying the finished import, and
  both are now fixed rather than worked around:
  1. **Duplicate articles.** The DB held 38 published rows, not 29 — nine
     `-wp`-suffixed duplicates left by the run I killed mid-flight. Cause is in
     `scripts/wp-import.ts`: the `--clean` dedup check is
     `select ... where wpId = X limit(1)` and then deletes that ONE row, so a
     second row for the same `wp_id` survives forever and the fresh import
     parks under the slug-conflict ladder's `-wp` name. Deleted the nine stale
     rows by explicit id (each identified positively: `-wp` slug AND
     `cover_image_smart_crops is null`, i.e. from the crop-less killed run).
     Left their R2 objects alone — both rows in a pair share one
     `inspire/<slug>/` prefix with different timestamped keys, so a
     prefix-delete would have destroyed the LIVE article's images.
  2. **Every derivative image 404'd.** `--clean` deletes the old article prefix
     after a successful re-import, skipping keys in `uploadedKeysThisRun`. But
     that set is populated only by the script's own `uploadToR2`; variants and
     smart crops are written by `generateVariants` / `processSmartCrops` in
     `src/lib/storage/**`, which own their own R2 client. So with an unchanged
     slug the cleanup deleted exactly the derivatives it had just generated:
     originals returned 200, every `.../high.webp` and
     `.../crop-4x3-article-card.webp` returned 404, and the DB still held their
     URLs — so the import summary read "29 variants, 29 smart crops, errors:
     none" while the whole site rendered broken images. Fixed with
     `registerDerivedKeys()`, called after each variant/crop generation, and
     re-ran the import.
- [2026-08-22] Clerk, final read after ~50 minutes of polling across the run:
  NOT time-based. `https://clerk.hellokahwin.com` still returns Cloudflare
  Error 1000 ("DNS points to prohibited IP") behind OUR zone's wildcard
  certificate (`CN=hellokahwin.com`). Slow certificate provisioning would show
  a TLS failure or a Clerk-issued cert, not our own zone answering. The state
  is stable: Clerk has not registered `clerk.hellokahwin.com` as a
  Cloudflare-for-SaaS custom hostname, so Cloudflare keeps matching the SNI to
  our zone, which has no edge origin for a DNS-only record. Our five records
  are correct and unchanged. No API lever remains (see the earlier entry), so
  this needs a Clerk dashboard action or Clerk support — escalated, not waited
  on further.
- [2026-08-22] The first attempt at the keep-set fix did not work, caught by
  checking R2 one article into the re-run instead of waiting 30 minutes for the
  summary. Cause: it called `extractKeyFromUrl` from `src/lib/r2/client`, whose
  host list is a MODULE-LEVEL constant. ES module imports are evaluated before
  the importing module's body, and this script reads its .env file in its body
  — so from the script that helper captures `R2_PUBLIC_URL` as undefined,
  matches no host, and returns the entire URL. The keep-set filled with URLs
  that can never equal an R2 key, so the cleanup deleted the derivatives again.
  Replaced with a local `r2KeyFromUrl()` closing over the script's own
  `R2_PUBLIC_URL` constant (line 109, evaluated after env loading).
  Proved with a `--limit 1 --clean` smoke test before committing to the full
  run: the article's prefix went from 11 objects (originals only) to 25 —
  originals + high/low variants + all four smart crops
  (4x5-mobile-cover, 4x3-article-card, 4.3x1-desktop-hero, 16x9-og).
- [2026-08-22] Lesson recorded for the ship report: this class of bug is
  invisible in the import summary, which cheerfully reported "Variants
  generated: 29, Smart crops generated: 29, Errors: none" while every
  derivative had been deleted moments after creation. Verifying the artefact
  (objects actually in the bucket, URLs actually 200) rather than the log is
  what caught it.
- [2026-08-22] Did NOT declare ready-to-ship on `.tmp-ops/import.log`. That run
  finished cleanly (`exit=0`, "623 images, 29 variants, 29 smart crops, Errors:
  none") but it is the run whose derivatives the `--clean` keep-set bug deleted
  moments after generating them — originals 200, every `.../high.webp` and
  `.../crop-*.webp` 404, DB still holding their URLs. Its summary is precisely
  the misleading output that made the bug invisible. Shipping on it would have
  put a site full of broken images live. The authoritative run is `import3.log`,
  started after the verified fix.
- [2026-08-22] The shell wrapping import3 was orphaned when the previous Claude
  process exited, so its `IMPORT3 exit=` marker will never be written even
  though the node processes survived and kept importing. Switched the
  completion watcher from grepping that marker to polling for the absence of a
  `wp-import` node process — otherwise the wait would never have terminated.
- [2026-08-22] FINAL VERIFICATION of the authoritative import (`import3`,
  finished 11:16:45, 29/29, 623 images, errors none). Checked the artefacts,
  not the summary — the whole point of the earlier bug:
  · R2 bucket audit: 1985 objects = 623 originals + 1246 variants (low+high per
    image) + 116 smart crops (4 per cover). Exactly the expected arithmetic.
  · DB: 29 articles, 29 published, 0 duplicates, 0 `-wp` slugs, 29 with smart
    crops, 29 covers on images.hellokahwin.com, 0 tags, 0 public authors.
  · Rendered HTML: home 75, hub 63, article 110 asset references, every one on
    images.hellokahwin.com; zero wp-content references remain. Six sampled
    URLs (4 smart crops + 2 inline variants) all return 200 — the exact class
    of URL that returned 404 before the keep-set fix.
  · The two `theweddingnotebook.com` hits on the article page are outbound
    editorial links inside the imported WordPress copy, not assets.
