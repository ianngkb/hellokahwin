import { cn } from '@/lib/utils';

/**
 * Console brand lockup — the HelloKahwin wordmark plus a surface label.
 *
 * Deliberately TYPE, not the `/hellokahwin-logo.png` asset. The Wedding
 * Notebook paints its logomark as a CSS mask over `currentColor` so one
 * transparent asset re-colours with the theme; HelloKahwin's logo is a fully
 * opaque RGBA PNG on a cream field (verified: alpha is 255 everywhere), so the
 * same mask would render a solid rectangle, and dropping it in as an <img>
 * would plant a cream block in a dark console and reintroduce brand chroma
 * into a monochrome surface. A wordmark set in `--foreground` inverts
 * correctly in both themes for free.
 */
export function ConsoleLogo({
  subtitle,
  className,
}: {
  /** Short surface label rendered beside the wordmark (e.g. "Admin"). */
  subtitle?: string;
  className?: string;
}) {
  return (
    <span className={cn('text-foreground flex items-baseline gap-2', className)}>
      <span className="text-[15px] font-semibold tracking-[-0.02em]">HelloKahwin</span>
      {subtitle ? (
        <span className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.14em] uppercase">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
