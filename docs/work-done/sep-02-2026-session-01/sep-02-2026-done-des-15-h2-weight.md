# DES-15: `.s-h2` wins its own declarations — an element selector had been beating the design system on every public page — 02 September 2026
**Session:** sep-02-2026-session-01 · **Owner:** design-systems-engineer · **Status:** completed
**Plan:** `docs/plans/sep-02-2026-session-01/sep-02-2026-brief-des-15.md`

## What was done

`components.css` declared `.s-h2 { font-weight: 600; letter-spacing: -0.01em }`
and the reader got neither, on every public page, for as long as both rules
existed. `globals.css` carries

```css
.hk-public h1, .hk-public h2, .hk-public h3, .hk-public h4 {
  font-family: var(--font-serif);
  font-weight: 400;
  letter-spacing: -0.018em;
  text-wrap: balance;
}
```

at specificity **(0,1,1)** — one class plus one element — and the bare class is
**(0,1,0)**. An element selector was beating the design system: the DEFAULT won
over the DELIBERATE choice. `.s-row .t` rendered 600 on the same pages purely
because it happens to be (0,2,0). The whole difference was one selector's shape.

`.s-h2` now wins, via a doubled selector `.s-h2.s-h2` at (0,2,0), which wins on
**every** surface rather than only under `.hk-public`.

### This was a design decision, and it was made from rendering, not from prose

The DoD offers two outcomes — win, or stop declaring — and says explicitly that
this is a real design decision. Each candidate was injected into the LIVE page
and rendered at 390px and 1280px before choosing:

| candidate | h2 renders as | verdict |
|---|---|---|
| A — today | Bodoni Moda 400 / −0.399px | the heading and the links under it are the same face at the same weight; only size separates them |
| **B — win as written** | **Bodoni Moda 600 / −0.222px** | **the cluster reads as a cluster. Shipped.** |
| C — win + the family §2.4 assigns | −apple-system 600 / −0.222px | the pillar hub reads in two voices; visibly worse |
| D — stop declaring | Bodoni Moda 400 / −0.399px | identical to A: it would have made the defect the specification |

**C was the option this item nearly shipped**, reasoned entirely from DES-03
§2.4, which says the display face **may not** set an `h2` and lists a `h2` among
things a Didone must not carry. Rendering it killed it. Two things are true at
once and both are recorded here rather than resolved unilaterally:

1. §2.4 is the creative-director's written direction and it says what it says.
2. §2.4's **premise has moved**. It was written for a 400-only self-hosted
   subset — *"There is no italic file, no bold file and no second family"* — and
   what production serves today is
   `@font-face{font-family:Bodoni Moda;font-style:normal;font-weight:400 900}`
   (chunk `19b83a0982f1e330.css`), a real variable `wght` axis. So the 600 that
   now ships is a genuine instance, not the synthesised bold §2.4 was protecting
   against.

**The family is therefore untouched and the question is raised, not applied.**
Pillar cluster headings stay in the display face. Whether the display face may
set an `h2` at all, now that the deployment differs from the one §2.4 assumed,
is the creative-director's call and is in Follow-ups.

## Ship state

