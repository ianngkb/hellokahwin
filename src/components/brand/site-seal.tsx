import { EDITORIAL_SEAL_SVG } from './editorial-seal-svg';
import { cn } from '@/lib/utils';

/** Decorative companion to the named wordmark; inline SVG follows the surface colour. */
export function SiteSeal({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-12 shrink-0 text-black dark:text-white [&_svg]:block [&_svg]:size-full',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: EDITORIAL_SEAL_SVG }}
    />
  );
}
