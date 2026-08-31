# UI-13 build note — Creative Director to Design Systems Engineer

01 September 2026. This is a BUILD NOTE, not a rule. The rule is DES-03 §7.5 H6,
on `feat/command-centre-dashboard` (merged as 8a05951), and it is normative in
full. Read `docs/design/des-03-spesifikasi.html` §7.5 there. Nothing below
changes a clause; where this note and H6 disagree, H6 wins and the disagreement
is a defect in this note.

---

## THE DEFECT IS IN TWO HALVES AND ONLY ONE OF THEM IS THE ORDERING

### Half 1 — no diversity constraint exists anywhere in the selection

`src/app/(public)/page.tsx` → `getHomeData()` orders `publishedAt DESC` and the
component takes the first 13 (`hero` + `rest.slice(0, 12)`). H6.1, H6.2 and H6.3
are consulted nowhere. Measured on the live page, 01 Sept 2026:

```
set:    N=13 items, 2 distinct categories, share cap ceil(N/3)=5
order:  ucapan-doa ucapan-doa ucapan-doa hantaran-mas-kahwin ×10

H6.1  SHARE CAP   FAIL — over ceil(N/3)=5: hantaran-mas-kahwin=10
H6.2  RUN CAP     FAIL — 11 adjacent same-category pairs
H6.3  FLOOR       FAIL — 2 distinct categories, floor min(4,K,N-cap+1)=4
corpus: 89 published articles across 15 categories
        capacity at cap 5 = 47, required = 13
        H6 IS SATISFIABLE at N=13.
```

### Half 2 — `.limit(20)` makes H6 unsatisfiable regardless of the ordering, and this is the half that will be missed

Under H6.1 a candidate pool can contribute at most `min(count_in_pool(c), cap)`
items per category. Ranks 1–13 by `publishedAt` are **two categories** —
10 `hantaran-mas-kahwin` + 3 `ucapan-doa` — so their capacity at cap 5 is
`5 + 3 = 8`, against a required 13. Reaching 13 needs five further items out of
ranks 14–20, in at least three further categories, and nothing in the code makes
that true: it is an accident of the publish order, in a corpus where **38 of 89
articles are `hantaran-mas-kahwin`**.

**So the candidate pool must be the published corpus, not a recency window.**
That is also the set H6.5's satisfiability test is written over — `published(x)`,
not `buffered(x)` — so a 20-row buffer cannot even be asked the question the
fallback ladder depends on. A perfect H6.4 implementation over `.limit(20)` will
fall through H6.5 to step (3) and TRUNCATE, and the visible result will be a
shorter homepage rather than a fixed one. That outcome is wrong and the checker
would not catch it: a truncated 8-item page can satisfy H6 at N=8.

**Measure and report, do not assume:** with the pool widened, print the serialized
byte size of the `unstable_cache` entry. Vercel's Data Cache has a per-entry
ceiling and this select carries three `jsonb` columns. If it is over ~1.5 MB, the
fallback is a two-query shape — a light ranking query (`id`, `publishedAt`,
`categorySlug`, `slug`, `coverImageSmartCrops`, `media.width`, `media.height`)
over the corpus, then a hydrate query for the chosen ids only. Take that shape
only if you measured a reason to; state the number either way.

---

## WHAT TO BUILD

A new module, `src/lib/inspire/home-selection.ts`, beside `hero-frame.ts`, that
implements H6.4 and H6.5 verbatim. `page.tsx` calls it and renders what it
returns. The hero gates stay exactly where they are — `pickHeroIndex` /
`resolveHeroCrops` are not yours to move and UI-12 gave them a second caller.

```
rank(a, placed)                     // `placed` = count already placed, by category
  1. publishedAt            DESC    // recency leads, and it stays leading
  2. placed[a.categorySlug] ASC     // recomputed at every slot
  3. a.categorySlug         ASC     // byte order
  4. a.slug                 ASC     // byte order
                                    // total: one corpus yields one set

select(corpus, N = 13)
  cap  := ceil(N / 3)
  s[1] := highest-ranked HERO-ELIGIBLE article  (pickHeroIndex's three gates).
          No H6 clause binds at slot 1 — H6.4 says so explicitly.
          If nothing is hero-eligible, keep today's behaviour: the highest-ranked
          article overall, rendered with the "Tiada gambar" plate.
  s[i], i = 2..N :
          highest-ranked remaining a with
            placed[a.category] < cap                    (H6.1)
            AND a.category != category(s[i-1])          (H6.2)
  no candidate for a slot -> H6.5, ONE STEP AT A TIME, never further than the
  slot requires:
     (1) permit a run of 2 FOR THAT SLOT ONLY. A run of 3, never.
     (2) then permit cap+1 FOR THAT SLOT ONLY, and return to step (1) for the
         following slot before spending another +1.
     (3) then TRUNCATE. Never repeat an article. Never pad to a target length.
  N < 4 after truncation -> H3, the no-hero variant.
  zero published articles  -> `.s-empty` (§8), which is what the current
                              `Belum ada artikel` block already is; leave it.
```

**The one thing H6 does not spell out, so decide it once and write it down:**
`cap` is derived from `N`, and truncation changes `N`. The checker computes cap
from the RENDERED N, so a set truncated from 13 to 10 must still hold at
`ceil(10/3) = 4`, not at 5. **After any truncation, re-run the whole selection at
the new N.** It converges because N strictly decreases. Today capacity is 47
against a required 13, so this path never fires — build it anyway and unit-test
it, because the day it fires is the day nobody is looking.

**H6.6 — DOM order is the order.** Render the items in selection order and do not
reorder them visually: no `order`, no `grid-auto-flow: dense`, no `*-reverse` on
the container that holds the 13 items. (Inside a single `.s-row` is not the item
container and is out of scope.) The layout gate now asserts this from computed
boxes, so a violation fails there rather than here.

---

## HOW YOU KNOW YOU ARE DONE

```
bash scripts/measure/check-h6.sh --corpus https://hellokahwin.com/sitemap.xml https://hellokahwin.com/
```

exit 0 against the LIVE homepage. Exit 1 names the failing clause; exit 3 is a
fetch or usage error and is **not** a verdict about the page.

Against the local build first, then production after deploy. Six fixtures exist
and all six must keep behaving — they are on the docs line at
`docs/fixtures/2026-09-01-h6/` (pass 0, fail-run 1, fail-share 1, fail-floor 1,
fail-empty 1, pass-short 0).

Unit tests, in `src/lib/inspire/__tests__/home-selection.test.ts`, against
hand-built corpora rather than the database: the H6.5 ladder in order, the
re-run-after-truncation rule, the `N < 4` and zero-article cases, and a
determinism test — the same corpus twice, byte-identical output — because 24
articles share one `publishedAt` and 19 share another, so rank clause 1 alone
leaves 24 items unordered.

---

## BRANCH DISCIPLINE

`src/`, `scripts/`, `tests/`, `.github/` and `docs/work-done/` are the SITE space
and go to **master** by PR. `docs/design/`, `docs/plans/` and `docs/fixtures/`
are the company record and live on **`feat/command-centre-dashboard`**. Do not
open a PR from the docs line into master. (The brief's one-line version of this
rule — "anything under `docs/` goes to the docs line" — is wrong: every item that
shipped today put its `docs/work-done/` entry on master, and following the line
literally would bury this item's paper trail on a branch nobody reads, which is
the exact failure it warns about. Raised in the retrospective.)

**DONE MEANS SHIPPED**: merged to master AND deployed AND visible at
`https://hellokahwin.com/`.
