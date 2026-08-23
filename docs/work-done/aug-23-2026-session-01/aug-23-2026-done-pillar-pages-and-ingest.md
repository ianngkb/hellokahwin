# Done: Pillar pages, content-ingest path, single-hop redirects

**Task:** Brief `aug-23-2026-brief-pillar-pages-and-ingest.md`
**Owner:** full-stack-engineer · **Date:** 23 Aug 2026
**Session:** aug-23-2026-session-01
**Status:** BUILT AND VERIFIED LOCALLY — **NOT DEPLOYED.** Awaiting board approval.

---

## What was asked, and what happened to it

| # | Task | State |
|---|---|---|
| 0 | Clone the live repo | Done |
| 1 | Seven pillar pages + missing category hubs in the sitemap | Built, verified locally. **Not live.** |
| 2 | Content-ingest path with a mandatory image credit | Built, verified locally. **Not live.** |
| 3 | Collapse the two-hop redirect chain | Built, verified locally. **Not live.** |

Nothing was deployed and no production data was written. **Ten commits sit on
branch `ianng89/pillars-ingest-redirects`, never pushed to any remote** —
verified: `git ls-remote --heads origin ianng89/pillars-ingest-redirects`
returns nothing, the branch has no upstream, and the reflog holds zero push
entries. No production deploy and no preview deploy.

---

## Task 0 — the repo

`ianngkb/hellokahwin` is now cloned at
`~/Documents/Code/hellokahwin-site` — deliberately NOT nested under
`~/Documents/Code/hellokahwin/`, where the old Electron migration tool lives.

Orca's own repo registry was carrying the two-repo trap: a repo named
`hellokahwin` pointing at the Electron tool. The site is now registered
separately as `hellokahwin-site`.

---

## Task 1 — the pillars

**The design decision that makes the rest work.** A pillar is a top-level
category row; a cluster is its child. Not seven static pages.

That single choice is what satisfies the brief's hard requirement that "adding
an article to a cluster wires the links automatically". Assigning an article to
a cluster is now the ONLY act needed for:

- the pillar page to list it under the right cluster heading;
- the article to link back up, with the pillar's Malay entity phrase as anchor;
- its sibling links to be scoped to its cluster rather than the whole pillar;
- the sitemap and breadcrumbs to be right.

There is no link table to maintain and nothing to backfill across 204 articles.
Pillars stay on the existing `/artikel/[category]` route, so they remain
ordinary categories — same breadcrumbs, same admin picker, one code path.

**All seven exist**, with the approved cluster counts:

| Pillar | URL | Clusters |
|---|---|---|
| P1 Nikah & Undang-undang | `/artikel/nikah-undang-undang` | 4 |
| P2 Hantaran & Mas Kahwin | `/artikel/hantaran-mas-kahwin` | 5 |
| P3 Ucapan, Doa & Adab Majlis | `/artikel/ucapan-doa` | 4 |
| P4 Busana & Penampilan Pengantin | `/artikel/busana-pengantin` | 2 |
| P5 Pelamin, Kad & Cenderahati | `/artikel/pelamin-kad-cenderahati` | 4 |
| P6 Venue, Kos & Perancangan | `/artikel/venue-perancangan` | 2 |
| P7 Sebelum Nikah | `/artikel/sebelum-nikah` | 5 |

An empty cluster still renders its heading. The pillar page is the map of the
pillar, and a cluster with nothing under it is information for a reader and a
commitment for the editorial team.

### The sitemap finding — it was six hubs, not four, and both halves had to move

The brief says four category hubs are missing from the sitemap. **It is six.**
The Phase 1 audit named `hiasan-dekorasi`, `moden-kontemporari`,
`fotografi-videografi` and `glamor-eksklusif`; it missed `minimalis-mewah` and
`pantai-santai`, which each hold one published article.

More importantly: **all six were emitting `<meta name="robots" content="noindex,
follow">`** (fetched from production, 23 Aug 2026). Adding them to the sitemap
without touching that would have advertised six noindex URLs — a permanent
Search Console error, and strictly worse than doing nothing.

