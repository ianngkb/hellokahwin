# Plan: all of hellokahwin.com on Cloudflare (admin included)

Run: `ianngkb/cloudflare-full`, base master `4dbfaba` (contains `cea7438`).
Decision (Ian, 2026-11-17): option C, whole site on one host, on the Worker
`hellokahwin` in the TWN Cloudflare account. Vercel stays deployed as the
fallback; nothing on Vercel is deleted.

**Plain version.** Today the Cloudflare copy is a locked, read-only test
copy. To carry the whole site, including the admin where articles are
written, it needs four things it lacks: a way to do the heavy image and PDF
work (handed to the media-tools service we already run), permission to write
to the database, the sign-in secret, and the nightly Google Search Console
job. Then we test it on a side address, and switch the domain in one quick
step, with Vercel kept warm so we can switch back in minutes.

## 1. What blocks admin on Workers today

| #   | Blocker                                                                                                                                                                                               | Where                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | **PDF compression** runs Ghostscript WASM read from `node_modules` with `fs`                                                                                                                          | `src/lib/storage/pdf-compress.ts`, `/api/v1/inspire/compress-pdf`, `inspire-pdf-upload.ts`                                                                              |
| B2  | **Smart crops** use sharp (metadata, attention saliency, extract/resize, byte-ceiling ladder, JPEG for Rekognition)                                                                                   | `src/lib/storage/smart-crop.ts` (`generateSmartCrops`, `processSmartCrops`, `renderCoverRendition`, `detectSaliencyFocalPoint`), `/api/v1/inspire/generate-smart-crops` |
| B3  | **Manual crop** route uses sharp (metadata, rotate, extract, WebP q80)                                                                                                                                | `src/app/api/v1/inspire/crop/route.ts`                                                                                                                                  |
| B4  | sharp is aliased to a throwing stub on the Cloudflare build                                                                                                                                           | `next.config.ts`, `sharp-unavailable.ts` — stays, but no admin path may reach it                                                                                        |
| B5  | **Read-only guards**: `HK_READ_ONLY=1` (admin, login, inspire API, beacon, all non-GET → 403/204) and `HK_NOINDEX=1` are top-level `vars`                                                             | `wrangler.jsonc`, `read-only-preview.ts`, `cf-worker.ts`                                                                                                                |
| B6  | **DB is read-only**: Hyperdrive `hellokahwin-db` points at the Preview read-only role                                                                                                                 | `wrangler.jsonc`                                                                                                                                                        |
| B7  | **Clerk secret** deliberately absent; Clerk production only accepts hellokahwin.com origins, so sign-in cannot be tested on workers.dev                                                               | Worker secrets                                                                                                                                                          |
| B8  | **Server Actions** (16 files under `src/app/(admin)`) are all non-GET → blocked by B5; on a Worker they also need a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` across versions                       | admin                                                                                                                                                                   |
| B9  | **gsc-sync cron** (`vercel.json`, `30 19 * * *`) has no Worker trigger; the doc says "no crons" (stale)                                                                                               | `vercel.json`, `cf-worker.ts`, `docs/cloudflare.md`                                                                                                                     |
| B10 | **Missing runtime values**: R2 write keys, Rekognition keys, `ANALYTICS_SALT`, `ADMIN_EMAILS`, `INDEXNOW_KEY`, `GSC_SERVICE_ACCOUNT_JSON`, `GSC_SITE_URL`, prod `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` | Worker secrets                                                                                                                                                          |
| B11 | **Edge cache purge** picks Vercel unless the revalidate URL is `*.workers.dev`                                                                                                                        | `src/lib/cache/edge-purge.ts` (`HK_EDGE_HOSTING`)                                                                                                                       |
| B12 | **CPU time**: admin analytics pages declare `maxDuration = 60`, gsc-sync 120 s; Workers default CPU limit is 30 s                                                                                     | `wrangler.jsonc` `limits`                                                                                                                                               |
| B13 | **No production deploy path**: no `env.production`, no routes/custom domain, CI preview-only with no secrets set                                                                                      | `wrangler.jsonc`, `scripts/cloudflare/*`, `.github/workflows/cf-preview.yml`                                                                                            |

Not blockers (checked): `@aws-sdk/client-s3` and `client-rekognition` are fetch-based and run on Workers; `gsc-auth.ts` uses `node:crypto` `createSign` (nodejs_compat) and reads inline JSON (the file path is CLI-only); `after()` maps to `waitUntil` in OpenNext; `@vercel/functions` `addCacheTag` is already wrapped in try/catch; `pdfjs-dist`/`react-pdf` are client-side; resize/encode at upload already uses the Images binding.

## 2. How each is solved

**Media client (B1–B3).** Port twn-new's `src/lib/media/media-client.ts` (commit `7b21bcff`) into `src/lib/media/media-client.ts`, unchanged in contract:

- `MEDIA` binding absent → `null`, caller runs its existing local path (Vercel, dev, tests unchanged).
- Binding present, key missing → `MediaToolsUnavailableError` (never sharp).
- Network error, 5xx, deadline, empty/malformed/structurally incomplete body (magic bytes + completeness check) → `MediaToolsUnavailableError` (503, retryable). A 4xx with media-tools' `{error:{code,message}}` envelope → `MediaToolsError` with its status; a 4xx without it → unavailable.
- One deadline per call (image 30 s, PDF 120 s, plus margin), source capped at `MAX_REMOTE_BYTES` (40 MB) before buffering, validated JSON bodies (`isFocalResult`, metadata shape).
- sharp and Ghostscript only ever reached by dynamic `import()` on the local path.

Mappings:

| Today (sharp / gs)                                    | On Workers (media-tools-twn)                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `compressPdf`                                         | `POST /v1/pdf/compress?preset=ebook&dpi=150&monoDpi=300&compat=1.5`; `x-kept-original` maps to `compressed:false` |
| `sharp().metadata()`                                  | `/v1/image/metadata`                                                                                              |
| `detectSaliencyFocalPoint`                            | `/v1/image/focal`                                                                                                 |
| smart-crop renditions (extract/resize + byte ceiling) | `/v1/image/transform` with `extract`, `w`,`h`, `format`, `q`, `maxBytes`, `minQ`                                  |
| detection JPEG for Rekognition                        | `/v1/image/transform?format=jpeg&q=80&w=…`                                                                        |
| manual crop (rotate + extract, WebP q80)              | `/v1/image/transform?angle=…&extract=…&format=webp&q=80`                                                          |

Routes answer a retryable 503 with a plain message when media-tools is unavailable; the upload itself is never lost. Rekognition stays in the app.

**wrangler.jsonc (B5, B6, B12, B13).** Keep the top level as the preview (unchanged behaviour). Add `env.production`:

- `name: "hellokahwin"` kept for production (the existing Worker, so the route/custom domain attaches to it); preview moves to `hellokahwin-preview` on workers.dev with its read-only vars, Hyperdrive and own secrets. (Alternative if lead prefers: production as `hellokahwin-prod`. Either way, one name per environment, written down.)
- production `vars`: no `HK_READ_ONLY`, no `HK_NOINDEX`, `NEXT_PUBLIC_HOSTING=cloudflare`, `HK_EDGE_HOSTING=cloudflare`, `NEXT_PUBLIC_SITE_URL=https://hellokahwin.com`.
- production `hyperdrive`: a **new Hyperdrive config `hellokahwin-db-prod`** whose origin is **the existing production `DATABASE_URL` copied from Vercel (target Production)**. No new database user or password. Created by a small script that reads the URL from an env var injected by `vault.ps1 run` / Vercel env pull into a scratch file outside the checkout, calls the Cloudflare API, and prints only the new config id. Query caching off. `origin_connection_limit` set so Hyperdrive + Vercel's production pool stay under Supavisor's session cap of 15 for that role (start 8; Vercel traffic falls to near zero after the switch). If the prod URL is the transaction pooler (6543), note it and keep `prepare` behaviour as the preview proved.
- `services`: `MEDIA → media-tools-twn`, `WORKER_SELF_REFERENCE → hellokahwin`.
- `routes`: `hellokahwin.com` and `www.hellokahwin.com` as **custom domains**, but **not in the first deploy** — the first production deploy has no routes and is tested on `hellokahwin.<sub>.workers.dev` / a version preview URL. Routes are added only in the switch step.
- `limits.cpu_ms`: 60 000 (admin analytics), and `triggers.crons: ["30 19 * * *"]`.
- R2/D1/DO/Images bindings as today (shared `twn-next-cache`, `twn-next-tags`).

**Cron (B9).** `cf-worker.ts` gains a `scheduled` handler that calls the Worker's own `/api/cron/gsc-sync` through `WORKER_SELF_REFERENCE` with `Authorization: Bearer $CRON_SECRET` (same route, same idempotent upserts). It runs only when `HK_CRON_ENABLED=1`, which is set **as a secret in the switch step**, not at deploy, so the Worker and Vercel never both run it. Removing the `crons` entry from `vercel.json` would need a Vercel deploy, so instead, in the same step as DNS: disable cron jobs on the Vercel project (project setting, via the Vercel API with `vercel.twn` or the dashboard), then set `HK_CRON_ENABLED=1` on the Worker. The `vercel.json` entry is removed later, once Vercel is retired. Rollback reverses both. A double run would be harmless anyway (upserts), so the order risk is low.

**Secrets (B7, B8, B10).** Copied from Vercel's Production env (`vercel env pull` with `vercel.twn` injected, into a scratch file outside the checkout), pushed with `wrangler secret bulk <file>` from a file (not stdin through `vault.ps1`, which does not forward stdin), file deleted after. Never printed. Set: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `DATABASE_URL` (only for scripts that read it; runtime uses Hyperdrive), `R2_*` read/write keys and bucket names, `AWS_REKOGNITION_*`, `REKOGNITION_ENABLED`, `ANALYTICS_SALT`, `ADMIN_EMAILS`, `INDEXNOW_KEY`, `GSC_SERVICE_ACCOUNT_JSON`, `GSC_SITE_URL`, production `CRON_SECRET`, `MEDIA_TOOLS_KEY` (from vault `media-tools.twn-prod-key`), and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (copied if Vercel has one; if it does not, this is the only value that must be created — **flag to lead before creating**, since Server Actions break between versions without it). `NEXT_PUBLIC_*` values are also passed as build env.

**Edge purge (B11).** Production sets `HK_EDGE_HOSTING=cloudflare`, so an ingest only revalidates via `/api/cron/revalidate-content` (D1 tag time). Cloudflare cache purge (`cloudflare.hellokahwin`) is needed only if a Cache Rule caches HTML; none will.

**Docs.** `docs/cloudflare.md` rewritten for production (environments, secrets list, cron, media-tools, switch and rollback); stale "no crons" fixed.

## 3. Checks

Build (targeted while working, then the repo's full suite once on final HEAD):

- Unit tests: media-client (ported tests: envelope, deadline, size cap, magic bytes), each mapped caller with a fake `MEDIA` fetcher (PDF kept-original, focal, transform params, crop angle/extract), `scheduled` handler gating on `HK_CRON_ENABLED`, read-only guard off in production vars.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, a Vercel-style `next build`, and the Docker OpenNext build (`cf-docker.sh`, under `tmp/scratchpad/build.lock`).

After the review, before the switch (production Worker, no routes):

1. Deploy production from the reviewed SHA. Test on its workers.dev / version URL: home, an article, a category, search, images, sitemap, robots (no noindex header), a 404, legacy redirects.
2. **Admin sign-in cannot be tested on workers.dev** (Clerk production only accepts hellokahwin.com and its subdomains). Proposal: attach a temporary custom domain `cf-test.hellokahwin.com` to the production Worker (a new record only; nothing existing changes) and test there: sign in, admin list, open the editor, save a draft (Server Action), a PDF compress and a smart crop through media-tools, a manual crop, one cover upload. **Needs lead's go, as it is a DNS addition.** Remove it after the switch.
3. Run `gsc-sync` once by hand against the Worker with the prod `CRON_SECRET` (idempotent) to prove the route and credentials.

Switch (only on lead's relay), the courts way:

1. Record existing DNS for `hellokahwin.com` and `www` (export JSON to the run folder).
2. Back to back: attach custom domains `hellokahwin.com` + `www.hellokahwin.com` to the Worker (replacing the Vercel A/CNAME records), then disable the Vercel cron and set `HK_CRON_ENABLED=1`.
3. Verify on the real domain: no `x-vercel-id`; home, an article, a category 200; search; images; `http → https`; `www → apex`; robots and sitemap; admin sign-in and one admin page; one Server Action.
4. Roll back at once if anything core breaks.

## 4. Rollback

- **DNS**: detach the Worker custom domains and restore the recorded Vercel records (apex A `216.150.16.1`, `www` CNAME to Vercel). Vercel's deployment is untouched and still holds both domains, so it serves again as soon as DNS returns (minutes).
- **Cron**: unset `HK_CRON_ENABLED` on the Worker, re-enable the Vercel cron.
- **Data**: writes during the window went to the same production database, so nothing needs copying back. Uploads went to the same R2 buckets.
- **Code**: the branch only adds paths taken when the `MEDIA` binding exists; Vercel never sees it, so no Vercel rollback is needed.
- Vercel stays the fallback for two clean weeks before anything there is removed (that removal is a separate decision for Ian).

## Open points for the lead

1. Worker naming: production keeps `hellokahwin`, preview becomes `hellokahwin-preview` (recommended), or the reverse.
2. Go for the temporary `cf-test.hellokahwin.com` custom domain to test admin sign-in before the switch.
3. If Vercel has no `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, one new value must be generated for the Worker (it is not a credential to anything external).
