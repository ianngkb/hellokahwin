# Done — CONT-11: four C2.1 head terms carried zero volume — one replaced, three dropped

**Date:** 29 Ogos 2026 · **Sprint 03, CONT-11** · **Owner:** `head-of-seo-content`
**Brief:** `docs/plans/aug-28-2026-session-01/aug-28-2026-brief-cont-11.md`
**Upstream, not reopened:** `aug-28-2026-done-cont-10-c21-serp-decision.md` (DO NOT MERGE, eight
articles) and `aug-28-2026-done-cont-12-c21-complete.md` (all eight live, seed re-angled).
**Evidence:** `docs/work-done/aug-28-2026-session-01/aug-28-2026-cont-11-EVIDENCE/`
**Volume field used throughout: Ahrefs Keywords Explorer `volume`** (the 12-month
average), country `my`, pulled 29 Ogos 2026. `volume_monthly` is quoted alongside it
and named every time, per the standing rule.

---

## The claim, stated exactly

Of the four zero-volume head terms named in the tracker item (`hantaran kahwin bajet`,
`kos hantaran kahwin`, `adat hantaran`, `persiapan hantaran`): **one is replaced**
(`adat hantaran` → `adat hantaran kahwin`, live on `adat-hantaran-ikut-keluarga`,
verified on production) and **three are dropped** with a stated reason
(`hantaran kahwin bajet`, `kos hantaran kahwin` — both map to `hantaran-kahwin-bajet`;
`persiapan hantaran` maps to `persiapan-hantaran-kahwin`). No article was added, removed,
merged or re-parented — CONT-10 already fixed the cluster at eight and this item does not
reopen that.

---

## 1. The four terms, confirmed zero — and confirmed by TWO independent signals, not one

`mcp__ahrefs__keywords-explorer-overview`, country `my`, 29 Aug 2026:

| Term | `volume` | `volume_monthly` | `parent_topic` | `traffic_potential` |
|---|---|---|---|---|
| `hantaran kahwin bajet` | **0** | 1 | none | none |
| `kos hantaran kahwin` | **0** | 1 | none | none |
| `adat hantaran` | **0** | 3 | none | none |
| `persiapan hantaran` | **0** | 1 | none | none |

This confirms the tracker item's own claim: all four zero, no parent topic.

**Second signal, not just the field reading zero: Ahrefs holds no SERP snapshot at all
for two of them.** `mcp__ahrefs__serp-overview` on `hantaran kahwin bajet` and
`persiapan hantaran` both return an **empty result set** — zero positions of any type,
not even an AI Overview (`…-EVIDENCE/serp-checks.tsv`). Per SEO-08's rule ("no row at all"
is a stronger statement than zero), this means Ahrefs has no recorded search behaviour for
these exact strings at all, not merely a rounded-down count. That is a second, independent
piece of evidence pointing the same way as the `volume` field, from a different endpoint.

---

## 2. Mapping each term to its article — from live content, never from the slug

Per the standing rule, the target is checked against the article's actual live content
(title, meta description, excerpt — pulled directly from the production database,
`postgres` against `DATABASE_URL`, 29 Aug 2026), not derived from the slug. CONT-07's
original per-topic keyword table was not found in any surviving document (searched
`docs/plans/`, `docs/work-done/`, the sprint-02 tracker snapshot — no table exists;
CONT-10's own retrospective quotes only three of the eight targets, for topics 2, 3 and
5). The brief for this item explicitly permits checking live content as the source of
truth when no written table survives, so that is what was done:

| Article (live slug) | Live title | Reads as topic (CONT-07 DoD) |
|---|---|---|
| `hantaran-kahwin-bajet` | *Hantaran kahwin bajet: kos sebenar 12 dulang, 2026* | Topic 4 — complete hantaran under a stated budget |
| `adat-hantaran-ikut-keluarga` | *Adat hantaran ikut keluarga: bila dua senarai berbeza* | Topic 6 — adat differs by family/state, reconciling two lists |
| `persiapan-hantaran-kahwin` | *Persiapan hantaran kahwin: jadual lapan minggu* | Topic 7 — 8-week preparation timeline |