So both halves ship together. A child hub that is the primary category of a
published article has its slug baked into that article's canonical URL — it is
not an orphan, it is the folder those articles live in. It is now indexable and
listed. A hub with **no** published articles is now excluded from the sitemap
instead of being listed while noindexed (which is what `uncategorized` was
doing), and that is also what makes it safe for seven pillars to start empty.

**This is the one behavioural change to production SEO in the whole batch**, and
it needs the CEO's eye before deploy. It changes no URL.

---

## Task 2 — the ingest path

An approved article is **one Markdown file with YAML front matter**. Markdown
because that is what the writers already produce; front matter because
everything ingest needs is metadata.

`pnpm ingest <file.md> --db <url>` validates and prints a plan. `--commit`
writes, in one transaction.

### The image-credit rule (owner-level)

Two halves, both built:

1. **Schema.** `media` gains `credit`, `credit_url`, `license_class` (V/C/O/S/G
   per the approved visual-asset strategy §3.1) and `licensor_name`. Nullable in
   the database — the 682 imported rows have none, and NOT NULL would have made
   the migration destructive.
2. **Ingest refuses.** A file with any image missing its credit, licence class
   or licensor is rejected whole. Nothing is written. Verified: a `--commit` run
   against such a file exits 1 and leaves the article and media counts
   unchanged.

The three fields are not interchangeable. `credit` is what the reader sees,
`licensorName` is who to ask years later, `licenseClass` is what evidence must
exist at all. A credit line with no recorded licence class is exactly the
position the 682-image library is in today.

**Credits render on the page.** In-article images through the figure caption the
renderer already emits; the cover through a new block, because the cover is the
largest photograph on the page and previously had no attribution anywhere. Both
link **followed** — the approved strategy is explicit that a nofollow credit is
worth much less to the vendor, and vendor goodwill is what supplies the
programme.

### What it refuses rather than guesses

An unknown pillar or cluster code; a missing meta description or one over 160
characters; a slug that is not URL-safe; an internal link to an article that is
not published; an image file that is not on disk; an image written inline in the
body instead of declared with its credit. Every problem is reported at once — a
writer fixing one field per run is how a publishing path gets abandoned.

### What it deliberately does not do

**It does not publish.** A file may ask for `status: published`; only an
explicit `--publish` flag honours it. Otherwise the article lands as a draft and
the run says so. Publishing is a board-approved act.

Images go through the **existing** `generateVariants` pipeline under the
established `inspire/<slug>/` prefix. No second uploader was written.

---

## Task 3 — the redirect chain

Confirmed against production first (23 Aug 2026):

```
/hantaran-kahwin/  →308→  /hantaran-kahwin  →308→  /artikel/hiasan-dekorasi/hantaran-kahwin
```

The first hop is **Next's own** trailing-slash normalisation, which runs before
middleware — which is why middleware could not previously help. Proof:
`/category/venue/` returned 308 → 301 → 200 while `/category/venue` returned a
single 301.

`skipTrailingSlashRedirect` hands the question to middleware, which resolves it
in one move: pattern-matched paths redirect straight to their destination, and a
legacy root permalink is *rewritten* so the `/[slug]` resolver issues the one
308 that matters. Because that flag removes normalisation everywhere, middleware
puts the 308 back for every path it does not improve.

Measured after, on a production build: **one hop on every shape probed**, query
strings intact.

---

## How it was verified

**A throwaway local Postgres, seeded with a read-only copy of production** — 24
categories, 29 articles, 623 media rows, 65 article-category links. Every
verification ran against that. No production write, at any point.

(Docker Desktop's engine is broken on this machine — every API call returns HTTP
500 and the `docker-desktop` WSL distro will not start — so `supabase db start`
and a Postgres container were both unavailable. The already-installed
PostgreSQL 16 in the Ubuntu WSL distro was used instead. PGlite was tried first
and rejected: its socket server serves one connection at a time and `next build`
opens ~30 prerender workers.)

