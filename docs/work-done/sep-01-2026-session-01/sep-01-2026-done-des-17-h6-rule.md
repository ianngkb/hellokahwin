# DES-17 — H6 written into DES-03 §7 as a constraint a script evaluates, not a sentence — 01 September 2026

**Session:** sep-01-2026-session-01 · **Owner:** product-designer · **Status:** completed
**Plan:** [sep-01-2026-brief-des-17.md](../../plans/sep-01-2026-session-01/sep-01-2026-brief-des-17.md)
**Branch:** `ianng89/des17-h6rule` · **PR:** https://github.com/ianngkb/hellokahwin/pull/37

DOCS repo. Specification and measurement tooling only — no production site code
was written or touched.

---

## The claim, in one line

Rule **H6** now exists in DES-03 §7.5, anchored at `id="h6"`, written as six
numbered clauses with an extraction rule, a tie-break, a fallback and a
**runnable checker** — `scripts/measure/check-h6.sh`, which exits `1` on the
live homepage today and names all three violated clauses, and `0` on a
conforming set; both cross-references in §5.3 now resolve as links; and the
build that produces DES-03 will no longer assemble a document containing a
cross-reference that does not resolve.

---

## What was wrong

DES-03 §5.3 said, verbatim:

> thirteen items, all thirteen from Hantaran & Mas Kahwin … The specified
> homepage carries the diversity rule — see H6 in §7

**There was no rule H6.** Enumerated on the artifact as committed before this
item:

```
$ grep -oan '\bH6\b' docs/design/des-03-spesifikasi.html | sort | uniq -c
      1 941:H6      <- base64 WebP payload
      1 974:H6      <- base64 WebP payload
      1 1021:H6     <- base64 WebP payload
      1 1324:H6     <- the dangling cross-reference itself
```

§7 carried the word *diversity* 0 times and *categor* 0 times. The rule was
asserted, drawn, and never written — so no builder could have implemented it and
no check could have caught that nobody had.

---

## What was written

### §7.5 of DES-03, the rule

Full path: `docs/design/des-03-spesifikasi.html` §7.5, anchored `id="h6"`.
Source of truth: `docs/design/des-03-evidence/tpl/07-states.html` — the artifact
is generated, so the template is where it was written.

| Clause | The constraint |
|---|---|
| **H6.0** extraction | The homepage item set is every article link the page renders, in DOM order, deduplicated by path, first occurrence wins. An article link is an `href` matching `/artikel/<kategori>/<slug>` — exactly two path segments after `/artikel/`. A one-segment link is a category link and is never an item. The category is `<kategori>`. Nothing else is consulted. `s[1]` is the hero, `N` the item count, `cap = ceil(N/3)`. |
| **H6.1** share cap | No category supplies more than `cap` items. At N=13 the cap is 5. |
| **H6.2** run cap | No two consecutive items share a category. Maximum run length 1. |
| **H6.3** distinct floor | At least `F = min(4, K, N − cap + 1)` distinct categories, K = categories holding ≥1 published article. |
| **H6.4** tie-break | Slot 1 takes the highest-ranked class-O/P cover (§5.3, §6.3). Every later slot takes the highest-ranked remaining article that keeps H6.1 and H6.2 true. Rank: (1) published date, newest first; (2) fewest already placed from that category; (3) category slug ascending; (4) article slug ascending. Total, so one corpus yields one set. |
| **H6.5** fallback | Satisfiable iff `Σ min(published(x), cap) ≥ N`. If not: relax H6.2 for one slot (run of 2, never 3), then H6.1 for one slot (`cap + 1`), then **truncate**. Valid at any N ≥ 4; below that H3, the no-hero variant; with zero articles `.s-empty` (§8), not a blank page. |
| **H6.6** DOM order | H6 is measured on DOM order, which is tab and screen-reader order. No `order`, no `grid-auto-flow: dense`, no `*-reverse` on the item container. |

Three of those clauses are decisions with a rejected alternative stated in the
document itself:

