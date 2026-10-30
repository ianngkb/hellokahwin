# TASK — fixer (you, the dev worker who built this): close every review finding

The review's findings are in `_bmad-output/autopilot/runs/2026-10-30-site-analytics/reviewer-DONE.md` (table under
`## Findings`, ids F1–F46) and in the verdict JSON
`C:/Users/Ian Ng/.claude/review-log/hellokahwin/ianng89-hellokahwin-site-analytics.json` (`findings[]`).
Use those ids exactly — never renumber.

Rules:
- Every finding, every severity, is either FIXED now or REBUTTED with a concrete reason (spec CAP reference, a test
  that proves it unreachable, twn-new parity the spec explicitly chose). No deferral. Rebuttals are judged at fix-check,
  so make them specific. The reviewer flagged F16, F23, F24, F35, F38–F40, F46 as overlapping your earlier triage
  rejections — rebut those with the spec reference where that still holds; F23 vs CAP-6 especially.
- Acceptance NOTES in reviewer-DONE.md are NOT findings — ignore them.
- Add/adjust tests where a fix changes behaviour. Re-run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
  (local DATABASE_URL/dummy salt as before; never prod DB). All must exit 0.
- Commit locally on this branch. Do not push.

Completion: write `_bmad-output/autopilot/runs/2026-10-30-site-analytics/fixer-DONE.md`:
- line 1: `STATUS: done` (or `blocked` + why)
- HEAD sha after fixes, and the reviewed sha `ceceb17983e6370d4ffbbdbc3a7f191403b79151`
- gate results (typecheck/lint/test/build)
- this table, one row per finding F1–F46:

| # | Layer(s) | file:line | Sev | Class | State | What I did |
| --- | --- | --- | --- | --- | --- | --- |

`Class` ∈ defect-user | defect-edge | test-gap | paperwork | rebutted | duplicate. `State` ∈ fixed | rebutted.
Classify honestly.