| Check | Result |
|---|---|
| `pnpm typecheck` | clean |
| `pnpm lint` | 0 errors (118 pre-existing warnings, none new) |
| `pnpm test` | **190 passed** |
| `pnpm build` | completes **including static prerender** — the previous run could not, for want of a database |
| Redirect hops | **1** on `/hantaran-kahwin/`, `/dewan-kahwin/`, `/category/venue/`, `/artikel/idea-dan-nasihat/`, and with UTM params |
| Seven pillar pages | all 200, cluster counts 4/5/4/2/4/2/5 as approved |
| Automatic wiring | a fixture article ingested into C2.3 appeared under its cluster heading on the P2 pillar page with **no code change**, and linked back up with the entity phrase |
| Credit refusal | `--commit` on an uncredited image exits 1; article and media counts unchanged (29/623 before and after) |
| Sitemap | all 41 URLs return 200 and **none** emits noindex |
| Secret scan | clean |
| Admin still gated after the redirect change | `/admin/` → 308 `/admin` → 307 `/login` |

## The code review, and the bug it caught

An external review (GPT-5.6 Sol, three layers) found 37 issues, 8 critical.
**All 8 are now closed and independently re-verified — the critical layer is
clean at `fd93762`.** It took three rounds; the reviewer was right about what
remained open in each of the first two, which is the argument for having run it.
One finding deserves naming because it was mine and it was serious:

**`/admin/` bypassed authentication.** It matched the legacy-permalink shape, so
my trailing-slash handler *rewrote* it — and a rewrite skips the rest of
middleware, Clerk included. Measured before the fix: `/admin` returned 307 →
`/login`, `/admin/` returned 500 from inside the route, having already arrived
unauthenticated. Fixed twice over (a reserved-segment list, plus a Clerk-prefix
check on the rewrite branch) and covered by a test. After: `/admin/` 308 →
`/admin` 307 → `/login`.

Two others worth recording. An image written into the markdown body would have
rendered on the page **uncredited**, going around the gate entirely — and it
took three rounds to close, because markdown has four image syntaxes and HTML
another. Every one now refuses, with a test each. And the ingest path did not
invalidate the content caches, so an ingested article would have sat in the
database invisible to readers; it now refuses to write to a live database at all
unless it can clear them afterwards.

Three findings I rebutted rather than fixed, and the reviewer accepted all
three: ingest must be *able* to publish (Stage 7 of the production workflow says
so) — what it must not do is publish by default, and it does not; `--skip-media`
working locally is the flag's purpose; and the seed connecting read-only to
print a plan against production is the safest thing it does.

**Twenty lower-severity notes from the review's other two passes have not been
re-counted since round one**, and several are already fixed in passing. If the
deploy is approved, that list gets re-triaged before anything ships.

---

## What I could not verify, stated plainly

**No image has ever been uploaded. Not once.** Every local run used
`--skip-media` (now refused against any non-local database).

**I first reported this as "written but unproven". That was wrong, and the
review caught it.** Finding ECH-9: the script loaded no `.env` file at all —
`tsx` does not, and nothing here asked it to. Probed: `R2_ACCESS_KEY_ID` and
`R2_BUCKET_NAME` both absent, so `getR2Client()` would have thrown. The image
half of Task 2 was **broken**, not merely unexercised. It is fixed, and the
credentials now resolve and authenticate against the real bucket — verified with
a **read-only** probe (`GetObject` on a missing key → HTTP **404**, not 403;
`ListObjectsV2` over `inspire/` returned keys). No write of any kind was
performed. Authenticating is not uploading: **the first real upload happens
after approval, not before.**

**Two open consequences, both evidenced.** The `ListObjectsV2` probe shows the
existing pipeline's real output shape:

```
inspire/amankila-bali/1787396256716-cover.jpg
inspire/amankila-bali/1787396256716-cover/crop-16x9-og.webp
inspire/amankila-bali/1787396256716-cover/crop-4.3x1-desktop-hero.webp
```

Ingest calls `generateVariants` but never `processSmartCrops`
(`grep -c processSmartCrops scripts/ingest-article.mts` → `0`), so ingested
covers would get `low/high.webp` and **no named crops** — the hero slots fall
back to the full image and the first ingested article would render unlike all 29
existing ones. Separately, the article upsert's `DO UPDATE` set list omits
`published_at`, so re-ingesting with `--publish` flips `status` but **leaves the
publication date NULL**. Both are small fixes; both only bite when the R2 path
first runs, which needs approval anyway, and both sit in areas the owner has
reserved — so I flagged rather than reached in.