`hantaran kahwin bajet` and `kos hantaran kahwin` both read as attempts at the same
topic-4 budget article (one is near-literally the article's own title). This is stated
as an inference, not a certainty — no surviving document proves which of the four terms
was meant for which article — but it is the only reading consistent with the live
content: there is no ninth article for a second term to belong to, and `adat hantaran`
and `persiapan hantaran` map cleanly onto the family/state and timeline articles by their
own titles and excerpts.

---

## 3. Search for a real replacement — the sweep, so the drops are not guesses

Two Ahrefs pulls, both `country: my`, both dated 29 Aug 2026:

1. `keywords-explorer-matching-terms` on seed `hantaran`, `terms: all`, `order_by: volume:desc`,
   top 200 by volume (down to 30/mo) — zero results containing `bajet`, `kos`, `murah`,
   `jimat`, `adat`, `persiapan`, `persediaan`, `senarai` or `harga` above 30/mo, and none
   of those framings appear at all in the top 200.
2. The same seed with a `where` substring filter across all nine of those words, no volume
   floor, 250 results — surfaces every low-volume variant Ahrefs holds. The confirmed
   zero-volume and no-parent-topic terms, and the handful of real candidates it did
   surface, are transcribed in `…-EVIDENCE/four-terms-overview.tsv`. Several strings
   returned **no row at all** rather than a zero row (`kos hantaran`, `perbelanjaan
   hantaran`, `minggu sebelum kahwin`, `jadual persiapan kahwin`, `timeline kahwin`) —
   the stronger absence signal per SEO-08's rule, meaning Ahrefs holds no record of the
   phrase in its Malaysian index at all.

The budget/cost framing produced exactly two candidates with a real `volume` and a real
`parent_topic`:

| Candidate | `volume` | `parent_topic` | `traffic_potential` | Verdict |
|---|---|---|---|---|
| `senarai barang hantaran lelaki bajet` | 20 | `hantaran untuk lelaki` | 400 | **Rejected** — parent already owned by sibling `hantaran-untuk-lelaki` (Topic 2); assigning it here repeats the exact cannibalisation rule 4 exists to catch, and it is groom-specific while the article covers a combined 12-dulang budget |
| `barang hantaran lelaki bajet` | 10 | `hantaran tunang` | 600 | **Rejected** — parent belongs to the C2.2 cluster (`hantaran tunang`), not C2.1; and volume of 10 is below any usable floor |
| `dulang hantaran murah` | 30 | `hantaran kahwin` | 250 | **Rejected** — parent already owned by the seed `hantaran-kahwin`; content mismatch too (this article is not about "cheap" hantaran, it is a full cost breakdown) |
| `harga hantaran kahwin mengikut negeri` | 30 | `hantaran kahwin` | 200 | **Rejected** — different question (price BY STATE) than the article's actual content (12-dulang total cost across three paths); no state-by-state article exists to redirect this to |

For the preparation-timeline framing, the two real candidates found were content
mismatches, not merely small:

| Candidate | `volume` | `parent_topic` | Verdict |
|---|---|---|---|
| `checklist kahwin` | 800 | `checklist kahwin` (self, 900) | **Rejected** — real volume, but it is a whole-wedding checklist query, not hantaran-specific. The live article is an 8-week hantaran-only preparation schedule; retargeting a narrow page at a broad query it does not answer would be a keyword/content mismatch, not a fix |
| `persediaan kahwin` | 30 | none (Ahrefs holds no clustering signal for it) | **Rejected** — same content mismatch, general wedding prep rather than hantaran prep, and too small to justify broadening scope inside this item |

No candidate for either framing passed both tests (real distinct demand AND a
parent_topic not already owned by a sibling AND a content match to the live page). Per
the DoD's own instruction ("either replaced ... or explicitly dropped with a reason"),
both are **dropped**.

---

## 4. Decisions

### DROP — `hantaran kahwin bajet` (article `hantaran-kahwin-bajet`)

**Reason:** `volume` 0 (12-month average), `volume_monthly` 1, no `parent_topic`, and
Ahrefs `serp-overview` returns zero rows of any type for this exact string — no recorded
search behaviour at all. No real-term replacement was found that both matches the
article's actual content (a 12-dulang, three-path budget breakdown, not a groom-only or
state-by-state framing) and does not share a parent topic already owned by a sibling
article. The article stays live, unchanged, as topic 4 of 8 — a genuine reader question
CONT-07 identified — and its organic value comes from internal-linking equity inside the
cluster and from the specific numbers in its body (RM108–RM359, three paths) rather than
from ranking on its own head phrase.

