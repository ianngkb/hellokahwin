# UI-13 — Build the homepage diversity rule

**Sprint 05 · design · 5 points · creative-director · 01 September 2026**

The front page ran one section over and over. It does not any more, and a build
now fails when it starts again.

---

## What the item was

DES-03 §5.3 had asserted a homepage diversity rule since 28 August and
cross-referenced "H6 in §7". No rule H6 existed. DES-17 wrote it on 01 September
and made it executable as `scripts/measure/check-h6.sh`. UI-13 is the half that
makes the live page satisfy it and keeps it satisfied.

I did not write the rule and did not change a clause of it. Where my build note
and H6 disagreed, H6 won.

---

## PRE-FIX BASELINE — measured, not carried forward

The DoD's own instrument, `grep -oE '/artikel/[a-z0-9-]+/' | sort | uniq -c`,
run against `https://hellokahwin.com/` on 01 September 2026:

```
     20 /artikel/hantaran-mas-kahwin/
      6 /artikel/ucapan-doa/
     26 total
```

**26 raw segments is 13 articles, not 26.** Next.js serves the page twice — once
as DOM, once as the RSC flight payload — so a plain-text grep over the served
HTML returns exactly double. H6.0 deduplicates by path, first occurrence wins,
and gets 13. The item's own "26/26 hantaran-mas-kahwin" is that doubled count of
13 articles; it is not 26 distinct links and never was.

The condition had also MOVED since the item was dispatched. On 28 August and in
the CEO's 01 Sept dispatch it was 13/13 `hantaran-mas-kahwin`; by the time I
measured it was 10 + 3, and an hour later 9 + 4, as ISR rotated newer `ucapan-doa`
articles in. **The proportions drift; the two-category front page does not.**
Every run failed H6, and the pre-fix capture is committed at
`sep-01-2026-ui-13-EVIDENCE/homepage-PREFIX-2026-09-01.html`.

`check-h6.sh` against that capture and the live sitemap:

```
  set:    N=13 items, 2 distinct categories, share cap ceil(N/3)=5
  order:  ucapan-doa ×3  hantaran-mas-kahwin ×10

  H6.1  SHARE CAP   FAIL — over ceil(N/3)=5: hantaran-mas-kahwin=10
  H6.2  RUN CAP     FAIL — 11 adjacent same-category pairs
  H6.3  FLOOR       FAIL — 2 distinct categories, floor min(4,K,N-cap+1)=4

  corpus: 89 published articles across 15 categories
          capacity at cap 5 = 47, required = 13
          H6 IS SATISFIABLE at N=13. A failure above is a build defect, not a corpus limit.

  VERDICT: H6 is violated.
exit 1
```

---

## THE DEFECT WAS IN TWO HALVES AND THE SECOND ONE IS THE ONE THAT GETS MISSED

**Half 1 — no diversity constraint existed anywhere.** `getHomeData()` ordered
`publishedAt DESC` and the page took the first 13. H6.1, H6.2 and H6.3 were
consulted nowhere.

**Half 2 — `.limit(20)` made H6 unsatisfiable regardless of the ordering.**
Under H6.1 a candidate pool contributes at most `min(count_in_pool(c), cap)` per
category. Ranks 1–13 by `publishedAt` were **two categories**, so their capacity
at cap 5 was `5 + 3 = 8` against a required 13. Reaching 13 needed five more
items from ranks 14–20 in at least three further categories, and nothing in the
code made that true — it was an accident of the publish order, in a corpus where
**38 of 89 articles are `hantaran-mas-kahwin`**.

A perfect H6.4 implementation over a 20-row recency buffer falls through H6.5 to
step (3) and TRUNCATES, and the visible result is a *shorter* homepage rather
than a fixed one — which the checker would not catch, because an 8-item page can
satisfy H6 at N=8. The pool had to become the published corpus, which is also
the set H6.5's satisfiability test is written over (`published(x)`, not
`buffered(x)`).

---

## HALF 2, MEASURED RATHER THAN INFERRED

I claimed in the build note that a 20-row recency buffer gave no *guarantee*.
The Design Systems Engineer measured it against the production database
(`scripts/measure/measure-h6-pool.mjs`, output committed) and the answer is
stronger than the claim:

**Measured twice, because the corpus moved under the measurement.** It went
89 → 90 → 92 published articles during this item, as two more were published
mid-session. The final run, at 92:

