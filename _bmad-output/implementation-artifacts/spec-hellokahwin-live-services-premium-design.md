---
title: 'HelloKahwin — live services wiring + premium monotone design pass'
type: 'feature'
created: '2026-08-22'
status: 'verified'
review_loop_iteration: 1
baseline_commit: 'ea684be'
predecessor_spec: 'spec-hellokahwin-cms-directory.md'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The HelloKahwin CMS and public Malay article directory are built and
committed (see `spec-hellokahwin-cms-directory.md`, status `done`), but nothing is
wired to a real service: no database connection, no Clerk instance, no R2 bucket,
no content. And the public front end, while functional, still wears twn-new's
"Plum Forward" styling — it does not read as the classy, premium, editorial
publication Ian wants.

**Approach:** Two goals in one pass.

1. **Wire live services and verify end-to-end.** Resolve every credential from the
   token vault into a gitignored `.env.local`, confirm the migrations against the
   live Supabase project, create the R2 buckets, run the WordPress import for
   real, and take the Clerk production instance as far as the environment allows.
2. **Premium monotone design pass** on the public surface only — home, artikel
   hub, category, article, tag, author, 404 — driven by Mobbin research with
   theweddingnotebook.com as the brief. Mobile-first: the audience is mostly
   low-end Android on slow data.

## Boundaries & Constraints

**Always:**
- Secrets come from `~/.claude/skills/tokens/vault.ps1`; runtime values land only
  in `.env.local` (gitignored). No secret is ever printed or committed.
- Only Supabase project ref `nyidzlupgmyyazhyykuk`. twn-new's `dgrhoxcacbpdfcvwxrto`
  and TWN-Dev's `mwqnhmzukrflexvewjmd` are untouchable.
- Keep every existing SEO, redirect and caching behaviour intact — legacy WP URL
  301/308s, canonical/OG/JSON-LD, `unstable_cache` tags, ISR windows.
- Public copy stays 100% Bahasa Melayu. Admin CMS stays English.
- The design layer is scoped to the public shell; the admin console keeps its own
  palette. Restyling admin is out of scope beyond what is free.
- Zero webfont bytes: system font stacks only.

**Ask First:**
- Vercel project setup; any production deploy; DNS cutover of hellokahwin.com away
  from WordPress; any surprising or destructive data migration.

**Never:**
- No text-over-image card headlines. No save/heart icons. No timestamps on cards.
- No new colour: the public palette is one neutral ink-on-paper ramp.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Credential resolution | vault keys present | `.env.local` written, nothing echoed | missing key → halt, escalate |
| DB migrations | live project, fresh DB | schema present, `drizzle.__drizzle_migrations` = 2 | already applied → no-op |
| WP import | 29 published posts | articles + categories + author created, idempotent on `wpId` | image upload denied → post still imported |
| Clerk production sign-in | `pk_live_` key | Clerk JS loads from `clerk.hellokahwin.com` | host absent from CSP → blank page (fixed); host absent from DNS → escalate |
| Admin gating, signed out | `GET /admin` | 307 → `/login` | n/a |
| Legacy WP URL | `/{wp-slug}`, `/category/x`, `/tag/x`, `/feed` | 308/301 to the `/artikel/**` equivalent | unknown slug → Malay 404 |
| Public page, any viewport | 390px and 1440px | monotone editorial layout, headline never over the photograph | missing cover → "Tiada gambar" plate |
| Category rail, imported taxonomy | most depth one level down | rail lists every category with articles, busiest first, capped at 10 | zero categories → rail omitted |

</frozen-after-approval>

## Code Map

**Services / operations (no repo code):**
- Supabase `nyidzlupgmyyazhyykuk` — migrations already applied; DB password rotated
  via the Management API and vaulted as `supabase.hellokahwin-dbpass`.
- Cloudflare R2 (playbase account `adf542cb…`) — buckets `hellokahwin-images` and
  `hellokahwin-assets` created, public `r2.dev` URLs enabled.
