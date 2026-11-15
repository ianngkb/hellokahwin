# HelloKahwin on Cloudflare

**Plain version:** hellokahwin.com is served by Vercel. This describes a second,
private copy of the same site running on Cloudflare at a `workers.dev` test
address. Nothing here changes the live site. It reads the same database as the
live site but **cannot write to it**. Moving hellokahwin.com itself across is a
separate, deliberate step that only Ian starts.

|            |                                                                            |
| ---------- | -------------------------------------------------------------------------- |
| Preview    | https://hellokahwin.misty-glitter-43d0.workers.dev                         |
| Worker     | `hellokahwin`, TWN Cloudflare account (`249af9c6ea41ab1c7cd049f2adf80eb2`) |
| Config     | `wrangler.jsonc`, `open-next.config.ts`, `cf-worker.ts`                    |
| Production | none. No routes, no custom domain, no `env.production` block.              |

The kit is copied from thepadelbase (`docs/cloudflare.md` there) and
thepicklebase (`apps/shop`). Versions are pinned: `@opennextjs/cloudflare`
1.20.17, `wrangler` 4.162.0.

**Version gap.** The adapter declares `next >=15.5.29 <16 || >=16.4.5`; this
repo is on Next 16.1.6, inside the gap (pnpm prints an unmet-peer warning).
The padel pilot ran 16.2.10 in the same gap end to end. If a future adapter
release breaks on 16.1.x, move Next to `>=16.4.5` rather than patching the
adapter.

---

## What replaces what

| What the app needs                     | On Vercel                          | On Cloudflare                                                         | Binding                    |
| -------------------------------------- | ---------------------------------- | --------------------------------------------------------------------- | -------------------------- |
| Rendered pages (ISR, `unstable_cache`) | built in                           | R2 bucket `twn-next-cache`                                            | `NEXT_INC_CACHE_R2_BUCKET` |
| `revalidateTag()`                      | built in                           | D1 database `twn-next-tags`                                           | `NEXT_TAG_CACHE_D1`        |
| One regeneration per stale page        | built in                           | Durable Object `DOQueueHandler`                                       | `NEXT_CACHE_DO_QUEUE`      |
| Postgres connection pool               | the module-level `postgres()` pool | Hyperdrive `hellokahwin-db`, pooled next to Supabase (ap-southeast-1) | `HYPERDRIVE`               |
| Image resizing at upload               | sharp                              | Cloudflare Images                                                     | `IMAGES`                   |
| Static files                           | built in                           | Workers static assets                                                 | `ASSETS`                   |
| Edge cache purge after an ingest       | `dangerously-delete-by-tags`       | not needed (see below)                                                | —                          |
| Scheduled jobs                         | none                               | none                                                                  | —                          |

The R2 bucket and D1 database are the **TWN account's shared foundations**:
The Wedding Notebook will use the same two when it moves. OpenNext namespaces
entries per Worker, so apps do not collide. Both were created in APAC on
15 Nov 2026. Hyperdrive is per app.

### The database: Hyperdrive, read-only

Every render reads Supabase in Singapore. On Vercel the app keeps a
module-level pool (`src/lib/db/drizzle.ts`). A Worker cannot reuse a socket
across requests, so on Cloudflare `db` resolves to a small per-request client
pointed at Hyperdrive, which keeps the real pool warm next to the database.
The switch is OpenNext's per-request context; outside a Worker nothing changes.

Hyperdrive's origin is the **read-only role** Vercel's own preview deployments
use (Vercel env `DATABASE_URL`, target Preview; vault
`supabase.hellokahwin-previewro`). Verified 15 Nov 2026: same database as
production (same `system_identifier`), `has_table_privilege('articles',
'INSERT'|'UPDATE')` both **false**. The connection goes to the Supavisor
session port (5432). Hyperdrive's own query cache is **off**, so a purge is
never undone by a 60-second-old query result.

