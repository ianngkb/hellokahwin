# Spec — AI authorship + review-tracking tag (Chunk D)

**Repo:** `ianngkb/hellokahwin` (the LIVE site — Next.js 16 / Drizzle / Supabase / Vercel)
**Worktree:** `C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Branch:** `ianng89/pillars-ingest-redirects` (continues the same branch — this ships in the SAME release)
**Brief:** `docs/plans/aug-23-2026-session-01/aug-23-2026-brief-ai-tag-and-deploy.md`
**Companion spec:** `spec-pillars-ingest-redirects.md` (Chunks A/B/C — already built, unchanged by this document)
**Status:** ready-for-development
**Date:** 23 Aug 2026

> **The deploy ban in the companion spec is lifted by board approval**
> (23 Aug 2026: "approve and deploy it, please tag it as AI in the articles
> section so we can manually review it later"). The companion spec's original
> wording is deliberately left untouched — rewriting a spec so the code matches
> is the practice that produced `OPEN-ESCALATIONS.md`, and it is not repeated
> here. This document records what changed instead.
>
> Chunk D lands as **one new migration, `0003`**, covering only the
> authorship/review fields. It ships in the same release as `0002`.

---

## 0. Facts established before writing this (observed 23 Aug 2026, none assumed)

All probed read-only against production Supabase `nyidzlupgmyyazhyykuk`.

| Fact | How it was observed |
|---|---|
| `articles.is_ai_generated` already exists — `boolean NOT NULL DEFAULT false` | `information_schema.columns` |
| `articles.human_reviewed_at` already exists — `timestamptz NULL` | `information_schema.columns` |
| Production holds **29 articles, all `status='published'`, all `is_ai_generated=false`, all `human_reviewed_at IS NULL`** | `GROUP BY status, is_ai_generated, (human_reviewed_at IS NOT NULL)` |
| **All 29 have a non-null `wp_id`** — every one is a legacy WordPress migration | `GROUP BY (wp_id IS NOT NULL)` returned a single row: `true`, 29 |
| There is **no agent-pipeline content in the database at all** — 29 rows, 29 legacy | same query |
| Applied migrations are `0000` and `0001`. `0002` (Chunk A/B) is **not yet applied** | `drizzle.__drizzle_migrations` |
| `inspire_categories` has no `pillar_code` / `entity_phrase` / `intro` / `is_pillar`; `media` has no credit columns | `information_schema.columns` — confirms 0002 is pending |
| Existing enums use snake_case type names: `article_status`, `media_source`, `user_role` | `pg_enum` join |
| The admin list already renders an AI chip, a Reviewed/Needs-review chip, a combined 4-value `source` filter, and a dropdown "Mark as human reviewed" | read `src/app/(admin)/admin/inspire/{page,articles-table}.tsx`, `actions.ts` |
| Nothing renders `is_ai_generated` or `human_reviewed_at` on any public route | `grep -rn` across `src/` — every hit is under `(admin)` or `scripts/` |

**The consequence that matters for the backfill.** The brief says to backfill
agent-pipeline content to `ai` and the 29 legacy posts to `human`. Only the
second half has anything to act on: the eight C2.4 articles have never been
ingested, so they are not rows yet. The `ai` + `pending_review` stamp therefore
belongs in the **ingest path at write time**, not in a backfill UPDATE. The
backfill sets all 29 existing rows to `human`, which is exactly what the
evidence supports and involves no guessing.

---

## 1. Schema

### D1. Two new enums, in `src/lib/db/schema/enums.ts`

Named to match the file's existing convention (`article_status`, `media_source`):

```ts
export const articleAuthorshipEnum = pgEnum('article_authorship', ['ai', 'ai_assisted', 'human']);
export const articleReviewStatusEnum = pgEnum('article_review_status', [
  'pending_review',
  'reviewed',
  'needs_changes',
]);
```

### D2. Four new columns on `articles`

| Drizzle field | Column | Type | Null | Default |
|---|---|---|---|---|
| `authorship` | `authorship` | `article_authorship` | **NOT NULL** | `'ai'` |
| `reviewStatus` | `review_status` | `article_review_status` | **NOT NULL** | `'pending_review'` |
| `reviewedAt` | `reviewed_at` | `timestamptz` | NULL | — |
| `reviewedBy` | `reviewed_by` | `text` → `profiles.id` | NULL | — |

`reviewedBy` is `text` referencing `profiles.id` because that is exactly what
`articles.authorId` already is — matching the schema's convention, as the brief
asks. `ON DELETE SET NULL`: losing an admin's profile must never delete an
article, and must never silently un-review one either — the timestamp survives,
the attribution does not.

**Why the column default is `ai` and not `human`.** The brief says default `ai`
for anything from the agent pipeline. As a *column* default it is also the
fail-safe direction: a code path that forgets to set authorship lands in the
owner's review queue, which costs one dismissal. Defaulting to `human` would
let a forgotten AI article escape review entirely, which is the failure this tag
exists to prevent. Both real writers set it explicitly anyway (ingest → `ai`;
the admin "new article" path → `human`, because a human is typing it), so the
default only ever catches a bug — and it catches it in the safe direction.

### D3. Index

```sql
CREATE INDEX articles_review_queue_idx ON articles (review_status, authorship);
```

The index for the primary workflow ("everything AI-produced I have not
reviewed") and for the pending-first sort. Not partial: `pending_review` is the
majority value today, so a partial index would cover almost every row and buy
nothing.

### D4. The two existing columns are NOT dropped in this release

`is_ai_generated` and `human_reviewed_at` stay. **Deliberate, and a flagged
decision rather than an oversight.**

- Dropping a column is irreversible, and this release already contains the one
  irreversible step of the run (the production migration). Two in one deploy is
  one too many.
- They are the rollback net. If the Vercel deploy is rolled back but the
  migration is not — the realistic failure mode — the previous code reads those
  two columns. Keeping them populated means a rollback still shows the AI badge
  correctly instead of showing every article as human-written.

So: **the new code reads ONLY the new fields**, and the two writers
(`setReviewStatusAction`, `scripts/ingest-article.mts`) **mirror** their writes
into the old pair. Every mirror site carries the comment
`// Compat mirror for rollback safety — removed in the follow-up migration that drops these columns.`
Dropping them is a follow-up requiring the CEO's approval; it is named in the
work-done log, not smuggled in here.

