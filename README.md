# HelloKahwin

Laman web kandungan perkahwinan untuk pasangan Malaysia — an article CMS and
public Malay-language article directory, built on the proven Inspire vertical
from theweddingnotebook.com (twn-new), stripped of everything vendor/CRM.

**Public site** (Bahasa Melayu): home + `/artikel` catalog, category/tag/author
browse, article pages with WhatsApp-first sharing. Mobile-first, tuned for
low-end Android and slow connections (system fonts, pre-optimized WebP images).

**Admin CMS** (`/admin/inspire`, English): Tiptap article editor with autosave +
edit locks, scheduling, share-draft links, smart-cropped cover images
(Cloudflare R2 + optional AWS Rekognition), categories/tags/authors/navigation/
dynamic-blocks/media management. Auth is a Clerk email allowlist (`ADMIN_EMAILS`).

## Stack

Next.js 16 (App Router) · React 19 · Drizzle + Supabase Postgres · Tailwind v4 ·
Cloudflare R2 · Clerk · Vercel (cron: scheduled publishing).

## Setup

```bash
pnpm install
cp .env.example .env        # fill in real values
pnpm db:migrate             # apply migrations to DATABASE_URL
pnpm dev                    # http://localhost:4100
```

## Content import (from the legacy WordPress site)

The importer reads hellokahwin.com's public WP REST API — posts, categories,
images — converts HTML to Tiptap JSON, uploads images to R2 with WebP variants
and smart crops, and is idempotent on `wp_id`:

```bash
pnpm wp-import -- --all --dry-run          # verify mapping first
pnpm wp-import -- --all                    # real import
pnpm wp-import -- --all --skip-smart-crops # faster, without Rekognition
```

## Verification

```bash
pnpm typecheck   # tsc over src (build skips type errors by design)
pnpm test        # vitest unit tests
pnpm build       # production build (needs DATABASE_URL reachable)
pnpm lint
```

## Caching — read this BEFORE writing any cache-invalidation code

There are **two** caches in front of a reader and they are invalidated by
different mechanisms with different credentials. Getting one right and assuming
the other followed has now cost this project two separate bugs, both of which
looked correct in review.

| Layer                                      | What holds it                                  | How it is dropped                       | Owner                                         |
| ------------------------------------------ | ---------------------------------------------- | --------------------------------------- | --------------------------------------------- |
| Next data cache (in the origin)            | `unstable_cache`, `revalidate = false`         | `revalidateTag(tag, PURGE_IMMEDIATELY)` | `src/lib/cache/purge.ts`                      |
| Vercel CDN / edge (in front of the origin) | `Vercel-CDN-Cache-Control` in `next.config.ts` | delete by cache tag, via the REST API   | `src/lib/cache/edge-purge.ts` + `edge-tag.ts` |

**A 200 from `/api/cron/revalidate-content` means the origin will render fresh
HTML on its next miss. It does not mean a reader gets fresh HTML.**

Three traps, all three verified against production rather than inferred, all
three written up in full in the two modules named above:

1. **The purge API returns `200` for a cache tag nobody ever stamped.** There is
   no read-back for tags and no error for an unknown one — confirmed by purging
   `hk-preflight-does-not-exist`, which answered `200` with an empty body. So a
   green purge call proves the request was _accepted_, nothing more. The only
   proof a reader gets fresh HTML is a request to the page, with
   `x-vercel-cache` and `age` recorded.
2. **`Vercel-Cache-Tag` declared in `next.config.ts` is not read by the CDN's tag
   index.** It is applied by the routing layer. It appears on the response, it
   interpolates `:params` correctly, `next start` shows it — and purging that tag
   moves nothing. Tags must be stamped from inside the render, with
   `addCacheTag` (`src/lib/cache/edge-tag.ts`). Next's implicit `_N_T_/<path>`
   tag does not work here either: the public pages read `searchParams`, so their
   CDN entry comes from the TTL header rather than from ISR and nothing tags it
   automatically.
3. **`invalidate-by-tags` does not do what a publish needs.** It marks entries
   _stale_, so the next request is served the stale copy while it refreshes in
   the background — the same defect shape as `revalidateTag(tag, 'max')`, one
   layer out. Use `dangerously-delete-by-tags`, which makes the FIRST request
   rebuild in the foreground. Its stampede warning is about one tag naming many
   paths and does not apply at this blast radius.

Also: **Vercel has no purge-by-path.** Cache keys are not configurable; tags are
the only handle, and the only tag that reaches everything is `*`. So the tag for
a page is its own path, stamped by the page itself. Never blanket-purge — the
TTL headers are a deliberate performance decision.

Credential: `VERCEL_TOKEN`, from the vault key `vercel.twn`, never hardcoded and
never on a command line.

## Legacy URL handling

- `/category/x`, `/tag/x`, `/feed`, date archives, `/page/N` → pattern 301s in middleware
- `/{old-wp-post-slug}` → 301 to `/artikel/{category}/{slug}` (root catch-all)
- `/wp-content/uploads/...` → 301 to the R2 copy via `legacy_image_redirects`
- Admin slug/category changes write exact 301s into the `redirects` table
