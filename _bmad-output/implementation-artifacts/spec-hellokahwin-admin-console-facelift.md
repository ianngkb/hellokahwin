# Spec — HelloKahwin Admin Console Facelift ("Monochrome Precision")

**Branch:** `ianng89/admin-facelift`
**Date:** 2026-08-23
**Status:** auto-accepted (autopilot Phase 2, one-spec rule)

---

## 1. Intent

Adopt The Wedding Notebook's admin console UI/UX — codename **Monochrome
Precision** — across HelloKahwin's existing admin surface, with **zero change
to functionality, data flows, server actions or backend APIs**. Every feature
that works today works identically afterwards; only the skin, the shell and
the composition change.

### 1.1 Brief-vs-reality reconciliation (logged decision)

The dispatch brief described the target as `./frontend`, "React 18 + Tailwind",
with pages `PublishingDashboard`, `ContentDiscovery`, `ReviewWorkspace`,
`TranslationWorkspace`, `Settings`. **None of that exists in this repo.**
HelloKahwin is a Next.js 15 App Router application; its admin lives in the
`(admin)` route group at `src/app/(admin)/admin/**` and its real screens are:

| Real screen | Route |
|---|---|
| Articles (list, filters, bulk actions, pagination) | `/admin/inspire` |
| Article editor | `/admin/inspire/[article-id]/edit` |
| Create article | `/admin/inspire/create` |
| Categories | `/admin/inspire/categories` |
| Tags (+ merge review) | `/admin/inspire/tags`, `/tags/merge` |
| Authors | `/admin/inspire/authors` |
| Navigation builder | `/admin/inspire/navigation` |
| Dynamic Blocks (list, create, edit) | `/admin/inspire/dynamic-blocks` |
| Media library | `/admin/inspire/media` |

The *intent* of the brief is unambiguous, so the work targets the real screens.
The named-but-nonexistent pages are treated as a stale description, not scope.

### 1.2 The key discovery that shapes the plan

`src/app/globals.css` **already contains the complete Monochrome Precision
token layer** ported from TWN (lines ~460–660): the full neutral ramp, status
chroma, chart ramp and sidebar tokens in oklch, plus the `[data-theme='dark']`
flip, plus the `.console-table` skin (~753–820) and the console button metrics
(~690–740). All of it is scoped to `.font-ui-sans` / `.ds-surface-console`.

**Nothing opts in.** `grep -rn "font-ui-sans" src --include=*.tsx` returns zero
hits. So today every admin page renders with the public Plum Forward palette
and a 48px top-bar of plain text links. The console primitives that do exist
(`ConsoleTable`, `StatCard`, `SectionCard`, `Chip`, `EmptyState`, `FormField`,
`PageHeader`, `Tabs variant="line"`) resolve against the wrong tokens.

Therefore this is **activation + shell construction + screen composition**, not
a from-scratch design port. That materially lowers risk: the colour layer is
already reviewed and shipped, we are wiring it up.

---

## 2. Non-goals (hard boundaries)

- **No behaviour change.** No server action, query, mutation, route, form field
  name, validation rule, permission check or API contract is altered.
- **No public-site change.** The Plum Forward palette, the public routes, the
  `(admin-preview)` group (deliberately dressed as the public site so drafts
  preview truthfully) and the `(print)` group (deliberately bare for PDF) are
  untouched.
- **No Next.js-specific or TWN-specific infrastructure ported.** No parallel
  `@modal` routes, no `admin_users`/permissions tables, no `unstable_cache`
  badge machinery, no TWN brand assets.
- **No new backend dependency.** Nav/search/palette are client-side over a
  static registry.

---

## 3. Design contract (from `admin-vendor-design-system.md`)

1. **Ink on paper.** One neutral ramp. Colour reserved exclusively for status.
2. **Numbers are data.** Tabular/mono figures for every metric and count.
3. **Hairlines, not shadows.** 1px `--border`/`--hairline`; cards sit flat.
4. **Density with air.** 12–20px padding, never cramped.
5. **The console is a tool.** Vercel/Linear quiet, fast, precise.

Geometry: card radius 12px, control 8px, pill 999px. Sidebar 224–256px. Table
cell padding 12px 18px. Type: page title 25px/600/-0.03em · card title 14px/600
· body 13.5px · label 12.5px · micro-label 10.5–11px uppercase 0.06em.

