# Review Brief — HelloKahwin CMS + Malay article directory

**Repo under review:** `C:/Users/Ian Ng/orca/workspaces/hellokahwin/start` (the working tree; nothing is committed yet — baseline commit `227217f` contained an unrelated Electron tool that was deleted).
**Spec:** `_bmad-output/implementation-artifacts/spec-hellokahwin-cms-directory.md` (read it first — intent, boundaries, I/O matrix).
**Reference source (read-only):** `C:/Users/Ian Ng/Documents/Code/twn-new` — most files here were ported from its "Inspire" vertical.

The diff is the ENTIRE working tree (~241 TS files, ~40k lines) — mostly verbatim ports of production-proven twn-new code. Review effort should concentrate where the risk actually is: **code that was newly written or materially modified during the port**. Verbatim-ported files are low-priority.

## Newly written (highest risk)

- `src/lib/auth/admin.ts` — Clerk email-allowlist auth shim (replaces twn's RBAC). Every admin surface depends on it.
- `src/middleware.ts` — pattern redirects + Clerk scoped to `/admin`, `/login`, `/api/v1/inspire` only. Public pages must never require Clerk; admin routes must never escape it.
- `src/lib/redirects/patterns.ts` — legacy WP URL patterns (category/tag/feed/date/page-N).
- `src/lib/redirects/lookup.ts` — exact-match redirects lookup.
- `src/app/(public)/[slug]/page.tsx` — legacy WP root-slug 301 resolver (catch-all!). Think about route collisions and open-redirect vectors.
- `src/app/wp-content/[...path]/route.ts` — legacy image 301s.
- `src/app/api/cron/publish-scheduled/route.ts` — scheduled publish worker (auth via CRON_SECRET, guarded update, tag revalidation).
- `src/app/api/v1/search/route.ts` — ILIKE article search (injection? DoS? shape contract with `inspire-article-search.tsx`).
- `src/app/(public)/page.tsx` — home page; `src/components/layout/{navbar,footer}.tsx`; `src/components/inspire/whatsapp-share.tsx`.
- `src/app/layout.tsx`, `src/app/(admin)/layout.tsx`, `src/app/login/[[...rest]]/page.tsx` (ClerkProvider placement!), error/not-found pages.
- `src/lib/analytics/tracker.ts`, `src/components/moodboard/moodboard-save-button.tsx` — no-op stubs.
- Config: `next.config.ts` (CSP!), `package.json`, `drizzle.config.ts`, `vercel.json`, `.env.example`, `eslint.config.mjs`, tsconfigs.
- Tests: `src/lib/auth/__tests__/admin.test.ts`, `src/lib/redirects/__tests__/patterns.test.ts`.

## Materially modified ports (high risk — amputation scars)

Vendor-credits / moodboard / banners / whatsapp-links / listings were surgically removed from:
- `src/lib/db/schema/articles.ts` (tables cut, pgvector cut), `media.ts` (photoId cut), `enums.ts` (trimmed).
- `src/app/(admin)/admin/inspire/[article-id]/edit/{actions.ts,page.tsx,article-editor.tsx,degraded-controls.ts}`
- `src/app/(admin)/admin/inspire/{actions.ts,tags/actions.ts}`
- `src/app/(public)/artikel/**` (all pages; also URL namespace migrated `/inspire/*` → `/artikel/*` via regex — look for missed or over-replaced occurrences; admin paths stay `/admin/inspire`, R2 keys stay `inspire/...`, cache tags stay `inspire-*`)
- `src/components/inspire/{article-sidebar,article-preview-view,editor-toolbar,inspire-article-search,photo-gallery,article-renderer usage}`
- `src/lib/inspire/preview-article.ts`, `src/lib/validations/article.ts`, `src/lib/utils/slug.ts`, `src/lib/seo/meta.ts` (BRAND swap), `src/app/sitemap.ts` (rewritten), `src/lib/api/middleware.ts` (allowlist role), `src/lib/r2/client.ts`, `src/lib/services/legacy-image-redirects.ts` (supabase→drizzle rewrite), `src/lib/admin/safe-panel.ts` + `article-editor.tsx` (Sentry→console stub), `src/components/media/{media-gallery,media-picker-dialog}.tsx` (venue tab cut)
- `scripts/wp-import.ts` (env loading, house-author creation, entity decoding for category/tag names)
- Malay copy swaps across public components (check for leftover English or broken JSX from the string surgery — one earlier regex pass produced literal `null` text nodes that were fixed; look for similar artifacts).

## Verified already (don't re-litigate, but you may spot-check)

`pnpm typecheck` clean; `pnpm test` 112/112; `pnpm build` exit 0; wp-import dry-run = 29/29 posts, 0 errors; local import + dev-server smoke: home/artikel/article render in Malay, legacy redirects (root slug 308, /category 301, /tag 301, /feed 301), 404s, search API works, /admin → /login.

## Known accepted gaps (not findings)

- Real Clerk/R2/Supabase credentials don't exist yet — admin end-to-end and image pipeline are verified by types/tests only.
- Images not migrated locally (import ran --skip-images); content still references hellokahwin.com image URLs until a real import runs.
- Admin UI keeps twn-new's design system styling.
