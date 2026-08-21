/**
 * Print route-group layout (spec-article-draft-client-review).
 *
 * Deliberately bare. Compare with the two sibling layouts this one is NOT:
 *   - `(public)/layout.tsx`        — AnnouncementBar + Navbar + Footer + `pt-24 md:pt-[106px]`
 *   - `(admin-preview)/layout.tsx` — Navbar + Footer + the same top padding
 *
 * All of it is omitted here on purpose: a saved PDF must start at the cover
 * image, not at a navigation bar, and the top padding those layouts add to
 * clear the fixed Navbar would otherwise open a blank strip at the top of
 * page 1. There is no `min-h-screen` either — paper has no viewport height,
 * and forcing one can emit a trailing blank sheet.
 *
 * The root layout (`src/app/layout.tsx`) still wraps this tree and injects a
 * few floating client widgets — `<Toaster />` (renders `[data-sonner-toaster]`)
 * and `<ConciergeGate />` (renders `[data-wedding-concierge]`). Those are
 * already suppressed on paper by the `@media print` block in globals.css,
 * which both hides everything outside the print root via `visibility` and
 * `display: none`s those two selectors plus `[data-radix-popper-content-wrapper]`
 * and `nextjs-portal` outright. So there is nothing to strip here.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