- **H6.4 ranks recency above diversity.** Rejected: ranking diversity first. It
  produces a well-mixed homepage that buries what was published yesterday, and
  §5.3 gives the homepage the job of being the record of what is new. Diversity
  is a constraint here, not a preference. The clause is load-bearing rather than
  decorative: on the sitemap of 01 September, **24 articles carry one identical
  timestamp and 19 carry another**, so recency alone leaves 24 items unordered
  and the homepage non-deterministic.
- **H6.5 relaxes the run cap before the share cap.** An adjacent pair is
  monotony; one category owning the page is the failure §5.3 measured. Monotony
  is the cheaper thing to spend, so it is spent first.
- **H6.5 truncates rather than pads.** Never repeat an article, never reach for a
  target length. A short homepage is a true homepage.

§7.6 states, as a table, exactly how UI-13 tests it — three commands and their
expected exit codes — and a final box states what H6 does **not** govern
(catalogue ordering, the article rail, search results, commissioning), so an
omission reads as a decision rather than a gap.

### `scripts/measure/check-h6.sh` — so the rule fires

Full path: `scripts/measure/check-h6.sh`

```
check-h6.sh [--corpus <sitemap-url|file>] <homepage-url|file>
  exit 0  H6 holds
  exit 1  H6 violated — every failing clause printed with its numbers
  exit 3  fetch or usage error — NOT a verdict about the page
```

`--corpus` additionally computes H6.5 satisfiability, which is what separates
*the homepage was built wrong* from *the corpus is too thin*. The exit code stays
binary on purpose: a gate needs pass or fail, and the corpus line names the owner.

### `docs/fixtures/2026-09-01-h6/` — six fixtures, one per clause

Every `href` is a real published article path read off the live sitemap on
01 September 2026. No placeholder slugs: a fixture built from `/article/one`
would not have exposed that the extraction rule has to ignore two-segment
category links, which every fixture carries in its `<nav>`.

---

## Verification

### 1. The failing case — the live homepage, which is why the rule exists

```
$ bash scripts/measure/check-h6.sh --corpus https://hellokahwin.com/sitemap.xml https://hellokahwin.com/
H6 — homepage category diversity (DES-03 §7.5)
page:   https://hellokahwin.com/  (HTTP 200, 56356 bytes)
corpus: https://hellokahwin.com/sitemap.xml  (HTTP 200, 20098 bytes)

  set:    N=13 items, 1 distinct categories, share cap ceil(N/3)=5
  order:  hantaran-mas-kahwin hantaran-mas-kahwin hantaran-mas-kahwin hantaran-mas-kahwin
          hantaran-mas-kahwin hantaran-mas-kahwin hantaran-mas-kahwin hantaran-mas-kahwin
          hantaran-mas-kahwin hantaran-mas-kahwin hantaran-mas-kahwin hantaran-mas-kahwin
          hantaran-mas-kahwin

  H6.1  SHARE CAP   FAIL — over ceil(N/3)=5: hantaran-mas-kahwin=13
  H6.2  RUN CAP     FAIL — 12 adjacent same-category pairs: 1-2:hantaran-mas-kahwin …
  H6.3  FLOOR       FAIL — 1 distinct categories, floor min(4,K,N-cap+1)=4

  corpus: 86 published articles across 15 categories
          capacity at cap 5 = 47, required = 13
          H6 IS SATISFIABLE at N=13. A failure above is a build defect, not a corpus limit.

  VERDICT: H6 is violated.
$ echo $?
1
```

§5.3's measurement still holds on 01 September: thirteen items, all thirteen
from Hantaran & Mas Kahwin, no duplicates.

### 2. Every clause fires, and fires alone

```
pass         H6.1 pass | H6.2 pass | H6.3 pass          EXIT=0
fail-run     H6.1 pass | H6.2 FAIL | H6.3 pass          EXIT=1
fail-share   H6.1 FAIL | H6.2 pass | H6.3 pass          EXIT=1
fail-floor   H6.1 pass | H6.2 pass | H6.3 FAIL          EXIT=1
fail-empty   H6.0 FAIL — zero article links matched     EXIT=1
pass-short   N=4, cap 2, floor 3 — all pass             EXIT=0
```

CRLF checkout was tested separately, because git will convert these files on a
fresh clone on Windows: `pass.html` exits 0 and `fail-run.html` exits 1 with
`\r\n` line endings.

