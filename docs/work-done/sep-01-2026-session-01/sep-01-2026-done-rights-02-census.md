# RIGHTS-02 — the live image census, grouped by photographer or source

**Owner:** managing-editor · **Sprint 05** · **Date:** 01 September 2026
**Branch:** `ianng89/rights02-census` · **Deliverable:**
`docs/plans/sep-01-2026-session-01/sep-01-2026-rights-census-by-source.md`
**Nobody was contacted. Nothing was deleted.**

---

## What the DoD asked for, and where each clause landed

| DoD clause | Where it is |
|---|---|
| Census across all live article URLs | §1 of the census. 86 URLs from the sitemap, all fetched, all 200, all carrying one `<h1>` |
| Grouped by photographer or source | §3 and §4.2. 147 groups |
| Per-group count and the article slugs it appears on | Every group row carries both |
| Rights state per group: covered / institutional / unknown-and-named | §2 defines them, §3–§5 assign them |
| Count re-derived at run time, not taken from 281 or 307 | §1. **808**, and §1 explains what 281 and 307 actually counted |
| Unknown listed WITH SLUGS, never assumed covered | §4, all of it. 207 assets, 93 groups, 14 articles, every slug printed |
| Committed as a file a stranger can act on | Committed, with a re-run command in the header |
| Index row in `docs/plans/README.md` | Added |

---

## The numbers, and how they were got

Measured 01 September 2026 by `scripts/measure/rights-census.py`, which is
committed and takes one command to re-run.

