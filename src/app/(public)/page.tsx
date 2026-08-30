import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { media } from '@/lib/db/schema/media';
import { resolveCoverSource } from '@/lib/storage/responsive-cover';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import '@/design-system/tokens.css';
import '@/design-system/components.css';

// ISR — same cadence as the artikel hub.
export const revalidate = 1800;

/**
 * Spec §6.1/§6.3: a class-G cover (a wide documentary frame — a procession, a
 * crowd at a distance) is never assigned as the homepage hero, DES-08's
 * largest single frame — "if the only candidate photograph for a new article
 * is class G, the article ships with the no-cover layout… rather than an
 * enlarged class-G frame."
 *
 * This is NOT automated. `coverImageDetectionData` (AWS Rekognition
 * faces/labels, meant to give exactly this signal) is EMPTY for the entire
 * recent corpus checked here — `REKOGNITION_ENABLED` was off at ingest, so
 * there is no face count, no label, nothing to threshold on. Image aspect
 * ratio doesn't discriminate either (every `low` derivative resizes to the
 * same ~1.5:1 regardless of subject — checked against 8 recent covers).
 *
 * So this is a hand-curated, disclosed stopgap: the one cover visually
 * confirmed as a wide group/procession shot (13 people across a street,
 * DES-02's exact failure mode) is named here by slug and skipped for hero
 * placement only — it still displays normally as a small "Terkini" row,
 * where enlargement isn't the risk. A real fix needs either Rekognition
 * turned back on for new ingests or an editorial cover-class field (spec
 * §6.1: "cover class is an editorial selection input") — named as a
 * follow-up in the DES-08 work-done entry, not invented here.
 */
const HERO_INELIGIBLE_SLUGS = new Set<string>(['persiapan-hantaran-kahwin']);

/**
 * UI-03 / `docs/design/hero-image-rules.md` R8 — the SECOND hero-eligibility
 * gate, and unlike the slug list above it is fully automatic.
 *
 * R2: `low`, `high` and `original` preserve the SOURCE aspect ratio, and this
 * corpus's sources are frequently portrait (the current hero's is 1200×1800).
 * A portrait asset can never fill a landscape hero box correctly at any
 * quality, so those three variants are never hero-eligible — only a named
 * landscape crop target may fill a lead plate.
 *
 * `resolveCoverSource()` falls back to `low`/`coverImageUrl` when a smart crop
 * is missing, which is right for a 176px row and wrong for a full-bleed plate:
 * it is exactly how a 0.667 portrait ended up stretched across a 2.40 box on
 * production. So an article missing EITHER hero crop is skipped for hero
 * placement, the same way a class-G frame is skipped above. It still displays
 * normally in "Terkini", where no landscape box exists to be wrong about.
 *
 * All 13 current homepage covers carry both crops (verified by HTTP HEAD,
 * 31 Ogos 2026), so this gate does not fire today. It is a guard.
 */
function resolveHeroCrops(smartCrops: unknown): { desktop: string; og: string } | null {
  const desktop = getSmartCropUrl(smartCrops, 'crop-4.3x1-desktop-hero');
  const og = getSmartCropUrl(smartCrops, 'crop-16x9-og');
  return desktop && og ? { desktop, og } : null;
}

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
  ['hk-home-v3'],
  // Tagged, not just time-boxed: every admin write path and the scheduled-
  // publish cron fire `revalidateTag('articles')`. `revalidatePath` does NOT
  // invalidate an `unstable_cache` entry, so without these tags a publish (or
  // an unpublish of content that must come down) would sit in the front-door
  // hero for up to 10 minutes while every other page updated instantly.
  { tags: ['articles', 'inspire-categories'], revalidate: 600 },
);

export default async function HomePage() {
  const { latestArticles } = await getHomeData();
  // Both hero gates, in one pass: the hand-curated class-G slug list and R8's
  // automatic "has both landscape crops" test.
  const heroIndex = latestArticles.findIndex(
    (a) => !HERO_INELIGIBLE_SLUGS.has(a.slug) && resolveHeroCrops(a.coverImageSmartCrops) !== null,
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
  // The price, stated: mobile's LCP image goes 54 KB → 224 KB, +170 KB. That is
  // what R2 costs on a site whose audience is on cheap Android, and it is why
  // §3 of the spec files `crop-40x21-hero-sm` (~1170px, ~150 KB) as a costed
  // pipeline follow-up rather than pretending the current sizes are right.

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
                    ≥1024px  88/25 = 3.520  ← crop-4.3x1-desktop-hero 2464×700
                  A third band would make the plate shape non-monotonic, so
                  `sm:aspect-[16/9]` and the old `lg:aspect-[2.4/1]` (which
                  matched no asset the pipeline produces) are both gone. 88/25
                  is also what puts the h1 back on the first screen: it makes
                  the plate 545px at 1920×900 — 60.6% of the viewport, under
                  R7's 60%-ish ceiling — where 2.4/1 made it 88.9% and pushed
                  the headline to y=1024, off-screen. */}
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
                        intrinsic width. This crop was declared `1600w` and is
                        genuinely 2464w — a 54% understatement that corrupted
                        every selection decision the browser made. One
                        candidate per band, because these are two different
                        photographs and `srcset` chooses a SIZE, not a CROP. */}
                    <source
                      media="(min-width: 1024px)"
                      srcSet={`${heroCrops.desktop} 2464w`}
                      sizes="100vw"
                    />
                    {/* No eslint-disable needed here: `@next/next/no-img-element`
                        does not fire on an `<img>` inside a `<picture>`, which
                        is the one thing next/image cannot express — it has no
                        art-direction API. `images.unoptimized` is set anyway,
                        so next/image was never resizing these. */}
                    <img
                      src={heroCrops.og}
                      srcSet={`${heroCrops.og} 1200w`}
                      sizes="100vw"
                      alt={hero.title}
                      /* R6: the DEFAULT source's real intrinsic dimensions.
                         These read 1200×500 before — an aspect of 2.4 that
                         described neither asset in the srcset, so the browser
                         reserved the wrong box and the page shifted. */
                      width={1200}
                      height={630}
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
            {rest.map((article) => {
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
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- `images.unoptimized` is set, so next/image never resizes these; it would only add a wrapper. (The hero's <img> needs no disable — it is inside a <picture>.)
                    <img
                      src={cover.src}
                      srcSet={cover.srcSet}
                      sizes="176px"
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
