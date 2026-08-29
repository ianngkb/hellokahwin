import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cn } from '@/lib/utils';

/**
 * The real DES-13 outlined mark, INLINED — not `<img src>`.
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
 * Sized off `--fs-wordmark` (tokens.css, DES-05): `clamp(18px, ..., 24px)`.
 * That floor is not a coincidence — it is `brand-assets.ts`'s stated
 * `minHeight` for the horizontal lockup. Using the token rather than a new
 * literal means the two specs cannot drift apart.
 */
const HORIZONTAL_MARK = readFileSync(
  join(process.cwd(), 'public/brand/logos/hellokahwin-horizontal.svg'),
  'utf8',
);

export function SiteWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-[var(--fs-wordmark)] w-auto align-middle [&_svg]:block [&_svg]:h-full [&_svg]:w-auto',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: HORIZONTAL_MARK }}
    />
  );
}
