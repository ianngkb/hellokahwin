# HelloKahwin — Plans

Every plan the CEO produces, filed by the /hellokahwin session that produced
it. One folder per session, named `<mon>-<dd>-<yyyy>-session-<nn>`; files
inside always start with the same date so they sort and search by date.

```
docs/plans/
  aug-23-2026-session-01/
    aug-23-2026-plan-<slug>.md      the plan itself (approval status at top)
    aug-23-2026-brief-<agent>.md    dispatch brief handed to a team member
```

Plans carry an explicit **Status** line: `APPROVED — executing`,
`BLOCKED — <owner-only item it needs>`, `SUPERSEDED by <file>`, or
`ABANDONED — <reason>`.

Since **24 Aug 2026 the CEO holds standing autonomy**, so plans no longer wait
on a board vote. The only genuine blocked state is a missing credential,
budget, or authorisation — the four things only the owner can supply.
(`DRAFT — awaiting board approval` appears on older files and is historical.)


> **⚠ READ THE BLOCKED ROWS AT PLANNING TIME. Added 30 Aug 2026.** A plan marked
> BLOCKED is **finished work waiting on a decision**, which makes these rows the
> highest-value thing in this index. Sprint 04 planning scoped RIGHTS-02 to produce
> a per-photographer worklist that **already existed** in the 25 Aug rights plan —
> blocked for five days on exactly the decision the owner took in that meeting. It
> was found only because the CEO came to update this index at the very end.
> Decision 94 recorded this same lesson for `ceo-memory.md`; it was not generalised
> to here.

| Session | Date | Plan | Status |
|---|---|---|---|
| 01 | Aug 23 2026 | [Malay topical authority — first growth plan](aug-23-2026-session-01/aug-23-2026-plan-malay-topical-authority.md) | APPROVED 23 Aug 2026 (v3) |
| 01 | Aug 24 2026 | [Deploy the revalidate fix, prove it on production, open the queue](aug-23-2026-session-01/aug-24-2026-brief-deploy-revalidate-and-publish.md) | APPROVED — executing (CEO, 24 Aug) |
| 01 | Aug 25 2026 | [Spec — the remaining graphic templates](aug-23-2026-session-01/aug-25-2026-spec-graphic-kit-remaining-templates.md) | APPROVED — executing (managing-editor, 25 Aug) |
| 01 | Aug 25 2026 | [The article-to-graphic map, with alt text](aug-23-2026-session-01/aug-25-2026-map-article-to-graphic.md) | APPROVED — executing (managing-editor, 25 Aug) |
| 01 | Aug 25 2026 | [Inherited image library — ranked rights risk and the request list](aug-23-2026-session-01/aug-25-2026-rights-risk-and-request-list.md) | **UNBLOCKED 30 Aug** — owner will obtain permissions; executed by RIGHTS-02, Sprint 04 |
| 01 | Aug 25 2026 | [Enforcing image credit on every path](aug-23-2026-session-01/aug-25-2026-enforcing-credit-everywhere.md) | **RE-DATED 01 Sept (decision 181) — a SPRINT 06 question.** D168 made it a Sprint 05 question *once RIGHTS-02 had sized it*, and RIGHTS-02 runs IN Sprint 05, so it cannot also be sized by it. RIGHTS-01 already fixed the observed label defect |
| 01 | Aug 30 2026 | [Sprint 04 — *Earn the click*](aug-30-2026-session-01/aug-30-2026-plan-sprint-04.md) | **APPROVED — executing** (owner, 30 Aug) |
| 01 | Aug 31 2026 | [The design artifacts vs what shipped — measured](aug-30-2026-session-01/aug-31-2026-audit-spec-vs-build.md) | **DIAGNOSIS — acted on**; became DES-17/UI-13/UI-17/UI-18 in Sprint 05 |
| 01 | Sep 01 2026 | [Sprint 05 — *Build where the click is*](sep-01-2026-session-01/sep-01-2026-plan-sprint-05.md) | **APPROVED — executing** (owner, 01 Sept) |
| 01 | Sep 01 2026 | [The live image census, grouped by photographer or source](sep-01-2026-session-01/sep-01-2026-rights-census-by-source.md) | **RECORD — current at 01 Sept 2026.** RIGHTS-02. 86 live articles, **808 assets** re-derived (not 281, not 307); 383 covered by the owner's photographer permissions across 10 studios, 216 openly licensed, 2 institutional, **207 unknown-and-named on 14 articles**. Re-runnable: `scripts/measure/rights-census.py` |
