# UI-07 — the `/artikel` card category label wraps instead of truncating, and the "mobile-only" framing it inherited was wrong at 1024 and 1440 too — 31 Ogos 2026

**Session:** aug-30-2026-session-01 · **Owner:** design-systems-engineer · **Status:** completed
**Plan:** [aug-31-2026-brief-ui-07.md](../../plans/aug-30-2026-session-01/aug-31-2026-brief-ui-07.md)
**Audit this follows:** [aug-31-2026-done-ui-04-rendered-audit.md](aug-31-2026-done-ui-04-rendered-audit.md)

---

## What was done

`p.hk-eyebrow.truncate` on the `/artikel` card grid hid **10px** of
`Hantaran & Mas Kahwin` on **9 of 11** cards at 390px — a 171px box holding
181px of text. Reproduced first, before touching anything, by running UI-04's
committed `harness/eyebrow3.mjs` against production:

```
artikel-index  @ 390  ellipsis-capable:11  actually clipped:9  boxWidths:[171,358]
      171px box / 181px text — 10px hidden — 11px — p.hk-eyebrow.truncate :: Hantaran & Mas Kahwin
artikel-index  @ 768  ellipsis-capable:11  actually clipped:0  boxWidths:[352,360]
artikel-index  @1024  ellipsis-capable:11  actually clipped:0  boxWidths:[220,464]
artikel-index  @1440  ellipsis-capable:11  actually clipped:0  boxWidths:[284,592]
```

The fix is one class on one element, and it wraps rather than truncates. What
took the time was the DoD's other clause.

## The finding that changed the fix

The DoD required the longest live labels to fit as well. They did not fit at
1024 or 1440 either — and the item, the brief and UI-04's own title all said the
defect was mobile-only.

All eleven articles in that grid carry the **same** category. `/artikel` links
**44** one-segment category destinations. Injecting the longest live ones into
the same element on production, pre-fix:

| Width | Card column | `Sebelum Nikah: Jodoh, Merisik & Tunang` (301px) | `Pelamin, Kad & Cenderahati Majlis` (259px) |
|---|---|---|---|
| 390 | 171px | **130px hidden** | **88px hidden** |
| 768 | 352px | fits | fits |
| **1024** | **220px** | **81px hidden** | **39px hidden** |
| **1440** | **284px** | **17px hidden** | fits |

The defect was **content-bound, not width-bound**. `/artikel` goes four-up at
`lg`, so the desktop column (220px) is *narrower* than the mobile one is
generous — 1024 is the second-worst width on the page, not a safe one. It read
clean only because no article had been filed in those categories yet.

**This is the thing that was nearly shipped.** The obvious fix was
`sm:truncate` — wrap on mobile, keep the single line everywhere else. It
satisfies the literal DoD, satisfies `eyebrow3.mjs` at all four widths, and
leaves 81px and 17px of hidden text at desktop for whoever files the next
article. What caught it was checking the DoD's *other* clause — "the longest
live labels must also fit" — against the label set rather than against the page.

## Two candidates killed by measurement

- **Tighten `letter-spacing`.** `0.16em` at 11px is 1.76px per character. On the
  longest label that is 67px of tracking, against 130px needed at 390px. Even at
  zero tracking it does not fit, and the DoD forbids shrinking the label.
- **Widen the box.** Impossible without leaving the two-up grid at 390px, which
  is a composition change the Creative Director owns, not a defect fix.

Wrapping is what was left, and it holds at every width.

## The fix

`src/components/inspire/article-card.tsx` — `truncate` → `wrap-anywhere`, with
the reasoning in a comment beside it so the next person does not re-add the
ellipsis.

`wrap-anywhere` is a **guard, not a visible behaviour**: the longest live single
token is `Undang-undang` at 123px against a 171px minimum column, so no word
breaks today. It stops a future category name longer than a column from
overflowing the grid, instead of being silently cut.

`.wrap-anywhere{overflow-wrap:anywhere}` was confirmed present in the compiled
CSS chunk before shipping — Tailwind 4.3.3 — rather than assumed from the
source.

**Blast radius:** `ArticleCard` renders on `/artikel`, `/artikel/tag/<slug>` and
`/artikel/author/<slug>`. No token and no shared CSS changed.

## Ship state

