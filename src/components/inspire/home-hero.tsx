import Link from 'next/link';
import type { resolveHeroCrops } from '@/lib/inspire/hero-frame';

/** The fields of a home-selection item the lead story renders. */
export interface HomeHeroItem {
  slug: string;
  title: string;
  excerpt: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  coverImageLqip: string | null;
  coverCredit: string | null;
  coverCreditUrl: string | null;
}

export type HomeHeroCrops = ReturnType<typeof resolveHeroCrops>;

/**
 * The homepage lead story: figure, then eyebrow / h1 / deck / credit.
 * Extracted from `src/app/(public)/page.tsx` so its markup can be tested
 * (`__tests__/home-hero.test.tsx`).
 */
export function HomeHero({ hero, heroCrops }: { hero: HomeHeroItem; heroCrops: HomeHeroCrops }) {
  return (
    <article>
      <Link
        href={`/artikel/${hero.categorySlug ?? 'artikel'}/${hero.slug}`}
        className="group block"
      >
        {/* R1: the box follows the asset, never the reverse. Two bands,
            monotonic — the plate widens as the screen widens — and each
            box aspect is the served asset's intrinsic aspect exactly, so
            deviation is 0.0% rather than merely inside R1's 15%:
              <1024px  40/21 = 1.905  ← crop-16x9-og           1200×630
              ≥1024px  88/25 = 3.520  ← crop-4.3x1-desktop-hero ~2464×700
            A third band would make the plate shape non-monotonic, so
            `sm:aspect-[16/9]` and the old `lg:aspect-[2.4/1]` (which
            matched no asset the pipeline produces) are both gone.

            88/25 is also what puts the h1 back on the first screen. R7's
            test is `h1.getBoundingClientRect().top < innerHeight`, and it
            passes at all five measured viewports. Plate height as a share
            of the viewport is a DIAGNOSTIC, not the gate: the plate is
            545px at 1920×900, i.e. 60.6%, reported so the number is on
            the record. The old `2.4/1` made it 800px — 88.9% — and pushed
            the headline to y=1024, off-screen entirely. Anything past
            ~65% is close enough that the h1 position wants checking
            explicitly rather than inferring it from the percentage.

            ⚠️ `lg:aspect-[88/25]` is tied to `HERO_ASPECT` above, which
            derives R8(c)'s eligibility threshold. Tailwind needs the
            literal here, so the two cannot share one constant — change
            this and you MUST change that, or the plate widens while the
            threshold stays put and portrait sources creep back in with
            every check still green. */}
        <div
          className="bg-muted relative aspect-[40/21] w-full overflow-hidden bg-cover bg-center lg:aspect-[88/25]"
          style={
            hero.coverImageLqip ? { backgroundImage: `url(${hero.coverImageLqip})` } : undefined
          }
        >
          {heroCrops ? (
            <picture>
              {/* R4: every `w` descriptor states the asset's REAL
                  intrinsic width — read from the stored crop, never
                  asserted. This crop was declared `1600w` and is
                  genuinely ~2464w: a 54% understatement that corrupted
                  every selection decision the browser made. It is also
                  not a constant — 2463 on 12 of the homepage's 20
                  articles, 2464 on the other 8, because a crop target is
                  a ceiling and the window rounds. One candidate per band,
                  because these are two different photographs and `srcset`
                  chooses a SIZE, not a CROP. */}
              {/* R6 PER BAND — the `<source>`'s own file, stated on the `<source>`.
                  `width`/`height` here are the desktop crop's REAL dimensions
                  (2463×700 = 3.51857), read from the same `getSmartCropRef` ref as
                  the `w` descriptor on the line above, so a future retarget moves
                  all three together or none of them. The `<img>` below keeps
                  `crop-16x9-og`'s 1200×630. Two bands, two files, two truths.

                  ⚠️ WHAT THIS DOES **NOT** DO, measured 31 Ogos 2026 rather than
                  assumed. It does not prevent a layout shift, because there is no
                  layout shift here to prevent. The box is pinned by the WRAPPER's
                  `aspect-[40/21] lg:aspect-[88/25]`, and this `<img>` is
                  `absolute inset-0 h-full w-full` — an absolutely-positioned,
                  fully-inset image cannot size its containing block, so neither
                  its attributes nor the `<source>`'s can move the reserved box.
                  Proved by aborting every image request and comparing the
                  reserved box with these attributes present and stripped in
                  flight: identical at 1024/1440/1920 on this plate
                  — reserved 1024x291 / 1440x409 / 1920x545 either way.

                  So this is defence in depth and an honest declaration, NOT a CLS
                  fix. It starts doing real work the moment someone removes the
                  wrapper's aspect class or stops absolutely positioning the image,
                  which is exactly when a silent reflow would otherwise appear.
                  Do not cite it as a shift fix, and do not expect it to move
                  `image-attr-aspect`: that check reads `img.getAttribute('width')`
                  and never inspects `<source>` (ui-layout-gate.mjs). */}
              <source
                media="(min-width: 1024px)"
                srcSet={`${heroCrops.desktop.url} ${heroCrops.desktop.width}w`}
                sizes="100vw"
                width={heroCrops.desktop.width}
                height={heroCrops.desktop.height}
              />
              {/* No eslint-disable needed here: `@next/next/no-img-element`
                  does not fire on an `<img>` inside a `<picture>`, which
                  is the one thing next/image cannot express — it has no
                  art-direction API. `images.unoptimized` is set anyway,
                  so next/image was never resizing these. */}
              <img
                src={heroCrops.og.url}
                srcSet={`${heroCrops.og.url} ${heroCrops.og.width}w`}
                sizes="100vw"
                alt={hero.title}
                /* R6: the DEFAULT source's real intrinsic dimensions,
                   from the same stored record as the descriptor so the
                   two can never disagree. These read 1200×500 before — an
                   aspect of 2.4 that described neither asset in the
                   srcset, so the browser reserved the wrong box and the
                   page shifted. (This crop is a uniform 1200×630 across
                   all 20 articles today; nothing guarantees it stays.) */
                width={heroCrops.og.width}
                height={heroCrops.og.height}
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            </picture>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="s-meta">Tiada gambar</span>
            </div>
          )}
        </div>

        <div className="s-pad mx-auto max-w-3xl pt-6 text-center lg:pt-10">
          <span className="s-label" style={{ color: 'var(--accent)' }}>
            {hero.categoryName}
          </span>
          <h1 className="s-h1 mx-auto mt-3" style={{ maxWidth: '20ch' }}>
            <span className="decoration-border-strong underline-offset-[0.14em] group-hover:underline">
              {hero.title}
            </span>
          </h1>
          {hero.excerpt && (
            <p className="s-deck mx-auto mt-4" style={{ maxWidth: '60ch' }}>
              {hero.excerpt}
            </p>
          )}
        </div>
      </Link>
      {/* The credit sits OUTSIDE the story <Link>. With a source URL it is
          its own <a>, and an <a> inside an <a> is invalid HTML: the parser
          closes the outer link early and React's hydration fails (#418) on
          every homepage load. Same column, same spacing as before. */}
      {hero.coverCredit && (
        <div className="s-pad mx-auto max-w-3xl text-center">
          {/* `credit` is stored WITH its "Kredit: " prefix already
              (src/lib/inspire/__tests__/article-file.test.ts) — do not
              prepend a second one, which is what shipped first and
              printed "Kredit: Kredit: …" on every credited hero. */}
          {hero.coverCreditUrl ? (
            // UI-11: `hk-tap` replaces `inline-block`. An atomic inline
            // is not "a link in a sentence" under WCAG 2.5.8 — it has
            // its own box — so this credit needed a 24px floor, not an
            // exemption. It measured 236.9 x 15.6.
            <a
              href={hero.coverCreditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="s-cred hk-tap mt-3"
            >
              {hero.coverCredit}
            </a>
          ) : (
            <p className="s-cred mt-3">{hero.coverCredit}</p>
          )}
        </div>
      )}
    </article>
  );
}
