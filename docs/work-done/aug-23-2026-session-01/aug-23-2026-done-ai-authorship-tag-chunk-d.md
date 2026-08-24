# AI authorship + review-tracking tag (Chunk D), and the pre-deploy gate — 23 Aug 2026

**Session:** aug-23-2026-session-01 · **Owner:** full-stack-engineer · **Status:** partial
**Plan:** [Brief — AI authorship tag, then DEPLOY](../../plans/aug-23-2026-session-01/aug-23-2026-brief-ai-tag-and-deploy.md)
**Spec:** [Spec — AI authorship + review-tracking tag (Chunk D)](../../plans/aug-23-2026-session-01/aug-23-2026-spec-ai-authorship-tag.md)

**Status is `partial` on purpose.** Task 1 (build the tag) is complete and
verified. Task 2 (deploy) is **not done**, and stopped for a reason the brief
itself names rather than for a failure — see *Why the deploy stopped*.

---

## What was done

### Task 1 — the AI authorship tag (complete)

Built Chunk D on `ianng89/pillars-ingest-redirects` in the site repo
(`ianngkb/hellokahwin`), worktree
`C:\Users\Ian Ng\orca\workspaces\hellokahwin-site\pillars-ingest-redirects`.

**Schema.** Two enums — `article_authorship` (`ai`, `ai_assisted`, `human`) and
`article_review_status` (`pending_review`, `reviewed`, `needs_changes`) — and
four columns on `articles`: `authorship` NOT NULL default `ai`,
`review_status` NOT NULL default `pending_review`, `reviewed_at`, and
`reviewed_by` → `profiles.id` ON DELETE SET NULL. Plus
`articles_review_queue_idx` on `(review_status, authorship)`.

**The migration was hand-ordered, and that is the load-bearing part.**
`drizzle-kit generate` emits the two columns as
`ADD COLUMN ... DEFAULT 'ai' NOT NULL`, which back-stamps every EXISTING row as
`ai`. Against production that would have marked **all 29 legacy WordPress
migrations as AI-written** — the precise wrong answer, and tedious to unpick
once the owner started reviewing against it. `0003` instead does: create types →
add columns NULLABLE → backfill → only then `SET DEFAULT` / `SET NOT NULL`. No
row is ever briefly wrong and the NOT NULL is proven by the backfill rather than
assumed.

The backfill is written as a **derivation** from `is_ai_generated` /
`human_reviewed_at`, not as literals, so it is equally correct on a restore, a
preview branch, or any database where the old flag has actually been used.

**`is_ai_generated` and `human_reviewed_at` are deliberately NOT dropped.** They
are the rollback net: if the Vercel deploy is rolled back but the migration is
not — the realistic failure mode — the previous code reads those two columns.
Every writer of the new fields mirrors into them, each site carrying the comment
`// Compat mirror for rollback safety — removed in the follow-up migration that drops these columns.`
Dropping them is a follow-up needing the CEO's approval.

**The admin articles view** (`/admin/inspire`):

- An authorship chip on **every** row — AI / AI-assisted / Human. Previously only
  AI rendered a chip, so a row with no chip was ambiguous between "a human wrote
  this" and "nobody set it". Removing that ambiguity is why the column is NOT
  NULL.