### 3. The cross-reference resolves, with its negative control

```
$ grep -c 'id="h6"' docs/design/des-03-spesifikasi.html
1
$ grep -c 'id="h9"' docs/design/des-03-spesifikasi.html
0
```

Both controls grep on `id="…"` rather than on the bare token, deliberately: a
bare `H6` matches base64 image payload three times, which is exactly the false
positive that let this reference dangle through a whole sprint. The two commands
are written into the spec with `&quot;` so that documenting them does not change
either count.

Section 7 also went from *diversity* 0 → **9** and *categor* 0 → **29**.

### 4. The build is deterministic, and the artifact was rebuilt from source

`docs/design/des-03-spesifikasi.html` is generated by
`docs/design/des-03-evidence/build.py` from thirteen templates. **This was proved
before any edit was made**: rebuilding the committed file produced
`md5 be208d4005e794e9fac360e7f90fedda`, byte-identical, with `git status` clean.
Editing the built HTML directly would have been silently discarded on the next
rebuild. The diff after the edit is 184 lines in the artifact and nothing else —
no image churn.

---

## Findings, including three corrections to what was written before this item

**1. The brief and decision 179 say the base64 fragments are "embedded font
data". They are embedded WebP image data.** All three sit inside
`src="data:image/webp;base64,…"`. DES-03 embeds no fonts at all — it links Google
Fonts over the network. The substance of the finding is untouched; the detail is
now corrected in `docs/boardroom/decision-log.md` #179.

**2. R8a/R8b/R8c are not in DES-03, and never were.**

```
$ grep -c '\bR8a\b' docs/design/des-03-spesifikasi.html
0
```

The brief, decision 179 and the Sprint 05 plan all cite "(hero eligibility,
R8a/R8b/R8c)" as *the parts of DES-03 written as enforceable rules*. R8a/R8b/R8c
are the 31 August spec-vs-build audit's own labels for three shipped **code
symbols** — `HERO_INELIGIBLE_SLUGS`, `resolveHeroCrops`, `isHeroFrameEligible` —
not rule ids in the spec. The enforceable rule in DES-03 is hero eligibility by
cover class in §5.3, and it has no id at all. This matters practically: the next
author who goes to DES-03 to copy the numbering scheme that "shipped exactly"
finds nothing there and writes prose again. Corrected at source in
`docs/boardroom/decision-log.md` #179 and
`docs/plans/sep-01-2026-session-01/sep-01-2026-plan-sprint-05.md`.

**3. There was a SECOND dangling reference in the same paragraph of §5.3, and
the brief did not know about it.** §5.3's hero rulebox says the homepage "runs
**H3's** no-hero variant". H3 was defined nowhere either — one occurrence in the
whole document. Fixing only H6 would have left it. §7.5 now opens with a table
resolving the homepage `H` namespace: H1 the default, H3 the no-hero variant, H6
the diversity rule, with an explicit instruction not to invent H2/H4/H5/H7/H8.
§7.1 counts eight homepage states and only three of them ever carried an id; the
other five are the palette × breakpoint × length variants drawn in §5.3 and are
now stated to be deliberately unnumbered.

**4. What I nearly shipped, and what caught it.** The first draft of H6.3 read
*"at least min(4, K) distinct categories"*. At N=4 that demands four categories
across four items, while H6.1's cap of `ceil(4/3) = 2` explicitly permits two
items from one — **two clauses of the same rule contradicting each other at the
small end.** It reads perfectly. Nothing in the prose showed it. The `pass-short`
fixture failed, and the floor became `min(4, K, N − cap + 1)`. A rule is not
written until a case it should reject has been rejected and a case it should
accept has been accepted.

**5. The corpus was never the constraint.** 86 published articles across 15
categories (sitemap, 01 September) give a capacity of 47 at a cap of 5 against a
required 13. The largest category holds 38 of 86, and six categories hold four or
fewer. H6.5's fallback is written because a thin corpus is a real future state,
not because it is today's: today the homepage runs thirteen items from one
category out of a corpus that could have supplied nine.

---

## What is NOT done, stated so nobody assumes it

