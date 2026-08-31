# CONT-16 — both reserved families fail the gate: one is 20 searches short of the floor, both are already live

**Sprint 05 · track `content` · 5 points · owner `writer-adat-agama-prosedur`**
**Date:** 01 September 2026
**Outcome:** **STOPPED AT THE GATE. Zero articles written. Zero production writes.**
**Item exit:** non-zero — the DoD is not met and has not been narrowed to say it was.

---

## The one-paragraph version

CONT-16 was dispatched to write two articles for two keyword families reserved at
sprint planning — `skrip pengacara majlis` and `teks kad jemputan`. Its DoD says
that if either family fails decision 170's 220-searches-a-month floor, that half
stops rather than substituting a different family. **Both halves fail, and each
fails twice over.** The wedding-scoped MC-script family tops out at **200/mo**, 20
searches under the floor. The invitation-wording family tops out at **150/mo**.
And independently of volume, **both families are already owned by live pages** —
one of which the item knew about and one of which nobody did, and that second page
already contains the exact artefact this item was dispatched to write.

Nothing was written, nothing was published, and nothing needs undoing. What the
item produced instead is the check that would have caught it at planning time.

---

## 1. The gate, half by half

### Half 1 — `skrip pengacara majlis` (the MC script)

**Volume, Ahrefs `volume`, country `my`, pulled 2026-09-01, confirmed twice**
(once through `check-serp-shape.py`'s advisory block, once through a direct
`keywords-explorer-overview` call, so the number that kills the half is not
resting on one reading):

| keyword | volume/mo | parent topic | wedding-scoped? |
|---|---|---|---|
| `teks pengacara majlis` | **3,600** | `skrip pengacara majlis` | no — generic |
| `skrip pengacara majlis` | **3,400** | `skrip pengacara majlis` | no — generic |
| `pengacara majlis` | 600 | `skrip pengacara majlis` | no — generic |
| `teks ucapan pengacara majlis` | 250 | `teks pengacara majlis` | no — generic |
| **`skrip pengacara majlis perkahwinan`** | **200** | own | **yes** |
| **`aturcara majlis perkahwinan`** | **200** | own | **yes** |
| `contoh skrip pengacara majlis` | 200 | `skrip pengacara majlis` | no |
| `teks pengacara majlis hari guru` | 200 | `teks mc hari guru` | no — teachers' day |
| `skrip pengacara majlis sekolah` | 150 | own | no — school |
| `teks pengacara majlis perkahwinan` | 90 | `skrip pengacara majlis perkahwinan` | yes |
| `skrip pengacara majlis kahwin` | 20 | `skrip pengacara majlis perkahwinan` | yes |

**The wedding slice maxes out at 200/mo. The floor is 220. It fails by 20
searches** — 200 × 4.55% = 9.1 clicks a month against decision 170's 10-click bar.

The members that clear 220 are in a **different parent topic** and are generic
MC-script demand: school assemblies, Hari Guru, dinners, motivational talks. Taking
them would be substituting a different family, which the DoD forbids in the same
sentence that sets the floor — and it would put an article about school assemblies
on a Malay wedding publication, outside all four of my pillars.

Volumes were **enumerated, not tested for**: 60–100 matching terms pulled across
five roots (`pengacara majlis`, `juruacara majlis`, `emcee majlis`,
`aturcara majlis`, `teks majlis perkahwinan`). `juruacara majlis` tops out at
40/mo and `emcee majlis` at 90/mo, both rolling up to the same generic parent.

### Half 2 — `teks kad jemputan` (the invitation-card wording)

| keyword | volume/mo | parent topic |
|---|---|---|
| `kad kahwin` | 4,700 | `kad kahwin` — design/shopping intent |
| `kad jemputan kahwin` | 2,600 | `jemputan.me` — a digital-invite operator |
| **`contoh kad kahwin`** | **2,400** | **`contoh kad kahwin`** |
| **`contoh kad jemputan kahwin`** | **1,500** | **`contoh kad kahwin`** |
| `ayat jemputan kahwin` | 150 | own |
| `ayat kad jemputan kahwin` | 100 | `contoh kad jemputan kahwin` |
| **`teks kad jemputan`** (the reserved name) | **0** | none — SERP never crawled |
| `teks kad kahwin` | 0 | none |
| `wording kad kahwin` | 0 | none |