**Commit:** `b935ce8` UI-07: the /artikel card category label wraps instead of truncating
**Commit:** `00e7267` UI-07: a committed gate for the defect UI-04's method could not see
**PR:** [#22](https://github.com/ianngkb/hellokahwin/pull/22), merged with a merge commit
**Merge commit:** `66cab1f`
**On `origin/master`:** yes — `git merge-base --is-ancestor 66cab1f origin/master` passes
**Deployed:** `82QXqak3U4uX3VPWks6yu79p7U6v` (my merge) and `DSf2Te7VvHAwU3oNscsN7PXLGrC2` (master HEAD `c2215ba`, which contains it), both `state: success` per the GitHub commit status API
**Still uncommitted in the tree:** none

```
$ git status --porcelain -- src/ scripts/
$ git log --oneline origin/master..HEAD
```

Both empty.

> Six untracked `.claude/agents/*.md` persona files sit in the worktree. They are
> not mine and were deliberately left alone.

## Production evidence

Verified on `https://hellokahwin.com`, after deploy, in headless Chrome via
playwright-core at an asserted viewport — `innerWidth` and
`matchMedia('(width: Npx)')` both checked at every width, and the run aborts the
page rather than reporting on a width it did not get.

### The DoD's own harness, re-run against production

`docs/work-done/aug-30-2026-session-01/aug-31-2026-ui-04-EVIDENCE/harness/eyebrow3.mjs`, unmodified:

| Template | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| `artikel-index` | **actually clipped: 0** | **0** | **0** | **0** |
| `homepage` | 0 | 0 | 0 | 0 |
| `category` | 0 | 0 | 0 | 0 |

**State the condition, because it changes what the zero means.** `eyebrow3.mjs`
selects elements whose computed style is `text-overflow: ellipsis`. The fix
removed the truncation instead of widening the box, so `ellipsis-capable` on
`/artikel` went **11 → 0** and the clipped count is zero because nothing
truncates any more — not because the box grew. That is a weaker statement than
the DoD intended, so it is not the only evidence here.

### The direct assertion the DoD actually wants

`p.hk-eyebrow` inside a card, `clientWidth >= scrollWidth`, regardless of
ellipsis — every eyebrow, both surfaces, all four widths, plus the worst case:

| Surface | Width | Column(s) | Rendered clipped | Worst-case clipped |
|---|---|---|---|---|
| `/artikel` | 390 | 358, 171px | **0 of 11** | **0** |
| `/artikel` | 768 | 352, 360px | **0 of 11** | **0** |
| `/artikel` | 1024 | 464, 220px | **0 of 11** | **0** |
| `/artikel` | 1440 | 592, 284px | **0 of 11** | **0** |
| `/artikel/tag/hantaran` | 390 | 171px | **0 of 6** | **0** |
| `/artikel/tag/hantaran` | 768 | 360px | **0 of 6** | **0** |
| `/artikel/tag/hantaran` | 1024 | 220px | **0 of 6** | **0** |
| `/artikel/tag/hantaran` | 1440 | 284px | **0 of 6** | **0** |

Worst case is the longest candidate read off the page — `Ulang tahun
perkahwinan, pantun & adab tetamu`, **377px** nowrap, longer than either label
the DoD names — injected into every distinct card column. `pnpm audit:labels`
exits **0**. Full output:
[`audit-labels-production-AFTER.txt`](aug-31-2026-ui-07-EVIDENCE/audit-labels-production-AFTER.txt).

### The labels the DoD names, on live production

Narrowest column at each width; `fits` means `scrollWidth <= clientWidth`.
Cache state `HIT` on every run.

| Label | 390 (171px) | 768 (360px) | 1024 (220px) | 1440 (284px) |
|---|---|---|---|---|
| `Pelamin, Kad & Cenderahati Majlis` | fits, 2 lines | fits, 1 | fits, 2 | fits, 1 |
| `Cenderahati Majlis` | fits, 1 | fits, 1 | fits, 1 | fits, 1 |
| `Pelamin Kad` | fits, 1 | fits, 1 | fits, 1 | fits, 1 |
| `Sebelum Nikah: Jodoh, Merisik & Tunang` | fits, 2 | fits, 1 | fits, 2 | fits, 2 |
| `Sebelum Nikah: Jodoh Merisik` | fits, 2 | fits, 1 | fits, 2 | fits, 1 |
| `Tunang` | fits, 1 | fits, 1 | fits, 1 | fits, 1 |
| `Hantaran & Mas Kahwin` | fits, 2 | fits, 1 | fits, 1 | fits, 1 |
| `Ulang tahun perkahwinan, pantun & adab tetamu` | fits, 3 | fits, 2 | fits, 2 | fits, 2 |

Computed `font-size` is **11px** on every row — the DoD's floor, not below it —
and no label has a zero box. Both are asserted by the gate, separately from the
overflow checks, because a fix that shrank or hid the label would turn every
overflow assertion green.

### Structural control — the preview could not be used, so production was

The brief asks for a structural preview-vs-production comparison. **The Vercel
preview is behind SSO** — `GET /artikel` on
`hellokahwin-git-ianng89-ui07-label-clip-thewednotebook.vercel.app` returns
`302` to `vercel.com/sso-api` — so it could not be fetched, and a number that
needs a secret session does not go in a claim.

The same control was run on production instead, same origin, before and after
the deploy:

| | h1 | h2 | h3 | img | a | article | `p.hk-eyebrow` | `p.hk-eyebrow.truncate` | innerText chars |
|---|---|---|---|---|---|---|---|---|---|
| `/artikel` **before** | 1 | 3 | 11 | 12 | 92 | 11 | 11 | **11** | 2371 |
| `/artikel` **after** | 1 | 3 | 11 | 12 | 92 | 11 | 11 | **0** | 2371 |
| `/tag/hantaran` **before** | 1 | 0 | 6 | 6 | 34 | 6 | 6 | **6** | 853 |
| `/tag/hantaran` **after** | 1 | 0 | 6 | 6 | 34 | 6 | 6 | **0** | 853 |

Identical on every structural count and on the first card title; the only delta
is the class the fix removed. Not a shell, and nothing else moved.

### Screenshots

- [`artikel-grid-390-BEFORE-production.png`](aug-31-2026-ui-07-EVIDENCE/screens/artikel-grid-390-BEFORE-production.png)
  — nine cards reading `HANTARAN & MAS KAH…`
- [`artikel-grid-390-AFTER-production.png`](aug-31-2026-ui-07-EVIDENCE/screens/artikel-grid-390-AFTER-production.png)
  — the same nine reading `HANTARAN & MAS KAHWIN` over two lines, live

## One thing observed and deliberately not fixed

On `/artikel/hantaran-mas-kahwin` the breadcrumb's final crumb was a
`max-w-[200px] truncate` span — 153px box, and the 301px category name would
have clipped there too. **It is already fixed:** `a08fcd4` "UI-08: the
breadcrumb's final crumb was a fixed 200px box at every width", another agent's
item, merged in PR #20 during this one.

That is worth recording because it produced a **surprising absence** in my own
evidence: `eyebrow3.mjs` reported `ellipsis-capable: 1 → 0` on the category
template across my before/after runs, on an element I never touched. Checking
`git log 61a505f..origin/master` rather than assuming attributed it correctly in
about a minute. A different agent's merge landing mid-measurement is the normal
case in this sprint, not an anomaly.

---

## Retrospective

### What we learned that is not written down

**A fit check that measures the labels ON the page measures the corpus, not the
component.** UI-04's readings were all correct and its conclusion was not,
because every article in the grid it measured carried the same short category
out of 44. The check could only ever have found a defect in the data it
happened to be given. This is distinct from the failure modes already in the
persona — the selector was right, the widths were right, the browser was real.
The *input set* was the corpus.

**A DoD that names a mechanism presumes the fix keeps that mechanism.** This
one said `p.hk-eyebrow.truncate` clientWidth >= scrollWidth. The correct fix
removes `truncate`, so the named selector does not exist afterwards and the
sentence is vacuously satisfiable — remove the class, get a green, hide nothing
*and* prove nothing. It is also satisfiable by `font-size: 9px` and by
`display: none`, which is why the DoD had to add "not below 11px or hidden" in
prose. A DoD that had said *no card label may hide any part of any live category
name at 390/768/1024/1440* would have needed none of those patches and would
have caught 1024 on its own.

### Which document must change, and who owns the edit

| Lesson | Form it takes | File | Owner | Status |
|---|---|---|---|---|
| Fit checks must test the worst-case value, not the rendered one | **a script + gate** | `scripts/audit-label-fit.mjs`, `pnpm audit:labels` | design-systems-engineer | **done, shipped in `00e7267`** |
| Same, as standing method | **a persona rule** | `skillcentral/agents/projects/hellokahwin/Design/design-systems-engineer.md` | design-systems-engineer | **done** |
| "The only mobile-only defect on the site" is not supportable | **a correction block + header pointer** | `aug-31-2026-done-ui-04-rendered-audit.md` | product-designer (corrected here by design-systems-engineer, with the measurement) | **done** |
| `audit-srow-geometry.mjs` shares the arg-parsing bug found below | **a one-line fix** | `scripts/audit-srow-geometry.mjs` | creative-director (UI-01's author) | **open — reported, not touched** |

Prose was used for none of them.

### What we did twice

**Enumerated the category names twice.** The first pass took every
`a[href^="/artikel/"]` and mixed article titles in with category names, which
put a 483px article headline at the top of a list of "category labels". The
second pass used the path-segment count. The gate carries the corrected rule and
says plainly that its set is a deliberate superset, so nobody redoes this.

**Measured the eyebrow twice, and that one was necessary.** `eyebrow3.mjs`
selects by computed style, so its candidate set changes when the fix changes the
mechanism — it cannot express "this element is fine" once the element stops
truncating. The second instrument asserts geometry on `p.hk-eyebrow` directly.
Both are reported above, with the difference between them stated, rather than
quoting whichever looked better.

### What we nearly shipped, and what caught it

**A mobile-scoped fix.** `sm:truncate` would have passed the literal DoD, passed
`eyebrow3.mjs` at all four widths, matched the brief's "at 390 ONLY" framing —
and left 81px hidden at 1024 and 17px at 1440. What caught it was reading the
DoD's second clause (the longest live labels must fit) as a separate assertion
instead of assuming the first clause implied it.

**A gate that navigated to `390/artikel`.** `--widths 390` had its value
consumed as the positional base URL. It was caught by the `--prove` negative
control on its first run, because that was the first invocation to put a valued
flag before a positional. The control was written to prove the gate could go
red; it earned its keep by finding a bug in the gate itself instead.
`scripts/audit-srow-geometry.mjs` (UI-01) uses the same `argv.find((a) =>
!a.startsWith('--'))` pattern and has the same latent bug — reported above,
not touched, because it is another item's file and it is shipped and green.

### A mistake made in this item, recorded because it will recur

**A file-scoped `git add` is not isolation when six agents share a checkout.**
Writing the persona lesson meant staging
`skillcentral/agents/projects/hellokahwin/Design/design-systems-engineer.md` by
path. Another agent had **uncommitted edits in that same file** — UI-06's four
persona lessons and its hard rule 7 — and `git add -- <path>` took the file, not
my hunk. The commit carried their work under my message and my `Co-Authored-By`.

Caught by reading `--numstat` after committing: **45 insertions** for a block
that is 17 lines. The habit of checking the diff stat against what you believe
you wrote is what found it; nothing else would have.

Their work is **preserved, not lost**. The commit message was amended to name
which lessons are mine and which are UI-06's, and the commit was deliberately
**left unpushed** so that whoever owns UI-06 can still commit it under their own
name rather than have it land on a remote under mine.

The rule I had been following — "stage explicit pathspecs, never `-A`" — is
correct for *files nobody else is touching* and useless for shared ones. The
sprint's own guidance about parallel work covers merge commits and worktrees; it
does not cover the shared non-site checkouts (`buddy/skillcentral`, the docs
branch) where agents edit the SAME file at the same time.

**Form: a checklist item, and it belongs to whoever owns the sprint workflow —**
before `git add -- <path>` in a shared checkout, run `git diff --numstat --
<path>` and confirm the count matches what you wrote; if it does not, stage the
hunk or wait. Named here rather than edited in because the sprint workflow file
was not identified in this item and guessing at its location is how a rule ends
up somewhere nobody reads.

### The form question, answered

Of six lessons, three became a script, a gate assertion or a persona rule; one
became a dated correction on the document that carried the wrong claim; one is
an open one-line fix assigned by name; and one is a checklist item whose owning
file this item could not identify, so it is stated with its owner rather than
filed in a guessed location. Only that last one is prose, and it says why.
