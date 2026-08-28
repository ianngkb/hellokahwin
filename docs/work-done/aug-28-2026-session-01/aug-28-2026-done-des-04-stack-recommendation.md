# DES-04 — Front-end stack recommendation: Tailwind stays, Radix stays, the theme layer is what gets replaced — 28 Ogos 2026
**Session:** aug-28-2026-session-01 · **Owner:** design-systems-engineer · **Status:** completed
**Plan:** [aug-28-2026-brief-des-04.md](../../plans/aug-28-2026-session-01/aug-28-2026-brief-des-04.md)

This item is a decision, not a build. Nothing in the site repo was edited. The
gate on DES-05 lifts when the owner has read this.

---

## The short answer

| Question | Answer |
|---|---|
| Does Tailwind stay? | **Yes.** Tailwind v4, kept. What changes is where the theme is defined and what the base layer asserts — not the utility engine. |
| Do shadcn/Radix primitives stay? | **Two different answers.** **Radix stays, unconditionally.** **shadcn as a dependency goes** — it is a code generator we no longer generate from, and it contributes zero visual defaults. |
| What is being replaced, then? | `src/app/globals.css` — 2,320 lines carrying another brand's ratified design system — and the `cva` class strings vendored inside `src/components/ui/*.tsx`. Both are files we own. Neither is Tailwind and neither is Radix. |

The premise the sprint was planned on is close but not exact, and the
difference decides the whole item. Decision 100 recorded that the site "runs
Tailwind + shadcn defaults on Geist". Measured against production on 28 Ogos:
Tailwind is right, "shadcn defaults" is wrong, and "on Geist" is wrong.

---

## What the site actually runs (measured, 28 Ogos 2026)

Every number below came from `origin/master` at `59a4077` and from
`https://hellokahwin.com` fetched the same morning. The site repo was read
through `git show origin/master:<path>` and a throwaway `git archive` extract;
nothing was written to it.

### Tailwind

Tailwind **v4** (`tailwindcss: ^4`, `@tailwindcss/postcss`). There is no
`tailwind.config.js` and there never was one — `git ls-tree -r --name-only
origin/master | grep -i tailwind` returns only `postcss.config.mjs`. In v4 the
theme *is* CSS: `@theme inline { … }` inside `src/app/globals.css`, lines
46–163. So "changing the Tailwind config" and "changing the token layer" are
the same edit in the same file. That single fact carries most of the
recommendation.

`className` usage across the repo, counted by extracting every
`className="…"` and every `className={\`…\`}` and splitting on whitespace:

| Surface | `.tsx` files | class tokens |
|---|---|---|
| Reachable from a public route | 32 | **1,443** |
| Everything else (admin console, editors) | 104 | **4,038** |
| Total | 136 | 5,481 |

"Reachable from a public route" is a transitive import trace from the ten
entry files under `src/app/(public)/` plus `src/app/layout.tsx`, following
`@/…` specifiers until closure. 63 source files, 32 of them `.tsx`.

### The token layer is not shadcn's

`globals.css` is 2,320 lines and its sections are named in the file itself:

```
Light Mode — Quiet Luxury Palette
Dark Mode — Warm, Functional
Base Layer
Admin + vendor sans scope (AV-1)
Gated landing surfaces — serif throughout (Newsreader)
Admin + vendor console — "Monochrome Precision" token override
Design-system PREVIEW-ONLY — public surface inside the console
Typography Utilities / Utilities / Shimmer Animation / Reduced Motion
Inspire Editorial — Scoped Typography
Block Editor — Drag & Select States
Codebase Scan canvas (/admin/codebase-scan)
HelloKahwin — "Editorial Monotone" public surface
```

This is The Wedding Notebook's **"Plum Forward" v2 system**, ported wholesale.
The file cites its own provenance — `DESIGN.md, ratified 2026-07-04` — and
carries plum, brass, a z-index scale, motion tokens, two parallel radius
scales, and a maintained-but-deliberately-unwired dark palette. None of it is
shadcn's `neutral` baseColor default.

And the last section is the one that matters most: **the public site was
already re-skinned on 27 Ogos.** `src/app/(public)/layout.tsx` wraps everything
in `.hk-public`, and that scope redefines the whole palette to an ink-on-paper
monotone with editorial primitives — `.hk-eyebrow`, `.hk-display`, `.hk-rule`,
`.hk-deck`, `.hk-meta`, `.hk-btn`, `.hk-btn-ghost`, `.hk-chip`,
`.hk-card-title`, `.hk-measure`, `.hk-edge`. It landed in `78cd345` (UX-03),
carries its own measured contrast ratios in comments, squares off the inherited
rounded cards, and rewrites the reading column to 17px serif at 1.7.

It is live. From the CSS the browser actually downloads
(`/_next/static/chunks/398a50629b70b299.css`, HTTP 200, 141,378 bytes raw /
26,113 gzip):

```
.hk-public{--background:#fcfbfa;--foreground:#151412;--muted-foreground:#595855;
--border:#dad9d7;--border-strong:#93928f; …}
```

Contrast, recomputed from those served hex values rather than trusted from the
source comment:

