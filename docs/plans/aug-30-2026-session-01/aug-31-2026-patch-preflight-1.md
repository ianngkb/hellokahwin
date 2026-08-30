# PATCH — head-of-seo-content PRE-FLIGHT #1, replacement text

**Raised by:** SEO-11, 31 August 2026
**Target file:** `skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md`
in `~/Documents/Code/buddy`, then deployed to `.claude/agents/head-of-seo-content.md`
**Owner of the edit:** whoever holds the `buddy` checkout — **not SEO-11**

## Why this is a patch file and not an edit

The `buddy` tree had another agent writing in it throughout this sprint, and SEO-11
was instructed to write only in `~/Documents/Code/hellokahwin/hellokahwin`. One
writer per checkout: a commit there could relocate another agent's HEAD with no error
and no signal. So the text is written here and handed over.

The tree was dirty at every check, though the files changed between them —
`packages/db/src/index.ts`, `packages/db/src/repositories/sprint-cli.ts` and
`scripts/sprint.ts` at 00:50; `skillcentral/agents/projects/hellokahwin/Design/creative-director.md`
at 01:45; `skillcentral/agents/Marketing/` untracked throughout. **The durable fact
is the live writer, not the file list.**

## How to land it — all four steps, two of which fail silently

Correct → committed → **PUSHED** → **deployed**.

1. Apply the replacement text below to the target file named above.
2. Commit **and push**. `git status` reads clean while a commit sits unpushed; the
   count that shows it is `git rev-list --count @{u}..HEAD`.
3. Run **`skillcentral/install.sh`** from the buddy checkout. `.claude/agents/` holds
   a plain copy and is git-ignored, so neither `git status` nor the unpushed count
   will ever reveal that the deploy did not land.
4. Hand over the diff that proves it:

```
diff <(tr -d '\r' < skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md) \
     <(tr -d '\r' < <repo>/.claude/agents/head-of-seo-content.md)
```

The `tr` is not optional — without it CRLF makes every line read as changed and you
learn nothing. Grep the deployed file for the new rule rather than trusting a line
count.

**Verified 31 Aug 2026 01:45:** the buddy source and the deployed copy are currently
byte-identical, so step 3 is load-bearing. Editing the source alone changes nothing
that the next occupant of the seat loads.

## Why it must change

PRE-FLIGHT #1 tells the next occupant of this seat to reject a keyword target when
the SERP carries an AI Overview. It is built on three queries measured on 30 August
2026. SEO-11 measured 84, and the rule does not survive — **though not for the
reason a first reading of the census suggested.**

- **Intent class passes a position-matched test at p = 0.00002 (12.2x), and holds at
  p = 0.000003 to 0.000025 under three different re-cuts of the data.**
- **AI Overview presence does not settle in either direction.** The same test reads
  **p = 0.102** across all 30 band rows and **p = 0.0009** across the 23 rows whose
  SERP snapshot is from the measurement month. That subset is not neutral — it drops
  the two best-converting AI-Overview'd queries we own. At 14 clicks in the band the
  question is undecidable, and **15x is neither confirmed nor refuted.**
- **The feature does not sort the classes.** 94% of number-intent queries carry an AI
  Overview, and so do **79% of document-intent queries**. Sorting three queries on
  the feature also sorts them on intent; the feature alone separates nothing.
- Applied as written, the rule would kill **`idea goodies kahwin`**: AI Overview at
  position 1, 10.53% CTR at position 9.16, ratio 5.68, the **best-converting query on
  the site**. That query is cited *in decision 156* as a healthy-CTR counter-example;
  its SERP was never checked.

The prose reasoning in the current PRE-FLIGHT is correct and should survive. Only the
instrument changes: from "does the SERP carry an AI Overview" to "what kind of answer
does the query want", which is derivable from the query string, needs no API call,
and does not depend on Ahrefs having crawled anything.

Evidence: `docs/work-done/aug-30-2026-session-01/aug-31-2026-done-seo-11-serp-shape-census.md`
and `serp-shape-census.csv`.

---

## Replacement text

Replace the whole of PRE-FLIGHT #1 with:

---

