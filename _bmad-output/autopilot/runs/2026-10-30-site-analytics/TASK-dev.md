# TASK — dev (Opus): build hellokahwin Site Analytics

Run `/bmad-build-auto` pointed at the EXISTING spec:
`_bmad-output/implementation-artifacts/spec-hellokahwin-site-analytics.md`.
Do NOT write a new spec. If build-auto cannot find/accept it, stop and report (STATUS: blocked).
Internal review: at most ONE pass (`_bmad/custom/bmad-build-auto.toml`). No deferrals — patch or reject.

Decisions already made by the orchestrator (see `decisions.md` in this run dir) — treat as part of the spec:
- Spec open questions are closed: no retention/purge script; admin visits ARE counted.
- **Never touch the production database.** hellokahwin has one Supabase DB and it is production. Do NOT run
  `pnpm db:migrate` / `db:push` against Doppler/Vercel `DATABASE_URL`. For D13 and D16 spin up a throwaway local
  Postgres from `C:/Users/Ian Ng/scoop/apps/postgresql/current/bin` (`initdb` into a dir under `.tmp-ops/`,
  `pg_ctl start` on a free port, e.g. 55432) and point `DATABASE_URL` at it for those commands only. For D16 the local
  DB needs the schema from migrations 0000–0005 applied (`pnpm db:migrate`). Stop the local server when done.
- For D16's admin login you may inject Clerk keys with
  `doppler run --project hellokahwin --scope "$HOME/Documents/Code/twn-new" -- …` but override `DATABASE_URL` to the
  local DB. If the admin login cannot be made to work locally, record D16 as a FAIL with the reason (do not fake it)
  and verify the dashboard data path another way (e.g. a rendered server-component test).
- `ANALYTICS_SALT` for local use: any random value. Do NOT set it in Doppler/Vercel — the ship step does that.
- Use the dev port from `/devservers` for hellokahwin (package.json says 3200).
- `_bmad/` is untracked and excluded — never `git add -A` blindly; never commit `_bmad/`, `.tmp-ops/` or run scratch.
- Do NOT add any cron, `vercel.json` crons entry, or GitHub workflow.

Before reporting done:
1. Run EVERY Dev check (D1–D16) in the spec's verification plan. Fix any FAIL. A check you cannot run is a FAIL with
   the reason, not a blank row.
2. Commit locally on this branch (`ianng89/whelk`) with clear messages. Do not push.
3. Write `_bmad-output/autopilot/runs/2026-10-30-site-analytics/dev-DONE.md`:
   - line 1: `STATUS: done` (or `blocked` / `failed` + why)
   - `## Verification (dev)` table: `| ID | Result | Evidence |` one row per D1–D16
   - HEAD sha, list of commits, any pre-existing issue you noticed but did not fix.
Print a `PROGRESS:` line in your terminal at each major milestone (schema, collect route, tracker, dashboard, checks).
