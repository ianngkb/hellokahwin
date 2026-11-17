# HelloKahwin on Cloudflare

**Plain version:** hellokahwin.com, admin included, is built to run as a
Cloudflare Worker in the TWN account. Until the domain switch (below) it is
still served by Vercel, which stays deployed afterwards as the fallback. A
second, read-only copy runs at a `workers.dev` test address and can never
change the live site's data.

|                   | Worker                | Address                                                                   | Data                                          |
| ----------------- | --------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| Production        | `hellokahwin`         | hellokahwin.com once switched; until then `hellokahwin.<sub>.workers.dev` | read/write (Hyperdrive `hellokahwin-db-prod`) |
| Read-only preview | `hellokahwin-preview` | `hellokahwin-preview.<sub>.workers.dev`                                   | read-only (Hyperdrive `hellokahwin-db`)       |

Account: TWN (`249af9c6ea41ab1c7cd049f2adf80eb2`). Config: `wrangler.jsonc`
(top level = preview, `env.production` = production), `open-next.config.ts`,
`cf-worker.ts`. The plan behind the production move:
`docs/specs/cloudflare-full-plan.md`.

The pilot Worker was called `hellokahwin` and was the preview. Since the
production move that name is the real site, and the preview is
`hellokahwin-preview` (deploy it once with `cf-docker.sh deploy` to recreate it).

The kit is copied from thepadelbase and thepicklebase (`apps/shop`). Versions
are pinned: `@opennextjs/cloudflare` 1.20.17, `wrangler` 4.162.0.

**Version gap.** The adapter declares `next >=15.5.29 <16 || >=16.4.5`; this
repo is on Next 16.1.6, inside the gap (pnpm prints an unmet-peer warning).
The padel pilot ran 16.2.10 in the same gap end to end. If a future adapter
release breaks on 16.1.x, move Next to `>=16.4.5` rather than patching the
adapter.

---

## What replaces what

| What the app needs                        | On Vercel                          | On Cloudflare                                        | Binding                    |
| ----------------------------------------- | ---------------------------------- | ---------------------------------------------------- | -------------------------- |
| Rendered pages (ISR, `unstable_cache`)    | built in                           | R2 bucket `twn-next-cache`                           | `NEXT_INC_CACHE_R2_BUCKET` |
| `revalidateTag()`                         | built in                           | D1 database `twn-next-tags`                          | `NEXT_TAG_CACHE_D1`        |
| One regeneration per stale page           | built in                           | Durable Object `DOQueueHandler`                      | `NEXT_CACHE_DO_QUEUE`      |
| Postgres connection pool                  | the module-level `postgres()` pool | Hyperdrive, pooled next to Supabase (ap-southeast-1) | `HYPERDRIVE`               |
| Image resizing at upload                  | sharp                              | Cloudflare Images                                    | `IMAGES`                   |
| Smart crops, manual crop, PDF compression | sharp, Ghostscript WASM            | media-tools (`media-tools-twn`), production only     | `MEDIA`                    |
| Static files                              | built in                           | Workers static assets                                | `ASSETS`                   |
| Edge cache purge after an ingest          | `dangerously-delete-by-tags`       | not needed (see below)                               | —                          |
| Nightly GSC sync (`/api/cron/gsc-sync`)   | Vercel Cron, `vercel.json`         | Cron Trigger `30 19 * * *`, production only, gated   | —                          |

The R2 bucket and D1 database are the **TWN account's shared foundations**:
The Wedding Notebook will use the same two. OpenNext namespaces entries per
Worker, so apps do not collide.

### The database

Every render reads Supabase in Singapore. On Vercel the app keeps a
module-level pool (`src/lib/db/drizzle.ts`). A Worker cannot reuse a socket
across requests, so on Cloudflare `db` resolves to a small per-request client
pointed at Hyperdrive, which keeps the real pool warm next to the database.

| Hyperdrive            | Id                                 | Origin                                                                                           | Used by    |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| `hellokahwin-db`      | `a7579bc5a9b64c4e8ab49dab9dc070c8` | the **read-only** role Vercel's preview deployments use (vault `supabase.hellokahwin-previewro`) | preview    |
| `hellokahwin-db-prod` | `8844e0ca9287432c8c86a8c3407a52a3` | the **existing production `DATABASE_URL`** (Vercel, target Production): same user and password   | production |

Both connect to the Supavisor **session** port (5432). Production's
`DATABASE_URL` on Vercel uses the transaction port (6543); Hyperdrive needs
prepared statements, which transaction mode does not keep, so
`scripts/cloudflare/create-prod-hyperdrive.mjs` copied that URL with only the
port changed. Vercel stays on 6543, so the two never share Supavisor's
session cap. Query caching is **off** on both, so a purge is never undone by a
60-second-old query result.

