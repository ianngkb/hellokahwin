'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GridIcon } from 'lucide-react';
import { PhotoGallery } from './photo-gallery';
import type { GalleryImage } from './article-renderer';

export interface NextArticleLink {
  title: string;
  href: string;
  thumbnailUrl: string | null;
  /** Base64 LQIP for the thumbnail (UX-04). Small, but it sits over the same
   *  flat `bg-muted` plate every other cover did. */
  lqip?: string | null;
}

interface MobileArticleBarProps {
  /** The one article we most want this reader to open next. Null on a page with no siblings. */
  nextArticle: NextArticleLink | null;
  galleryImages: GalleryImage[];
}

/**
 * The fixed bottom bar on a mobile article page.
 *
 * WHAT IT USED TO BE, AND WHY THAT WAS THE WRONG OFFER
 * ---------------------------------------------------
 * It was a full-width "Lihat Semua Foto (n)" button — the photo gallery. Three
 * things were wrong with that:
 *
 *   1. It was the SAME offer twice. The cover plate already carries a "Lihat
 *      semua foto (n)" pill about 200px from the top of the page. The bar
 *      repeated it in the single most thumb-reachable position on the screen,
 *      so the two most valuable slots on a phone said one identical thing.
 *   2. The gallery is a dead end. It opens a lightbox over the same article and
 *      closes back to the same article. It cannot start a second pageview.
 *   3. It answered a question nobody arrived with.
 *
 * WHAT IT OFFERS NOW: THE NEXT ARTICLE
 * ------------------------------------
 * The reader arrives from a Google result, on a phone, mid-research. The
 * article they land on is up to 13,000px long and the only onward links are the
 * pillar up-link and the related grid, both buried at the bottom, plus a footer
 * further down still. Until this bar changed, a phone visit had essentially one
 * destination: this page. That is the defect UX-01 exists to close, and the
 * header fixes the "where am I / where else can I go" half of it. This bar
 * fixes the other half: "what do I read next", answered without asking the
 * reader to scroll 13,000px to find out.
 *
 * It is a real crawlable `<a href>`, not a dialog trigger, so it also feeds the
 * internal linking the route already cares about elsewhere.
 *
 * The gallery is not lost — it is demoted to a secondary square button beside
 * the link, and it is still primary on the cover where the offer is in context.
 *
 * IT DOES NOT STEAL THE FOLD
 * --------------------------
 * A fixed bar is 64px of the viewport permanently gone. UX-01's other half is
 * getting the first paragraph above the fold, so this bar stays translated out
 * of view until the reader has scrolled past roughly the first screen — by
 * which point they are reading, and "what's next" is a question they might
 * actually have. The hairline across the top is reading progress: in a document
 * this long, "how much is left" is otherwise unanswerable on a phone.
 */
export function MobileArticleBar({ nextArticle, galleryImages }: MobileArticleBarProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const scrolled = window.scrollY;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        setVisible(scrolled > window.innerHeight * 0.6);
        setProgress(scrollable > 0 ? Math.min(1, Math.max(0, scrolled / scrollable)) : 0);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const hasGallery = galleryImages.length > 0;
  if (!nextArticle && !hasGallery) return null;

  return (
    <div
      className={`bg-background fixed inset-x-0 bottom-0 z-40 border-t transition-transform duration-200 ease-out lg:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      /* Keeps the bar clear of the iOS home indicator without padding the bar
         on devices that have none. */
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-hidden={!visible}
    >
      {/* Reading progress. Presentational only — it is announced nowhere,
          because a screen-reader user already knows their position in the
          document and a live percentage would just be noise. */}
      <div className="bg-border absolute inset-x-0 top-0 h-0.5" aria-hidden="true">
        <div
          className="bg-foreground h-full origin-left transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <div className="flex items-stretch gap-2 p-2">
        {nextArticle ? (
          <Link
            href={nextArticle.href}
            className="hover:bg-accent flex min-h-11 min-w-0 flex-1 items-center gap-3 px-1 transition-colors"
            tabIndex={visible ? undefined : -1}
          >
            {/* UI-12 S3 — 44 × 33 = 1.33333, not `size-11`'s 44 × 44 = 1.000.
                THIS IS HARDENING, NOT A LIVE VIOLATION. Measured on production
                31 Ogos 2026 the probed article's thumbnail was 1.333 against a
                1.000 box: 25.0% deviation, which is EXACTLY
                `scripts/ui-layout-gate.mjs`'s ceiling and therefore does not
                fire. It fires the moment the next article's cover is 3:2
                (33.5%) — which is eleven of the twelve covers on the homepage
                right now. One cover away from red.

                `sizes="44px"` is KEPT: this is a real `<Image fill>`, so the
                attribute is live here, unlike the `.s-row` `<img>`s S1 stripped
                it from. 44px is still the box's WIDTH; only the height moves.
                The tap target is the whole `<Link>` row, which keeps
                `min-h-11`, so shrinking the thumbnail by 11px does not touch
                the 44px minimum. */}
            {nextArticle.thumbnailUrl && (
              <span className="bg-muted relative h-[33px] w-11 shrink-0 overflow-hidden">
                <Image
                  src={nextArticle.thumbnailUrl}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                  {...(nextArticle.lqip
                    ? { placeholder: 'blur' as const, blurDataURL: nextArticle.lqip }
                    : {})}
                />
              </span>
            )}
            <span className="min-w-0 flex-1 text-left">
              <span className="hk-eyebrow block">Baca seterusnya</span>
              {/* Two lines then ellipsis: enough for a real Malay headline to
                  be recognisable, not enough to grow the bar into a card. */}
              <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug font-medium">
                {nextArticle.title}
              </span>
            </span>
          </Link>
        ) : (
          <span className="min-h-11 flex-1" />
        )}

        {hasGallery && (
          <PhotoGallery
            images={galleryImages}
            trigger={
              <span
                className="border-border hover:bg-accent flex size-11 shrink-0 items-center justify-center self-center border transition-colors"
                role="button"
                aria-label={`Lihat semua foto (${galleryImages.length})`}
              >
                <GridIcon className="size-4" />
              </span>
            }
          />
        )}
      </div>
    </div>
  );
}
