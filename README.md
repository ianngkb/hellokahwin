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

## Legacy URL handling

- `/category/x`, `/tag/x`, `/feed`, date archives, `/page/N` → pattern 301s in middleware
- `/{old-wp-post-slug}` → 301 to `/artikel/{category}/{slug}` (root catch-all)
- `/wp-content/uploads/...` → 301 to the R2 copy via `legacy_image_redirects`
- Admin slug/category changes write exact 301s into the `redirects` table