**Connection cap.** Supavisor session mode allows 15 clients per role
(`EMAXCONNSESSION`). At Hyperdrive's default limit, 68 of 90 concurrent cold
article renders returned 500; at 10, 0 of 90 did (15 Nov 2026). Both configs
use `origin_connection_limit` 10. Change it with
`cf.ps1 hyperdrive update <id> --origin-connection-limit <n>`.

**No DATABASE_URL on the Worker.** Every database client comes from the
request's `HYPERDRIVE` binding: `db` (Drizzle) and `getSqlClient()` (the raw
postgres-js client, used by `/api/cron/gsc-sync`) both resolve per request.
`sqlClient`, the module-level DATABASE_URL pool, is for Vercel and the CLI
scripts only; app code must not import it.

`src/lib/db/prefer-prepared.ts` keeps Drizzle's `unsafe()` calls prepared
behind Hyperdrive (`prepare: false` there causes intermittent hangs, per
Cloudflare). Smart Placement moves the Worker next to the data.

### Read-only preview

Two guards, so the preview cannot change the live site's data:

1. The database role above refuses writes.
2. `HK_READ_ONLY=1` (a top-level `vars` entry) makes the middleware answer
   first (`src/lib/cloudflare/read-only-preview.ts`): `/admin`, `/login`,
   `/no-access` and `/api/v1/inspire/*` return 403; the page-view beacon
   returns 204 and records nothing; every other non-GET (Server Actions)
   returns 403. `/api/cron/revalidate-content` stays open: it is
   `CRON_SECRET`-gated and only drops this Worker's own page cache.

`cf-worker.ts` sends `X-Robots-Tag: noindex, nofollow` when `HK_NOINDEX=1`
(the preview) **and on every `*.workers.dev` request** (so the production
Worker's test address is never indexed either). The preview's `CRON_SECRET`
is its own (vault `cron.hellokahwin-cfpreview`), not production's.

Production sets neither switch (a test in
`src/lib/cloudflare/__tests__/worker-entry.test.ts` fails if either appears
under `env.production`).

### media-tools: sharp and Ghostscript work

A Worker cannot load sharp or run Ghostscript. On the production Worker the
admin's pixel and PDF work goes to the TWN account's **media-tools-twn**
service over the `MEDIA` binding (secret `MEDIA_TOOLS_KEY`, vault
`media-tools.twn-prod-key`; API: `media-tools/docs/api.md`). The one door is
`src/lib/media/media-client.ts`, ported from twn-new with the same contract:

- `MEDIA` not bound (Vercel, `next dev`, CLI scripts, tests) → every caller
  runs its existing sharp/Ghostscript path. Nothing changes on Vercel.
- Bound without a key, network error, 5xx, deadline (35 s image, 130 s PDF),
  or an empty, malformed or structurally incomplete body →
  `MediaToolsUnavailableError` (503, retryable).
- A 4xx with media-tools' own error envelope → `MediaToolsError` with that
  status. Sources over 40 MB are refused before they are buffered (413).

| Job                              | File                                                                           | media-tools call                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| PDF compression                  | `src/lib/storage/pdf-compress.ts`, `/api/v1/inspire/compress-pdf`              | `/v1/pdf/compress?preset=ebook&dpi=150&monoDpi=300&compat=1.5`                                                              |
| Smart crops and cover renditions | `src/lib/storage/smart-crop.ts` (`generateSmartCrops`, `renderCoverRendition`) | `/v1/image/metadata`, then `/v1/image/transform` with `extract`, `w`, `h`, `fit=inside`, `format=webp`, `q` per ladder rung |
| Rekognition input                | `processSmartCrops`                                                            | `/v1/image/transform?format=jpeg&q=90&w=4096&h=4096&fit=inside`                                                             |
| Saliency fallback                | `detectSaliencyFocalPoint`                                                     | `/v1/image/focal`                                                                                                           |
| Manual crop                      | `/api/v1/inspire/crop`                                                         | `/v1/image/transform?angle=…&extract=…&format=webp&q=80`                                                                    |

media-tools accepts whole-degree angles only, so on the Worker the manual crop
rounds the angle before it validates the crop box (sharp keeps the exact
angle). Every transform sends `orient=0`: the sharp pipelines never apply EXIF
orientation, so crop windows are computed on the stored pixels on both
engines. sharp itself stays aliased to a throwing stub in the Cloudflare
build (`next.config.ts`, `sharp-unavailable.ts`); no Worker path reaches it.
Rekognition (face and label detection) still runs in the app.

### Cache purge

On Vercel an ingest clears two caches: the Next data cache
(`/api/cron/revalidate-content` → `revalidateTag(…, PURGE_IMMEDIATELY)`) and
the Vercel CDN copy (`@/lib/cache/edge-purge`).

On Cloudflare the first call is the whole job: OpenNext writes the tag's
revalidation time to D1 and the next read is a miss. No Cache Rule stores HTML
for a Workers route, so no second copy exists to go stale. Production sets
`HK_EDGE_HOSTING=cloudflare`, so `purgeEdge()` never calls Vercel from there.

### Files read from disk

A Worker has no filesystem. The header wordmark is a bundled string
(`src/components/brand/horizontal-mark-svg.ts`; regenerate with
`node scripts/cloudflare/inline-wordmark.mjs`). The GSC credential is read
from `GSC_SERVICE_ACCOUNT_JSON` (inline); the file path is CLI-only.

## Schedules

| Job                                   | Vercel                                | Cloudflare (production)                                                                                                         |
| ------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `/api/cron/gsc-sync`, 19:30 UTC daily | `vercel.json` `crons`                 | `triggers.crons` in `env.production`; `cf-worker.ts` `scheduled` calls the same route with `Authorization: Bearer $CRON_SECRET` |
| `/api/cron/revalidate-content`        | called by the ingest CLI, not a timer | same                                                                                                                            |

The Worker's trigger fires every night but **does nothing unless the secret
`HK_CRON_ENABLED` is `1`**. It is set at the domain switch, in the same step
Vercel's cron is switched off, so the job never runs on both (a double run
would be harmless anyway: every write is an upsert). The route and its
schedule are pinned to `vercel.json` by `worker-entry.test.ts`.

