# Brief — BMAD — Ship CONT-02's image enrichment. It never reached production.

**Status:** APPROVED — executing. Sprint 01, CONT-02 reopened.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.
**Production database CRUD is granted. The gate is open** — RISK-01 closed.

---

## The gap

CONT-02 sourced images, wrote real Malay alt text and captions, recorded credits,
and updated the asset register. **All of it landed in draft front matter and none
of it was ingested.** Readers still see the old image count.

Measured live, 26 Aug:

| Article | Live | Draft |
|---|---|---|
| `nikah-undang-undang/borang-nikah` | 4 | 4 ✓ |
| `ucapan-doa/doa-pengantin-baru` | **2** | **4** |
| `venue-perancangan/bajet-kahwin` | **4** | **5** |

That is a sample, not the full picture. **Enumerate all 33 live articles** and
report the real number before changing anything.

**The owner's directive that reopened this:** *"make sure that everything is
shipped within the sprint so I can review it."* Done means the owner can see it.
An image in a draft file is not shipped.

## What to do

1. **Audit first.** For every published article, compare the image count and the
   image list in its draft against what production serves. Produce a before table
   from a command, not by eye. Say which articles differ and by how much.
2. **Ingest the difference.** `--update`, same slug, same URL, for every article
   whose draft carries images production lacks.
3. **Do not lose what production has that the draft lacks.** Some live articles
   were enriched directly during earlier runs and their draft may be *behind*.
   **Where they disagree, the union is almost certainly right, but say so per
   article rather than assuming** — and never let an ingest remove a live image
   that has a valid credit.

## The rules that still bind

- **No text cards.** Zero across all 33 live articles right now — I swept them
  myself. Do not reintroduce one. Owner directive.
- **Every image carries `credit`, `creditUrl`, `licensorName`, `licenseClass`**
  and a register entry. An uncredited image is worse than a missing one.
- One path spelling: `images/S-name.jpg`, no `./` prefix.
- **Record a precise undo before writing.** There is a recovery point now, but a
  targeted undo is still cheaper than a restore.
- `--revalidate-url` mandatory. `pnpm --silent`, never `pnpm run`.

## Prove it — and prove it from what a reader gets

- A per-article **before/after table of live image counts**, both columns from a
  command against production.
- **Zero articles where the draft has an image production lacks**, at the end.
- **Zero images live without a full credit chain.**
- One credit line quoted from live HTML on an article you changed.
- Confirmation that the pillar pages still render and no URL changed.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
The question: **the work was complete and correct in the drafts, and stopped one
step short of a reader. What in the content workflow should make "written but not
ingested" impossible to mark as finished?** Name the file, edit it, log the path.