- Clerk production instance `ins_3IEa91…` — 5 CNAMEs required on hellokahwin.com.

**Design layer:**
- `src/app/globals.css` — NEW `.hk-public` Editorial Monotone block: token
  override, type primitives (`hk-eyebrow`, `hk-display`, `hk-deck`, `hk-meta`,
  `hk-rule`, `hk-btn`, `hk-btn-ghost`, `hk-chip`, `hk-card-title`, `hk-measure`)
  and a corrected `.inspire-prose` reading scale.
- `src/app/(public)/layout.tsx` — applies `.hk-public`.
- `src/components/layout/{navbar,footer}.tsx` — masthead + colophon, rewritten.
- `src/components/inspire/article-card.tsx` — square plate, serif title below.
- `src/app/(public)/page.tsx` — lead plate with headline below the image, flat
  category rail, 2-col grid.
- `src/app/(public)/artikel/page.tsx` — lead + two supporting stories, hairline
  section rules, flattened bottom category rail.
- `src/app/(public)/artikel/[category]/[slug]/page.tsx` — cover plate carries no
  type; centred header below; share row between hairlines; Malay related-heading.
- `src/components/inspire/article-cover-mobile.tsx` — headline on paper, save
  icon removed, Malay labels.
- `src/app/(public)/artikel/{[category],tag/[slug],author/[slug]}/page.tsx` —
  centred archive headers, unified grids, Malay copy.
- `src/app/not-found.tsx`, `src/components/inspire/whatsapp-share.tsx` — restyled.
- `src/lib/services/inspire-nav.ts` — NEW `getMastheadCategories()` fallback.

**Correctness fixes found during the pass:**
- `next.config.ts` — CSP now derives Clerk's Frontend API host from the
  publishable key. Without it a `pk_live_` instance is blocked outright.
- `package.json` — dev port 4100 → 3200 (4095–4194 is a Windows-reserved range).
- `.prettierrc` / `.prettierignore` — never ported from twn-new, so `pnpm lint`
  could not pass. Restored; 32 drifted files formatted.

## Tasks & Acceptance

**Execution:**
- [x] Resolve Clerk / Supabase / R2 credentials from the vault into `.env.local`
- [x] Rotate + vault the Supabase DB password; verify the pooler connection
- [x] Confirm migrations against the live DB (2 applied, 18 public tables)
- [x] Run the WP import against the live DB (29/29 published, 15 categories,
      images to R2, zero duplicates)
- [x] Clerk: allowlist env, middleware, `/admin` gating verified signed-out
- [x] Clerk: CSP fix for the production Frontend API host
- [x] Clerk: 5 production CNAMEs added on hellokahwin.com (DNS-only)
- [x] Clerk: production instance ACTIVE — dedicated cert `CN=clerk.hellokahwin.com`
      deployed, FAPI `/v1/environment` returns real JSON (email + oauth_google)
- [ ] Clerk: interactive sign-in — NOT provable from this machine. The production
      instance rejects every local origin with `origin_invalid`; it needs the app
      served from hellokahwin.com (see Verification)
- [x] R2: buckets created in the TWN account, custom domains `images.` /
      `assets.hellokahwin.com` attached and `ssl=active`
- [x] R2: 29 covers + 594 inline images uploaded with variants and saliency
      smart crops; 1985 objects (623 originals / 1246 variants / 116 crops)
- [x] Verification fixtures removed; live DB holds only real imported content
- [x] Vercel Production env verified byte-identical to `.env.local` (all 15 vars)
- [x] Editorial Monotone design layer + all seven public page types
- [x] Malay copy sweep on the public surface
- [x] Build gate green

**Acceptance Criteria:**
- Given `pnpm typecheck`, `pnpm test`, `pnpm lint` and `pnpm build`, all four pass.
- Given the dev server on :3200 with `.env.local`, the home, hub, category,
  article, tag, author and 404 pages render the monotone editorial design at both
  390px and 1440px, in Malay, with real imported content.