| Pairing | Measured | Source comment | Verdict |
|---|---|---|---|
| ink `#151412` on paper `#fcfbfa` | **17.81:1** | 17.8:1 | matches |
| `--muted-foreground #595855` on paper | **6.88:1** | 6.89:1 | matches |
| `--border-strong #93928f` on paper | **3.01:1** | 3.006:1 | matches, clears 1.4.11 |
| `--border #dad9d7` on paper | **1.36:1** | 1.365:1 | matches, decorative only |

That is a token layer written by someone who measured. It is not the thing to
throw away; it is the thing the new register should replace *deliberately*,
knowing what it costs.

### "on Geist" is not true of the public site

Production ships **zero webfont bytes** on the homepage. `@font-face` count in
the served CSS: **0**. `woff2` references in the served HTML: **0**. `--font-geist`
resolves to a system stack:

```
--font-geist: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, …
--font-cormorant: Georgia, "Times New Roman", Times, serif
```

`next/font/google` loads Geist in exactly one place — `src/app/(admin)/layout.tsx`.
Readers never download it. The public serif voice is Georgia.

This is not an accident and it is not a defect. The `.hk-public` comment states
the reasoning: the audience is mostly low-end Android on slow data, so the type
stack stays system fonts. Any new register that names a webfont is spending a
budget the current site does not spend, and that trade needs to be made on
purpose. See "What would make this wrong" (F3).

### The component tree

28 files under `src/components/ui`. Of those, **15 import from `radix-ui`** —
but two of them (`button.tsx`, `chip.tsx`) import only `Slot`, which is a
composition helper with no accessibility behaviour at all. So:

- **13 of 28 wrap a real Radix behavioural primitive** — AlertDialog, Checkbox,
  Dialog, DropdownMenu, Label, Popover, Select, Separator, Sheet, Slider, Tabs,
  Toggle, Tooltip.
- **13 of 28 are hand-written** with no Radix anywhere — badge, console-table,
  console-table-scroller, empty-state, filter-pills, form-field, input,
  pagination, progress, section-card, sonner, stat-card, textarea.
- **2 of 28 use `Slot` only.**

Now the number that decides the cost question. The public site — the surface
this redesign is about — reaches exactly **three** of those 28 components:

```
src/components/ui/button.tsx
src/components/ui/chip.tsx
src/components/ui/pagination.tsx
```

`pagination.tsx` has no Radix import. `button.tsx` and `chip.tsx` import only
`Slot`. **The public site ships no Radix behavioural primitive today.** The
other 25 components, and all 13 Radix-backed ones, exist for the admin console.

### The dependency called `shadcn` contributes no look

`globals.css` line 3 is `@import 'shadcn/tailwind.css'`. That file is
`node_modules/shadcn/dist/tailwind.css`, **1,669 bytes**, and its entire
contents are two accordion keyframes and nine `@custom-variant` declarations
that map Radix data attributes to Tailwind variants — `data-open`,
`data-closed`, `data-checked`, `data-selected`, `data-disabled`,
`data-active`, `data-horizontal`, `data-vertical`, plus a `no-scrollbar`
utility. Not one colour. Not one radius. Not one font.

The "shadcn look" people are objecting to lives in the `cva` strings inside our
own vendored `src/components/ui/*.tsx` — and even those are no longer shadcn's.
`button.tsx` opens with:

> `// Plum Forward v2 (DESIGN.md · Components · Button). Rectangular caps buttons;`

Seven variants, uppercase 11px labels at 0.14em tracking. That is TWN's
ratified button, not shadcn's.

### What already exists in the new register

Two branches are pushed and unmerged, both authored 28 Ogos:

| Branch | Files | What it is |
|---|---|---|
| `origin/feat/des-05-design-system-reference` (`679e476`, 10:17) | 3 files, +599 | `/admin/design-system` reference page + `tokens.css` (338 lines) scoped to `.hk-ds` |
| `origin/feat/des-10-brand-page` (`ecc8ef0`, 10:50) | 8 files, +667 | `/brand` + five outlined wordmark SVGs + `brand.css` (316 lines) scoped to `.bp` |

Neither is live. Negative control against the production CSS — every one of
these strings returns a count of **0**: `hk-ink-900`, `hk-ds`, `bp-gold`,
`Fraunces`, `Archivo`, `Bodoni`. And `https://hellokahwin.com/brand` returns
**404**, `https://hellokahwin.com/admin/design-system` returns **404**, while
`https://hellokahwin.com/artikel` returns **200**. The new register exists in
git and nowhere else.

Both branches were written as **hand-authored plain CSS with custom
properties, bypassing Tailwind entirely.** `brand.css` says so in its own
header: *"Tokens are duplicated here rather than imported from the admin
reference because DES-05 has not adopted them site-wide yet."* Two files, two
copies of the same palette, already drifting on day one. That is the strongest
argument in this document for settling the stack now.

---

## What I argued this against