**The reserved family name itself reads 0/mo and Ahrefs has never crawled its
SERP.** The highest wording-specific phrasing anywhere in the family is
`ayat jemputan kahwin` at **150/mo** — still under 220.

The two terms that clear the floor share the parent topic `contoh kad kahwin`,
and that parent topic is already owned (below). There is no reading of this half
that produces a legitimate new article.

### The 0/mo reading was treated as a suspect check, not a finding

Standing rule: when a check returns a surprising absence, verify the check first.
`teks kad jemputan = 0` and `serp_crawled = false` is exactly that shape. It was
verified by **enumerating what IS there** across six roots (`kad jemputan`,
`kad kahwin`, `ayat jemputan`, `kata kata jemputan kahwin`, `jemputan kahwin`,
`ucapan kad kahwin`) rather than re-testing the assumed string. The enumeration
returned a populated family with a clear head — so the zero is a real property of
that phrasing, not a broken pull. A separate broken check was caught the same way:
a `keywords-explorer-overview` call with an invented `select` field returned
`{"keywords": []}`, which is an empty result about my field list and not about the
keywords. It was re-run with the known-good field set before any number was used.

---

## 2. The finding the brief did not have: both families are already live

CONT-16's own `why` field says *"We already have one live page in the script
family."* One. There are two.

| family | live page | what it already contains |
|---|---|---|
| MC script | `/artikel/ucapan-doa/skrip-pengacara-majlis-perkahwinan` | H2 `Aturcara majlis perkahwinan: susunan biasa`, `Contoh lafaz mengikut bahagian`, `Bahagian yang ada peraturannya: bacaan doa` |
| card wording | `/artikel/pelamin-kad-cenderahati/contoh-kad-jemputan-kahwin` | **H2 `Tiga daftar ayat jemputan, dengan contoh` — Formal, Ringkas, Moden** |

**That second page is the artefact CONT-16 was dispatched to write.** The DoD asks
for "the full set of card wordings"; the live page has carried three registers of
them since before the sprint opened. Verified with the committed helper rather than
a raw grep:

```
$ bash scripts/measure/count-in-html.sh \
    https://hellokahwin.com/artikel/pelamin-kad-cenderahati/contoh-kad-jemputan-kahwin \
    "Formal" "Ringkas" "Moden" "daftar ayat"
source: https://hellokahwin.com/artikel/pelamin-kad-cenderahati/contoh-kad-jemputan-kahwin  (HTTP 200, 140063 bytes)
  Formal                       9
  Ringkas                      9
  Moden                        11
  daftar ayat                  12
```

**And the artefact is real body text, not a heading with nothing under it.** Both
live pages return `HTTP/1.1 200 OK`, `X-Vercel-Cache: MISS`, `Age: 0` on a first
request. The card page's artefact block, quoted from live HTML between
`<h2 id="tiga-daftar-ayat-jemputan-dengan-contoh">` and the next `<h2>` — 14 text
lines, first and last:

```
first | Tiga daftar ayat jemputan, dengan contoh
 ...  | Formal
      | Dengan penuh kesyukuran, kami menjemput Dato' / Datin / Tuan / Puan /
      | Encik / Cik sekeluarga ke majlis perkahwinan anakanda kami.
      | Ringkas
      | Dengan segala hormatnya, kami menjemput tuan dan puan sekeluarga ke
      | majlis perkahwinan anak kami.
      | Moden
      | Kami menjemput anda meraikan hari perkahwinan kami bersama keluarga kami.
 last | , iaitu kenduri perkahwinan mengikut Kamus Dewan Edisi Keempat. Ia tepat
      | dan sesuai dicetak. Perkataan itu merujuk jamuan yang diadakan untuk
      | memaklumkan perkahwinan kepada orang ramai.
```

**⚠ The first extraction of that block was wrong, and it was wrong in the
flattering direction.** Searching the page for `Tiga daftar ayat jemputan` and
slicing forward returned four lines — the heading and the three register names
with *nothing between them* — which reads as "the page has empty headings", the
convenient answer for an item that wanted the family to be free. It was the
**table of contents** at byte 24,438. The body is at byte 30,514. Enumerating
**all four** occurrences (TOC, body, and twice more inside the Next.js RSC
payload) is what separated them. Same failure shape as the twelve the company has
tabulated: a check that returned a number about my assumption rather than about
the page. Recorded because it nearly became the evidence.