### DROP — `kos hantaran kahwin` (same article, `hantaran-kahwin-bajet`)

**Reason:** identical — `volume` 0, `volume_monthly` 1, no `parent_topic`, zero SERP
rows. Reads as a second attempt at the same topic-4 target; fails on the same grounds.

### REPLACE — `adat hantaran` → `adat hantaran kahwin` (article `adat-hantaran-ikut-keluarga`)

**New target:** `adat hantaran kahwin`. **`volume` 20** (12-month average),
`volume_monthly` 22, **`parent_topic` = `balas hantaran`** (`parent_volume` 30),
**`traffic_potential` 40**. Small, but real, distinct, and not owned by any sibling in
C2.1 — checked against every parent_topic already claimed in the cluster (`barang
hantaran lelaki` — seed/topic2/topic3; `hantaran` — topic 5; `hantaran tunang`/`dulang
hantaran` — the neighbouring C2.2/C2.3 clusters, not C2.1). No cannibalisation.

**SERP-ownership check, applied to the replacement, not just to what was rejected**
(`mcp__ahrefs__serp-overview`, country `my`, 29 Aug 2026, on both `adat hantaran kahwin`
and its parent `balas hantaran`; full pull in `…-EVIDENCE/serp-checks.tsv`): organic
position 1 on both queries is
`locco.com.my/2020/12/11/tak-lengkap-adat-resam-tanpa-hantaran/`, DR 25, a single 2020
blog post, 56 estimated monthly traffic. No official portal, no entrenched authority —
the same shape as `dewan komuniti setiawangsa`'s opposite (decision 83): here a weak,
beatable incumbent instead of a DR 64 government portal. Position 3 on `balas hantaran`
is `ppsignature.com` (DR 4, the hidden competitor named in decision 13) at 396 traffic
from one URL — further confirmation this is an unclaimed, low-authority SERP rather than
a contested one. An AI Overview sits above both, sourced from the same two pages.

**Honest position expectation, per the playbook rule against promising position 1: 3–5,
not 1.** Volume is small (20–22/mo) and this is not a headline traffic play; it is a
correct, evidence-backed retarget of an article that already substantively covers the
question (three official records, three different lists, a four-step reconciliation) —
replacing a phantom head term with a real, if modest, one.

---

## 5. The live edit made, because the replacement implied one

Per the item's own instruction ("if your re-selection implies changing anything live...
make those edits too"), the DROP decisions imply no live change (there is no new term to
point either page at, and rewriting a reviewed, humanised, character-limit-exact title for
zero net demand would be pure risk with no return). The REPLACE decision does imply a
change: `title` and `meta_description` on `adat-hantaran-ikut-keluarga` did not contain
the new target phrase. Both were edited to include it naturally. `meta_title` was left
`null` (unchanged; the site falls back to `title`), and the article `content` (H1, body)
was **not** touched — the family-comparison content already substantively serves the
`adat hantaran kahwin` intent, so no restructuring was implied.

**Undo committed BEFORE the write**, dry-run-proved against production:
`docs/work-done/aug-28-2026-session-01/aug-28-2026-cont-11-EVIDENCE/undo.mts`, commit
`26c04f3`, pushed before the UPDATE ran. Before-state:
`…-EVIDENCE/adat-hantaran-fields-BEFORE.json`.

| Field | Before | After |
|---|---|---|
| `title` (53 chars) | Adat hantaran ikut keluarga: bila dua senarai berbeza | **Adat hantaran kahwin ikut keluarga: bila dua senarai berbeza** (60 chars) |
| `meta_description` (148 chars) | Adat hantaran berbeza ikut keluarga dan negeri. Tiga rekod rasmi, tiga senarai barang berlainan, dan empat langkah menyatukan dua senarai jadi satu. | **Adat hantaran kahwin berbeza ikut keluarga dan negeri.** Tiga rekod rasmi, tiga senarai barang berlainan, dan empat langkah menyatukan dua senarai jadi satu. (155 chars) |
| `meta_title` | null | null (unchanged) |
| `published_at` | 2026-08-27T00:00:00.000Z | unchanged, asserted by the write script |

