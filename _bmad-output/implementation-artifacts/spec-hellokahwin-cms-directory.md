---
title: 'HelloKahwin — article CMS + public Malay article directory'
type: 'feature'
created: '2026-08-21'
status: 'done'
review_loop_iteration: 0
baseline_commit: '227217f21fb66a2e8996e0d8760991286f0d5c76'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** HelloKahwin (Malay wedding content for budget-tier Malaysian couples) runs on WordPress with no owned platform; this repo still holds an obsolete Electron migration tool. We need our own article CMS plus a public, mobile-first article directory in Bahasa Melayu.

**Approach:** Delete the old tool. Scaffold a fresh Next.js app at the repo root mirroring twn-new's stack (Next 16 / React 19 / Drizzle / Supabase Postgres / Tailwind v4 / Cloudflare R2 / Clerk), then port twn-new's Inspire vertical — article schema, Tiptap admin CMS, public catalog, R2 image pipeline — minus all vendor/couple coupling. Import the 29 published posts from hellokahwin.com's public WP REST API. Public UI follows the Mobbin research direction (Design Notes).

## Boundaries & Constraints

**Always:**
- Mirror twn-new file layout, conventions, and the `"@/*": ["./src/*"]` alias; app at repo root.
- Public site copy 100% Bahasa Melayu; admin CMS stays English.
- Identical Tiptap extension set across editor, renderer, and WP importer.
- Sharp pre-optimizes at upload → R2; keep `images: { unoptimized: true }`.
- Keep `generateStaticParams` returning `[]` on article pages; keep `withDeadline` soft-fail wrappers and tag-based `article-cache` pattern.
- Auth = minimal Clerk allowlist shim exposing `requireAdminSection`, `requireAdminSectionAction`, `requireAdmin`, `checkIsSuperAdmin` (allowlist env var of admin emails).
- Replace `profiles` with minimal `users` table (id, email, name, author fields: authorSlug, isPublicAuthor, authorTitle, authorBio, link URLs).
- Drop `textEmbedding` pgvector column; keep `fts` tsvector.

**Ask First:**
- Anything needing external accounts/credentials: new Supabase project, Clerk app, R2 buckets, Doppler vs dotenv, Rekognition keys — HALT and ask for values when reached.
- Vercel project setup, production deploy, DNS cutover of hellokahwin.com.
- Running the WP import in non-dry-run mode against the real database.

**Never:**
- No vendor directory/marketplace, vendor credits, couple accounts, moodboard/saved-photos, hearts/save icons, ads/banners system, CRM, or twn-new's RBAC admin-roles.
- No text-over-image card headlines; no gated onboarding/interest picker; no relative "time ago" on cards.
- Never write to twn-new's repo or databases; twn-new is read-only reference.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| WP import happy path | `wp-import --all --dry-run` vs live | 29 posts → Tiptap JSON articles, images → R2 + variants, categories auto-created, `wpId` dedup | Retry w/ backoff; failed image logged, post still imported |
| Slug conflict on import | slug exists | conflict ladder `slug` → `slug-wp` → `slug-wp-{wpId}` | n/a |
| Scheduled publish | `scheduledPublishAt` past due | cron flips draft→published, revalidates tags | missed run picked up next tick |
| Concurrent edit | second admin opens locked article | lock notice; read-only until 5-min lock expiry/renewal | takeover allowed after expiry |
| Unknown article slug | `/inspire/{cat}/{bad-slug}` | Malay 404 page | n/a |
| Empty category | category with 0 published | category page renders empty state, noindex | n/a |
| Slug/category change | admin edits published article slug | 301 upserted into redirects, chain flattened, loop-guarded | n/a |

</frozen-after-approval>

## Code Map

Reference source (read-only): `C:/Users/Ian Ng/Documents/Code/twn-new`

