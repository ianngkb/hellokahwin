STATUS: done. Site analytics is built and committed locally; nothing is pushed. One D16 sub-step is a FAIL, as the TASK allows: signing in as admin can't work locally. The dashboard data path was checked against real Postgres instead.

Branch: `ianng89/hellokahwin-site-analytics`. TASK-dev.md names `ianng89/whelk`, but the worktree's branch was already renamed when this run started, and this is also the branch the spec names.
HEAD: `a9ced39c1dfed8b71938ade52921d7a605d1dbe0` (baseline `4d94f0843de33ea984fb8356330ab170f8906a04`)

## Commits

| SHA | Message |
| --- | --- |
| 8044ac6 | Add analytics_events table (migration 0005, RLS on) and analytics deps |
| 5e7aad5 | Add the /api/v1/analytics/collect endpoint |
| ad9da5f | Turn the no-op track() seam into a real first-party tracker |
| a9ced39 | Add the admin Site analytics dashboard |

The branch touches 51 files. None of them are under `_bmad/`, `_bmad-output/` or `.tmp-ops/`, and there are no changes to `vercel.json` or `.github/`. Run scratch and the spec stay untracked.

## Verification (dev)

| ID | Result | Evidence |
| --- | --- | --- |
| D1 | PASS | `collect/__tests__/route.test.ts`: two Chrome-UA events → 200 `accepted:2`, a single insert with 2 rows, `is_bot=false`, mocked hash, `visitor_id` null |
| D2 | PASS | Same file: Googlebot UA is stored with `is_bot=true` and a `search_engine` bot_reason |
| D3 | PASS | Same file: `visitor_id` in the body is ignored (stored NULL); the `_hk_vid` cookie UUID is stored; a malformed cookie gives NULL |
| D4 | PASS | Same file: invalid JSON → 400, 51 events → 400, `screen_width:-1` → 400, mocked limiter → 429 |
| D5 | PASS | `hash.test.ts`: throws when the salt is unset; different KL days give different hashes and the same day gives the same hash; no IP substring in the output |
| D6 | PASS | `tracker.test.ts`: `track('Photo Gallery Opened',{photo_count:3})` queues one event with pathname, session_id and props; `flush()` calls fetch on the collect endpoint |
| D7 | PASS | `tracker.test.ts`: a framed context queues nothing; `/draft/abc` gives 0 pageviews and `/artikel/x/y` gives 1 (also `track()` on `/draft/` gives 0) |
| D8 | PASS | `date-range.test.ts`: `toUtcRange` gives `2026-09-30T16:00Z..2026-10-01T16:00Z`; previous period is `2026-09-02..2026-10-01`; a bad date falls back |
| D9 | PASS | `sql-filters.test.ts`: `xx` → undefined, `my` → `MY`; `Unknown` → undefined, `10` → `10`; `bogus` → `human` |
| D10 | PASS | `resolve-page-titles.test.ts`: article title, tag name, `/` → `Laman Utama`; `/unknown` is absent |
| D11 | PASS | `admin-nav-sections.test.ts`: `/admin/site-analytics` is in the flattened nav, and `findGroupForPath` returns `analytics` |
| D12 | PASS | One `ENABLE ROW LEVEL SECURITY` line; no `DROP` or existing-table `ALTER`; journal has `idx 5, tag 0005_analytics_events` |
| D13 | PASS | Local Postgres 18 on :55432 from `.tmp-ops/pgdata` (never prod): `pnpm db:migrate` applied 0000–0005. `\d analytics_events` shows the table, 4 indexes and "row security enabled"; `pg_tables.rowsecurity = t` |
| D14 | PASS | After `pnpm build`, `grep -l "ua-parser\|UAParser" .next/static/chunks/*.js` matches 0 files; the `_hk_vid` tracker chunk is present |
| D15 | PASS (note) | `pnpm typecheck` 0; `pnpm test` 61 files / 789 tests pass; prettier clean; `pnpm build` 0 (DATABASE_URL = local DB, dummy salt and Clerk secret). Lint: `eslint . --ignore-pattern "_bmad/**"` gives 0 errors. Plain `pnpm lint` exits 1 in this worktree only because of 12 errors in the untracked, git-excluded `_bmad/wds/scripts/*.js`, which is not on master |
| D16 | FAIL (admin sign-in) / PASS (collection + data path) | The `pnpm dev` port 3200 setup used the local DB. A real headless Chrome (Playwright, desktop Chrome UA) opened `/?utm_source=dev-verify&utm_campaign=dev-check`; the collect POST returned 200 `{"accepted":1}`; `SELECT utm_source …` gave `dev-verify` (is_bot=f, browser Chrome). **The signed-in dashboard was not viewable**: hellokahwin's Clerk is a production-only instance (`pk_live`, locked to the hellokahwin.com domain), and Doppler `hellokahwin` dev/stg/prd configs hold no secrets, so there are no local admin keys. Signed out, `/admin/site-analytics` gives 307 → `/login`. **Data path instead**: every dashboard getter in `queries.ts` and `resolvePageTitles` ran against the real local Postgres for today. Results: 1 unique visitor and 1 visit; Sources `Direct / None`; UTM campaign `dev-check`; UTM source `dev-verify`; Top/Entry/Exit `/`, titled `Laman Utama`; Chrome/Windows/Desktop; traffic humans 1. An earlier headless-UA visit was correctly flagged `headless:chrome` and excluded from Humans. The chart zero-fills a 7-day range |