- **Nothing on the site changed.** The live homepage still violates H6 on all
  three clauses. Building it is UI-13, which this item exists to unblock, and
  which is separately sized.
- **PR #37 is open, not merged.** `gh pr merge` was refused by this session's
  permission classifier. The branch is pushed and the PR is open; merging needs
  the owner or a session with that permission. UI-13 reads DES-03 from `master`,
  so **UI-13 stays blocked until #37 merges** — that is the one thing standing
  between this item and UI-13 starting.
- **The published DES-03 artifact is now stale.**
  https://claude.ai/code/artifact/82d4d556-db93-4139-b1ce-84db67010522 still
  carries the version with no H6. Reading and republishing it was also refused by
  the permission classifier. Whoever owns that artifact should republish from
  `docs/design/des-03-spesifikasi.html`.
- **H6 is not wired into CI.** `check-h6.sh` is runnable and proven; adding it as
  a blocking job belongs with UI-13, when there is a passing homepage to guard.
- **The cross-reference gate covers DES-03 only.** DES-06, DES-07 and UI-05 are
  not built by `build.py` and are not checked. Auditing them is not in this
  item's DoD and has not been done.

---

## Retrospective

**What we learned that was not written down.** A cross-reference written as
prose is invisible to every check the company runs. This one survived the sprint
that wrote it, a two-way cross-check against DES-07's 39-state checklist, and a
full spec-versus-build audit — because every one of those checks looked at what
the document *said*, and none looked at whether what it said *pointed anywhere*.
The second half is nastier: the one check that might have caught it,
`grep '\bH6\b'`, returns four hits, and three of them are base64. **A search that
returns results is not a search that found the thing.** That is the same failure
mode as the `grep -o -i -F` bug, one level up: a number that is about your query
rather than about the document.

**What we did twice that we should never repeat.** Wrote a rule for a builder in
a form the builder cannot execute. Sprint 04 found it, named it as its central
finding, and the finding was then carried forward as a *paragraph in a plan* —
which is the identical mistake applied to itself. This retrospective is
therefore a gate, not a paragraph.

**Which document must change, and who owns the edit.**
`docs/design/des-03-evidence/build.py` — the script that assembles DES-03 from
its templates. Owned for this edit by `product-designer` (me); owned thereafter
by `creative-director`, who owns DES-03.

**The edit, made.** `build.py` now runs `check_cross_references()` before it
writes the artifact, and `raise SystemExit`s if either check fails:

1. **Every `href="#x"` has a matching `id="x"`.** Catches a link whose target was
   renamed or never written.
2. **No bare prose cross-reference.** `see H6 in §7` must be a link. Check 1
   cannot see a reference that is not a link — which is exactly how the original
   defect hid.

Base64 payload is stripped before scanning, because a bare `\bH6\b` matches the
embedded WebP data three times and that false positive is half the reason nobody
noticed.

**The gate was run against the failing case, twice, because understanding a
cause is not a test.**

```
# 1. The corrected document — must pass
$ python build.py
cross-references: 15 internal links, all resolve; 20 anchors defined; no bare id references
wrote …/des-03-spesifikasi.html  (879,468 bytes)
exit 0

# 2. §5.3 reverted to the ORIGINAL bare prose reference — must fail
$ python build.py
BARE CROSS-REFERENCE: a rule or state id is named in prose without a link to it.
  This is the DES-17 defect verbatim. Wrap it in <a href="#id">, so the anchor
  check above can prove the target exists:
    line 1325: see H6 in   &sect;7 &mdash; which caps any one category at
exit 1                       # and no file was written

# 3. The link pointed at an id nobody defined — must fail
$ python build.py
DANGLING ANCHOR: href points at an id that does not exist: ['h9']
  Define the target, or fix the reference. Do not ship the link.
exit 1
```

The templates were restored after each and the artifact rebuilt byte-identical
to the committed one.

**What this means going forward.** DES-03 can no longer be rebuilt carrying a
cross-reference that does not resolve, and a future author physically cannot
write "see H7 in §9" as prose — the build rejects it, and once it is a link the
anchor check proves the target exists. Two checks that compose into a guarantee,
firing on every build, with no one needing to remember this happened.
