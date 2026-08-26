# Brief - Sprint 02 - RISK-05: The indexing monitor — a baseline you take once is a photograph

**Status:** APPROVED - executing.
**Repo:** C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/risk05-indexing-monitor
**Dispatch mode:** `bypassPermissions`
**Production database CRUD is granted.** Destructive operations with no
recovery path still stop and come back to the CEO.

## Why (verbatim from the tracker)

Murat, this meeting: the CEO found five dark articles by hand because it happened to run a URL inspection. SEO-01 was a one-off baseline. Nothing would have caught this, and nothing will catch the next one.

## Definition of done (verbatim - the bar, and it is NOT narrowed)

A scheduled job inspects every URL in the live sitemap, records coverage_state per URL with the date, and files a loud alarm (the RISK-01 pattern — a GitHub issue within 10s) when any URL is unknown-to-Google or uncrawled more than 72h after appearing in the sitemap. Proved by deliberately feeding it a URL known to be unknown and showing the alarm fired. Runs from the DEFAULT branch — scheduled workflows do not run from feature branches, which cost a reopen in Sprint 01.

**A DoD is never rewritten after the sprint starts.** If this turns out
bigger than its DoD assumed, it stays open, is parked with a reason, or
carries forward.

## The one thing that will silently break this item

**A scheduled GitHub workflow only runs from the DEFAULT branch.** A cron
workflow sitting on a feature branch never fires, and nothing tells you — no
error, no missed-run notice. This cost a reopen in Sprint 01, when RISK-01's
backup schedule was marked done while its workflow sat on a feature branch.

So the DoD's "runs from the default branch" is not a formality: **the workflow
file has to reach `master`**, and you should prove it did by showing the workflow
listed under the repository's Actions tab, or by `gh workflow list`.

## Prove the alarm by making it fire

RISK-01's backup alarm was proven by a real failure it caught. Do the same here:
**feed the monitor a URL you know is unknown to Google and show the issue it
files**, then close it. An alarm nobody has seen fire is a hypothesis.

The four URLs that were unknown this morning are now known, so you may need a
deliberately fabricated path (which will 404) or a genuinely new one. Say which
you used and why it is a fair test.

## Live state — all CEO-verified today, do not re-derive it

- **RISK-06 shipped.** `stale-while-revalidate` capped at 3000s, down from
  31535400 (365 days). Pages are no longer served from a year-old cache.
- **RISK-04 shipped.** Ingest resubmits the sitemap to GSC. Google re-fetched it
  (73 → 78 URLs) and **all four articles that were "unknown to Google" that
  morning left that state within eight hours** — two already indexed with
  breadcrumbs.
- **SEO-06 shipped.** `hantaran-kahwin` and `hantaran-tunang` are re-filed under
  `/artikel/hantaran-mas-kahwin/`; old URLs 308 in one hop, new URLs 200. Pillar
  empty states fell 3 → 1.
- **CONT-09 shipped.** 19 covers re-selected; the cover standard is live.
- **PLAT-05 shipped**, merged to `main`. **PLAT-07 shipped** — the sprint CLI
  reads back `why` and `retro`, and `status-board.py` is project-scoped.

## What SHIPPED means, and how to check it without a false negative

**Committed is not shipped.** Three Sprint 01 items were marked done on an
unmerged branch and the owner found all three by asking.

- **Verify by CONTENT on the default branch, never by ancestry.**
  `git merge-base --is-ancestor <branch> origin/master` **returns false forever
  for a squash-merged branch** — squashing makes a new commit, so the branch tip
  never becomes an ancestor. The CEO hit this today and briefly called shipped
  work unshipped. Use `git cat-file -e origin/master:<a file your work added>`.
- **Enumerate working trees, never recall them**: `git worktree list` and
  `orca worktree list`. A sprint was closed on "both repos clean" having checked
  two of three, and the third held every production rollback script.
- **Stay on the branch you were given.** Other agents share these trees; a
  `git checkout` relocates their HEAD silently. That happened today.
- **A status code cannot prove a deployment on an auth-gated app.** Quote content
  only the real page contains, plus a negative control — or say plainly that you
  cannot verify from outside and hand over a URL.

## Concurrency — you are not alone in this repo

Six other agents are working right now, several in sibling worktrees of the same
repository. **You have your own worktree; stay inside it.** If your work needs a
file another item owns, say so and stop rather than racing — ingest and config
writes are whole-file, so the loser's work vanishes silently.

## Report format

**CLAIM + EVIDENCE + LIVE LINK**, per item, not a summary. Quote literal command
output. If something cannot be verified from outside, say so and name what would
verify it — never present an inference as a measurement.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
What did we learn that is not written down; **which document must change and who
owns the edit (name the file)**; what did we do twice; what did we nearly ship and
what caught it. **Then make the edit.**