The brief says to argue against the DES-01 art direction as it actually exists.
**It does not exist as a document.** `docs/sprints/sprint-03.json` has DES-01 at
`state: todo` and DES-03 at `state: todo`; there is no rationale file and no
HTML specification artifact anywhere under `docs/`. I am stating that plainly
rather than pretending to have read one.

What does exist, and what I read this against:

1. **Decisions 100–117** in `docs/boardroom/decision-log.md` — the owner
   directive, the editorial-premium positioning, the locked Carats & Cake
   wordmark register, the mobile constraint, and the correction that "Malay
   diacritic coverage" is a much weaker gate than three personas were written
   to believe.
2. **`tokens.css` on `feat/des-05-design-system-reference`** — the proposed
   palette, type stack and spacing scale, in code.
3. **`brand.css` on `feat/des-10-brand-page`** — the same register applied to a
   real public page.

Between them that is a concrete direction: warm sand paper, near-black ink,
ochre gold as the single accent, oxblood and a muted tenun green as
supporting colours, a Didone display face, `--radius: 0`, `--elevation: none`.
It is enough to decide a stack against. If DES-01 lands somewhere materially
different, falsifier F1 below is the one that fires.

**I checked its contrast myself rather than trusting its comments.** The four
corrections the file documents all verify exactly:

| Pairing | Measured | tokens.css claims |
|---|---|---|
| `--fg #16130f` on `--page #edeae1` | 15.39:1 | — |
| `--fg-mute #615c4e` on `--surface-raised #dad5c6` | **4.55:1** | 4.55 |
| `--accent #725825` on `--surface-raised` | **4.56:1** | 4.56 |
| `--quiet #55604c` on `--surface-raised` | **4.52:1** | 4.52 |
| `--critical #6b2130` on `--page` | 9.26:1 | — |
| dark: `--fg #ede8dc` on `--page #14110d` | 15.40:1 | — |
| dark: `--accent #c9a45c` on `--page` | 8.02:1 | — |
| dark: `--critical #c26e7f` on `--page` | **5.23:1** | 4.54 (measured against a different ground) |

Every text pairing clears AA. **One gap, and it is the same gap `.hk-public`
already found and fixed once:** the proposed palette has no token at 3:1
against its own page. `--rule #c6bfac` measures **1.52:1** and `--rule-accent
#a8823c` measures **2.95:1** — fine as decorative hairlines, both short of
WCAG 1.4.11 if either ever draws the boundary of a control. The live site
solved this with `--border-strong` at 3.01:1 and wrote the reasoning into the
`.hk-chip` comment. The new register needs the equivalent token before any
control is built on it. That is a DES-05 input, recorded here so it is not
rediscovered in production.

**Typeface licences, since the register names four faces and none is loaded
anywhere yet.** All four sit under `ofl/` in the `google/fonts` repository with
an `OFL.txt` returning HTTP 200 — Fraunces, Archivo, IBM Plex Mono, Bodoni
Moda. SIL Open Font License, no cost, self-hostable. `ivyora-display`, the face
Carats & Cake actually use, is Adobe Fonts and is a subscription, which is
DES-13's call, not mine. On diacritics: decision 117 is right and my own
persona was wrong — Malay in Rumi is plain Latin and coverage is not the
constraint here. Licence and cost are.

---

## (a) Does Tailwind stay?

**Yes.** Keep Tailwind v4.

The reason is not inertia. It is that in v4 the theme is a CSS file, so
"replace the visual defaults" and "keep the utility engine" are not in tension
the way they were in v3. There is no JavaScript config asserting a palette, no
`extend` block to fight, no plugin chain. `@theme` declares custom properties;
Tailwind generates utilities from them. Delete the token block and the
generic look goes with it, and every layout utility — grid, flex, spacing,
breakpoints, container queries — is untouched.

Against that, removing Tailwind means rewriting **5,481 class tokens across 136
files**, of which **4,038 (74%) are in the admin console** — a surface nobody
asked to redesign, that no reader ever sees, and where a rewrite buys exactly
nothing. Paying that to change how an article page looks is the wrong trade by
a wide margin.

### What exactly changes

Five edits, all in the site repo, all named:

1. **`src/app/globals.css` is split.** The 2,320-line file becomes:
   - `src/design-system/theme.css` — HelloKahwin's own `@theme` block and the
     primitive + semantic token layers, light and dark defined together.
   - `src/design-system/base.css` — the `@layer base` element defaults, rewritten
     against the new type scale.
   - `src/styles/legacy-console.css` — everything Plum Forward, imported by
     `src/app/(admin)/layout.tsx` only, so it is physically unable to reach a
     reader. It ships as-is; the console is not in scope and touching it is
     risk with no return.

   Today the split is worth making on weight alone: at least **6,317 bytes
   (4.5%)** of the CSS every reader downloads is console-only — the
   `.font-ui-sans` / `.ds-surface-console` override, the `/admin/codebase-scan`
   canvas, the concierge widget rule. That figure is a floor, not a total: it
   counts only top-level blocks whose selector names a console-only class, and
   under-attributes anything nested inside an `@media` or `@supports` wrapper.