---

## Building and deploying

The build runs in a Linux container: `opennextjs-cloudflare build` recreates
symlinks, which Windows refuses without Developer Mode. The machine allows one
OpenNext Docker build at a time
(`~/Documents/Code/tmp/scratchpad/build.lock`).

### Production (`hellokahwin`)

```bash
# 1. build env, OUTSIDE the checkout. Prerendering reads through the read-only
#    role; adds the Server Actions key from Infisical hellokahwin/prod.
pwsh -NoProfile -File scripts/cloudflare/write-env-file.ps1 <scratch>/cf-prod.env -Production

# 2. build + deploy production (refuses a preview env file)
ENV_FILE=<scratch>/cf-prod.env bash scripts/cloudflare/cf-docker.sh deploy-prod
rm <scratch>/cf-prod.env

# 3. runtime secrets (copied from Vercel production + vault + Infisical)
pwsh -NoProfile -File scripts/cloudflare/push-prod-secrets.ps1 -DryRun   # names only
pwsh -NoProfile -File scripts/cloudflare/push-prod-secrets.ps1
```

### Production secrets

Pushed by `push-prod-secrets.mjs` through a 0600 temp file outside the
checkout (deleted afterwards); only names are printed. `vault.ps1 run` does
not forward stdin, so nothing is piped.

- From Vercel (target Production): `ADMIN_EMAILS`, `ANALYTICS_SALT`,
  `CLERK_SECRET_KEY`, `CRON_SECRET`, `GSC_SERVICE_ACCOUNT_JSON`,
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL`,
  `R2_ACCESS_KEY_ID`, `R2_ACCOUNT_ID`, `R2_ASSETS_BUCKET_NAME`,
  `R2_ASSETS_PUBLIC_URL`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`,
  `R2_SECRET_ACCESS_KEY`, `REKOGNITION_ENABLED`.
- `MEDIA_TOOLS_KEY`: vault `media-tools.twn-prod-key`.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`: Infisical `hellokahwin` / `prod`.
  Vercel has none (it pins Server Actions per deployment). Next embeds the key
  at build time, so the build env and the Worker secret must hold the same
  value or every admin form fails to decrypt after a redeploy. Generated once
  (32 random bytes, base64) at the production move; never regenerate it casually.
- Not on the Worker: `DATABASE_URL` (Hyperdrive replaces it). Set only at the
  switch: `HK_CRON_ENABLED=1`.

### Preview (`hellokahwin-preview`)

```bash
pwsh -NoProfile -File scripts/cloudflare/write-env-file.ps1 <scratch>/cf.env
ENV_FILE=<scratch>/cf.env bash scripts/cloudflare/cf-docker.sh deploy
ENV_FILE=<scratch>/cf.env bash scripts/cloudflare/cf-docker.sh secrets
rm <scratch>/cf.env
```

The preview's runtime values: `CRON_SECRET` (its own),
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL`,
`R2_PUBLIC_URL`, `R2_ASSETS_PUBLIC_URL`, `R2_BUCKET_NAME`,
`R2_ASSETS_BUCKET_NAME`. Deliberately absent: R2 write keys, the Clerk secret,
Rekognition, the analytics salt, the media-tools binding.