- Given a signed-out request to `/admin`, the response is a 307 to `/login`.
- Given a legacy WordPress URL, the response is the same 301/308 as before the
  design pass.
- Given a `pk_live_` publishable key, the CSP `script-src` contains that
  instance's Frontend API host.

## Design Notes

**Direction — "Editorial Monotone".** Mobbin research 2026-08-22 (web: Julienne,
Ghost, Codecademy; iOS: NYTimes, UNIQLO LifeWear, Matter), brief:
theweddingnotebook.com. The precedent that landed is Julienne + UNIQLO LifeWear:
a centred serif wordmark, enormous whitespace, a photograph carrying the page and
type that never sits on top of it.

**Rules the layer enforces:**
- One neutral ramp. Chroma capped at 0.004 — warm paper, not a screen, but
  monotone by any practical measure. Ink is the only "brand colour".
- Serif is the reader's voice (headlines, card titles, body, decks). Sans is the
  interface's voice (eyebrows, meta, buttons, chips) — always small, uppercase,
  widely tracked.
- Hairlines, never boxes. No shadow, no rounded corner, no pill. Section headings
  are a small-caps label between two rules.
- Type never sits over a photograph. Every hero, cover and card sets the headline
  below the plate — better contrast on a cheap screen in daylight, and the
  wedding photography stays whole.
- Reading column ~68 characters; body 17px/1.7. The ported `.inspire-prose` was
  14px/1.5, which failed the predecessor spec's own 16px legibility floor.
- Touch targets ≥44px; the category rail scrolls horizontally rather than hiding
  behind a hamburger.
- Zero webfont bytes.

## Verification

**Commands:**
- `pnpm typecheck` — 0 errors
- `pnpm test` — 112/112
- `pnpm lint` — eslint 0 errors, prettier clean
- `pnpm build` — succeeds

**Evidence:** `_bmad-output/implementation-artifacts/screens/` — `before-*` and
`after-*` at 390px and 1440px for home, hub, category, article, tag, author, 404
and login, against the live database.

**Manual checks:** `/admin` → 307 `/login`; legacy `/x` 308, `/category/x` 301,
`/tag/x` 301, `/feed` 301; `/login` fails only on `ERR_NAME_NOT_RESOLVED` for
`clerk.hellokahwin.com` (the escalated DNS item), no CSP violation.

## Spec Change Log

- **2026-08-22 — review iteration 1 (codex-reviewer, GPT-5.6 Sol, high reasoning).**
  Five findings, all patched in `180e796`, re-reviewed clean (NO_FINDINGS):
  - **Blocker:** the masthead is in the public layout, so an unhandled throw from
    its category query 500s every public page rather than losing the nav. Now
    `withDeadline(3s)` + catch, degrading to an empty rail.
  - **Major:** both category rails rolled their own subtree arithmetic and both
    under-counted deep branches. Extracted one recursive, memoised, cycle-guarded
    walk (`src/lib/inspire/category-tree.ts`) with 6 unit tests.
  - CSP `frame-src` narrowed below `script-src`; `*.clerk.com` is a CDN origin and
    is no longer frameable.
  - `--muted-foreground` measured at 5.80:1, not the claimed ~7:1 — moved to
    oklch 0.46 (6.89:1). It is the colour of every small label on the site.
  - Dead `coverImageSaved`/`hideMoodboard` props and their last caller removed.
  - Unprompted polish in the same commit: the card eyebrow shows one category
    (line-clamping a list cut mid-word and left a dangling separator), and the
    category page's subcategory filters became `hk-chip`s so the site has one
    filter affordance.

## Handover state (2026-08-22, end of worker run)

**Ship-ready except for two Cloudflare permissions.** Gate green, review clean,
Vercel Production env verified, live DB clean.

