# Review findings — cycle 1 (GPT-5.6 Sol, full 3-layer, commit 4ced528)

Verdict: FINDINGS (1 high, 6 medium, 7 minor). Orchestrator triage below —
**PATCH** items must be fixed this cycle; **DEFER** items go to
`deferred-work.md` with a one-line note; **PROCESS** items are owned by the
ship pipeline, not code.

## PROCESS (no code change this cycle)
1. [HIGH][Acceptance][SPEC:§5.6] `pnpm build` cannot complete locally (static
   prerender of public pages needs env + DB this worktree lacks). Owned by the
   /buildit pre-flight gate, which runs the full build in a configured
   environment. Confirmed environment gap, not a code defect.
2. [MEDIUM][Acceptance][SPEC:§4 WI-6] Screenshots are after-only composites,
   not per-route before/after matrix in both themes. DEFER to ship
   verification / follow-up pass — note it in deferred-work.md.

## PATCH — fix now
3. [MEDIUM][Blind+Edge] `src/app/(admin)/admin-command-palette.tsx:33` —
   active index persists while the query narrows results; Enter can navigate
   to the wrong destination. Track the active selection by href (preserve if
   still present, else reset to first) rather than numeric index.
4. [MEDIUM][Acceptance] `src/app/(admin)/admin-nav-contents.tsx:58` —
   `prefetch={false}` changes request behavior, violating the spec's
   zero-data-flow-change contract (§2). Remove it; keep default prefetching.
5. [MEDIUM][Acceptance] `src/app/(admin)/admin/inspire/articles-table.tsx:336`
   — `FilterPills` exists but has zero call sites; the status filter is still
   a `<select>`. Wire `FilterPills` into the applicable filter bars,
   preserving the existing URL-state mechanics exactly.
6. [MEDIUM][Acceptance] `src/app/globals.css:434` — `font-mono` / `.num`
   remapped to proportional Geist, contradicting spec §3 ("tabular/mono
   figures for every metric and count"). Restore Geist Mono for metrics and
   numeric cells.
7. [MEDIUM][Acceptance] `src/components/media/media-gallery.tsx:325` — media
   gallery still on bespoke markup (raw `<table>`, own empty state).
   Recompose both media views with the console primitives the spec mandates:
   `EmptyState`, `ConsoleTable`, `.num`, `MediaCell`.
8. [MINOR][Blind] `src/app/(admin)/admin-group-tabs.tsx:32` — links rendered
   as ARIA tabs without tabpanels; keyboard/screen-reader contract broken.
   Render as a `<nav>` of styled links with `aria-current="page"`.
9. [MINOR][Edge] `admin-command-palette.tsx:39` — key-repeat on Ctrl/Cmd+K
   toggles repeatedly. Ignore `e.repeat`; prefer `setOpen(true)` semantics.
10. [MINOR][Edge] `src/app/(admin)/use-admin-nav-state.ts:83` — concurrent
    tabs overwrite each other's pins (last-write-wins on one snapshot).
    Persist each pinned href independently in localStorage (simple key-per-
    href or merge-on-write; no need for navigator.locks).
11. [MINOR][Edge] `admin-nav-contents.tsx:103` — pin button `opacity-0` until
    hover makes pinning undiscoverable on touch. Keep controls visible under
    `@media (hover: none)`.
12. [MINOR][Edge] `src/components/console/console-theme-toggle.tsx:32` —
    toggle state desyncs when another tab changes the theme cookie. Sync
    local state to `initialTheme` prop changes in a useEffect.
13. [MINOR][Edge] `src/app/(admin)/admin-mobile-nav.tsx:42` — fixed `w-80`
    sheet overflows sub-320px viewports. Use `w-[min(20rem,100vw)] max-w-full`.
14. [MINOR][Acceptance] `src/app/(admin)/admin-sidebar.tsx:19` — rail is
    `w-56`, spec WI-1 requires `w-64`. Change to `w-64`.
15. [MINOR][Acceptance] `src/components/media/media-gallery.tsx:241` — remove
    the decorative single-tab "Library" row (violates the 2+-destinations
    group-tab rule); the console shell owns second-level navigation.

## Rules for this cycle
- Zero functional change remains the contract — these fixes restore it.
- Commit locally on this branch when done; never push (the ship flow owns that).
- Update `deferred-work.md` with items 1–2.
- Do not re-run /imdone; the orchestrator re-reviews first.