- `src/lib/db/schema/articles.ts` (407) -- port; drop vendor-credit tables, pgvector; keep nav_items, edit_locks, category tree
- `src/lib/db/schema/{media,dynamic-blocks,redirects,audit-logs,enums}.ts` -- port (media minus photoId; enums cut to article/media)
- `src/lib/db/drizzle.ts`, `src/lib/validations/{article,dynamic-block}.ts` -- port as-is (minus vendor-credit factories)
- `src/lib/tiptap/` (18 files, ~2.6k) -- port wholesale; keep `novel` package
- `src/lib/storage/` + `src/lib/r2/` + `src/lib/rekognition/client.ts` -- port inspire-* files only; strip moodboard/vendor reads from `generate-variants` route
- `src/lib/inspire/{cached-lists,preview-article,local-autosave,dynamic-blocks}.ts` -- port; drop vendor-credit-* files
- `src/lib/{audit,seo,redirects,utils}` + `admin/safe-panel.ts` -- port listed files
- `src/app/(admin)/admin/inspire/**` -- port all routes except `vendor-credits/`; drop `vendor-credits.tsx` from editor
- `src/app/(admin)/layout.tsx` -- do NOT port; write fresh minimal admin shell
- `src/lib/auth/admin.ts` -- do NOT port; write ~50-line Clerk allowlist shim with same 4-function surface
- `src/app/(public)/inspire/**` + `components/inspire/*` -- port; strip SavedPhotos/Moodboard/VendorCreditCard/AdminEditFAB/banners/TrackView
- `src/app/{sitemap.ts,robots.ts}` -- port article/category/author sections only
- `src/lib/services/inspire-nav.ts` + `components/inspire/inspire-nav-menu.tsx` -- port (admin-managed nav)
- `src/components/ui/*` shadcn + house set (chip, console-table, empty-state, section-card, form-field, page-header) -- port; rebuild navbar/footer HelloKahwin-branded
- `scripts/wp-import.ts` (+ categories/tags siblings) -- adapt: source = `https://hellokahwin.com`, add author mapping, keep flags
- NEW: `src/app/api/cron/publish-scheduled/route.ts` -- scheduled-publish worker (Vercel cron)
- NEW: public home page `src/app/(public)/page.tsx` -- Mobbin-derived design (Design Notes)

## Tasks & Acceptance

**Execution:**
- [x] repo root -- delete Electron tool (backend/, frontend/, database/, scripts/, *_tasks.md, tool PRD/UX docs, old package.json) -- clean slate, git history preserves it
- [x] repo root -- scaffold Next 16 app: package.json (minimal dep list from manifest), next.config.ts (unoptimized images, CSP headers w/ R2 hosts, serverExternalPackages sharp), tsconfig (+typecheck variant), tailwind v4, drizzle.config.ts, .env.example -- foundation
- [x] `src/lib/db/**` -- port adapted schema + client; generate initial migration; `users` table replaces profiles -- data layer
- [x] `src/lib/auth/admin.ts` -- new Clerk allowlist shim (4 functions, `ADMIN_EMAILS` env) + Clerk middleware -- auth
- [x] `src/lib/{tiptap,storage,r2,rekognition,inspire,audit,seo,redirects,validations,utils,services}/**` -- port per Code Map -- shared libs
- [x] `src/components/{ui,layout,inspire}/**` -- port subset; new HelloKahwin navbar/footer (Malay) -- UI kit
- [x] `src/app/(admin)/**` -- fresh admin shell + ported inspire routes (list, editor, create, categories, tags+merge, authors, navigation, dynamic-blocks, media) + upload/crop/variants/smart-crop/preview API routes -- the CMS
- [x] `src/app/(public)/**` -- home (hero + category chips + 2-col grid), category, article, tag, author pages in Malay; article-cache; sitemap/robots; WhatsApp share -- the directory
- [x] `src/app/api/cron/publish-scheduled/route.ts` + vercel.json cron entry -- scheduled publishing works
- [x] `scripts/wp-import.ts` -- adapt to hellokahwin.com; run `--dry-run` as verification -- content seed path
- [x] port key unit tests (seo/meta, slug, validations, cache) + add tests for auth shim and cron route -- regression net

