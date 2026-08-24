# Done: DEPLOY ONLY — pillars, ingest, redirects, AI authorship tag

**Task:** Brief `aug-23-2026-brief-deploy-only.md`
**Plus:** `aug-23-2026-authorization-seed-pillars-production.md` (closes OPEN Escalation 2)
**Engineer:** full-stack-engineer · **Date:** 23–24 Aug 2026
**Status:** **SHIPPED.** Deployed to production and verified against the live
site. Three of the four verification criteria pass on live evidence; the
fourth is blocked by a deliberate design rule, explained below.

---

## What is live

| Item | State | Evidence |
|---|---|---|
| Seven pillar pages resolve | ✅ **200** (were 404) | `curl -I` all seven, below |
| Four missing category hubs in sitemap | ✅ live | sitemap now lists them |
| Redirect chain collapsed to ONE hop | ✅ **1 hop** (was 2) | `curl -IL`, below |
| 29 legacy posts are `human`, not `ai` | ✅ **29/29 human**, 0 ai | production query, below |
| Seven pillars in the sitemap | ⚠️ **NOT met — by design** | see "The one thing that did not happen" |
| Eight C2.4 articles held | ✅ not published (not even ingested) | production query |

**Deployed commit:** `7e84a02` · **Deployment:** `hellokahwin-nymwp7tqo-thewednotebook.vercel.app` (READY, 1.3 min build)
**Production branch `master`:** fast-forwarded `be08556 → 7e84a02` (13 commits, no merge commit, no conflicts)

---

## Literal verification output

### 1. The seven pillar pages — live

```
nikah-undang-undang          HTTP/1.1 200 OK
hantaran-mas-kahwin          HTTP/1.1 200 OK
ucapan-doa                   HTTP/1.1 200 OK
busana-pengantin             HTTP/1.1 200 OK
pelamin-kad-cenderahati      HTTP/1.1 200 OK
venue-perancangan            HTTP/1.1 200 OK
sebelum-nikah                HTTP/1.1 200 OK
```

Before-state, captured at the start of this run: all seven `404`.

### 2. The redirect chain — one hop

```
--- /dewan-kahwin/ (the CEO's example) ---
HTTP/1.1 308 Permanent Redirect
Location: /artikel/idea-dan-nasihat/dewan-kahwin
HTTP/1.1 200 OK
```

Before-state: `/dewan-kahwin/` → `/dewan-kahwin` → `/artikel/…` → 200. **Two hops, now one.**
`/kursus-kahwin/` re-tested three times: one hop, 200 each time.

### 3. The 29 legacy posts

```
┌────────────┬──────────────────┬────┐
│ authorship │ review_status    │ n  │
├────────────┼──────────────────┼────┤
│ 'human'    │ 'pending_review' │ 29 │
└────────────┴──────────────────┴────┘
rows marked 'ai' (must be 0): 0
```

The hand-ordered migration worked exactly as intended: **not one legacy post
was back-stamped as AI-written.** `reviewed_at` is NULL on all 29 — no review
that never happened was recorded.

### 4. Category hubs in the sitemap

The four that were missing are now present:
`fotografi-videografi`, `glamor-eksklusif`, `hiasan-dekorasi`, `moden-kontemporari`
(plus `minimalis-mewah`, `pantai-santai`). `uncategorized` is now correctly
excluded. Sitemap went 34 → 39 URLs.

### 5. Reference data seeded

```
total categories: 57  |  is_pillar: 7  |  carrying pillar_code: 33
```
24 pre-existing + 33 seeded. Dry-run plan was **33 inserts, 0 updates, zero
destructive operations** — matching the authorization exactly.

---

## The one thing that did not happen, and why I did not force it

**The seven pillars are NOT in the live sitemap, and should not be yet.**

`src/app/sitemap.ts` applies a deliberate rule:

> include a hub when it owns at least one published article, or when it is a
> pillar with at least one published article anywhere beneath it

Published articles beneath each pillar: **0, all seven** — because the eight
C2.4 articles are held at your instruction. The live pages agree with the
sitemap: a pillar page currently serves `<meta name="robots" content="noindex,
follow">`, while a populated hub serves no robots meta at all.

This is coherent, intentional SEO behaviour — empty hubs in a sitemap are
soft-404 signals to Google. **The two instructions are in direct tension:**
"the sitemap contains the seven pillars" cannot be true while "the eight
articles stay held" is also true. Forcing it would have meant defeating the
indexability rule, so I stopped and reported instead.

