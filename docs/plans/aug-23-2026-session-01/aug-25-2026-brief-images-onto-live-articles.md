# Brief — BMAD — Put credited photographs on the EIGHT LIVE articles. In place.

**Status:** APPROVED — executing. CEO decision under standing autonomy.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.
**Production database CRUD is granted.** Do not stop to ask.

---

## The problem, stated exactly

The owner asked to see a live URL of a published article carrying a sourced,
credited image. **There is none.** I checked before writing this:

```
https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-johor
  images: kad-tajuk cover card only (our own graphic, licenseClass G)
  credit lines on page: none
```

Eight articles are live. Every one carries a generated cover and nothing else.
The sourced photographs exist — thirteen of them, downloaded, licence-verified,
photographer-named — but they are sitting in the drafts folder attached to
articles that have not been published.

**This brief closes that gap on the live articles, today.**

## What exists to work with

`docs/plans/aug-23-2026-session-01/drafts/images/` in the docs repo — thirteen
files, `S-` prefixed, photographer in the filename. Verified Creative Commons or
equivalent, with the licence and source URL recorded by the Managing Editor.
Relevant to C2.4 among them:

- `S-pengantin-selepas-akad-azlan-dupree.jpg` — CC BY 2.0, Azlan DuPree
- `S-dulang-buah-hantaran-mohd-hasan.jpg`
- `S-gubahan-kain-hantaran-mohd-hasan.jpg`
- `S-pengantin-pelamin-bunga-mohd-hasan.jpg`
- `S-bersanding-pelamin-mohd-hasan.jpg`

**Confirm each licence against the register before use.** Do not take my list as
proof — the register is `docs/work-done/aug-23-2026-session-01/` (asset register
built 24 Aug). If an image's licence is not recorded, do not use it.

## The job

For each of the eight live C2.4 articles at
`/artikel/hantaran-mas-kahwin/<slug>`:

1. **Choose at most ONE photograph, and only where it genuinely helps.** These
   are state-comparison articles. Their own review concluded photography adds
   little, and I agreed — but "little" is not "nothing", and a wholly
   image-free article reads as unfinished. One well-chosen human image near the
   top is the goal, not a gallery.
   **If an article is genuinely better without one, say so and skip it.** I will
   accept five of eight with a reason far more readily than eight with two
   forced.
2. **Write real Malay alt text** for each — describing what is in the frame, for
   someone who cannot see it. Not a filename. Not the same sentence twice.
3. **Full credit block, no exceptions:** `credit` in the licensor's own wording
   including the licence name, `creditUrl` to the source page, `licensorName`,
   `licenseClass: S`.
4. **Update each article in place** — `--update`, same slug, same URL. **Do not
   create new articles and do not change any URL.** These pages are indexed.
5. **Verify the credit is visible on the rendered page**, not just in the
   database. The whole point is that a reader can trace the image back. If the
   template does not render `credit` for in-article images, that is a code fix
   and it is in scope — say so and make it.

## The file-size problem — check this before ingesting

Several sourced files are **12–15 MB**. The R2 derivative pipeline produces
`high.webp`, `low.webp` and the named crops, so readers should not receive the
original — **but confirm that, do not assume it.** Report the actual delivered
byte size of the crop a phone receives. If a 15 MB original is reaching readers,
stop and tell me; that is worse than having no image.

## Rules

- **Record a precise undo before writing** — the eight slugs and their
  before-state. Production has `pitr_enabled=false` and zero backups.
- `--revalidate-url` is mandatory. Use it.
- `pnpm --silent`, never `pnpm run`, for anything with a secret in argv.
- Do not touch the article text. Images only.
- Do not touch the P1/P6 drafts — they are in editorial review.

## Prove it

Report, as literal output:

- each updated URL, status code, **first request**;
- the rendered credit line for each image, quoted from the live HTML;
- the delivered image byte size on the mobile crop;
- confirmation that all eight URLs are unchanged.

**The deliverable is a live URL I can send the owner where a credited photograph
is visible on the page.** Nothing less closes this.

## When done

Log to `docs/work-done/` and report the above, plus any article you skipped and
why.