- **Two independent filters** replacing the single four-value `source` select, so
  "AI + needs review" (the owner's stated primary workflow) and "anything needing
  changes regardless of who wrote it" are both expressible. The old `?source=`
  values still work as aliases, so a bookmarked admin URL narrows the way it
  always did instead of silently widening to everything.
- **One click to mark reviewed:** the "Needs review" chip *is* the button. The
  dropdown keeps the less common transitions (needs changes, back to needs
  review).
- **Pending-first sort:** pending, then needs-changes, then reviewed; AI above
  human within a band; newest first inside that.
- The action takes an **explicit target status** rather than toggling — a toggle
  over three states would make the one-click chip unpredictable — stamps
  `reviewed_at`/`reviewed_by` on `reviewed` and clears both on anything else, and
  no longer refuses non-AI articles, so the owner can sign off a legacy post too.

**Nothing is public.** Enforced by a test over every file under
`src/app/(public)`, not by care.

**Ingest** (`scripts/ingest-article.mts`) stamps `authorship` + `review_status`
on insert and in the `ON CONFLICT DO UPDATE`, clearing the review stamp on
re-ingest — an article re-ingested after edits is AI content again and goes back
in the queue, because carrying a sign-off forward would cover text nobody read.
The article file may optionally declare `authorship: ai_assisted | human`.

### Two defects found and fixed that were not in the brief

**1. A build-breaking bug inherited from Chunk B.** The production build failed:

```
TypeError: r.has is not a function
Export encountered an error on /sitemap.xml/route: /sitemap.xml, exiting the build.
```

`getIndexableCategoryIds` returned a `Set` from inside `unstable_cache`, which
serializes its value — so the Set came back as `{}` and `.has` did not exist.
It passed in `next dev` because the first call returns the live in-memory value,
and TypeScript endorsed it because the annotation claimed `Set<string>`. **The
sitemap fix this release exists to deliver would not have shipped.** Fixed by
caching an array and rebuilding the Set outside the cache boundary, with a
regression test that I proved catches the original shape.

**2. Both admin insert paths fell through to the `ai` default.** "New Article"
tagged a hand-typed article as AI and dropped it in the owner's queue; Duplicate
relabelled a copy of a human article as AI. Both now set authorship explicitly,
and Duplicate inherits the original's authorship while always starting at
`pending_review`.

### The inherited-findings register the CEO asked for

Written to
`_bmad-output/autopilot/review/inherited-findings.md`, with finding #1 flagged
critical as instructed. **I verified the CEO's attribution claim rather than
accepting it,** and it holds — six of the seven flagged files have **zero** lines
in this branch's diff, and the seventh changes 12 lines that only extract
`safeHref` into a shared module.

I also checked each finding's **current** status, and all fifteen are **already
closed on master** (`be08556`). There is no remediation workstream left to
schedule. Because the branch contains all of master, this release ships those
fixes too.

---

## Evidence

Everything below was observed, not inferred.

### Local gates (worktree HEAD `395ce7f`)

| Gate | Result |
|---|---|
| `pnpm typecheck` | clean, no output |
| `pnpm lint` | **0 errors**, 118 warnings — every one pre-existing and none on a line this work touched (verified against `git show HEAD:<file>`); prettier "All matched files use Prettier code style!" |
| `pnpm test` | **221 passed / 221**, 18 files (baseline was 190) |
| `pnpm build` | completes, **including the `/sitemap.xml` prerender that was failing**; 27/27 static pages |
| Secret scan | clean over the full diff |

### The migration, rehearsed on a real Postgres

Docker was down, so the Supabase local stack was unavailable — but a real
**PostgreSQL 16.15** was reachable at `127.0.0.1:5433`. I built a throwaway
database on it, applied `0000` → `0002`, seeded **32 fixtures** (29 shaped
exactly like production, plus the three mixed cases the derivation exists for),
then applied `0003`:

```
distribution after backfill:
    {"authorship":"human","review_status":"pending_review","n":29}
    {"authorship":"ai","review_status":"reviewed","n":1}
    {"authorship":"ai","review_status":"pending_review","n":1}
    {"authorship":"human","review_status":"reviewed","n":1}

PASS  the 29 production-shaped legacy rows become human/pending_review
PASS  no row was stamped ai by the column default (the drizzle-generated bug)
PASS  is_ai_generated=true + never reviewed -> ai / pending_review
PASS  is_ai_generated=true + reviewed -> ai / reviewed, reviewed_at carried over
PASS  is_ai_generated=false + reviewed -> human / reviewed (derivation, not a literal)
PASS  reviewed_by is NULL everywhere — no attribution was invented
PASS  authorship NOT NULL          PASS  review_status NOT NULL
PASS  reviewed_at nullable         PASS  reviewed_by nullable
PASS  omitting both columns defaults to ai / pending_review (the fail-safe direction)
PASS  an explicit NULL authorship is REJECTED (23502)
PASS  articles_review_queue_idx exists
PASS  reviewed_by FK exists with ON DELETE SET NULL
PASS  re-running 0003 fails loudly rather than silently re-backfilling
ALL CHECKS PASSED
```

### The queue filter and sort, against real rows

```
PASS  authorship=ai AND review=pending_review returns exactly the AI-and-pending rows
PASS  authorship=ai alone is broader than the pair
PASS  review=needs_changes alone works regardless of authorship
      (the old combined control could not express this)

first rows in list order:
    pending_review ai     defaulted
    pending_review ai     ai-unreviewed
    pending_review human  legacy-28
    ...
PASS  bands non-decreasing   PASS  first row is pending_review
PASS  AI above human inside the pending band   PASS  reviewed rows sink to the bottom
```

### Production, probed read-only (23 Aug 2026)

| Fact | Observed |
|---|---|
| Applied migrations | **only `0000` and `0001`** — `0002` AND `0003` are both pending |
| Articles | **29**, all `published`, all `is_ai_generated=false`, all `human_reviewed_at IS NULL`, **all with a `wp_id`** → every one a legacy WP migration |
| `authorship` / `review_status` | do not exist yet |
| `inspire_categories` / `media` 0002 columns | do not exist yet |
| Server version | PostgreSQL **17.6** |
| Category hubs owning ≥1 published article | **8** — not the brief's four, not the spec's six: `idea-dan-nasihat`(11), `real-wedding`(6), `moden-kontemporari`(4), `hiasan-dekorasi`(3), `glamor-eksklusif`(2), `minimalis-mewah`(1), `pantai-santai`(1), `fotografi-videografi`(1) |

### Live pre-deploy baseline (real requests to hellokahwin.com)

```
all seven /artikel/<pillar>            -> 404
  nikah-undang-undang, hantaran-mas-kahwin, ucapan-doa, busana-pengantin,
  pelamin-kad-cenderahati, venue-perancangan, sebelum-nikah

curl -I https://hellokahwin.com/hantaran-kahwin/
  308 -> /hantaran-kahwin
  308 -> /artikel/hiasan-dekorasi/hantaran-kahwin
  200                                   (num_redirects=2 — TWO hops)

sitemap.xml                            -> 200, 34 <loc>, 3 category hubs
  (idea-dan-nasihat, real-wedding, uncategorized)

category hubs, all 200, but noindex on:
  hiasan-dekorasi, moden-kontemporari, glamor-eksklusif,
  minimalis-mewah, pantai-santai, fotografi-videografi, uncategorized

a live article page                    -> 200, zero authorship/review leakage
```

### The backup

Production is PostgreSQL 17.6; the only `pg_dump` available is 16.15, which
refuses a newer server, and the Supabase CLI's dump path runs `pg_dump` inside
Docker, whose daemon is down. The project reports `pitr_enabled=false` with
**zero** listed platform backups, so there was no existing restore point either.

I therefore took a hand-rolled logical backup — every row of every public table
plus the applied-migration list, with the schema already version-controlled as
the drizzle migrations:

```
Tables: 18   Rows: 2977
C:\Users\Ian Ng\hellokahwin-backups\hellokahwin-prod-backup-1787499572816.json  (4.4 MB)
```

---

## What it changed

- The company can now tell AI-produced content from human content **and** track
  what has actually been reviewed — the capability the board asked for. It is
  built but **not yet live**.
- A build-breaking defect that would have silently prevented the sitemap fix from
  shipping is closed, with a regression test.
- The inherited-findings question is settled with evidence: nothing to schedule.
- Production's real shape is now measured, and it contradicts the plans in one
  useful way — **eight** category hubs own published articles, not four or six.

## Follow-ups

| # | Item | Owner |
|---|---|---|
| 1 | **The pillar seed** — `/artikel/<pillar>` stays 404 until ~33 rows are written to `inspire_categories`. This is OPEN Escalation 2 and was not settled. | CEO |
| 2 | Deploy itself — migrations `0002`+`0003` and the Vercel production deploy, once the review gate closes and the seed decision lands. | full-stack-engineer |
| 3 | Dropping `is_ai_generated` / `human_reviewed_at` — follow-up migration. | CEO to approve |
| 4 | OPEN Escalation 1 — may `ingest` publish at all (`--publish`)? | CEO |
| 5 | The 24 legacy WordPress categories sitting alongside the seven pillars. | CEO |
| 6 | A regression test pinning inherited finding #1 (`%`/`_` slug must not delete a neighbour's media) — the fix is in, nothing holds it in place. | full-stack-engineer |