2. **`@theme` is rewritten, not extended.** Primitive tokens (`--hk-ink-900`,
   `--hk-sand-100`, `--hk-gold-700`) and semantic tokens (`--page`, `--fg`,
   `--rule`, `--accent`) as two layers, with components consuming semantics
   only. The `tokens.css` on `feat/des-05-design-system-reference` is already
   this shape and should be lifted into it rather than rewritten. Its `.hk-ds`
   scope was correct while the gate was open; with the gate closed it moves to
   the root and `brand.css`'s duplicated block gets deleted, which is what its
   own comment asks for.

3. **`@layer base` becomes the guard against drift.** Today it sets `h1`–`h4`
   and `p` to the inherited editorial scale. Rewritten against the new type
   scale, plus `--radius: 0` and `--elevation: none` as real tokens, this is
   what stops `rounded-lg` and `shadow-md` creeping back — a `rounded-md` that
   resolves to `0` is a no-op rather than a defect. There are **258 `rounded*`
   occurrences** in `src/` to sweep, and the sweep can be incremental because
   the token makes them harmless in the meantime.

   Related, and worth fixing while in there: the comment above the radius scale
   claims *"~478 existing `rounded-sm/md/lg` utilities"*. In this repo the real
   count is **92**. The number came across with the port from TWN and was never
   re-measured. It is a small thing that would have made a migration look four
   times more expensive than it is.

4. **`.hk-public` is retired into the theme, not deleted.** Its primitives are
   the right primitives — eyebrow, display, rule, deck, meta, chip, measure —
   and its contrast work is sound and verified above. They become semantic-token
   components under `src/design-system/`. What changes is the palette they
   consume and the type stack they name.

5. **Dark mode gets built, because right now there is none.** Production has
   **zero** `prefers-color-scheme` rules in its CSS, no `.dark` class on
   `<html lang="ms">`, and no dark variant of `.hk-public` at all. The
   inherited `.dark` block is maintained but unwired by a decision recorded in
   the file on 2026-07-14. DES-03's DoD requires light **and** dark. That is new
   work in this stack decision's budget, not a carry-over — and it must be
   built the way `tokens.css` already does it: full light palette first, dark
   redefining only the semantic layer, both the unstamped system state and an
   explicit stamp covered.

### What stops the defaults leaking back

Four mechanics, in the order they catch things:

- **No hex literal outside `src/design-system/`.** Current baseline is clean —
  `grep -rhoE '#[0-9a-fA-F]{6}' src/components src/app --include=*.tsx` returns
  **0**. This is a rule to preserve, not one to establish, which makes it cheap
  to enforce in CI from day one.
- **`--radius: 0` and `--elevation: none` as real tokens**, so the shape
  decision is something to argue with rather than a gap someone fills in.
- **`components.json` deleted** — see (b). While it exists, `shadcn add`
  regenerates stock components against `baseColor: neutral` and reintroduces
  the exact defaults being removed.
- **The `/design-system` reference page reads tokens from the system itself**,
  so it cannot render a value the site does not have, and it updates in the same
  change as any token. That page is the regression test for taste, and it
  already exists in draft form on `feat/des-05-design-system-reference`.

---

## (b) Do shadcn/Radix primitives stay?

These are two questions wearing one name, and the brief is right that
collapsing them is how a team throws away accessibility to fix a look. So,
separately:

### Radix: stays. Not negotiable, and not close.

Thirteen components wrap a real Radix primitive. What each buys is behaviour
nobody should hand-write twice: focus trapping and restoration, `aria-expanded`
and `aria-controls` wiring, roving tabindex, typeahead in Select, Escape and
outside-click dismissal, scroll locking, portal + collision-aware positioning,
`aria-checked` on non-native controls, and correct pointer/keyboard parity on
touch.

Radix is **behaviour with no opinion about appearance.** Its unstyled primitives
render with no colour, no radius, no font. Nothing in Radix produces the generic
look. Removing it to change how the site looks would cost weeks and remove no
pixels.

There is a version of the argument that says: the public site reaches no Radix
primitive today, so who cares? That argument is wrong for two reasons.

First, **DES-06 is search**, and decision 108 put it in scope. Search means a
combobox — `aria-expanded`, `aria-controls`, `aria-activedescendant`, arrow-key
navigation over a listbox that the input keeps focus inside, correct
announcement of result counts, and Escape semantics that differ between
clearing a query and closing a panel. That is one of the most-failed patterns
in web accessibility. On a site where 64% of impressions arrive on mobile and
readers are hunting a specific hall or a specific state's rate, this is the
single most important interactive component the redesign will ship. Writing it
from scratch to avoid a dependency that costs nothing visually would be a
choice to fail slowly.

Second, the same reasoning covers the mobile navigation sheet, any filter
popover from DES-06, and the dialogs DES-07 will specify. The public surface
does not use Radix today because it has almost no interaction today. That
changes this sprint.

**Recommendation: keep `radix-ui@^1.4.3`. Restyle the 13 wrappers by replacing
their `cva` strings with semantic tokens. Do not touch their behaviour, their
`data-*` contracts, their `asChild` composition, or their ref forwarding.**

### shadcn: goes as a dependency. Keep the code it already wrote.

