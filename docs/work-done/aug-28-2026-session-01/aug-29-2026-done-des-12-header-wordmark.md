# Done — DES-12: the real wordmark is live in the production header, both breakpoints

**Date:** 29 Ogos 2026 · **Sprint 03, DES-12 (the last item)** · **Owner:** `design-systems-engineer`
**Brief:** `docs/plans/aug-28-2026-session-01/aug-28-2026-brief-des-12.md`
**Evidence:** `docs/work-done/aug-28-2026-session-01/aug-29-2026-des-12-EVIDENCE/`
**Site repo commit:** `ianngkb/hellokahwin@105e79d`, pushed directly to `master` (linear history, per house style — no PR, no merge commit)

---

## CLAIM

**The masthead now renders the real DES-13 outlined wordmark — not typeset text — and it fits beside a reachable search control at 360px, at its stated 18px minimum, with margin to spare.** The typeset "HelloKahwin" is retired. No fallback to the monogram was needed: the horizontal lockup clears the constraint on its own.

## EVIDENCE

**Live URL:** https://hellokahwin.com/ (and every public page — the header is in `(public)/layout.tsx`)

Measured with `playwright-core` driving the installed Chrome, against **production**, after deploy (Vercel status `success` on `105e79d`, confirmed via `gh api repos/ianngkb/hellokahwin/commits/105e79d/status`):

| Viewport | Mark (w×h) | Search target | Gap between them | Horizontal overflow |
|---|---|---|---|---|
| **360px** (the constraint) | **180 × 18px** | 44×44px, right edge at x=344 (16px clear of the 360px edge) | **30px** | none |
| 390px | 182.7 × 18.3px | 44×44px | 43.7px | none |
| 1400px (desktop) | 240 × 24px | 55×32px + "Cari" label | 384.7px | none |

Full script + raw output: `out-measure-header-prod.txt`, `measure-header.mjs`. Screenshots of the live header at both breakpoints: `prod-header-360.png`, `prod-header-1400.png`.

**18px is exactly `brand-assets.ts`'s stated minimum for the horizontal lockup, not a number I picked.** The mark is sized off `--fs-wordmark` (`tokens.css`, DES-05): `clamp(1.125rem, 0.9217rem + 0.9036vw, 1.5rem)` — 18px floor, 24px ceiling, the same fluid token DES-05 built for this exact role. 180/18 = 240/24 = 10.0, matching the lockup's documented 10.0:1 ratio at both ends of the clamp — the browser is scaling the real proportion, not a stretched approximation.

**Monogram fallback was not needed.** The brief is explicit that if the horizontal doesn't fit, the finding comes back rather than shrinking past 18px — but at 18px the horizontal only needs 180px of a 360px viewport, leaving 180px for padding, spacer and a 44px search target. The direction-C rejection this brief cites (Bliss & Bone's 250×22 fixed lockup eating 69% of a 360px viewport) doesn't apply here because that mark is set at a **fixed width**; this one is set at a **fixed height** and inherits its width from the 10:1 ratio, so the two numbers were never comparable in the way the brief's own framing implied. Worth naming so nobody re-derives the same worry next time this constraint comes up.

### Contrast — the CEO's gap, closed with numbers, not an assumption

The mark is `fill="currentColor"`, inlined (not `<img src>` — see "How," below), so it inherits whatever `color` the header's ink token resolves to. The shared `<Navbar>` renders in exactly **two** token contexts in this codebase — measured both, canvas-sampled to true sRGB bytes (`getComputedStyle` returns `lab()`/`oklch()` strings here, not `rgb()` — see the project's own contrast-measurement rule):

| Ground | Where | Mark colour | Background | Contrast |
|---|---|---|---|---|
| `.hk-public` warm paper | Every public page (home, `/artikel`, articles, `/brand`) | `#151412` | `#fcfbfa` | **17.8 : 1** |
| Root `:root` tokens | `(admin-preview)` — the draft-preview surface, outside `.hk-public` | `#13110f` | `#fcfaf7` | **18.1 : 1** |

Both clear WCAG AA (4.5:1) by a wide margin. **Neither of these is a dark ground** — I looked for one before assuming "both themes" meant light/dark. `globals.css` does define a `.dark` block and an admin console dark mode (`data-theme="dark"`, cookie-driven, scoped to `#console-root`), but `<Navbar>` is imported in exactly two files (`(public)/layout.tsx`, `(admin-preview)/layout.tsx`) and neither ever applies `.dark` or `data-theme="dark"` — the header has never shipped on a dark ground and does not today. Full numbers and method: `out-second-ground-contrast.txt`, `second-ground.html`, `read-second-ground.mjs`.

