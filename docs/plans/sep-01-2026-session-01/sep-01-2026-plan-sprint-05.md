# Sprint 05 — *Build where the click is*

**Status:** **APPROVED — executing** (owner, 01 Sept 2026: *"yes I got the permissions, proceed with the full scope"*)
**Planned:** 01 September 2026 · **19 items · 81 points**
**Tracker:** imported and read back — `sprint list --sprint 5` reads `0/81 points, 19 items`
**Sprint file:** `docs/sprints/sprint-05.json` (the as-scoped record; **the tracker is the state**)

---

## 1. Why this sprint is not the one the retro predicted

Sprint 04's retro said Sprint 05's theme was already written: *build the composition
DES-03 already specifies.* That is a track here. **It is not the sprint**, and the
reason is a number.

**Sprint 04 was called "Earn the click" and the click did not move.**

| 28d, GSC `https://hellokahwin.com/` | 30 Aug | 31 Aug | Δ |
|---|---|---|---|
| Clicks | 99 | **109** | +10% |
| Impressions | 6,693 | **7,760** | +16% |
| Position | 12.4 | **11.8** | better |
| Sitewide CTR | 1.48% | **1.40%** | ↓ |

It fixed the presentation defects, correctly — all 17 verified against production.
**Presentation was never what suppressed CTR.** The page-level split, 7 days to 31 Aug:

| Cluster | Impressions | Clicks | CTR | Position |
|---|---|---|---|---|
| `mas kahwin` state series + `walimatul urus` + hantaran ratio pages | **3,062** | **21** | **0.69%** | ~7.0 |
| `checklist-kahwin`, `/dewan-kahwin/`, `goodies-kahwin`, `nisbah-hantaran`, `bajet-kahwin` | 285 | 17 | **5.96%** | ~7.4 |

Same site, same design, same brand, matched positions. **Roughly 40% of our
impression base is structurally unclickable at any position.** SEO-11 established
the mechanism across 84 queries: at positions 3–11, document intent 4.55% against
number/definition 0.37% — **12.2×, Fisher exact p = 0.00002**, holding at
p = 0.000003–0.000025 under three re-cuts.

So the sprint builds where the click is.

---

## 2. Three things measured live on 01 September, not carried forward

Sprint 04's retro handed over a carried-forward list, and the standing rule is to
**re-measure it rather than read it**. Three of these numbers moved:

| Claim | Carried figure | **Measured 01 Sept** |
|---|---|---|
| Homepage runs one category | "thirteen items, all thirteen" (spec, 28 Aug) | **13 distinct articles, 26 links, 26/26 `hantaran-mas-kahwin`** — unchanged in two sprints |
| In-article TOC | "spec mentions it twice, live zero" (one page) | **`DALAM ARTIKEL INI` on 0 of 85 articles**, sitewide |
| Articles with no FAQ schema | **31** (`ceo-memory.md`) | **39 of 85** — the figure was stale; the corpus grew |
| `scripts/git-hooks` on site `master` | "0 files" | **0 files confirmed**; 7 on the docs branch |
| Stale worktrees | "the `ui-01-ship` hazard" | **14 worktrees standing**, `ui-01-ship` at 79 commits behind with an uncommitted revert of UI-03 |

### ⚠ And my first pass at two of them was wrong — then my fix for it was wrong too

`grep -oiF "artikel"` returned **0** on a page whose URL contains `/artikel/`, and
**0** for `REKOD` and `SUMBER`, which the same page carries **×24 and ×20**. Read as
an absence it would have said *the rail scaffolding does not exist* and sent UI-17 to
rebuild markup that is already shipped. Counted in Python: `artikel` ×97, `REKOD`
×24, `SUMBER` ×20, `Kredit` ×8. **Only `DALAM ARTIKEL INI` was genuinely zero.**

**I then diagnosed it wrong, confidently and specifically:** I blamed the 145 KB
single-line file being classified as binary, and wrote `-a` into a new helper as
the fix. **`-a` does not fix it.**

| | result |
|---|---|
| `grep -oaiF artikel <page>` | **0** — still zero *with* `-a` |
| `grep -oaF artikel <page>` | 89 |
| `grep -oai artikel <page>` | 97 |

**The real cause is `-o` + `-i` + `-F` together in GNU grep 3.0**, and it reproduces
on a **23-byte file** — size and line length are irrelevant. I caught it only because
I ran the helper against the case it was written for, and it still returned zero.

**That is the lesson worth keeping, and it is second-order: a fix is not verified
until it is run against the failing case, and "I understand the cause" is not that
test.** The first-order rule is unchanged — **enumerate what is there; do not test
for what you assume is there** — and it now has an executable form in
`scripts/measure/count-in-html.sh`.