**Commit:** `1217f42` DES-15: .s-h2 wins its own declarations — an element selector was beating the design system
**Commit:** `2b045c5` DES-15 review pass: the loop I "found" in CascadeProbe was not there, and the test now proves what is
**PR:** [#60](https://github.com/ianngkb/hellokahwin/pull/60), merged `59954c6590d39a6cd98bb4272ce03098253b7b40`
**On `origin/master`:** yes
**Deployed:** `dpl_CjRjq1CSiGg5Ca5QQxbkGKk3uU1E` — live, serving CSS chunk `ece0345a72e045ca.css` (the same content hash the local build produced, which is how the deployed artefact was tied to the measured one)
**Still uncommitted in the tree:** none

```
$ git status --porcelain -- src/ scripts/ && git log --oneline origin/master..HEAD
$
```

Two empty outputs.

**Which line got what:** site code (`src/`, `scripts/`) → **`master`** via PR #60.
This entry → **`feat/command-centre-dashboard`**. Nothing crossed.

## Evidence

### The failing case, run against the fix

`scripts/audit-class-wins.mjs` (new, committed) parses the claims **out of**
`components.css` and compares them to computed values on a rendered page, so it
cannot drift the way a hand-typed expectation does. Same script, same pages,
same claim set:

```
BEFORE  dpl_B2j3SaaGVGjGKrtSqh4gvWf7hG7k   20 ENFORCE failures   CLASSWINS EXIT: 1
AFTER   dpl_CjRjq1CSiGg5Ca5QQxbkGKk3uU1E    0 ENFORCE failures   CLASSWINS EXIT: 0
```

The BEFORE run, verbatim, at 390px:

```
   ENFORCE FAIL .s-h2 h2 "Hantaran kahwin" font-weight: claimed 600 — reader gets 400
   ENFORCE FAIL .s-h2 h2 "Hantaran kahwin" letter-spacing: claimed -0.2218px (-0.01em of 22.1814px) — reader gets -0.399264px
```

The AFTER run on production, 3 pillar hubs × 2 widths, 102 claims compared:

```
-- https://hellokahwin.com/artikel/hantaran-mas-kahwin  @390px
   clientWidth=390  x-vercel-cache=HIT  x-vercel-id=sin1::sin1::pk2wd-1788289083152-edd742cdd7c8
   css=ece0345a72e045ca.css?dpl=dpl_CjRjq1CSiGg5Ca5QQxbkGKk3uU1E ...
   ENFORCE .s-h2: 5 element(s), 3 claim(s) each [doubled selector]
   REPORT  FAIL .s-h1 h1 "Hantaran & Mas Kahwin" letter-spacing: claimed -0.6739px (-0.022em of 30.6324px) — reader gets -0.551382px
...
102 claim(s) compared. ENFORCE failures: 0.
CLASSWINS EXIT: 0
```

Reproduce:

```
node scripts/audit-class-wins.mjs https://hellokahwin.com/artikel/hantaran-mas-kahwin
```

### Three controls, because a green gate on its own proves nothing

1. **It fires on the defect.** Exit 1 with 20 named failures on the shipped
   build, before anything changed.
2. **It discriminates.** 16 of the 36 claims pass in **both** runs —
   `line-height: 1.25` was never overridden and is never flagged. A check that
   flags everything looks identical to a working one in a failing log.
3. **It is still capable of finding a defect in its green run.** The AFTER run
   still prints `REPORT FAIL .s-h1 … letter-spacing`, a real, unfixed instance
   of the same mechanism. Green here is a reading, not a construction.

### A second, independent instrument agrees

Read directly off production, not through the gate:

```
h2.s-h2 @390px    w=600  ls=-0.221814px  fs=22.1814px   (= -0.01em of 22.1814px)
h2.s-h2 @1280px   w=600  ls=-0.26px      fs=26px        (= -0.01em of 26px)
```

It was `400 / -0.399264px` and `400 / -0.468px` on `dpl_B2j3SaaGVGjGKrtSqh4gvWf7hG7k`.

### The blast radius was enumerated, not assumed — and the DoD's own number is corrected

The DoD says making 600 win *"would change every public h2 on the site."* It
does not. Counted at 390px across 12 production URLs before the fix:

| page | `.s-h2` |
|---|---|
| `/` | 0 |
| `/artikel` | 0 |
| `/artikel/hantaran-mas-kahwin` | 5 |
| `/artikel/nikah-undang-undang` | 4 |
| `/artikel/sebelum-nikah` | 5 |
| `/artikel/ucapan-doa` | 4 |
| `/artikel/busana-pengantin` | 2 |
| `/artikel/pelamin-kad-cenderahati` | 4 |
| `/artikel/venue-perancangan` | 2 |
| `/artikel/real-wedding` | 0 |
| `/artikel/glamor-eksklusif` | 0 |
| an article page | 0 |
| **total** | **26, all `<h2>`, on 7 pillar hubs** |

The site-wide change is a **different** one, and it was not made:
de-specifying the `.hk-public h1,h2,h3,h4` base rule with `:where()` would
additionally move **27** other classed public headings (`.s-h1`, `.s-h3`,
`.hk-display`, `.hk-eyebrow`, `.hk-card-title`) on the same pages. That is an
art-direction decision with a reviewable blast radius and it belongs to its own
item, not to a 3-point fix.

### A same-class asymmetry nobody had named, now closed

An element selector cannot match a `<span>`. So the same class rendered two
different ways depending on which element it landed on. Measured by injecting
`EmptyState`'s own `<span class="s-h2">` next to a real `h2.s-h2` on the live
page:

```
BEFORE   h2.s-h2   {"fam":"Bodoni Moda","w":"400","ls":"-0.399264px"}
         span.s-h2 {"fam":"-apple-system","w":"600","ls":"-0.221814px"}
AFTER    h2.s-h2   {"fam":"Bodoni Moda","w":"600","ls":"-0.221814px"}
         span.s-h2 {"fam":"-apple-system","w":"600","ls":"-0.221814px"}
```

Weight and tracking now agree on both tags. The family still does not — that is
the open §2.4 question, and it is now a measurement rather than an assertion.

### The reference page could not have caught this, and now can

`.s-h2` was the **only** `.s-*` class the reference page never rendered live: it
was named in the §05 heading table and drawn nowhere. §02's scale table states
h2 tracking −0.01em and has done throughout, while production served −0.018em —
a hand-typed number cannot be wrong out loud.

New `CascadeProbe` (`src/design-system/components/cascade-probe.tsx`), the
sibling of UI-11's `TargetProbe`: it reads computed values off the real element,
resolves an `em` claim against that element's own font-size (the scale is a
fluid `clamp()`, so the px a claim means differs at every width), and goes red
when a class loses. The specimen renders on **both** `.hk` and `.hk-public` —
one surface would have looked perfect and proved nothing, which is precisely how
this defect survived: the console honoured the class and the public site did not.

