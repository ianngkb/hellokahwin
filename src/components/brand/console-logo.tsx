import { cn } from '@/lib/utils';
import { SiteWordmark } from './site-wordmark';

/**
 * Console brand lockup — the HelloKahwin wordmark plus a surface label.
 *
 * Reuses the public outlined artwork. Console themes use data-theme rather
 * than the public dark class, so the colour follows that ancestor explicitly.
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
    <span className={cn('flex items-center gap-2', className)}>
      <SiteWordmark className="h-[20px] text-black [[data-theme=dark]_&]:text-white" />
      {subtitle ? (
        <span className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.14em] uppercase">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