Both strings passed `/humanizer` review before being written (no AI patterns found; the
only change was inserting the single word "kahwin" into copy that had already passed
CONT-12's chair pass and humanizer round) — the write script itself also refused on
title > 60 or meta > 155, and both land exactly at the limit, not over it.

This is a **direct database write**, not the ingest CLI, so it runs none of the CLI's
four side effects automatically (Stage 7 checklist, `aug-23-2026-workflow-content-
production.md`). Run by hand:

- `POST /api/cron/revalidate-content` — **HTTP 200**, `{"revalidated":["articles","inspire-categories"]}`, clears the Next data cache.
- `purgeVercelEdge` — **not run**. No `VERCEL_TOKEN` in the site repo's `.env`, the same
  condition CONT-12 hit. The Vercel edge holds its own copy for up to 300s regardless of
  the origin revalidation.
- `syncMediaUsage` — not needed; no images or body content changed.
- `submitSitemapToGsc` — not needed; no new URL, no slug change.

**Because the edge could not be purged, the Stage 7 rule was followed: wait the full
edge TTL, then take the SECOND request as the honest one, quoting `x-vercel-cache` and
`age` on both so a stale copy cannot be mistaken for a fresh one.**

---

## 6. Live verification — sequential requests, cache state recorded on each

Waited the full 300s edge TTL after the write and the `revalidate-content` call
before requesting. `https://hellokahwin.com/artikel/hantaran-mas-kahwin/adat-hantaran-ikut-keluarga`,
requested twice, 3 seconds apart:

| # | `x-vercel-cache` | `age` | `<title>` served |
|---|---|---|---|
| 1 (first past TTL) | **MISS** | 0 | `Adat hantaran kahwin ikut keluarga: bila dua senarai berbeza \| HelloKahwin` |
| 2 (honest, per Stage 7) | **HIT** | 3 | `Adat hantaran kahwin ikut keluarga: bila dua senarai berbeza \| HelloKahwin` |

`<meta name="description">` on request 2: *"Adat hantaran kahwin berbeza ikut
keluarga dan negeri. Tiga rekod rasmi, tiga senarai barang berlainan, dan empat
langkah menyatukan dua senarai jadi satu."*

Both requests carry the correct new title and the second's `<meta
name="description">` carries the correct new copy — unlike CONT-12, which hit a
STALE-serving-old-content window on the same edge-TTL condition, this write's
first post-TTL request was a clean `MISS` (a genuine cold render, not a stale
copy served mid-refresh) and both requests already agree. The second request is
still the one quoted as the claim, per the standing rule, rather than trusting
that agreement generalises.

**Live link:** <https://hellokahwin.com/artikel/hantaran-mas-kahwin/adat-hantaran-ikut-keluarga>

**A finding surfaced by this verification, outside this item's scope, recorded rather
than silently passed over:** the pillar page also carries a second, live, separately
published article, `adat-hantaran-berbeza-negeri` ("Adat hantaran berbeza negeri: bila
dua keluarga tak sama", published 26 Aug 2026 — one day before this article). Its meta
description is about state-level legal specifics (Selangor, Sarawak, Perlis), a
different angle from this article's family-level, three-record comparison, and it is
not one of CONT-10/CONT-12's eight named C2.1 articles — most likely a member of one of
the pillar's other four P2 clusters, not a ninth C2.1 article. **Not investigated
further; the eight-article count this item works against is CONT-10's, unchanged, and
re-scoping the cluster boundary is not this item's call.** Flagged because the two
titles read as near-duplicates ("Adat hantaran berbeza negeri" against "Adat hantaran
kahwin ikut keluarga") despite covering different questions — the exact human-accuracy
tax the persona's "slug distance is not topic distance" note describes, worth one line
of pushback at the next brief pass rather than a silent pass-over.

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**A whole framing reading zero across every synonym you can construct is a
different, stronger signal than one term reading zero, and the two need
different responses.** One zero-volume term invites a synonym hunt. A whole
framing — every "bajet"/"kos"/"murah"/"jimat" variant tried for the budget
article, every "persiapan"/"persediaan"/"senarai"/"jadual" variant tried for
the prep article — reading zero or returning no row at all across two full
sweeps is a demand judgment, not a phrasing accident, and `serp-overview`
returning **zero rows of any type** (not a low count, no snapshot at all) is
the second, independent signal that tells the two apart. Written into the
persona as *"When a whole framing reads zero, stop hunting synonyms."*

**Second, and it nearly produced the wrong ship twice in one item: finding a
real `volume` number is necessary but not sufficient.** `checklist kahwin`
(800/mo) and `senarai barang hantaran lelaki bajet` (20/mo, a real
`parent_topic`) both looked like wins next to a page of zeros. Both failed a
second test — content match for one, sibling-owned `parent_topic` for the
other — that only gets applied if you go looking for it after finding the
number. A replacement has to clear three tests (volume, unclaimed
`parent_topic`, content match), not one.

### 2. Which document must change, and who owns that edit?

Three, all mine.

1. **`.claude/agents/head-of-seo-content.md`** (this session's deployed
   persona) — edited, new section *"When a whole framing reads zero, stop
   hunting synonyms — and a real term is not automatically the right one."*
   **Not pushed further upstream: the `skillcentral/agents/projects/
   hellokahwin/Marketing/head-of-seo-content.md` source tree that CONT-10 and
   CONT-12 both named as the canonical source could not be located on this
   machine.** Searched the docs repo root, `orca/workspaces/hellokahwin*`,
   `orca/workspaces/buddy/*` (four separate worktrees, none contain an
   `agents/projects/` path), and a repo-wide find rooted at the user profile
   that returned nothing after several minutes. This is stated rather than
   silently skipped, per the persona's own rule that a rule is not live until
   it is deployed — here the deploy destination itself could not be found, so
   the edit is confirmed local-only. **Owner: whoever next runs `install.sh`
   should locate the source tree first and confirm this edit needs
   re-applying there** rather than assuming the local copy will propagate.
2. **`docs/boardroom/ceo-memory.md`**, the C2.1 entry — flipped from "four
   head terms carry ZERO volume, target-selection fix [unresolved]" to
   DECIDED, with both the replacement number and the drop reasons. Owner: me.
3. **`docs/boardroom/decision-log.md`**, decision 153 — added. Owner: me.

### 3. What did we do twice that we should never repeat?

I ran four separate, increasingly broad filesystem searches hunting for the
`skillcentral` source tree — the docs repo root, then two different `orca/
workspaces/*` guesses, then a repo-wide find — before checking the one thing
that would have answered it fastest: whether `.claude/agents/` itself
contains any reference to where `skillcentral` resolves from. It does, as a
bare relative path in `dispatch-agent.ps1` invocations, which only tells you
it is expected to sit adjacent to wherever that script runs, not where that
is. Two of the four searches timed out at their default budget and were
retried with narrower scope instead of being killed and rethought immediately.
**The pattern to keep: when a broad find times out once, the next move is to
narrow the search space from something already read, not to re-run a
similarly broad search with a different guessed root.**

### 4. What did we nearly ship, and what caught it?

**`checklist kahwin` at 800/mo as the replacement for `persiapan hantaran`.**
It is the single largest real number that appeared anywhere in either sweep —
larger than every other candidate combined, larger than the current article's
own parent topics. Against a page of confirmed zeros it reads as an obvious
win. What stopped it was reading what the query actually returns before
assigning it: `checklist kahwin`'s own SERP and search intent is a
whole-wedding planning checklist, and the live `persiapan-hantaran-kahwin`
article is an 8-week schedule for hantaran items only — a real and much
narrower page. Retargeting the page at that term would have meant either
promising a whole-wedding checklist the page does not contain, or leaving the
title honest and shipping a keyword the page cannot satisfy either way — the
kind of mismatch that costs relevance and dwell time even when it costs
nothing in cannibalisation. The three-test rule in §1 exists because this one
number was tempting enough to nearly skip the second and third checks.