shadcn is a generator, not a runtime. Its output is vendored source under
`src/components/ui/` that we own and have already rewritten. Three things
follow:

1. **`shadcn@^3.8.4` (devDependency) is removed.** With one caveat that matters:
   `globals.css` imports `shadcn/tailwind.css` at runtime. Those 1,669 bytes are
   nine Radix data-attribute variants and two accordion keyframes, and the
   restyled components depend on them. They get **copied into
   `src/design-system/variants.css`** — attribution kept in a comment — and the
   import switched. Deleting the package without copying that file breaks every
   `data-open:` and `data-checked:` utility in the tree, silently, because
   Tailwind simply will not generate a variant it has never heard of.

2. **`components.json` is deleted.** It is the standing invitation for
   `shadcn add` to drop a stock `new-york` / `neutral` component into a repo
   that has deliberately left those defaults behind. Keeping it is keeping the
   leak open.

3. **`lucide-react` stays, for now, and gets audited separately.** It is not a
   shadcn dependency and it is not a style system; it is an icon set, imported
   in 63 files, 23 of them public-reachable. Decision 100 named lucide as part
   of the generic look and that is fair as far as it goes — a hairline
   editorial register may want a thinner, more drawn set. But that is an art
   direction call for DES-03, it is per-icon and reversible, and it does not
   belong in a stack decision. Recorded so it is not lost.

**What stays after all of that:** every component file, every Radix wrapper,
`class-variance-authority`, `tailwind-merge`, `clsx`. What goes: one
devDependency, one config file, and the class strings we replace anyway.

---

## (c) The cost of each option, in work and in risk

Options priced against the real files. "Public restyle" means the three page
types in DES-08 plus the DES-06 search surface.

### Option 1 — Keep Tailwind, keep Radix, replace the theme layer. **Recommended.**

**Work.** Split `globals.css` (2,320 lines) three ways. Write
`src/design-system/theme.css` from the existing `tokens.css` (338 lines,
already the right shape). Build the dark layer, which does not exist. Restyle
the three public-reachable components (`button`, `chip`, `pagination`) plus
whatever DES-06 adds. Fold `.hk-public`'s ten primitives into token-consuming
components. Sweep 258 `rounded*` occurrences opportunistically, made safe by
`--radius: 0`. Copy `shadcn/tailwind.css` locally, delete two files from the
dependency surface. Build the `/design-system` reference page — draft already
pushed.

**Risk.** Low and well-bounded. The console keeps its stylesheet, scoped, so a
regression there is very hard to produce. The public class tokens number 1,443,
which is a readable diff. The one real hazard is the `shadcn/tailwind.css`
copy: miss it and Tailwind drops nine variants without erroring, and the
failure shows up as a dropdown that stays visually closed while being open. It
is named here so it is checked rather than discovered.

**What it does not fix.** The console and the public site end up on two
different systems for as long as that lasts. That is the correct trade — one
consumer, one repo, and a console redesign nobody has asked for — but it should
be written down rather than discovered later.

### Option 2 — Keep Tailwind, drop shadcn *and* Radix, hand-roll the primitives.

**Work.** Everything in Option 1, plus reimplementing 13 behavioural components
including Dialog, Select, DropdownMenu, Popover and Sheet, plus the combobox
DES-06 needs, plus their focus management, portalling, collision detection and
scroll locking, plus a keyboard and screen-reader test pass for each.

**Risk.** High, and the failures are the invisible kind. Nothing in this option
changes a single pixel that Option 1 does not also change — Radix ships no
appearance. It is pure cost.

**Not recommended, and this is the false pass the brief names.** It is what
"shadcn looks generic, so rip out shadcn" turns into once someone notices that
`radix-ui` is what `src/components/ui` actually imports.

### Option 3 — Drop Tailwind, hand-author CSS (what both new-register branches did).

**Work.** Rewrite 5,481 class tokens across 136 files, 4,038 of them in an
admin console with no brand value. Replace Tailwind's responsive variants,
state variants and `@custom-variant` layer with hand-written media and
attribute selectors. Rebuild the utility vocabulary the team already knows.

**Risk.** High and long-tailed. The failure mode is visible on both branches
already: `brand.css` duplicates `tokens.css`'s palette by hand, admits it in a
comment, and now two files must be kept in step by memory. Multiply that by
every surface. Hand-authored CSS in a repo this size is not more controlled
than tokens plus utilities — it is the same decisions, spread across more files,
with nothing generating them.

**Not recommended.** But note the honest part: the two branches chose it for a
good local reason — they needed a surface that could not inherit the current
site styling, and a scoped stylesheet was the fastest way to get one. That was
right for a preview. It is wrong as an architecture, and the duplication that
appeared within 33 minutes of the first file is the evidence.

### Option 4 — Keep everything, restyle in place, no split.

**Work.** Least of any option. Override tokens inside `.hk-public` the way
UX-03 already did.

**Risk.** This is how the site got here. `globals.css` grows a fourteenth
section, the console tokens keep shipping to readers, the two radius scales
become three, and the next engineer inherits 2,600 lines with no boundary
between what is HelloKahwin's and what is TWN's. The current file is a fair
warning about where this ends.

