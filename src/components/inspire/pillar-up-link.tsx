import Link from 'next/link';
import type { PillarUpLink } from '@/lib/inspire/pillar-queries';

/**
 * The article's link back up to its pillar (and across to its cluster).
 *
 * This is the "every article links back up" half of the plan's linking rule,
 * and the anchor text is the pillar's Malay ENTITY PHRASE rather than the
 * category name or "baca lagi" — the plan is specific about that, because the
 * anchor is the signal.
 *
 * It renders from the category tree, so it cannot be forgotten on an article
 * and it cannot go stale when a pillar is renamed. Legacy articles outside the
 * pillar architecture pass `null` and render nothing at all.
 */
export function PillarUpLinkBlock({ link }: { link: PillarUpLink | null }) {
  if (!link) return null;

  return (
    <nav
      aria-label="Panduan berkaitan"
      className="border-border bg-muted/30 mt-12 rounded-lg border p-5"
    >
      <p className="hk-eyebrow">Sebahagian daripada panduan</p>
      <p className="mt-2 text-base">
        <Link href={`/artikel/${link.slug}`} className="font-medium underline underline-offset-4">
          {link.anchor}
        </Link>
        {link.cluster && (
          <>
            {' — '}
            <Link
              href={`/artikel/${link.slug}#cluster-${link.cluster.id}`}
              className="underline underline-offset-4"
            >
              {link.cluster.anchor}
            </Link>
          </>
        )}
      </p>
    </nav>
  );
}