```
ranks 1–13:                    13 rows, 4 categories
                               hantaran-mas-kahwin=7 ucapan-doa=4
                               nikah-undang-undang=1 sebelum-nikah=1
                               capacity at cap 5 = 11, required 13 -> NOT satisfiable

ranks 1–20 (the old buffer):   20 rows, 4 categories
                               hantaran-mas-kahwin=14 ucapan-doa=4
                               nikah-undang-undang=1 sebelum-nikah=1
                               capacity at cap 5 = 11, required 13 -> NOT satisfiable

ranks 14–20 are:               hantaran-mas-kahwin ×7
categories they ADD over 1–13: (none)

the whole published corpus:    92 rows, 15 categories
                               capacity at cap 5 = 49, required 13 -> SATISFIABLE
```

The first run, at 90 rows, read `hantaran-mas-kahwin=9 ucapan-doa=4` over ranks
1–13 — **two** categories and a capacity of **9**. Both runs are recorded because
the movement is the point: the buffer's capacity rose from 9 to 11 as articles
published, and **13 was never reachable from it at either measurement.** A
finding that survives its own corpus moving twice is worth more than a finding
taken once.

**H6 was not merely unguaranteed from the old buffer — it was flatly
unsatisfiable from it.** Capacity 11 against a required 13, and 9 an hour
earlier. A perfect H6.4
implementation over `.limit(20)` would have fallen through H6.5 to step (3) and
truncated the front page to nine or ten items, and `check-h6.sh` would have
returned exit 0 on that shorter page, because a 9-item set satisfies H6 at N=9.
**The item would have looked done.** That is the trap in this defect and it is
the reason the pool is the whole corpus.

The price, stated: the `unstable_cache` entry goes from **55,612 B to
235,542 B** (4.24×, 230.0 KiB) for 92 rows — well under the ~1.5 MB at which the
build note called for a two-query shape, so one query it stays.
`cover_image_smart_crops` is 43.2% of it. **That is about 2,560 B per row, which
puts the ~1.5 MB point near 590 published articles** — the number to watch, and
the trigger to reach for the two-query shape rather than re-deriving the
argument. Cache key bumped `hk-home-v4` →
`hk-home-v5`, because the Vercel Data Cache persists an entry across deployments
and a wider query under the old key serves the previously-cached 20 rows to the
first readers after a deploy.

---

## POST-FIX

### The local build, before anything shipped

Against `http://localhost:3200/` and the live sitemap, on `BUILD_ID
aSbcPnBF6DNArxC6A5Nj7`, reading the PRODUCTION database (the local Postgres is
not a copy of production and measures a different corpus):

```
  raw:    26 category segments before dedup (ucapan-doa=10 hantaran-mas-kahwin=10
          pelamin-kad-cenderahati=4 sebelum-nikah=2)
  set:    N=13 items, 4 distinct categories, share cap ceil(N/3)=5
  order:  ucapan-doa hantaran-mas-kahwin ucapan-doa hantaran-mas-kahwin ucapan-doa
          hantaran-mas-kahwin ucapan-doa hantaran-mas-kahwin ucapan-doa
          hantaran-mas-kahwin pelamin-kad-cenderahati sebelum-nikah
          pelamin-kad-cenderahati

  H6.1  SHARE CAP   pass — largest category ucapan-doa=5, cap 5
  H6.2  RUN CAP     pass — no two consecutive items share a category
  H6.3  FLOOR       pass — 4 distinct categories, floor min(4,K,N-cap+1)=4

  VERDICT: H6 holds.
exit 0
```

The controls were run on the same rig in the same session, because a gate seen
only to PASS is half-proven: the pre-fix capture still exits **1** with all three
clauses named, and an unreadable corpus still exits **3** with no verdict at all.

### PRODUCTION — `https://hellokahwin.com/`, merged as `a526c12`, 01 September 2026

The DoD's own instrument, the same command as the baseline at the top of this
document:

```
     10 /artikel/ucapan-doa/
     10 /artikel/hantaran-mas-kahwin/
      2 /artikel/sebelum-nikah/
      2 /artikel/pelamin-kad-cenderahati/
      2 /artikel/nikah-undang-undang/
     26 total          (HIT out of sin1, Age 32)
```

**One category to five. 26/26 to 10/10/2/2/2.** And the same 26, because the
count is doubled by the RSC payload either way; it is 13 items.