Dark mode: `data-theme` on the console shell root only (never `<html>`),
cookie-persisted and read server-side so there is no flash.

---

## 4. Work items

### WI-1 — Console shell (the centrepiece)
Replace `src/app/(admin)/layout.tsx`'s top-bar with the TWN shell, translated:

- Root `<div id="console-root" data-theme={cookieTheme}
  className="font-ui-sans bg-background text-foreground flex min-h-screen">`
  — this single line is what activates the entire token layer.
- `AdminSidebar` — sticky, full-height, `w-64`, `bg-sidebar`, hairline right
  border, brand lockup header, hidden below `lg`.
- `AdminNavContents` — filter input over the flattened destination list,
  pinnable favourites (localStorage, `useSyncExternalStore`, SSR-safe),
  group rows with lucide icons, active state, count badges.
- `AdminMobileNav` — `Sheet` trigger below `lg`, same nav contents.
- Sticky blurred command bar — mobile nav + ⌘K search + theme toggle + Clerk
  `UserButton` (kept as-is; it is auth functionality).
- `AdminGroupTabs` — shell-owned second-level tab row driven by the registry.
- `ConsoleThemeToggle` — flips `data-theme` on the nearest `.font-ui-sans`
  ancestor, writes the `console-theme` cookie.

### WI-2 — Nav registry
`src/app/(admin)/admin-nav-sections.ts`: groups → tabs, `exact` matching for
prefix-colliding hrefs (`/admin/inspire` vs `/admin/inspire/media`),
`flattenAdminNav`, `searchAdminNav` (ranked), `findGroupForPath`,
`findActiveTabHref`. HelloKahwin has an allowlist, not per-section roles, so
the permissions filter of TWN's version is deliberately omitted — the registry
is a plain constant. Existing `requireAdminSection()` calls in pages stay
untouched.

### WI-3 — Command palette
`AdminCommandPalette` — ⌘K / Ctrl-K, built on the existing `Dialog` primitive
over `searchAdminNav`. No `cmdk` dependency added.

### WI-4 — Primitive gaps
- `ConsoleLogo` — HelloKahwin brand lockup, monochrome, inherits `--foreground`.
- `FilterPills` — `--raise` ghost, `--fill` when active (design-system §5).
- `StatusChip` dot variant on the existing `Chip`.
- `StatCard` mono value + 4-up strip variant, if not already present.
- Verify `EmptyState`, `FormField`, `SectionCard` match the console spec.

### WI-5 — Screen composition
Re-dress each screen listed in §1.1 onto the primitives: `PageHeader` for
titles, `SectionCard` for grouped content, `ConsoleTable` (+ `.num` cells,
`MediaCell`) for tables, `Chip` for statuses, `EmptyState` for empty lists,
`FormField` for forms, filter pills for filter bars. Markup and class changes
only — every handler, action import and prop keeps its identity.

The 3.2k-line `article-editor.tsx` gets **chrome-only** treatment (its
toolbars, panels and side rails), not a rewrite: its editing behaviour is the
highest-risk surface in the app and is explicitly out of scope.

### WI-6 — Verification
`pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build`, plus a manual
render pass of every admin route in both themes with before/after screenshots
recorded under `_bmad-output/implementation-artifacts/screens/`.

---

## 5. Acceptance criteria

1. Every route in §1.1 renders without error, signed in as an admin.
2. Every existing interaction still works: article search/filter/bulk actions/
   pagination, category & tag CRUD, tag merge, author CRUD + avatar upload,
   navigation drag-and-drop reorder, dynamic-block create/edit, media upload,
   article create/edit/autosave/schedule/share-draft.
3. The admin surface renders in the monochrome ramp — no plum/brand chroma
   except status colours.
4. The theme toggle flips light↔dark for the console only, survives a reload
   with no flash, and never affects the public site.
5. Sidebar navigation, filter, favourites, mobile sheet and ⌘K all reach every
   destination.
6. `typecheck`, `lint`, `test` and `build` all pass.
7. Zero diff to any `actions.ts`, query module, schema, API route or middleware.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Token activation leaks to public site | Scope is `.font-ui-sans` on the `(admin)` root only; `(admin-preview)`/`(print)` untouched and explicitly verified |
| A markup re-dress silently drops a handler | Diff review per file; no `actions.ts` may appear in the diff |
| Dark mode flash | Cookie read server-side in the layout, attribute set during SSR |
| Editor regression | Chrome-only changes to `article-editor.tsx` |
