import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, desc, asc } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { media } from '@/lib/db/schema/media';
import { resolveRowThumbSource } from '@/lib/storage/responsive-cover';
import { resolveHeroCrops } from '@/lib/inspire/hero-frame';
import { selectHomeSet } from '@/lib/inspire/home-selection';
import { EmptyState } from '@/design-system/components';
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
 * the homepage's hero selection was unchanged by the move, and the same three
 * gates in the same order still decide it. The reasoning, the measured corpus
 * counts and the null-is-ineligible rule are all in that module — do not
 * restate them here and do not re-derive the threshold.
 *
 * ⚠️ UI-13 CHANGED WHAT THEY ARE RUN OVER, NOT WHAT THEY DO. The 20-row buffer
 * is gone (see the query below): H6 needs the published corpus, so slot 1 is
 * now the highest-RANKED hero-eligible article under DES-03 §7.5 H6.4 rather
 * than the first eligible row of a recency window. Same predicate, same order
 * of gates, and on today's corpus the same article.
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
    // Ahrefs requires all four of og:title, og:type, og:image and og:url, and
    // the homepage was serving two. `url` is relative on purpose: the root
    // layout sets `metadataBase`, so Next resolves it to the apex. The image is
    // the site default — the same asset the category and tag routes declare;
    // there is no dedicated 1200x630 OG artwork in `public/` yet.
    url: '/',
    images: [{ url: '/hellokahwin-logo.png', width: 886, height: 290, alt: 'HelloKahwin' }],
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
        // production 31 Ogos 2026: 60 of 86 articles populated, 26 null, every
        // null in the oldest tail (ranks 58–86).
        //
        // ⚠️ UI-13 — THE POOL NOW REACHES THAT TAIL. `hero-frame.ts` warns that
        // "if either buffer ever deepens past ~57 articles this starts
        // excluding real candidates, and the fix then is to backfill
        // `media.width`/`height`, not to loosen the rule." This pool is the
        // whole corpus, so it has. Re-measured on production 01 Sept 2026:
        // 26 of 90 rows are null, at recency ranks 62-90. They are
        // hero-INELIGIBLE and nothing more — H6 asks only for their category,
        // so they remain fully selectable as items, and the hero is decided
        // long before rank 62. The backfill is still the fix if it ever
        // matters; nothing here loosens R8(c).
        coverWidth: media.width,
        coverHeight: media.height,
      })
      .from(articles)
      .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .leftJoin(media, eq(media.url, articles.coverImageUrl))
      .where(eq(articles.status, 'published'))
      // ⚠️ UI-13 — `.limit(20)` IS GONE, AND ITS REMOVAL IS HALF OF H6.
      //
      // DES-03 §7.5 H6.1 lets a candidate pool contribute at most
      // `min(count_in_pool(c), cap)` items per category. Measured on production
      // 01 Sept 2026: ranks 1–13 by `publishedAt` were TWO categories — 10
      // `hantaran-mas-kahwin` + 3 `ucapan-doa` — so a 20-row buffer's capacity
      // at cap 5 was 8 against a required 13. A PERFECT H6.4 implementation
      // over that buffer still falls through H6.5 to truncation, and the
      // visible result is a SHORTER homepage rather than a fixed one — which
      // `check-h6.sh` would pass, because an 8-item page can satisfy H6 at N=8.
      // H6.5's satisfiability test is written over `published(x)`, not over
      // `buffered(x)`: a recency window cannot even be asked the question the
      // fallback ladder depends on.
      //
      // AND RANKS 14–20 WOULD NOT HAVE RESCUED IT. Measured against production
      // on 01 Sept 2026 (`scripts/measure/measure-h6-pool.mjs`): ranks 14–20
      // are SEVEN MORE `hantaran-mas-kahwin` and add ZERO new categories.
      //
      // Measured TWICE that day, two hours and two publications apart — 90 rows
      // then 92 — and the buffer's capacity was 9 then 11, against a required 13
      // both times. The gap is structural rather than a bad afternoon: a recency
      // window over a corpus that is 41% `hantaran-mas-kahwin` fills with
      // `hantaran-mas-kahwin`. The old shape did not merely lack a guarantee, it
      // failed on the corpus it was running against.
      //
      // So the pool is the published corpus. Serialized entry at 92 rows:
      // 235,542 B (230.0 KiB) against the 20-row entry's 55,612 B — 4.24x, and
      // about 2,560 B per row, so the ~1.5 MB point where the two-query shape
      // (a light ranking query + a hydrate query for the chosen ids) would earn
      // its keep sits near 590 articles. 43.2% of those bytes are
      // `cover_image_smart_crops`. Re-run the script before trusting this
      // paragraph — it is a number about a corpus, not about the table.
      //
      // The secondary tiebreak is for reproducibility, not for selection:
      // `selectHomeSet` re-ranks in JS (H6.4), so SQL order decides nothing
      // here, but rows DO share a `publishedAt` (measured: 84 distinct values
      // over 92 rows, largest tie x7) and an unordered tie makes the cached
      // payload's bytes differ run to run for no reason.
      //
      // ⚠️ NOT 24. DES-03 §7.5 says "24 articles carry one identical timestamp
      // and 19 carry another", measured off the SITEMAP — and `sitemap.ts`
      // builds `<lastmod>` from `updatedAt`, not `publishedAt`. Those are edit
      // batches. H6.4 clause (1) ranks on `publishedAt`, where the largest tie
      // is 7. The tie-break clauses are still load-bearing; the magnitude in
      // the spec is about a different column.
      .orderBy(desc(articles.publishedAt), asc(articles.slug));

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
  //
  // ⚠️ BUMPED v4 → v5 BY UI-13. The columns did not change; the ROW COUNT did,
  // from a 20-row recency window to the whole published corpus, and that is a
  // shape change by the rule above. Ship it under `hk-home-v4` and the first
  // readers after deploy get the previously-cached 20 rows: `selectHomeSet`
  // then runs H6 over a pool whose capacity at cap 5 is 8 against a required
  // 13, falls through H6.5 to truncation, and serves a SHORT homepage that
  // `check-h6.sh` reports as passing — the failure is invisible to the gate and
  // sits there until the 600s revalidate expires. A stale-pool bug is exactly
  // as real as a stale-column bug and considerably harder to see.
  ['hk-home-v5'],
  // Tagged, not just time-boxed: every admin write path and the scheduled-
  // publish cron fire `revalidateTag('articles')`. `revalidatePath` does NOT
  // invalidate an `unstable_cache` entry, so without these tags a publish (or
  // an unpublish of content that must come down) would sit in the front-door
  // hero for up to 10 minutes while every other page updated instantly.
  { tags: ['articles', 'inspire-categories'], revalidate: 600 },
);

