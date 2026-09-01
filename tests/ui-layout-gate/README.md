# `tests/ui-layout-gate` — the known-bad input, and how to trust it

Everything here exists to answer one question about `scripts/ui-layout-gate.mjs`:
**has it ever been seen failing on a defect we know is real?** A gate that has
only ever run green proves nothing at all.

```
pnpm ui:gate:selftest        # assertions that each check fires AND clears
pnpm ui:gate:fixtures        # the pre-fix capture; exits 1, as it must
pnpm ui:gate --base https://hellokahwin.com
UI_GATE_BYPASS=<secret> pnpm ui:gate --base <a preview *.vercel.app>
```

Requires `playwright-core` and the installed Chrome. Override the browser with
`UI_GATE_CHROME=/path/to/chrome`.

A Vercel **preview** deployment is behind team SSO and answers an
unauthenticated request with a 302 to Vercel's login, which is a perfectly
well-formed 200 with no clipped text, no narrow columns and no images — a green
run over somebody else's page. Two items hit that wall from opposite sides on
31 Ogos 2026 and both halves are in the gate:

- **Detection** (UI-08) — the identity precondition in `measure()`. Every target
  must prove it is this site before a single check runs: the final origin must
  match the origin requested, and `<html lang>` must be `ms`. Failing either is
  an ERROR and exit 2, never a clean run.
- **The way through** (UI-10) — `UI_GATE_BYPASS` sends Vercel's
  protection-bypass secret (vault key `vercelbypass.hellokahwin`, injected with
  `vault.ps1 run … -EnvVar UI_GATE_BYPASS`, so it never reaches a command line).
  Without it the gate can only run after a deploy has already reached
  production, which is the wrong side of the ship: detection alone tells you the
  preview is ungateable, it does not let you gate it.

---

## `fixtures/2026-08-31-pre-ui-fix/` — production, frozen while it was broken

Captured by the CEO on 31 Aug 2026 before any Sprint 04 fix shipped, and copied
here from `hellokahwin/docs/fixtures/2026-08-31-pre-ui-fix/` **byte for byte**:

| File            | Captured from                                                             | sha256              |
| --------------- | ------------------------------------------------------------------------- | ------------------- |
| `homepage.html` | `https://hellokahwin.com/` — 12 broken `.s-row` cards                     | `0c80c2c948a2e279…` |
| `article.html`  | `…/artikel/idea-dan-nasihat/garden-wedding` — the correct 3-child variant | `bb4ec9ecc418aec0…` |
| `category.html` | `…/artikel/hantaran-mas-kahwin` — zero images                             | `580906806f43bbc5…` |

The `<header>` element is **identical in all three** — 9,910 bytes, sha256
`482784ef8bc43159…`. That is worth knowing before reading a result: the 1,970px
nav rail is present on the negative control too, by construction, so any correct
overflow check reports it on all three files. The negative control disciplines
the `.s-row` check, which is what it was captured for.

### Why the CSS is vendored here and the JavaScript is not

The 44px column is a **computed** value. It does not exist in the HTML; it
appears only when `@media (min-width:1024px)` applies
`grid-template-columns: 44px minmax(0,1fr) 176px`. So the capture is useless
without its stylesheet — and the stylesheet was about to disappear, because
content-hashed chunks stop being served once the deployment that produced them
is superseded. All three CSS chunks and all four `woff2` faces were pulled from
production on 31 Aug 2026 and committed under `_next/static/`, so this input
stays reproducible after the fix ships. It already has: UI-01 and UI-02 deployed
the same afternoon.

The JavaScript chunks are deliberately absent. These pages are server-rendered,
the gate's server answers unvendored `/_next/**` requests with an empty 200, and
hydration would only add nondeterminism to a fixed input.

**Images are still fetched from `images.hellokahwin.com`.** The two defects this
capture exists to prove — the 44px column and the 1,970px nav — are pure CSS and
reproduce offline. The image checks do not: run the self-test without network
and the "all 13 homepage images decoded" assertions fail, correctly, because
they can no longer be verified.

