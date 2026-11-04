# Decisions — 2026-11-04 regression-testing (hellokahwin)

- [2026-11-04] Track: Standard — CI workflow + smoke script + docs, est. ~300-500 lines; touches no auth/payments/schema. Planner skipped: brief from orchestrator is itself the spec (regression-testing.md is the definition of done); dispatched worker rule "no helper workers unless task asks" — I build myself, review via codex-reviewer procedure.
- [2026-11-04] Worktree was cut from origin/main (docs branch, old Electron migration tool). Repo default + shipping branch is master (Next.js site on Vercel, vitest, ~65 test files). Reset branch (no own commits) to origin/master; layers applied to master. The orchestrator's "backend/frontend, 5 tests" description is of main, not of what ships.
