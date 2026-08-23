# Handoff — AI authorship tag + deploy (resume from a session rooted in the site worktree)

**Date:** 23 Aug 2026 · **Session:** aug-23-2026-session-01
**Status of prior run:** HALTED before any code was written. Nothing built,
nothing deployed, production untouched.
**Owner decision (23 Aug 2026):** resume in a new session rooted at the site
worktree; **triage the open review findings first, then ship.**

---

## Start here

Run the new session with its working directory set to:

```
C:\Users\Ian Ng\orca\workspaces\hellokahwin-site\pillars-ingest-redirects
```

That worktree exists, is clean, and is on branch `ianng89/pillars-ingest-redirects`.
The previous session's working directory was the docs repo, so every write into
that worktree was refused by the permission classifier — that, and only that,
is what stopped the last run. Rooting the session there removes the problem.

## Read these three, in this order

1. `docs/plans/aug-23-2026-session-01/aug-23-2026-brief-ai-tag-and-deploy.md`
   — the CEO's brief. Still authoritative on intent.
2. `docs/work-done/aug-23-2026-session-01/aug-23-2026-done-ai-tag-and-deploy.md`
   — the halted run: three findings that amend the brief, plus the pre-deploy
   live baseline (the "before" half of the verification the brief asks for).
3. `docs/plans/aug-23-2026-session-01/aug-23-2026-spec-ai-authorship-tag.md`
   — the finished engineering plan. Execute this; do not re-derive it. (It was
   written to a scratchpad by the halted run and has been preserved here.)

Those paths are in the docs repo at
`C:\Users\Ian Ng\Documents\Code\hellokahwin\hellokahwin` — a *different* repo
from the site. Site code goes in the worktree; logs and plans go in the docs repo.

---

## Order of work (owner-approved)

**1. Triage the review findings BEFORE building.**
`~/.claude/review-log/hellokahwin/pillars-ingest-redirects.json` records
`"verdict": "findings"` at sha `fd93762` — 0 critical, **20 major + 9 minor
open**. Branch HEAD has since moved to `6f28a1a`, so some are likely already
closed. Establish which, do not assume. `/autopilot` will not ship without a
clean verdict at the exact HEAD being deployed, so this gates everything.
Report the real post-triage count before starting the build.

**2. Build the tag** per the spec. Load-bearing decisions already made and not
to be relitigated:
- Two enums, `article_authorship` and `article_review_status`; four columns on
  `articles`; `authorship` NOT NULL default `ai` (fail-safe direction).
- **One migration, `0003`**, ordered create types → add nullable → backfill →
  SET DEFAULT/NOT NULL → FK + index.
- Backfill derives from `is_ai_generated` rather than literals, so it stays
  correct against a restore or preview branch.
- The 29 legacy posts become `human` + `pending_review` — not `reviewed`.
  Nobody has reviewed them.
- **`is_ai_generated` and `human_reviewed_at` are NOT dropped.** They stay as a
  written compat mirror and rollback net. Dropping them is a separate follow-up
  needing CEO approval.
- Nothing rendered publicly, with a test asserting it.

**3. Deploy** only after 1 and 2, following the brief: back up production,
apply `0003`, deploy to Vercel, then verify with real requests against the live
site — not build output.

---

## Facts already established — do not re-derive

- **Production DB (`nyidzlupgmyyazhyykuk`):** 29 articles, all `published`, all
  `is_ai_generated=false`, all `human_reviewed_at IS NULL`, **all carry a
  `wp_id`** → every one is a legacy WordPress migration. The `human` backfill
  needs no judgement call.
- **Zero agent-pipeline content in the database.** The eight C2.4 articles have
  never been ingested. The `ai` + `pending_review` stamp must therefore be
  applied by the **ingest path at write time**, not by a backfill UPDATE.
- **The tag partly exists already.** `articles` has `is_ai_generated` (bool NOT
  NULL) and `human_reviewed_at`; `/admin/inspire` already has an AI chip, a
  combined four-value `source` filter and a dropdown "mark reviewed". This is a
  widening, not a greenfield build.
- **Migration `0002` (pillars + image credits) is NOT applied to production.**
  `drizzle.__drizzle_migrations` holds only `0000` and `0001`.

### Pre-deploy live baseline (independently re-confirmed 23 Aug 2026)

```
/artikel/nikah-undang-undang  -> 404      (all seven pillar pages 404)

curl -I https://hellokahwin.com/hantaran-kahwin/
  308 -> /hantaran-kahwin
  308 -> /artikel/hiasan-dekorasi/hantaran-kahwin
  200                                     (two hops, confirmed)

sitemap: 34 URLs, three category hubs
```

---

## Constraints that still bind

- Build through `/autopilot`, visible Orca terminal.
- Credentials from the vault (`vault.ps1 run`, Doppler project `hellokahwin`).
  Never hardcoded, never printed, never committed.
- **Do not publish the eight C2.4 articles.** Separate CEO decision.
- The tag is internal review tracking only — no public disclosure banner.
- Verify against the live site with real requests. Never report a metric,
  build result or deploy URL that was not observed.
- Stop and report if the production migration looks risky in a way the brief
  did not anticipate.

## Still open for the owner

1. Dropping `is_ai_generated` / `human_reviewed_at` — follow-up release.
2. Escalations E1 and E2 from the prior run: ingest's right to publish at all,
   and whether the seed may hold a production connection even read-only.
3. The pillar seed, the `noindex` on the six missing child hubs, and the 24
   legacy WordPress categories sitting alongside the seven pillars — all still
   undecided and unbuilt in production.
