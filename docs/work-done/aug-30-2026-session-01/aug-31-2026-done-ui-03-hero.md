# UI-03: the homepage hero — and the finding that the slot had picked the only portrait photograph on the page — 31 Ogos 2026

**Session:** aug-30-2026-session-01 · **Owner:** creative-director · **Status:** completed
**Plan:** `docs/plans/aug-30-2026-session-01/aug-31-2026-brief-ui-03.md`
**Spec produced:** `docs/design/hero-image-rules.md` (binding; UI-05 inherits it)

## What was done

The brief asked for three numbers on the homepage hero: rendered aspect within
15% of source, upscale ≤1.1×, and a served variant that is not `low`. All three
are met. But the item is not really about those three numbers, and the honest
account puts the finding first.

### The finding: the hero slot had picked the only portrait photograph on the page

`computeCropWindow` is **width-constrained on a portrait source**. A 3.52:1 hero
window on a 2:3 portrait keeps `(w / 3.52) / h` = **18.9% of the source height**.
A landscape crop of a portrait photograph is not a landscape photograph; it is a
band.

Measured on all 13 homepage covers, source aspect read from each `low.webp`
(which preserves it):

| Covers displayed | `low.webp` dimensions | Aspect | Orientation | Height kept at 3.52:1 |
|---|---|---|---|---|
| **12 of 13** | 1200 × 800 | 1.500 | LANDSCAPE | **42.6%** |
| **1 of 13** | 1200 × 1800 | 0.667 | PORTRAIT | **18.9%** |

**The one portrait was the one in the hero.** Selection ordered by `publishedAt
desc` with no orientation predicate, so it won the largest slot on the site by
recency accident.

**Three scope precisions, because "the only portrait" is true of one set and
false of two others**, and the loose phrasing reached my PR description:

- **13 displayed covers: 1 portrait.** The row above. This is the set the
  homepage renders.
- **20-article selection buffer: 2 portraits** — `tempat-beli-hantaran` and
  `hantaran-tempah-atau-buat-sendiri`. This is the set `heroIndex` actually
  scans, so it is the one that matters for the rule. Both are now ineligible.
- **86-article corpus: 12 disqualified** (0.667 ×6, 0.750 ×4, 0.748, 0.753).

The dimensions above are the **`low.webp` derivative's**, which is what I
surveyed. `media.width`/`height` hold the **original upload** dimensions
(3888×2592, 4000×6000, …) and so will not match this table numerically. The
*aspect ratios* are identical, which is why the two measurements agree on every
verdict — but they are different numbers of different things and the column is
now labelled as such.

This was found by *looking at the photographs*, not by reading their metadata.
Every automated number said the 3.52:1 crop was correct — right aspect, no
upscale, not `low`. Opening it showed an extreme macro of artificial flowers
that does not depict its subject, *"Tempat beli barang hantaran: lima jenis
kedai"*. **Fixing only the crop would have shipped a sharp, correctly-
proportioned photograph of nothing, and every check in this item would have gone
green.**

### The mechanical cause, which is also real

`srcset`/`sizes` chooses a **size**. It had been used to choose a **crop**. A
0.667 portrait and a 3.520 landscape were declared interchangeable width
candidates in one `srcset`, so which photograph a reader saw was decided by
their hardware. Measured on the same page at the same moment:

| Viewport | Variant chosen | Asset aspect | Box aspect |
|---|---|---|---|
| 1920 × 900 @1 | `low.webp` | 0.667 | 2.40 |
| 768 × 1024 @2 | `crop-4.3x1-desktop-hero.webp` | 3.520 | 1.778 |
| 390 × 844 @2 | `low.webp` | 0.667 | 1.333 |

### What shipped

- **R8(c) — hero eligibility now tests the source photograph's RETAINED FRAME**
  — `sourceAspect / HERO_ASPECT >= 0.33`, derived from the plate's own aspect
  rather than hardcoded, so widening the plate re-derives the threshold instead
  of silently invalidating it. Rides the `media` leftJoin the credit already
  needed, so no new query. Unknown dimensions count as ineligible.
- **`<picture>` with one crop per band**, box aspect derived from the asset:
  `40/21` (1.905) below 1024px from `crop-16x9-og`; `88/25` (3.520) at and above
  from `crop-4.3x1-desktop-hero`. Aspect deviation 0.0%, not merely within 15%.