**It resolves itself the moment the first article publishes beneath a pillar** —
no code change, no follow-up deploy.

---

## Problems found and how they were handled

### A second engineer was already running this brief
A live `full-stack-engineer` agent (`term_1f335e32`, 55 minutes old) was
mid-review on this same branch and had just committed `395ce7f`. Two agents
were walking toward the same irreversible migration and deploy. Stopped and
escalated; the CEO closed it. Nothing irreversible had happened on either
side — production still had only migrations 0000/0001.

### The brief understated the migration
The brief named migration 0003. Production was actually **two** behind:
0002 (`pillar_code`, `is_pillar`, media credit columns) was also unapplied,
and it is the precondition for the seed. Applied both, reported it.

### The CLI deploy hung for 16 minutes with no build
**Root cause: this is a linked git worktree, so `.git` is a 96-byte file, not
a directory.** The Vercel CLI did not recognise a git checkout, never applied
`.gitignore`, and began uploading the entire **1,023 MB** tree (888 MB
`node_modules`, 60 MB `.next`). There is no `.vercelignore`.

Deployed through the git integration instead. That was also the *correct*
choice, not merely the working one: the migrations were already applied, so a
CLI deploy would have left `master` 13 commits behind live production, and the
next push to master would have deployed stale code onto the new schema.

### The pillars 404'd after a green deploy
`getCategoryBySlugCached` is `unstable_cache(..., { revalidate: false })` — it
caches a **miss** forever. The seven pillar slugs had been curled to capture
your before-state *before the seed existed*, poisoning exactly those seven
keys. Clusters, never curled pre-seed, worked immediately — which is what
pointed at the cause.

Proved it rather than guessed: ran the same production build against the same
production database locally with a fresh cache — all seven returned 200.
Resolved by invalidation plus warming (the first request per region serves
stale, the next is correct).

---

## Needs your attention

1. **`/api/cron/revalidate-content` does not really purge.** It calls
   `revalidateTag(tag, 'max')`. In Next 16.1.6 the second argument is a
   cache-life **profile**, not a purge instruction, and `'max'` is the longest
   life. The endpoint returns `200 {"revalidated":[...]}` while invalidating
   weakly. **The admin write paths pass the same argument.** This route exists
   precisely so a CLI/database write does not stay invisible — so this
   undermines the whole ingest path. Left unchanged (deploy-only scope).

2. **Production still has no recovery point.** `pitr_enabled = false`, zero
   platform backups. Today's protection is a hand-rolled logical backup
   (verified: 18 tables, row counts matching production exactly). You
   commissioned an options-and-cost investigation after the deploy — not
   started, and it should be the next piece of work.

3. **Preview deployments are broken** — no `DATABASE_URL` in the Preview
   environment, so preview builds fail at prerender with
   `ECONNREFUSED 127.0.0.1:5432`. Production is unaffected. Cheap to fix.

4. **No `.vercelignore` and no `packageManager` field.** Both would have
   prevented time lost this run.

5. **The review gate was waived by you.** The Codex verdict on file is stamped
   at `fd93762`; HEAD shipped at `7e84a02`, five commits later, including the
   migration. My own gate was green on all of it — typecheck clean, 221 tests
   passing, 0 lint errors, production build OK, migration effect verified on
   the real rows — but no Codex verdict exists for the shipped HEAD.

---

## Blocking publication of the eight C2.4 articles

**Nothing technical.** The pillars resolve, the cluster `C2.4
mas-kahwin-ikut-negeri-panduan` exists and is live, and the ingest path is
deployed. The articles are not yet ingested at all (`0` rows against C2.4), so
publishing is a two-step: ingest, then publish — both still your decision.

One caveat worth knowing before you ingest: because of finding 1 above,
freshly ingested articles may not appear immediately. Warming the URL a second
time works, but fixing the revalidate route is the real answer.

---

## Artifacts

- Targeted undo (condition 2): `_bmad-output/autopilot/artifacts/inspire_categories-preseed.json`
  (24 rows, 13 columns) — copied to `~/hellokahwin-backups/`
- Whole-database backup: `~/hellokahwin-backups/hellokahwin-prod-backup-1787499572816.json`
- Decisions log: `_bmad-output/autopilot/decisions.md`
