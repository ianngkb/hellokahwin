# Decisions — hellokahwin site analytics

- [2026-10-30] Resume probe: fresh start. Branch ianng89/whelk = master HEAD, no spec, no prior run for this branch.
- [2026-10-30] Existing analytics: only `src/lib/analytics/tracker.ts`, a no-op `track()` seam ported from twn-new, with call sites in the article page, photo gallery and mobile article bar. No analytics tables, no GA tag, no collect endpoint. So there is no first-party historical event data to backfill — per the brief's fallback, build from scratch.
- [2026-10-30] Port twn-new's site analytics (analytics_events table, /api/v1/analytics/collect, client tracker, bot detection, geo from Vercel headers, admin Site Analytics dashboard) rather than adopting a third-party (Plausible/GA): the brief asks for parity with twn-new.
- [2026-10-30] No cron / scheduled rollups. Commit 4e8aaaf (2026-10-29) deliberately removed all scheduled automation from hellokahwin. Dashboard reads raw events with indexes; at hellokahwin's traffic this is fine. twn-new's rollup tables are left out.
- [2026-10-30] GSC history not imported as "historical site analytics": GSC is search clicks/impressions, not pageviews, and the GSC service account lost access to the property (per 4e8aaaf). Noted as a follow-up.
- [2026-10-30] Preflight: project BMAD engine 6.10.0 vs library 6.12.0 — escalated (hard-block row).
- [2026-10-30] User chose to upgrade the toolkit first ("upgrade it for me first"); ran brain/upgrade.sh on their instruction.
- [2026-10-30] upgrade.sh finished clean: all six project engines now 6.12.4 (hellokahwin 6.10.0 -> 6.12.4). Copied the untracked _bmad/ from the main checkout into this worktree (excluded from git there).
- [2026-10-30] hellokahwin's site branch is master; _bmad/ is tracked only on the docs branch 'main'. Added /_bmad/ to the shared info/exclude (no effect on main, where it is tracked) so the copied engine can never be committed to master.
- [2026-10-30] Spec auto-accepted (Fable planner): `_bmad-output/implementation-artifacts/spec-hellokahwin-site-analytics.md`.
- [2026-10-30] Spec open question "retention": no purge script in this run — growth is small at hellokahwin's traffic and any purge job would need a scheduler the project forbids. Recorded as follow-up.
- [2026-10-30] Spec open question "admin self-exclusion": count admin visits (parity with twn-new, which only excludes impersonation). Follow-up if it skews numbers.
- [2026-10-30] hellokahwin has a single Supabase DB (= production). Dev checks D13/D16 run against a throwaway local Postgres (scoop postgresql binaries) — never prod. The prod migration is applied only in the ship step.
- [2026-10-30] ANALYTICS_SALT: generated as a random 32-byte hex at ship time and set in Doppler `hellokahwin` + Vercel production/preview before the deploy. Not a user-held secret.
- [2026-10-30] Dev worker builds in this run's worktree (branch ianng89/whelk) rather than a child worktree: single chunk, avoids a second merge back.
- [2026-10-30] Worktree branch is ianng89/hellokahwin-site-analytics (renamed before run start; run record opened as ianng89/whelk). Added _bmad/** and .tmp-ops/** to eslint globalIgnores (dev worker's pre-existing note #2).
- [2026-10-30] Review (rung 0, Opus, 3 layers x 8 chunks): 46 findings (0 critical, 12 major, 34 minor) on ceceb17. Sent to the original dev worker as fixer.
- [2026-10-30] Fixer: 37 fixed, 9 rebutted (spec CAP refs / twn-new parity), HEAD 8d61eaf; gates green (849 tests). Fix-check dispatched.
- [2026-10-30] Fix-check 1: 45/46 resolved; F17 rebuttal rejected (unpublished article titles resolve). Sent back to fixer; previous fixer table kept as fixer-DONE-1.md.

## Review notes (non-blocking)

- 89 acceptance/reviewer NOTES recorded in the verdict JSON (`~/.claude/review-log/hellokahwin/ianng89-hellokahwin-site-analytics.json`, `notes[]`). None blocking, none sent to the fixer. Notable: Analytics nav group position (between Media and Design) is unspecified by the spec.

- [2026-10-30] Fix-check 2: F17 closed; verdict clean at cf307ad (46 findings: 38 fixed, 8 rebutted).
- [2026-10-30] ship rule 4: queued — 1 branch in the hellokahwin queue, 0 min old, no sibling runs, not a bug fix, no dependent migration. /imdone used push-branch (new-repo profile; base origin/master since origin/main is the docs branch).