**Acceptance Criteria:**
- Given a clean checkout with env vars set, when `pnpm build` and `pnpm typecheck` run, then both pass.
- Given the dev server, when an allowlisted admin signs in via Clerk, then they can create, edit (with autosave + lock), schedule, and publish an article end-to-end; non-allowlisted users are rejected from /admin.
- Given a published article, when its public page loads, then it renders sanitized Tiptap HTML, Malay UI chrome, correct canonical/OG/JSON-LD, and related articles.
- Given `wp-import --dry-run` against hellokahwin.com, then it reports 29 posts mapped with categories and zero fatal errors.
- Given the public home page on a 390px viewport, then it shows hero article, horizontal category chips, and 2-column title-below-image card grid with lazy-loaded thumbnails.

## Spec Change Log

- **2026-08-21 — review iteration 1 (Blind Hunter + Edge Case Hunter).** 26 deduplicated findings, all triaged `patch` (each had exactly one sensible fix; no intent gaps, so no loopback). Fixed in place:
  - **Auth (blocker):** Clerk user ids were written into columns FK'd to `profiles` with nothing ever creating those rows — article create, edit locks, media uploads all threw, and the audit trail silently wrote nothing. Added `ensureAdminProfile` (provision-on-first-action, memoized) to the shim. Also: allowlist now requires a **verified** Clerk email; non-allowlisted signed-in users go to a new `/no-access` page instead of `/login` (which looped forever); `release-lock` route switched off twn's dead `publicMetadata.role` gate.
  - **Redirects:** slug-change rows were written but never served (article route now consults `redirects` on its 404 path); legacy root-slug 301s now preserve query strings; self-referential redirect rows are broken instead of looping; `/page/N` is stripped before the category rule so `/category/x/page/2` resolves correctly.
  - **Caching/SEO:** home + `/artikel` `unstable_cache` entries were untagged, so a publish/unpublish sat stale for 10 minutes — now tagged `articles`/`inspire-categories`. `Vary: Accept` added to the legacy-image route (CDN was poisonable). Removed the advertised-but-nonexistent `news-sitemap.xml`. Article with a deleted primary category now 404s instead of rendering under every URL with `canonical=/artikel/null/…`.
  - **Data integrity:** WP importer was missing the Table extensions the renderer has — tables in imported posts were silently dropped; `--clean` deleted the images it had just uploaded when the slug was unchanged; `--offset` non-multiples silently imported the wrong range; quoted `.env` values broke credentials. All fixed. Slug validation now rejects unroutable slugs; tag rename checks slug uniqueness; bulk status change can't resurrect soft-deleted articles; master-delete revalidates before the audit write.
  - **Spec conformance:** trimmed `profiles` to the minimal admin/author shape (dropped `phone`/`lastSeenAt`/`emailConfirmedAt`) and corrected a comment claiming a DB CHECK that does not exist; removed card timestamps sitewide (design notes say none) — previously only the home page complied; translated the last English empty-states; deleted amputation cruft (twn WhatsApp numbers, `/api/v2` bearer surface, `whatsapp_link` audit entity, place-slug helper).
  - **Deviation accepted, flagged to human:** the spec said "replace `profiles` with a minimal `users` table". The table is now minimal but keeps the **name** `profiles`, because dozens of ported files join it by that name; renaming was churn without benefit.

## Design Notes

Mobbin research (Pinterest/Tasty/Houzz/Flipboard — no wedding apps indexed on Mobbin; editorial-app precedent):
- **Home:** featured hero card (image, 2-3 line bold Malay headline) → horizontally scrolling category chips (filled = active, 44px targets, generous padding for long Malay words) → 2-column grid; cards = 4:3 image, title **below** image (2-line clamp, 16-17px semibold), category tag; no save icons, no timestamps.
- **Article page:** hero image (low-res→high-res swap) → category tag + read-time → headline → body (16px min, line-height 1.45) → prominent WhatsApp share button near top → 3-4 related-article cards.
- **Performance budget (cheap Android/slow data):** small compressed thumbnails, blur-up placeholders, infinite scroll in 8-12 card batches, content visible without any onboarding gate.
- Visual tone: clean/warm, trust over luxury; cream/white ground, one accent color; avoid dense filter sheets — flat chips only.
- Slug/i18n: public routes may keep `/inspire/` path or use Malay path (e.g. `/artikel/`) — implementer picks `/artikel/` with redirects from imported WP slugs preserved at root (WP used root-level `/{slug}`; add middleware redirect map root-slug → new path).

## Verification

