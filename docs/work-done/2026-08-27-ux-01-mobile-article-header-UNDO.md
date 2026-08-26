# UNDO — UX-01, mobile article header restored

**Date:** 27 August 2026
**Branch:** `ianng89/pillars-ingest-redirects`
**Base commit before this work:** `7d7dad0b4f7f4c8067b3d0d31669a0e809afb346`
(`docs(cont-08): build log for the eight C2.5 publishes`)

## Blast radius

**Code only.** This change wrote nothing to any database, triggered no deploy,
purged no cache, and touched no production data. There is no irreversible step and
nothing to undo outside git.

## Files this change owns

Modified:

- `src/app/(public)/artikel/[category]/[slug]/page.tsx`
- `src/app/globals.css`
- `src/components/inspire/article-cover-mobile.tsx`
- `src/components/inspire/inspire-nav-menu.tsx`
- `src/lib/storage/smart-crop-url.ts`

Added:

- `src/components/inspire/mobile-article-bar.tsx`
- `docs/work-done/2026-08-27-ux-01-mobile-article-header.md`
- `docs/work-done/2026-08-27-ux-01-mobile-article-header-EVIDENCE/`

**Not touched, and must not be reverted with this change:**
`src/components/inspire/mobile-photo-bar.tsx` (unchanged; still used by the admin
draft-preview surface), `src/app/page.tsx`, `src/components/layout/navbar.tsx`,
`src/components/inspire/pillar-body.tsx`.

## Full revert

If the UX-01 commit is `<sha>`:

```bash
git revert --no-commit <sha>
git commit -m "revert(ux-01): restore the previous mobile article layout"
```

That returns the article route to hiding the site header below 767px, the cover to
`aspect-[4/5]`, the bottom bar to the photo gallery, and the nav rail to 32.5px
targets.

## Partial reverts, if only one piece is wrong

Each is independent of the others.

**Put the header back to hidden on mobile** (undoes the whole point of the item):
re-add `data-hide-mobile-nav` to the container `<div>` in
`src/app/(public)/artikel/[category]/[slug]/page.tsx`. Read the comment above it
and the comment above the rule in `globals.css` first.

**Restore the 4:5 cover plate:** in `article-cover-mobile.tsx`, change
`aspect-[3/2]` back to `aspect-[4/5]`. If you do, also revert the crop preference
— see below — because a landscape crop in a portrait plate is the same mistake in
the other direction.

**Restore the 4:5 cover crop:** in `src/lib/storage/smart-crop-url.ts`, make
`getMobileCoverUrl` return `getSmartCropUrl(crops, 'crop-4x5-mobile-cover') ??
fallbackUrl`. Both the `<img>` and the route's LCP preload hint go through this
one function, so changing it here keeps them in step. **Do not** change the crop
in `article-cover-mobile.tsx` alone — that silently voids the preload and causes a
duplicate high-priority image download with no visual symptom.

**Restore the photo-gallery bottom bar:** in the article route, swap
`MobileArticleBar` back to `MobilePhotoBar` (still present and unchanged at
`src/components/inspire/mobile-photo-bar.tsx`), pass only `galleryImages`, and drop
the `nextArticle` const. `mobile-article-bar.tsx` can then be deleted.

**Restore the 32.5px nav targets:** remove `min-h-11` from the anchors in
`inspire-nav-menu.tsx`. Not recommended — 44px is the design-system floor.

**Revert the dead-touch-nav fix — do not.** Removing the `isTouchLayout()` guards
from `handleEnter` / `handleLeave` in `inspire-nav-menu.tsx` returns every parent
category in the mobile rail to doing nothing at all when tapped. The measured
event order that makes those guards load-bearing is in the docblock above
`handleEnter` and in the work-done note. This one is a bug fix, not a design
choice.

## Verify a revert took

Re-run the measurement rig from the EVIDENCE folder against a local build:

```bash
node docs/work-done/2026-08-27-ux-01-mobile-article-header-EVIDENCE/measure.mjs \
  "http://localhost:3200/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri"
```

A completed revert reports `"header": {"display": "none"}`, `computedHeight: 0` on
every `header nav a`, and the bottom bar back to `"Lihat Semua Foto (n)"` with
`"links": []`.