---

## (d) What would make this recommendation wrong

Real conditions, each with the observation that would trigger it.

**F1 — DES-01 lands on a register that needs per-character or per-word
typographic control.** If the art direction turns out to depend on optical
sizing, variable-font axes driven per element, real small caps, or
figure-set switching mid-paragraph, Tailwind's utility vocabulary stops helping
and the arbitrary-value syntax gets ugly fast. *Trigger:* the DES-03 artifact
specifies type in ways that need more than a scale plus tracking and
leading. *Consequence:* Tailwind stays for layout, and typography moves into
hand-authored component CSS consuming the same tokens. Not a full reversal —
a boundary moves.

**F2 — I am wrong that DES-05 can leave the console alone.** I have assumed the
console keeps Plum Forward indefinitely. If the owner wants one system across
both surfaces, the 4,038 admin class tokens re-enter scope and Option 3's cost
argument weakens sharply, because the rewrite is happening anyway. *Trigger:*
an owner decision that the admin console adopts the new register. *Consequence:*
re-price Options 1 and 3 against each other; Option 1 probably still wins, but
by much less.

**F3 — The webfont budget turns out to be unaffordable.** The register names
Fraunces, Archivo, IBM Plex Mono and Bodoni Moda. The site currently ships
**zero** webfont bytes against a homepage that already carries 182,228 bytes of
gzipped JavaScript and 26,113 of gzipped CSS, for an audience the codebase
itself describes as low-end Android on slow data — and DES-09 will set an LCP
budget this has to fit inside. Four subsetted variable faces are plausibly
120–200 KB more. *Trigger:* DES-09's LCP budget cannot be met with the faces
loaded, or a measurement shows a real regression. *Consequence:* the display
face is loaded and the body stays system — which changes the type layer of the
token system, not the stack. This one is likely enough that it should be
measured in DES-05 rather than waited for.

**F4 — The `@theme` rewrite proves not to be surgical.** My claim that
replacing the theme block is cheap rests on Tailwind v4's CSS-first config and
on hex literals already being at zero outside the token modules. If the
inherited utilities turn out to be entangled with `:root` values in ways the
grep did not show — the two coexisting radius scales are the obvious candidate,
and the stale "~478" comment shows nobody has re-measured that area — the edit
is wider than described. *Trigger:* the split produces visual regressions on
public pages that token values alone cannot fix. *Consequence:* the console
split happens first as its own change, and the theme rewrite follows against a
smaller file.

**F5 — A second consumer appears.** The whole "system lives inside the site
repo" premise (decision 107) holds because there is exactly one consumer. A
second surface — a separate marketing site, a native shell, a partner embed —
turns "no package versioning ceremony" from correct into a liability. *Trigger:*
a second surface is commissioned. *Consequence:* extract `src/design-system/`
into a workspace package. The token/component boundary recommended here is what
makes that extraction possible, which is a point in its favour either way.

**F6 — Radix's own accessibility turns out not to be the asset I claim.** I
have argued from what the primitives do rather than from testing this site's
wrappers with a screen reader — no such test has been run here, by anyone.
*Trigger:* an audit finds the wrappers have broken what Radix provides. *Consequence:*
the fix is repairing wrappers, not removing Radix — but my confidence in
"unconditionally" would be overstated and should be corrected.

---

## Recommendation, stated once

1. **Keep Tailwind v4.** Replace the theme layer, not the engine.
2. **Keep Radix.** Restyle the wrappers; touch no behaviour.
3. **Drop `shadcn` the devDependency and `components.json`** — after copying
   `shadcn/tailwind.css` into `src/design-system/variants.css`.
4. **Split `globals.css` three ways**, and scope everything Plum Forward to the
   admin layout so it cannot reach a reader.
5. **Lift `tokens.css` from `feat/des-05-design-system-reference`** into the
   real theme layer and delete `brand.css`'s duplicated block.
6. **Build dark mode.** It does not exist today and DES-03 requires it.
7. **Add a 3:1 boundary token** to the new palette before any control is built
   on it. `--rule-accent` measures 2.95:1 and will not carry a control edge.

**DES-05 does not start until the owner has read this.** Point 5 in particular
touches a branch someone else pushed this morning.

---

## Ship state

Documents only; no site code was written. The site repo was read through
`git show origin/master:<path>`, a `git archive` extract into a temp directory,
and one `git fetch origin` to make sure `origin/master` was current. Its working
tree was not touched.

**Commit:** see Evidence
**On `origin/feat/command-centre-dashboard`:** yes
**Deployed:** n/a — docs repo
**Still uncommitted in the tree:** none

---

## Evidence

**Site repo state, and that it was read rather than edited**

```
$ cd /c/Users/Ian\ Ng/Documents/Code/hellokahwin-site
$ git log --oneline -1 origin/master
59a4077 fix(ux-03): put the masthead's accessible name on the <nav>, not on a bare <div> (#9)
$ git status -sb
## master...origin/master [behind 63]
?? .tmp-c62/          # pre-existing, not mine
```

