# Brief — BMAD — Publish P3, P4 and P7. Six pillars live.

**Status:** APPROVED — executing. CEO decision under standing autonomy.
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.
**Production database CRUD is granted.** Do not stop to ask.

---

## Where this sits

Three pillars are live: `nikah-undang-undang`, `hantaran-mas-kahwin`,
`venue-perancangan`. Sitemap 57. This brief takes it to **six of seven.**

Ten verified articles, all with human photograph covers already attached.

## What to publish

| Pillar | Path | Articles |
|---|---|---|
| **P3** Ucapan, Doa & Adab | `/artikel/ucapan-doa/` | `P3-A1-ucapan-pengantin-baru`, `P3-A2-doa-pengantin-baru`, `P3-A3-doa-majlis-perkahwinan` |
| **P4** Busana & Penampilan | `/artikel/busana-pengantin/` | `C4-1-A1-baju-pengantin-sewa-atau-beli`, `C4-1-A2-songket-tenunan-tangan-atau-cetak`, `C4-2-A1-inai-tangan-pengantin` |
| **P7** Sebelum Nikah | `/artikel/sebelum-nikah/` | `P7-A1-cincin-tunang`, `P7-A2-taaruf-maksud`, `P7-A3-doa-majlis-pertunangan` |

Drafts in `docs/plans/aug-23-2026-session-01/drafts/` in the docs repo.

**Verification verdicts — all ten cleared today:** four PASS, six PASS WITH
FIXES with every fix applied in-file. Do not rewrite a sentence; ingest what was
approved.

## NOT in this brief — P5 is blocked, deliberately

`C5-1-A1-pelamin` and `C5-4-A1-bunga-telur` were **BLOCKED** by the verification
board on stale and single-vendor pricing — pelamin package prices sourced partly
from a **2014 blog**, marked "stale on arrival". They are being re-sourced.
`C5-2-A1-contoh-kad-jemputan-kahwin` passed but publishing one article under P5
while two siblings are blocked is not worth it; P5 goes as a set.

**Do not publish anything under `pelamin-kad-cenderahati`.**

## The traps — carry forward what the last publish run learned

Read `docs/work-done/aug-23-2026-session-01/aug-25-2026-done-publish-p1-p6.md`
first, including its retrospective. Specifically:

1. **The cover path convention** — settle it the same way that run did, and say
   which convention you used.
2. **`articles.content` double-encoding** — `jsonb_typeof(content)` should return
   `object`, not `string`. Confirm the state before and after; if the previous run
   fixed it, verify these ten land correctly. If it did not, **fix it before
   ingesting ten more rows.**
3. **Internal links must resolve to PUBLISHED articles.** These cross-link within
   their own pillars and to the eight P1/P6 articles that went live an hour ago.
   Work out the dependency order, or ingest then patch in a second pass.
4. `--revalidate-url` is mandatory. `pnpm --silent`, never `pnpm run`.
5. **Wait five minutes before inviting any crawl** — the edge holds pillar pages
   up to 300s.

## Rules

- **Record a precise undo before writing** — the ten slugs. Production has
  `pitr_enabled=false` and zero backups.
- Do not touch any live article. Do not change any existing URL.

## Prove it

- each of the ten URLs — status code, **first request**;
- `/artikel/ucapan-doa`, `/artikel/busana-pengantin`, `/artikel/sebelum-nikah` —
  status, and whether `noindex` is **gone** on each;
- sitemap count, 57 → 70;
- one rendered credit line, quoted from live HTML.

## When done — and this is a gate, not a formality

Log to `docs/work-done/`, then write a **`## Retrospective`** section. Stage 9 of
the content production workflow, mandatory since today.

**The previous publish run omitted it and had to be sent back.** Four questions:
what did we learn that is not written down; **which document must change and who
owns the edit — NAME THE FILE**; what did we do twice that we should never
repeat; what did we nearly ship and what caught it. **Then make those edits and
log the paths.** A retrospective that names a document without changing it has
failed, and a workflow without one is not closed.