- True `w` descriptors (the hero crop was declared `1600w`; the delivered files
  are ~2463–2464w, since `fit:'inside'` rounds against each source) and true
  `width`/`height` (were `1200×500`, describing neither asset).
- `scripts/measure-hero.mjs`, the rig that asserts all of it, committed.
- A stale comment in `smart-crop.ts` corrected — the geometry deliberately not
  touched, because changing `CROP_TARGETS` changes `GEOMETRY_VERSION` and
  re-queues every live cover through Rekognition + R2, which is unauthorised
  AWS spend.

### The brief's GATE — it half-fired, and that is on the record

- **Existence: PASSES.** Both hero crops exist for **13 of 13** covers (HTTP HEAD).
- **Suitability for the featured article: FAILS.** Its source is portrait; the
  best asset for it keeps 18.9% of the frame.

Not treated as a STOP, because the gate exists to prevent *"shipping a different
bad crop"* and what shipped is a **selection rule**, not a hand-picked
photograph — which is the gate's own second sentence: *a pipeline finding worth
more than a swapped photo*. Flagged rather than hidden: if the CEO reads the
gate more strictly, the evidence to re-scope is in §2 of the spec.

## Ship state

**Commit:** `61a505f` Merge pull request #17 — nine commits on `ianng89/ui03-hero`:
`ddf2cfb` the `<picture>` art direction · `4e8e395` R8(c) · `41c018e` + `9c42052`
the derived threshold · `6eb02d6` merge of master (UI-01, UI-02, RIGHTS-01) ·
`9a55381` the spec · `7a67280` evidence · `43d7e5d` + `11b56bf` + `41b522f` the
evidence-removal misstep, its revert, and the scoped redo.
**On `origin/master`:** **yes** — `61a505f`
**Deployed:** **`6169742100`, Production, state `success`** — live at
https://hellokahwin.com/ and measured there.
**Still uncommitted in the tree:** none in `src/`, `scripts/`, `package.json`.
Verified with `git status --porcelain -- src/ scripts/ package.json` (empty) and
`git log --oneline origin/master..HEAD` (empty). The six untracked
`.claude/agents/*.md` files pre-date this session and belong to the sprint's
agent setup, not to this item.

**Where the code is:** site repo, `master`. **Where the docs are:** this repo
(`feat/command-centre-dashboard`). `docs/design/hero-image-rules.md` is
deliberately in the **site** repo, because `src/app/(public)/page.tsx` cites it
by path and it has to resolve from the code.

## Evidence

**Instrument:** `scripts/measure-hero.mjs` — reports per viewport: box, box
aspect, served variant, **true** intrinsic size, asset aspect, deviation %,
upscale, visible fraction, plate % of viewport, and whether the `h1` is in the
first screen.

**BEFORE — live production, 31 Ogos 2026:**

| view | box | boxAR | variant | intrinsic | assetAR | devi% | upscale | vis% | plate% | h1 1st screen |
|---|---|---|---|---|---|---|---|---|---|---|
| desktop-1920 | 1920×800 | 2.40 | `low.webp` | 1200×1800 | 0.667 | **260** | **1.60×** | 27.8 | 88.9 | **NO** |
| desktop-1440 | 1440×600 | 2.40 | `low.webp` | 1200×1800 | 0.667 | **260** | **1.20×** | 27.8 | 66.7 | yes |
| desktop-1280 | 1280×533 | 2.40 | `low.webp` | 1200×1800 | 0.667 | **260** | 1.067× | 27.8 | 66.7 | yes |
| tablet-768 | 768×432 | 1.778 | `crop-4.3x1-desktop-hero.webp` | 2464×700 | 3.520 | **49.5** | 0.312× | 50.5 | 42.2 | yes |
| mobile-390 | 390×292 | 1.333 | `low.webp` | 1200×1800 | 0.667 | **100** | 0.325× | 50.0 | 34.7 | yes |

**AFTER — LIVE PRODUCTION, deployment `6169742100`, master `61a505f`,
31 Ogos 2026.** Not a preview, not a local build. Reproduce with
`pnpm perf:hero https://hellokahwin.com/`:

