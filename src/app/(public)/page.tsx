import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { media } from '@/lib/db/schema/media';
import { resolveCoverSource } from '@/lib/storage/responsive-cover';
import { getSmartCropRef, type SmartCropRef } from '@/lib/storage/smart-crop-url';
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
 * UI-03 / `docs/design/hero-image-rules.md` R8 — the automatic hero-eligibility
 * gates, alongside the hand-curated slug list above.
 *
 * (b) BOTH hero crops must exist. `resolveCoverSource()` falls back to
 * `low`/`coverImageUrl` when a smart crop is missing, which is right for a
 * 176px row and wrong for a full-bleed plate — it is exactly how a 0.667
 * portrait ended up stretched across a 2.40 box on production. Per R2, `low`,
 * `high` and `original` all preserve the SOURCE aspect ratio, so none of them
 * can fill a landscape hero at any quality. Only a named landscape crop may.
 *
 * `getSmartCropRef` (not `getSmartCropUrl`) because R4 and R6 need each crop's
 * REAL stored width and height, and a crop whose dimensions were never recorded
 * cannot state them. Same rule as (c): unknown is ineligible, never a nominal
 * value asserted in its place.
 */
function resolveHeroCrops(smartCrops: unknown): { desktop: SmartCropRef; og: SmartCropRef } | null {
  const desktop = getSmartCropRef(smartCrops, 'crop-4.3x1-desktop-hero');
  const og = getSmartCropRef(smartCrops, 'crop-16x9-og');
  return desktop && og ? { desktop, og } : null;
}

/**
 * R8(c) — RETAINED FRAME. This is the rule the whole item turns on.
 *
 * Having the right-shaped crop is not the same as having the right PHOTOGRAPH.
 * The hero target is wider than every source in this corpus, so
 * `computeCropWindow` always takes the width-constrained branch, and the
 * surviving fraction of the source's height is exactly
 * `sourceAspect / HERO_ASPECT`. Measured:
 *
 *   source 1.500 (12 of 13 covers) → 42.6% retained → a photograph
 *   source 0.667 (the one that shipped) → 18.9% retained → a texture
 *   threshold 1.16 → 33.0% retained → the line
 *
 * Below roughly a third of the frame a crop stops reading as a photograph of
 * its subject. That 33% is the Creative Director's judgement, owned as
 * judgement — a defensible line, not a derived constant. Everything else here
 * IS derived, which is the point: expressed as a bare `>= 1.15` the test hides
 * its own reasoning and rots the moment the plate's aspect changes.
 *
 * Selection is `publishedAt desc` with no orientation predicate, so before this
 * gate the portrait photograph in the set won the largest slot on the site by
 * recency accident. Fixing only the crop would have shipped a sharp, correctly
 * proportioned photograph of nothing.
 *
 * Corpus, verified against production 31 Ogos 2026 (86 published articles):
 *   0.667 ×6 · 0.748 ×1 · 0.750 ×4 · 0.753 ×1   → 12 disqualified
 *   1.333 ×10 · 1.339 ×1 · 1.414 ×1 · 1.494 ×1 · 1.500 ×33 · 1.504 ×2 → 48 pass
 * 4:3 (1.333) retains 37.9% and passes, so this is not merely a 3:2 filter, and
 * the lowest passing value sits well clear of the 1.16 boundary — no marginal
 * cases.
 *
 * ⚠️ NULLABLE, AND UNKNOWN COUNTS AS INELIGIBLE. Defaulting unknown to eligible
 * is precisely how this defect shipped. Verified by querying production, not by
 * reading code: **60 of 86 articles have width/height populated; 26 are null.**
 * Within the 20-article homepage buffer it is 20/20 with zero nulls — but note
 * WHY that is safe. The 26 nulls are ranks 58–86 by recency, the oldest tail,
 * every one of them; the buffer never reaches them. That is a data fact about
 * where the nulls sit, not a property of this rule. If the buffer ever deepens
 * past ~57 articles, this starts excluding real candidates.
 */
const HERO_ASPECT = 88 / 25; // 3.520 — MUST stay in sync with `lg:aspect-[88/25]` below.
const MIN_RETAINED_FRAME = 0.33; // A hero crop must keep a third of the source frame.

function isHeroFrameEligible(width: number | null, height: number | null): boolean {
  if (width == null || height == null || height <= 0) return false;
  return width / height / HERO_ASPECT >= MIN_RETAINED_FRAME;
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