| | |
|---|---|
| Live article URLs in the sitemap | 86 |
| Distinct image assets on them | **808** |
| Placements (asset × article) | 815 |
| Source groups | 147 |
| Covered by the owner's photographer permissions | 383 assets, 10 studios, 14 articles |
| Licensed in its own right (CC / Pexels / public domain) | 216 assets, 40 groups |
| Institutional (RIGHTS-03's two) | 2 |
| **Unknown, and named** | **207 assets, 93 groups, 14 articles** |

**Why 808 and not 281 or 307.** Neither figure was ever a count of live images.
281 was `asset-register.csv`'s `jangan-guna` column on 25 Ogos; 307 is the same
column today. The register classifies; the census counts what is published. Both
are in the document with the reconciliation table.

**The method was validated against a number nobody fed it.** The 25 Ogos rights
plan states that 383 of the 401 Real Wedding files are embedded. Counting the
fourteen Real Wedding articles from live HTML, with a parser that never read the
register, gives **383**. Two independent routes, same number, and that is the
main reason to trust the other 425.

---

## Three findings that belong to other people's items

1. **RIGHTS-03 is scoped to two files. Four institutions are credited on the live
   site.** Decision 167's two are confirmed by exact register match —
   `HK-L-0592` (Getty/iStockphoto) and `HK-L-0347`, which the live page credits
   **`Kredit: UTUSAN MALAYSIA`**. Two more carry the same shape of credit and are
   not in RIGHTS-03's scope: `HK-L-0677` (**`Kredit: BERITA HARIAN`**) and
   `HK-L-0595` (**`Kredit: focus malaysia`**), both on
   `idea-dan-nasihat/tempat-honeymoon-di-malaysia`. Decision 167's reasoning —
   *a news organisation has a rights desk, a wedding hall does not* — reaches
   both without modification. **Reported, not acted on.** RIGHTS-02 deletes
   nothing and I am not widening someone else's item on my own authority. But
   RIGHTS-03 will push an UNDO for two files, and a second UNDO a week later for
   two more costs more than one pass.

2. **21 licensed photographs are live with no asset-register row.** 30 R2
   objects, all `S-` sourced photographs, all carrying a full open licence in
   their on-page credit: Azlan DuPree, Phalinn Ooi, Mohd Nasir Mat Noor, Sham
   Hardy, Nuraishah Bazilah Affandi (CC BY 2.0, and CC BY-SA 2.0 for Sham Hardy).
   Phalinn Ooi and Nuraishah Affandi appear **nowhere in the register in any
   column**. The pages are correct; the record is behind. Rows were deliberately
   **not** written by this item: the register's own §2 forbids copying a name off
   a page into `licensor_name`, and opening these properly means going to each
   licence at origin.

3. **12 covers whose file is named only `cover` cannot be traced to anything.**
   26 live assets have an R2 object named `cover`; 14 sit on Real Wedding
   articles where the page's photographer credit identifies them, and 12 do not.
   One of the twelve is the cover of `garden-wedding`, which draws 28% of site
   impressions. Neither the file, the page nor the register can say where they
   came from.

---

## The correction I am making to the record

`ceo-memory.md` carries, from 30 Aug: *"the carried-forward figure '27 of 48
garden-wedding images carry NO CREDIT' IS WRONG. It is roughly 9 of 49."*

**Measured live today, that page carries 49 images and 22 `<figcaption>`
elements, 21 of them holding a `Kredit:` string.** So 27 or 28 of the 49 have no
visible credit, which is close to the figure the CEO retracted rather than the
one that replaced it.

**Both counts were right about the thing each measured, and that is the lesson.**
The 30 Aug figure came from `grep -oa` over the whole HTML, which counts every
label twice because the Next.js RSC payload repeats the rendered DOM. 40 raw
occurrences meant about 20 credits, not 40. Counting `<figcaption>` elements
instead of label strings gives 22 and cannot be double-counted. Verified with the
committed helper on the live URL:

```
$ bash scripts/measure/count-in-html.sh \
    https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding \
    "<figcaption" "<figure" "Kredit:" "Source:" "sOURCE:" "SOURCE:"
  <figcaption   22
  <figure       22
  Kredit:       42
  Source:        0
  sOURCE:        0
  SOURCE:        0
```

Two things fall out of that run. **RIGHTS-01 shipped and holds**: all three
English casings read 0 on the site's highest-impression page. And `Kredit: 42`
against `<figcaption> 22` is the payload-doubling in one line.

---

## Verification

- **86 URLs, 86 × HTTP 200** — and a 200 alone proves nothing, so also: 86 × one
  `<h1>`, and per-page image counts that reproduce the 25 Ogos figure of 383 on
  the fourteen Real Wedding articles.
- **The census script re-runs from scratch**: `--fetch` pulls the sitemap and
  every article; without it, it rebuilds from the cached HTML. Both were run.
- **The register gate was proven in both directions.** `--gate` exits **1**
  against the 30 drifting objects and prints them with their slugs; exits **0**
  against a five-article control with none. A gate never seen refusing is a gate
  nobody has tested.
- **The grep rule was obeyed.** `-o -i -F` never combined; counts on live HTML
  came from `scripts/measure/count-in-html.sh`.

---

## Recorded in the tracker

```
pnpm --silent sprint set-state RIGHTS-02 in_progress --sprint 5
pnpm --silent sprint add-evidence RIGHTS-02 --sprint 5 --claim … --proof … --link …
```

Not set to `done`. The CEO verifies against the artefact.

---

## Retrospective

### 1. What we learned that is not written down

**A prefix match on a short string will quietly clear an uncleared image.** The
first working draft of this census reported 12 assets as HelloKahwin's own
graphics. They are not ours. Their R2 object is named `cover`, five characters,
which prefix-matched `cover-borang-nikah.png` — a HelloKahwin text card — and
inherited its `license_class: G`. **A rights document would have said twelve
uncredited legacy covers were cleared, and the cover of the site's
highest-impression page was one of them.**

Nothing caught this. No check failed. It was found by printing the twelve rows
and reading them, because 12 assets attributed to us looked like more graphics
than we have published. The generalisable form: **a join is a claim, and a fuzzy
join is a guess with a confident type signature.** `MIN_PREFIX = 12` is now in
the script with the incident in the comment above it.

**And the second half, which is the more useful one:** the same run found 82
ambiguous prefix matches that are *harmless*, because 75 of them sit inside the
Real Wedding sets where rights state comes from the photographer credited on the
page rather than from the register row. The fix is not "never fuzzy-join". It is
**know which conclusion your fuzzy join is load-bearing for.**

### 2. Which document must change, and who owns the edit

Two, both mine, both already edited.

**`docs/asset-register/README.md` §7 — new rule 6.** Rule 1 has said *"a row
exists before the image is attached to a draft"* since 24 Ogos. On 01 September
the site was carrying 21 licensed photographs with no row, two of whose licensors
appear nowhere in the file. **Rule 1 is prose, and prose does not fire.** Rule 6
names the executable instead:

```
python scripts/measure/rights-census.py --fetch --out <dir> --gate
```

It exits 1 with the offending filenames and slugs. Rule 6 also says what not to
do when it fires: do not close a drift row by copying the on-page credit into
`licensor_name`, because §2 of that same file already forbids it and a `Kredit:`
line is a claim rather than a grant.

**`docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`,
Stage 6b — new Rule 8.** *The uploaded filename names the subject and the source.
Never `cover`.* Twelve articles have a cover nobody can trace, and the only thing
that would have kept them traceable was free at upload time.

Files touched by this retrospective:

- `docs/asset-register/README.md`
- `docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`
- `scripts/measure/rights-census.py` (the `--gate` flag and `MIN_PREFIX`)

### 3. What we did twice and should never do again

**Read a rights position off a status column instead of off the site.** 281 and
307 are both `asset-register.csv` counts, and both were carried into planning as
though they described the live library. The live number is 808. Sprint 04 already
learned this shape once — decision 180, the FAQ-schema figure that was stale
because the corpus grew — and the rule was written for `ceo-memory.md` rather
than for the register. It has now cost time twice. The census script exists so
the answer is re-derived rather than remembered.

**Deferred an item and let its sub-commitments go with it.** Decision 167's two
deletes were decided on 30 Aug, rode inside RIGHTS-02, and vanished when
RIGHTS-02 was deferred on 31 Aug. Decision 177 records it; this item found the
same shape one layer down. §5.1 of the census names two *more* institutional
files precisely so they cannot ride inside RIGHTS-03 unrecorded.

### 4. What we nearly shipped, and what caught it

**Nearly shipped:** 12 uncredited legacy covers classified as our own graphics
(above). **Caught by:** printing the group's twelve rows and reading them. Not by
a check.

**Nearly shipped, second:** a census 350 placements too large. The first
extraction counted every image on every page, including the sibling-article cards
that carry another article's cover. It gave 1,167 placements and 808 assets.
**The asset count was right and the placement count was wrong**, which is the
dangerous shape — one number in a pair being correct makes the pair look
verified. Caught by asking why 78 assets appeared on up to nine articles each,
then reading the HTML around one of them and finding `class="s-row"` inside an
`<a href="/artikel/…">`. The parser now excludes them and says why in a
docstring.

**The mechanism worth keeping from both:** the near-misses were caught by
*enumerating and reading the actual rows*, never by a check returning a
surprising number. The company's standing rule says to verify a check that
returns a surprising absence. **These were surprising presences** — 12 graphics
we did not make, 78 images on nine pages each — and they deserve the same
suspicion.