| view | box | boxAR | variant | intrinsic | assetAR | devi% | upscale | vis% | plate% | h1 1st screen |
|---|---|---|---|---|---|---|---|---|---|---|
| desktop-1920 | 1920×545 | 3.52 | `crop-4.3x1-desktop-hero.webp` | 2463×700 | 3.519 | **0** | **0.78×** | **100** | 60.6 | **yes** |
| desktop-1440 | 1440×409 | 3.52 | `crop-4.3x1-desktop-hero.webp` | 2463×700 | 3.519 | **0** | 0.585× | **100** | 45.5 | yes |
| desktop-1280 | 1280×364 | 3.52 | `crop-4.3x1-desktop-hero.webp` | 2463×700 | 3.519 | **0.1** | 0.52× | 99.9 | 45.5 | yes |
| tablet-768 | 768×403 | 1.905 | `crop-16x9-og.webp` | 1200×630 | 1.905 | **0** | 0.64× | **100** | 39.4 | yes |
| mobile-390 | 390×205 | 1.904 | `crop-16x9-og.webp` | 1200×630 | 1.905 | **0** | 0.325× | **100** | 24.3 | yes |

**All five viewports pass all four conditions.** The DoD asked for three; the
fourth (`h1` on the first screen) is the audit's actual complaint made testable.

**The three DoD numbers, before → after, at the worst viewport:**

| Condition | Required | Before (1920×900) | After | |
|---|---|---|---|---|
| rendered aspect vs source | within 15% | **260%** | **0.0%** | ✅ |
| upscale factor | ≤ 1.1× | **1.60×** | **0.78×** | ✅ |
| served variant | not `low` | **`low.webp`** | `crop-4.3x1-desktop-hero.webp` | ✅ |

**And the number nobody asked for, which is the real one:** the fraction of the
photograph a reader can actually see went **27.8% → 100%**, at every viewport.
Nothing is cropped away any more, because the box is the asset's own shape.

**Hero on production is now `adat-hantaran-ikut-keluarga`** — a 1.500 landscape
source — where it was `tempat-beli-hantaran`, the corpus's only portrait.

**UI-01's independent gate, re-run against live production after my deploy:**

```
LAYOUT : PASS   CONTENT: PASS   CONTROL: PASS   RIG: PASS   GATE: PASS
```

Run with *their* instrument, not mine, because my R8(c) moves a different
article to rank 01 and that interaction is theirs to detect.

**Screenshots:** `aug-31-2026-ui-03-EVIDENCE/` — `before-production-*` captured
before any fix shipped; `after-*` alongside them.

**Asset inventory, all 13 covers, measured not assumed:**

| Crop | Intrinsic | Bytes across 13 covers |
|---|---|---|
| `crop-4.3x1-desktop-hero` | 2464 × 700 | 535–916 KB (median ~624) |
| `crop-4x3-article-card` | 1600 × 1200 | ~488 KB |
| `crop-16x9-og` | 1200 × 630 | 278–425 KB (median ~318) |

**R8(c) verified against the production database, not against the buffer.** A
rule keyed on data has to be checked against the data, so this is the whole
corpus:

```
published articles                              86
articles with NO joining media row               0
articles with NULL media.width/height           26   <- ranks 58–86 by recency
source aspect >= 1.16 (hero-eligible)           48
disqualified as portrait/near-portrait          12   (0.667 ×6, 0.750 ×4, 0.748, 0.753)

within the 20-article buffer getHomeData fetches:  0 nulls, 18 of 20 eligible
```

**26 of 86 covers have no recorded dimensions**, and `null → ineligible` means
those 26 can never hold the hero. That is safe today only because all 26 sit in
the oldest tail, which a buffer of 20 never reaches — a fact about the data, not
a property of the rule. Recorded so that deepening the buffer past ~57 is
understood to require a `media.width`/`height` backfill rather than a loosened
rule.

Top of the buffer, which decides today's hero:

```
1. persiapan-hantaran-kahwin      3888×2592  1.500  42.6%  <- skipped: HERO_INELIGIBLE_SLUGS
2. tempat-beli-hantaran           4000×6000  0.667  18.9%  <- skipped: R8(c). The current hero.
3. adat-hantaran-ikut-keluarga    3888×2592  1.500  42.6%  <- becomes the hero
```

**What actually moved in the Terkini list — measured on production either side of
the deploy, because I predicted this wrong twice.** I told UI-01, twice, that
`tempat-beli-hantaran` would become their **row 1**. It did not. Row 1 never
changed:

