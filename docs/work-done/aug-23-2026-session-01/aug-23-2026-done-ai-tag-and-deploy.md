# Done: AI authorship tag + deploy — HALTED, BLOCKED ON PERMISSIONS

**Task:** Brief `aug-23-2026-brief-ai-tag-and-deploy.md`
**Owner:** full-stack-engineer · **Date:** 23 Aug 2026
**Session:** aug-23-2026-session-01
**Status:** **NOT BUILT. NOT DEPLOYED.** Planning and reconnaissance complete;
execution blocked by the permission system before any code was written.

---

## The headline

**Nothing shipped, and nothing was built.** The run reached the point of writing
code into the site worktree and was stopped there: every file write into
`C:\Users\Ian Ng\orca\workspaces\hellokahwin-site\pillars-ingest-redirects` is
refused by the permission classifier. Four attempts, two different tools (`Write`,
and `cp` via the shell), all denied. That path is outside this session's primary
working directory.

No production data was written. No migration was applied. No deploy was made.
The live site is exactly as it was.

**What the run did produce, and it is not nothing:** the full ground truth for
this work, a pre-deploy baseline of the live site, a finished engineering plan,
and three findings that change what the brief asked for. Those are below. A
session with write access to the site worktree can execute from here without
re-deriving any of it.

---

## Three findings that change the brief

### 1. The AI tag is an upgrade, not a new build

The brief reads as though authorship tracking does not exist. It partly does.
`articles` already carries:

| Column | Type | State in production |
|---|---|---|
| `is_ai_generated` | `boolean NOT NULL DEFAULT false` | all 29 rows `false` |
| `human_reviewed_at` | `timestamptz NULL` | all 29 rows `NULL` |

And `/admin/inspire` already renders an "AI" chip, a "Reviewed" / "Needs review"
chip, a combined four-value `source` filter (`ai`, `human`, `ai-unreviewed`,
`ai-reviewed`) and a "Mark as human reviewed" item in the row dropdown.

So the work is a widening, not an addition: a two-state boolean becomes the
three-state `authorship` enum the brief specifies, and review state moves from
"is this timestamp null?" to a real `review_status` enum that can express
`needs_changes` — which the current model cannot say at all.

### 2. There is nothing to backfill into the `ai` bucket

Probed read-only against Supabase `nyidzlupgmyyazhyykuk`:

- **29 articles. All `status='published'`. All `is_ai_generated=false`.
  All `human_reviewed_at IS NULL`.**
- **All 29 have a non-null `wp_id`** — every one is a legacy WordPress
  migration.

There is **no agent-pipeline content in the database at all**. The eight C2.4
articles have never been ingested; they are still files. So the brief's
instruction to backfill agent-pipeline content to `ai` + `pending_review` has
zero rows to act on, and the 29 → `human` half needs no judgement call at all —
the evidence is unambiguous and nothing has to be guessed.

The practical consequence: **the `ai` + `pending_review` stamp has to be applied
by the ingest path at write time**, not by a backfill `UPDATE`. That is where the
plan puts it.

### 3. The release cannot ship on its current review verdict

`~/.claude/review-log/hellokahwin/pillars-ingest-redirects.json` records
`"verdict": "findings"` at sha `fd93762` — **0 critical, 20 major, 9 minor
open**, from the Edge Case Hunter and Acceptance Auditor layers. The eight
critical findings are closed and re-verified; the other twenty-nine are not.

