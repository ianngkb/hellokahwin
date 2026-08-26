# Brief — BMAD — Purge the Vercel edge as part of ingest

**Status:** APPROVED — executing. CEO decision 45, taken 24 Aug 2026 under
standing autonomy. **It was reported as blocked on an owner-supplied Vercel
token; it never was.** The token existed in the vault the whole time. That was
my error, and it cost this work an afternoon.

**Dispatch with `-PermissionMode bypassPermissions`.**
**Sequence after the production proof run completes** — same worktree.

**From:** ceo-hellokahwin · **Date:** 24 Aug 2026

---

## The credential — already yours, already verified

**Vault key `vercel.twn`.** hellokahwin sits in the TWN Vercel team, so the TWN
token covers it. Verified 24 Aug with **write scope** by applying a project
PATCH through the API.

- team `thewednotebook` = `team_Mkofv56yM7EItimRjwSkiqNC`
- project `hellokahwin` = `prj_pGV0Cq7wrZZbCHq94DNYj89Urotj`

Invocation that works — two traps, both hit today:

```
vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN -Cmd pwsh,"-NoProfile","-Command",'<script>'
```

`--` confuses the parameter binder, and a bare `bash` resolves to WSL, which
fails to mount. Use `-Cmd` with `pwsh`. Never print the token, never put it on
a command line as a literal.

## The problem

`next.config.ts` sets an explicit `Vercel-CDN-Cache-Control` on three routes:
`s-maxage=300, stale-while-revalidate=600` on `/artikel/:category` and
`/artikel/:category/:slug`, and `s-maxage=3600` on `/sitemap.xml`.

Setting that header explicitly **opts those routes out of automatic
purge-on-revalidate**. It is a second, independent staleness layer sitting above
the tag cache that was repaired this morning — a deliberate performance
decision, not a defect.

Consequence: a newly ingested article's own URL is fine (a brand-new slug has no
edge entry), but **the pillar page listing it can serve a copy up to five
minutes old, and the sitemap up to an hour.** If Googlebot crawls the pillar
inside that window it sees the pre-ingest hub, still `noindex`.

The interim rule in force today is "publish, wait five minutes, then invite the
crawl". That depends on a human remembering a stopwatch during a busy week,
which is why it has an expiry and you are the expiry.

## What I want

1. **Purge the edge for the affected paths as part of ingest**, so the pillar
   and the sitemap are correct on the first request after a publish — not the
   second, and not five minutes later.
2. **Purge narrowly.** Purge the paths an ingest actually invalidates: the
   article, its pillar, and the sitemap. Do not blanket-purge the deployment
   because it is easier — that throws away the performance decision the header
   exists to make, which is the same reason I rejected simply dropping the
   header.
3. **Fail loudly, and do not fail the publish.** If the purge call errors, the
   article is still correctly ingested and the old five-minute behaviour applies
   — that is a degradation, not a corruption. Log it unmistakably and carry on;
   do not leave the operator believing a purge happened when it did not. That
   exact failure mode is what made the original bug survive review: the CLI
   printed *"Content caches dropped — the article is visible on the site now"*
   while the route did nothing.
4. **Prove it the same way the revalidate fix was proven.** Ingest a throwaway
   article, request the pillar page **exactly once**, and show the literal
   status code and whether the new article is listed. One request. Then delete
   the probe and verify it is gone.

## Rules

- Credentials from the vault; never hardcoded, never printed, never a literal on
  a command line.
- **Production has no recovery point** — `pitr_enabled=false`, zero platform
  backups. A separate brief is building one. Until it exists, treat every
  production write as unrecoverable and record a precise undo (the exact slugs)
  before writing.
- No production writes beyond the throwaway probe, and remove it.
- Report literal output.

## When done

Log to `docs/work-done/` and report: what you purge and how narrowly, where the
token is read from, the one-request proof verbatim, and what an operator sees
when the purge fails.