| Row | Before | After |
|---|---|---|
| **1** | `persiapan-hantaran-kahwin` | `persiapan-hantaran-kahwin` — **unchanged** |
| **2** | `adat-hantaran-ikut-keluarga` | `tempat-beli-hantaran` |
| 3–12 | *identical* | *identical* |

It is a straight **swap at row 2**: the article promoted to hero leaves the list,
the one demoted from hero takes its place. `persiapan-hantaran-kahwin` is index 0
by `publishedAt desc` and was already excluded from the hero by gate (a)
(`HERO_INELIGIBLE_SLUGS`), so it was row 1 before and stays row 1 after.

I reasoned from "the demoted article is the newest, so it goes to the top"
without checking that something newer was already sitting there — having *read
that exact ordering off production earlier in the item*. The Design Systems
Engineer caught it from the rendered page.

Note 4:3 sources (10 articles, 1.333) retain 37.9% and pass — the rule is not
merely a 3:2 filter, and nothing in the corpus is near the 1.16 boundary.

**⚠ RETRACTED IN FULL — the connection claim was false, and I made the same
error twice.**

I wrote that the worktree's `DATABASE_URL` on the Supabase **transaction pooler,
port 6543**, "dead-ends from this machine", and that the session pooler on 5432
was needed instead. **Both halves of that were asserted, not tested.** I reached
for a remembered note, found that 5432 worked, and never tried 6543 at all.
Tested afterwards, side by side, same host, same credentials:

```
PORT 6543 WORKS: 86 published
PORT 5432 WORKS: 86 published
```

**6543 works.** The Design Systems Engineer ran the entire build, `next start`,
29 static page renders and two probe scripts through 6543 unchanged, and said so;
that is what prompted the test.

This was the **second** time in one item I diagnosed a cause I had not observed.
The first: I told UI-01 the pooler port explained their local homepage 500. It
did not — theirs was `ECONNREFUSED 127.0.0.1:5433`, a stopped local WSL cluster,
fixed with `pg_ctlcluster 16 main start`. I then compounded it by *reasserting*
the pooler claim as established fact while conceding the UI-01 half.

Both are the same failure and it is the one this sprint's brief names first:
**a confident claim about an absence, from a plausible mechanism, without
running the check.** I applied that discipline rigorously to image data all
afternoon and not once to my own environment. The tell was available and I
ignored it — I had proof 5432 worked and *no* observation of 6543 whatsoever,
which is not evidence of a comparison, it is a sample of one.

Corrected in the two messages that carried it (UI-01, and the DSE brief).

**And a second correction from UI-01, which I accept:** to take the AFTER
measurement I ran a local production build against the **production** database.
Every query I issued was a read, but that is not the point — *read-only is a
property of every code path that might run, not of the connection*, and a server
runs many. The local cluster was the right target; it only needed waking. Not
repeated.

**Reproduce the source-orientation finding:**
```
curl -s https://hellokahwin.com/ | grep -o 'src="https://images.hellokahwin.com/[^"]*low.webp"' \
  | sed 's/src="//;s/low.webp"//' | sort -u   # 13 cover directories
# fetch each low.webp and read its intrinsic size; low preserves SOURCE aspect
```

## What it changed

- The largest element on the site stops being a 1.6× upscaled, 72%-discarded
  centre-crop of a portrait photograph, and the homepage `h1` returns to the
  first screen at 1920×900 (it was at y=1024 in a 900px viewport).
- Which photograph a reader sees stops depending on their device pixel ratio.
- A portrait cover can no longer reach a landscape hero slot, ever, by rule
  rather than by curation.
- **The cost, stated: mobile's LCP image goes 54 KB → ~425 KB, about +371 KB.**
  That contradicts UX-01's measured decision to take 542 KB off the mobile LCP
  image. It is accepted because the DoD forbids `low` and `crop-16x9-og` is the
  lightest aspect-correct asset that exists — there is no third option. The
  535–916 KB desktop asset sits behind `<source media="(min-width: 1024px)">`,
  so no phone fetches it.

## Follow-ups

