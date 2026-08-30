# Sprint 04 proposal — *Earn the click*

**Status:** **APPROVED — executing.** Scope agreed with the owner 30 Aug 2026:
43 points, 11 items, nothing cut. Awaiting `/startsprint`.
**Date:** 30 August 2026
**Meeting:** `docs/boardroom/meetings/2026-08-30-sprint-04-planning.md`
**Prepared by:** CEO, HelloKahwin

---

## 1. Performance snapshot

GSC, property `https://hellokahwin.com/`, pulled 30 Aug 2026. Deltas are against
decision 96, the snapshot taken at Sprint 03 planning on 27 Aug.

| Metric (28d) | 27 Aug | 30 Aug | Δ |
|---|---|---|---|
| Clicks | 51 | **99** | **+94%** |
| Impressions | 2,869 | **6,693** | **+133%** |
| CTR | 1.78% | **1.48%** | **−0.30pp** |
| Avg position | 17.7 | **12.4** | **−5.3 (better)** |
| Sitemap indexed URLs | 103 | 103 | 0 |

Daily trend, the part that matters:

| Date | Impressions | Clicks | Position |
|---|---|---|---|
| 25 Aug | 252 | 5 | 13.0 |
| 26 Aug | 669 | 12 | 9.4 |
| 27 Aug | 879 | 14 | 10.0 |
| 28 Aug | 1,296 | 15 | 8.9 |
| 29 Aug | **1,413** | **18** | **8.6** |

Baseline before 25 Aug was ~80 impressions/day. **Impressions are up roughly 17×
against that baseline; clicks are up about 4×.**

Sitemap: **Valid, 103 indexed URLs, 0 errors, 0 warnings**, last downloaded
30 Aug 03:36. RISK-04 and RISK-07 both confirmed holding.

### Scoring decision 96's prediction

Decision 96 predicted the **22 Sept checkpoint of 150 clicks/28d would be MISSED**,
from a base of 51. At 99 with the trend above, **that prediction now looks wrong in
our favour** and I am recording it as such rather than letting it quietly expire.
The 21 Nov target of 1,500 clicks/28d remains a long way off, and section 2
explains why the current growth curve does not reach it on its own.

---

## 2. The finding: we are winning impressions in queries Google answers itself

