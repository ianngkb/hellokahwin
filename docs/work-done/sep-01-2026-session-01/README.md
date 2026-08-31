# Sprint 05 — "Build where the click is" · work-done index

Session `sep-01-2026-session-01`. One entry per item, newest last. Each entry
carries its own before/after evidence in a sibling `*-EVIDENCE/` directory.

**Append your item here when you ship it.** Several agents work this sprint in
separate worktrees, so this file is a merge point by design — resolve conflicts by
keeping both rows, never by replacing the table.

| Item        | Title                                                            | Log                                                                                          | Exit                                                                                                                                                                        |
| ----------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PLAT-19** | Fourteen stale worktrees, censused by content and cut to two     | [`sep-01-2026-done-plat-19-worktree-census.md`](./sep-01-2026-done-plat-19-worktree-census.md) | **13 of 14 removed, 1 kept.** Deregistered from git and Orca, ~250,000 files deleted. `ui-01-ship` change discarded and archived. Negative control: `pillars-ingest-redirects`, SIG1+SIG2 both FAIL. Gate committed: `scripts/audit-worktree-shipped.sh`. **Residual: 12 empty directory entries held by stray shells, needs `/cleanup-full`** |

## Open findings raised by this session, with their owners

| Finding | Raised by | Owner |
| --- | --- | --- |
| **`git worktree remove --force` is not atomic on Windows.** It deregisters the worktree, then fails to delete the files (`Filename too long` on pnpm's deep `node_modules`, `Access to the path 'checksums' is denied` on pnpm's read-only hardlinks, `Directory not empty` on a locked `.next`). All 12 trees vanished from `git worktree list` while their directories stayed on disk, one holding 70,382 files. **Any audit that reads `git worktree list` as proof of removal inherits a false clean.** Now executable as `audit-worktree-shipped.sh --verify-gone`. | PLAT-19 | platform |
| **Six orphan directories from Sprint 03/04 are still on disk, ~96,000 files**, deregistered but never deleted, invisible to `git worktree list`: `seo07-title-halflife` (38,303), `risk07-noindex` (34,497), `des12-header-wordmark` (11,237), `seo10-faq-schema` (6,290), `risk08-cold-render` (5,930), `seo05-titles` (empty). Not on PLAT-19's pinned census, so left untouched per the brief. They need an item. | PLAT-19 | platform / CEO |
| **`.claude/agents/*.md` are untracked in the site repo but canonical in a different repo** (`buddy/skillcentral/agents/projects/hellokahwin/`). Six personas, ~105 KB, present in every worktree and absent from the main checkout, so `git worktree remove --force` deletes them silently. One tree held the only copy of two variants. Nothing was lost this time; the exposure is structural. | PLAT-19 | platform / CEO |
| The brief's characterisation of the `ui-01-ship` hazard is right in verdict, wrong in mechanism: the uncommitted diff is purely additive and its functional line is **already in master byte for byte** (`9e81bc8`). The revert risk was the 79-commit-stale **base**, not the change. Worth fixing in how these hazards get described at dispatch. | PLAT-19 | CEO |
| **Twelve empty directory entries survive PLAT-19**, held open by stray shell processes from dead sessions. All content deleted (`residual_entries=0`), unregistered by both git and Orca, so they are not worktrees and carry no checkout hazard. Clearing them needs a stray-shell sweep; not run, because five agents were working live during PLAT-19 and a broad process sweep would risk their work. | PLAT-19 | platform / `/cleanup-full` |
| `docs/work-done/README.md`, named in the standing rules, does not exist; the convention is a per-session index. `scripts/measure/count-in-html.sh`, cited in the standing rules, does not exist on `master`. | PLAT-19 | CEO |