```
$ bash scripts/measure/check-h6.sh --corpus https://hellokahwin.com/sitemap.xml https://hellokahwin.com/

  set:    N=13 items, 5 distinct categories, share cap ceil(N/3)=5
  order:  sebelum-nikah nikah-undang-undang ucapan-doa hantaran-mas-kahwin
          ucapan-doa hantaran-mas-kahwin ucapan-doa hantaran-mas-kahwin
          ucapan-doa hantaran-mas-kahwin ucapan-doa hantaran-mas-kahwin
          pelamin-kad-cenderahati

  H6.1  SHARE CAP   pass — largest category ucapan-doa=5, cap 5
  H6.2  RUN CAP     pass — no two consecutive items share a category
  H6.3  FLOOR       pass — 5 distinct categories, floor min(4,K,N-cap+1)=4

  corpus: 92 published articles across 15 categories
          capacity at cap 5 = 49, required = 13
          H6 IS SATISFIABLE at N=13.

  VERDICT: H6 holds.
exit 0
```

And through the browser, which is where H6.6 is decided:

```
$ node scripts/ui-layout-gate.mjs --url https://hellokahwin.com/
[ ok ] / @390    0 violation(s)   … H6:0 H6.6:0
[ ok ] / @768    0 violation(s)   … H6:0 H6.6:0
[ ok ] / @1024   0 violation(s)   … H6:0 H6.6:0  · +1 advisory
[ ok ] / @1440   0 violation(s)   … H6:0 H6.6:0  · +1 advisory
[ ok ] / @1920   0 violation(s)   … H6:0 H6.6:0  · +1 advisory
UILINT EXIT: 0
```

Zero blocking violations on every check at every width — not only H6.

### The gates, and one that could not run