`cf-docker.sh` wipes and verifies its working-copy volume
(`hellokahwin-cf-src`) before every copy, keeps `node_modules` and the pnpm
store in `hellokahwin-cf-deps` / `hellokahwin-cf-pnpm`, and never writes into
the checkout. Other wrangler commands:
`pwsh -NoProfile -File scripts/cloudflare/cf.ps1 <args>` (TWN token injected
from vault `cloudflare.workers-twn`).

`.github/workflows/cf-preview.yml` (manual only) still targets the preview and
has no repository secrets set; production is deployed from a workstation.

## Deploys after the switch

`.github/workflows/cf-production.yml` deploys the production Worker on **every
push to `master`**, the same trigger as Vercel's git deploy, then smoke-tests
hellokahwin.com. While both hosts exist, every master merge lands on both:
whichever one DNS points at is live and the other is a warm fallback, so a
rollback never serves stale code.

It is inert until the repository variable `HK_CF_PROD_DEPLOY` is `on`. Its
secrets and variables are set by
`pwsh -NoProfile -File scripts/cloudflare/set-github-deploy-secrets.ps1`
(copied from Vercel, the vault and Infisical; never printed). The workflow
reaches `master` only when this branch is merged there, so **the domain must
not stay on the Worker while `master` lacks this workflow**: until then a
master merge would reach only Vercel and miss the live site.

## Switching the domain

The zone `hellokahwin.com` is on Cloudflare DNS (zone token
`cloudflare.hellokahwin`). Before the switch:

1. Deploy production from the reviewed commit and push its secrets. Test on
   its workers.dev address: home, an article, a category, search, images,
   sitemap, robots.
2. Admin sign-in only works on hellokahwin.com and its subdomains (Clerk
   production), so attach a temporary Workers custom domain
   `cf-test.hellokahwin.com` to `hellokahwin` (a new record only) and test:
   sign in, the admin list, the editor, a draft save (Server Action), a PDF
   compression, a smart crop, a manual crop. Remove it after the switch.
3. Run the GSC sync once by hand against the Worker (idempotent).

The switch, back to back:

1. Export the current DNS records for `hellokahwin.com` and `www` to the run
   folder (on 17 Nov 2026: apex `A 216.150.16.1`, `www` CNAME to Vercel).
2. Attach `hellokahwin.com` and `www.hellokahwin.com` as Workers custom
   domains of `hellokahwin`, replacing those records.
3. Switch Vercel's cron off (project setting) and set the Worker secret
   `HK_CRON_ENABLED=1`.
4. Verify on the real domain: no `x-vercel-id`; home, an article and a
   category answer 200; search; images; `http` → `https`; `www` → apex;
   robots and sitemap without `noindex`; admin sign-in and one Server Action.

## Rollback

- **Domain:** detach the two custom domains and restore the recorded records.
  Vercel's deployment still holds both domains and serves as soon as DNS
  returns (minutes).
- **Cron:** delete the Worker secret `HK_CRON_ENABLED`; switch Vercel's cron
  back on.
- **Data:** nothing to copy. The Worker wrote to the same database and the
  same R2 buckets as Vercel.
- **Code:** the media-tools paths only run when `MEDIA` is bound, so Vercel is
  unaffected and needs no rollback.

Vercel stays deployed as the fallback until the Worker has run cleanly for two
weeks; retiring it (and removing `crons` from `vercel.json`) is a separate
decision.

## Known limits

- **Admin sign-in is not available on the preview** (closed by design).
- **Analytics are not recorded** on the preview (the beacon answers 204).
- **No edge cache on workers.dev.** Every request reaches the Worker; the R2
  page cache still applies.
- **WebP effort.** media-tools has no encoder-effort setting, so a cover
  rendition cut on the Worker can be a few percent larger than sharp's
  effort-6 output at the same quality. The byte-ceiling ladder still applies.

## Undo the whole thing

After a domain rollback: delete the Workers (`cf.ps1 delete --name hellokahwin`,
`cf.ps1 delete --name hellokahwin-preview`). The R2 bucket and D1 database can
stay for The Wedding Notebook; the Hyperdrive configs can be removed with
`cf.ps1 hyperdrive delete <id>`. Nothing on Vercel or in the database changes.