1. **The pipeline's missing cell — owner decision, AWS cost.** `low`/`high`/
   `original` are quality-graded but follow the SOURCE aspect. The smart crops
   are aspect-correct but exist at exactly one quality: full. **There is no
   aspect-correct, quality-reduced derivative in the pipeline at all.** DES-08
   hit this and chose bytes over shape — which is how a portrait ended up in a
   landscape box; UI-03 chose shape and paid +371 KB. Neither is right. Request:
   a **q30–q50 `crop-16x9-og`** (~80–120 KB, vs `low`'s 54 KB and correctly
   shaped). Secondarily `crop-40x21-hero-sm` at 1170×614. Both change
   `GEOMETRY_VERSION` and re-queue every live cover through Rekognition + R2 —
   **owner's call, not mine.**
2. **The article page carries the same defect. Not fixed here; handed to UI-05,
   which correctly declined to absorb it and is routing it to the CEO as a new
   item.** Measured 31 Ogos on `/artikel/idea-dan-nasihat/garden-wedding` at
   1920×900: box 768×320 (AR 2.400), served `low.webp`, intrinsic 1024×683 (AR
   1.499) — **60.1% aspect deviation**, and `width`/`height` attributes of
   `1200×500` describing neither. Site: `src/app/(public)/artikel/[category]/[slug]/page.tsx:1036`.
3. **`HERO_INELIGIBLE_SLUGS` is now partly redundant** and should be revisited.
   It hand-names one class-G cover; R8(c) disqualifies portrait sources by rule.
   The remaining need — "wide documentary frame, too distant to enlarge" — is a
   *content* judgement orientation cannot express, so the list stays for now.

## Retrospective

### 1. What did we learn that is not written down?

**(a) A crop can satisfy every geometric test and depict nothing.** The retained
fraction of a photograph under a crop is `sourceAspect / targetAspect` whenever
the source is narrower than the target — `computeCropWindow` takes the
width-constrained branch. A 3.52:1 hero window keeps 42.6% of a 3:2 landscape
and **18.9%** of a 2:3 portrait. Aspect-deviation and upscale checks measure the
*frame* and are silent about what is *inside* it, which makes them actively
reassuring on exactly this failure.

**(b) `img.naturalWidth` lies on any `srcset` image.** It returns intrinsic width
÷ the density the browser derived from `sizes`. Measured: `naturalWidth: 390` at
a 390px viewport on a genuinely 1200px asset. **Any upscale check written as
`box.width / img.naturalWidth` returns ≈1.0 by construction and can never fire.**
It read correctly at 1920px purely by coincidence (`sizes` said `1200px` and the
candidate was `1200w`, density 1.0) — so a gate tested only at desktop looks like
it works and is blind everywhere else.

**(c) The pipeline has an empty cell nobody had named.** `low`/`high`/`original`
are quality-graded but follow the SOURCE aspect; the smart crops are
aspect-correct but exist at exactly one quality. There is no aspect-correct,
quality-reduced derivative at all. DES-08 met this same matrix, chose bytes over
shape, and that is how a portrait ended up in a landscape box.

**(d) I applied the sprint's own discipline to data and not once to myself.**
Three times in this item I stated a cause or a consequence I had not observed,
each from a mechanism that was real but not present:

| Claim | Reality | Caught by |
|---|---|---|
| "6543 dead-ends from this machine" | **6543 works.** I proved 5432 worked and never tried 6543 | DSE, then a test I should have run first |
| "the pooler port is UI-01's 500" | Theirs was a stopped WSL cluster on 5433 | UI-01 |
| "`tempat-beli-hantaran` becomes row 1" | Row 1 never changed; it is a **row-2 swap** | DSE, from the rendered page |

All three are one failure: **a plausible mechanism substituted for a
measurement.** And it is worse than an ordinary guess, because a *wrong* guess
that sounds wrong gets challenged, while a wrong guess that sounds right gets
adopted — I passed the first two on to two other agents as established fact, and
the third I asserted after having read the true ordering off production earlier
in this very item.

The asymmetry is the finding. I spent the afternoon refusing to accept `grep -c`,
`img.naturalWidth`, a 20-of-20 sample, or a 200 status code — and accepted my own
recollection about a port without a single command. **Rigour applied only to the
artefact under test, never to the claims made around it, is rigour with a hole in
it exactly where the reports go.**