**CTR fell while position improved.** That is the opposite of what Sprint 03 was
built to do, and decision 96 specifically noted its absence three days ago
("CTR moved 1.65% → 1.78% *while* position improved … so this is not volume
dilution"). It is volume dilution now. This section establishes what kind.

### 2.1 The per-query numbers, which rule out an averaging artefact

Sprint 02's retro established that an averaged position can describe no real
query. These are **single queries**, so that objection does not apply.

| Query | Impressions | Position | Clicks | CTR |
|---|---|---|---|---|
| `doa pengantin baru rumi` | 84 | 3.7 | 8 | **9.52%** |
| `idea goodies kahwin` | 19 | 9.2 | 2 | **10.53%** |
| `hantaran kahwin 5 balas 7` | 21 | 3.9 | 1 | 4.76% |
| `mas kahwin johor` | 156 | 6.3 | 1 | **0.64%** |
| `mas kahwin kelantan` | 125 | 6.9 | 1 | **0.80%** |
| `walimatul urus` | 121 | 10.0 | 1 | **0.83%** |
| `maksud walimatul urus` | 74 | 9.1 | 1 | **1.35%** |

A page at position 6.3 should earn roughly 5–7% CTR. `mas kahwin johor` earns
0.64% — **about a tenth of what its position predicts.** Meanwhile
`doa pengantin baru rumi` at position 3.7 earns 9.52%, which is entirely normal.
**The site can convert. It converts on some queries and not others**, and the
split is not explained by position.

### 2.2 What I checked first, and disproved

The obvious candidate was the 🔴 open cached-metadata defect — a correct ranking
carrying the root layout's generic `<title>`. **Disproved.** Six live fetches on
30 Aug, five of them cold (`X-Vercel-Cache: MISS`, `Age: 0`) — the exact condition
that used to break it:

```
mas-kahwin-johor              MISS  <title>Mas kahwin Johor 2026: RM22.50 dan asal usul angkanya | HelloKahwin</title>
hantaran-tunang-3-balas-5     MISS  <title>Hantaran tunang 3 balas 5: apa yang dibawa dan dibalas | HelloKahwin</title>
mas-kahwin-perak              MISS  <title>Mas kahwin Perak 2026: tiada kadar minimum ditetapkan | HelloKahwin</title>
mas-kahwin-kelantan-terengganu MISS <title>Mas kahwin Kelantan dan Terengganu 2026: tiada kadar tetap | HelloKahwin</title>
hantaran-kahwin-5-balas-7     MISS  <title>Hantaran kahwin 5 balas 7: isi dua belas dulang itu | HelloKahwin</title>
walimatul-urus                HIT   <title>Walimatul urus: maksud, hukum dan adab jemputan | HelloKahwin</title>
```

Every title correct. **SEO-07's fix is holding under the condition that used to
break it** — that is a Sprint 03 item scoring well against reality, and it also
removes the comfortable explanation for the CTR problem.

### 2.3 The actual cause: SERP shape

Three `serp-overview` pulls (Ahrefs, country `my`, 30 Aug). The third was run
specifically to try to break the pattern the first two suggested.

| Query | Our CTR | Image pack | **AI Overview** | PAA block |
|---|---|---|---|---|
| `doa pengantin baru rumi` | **9.52%** | Yes (18 results) | **No** | No |
| `mas kahwin johor` | 0.64% | Yes (9 results) | **Yes — pos 3** | Yes — pos 4 |
| `walimatul urus` | 0.83% | Yes | **Yes — pos 1** | Yes — pos 5 |

**The image pack is not the discriminator — all three have one.** The
discriminator is the **AI Overview**, and it lines up with intent:

- `doa pengantin baru rumi` wants a **document**: the actual text of a prayer, to
  read aloud or copy. An AI Overview cannot satisfy that, and Google has not
  placed one. Positions 2–10 are ordinary blue links. **We earn 9.52%.**
- `mas kahwin johor` wants a **number** (RM22.50). AI Overview at position 3 with
  three sitelinks, PAA at 4 asking *"Berapa mas kahwin Johor?"*. The answer is
  fully served above us. **We earn 0.64%.**
- `walimatul urus` wants a **definition**. AI Overview at position **1**, with
  Dewan Bahasa dan Pustaka — the national dictionary — at organic 2 and Wikipedia
  at 6. **We earn 0.83%.**

**This is the mechanism behind decision 67**, recorded on 24 Aug as an unexplained
observation: *"we have proven we can get indexed and have not proven we can earn a
click."* Six days later we can say why, and say it per query class.

One uncomfortable corollary worth stating plainly: **our own titles hand the
answer over.** `Mas kahwin Johor 2026: RM22.50 dan asal usul angkanya` puts the
number in the SERP. Where an AI Overview has already answered, that is not the
cause of the loss — but it removes our last reason to be clicked.

### 2.4 What this does and does not license

It does **not** license abandoning the hantaran/mas-kahwin cluster. Those pages
hold positions 4.9–8.0 on real demand, they are the site's topical authority, and
impressions have brand value we are not measuring. It also does not license a
sitewide title rewrite — that is a hypothesis, not a finding, and SEO-11 exists to
test it before anyone acts on it.

What it licenses is **a selection rule for what we build next**, and the honest
statement that **impression growth in this class will not reach 1,500 clicks.**

---

## 3. Open items audit — every Sprint 03 assignment, scored

Sprint 03 closed **107/115 points, 26 items, state `done`** (tracker, 30 Aug).

| Carried item | Status on re-measure | Verdict |
|---|---|---|
| SEO-07 titles | 5 cold MISS renders, all correct titles (§2.2) | **Done, verified** |
| RISK-07 sitemap noindex | Sitemap Valid, 103 URLs, 0 errors | **Done, verified** |
| PLAT-13 watcher false wakes | Not started | **Still open** → this sprint |
| PLAT-14 state-transition log | Not started; owner-requested | **Still open** → this sprint |
| SEO-04 venue entity pages | Parked twice at the same gate | **Stays parked** — see §5 |
| Garden-wedding image credits | **Figure was stale — see below** | **Re-scoped** → RIGHTS-01 |
| 307 `jangan-guna` legacy assets | 0 on garden-wedding; needs a real census | **Still open** → RIGHTS-02 |
| 🔴 wrong-`<title>` defect | Disproved on 6 live fetches (§2.2) | **Close it** |
| Hazard: `feat/des-05-…` branch | `git ls-remote origin` returns no match | **Already gone** |
| Hazard: `creative-director` collision | Two personas still share the name | **Still open** → PLAT-16 |
| Structural: docs/site same repo | No guard exists | **Still open** → RISK-09 |

### The credit figure was wrong, and my first check was wrong too

Sprint 03's retro carried forward *"27 of 48 images on garden-wedding carry NO
CREDIT."* I grepped the live page for `Kredit` and got **zero** — which would have
read as *worse*, not better.

**The check was wrong.** The credits are there; they are labelled in **English**.
Enumerating the actual casings on that one page:

| Label | Count |
|---|---|
| `Source:` | 22 |
| `source:` | 6 |
| `sOURCE:` | **6** |
| `SOURCE:` | 6 |
| **Total** | **40** across 49 photos |

So roughly **9 uncredited, not 27** — the carried figure is stale and is corrected
here. But the check surfaced two defects nobody had recorded:

1. **The credit label is English on a Malay reader page.** This is the same shape
   as the `## SOURCE NOTES` block in the DoD standard's failure mode 5 — English
   scaffolding surviving a conversion onto a page readers actually see. It is on
   the page drawing 28% of site impressions.
2. **`sOURCE:` renders on the live site, six times.** A visible typo.

Sampling 30 more articles: 3 carry credit labels, all with mixed casing
(`dewan-kahwin` 14 labels across three casings, `hantaran-tunang` 12,
`pelamin-kahwin-dewan` 8). This is small and cheap and it is exactly the kind of
defect an automated check should own rather than a person noticing.

---

## 4. The backlog

**43 points, 11 items.** Sprint 03 planned 52 before the owner added the redesign;
completed velocity was 107. CONT-13 is deliberately unsized pending SEO-11 and is
the item most likely to grow — I would rather say that now than book a number I
will have to narrow later.

### Track: RISK

| ID | Pts | Owner | Item |
|---|---|---|---|
| **RISK-09** | 3 | BMAD | **Guard the shared-repo hazard.** `hellokahwin` (docs) and `hellokahwin-site` are the same repo — same remote, same root commit `3a1fbe09` — kept apart only by the convention that nobody merges `feat/command-centre-dashboard`. One `git checkout master` in the docs tree swaps the company record for the site source. There is no guard. |

**DoD (RISK-09):** a `pre-checkout` or `post-checkout` git hook, committed and
installed in both trees, that refuses or loudly warns on a branch switch across
the docs/site boundary. Verifiable by running the switch in a throwaway clone and
quoting the refusal text, plus a negative control showing an ordinary in-space
switch still succeeds. A gate, not a paragraph in a README.

### Track: SEO — the strategic core

| ID | Pts | Owner | Item |
|---|---|---|---|
| **SEO-11** | 5 | head-of-seo-content | **Classify every ranking query by SERP shape and compute the click ceiling per cluster.** §2.3 tested three queries. This tests the rest and turns an anecdote into the number that governs content selection. |
| **SEO-12** | 3 | head-of-seo-content | **Make the SERP-shape test a pre-flight gate, not prose.** No new article target is accepted until `serp-overview` has been run against it and the AI Overview / PAA flags recorded. |

**DoD (SEO-11):** a committed CSV at `docs/work-done/…/serp-shape-census.csv`, one
row per query with ≥20 impressions in the last 28 days, carrying: query,
impressions, our position, actual CTR, `ai_overview` present (bool),
`ai_overview` position, PAA present, image-pack present, expected CTR at that
position, and the ratio actual/expected. Plus a written rule stating the
impression threshold above which an AI-Overview'd query is not worth a new page.
**Run the census with a tested pattern** — quote one row you verified by hand
against the raw `serp-overview` response before trusting the other 200.

**DoD (SEO-12):** the check exists as a **runnable script** (`check-serp-shape.py`
or equivalent), committed, that takes a candidate keyword and exits non-zero when
the SERP carries an AI Overview answering the query. Demonstrated by running it
against `mas kahwin johor` (must fail) and `doa pengantin baru rumi` (must pass).
Wired into `head-of-seo-content`'s pre-flight checklist in the persona file — the
same place the "resolve the operator" rule was moved to when prose failed to fire.

### Track: CONTENT

| ID | Pts | Owner | Item |
|---|---|---|---|
| **CONT-13** | 12* | writer-inspirasi-vendor-venue | **The document-intent bet.** Build for the query class that converts: where the user needs a text to read, copy, print or recite. `doa pengantin baru rumi` earns 9.52% at position 3.7; `idea goodies kahwin` earns 10.53%. Targets selected by SEO-11, not by me. |
| **CONT-14** | 3 | writer-inspirasi-vendor-venue | **Re-angle the `hantaran-kahwin` legacy seed toward definition and money.** The one C2.1 boundary left OPEN in `ceo-memory.md`; decision 120 assigned this to CONT-12 and CONT-12 closed without doing it. Changes one body, not the count. |

\* CONT-13 is **gated on SEO-11** and its point count is provisional.

---

### 4.1 CONT-13 in full — the document-intent bet

Detailed at the owner's request, 30 Aug.

#### What "document intent" means, precisely

A query has **document intent** when the searcher needs to *take a text away* —
read it aloud, copy it into a message, print it, recite it, or fill it in. The
defining test is not topic; it is whether **a two-sentence answer satisfies the
searcher**. If it does, Google's AI Overview will supply it and we lose. If the
searcher needs the *whole artefact*, an AI Overview cannot substitute for it and
the blue link survives.

| | Number / definition intent | **Document intent** |
|---|---|---|
| Searcher wants | A fact | An artefact |
| Satisfied by 2 sentences? | Yes | **No** |
| Example | `mas kahwin johor` → "RM22.50" | `doa pengantin baru rumi` → the full prayer |
| Our measured CTR | **0.64%** | **9.52%** |

This is why the bet is not "write more good articles". It is a claim about
**which queries have a click left in them at all.**

#### Where the evidence already points

Three of the site's four best-converting queries are already this shape, which is
the strongest argument for the bet — we are not guessing at a new audience, we are
noticing which of our existing pages works:

| Query | Pos | CTR | Shape |
|---|---|---|---|
| `idea goodies kahwin` | 9.2 | **10.53%** | a list you act on |
| `doa pengantin baru rumi` | 3.7 | **9.52%** | a text you recite |
| `hantaran kahwin 5 balas 7` | 3.9 | 4.76% | a list you pack |
| `checklist kahwin` | 8.0 | 2.33% | a list you tick |

**Candidate families for SEO-11 to test** — named as *hypotheses for the census to
confirm or kill*, not as a target list. Target selection belongs to
head-of-seo-content with data, not to me with a hunch:

- **Doa dan ucapan** — doa majlis perkahwinan, doa selamat, doa untuk pengantin.
  The proven family. Reader needs Arabic, rumi transliteration and the Malay
  meaning together.
- **Skrip pengacara majlis** — MC scripts. Copied wholesale. We already have one
  live page here.
- **Kata-kata dan teks ucapan** — congratulation wording, card and message text.
- **Senarai dan checklist** — hantaran packing lists, preparation checklists,
  budget templates. Printable.
- **Teks kad jemputan** — invitation card wording templates.

#### Deliverable

**Six articles**, 2 points each. Each one must contain the **complete artefact on
the page** — the full doa in Arabic, rumi and Malay meaning; the entire MC script;
the whole checklist — not a description of it and not a partial sample with the
rest implied. **Completeness is the product.** An article that summarises the
artefact is competing with the AI Overview on the AI Overview's own ground and
will lose.

#### ⚠ A SECOND GATE, AND IT IS NOT NEGOTIABLE: religious text accuracy

Doa and Quranic text are the highest-conversion family and the **highest-risk**
content this company has ever published. A misquoted prayer is not the same class
of error as a wrong venue price — it is a brand-ending error with a Malay Muslim
audience, and it is the kind of mistake that gets screenshotted.

**Every doa, Arabic string, transliteration and religious claim goes through
`editorial-verification-lead` before publication, against a named published
authority** (JAKIM, a state mufti's office, Dewan Bahasa dan Pustaka, or a
recognised published collection), **with the authority and the date checked
recorded per item.** If a text cannot be sourced to a named authority, **it does
not ship** — the article publishes without it or does not publish.

This is the same shape as SEO-04's sourcing gate, and it is allowed to kill items
the same way. **A parked doa article costs 2 points. A wrong one costs the
audience.**

#### GATE FIRST, BEFORE ANYTHING IS WRITTEN

Spend up to one hour confirming SEO-11's census surfaces **at least six**
document-intent targets meeting all three tests:

1. **≥100 impressions/28d** in GSC, or ≥100 monthly volume in Ahrefs MY.
2. **No AI Overview** on the live SERP, verified by `serp-overview` (SEO-12's
   script is the check).
3. **Not already owned by a sibling page** on the same parent topic — rule 4 of
   the cluster method.

**If fewer than six clear all three, STOP and bring it back.** Do not pad the list
with number or definition targets we have just proved are capped. Do not fall back
to more `mas kahwin` state pages because they are easy to write. Do not lower the
impression floor to make the count. **A parked CONT-13 with a clear reason is a
good outcome and is worth more than six articles aimed at queries with no click
left in them.**

#### Definition of done

- **Six articles live in production**, each returning **200 on first request**.
- **Sitemap count rises 103 → 109**, quoted before and after.
- **The complete artefact is on each page** — verified by fetching the live URL
  and quoting the full text, not by the writer asserting it. For a doa: the Arabic,
  the rumi and the Malay meaning all present in the fetched HTML.
- **Every target carries its SEO-12 gate result** — the `serp-overview` output
  recorded per target, showing no AI Overview at the time of selection.
- **Every religious text carries its authority and the date checked**, verified by
  `editorial-verification-lead`, recorded per item.
- **All copy passes `/humanizer`** before the write.
- **UNDO committed and pushed BEFORE any production write runs**, naming the exact
  slugs.
- Evidence in `docs/work-done/aug-30-2026-session-01/`, with live links.

#### What would falsify this bet

Recorded now so it can be scored honestly at Sprint 05 rather than explained
afterwards: **if the six articles reach positions comparable to our existing pages
(4–10) and still earn under 2% CTR, the document-intent theory is wrong** and the
problem is something about this site rather than something about query shape.
That is the outcome I would have to report as a failed bet.

**DoD (CONT-14):** the live page's `<h1>`, title and opening 200 words centre on
*what hantaran kahwin means and what it costs*, not on "20 Idea". Verified by
fetching the live URL past the 300s edge TTL (quote the **second** request) and
pasting both the before and after strings. UNDO committed and pushed **before**
the UPDATE runs.

### Track: PLATFORM

| ID | Pts | Owner | Item |
|---|---|---|---|
| **PLAT-13** | 2 | BMAD | **`watch-agent.sh` wakes on every `curl` line** via its `^HTTP/` milestone, and every DoD here demands curl verification. SEO-09 and RISK-08 each tripped it 3+ times on ordinary work, never once on a completion. Make it context-aware — **do not delete the pattern**, the self-test asserts `HTTP/2 200` and `HTTP/1.1 502` must still fire. |
| **PLAT-14** | 3 | BMAD | **Per-item state-transition log with a `waiting_on_ceo` state.** Filed at the owner's request after they asked why Sprint 03 took 25h 39m to do 6h 56m of work. We can see *when* work stopped and never *why*. |
| **PLAT-15** | 2 | BMAD | **`sprint-NN.json` and the tracker diverge, and the JSON is supposed to be the contract.** Found this meeting: `sprint-03.json` reads `state: in_progress` with 24 of 26 items `todo`, while the tracker reads `done`, 107/115. `/endsprint` writes a separate `-retro.json` and never reconciles the contract file. Same for sprints 01 and 02. |
| **PLAT-16** | 2 | BMAD | **Name collision:** `skillcentral/agents/Marketing/creative-director.md` (social video) and `…/projects/hellokahwin/Design/creative-director.md` (ours). Dispatching `creative-director` can resolve to the wrong persona. |

**DoD (PLAT-13):** `bash watch-agent.sh --self-test` exits 0, with the eight real
false-wake lines **plus at least three real `curl` output lines** in the
must-not-fire set, and the ten real outcomes still in the must-fire set. The
self-test is the deliverable; a fix without a failing-then-passing test is not
done.

**DoD (PLAT-15):** running `/endsprint` on a closed sprint leaves
`sprint-NN.json` with `state: "done"` and every item's state matching the tracker.
Demonstrated by **back-filling sprints 01–03** and showing a diff of
`sprint-03.json` before and after, plus a query proving the JSON now agrees with
the tracker item-for-item.

### Track: RIGHTS

| ID | Pts | Owner | Item |
|---|---|---|---|
| **RIGHTS-01** | 3 | BMAD | **Image credit labels are English and inconsistently cased on live Malay pages** — `Source:` 22, `source:` 6, `sOURCE:` 6, `SOURCE:` 6 on garden-wedding alone, plus ~9 uncredited of 49. Confirmed on 3 of 30 further articles sampled. |
| **RIGHTS-02** | 5 | BMAD | **⚠ RE-SCOPED BY OWNER DECISION, 30 Aug — this is no longer a clearance.** The owner will **obtain permission** for the `jangan-guna` assets rather than remove them ("photographers have good relationships with us"). The item's job is now to produce **the list that makes that possible**, plus correct attribution. |

**DoD (RIGHTS-01):** one Malay label, one casing, sitewide; `sOURCE:` returns zero
across all 86 article URLs. Verified by a **committed script** that sweeps the
sitemap and reports label variants — run it before and after and paste both
counts. Uncredited images are reported as a count with their slugs, and either
credited or listed for a decision; **they are not silently left out.**

**DoD (RIGHTS-02) — rewritten after the owner's decision:**

The deliverable is **a permissions worklist the owner can act on**, not a deletion.

- **A census across all 86 article URLs**, stating the real current count. The 307
  figure is stale and unverified — garden-wedding now shows zero, so the first
  honest output of this item is *how many there actually are*.
- **Grouped by photographer or source**, because that is the unit the owner
  negotiates in. A flat list of 300 filenames is not actionable; "these 40 images
  across 9 articles are from studio X" is.
- For each group: the source, the article URLs it appears on, the image count, and
  the live asset paths.
- **Delivered as a committed table** at
  `docs/work-done/aug-30-2026-session-01/…-jangan-guna-permissions-worklist.md`,
  and **opened for the owner** — this document exists to be taken to real people.
- **Nothing is deleted and nothing is contacted.** Approaching photographers is an
  outward-facing commitment in the company's name: carve-out 3, and the owner has
  explicitly taken it themselves.
- Attribution for these assets is handled under **RIGHTS-01**'s single Malay
  label, so that when permission lands the credit is already correct.

**⚠ Recorded so it is not lost:** until permission is actually obtained these
images remain live without documented rights. **The owner has made that call
explicitly and named the mitigation** — existing photographer relationships. It is
their decision to make and it is not re-litigated here; it is written down so a
later meeting can ask whether the permissions were in fact obtained, rather than
discovering the question was never tracked. **Follow-up owner: the CEO, at Sprint
05 planning.**

---

## 5. Deliberately out of scope

- **SEO-04 (venue entity pages) stays PARKED.** It parked twice at the same gate,
  and Sprint 03's retro found the real cause: `nikahsatu.com` is the venue
  **operator**, not a competitor we can out-build. **Do not revive it by changing
  the method a third time.** It comes back only when the *diagnosis* changes.
- **A sitewide title rewrite to stop giving the answer away.** Section 2.3 raises
  it; it is a hypothesis and SEO-11 is the test. Rewriting 86 titles on a theory
  is how we would spend a sprint proving nothing.
- **Chasing more `mas kahwin` state pages.** They rank. They do not convert, and
  §2.3 explains why structurally.
- **`dewan komuniti setiawangsa`** — remains closed, per decision 89.
- **RISK-02 password rotation** — parked, unchanged trigger: if the transcript is
  ever shared or exported.
- **hellokahwin PR #4** (preview banner) — stays open and owner-only; merging it
  deploys the live public site.
- **Building search.** DES-06 designed it in Sprint 03. The build is still
  unsized and deliberately not smuggled in here.

## 6. The cut list — RESOLVED: nothing is cut

**✅ OWNER DECISION, 30 Aug: keep everything. Scope stands at 43 points, 11 items.**
That is the **third consecutive sprint** in which the owner has taken the CEO's
proposed cuts back off the table (decisions 62, 93, and now this one). Three is a
pattern, and it is recorded as one in §9.

What was proposed and what happened to it:

- **PLAT-16 (2pt, name collision) — KEPT.** I withdrew this cut myself before the
  owner ruled. The workaround is "remember to always type the full path", and
  Sprint 03's central finding is that prose rules do not fire. Two points to make
  the trap structurally impossible beats a rule I have to remember.
- **RIGHTS-02 (5pt) — KEPT AND RE-SCOPED.** The owner will **obtain permission**
  for the `jangan-guna` assets rather than have us strip them: *"I will obtain
  permissions to use it, just take it, photographers have good relationships with
  us."* This is strictly better than deletion — it keeps images on pages that are
  ranking, and it uses an asset the company has that no amount of engineering
  substitutes for: existing relationships. **The item flips from removal to
  enumeration**, and its output becomes the per-photographer worklist the owner
  needs to make those approaches. See the rewritten DoD above.
- **RIGHTS-01 — never proposed for cutting.** An English typo rendering as
  `sOURCE:` on the page carrying 28% of site impressions is a brand defect on our
  most-seen asset.

## 7. Metrics and review

- **Primary:** clicks/28d — 99 today. The 22 Sept checkpoint is 150.
- **✅ OWNER DECISION, 30 Aug: THE CTR METRIC IS SPLIT.** From Sprint 04 on, board
  reports carry CTR **separately for document-intent and number/definition
  queries**. Sitewide CTR stops being a headline figure because it averages a
  9.52% query and a 0.64% query into one number that recommends nothing. Clicks/28d
  remains the north star. The split is populated by SEO-11's census, which is what
  makes the classification reproducible rather than my judgement call per query.
- **Prediction to score at Sprint 05 planning:** impressions keep climbing and
  sitewide CTR keeps falling, because the mas-kahwin cluster is still indexing
  out. Clicks reach 150–200/28d by 22 Sept on the existing document-intent pages
  alone. **If CTR rises without CONT-13 having shipped, my §2.3 mechanism is
  wrong** and I want that recorded now as the thing that would falsify it.

## 8. What I need from the owner — nothing further

Scope is set. **Nothing in this sprint falls into the four owner-only categories**
— no credentials, no money, no outward-facing commitment by us, no irreversible
destruction. Every item is internal, reversible, or additive, and I execute the
whole of it under standing autonomy.

**One thing the OWNER has taken on**, recorded so it is tracked rather than
assumed: obtaining permission from photographers for the `jangan-guna` assets.
RIGHTS-02 produces the worklist that makes it actionable; the approaches
themselves are theirs. **I will ask about it at Sprint 05 planning** — not to
chase, but because §3 of this document exists precisely because decision 50 was
assigned once and never audited.

## 9. A pattern in the owner's cuts, recorded for the CEO's own calibration

**Three consecutive sprints, the CEO has proposed cuts and the owner has declined
every one** — decision 62 (Sprint 02), decision 93 (Sprint 03), and this meeting.
Nine points offered for cutting across three sprints; nine points kept.

That is now enough of a sample to act on, and the correction runs in **two**
directions, not one:

1. **The CEO is systematically over-trimming.** The governance is explicit that a
   body-of-work sprint has no time pressure, so the usual reason to cut does not
   apply — and the CEO keeps proposing cuts as though it did. **Tidiness is not a
   reason.**
2. **But the flagging itself is working and must not stop.** Each time, the item
   the CEO wanted to cut was defensible and the owner's reasoning added something
   the CEO did not have — this meeting, an *asset the company owns* (photographer
   relationships) that turned a deletion into a licensing opportunity. **The CEO
   could not have reached that from the repo.**

**So: keep flagging what is weakest, stop framing it as a cut.** The section's job
is to show the owner where the CEO's confidence is lowest, so they can bring
information the CEO does not have. It is not a budget exercise.
