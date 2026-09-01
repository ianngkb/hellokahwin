# Sprint 06 — "Deepen where the click is" · work-done index

Session `sep-02-2026-session-01`. One entry per item, newest last. Each entry
carries its own before/after evidence in a sibling `*-EVIDENCE/` directory.

**Append your item here when you ship it.** Several agents work this sprint in
separate worktrees, so this file is a merge point by design — resolve conflicts by
keeping both rows, never by replacing the table.

| Item        | Title                                                                    | Log                                                                                          | Exit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | --- |
| **UI-20**   | The favicon was a pink H from a palette that is in no file in this repo   | [`sep-02-2026-done-ui-20-favicon-monogram.md`](./sep-02-2026-done-ui-20-favicon-monogram.md) | **The HK monogram, ink on parchment, live.** Item gate `0/7 → 7/7` against production (`FAVICON GATE EXIT: 1 → 0`). `/favicon.ico` 404 → **200** (16/32/48 entries), `/icon.svg` 404 → **200 image/svg+xml**, `/apple-icon.png` 404 → **200 180×180**. Homepage icon links **1 → 5**, all three rel values. Raster favicon dominant `#b4326e` (82.5%) → **`#edeae1` = `--hk-parchment-100` (84.0%)**, **0 px** of the retired magenta. `favicon-32.png` **deleted**. 16px render check on the live ICO: 2 ink groups, 2 clear columns between them, crossbar 0.38, K swing 2px, 11.08:1. Gates shipped: `pnpm brand:icons:check`, `pnpm audit:favicon`. CORRECTION TO THE BRIEF: `#b4326e` is in **no** palette file in this repo, retired or current — Plum Forward's plum is `oklch(0.22 0.055 310)`. The icon never came from a palette; nothing generated it and nothing checked it |

## Findings carried in from Sprint 05, resolved here

| Finding | Raised by | Status |
| --- | --- | --- |
| `scripts/measure/count-in-html.sh`, cited in the standing rules and in the `design-systems-engineer` persona, does not exist on `master`. | PLAT-19, confirmed by DES-18 | **CLOSED.** Added by UI-17 in `f109450`; used by UI-20 against the live `/brand` page. |
| `docs/work-done/README.md`, named in the standing rules, does not exist. | PLAT-19, confirmed by DES-18 | **CLOSED by UI-20.** Created as a real index over the per-session indexes, rather than reported a third time. |

## Open findings raised by this session, with their owners

| Finding | Raised by | Owner |
| --- | --- | --- |
| **`gh auth status` is not a reliable statement of which token `gh` will use.** It reported `ianngkb` as `Active account: true` while `gh api user --jq .login` returned `ianng89`, whose token carries `pull` only — `gh pr create` failed with `GraphQL: must be a collaborator`. `gh auth switch --hostname github.com --user ianngkb` fixed it. Any agent shipping a PR should verify with `gh api user`, not `gh auth status`. | UI-20 | platform / CEO |
| **The brief's mechanism was wrong even though its verdict was right.** UI-20's magenta was described as "a survivor of the palette the site retired"; it is in **no** palette file in this repo, current or retired. The two diagnoses imply different fixes ("re-skin it too" vs "build a generator and a gate"). Worth tightening how a dispatch states provenance it has not grepped. | UI-20 | CEO |
| **`public/hellokahwin-logo.png` CARRIES THE SAME RETIRED MAGENTA, and it is on every social share card.** Measured, not suspected: 886×290, 663 distinct colours, **7,127 px of the exact `#b4326e`**, 5,446 px of a plum `#3d2b3d`, on an off-white `#faf7f2` that is not `--hk-parchment-100` either. It is the `openGraph`/`twitter` image on `/artikel`, `/artikel/[category]`, `/artikel/tag/[slug]` and `/artikel/author/[slug]`, and the `logo` in the homepage **Organization schema** and the article schema — so the colour UI-20 just removed from the tab strip is still what Facebook, WhatsApp, X and Google are handed. **Outside UI-20's DoD, which is scoped to the favicon and app-icon set — raised, not silently absorbed.** The fix is the same shape as UI-20's and can reuse `scripts/generate-brand-icons.mjs`: derive it from `hellokahwin-horizontal.svg` + tokens. | UI-20 | design-systems-engineer / CEO to scope |