## `fixtures/discriminator.html` — the near-misses

The production capture proves the gate catches two real defects. It cannot prove
the gate stays honest as it is edited, because every check there fires on the
same page: a check that quietly began flagging _everything_ would still look
right. This fixture puts a true positive next to a plausible false positive for
each of four of the six checks. Nine labelled cases; **five must produce exactly
nothing**, including the `h1.sr-only` pattern that was the gate's first real
false positive, found on its first run against production.

`reading-measure` (check 6, UI-10) has no discriminator case and does not need
one: its near-miss is a WIDTH, not a markup pattern, so it is disciplined on the
production capture instead. The same `article.html` fires at 768 and 1440 and
stays silent at 390 and at 1024, where 632px at 17px is 74.4 characters — just
under the 75 ceiling. A check that flagged 74.4 anyway would be a check with no
threshold, and that assertion is what proves it has one.

## `fixtures/green-control.css` — proof the gate can reach zero

One rule, injected at serve time under `--green`, never written to the fixture
HTML. It releases `min-w-max` on the masthead rail so the category row wraps,
and with it `category.html` goes to **0 violations at all four widths** while the
homepage's 13 narrow columns stay red. It is a measurement control, not a
proposed fix, and it should not be cited in a design decision.

---

## `fixtures/2026-09-01-pre-rail/` — the collapsed rail, frozen

Captured from live production on 01 Sep 2026 by UI-17, **before** the rail
shipped, from `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri` — the
article DES-03 §5.1 itself drew its frames from.

| File                                       | sha256                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `article.html`                             | `8553372a88d3b3799974de87e1166d21e271f1892573bf6ed196b1e98a4b6b98` |
| `_next/static/chunks/19b83a0982f1e330.css` | `14485c41aaa544f5e4cb865a2ab3157007bfb81e722e5169696dcdd4547d067e` |
| `_next/static/chunks/d0eb02e81ca49aac.css` | `b1537bfd30dc4addd53905e252405237c76f12547cc06fb4ee6b15ed5f7eb0b0` |
| `_next/static/chunks/eaa300a9560545ab.css` | `9164011ada1836175d60505f2e3ab694e925f2dbcaad81e5393f8288deaae90f` |

Fetched at `x-vercel-id sin1::sin1::xr226-1788200226176-073404b121ba`,
`x-vercel-cache MISS`, 145,191 bytes. All four `woff2` faces are vendored and
are byte-identical to the ones in `2026-08-31-pre-ui-fix/` — checked, not
assumed, because a measure taken in a fallback face is a measure of a page
nobody sees.

### What makes it a real known-bad input rather than a page with no rail

The distinction matters, and check 10 is built around it. This capture carries
**the collapsed composition**, not an absent one:

- `Rekod` renders at the body column's own left edge — measured 120px at 1440,
  where the body column also starts at 120px;
- there is no `[data-hk-rail]` anywhere in the document;
- a **narrower 280px** sidebar column DOES exist further right, so the page is
  not simply "one column". It had two right-hand columns of different widths,
  and the specified one was not among them.

A fixture that merely lacked a rail would make check 10 fire on the homepage,
the catalogue and `/brand` too. This one lets the check stay silent on those
and speak about the article.

### Both directions, on the same page

```
pnpm ui:gate --pre-rail            rail-collapsed 3   (1024, 1440, 1920)
pnpm ui:gate --pre-rail --green    rail-collapsed 0
```

`fixtures/rail-green-control.css` is the smallest edit that makes the SAME page
pass the SAME check — it moves the panel clear of the body column and changes
nothing else. It is **not** the fix and must not be read as one: a margin
displaces a block, it does not create a second column. The real change is
`.hk-article-grid`, and it is measured on the deployed build by
`scripts/measure-article-rail.mjs`.

Check 10 is also asserted SILENT at 390 and 768, where a stacked block is the
specification rather than a defect, and silent on all three 31 Aug fixtures at
all five widths. `pnpm ui:gate:selftest` carries all 24 assertions.

