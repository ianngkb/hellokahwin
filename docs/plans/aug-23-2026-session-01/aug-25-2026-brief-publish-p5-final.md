# Brief — BMAD — Publish P5. The seventh and last pillar.

**Status:** APPROVED — executing. CEO decision under standing autonomy.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.
**Production database CRUD is granted.** Do not stop to ask.

---

## This is the last one

Six pillars are live. `pelamin-kad-cenderahati` is the only one still `noindex`.
Three articles publish it and the site is complete.

## Both blocks are closed, and the third article always passed

| Article | State |
|---|---|
| `C5-1-A1-pelamin.md` | BLOCK closed — pricing re-sourced, /humanizer run |
| `C5-4-A1-bunga-telur.md` | BLOCK closed — pricing re-sourced, /humanizer run |
| `C5-2-A1-contoh-kad-jemputan-kahwin.md` | PASS — untouched |

## The "27 missing graphics" is not a blocker — I checked

The previous run reported P5 held on 27 named-but-missing `.png` files. **That is
stale.** I verified every image reference in all three drafts just now:

```
C5-1-A1-pelamin              3 images — all .jpg, all present
C5-4-A1-bunga-telur          3 images — all .jpg, all present
C5-2-A1-contoh-kad-jemputan  2 images — all .jpg, all present
```

Eight files, all photographs, **all on disk**. The missing PNGs were the
`kad-tajuk` data cards, and they were removed from these articles under the
owner's no-text-card directive — so the references went with them. **Nothing
needs generating. Publish.**

If you find a reference I missed, name the exact file and stop — do not generate
a text card to satisfy it.

## What to publish

Path `/artikel/pelamin-kad-cenderahati/`. Drafts in
`docs/plans/aug-23-2026-session-01/drafts/` in the docs repo.

## The traps, carried forward

1. **Cover path convention** — settle as the previous runs did; say which.
2. **`jsonb_typeof(content)` should return `object`, not `string`.** Confirm
   before and after.
3. **Internal links must resolve to PUBLISHED articles.** 25 are now live across
   six pillars — these three may link to each other, so work out the order or
   patch in a second pass.
4. `--revalidate-url` mandatory. `pnpm --silent`, never `pnpm run`.
5. **Wait five minutes before inviting any crawl.**
6. **NO TEXT CARDS** — owner directive. Not as cover, not in-article, not as a
   fallback for anything.

## Rules

- **Record a precise undo before writing.** Production has `pitr_enabled=false`
  and zero backups.
- Do not touch any live article. Do not change any existing URL.
- Do not edit article text — these passed the board; ingest what was approved.

## Prove it

- each of the three URLs — status code, **first request**;
- `/artikel/pelamin-kad-cenderahati` — status, and whether `noindex` is **gone**;
- sitemap count, 69 → 73;
- one rendered credit line, quoted from live HTML;
- **and confirm all seven pillars are indexable**, by checking each.

## When done

Log to `docs/work-done/`, then write a **`## Retrospective`** — Stage 9,
mandatory.

One finding to carry into it, from the run before you: *"A log is a record, not
an instrument — no writer reads one before drafting. Findings that should change
behaviour go to the style guide or the doctrine, never only to a log."* That is
exactly right, and it is why this brief tells you to name a file and edit it
rather than describe a lesson.

The question for your own retrospective: **a stale blocker ("27 missing
graphics") nearly held the last pillar dark, and it took the CEO thirty seconds
to disprove by listing files. What in the process should have caught that a
blocker had already been resolved by a different change?**
