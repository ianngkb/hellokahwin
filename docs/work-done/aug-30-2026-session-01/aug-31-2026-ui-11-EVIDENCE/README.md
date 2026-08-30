# UI-11 evidence — standalone tap targets, 31 Ogos 2026

Everything here was measured in a real Chromium at real viewport widths against
**live production** (`https://hellokahwin.com`) — before, and after shipping.
Nothing here is static CSS analysis.

## How to reproduce it

The rig is committed in the site repo, not here:

```sh
NODE_PATH="C:/Users/Ian Ng/Documents/Code/thepicklebase/node_modules" \
  node scripts/audit-tap-targets.mjs \
    https://hellokahwin.com/ \
    https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding \
    https://hellokahwin.com/artikel/hantaran-mas-kahwin \
    https://hellokahwin.com/artikel \
    https://hellokahwin.com/dewan-kahwin \
    --widths 390 --all
```

`pnpm audit:taps <url>` is the same thing. It **exits 1** on any standalone
target under the floor and **exits 2** when it could not reach the site it was
pointed at, so it can be a gate. `--no-gate` prints the same report and exits 0.

To measure a protected preview, pass the bypass secret — vault key
`vercelbypass.hellokahwin`, never written down here:

```sh
VERCEL_PROTECTION_BYPASS=<secret> node scripts/audit-tap-targets.mjs https://<preview>.vercel.app
```

## What is here

| Path | What it holds |
|---|---|
| `measurements/before-production-390-1440.txt` | The full enumeration before the fix, 5 templates × 2 widths. **69 failures at 390.** |
| `measurements/after-production-390-768-1024-1440.txt` | After, 5 templates × 4 widths. **0 at 390**, and the 1440-only editorial residual. |
| `measurements/shipped-production-390.txt` | The gate run against shipped production. Exit 0. |
| `screens/<region>-before-390px.png` | Footer, breadcrumbs, contents, hero credit — production, before. |
| `screens/<region>-after-390px.png` | The same four regions and the card grid, production, after. |

The before and after crops are the **same URLs on the same origin**, captured
either side of the deploy, so the pair is a like-for-like comparison rather than
one production capture next to one local one.

## The number that matters, and the one that surprised us

**Every standalone target on the five DoD surfaces is ≥ 24 × 24 CSS px at
390px. 296 targets enumerated; 0 failing; down from 69.**

And the cost in layout was almost nothing, for a reason worth keeping:

| Region | Before | After | Δ |
|---|---|---|---|
| Footer | 321px | 330px | **+9** |
| Breadcrumbs | 64px | 68px | **+4** |
| In-article contents | 845.1px | 846.9px | **+1.8** |
| Hero credit | 16px | 24px | **+8** |

The contents list holds **21 entries that each went from 17px to 24px** and grew
the block by **1.8px in total**, because every `<li>` in it was **already
28.97px tall** — `line-height` inherited from `.inspire-prose`. The vertical
space was there the whole time; the anchor was `display: inline`, so its box
came from font metrics at 13px and it never claimed the row it was sitting in.

That generalises, and it is the useful thing this item learnt: **an
under-24px target is usually sitting in a row that is already over 24px.**
Giving the anchor a real box is normally free.