---

## `fixtures/2026-09-02-rail/` — the rail as it ships, and the two ways it breaks

UI-19. Captured from live production on 02 Sep 2026 **after** the rail shipped,
by `pnpm ui:rail:capture` (`scripts/capture-rail-fixture.mjs`). Re-verify at any
time with `node scripts/capture-rail-fixture.mjs --verify`, which re-fetches,
re-derives and compares without writing.

Four files: two production controls, one from each side of the CEO ruling that
`Sumber` renders only where sources exist, and two known-bad inputs derived from
them.

They are controls **for checks 13 and 14**, and that is narrower than "clean".
These are real production pages: `sourced-ok.html` carries a pre-existing
`narrow-text-column` finding — 6 at desktop, 15 at 390 — from `<td><p>` cells
72.7-117.3px wide in the article's own comparison table, which reproduces on the
live URL and predates this item. It is left standing rather than swapped for a
tidier article. Picking the fixture that hides an existing finding is how a
suite starts lying about what it covers.

| File                         | Captured from / derived by                                            | bytes   | sha256                                                             |
| ---------------------------- | --------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| `sourced-ok.html`            | `…/artikel/hantaran-mas-kahwin/hantaran-wajib-atau-adat`              | 136,981 | `b42a5b708a88363bcdbdb75e00e7da73ec8ee4d9d733c01de9ed46706a95b3a3` |
| `sourced-sumber-empty.html`  | the above, minus the `<li>` citations — 320 bytes at 24053..24373     | 136,661 | `01653ad2aaca7bd56f1697b230be2a6c972f76492163301e1f2e39b1606dc822` |
| `unsourced-ok.html`          | `…/artikel/ucapan-doa/doa-makan-majlis`                               | 117,910 | `2cf828fa6b651f57113d9c089a5437489a3a09425c58f07712896542bb19a899` |
| `unsourced-rail-absent.html` | the above, minus `<aside data-hk-rail>` — 8,065 bytes at 21015..29080 | 109,845 | `f6fb7e8e099621bf91e6230f3852f771458126af949ced6d946f844e15910a5e` |

Fetched `x-vercel-cache HIT` at `x-vercel-id sin1::sin1::h4qph-1788289926799-085a676c8784`
and siblings, CSS chunks `e754448c3010263a · 19b83a0982f1e330 · ece0345a72e045ca`.
All four `woff2` faces are vendored and were compared byte for byte against the
ones in `2026-09-01-pre-rail/` — **identical**, checked with `cmp`, not assumed.

> **These are the SECOND capture of the day, and that is recorded rather than
> tidied away.** The first, two hours earlier, carried CSS chunks
> `21fd3106af40c828 · 93b060e57eb15691`. Those hashes are gone: DES-15 and UI-20
> merged and deployed while UI-19 was being built, and a content-hashed chunk
> stops being served the moment its deployment is superseded. The re-capture
> happened by accident — importing `capture-rail-fixture.mjs` for two of its
> functions re-ran its top-level code and silently re-fetched production — which
> is why that module now carries a direct-run guard. **A rendered measurement
> belongs to a build, not to a URL.**

> The first capture also vendored **one** font, not four. The stylesheet writes
> `url(../media/…)` relative to `/_next/static/chunks/`, and the pattern used to
> find them was the absolute `/_next/static/media/…` shape the HTML uses in its
> single `<link rel=preload>`. The three unmatched faces would have been served
> as an empty 200 and every text measurement here would have been taken in a
> fallback stack. Fixed by resolving each `url()` against the stylesheet's own
> URL instead of matching an assumed shape.

### Why two controls and not one

`sourced-ok.html` is one of only **7 of 92** live articles carrying Rekod, the
contents list and Sumber together (measured 02 Sep 2026, `pnpm ui:sources`). The
rail's specified order had never been observed with all three present until this
item; the three articles the rail rig had been using as defaults carried at most
two.