**Now doctrine §5.10, "Nothing here measures the REPORT, and the report is what
the owner reads"** — written jointly with UI-01, whose closing observation names
it and whose framing (*a wrong guess that sounds wrong gets challenged; a wrong
guess that sounds right gets adopted*) is the reason it is hard to catch. It
carries the receiving half of the rule too, which is theirs: **when a teammate
hands you a fact with numbers attached, the numbers are evidence for THEIR claim,
not for the inference you build on it.** UI-01 logged their own half — they
adopted two of my three and repeated one to the owner — in their `(d)`.

**Form:** this cannot be a script, and per the brief's instruction I should say
so rather than pretend. The nearest mechanism is a habit with a trigger:
**before a causal claim leaves this session — into a message, a commit, or a
report — either run the command that establishes it, or write the word
"unverified" next to it.** Filed against the persona, which already says "when
you assert something about the live site, verify it yourself" — a rule I had,
and applied to the site, and not to anything else I said.

**(h) An anchored find-and-replace silently eats its anchor. §5.10 deleted a
heading — and it is the section arguing that nothing measures the write-up.**

Inserting §5.10 by replacing the `## 6. What this doctrine asks for` heading, I
appended the new section and **failed to re-emit the anchor**. The doctrine ran
5.10 → "## Data provenance", with section 6's four open decisions — the writer
hires, the pillar pages, the venue directory, the redirect chain — orphaned
inside §5.10, so "Nothing new. It asks for the same four decisions already open"
read as a statement about §5.10. UI-01 caught it, restored it in `8a1ca60`, and
confirmed from `git show 01c70a2` that the deletion was mine and not theirs.

**I used that identical anchor twice and got it right the first time.** The §5.8
insertion re-emitted `## 6.` correctly; the §5.10 insertion did not. So this is
not a misunderstanding of the tool — it is an inconsistency, which is worse,
because there is no knowledge to acquire that would prevent it.

**Form — and unlike (d), this one CAN be a check.** A commit that is supposed to
be purely additive should delete no headings:

```
git show <sha> -- <file> | grep -c '^-##* '   # identical in BRE, ERE and rg
```

Run against the two commits that used the same anchor: **`0f59dc7` → 0,
`01c70a2` → 1.** Worth a `pre-commit` line for `docs/plans/**` the next time
anyone is in `scripts/git-hooks/` — the same place RISK-09's uninstalled guard
lives, so two things now wait on that one install.

⚠ **I first wrote this as `'^-## '`, and UI-01 found the hole before anyone
installed it. That narrow form has the exact failure shape this entire sprint is
about.** After the `-` it demands `#`, `#`, space — so a deleted `-### 5.9 …` has
`#` in the third position and never matches. Proven on known input rather than
argued:

```
$ printf -- '-### 5.9 heading
-## 6. Something
-#### deep
' | grep -c '^-## '
1        <- only the ## one
$ printf -- '-### 5.9 heading
-## 6. Something
-#### deep
' | grep -c '^-#\+ '
3        <- all three
```

**And that is the gap that matters for this very file: §5.8, §5.9 and §5.10 are
all `###`** (lines 905, 973, 1006). My check caught the one heading I happened to
delete and would have been blind to all three sections this sprint added —
including the two carrying the joint lessons. **A check that passes its own test
and is blind where it matters is the defect this sprint exists to stop, and I
shipped one while writing the lesson about it.** I proved the regex on the line I
knew had failed and never on a line I knew should match — which is the brief's
own rule, quoted by me to UI-01 hours earlier.

Verdicts are unchanged under the corrected regex (`01c70a2` → 1, everything else
0), so no finding moves; the hole was closed before the hook shipped, not after.

⚠ **The regex DIALECT trap, which UI-01 flagged and which is worse than the
`###` hole because it reports a pass.** `\+` is one-or-more in BRE and a
*literal plus* in ERE, so the same pattern string silently matches nothing in the
other engine — and a hook that matches nothing prints clean on every commit
forever:

```
printf -- '-### h
' | grep -c  '^-#\+ '   -> 1   correct   (BRE)
printf -- '-### h
' | grep -Ec '^-#\+ '   -> 0   SILENT FAILURE (ERE)
printf -- '-### h
' | grep -Ec '^-#+ '    -> 1   correct   (ERE)
printf -- '-### h
' | grep -c  '^-#+ '    -> 0   SILENT FAILURE (BRE)
```