Incidental finding for whoever owns **UI-18** ("the in-article TOC — 0 of 85"):
this page serves a real, linked, nested TOC at byte 24,438
(`<li><a href="#tiga-daftar-ayat-jemputan-dengan-contoh">…`). Whatever the 0-of-85
count measured, it was not the presence of TOC markup on this URL. Not this item's
to chase — flagged, not investigated.

This is **test 3** of the selection gate — "not already owned by a sibling page on
the same parent topic", rule 4 of the cluster method. It is stated in prose in
CONT-13's brief, it is inherited verbatim by CONT-16, and it did not fire, because
until today there was nothing to run.

---

## 3. PRE-FLIGHT exit codes, per target

`SERPSHAPE EXIT` from `scripts/seo/check-serp-shape.py`; `FAMILYOWNED EXIT` from
the new `scripts/seo/check-family-owned.py`.

| target keyword | SERPSHAPE | volume vs 220 | FAMILYOWNED | net |
|---|---|---|---|---|
| `skrip pengacara majlis` | **0** | 3,400 clears | 1 OWNED | wrong family (generic MC) |
| `skrip pengacara majlis perkahwinan` | **3** UNKNOWN — not a pass | 200 **BELOW** | **1 OWNED** | **fails 3 ways** |
| `aturcara majlis perkahwinan` | **0** | 200 **BELOW** | 0 FREE | fails the floor |
| `teks pengacara majlis perkahwinan` | **0** | 90 **BELOW** | 0 FREE | fails the floor |
| `teks pengacara majlis` | **0** | 3,600 clears | 0 FREE | wrong family (generic MC) |
| `skrip juruacara majlis perkahwinan` | **3** UNKNOWN | 0 | — | fails |
| `skrip mc majlis perkahwinan` | **3** UNKNOWN | 10 | — | fails |
| `teks kad jemputan` | **0** | **0 BELOW** | **3 UNKNOWN** | **fails the floor** |
| `teks kad jemputan kahwin` | **0** | never crawled | — | fails the floor |
| `teks kad kahwin` | **0** | 0 **BELOW** | — | fails the floor |
| `wording kad kahwin` | **0** | 0 **BELOW** | — | fails the floor |
| `ayat kad jemputan kahwin` | **0** | 100 **BELOW** | — | fails the floor |
| `ayat jemputan kahwin` | — | 150 **BELOW** | — | fails the floor |
| `contoh kad jemputan kahwin` | **0** | 1,500 clears | **1 OWNED** | **already live** |
| `contoh kad kahwin` | **0** | 2,400 clears | **1 OWNED** | **already live** |

**No target passes all three tests. Not one.** Per the DoD, both halves stop.

The AI Overview was recorded and never used to select or reject anything
(decision 169): `skrip pengacara majlis` no AIO, `skrip pengacara majlis
perkahwinan` AIO @4 on a 2026-07-22 snapshot, `contoh kad jemputan kahwin` no AIO,
`ayat jemputan kahwin` AIO present. None of it moved a decision.

---

## 4. Sitemap: the combined figure, and who contributed what

```
$ curl -sS https://hellokahwin.com/sitemap.xml | grep -oa "<loc>" | wc -l
103
```

| contributor | DoD target | actual at time of writing |
|---|---|---|
| CONT-13 | +6 (103 → 109) | 0 — gate passed with six targets, articles not yet live |
| **CONT-16** | **+2 (109 → 111)** | **0 — gate failed, both halves stopped** |
| **combined** | **111** | **103** |

**CONT-16's contribution to the combined figure is 0, and that is the item's
result rather than a shortfall in reporting it.** CONT-13's gate passed on 01 Sept
with six targets (`doa majlis ringkas` 2,800, `doa selamat majlis` 2,200, `ucapan
ulang tahun perkahwinan` 1,900, `doa penutup majlis` 1,200, `doa kesyukuran` 700,
`doa makan majlis` 250) and none of them come from the reserved families, so the
reservation did its job of keeping the two writers off each other's targets — it
simply reserved two bands that had nothing left in them.

---

## 5. Production writes and UNDO

**None. No production write was made, so there is nothing to undo.** No article was
ingested, no row created, no slug claimed. The repository changes are additive
files and documentation, reversible by `git revert` of the single commit named at
the end of this log.

---

## 6. /humanizer

