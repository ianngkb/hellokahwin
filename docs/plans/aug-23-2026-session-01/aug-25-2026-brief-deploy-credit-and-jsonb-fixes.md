# Brief — BMAD — Ship the credit-race fix and the jsonb fix to production

**Status:** APPROVED — executing. CEO decision under standing autonomy.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.

---

## Why this is urgent

**The credit race is live in production right now.** The audit proved it:
three sweeps of the same URLs on the same day, varying only concurrency —

| Sweep | Method | Articles | Cover credit missing |
|---|---|---|---|
| A | 8 concurrent | 24 | **8** |
| B | 8 concurrent | 25 | **8 — a different eight** |
| C | 1 at a time | 26 | **0** |

Any article can serve an uncredited photograph at any time, with no write, no
log, and nothing to notice it by — then freeze that state into the edge for up to
a year of `stale-while-revalidate`. **The owner's core rule is being violated
non-deterministically on live pages.**

The fix exists and is verified. **It is sitting uncommitted in the working tree.**

## What ships

Branch `ianng89/pillars-ingest-redirects`, currently **3 commits ahead of
`origin/master`** plus uncommitted work:

**Committed, undeployed:**
- `12182d6` — ingest jsonb fix (stops writing `content` as a jsonb *string*;
  `jsonb_typeof` was `string` on our rows, `object` on legacy) + figure bytes
- `c219826`, `121d20b` — work-done docs

**Uncommitted, must be committed then shipped:**
- `src/app/(public)/artikel/[category]/[slug]/page.tsx` — cover credit now rides
  the article page's **primary join** (`leftJoin(media, eq(media.url,
  articles.coverImageUrl))`) instead of a third read on a shared 4s budget with a
  bare `catch {}`
- `src/lib/inspire/article-cache.ts` — cache key `v7` → **`v8`**
- `src/lib/inspire/pillar-queries.ts` — `getCoverCredit` deleted
- `src/lib/inspire/__tests__/article-cache.test.ts` — pins v8
- `src/lib/inspire/article-file.ts` — check what changed here and say so; if it is
  unrelated to these two fixes, **do not ship it** in this deploy

**The `v8` bump is load-bearing, not cosmetic.** With `revalidate: false`, every
cached `v7` entry lacks the two new fields — without the bump those articles keep
rendering an uncredited cover, and the defect survives its own fix.

## How to deploy

**Push to `master` and let the Vercel git integration build.** `vercel deploy
--prod` from a worktree ran 16+ minutes on 23 Aug and registered nothing; the git
integration registers immediately.

Run the gates on the exact commit first: `pnpm test`, `pnpm typecheck`,
`pnpm build`. The audit reported 229 tests passing — confirm that still holds
with everything committed.

## Prove it — and prove it the way the defect demanded

A single-threaded check proves nothing here; **sweep C passed while the bug was
live.** After the deploy:

1. **Sweep all live articles with 8 concurrent fetches**, reading live HTML, and
   report how many covers lack a rendered credit. **Expected: zero.**
2. **Run that sweep twice**, as the audit did — a different eight failing on the
   second pass was the proof of the race. Two clean concurrent sweeps is the
   evidence I want.
3. Confirm `jsonb_typeof(content)` on newly-ingested rows.
4. Report the deployment id, commit sha and state.

## Rules

- Production deploys go through the git integration, never the CLI.
- `pnpm --silent`, never `pnpm run`, for anything with a secret in argv.
- Do not touch article content or any URL.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.

The question worth answering: **a verified fix for a live, rule-breaking defect
sat uncommitted while four other agents worked.** The CEO found it by running
`git status`, not from a report. What in the process should make "fixed but not
shipped" impossible to miss? Name the file, make the edit, log the path.