`grep -E` and `rg` are the likely reflex for anyone writing this fresh, so the
trap is not hypothetical. **This is §5.10 one level down: the instrument's own
output becomes a claim nobody measured, and the failure is indistinguishable from
success.**

**So do not document the trap — remove it.** `##*` is one-or-more `#` in *every*
dialect, because `*` means the same thing in all of them. Verified on a
six-line sample containing four heading-shaped deletions and one `+## added`
that must not count:

| pattern | BRE | ERE | rg |
|---|---|---|---|
| `^-#\+ ` | 4 | **0** | — |
| `^-#+ ` | **0** | 4 | — |
| **`^-##* `** | **4** | **4** | **4** |

Verdicts against the real commits are unchanged under the dialect-proof form
(`01c70a2` → 1, all others 0, in both engines). **A check whose correctness
depends on which engine runs it is not a check.**

**A non-zero result is a FLAG, not a verdict** (UI-01's note, and it is
necessary rather than merely nice). A legitimate rename or removal trips it, and
so does a deleted shell comment inside a fenced code block — `-# foo` matches too,
verified. So the hook must say *"you deleted N heading-shaped lines, confirm that
was deliberate"* and never refuse. A gate that blocks legitimate work teaches
everyone to reach for `--no-verify`, and then it protects nothing.

**Why it belongs in this entry and not in the doctrine:** UI-01's judgement, and
it is right — §5.10 does not need a monument to its own first casualty. But the
irony is exactly on point and I am not going to lose it: **the section arguing
that every instrument we own points at the artefact and none at the write-up
damaged the artefact it was added to.** Nothing in either repo checks heading
levels, and the loss is invisible in a rendered view. It was found only because
UI-01 read the section end to end before citing it — the same reflex that
produced their row-1/row-2 capture an hour earlier, paying twice in one
afternoon.

**(e) Enumerate a destructive command's blast radius BEFORE running it.**
Cleaning 4.6 MB of evidence PNGs out of the site repo I ran
`git rm -r --cached docs/work-done`, which took the **whole tree — 339 files,
102,257 deletions**, including every pre-existing work-done entry tracked on
master. I caught it only because I read the `--stat` output instead of trusting
that the command had done what I meant. Reverted, then redone against a path I
first enumerated with `git ls-files`: exactly 4 files to remove, 333 that had to
survive. Both commits (`43d7e5d`, `11b56bf`, `41b522f`) are on the branch
deliberately.

This is the sprint's own "enumerate what is there rather than testing for what
you assume" applied to git rather than to grep — and it is the more dangerous
direction, because grep returning the wrong answer costs a wrong belief while
`git rm` returning the wrong answer costs the repository.

**(f) A guard that is built but not installed is indistinguishable from no
guard.** The only reason either the original mis-commit or my bad fix was
reachable is that **RISK-09's docs/site boundary guard is built, tested 22/22,
and NOT INSTALLED** — its own work-done entry says `partial — INSTALL PENDING
the CEO's green-light`. It would have blocked both. This is the sprint's central
finding ("prose does not fire, gates do") with one more turn on it: *a gate that
is not installed does not fire either*.

**(g) Values derived by POSITION rather than by IDENTITY.** *(Framing owed to
UI-01, who named it across both items.)* Their bug: CSS Grid auto-placed the
headline into the rank-number track because no child *claimed* it. Ours:
`filter((_, i) => i !== heroIndex)` matched by index, so once the eligibility
predicate could shift which index the hero occupied, a no-eligible-hero page
would render the lead article **twice** — once as the plate, once as row 1.
Third instance this sprint. Both silent: nothing throws, nothing fails a
structural diff, the page renders.

### 2. Which document must change, and who owns the edit? — **DONE, not proposed**