> **PRE-FLIGHT #1 — CLASSIFY THE ANSWER THE QUERY WANTS BEFORE ACCEPTING ANY
> KEYWORD TARGET. A target that fails this gate is not selected, whatever its
> volume.**
>
> **Ask what the searcher leaves with.** If they leave with a **document** — a
> prayer text to recite, a checklist to work through, an item list, a lafaz, a
> procedure — the blue link survives. If they leave with a **number** or a
> **definition**, Google states it and the click is already gone.
>
> Measured across **84 ranking queries**, GSC 2026-08-01..28, positions 3–11 so
> depth cannot explain the gap (SEO-11, 31 Ogos 2026):
>
> | Intent | n | impressions | clicks | CTR | mean position |
> |---|---|---|---|---|---|
> | **document** | 16 | 220 | 10 | **4.55%** | 7.07 |
> | **number / definition** | 33 | 806 | 3 | **0.37%** | 7.64 |
>
> **12.2x, Fisher exact two-sided p = 0.00002.** The arms sit 0.57 places apart.
>
> **The threshold, in Ahrefs `volume`, country `my`:**
>
> - **number / definition — 2,700 monthly searches.** Below that it does not earn a
>   new page.
> - **document — 220 monthly searches.**
>
> Both derive from a bar of 10 clicks/month divided by the CTR each class actually
> achieved: 10/0.0455 = 220, 10/0.0037 = 2,700. The bar is 10 because the whole site
> earned 82 clicks in 28 days; a page that cannot add 10 does not repay an article.
>
> ⚠ **THE AI OVERVIEW IS NOT THE GATE, AND THE PREVIOUS VERSION OF THIS PRE-FLIGHT
> SAID IT WAS — but it is not the gate because it is UNMEASURABLE here, not because
> it is harmless.** On the same 84 queries at the same matched positions, AI Overview
> presence gives **p = 0.102** on all rows and **p = 0.0009** on rows with a current
> SERP snapshot; the subset that flips it drops the two best-converting
> AI-Overview'd queries we own. At 14 clicks the question does not resolve, and
> **15x is neither confirmed nor refuted.** Intent gives p = 0.000003–0.000025 under
> every one of those same treatments.
>
> **Gate on the variable that survives the re-cut. Record the AI Overview; do not
> select or reject on it.** Applied as a gate it would have killed
> `idea goodies kahwin` — AI Overview at position 1, **10.53% CTR**, the
> best-converting query the company owns. The reason the feature fails as a gate is
> that it does not sort the classes: **94% of number-intent queries carry an AI
> Overview and so do 79% of document-intent queries.**
>
> An effect the size the published literature reports (Ahrefs, Feb 2026, 300k
> keywords: ~58%, about 2.4x) is **below this census's resolution** either way.
>
> **Run `scripts/seo/serp-shape-census.py` rather than re-deriving this.** The
> `intent_class` column is the gate, and it is computed from the query string, so it
> costs nothing.
>
> Re-run the census at the end of Sprint 05 before treating 12x as a constant: the
> document arm rests on **11 clicks**, and the confidence intervals bound the true
> ratio only at **no less than 2.3x**.

---

## Also worth adding, in the measurement-rules section

> **`gsc-ctr-by-position` (Ahrefs) is not a CTR curve.** It returns an **unweighted
> mean of per-keyword CTRs**, so wherever samples are thin one keyword with 1
> impression and 1 click reads 100% and drags the mean up. On TheWeddingNotebook,
> 2026-08-01..28, it reads **17.0% at position 10, 26.2% at 15, 34.9% at 18** — CTR
> rising with depth. Plot any curve before you quote it; a curve that is not
> monotonic through the top ten is an artefact, not a finding.
>
> And **`gsc-keywords` caps at 250 rows** — `limit=10000` still returns 250 — so a
> curve hand-built from it is truncation-biased at depth, keeping only the
> highest-click keywords.

> **⚠ AHREFS SERP SNAPSHOTS GO STALE SILENTLY. READ `serp_update_date` ON EVERY
> ROW.** SEO-11's 49 crawled SERPs span **2023-08-09 to 2026-08-28** — 11 from July
> 2026 and one from **August 2023**, before AI Overviews existed. Nothing in the
> response marks an old snapshot; it is byte-identical in shape to a fresh one. It is
> not cosmetic: including or excluding the stale rows moved that census's headline
> p-value from **0.102 to 0.0009**.
>
> - A stale **`true`** on a SERP feature is reliable — a feature seen in July is very
>   likely still there.
> - A stale **`false` is NOT** — an absence may since have been filled. Treat it as
>   unknown.
> - **Report the crawl-date range you actually have, computed from the data, not a
>   remembered summary of it.**
>
> And the rule that generalises past Ahrefs: **at this company's click volumes a
> single p-value is not a result.** One subsetting decision moved p by two orders of
> magnitude on 14 clicks. Ship every finding with its value under at least two
> re-cuts of the data, or do not ship the finding.
