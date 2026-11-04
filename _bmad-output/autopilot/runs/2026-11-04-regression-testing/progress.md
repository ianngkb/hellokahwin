# progress — 2026-11-04 regression-testing (hellokahwin)

PAUSED 2026-11-04 (orchestrator pause request; machine restart). No deploy or /buildit in flight. Nothing pushed.

## Where I am
- Branch reset from origin/main (docs branch) to origin/master 9e7b840 — master is the live Next.js site (Vercel git integration, PR merge to master deploys). See decisions.md.
- `pnpm install --frozen-lockfile` done (4m31s). NOTE: node_modules is not committed; if missing after restart, re-run it.
- BASELINE on origin/master: `pnpm test` = 65 files / 850 tests, all pass, ~47s. `pnpm typecheck` clean (~1m39s). `pnpm lint` 0 errors / 159 warnings, prettier clean (~2m14s).
- No buildit/imdone profile exists for hellokahwin (falls to "New repo"); prior ships = PR squash-merge to master → Vercel auto-deploy.
- Vercel posts GitHub deployment_status events (vercel[bot], environment "Production", state success; environment_url is the per-deploy *.vercel.app URL — smoke should target https://hellokahwin.com).
- Commit 4e8aaaf (2026-10-29) removed all workflows "so monitoring can be rebuilt from scratch"; old lint-and-test.yml (git show 4e8aaaf^:.github/workflows/lint-and-test.yml) is the shape to reuse. Lesson: keep new checks free of Playwright downloads and secrets.
- Hand probe of live site (all as expected): / 200, /robots.txt 200, /sitemap.xml 200 (119 locs), /artikel 200, /brand 200, /login 200, /admin 307→/login, unknown page 404, unknown article 404, /api/v1/search?q=kahwin 200 JSON.

## Next step
1. Write scripts/smoke-prod.mjs (plain Node fetch, read-only, no fixtures: picks an article + category from live sitemap; checks above + POST junk to /api/v1/analytics/collect expects 400, og:image 200). Run by hand vs prod until green.
2. .github/workflows/ci.yml (lint, typecheck, test on PR + push master) and .github/workflows/smoke-production.yml (on deployment_status success, environment Production → node scripts/smoke-prod.mjs).
3. docs/verify.md (full-suite cmd+runtime, smoke cmd+where, fixtures=none, not covered=admin/signed-in) + a short CLAUDE.md pointer.
4. Add a couple of critical-path tests only if gaps found; review (codex-reviewer procedure) → /imdone → ship via PR to master; report buildit-profile change needed (add a hellokahwin profile that runs pnpm test + typecheck + build).
