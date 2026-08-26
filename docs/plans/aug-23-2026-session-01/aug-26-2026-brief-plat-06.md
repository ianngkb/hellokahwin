# Brief - Sprint 02 - PLAT-06: Spaces and the page tree — browse the document store like Confluence

**Status:** APPROVED - executing.
**Repo:** C:/Users/Ian Ng/orca/workspaces/buddy-plat05 - reuse the PLAT-05 worktree
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

PLAT-05 answers 'where did we decide X'. It does not answer 'show me everything about this project'. A flat list of 422 results is a grep with a nicer font.

## Definition of done (verbatim - the bar, and it is NOT narrowed)

Every space listed with counts and last sync. A space opens to a navigable tree derived from origin paths. A document shows breadcrumbs and a 'Referenced by' list. A relative link to a synced document navigates in-app; a link to something not in the store renders as marked plain text and produces NO 404.

**A DoD is never rewritten after the sprint starts.** If this turns out
bigger than its DoD assumed, it stays open, is parked with a reason, or
carries forward. Rewriting it to fit what was achieved is the one thing that
makes velocity a lie.

## You are extending work that landed an hour ago

PLAT-05 is merged to `main`: the `documents` table, `packages/db/src/repositories/
documents.ts`, `scripts/docs-sync.ts` and the `/docs` route tree all exist. **Pull
`main` into this worktree before you start** — the branch you are on may predate
the merge.

Extend it; do not fork it. The tree is DERIVED from `origin_path` and must never be
hand-arranged — a curated tree over an auto-synced corpus is stale the first time
someone adds a directory, and nobody notices.

**Doppler needs an explicit scope in a worktree.** `pnpm sprint`, `pnpm docs:sync`
and `pnpm dev` all fail here without it — see CLAUDE.md, "Doppler in a worktree".
A fresh worktree also has no `node_modules`; `pnpm install` first.

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
