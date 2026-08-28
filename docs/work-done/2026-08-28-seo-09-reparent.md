# SEO-09 — re-parent the legacy articles into the pillar architecture, 28 Aug 2026

**Session:** aug-28-2026-session-01 · **Owner:** BMAD · **Status:** completed (9 of 13), 4 declined by design
**Plan:** `docs/plans/aug-23-2026-session-01/aug-25-2026-plan-cont-04-legacy-reparenting.md` (CONT-04, input — not re-derived)
**Brief:** `docs/plans/aug-28-2026-session-01/aug-28-2026-brief-seo-09.md`

## What was done

CONT-04's Sprint 01 plan named thirteen legacy articles and split them three
ways: seven move now with **no URL change** (Wave A — a second row in
`article_categories`, the link table the pillar architecture actually reads),
two move later and only after a measured consolidation gate (Wave B —
`dewan-kahwin`, `garden-wedding`), and four should never move at all, because
they collide with a parent topic another live page already owns (`sewa-dewan-kahwin`,
`majlis-kahwin`) or sit outside the approved 26-cluster map entirely
(`tempat-honeymoon-di-malaysia`, `wedding-planner-terbaik-di-malaysia`).

**This item ran Wave A's cluster link for all nine articles CONT-04 cleared to
move now — the seven plus the two Wave B articles' cluster-link component,
which CONT-04 explicitly says happens now while only their primary-category
change waits on the 8 Sept 2026 gate.** It did not touch the four declined
articles, and it did not change any article's `primary_category_id` — so no
URL moved, for any of the thirteen, and no redirect was needed or written.

One row was inserted per article into `article_categories`, pointing at the
cluster category CONT-04 named:

| Article | Cluster (category link added) | Pillar it now reaches |
|---|---|---|
| `cara-buat-kad-kahwin-digital` | `kad-kahwin-jemputan` (C5.2) | P5 `pelamin-kad-cenderahati` |
| `goodies-kahwin` | `doorgift-bunga-telur-hadiah` (C5.4) | P5 `pelamin-kad-cenderahati` |
| `hadiah-untuk-pengantin` | `doorgift-bunga-telur-hadiah` (C5.4) | P5 `pelamin-kad-cenderahati` |
| `pelamin-kahwin-dewan` | `pelamin-idea` (C5.1) | P5 `pelamin-kad-cenderahati` |
| `kursus-kahwin` | `kursus-kahwin-saringan-pra-nikah` (C1.3) | P1 `nikah-undang-undang` |
| `dewan-kahwin` | `dewan-venue-majlis` (C6.1) | P6 `venue-perancangan` |
| `garden-wedding` | `dewan-venue-majlis` (C6.1) | P6 `venue-perancangan` |

`hantaran-kahwin` and `hantaran-tunang` — also named in CONT-04's Wave A —
already carried their cluster link from an earlier item and needed no write;
confirmed by the pre-write snapshot below.

**Run order:** `cara-buat-kad-kahwin-digital` alone first, as CONT-04's pilot,
to answer the one thing its plan flagged as unverified in production (see
Retrospective). Confirmed live, then the remaining six ran together.

## Why four of the thirteen were not moved

The brief's DoD says "all 13 articles... under their correct pillar," but the
input plan this item was told not to re-derive argues, with named evidence,
that four of the thirteen must **not** move:

- `sewa-dewan-kahwin` (150/mo) and `dewan-kahwin` share the parent topic `dewan
  kahwin` — reparenting both into the same cluster manufactures the exact
  cannibalisation CONT-04's own playbook forbids. CONT-04's call: merge, don't
  move; that is a content decision with its own redirect, a different item.
- `majlis-kahwin` (300/mo)'s parent topic is `checklist kahwin`, which
  `/artikel/venue-perancangan/checklist-kahwin` already owns. Same collision.
- `tempat-honeymoon-di-malaysia` and `wedding-planner-terbaik-di-malaysia` sit
  on topics (`honeymoon malaysia`, `wedding planner malaysia`) outside the
  approved 26-cluster plan. Filing them into a pillar they do not belong to
  dilutes the pillar, which is the whole argument for having pillars.

Executing the literal DoD over the plan's own findings would have created the
duplicate-parent-topic collision the plan explicitly built Wave A to avoid.
Flagging this rather than silently narrowing scope, per the standing rule —
the fix, if the CEO wants these four handled, is the merge decision CONT-04
already scoped as separate work, not a fourth cluster insert here.

## Ship state

**Commit:** `8e62f56` "SEO-09: the undo, written before the first write" (the
undo/evidence scaffold, committed ahead of the DB write per the standing
rule); this entry's commit follows below.
**On `origin/master`:** N/A — this item's only artefact IS the production
database write plus this docs entry; there is no application code change to
ship. The seven `article_categories` rows were written directly to the
production database (`aws-0-ap-southeast-1.pooler.supabase.com:5432`, session
mode) on 2026-08-28, the same mechanism CONT-04 itself used to verify Wave A.
**Deployed:** N/A, no code changed. **Caches dropped:** yes — see Evidence.
**Still uncommitted in the tree:** none; `git status --porcelain` is clean
after this entry is added (see the command output pasted in the commit).