This is the **solid-ink** contrast (the thick strokes). The **hairline** sub-pixel contrast at this exact instance (`opsz 6`, 18px) was already measured by DES-13: **10.91:1** at DPR1, clearing the WCAG 2.2 §1.4.11 3:1 non-text floor by 3.6×. I didn't re-derive that number — it's DES-13's, cited here because it's the more rigorous of the two and it already answers the question at the size this item actually ships.

### Regression check — DES-09's G08 nav spine

Ran `check-guardrails.py --quick --only G08` against production post-deploy:

```
PASS  G08  All 11 navigation spine paths linked from every page
        measured : 11/11 present on every page
PASS  G31  The sitemap URL set does not shrink
        measured : 103 URLs
```

Full run: `out-guardrail-G08.txt` / `.json`. The header change touches only the home link's content and the layout's CSS import — neither the search link's `href` nor the category rail changed, and the check confirms it.

### Accessibility

- The home link carries `aria-label="HelloKahwin — Laman utama"` (explicit, not relying on the inner SVG's own `role="img" aria-label="HelloKahwin"` to compute the name, though that's there too as a second line of defence).
- Keyboard reachable — it's a native `<a>`, unchanged.
- `out-a11y-and-console.txt` / `a11y-check.mjs`.

### A console error, checked and ruled out

Automated console capture on `https://hellokahwin.com/` shows one error: minified React #418 (hydration mismatch), **on the homepage only** — not on `/artikel`, not on an article page, both of which render the identical `<Navbar>`/`<SiteWordmark>`. Since the wordmark is byte-identical across all three pages and only the homepage throws, the mark isn't the cause. Two homepage-only client components (`InspireNavMenu`, `EdgeScroller`, both `'use client'` with `useState`/`useEffect`) are the more likely source and pre-date this item (DES-08). Not investigated further — out of this item's scope — but flagged rather than ignored: `out-a11y-and-console.txt`, `check-nomobile.mjs`.

## LIVE LINK

**https://hellokahwin.com/** — view at 360px width or desktop; the header is the same component on every public page.

---

## How

**Replaced the typeset `<Link>HelloKahwin</Link>` in `src/components/layout/navbar.tsx` with `<SiteWordmark>`** (`src/components/brand/site-wordmark.tsx`), a server component that reads `public/brand/logos/hellokahwin-horizontal.svg` at module load and inlines it via `dangerouslySetInnerHTML`, sized by `height: var(--fs-wordmark)` with the injected `<svg>` forced to `height:100%; width:auto` so the browser derives width from the file's own 10:1 viewBox.

**Inlined, not `<img src>`, on purpose.** `/brand`'s cards use `<img src="...svg">`, which works fine there because every card sits on one fixed ground the page controls directly. An `<img>` referencing an external SVG resource resolves `currentColor` inside *that resource's own* rendering context — a `color` set on the `<img>` or an ancestor never reaches it. That's a silent failure mode: the mark keeps rendering in whatever colour is the file's initial value, on every ground, and nothing about it looks wrong until two grounds are compared side by side — which is exactly the CEO's gap this item was asked to close. Inlining the markup makes `fill="currentColor"` a real CSS cascade, which is what let the two-ground contrast table above be a genuine measurement rather than an assumption.

## A regression this item found and fixed before it could ship

`tokens.css` (which defines `--fs-wordmark`) was, before this change, imported by exactly the three pages DES-08 migrated (home, catalogue index, article) — **not** by `(public)/layout.tsx`, where the header actually lives, and not by `(admin-preview)/layout.tsx` either. `/brand` doesn't import it. The first local measurement against `/brand` showed the mark rendering at **0×0px**: a percentage-height SVG (`height:100%`) inside a parent whose own height is `var(--fs-wordmark)` — which resolves to nothing, i.e. `auto`, when the variable is undefined — collapses to zero per CSS's percentage-against-indefinite-height rule. It doesn't error, doesn't warn, and the link is still there and still clickable at zero size, which is precisely the shape of bug the CEO's ask was worried about, just in width instead of colour.

**Fixed by importing `tokens.css` in both layouts that render `<Navbar>`**, rather than duplicating the clamp() formula as a literal in the component (which would have fixed the immediate bug and reintroduced the exact "two sources of truth" problem the token exists to prevent). Checked it's side-effect-free first: `tokens.css` contains exactly two selectors, `:root` and `.hk-dark`, no painting rules, and `.hk-dark` is applied nowhere on a public route (comment in the file itself, verified by grep) — so importing it site-wide changes nothing else on the page.