`unsourced-ok.html` is the DoD's _article with no sources_, frozen — and it is
the near-miss that makes `sumber-empty` worth having rather than a text search.
That real page carries the word `Sumber` **twice**: once in the rail, as a
contents link (`<a href="#sumber">Sumber</a>`), and once in the prose, as
`<h2 id="sumber">Sumber</h2>` with a genuine reference list under it. It has no
rail `Sumber` block at all. A check keyed on the word fires here twice on a page
that is completely correct.

### The one-property claim is asserted, not described

`pnpm ui:gate:selftest` proves it at run time, in two halves, and the second
half took two attempts.

**There is only one region of difference.** Longest common prefix plus longest
common suffix must account for the bad file exactly. Touch a second place in
either file and this goes red.

**That region is the element named.** Not read off the prefix walk — the first
version of this assertion did exactly that and FAILED on a correct pair. A
longest-common-prefix boundary is ambiguous whenever the deleted text and what
follows share a leading byte, and here both continue `<`, so the prefix ran one
byte into the deletion and reported the range as `aside data-hk-rail=…</aside><`.
The right 8,065 bytes, shifted by one. The count was never wrong; the claim
about where the range _starts_ was not derivable that way.

So the second half is a splice: locate the element with
`capture-rail-fixture.mjs`'s **own** cut function — imported, not
re-implemented, so the gate and the capture cannot drift into disagreeing about
what was removed — remove it from the control, and require the result to equal
the committed bad file byte for byte.

```
unsourced-rail-absent.html differs from unsourced-ok.html in ONE contiguous region (8065 bytes removed)
…and splicing the whole <aside data-hk-rail> element, open tag to close, out of
   unsourced-ok.html reproduces unsourced-rail-absent.html byte for byte (8065 bytes at [21015, 29080))
sourced-sumber-empty.html differs from sourced-ok.html in ONE contiguous region (320 bytes removed)
…and splicing the <li> citations inside <ul class="hk-rail-sources">, and not the
   heading, out of sourced-ok.html reproduces sourced-sumber-empty.html byte for
   byte (320 bytes at [24053, 24373))
```

A diff claim that is only written down stops being true the moment somebody
edits the fixture.

### Both checks, both directions, and each silent on the other's defect

```
pnpm ui:gate:rail        (measured 02 Sep 2026, identical at 390/768/1024/1440/1920)
                         unsourced-ok.html            railgone:0  sumber:0
                         unsourced-rail-absent.html   railgone:1  sumber:0
                         sourced-ok.html              railgone:0  sumber:0
                         sourced-sumber-empty.html    railgone:0  sumber:1
```

The diagonal is the point. Both bad files are article pages with something wrong
in the rail, so a check that had drifted into _"something is wrong with this
rail"_ would fire on both and still look healthy from a failing run alone. The
off-diagonal zeros are what prove `rail-missing` and `sumber-empty` are two
checks rather than one wearing two names.

### `rail-missing` is not a rename of `rail-collapsed`

`rail-collapsed` (check 10, UI-17) asks a **relationship** question — is the rail
right of the body — and is deliberately silent when there is no rail, because a
"rail missing" verdict from a check that runs on seven templates fires on the
homepage, the catalogue and `/brand`. That silence is correct for check 10 and it
is precisely the hole UI-19 closes.

`rail-missing` (check 13) can speak about absence because it is gated on
`.hk-article-grid`, the article template's own container — one render site in
`src/`, and present in **none** of the five pre-UI-19 fixtures, which is why
check 13 is asserted CLEAN on all of them at all five widths. Its width floor is
**240px** and is not the specification: DES-03 §5.1's 300px belongs to
`scripts/measure-article-rail.mjs` (R2), which runs against the article template
specifically. 240 sits under both real widths — 300 in the desktop column, 350 in
the body column on a 390px phone — and far above what a collapse produces, so it
separates _gone_ from _there_ without giving a design number a second home to
drift between.
