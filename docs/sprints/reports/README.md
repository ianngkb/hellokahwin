# Sprint reports — the permanent record

One HTML report per sprint, written by `/endsprint`. **Newest first.**

A chat transcript gets cleared. These do not. Each report is self-contained —
open it straight off disk, or print it — and carries everything a `/buildit` ship
report carries, at sprint scale: what changed per item in plain English, how to
check it on the live site, migrations flagged, time and tokens per stage, cleanup,
and the retrospective with every file the learnings changed.

## Where the pieces live

| What | Where |
|---|---|
| Sprint state, evidence, retro | `docs/sprints/sprint-NN.json` |
| The report | `docs/sprints/reports/sprint-NN.html` |
| Briefs given to agents | `docs/plans/<session>/` |
| Completed-work logs | `docs/work-done/<session>/` |
| Dev specs | `buddy/_bmad-output/implementation-artifacts/` |

The report **links** to those rather than copying them. They are the primary
sources; the report is the readable view.

## Rules

- A closed sprint's JSON and report are **never rewritten**. History that can be
  revised is not history.
- Parked and blocked items appear in the report with their reason. A sprint that
  quietly drops an item is lying about its velocity.
- Velocity is a measurement, not a target. A sprint that completed 20 of 34
  points because six items were bigger than estimated is information; one that
  reports 34 because items were narrowed is a lie that corrupts the next estimate.

## Index

| Sprint | Name | Planned | Ended | Points (planned / done / parked) | Outcome |
|---|---|---|---|---|---|
| 02 | Close the publishing hole, then earn a click | 26 Aug 2026 | 27 Aug 2026 | 77 / 72 / 5 | Publishing now tells Google — four articles that were invisible left that state in 8 hours. 25 articles shipped, Tier 1 complete, sitemap 78 → 103, Hantaran pillar 13 → 38. Sprint 01's unshipped-items failure did NOT recur; what broke instead was orchestration — four auth stalls that read as success, and a dispatch launcher that put three agents on one item. SEO-04 parked at its own sourcing gate rather than fabricating venue data. |
| 01 | Protect what we shipped, then measure it | 25 Aug 2026 | 26 Aug 2026 | 42 / 40 / 2 | Recovery point + verified restore, the sprint board on buddy.ian.ng, 79 `nofollow` links removed, 5 articles and 145 images live. Three items were marked done unshipped and caught by the owner, not by a check — the retro turned the ship check into a refusal. |