**Component census**

```
$ git ls-tree -r --name-only origin/master src/components/ui | wc -l
28
$ for f in $(git ls-tree -r --name-only origin/master src/components/ui); do
    echo "$(git show origin/master:$f | grep -c radix-ui)  $f"; done | grep -c '^1'
15
$ for f in src/components/ui/*.tsx; do grep -o "import { [^}]* } from 'radix-ui'" $f; done
… Slot (button, chip) + 13 behavioural primitives …
```

**Transitive public reachability** (`/tmp/trace2.py`, entry points =
`src/app/(public)/**` + `src/app/layout.tsx`, resolving `@/…`):

```
public-reachable .tsx files: 32
className tokens in public-reachable tree: 1443
all .tsx: 136 tokens: 5481
non-public .tsx: 104 tokens: 4038
reachable ui components: 3
   src/components/ui/button.tsx
   src/components/ui/chip.tsx
   src/components/ui/pagination.tsx
of which wrap Radix: 2 ['button.tsx', 'chip.tsx']   # both import Slot only
```

**The artifact the reader receives** — not the source

```
$ curl -sS -o home.html -w "status=%{http_code} bytes=%{size_download}\n" https://hellokahwin.com/
status=200 bytes=80782
$ grep -o 'href="[^"]*\.css[^"]*"' home.html
href="/_next/static/chunks/398a50629b70b299.css?dpl=dpl_F5167dU7CpzegpfMXWnVDTB6Y8j2"
$ curl -sS -o prod.css -w "%{size_download}\n" "https://hellokahwin.com/_next/static/chunks/398a50629b70b299.css?dpl=…"
141378
$ curl -sS -o /dev/null -w "%{size_download}\n" -H "Accept-Encoding: gzip" "…"
26113
$ grep -c '@font-face' prod.css ; grep -c 'woff2' home.html
0
0
$ grep -o 'prefers-color-scheme:[a-z ]*' prod.css | wc -l
0
$ grep -o '<html[^>]*>' home.html
<html lang="ms">
```

Positive control, from the served CSS:

```
.hk-public{--background:#fcfbfa;--surface-subtle:#f5f4f1;…--foreground:#151412;
--muted-foreground:#595855;…--border:#dad9d7;--border-strong:#93928f;…}
```

**Negative control** — the new register is not live:

```
hk-ink-900     0
hk-ds          0
bp-gold        0
Fraunces       0
Archivo        0
Bodoni         0

https://hellokahwin.com/brand                 404
https://hellokahwin.com/admin/design-system   404
https://hellokahwin.com/artikel               200
```

**Contrast** — WCAG 2.x relative luminance, computed from the served hex values
and from `tokens.css`, script at
`…/scratchpad/cr.py`. Live `.hk-public`: 17.81 / 6.88 / 3.01 / 1.36.
Proposed register light: 15.39 / 8.01 / 5.54 / 5.56 / 9.26 / 4.55 / 4.56 / 4.52.
Proposed register dark: 15.40 / 9.95 / 5.22 / 8.02 / 10.22 / 5.23 / 5.40.
Rules: `--rule` 1.52:1, `--rule-accent` **2.95:1** — short of 1.4.11's 3:1.

**Page weight, for the DES-09 budget**

```
$ for c in $(grep -o '/_next/static/chunks/[^"]*\.js' home.html | sort -u); do
    curl -sS -o /dev/null -w '%{size_download}\n' -H 'Accept-Encoding: gzip' "https://hellokahwin.com$c"; done
TOTAL JS gzip bytes on / : 182228   (12 chunks)
CSS gzip: 26113
Webfonts: 0
```

**Typeface licences**

```
$ curl -s -o /dev/null -w '%{http_code}' https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/OFL.txt
200      # same for archivo, ibmplexmono, bodonimoda
```

**Counts quoted in the argument**

```
$ grep -rhoE 'rounded[a-z0-9-]*' src | wc -l            → 258
$ grep -rhoE 'rounded[a-z0-9-]*' src | sort | uniq -c   → rounded-md 63, rounded-full 52,
                                                          rounded 49, rounded-card 38,
                                                          rounded-lg 16, rounded-sm 7, …
   (sm/md/lg incl. directional = 92, against the file's own "~478")
$ grep -rhoE '#[0-9a-fA-F]{6}' src/components | wc -l   → 0
$ grep -rhoE '#[0-9a-fA-F]{6}' src/app --include=*.tsx | wc -l → 0
$ grep -rl 'lucide-react' src | wc -l                   → 63   (23 public-reachable)
$ wc -c node_modules/shadcn/dist/tailwind.css           → 1669
$ git show origin/master:src/app/globals.css | wc -l    → 2320
```

---

## What it changed

- **The DES-05 gate lifts.** The stack is decided and recorded, with the two
  questions answered separately as the DoD demanded.
- **A premise the sprint was planned on is corrected.** Decision 100 described
  the site as "Tailwind + shadcn defaults on Geist". It is Tailwind + TWN's
  ratified Plum Forward system + a HelloKahwin Editorial Monotone override, on
  system fonts with zero webfont bytes. DES-05 and DES-08 were both about to be
  built against the wrong description of what they are replacing.