**Prepared statements and the connection cap.** Behind Hyperdrive the client
uses prepared statements (`prepare: false` there causes intermittent hangs,
per Cloudflare); `src/lib/db/prefer-prepared.ts` extends that to Drizzle's
`unsafe()` calls, which postgres-js otherwise always sends unprepared.
Hyperdrive's `origin_connection_limit` is set to **10** because Supavisor
session mode allows only 15 clients per role (`EMAXCONNSESSION`). At the
default limit, 68 of 90 concurrent cold article renders returned 500; at 10,
0 of 90 did (15 Nov 2026). Change it with
`cf.ps1 hyperdrive update a7579bc5a9b64c4e8ab49dab9dc070c8 --origin-connection-limit <n>`.

Smart Placement (`placement.mode = smart`) moves the Worker next to the data.

### Read-only preview

Two guards, so the preview cannot change the live site's data:

1. The database role above refuses writes.
2. `HK_READ_ONLY=1` (a `vars` entry) makes the middleware answer first
   (`src/lib/cloudflare/read-only-preview.ts`): `/admin`, `/login`,
   `/no-access` and `/api/v1/inspire/*` return 403; the page-view beacon
   returns 204 and records nothing; every other non-GET (Server Actions)
   returns 403. `/api/cron/revalidate-content` stays open: it is
   `CRON_SECRET`-gated and only drops this Worker's own page cache.

`HK_NOINDEX=1` makes `cf-worker.ts` send `X-Robots-Tag: noindex, nofollow` on
every response, so the copy is never indexed beside hellokahwin.com. Canonical
URLs still point at hellokahwin.com (`NEXT_PUBLIC_SITE_URL` is unset).

The preview's `CRON_SECRET` is its own (vault `cron.hellokahwin-cfpreview`),
not production's.

### Cache purge

On Vercel an ingest clears two caches: the Next data cache
(`/api/cron/revalidate-content` → `revalidateTag(…, PURGE_IMMEDIATELY)`) and
the Vercel CDN copy (`@/lib/cache/edge-purge`).

On Cloudflare the first call is the whole job. OpenNext writes the tag's
revalidation time to D1 and the next read is a miss. The
`Vercel-CDN-Cache-Control` headers mean nothing to Cloudflare, and no Cache
Rule stores HTML for a Workers route, so no second copy exists to go stale.
`purgeEdge()` picks the layer from the revalidate URL (`*.workers.dev` →
Cloudflare, anything else → Vercel; override with
`HK_EDGE_HOSTING=cloudflare|vercel` for the day hellokahwin.com itself moves).
The Vercel path is unchanged and still tested.

While both copies run, an ingest revalidates only the origin it is given.
To refresh the preview after a publish:

```bash
pwsh -NoProfile -Command "& '$HOME\Documents\Code\brain\skills\tokens\vault.ps1' run cron.hellokahwin-cfpreview -EnvVar CRON_SECRET -- node -e \"fetch('https://hellokahwin.misty-glitter-43d0.workers.dev/api/cron/revalidate-content',{method:'POST',headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>console.log(r.status))\""
```

### Images

Covers and body images are pre-sized at upload and served straight from R2
(`images.unoptimized: true`), so readers never hit an image transform on
either host.

The upload-time resize-and-encode (the `low`/`high`/`mid` variants and the
LQIP placeholder) goes through `src/lib/storage/image-engine.ts`: sharp on
Vercel and in the CLI scripts, the Cloudflare Images binding on a Worker. sharp
is now imported lazily there, so those modules can load in a Worker. The
upload screens are closed on the read-only preview, so the Images path is unit
tested (`image-engine.test.ts`) but has not run on a real upload yet.

### Files read from disk

A Worker has no filesystem. The one runtime read of `public/` (the header
wordmark, `site-wordmark.tsx`) now imports a bundled string,
`src/components/brand/horizontal-mark-svg.ts`; a test fails if it drifts from
the SVG file. Regenerate with `node scripts/cloudflare/inline-wordmark.mjs`.
The GSC credential read (`gsc-auth.ts`) is CLI-only.

## What stays on Vercel (flag for the media-tools step)

These need native or WASM tooling a Worker cannot run, and they are admin-only:

