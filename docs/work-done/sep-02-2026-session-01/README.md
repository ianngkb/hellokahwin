# Sprint 06 — "Deepen where the click is" · work-done index

Session `sep-02-2026-session-01`. One entry per item, newest last. Each entry
carries its own before/after evidence in a sibling `*-EVIDENCE/` directory.

**Append your item here when you ship it.** Several agents work this sprint in
separate worktrees, so this file is a merge point by design — resolve conflicts
by keeping both rows, never by replacing the table.

This directory is on **`master`**, not the docs line: `docs/work-done/**` is the
record of a change and lives beside the change, per the path map in
[`scripts/git-hooks/README.md`](../../../scripts/git-hooks/README.md).

| Item       | Title                                                          | Log                                                                            | Exit |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---- |
| **UI-19**  | Finish the article rail: SUMBER under the CEO ruling, and the two ways the rail can go quiet | [`sep-02-2026-done-ui-19-rail.md`](./sep-02-2026-done-ui-19-rail.md) | **Rail measured RIGHT of the body on 5 live articles at 1024/1440/1920** (gap 64px at every one), full-width at 390, measure 64.4–66 cpl. **SUMBER live on 13 of 92**; the specified order Rekod → contents → Sumber observed whole for the first time. Gate gains **checks 13 `rail-missing` and 14 `sumber-empty`**, four committed fixtures, each bad file its control minus ONE byte range asserted at run time |

## Open findings raised by this session, with their owners

| Finding | Raised by | Owner |
| --- | --- | --- |
| **The rail speaks for exactly half the sourced corpus.** Measured 02 Sep 2026 over all 92 articles: 13 carry a standalone `Sumber:` paragraph, which `extractSources()` lifts into the rail, and a **disjoint** 13 carry an `<h2 id="sumber">Sumber</h2>` section in the body with a full reference list under it and **nothing in the rail**. No article uses both conventions. 26 of 92 are sourced; the rail shows a source on 13. Widening the extractor is a design decision — those entries are full bibliographic references and a rail child lays out in 268px — so it is raised rather than taken inside a layout item. Reproduce with `pnpm ui:sources`. | UI-19 | CEO / editorial / creative-director |
| **`narrow-text-column` reports `<td><p>` table cells as text columns on live articles.** `hantaran-wajib-atau-adat` fires it 15× at 390 and 6× at 1024/1440/1920 — cells 72.7–117.3px wide — on production, unchanged. Every article carrying a comparison table therefore fails the gate on a defect nobody introduced. Either the check needs a table-cell exclusion with its own discriminator case, or the tables need a mobile treatment. Not touched by UI-19, which would have been narrowing check 1 sideways inside a rail item. | UI-19 | design-systems-engineer (own item) |
| **Corpus figures written into source comments went stale in one day.** `article-sources.ts` and `article-rail.tsx` both carried "34 of 86" / "52 of 86", measured 01 Sep and wrong by 02 Sep when the corpus reached 92 and the rail-visible figure was 13. Both are now pointers to `pnpm ui:sources` instead of numbers. This is the fourth consecutive session in which a carried figure was wrong. | UI-19 | CEO (the pattern), design-systems-engineer (these two files, **done**) |
| **`docs/work-done/README.md` — CLOSED.** Named in every sprint's standing rules and missing for three sessions; PLAT-19 and DES-18 each filed it as an open finding after going to look. Written by UI-19 as an index of the per-session directories plus the branch rule, deliberately not as a log. | UI-19 | **done** |