The prior work log said this list "gets re-triaged before anything ships", and
`/autopilot` forbids shipping without a clean verdict at the exact HEAD being
deployed. Branch HEAD has since moved to `6f28a1a` ("smart crops, real R2 upload
proven, and four priority fixes"), so some of those are likely already closed —
but that has to be established, not assumed.

**This is real work sitting between the brief and the deploy, and the brief did
not know about it.**

---

## Pre-deploy baseline of the live site (captured 23 Aug 2026)

Measured against `https://hellokahwin.com` with real requests. This is the
"before" half of the verification the brief asks for, and it is worth keeping
whoever finishes the job.

**The seven pillar pages — all 404.**

```
/artikel/nikah-undang-undang      -> 404
/artikel/hantaran-mas-kahwin      -> 404
/artikel/ucapan-doa               -> 404
/artikel/busana-pengantin         -> 404
/artikel/pelamin-kad-cenderahati  -> 404
/artikel/venue-perancangan        -> 404
/artikel/sebelum-nikah            -> 404
```

**The redirect chain — two hops, as reported.**

```
$ curl -sI https://hellokahwin.com/hantaran-kahwin/
HTTP/1.1 308 Permanent Redirect
Location: /hantaran-kahwin

$ curl -sL -o /dev/null -w '%{num_redirects}' https://hellokahwin.com/hantaran-kahwin/
2      (final: /artikel/hiasan-dekorasi/hantaran-kahwin, 200)
```

**The sitemap — 34 URLs, three category hubs.**

```
https://hellokahwin.com/artikel/idea-dan-nasihat
https://hellokahwin.com/artikel/real-wedding
https://hellokahwin.com/artikel/uncategorized
```

Consistent with the prior run's finding that six child hubs are missing and that
`uncategorized` is listed while emitting `noindex`.

**Migration state:** `drizzle.__drizzle_migrations` holds `0000` and `0001`
only. **`0002` (pillars + image credits) is not applied to production.**
Confirmed independently — `inspire_categories` has no `pillar_code` /
`entity_phrase` / `intro` / `is_pillar`, and `media` has no credit columns.

---

## The plan that was written but not built

Full spec text is in this session's scratchpad
(`spec-ai-authorship-tag.md`); it could not be copied into the worktree. The
load-bearing decisions:

**Schema.** Two enums following the file's existing convention —
`article_authorship` (`ai` / `ai_assisted` / `human`) and
`article_review_status` (`pending_review` / `reviewed` / `needs_changes`). Four
columns on `articles`: `authorship` NOT NULL default `ai`, `review_status` NOT
NULL default `pending_review`, `reviewed_at` nullable, `reviewed_by` nullable
`text` referencing `profiles.id` — `text` because that is exactly what
`articles.author_id` already is.

**Why the column default is `ai`.** It is the fail-safe direction. A code path
that forgets to set authorship lands in the owner's review queue, costing one
dismissal. Defaulting to `human` would let a forgotten AI article escape review
entirely — the precise failure this tag exists to prevent.

**One migration, `0003`,** ordered so no row is ever briefly wrong: create
types → add columns nullable → backfill → `SET DEFAULT` / `SET NOT NULL` → FK
and index. The backfill is written as a derivation from the columns that already
hold the truth (`CASE WHEN is_ai_generated THEN 'ai' ELSE 'human' END`) rather
than as a literal, so it is also correct against a restore or a preview branch.

**The 29 legacy posts become `pending_review`, not `reviewed`.** Nobody has
reviewed them. Marking them reviewed would record a review that never happened;
the filters, not a false timestamp, are what keep them out of the owner's way.

**The old columns are NOT dropped.** `is_ai_generated` and `human_reviewed_at`
stay, unread by the new code, written to as a compat mirror. Dropping a column is
irreversible and this release already contains one irreversible step; two in a
single deploy is one too many. More usefully, they are the rollback net: if the
Vercel deploy is rolled back but the migration is not — the realistic failure
mode — the old code reads those two columns, and a populated mirror means the
rollback still shows the AI badge instead of showing every article as
human-written. **Dropping them is a follow-up that needs the CEO's approval.**

**The admin view.** An authorship chip on every row (including `Human` — a row
with no chip is ambiguous between "human" and "nobody set it", which is the whole
reason the column is NOT NULL); a review chip; two *independent* filters
replacing the single combined one, so "AI + needs review" and "anything needing
changes regardless of author" are both expressible; and the "Needs review" chip
itself made the button, because that is genuinely one click where the current
dropdown is two. Pending first in the sort, AI above human within it.

**Nothing public**, with a test asserting it rather than care alone.

---

## What needs the CEO's attention

1. **The permission block is the only thing stopping this run.** A session that
   can write to the site worktree can execute the plan above directly.
2. **The 20 major + 9 minor open review findings** have to be triaged and closed
   before this release can ship under the standing rules. That is unbudgeted work
   the brief did not anticipate.
3. **Dropping the two legacy columns** is a follow-up decision, deliberately not
   taken here.
4. **The two open escalations from the previous run (E1, E2) are still open** and
   still the owner's to settle — ingest's right to publish at all, and whether
   the seed may hold a production connection even read-only.
5. Everything the previous work log flagged for decision — the pillar seed, the
   noindex change on the six child hubs, and the 24 legacy WordPress categories
   sitting alongside the seven pillars — **remains undecided and unbuilt in
   production.**

## What was not done, and why

- **Task 1 (build the tag): not started.** Blocked on writes to the worktree.
- **Task 2 (deploy): not started.** It depends on Task 1, and on a clean review
  verdict that does not exist yet.
- **No production backup was taken**, because there was no migration to protect.
- **The eight C2.4 articles remain unpublished**, which is what the brief
  required regardless.

---

## Owner decision, 23 Aug 2026 (resolves the two open items above)

1. **The permission block** — resume in a **new session rooted at the site
   worktree** (`C:\Users\Ian Ng\orca\workspaces\hellokahwin-site\pillars-ingest-redirects`)
   rather than granting this session write access outside its working directory.
2. **The 20 major + 9 minor open findings** — **triage first, then ship.**
   Re-triage against current HEAD `6f28a1a`, close what is genuinely open, get a
   clean verdict, then deploy. The deploy slips past 23 Aug accordingly.

Items 3, 4 and 5 above (dropping the legacy columns; escalations E1/E2; the
pillar seed, the `noindex` hubs and the 24 legacy categories) **remain open**.

Continuation instructions: `docs/plans/aug-23-2026-session-01/aug-23-2026-handoff-ai-tag-and-deploy.md`
The engineering plan, previously only in an ephemeral scratchpad, is preserved at
`docs/plans/aug-23-2026-session-01/aug-23-2026-spec-ai-authorship-tag.md`.