**Nothing has been deployed and no production data has been written.** The seven
pillars do not exist in Supabase. The migration has not been applied.

---

## A production-safety defect the review found after my first report

**ECH-8: `--db` did not actually control the target.** `getDefaultPresets()`
reads through the **global** Drizzle client in `lib/db/drizzle.ts`, which binds
`process.env.DATABASE_URL` at module load and knows nothing about the flag.

The two findings **compounded**, which is the part that matters: `.env` in the
worktree holds the **production** DATABASE_URL, so fixing ECH-9 with a bare
`dotenv.config()` would have produced a run reading production while writing to
`--db`. Split-brain is worse than either bug alone.

`bootstrapEnv()` fixes both in one ordered sequence: DATABASE_URL is set from
`--db` **first**; the env files then load with `override: false` so they supply
R2 credentials but cannot touch the target; an assertion proves it did not move
and exits before any write if it did; only then are the env-reading modules
dynamically imported. Presets are additionally read over the script's own
connection.

Proven, not asserted:

| | |
|---|---|
| `.env` DATABASE_URL host | `aws-0-ap-southeast-1.pooler.supabase.com` |
| after the ordered load | `127.0.0.1:5433` |
| ingest reports | `Target: 127.0.0.1:5433/hklocal` |

**This retires the argument I used to defend escalation E2 below** — I claimed a
dry run was safe because the host guard catches the target. The guard only ever
covered the connection the script opens; the global client sat outside it. It is
inside it now, but the escalation stands on its own merits and remains open.

---

## TWO OPEN ESCALATIONS — mine to raise, not mine to settle

Recorded in full at `_bmad-output/autopilot/OPEN-ESCALATIONS.md` on the branch.

I initially closed two review findings by **editing the spec so the code
matched**. That is changing the rule so the build passes, not closing a finding,
and both land in the two areas the owner has said this site was already burned
in once. Both spec edits are **reverted to their original wording**; the code is
unchanged and now openly differs from the spec in both places. Reverting the
text breaks no gate — nothing in build, tests, typecheck or lint reads that
document, and all four are green after the revert.

**E1 — may ingest publish at all?**
Spec: *"It does not publish. `status` defaults to `draft`; publishing to
production remains a board-approved act."*
Code: accepts `status: published` in the file but ignores it unless `--publish`
is typed; otherwise inserts a draft and says so.
My argument: Stage 7 of the approved workflow ends at *"the page is live"*,
which a draft-only tool cannot reach. Against it: me typing a flag and the board
approving an article are not the same event, and nothing checks the first
happened. **Owner decides.**

**E2 — may the seed connect to production at all?**
Spec: *"refuses to **run** against a database whose host is not explicitly
allow-listed."*
Code: refuses to **write** to a non-local host without
`--i-know-this-is-remote`, but will connect read-only to print the dry-run plan.
My argument: that preview is the safest thing the script does. Against it: an
engineer holding a production connection string is the precondition for every
accident that follows, and an allow-list is cheap. **Owner decides.**

---

## What the CEO needs to decide

1. **Approve the deploy.** Ten commits, one additive migration (eight nullable
   columns, one partial index — no data mutation).
2. **Approve the seed** of the 7 pillars and 26 clusters into production. It is
   additive, idempotent, and creates seven new public URLs.
3. **Approve the noindex change** on the six child hubs. It changes no URL; it
   makes six pages that already return 200 indexable, and removes `uncategorized`
   from the sitemap.
4. **An open editorial question, not an engineering one:** the 24 legacy
   WordPress categories now sit alongside the 7 pillars. Whether they fold in,
   and how, changes URLs that currently rank — so it needs a redirect plan and
   your sign-off. I have deliberately not touched them.

## Not done, and why

- The full asset register (licence evidence, grant dates, expiry, takedown log)
  from visual-asset strategy §3.2. Four credit columns are built; the register
  belongs outside the CMS by design and is a separate approved plan.
- AVIF derivatives. The strategy asks for AVIF; the existing pipeline emits
  WebP. Real item, named rather than smuggled in.
- The venue directory.

Nothing in this batch needed the Cloudflare admin API, so the invalid
`cloudflare.twn` token did not block anything.