## Review (bmad-build-auto step 4, one pass)

The four review layers (blind, edge-case, verification-gap, intent) raised 59 findings: 1 high, 24 medium, 27 low, 7 false. 28 were patched and 31 rejected, each with a reason; none were deferred. The full triage log is in `_bmad-output/implementation-artifacts/spec-hellokahwin-site-analytics.md`.

The high was the bot list matching any UA containing `pinterest`. That flagged Pinterest's in-app browser, i.e. real visitors, as bots; it now matches only the crawler. The patches also added:
- a UTM Source panel, so the success signal's `utm_source` is visible;
- `/draft/` suppression for `track()`;
- truncation instead of rejecting a whole batch;
- props bounds;
- a UUID fallback;
- a chart zero-fill;
- a range clamp helper;
- tests for queries, actions, the rate limiter and the drill-down links.

The full gates (D1–D16 above) were re-run after the patches.

The spec frontmatter has `followup_review_recommended: true`, because a high was patched and the patches have not been re-reviewed. The external review step is the next gate.

## Spec handling

The spec had no `status` frontmatter, which build-auto needs to route it. I added `status`, `baseline_revision` and `followup_review_recommended` to the frontmatter, and appended the Review Triage Log and Auto Run Result sections. No spec content was rewritten, and no new spec was written.

## Pre-existing issues noticed (not fixed)

1. **Single-tab nav groups are hidden.** `admin-group-tabs.tsx` renders nothing for a group with fewer than 2 tabs, as Authors and Media already experience. So the new Analytics group shows in the sidebar and ⌘K but not in the group tab bar that CAP-13 lists. Changing that component would change the other groups too, so it's left for an owner decision.
2. **Lint is red in any worktree that has the copied `_bmad/`.** `eslint.config.mjs` has no `_bmad/**` ignore, and `_bmad/` is excluded only via `.git/info/exclude`. Fix: add `_bmad/**` to its globalIgnores (one line).
3. **Doppler holds no secrets for hellokahwin.** Doppler `hellokahwin` (TWN workplace) has dev/dev_personal/stg/prd configs but no secrets, and no `.env`/`.vercel` exists locally. The ship step's plan to set `ANALYTICS_SALT` "in Doppler hellokahwin + Vercel" will find Vercel to be the only real store. Local admin testing would need a Clerk development instance.
4. **Deprecation warnings at dev start:** Next 16 says the `middleware` file convention should become `proxy`, and Clerk's `createRouteMatcher` is deprecated.

## Notes for the ship step

- Set `ANALYTICS_SALT` in Vercel production and preview **before** the deploy; the collector answers 503 without it.
- Apply migration 0005 to prod with `pnpm db:migrate` in the ship step. It is additive; dev never touched prod.
- P2 and P4 can now also check that the UTM Source tab lists `autopilot-verify`.
- Local cleanup is done. The dev server and local Postgres are stopped. `.tmp-ops/pgdata`, the build logs and `.tmp-ops/pk.txt` (the public, derivable Clerk publishable key) remain in the ignored `.tmp-ops/`.