| Job             | Where                                                            | Why it cannot move as-is                                                                                                  |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| PDF compression | `/api/v1/inspire/compress-pdf`, `pdf-compress.ts`                | ghostscript WASM (16 MB) read from `node_modules` at runtime                                                              |
| Smart crops     | `smart-crop.ts`, `/api/v1/inspire/generate-smart-crops`, `/crop` | sharp's attention-based framing and region extraction; Cloudflare Images has no equivalent that returns the crop geometry |

There is no HEIC conversion in this app (checked 15 Nov 2026), so nothing
HEIC-related needs to move. On the preview the two jobs above are behind the
read-only 403. Before hellokahwin.com moves,
they go to the media-tools container, or admin keeps running on Vercel.

## Schedules

| Job                            | On Vercel                             | On Cloudflare                               |
| ------------------------------ | ------------------------------------- | ------------------------------------------- |
| (none)                         | `vercel.json` has no `crons`          | no `triggers` block, no `scheduled` handler |
| `/api/cron/revalidate-content` | called by the ingest CLI, not a timer | same; `CRON_SECRET`-gated                   |

If a cron is ever added, add both a `scheduled` handler in `cf-worker.ts` and
a `triggers.crons` entry in `wrangler.jsonc`, and keep it inactive on the
preview (it shares the production database).

---

## Building and deploying

The build runs in a Linux container: `opennextjs-cloudflare build` recreates
symlinks, which Windows refuses without Developer Mode. The machine allows one
OpenNext Docker build at a time.

```bash
# 1. env file, OUTSIDE the checkout (values come from Vercel's env + the vault;
#    Doppler `hellokahwin` is empty)
pwsh -NoProfile -File scripts/cloudflare/write-env-file.ps1 <scratch>/cf.env

# 2. build + deploy the workers.dev preview, then push runtime values
ENV_FILE=<scratch>/cf.env bash scripts/cloudflare/cf-docker.sh deploy
ENV_FILE=<scratch>/cf.env bash scripts/cloudflare/cf-docker.sh secrets

# 3. delete the env file
rm <scratch>/cf.env
```

`cf-docker.sh` wipes and verifies its working-copy volume
(`hellokahwin-cf-src`) before every copy, keeps `node_modules` and the pnpm
store in `hellokahwin-cf-deps` / `hellokahwin-cf-pnpm`, and never writes into
the checkout.

Other wrangler commands: `pwsh -NoProfile -File scripts/cloudflare/cf.ps1 <args>`
(TWN token injected from vault `cloudflare.workers-twn`).

Runtime values on the Worker (`wrangler secret`): `CRON_SECRET`,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL`,
`R2_PUBLIC_URL`, `R2_ASSETS_PUBLIC_URL`, `R2_BUCKET_NAME`,
`R2_ASSETS_BUCKET_NAME`. Deliberately absent: R2 write keys, the Clerk secret,
Rekognition keys, the analytics salt.

### From CI

`.github/workflows/cf-preview.yml`, `workflow_dispatch` only:
`mode=version` uploads a version with its own preview URL and moves no traffic;
`mode=deploy` serves it on the workers.dev address. It cannot reach
hellokahwin.com. Repository secrets it needs, **none set yet**:
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PREVIEW_DATABASE_URL`,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`; variables
`NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL`, `R2_PUBLIC_URL`, `R2_ASSETS_PUBLIC_URL`.

## Known limits

- **Clerk sign-in is not available on the preview**: the admin is closed by
  design, and the production Clerk instance only accepts its own origins.
- **Analytics are not recorded** on the preview (the beacon answers 204).
- **No edge cache on workers.dev.** Every request reaches the Worker; the R2
  page cache still applies.

## Undo

Delete the Worker (`cf.ps1 delete --name hellokahwin`). The R2 bucket, D1
database and Hyperdrive config can stay (empty, free) for The Wedding
Notebook, or be removed with `cf.ps1 r2 bucket delete twn-next-cache`,
`cf.ps1 d1 delete twn-next-tags`, `cf.ps1 hyperdrive delete
a7579bc5a9b64c4e8ab49dab9dc070c8`. Nothing on Vercel or in the database
changes either way.
