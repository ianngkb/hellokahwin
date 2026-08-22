# Deferred work — HelloKahwin admin console facelift

Branch `ianng89/admin-facelift`. Opened 2026-08-23 during review-fix cycle 1
against `review-findings-cycle1.md` (GPT-5.6 Sol, full 3-layer, commit
`4ced528`). Everything triaged **PATCH** was fixed in that cycle; what follows
is what was deliberately NOT fixed there, and who owns it.

## Deferred

1. **[HIGH][Acceptance][SPEC §5.6] `pnpm build` cannot complete in this
   worktree.** The static prerender of the public pages needs env vars and a
   reachable DB that this worktree does not have — a confirmed environment gap,
   not a code defect. **Owner: the `/buildit` pre-flight gate**, which runs the
   full build in a configured environment; acceptance criterion 6 is satisfied
   there, not here. `typecheck`, `lint` and `test` all pass locally.

2. **[MEDIUM][Acceptance][SPEC §4 WI-6] Screenshot evidence is after-only.**
   `implementation-artifacts/screens/` holds after-facelift composites, not the
   per-route before/after matrix in both light and dark that WI-6 asks for.
   **Owner: ship verification / a follow-up pass** — the before halves need a
   pre-`4ced528` checkout rendered against a configured environment, which is
   the same blocker as item 1.

## Notes for the next review cycle

- **`prefetch={false}` is now deliberately split, not inconsistent.** Finding 4
  removed it from the sidebar nav rows because those links replaced the old
  top-bar links, so suppressing prefetch there *changed* the request behaviour
  of navigation that already existed (spec §2). The same removal was applied to
  `admin-group-tabs.tsx`, whose links are new chrome with no prior behaviour to
  preserve. It was deliberately KEPT in `filter-pills.tsx`: those pills replaced
  a `<select>` + `router.push`, which issued no prefetch at all, so keeping it
  is what preserves the existing mechanics exactly (finding 5's own wording).
- **`handleFilter`'s key union still admits `'status'`** in
  `articles-table.tsx` even though the status branch now goes through
  `FilterPills`. Left as-is rather than narrowed — out of scope for this cycle.
- **The media list view now renders thumbnails through `MediaCell`**, which
  paints a CSS background rather than a `next/image`. That is the primitive
  finding 7 mandates; it trades per-thumbnail image optimisation for the
  console's mandated composition. Flagging it in case a later pass wants
  `MediaCell` to grow an optimised-image path.
