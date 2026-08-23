# TASK — Chunk D: AI authorship + review-tracking tag

You are the dev worker. Build **Chunk D** on the branch already checked out in
this worktree (`ianng89/pillars-ingest-redirects`). Chunks A/B/C are already
built and committed — do not touch them.

## Read these first, in this order

1. **THE SPEC — execute this, do not re-derive it:**
   `C:\Users\Ian Ng\Documents\Code\hellokahwin\hellokahwin\docs\plans\aug-23-2026-session-01\aug-23-2026-spec-ai-authorship-tag.md`
2. The CEO's brief (intent):
   `C:\Users\Ian Ng\Documents\Code\hellokahwin\hellokahwin\docs\plans\aug-23-2026-session-01\aug-23-2026-brief-ai-tag-and-deploy.md`

Those live in a **different repo** (the docs repo). Read from there; write code
only here in this worktree.

The spec is `ready-for-development` and was written against facts probed from
production. Every load-bearing decision in it is already made and is **not to be
relitigated**: two enums, four columns, `authorship` NOT NULL default `ai`, one
migration `0003`, backfill derived from `is_ai_generated` rather than literals,
the 29 legacy rows become `human` + `pending_review`, `is_ai_generated` and
`human_reviewed_at` are **kept** as a written compat mirror, and nothing is
rendered publicly.

## What to build — the spec's sections D1-D11

- **D1/D2** enums + four columns in `src/lib/db/schema/`.
- **D3** the `articles_review_queue_idx` index.
- **D4** keep the two old columns; every mirror write carries the exact comment
  the spec names.
- **D5** ONE migration `0003_article_authorship.sql`, in the spec's required
  order: create types → add nullable columns → backfill → SET DEFAULT/NOT NULL
  → FK + index. Generate with `pnpm db:generate`, then hand-add the backfill in
  the correct position so no row is ever briefly wrong.
- **D6-D9** the admin articles view at `/admin/inspire`: authorship badge on
  every row, two independent filters (authorship + review) replacing the single
  `source` select with the old param values accepted as aliases, the
  "Needs review" chip itself as the one-click mark-reviewed button, and the
  pending-first sort.
- **D10** nothing public — **and write the test the spec asks for**, asserting
  the public article page exposes none of the four fields.
- **D11** `scripts/ingest-article.mts` stamps `authorship='ai'` +
  `review_status='pending_review'` on insert and in the `ON CONFLICT DO UPDATE`
  set list, honouring an optional front-matter `authorship` override.

## Verification you must actually run and report (spec §3, D-V1..D-V10)

Run these and paste the real output into your result file. Do not report a
result you did not observe.

- `pnpm typecheck` — clean
- `pnpm lint` — clean, no new warnings
- `pnpm test` — all pass (baseline is 190 tests passing; the number must not go down)
- `pnpm build` — completes **including static prerender**
- The migration applies to a database already at `0002`, and you can show
  `GROUP BY authorship, review_status` afterwards.
- `authorship`/`review_status` are genuinely NOT NULL (an INSERT with an
  explicit NULL is rejected; an INSERT omitting them succeeds via defaults).

**Database for local verification:** use a **local/throwaway Postgres**. Do NOT
connect to production Supabase for any write. If you cannot stand one up, say so
plainly in your result file — do not substitute production and do not fake the
result.

## Hard constraints

- **Never hardcode, print, or commit a secret.** Credentials come from the vault
  (`vault.ps1 run`, Doppler project `hellokahwin`). If a step needs a credential
  you cannot obtain, stop and write that in the result file.
- **Do not deploy.** Do not push. Commit locally only — shipping is a later phase
  run by someone else.
- **Do not publish the eight C2.4 articles.** Not in scope, forbidden by the brief.
- **Do not drop `is_ai_generated` or `human_reviewed_at`.** Explicitly out of scope.
- Do not modify the companion spec or any file under `docs/` in the other repo.
- You are non-interactive. Use non-interactive flags on everything
  (`--yes`, `GIT_PAGER=cat`, `--no-pager`). Never open a pager, prompt, or editor.

## Completion artifact — REQUIRED

When finished, write your result to:

```
_bmad-output/autopilot/chunk-d-result.md
```

It must contain, in this order:

1. `STATUS: COMPLETE` or `STATUS: BLOCKED`
2. The list of files you changed or created.
3. The **verbatim tail** of each verification command's output (typecheck, lint,
   test, build) — real output, not a summary.
4. The migration's applied result and the `GROUP BY authorship, review_status`
   row counts, or an explicit statement that you could not stand up a local
   database and why.
5. Anything you could not do, and why.
6. The local commit sha(s) you created.

**An unreported result does not exist.** Write that file even if you are blocked.
Commit your work locally before writing it.
