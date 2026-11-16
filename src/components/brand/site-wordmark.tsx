import { HORIZONTAL_MARK_SVG } from './horizontal-mark-svg';
import { cn } from '@/lib/utils';

/**
 * The approved Refined Classic outlined wordmark, inlined to inherit colour.
 *
 * `/brand`'s cards use `<img src="...svg">`, which is fine there because every
 * card is shown on one fixed ground. An `<img>` referencing an external SVG
 * resolves `currentColor` inside that resource's OWN rendering context, not
 * the host page's — so `color` set on the `<img>` (or an ancestor) never
 * reaches the mark. Silent failure mode: the mark keeps rendering in
 * whatever colour the file's own initial value is, on every ground, on every
 * page, and nothing about that is visibly wrong until you check two grounds
 * side by side. The header is exactly the surface where that would matter —
 * this component and `(admin-preview)` put the same mark on two different
 * grounds — so the SVG's markup is read at the module boundary and injected
 * inline, where `fill="currentColor"` is a genuine CSS cascade and follows
 * the wrapping element's `color` like any other inline content.
 *
 * The markup comes from a bundled string (`./horizontal-mark-svg`), not a
 * `readFileSync` of `public/` — a Cloudflare Worker has no filesystem.
 *
 * An explicit fallback also sizes the logo outside the public token scope
 * (console and login). The caller can set a smaller height where needed.
 */
const HORIZONTAL_MARK = HORIZONTAL_MARK_SVG;

export function SiteWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-[var(--fs-wordmark,24px)] w-auto shrink-0 align-middle text-black dark:text-white [&_svg]:block [&_svg]:h-full [&_svg]:w-auto',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: HORIZONTAL_MARK }}
    />
  );
}