**No reader-facing content was produced, so there was nothing to run it on.**
Saying it "passed" would be a claim about an empty set. The only prose written is
this internal log and the source comments in the new gate.

---

## 7. What should happen instead — recommended, not done

SEO-11 said it plainly and this item is more evidence for it: *"the return is in
upgrading pages that already rank, not in new pages."* Both reserved families
resolve to an **upgrade**, and an upgrade does not raise the sitemap count, so it
cannot satisfy a DoD written as "+2". Rewriting the DoD to make an upgrade count as
two new articles is precisely the narrowing the standing rules forbid, so this is
left as a recommendation for the CEO rather than quietly swapped in:

1. **`/artikel/pelamin-kad-cenderahati/contoh-kad-jemputan-kahwin`** already ranks
   in a parent topic worth 2,400/mo at KD 8. It is the better-value half. Widen the
   wording registers and it competes for `contoh kad kahwin` as well as the
   long-tail `ayat jemputan kahwin` (150) and `ayat kad jemputan kahwin` (100).
2. **`/artikel/ucapan-doa/skrip-pengacara-majlis-perkahwinan`** covers a 200/mo
   parent. Below the floor for a NEW page; the floor was never a rule about
   improving a page that exists.
3. Note for whoever picks this up: `aturcara majlis perkahwinan` (200/mo) is a
   **separate parent topic** and is genuinely unowned — no live slug carries
   `aturcara`. It is still under the floor on its own, but it is the natural
   second head term for an upgrade of page 2 rather than a new article.

---

## 8. A correction to the record

Two documents state something the evidence contradicts. Under the standing rule
that the evidence wins and the file is corrected at source:

- **`docs/sprints/sprint-05.json`, CONT-16 `why`** — "We already have one live page
  in the script family" is true and incomplete; there is also a live page in the
  card family, and it already carries the item's central artefact. Not edited here
  because the sprint tracker is the CEO's record and the correction is filed as
  tracker evidence instead, where it is attached to the item.
- **`docs/plans/sep-01-2026-session-01/sep-01-2026-plan-sprint-05.md` line 114** —
  describes both as "reserved families so the two writers run concurrently without
  competing for targets". The reservation worked; the families were empty.

---

## Retrospective

### What did we learn that is not written down

**Reserving a keyword family is a selection decision, and it had less scrutiny than
a selection, not more.** Targets picked from SEO-11's census pass three tests.
A family *named in a planning room* passed none of them — and reserving it is
strictly stronger than selecting it, because it also tells the other writer to stay
away. CONT-13's brief says "do NOT take targets from `skrip pengacara majlis` or
`teks kad jemputan` … taking them here starves it." Both bands were already empty.
The reservation protected nothing and fenced off nothing.

Had anyone typed `python scripts/seo/check-serp-shape.py "teks kad jemputan"` in
the planning meeting, it would have printed `volume (my): 0/mo … BELOW it`, and
CONT-16 would never have been written. That is one command, and the script it calls
had already existed for a day.

**The second thing, which is the sharper one: this exact failure was predicted and
filed, and the fix was specified and never built.** `docs/boardroom/ceo-memory.md`
already carried, from CONT-07 on 28 Aug: *"run the `parent_topic` check at PLANNING
time, before briefs are written … it is the only item on the 21-point quality bar
that cannot be satisfied by reading, so a lone reviewer will approximate it unless
it is written as a tool call."* Correct in every particular, four days early. It
stayed prose. **A known-correct diagnosis with no executable form is worth about as
much as no diagnosis** — it cost 5 points and starved a concurrent item of two
target bands.

### Which document must change, who owns the edit — and the edit