| Lesson | Form it took | File | Owner | State |
|---|---|---|---|---|
| (a) | **Doctrine section** — §5.8 "The rendered-image audit" | `docs/plans/aug-23-2026-session-01/aug-23-2026-production-doctrine.md` | creative-director | ✅ **edited** |
| (a) | **Persona hard rule** — hard rule 1 extended: compute retained fraction, then open the image | `skillcentral/agents/projects/hellokahwin/Design/creative-director.md` | creative-director | ✅ **edited** |
| (a) | **Code rule** — R8(c), threshold derived from `HERO_ASPECT`, not hardcoded | `src/app/(public)/page.tsx` | design-systems-engineer | ✅ **shipped** |
| (a)(b) | **Script** — the rig that asserts all of it | `scripts/measure-hero.mjs` | design-systems-engineer | ✅ **committed** |
| (b) | **Message to the gate's owner** | UI-06 (`ui06-layout-gate-3f`) | creative-director | ✅ **sent** |
| (a)–(c) | **Binding spec** — inherited by UI-05 rather than re-decided | `docs/design/hero-image-rules.md` | creative-director | ✅ **created** |
| (c) | **Costed pipeline request** — owner decision, AWS spend | spec §5 + Follow-up 1 | ceo-hellokahwin | ⏳ **raised** |
| (e) | **Install the guard that already exists** — the single highest-leverage action available from this item | `aug-31-2026-done-risk-09-boundary-guard.md` → `scripts/git-hooks/install-hooks.sh` | ceo-hellokahwin (green-light) → design-systems-engineer | ⏳ **raised, and it is a decision not a build** |
| (h) | **A runnable check** — `git show <sha> -- <file> \| grep -c '^-##* '` should be 0 on an additive commit, reported as a FLAG not a refusal; proposed as a `pre-commit` line for `docs/plans/**` | `scripts/git-hooks/` (site repo) | design-systems-engineer | ⏳ **proposed; first draft used `'^-## '` and was blind to `###` — hole found by UI-01 and closed before shipping** |
| (f) | **Doctrine §5.8 closing paragraph** — address by identity, never by position | `docs/plans/aug-23-2026-session-01/aug-23-2026-production-doctrine.md` | creative-director | ✅ **edited** |

**Deliberately NOT prose.** Sprint 03's central finding is that prose rules do
not fire. Of the four lessons, three took the form of a script, a code rule or a
gate; only the doctrine and persona entries are prose, and both exist to make a
future *person* look, which no script can do.

### 3. What did we do twice that we should never repeat?

**Sampled the broken case and generalised from it.** The spec's first draft
priced the fix at "+170 KB" from 224 KB / 425 KB figures — both measured on the
*portrait* hero, whose small files were a **symptom** of the defect (a blurry
19% sliver compresses well). Measuring all 13 covers gave 278–425 KB and
535–916 KB, and the real mobile cost is **+371 KB**. The outlier was the one
thing in the set guaranteed to be unrepresentative, and it is what got measured
first because it was the thing on screen. Same shape as the sprint brief's own
`Kredit` example: **enumerate the set, never characterise it from the instance
in front of you.**

**Two items now hitting the shape-vs-bytes matrix without either recording it.**
DES-08 resolved it one way, UI-03 the other, neither wrote down that a choice
was being forced. §3 of the spec exists so the third item does not re-run it.

### 4. What did we nearly ship, and what caught it?

**A sharp, correctly-proportioned, byte-efficient photograph of nothing.** It
passed all three DoD conditions — 0.0% aspect deviation, 0.78× downscale, not
`low`. **What caught it was opening the `.webp` file and looking at it**, after
the numbers were already green. Nothing mechanical would have. The mechanism now
exists (R8(c) + §5.8), but it was written *after* a human looked, which is
precisely what 5.7 said last sprint and what §5 of the UI audit calls "not a
mechanism."

**Also caught: an acceptance threshold I invented that the correct design failed
by 0.6pp.** My R7 set a 60%-of-viewport ceiling on the hero plate; the shipped
design lands at 60.6% while putting the headline back on the first screen —
which is the thing the 60% was a *proxy for*. Two bad exits were available:
shave the design to fit a number with no reasoning behind it, or quietly restate
the number afterwards. **The second is exactly what persona hard rule 7 forbids**
("do not narrow a specification after the fact to match what got built"), and it
would have been invisible in the diff. R7 was rewritten to gate on the literal
test — `h1.top < innerHeight` — with plate percentage demoted to a reported
diagnostic. **A spec may bend to reality when the reality is right and the spec
was wrong, but never silently, and never in the direction of the thing already
built.**

**And a latent bug found while implementing, not by a test:** the
`heroIndex === -1` duplicate render (§1(d)). It does not trigger on today's data,
so no screenshot and no structural diff on this corpus would ever have shown it.
