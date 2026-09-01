# UI-20 — the favicon was a pink H from a palette that is in no file in this repo

**Sprint 06 — _Deepen where the click is_** · `design` · 3 points · `design-systems-engineer`
**Shipped** 02 September 2026 · merge [`5342703`](https://github.com/ianngkb/hellokahwin/pull/59) (PR #59) → `master` → production
**Reviewer: Claude.** `codex-reviewer` was not dispatched and no OpenAI-backed review path was used, per the 02 Sept owner directive.

---

## Result

`node scripts/audit-favicon.mjs --url https://hellokahwin.com`

| | before (02:46 MYT) | after (03:00 MYT) |
| --- | --- | --- |
| checks passed | **0 / 7** | **7 / 7** |
| exit | `FAVICON GATE EXIT: 1` | `FAVICON GATE EXIT: 0` |

Every observable in the DoD, on production, by command:

| DoD | Observable | Live result |
| --- | --- | --- |
| (1) | `/favicon.ico` 200 | **200** `image/vnd.microsoft.icon`, 15,086 B, entries `16x16@32bpp, 32x32@32bpp, 48x48@32bpp`. sha256 `582da7245307…` — byte-identical to `public/favicon.ico`. Was **404**. |
| (1) | `/icon.svg` 200 `image/svg+xml` | **200 `image/svg+xml`**, 685 B, 2 glyph paths. Was **404**. |
| (2) | dominant colour from the palette, no magenta | **`#edeae1` = `--hk-parchment-100`** (tokens.css) / **Parchment `--hk-sand-050`** (brand-assets.ts), **1935 / 2304 px = 84.0 %**. `#b4326e`: **0 px**. Pink hue band (h 270–355, s ≥ 0.20): **0 px**. Every pixel within **1.03/255** of the straight line between `#16130f` and `#edeae1`. |
| (3) | apple-touch-icon ≥ 180×180 | `/apple-icon.png` **200**, **180×180** PNG. Was **404**. |
| (4) | homepage carries icon, apple-touch-icon, shortcut icon | **five** icon links, quoted below. Was **one**. |
| (5) | `favicon-32.png` wired up or deleted | **DELETED.** Now **404**, referenced by nothing. |
| render | HK legible and separated at 16px | measured off the **live** 16×16 ICO entry — see below. |

Quoted from the live response, `curl -s https://hellokahwin.com/ | grep -o '<link rel="[^"]*"[^>]*>' | grep -i icon`:

```html
<link rel="shortcut icon" href="/favicon.ico"/>
<link rel="icon" href="/icon.svg" type="image/svg+xml"/>
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" type="image/x-icon"/>
<link rel="icon" href="/favicon.png" sizes="48x48" type="image/png"/>
<link rel="apple-touch-icon" href="/apple-icon.png" sizes="180x180" type="image/png"/>
```

Before the merge, the same command returned exactly one line — `<link rel="icon" href="/favicon.png"/>`.

---

## The finding, and one correction to the brief

The brief said the magenta favicon was **“a survivor of the palette the site retired.”** It is worse than that, and the difference matters for how the next one gets prevented.

`#b4326e` is **in no palette file in this repo, current or retired.** `grep -rin b4326e src/ scripts/` returns nothing. The Plum Forward palette that `globals.css` still carries is `oklch(0.22 0.055 310)` — a near-black midnight plum, not a rose. So the favicon did not survive the 27 Aug re-skin; it predates every palette the site has ever declared, and it was never derived from one. **Nothing generated it and nothing checked it.** That is the actual mechanism, and it is why the fix is a generator and a gate rather than four better PNGs.

`public/favicon-32.png` told the same story from the other end: 32×32, the same magenta, referenced by **zero** lines of source. A dead asset that looks live is how the wrong icon survives a redesign — the brief's own words, and the reason it is now deleted rather than left in place.

---

## What ships

| File | |
| --- | --- |
| `scripts/generate-brand-icons.mjs` | Composes `/icon.svg`, `/favicon.ico` (16/32/48 BMP-DIB entries, written by hand — sharp has no ICO encoder), `/apple-icon.png` (180) and `/favicon.png` (48) from `public/brand/logos/hellokahwin-monogram.svg`, reading its two colours out of `src/design-system/tokens.css`. It contains no hex and no artwork of its own. `--check` exits 1 on any byte drift. |
| `scripts/audit-favicon.mjs` | The DoD as seven checks against a live URL or `public/` on disk, including a **render** check. `--selftest` is the paired assertion. |
| `src/app/layout.tsx` | `icon`, `shortcut icon`, `apple-touch-icon` via `metadata.icons`. |
| `src/components/brand/brand-assets.ts` | `APP_ICONS` — the registry entry the icon set was missing. |
| `src/app/(public)/brand/page.tsx`, `brand.css` | The reference-page section, in the same change. |
| `.gitattributes` | `public/icon.svg text eol=lf`. |
| `public/favicon-32.png` | deleted. |
| `scripts/__tests__/fixtures/ui20-retired-favicon-b4326e.png` | the retired icon, kept **because the self-test needs a known-bad input**. |

### Decisions, each measured rather than preferred

**The mark.** The committed monogram, used as-is: a uniform scale and a translate, nothing else. It is the **`opsz 6`** cut — verified, not assumed: `git log -- public/brand/logos/hellokahwin-monogram.svg` gives `f4a09d2 fix(brand): re-cut all five lockups at opsz 6, not the font's default 11`. That is the cut the brief names, and the reason the mark holds at all here: at 16px its ink is **6.4px tall**, well below the monogram's own stated `minHeight: 14`.

**Paper ground, ink mark — not the reverse.** I expected the opposite: a dark tile reads harder against a light tab strip, and light-on-dark usually blooms. Rendered both at 16px and read the pixels instead:

| ground | H crossbar, as a fraction of full ink | verdict |
| --- | --- | --- |
| `--hk-ink-900` #16130f, mark parchment | **0.29** — and the K collapses to a smudge | fails |
| `--hk-parchment-100` #edeae1, mark ink | **0.38**, both glyphs intact | ships |

Light-on-dark loses hairlines to antialiasing at this size; dark-on-light does not. It also happens to be what the site actually is — ink on paper — but that is not why it won.

**Ink box at 0.88 of the tile width.** The criterion, so it can be argued with: the largest fraction whose outermost pixel columns still read as ground at 16px. At **0.88** the edge columns are **0.02 / 0.02**; at **0.92** they are **0.24 / 0.19** and the mark touches the tile edge. Below 0.86 the crossbar starts to go.

**Square, no radius.** `--radius: 0` in `tokens.css` is the system's stated value, grepped and asserted there. A rounded icon would be the only rounded object the brand owns. iOS applies its own mask to the apple icon; nothing here fights it.

**No `prefers-color-scheme` switch in `icon.svg` — an anti-decision, recorded.** An SVG favicon can theme itself, and the obvious move (night ground in dark mode) is wrong: a dark tab strip is exactly where a dark tile disappears. The paper tile is the high-contrast choice against **both** chromes, so the ground does not move.

**`metadata.icons` rather than Next's `app/icon.svg` file convention.** The convention serves its files from hashed metadata routes (`/icon.svg?<hash>`) and emits **no `rel="shortcut icon"` at all**. The DoD names three rel values and two exact URLs; only the config form can promise both.

**`public/favicon.png` kept and regenerated, not deleted.** `middleware.ts` whitelists it by name and HTML cached in the wild still points at it. What it must never again do is serve the old mark — and it does not.

---

## The render check, run against live production

```
favicon.ico 16x16 entry: 16x16
  |                |
  |                |
  |                |
  |                |
  | ==::==  :--.-: |    ink column groups: 1-6, 9-14
  | +#..%=  .@..*. |    clear ground columns between the glyphs: 2
  | =#  %-   @ *   |    edge columns: left 0.02  right 0.02
  | =%::%-   @*+   |    H stems at columns 2 and 5, counter 3-4
  | =%--%-   @#%   |    H crossbar (best middle row spanning the counter) 0.38
  | =#  %-   @ %+  |    emptiest counter row 0.00
  | +#..%=  .@.:@: |    K right-edge swing across rows: 2 px
  | ==::==  :--:-- |    darkest rendered pixel vs ground: 11.08:1
  |                |
```

“Legible” is not a feeling here, it is four assertions:

- **two** ink column groups, not one blob and not three fragments;
- **≥ 1** column of clear ground between them (there are 2);
- in the H, the counter between its two stems is **spanned on some rows** (0.38) and **open on others** (0.00) — the structural signature of a letter rather than a block or a pair of bars;
- in the K, the right edge **moves with the row** (2 px), which a rectangle cannot do.

Blown up 14× from the same ICO — `07-after-ico-entries-16-32-48-at-14x.png` in the evidence directory — the 16, 32 and 48 entries side by side.

---

## The gate, and why it has a self-test

`pnpm audit:favicon:selftest` — **7/7, `FAVICON GATE EXIT: 0`.** Every render assertion is aimed at a **surgical mutant of the shipped icon**, one that differs in exactly the thing being tested:

| control | must | fired |
| --- | --- | --- |
| retired magenta PNG (colour) | FIRE | 4 assertions: dominant, exact `#b4326e`, pink band, off-ramp |
| shipped `favicon.png` (colour) | CLEAR | 0 |
| retired magenta PNG at 16px | FIRE | `expected 2 ink groups, found 1` |
| shipped icon, **crossbar erased** | FIRE | `the H has no crossbar (best spanning middle row 0.00)` |
| shipped icon, **H counter filled** | FIRE | `the H has no open counter between its stems` |
| shipped icon, **K diagonal flattened** | FIRE | `the K has no diagonal (right edge moves 0 px)` |
| shipped ICO 16×16 | CLEAR | 0 |

**That pairing caught a real bug before this shipped.** The first cut of the counter check took `H.x0 + 1 … H.x1 - 1` as the counter — which is only correct if the stems are one pixel wide. At 16px they are two. It swallowed both stems and reported `the H counter is filled — it reads as a block, not a letter` **on a correct icon**. A run against the negative control alone would have looked perfect: it fired on the bad input, exactly as designed.

One honest limit, stated rather than papered over: the **crossbar** assertion only discriminates because it is restricted to the **middle half** of the glyph's vertical band. Bodoni's H serifs put ~0.22 of full ink into the counter at the top and bottom rows — enough to satisfy “something spans the counter” on a glyph with no crossbar at all. Searched over the whole band it was a check that could not fail. The `filled counter` mutant, likewise, fires the adjacent *stems are adjacent* assertion rather than the counter-filled branch; the defect is caught, the specific branch is not the one that catches it.

---

## Verification chain

| stage | result |
| --- | --- |
| `pnpm typecheck` | clean |
| `pnpm lint` | 0 errors (159 pre-existing warnings) |
| `pnpm test` | **507 passed, 36 files** |
| `pnpm build` | succeeded |
| gate vs `next start` on :3287 (this build) | **7/7**, exit 0 |
| gate vs live production, **before** merge | **0/7**, exit 1 |
| gate vs live production, **after** merge | **7/7**, exit 0 |
| live `/favicon.ico` sha256 vs `public/favicon.ico` | identical (`582da7245307…`) |
| `/brand` live | carries `Favicon &amp; app icon`, `/icon.svg`, `/apple-icon.png` |
| CI on PR #59 | `gate self-test (blocking)` pass 7m18s · `H6 selection unit tests (blocking)` pass · `TOC gate self-test (blocking)` pass · Vercel pass |

The build was verified against the artefact a reader receives, not against source: `next start` on port **3287** (not 3200, so it could not fall into another session's server), with the build fingerprinted by content — `/brand` served the string `Favicon &amp; app icon`, which only this build can produce.

Evidence directory: [`sep-02-2026-ui-20-EVIDENCE/`](./sep-02-2026-ui-20-EVIDENCE/).

---

## Where the work went

**All of it to `master`,** including this entry. `docs/work-done/` is on `master` in this repo and has been for every sprint — `600857f`, `b10f4bf`, `7b2044a` are the last three commits to touch it. The brief's “anything under `docs/` → `feat/command-centre-dashboard`” rule is about the **boardroom** line (briefs, the style guide, `docs/boardroom`), which is not on `master` and never will be. Test by content, not by path prefix: `docs/work-done/` here is the site repo's own shipping record and lives beside the code it describes.

Nothing was pushed to the docs branch by this item.

---

## Raised, not absorbed: the same magenta is still on every social share card

While grepping for the provenance of `#b4326e` I measured the other hand-made
raster in `public/`. **`public/hellokahwin-logo.png` carries 7,127 pixels of the
exact same `#b4326e`**, plus 5,446 px of a plum `#3d2b3d`, on an off-white
`#faf7f2` that is not `--hk-parchment-100` either — 886×290, 663 distinct
colours, measured the same way as the favicon.

It is not decorative. It is the `openGraph` and `twitter` image on `/artikel`,
`/artikel/[category]`, `/artikel/tag/[slug]` and `/artikel/author/[slug]`, and
the `logo` field in the homepage **Organization schema** and the article schema.
The colour this item just removed from the tab strip is still exactly what
Facebook, WhatsApp, X and Google are handed for every share of every category
and tag page.

**This is outside UI-20's DoD**, which is scoped to the favicon and app-icon set,
so it is raised rather than quietly absorbed — narrowing a spec and widening one
are the same failure in opposite directions. The fix is the same shape and can
reuse `scripts/generate-brand-icons.mjs`: derive it from
`hellokahwin-horizontal.svg` and the tokens instead of shipping a hand export.
Filed in the session index for the CEO to scope.

---

## Retrospective

### What we learned that is not written down

**A generated asset with no generator is not an asset, it is a fossil.** Every other visual decision on this site is derived from something: colours from `tokens.css`, the marks from the outlined SVGs, the type scale from a script. The favicon was the one thing in `public/` that was **just a file**, and it is the one thing that outlived two complete palettes. The rule is not “remember to update the favicon”; the rule is that **anything a designer would want to change when the brand changes must be reachable from the thing that changed.** `brand:icons:check` now makes that literal — change `--hk-parchment-100` and the check goes red.

**A check restricted to where the feature is, is a different check from one restricted to where you happened to look.** The crossbar assertion passed on a crossbar-less glyph until it was narrowed to the middle half of the band, because the serifs were doing the crossbar's job in the arithmetic. Both versions returned a number. Only one of them was about the crossbar.

**A stem is not one pixel wide.** The counter bug came from treating `x0+1 … x1-1` as “between the stems”, which is true only at a size the icon never renders at. Any check that indexes into a glyph by offset-from-the-edge is measuring the bounding box, not the letter.

**A brief's diagnosis can be right in verdict and wrong in mechanism, and the mechanism is the part the fix is built on.** “A survivor of the retired palette” implies the fix is “re-skin it too”. “Never derived from any palette, and never checked” implies the fix is a generator and a gate. Same verdict, different work.

### Which document must change, and who owns the edit

1. **`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Design/design-systems-engineer.md`** — owner: **design-systems-engineer** (me). Two entries added: the fossil-asset rule, and the “a check restricted to where you looked” rule. **Done in this item** — see below. Persona edits inside a worktree reach nothing (`.claude/agents/` is untracked by design), so the edit went to the canonical path.
2. **`src/components/brand/brand-assets.ts`** — owner: design-systems-engineer. It already anticipated this surface in prose (“the only mark that survives a favicon”) and had no registry entry for it, so nothing could check the prose. `APP_ICONS` now exists and `/brand` renders it. **Done in this item.**
3. **The item's own DoD template** — owner: **CEO**. UI-20's DoD is the best-written one this agent has been handed: it named the failing observable, the units, and the render check that a status code cannot satisfy. It is worth copying as the shape for any item whose output is an image.

### What we did twice

Chose the icon polarity twice — once from theory (ink ground, because light-on-dark blooms) and once from measurement (paper ground, because it does not, at 16px). The second answer is the opposite of the first. Cost: about ten minutes, because the render harness existed before the decision did. Building the measurement first is what made changing my mind cheap.

Also switched GitHub accounts twice: `gh auth status` reported `ianngkb` as the active account while `gh api user` returned `ianng89`, whose token has `pull` only. `gh pr create` failed with `must be a collaborator`. `gh auth switch --hostname github.com --user ianngkb` fixed it. **`gh auth status` is not a reliable statement of which token will be used — `gh api user --jq .login` is.**

### What we nearly shipped, and what caught it

**A gate that fails a correct icon.** The counter check, in its first form, reported the shipped 16px render as “a block, not a letter”. It would have blocked this item and sent someone hunting for a defect in an icon that was fine. What caught it was running the **positive** control — the negative control passed happily. `--selftest` exists in this repo precisely because the failing half of a gate proves nothing about the passing half.

**A drift gate that lies on Windows.** `brand:icons:check` is a byte comparison, and this repo has `core.autocrlf=true`. A fresh Windows checkout would have handed it an `icon.svg` full of CRLF while the generator emits LF, and the check would have reported the icon set stale on every Windows machine, forever, for a reason with nothing to do with the icon. Caught by reading git's own `LF will be replaced by CRLF` warning on `git add` instead of scrolling past it. Fixed at source with a `.gitattributes` rule — the third such rule in this file, each for the same class of failure.

### Closing a finding two agents raised

`scripts/measure/count-in-html.sh` **now exists on `master`** — added by UI-17 in `f109450`. PLAT-19 and DES-18 both reported it missing and both were right at the time; the finding is **closed**, and it was used in this item to count markers on the live `/brand` page.

`docs/work-done/README.md`, named in the standing rules, was still missing — reported by PLAT-19 and confirmed by DES-18. Rather than report it a third time, **it is created in this commit** as a real index over the per-session indexes. The standing rule is now true.

### Prefer a gate over prose

Three shipped in this item, all runnable:

```
pnpm brand:icons          # regenerate the icon set from the monogram + tokens
pnpm brand:icons:check    # exit 1 if public/ has drifted from either
pnpm audit:favicon        # the DoD as 7 checks against live production
pnpm audit:favicon:local  # ... against public/ on disk
pnpm audit:favicon:selftest   # the paired assertion: every check FIRES and CLEARS
```
