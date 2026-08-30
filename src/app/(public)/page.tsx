import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { media } from '@/lib/db/schema/media';
import { resolveCoverSource } from '@/lib/storage/responsive-cover';
import {
  HERO_INELIGIBLE_SLUGS,
  isHeroFrameEligible,
  resolveHeroCrops,
} from '@/lib/inspire/hero-frame';
import '@/design-system/tokens.css';
import '@/design-system/components.css';

// ISR — same cadence as the artikel hub.
export const revalidate = 1800;

/**
 * ALL THREE of UI-03 R8's hero-eligibility gates — `HERO_INELIGIBLE_SLUGS`
 * (R8a), `resolveHeroCrops` (R8b) and `isHeroFrameEligible` / `HERO_ASPECT` /
 * `MIN_RETAINED_FRAME` (R8c) — now live in `src/lib/inspire/hero-frame.ts`,
 * INCLUDING the hand-curated class-G slug list, which the Creative Director
 * ruled on 31 Ogos 2026 transfers to any large frame rather than belonging to
 * this page. UI-12 S4 gave them a SECOND
 * caller: `/artikel`'s featured lead plate, which carried the identical
 * selection defect (recency order, no orientation predicate). Lifted verbatim;
 * the homepage's hero selection is unchanged by the move, and the same 20-row
 * buffer, the same three gates and the same order still decide it. The
 * reasoning, the measured corpus counts and the null-is-ineligible rule are all
 * in that module — do not restate them here and do not re-derive the threshold.
 *
 * ⚠️ `HERO_ASPECT` there is tied to `lg:aspect-[88/25]` below, and now also
 * to the `/artikel` lead plate's own copy of that class. Three places, one
 * number; Tailwind needs the literal at each call site so they cannot be shared.
 */
// (No declarations follow: the block above is a signpost to the module that now
// owns them, left here because this is where a reader goes looking for them.)

export const metadata: Metadata = {
  title: 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia',
  description:
    'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia. Rancang majlis impian anda mengikut bajet — semuanya dalam Bahasa Melayu.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia',
    description:
      'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia. Rancang majlis impian anda mengikut bajet.',
    type: 'website',
  },
};

/**
 * Home = the article directory front door.
 *
 * Editorial Monotone layout (Mobbin 2026-08-22 — Julienne, UNIQLO LifeWear,
 * NYTimes): a single full-bleed lead plate with the headline set BELOW the
 * image (never over it), a hairline-flat category rail, then the two-column
 * title-below-image grid. No save icons, no timestamps on cards, no onboarding
 * gate — content within one tap.
 */
const getHomeData = unstable_cache(
  async () => {
    const latestArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        coverImageUrl: articles.coverImageUrl,
        coverImageVariants: articles.coverImageVariants,
        coverImageSmartCrops: articles.coverImageSmartCrops,
        coverImageLqip: articles.coverImageLqip,
        publishedAt: articles.publishedAt,
        categoryName: inspireCategories.name,
        categorySlug: inspireCategories.slug,
        // DES-08 / spec §1.2's fifth device — "the credit is designed, not
        // appended". Same exact-match join the article route already relies
        // on (media.url == coverImageUrl); see that route for the incident
        // this pattern exists to prevent (25 Aug 2026, 8 uncredited covers).
        coverCredit: media.credit,
        coverCreditUrl: media.creditUrl,
        // UI-03 R8(c) — the SOURCE photograph's shape. Free: this rides the
        // `media` leftJoin the credit already needs, so no new query and no new
        // join. Nullable `integer` columns; null means unknown, and unknown is
        // NOT hero-eligible (see `isHeroFrameEligible`). Verified by querying
        // production 31 Ogos 2026: 60 of 86 articles populated, 26 null — but
        // 20/20 within this 20-article buffer, because every null sits in the
        // oldest tail (ranks 58–86) that the buffer never reaches.
        coverWidth: media.width,
        coverHeight: media.height,
      })
      .from(articles)
      .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .leftJoin(media, eq(media.url, articles.coverImageUrl))
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt))
      .limit(20); // buffer above the 13 displayed, so skipping an ineligible
    // hero candidate doesn't also shrink the "Terkini" list beneath it.

    return { latestArticles };
  },
  // ⚠️ BUMPED v3 → v4 BY UI-03, AND IT IS NOT COSMETIC. This select gained
  // `coverWidth`/`coverHeight`, and the Vercel Data Cache persists an
  // `unstable_cache` entry ACROSS deployments — the key is the only thing that
  // scopes it. Ship a wider query under the old key and the first readers after
  // deploy get the previously-cached rows, which have no width or height; R8(c)
  // then reads undefined, scores every article ineligible, and the homepage
  // serves the "Tiada gambar" no-hero plate until the 600s revalidate expires.
  // Any future change to the SHAPE of this select must bump this again.
  ['hk-home-v4'],
  // Tagged, not just time-boxed: every admin write path and the scheduled-
  // publish cron fire `revalidateTag('articles')`. `revalidatePath` does NOT
  // invalidate an `unstable_cache` entry, so without these tags a publish (or
  // an unpublish of content that must come down) would sit in the front-door
  // hero for up to 10 minutes while every other page updated instantly.
  { tags: ['articles', 'inspire-categories'], revalidate: 600 },
);