### D5. The migration — ONE file, `0003_article_authorship.sql`

Generated with `pnpm db:generate`, then the backfill hand-added between the
column adds and the `SET DEFAULT` / `SET NOT NULL`, so no row is ever briefly
wrong. Required order:

1. `CREATE TYPE article_authorship`, `CREATE TYPE article_review_status`.
2. `ALTER TABLE articles ADD COLUMN authorship article_authorship` — nullable,
   no default, for now.
3. `ADD COLUMN review_status article_review_status`, `reviewed_at`, `reviewed_by`.
4. **Backfill**, derived from the columns that already hold the truth:
   ```sql
   UPDATE articles SET
     authorship    = CASE WHEN is_ai_generated THEN 'ai' ELSE 'human' END::article_authorship,
     review_status = CASE WHEN human_reviewed_at IS NOT NULL
                          THEN 'reviewed' ELSE 'pending_review' END::article_review_status,
     reviewed_at   = human_reviewed_at;
   ```
   Against production this sets all 29 rows to `human` / `pending_review` /
   `reviewed_at = NULL`. Written as a derivation rather than a literal so it is
   also correct on any database where the old flag has been used — the local
   verification DB, a future restore, a preview branch.
5. `ALTER COLUMN authorship SET DEFAULT 'ai'`, `SET NOT NULL`;
   `review_status SET DEFAULT 'pending_review'`, `SET NOT NULL`.
6. The FK on `reviewed_by` and the index from D3.

**The 29 legacy posts become `pending_review`, not `reviewed`.** Nobody has
reviewed them; marking them reviewed would record a review that never happened.
The filters, not a false timestamp, keep them out of the owner's way.

---

## 2. The admin articles view (`/admin/inspire`) — internal only

### D6. Badge

Every row shows an authorship chip: **AI** (`ai`), **AI-assisted**
(`ai_assisted`), **Human** (`human`). Today only the AI case renders a chip at
all; a row with no chip is ambiguous between "human" and "nobody set it", and
that ambiguity is the whole reason the column is NOT NULL.