What is live and verified:
- Supabase `nyidzlupgmyyazhyykuk`: 2 migrations, 18 tables, 29 published
  articles, 15 categories, 0 tags, 0 public authors — real imported content only.
- Vercel project `hellokahwin` (team `thewednotebook`), Production env carries
  all 15 variables, each byte-identical to `.env.local` (compared by SHA-256
  fingerprint, values never printed). Git intentionally not connected.
- Clerk backend reachable with the production secret key; `/admin` gates to
  `/login`; the CSP now carries the production Frontend API host.

What is blocked, and precisely why:
- Vault token `cloudflare.hellokahwin` (CF token id
  `81c43eae2e12c78bb3e9a1f6c036bbb2`, name "master-token", TWN account) holds
  **only Read permission groups** — verified by introspecting the token itself.
  Both remaining tasks need one Edit group each:
  - Zone → DNS Write, group id `4755a26eedb94da69e1066d98aa820be`, on
    `hellokahwin.com` — for the 5 Clerk CNAMEs.
  - Account → Workers R2 Storage Write, group id
    `bf7481a1826f439697cb59a20b22293e` — to create the two buckets and attach
    their custom domains.
- The playbase-account buckets are deliberately NOT deleted yet: the ruling
  assumed TWN replacements would exist first, and they do not.

Screenshots note: `after-tag-*` and `after-author-*` were captured while the
temporary tag/author fixtures existed. The real imported content has no tags and
no public author, so those two routes correctly 404 today; the screenshots stand
as design evidence for when that content exists.

## Clerk verification — what is and is not proven

**Proven, against the live production instance:**
- Instance `ins_3IEa91…` is active and production: `GET /v1/instance` returns
  `environment_type: production`; the Backend API authenticates with the vaulted
  secret key.
- The custom hostname is deployed: TLS on `clerk.hellokahwin.com` presents a
  dedicated `CN=clerk.hellokahwin.com` certificate (SAN exactly that host), and
  `GET /v1/environment` returns real configuration JSON — email + password with
  `oauth_google`. The earlier Cloudflare Error 1000 is gone.
- All five CNAMEs resolve and remain DNS-only; the WordPress A records are
  untouched, so hellokahwin.com still serves the old site.
- The CSP carries the instance's Frontend API host, derived from the publishable
  key — without it clerk-js is blocked outright.
- `/admin` signed-out returns 307 to `/login`, verified over both HTTP and a
  `hellokahwin.com` subdomain origin; the browser follows it to `/login`.
- The allowlist shim is covered by 11 unit tests: case-insensitive matching,
  closed when `ADMIN_EMAILS` is unset, UNVERIFIED addresses ignored, any verified
  address (not just primary) matched, signed-out → `/login`, signed-in but not
  allowlisted → `/no-access`, profile row provisioned as the FK target, and the
  action variants returning errors rather than redirecting.

**NOT proven, and why:** the Clerk sign-in UI never mounts locally. Every
clerk-js call returns HTTP 400 `origin_invalid` — "The Request HTTP Origin header
must be equal to or a subdomain of the requesting URL". A `pk_live_` instance
only accepts origins under its own domain. Three approaches were tried and all
rejected: `http://localhost:3200`, `http://local.hellokahwin.com:3200` (Chromium
`--host-resolver-rules`, no hosts-file change), and the same over HTTPS with a
generated cert. So the following are untested end-to-end: the rendered sign-in
form, an actual credential round-trip, and the signed-in allowlisted path
through `requireAdmin` into `/admin`. The instance has zero users, so no actor
token could be minted either. Two ways to close this, both Ian's call: deploy to
hellokahwin.com (or a Vercel domain registered with the instance) and sign in
there, or add the dev origin to the instance's `allowed_origins` — deliberately
not done here, as it loosens origin restriction on a production auth instance.
The `after-login-*.png` screenshots therefore show the blocked local state, not
a defect in the app.
