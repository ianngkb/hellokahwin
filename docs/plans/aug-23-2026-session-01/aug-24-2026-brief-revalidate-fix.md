# Brief — BMAD Dev Team — Fix the revalidate route

**From:** ceo-hellokahwin · **Date:** 24 Aug 2026
**To:** BMAD, acting as HelloKahwin's outsourced development consultancy.
The in-house Full-Stack Engineer role was retired on 24 Aug; you own
development now.

**Execute through `/autopilot`.** Plan, build, self-review, ship.

---

## The defect

Freshly ingested articles do not reliably appear on the live site. Warming the
URL a second time works; the underlying cause is the content revalidation
route. The previous engineer recorded it as *"fixing the revalidate route is
the real answer"* — see `_bmad-output/autopilot/decisions.md` in the site
worktree.

**Why this is now blocking, and not cosmetic.** Eight finished articles are
waiting to publish. If Googlebot's first crawl of a brand-new URL hits a page
that has not materialised, that is the worst possible first impression on a
URL we intend to rank — and we are inside a post-migration window where Google
is actively rebuilding its map of this site. A route fix is small. Shipping
eight articles into a broken revalidation path is not recoverable in the same
way.

## Where the code lives

Repo `ianngkb/hellokahwin`, worktree
`C:\Users\Ian Ng\orca\workspaces\hellokahwin-site\pillars-ingest-redirects`,
branch `ianng89/pillars-ingest-redirects` (already fast-forwarded onto
`master` at `7e84a02`). The route is
`src/app/api/cron/revalidate-content/route.ts`, added in this branch.

Start the session **inside that worktree** — writes outside the session root
are refused by the permission classifier, which cost three dead runs.

## What I want

1. **Diagnose before changing.** Establish what actually fails: is the route
   never invoked, invoked with the wrong path, revalidating a tag nothing is
   subscribed to, or racing the ingest write? Report the mechanism, not a
   guess.
2. **Fix it** so a newly ingested article is reachable on first request, with
   no manual warming.
3. **Prove it.** Ingest a throwaway article, request its URL exactly once,
   and show the literal status code. One request. If it needs a second, it is
   not fixed.
4. **Do not publish the eight C2.4 articles.** A throwaway test article is
   fine and should be cleaned up afterwards.

## Context you should have

- Seven pillar pages are live (all 200). All 29 legacy redirects verified
  clean — one hop to 200, no exceptions.
- The sitemap is now submitted to Search Console and reads Valid: 39 URLs,
  0 errors, 0 warnings.
- The pillars deliberately serve `noindex, follow` and stay out of the
  sitemap until an article publishes beneath them. **That rule has a clock on
  it** — long-term noindex degrades toward nofollow — which is the second
  reason this fix is urgent.

## Rules

- Credentials from the vault via `vault.ps1 run`; never hardcoded, never
  printed.
- No production data writes beyond the throwaway test article, and remove it.
- Production deploys follow board approval — bring me the ship report.
- Report literal output. A status code, a log line, a query result.

## When done

Log to `docs/work-done/`, and report: the actual mechanism of the failure,
what you changed, and the single-request proof.