- **The false pass is closed with numbers.** "shadcn looks generic" and "Radix
  must go" are now separated by evidence: the shadcn package ships 1,669 bytes
  containing no colour, no radius and no font, and 13 components depend on Radix
  for behaviour that has nothing to do with appearance.
- **Two accessibility findings for DES-05, before anything is built on them:**
  the proposed palette has no 3:1 boundary token, and the public site has no
  dark mode at all while DES-03 requires one.
- **A duplication caught at 33 minutes old.** `brand.css` and `tokens.css` hold
  the same palette by hand. Point 5 of the recommendation deletes one of them.

---

## Retrospective

**1. What did we learn that is not written down anywhere?**

That **the redesign's starting point was misdescribed, and every design item was
about to be built against the wrong description.** "Tailwind + shadcn defaults
on Geist" is what a site of this shape usually is, and it is what a fetch of the
live HTML looks like if you check `bg-background` and stop. What is actually
there is another company's fully ratified design system — TWN's Plum Forward,
`DESIGN.md` of 2026-07-04 — ported wholesale, plus a careful ink-on-paper
override that UX-03 shipped on 27 Ogos with its contrast ratios measured and
commented. The generic look is inherited, not default, and the difference
decides whether the fix is "configure Tailwind properly" or "unpick another
brand's system".

Second, smaller, and the same shape: **a ported file carries ported facts.**
`globals.css` warns that ~478 `rounded-sm/md/lg` utilities depend on the legacy
radius scale. The real count here is 92. The number was true in the repo it came
from. Nobody re-measured it on arrival, and it has been sitting there making a
cheap migration look expensive.

**2. Which document must change, and who owns that edit?**

- `docs/boardroom/decision-log.md` — decision 100's stack description needs
  correcting on the record, not quietly superseded. **Mine.** Done below as
  decisions 118–121.
- `docs/boardroom/ceo-memory.md` — line 30 describes the site as
  "Tailwind/shadcn" with no mention of the ported system or the zero-webfont
  choice, which is why the misdescription survived into a sprint. **Mine.**
  Done.
- `docs/work-done/README.md` — index row. **Mine.** Done.
- The `~478` comment in `src/app/globals.css` — **not mine to edit in this
  item**, which is read-only on the site repo. It is written into the
  recommendation as a DES-05 task rather than named and left, because naming a
  file I am forbidden to touch and calling that a retrospective edit would be
  the failure this section exists to prevent.

**3. What did we do twice that we should never repeat?**

The palette was written twice: `tokens.css` on one branch at 10:17 and
`brand.css` on another at 10:50, by hand, with the duplication acknowledged in a
comment at the moment it was created. Thirty-three minutes. Both branches did it
for the same reason — no decided stack, so no shared place to put a token — and
that reason is now gone. Recommendation point 5 deletes one of the two copies.

The wider version: **DES-05 was built before its gate opened.** The branch is
dated this morning, DES-04 is the gate, and `sprint-03.json` still has DES-05 at
`todo`. It is not wasted work — `tokens.css` is well made and this
recommendation lifts it — but the gate did not hold, and a gate that does not
hold is not a gate. Worth the sprint retro's attention rather than mine.

**4. What did we nearly ship, and what caught it?**

A recommendation arguing that Radix should stay **on the grounds that the public
site depends on it** — which is false. The trace says the public site reaches
three of 28 components and imports `Slot` twice, and `Slot` is a composition
helper with no accessibility behaviour. Had I asserted the usual "Radix
accessibility is load-bearing here" without counting, the first person to grep
would have found the opposite and the whole document would have lost its
standing. What caught it was running the transitive trace instead of trusting
the shape of the argument. The real case for Radix is DES-06 — search is a
combobox, and that is where it earns its keep — which is a better argument and
one I would not have found by assuming.

Nearly shipped a second time: repeating `tokens.css`'s contrast figures from its
comments. They turned out correct to the second decimal, which is a credit to
whoever wrote them — but recomputing is what turned up `--rule-accent` at
2.95:1, a number no comment mentions, on a palette with no 3:1 boundary token
at all.

---

## Follow-ups

- **Owner:** read and accept, or send back. DES-05 is gated on it.
- **DES-05 (`design-systems-engineer`)** inherits, in order: the `globals.css`
  three-way split; lifting `tokens.css` into the real theme layer and deleting
  `brand.css`'s duplicate block; copying `shadcn/tailwind.css` before removing
  the package; adding a 3:1 boundary token; building dark mode; correcting the
  `~478` comment; measuring the webfont cost against DES-09's LCP budget (F3).
- **DES-03 (`creative-director`):** the artifact does not exist and this
  recommendation was argued against decisions 100–117 plus the two pushed
  branches instead. If it lands materially different, F1 is the falsifier to
  check first.
- **Sprint governance:** DES-05 was built before its gate opened. For the sprint
  retro, not for this item.
- **`lucide-react`:** 63 import sites, 23 public-reachable. An icon-set decision
  for DES-03, deliberately kept out of the stack decision.
