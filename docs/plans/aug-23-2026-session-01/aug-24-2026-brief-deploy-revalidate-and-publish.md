# Brief — BMAD Dev Team — Deploy the revalidate fix, prove it on production, then open the queue

**Status:** APPROVED — execute. CEO decision under standing autonomy granted by
the owner 24 Aug 2026. No further board approval is required for this work.

**From:** ceo-hellokahwin · **Date:** 24 Aug 2026
**To:** BMAD, HelloKahwin's outsourced development consultancy.

**Execute through `/autopilot`.**

---

## What is approved

Branch `ianng89/pillars-ingest-redirects` at `105d9de` — 7 commits ahead of
`origin/master`, 15 files, +556/−50 — ships to **production**.

I read your work log before authorising this. The mechanism was traced through
Next 16.1.6's own source rather than guessed, the proof is a literal status code
on a single request, all 45 call sites were closed instead of the one the brief
named, and the regression guard survived an attempt to defeat it by aliasing the
import. That is the standard. Nothing here is conditional.

## The path, and the trap

Production deploys on this project land through the **Vercel git integration**,
not the CLI. `vercel deploy --prod` from the worktree ran 16+ minutes on 23 Aug
and registered no deployment at all — do not repeat that. Push to the production
branch and let the integration build.

Related hazard, already burned once: the integration also builds
`feat/command-centre-dashboard`, which is the migration-tool lineage with no
`next` dependency, so every push there fires a doomed preview build. Do not
touch that branch. If it is cheap to scope the integration or ignore the branch
while you are in there, do it and say so; if it is not, leave it and tell me.

## Then prove it on production — this is the part that matters

The local proof used Next's filesystem cache handler. On Vercel the handler is
Vercel's own. It receives the same `{ expire: 0 }` through the same interface,
but that is an interface contract, not evidence, and it cannot be exercised
without deploying. So:

1. Ingest one throwaway article into a pillar — **not** one of the eight C2.4
   articles. Use the same `zz-` naming so it is unmistakable.
2. Request the **pillar page exactly once**. Show the literal status code, the
   article-link count, and whether `noindex` is present on that same response.
3. Request the article URL exactly once. Literal status code.
4. Delete the probe and verify it is gone — articles, media, and any orphan
   `media_article_usage` rows, exactly as you verified it locally.

If the pillar needs a second request on production, the fix did not survive the
handler change. Stop there and report it; do not work around it.

## What I have decided about the edge cache

Your escalation was correct and I have taken it to the owner. **Option (b) is
the decision: purge the Vercel edge for the affected paths as part of ingest.**
Reasoning: we are about to publish continuously rather than once, (a) depends on
a human remembering a five-minute stopwatch during a busy week, and (c) reverses
a deliberate performance decision on traffic numbers we do not have.

**This is blocked on one thing only — a Vercel API token in the vault, which the
owner is providing.** Do not build against a hardcoded or personal token. When
the token lands it becomes a separate brief; do not fold it into this deploy.

**Interim rule until (b) ships:** publish, wait five minutes, then invite the
crawl. That is option (a) used as a stopgap with a known expiry, not as the
answer.

## Then the eight articles publish

Once step 3 above passes on production, the queue gate opens. The eight C2.4
articles publish under the interim rule — five minutes between the ingest and
any crawl invitation. I am not holding finished, review-board-cleared content
behind half a day of token plumbing while seven pillars sit on a `noindex`
clock; the article's own URL was never the failing surface, and the pillar
staleness window is five minutes, not permanent.

Publish them as one batch, then confirm: each article URL 200 on first request,
each parent pillar indexable, and all eight present in `sitemap.xml`.

## Rules

- Credentials from the vault via `vault.ps1 run`; never hardcoded, never printed.
- **Production has no recovery point** — `pitr_enabled=false`, zero platform
  backups. Treat every production write as unrecoverable and act accordingly.
- Report literal output. A status code, a log line, a query result. Not a
  summary of one.

## When done

Log to `docs/work-done/` and report: the deployment URL and commit, the
production one-request proof verbatim, the eight articles' publish confirmation,
and anything about the Vercel branch situation you were able to fix.
