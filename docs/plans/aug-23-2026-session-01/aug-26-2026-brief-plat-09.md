# Brief - Sprint 02 - PLAT-09: buddy sidebar carries the latest additions

**Status:** APPROVED - executing.
**Repo:** C:/Users/Ian Ng/Documents/Code/buddy - the MAIN checkout
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

Owner request, 26 Aug. /sprints shipped in Sprint 01 and reaching it means typing the URL. /docs arrives with PLAT-05 and will have the same problem. A surface nobody can navigate to is close to a surface that does not exist — two of Sprint 01's three unshipped items hid behind exactly that.

## Definition of done (verbatim - the bar, and it is NOT narrowed)

Every app route a signed-in user is meant to reach appears in the sidebar, grouped sensibly, with the current route highlighted. /sprints and /docs both present. Verified by listing routes under apps/web/app/(app) and showing each has a nav entry or a written reason it does not. Proof from the rendered response body with a negative control.

**A DoD is never rewritten after the sprint starts.** If this turns out
bigger than its DoD assumed, it stays open, is parked with a reason, or
carries forward. Rewriting it to fit what was achieved is the one thing that
makes velocity a lie.

## `/docs` now exists, which is why this is unblocked

PLAT-05 merged today: `apps/web/app/(app)/docs/` is live on `main` with search over
both repos. **It has the same problem `/sprints` had — no way to reach it but
typing the URL.** That is what you are fixing.

**Leave this checkout on the branch you create.** PLAT-07's agent left it on a
feature branch earlier and the CEO's next push went to the wrong ref. Cut your
branch, do your work, and if you merge, return the checkout to `main`.

Repo rules: `apps/web` imports **leaf subpaths only** (`@buddy/db/sprints`, never
`@buddy/db`). All UI from `@buddy/design-system`, tokens not hex, `textStyle` not
font sizes — and if you touch a shared component or token, update
`apps/web/app/(app)/design-system/reference.tsx` in the same PR.

## Live state you can rely on — all verified by the CEO today, 26 Aug

- **RISK-06 shipped.** `stale-while-revalidate` is capped at 3000s, down from
  31535400 (365 days). Pages are no longer served from a year-old cache.
- **RISK-04 shipped.** Ingest now resubmits the sitemap to GSC. Google re-fetched
  it (73 to 78 URLs) and **all four articles that were "unknown to Google" this
  morning have left that state within eight hours** — two are already indexed with
  breadcrumbs. A page you publish today reaches Google quickly.
- **SEO-06 shipped.** `hantaran-kahwin` and `hantaran-tunang` are re-filed under
  `/artikel/hantaran-mas-kahwin/`. Old URLs 308 in one hop; new URLs 200. The
  pillar's empty states dropped from 3 to 1.
- **CONT-09 shipped.** 19 covers re-selected; the cover standard is live in the
  workflow and in every editorial persona.
- **PLAT-05 shipped.** The document store is merged to `main`; `/docs` exists on
  buddy with search across both repos.
- **PLAT-07 shipped.** `sprint retro N` reads back, `sprint get` prints `why`,
  `--backlog` works as a bare flag, `status-board.py` is project-scoped and puts
  the handle on the same line as its state.

## What SHIPPED means for this item, and how it is checked

**Committed is not shipped.** Three Sprint 01 items were marked done while sitting
on an unmerged branch, and the owner found all three by asking.

- **Verify by CONTENT on the default branch, never by ancestry.**
  `git merge-base --is-ancestor <branch> origin/main` **returns false forever for
  a squash-merged branch** — squashing makes a new commit and the branch tip never
  becomes an ancestor. The CEO hit this today and briefly reported shipped work as
  unshipped. Use `git cat-file -e origin/main:<a file your work added>` instead.
- **THERE ARE MORE WORKING TREES THAN YOU THINK.** Enumerate them with
  `git worktree list` and `orca worktree list` rather than from memory. On 26 Aug
  a sprint was closed on "both repos clean" having checked two of three.
- **Leave the checkout on the branch you were given.** Another agent shares some of
  these trees; a `git checkout` relocates their HEAD silently. This happened today.
- **On an auth-gated app a status code proves nothing.** `/sprints`, `/docs` and
  `/definitely-not-a-real-route` all return the same redirect. Quote content only
  the real page contains, plus a negative control — or say plainly that you cannot
  verify from outside and hand over a URL.

## Report format

**CLAIM + EVIDENCE + LIVE LINK**, per item, not a summary. Quote literal command
output. If something cannot be verified from outside, say so and name what would
verify it — never dress an inference up as a measurement.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
What did we learn that is not written down; **which document must change and who
owns the edit (name the file)**; what did we do twice; what did we nearly ship and
what caught it. **Then make the edit.**