Alongside it, a review chip: **Needs review** (`pending_review`, warning),
**Reviewed** (`reviewed`, success, tooltip carrying `reviewed_at` and the
reviewer's name), **Needs changes** (`needs_changes`, destructive).

### D7. Two independent filters, replacing the single `source` select

- `authorship` — All / AI / AI-assisted / Human
- `review` — All / Needs review / Reviewed / Needs changes

Independent, so "AI + Needs review" — the brief's stated primary workflow — is
expressible, and so is "anything needing changes regardless of who wrote it",
which the current combined control cannot express.

Accept the old `source` param values (`ai`, `human`, `ai-unreviewed`,
`ai-reviewed`) as aliases mapping onto the new pair, so a bookmarked admin URL
does not silently widen to "everything". Validate both new params against their
enum members and ignore anything else — the existing code carries a comment
explaining that an unvalidated filter value reaches Postgres and 500s the page.

### D8. One click to mark reviewed

The **"Needs review" chip itself is the button.** Clicking it marks the article
reviewed. That is genuinely one click; the current dropdown route is two (open
the menu, then click), and the brief says "one click; do not make the owner open
a form."

Keep the dropdown items too, because they are where the less common transitions
live: mark **Needs changes**, and move back to **Needs review**.

The action (`toggleHumanReviewedAction`, renamed `setReviewStatusAction`):

- Takes an explicit target status rather than toggling. A toggle over three
  states is ambiguous and would make the one-click chip unpredictable.
- On `reviewed`: stamps `reviewed_at = now()` and `reviewed_by = <admin>`.
  On any other status: clears both — a stale "reviewed by X" against a
  `needs_changes` article is worse than no attribution.
- **Drops the `if (!article.isAiGenerated) return error` guard.** Review status
  now applies to every article regardless of authorship; the owner may want to
  sign off on a legacy post too.
- Keeps the existing deliberate behaviour of **not** bumping `updatedAt` —
  review state is admin metadata, not a content change.
- Keeps `logAuditEvent` and `revalidatePath('/admin/inspire')`.

### D9. Pending-first sort

Replace `ORDER BY created_at DESC` with:

```sql
ORDER BY
  CASE review_status WHEN 'pending_review' THEN 0 WHEN 'needs_changes' THEN 1 ELSE 2 END,
  CASE WHEN authorship = 'human' THEN 1 ELSE 0 END,
  created_at DESC
```

`pending_review` first, as the brief asks; AI above human within it, because
that is the queue the owner actually wants; newest first inside that.

### D10. Nothing public

No public route may read, render, or expose these fields. The brief is explicit
that this is internal review tracking, not a disclosure banner — but built so it
*could* be surfaced later, which the enum already allows (`ai_assisted` exists
precisely so a future public disclosure can be honest rather than binary).

**This gets a test, not just care:** a test asserting the public article page's
rendered output contains none of the four fields' values, and that the public
query projections do not select them.

### D11. Ingest sets the tag

`scripts/ingest-article.mts` writes `authorship = 'ai'` and
`review_status = 'pending_review'` on insert, and includes both in the
`ON CONFLICT DO UPDATE` set list — an article re-ingested after edits is AI
content again and goes back in the queue. It keeps mirroring `is_ai_generated`
per D4.

The article file's front matter may optionally declare
`authorship: ai_assisted | human`; absent, it is `ai`. A writer who genuinely
hand-wrote a piece can say so, and the default stays safe.

---

## 3. Verification — what must actually be observed

Local (before any deploy), against the throwaway Postgres seeded from a
read-only copy of production:

| # | Check | How |
|---|---|---|
| D-V1 | `pnpm typecheck`, `pnpm lint`, `pnpm test` all clean; no new lint warnings | run them |
| D-V2 | `pnpm build` completes **including static prerender** | run it |
| D-V3 | Migration `0003` applies to a database already at `0002`, and 29 rows land as `human` / `pending_review` | apply, then `GROUP BY authorship, review_status` |
| D-V4 | `authorship` and `review_status` are genuinely NOT NULL | `INSERT` omitting them succeeds via defaults; `INSERT ... authorship = NULL` is **rejected** |
| D-V5 | The admin list shows the badge, both filters, and the one-click chip | render it against the local DB |
| D-V6 | Filtering AI + Needs review returns exactly the AI-and-pending rows | seed a mixed fixture set, assert counts |
| D-V7 | One click on the chip sets `reviewed`, stamps `reviewed_at` and `reviewed_by`, and the row re-sorts below the pending ones | click it, re-query |
| D-V8 | Pending-first sort holds | assert row order against a mixed fixture |
| D-V9 | The public article page exposes none of the four fields | fetch it and grep; plus the D10 test |
| D-V10 | No secret in the diff | scan before commit |

Live (after deploy) — the brief's checks, made against `https://hellokahwin.com`
and never against build output:

| # | Check |
|---|---|
| L1 | All seven `/artikel/<pillar>` pages return **200** (all seven return 404 today — baseline captured pre-deploy) |
| L2 | The live `/sitemap.xml` contains the category hubs — report the **real** number (six, not the brief's four) and each one's actual indexability |
| L3 | `curl -I` a legacy URL and count hops: **exactly one** (two today — baseline captured pre-deploy) |
| L4 | The live admin articles view shows the badge, both filters, the one-click mark-reviewed, and pending-first order |
| L5 | The eight C2.4 articles are **still unpublished** — the article count is unchanged at 29 |

---

## 4. Out of scope — named, not smuggled in

- **Dropping `is_ai_generated` / `human_reviewed_at`** (D4). Follow-up, needs CEO approval.
- **Any public disclosure of authorship.** The field is built to allow it; this release does not do it.
- **Publishing the eight C2.4 articles.** Explicitly forbidden by the brief; a separate CEO decision.
- **The two open escalations** (E1 ingest-may-publish, E2 seed-may-connect-to-production) — still the owner's to settle; unchanged by this chunk.
- **`processSmartCrops` / `published_at` on re-ingest** — recorded in the prior work log as open consequences of the R2 path.