## Evidence

All files below are in `2026-08-28-seo-09-reparent-EVIDENCE/`.

**Pre-write DB state** (`pre-write-article-categories.txt`) — `article_categories`
at 183 rows; the 23 existing links for the nine in-scope articles, captured
2026-08-28 before the first insert from the live production pooler.

**Post-write DB state** (`post-write-article-categories.txt`) — 190 rows, +7
exactly the seven listed above; every pre-existing link (including the legacy
`idea-dan-nasihat` / `hiasan-dekorasi` / `venue` / `perancangan` rows) is still
present, and `primary_category_id` was re-checked unchanged for all thirteen
named articles including the four declined ones (query and result pasted
below).

```sql
select a.slug, pc.slug as primary_cat_now
from articles a left join inspire_categories pc on pc.id=a.primary_category_id
where a.slug in (<all 13>);
```
→ every row still reads its original primary category. `articles` total rows
and published count (86) are unchanged; only `article_categories` moved.

**Caches dropped, in the load-bearing order** (`src/lib/cache/purge.ts`):
1. `POST /api/cron/revalidate-content` → `{"revalidated":["articles","inspire-categories"]}`, HTTP 200.
2. `POST /v1/edge-cache/dangerously-delete-by-tags`, 19 paths in two batches
   (16 + 3, Vercel's 16-tag ceiling), 13s apart → HTTP 200 both batches.

**DoD check 1 — all 13 legacy root URLs, one hop to 200, on a first request
each** (`dod-legacy-root-slugs.txt`): all fourteen† root slugs (including
`mas-kahwin-ikut-negeri`, already moved in Sprint 01) 308 in exactly one hop to
their canonical `/artikel/{category}/{slug}` and return 200. No chain, matching
CONT-04's structural finding that the redirect is derived at request time and
cannot stack. `†` fourteen rows are measured because CONT-04's own table
carries the same fourteen (the CEO's thirteen plus `lokasi-pre-wedding-photoshoot-terbaik`,
which the CEO's list omitted).

**DoD check 2 — each canonical `/artikel/{category}/{slug}` returns 200 on a
first request** (`dod-canonical-paths.txt`): all fourteen, `X-Vercel-Cache:
REVALIDATED` (first request after the purge — not a stale HIT), HTTP 200.

**DoD check 3 — sitemap count unchanged** — `curl https://hellokahwin.com/sitemap.xml`:
**103** `<loc>` entries, before and after. No article gained or lost a sitemap
row, because none of the thirteen changed its canonical URL.

**DoD check 4 — the article appears under its correct pillar, checked from the
PILLAR page, not just that the article's own URL resolves** (`pillar-verify.txt`).
This is the check the brief calls out by name against Sprint 02's failure mode
3 — a layer reading done from above while the layer below is 404. Fetched each
of the four parent pillar pages live and grepped for an `<a href>` to each
article's canonical path:

| Pillar page | Links found |
|---|---|
| `/artikel/nikah-undang-undang` | `kursus-kahwin` |
| `/artikel/hantaran-mas-kahwin` | `hantaran-kahwin`, `hantaran-tunang` |
| `/artikel/pelamin-kad-cenderahati` | `cara-buat-kad-kahwin-digital`, `goodies-kahwin`, `hadiah-untuk-pengantin`, `pelamin-kahwin-dewan` |
| `/artikel/venue-perancangan` | `dewan-kahwin`, `garden-wedding` |

All nine present, each anchored at its live canonical path. Separately, each
article's own page carries exactly one pillar up-link and one cluster anchor
(`uplink=1 cluster=1` in the same file for all nine).

**DES-09 guardrail sweep, full sitemap, sequential** — `guardrails-before.txt`
/ `guardrails-after.txt` (`check-guardrails.py`, from
`docs/work-done/aug-28-2026-session-01/aug-28-2026-des-09-EVIDENCE/`).
Before: 25 pass / 5 fail / 3 warn / 0 unknown. After: 24 pass / 6 fail / 3
warn / 0 unknown. Full per-guardrail diff in `guardrails-status-before.txt` /
`guardrails-status-after.txt` — the only line that moved is **G25** (warm
response ≤ 1,500 ms), PASS → FAIL.

**G25 is machine noise, not a regression from this write**, and it was
checked rather than assumed:
- The guardrail's own detail line names `/artikel/moden-kontemporari/marriott-putrajaya`
  as one of the 18 slow pages — a page this item never touched.
- Re-measured that exact URL three times immediately after: 197ms, 114ms,
  then **21,174ms** on the third attempt, all three `X-Vercel-Cache: HIT`.
  That is the exact ~21s TCP-handshake stall this machine produces on a few
  percent of requests to Vercel, including on cache HITs (see the standing
  memory on split-phase latency measurement).
- `hantaran-tunang` — one of the nine articles this item DID touch, and also
  named in the FAIL detail — re-measured three times clean: 111ms, 109ms,
  112ms, all HIT.
- Every guardrail this item's own change could plausibly move — **G09** (zero
  orphans, 0/86 both runs), **G31** (sitemap count, 103 both runs), **G12**
  (root-slug 308 targets, 13 both runs, identical set), **G33** (29/29
  one-hop redirects both runs) — is byte-identical before and after.

## What it changed

Seven `article_categories` rows, zero URLs, zero redirects. Nine legacy
articles (the seven plus the two whose cluster-link component of Wave B
CONT-04 authorised now) went from carrying only their legacy category link to
also carrying an editorial-navigation link up to a pillar and sideways to a
cluster: `goodies-kahwin` (fronting ~2,900/mo of unlinked search demand per
CONT-04 §3) and `kursus-kahwin` (3,500/mo) are the two highest-value pages that
moved from orphaned-from-the-architecture to structurally linked. Sitemap,
redirect count, and every other guardrail the change could touch are
unchanged.

## Follow-ups

- **Wave B primary-category move** for `dewan-kahwin` and `garden-wedding`:
  gated on CONT-04 §6, first review 8 Sept 2026. Not this item's scope; do not
  run early.
- **The merge decision** for `sewa-dewan-kahwin` (into `dewan-kahwin` or
  `harga-sewa-dewan-kahwin`) and for `majlis-kahwin` (against
  `checklist-kahwin`): CONT-04 scoped this as separate work; still open, owner
  not yet assigned.
- **Rule 16** — appearing on a pillar hub is navigation, not an editorial body
  link. CONT-04 flagged that each of the seven Wave A articles still needs a
  body link from its pillar's prose before it counts as properly placed; that
  editorial pass is not part of this item.
- **41 legacy-body links still point at root slugs** rather than the canonical
  `/artikel/{category}/{slug}` path (per `ceo-memory.md`'s crawl-path note) —
  open, not touched here.

## Retrospective

**1. What did we learn that is not written down anywhere?** CONT-04's plan
named one honest limit on 25 Aug: it had verified in code that a
secondary-only `article_categories` link renders the pillar up-link, but had
never observed it in production, because no article existed with a secondary
link and no primary link into the same pillar family. This item created that
exact case (`cara-buat-kad-kahwin-digital`, run alone first as a pilot for
this reason) and it renders — up-link and cluster anchor on the article page,
the article listed back from the pillar hub, on the first request after
purge. That was the one open question in CONT-04's structural argument, and it
is now closed with a live measurement rather than a code read.

**2. Which document must change, and who owns that edit?**
`docs/boardroom/ceo-memory.md`, the file read at the start of every session.
Its "URL structure and re-parenting" section (added 25 Aug by CONT-04) still
carries CONT-04's original hedge as if unresolved. Owner: whoever next reads
it, which is every future session — so it is edited below, now, by this item.

**3. What did we do twice that we should never repeat?** Fetching
`CRON_SECRET` from the Vercel env API: the LIST endpoint
(`/v10/projects/{id}/env?decrypt=true`) returns every value as `"type":
"encrypted"` regardless of the `decrypt` flag — it never decrypts on that
endpoint. Only the single-environment-variable GET
(`/v9/projects/{id}/env/{envId}`) returns the plaintext value. The first purge
script guessed the list endpoint decrypts and got a ciphertext string as
`CRON_SECRET`, which the revalidate route correctly rejected with 401 rather
than accepting a wrong secret. Caught before any DB write, cost one wasted
round trip, fixed by resolving the env ID from the list endpoint and reading
the value from the single-env endpoint.

**4. What did we nearly ship, and what caught it?** The after-sweep read "24
pass, 6 fail" against a "25 pass, 5 fail" baseline — one new failure, on the
guardrail that gates exactly this kind of database write (G25, warm-response
latency). The near-miss was reading that delta as a real regression from the
category-link write and reporting a partial pass. What caught it: the
guardrail's own detail line names a page this item never touched
(`marriott-putrajaya`) among the eighteen slow ones, which is not explainable
by seven rows in an unrelated link table. Re-measuring that exact URL three
times immediately reproduced a 21-second stall on the third attempt with
`X-Vercel-Cache: HIT` on all three — this machine's documented TCP-handshake
noise, not the site. `hantaran-tunang`, an article this item DID touch, came
back clean on all three re-measures. The rule this earns: a guardrail delta
of one, on a corpus-wide sequential sweep run from this machine, is not
evidence on its own — check whether the flagged pages are even in the change
set before treating a new FAIL as a regression.
