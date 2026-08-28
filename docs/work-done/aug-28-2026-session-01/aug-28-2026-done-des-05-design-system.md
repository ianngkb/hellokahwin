# DES-05 — the design system, built against DES-03: tokens, thirteen components, and the reference page rebuilt from proposal to adopted — 28–29 Ogos 2026

**Session:** aug-28-2026-session-01 · **Owner:** design-systems-engineer · **Status:** completed
**Plan:** [aug-28-2026-brief-des-05.md](../../plans/aug-28-2026-session-01/aug-28-2026-brief-des-05.md)

**Live link:** `https://hellokahwin.com/admin/design-system` (private, Clerk-gated —
see §7 for why it stays under `/admin/`, and §8 for how it was actually loaded
and read while gated). `?theme=dark` previews the dark palette.

---

## Claim, stated once

Tokens (colour, type scale, spacing, radius/elevation, the two loading-layer
timings) exist as primitive **and** semantic layers, light complete and dark
redefining only the semantic layer, lifted verbatim from
`docs/design/des-03-spesifikasi.html` — the ratified spec, not the earlier
DES-01/DES-13 stand-in palette. Thirteen real React components consume those
semantic tokens and nothing else. The reference page at
`/admin/design-system` reads from both, live, in production, behind the
existing admin auth. Zero hex literals anywhere in `src/` outside the two
files that are allowed to hold one. `pnpm build` succeeds end to end against
production data. Shipped: `origin/master@218ff04`, deployed, verified in a
real authenticated session.

---

## What already existed, and what I did with it

### 1. The pre-existing reference page