---

## 3. The open-assignment audit

| Assignment | Verdict | Evidence |
|---|---|---|
| **D169** — replace PRE-FLIGHT #1 to gate on `intent_class`, not the AI Overview | ✅ **DONE** | `head-of-seo-content.md` §PRE-FLIGHT #1 now carries the exit-code table, the 84-query split, and the AI Overview marked explicitly advisory |
| **D96/158** — 150 clicks/28d by ~22 Sept, predicted **MISS** | ✅ scored **wrong, in our favour**, second time | 109 at day 7 of 28, daily run rate 12–19 |
| **D157** — cached-`<title>` defect closed | ✅ holds | not re-challenged this meeting |
| **D170** — page-worthiness threshold | ✅ in force | applied to CONT-13/16 target selection; kills the `mas kahwin` state series for new pages |
| **D161** — owner obtains photographer permissions | ✅ **CONFIRMED 01 Sept by the owner** | changes RIGHTS-02 from negotiation support to a rights record |
| **D167** — the two INSTITUTIONAL images come down, UNDO first | 🔴 **DECIDED AND NEVER EXECUTED** | no work-done entry; RIGHTS-02 was deferred and this sub-commitment went with it → **RIGHTS-03** |
| **D168** — `enforcing-credit-everywhere` is a Sprint 05 question once RIGHTS-02 sizes it | ⏸ → **Sprint 06** | RIGHTS-02 runs in *this* sprint, so it cannot also be sized by it. Written into `out_of_scope` so the index stops reading as though someone else owes an answer |

**The red row is decision 50's pattern, exactly.** A commitment that lived *inside*
a re-scoped item disappeared without ever being decided against — the same shape as
SEO-04's park silently taking the Setiawangsa control with it. **"Photographers have
good relationships with us" was never an argument that reaches Getty**, and I said
so on 30 Aug. It is two files, it is the only genuine legal exposure the company
carries, and the owner's permissions do not cover it.

---

## 4. The backlog, by track

### Content — 20 pt · where the click actually is

| Item | Pt | Owner | |
|---|---|---|---|
| **CONT-13** | 12 | `writer-inspirasi-vendor-venue` | Six document-intent articles. **Two gates**: the sourcing gate may kill it, and decision 162's religious-text authority gate is non-negotiable |
| **CONT-16** | 5 | `writer-adat-agama-prosedur` | `skrip pengacara majlis` + `teks kad jemputan` — reserved families so the two writers run concurrently without competing for targets |
| **CONT-14** | 3 | `writer-inspirasi-vendor-venue` | Re-angle the `hantaran-kahwin` seed to definition and money. The last open C2.1 boundary; CONT-12 closed without doing it |

> **⚠ A CORRECTION WRITTEN INTO CONT-13's BRIEF, because re-importing the Sprint 04
> brief unchanged would re-import a criterion its own sprint disproved.**
> **Two of that brief's three gate tests are superseded:**
> 1. **Volume** — "≥100 impressions/28d or ≥100 monthly volume" → **decision 170: document intent needs ≥220 monthly searches** (10 clicks ÷ 4.55%).
> 2. **"No AI Overview on the live SERP"** → **decision 169 killed this as a selector.** AIO presence reads p = 0.102 across all rows; 94% of number-intent queries carry one but so do **79% of document-intent** ones, so the feature sorts nothing. **Gate on `intent_class`.** Record the AIO as advisory; never select or reject on it.

### Design & composition — 31 pt · the owner's premium complaint

| Item | Pt | Owner | |
|---|---|---|---|
| **DES-17** | 3 | `product-designer` | **Write the H6 diversity rule. It does not exist** — a dangling cross-reference into a section about state sets. **Blocks UI-13** |
| **UI-13** | 5 | `creative-director` | Build it. 26/26 homepage links are one category |
| **UI-17** | 8 | `design-systems-engineer` | The 300px desktop right rail. Markup exists; layout is the phone treatment |
| **UI-18** | 5 | `design-systems-engineer` | The in-article TOC — 0 of 85 |
| **DES-18** | 5 | `design-systems-engineer` | Mid-size image variant. **Gate first**: are §6's byte ceilings still binding? |
| **CONT-15** | 5 | `creative-director` | Portrait covers, 12 of 86. **Substitution route forbidden** (+8.2 MB, priced by UI-12) |

**Why DES-17 is its own line rather than folded into UI-13:** Sprint 04's central
finding. The parts of DES-03 written as *enforceable rules* (hero eligibility by
cover class, §5.3) shipped exactly; the parts written as *prose and a drawing* — this
rule, the rail, the TOC — did not ship at all. Same spec, same author, same sprint.
**Write it in the form that fires, before anyone tries to build it.**