export default async function HomePage() {
  const { latestArticles } = await getHomeData();

  // ── UI-13 — H6, DES-03 §7.5. THE ORDER BELOW IS THE RULE'S OUTPUT ────────
  //
  // `selectHomeSet` implements H6.4's rank + greedy slot fill and H6.5's
  // relaxation ladder over the published corpus. It returns 13 items in the
  // order they must appear, `items[0]` being H6.4's slot 1 — the hero.
  //
  // ⚠️ H6.6: "DOM order is the order", and it is also tab order and the order a
  // screen reader announces. Render `items` in the order returned. No `order`,
  // no `grid-auto-flow: dense`, no `*-reverse` on the container that holds
  // them. `scripts/ui-layout-gate.mjs` asserts this from computed boxes, so a
  // violation fails there rather than here.
  //
  // The three R8 hero gates are NOT re-implemented here and were not moved:
  // `selectHomeSet` runs `pickHeroIndex` over the rank order for slot 1, which
  // is the same one definition `/artikel`'s lead plate uses.
  const homeSet = selectHomeSet(latestArticles);
  const hero = homeSet.items[0] ?? null;
  // R8's failure mode, made explicit and now reported by the selection rather
  // than recomputed: if NOTHING in the corpus is hero-eligible, the lead story
  // still runs — it holds the page's one <h1> — but with the "Tiada gambar"
  // plate instead of a photograph in the wrong shape. A broken plate is worse
  // than no plate.
  //
  // ⚠️ H3 IS COMPUTED HERE AND DELIBERATELY NOT RENDERED. PARKED BY THE
  // CREATIVE DIRECTOR, 01 SEPTEMBER 2026, AND THEY OWN IT.
  //
  // DES-03's H-namespace table calls that case H3, "the no-hero variant … the
  // homepage opens on rows rather than enlarging a frame §6 disqualifies", and
  // H6.5(4) sends N < 4 to the same variant. H3 has no markup anywhere in
  // DES-03 — §5.3 rules that it exists and draws only H1 — and with no hero
  // headline the page has no h1, which §9.1 assigns to the hero. UI-13 raised
  // that rather than inventing a layout for it.
  //
  // The ruling: compute `homeSet.variant`, do not render H3. It needs either
  // N < 4 or zero class-O/P covers in the WHOLE corpus, so on 90 published
  // articles (48 hero-eligible, capacity 47 against a required 13) it is
  // unreachable — and building an unreachable page variant nobody can look at
  // is how untested markup ships. Recorded as an open finding in this item's
  // work-done entry, parked with a reason.
  //
  // ⚠️ DO NOT QUIETLY WIDEN THIS. Rendering H3 is a Creative Director decision
  // with a design attached, not a gap for the next reader to close. If you
  // reach for it, the switch is one branch on `homeSet.variant` — but get the
  // markup ruled on first, including where the page's h1 goes without a hero.
  const heroCrops =
    hero && homeSet.heroEligible ? resolveHeroCrops(hero.coverImageSmartCrops) : null;
  const rest = homeSet.items.slice(1);

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
                {/* `credit` is stored WITH its "Kredit: " prefix already
                    (src/lib/inspire/__tests__/article-file.test.ts) — do not
                    prepend a second one, which is what shipped first and
                    printed "Kredit: Kredit: …" on every credited hero. */}
                {hero.coverCredit &&
                  (hero.coverCreditUrl ? (
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
                  ))}
              </div>
            </Link>
          </article>
        ) : (
          /* H6.5(4), verbatim: "with zero published articles it renders
             `.s-empty` (§8), not the blank page §7.4 records shipping." That is
             a clause of the rule this item implements, so it is built here and
             not left to a neighbouring one.

             `EmptyState` from `@/design-system/components` IS `.s-empty` —
             DES-05's component, already carrying five other states (E1–E5,
             K3/K6/A4). What stood here was a bespoke `border-dashed` box: a
             SIXTH visual language for a state DES-05 had already drawn, which
             is the exact failure DES-07 rule 3.5 names. Nothing about the
             component is restyled and no copy is invented — the existing Malay
             sentence is split at its own full stop into the heading and body
             the component asks for.

             `size="h2"` because this block stands where the hero stands, the
             page-scale slot, not a row. No `action`: the component's optional
             one takes an `onClick`, and this is a Server Component with nothing
             for a reader to press here.

             ⚠️ THIS PAGE HAS NO h1 IN THIS STATE, and it did not before either
             — §9.1 assigns the homepage's h1 to the hero headline and there is
             no hero. `.s-empty`'s heading is a `<span class="s-h2">`, so the
             swap neither creates nor fixes that. Raised alongside H3, which has
             the same hole; not closed here, because closing it means either
             forking a shared component or inventing a heading level for a state
             DES-03 draws without one. */
          <div className="s-pad mx-auto max-w-3xl">
            <EmptyState
              size="h2"
              heading="Belum ada artikel."
              body="Kandungan akan datang tidak lama lagi — jumpa lagi!"
            />
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
              const cover = resolveRowThumbSource(
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
                    /* DES-18: the mid-size rendition, 528x396 — the 4:3
                       asset this slot has wanted since UI-12 S2 made the box
                       4:3 at every width. UI-12 could not serve one because
                       the only 4:3 file was the 488-946 KB full crop (+8.2 MB
                       across this page); `crop-4x3-article-card-sm` is a
                       median 17,664 B, which is LIGHTER than the `low` this
                       row fetched before. `resolveRowThumbSource` falls back
                       to `low` when a cover has no rendition yet.

                       `width`/`height` are the file's REAL intrinsics when the
                       rendition is present (hero-rules R4/R6), and 176x132 —
                       the CSS box's own ratio, which is the same 1.33333 —
                       when it is not. Still no `srcSet` and no `sizes`
                       (UI-12 S1): one file, one URL, nothing asserted. */
                    <img
                      src={cover.src}
                      width={cover.width ?? 176}
                      height={cover.height ?? 132}
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