### Checks

`typecheck` 0 · `vitest` **510 passed / 37 files** · `next build` 0 · `eslint`
0 errors on the touched files · `prettier --check` clean on the touched files.
`pnpm run lint` exits 1 on `master` already — 6 pre-existing prettier violations
in files this item does not touch, 0 ESLint errors — stated rather than hidden.

**Reviewer: Claude.** No `codex-reviewer` was dispatched and no review was routed
through any OpenAI-backed path, per the owner directive of 02 Sept.

## What it changed

- 26 pillar-hub cluster headings on 7 pages went from indistinguishable from the
  links beneath them (same face, same weight, only size) to reading as headings.
- The design system stopped lying. `.s-h2` was making two declarations that no
  reader had ever received, and any future reader of `components.css` would have
  believed both.
- The company gained a check for a failure mode it had no way to see:
  `scripts/audit-class-wins.mjs`. UI-14 catches a class that matches **no rule**;
  this catches a rule that **matches and never wins**. The markup is right, the
  CSS is right, and the cascade throws the answer away in between — only a
  computed read on a rendered page can find it.

## Follow-ups

1. **`.s-h1` loses its `letter-spacing: -0.022em` to the same rule** and renders
   −0.018em on every article and category page (−0.792px instead of −0.968px at
   44px). It is in the gate as `REPORT`, printed on every run, and moves to
   `ENFORCE` in the same change that fixes it. **Owner: creative-director** — it
   is the article headline's tracking, on every page that takes search traffic.
2. **DES-03 §2.4 vs. what ships.** §2.4 forbids the display face on `h2`/`h3`
   and `.hk-public h1,h2,h3,h4` applies it to every public `h2`, `h3` and `h4`.
   §2.4's premise (a 400-only subset, "no bold file") no longer describes the
   deployment. **Owner: creative-director.** Deciding it either way is a
   site-wide change and needs its own item.
3. **The `.hk-public h1,h2,h3,h4` base rule should probably be a base LAYER**
   (`:where()`, zero specificity) so a design-system class always wins. Measured
   blast radius: 27 additional classed headings. **Owner: design-systems-engineer**,
   as its own item, with the before/after rendered per class.
4. **`next/font` Bodoni Moda is not scoped to the admin page, and the code says
   it is.** `grep -rn 'next/font' src` returns exactly two files —
   `(admin)/admin/design-system/page.tsx` and `(admin)/layout.tsx` — and the
   first carries the comment *"loaded here via next/font/google scoped to this
   admin page only"*. CDP `CSS.getPlatformFontsForNode` on the PUBLIC page
   `/artikel/hantaran-mas-kahwin` reports `Bodoni Moda(webfont)` painting the h1,
   the h2 and the pillar links. The public site's entire display typeface is
   therefore riding on a declaration in an admin route, and would fall back to
   `local(Times New Roman)` the day someone deletes that import. **Owner:
   design-systems-engineer**, own item, and it is bigger than DES-15.

## Retrospective

### What we learned that is not written down

**An element selector inside a scoped wrapper outranks the design system's own
classes, and every `.s-*` it overlaps loses silently.** `.hk-public h1,h2,h3,h4`
reads like a base voice and is not one — it is an override with a higher
specificity than anything in `components.css`. That is a structural inversion,
not a one-class typo, and the gate found two more instances of it on its first
run. Nothing in the repo said this, and nothing could have found it by reading:
the class is present, the rule is present, the values are correct in the source,
and the reader gets different ones.

**And: a specification clause is evidence about INTENT, not about the artefact —
check whether its premise still holds.** DES-03 §2.4 forbids the display face on
an `h2` because "there is no bold file". There is now. Applying the clause
without re-testing its premise would have shipped the visibly worse option.

