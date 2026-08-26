# Brief — BMAD — Publish the five staged articles and swap the fee table

**Status:** APPROVED — executing. Sprint 01 publishing run.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.
**The production gate is OPEN** — RISK-01 closed with a verified restore path.

---

## Why this is safe now, and it was not before

These five have been written and held for hours, deliberately. Production had no
recovery point — `pitr_enabled=false`, zero platform backups — and the rule was
that nothing new goes onto a database you cannot restore.

**That is now closed.** A dump exists in R2 and has been **restored into a
throwaway database and verified by row count** — 18 tables vs 18, articles 56/56,
media 747/747. A daily backup runs from `master`, and the alarm has been proven by
deliberately breaking it: failure to filed GitHub issue in ten seconds.

**And the edge purge shipped an hour ago**, so a newly published article's pillar
rebuilds on request #1 rather than serving a stale copy for five minutes. This
run is the first to benefit — you should not need the old wait-five-minutes rule.

## What to publish

**Three C2.3 articles** — `docs/plans/aug-23-2026-session-01/drafts/ingest/`:

| File | Slug | Lands at |
|---|---|---|
| `C2-3-A1-dulang-hantaran.md` | `dulang-hantaran` | `/artikel/hantaran-mas-kahwin/` |
| `C2-3-A2-gubahan-hantaran.md` | `gubahan-hantaran` | `/artikel/hantaran-mas-kahwin/` |
| `C2-3-A3-sirih-junjung.md` | `sirih-junjung` | `/artikel/hantaran-mas-kahwin/` |

**Two P3 articles** — `docs/plans/aug-23-2026-session-01/drafts/`:

| File | Lands at |
|---|---|
| `P3-A4-walimatul-urus.md` | `/artikel/ucapan-doa/` |
| `P3-A5-skrip-pengacara-majlis-perkahwinan.md` | `/artikel/ucapan-doa/` |

**And the kursus fee table swap** —
`drafts/kursus-kahwin-yuran-section.html` replaces the thin "varies by state"
paragraph on the LIVE `/artikel/idea-dan-nasihat/kursus-kahwin`. Follow
`drafts/kursus-kahwin-yuran-SWAP-INSTRUCTIONS.md`: it carries the exact
find-string and the pre-write checks. **`--update`, same slug, same URL.**

That one is time-sensitive: **Penang moves RM100 → RM120 on 1 September**, six
days out, and the section states both figures with the changeover date.

## Order matters

The three C2.3 articles land on **P2**, the only pillar Google has actually
crawled (SEO-01). The two P3 articles land on a pillar with three existing
articles. **Publish C2.3 first** — it is the cluster with a live crawl path, so
it is the one most likely to be discovered quickly.

## The traps, all earned this week

1. **Internal links must resolve to PUBLISHED articles** — the parser refuses
   dead links in the body as well as the front matter. These five cross-link to
   each other, so **work out the dependency order or ingest then patch in a
   second pass.** A link to an unpublished sibling is a hard failure.
2. **`jsonb_typeof(content)` must return `object`, not `string`.** Confirm before
   and after; that defect was fixed but is worth re-checking on a new batch.
3. **No text cards.** Zero across all 28 live articles right now — do not
   reintroduce one. Owner directive.
4. **Record a precise undo before writing** — the exact slugs. There is a
   recovery point now, but a targeted undo is still cheaper than a restore.
5. `--revalidate-url` mandatory. `pnpm --silent`, never `pnpm run`.

## Prove it

- Each of the five URLs — status code, **first request**.
- The kursus article — status, and the new table visible in the live HTML.
- **Whether the pillar lists the new article on request #1** — this is the edge
  purge's first real outing and I want to know if it held.
- Sitemap count, 73 → 78.
- One rendered credit line quoted from live HTML.
- `jsonb_typeof(content)` on the new rows.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
Name the file that must change, and edit it.
