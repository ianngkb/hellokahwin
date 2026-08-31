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