## Files changed

- `src/components/brand/site-wordmark.tsx` — new. The inline-mark component.
- `src/components/layout/navbar.tsx` — the home `<Link>` now renders `<SiteWordmark>`; doc comment updated to match.
- `src/app/(public)/layout.tsx` — imports `tokens.css`.
- `src/app/(admin-preview)/layout.tsx` — imports `tokens.css`, same reason.

`pnpm typecheck` and `pnpm lint` both clean on the diff (pre-existing warnings elsewhere in the repo are untouched — 146 warnings, 0 errors, same count before and after). `pnpm build`'s static-generation step can't be exercised in this environment (no local Postgres — `ECONNREFUSED` against `articles`/`inspire_nav_items` on every attempt, same limitation noted in prior session evidence); Vercel's own build, which does have DB access, is the real gate and it returned `success`.

## Retrospective

**1. What did we learn that is not written down anywhere?**

**A design token that isn't loaded everywhere the thing it styles is used isn't a fix, it's a landmine with a delay timer.** DES-05 built `--fs-wordmark` specifically for the masthead, but the masthead (`(public)/layout.tsx`) never imported the file that defines it — only three page-level files did, because DES-08 wired the token into the pages it was migrating and nobody re-checked whether the *shared, site-wide* header component it was meant for could actually see it. The bug was invisible on every page DES-08 touched (home, catalogue, article all import `tokens.css` themselves) and would have shipped silently on the first page that didn't — `/brand`, or any future page nobody thinks to check. A token's availability is part of its contract as much as its value; "defined in `tokens.css`" is not the same claim as "available where it's consumed."

**2. Which document must change, and who owns that edit?**

- **`docs/sprints/sprint-03.json`** — mine, done in this change. DES-12 moved `todo` → `done`, stale `blocked-by-DES-10`/`blocked-by-DES-11` flags removed (both dependencies were in fact already merged and correct on `master` — verified directly, not assumed).
- **Flagged, not edited — `docs/sprints/sprint-03.json`'s DES-10 and DES-11 entries.** Both still read `todo` / `blocked` in the tracker, but their actual deliverables (`brand-assets.ts` at the `opsz 6` instance, the five re-cut SVGs, the live `/brand` page) are already merged to `master` — I used and verified them directly for this item. No `docs/work-done/` entry exists for either. That's a closeout somebody needs to do with the right DoDs in hand, which is not this item's brief; naming it here rather than silently fixing the tracker for work I didn't do and haven't fully verified against its own acceptance criteria.
- **`src/app/(public)/layout.tsx` and `src/app/(admin-preview)/layout.tsx`** — mine, done in this change (the `tokens.css` import, with the reasoning as a comment in place so the next person who touches either file doesn't remove it as a mystery unused-looking import).

**3. What did we do twice that we should never repeat?**

Nothing repeated inside this item, but it repeats a pattern from DES-08's own finding (`.hk-public` re-declaring `--accent` and shadowing `:root`, documented in `tokens.css`'s own top comment): **a design token's cascade scope is decided by import location, and import location is decided per-page, ad hoc, by whoever happens to be building that page.** Twice now a token has behaved correctly everywhere it was tested and incorrectly everywhere it wasn't. The fix both times was "import the file somewhere it wasn't," which works but is a patch, not a rule. If a third instance turns up, the right fix is probably importing `tokens.css` once, high enough (root layout, or `globals.css` itself) that "is the token loaded here" stops being a question anyone has to ask per page — I did not make that change here because it's bigger than this item's scope and `components.css` (unlike `tokens.css`) does carry actual painting rules that would need auditing first.

**4. What did we nearly ship, and what caught it?**

**A wordmark rendered at 0×0px, on at least one live route, with the link still fully present and clickable.** Nothing about it would have thrown, logged, or failed a status-code check — the anchor tag renders, `href="/"` works, the page returns 200. It would have looked, to any check that doesn't literally measure the rendered mark, identical to success. What caught it was the very first `measure-header.mjs` run against `/brand` locally, before touching production: `markWidth: 0, markHeight: 0` in the JSON output, on a viewport where the arithmetic said it should be 180×18. That number didn't match what the screenshot in my head predicted, so I stopped and read why instead of trusting the "it built, it typechecks, it's a home link" chain of good signs — which is exactly the failure mode DES-13's own retrospective described two items ago ("insisting on measuring something that was almost certainly true").