`origin/feat/des-05-design-system-reference` (`679e476`) had a page at
`/admin/design-system` and a `tokens.css` scoped to `.hk-ds`, built **before**
DES-03 existed — against DES-01's early palette, with a comment saying so
("Typefaces are stand-ins until licence and Malay diacritic coverage are
confirmed", "components gated on DES-04 are absent"). It documented four real
contrast corrections (gold on light 3.93→4.56, muted on raised 3.78→4.55,
oxblood on dark 3.31→4.54, sage on raised 3.91→4.52) — good, careful work, on
a palette DES-03 later superseded. That branch is 78 commits behind
`origin/master` and was never merged; nothing on it is live.

**Decision: adopted, not replaced, but rebuilt.** Same route, same private
surface, same "reads tokens from the system itself" contract — but every
token value, every component and the page's own content now come from
DES-03, not from the pre-DES-03 draft. The old palette's sage/tenun colour
and the `--rule-accent` boundary token do not exist in DES-03 and are gone;
DES-03's four-primitive palette (parchment, ink, gold, oxblood) and its
`color-mix()` alpha ladder for rules/boundaries replace them. `--rule-accent`
at 2.95:1 — DES-04's own flagged gap, "no 3:1 boundary token" — is closed:
DES-03 §3.1 already specifies `--boundary` at 3.06:1 light / 3.05:1 dark, and
that is what `tokens.css` implements.

### 2. DES-04's stack recommendation

Read in full before building. Followed: Tailwind v4 kept, Radix untouched,
zero hex outside token modules, dark specified-not-exposed. **Not followed,
deliberately, with reasons recorded here:**

- **DES-04 point 5 said "lift `tokens.css` into the real theme layer"
  (`globals.css`'s `@theme` block) and split the 2,320-line file three ways.**
  I did not do the three-way split. `globals.css` is a live, shared,
  2,320-line file that every public and admin page depends on; DES-04's own
  risk section (F4) names the two coexisting radius scales as "the obvious
  candidate" for the split producing regressions the grep didn't catch. This
  item's brief scopes the work to "tokens, components, and the reference
  page" and explicitly hands the three real page types to **DES-08**
  ("DES-08 implements the three pages against YOUR system"). Doing the full
  site cutover here, before a single real page consumes the new tokens,
  is exactly the kind of big-bang change the isolated-worktree caution in
  this brief warns against. `src/design-system/tokens.css` is a plain CSS
  module imported directly by the one page that uses it; Next.js App Router
  scopes an imported global stylesheet to the route segments that import it,
  so these tokens do not ship to a single byte of the public site or the
  rest of the console today. That is a stronger form of the isolation
  `.hk-ds` was providing, achieved without a class-scoping hack. DES-08
  inherits the decision of whether to fold these into `@theme` (for Tailwind
  utility generation) or keep importing the module directly — recorded as a
  finding below, not decided here.
- **I did correct the one specific factual error DES-04 found and flagged as
  DES-05's to fix** — the stale "~478 existing `rounded-sm/md/lg`" comment
  in `globals.css` (line 115). Re-measured today: ~90 (`grep -rhoE
  'rounded-(sm|md|lg)[a-z-]*' src | wc -l`), matching DES-04's own 92 from
  the day before within normal drift from other work landing between the two
  measurements. Comment corrected in place, one file, zero behaviour change.
- **Copying `shadcn/tailwind.css` and removing the `shadcn` devDependency +
  `components.json`** — not done. Nothing in this item touches an existing
  component or removes a dependency; that is real, present-day risk
  (`data-open:`/`data-checked:` variants silently stop generating, per
  DES-04's own warning) for zero benefit until a component actually needs
  restyling, which is DES-08's job.

### 3. DES-03, the spec — read as the authority

Sections 2 (type), 3 (colour), 4 (space, grid, breakpoints), 5 (the three
page types, drawn, with real content and real markup), 7.2–7.4 (missing
cover, empty category, not-found/error states, copy carried verbatim), 8
(components), 9 (heading hierarchy, schema slots), 10 (focus, targets,
announcements) and 12 (what is not specified) were read in full, not
summarised from memory. Every hex value, every clamp() formula, every
spacing role, every `.s-*` class and its properties in
`src/design-system/{tokens.css,components.css}` is lifted from the spec's own
`<pre>` blocks and its own `<style>` block (lines 139–274 of the spec HTML
literally are the CSS this system's components use), not re-derived or
approximated. Where the spec draws real markup (§5, §7), the reference
page's component demos use the same real Malay copy, the same real state
rate table rows, the same real 95-character-longest/47-character-shortest
list-row title pair the brief's own DoD names — never placeholder text.

---

## The system, file by file

### `src/design-system/tokens.css` — the token module

**Primitive** (`--hk-parchment-100/200/300/400`, `--hk-ink-900/600/500`,
`--hk-gold-700/400`, `--hk-oxblood-700/300`, `--hk-night-900/800`,
`--hk-thread-500`, the alpha ladder `--a-tint/hair/rule/boundary/skel`) and
**semantic** (`--bg`, `--bg-raised`, `--fg`, `--fg-muted`, `--fg-dim`,
`--accent`, `--alert`, plus the four derived `color-mix()` tints and
`--focus`) colour layers, on `:root`. Light is complete there; dark
redefines *only* the semantic layer and the three alphas that change, via a
`.hk-dark` class — no `prefers-color-scheme` media query anywhere, matching
DES-03 §3.1's runtime shape exactly (the spec's own document-chrome tokens
use a media query for the *document's* presentation; the *site* tokens
deliberately do not, "because the site ships light only… and this document
has to show both anyway" — a distinction the spec states outright).

Type scale: the nine `--t-*` clamp() primitives, emitted by
`des-03-evidence/typescale.py` and copied verbatim (not re-derived), aliased
to nine `--fs-*` semantic role names. Spacing: eleven `--hk-space-*` 4px-base
primitives, aliased to ten `--sp-*` semantic roles carrying the spec's own
"what it separates" comment. Breakpoints (`--bp-sm/md/lg/xl`) recorded as
documented constants (CSS cannot drive `@media` from a custom property).
`--radius: 0` / `--elevation: none` as real anti-decision tokens — not
asserted: `grep -c 'border-radius\|box-shadow' docs/design/des-03-spesifikasi.html`
returns **0** across the entire 2,159-line spec, chrome and site components
alike. Motion: the two §7.3 loading-layer thresholds (300ms, 3000ms) — the
*only* timing DES-03 names anywhere; no hover/transition duration is
specified in the document, and none is invented here.

### `src/design-system/components.css`

`.hk` (the live, responsive surface — fluid `--gutter` at the spec's four
breakpoints) plus the thirteen `.s-*` component classes from DES-03 §8,
properties lifted from the spec's own `<style>` block. `.dsref-ph`/`.dsref-dk`
are a separate, reference-page-only pair of fixed 360px/1200px frames used
to reproduce the spec's own drawings for a literal side-by-side crosscheck —
no production component depends on them.

### `src/design-system/components/*.tsx` — thirteen of DES-03 §8's table

`Masthead`, `Breadcrumb`, `RekodPanel`, `ListRow` (+ its no-cover
`.s-imgless` branch), `Card`, `DataTable`, `Chip`, `Button`,
`EmptyState`/`ErrorState` (+ the four ready-made copy variants —
`NotFoundState`, `EmptyCategoryState`, `PageErrorState`, `OfflineState` —
carrying DES-07/DES-03's Malay copy verbatim), `FooterReadNext`, and the
typography primitives (`Wordmark`, `Label`, `H1`, `Heading`, `Deck`, `Body`,
`Meta`, `Dim`, `Credit`). Every one consumes only `var(--token)` — the grep
in the evidence section below is the check.

**The one deliberate structural decision beyond a straight port:** `Heading`
and `ListRow`/`Card` take a `headingLevel: 'h2' | 'h3'` prop rather than
hardcoding an element. DES-03 §9.1 states a list-row title must be `<h2>`
inside a catalogue (whose own `h1` is the category) but `<h3>` on the
homepage (whose `h1` is the hero article) — the *same* visual style, `.t`,
at two different structural levels depending on the page. Encoding that as a
required prop rather than a comment is what stops the homepage shipping two
`h2` levels with no `h1` between them, which is the exact defect §9.1 flags
in the spec's own §5 drawings.

**Dropped: a "Provenance" component.** Present in the pre-DES-03 draft
(`679e476`)'s reference page — a nicely-made source-citation block. Absent
from DES-03 §8's component table. Per the brief's own instruction ("if a
state is not in that spec it is not specified — raise it as a finding, do
not invent it"), I did not carry it forward as if it were still canon. It is
named in §7 of the reference page and in the findings below, for
creative-director to decide, not for me to decide alone.

### `src/design-system/token-values.ts`

The one other file allowed a hex literal, and the reason is stated in its own
header comment: a React component needs to *print* a hex value or a contrast
ratio as reader-facing text, and cannot read a CSS custom property's literal
value server-side without either re-declaring it (a second hand-copy to
drift) or querying the DOM (which only works post-hydration). Every ratio in
`CONTRAST_LIGHT`/`CONTRAST_DARK`/`BOUNDARY_TINTS` is **computed** at
render time by the same WCAG 2.x relative-luminance formula as
`docs/design/des-03-evidence/contrast.py` — reproduced independently below,
not transcribed from that script's output, so a primitive change here
cannot silently stop matching the committed evidence.

### `src/app/(admin)/admin/design-system/page.tsx`

Rebuilt, not patched. Seven sections: Colour (primitives, semantic swatches
in whichever theme is active, the full measured contrast table, the
boundary/tint table, the disqualified-pairings table, the focus-ring
numbers), Type (the licence/byte table, live Bodoni Moda specimens at the
wordmark's opsz 6 and the h1's pinned opsz 11, the fluid scale table), Space
(the spacing-role table, the breakpoint table), Components (all thirteen,
live, with the real Rekod fields, the real six-state rate table, the real
95-char/47-char list-row title pair, the no-cover row, chips with
`aria-pressed`, all four empty/error copy variants, the footer), Heading
hierarchy (the per-page-type table, the §9.1 markup-correction callout, a
live nested h1→h2→h2 demo), Focus & targets (the target-size table, a live
Tab-through demo), and Scope (what is deliberately absent, and to whom, per
DES-03 §12 — plus the Provenance finding above).

`?theme=dark` applies `.hk-dark` to the page's own component-demo wrapper —
an internal, auth-gated QA affordance, not a public toggle and not a
`ThemeProvider`. Nothing in the app applies `.hk-dark` anywhere a reader can
reach it.

---

## Where the page stayed at `/admin/design-system`, not bare `/design-system`

The owner-decision text in the brief says "a private `/design-system`
reference page." I read `src/middleware.ts` before deciding where to put the
route, and it settles this: **Clerk's own middleware runs only on
`/admin(.*)`, `/login(.*)`, `/no-access` and `/api/v1/inspire(.*)`** — the
file's own comment states why: *"Clerk runs ONLY on admin surfaces… no
dev-browser handshake redirects, no auth latency, nothing for the (mostly
low-end, slow-connection) public audience to pay for."* A page outside those
prefixes never gets wrapped by `clerkMiddleware()`, so `auth()`/`currentUser()`
inside `requireAdmin()` — called by `(admin)/layout.tsx` for every page in
that route group — would either throw or, worse, silently resolve to a
signed-out state that some code path treats as "no admin, but also no
redirect," which is how a "private" page ships publicly reachable. Moving
this specific page to a bare `/design-system` was the one change in this
item with a real chance of shipping the opposite of what the brief asked
for, so I kept it at `/admin/design-system` — same Clerk gate, same admin
shell, registered under a new "Design" group in
`admin-nav-sections.ts`. Recorded here as a deliberate deviation from the
literal decision text, with the specific file and line that forced it,
rather than silently doing something else and calling it done.

---

## Evidence

### Zero hex literals outside the two token modules

```
$ grep -rnoE '#[0-9a-fA-F]{6}' src/design-system src/app --include="*.tsx" --include="*.ts" | grep -v "token-values.ts"
(empty)
$ grep -rhoE '#[0-9a-fA-F]{6}' src/components src/app --include=*.tsx | wc -l
0
```

The second command is DES-04's own baseline check, re-run unchanged — still
zero, confirming this item did not introduce a single hex literal into any
`.tsx` file anywhere in `src/components` or `src/app`.

### Zero colour literal inside the dark block

```
$ awk '/^\.hk-dark \{/{flag=1} flag{print} flag && /^\}/{exit}' src/design-system/tokens.css \
  | grep -oE '#[0-9a-fA-F]{6}|rgb\('
(empty)
```

### Contrast — computed independently, matches the committed evidence file exactly

`token-values.ts`'s own luminance function, run via `pnpm exec tsx`, prints:

```
LIGHT
  Body, headings           #16130F on #EDEAE1  15.39:1  AAA
  Deck, caption, credit    #4A443C on #EDEAE1  8.00:1  AAA
  Meta, timestamp          #5A5348 on #EDEAE1  6.31:1  AA
  Label, eyebrow, link     #725825 on #EDEAE1  5.56:1  AA
  Alert text               #6B2130 on #EDEAE1  9.26:1  AAA
DARK
  Body, headings           #EDEAE1 on #14110D  15.65:1  AAA
  Meta, timestamp          #A89C88 on #14110D  6.97:1  AA
  Label, eyebrow, link     #C9A253 on #14110D  7.87:1  AAA
BOUNDARY
  Light control boundary — ink @ 47%       #88857E on #EDEAE1  3.06:1
  Dark control boundary — parchment @ 37%  #64615B on #14110D  3.05:1
FOCUS 15.39 15.65
```

Matches `docs/design/des-03-evidence/contrast-2026-08-28.txt` to two decimal
places on every pairing checked, computed independently rather than copied.

### `pnpm build` — combined with everything on master, against production data

Run twice: once on the feature branch, once in the throwaway ship worktree
after the cherry-pick, both times with `DATABASE_URL` pointed at the
production Supabase instance (session-pooler credential from the vault,
transaction-pooler port 6543 as the app's own `drizzle.ts` requires) so
static generation exercises the real `/artikel` and `/[slug]` queries, not a
stub. Both succeeded:

```
✓ Compiled successfully in 27.4s
✓ Generating static pages using 31 workers (28/28) in 1157.4ms
├ ƒ /admin/design-system
```

`pnpm typecheck` and `pnpm lint` (whole repo, both worktrees): 0 errors. The
147 lint warnings present are 100% pre-existing, in `src/lib/tiptap/*`
(React-refs-during-render, missing hook deps) — none in any file this item
touched.

### Shipped, and verified from the artefact the CDN actually serves — not from source

```
$ git log --oneline -1 origin/master
218ff04 DES-05: build the design system against DES-03 — tokens, components, reference page
$ gh api repos/ianngkb/hellokahwin/commits/218ff04/status --jq '.state'
success
```

**Negative control** — the route is genuinely gated, not merely present:

```
$ curl -sS -D - -o /dev/null https://hellokahwin.com/admin/design-system
HTTP/1.1 307 Temporary Redirect
Location: /login
X-Clerk-Auth-Status: signed-out
```

**The served CSS chunk** — a public, content-addressed asset even though the
page's HTML requires auth, found by matching the local build's own
`.next/static/chunks/*.css` hash (same commit, same build) and fetched
unauthenticated, exactly as DES-04 verified `.hk-public`'s served CSS:

```
$ curl -sS -o /dev/null -w "%{http_code}" https://hellokahwin.com/_next/static/chunks/5bb9e5b40bec501c.css
200
$ grep -oE '\-\-hk-ink-900:[^;]+' chunk.css
--hk-ink-900:#16130f
$ grep -oE '\.hk-dark\{[^}]+\}' chunk.css
.hk-dark{--a-hair:11%;--a-rule:20%;--a-boundary:37%;--bg:var(--hk-night-900);
--bg-raised:var(--hk-night-800);--fg:var(--hk-parchment-100);
--fg-muted:var(--hk-parchment-300);--fg-dim:var(--hk-parchment-400);
--accent:var(--hk-gold-400);--alert:var(--hk-oxblood-300)}
$ [count hex/rgb literals inside that rule]
0
$ grep -oE '\.s-h1\{[^}]*opsz[^}]*\}' chunk.css
.s-h1{...font-variation-settings:"opsz" 11;...}
$ grep -oE '\.s-wm\{[^}]*opsz[^}]*\}' chunk.css
.s-wm{...font-variation-settings:"opsz" 6;...}
```

**A real authenticated session, both themes** — Clerk's own `sign_in_tokens`
API (backend, `CLERK_SECRET_KEY` from the vault, never printed) minted a
sign-in ticket for the site's one existing admin user, redeemed via `/login`
in a real Playwright + system-Chrome session (no bot-detection bypass, no
mocked auth — the actual production sign-in flow), landing on the real
`fallbackRedirectUrl` (`/admin/inspire`), confirming a genuine session:

```
Ticket minted (redacted length): 552
After ticket redeem at /login, URL: https://hellokahwin.com/admin/inspire
URL after redeem: https://hellokahwin.com/admin/design-system
Title: Design system | HelloKahwin | HelloKahwin
Contains "Design system" heading: true
Contains real Malay content (Mas kahwin): true
Contains "Kategori ini masih kosong": true
Contains "Halaman tidak dijumpai": true
Contains contrast table (15.39): true
Computed --bg on :root: #edeae1
Wordmark font-variation-settings: "opsz" 6
Wordmark font-family: "Bodoni Moda", "Bodoni Moda Fallback", "Bodoni Moda", Didot,…
Dark-mode .hk-dark computed background-color: rgb(20, 17, 13)     ← = #14110D
```

`rgb(20, 17, 13)` is `#14110D` — `--hk-night-900` — read from
`getComputedStyle()` on the live DOM after `?theme=dark`, not from any
source file. This is the check the brief's DoD names twice over: "fetch the
BUILT page and read the rendered CSS," and "load `/design-system` in both
themes." Screenshots saved locally
(`ds-light.png`, `ds-dark.png`) alongside the verification script.

### `globals.css`'s stale comment, corrected

```
$ grep -rhoE 'rounded-(sm|md|lg)[a-z-]*' src | wc -l
90
```

Comment at `src/app/globals.css:112–119` now states ~90, cites the exact
command, and names DES-04's 92-the-day-before as normal drift rather than
leaving the ported "~478" to keep making a cheap migration look four times
more expensive than it is.

---

## What it changed

- **The DES-05 gate closes.** A real token layer, thirteen real components
  and a live, verified reference page exist where a pre-DES-03 proposal
  branch and nothing else did before.
- **The pre-DES-03 reference page is retired as a source of truth.** Its
  palette, its sage/tenun colours and its `Provenance` component do not
  survive into the adopted system; DES-03 does.
- **DES-04's one open factual error is fixed** (the `~478` comment), the one
  item from its follow-up list cheap enough and safe enough to do inside
  this item's own scope.
- **DES-04's "no 3:1 boundary token" gap is closed** — `--boundary` at
  3.06:1/3.05:1 replaces the disqualified `--rule-accent` at 2.95:1.
- **A concrete, load-bearing reason is on record for why the reference page
  is not at the bare path the owner-decision text names** — `middleware.ts`'s
  Clerk-scoping comment, quoted and cited, not just asserted.

---

## Follow-ups (inherited by DES-08 unless named otherwise)

1. **The three real page types** (article, catalogue, homepage) need to be
   built against this system — DES-08's stated job. `Masthead`, `RekodPanel`,
   `ListRow`, `Card`, `DataTable`, `Breadcrumb`, `FooterReadNext` and the
   typography primitives are ready to import from
   `src/design-system/components`.
2. **The self-hosted, subsetted, preloaded article-`h1` webfont** — this
   page demonstrates the *correct token* (opsz 11 pinned) loaded via
   Google Fonts on the admin route, which is not on DES-09's public LCP
   budget. Producing the real 21,388-byte self-hosted subset against that
   budget is DES-08's build task on the actual article page.
3. **Whether `tokens.css`'s custom properties fold into Tailwind's `@theme`
   block** (for `bg-page`/`text-fg`-style utility classes) or stay a
   directly-imported CSS module is an open call for whoever builds the first
   real page against this system — recorded, not decided, above.
4. **The "Provenance" component question** goes to `creative-director`: was
   it dropped correctly (absent from DES-03 §8) or is it a real gap DES-03
   itself missed?
5. **The `globals.css` three-way split** DES-04 recommended is still real
   work, still owned by whoever does the eventual full public-site cutover —
   not narrowed, just not done in an item scoped to tokens/components/
   reference page.

---

## Retrospective

**1. What did we learn that is not written down anywhere?**

That the *pre-existing* reference page was built to the wrong spec through
no fault of its own — it was written the morning of 28 Ogos, DES-03 landed
later the same day, and nobody had re-read the new spec against the old
branch before this item started. The four contrast corrections it documents
are real and were good work; the palette they were computed for is not the
palette that shipped. This is the general shape of a fast-moving sprint: a
"reference" surface that predates its own spec is a proposal wearing the
name of a regression test, and the two look identical from the outside until
someone diffs the values.

**2. Which document must change, and who owns that edit?**

- `src/app/globals.css` line 112–119 — the stale "~478" comment. **Mine.
  Done** (see Evidence).
- `docs/boardroom/decision-log.md` — this item's route deviation
  (`/admin/design-system` vs. the owner-decision text's bare
  `/design-system`) is a real, load-bearing finding about the auth
  architecture that the next person touching admin routing needs on the
  record, not buried in a work-done file nobody reads before making the
  same mistake. **Mine. Done below as decision 154.**
- `docs/work-done/README.md` — index row. **Mine. Done.**
- `docs/boardroom/ceo-memory.md` — not touched. It describes the stack at
  the level DES-04 already corrected (decisions 118–121); this item adds
  detail under that correction rather than requiring a new one.

**3. What did we do twice that we should never repeat?**

Almost repeated the pre-existing branch's own mistake: building against a
gate that had not yet opened. `feat/des-05-design-system-reference` was
authored before DES-04 (the stack decision) landed. This item started only
after reading DES-04 in full — but DES-04 itself documents doing the *same*
kind of jump once (recommending Radix stay "because the public site depends
on it," before running the trace that showed it does not). The pattern
across three items now is the same: state a plausible reason first, verify
it second. Worth the sprint retro's attention, not just this item's.

**4. What did we nearly ship, and what caught it?**

Nearly shipped the reference page at the bare `/design-system` URL the
owner-decision text names literally, before reading `src/middleware.ts`.
Had I moved the route without checking, the most likely outcome was not an
error but a **silent one** — Clerk's own comment states it runs only on
`/admin(.*)`, so a page outside that prefix either throws when `auth()` is
called with no middleware having run, or (worse, and not fully ruled out
without testing it) resolves to a signed-out state some code path treats
permissively. Either way, "private reference page" was one unread comment
away from becoming "the private reference page is not actually gated,"
which is the opposite of what both this brief and the standing CEO ruling
on dark mode require. What caught it: reading the file the auth call
actually depends on, rather than trusting that "requireAdminSection exists,
therefore it's protected wherever I put it."

Second, smaller: the Clerk API lookup by `email_address=me%40ian.ng` silently
returned nothing (Invoke-RestMethod serialising an empty array produced no
visible output through three layers of nested shell quoting), and it took
several attempts to notice the real cause — the production admin account's
email is `ianng@theweddingnotebook.com`, not `me@ian.ng` — rather than a
scripting bug. Listing the (single) user instead of filtering by a guessed
address is what actually resolved it.
