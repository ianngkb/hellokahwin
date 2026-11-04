# How hellokahwin is verified

The standard this follows is `brain/docs/regression-testing.md` (three layers:
every change has its own test, the whole suite gates every ship, a standing
smoke suite runs against the live site after every deploy).

## Where things are

- **`master` is the live site** (Next.js 16 on Vercel, region `sin1`). Vercel's
  Git integration deploys every push to `master`; there is no deploy workflow.
  Ships go out as a PR merged to `master`.
- `main` is a separate docs branch (the old Electron migration tool and
  `_bmad/`). Never cut a worktree for site work from it, and never use it as a
  merge base.
- Dev server: `pnpm dev` on port **3200**.
- There is one database and it is production (Supabase). Clerk is a prod-only
  `pk_live` instance, so admin pages cannot be signed into locally.

## Layer 2 — the whole suite, before every ship and in CI

| What                                     | Command          | Runtime (Windows dev box, 2026-11-04)    |
| ---------------------------------------- | ---------------- | ---------------------------------------- |
| Unit / integration tests (Vitest, jsdom) | `pnpm test`      | ~55 s — 67 files, 874 tests              |
| Type check (app + `scripts/seo`)         | `pnpm typecheck` | ~1 min 40 s                              |
| Lint + formatting                        | `pnpm lint`      | ~2 min 15 s (0 errors; warnings allowed) |

- CI: `.github/workflows/ci.yml` runs all three as separate jobs on every
  pull request and every push to `master` (the test job also runs
  `node --check scripts/smoke-prod.mjs`).
- **It is a hard gate on pull requests:** the repository ruleset
  "CI must pass on master" (GitHub → Settings → Rules) requires the three
  checks before a PR can merge, and blocks pushing to `master` directly, so
  ships go out as a PR. Vercel deploys whatever reaches `master`, so the PR is
  where the gate has to hold. To ship in an emergency, still open a PR; the
  checks take about 3 minutes. Removing the ruleset turns the gate back into a
  report.
- The ruleset's definition is `.github/rulesets/ci-must-pass-on-master.json`
  (the three job names above, from the GitHub Actions app, id 15368). If a job
  is renamed, update the file and re-apply it, or the old name is required
  forever and every PR blocks:
  `gh api -X POST repos/ianngkb/hellokahwin/rulesets --input .github/rulesets/ci-must-pass-on-master.json`
  (use `-X PUT …/rulesets/<id>` to update the existing one; list ids with
  `gh api repos/ianngkb/hellokahwin/rulesets`).
- Before a ship, run `pnpm test` on the batch **and** on `origin/master`. A
  test red on both is pre-existing (list it, it does not block). A test green
  on `origin/master` and red on the batch is a regression and blocks.
- Read the test count, not just the exit code.
- Baseline when CI was added (`origin/master` 9e7b840): 65 files, 850 tests,
  all green. Nothing is quarantined.

The tests mock the database and Clerk; none of them touches production.

## Layer 3 — the standing smoke suite against the live site

| What                               | Command                              | Where it runs                                                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live-site smoke, 11 checks, ~2–5 s | `node --test scripts/smoke-prod.mjs` | Automatically: `.github/workflows/smoke-production.yml`, when Vercel reports a successful **Production** deployment to GitHub (`deployment_status`). Also runnable from the Actions tab (`workflow_dispatch`) or by hand. |

- Target: `https://hellokahwin.com` (override with `SMOKE_BASE_URL`). The
  per-deploy `*.vercel.app` URLs are behind Vercel Deployment Protection, so
  the suite tests the public domain.
- It checks: home page, `sitemap.xml`, `robots.txt`, `/artikel`, one article
  page (H1, JSON-LD, canonical, share image loads), one category page lists its
  articles, search reaches the database, `/admin` redirects to `/login` when
  signed out, `/login` loads, unknown pages are 404 not 5xx, and the analytics
  collector answers 400 (or 429 when rate-limited) to an invalid body.
- **Read-only.** Every request is a GET, except one POST of an invalid body to
  `/api/v1/analytics/collect`, which is rejected before anything is stored.
  The suite runs in Node (no browser), so the client-side tracker never fires
  and no pageviews are recorded.
- **Fixtures: none.** The article and category are picked from the live
  sitemap on each run. It only needs the site to have at least one published
  article, which is real content. There is no seed script because there is
  nothing to seed.
- One retry after 60 s absorbs the moment between Vercel reporting success
  and hellokahwin.com serving the new build.
- Red does not roll back. It means production is live and something on it
  looks wrong. The workflow then opens (or comments on) a GitHub issue titled
  **"Live-site smoke check failed"**, which emails the repo's watchers. (The
  run is started by `vercel[bot]`, so GitHub's own failed-workflow email goes
  to nobody.) Close the issue once production is fixed.
- **Growing it:** when a shipped spec has a repeatable, read-only prod check
  marked `(standing)`, add it to `scripts/smoke-prod.mjs` in the same run.

## What is NOT covered

- Anything behind sign-in: the admin dashboard, the article editor, uploads,
  smart crops, site analytics screens. There is no saved signed-in session for
  a prod-only Clerk instance.
- Draft previews (`/draft/<token>`): they need a share token.
- How pages look: no browser runs in either layer, so layout, images actually
  painting, and client-side JavaScript (including the analytics tracker) are
  untested against production.
- Database migrations: applied by hand per ship (see the run log for the
  drizzle-history caveat); no test exercises them against Postgres.