export default async function HomePage() {
  const { latestArticles } = await getHomeData();
  // All three R8 gates in one pass: (a) the hand-curated class-G slug list,
  // (b) both hero crops exist, (c) the SOURCE photograph is landscape.
  const heroIndex = latestArticles.findIndex(
    (a) =>
      !HERO_INELIGIBLE_SLUGS.has(a.slug) &&
      resolveHeroCrops(a.coverImageSmartCrops) !== null &&
      isHeroFrameEligible(a.coverWidth, a.coverHeight),
  );
  // R8's failure mode, made explicit: if NOTHING in the 20-article buffer is
  // hero-eligible, the lead story still runs — it holds the page's one <h1> —
  // but with the "Tiada gambar" plate instead of a photograph in the wrong
  // shape. A broken plate is worse than no plate.
  const hero = heroIndex >= 0 ? latestArticles[heroIndex] : (latestArticles[0] ?? null);
  const heroCrops = hero && heroIndex >= 0 ? resolveHeroCrops(hero.coverImageSmartCrops) : null;
  // Exclude exactly the article rendered above, and only when one is. The old
  // `filter((_, i) => i !== heroIndex)` kept every article when `heroIndex` was
  // -1 while still rendering `latestArticles[0]` as the hero, printing it twice.
  const heroId = hero?.id;
  const rest = latestArticles.filter((a) => a.id !== heroId).slice(0, 12);

  // --- Hero source ----------------------------------------------------------
  // UI-03 / `docs/design/hero-image-rules.md`. This used to draw `low` (q30,
  // ≤1200px) per breakpoint and called the smart-crop assets too heavy. That
  // reasoning is superseded and the rule that replaces it is R2: `low` follows
  // the SOURCE aspect ratio, and this corpus's sources are frequently portrait,
  // so `low` can never fill a landscape hero correctly at ANY quality — no
  // amount of `object-fit: cover` makes a 0.667 photograph into a 3.520 plate;
  // it only decides which two thirds of it you throw away.
  //
  // Worse, `low` and the hero crop were declared as interchangeable WIDTH
  // candidates in one `srcset`, so which of two differently-shaped photographs
  // a reader saw was decided by their DPR and viewport rather than by art
  // direction (measured on production 31 Ogos 2026: `low.webp` at 1920×900,
  // `crop-4.3x1-desktop-hero.webp` at 768×1024 @2). Art direction across
  // breakpoints is `<picture>` + `<source media>`, and only that — R3.
  //
  // THE PRICE, STATED, AND IT IS NOT SMALL. Measured across all 13 homepage
  // covers on 31 Ogos 2026 — not off the old hero, whose small files were a
  // SYMPTOM of the defect (a blurry 19% sliver of a portrait compresses well):
  //
  //   crop-16x9-og              278–425 KB (median ~318)  ← mobile/tablet band
  //   crop-4.3x1-desktop-hero   535–916 KB (median ~624)  ← desktop band
  //
  // Mobile's LCP image goes from 54 KB (`low.webp`, wrong shape) to ~425 KB for
  // the article that now holds the hero: about +371 KB. The desktop asset sits
  // behind `<source media="(min-width: 1024px)">`, so phones never fetch it.
  // That regression is accepted with open eyes, not buried — the DoD forbids
  // `low`, and these are the only aspect-correct assets that exist.
  //
  // WHY THEY ARE THE ONLY ONES, which is the real pipeline finding: this
  // pipeline produces two families and neither can serve a hero.
  //   `low`/`high`/`original` — quality-graded, but follow the SOURCE aspect.
  //   the smart crops         — aspect-correct, but exist at ONE quality: full.
  // There is no aspect-correct, quality-reduced derivative anywhere in it.
  // DES-08 met the same matrix, chose bytes over shape, and that is how a
  // portrait ended up in a landscape box; UI-03 chooses shape over bytes
  // because the DoD says so. Neither choice is right — the missing cell is.
  // The ask is a q30–q50 variant of the LANDSCAPE CROPS (a q30 `crop-16x9-og`
  // at 1200×630 should land near 80–120 KB, comparable to `low`'s 54 KB and
  // correctly shaped), not merely a smaller crop. It is not free: adding a
  // target changes `GEOMETRY_VERSION` and re-queues every live cover through
  // Rekognition + R2, an AWS-cost decision that belongs to the owner.

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';

  return (
    <div className="hk">
      {/* DES-09 G18: "Homepage and /artikel emit Organization + WebSite" —
          0 @type values today, named as "a gap the redesign should close,
          not a regression it would cause". Closing it here; /artikel itself
          is DES-06's page, not this item's. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                name: 'HelloKahwin',
                url: baseUrl,
                logo: `${baseUrl}/hellokahwin-logo.png`,
              },
              { '@type': 'WebSite', name: 'HelloKahwin', url: baseUrl, inLanguage: 'ms' },
            ],
          }).replace(/</g, '\\u003c'),
        }}
      />
      {/* --- Lead story ---------------------------------------------------
          Spec §5.3: figure first, then eyebrow / h1 / deck / credit in the
          figcaption below it — never set over the photograph. The homepage's
          h1 IS the hero headline (spec §9.1: "not the wordmark — the wordmark
          is a link, not a heading"), a real element, once, no sr-only stand-in
          and no second h1 hiding at another breakpoint. */}
      <section className="pt-6 lg:pt-10">
        {hero ? (
          <article>
            <Link href={`/artikel/${hero.categorySlug}/${hero.slug}`} className="group block">
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
                  hero.coverImageLqip
                    ? { backgroundImage: `url(${hero.coverImageLqip})` }
                    : undefined
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
                    <source
                      media="(min-width: 1024px)"
                      srcSet={`${heroCrops.desktop.url} ${heroCrops.desktop.width}w`}
                      sizes="100vw"
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
                {/* `credit` is stored WITH its "Kredit: " prefix already
                    (src/lib/inspire/__tests__/article-file.test.ts) — do not
                    prepend a second one, which is what shipped first and
                    printed "Kredit: Kredit: …" on every credited hero. */}
                {hero.coverCredit &&
                  (hero.coverCreditUrl ? (
                    <a
                      href={hero.coverCreditUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="s-cred mt-3 inline-block"
                    >
                      {hero.coverCredit}
                    </a>
                  ) : (
                    <p className="s-cred mt-3">{hero.coverCredit}</p>
                  ))}
              </div>
            </Link>
          </article>
        ) : (
          <div className="s-pad border-border mx-4 border border-dashed p-12 text-center">
            <p className="s-deck mx-auto">
              Belum ada artikel. Kandungan akan datang tidak lama lagi — jumpa lagi!
            </p>
          </div>
        )}
      </section>

      {/* The homepage used to carry its own category rail here. It is gone on
          purpose. It was a SECOND navigation, built from a different query than
          the masthead's — article counts vs. the admin-managed
          `inspire_nav_items` — and the two disagreed. Measured on production
          2026-08-26 they shared only 6 of their links: the rail promoted 4
          child categories that were never pillars (`perancangan`,
          `gubahan-dulang-hantaran`, `mas-kahwin-ikut-negeri-panduan`,
          `nisbah-dulang-duit-hantaran`) and silently omitted 3 real ones
          (`busana-pengantin`, `pelamin-kad-cenderahati`,
          `sebelum-nikah`). Two rails within ~200px of each other, telling a
          reader two different stories about what this site contains. The
          masthead is the one navigation. Deleting this also takes a whole
          category query and its article-count subquery off the homepage. */}

      {/* --- Terkini: list rows, not cards ----------------------------------
          Spec §5.3/§9.1: this section's own label is the page's h2 ("Terkini");
          each row title is h3 (the hero already holds the page's one h1, so a
          second h2 level here would leave nothing between it and the row
          titles). List rows, not the card grid — spec §5.2's own reasoning:
          twelve cards runs ~4,000px of scroll, twelve rows ~1,150px. */}
      {rest.length > 0 && (
        <section className="s-pad mx-auto max-w-3xl pt-10 lg:pt-16">
          {/* A real <h2>, not a styled div. Spec §9.1 assigns the homepage's h2
              to "Terkini and each subsequent section label" — and DES-09 G02
              requires the first heading after the h1 to be an h2, so styling
              this as a label while leaving the level out would ship an
              h1→h3 skip: the exact defect this rebuild is here to fix, in a
              new place. `.s-label` is the visual style; h2 is the level. */}
          <h2
            className="s-label"
            style={{ borderTop: '2px solid var(--fg)', paddingTop: 12, display: 'block' }}
          >
            Terkini
          </h2>
          <div>
            {rest.map((article, i) => {
              const cover = resolveCoverSource(
                article.coverImageVariants as Record<string, { url: string }> | null,
                article.coverImageSmartCrops,
                article.coverImageUrl,
              );
              return (
                <a
                  key={article.id}
                  href={`/artikel/${article.categorySlug ?? 'artikel'}/${article.slug}`}
                  className={cover ? 's-row' : 's-imgless'}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {/* UI-01: the rank number `.s-row` reserves a 44px desktop track
                      for. DES-08 built this row without it, so grid auto-placement
                      put the headline wrapper in the number's track — 44px wide and
                      225-307px tall on all twelve production rows. Format matches
                      the two call sites that already work (CategoryRow and the
                      article related list): zero-padded two-digit, tabular figures.
                      `.s-idx` is display:none below 1024px, so mobile is untouched. */}
                  <span className="s-idx">{String(i + 1).padStart(2, '0')}</span>
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- see hero note above
                    /* UI-12 S1/S2. No `srcSet` (the `1200w` descriptor was
                       asserted, not read — see responsive-cover.ts) and no
                       `sizes` (inert without a srcset, and it read like a
                       geometry declaration for a slot that is 80px wide on a
                       phone). `width`/`height` stay 176×132 = 1.33333, the same
                       ratio `.s-row img` sets in both bands; R6 is satisfied by
                       the CSS box, which is fixed in both axes and reserves the
                       layout itself, and these attributes cannot disagree with
                       it. */
                    <img
                      src={cover.src}
                      width={176}
                      height={132}
                      loading="lazy"
                      decoding="async"
                      alt=""
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <h3 className="t">{article.title}</h3>
                    <span className="s-dim" style={{ fontSize: 13 }}>
                      {article.categoryName}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
          <div className="pt-6 text-center">
            <Link href="/artikel" className="s-btn" style={{ display: 'inline-flex' }}>
              Lihat semua artikel
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
