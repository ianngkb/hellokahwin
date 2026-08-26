# Brief — BMAD — Audit EVERY live image for a rendered credit, and fix what is missing

**Status:** APPROVED — executing. CEO decision under standing autonomy.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.
**Production database CRUD is granted.**

---

## The defect I found

`https://hellokahwin.com/artikel/ucapan-doa/ucapan-pengantin-baru` carries a
licensed photograph — `S-tetamu-tiba-majlis-ahmad-ali-karim.jpg`, uploaded,
derivatives generated, rendering fine — and **no credit line anywhere on the
page.**

Its sibling `/artikel/ucapan-doa/doa-pengantin-baru` uses an image by the *same
photographer* and correctly renders `Kredit: Ahmad Ali Karim (CC0)`.

So the image pipeline works and the template works. **One row is missing its
credit data.** That is an uncredited photograph, publicly served, and it breaks
the one rule this company has held above everything: *always credit the original
source so it can be traced back.* The parser enforces it at ingest — so either
it was bypassed, or the field was written empty, and I want to know which.

## What to do

1. **Audit every live article** — all 25 under `/artikel/…`, plus the 29 legacy
   ones. For each, list every image the page serves and whether a credit line
   **renders in the HTML** for it. Not whether a field exists in the database —
   whether a reader can see it. Those are different things and only the second
   one satisfies the rule.
2. **Establish the mechanism for `ucapan-pengantin-baru` specifically.** The
   parser requires `credit`, `licensorName` and `licenseClass` on a cover and
   refuses without them. So how did this row get published without one? Possible
   causes worth checking: the field was written but empty or whitespace, the
   template only renders credits for in-article images and not covers on some
   path, or this row was written by something that bypassed the parser. **Report
   the actual cause, not a guess** — if the gate can be bypassed, that is a
   bigger finding than the one page.
3. **Fix every missing credit.** Source the correct attribution from the asset
   register — every sourced image is recorded there with photographer, licence
   and URL. `--update`, same slug, same URL. **Never invent an attribution**: if
   the register does not have it, say so and stop; an invented credit is worse
   than a missing one.
4. **Legacy images are out of scope for fixing** — the owner is handling those 29
   manually. But **still report** which of them lack credits, so the owner has the
   list.

## Rules

- **Record a precise undo before writing.** Production has `pitr_enabled=false`
  and zero backups.
- Do not change any URL. Do not edit article text. Credits and image metadata only.
- `--revalidate-url` mandatory. `pnpm --silent`, never `pnpm run`.
- **No text cards** — owner directive. Do not add one anywhere, for any reason.

## Prove it

- a table: every live article × every image × credit rendered yes/no, **before
  and after**;
- the mechanism behind the `ucapan-pengantin-baru` miss, stated as a cause;
- the literal rendered credit line for each page you fixed, quoted from live HTML;
- the legacy list, for the owner.

## When done

Log to `docs/work-done/`, then write a **`## Retrospective`** — Stage 9,
mandatory. The obvious question here: **the credit gate is enforced at ingest,
so what allowed a row through without one — and what changes so that a missing
credit is impossible rather than merely forbidden?** Name the file, make the
edit, log the path.