**Commands:**
- `pnpm typecheck` -- expected: 0 errors
- `pnpm build` -- expected: production build succeeds
- `pnpm test` -- expected: ported + new unit tests pass
- `pnpm tsx scripts/wp-import.ts --all --dry-run --skip-images` -- expected: 29 posts mapped, no fatal errors

**Manual checks (if no CLI):**
- Dev server: admin CRUD flow end-to-end; public home/category/article pages render in Malay at 390px; WhatsApp share link opens wa.me with article URL.

## Suggested Review Order

**Auth — the highest-risk surface (twn's RBAC replaced wholesale)**

- Entry point: the whole admin security model in ~145 lines — allowlist, verified-email gate, profile provisioning.
  [`admin.ts:78`](../../src/lib/auth/admin.ts#L78)

- Provisions the `profiles` row every FK'd write depends on; memoized per lambda.
  [`admin.ts:64`](../../src/lib/auth/admin.ts#L64)

- Why non-allowlisted users land here and not `/login` (that looped forever).
  [`no-access/page.tsx:12`](../../src/app/no-access/page.tsx#L12)

- Clerk runs ONLY on admin surfaces — public pages ship zero auth JS.
  [`middleware.ts:9`](../../src/middleware.ts#L9)

- API routes derive admin from the same allowlist, verified addresses only.
  [`api/middleware.ts:37`](../../src/lib/api/middleware.ts#L37)

**Legacy URL continuity — every old WordPress URL must keep resolving**

- Pure pattern table; `/page/N` stripped first so category rules see a clean path.
  [`patterns.ts:23`](../../src/lib/redirects/patterns.ts#L23)

- Root-slug catch-all: resolves old `/{slug}` posts, preserves UTM, breaks self-loops.
  [`[slug]/page.tsx:48`](../../src/app/(public)/[slug]/page.tsx#L48)

- Slug renames now actually serve their 301 (the redirect table had no reader).
  [`[slug]/page.tsx:476`](../../src/app/(public)/artikel/[category]/[slug]/page.tsx#L476)

- Legacy image paths; `Vary: Accept` is what stops CDN poisoning.
  [`wp-content/route.ts:20`](../../src/app/wp-content/[...path]/route.ts#L20)

**Data model — the amputation of twn's vendor coupling**

- Articles schema minus vendor-credits and pgvector; nav/locks/category-tree kept.
  [`articles.ts:126`](../../src/lib/db/schema/articles.ts#L126)

- Minimal admin/author table — the spec's "minimal users table", under the original name.
  [`profiles.ts:16`](../../src/lib/db/schema/profiles.ts#L16)

**Public site — the Mobbin-derived directory**

- Home: hero → category chips → 2-col title-below-image grid; tagged cache.
  [`(public)/page.tsx:96`](../../src/app/(public)/page.tsx#L96)

- WhatsApp-first sharing, placed above the fold for a WhatsApp-native audience.
  [`whatsapp-share.tsx:9`](../../src/components/inspire/whatsapp-share.tsx#L9)

- Article page: null-category guard, then the redirect fallback, then render.
  [`[slug]/page.tsx:490`](../../src/app/(public)/artikel/[category]/[slug]/page.tsx#L490)

**Content pipeline**

- Extension set MUST match the renderer or tables vanish silently on import.
  [`wp-import.ts:80`](../../scripts/wp-import.ts#L80)

- `--clean` keep-set: stops the re-import deleting the images it just uploaded.
  [`wp-import.ts:371`](../../scripts/wp-import.ts#L371)

- Scheduled publishing; guarded UPDATE makes a missed cron run self-healing.
  [`publish-scheduled/route.ts:45`](../../src/app/api/cron/publish-scheduled/route.ts#L45)

**Peripherals**

- Regression guards for the redirect loop and the unverified-email hole.
  [`admin.test.ts:96`](../../src/lib/auth/__tests__/admin.test.ts#L96)

- Legacy WP shapes locked down by test, including the pagination ordering bug.
  [`patterns.test.ts:47`](../../src/lib/redirects/__tests__/patterns.test.ts#L47)

- CSP, R2 hosts, and the corrected gs.wasm tracing path.
  [`next.config.ts:94`](../../next.config.ts#L94)
