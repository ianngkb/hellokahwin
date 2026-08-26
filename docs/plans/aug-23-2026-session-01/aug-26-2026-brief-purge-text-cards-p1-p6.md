# Brief — BMAD — Purge the text cards still live in P1 and P6 articles

**Status:** APPROVED — executing. Sprint 01 defect, found 26 Aug by CEO audit.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.
**Production database CRUD is granted.**

---

## The defect, and it is mine

The owner's directive of 25 Aug was **"No i do not want a text card, it looks
ugly. Find alternatives, no text card at all."** — no text card as cover, and
none in the body.

Before that directive I had instructed *"keep the `kad-tajuk` card — move it
in-article"*. The withdrawal reached the C2.4 backfill. **It never swept P1 and
P6**, which had already been built the old way. So the covers on those eight
articles were correctly swapped to photographs, and the displaced text cards were
left sitting in the body — where they are live right now.

I compounded it: I audited `og:image`, saw photographs, and reported *"25 of 25
photograph covers, zero text cards"*. **Covers were the only thing I checked.**

## Confirmed live

`https://hellokahwin.com/artikel/venue-perancangan/harga-sewa-dewan-kahwin`
serves `c6-2-a1-harga-sewa-dewan-kahwin-cover` in the body, alongside the
photographs. All eight P1 and P6 articles carry at least one.

## What to do

**Remove every typographic card from the eight live articles.** They are the
generated `kad-tajuk`-family PNGs — filenames matching the article slug rather
than the `images/S-…` photograph convention:

| Article | Cards to remove |
|---|---|
| `nikah-undang-undang/borang-nikah` | `borang-nikah-dokumen`, `borang-nikah-sistem-negeri` |
| `nikah-undang-undang/rukun-nikah` | `rukun-nikah-wali-hakim` |
| `nikah-undang-undang/syarat-sah-nikah` | `syarat-sah-nikah-lelaki-perempuan` |
| `nikah-undang-undang/lafaz-taklik` | `lafaz-taklik-ke-mana-perginya` |
| `venue-perancangan/harga-sewa-dewan-kahwin` | `-cover`, `-rm160`, `-jam-atau-sesi` |
| `venue-perancangan/checklist-kahwin` | `-cover`, `-garis-masa` |
| `venue-perancangan/pakej-dewan-kahwin` | `-cover`, `-syarat-katerer` |
| `venue-perancangan/bajet-kahwin` | `-cover` |

**Derive the list from the data, do not trust my table.** Any `images:` entry
whose file is a `.png` named after the article rather than `images/S-…` is a text
card. Report what you actually found.

**Fix the drafts too**, or the next ingest reintroduces them:
`docs/plans/aug-23-2026-session-01/drafts/` — the same eight, plus
`C4-1-A2-songket-tenunan-tangan-atau-cetak.md` which carries one and is **not yet
published**, so fixing it now prevents a ninth.

**Do not delete the PNG files.** Leave them on disk unreferenced. They were
expensive to produce and the owner banned their *use*, not their existence.

**Do not replace them with anything.** The data they render is already in
markdown tables in the article body — that was established when the C2.4 cards
were removed. A reader loses nothing. Do not source a photograph to fill the
gap, and do not rewrite prose around the removal.

## Rules

- **Update in place** — `--update`, same slugs, same URLs. These pages are
  indexed. Do not create articles, do not change a URL.
- **Record a precise undo before writing.** Production has `pitr_enabled=false`
  and zero backups — RISK-01 is building a recovery point but is not done.
- Do not touch article prose. Images only.
- `--revalidate-url` mandatory. `pnpm --silent`, never `pnpm run`.

## Prove it

- Per article, **before and after**: the list of image slugs the live page
  serves, quoted from live HTML.
- Confirmation that **zero** `.png` text cards remain across all 28 live
  articles — not just these eight. Sweep them all; I want the number.
- All eight URLs 200 on first request, unchanged.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
The question worth answering: **a directive was withdrawn and the withdrawal
reached one batch but not another already built the old way. What in the process
should catch "a standard changed after this was built"?** Name the file, edit it,
log the path.
