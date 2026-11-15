import Link from 'next/link';
import type { SeriesBoxModel } from '@/lib/inspire/series-box';

/**
 * "Dalam siri ini": the other guides in this article's cluster, near the top
 * of the article. Server-rendered, text only, no images and no client
 * JavaScript, so it costs a low-end Android phone nothing but a few lines of
 * HTML. One column on phones, two from `sm` up.
 *
 * Renders nothing for `null`, which is every article whose cluster has the box
 * switched off (the default), or that has no other live article yet.
 */
export function SeriesBox({ box }: { box: SeriesBoxModel | null }) {
  if (!box) return null;

  return (
    <nav
      aria-labelledby="series-box-title"
      className="mb-8 rounded-lg border p-5"
      style={{ borderColor: 'var(--rule)' }}
      data-testid="series-box"
    >
      <p className="hk-eyebrow">Dalam siri ini</p>
      {/* A <p>, not a heading: this is navigation chrome, and a heading here
          would sit ahead of the article's own H2s in the document outline. */}
      <p id="series-box-title" className="mt-1 text-lg font-semibold">
        {box.title}
      </p>
      {box.description && (
        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
          {box.description}
        </p>
      )}
      <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-base sm:grid-cols-2">
        {box.items.map((item) =>
          item.current ? (
            <li key={item.key} aria-current="page" className="py-1 font-semibold">
              {item.title}
              <span className="ml-1.5 text-sm font-normal" style={{ color: 'var(--fg-muted)' }}>
                (sedang dibaca)
              </span>
            </li>
          ) : (
            <li key={item.key}>
              <Link
                href={item.href!}
                className="hk-tap inline-block py-1 underline underline-offset-4"
              >
                {item.title}
              </Link>
            </li>
          ),
        )}
      </ol>
      <p className="mt-3 text-sm">
        <Link href={box.pillarHref} className="hk-tap font-medium underline underline-offset-4">
          Lihat semua panduan {box.pillarAnchor}
        </Link>
      </p>
    </nav>
  );
}
