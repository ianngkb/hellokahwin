# Sprint 06 — *Deepen where the click is*

**Status:** **APPROVED — executing** (owner, 02 Sept 2026: *"proceed with the full scope"*)
**Planned:** 02 September 2026 · **10 items · 52 points**
**Tracker:** imported and read back — `reconcile 6 --check` exits 0, file agrees item for item
**Sprint file:** `docs/sprints/sprint-06.json` (as-scoped record; **the tracker is the state**)

---

## 1. The owner's question, answered with a measurement

> *"continue working on content on the site, more pillars. Can we see what else we should focus on."*

All **337 ranking queries** were classified with the committed intent gate
(`serp-shape-census.py`'s frozen `intent_of`) over 2026-08-20..09-01. This is the
whole answer:

| Family | Impressions | Clicks | CTR | Doc-intent | Mean position | Queries |
|---|---|---|---|---|---|---|
| **`doa`** | 221 | 10 | **4.5%** | **100%** | **21.7** | 34 |
| `mas kahwin` | **1,046** | 6 | **0.6%** | 0% | 11.6 | 54 |
| `walimatul` | 368 | 3 | 0.8% | 0% | 12.6 | 18 |
| `garden wedding` | 203 | 0 | 0.0% | 0% | 40.0 | 8 |
| `checklist` | 42 | 1 | 2.4% | 100% | 8.8 | 4 |
| `rukun` | 17 | 0 | 0.0% | 100% | 22.3 | 7 |
| `lafaz taklik` | 13 | 0 | 0.0% | 100% | **9.0** | 2 |

### The finding, stated plainly

**We have built 39 articles in the cluster that cannot convert, and 10 in the one
that does.** `hantaran-mas-kahwin` holds 39 of our 92 articles and draws 40% of
all impressions at **0.6% CTR**. `ucapan-doa` holds 10 and converts at **4.5%**.

And the doa family's **mean position is 21.7** — we are barely competing on our
own best territory. **26 document-intent queries carry impressions and zero
clicks**, 184 impressions between them:

| Impressions | Position | Query |
|---|---|---|
| 20 | 10.6 | `doa selepas akad nikah rumi` |
| 15 | **4.7** | `doa ubun isteri rumi` |
| 13 | 8.5 | `doa selamat untuk pengantin baru` |
| 7 | 9.3 | `lafaz taklik nikah perak` |
| 7 | 24.0 | `rukun nikah` |
| 6 | 8.7 | `lafaz taklik perak` |

**So the pillars are `ucapan-doa` (deepen) and `nikah-undang-undang` (build).**
Not more `mas kahwin` — decision 170 already priced that out.

---

## 2. ⚠ The one item that can invalidate the rest

**SEO-14 RUNS FIRST.** The 12.2× intent split rests on **14 clicks** in the
matched band and has never been re-measured since. Sprint 05 added six
document-intent articles — exactly the intervention that should move it.

**If the split has collapsed below decision 171's conservative 2.3× lower bound,
CONT-17's entire premise is gone** and it stops rather than writing six articles
on a dead thesis. That is written into both DoDs.

This is the sequencing decision of the sprint. Everything else can run
concurrently.

---

## 3. The backlog, by track

### Content — 22pt

| Item | Pt | Owner | |
|---|---|---|---|
| **CONT-17** | 12 | `writer-inspirasi-vendor-venue` | Six doa articles. Complete artefact, named authority **and edition**, both PRE-FLIGHT gates. Blocked on SEO-14's answer |
| **CONT-18** | 8 | `writer-adat-agama-prosedur` | Four `nikah-undang-undang` articles — lafaz taklik (position 9.0, zero clicks), rukun (22.3), syarat sah |
| **COPY-01** | 2 | `managing-editor` | The undatable "akan datang tidak lama lagi" line |

### Design — 24pt, the UI ask

| Item | Pt | Owner | |
|---|---|---|---|
| **UI-19** | 8 | `design-systems-engineer` | Finish the rail. **CEO ruling applied**: SUMBER renders only where sources exist, and the rail must not collapse without it |
| **UI-15** | 5 | `design-systems-engineer` | Grid thumbnails. **Carried figure "37 pages" is wrong** — 15 category pages; derive at run time |
| **CONT-15** | 5 | `creative-director` | Portrait covers. **DES-18's mid-size variant unblocked this**; substitution route still forbidden |
| **UI-16** | 3 | `design-systems-engineer` | `garden-wedding` cover — **confirmed still `low.webp` on 02 Sept**, on the page drawing 28% of impressions |
| **DES-15** | 3 | `design-systems-engineer` | `s-h2`'s font-weight is dead on every public page |

### SEO — 3pt · **PLATFORM — 3pt**

**SEO-14** (runs first, above). **PLAT-16** — a soft-failed pillar render caches
forever; one DB blip can pin an empty topic hub indefinitely. The only live
production defect in the platform set.

---

## 4. Carried figures I re-measured before sizing

| Claim | Carried | **Measured 02 Sept** |
|---|---|---|
| UI-15 category pages | "all 37 pages" | **15** — 109 sitemap entries, 92 articles, 17 non-article URLs |
| CONT-15 affected covers | "12 of 86" | corpus is now **92** and moving; re-derive at run time |
| UI-16 garden-wedding cover | "`low.webp` in a shaped box" | **confirmed still live** |
| Articles live | 86 | **92** |

Third consecutive planning meeting where a carried figure was wrong. The rule is
working; the figures keep needing it.

---

## 5. Where my confidence is lowest — flagged, not cut

- **CONT-17 is 12 points resting on a number SEO-14 has not confirmed.** That is
  the right order to find out in, but it means a quarter of the sprint could stop
  at a gate. I want it to, if the gate says so.
- **UI-19 is the item I have least visibility into.** Its predecessor's geometry
  claims rest on computed values I could not verify from this session, and I said
  so at Sprint 05's close rather than dressing a 307 up as evidence.
- **10 items is deliberately smaller than Sprint 05's 28.** The lesson was not
  "scope less because it is tidier" — it is that Sprint 05 dispatched 14 of 28,
  so half of it never ran. This is sized to be dispatched **in full**.

## 6. Explicitly out of scope

More `mas kahwin` state pages (decision 170) · SEO-04, parked a fourth time,
diagnosis unchanged · a new art direction, before we have built the one we have ·
the `garden-wedding` English cluster (quarantined, decision 148, review
2026-11-27) · DES-14, DES-16, UI-12, UI-14, PLAT-13, PLAT-14, PLAT-17 — left in
the backlog so this sprint can be dispatched whole · building search · the full
enforce-credit-everywhere programme.

## 7. Predictions, with falsifiers

1. **SEO-14 confirms the split at or above 2.3×.** **Falsifier: if it has collapsed, CONT-17 stops** — and that would be the most valuable thing this sprint could tell us.
2. **The ten new articles reach positions 4–12.** If they land there and the doa family's mean position of 21.7 does not improve, the pillar is *saturated*, not underbuilt — a different diagnosis entirely.
3. **200–260 clicks/28d by end of September**, from 125 on 02 Sept.
4. **UI-19, UI-15, UI-16, CONT-15, DES-15 move no metric.** Brand and credibility; recorded so they are not scored on traffic.

## 8. What the owner is asked for

**Nothing new.** One item remains outstanding from Sprint 05: **close PR #37
without merging** — it targets `master`, carries 51 docs-space files, and the
CEO's account lacks the permission. The Cloudflare purge is done and RIGHTS-03
is closed.
