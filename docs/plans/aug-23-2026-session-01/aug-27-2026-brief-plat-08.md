# Brief - Sprint 02 - PLAT-08: A working preview environment — "show me before you ship" has nowhere to point

**Status:** APPROVED - executing.
**Repo:** `C:/Users/Ian Ng/Documents/Code/buddy` - the MAIN checkout, now free.
**Dispatch mode:** `bypassPermissions` (Vercel config, env vars, credentials).

## Why (verbatim from the tracker)

Carried from Sprint 01, unassigned. All 39 Vercel env vars on buddy-web target production only; hellokahwin preview builds fail on unpopulated env vars. Two projects, same failure. The owner review path agreed 26 Aug depends on a URL that can be handed over before merge, and today there is none.

## Definition of done (verbatim - the bar, NOT narrowed)

Open a PR on each project and get a working preview URL that renders the changed page. Proof: quote content from the preview response body that only the changed version contains, plus a negative control. Preview-scoped env vars named in the /tokens registry with which are safe to share and which are not. If a project genuinely cannot have one, say so with the specific blocker.

**A DoD is never rewritten after the sprint starts.** If this turns out bigger
than its DoD assumed, it stays open, is parked with a reason, or carries forward.

## This item has been blocking verification all sprint - that is its real cost

Every auth-gated claim this sprint has ended with the same sentence: *the CEO
cannot verify this from outside, so the owner opening the page is the proof.*
That happened on PLAT-05 (`/docs` renders?), on PLAT-09 (does the sidebar
actually show?), and it is why two Sprint 01 items passed review while unshipped
- a 307 was read as health when `/sprints`, `/tasks` and
`/definitely-not-a-real-route-xyz` all return 307, because the redirect fires
before routing.

**A working preview URL is what turns "trust me" into "look at it."**

## What is already known, so you do not rediscover it

- **buddy-web: all 39 Vercel env vars target `production` only.** Nothing is
  scoped to preview, so any route touching Supabase or Clerk fails on a preview
  build.
- **hellokahwin: preview builds fail on unpopulated env vars.** Verified tonight
  from the deployment list - every preview today is CANCELED or ERROR; only
  `production` builds from `master` reach READY. One ERROR was `7597ea9`.
- **The Vercel token is in the vault as `vercel.twn`** and reaches team
  `thewednotebook` and both projects with write scope. **Check `/tokens` before
  reporting any credential as missing** - on 24 Aug the CEO escalated this exact
  token to the owner as a blocker when it was already in the vault. Ninety
  seconds of checking would have saved an afternoon.
- hellokahwin ships to production through the **git integration**, not the CLI;
  `vercel deploy --prod` ran 16 minutes and registered nothing.

## The judgement call this item must make explicitly

Preview env vars are a **secret-scoping decision**, not just a config toggle.
Some values are safe in preview (a read-only key, a dev database); some are not
(production Supabase service_role, Clerk production secrets). **Name which is
which in the `/tokens` registry**, as the DoD requires, and do not widen a
production secret's scope to preview just to make a build go green.

If a project genuinely cannot have a preview environment without exposing a
production secret, **say so with the specific blocker** and park that half. That
is a legitimate outcome and far better than a preview that leaks.

## Shipping checks

- **Verify by CONTENT on the default branch, never ancestry.**
  `git merge-base --is-ancestor` returns false forever for a squash-merged branch
  - the CEO hit this tonight and briefly called shipped work unshipped.
- **Enumerate trees**: `git worktree list`, `orca worktree list`. Eight agents are
  live; several share sibling worktrees of these repos.
- **Leave this checkout on `main`.** An agent left it on a feature branch earlier
  tonight and the CEO's next push went to the wrong ref.

## Report format

**CLAIM + EVIDENCE + LIVE LINK.** For the preview URLs specifically: quote
content from the preview response body that ONLY the changed version contains,
plus a negative control. That is the standard this whole item exists to make
possible.

## When done

Log to `docs/work-done/` in the hellokahwin repo, then a **`## Retrospective`** -
Stage 9, mandatory. What did we learn that is not written down; **which document
must change and who owns the edit (name the file)**; what did we do twice; what
did we nearly ship and what caught it. **Then make the edit.**