### Which document must change, and who owns the edit

**`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Design/design-systems-engineer.md`** —
the design-systems-engineer persona. **Owner: me, and the edit is made** (below).
Persona edits inside a worktree reach nothing; `.claude/agents/` does not ship.

Prose rules do not fire, so the load-bearing half is a gate, and it is committed:
**`scripts/audit-class-wins.mjs`**, on `master`, with `.s-h2` enforced and
`.s-h1`/`.s-h3` reported.

### What we did twice

1. **Reasoned taste from a document and had to be corrected by rendering.** The
   sans-serif candidate was chosen from §2.4's wording and rejected on sight
   once drawn. UI-05 learned the same lesson on 31 Ogos with the contact sheet
   of 38 covers — a conclusion about photography that only survived being
   *looked at*. Twice now, in two weeks, in this same design track.
2. **Wrote a check, believed it, and had to run it in both directions before it
   was worth anything.** Twice inside this one item: the class-wins gate (paired
   against production and the local build) and the `CascadeProbe` test (paired
   against `[claim]` and `[claimKey]`). The second pairing is the one that
   mattered — see below.

### What we nearly shipped, and what caught it

1. **Candidate C — the system sans on every `.s-h2`.** Argued from §2.4, written
   up, nearly committed. Caught by rendering all four candidates on the live page
   at both widths and looking at them, and then by measuring the `@font-face`
   production actually serves.

2. **A fabricated bug, written into a source comment as a fact.** Reviewing my
   own diff I "found" that `CascadeProbe`'s `useEffect([claim])` was an
   unconditional render → effect → setState → render loop, because every caller
   passes an object literal. It was confident, specific and **wrong**: `setRows`
   re-renders `CascadeProbe`, not its parent, so the `claim` prop keeps its
   identity and the effect never re-fires. I had already written the loop into
   the component's doc comment and into a commit message before running it.
   Putting `[claim]` back and running the suite passed **3/3**. That killed it.

   The test was then rewritten to *discriminate* rather than to pass, and watched
   in both directions:

   ```
   [claimKey]  ->  3 passed                              vitest exit 0
   [claim]     ->  AssertionError: expected 3 to be 1    vitest exit 1
   ```

   The real defect is narrower and the change stands: a parent re-render tears
   down and re-subscribes a `ResizeObserver` for a claim that did not change.
   The corrected account is in the file, not just here.

   A third instance in the same test: its second assertion was written to expect
   `font-weight: 400` from jsdom and jsdom answers with the keyword `bold`. It
   now asserts what a probe must never do — echo its own claim back as the
   reading.

### The edit, made

Added to the persona, under Output standards:

> **An ELEMENT selector inside a scoped wrapper outranks your entire class
> system, and it fails silently in the one direction you cannot grep for.**
> `.hk-public h1,h2,h3,h4` at (0,1,1) beat `.s-h2` at (0,1,0) and threw away
> `font-weight: 600` and `letter-spacing: -0.01em` on every public page for as
> long as both existed — while `.s-row .t` rendered 600 on the same pages purely
> because it is (0,2,0). The markup is right, the CSS is right, and the cascade
> discards the answer in between, so nothing in the source tree can see it and
> `getComputedStyle` on a rendered page is the only instrument that can. Run
> `scripts/audit-class-wins.mjs`, which parses the claims out of
> `components.css` rather than restating them. It reports two more live
> instances. **This is a different failure from UI-14's** — that one catches a
> class matching no rule; a check for either is blind to the other.
>
> **A specification clause is evidence about INTENT. Re-test its premise before
> you apply it.** DES-03 §2.4 forbids the display face on an `h2` partly because
> "there is no bold file"; production now serves
> `font-weight: 400 900`, a real variable axis (274.94 / 286.97 / 295.03px for
> one string at wght 400/600/700 — monotonic, so not a synthesised bold).
> Applying the clause unread would have shipped the option that looked worse
> when drawn. **Render every candidate on the live page before deciding a
> typographic question**; DES-15 chose the wrong one from prose and was
> corrected by a screenshot, which is the second time in two weeks the design
> track decided taste from a document (UI-05, the contact sheet).
>
> **A bug you find by READING your own diff is a hypothesis. Run it before it
> goes into a comment as a fact.** DES-15's review "found" a render loop in
> `CascadeProbe` and wrote it into the component's doc comment and a commit
> message. Restoring the dependency it blamed passed 3/3. The finding underneath
> was real but four times smaller, and the false half would have been permanent
> repo folklore. **Every test you add gets watched failing on purpose**, on the
> exact input it exists to catch.
