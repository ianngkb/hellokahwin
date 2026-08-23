# Spec — Pillar pages, content-ingest path, single-hop redirects

**Repo:** `ianngkb/hellokahwin` (the LIVE site — Next.js 16 / Drizzle / Supabase / Vercel)
**Worktree:** `C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Branch:** `ianng89/pillars-ingest-redirects` (cut from `master` @ be08556)
**Brief:** `docs/plans/aug-23-2026-session-01/aug-23-2026-brief-pillar-pages-and-ingest.md` (in the OTHER repo — the boardroom folder at `C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin`)
**Status:** ready-for-development
**Date:** 23 Aug 2026

> **HARD CONSTRAINT: NO PRODUCTION DEPLOY, NO PRODUCTION DATA WRITE.**
> Everything is built and verified locally. Pushing the branch is allowed
> (preview only); merging to `master` is a production deploy and is forbidden
> without board approval. Seeding pillar/cluster rows and running ingest
> against Supabase `nyidzlupgmyyazhyykuk` is a production data change and is
> equally forbidden this run. Verification runs against a **local throwaway
> Postgres** (PGlite over TCP on 127.0.0.1:54329).

---

## 0. Facts established before writing this (all observed, none assumed)

| Fact | How it was observed |
|---|---|
| `/hantaran-kahwin/` → 308 `/hantaran-kahwin` → 308 `/artikel/hiasan-dekorasi/hantaran-kahwin` → 200 | `curl -sIL` against production, 23 Aug 2026 |
| The first 308 is Next's own trailing-slash normalisation and fires **before** middleware | `/category/venue/` produced 308 → 301 → 200 while `/category/venue` produced 301 → 200; the middleware pattern rule never saw the slashed form |
| Sitemap lists exactly 3 category hubs: `idea-dan-nasihat`, `real-wedding`, `uncategorized` | fetched `https://hellokahwin.com/sitemap.xml` |
| `/artikel/{hiasan-dekorasi,moden-kontemporari,fotografi-videografi,glamor-eksklusif}` all return 200 **and all emit `<meta name="robots" content="noindex, follow">`** | fetched each page and grepped the meta tag |
| There are **six**, not four, child hubs whose slug appears in a live article URL — the audit's four **plus `minimalis-mewah` and `pantai-santai`** | DB query grouping published articles by primary category |
| Category tree: 3 top-level, 21 children, 0 grandchildren; 29 published articles; 0 rows in `redirects` | DB query against production (read-only) |
| `media` has `caption` / `caption_url` but **no credit, licensor or licence-class column** | `information_schema.columns` for `media` |
| No vendor-credit tables exist in this repo (the code comments referencing them are ported from twn-new) | `find src -name "*vendor*"` returned nothing |
| The derivative pipeline is `src/lib/storage/image-variants.ts` (`generateVariants`) + `src/lib/storage/smart-crop.ts` (named crops), keyed under `inspire/<slug>/…` by `src/app/api/v1/inspire/upload/route.ts` | read the files |
| A push to `master` fires a production deploy (Vercel git connected, prod branch `master`, no `ignoreCommand`) | `_bmad-output/autopilot/decisions.md`, entry dated 2026-08-23 |

**Pillar slugs (from the approved cluster plan) collide with nothing.** None of
the seven appear in the 24 existing category slugs.

---

## 1. Chunk A — Pillars and clusters as first-class categories

### A1. Why categories rather than static routes

`/artikel/<pillar>` is already owned by the dynamic route
`src/app/(public)/artikel/[category]/page.tsx`. Adding static route folders for
the seven pillars would shadow that route and cut the pillars off from the
category system — no automatic article roll-up, no breadcrumbs, no sitemap, no
admin category picker.

