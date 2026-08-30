# Sprint 04 — "Fix what shipped" · work-done index

Session `aug-30-2026-session-01`. One entry per item, newest last. Each entry
carries its own before/after evidence in a sibling `*-EVIDENCE/` directory.

**Append your item here when you ship it.** Six agents worked this sprint in
separate worktrees, so this file is a merge point by design — resolve conflicts by
keeping both rows, never by replacing the table.

| Item       | Title                                                    | Log                                                      | Exit                                          |
| ---------- | -------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| **UI-12**  | Card thumbnails carried 25 upscale and 31 aspect violations | [`aug-31-2026-done-ui-12-thumb-geometry.md`](./aug-31-2026-done-ui-12-thumb-geometry.md) | `image-upscale` 25→0 · `image-aspect` 31→4 · **STOP-AND-REPORT fired**, count 86 |

## Open findings raised by this session, with their owners

| Finding                                                                                                              | Raised by | Owner |
| -------------------------------------------------------------------------------------------------------------------- | --------- | ----- |
| No aspect-correct, quality-reduced derivative exists. A 528×396 q50 rendition of `crop-4x3-article-card` measures **16–34 KB** — lighter than today's `low.webp` — and unblocks the last 4 gate violations. **86 articles. A resize, not a re-crop: no Rekognition, no `GEOMETRY_VERSION` change.** | UI-12 (and UI-03 §5 before it) | owner / pipeline |
| `ImageVariantMeta` records `{ url, sizeBytes }` and no dimensions, which is why `resolveCoverSource` hardcoded a `1200w` that is wrong by 17.2% on real files. Recording `width`/`height` at generation time makes UI-03 R4 satisfiable for `low`/`high` permanently. | UI-12 | owner / pipeline |
| The gate reads `img.naturalWidth`, which UI-03 §7 instructed it not to. On a `srcset` image `image-upscale` is really a `sizes` audit and an aspect mismatch is reported as an upscale. | UI-12 | UI-06 |
| The gate's `TEMPLATES` manifest carries one instance per template, so a per-article defect is invisible. The article cover figure is green on `garden-wedding` and 125% off on any of the 12 portrait-source covers. | UI-12 | UI-06 |
| The gate is not deterministic against a live CDN: three runs in ~90 minutes gave `clipped-text` 2/0/0 and `image-upscale` 25/25/24. It already collects `imagesNotDecoded`; print it in the totals line. | UI-12 | UI-06 |
| `HERO_INELIGIBLE_SLUGS` is a hand-curated class-G list that had one entry and needed two — the front page's twelve covers contain at least two wide-procession frames. Needs Rekognition re-enabled or an editorial cover-class field, not indefinite extension. | UI-12 | owner / editorial |
| `p.hk-eyebrow.truncate` clips "Hantaran & Mas Kahwin" at 390px (needs 181px, box is 171px) on `/artikel` and `/artikel/tag/hantaran`. Marginal by ~10px, so it flips between runs. Outside UI-12's DoD. | UI-12 | UI-10 / UI-07 |