| | |
|---|---|
| `pnpm typecheck` | 0 |
| `pnpm test` | 507 passed, 36 files |
| `ui:gate:selftest` | **215 passed, 0 failed** (117 before this item; 192 after H6; 215 after merging UI-17's rail check) |
| `check-h6.sh` controls in CI | pre-fix **1**, good **0**, reversed **0**, missing file **3**, `4 of 4 controls ran` |
| `pnpm lint` | red on 6 files, **all six byte-identical to master** — pre-existing, not this branch |

**The CI step I wrote to prove the instrument could not itself run.** `shell: bash`
gives `bash --noprofile --norc -e -o pipefail`, and this suite's FIRST control
deliberately expects a non-zero exit — so `-e` killed the shell inside `run()` on
`check-h6.sh`'s expected `1`, before `got=$?` was read. It printed its header line
and stopped. `set -uo pipefail` does not clear `-e`. Locally the identical script
passed, because a plain `bash file.sh` carries no `-e`; **that difference is the
whole trap, and running the step under the real flags is what "verified against
the failing case" has to mean for a CI step.** Reproduced locally by extracting
the step out of the YAML and running it under GitHub's exact flags — old exits 1
with zero controls run, new exits 0 with four. A `ran` counter now fails the step
if fewer than four executed, because a suite that dies early prints some passes
and then stops, which reads exactly like a suite that finished.

### I looked at the photograph, because a crop can break the depiction rule with every number green

H6 changed which article leads the front page, so the hero is a different
photograph. Numbers first: the desktop plate serves `crop-4.3x1-desktop-hero.webp`
at **2464×700 = 3.520:1** into an `aspect-[88/25]` box, deviation 0.0%; the
`<1024px` band serves `crop-16x9-og.webp` at **1200×630 = 1.905:1** into
`aspect-[40/21] = 1.905`, also 0.0%. `isHeroFrameEligible`'s 33% retained-frame
gate — UI-03's, unchanged and still the thing standing between this slot and
another macro of artificial flowers — is applied over the whole 92-article corpus
now rather than a 20-row buffer.

Then I opened both files. `/artikel/sebelum-nikah/doa-jodoh` leads with a
congregation at doa in a mosque: hundreds of Malaysian men in baju melayu and
songkok, seated, reciting. It is human photography, it is legible at both bands,
and it depicts its subject — the article is about doa and the photograph is of
doa. **Rule 1 holds.**

**But it is a mosque congregation on the front page of a wedding publication,
and that is worth saying out loud.** It is not a defect and it is not something
to fix inside this item: H6.4's slot-1 clause is "the highest-ranked article
whose cover is class O or class P" and carries **no subject constraint at all**.
Widening the pool from 20 articles to 92 widened the hero's subject range by
4.6×, and the first thing that came through it was the religious-procedural
pillar. The rule did exactly what it says. Whether the hero slot should also
have an editorial-fit gate is a question for the next revision of H6, raised
here rather than smuggled in as an implementation detail.

### Open, and named rather than narrowed

- **H3, the no-hero variant** has no markup anywhere in the repo. `selectHomeSet`
  computes `variant` and the page does not render it. **Parked with a reason:**
  unreachable at N=92 with hero-eligible covers present, and building an
  unreachable variant nobody can look at is how untested markup ships. Owner:
  creative-director, next time DES-03 §5.3's no-hero case is drawn.
- **H6.5's relaxations are invisible to `check-h6.sh`.** A set H6.5 explicitly
  permits reports exit 1. DES-17 made the exit code binary on purpose and
  `--corpus` is how the two cases are told apart. Recorded in §7.6 on the docs
  line; not worked around in the build.
- **Satisfiable ≠ reachable by H6.4's greedy** — 15 articles over 3 equal
  categories is satisfiable at N=13 and the fill reaches 12. Faithful to H6.4,
  which specifies a greedy. Recorded as a passing test.
- **No lint or test workflow in this repo.** See the retrospective table.
- **The empty state renders no `<h1>`, and the swap to `.s-empty` neither
  created nor fixed that.** §9.1 assigns the homepage's h1 to the hero headline;
  with zero published articles there is no hero, and `EmptyState`'s heading is a
  `<span class="s-h2">`. The bespoke dashed box it replaced had the identical
  hole. Raised by the Design Systems Engineer and it is mine, not theirs:
  closing it means either forking a shared component or inventing a heading
  level for a state DES-03 draws without one, and neither is a call to make
  inside an item about category diversity. Same shelf as H3, and unreachable for
  the same reason. Owner: creative-director.

### Two rulings I made on the engineer's questions, recorded so they are not re-litigated

**The empty state's copy split — it stands.** "Keep the existing copy, give it a
real heading, invent nothing" cannot all hold literally, because a heading has to
come from somewhere. Splitting the existing sentence at its own full stop —
`heading="Belum ada artikel."`, `body="Kandungan akan datang tidak lama lagi —
jumpa lagi!"` — invents no word and matches the shape `EmptyCategoryState` and
`NotFoundState` already use. Correct call. (The heading keeps its full stop,
which is not house style for a heading; it is not worth a deploy on a state
nobody can reach, and it is written down here so the next person to touch this
block fixes it in passing rather than wondering.)

**Rendering the empty state before shipping it — right, and it generalises.** My
objection to H3 was that building an unreachable variant nobody has looked at is
how untested markup ships. That objection applies to any unreachable state,
including the one I had just ordered built. Forcing it with `selectHomeSet([])`,
serving it, measuring it and reverting the probe is the correct response, and the
negative controls (`Terkini`, `Lihat semua artikel`, article links, `Tiada
gambar`, `border-dashed` — all 0) are what make it evidence rather than a
screenshot.

---

## Retrospective

### What we learned that is not written down

**1. An error path that has never been executed is not an error path.**

`check-h6.sh` documented three exit codes and could only ever produce two.
`fetch()` is called exclusively inside a command substitution, so it runs in a
subshell and `die`'s `exit 3` killed the subshell alone; the parent read an empty
description and carried straight on over an empty file. The first live run of
this item hit it, because this machine's known TCP stall killed the sitemap
fetch, and the script printed a **verdict**:

```
corpus:                                    <- silently blank
H6.3  FLOOR       pass — 2 distinct categories, floor min(4,K,N-cap+1)=1
corpus: 0 published articles across 1 categories
        H6 IS NOT SATISFIABLE at N=13. H6.5's fallback applies: ...
```

Both lines false and **both lenient**. An empty corpus makes `K=1`, which drags
H6.3's floor from 4 to 1, so the clause reported PASS on a two-category
homepage. And the satisfiability line inverted: it blamed a corpus of 89
articles for a build defect and pointed at H6.5's truncation ladder, which is
the instruction to ship a *shorter* homepage rather than a fixed one.

DES-17 built six fixtures and every one exercises a VERDICT. None exercises an
ERROR. That is the gap, and it is not specific to this script — every instrument
in `scripts/measure/` will reuse the same `die`-inside-`$()` idiom.

**2. The satisfiability test and the fill are not the same question.**
H6.5 calls a corpus satisfiable when `Σ min(published(x), cap) ≥ N`. H6.4
specifies a **greedy** with recency first and no backtracking. Those can
disagree: on 15 articles across 3 equal categories with distinct timestamps,
H6.5 says satisfiable at N=13 and the fill reaches 12. Faithful to H6.4 as
written; recorded as a passing test rather than "fixed", because backtracking
would be a new clause and not an implementation of an existing one.

**3. H6 is a floor, and it now reads like one.** The post-fix front page runs two
categories at the cap of 5 and two more at 2 and 1 — conforming, and 10 of 13
items still come from two sections. That is what H6.4 specifies, because it
ranks recency first and explicitly REJECTS ranking diversity first ("it produces
a well-mixed homepage that buries what was published yesterday"). It is the
right trade and it is not what a magazine front page looks like. A revision of
H6 that wants a genuinely mixed page needs a *different rank*, not a stricter
cap — and that is DES-17's call, not a thing to smuggle in through an
implementation.

### Which document must change, and who owns the edit

| File | Edit | Owner | State |
|---|---|---|---|
| `scripts/measure/check-h6.sh` | `fetch` returns 3; caller dies in the parent; a corpus parsing to zero URLs is exit 3 | creative-director | **done**, and the four exit-code controls now run in CI |
| `docs/fixtures/2026-09-01-h6/README.md` (docs line) | its closing rule is one clause short: "…**and a case it cannot judge has actually been refused**" | creative-director | **done** |
| `docs/design/des-03-spesifikasi.html` §7.6 (docs line) | four rows: the browser gate, H6.6's invisibility to the shell script, the exit-3 controls, and where the rule and its instrument still disagree | creative-director | **done** — the spec's own two grep controls still read 1 and 0 after the edit |
| `scripts/git-hooks/README.md` (both lines) | "anything under `docs/` goes to the docs line" is wrong; the path map, with counts | creative-director | **done** |
| `.github/workflows/` — a lint/test workflow | this repo has four gate workflows and **no** workflow that runs `pnpm test` or `pnpm lint`. UI-13 added a job scoped to one test file; the general gap is real | **design-systems-engineer**, and it is a repo-wide decision | **OPEN**, named rather than taken sideways inside a design item |

Every one of those edits is either a script, a gate, or a table of measured
numbers. None is a prose rule, because prose rules do not fire — which is the
entire reason H6 existed for two sprints and rejected nothing.

### What we did twice

- **Measured the live homepage twice**, because the first run's sitemap fetch
  died on this machine's known TCP stall (42s, then instant on retry) and the
  script reported a verdict anyway. The second measurement is the one in this
  document. The cost was small; the reason it happened is finding 1.
- **Implemented H6 twice, on purpose** — once over raw HTML (`check-h6.sh`) and
  once over the rendered DOM (layout gate check 10) — because H6.6 makes DOM
  order normative and a shell script cannot see a computed value. Duplication is
  a drift risk, so the self-test asserts the two agree on the extracted sequence
  for the same committed fixture. If they diverge, CI goes red.
- **Wrote the raw-census warning twice.** The first draft warned whenever the raw
  count was not `2 × N`, and fired on all eight of its own fixtures, which are
  plain HTML with no RSC payload. A warning that goes off on every control is
  noise that teaches people to skip the line. It is now "neither `1 × N` nor
  `2 × N`".

### What we nearly shipped, and what caught it

**A green H6.3 on a broken homepage.** The very first live run printed
`H6.3 FLOOR pass`. Reported as measured, that says *one clause already conforms*,
and it would have narrowed the fix to two clauses on a page that violates three.

What caught it was not suspicion of the script. It was having measured the
corpus **independently, first**: the sitemap census (89 articles, 15 categories)
was already on screen when the tool printed "0 published articles across 1
categories". Two numbers about the same corpus, taken minutes apart, that could
not both be true. Without the prior measurement the pass would have looked like
good news.

That is the standing rule doing its job in an unexpected direction — *a zero is a
claim about your check until you have proved the check*, applied to a **pass**
rather than to a zero. A lenient error path produces a PASS, and a pass attracts
no scrutiny at all.

**And the near-miss underneath it: `.limit(20)`.** Fixing only the ordering would
have produced a truncated nine-item homepage that `check-h6.sh` reports as exit
**0**, because a 9-item set satisfies H6 at N=9. The item would have looked done
and the front page would have been shorter and still monotonous. What caught that
was computing the pool's capacity (9) against the requirement (13) *before*
writing any selection code, rather than writing the algorithm and testing the
result.