**`scripts/seo/check-serp-shape.py`** (PRE-FLIGHT #1) — owner
`writer-adat-agama-prosedur`, **edited in this item**, plus the new file it hands
off to. Prose rules do not fire, so the edit is executable in both places:

1. **NEW — `scripts/seo/check-family-owned.py` (PRE-FLIGHT #3).** Test 3 as a
   runnable gate. It resolves a candidate's Ahrefs `parent_topic`, fetches the
   **live** sitemap, and exits 1 when a live slug or `<title>` carries every
   content token of that parent topic. Prints `FAMILYOWNED EXIT: n`, namespaced so
   it can never trip the sprint watcher's `ITEM` sentinel — the mistake that woke
   the CEO for nothing on two items this morning (PLAT-13).

   **Run against the cases that actually failed, because a fix is not verified
   until it is run against the failing case:**

   ```
   $ python scripts/seo/check-family-owned.py --selftest
   PASS  'skrip pengacara majlis perkahwinan' want 1  got 1
   PASS  'contoh kad kahwin'                  want 1  got 1
   PASS  'aturcara majlis perkahwinan'        want 0  got 0
   PASS  'doa penutup majlis'                 want 0  got 0
   PASS  'doa makan majlis'                   want 0  got 0
   PASS  'rukun nikah'                        want 1  got 1
   PASS  ''                                   want 3  got 3
   REGRESSION SUITE: all 7 hold
   FAMILYOWNED EXIT: 0
   ```

   The suite is deliberately built from both directions: it fires on both CONT-16
   families, and it does **not** fire on CONT-13's genuinely-free targets. A gate
   that only ever says OWNED would have "caught" this item and be worthless.

2. **CHANGED — `check-serp-shape.py` now prints the PRE-FLIGHT #3 command on every
   PASS**, so the two gates chain and test 3 arrives at the moment of selection
   instead of in a brief nobody re-reads. **Its exit-code contract is untouched and
   its own regression suite was re-run to prove it** (`REGRESSION SUITE: all 4
   hold / SERPSHAPE EXIT: 0`) — CONT-13 is running against that script right now,
   and changing exit codes under a concurrent item would have been the more
   expensive mistake.

3. **CHANGED — `docs/boardroom/ceo-memory.md`** marks CONT-07's open "needs to be
   written as a tool call" item **closed**, names the script, and records what its
   four-day absence cost.

### What did we do twice that we should never repeat

**Wrote a selection rule in prose and shipped it into briefs instead of into a
script.** Test 3 has now been restated in the Sprint 04 brief, CONT-13's brief and
(by inheritance) CONT-16's brief — three times in prose, zero times as a command,
and it failed the first time it was load-bearing. This is the same shape as the
sprint-01 retrospective's IMEJ-marker finding, in the writer's own words: **"a rule
repeated in briefs is a rule that belongs in the artefact."** It applied to an
article template then and to a selection gate now.

Second, smaller: **the 220 floor is compared against a number Ahrefs reports in
rounded buckets.** `skrip pengacara majlis perkahwinan` reads exactly `200` and the
floor is `220`. That is one bucket. The half is stopped because the floor is the
floor and 200 < 220 — but the CEO should know the margin is inside the measurement's
own granularity, because a rule that discriminates at finer resolution than its
input is a rule that will eventually be decided by rounding. Worth deciding
deliberately: either round the floor to a bucket boundary, or state that ties go to
"stop".

### What did we nearly ship, and what caught it

**Two articles duplicating pages that are already live** — the second of which
already contains the exact artefact this item was dispatched to write. What caught
it was not the gate: the gate for it did not exist. What caught it was fetching the
live sitemap before writing anything, and reading the headings of what came back.

There was also a live temptation that the DoD is what killed. The card family has
**2,400/mo at KD 8** sitting in it. `contoh kad kahwin` passes PRE-FLIGHT #1 with
`SERPSHAPE EXIT: 0` and clears the volume floor eleven times over. It would have
been very easy to call it "the reserved family's real head term", write the
article, and report a clean gate pass — 1,500–2,400/mo is a good-looking number to
put in an evidence field. It is already ours, and a second page there is
cannibalisation. **The DoD's own sentence — "STOPS and reports rather than
substituting a different family" — is what made stopping the correct answer instead
of a failure to try harder.**

And one more, smaller and closer: **"the live page has empty headings"** — a
four-line extraction that would have made the card family look free. It was the
table of contents. What caught it was enumerating all four occurrences of the
heading string instead of slicing forward from the first one. A search-and-slice
on a Next.js page reads the TOC, the body and the RSC payload as the same text,
and only one of them is the article.

---

## Files

- `scripts/seo/check-family-owned.py` — **new**, PRE-FLIGHT #3, the ownership gate
- `scripts/seo/check-serp-shape.py` — chains to #3 on a PASS; exit contract unchanged
- `scripts/seo/serp-shape-siblings.json` — live Ahrefs pulls cached, 01 Sept 2026
- `docs/boardroom/ceo-memory.md` — CONT-07's tool-call item closed
- `docs/work-done/README.md` — index row
