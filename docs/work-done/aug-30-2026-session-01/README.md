# Sprint 04 — "Fix what shipped" · work-done index

Session `aug-30-2026-session-01`. One entry per item, newest last. Each entry
carries its own before/after evidence in a sibling `*-EVIDENCE/` directory.

**Append your item here when you ship it.** Six agents worked this sprint in
separate worktrees, so this file is a merge point by design — resolve conflicts by
keeping both rows, never by replacing the table.

| Item       | Title                                                    | Log                                                      | Exit                                          |
| ---------- | -------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| **UI-12**  | Every fixed-aspect image slot was fed the photographer's aspect ratio | [`aug-31-2026-done-ui-12-thumb-geometry.md`](./aug-31-2026-done-ui-12-thumb-geometry.md) | `image-aspect` 37→5 against master's gate. `image-upscale` was already 0 — UI-06's own fix, not ours. **STOP-AND-REPORT fired**, count 86 |

## Open findings raised by this session, with their owners

| Finding                                                                                                              | Raised by | Owner |
| -------------------------------------------------------------------------------------------------------------------- | --------- | ----- |
| No aspect-correct, quality-reduced derivative exists. A 528×396 q50 rendition of `crop-4x3-article-card` measures **16–34 KB** — lighter than today's `low.webp` — and unblocks the last 5 gate violations. **86 articles. A resize, not a re-crop: no Rekognition, no `GEOMETRY_VERSION` change.** | UI-12 (and UI-03 §5 before it) | owner / pipeline |
| `ImageVariantMeta` records `{ url, sizeBytes }` and no dimensions, which is why `resolveCoverSource` hardcoded a `1200w` that is wrong by 17.2% on real files. Recording `width`/`height` at generation time makes UI-03 R4 satisfiable for `low`/`high` permanently. | UI-12 | owner / pipeline |
| **Two agents solved the same problem in parallel an hour apart and neither knew.** UI-06 and UI-12 both diagnosed the `naturalWidth` density trap from UI-03 §7; UI-06's gate fix made UI-12's headline claim false before it was finished. Rule with teeth: **re-run the gate from `origin/master`'s copy, not the worktree's, before quoting any before/after number.** | UI-12 | sprint process |
| The gate's `TEMPLATES` manifest samples articles whose covers are all 1.500, so a per-article defect stays invisible. Master added a second article instance, but two samples from the same subset are still one sample. Needs a portrait-source article. | UI-12 | UI-06 |
| The gate is not deterministic against a live CDN: three runs in ~90 minutes gave `clipped-text` 2/0/0 and `image-upscale` 25/25/24. It already collects `imagesNotDecoded`; print it in the totals line. | UI-12 | UI-06 |
| `HERO_INELIGIBLE_SLUGS` is a hand-curated class-G list that had one entry and needed two — the front page's twelve covers contain at least two wide-procession frames. Needs Rekognition re-enabled or an editorial cover-class field, not indefinite extension. | UI-12 | owner / editorial |
| `p.hk-eyebrow.truncate` clips "Hantaran & Mas Kahwin" at 390px (needs 181px, box is 171px) on `/artikel` and `/artikel/tag/hantaran`. Marginal by ~10px, so it flips between runs. Outside UI-12's DoD. | UI-12 | UI-10 / UI-07 |
| **`image-attr-aspect` cannot be satisfied by a `<picture>`.** It reads `img.getAttribute('width')` and compares it against the file at `currentSrc` — which above the breakpoint is the `<source>`'s file. An `<img>` has one pair of attributes; a `<picture>` serves different aspects per band by design. Six rows on the two lead plates are unclearable by any correct markup. The check must read the `<source>`'s dimensions when a `<source>` supplied `currentSrc`; UI-12 added those attributes so the data is now there to read. | UI-12 | UI-06 |
| The gate's own comment says `image-attr-aspect` is advisory only because it does not stay clean on the negative control, and "should become blocking once the declarations are corrected". The `parseImageDims` fallback above **is** that blocker — fixing it is what promotes a ninth check from advisory to blocking. | UI-12 | owner / pipeline + UI-06 |
| `image-attr-aspect` reports **73** advisories, and they are one bug: `parseImageDims` falls back to a hardcoded `1200×800` when an image URL carries no `-WxH/` segment, so those images declare a ratio they do not have. UI-03 R6 at scale. Same root as the `ImageVariantMeta` gap above — one fix closes both. | UI-12 | owner / pipeline |