So: **a pillar IS a top-level `inspire_categories` row; a cluster IS its child
row.** This is what makes the linking automatic — the brief's hard requirement
("adding an article to a cluster wires the links automatically; hand-maintaining
a link graph across 204 articles will not survive contact with the cadence").

The wiring, with no per-article link maintenance anywhere:

- **Pillar → article (down):** the pillar page reads its own descendants and
  lists every published article under each cluster. Adding an article to a
  cluster makes it appear. No edit to the pillar page, ever.
- **Article → pillar (up):** the article's primary category is the **pillar**,
  so the canonical URL is `/artikel/<pillar>/<slug>`, the breadcrumb already
  points up, and a new explicit editorial "back to pillar" link renders with the
  pillar's **Malay entity phrase** as the anchor text.
- **Article ↔ sibling (sideways):** siblings are derived from the shared cluster
  category, replacing the current "same primary category" related block, which
  under this model would otherwise mean "the whole pillar".

### A2. Schema change (`inspire_categories`)

Add four nullable columns. Nullable is load-bearing: the 24 existing rows
predate the concept and must keep working untouched.

| Column | Type | Purpose |
|---|---|---|
| `pillar_code` | `text` | `P1`…`P7` on a pillar row, `C1.1`…`C7.5` on a cluster row. NULL on legacy rows. Unique when present. |
| `entity_phrase` | `text` | The Malay entity phrase used as anchor text when anything links to this category. Falls back to `name`. |
| `intro` | `text` | The pillar page's editorial introduction (plain text, paragraph per blank line). |
| `is_pillar` | `boolean NOT NULL DEFAULT false` | Marks a top-level pillar row. Drives the pillar rendering and the sitemap rule. |

A cluster row is `parent_id = <pillar>.id`, `is_pillar = false`,
`pillar_code = 'C1.1'`.

Generate a real migration file with `pnpm db:generate` — do **not** rely on
`db:push`. The migration is reviewable and is what the board eventually approves.

### A3. The pillar page rendering

Extend `src/app/(public)/artikel/[category]/page.tsx` rather than forking it, so
one route keeps serving every hub and there is no second code path to drift.
When `category.is_pillar` is true, render the pillar layout instead of the flat
grid:

1. `<h1>` = the pillar name; the `intro` below it.
2. One **section per cluster**, in `display_order`, each with the cluster name as
   an `<h2>`, and inside it a list of every published article whose categories
   include that cluster — as crawlable `<a>` links, not just cards.
3. A cluster with no published articles yet renders its heading and a short
   "akan datang" line. **It must still render** — the pillar page is the map of
   the pillar, and an empty cluster is information.
4. Articles under the pillar but under no cluster get a final "Lain-lain" section
   so nothing is orphaned.
5. `CollectionPage` JSON-LD is already emitted; keep it and add
   `hasPart` entries for the clusters.
6. Everything stays inside the existing `unstable_cache` + `withDeadline`
   discipline used by the rest of this route. New reads get their own cache key
   and reuse the `articles` / `inspire-categories` tags.

### A4. The article page's up-link and sibling links

In `src/app/(public)/artikel/[category]/[slug]/page.tsx`:

- Add a pillar up-link block rendered when the article's primary category is a
  pillar (or a cluster whose parent is one). Anchor text = the pillar's
  `entity_phrase`. This is the inbound-editorial-link requirement made
  structural rather than manual.
- Change the related-articles query from "same primary category" to "same
  **cluster** when the article has one, falling back to same primary category".
  Keep the existing deadline/cache/soft-fail behaviour exactly.

### A5. Sitemap

Two changes to `src/app/sitemap.ts`:

1. **Include a child category hub when it is a real indexable URL** — i.e. when
   it is the primary category of at least one published article, which is
   exactly when its slug appears in a live article URL. That is the six hubs
   observed above, not four. Report the discrepancy; do not silently pick four.
2. **Exclude any category hub with zero published articles.** Today a top-level
   hub with no articles would be listed while `generateMetadata` emits
   `noindex` — advertising a noindex URL in a sitemap is a Search Console
   error. This rule is what makes it safe to create seven empty pillar rows.

### A6. The noindex problem — MUST be fixed in the same change

Listing the six hubs in the sitemap while they emit `noindex, follow` would be
strictly worse than today. `generateMetadata` currently noindexes **every** row
with a `parent_id`. Narrow that rule: a child category is noindex only when it
is **not** the primary category of any published article. A child hub that owns
live article URLs is a real destination and is indexable.

This changes no URL. It changes an indexing directive on six pages that today
return 200. Flag it in the ship report as the one behavioural change to
production SEO.

### A7. The seed script

`scripts/seed-pillars.ts` — idempotent, `--dry-run` by default, requires
`--commit` to write, refuses to run against a database whose host is not
explicitly allow-listed on the command line.

- Requires an explicit `--db`; refuses to WRITE to a non-local host without
  `--i-know-this-is-remote`. It will still CONNECT to a remote host to print a
  dry-run plan, deliberately — seeing the plan against production before
  approving the write is the safest thing this script does.
- Upserts the 7 pillars and 26 clusters from a checked-in data file
  (`src/lib/inspire/pillars.ts`) keyed on `slug`.
- Never touches a row it did not create (matched by `pillar_code`).
- Never reparents or deletes an existing category.
- Prints a plan of exactly what it would insert/update before doing it.

**The seed is NOT run against production this run.**

### A8. The pillar/cluster data

Seven pillars, exactly as approved in
`aug-23-2026-clusters-launch-plan.md`:

| Code | Slug | Name | Entity phrase |
|---|---|---|---|
| P1 | `nikah-undang-undang` | Nikah & Undang-undang | nikah dan undang-undang perkahwinan |
| P2 | `hantaran-mas-kahwin` | Hantaran & Mas Kahwin | hantaran dan mas kahwin |
| P3 | `ucapan-doa` | Ucapan, Doa & Adab Majlis | ucapan dan doa perkahwinan |
| P4 | `busana-pengantin` | Busana & Penampilan Pengantin | busana pengantin |
| P5 | `pelamin-kad-cenderahati` | Pelamin, Kad & Cenderahati Majlis | pelamin, kad kahwin dan cenderahati |
| P6 | `venue-perancangan` | Venue, Kos & Perancangan | venue dan perancangan perkahwinan |
| P7 | `sebelum-nikah` | Sebelum Nikah: Jodoh, Merisik & Tunang | sebelum nikah |

Twenty-six clusters, with the head keyword from the plan as the entity phrase:

| Code | Pillar | Name | Entity phrase (head keyword) |
|---|---|---|---|
| C1.1 | P1 | Borang & pendaftaran nikah | borang nikah |
| C1.2 | P1 | Rukun, syarat & sah nikah | rukun nikah |
| C1.3 | P1 | Kursus kahwin & saringan pra-nikah | kursus kahwin |
| C1.4 | P1 | Soal-jawab hukum nikah | nikah siri |
| C2.1 | P2 | Hantaran kahwin | hantaran kahwin |
| C2.2 | P2 | Hantaran tunang | hantaran tunang |
| C2.3 | P2 | Gubahan & dulang hantaran | dulang hantaran |
| C2.4 | P2 | Mas kahwin ikut negeri | mas kahwin ikut negeri |
| C2.5 | P2 | Nisbah dulang, duit hantaran & etika | duit hantaran |
| C3.1 | P3 | Ucapan pengantin baru | ucapan pengantin baru |
| C3.2 | P3 | Doa perkahwinan | doa pengantin baru |
| C3.3 | P3 | Ulang tahun perkahwinan, pantun & adab tetamu | ucapan ulang tahun perkahwinan |
| C3.4 | P3 | Aturcara & pengacara majlis | aturcara majlis perkahwinan |
| C4.1 | P4 | Baju pengantin: nikah, sanding & songket | baju nikah |
| C4.2 | P4 | Inai, solekan & aksesori pengantin | inai pengantin |
| C5.1 | P5 | Pelamin | pelamin |
| C5.2 | P5 | Kad kahwin & jemputan | kad jemputan kahwin |
| C5.3 | P5 | Dekorasi, khemah & tema majlis | khemah kenduri |
| C5.4 | P5 | Doorgift, bunga telur & hadiah kahwin | goodies kahwin |
| C6.1 | P6 | Dewan & venue majlis | dewan majlis perkahwinan |
| C6.2 | P6 | Kos, bajet & checklist perkahwinan | checklist kahwin |
| C7.1 | P7 | Jodoh, taaruf & istikharah jodoh | taaruf |
| C7.2 | P7 | Merisik & meminang | merisik |
| C7.3 | P7 | Cincin tunang, nikah & merisik | cincin tunang |
| C7.4 | P7 | Majlis pertunangan & doa | doa majlis pertunangan |
| C7.5 | P7 | Adat perkahwinan Melayu & mandi bunga | mandi bunga |

Cluster slugs are derived from the name (lowercase, `&`→`dan`, non-alphanumerics
→ `-`) and are checked at build time for collisions with the 24 existing slugs.

**No existing category is renamed, reparented, or deleted.** The seven pillars
are added alongside the current tree. Whether and how the legacy categories fold
into the pillars is an editorial decision for the CEO, not an engineering one —
name it in the report as an open question.

---

## 2. Chunk B — The content-ingest path

### B1. What "an approved article file" is

Per `aug-23-2026-workflow-content-production.md` Stage 7, ingest is the step
after SEO QC. Define the artefact it consumes: **one Markdown file with YAML
front matter.** Markdown because that is what the writers already produce;
front matter because every field ingest needs is metadata, not prose.

```yaml
---
title: Mas kahwin ikut negeri 2026
slug: mas-kahwin-ikut-negeri-2026
pillar: P2
cluster: C2.4
metaDescription: <=160 chars, required
excerpt: optional
author: <profiles.id or email>
status: draft | published
publishedAt: 2026-08-25T00:00:00Z   # optional
tags: [mas kahwin, nikah]
cover:
  file: ./images/01-dulang-mas-kahwin.jpg
  alt: Dulang mas kahwin berhias di atas meja akad
  credit: Foto oleh Studio Aisyah          # REQUIRED — ingest refuses without it
  creditUrl: https://studioaisyah.my        # optional, rendered as a FOLLOWED link
  licenseClass: V                            # REQUIRED — V|C|O|S|G
  licensorName: Studio Aisyah Sdn Bhd        # REQUIRED
images:
  - file: ./images/02-...
    alt: ...
    credit: ...
    licenseClass: ...
    licensorName: ...
internalLinks:                                # optional; validated, never invented
  - slug: hantaran-kahwin
    anchor: hantaran kahwin
---
```

### B2. The image-credit rule (owner-level)

Two halves, both required by the brief:

1. **Schema.** Add to `media`: `credit text`, `credit_url text`,
   `license_class text` (V/C/O/S/G per the approved visual-asset strategy §3.1),
   `licensor_name text`. All nullable in the DB — 682 legacy rows have none and
   a NOT NULL would make the migration destructive.
2. **Ingest refuses.** The validator rejects the whole file — no partial write —
   if any referenced image is missing `credit`, `licenseClass` or
   `licensorName`, naming the offending image and field. This is a hard gate,
   not a warning, and it is covered by a test that asserts the refusal.

The credit renders on the page: under the cover image and under each in-article
image, and `creditUrl` renders as a **followed** link (the approved strategy is
explicit that a nofollow credit is worth much less to the vendor, and vendor
goodwill is what supplies the programme).

### B3. The ingest script

`scripts/ingest-article.ts`, run with `pnpm ingest <file.md>`:

1. **Parse and validate** the front matter with a Zod schema. Every failure is
   collected and reported together; nothing is written until all pass.
2. **Resolve pillar and cluster** by `pillar_code`. Unknown code → refuse.
3. **Check the slug** — unique across `articles`; if the slug exists, refuse
   unless `--update` is passed.
4. **Upload images** through the EXISTING pipeline — `generateVariants` and the
   smart-crop generator, under the established `inspire/<article-slug>/…` key
   prefix. Do not write a second uploader; call what already runs. Insert a
   `media` row per image with the credit fields populated.
5. **Convert Markdown → TipTap JSON** using the repo's existing TipTap schema
   (`@tiptap/html` is already a dependency), so the article renders through the
   same `ArticleRenderer` as everything else.
6. **Validate internal links** — every `internalLinks[].slug` must resolve to a
   published article. An unresolvable link refuses the file rather than
   publishing a dead link.
7. **Insert** the article + `article_categories` rows (pillar AND cluster) +
   `article_tags` + `media_article_usage`, in ONE transaction.
8. **Revalidate** the `articles` and `inspire-categories` cache tags.
9. `--dry-run` is the default. `--commit` writes. The database host must be
   passed explicitly; there is no implicit production default.

### B4. What ingest deliberately does not do

It does not publish BY DEFAULT. A file may carry `status: published`, but only
an explicit `--publish` flag honours it; otherwise the article lands as a draft
and the run says so. Making publication impossible would leave the ingest path
unable to do the job it exists for — Stage 7 of the production workflow is
"ingest and publish" — so the gate is an explicit, typed, logged act rather
than an absence.

It does not invent metadata — a missing `metaDescription` is a refusal, not a
generated string.

---

## 3. Chunk C — One-hop redirects

### C1. The mechanism

Set `skipTrailingSlashRedirect: true` in `next.config.ts`. That hands
trailing-slash handling to middleware, which is the only place that can collapse
the two hops into one.

Then in `src/middleware.ts`, before anything else, when the path ends in `/`
(and is not the bare root):

1. `stripped = normalizePathname(pathname)`
2. If `getPatternRedirect(stripped)` matches → **301 straight to the pattern's
   destination**. (`/category/venue/` becomes one hop to `/artikel/venue`
   instead of today's two.)
3. Else if `stripped` looks like a legacy root slug (`^/[a-z0-9][a-z0-9-]*$`)
   → **rewrite** (not redirect) to `stripped`, so the `[slug]` route resolves
   the article and issues the single 308 to `/artikel/<cat>/<slug>`. Net: one
   redirect for the highest-traffic legacy shape on the site.
4. Else → 308 to `stripped`, preserving today's behaviour for everything else
   (`/artikel/`, `/artikel/kategori/slug/`, API paths…).

Query strings are preserved in every branch, matching what the route layer
already does for UTM parameters.

### C2. The cost, stated honestly

With `skipTrailingSlashRedirect` on, Next no longer normalises anything —
middleware owns it completely. Any path the middleware matcher excludes
(`_next`, static assets, `robots.txt`, `sitemap.xml`) will now serve at both the
slashed and unslashed form instead of redirecting. Those are all non-indexable
asset paths, so the SEO cost is nil, but it must be tested, not assumed.

Branch 3's one wrinkle: an **unknown** slug with a trailing slash now 404s at
`/unknown/` rather than 308-ing to `/unknown` and 404-ing there. A 404 either
way; no indexable URL changes.

### C3. Tests

Extend `src/lib/redirects/__tests__/` with the trailing-slash decision function
extracted as a pure, unit-testable function (`resolveTrailingSlash(pathname)`)
so the middleware stays thin and the logic is covered:

- `/dewan-kahwin/` → rewrite to `/dewan-kahwin`
- `/category/venue/` → 301 to `/artikel/venue`
- `/artikel/idea-dan-nasihat/` → 308 to `/artikel/idea-dan-nasihat`
- `/artikel/idea-dan-nasihat/dewan-kahwin/` → 308 (no slash)
- `/` → no action
- `//dewan-kahwin//` → collapses correctly
- query strings survive all branches

---

## 4. Verification — what must actually be observed

No claim ships that was not run. The gate for this spec:

| # | Check | How |
|---|---|---|
| V1 | `pnpm typecheck` clean | run it |
| V2 | `pnpm lint` clean | run it |
| V3 | `pnpm test` green, including the new redirect and ingest-refusal tests | run it |
| V4 | `pnpm build` completes — **including static prerender**, which the previous run could not do | against the local PGlite DB seeded from a snapshot of production's categories + articles |
| V5 | `/hantaran-kahwin/` returns exactly **ONE** redirect to `/artikel/hiasan-dekorasi/hantaran-kahwin` | `curl -sIL` against `next start` on the local DB; count the 3xx hops |
| V6 | All seven pillar pages return 200 and each lists its clusters | curl + grep each `/artikel/<pillar>` |
| V7 | An article seeded into a cluster appears on its pillar page with no code change, and the article page links back up with the entity phrase as anchor | ingest a fixture article locally, then re-fetch both pages |
| V8 | Ingest **refuses** a file whose image has no credit, and writes nothing | run it and assert the DB row count is unchanged |
| V9 | The sitemap contains the six real child hubs and the seven pillars, and contains **no** URL that emits `noindex` | fetch `/sitemap.xml` locally, then fetch every URL in it and check its robots meta |
| V10 | No secret appears in the diff | `git diff` scan before commit |

V9 is the check that would have caught the "add four hubs to the sitemap"
instruction being subtly wrong, so it is not optional.

---

## 5. Out of scope this run (name them, do not build them)

- The full asset register from the visual-asset strategy §3.2 (licence evidence,
  grant dates, expiry, takedown log). Four credit columns are built; the
  register is a separate approved plan and belongs outside the CMS by design.
- Folding the 24 legacy categories into the seven pillars — editorial decision.
- The venue directory.
- AVIF derivatives (the strategy asks for AVIF; the pipeline emits WebP).
  Extending the existing pipeline to AVIF is a real item — name it, do not
  smuggle it in.
- Anything requiring the Cloudflare **admin** API (CORS, lifecycle, bucket
  creation). Vault `cloudflare.twn` is invalid; the brief says stop and report
  rather than work around it. Nothing in this spec needs it — object-level R2
  keys cover the derivative pipeline.