> **Corrected by DES-17, 01 Sept 2026.** This passage originally read "(hero
> eligibility, R8a/R8b/R8c)". `grep -c 'R8a' docs/design/des-03-spesifikasi.html`
> returns **0** — R8a/R8b/R8c are the 31 Aug spec-vs-build audit's labels for the
> shipped code symbols, not rule ids in DES-03. The finding itself stands; only the
> example was misattributed.

### Technical SEO — 8 pt

| Item | Pt | Owner | |
|---|---|---|---|
| **SEO-13** | 5 | `head-of-seo-content` | FAQPage on the 39 missing. **Do not invent questions to raise the count** |
| **SEO-14** | 3 | `head-of-seo-content` | Re-run the census **at close**. Decision 171 requires it before 12× is treated as a constant — 14 clicks currently carry it |

### Risk & rights — 9 pt

| Item | Pt | Owner | |
|---|---|---|---|
| **RIGHTS-03** | 2 | `managing-editor` | The two institutional images. **UNDO pushed before the first delete** |
| **RIGHTS-02** | 5 | `managing-editor` | Photographer-grouped census — now a **record of rights held**. Read the 381-line 25 Aug plan first; refresh, do not re-derive |
| **RISK-10** | 2 | BMAD | Guard unreachable from a fresh clone. **A throwaway clone is the test** |

### Platform — 13 pt

| Item | Pt | Owner | |
|---|---|---|---|
| **PLAT-13** | 3 | BMAD | Watcher can't tell an item's finish from a tool's — worse with every gate we ship |
| **PLAT-14** | 3 | BMAD | `waiting_on_ceo` state. **Owner-requested in Sprint 03, deferred twice** |
| **PLAT-17** | 2 | BMAD | `creative-director` name collision |
| **PLAT-18** | 3 | BMAD | Colliding add silently overwrites — this is what destroyed PLAT-16 |
| **PLAT-19** | 2 | BMAD | 14 stale worktrees. **Two independent signals before any removal** |

---

## 5. Where my confidence is lowest — flagged, not proposed as cuts

The owner has declined every cut I have proposed across three sprints (decisions
62, 93, 160), and 01 Sept makes it **four**. The section's job is to show where my
confidence is weakest so the owner can bring information I do not have — it is not
a budget exercise.

- **Platform, 13 pt.** All tooling for us; none of it visible to the owner or a
  reader. It is also the track that has been deferred three times running, which is
  the argument *for* it, not against.
- **UI-17, 8 pt.** The one item where I am sizing a composition I have only ever
  seen as a drawing. If the rail turns out to need a template rewrite it is bigger
  than 8, and the DoD stays as written rather than being narrowed to fit.
- **CONT-13, 12 pt, may return 0.** Its gate is allowed to kill it and I want it to
  be. A parked CONT-13 with a clear reason beats six articles aimed at queries with
  no click left in them.

## 6. Explicitly out of scope

SEO-04 (parked a third time — the *diagnosis* has not changed) · expanding
`/dewan-kahwin/` (SEO-04 in a hat) · a sitewide title rewrite (untested hypothesis
across 86 titles) · more `mas kahwin` state pages (priced out by decision 170) ·
re-opening the art direction (the 31 Aug audit made this the *smallest* track, not
the largest) · building search (unsized since Sprint 03, deliberately not smuggled
in) · the full enforce-credit-everywhere programme (**Sprint 06**, once RIGHTS-02
has sized it) · `dewan komuniti setiawangsa` (closed, not deferred) · RISK-02 ·
hellokahwin PR #4.

## 7. Predictions, with falsifiers

1. **150–200 clicks/28d by 22 Sept without CONT-13 landing.** Decision 96's MISS is already scored wrong twice.
2. **Sitewide CTR keeps falling while impressions climb** — expected, not a failure. Judge on clicks and the document arm.
3. **CONT-13/16's eight articles reach positions 4–10 and earn ≥2.3× the number/definition arm.** **Falsifier: if they reach 4–10 and still earn under 1%, the intent mechanism is wrong** and SEO-11's whole selection rule needs re-deriving.
4. **SEO-13 moves no clicks this sprint.** Long-lag SERP-real-estate bet; recorded so it is not scored as a failure at four weeks.
5. **UI-13/17/18 move no metric.** Brand and credibility bet, same class as Sprint 03's redesign.
6. **Whole-thesis falsifier: if sitewide CTR RISES without CONT-13/16 shipping, the SERP-shape mechanism is wrong.**

## 8. What the owner is asked for

**Nothing.** The one owner-only item this meeting had — decision 161's mandated
follow-up on photographer permissions — was answered in the room. Everything else
falls inside standing autonomy.
