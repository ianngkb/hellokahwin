import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Bodoni_Moda } from 'next/font/google';
import { requireAdminSection } from '@/lib/auth/admin';
import { PillarBody } from '@/components/inspire/pillar-body';
import type { PillarView } from '@/lib/inspire/pillar-queries';
import { getMastheadCategories } from '@/lib/services/inspire-nav';
import { CategoryRail } from '@/components/layout/category-rail';
import type { MenuCategory } from '@/components/inspire/inspire-nav-menu';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { Breadcrumbs as PublicBreadcrumbs } from '@/components/common/breadcrumbs';
import { ArticleToc, TOC_MIN_HEADINGS } from '@/components/inspire/article-toc';
import { extractHeadings, type ArticleHeading } from '@/lib/inspire/heading-anchors';
import { PageHeader } from '@/components/layout/page-header';
import '@/design-system/tokens.css';
import '@/design-system/components.css';
import {
  Breadcrumb,
  Button,
  Card,
  Chip,
  DataTable,
  EmptyCategoryState,
  FooterReadNext,
  H1,
  Heading,
  Label,
  ListRow,
  Masthead,
  NotFoundState,
  OfflineState,
  PageErrorState,
  RekodPanel,
  TargetProbe,
  Wordmark,
} from '@/design-system/components';
import {
  BOUNDARY_TINTS,
  CONTRAST_DARK,
  CONTRAST_LIGHT,
  DISQUALIFIED,
  FOCUS_RING,
  PRIMITIVES,
  PRIMITIVE_SWATCHES,
} from '@/design-system/token-values';

export const metadata = { title: 'Design system | HelloKahwin' };

// ── DES-05 — the design system reference page ───────────────────────────
//
// This page reads its values from `src/design-system/tokens.css` and
// renders through `src/design-system/components/*` — the SAME modules any
// adopting page imports — so it cannot show a token or a component shape
// the system does not actually have. That is the whole point of it: it is
// the regression test for taste, not documentation.
//
// STATUS: adopted, not a proposal. DES-04 decided the stack (Tailwind +
// Radix stay; the theme layer is what gets replaced) and this page is the
// reference surface DES-04 §"what already exists" recommended lifting —
// rebuilt against docs/design/des-03-spesifikasi.html, the ratified spec,
// rather than against DES-01/DES-13's earlier stand-in palette. See the
// work-done entry for the full reconciliation and what changed.
//
// SCOPE: tokens are global (`:root` in tokens.css) per DES-04's point 5 —
// harmless until a component consumes them, which nothing outside this
// design-system module does yet. Real components (`.s-*`) stay scoped
// inside `.hk`, applied only within this page, so nothing here reaches a
// public route. DES-08 is the item that wires this into the three real
// pages.
//
// MAINTENANCE CONTRACT: any token or shared component that changes updates
// this page in the SAME change. A reference that has drifted from the real
// system is worse than none, because people trust it.

// Bodoni Moda, variable, opsz axis only — the ONE face this system licenses
// as a display face (spec §2.1). Loaded here, scoped to this admin page,
// which is not on the public LCP budget DES-09 sets for the article h1;
// self-hosting and subsetting THAT instance (21,388B woff2, opsz 11 pinned)
// is DES-08's build task against the real article page, tracked in the
// work-done entry's follow-ups.
const bodoniModa = Bodoni_Moda({
  subsets: ['latin'],
  axes: ['opsz'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-bodoni-demo',
});

function Swatch({ hex, label, sub }: { hex: string; label: string; sub: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-16 border" style={{ background: hex, borderColor: 'var(--rule)' }} />
      <div className="font-mono text-[11px] leading-tight break-all">{label}</div>
      <div className="text-muted-foreground font-mono text-[10px] leading-snug">
        {hex} — {sub}
      </div>
    </div>
  );
}

function SectionHead({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <div className="border-foreground/70 flex flex-wrap items-baseline gap-4 border-t-2 pt-3">
      <h2 className="text-xl font-semibold">
        <span className="text-muted-foreground mr-2 font-mono text-sm">{n}</span>
        {title}
      </h2>
      {note && <span className="text-muted-foreground text-xs">{note}</span>}
    </div>
  );
}

/** Scoped locally to this admin page only — resolves --font-serif to the
 * next/font/google instance loaded above. tokens.css's own --font-serif
 * fallback stack (used by every OTHER `.hk` consumer) is untouched. */
const FONT_DEMO_STYLE = {
  '--font-serif': `var(--font-bodoni-demo), 'Bodoni Moda', Didot, 'Bodoni MT', Georgia, serif`,
} as CSSProperties;

function gradeColor(g: string) {
  return g === 'FAIL' ? 'var(--alert)' : undefined;
}

const PLACEHOLDER_FILL = PRIMITIVES['parchment-300'];
function placeholderImg(label: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='${PLACEHOLDER_FILL}'/><text x='20' y='280' font-family='monospace' font-size='13' fill='black' fill-opacity='0.35'>${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const NAV_ITEMS = [
  { label: 'Nikah & Undang-undang', href: '#' },
  { label: 'Hantaran & Mas Kahwin', href: '#', current: true },
  { label: 'Venue, Kos & Perancangan', href: '#' },
];

/* UI-05 — a fixture, not a mock: the real `PillarBody` is rendered from it
   below, so this entry cannot drift from the seven live pillar hubs. Shaped
   after `sebelum-nikah`, which is what makes it a useful test — one populated
   cluster, one empty one, and a title long enough to wrap. */
const PILLAR_DEMO: PillarView = {
  totalArticles: 3,
  unclustered: [],
  clusters: [
    {
      id: 'demo-taaruf',
      name: 'Jodoh, taaruf & istikharah',
      slug: 'jodoh-taaruf-istikharah',
      entityPhrase: 'jodoh, taaruf dan istikharah',
      pillarCode: null,
      articles: [
        {
          id: 'demo-a1',
          title: 'Taaruf Maksud: Apa Itu Taaruf dan Apa Bezanya dengan Bercinta Sebelum Nikah',
          slug: 'taaruf-maksud',
          categorySlug: 'jodoh-taaruf-istikharah',
          publishedAt: null,
        },
        {
          id: 'demo-a2',
          title: 'Solat istikharah jodoh: cara, bacaan dan apa yang berlaku selepas',
          slug: 'solat-istikharah-jodoh',
          categorySlug: 'jodoh-taaruf-istikharah',
          publishedAt: null,
        },
        {
          id: 'demo-a3',
          title: 'Kursus kahwin: kos',
          slug: 'kursus-kahwin-kos',
          categorySlug: 'kursus-kahwin-saringan-pra-nikah',
          publishedAt: null,
        },
      ],
    },
    {
      id: 'demo-merisik',
      name: 'Merisik & meminang',
      slug: 'merisik-meminang',
      entityPhrase: 'merisik',
      pillarCode: null,
      articles: [],
    },
  ],
};

/* UI-18 — the contents-list fixtures, and why they are Tiptap docs rather than
   hand-written `ArticleHeading[]`.
   An `ArticleHeading` carries an `id`, and an id typed by hand here would be an
   id this page invented. Feeding a doc through `extractHeadings` — the same
   call the article renderer makes — means every `href="#…"` shown below was
   produced by the shipped slug rules, so a change to those rules shows up here
   instead of hiding behind a literal. */
function tocDemo(headings: [2 | 3, string][]): ArticleHeading[] {
  return extractHeadings({
    type: 'doc',
    content: headings.map(([level, text]) => ({
      type: 'heading',
      attrs: { level },
      content: [{ type: 'text', text }],
    })),
  });
}

/** The five sections DES-03 §5.1 draws in the rail, verbatim. */
const TOC_DEMO_FLAT = tocDemo([
  [2, 'Kadar minimum mengikut negeri'],
  [2, 'Siapa yang menetapkan kadar'],
  [2, 'Enam bidang kuasa tanpa kadar'],
  [2, 'Kadar minimum ialah lantai'],
  [2, 'Soalan lazim'],
]);

/** Nesting, plus a 96-character heading — the longest in the live corpus is
    of that order, and at the 300px rail measure it wraps to three lines. */
const TOC_DEMO_NESTED = tocDemo([
  [
    2,
    'Berapa bilangan dulang hantaran yang sesuai untuk majlis pertunangan mengikut adat keluarga',
  ],
  [3, 'Dulang ganjil'],
  [3, 'Dulang genap'],
  [2, 'Kos setiap dulang'],
  [2, 'Soalan lazim'],
]);

/** One `<h2>`: below the floor, and must render nothing at all. */
const TOC_DEMO_BELOW_FLOOR = tocDemo([[2, 'Satu bahagian sahaja']]);

export default async function DesignSystemPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  await requireAdminSection('inspire');
  // Internal QA affordance ONLY — not a public toggle, not a ThemeProvider.
  // `.hk-dark` is a plain class this page applies to itself behind the
  // admin auth gate; nothing in the app ever applies it to a public route.
  // This is what makes "Load /design-system in both themes" reproducible
  // without inventing the toggle DES-03 §12 explicitly rules out.
  const { theme } = await searchParams;

  // The rail in §07 renders the SAME <CategoryRail> the public masthead
  // renders, fed by the SAME query — so this page cannot show a rail the site
  // does not have. Soft-fail for the same reason the masthead soft-fails: a DB
  // blip must cost this section, not the page.
  let railCategories: MenuCategory[] = [];
  try {
    railCategories = await getMastheadCategories();
  } catch {
    railCategories = [];
  }
  const dark = theme === 'dark';
  const rootClass = `hk s-pad ${bodoniModa.variable} ${dark ? 'hk-dark' : ''}`;

  return (
    <>
      <ConsoleBreadcrumb items={[{ label: 'Design system' }]} />
      <PageHeader
        title="Design system"
        description="Tokens, components and the reference surface — Warkah, per docs/design/des-03-spesifikasi.html. Adopted, not a proposal."
        actions={
          <div className="flex gap-2">
            <Link
              href="/admin/design-system"
              className={`rounded border px-3 py-1.5 text-xs ${!dark ? 'bg-foreground text-background' : ''}`}
            >
              Light
            </Link>
            <Link
              href="/admin/design-system?theme=dark"
              className={`rounded border px-3 py-1.5 text-xs ${dark ? 'bg-foreground text-background' : ''}`}
            >
              Dark (?theme=dark)
            </Link>
          </div>
        }
      />

      <div className="flex flex-col gap-16 pb-24">
        {/* ── 01 COLOUR ──────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionHead n="01" title="Colour — two palettes, one exposed" note="spec §3" />
          <p className="text-muted-foreground max-w-[74ch] text-sm">
            Dark is specified and rendered on this page (toggle above); it is not exposed to a
            reader anywhere in the app — standing CEO ruling, 28 Ogos 2026 upholding 2026-07-14.
            Light is complete on <code>:root</code>; dark redefines only the semantic layer and
            three alphas — nothing else. Zero hex or <code>rgb()</code> literal exists inside the{' '}
            <code>.hk-dark</code> rule in tokens.css; verified in the work-done entry.
          </p>

          <h3 className="text-sm font-semibold">Primitives</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {PRIMITIVE_SWATCHES.map((p) => (
              <Swatch key={p.token} hex={p.hex} label={p.token} sub={p.job} />
            ))}
          </div>

          <h3 className="mt-2 text-sm font-semibold">
            Semantic — {dark ? 'dark (currently shown)' : 'light (currently shown)'}
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            <Swatch hex="var(--bg)" label="--bg" sub="page ground" />
            <Swatch hex="var(--bg-raised)" label="--bg-raised" sub="raised surface" />
            <Swatch hex="var(--fg)" label="--fg" sub="body, headings" />
            <Swatch hex="var(--fg-muted)" label="--fg-muted" sub="deck, caption" />
            <Swatch hex="var(--fg-dim)" label="--fg-dim" sub="meta, timestamp" />
            <Swatch hex="var(--accent)" label="--accent" sub="label, eyebrow, link" />
            <Swatch hex="var(--alert)" label="--alert" sub="error blocks only" />
          </div>

          <h3 className="mt-2 text-sm font-semibold">Every text-on-background pairing, measured</h3>
          <p className="text-muted-foreground max-w-[74ch] text-xs">
            Computed live by <code>src/design-system/token-values.ts</code> using the same WCAG 2.x
            relative-luminance formula as <code>docs/design/des-03-evidence/contrast.py</code> — not
            transcribed from its output, so a primitive change here cannot silently stop matching
            the committed evidence. Floors: 4.5:1 normal text (SC 1.4.3), 3:1 non-text boundary (SC
            1.4.11).
          </p>
          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Pairing</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Fg / Bg</th>
                  <th className="p-2 text-right font-mono text-[11px] uppercase">Ratio</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Grade</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Used by</th>
                </tr>
              </thead>
              <tbody>
                {(dark ? CONTRAST_DARK : CONTRAST_LIGHT).map((r) => (
                  <tr key={r.pairing} className="border-t">
                    <td className="p-2">{r.pairing}</td>
                    <td className="p-2 font-mono text-[11px]">
                      {r.fgHex} / {r.bgHex}
                    </td>
                    <td className="p-2 text-right font-mono tabular-nums">
                      {r.ratio.toFixed(2)}:1
                    </td>
                    <td
                      className="p-2 font-mono text-[11px]"
                      style={{ color: gradeColor(r.grade) }}
                    >
                      {r.grade}
                    </td>
                    <td className="text-muted-foreground p-2 text-xs">{r.where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-2 text-sm font-semibold">
            Rules, stripes and boundaries — alphas of the ink, composited then measured
          </h3>
          <p className="text-muted-foreground max-w-[74ch] text-xs">
            Every hairline and boundary is a <code>color-mix()</code> tint of <code>--fg</code>,
            never a fifth colour — spec §3.4: a page renders in exactly four hex values plus
            photography. Only the control boundary is required to clear 3:1; the rest are decorative
            and exempt.
          </p>
          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Boundary</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Composited</th>
                  <th className="p-2 text-right font-mono text-[11px] uppercase">Ratio</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {BOUNDARY_TINTS.map((b) => (
                  <tr key={b.label} className="border-t">
                    <td className="p-2">{b.label}</td>
                    <td className="p-2 font-mono text-[11px]">{b.compositedHex}</td>
                    <td className="p-2 text-right font-mono tabular-nums">
                      {b.ratio.toFixed(2)}:1
                    </td>
                    <td className="p-2 font-mono text-[11px]">
                      {b.ratio >= 3 ? 'n/a — decorative' : b.pass ? 'PASS' : 'n/a'}
                    </td>
                  </tr>
                ))}
                {DISQUALIFIED.map((b) => (
                  <tr key={b.label} className="border-t">
                    <td className="p-2">{b.label}</td>
                    <td className="p-2 font-mono text-[11px]">{b.compositedHex}</td>
                    <td className="p-2 text-right font-mono tabular-nums">
                      {b.ratio.toFixed(2)}:1
                    </td>
                    <td className="p-2 font-mono text-[11px]" style={{ color: 'var(--alert)' }}>
                      FAIL — {b.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-2 text-sm font-semibold">
            Focus ring — the fix for the shipped defect
          </h3>
          <p className="text-muted-foreground max-w-[74ch] text-xs">
            DES-07 flagged the shipped ring (<code>ring-ring/30</code>) at 1.95:1, under the 3:1
            floor. This system&rsquo;s ring is <code>var(--focus)</code> at full opacity — Tab to a
            chip or button below to see it. Light {FOCUS_RING.light.ratio.toFixed(2)}:1, dark{' '}
            {FOCUS_RING.dark.ratio.toFixed(2)}:1.
          </p>
        </section>

        {/* ── 02 TYPE ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionHead n="02" title="Type — the faces, the scale" note="spec §2" />
          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Role</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Instance</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Licence</th>
                  <th className="p-2 text-right font-mono text-[11px] uppercase">Bytes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-2 font-semibold">Wordmark</td>
                  <td className="p-2 font-mono text-[11px]">
                    Bodoni Moda, wght 400, opsz 6 — outlined SVG in production
                  </td>
                  <td className="p-2 text-xs">SIL OFL 1.1</td>
                  <td className="p-2 text-right font-mono tabular-nums">0</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2 font-semibold">Article / category / 404 h1</td>
                  <td className="p-2 font-mono text-[11px]">
                    Bodoni Moda, wght 400, opsz 11 PINNED, self-hosted subset
                  </td>
                  <td className="p-2 text-xs">SIL OFL 1.1</td>
                  <td className="p-2 text-right font-mono tabular-nums">21,388 woff2</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2 font-semibold">Everything else</td>
                  <td className="p-2 font-mono text-[11px]">the system stack — var(--font-sys)</td>
                  <td className="p-2 text-xs">supplied by the OS</td>
                  <td className="p-2 text-right font-mono tabular-nums">0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground max-w-[74ch] text-xs">
            The wordmark (opsz 6) and the h1 (opsz 11) are different instances of the same variable
            font and must never share a font-variation-settings value — DES-13 measured opsz moving
            the hairline 94% across its range. Demonstrated live below, loaded here via
            next/font/google scoped to this admin page only; the public article&rsquo;s self-hosted,
            preloaded, subsetted woff2 is DES-08&rsquo;s build task.
          </p>
          <div className={`hk s-pad ${bodoniModa.variable} border py-6`} style={FONT_DEMO_STYLE}>
            <Wordmark />
            <div className="mt-4">
              <H1>Mas kahwin ikut negeri 2026: kadar minimum setiap negeri</H1>
            </div>
          </div>

          <h3 className="mt-2 text-sm font-semibold">
            The scale — fluid, clamp() between 360px and 1024px
          </h3>
          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Role</th>
                  <th className="p-2 text-right font-mono text-[11px] uppercase">360px</th>
                  <th className="p-2 text-right font-mono text-[11px] uppercase">1024px+</th>
                  <th className="p-2 text-right font-mono text-[11px] uppercase">Line-height</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Measure</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Wordmark', '18.00', '24.00', '1.00', '—'],
                  ['h1 · display', '30.00', '44.00', '1.08', '22–30ch'],
                  ['h2', '22.00', '26.00', '1.25', '34ch'],
                  ['h3', '19.00', '21.00', '1.30', '40ch'],
                  ['Deck', '18.00', '20.00', '1.50', '60ch'],
                  ['Body', '17.00', '18.00', '1.65 → 1.70', 'cap 68ch'],
                  ['Table, figure', '16.00', '16.00', '1.45', 'full column'],
                  ['Caption, credit', '14.00', '14.00', '1.45', '60ch'],
                  ['Label, eyebrow', '13.00', '13.00', '1.20', '—'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t">
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={`p-2 ${i > 0 && i < 4 ? 'text-right font-mono tabular-nums' : ''}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 03 SPACE ──────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionHead n="03" title="Space, grid and breakpoints" note="spec §4" />
          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Token</th>
                  <th className="p-2 text-right font-mono text-[11px] uppercase">px</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Separates</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['--sp-1', 4, 'A credit from its caption. Nothing larger.'],
                  ['--sp-2', 8, 'Chip to chip. Index number to its row.'],
                  ['--sp-3', 12, 'Rekod field rows. Table cell padding.'],
                  ['--sp-4', 16, 'Page gutter below 390px. Deck to Rekod rule.'],
                  ['--sp-5', 20, 'Page gutter 390–767px. List row padding.'],
                  ['--sp-6', 24, 'Paragraph to paragraph. Eyebrow to headline.'],
                  ['--sp-7', 32, 'Page gutter 768–1023px. Headline block to figure.'],
                  ['--sp-8', 40, 'Page gutter ≥1024px. Section to section, phone.'],
                  ['--sp-9', 56, 'Section to section, desktop. Masthead to content.'],
                  ['--sp-10', 72, 'Last content block to the footer rule. Nothing else.'],
                ].map(([tok, px, job]) => (
                  <tr key={tok as string} className="border-t">
                    <td className="p-2 font-mono text-[11px]">{tok}</td>
                    <td className="p-2 text-right font-mono tabular-nums">{px}</td>
                    <td className="p-2 text-sm">{job}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-right font-mono text-[11px] uppercase">px</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Token</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">What changes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['360', 'floor', 'Narrowest supported viewport. Gutters 16, column 328.'],
                  ['390', '--bp-sm', 'Gutters 16 → 20.'],
                  ['768', '--bp-md', 'Gutters 32. Catalogue rows gain desktop layout.'],
                  [
                    '1024',
                    '--bp-lg',
                    'The record rail appears — 300px, gap 48. Nav shows 3 categories + Cari.',
                  ],
                  ['1200', '--bp-xl', 'Container caps at 1200. Rail gap 48 → 64.'],
                ].map(([px, tok, what]) => (
                  <tr key={tok} className="border-t">
                    <td className="p-2 text-right font-mono tabular-nums">{px}</td>
                    <td className="p-2 font-mono text-[11px]">{tok}</td>
                    <td className="p-2 text-sm">{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 04 COMPONENTS ─────────────────────────────────────────── */}
        <section className="flex flex-col gap-8">
          <SectionHead
            n="04"
            title="Components"
            note="spec §8 — every one drawn at least twice in §5/§7"
          />

          <div
            className={rootClass}
            style={{ border: '1px solid var(--rule)', ...FONT_DEMO_STYLE }}
          >
            {/* Masthead */}
            <div className="pt-5">
              <Label muted>Masthead — .s-mast</Label>
            </div>
            <Masthead categories={NAV_ITEMS} />

            {/* Breadcrumb */}
            <div className="pt-4">
              <Label muted className="mb-2 block">
                Breadcrumb — .s-crumb — short final crumb (the only case §5/§7 draw)
              </Label>
              <Breadcrumb
                items={[{ label: 'Artikel', href: '#' }, { label: 'Hantaran & Mas Kahwin' }]}
              />
            </div>

            {/*
              UI-08 (31 Ogos 2026). Two things this block exists to stop
              happening again.

              1. The state nobody drew. Every crumb in the DES-03 spec ends in a
                 short CATEGORY, so the long final crumb — an article's own <h1>
                 — was never on this page and never reviewed. The 200px box that
                 hid 60% of /dewan-kahwin's crumb survived because nothing here
                 rendered a title long enough to expose it. Long labels now
                 render at every width this page is opened at.

              2. The reference page showed a component the site does not use.
                 `.s-crumb` above is the design-system breadcrumb; the public
                 pages render `components/common/breadcrumbs.tsx`, styled with
                 Tailwind utilities, which is where the fixed box actually
                 lived. Both are shown, side by side, until they are one
                 component. Reconciling them is a follow-up item, not UI-08.
            */}
            <div className="pt-4">
              <Label muted className="mb-2 block">
                Breadcrumb — .s-crumb — long final crumb (wraps; never truncated)
              </Label>
              <Breadcrumb
                items={[
                  { label: 'Artikel', href: '#' },
                  { label: 'Idea & Nasihat', href: '#' },
                  {
                    label:
                      '10 Dewan Kahwin Murah di Selangor & KL – Sesuai untuk Bajet Bawah RM5,000',
                  },
                ]}
              />
            </div>

            <div className="pt-4">
              <Label muted className="mb-2 block">
                Breadcrumb — components/common/breadcrumbs.tsx — what public pages actually render,
                long final crumb
              </Label>
              <PublicBreadcrumbs
                items={[
                  { label: 'Artikel', href: '#' },
                  { label: 'Idea & Nasihat', href: '#' },
                  {
                    label:
                      '10 Dewan Kahwin Murah di Selangor & KL – Sesuai untuk Bajet Bawah RM5,000',
                  },
                ]}
              />
            </div>

            {/* Rekod panel */}
            <div className="pt-6" style={{ maxWidth: 420 }}>
              <RekodPanel
                fields={[
                  { label: 'Kadar terendah', value: 'RM22.50 · Johor' },
                  { label: 'Kadar tertinggi', value: 'RM300 · Selangor, WP' },
                  { label: 'Tanpa kadar minimum', value: '6 daripada 14' },
                  { label: 'Bidang kuasa', value: '14' },
                  { label: 'Disemak', value: '28 Ogos 2026', accent: true },
                ]}
              />
            </div>

            {/*
              In-article contents — UI-18 (01 Sept 2026).

              THE REASON IT IS ON THIS PAGE AT ALL, and not just on an article:
              this surface is `(admin)`. It carries neither `.hk-public` nor
              `.inspire-prose`, so what renders below is the component styled by
              its BARE `nav.article-toc` rules alone. That is the container
              contract with UI-17's desktop rail written as something that can
              go wrong visibly: if anyone re-scopes those rules under
              `.inspire-prose`, this block loses its type, its spacing and its
              24px tap floor here, on the page people open to check taste, long
              before the rail ships. DES-12 rendered a 0x0 wordmark from exactly
              that mistake and nothing caught it.

              Three renders, because two of them are states nobody asks for: a
              heading long enough to wrap to three lines in a 300px rail, an
              article whose sections nest, and one below the floor — which must
              render NOTHING rather than an empty box.
            */}
            <div className="pt-8" style={{ maxWidth: 300 }}>
              <Label muted className="mb-2 block">
                Dalam artikel ini — components/inspire/article-toc.tsx — flat, as DES-03 §5.1 draws
                it, at the 300px rail measure
              </Label>
              <ArticleToc headings={TOC_DEMO_FLAT} />
            </div>

            <div className="pt-4" style={{ maxWidth: 300 }}>
              <Label muted className="mb-2 block">
                Dalam artikel ini — nested h3s, and a 96-character heading that must wrap rather
                than truncate
              </Label>
              <ArticleToc headings={TOC_DEMO_NESTED} />
            </div>

            <div className="pt-4" style={{ maxWidth: 300 }}>
              <Label muted className="mb-2 block">
                Dalam artikel ini — below the {TOC_MIN_HEADINGS}-heading floor. Renders nothing; the
                empty frame below is this label and the rule, not the component.
              </Label>
              <div style={{ borderTop: '1px solid var(--rule)' }}>
                <ArticleToc headings={TOC_DEMO_BELOW_FLOOR} />
              </div>
            </div>

            {/* Data table */}
            <div className="pt-8">
              <Label muted className="mb-2 block">
                Data table — .s-tab — the money format
              </Label>
              <DataTable
                rowKey={(r) => r.negeri}
                columns={[
                  { header: 'Negeri', render: (r) => r.negeri },
                  { header: 'Kadar minimum', numeric: true, render: (r) => r.kadar },
                  { header: 'Pihak berkuasa', render: (r) => r.pihak },
                  { header: 'Tarikh ditetapkan', render: (r) => r.tarikh },
                ]}
                rows={[
                  {
                    negeri: 'Selangor',
                    kadar: 'RM300',
                    pihak: 'Fatwa diwartakan, Jawatankuasa Fatwa Negeri Selangor',
                    tarikh: 'Fatwa 31 Disember 2009, kuat kuasa 1 Januari 2010',
                  },
                  {
                    negeri: 'Wilayah Persekutuan',
                    kadar: 'RM300',
                    pihak: 'Majlis Agama Islam Wilayah Persekutuan (MAIWP)',
                    tarikh: 'Mesyuarat 22 Februari 2023, kuat kuasa 1 Oktober 2023',
                  },
                  {
                    negeri: 'Negeri Sembilan',
                    kadar: 'RM200 / RM100',
                    pihak: 'Jabatan Hal Ehwal Agama Islam Negeri Sembilan',
                    tarikh: 'Tarikh penetapan tidak dinyatakan',
                  },
                  {
                    negeri: 'Melaka',
                    kadar: 'RM100',
                    pihak: 'Majlis Agama Islam Melaka (MAIM)',
                    tarikh: 'Mesyuarat 28 Disember 2015, kuat kuasa 1 Jun 2016',
                  },
                  {
                    negeri: 'Johor',
                    kadar: 'RM22.50 (belum disahkan)',
                    pihak: 'Modul kursus praperkahwinan, bukan penerbitan kerajaan negeri',
                    tarikh: 'Sumber terbaik 2019/2020 dan 2022',
                  },
                  {
                    negeri: 'Perak',
                    kadar: 'Tiada kadar minimum',
                    pihak: 'Warta Kerajaan Negeri Perak, Pk. P.U. 30',
                    tarikh: 'Warta 1 Jun 2013 tidak menetapkan sebarang jumlah',
                  },
                ]}
              />
            </div>

            {/* Card + list rows — the "awkward pair" DoD, real title extremes */}
            <div className="pt-8">
              <Label muted className="mb-2 block">
                Card (.s-card) leading list rows (.s-row) — real 95-char / 47-char title extremes,
                4:3 thumbnails at every width, fed the 528×396 mid-size rendition
              </Label>
              <Card
                href="#"
                headingLevel="h2"
                title="Hantaran tunang untuk perempuan: apa yang dibawa masuk"
                deck="Senarai barang mengikut kategori, dan sebab tepak sirih masih dikira dulang pembuka."
                credit="Kredit: Mohd Fazlin Mohd Effendy Ooi (CC BY 2.0)"
                imageSrc={placeholderImg('328×246')}
                imageAlt="Tepak sirih tembaga berkilat di atas dulang, dikelilingi bunga ros merah"
              />
              <div className="mt-2">
                <ListRow
                  href="#"
                  headingLevel="h2"
                  title="20 Lokasi Terbaik Pre Wedding Photoshoot di Malaysia – Dari Alam Semula Jadi Hingga Urban City!"
                  meta="Fotografi & Videografi"
                  imageSrc={placeholderImg('528×396 → 80×60 / 176×132')}
                  imageAlt="Rombongan hantaran berjalan di tepi jalan sambil memegang dulang"
                  index={2}
                />
                <ListRow
                  href="#"
                  headingLevel="h2"
                  title="Tempat beli barang hantaran: lima jenis kedai"
                  meta="Hantaran & Mas Kahwin"
                  imageSrc={placeholderImg('528×396 → 80×60 / 176×132')}
                  imageAlt="Dulang terbuka dengan gubahan bunga merah dan renda putih"
                  index={3}
                />
                <ListRow
                  href="#"
                  headingLevel="h2"
                  title="Rukun Nikah: 5 Rukun dan Apa Yang Membatalkannya"
                  meta="Nikah & Undang-undang"
                  index={4}
                />
              </div>
              <p className="text-muted-foreground mt-2 max-w-[74ch] text-xs">
                The fourth row has no cover — <code>.s-imgless</code>, spec §6.3/§8: the figure is
                removed entirely rather than rendered broken or as a grey promise. Titles are the
                real 95-character longest and ~47-character shortest of the 86-title corpus, per
                DES-07&rsquo;s definition of done. <code>index</code> is a required prop (UI-01):
                the card is 01, so these rows are 2&ndash;4. <code>.s-row</code> reserves a 44px
                desktop track for it, and a row that omits it puts its headline in that track rather
                than losing it.
              </p>
              <p className="text-muted-foreground mt-2 max-w-[74ch] text-xs">
                UI-12 S2: the thumbnail is{' '}
                <strong>80&times;60 on a phone and 176&times;132 on desktop</strong> &mdash; both
                1.33333, one landscape shape at every width. It was 80&times;80 = 1.000 below
                1024px, which meant the same photograph was two different shapes on two devices, and
                1:1 is the social-feed register this site is trying not to be in. Measured on
                production 31 Ogos 2026, a 1.000 box fed the <code>low</code>
                variant these rows are served deviates <strong>33.5%</strong> on the eleven 3:2
                covers and <strong>50%</strong> on the one 2:3 cover; a 4:3 box deviates 11.1% and
                0.0% respectively, both inside hero-rules R1&rsquo;s 15%. 4:3 rather than 3:2
                because it is the aspect of <code>crop-4x3-article-card</code>, where this slot goes
                the day a small rendition of it exists &mdash; one shape change, not two.
              </p>
              <p className="text-muted-foreground mt-2 max-w-[74ch] text-xs">
                DES-18 built that rendition and this slot went there.{' '}
                <code>crop-4x3-article-card-sm</code> is <strong>528&times;396</strong> &mdash; the
                176px desktop slot at DPR&nbsp;3 exactly &mdash; WebP, encoded at q50 and stepped
                down only where q50 misses a <strong>46,080&nbsp;B</strong> ceiling. That ceiling is
                DES-03 &sect;6.2&rsquo;s own card figure, applied to a box 21% larger in area, so it
                is strictly tighter than DES-03 asks. Measured across all 86 published covers on 01
                September 2026: <strong>min 7,636&nbsp;B, median 17,664&nbsp;B, max
                44,898&nbsp;B</strong>, none over the ceiling. Exactly one photograph &mdash;
                handwoven songket, close to worst-case entropy for a block encoder &mdash; steps to
                q46; the other 85 stay at q50.
              </p>
              <p className="text-muted-foreground mt-2 max-w-[74ch] text-xs">
                It is a byte <em>saving</em>, which is why it could ship at all.{' '}
                <code>card-thumbnail-image-rules.md</code> &sect;4 priced serving the only 4:3 asset
                that existed &mdash; the 488&ndash;946&nbsp;KB full crop &mdash; at{' '}
                <strong>+8.2&nbsp;MB across the homepage</strong>, and refused. The rendition
                replaces a <code>low</code> that weighed 36,964&ndash;82,110&nbsp;B with a median
                17,664&nbsp;B file <em>of the right shape</em>. It is a resize of a crop already
                stored, not a re-crop: no Rekognition call, and deliberately not a{' '}
                <code>CROP_TARGETS</code> entry, so <code>GEOMETRY_VERSION</code> does not move and
                no live cover is re-cut. A test asserts that token still hashes to{' '}
                <code>48c0b959</code>.
              </p>
            </div>

            {/* Pillar list — the OTHER article-row shape (UI-05) */}
            <div className="pt-8">
              <Label muted className="mb-2 block">
                Pillar list — .s-pillar-link — populated cluster, then an empty one
              </Label>
              <PillarBody view={PILLAR_DEMO} intro={null} />
              <p className="text-muted-foreground mt-2 max-w-[74ch] text-xs">
                The real <code>PillarBody</code>, rendered from a fixture — not a copy of it — so
                this entry cannot drift from the seven pillar hubs. A pillar row is deliberately{' '}
                <strong>lighter and larger</strong> than the <code>.s-row</code> above it (400/17px
                vs 600/15px at 390px, both Bodoni Moda at <code>−0.012em</code>/
                <code>−0.018em</code>
                ): a pillar is a map of a topic, not a feed. Until UI-05 these links carried{' '}
                <code>.t</code>, which only ever existed as <code>.s-row .t</code> — a descendant
                selector that never matched here — so they rendered in body sans at 17.04px, proved
                by <code>getComputedStyle</code> on production.
              </p>
              <p className="text-muted-foreground mt-2 max-w-[74ch] text-xs">
                The empty cluster keeps its heading (hiding it would make the pillar look complete
                when it is not) and now opens on the same <code>--rule</code> and the same 20px of
                air as a populated one, with its promise line on a link row&rsquo;s 13px rhythm. The
                rule is structural: it says &ldquo;the cluster body starts here&rdquo;, which is not
                conditional on there being links.
              </p>
            </div>

            {/* Empty pillar — the P6 state, and the soft-fail shape */}
            <div className="pt-8">
              <Label muted className="mb-2 block">
                Empty pillar — .s-empty + .s-btn link — UI-05 P6
              </Label>
              <PillarBody view={{ clusters: [], unclustered: [], totalArticles: 0 }} intro={null} />
              <p className="text-muted-foreground mt-2 max-w-[74ch] text-xs">
                A pillar with no clusters and no unclustered articles. This is also exactly what the
                route renders when <code>getPillarView</code> fails or blows its 3s deadline — the
                error is swallowed and <code>view</code> stays empty — so the soft-fail path and the
                genuinely-empty path get the same designed exit rather than a blank{' '}
                <code>&lt;div&gt;</code>. The way out is a real <code>&lt;Link&gt;</code> wearing{' '}
                <code>.s-btn</code>, not a <code>Button</code>: <code>EmptyState</code>&rsquo;s{' '}
                <code>action</code> takes an <code>onClick</code>, and this renders on the server.
              </p>
            </div>

            {/* Chips */}
            <div className="pt-8">
              <Label muted className="mb-2 block">
                Chip — .s-chip — aria-pressed drives state AND fill
              </Label>
              <div className="s-chiprow">
                <Chip>Hantaran & Mas Kahwin</Chip>
                <Chip pressed count={38}>
                  Nikah & Undang-undang
                </Chip>
                <Chip count={12}>Venue, Kos & Perancangan</Chip>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-8">
              <Label muted className="mb-2 block">
                Button — .s-btn — 44px minimum, spec §10.2
              </Label>
              <div className="flex flex-wrap gap-3">
                <Button>Muat lagi</Button>
                <Button variant="solid">Cuba semula</Button>
                <Button disabled>Tiada</Button>
              </div>
            </div>

            {/* Empty / error / offline */}
            <div className="grid gap-6 pt-8 sm:grid-cols-2">
              <div>
                <Label muted className="mb-2 block">
                  Empty — .s-empty — nothing is wrong
                </Label>
                <EmptyCategoryState />
              </div>
              <div>
                <Label muted className="mb-2 block">
                  Not found — .s-empty, E2
                </Label>
                <NotFoundState />
              </div>
              <div>
                <Label muted className="mb-2 block">
                  Error — .s-err — something broke
                </Label>
                <PageErrorState />
              </div>
              <div>
                <Label muted className="mb-2 block">
                  Offline — .s-err, E5
                </Label>
                <OfflineState />
              </div>
            </div>

            {/* Footer / read-next */}
            <div className="pt-8 pb-8">
              <FooterReadNext
                label="Lagi dalam Hantaran & Mas Kahwin"
                links={[
                  { label: 'Mas kahwin Johor 2026: RM22.50 dan asal usul angkanya', href: '#' },
                  { label: 'Maksud mas kahwin: hak isteri dan beza dengan hantaran', href: '#' },
                  { label: 'Bolehkah mas kahwin melebihi kadar minimum negeri?', href: '#' },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 05 HEADING HIERARCHY ──────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionHead
            n="05"
            title="Heading hierarchy and schema slots"
            note="spec §9 — reviewed by head-of-seo-content"
          />
          <p className="text-muted-foreground max-w-[74ch] text-sm">
            Heading LEVEL is a page decision, not a component default. The visual style{' '}
            <code>.t</code> (list-row title) is identical whether the element is{' '}
            <code>&lt;h2&gt;</code> or <code>&lt;h3&gt;</code> — only the semantic level changes,
            per the page it sits inside. <code>Heading</code> in
            <code> src/design-system/components/typography.tsx</code> takes an explicit{' '}
            <code>as</code> prop for exactly this reason.
          </p>
          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Page</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Level</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Used for</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Style</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Article', 'h1', 'The article title. Exactly one per page.', '.s-h1'],
                  ['Article', 'h2', 'Named sections — one per contents-list entry.', '.s-h2'],
                  [
                    'Article',
                    'h3–h4',
                    'Sub-points. Not a styling shortcut for a bold lead.',
                    '.s-h3',
                  ],
                  [
                    'Article',
                    'n/a',
                    'Rekod labels, table headers, credits — metadata, never a heading.',
                    '.s-label',
                  ],
                  ['Catalogue', 'h1', 'The category name. Exactly one.', '.s-h1'],
                  ['Catalogue', 'h2', 'Each row/card title WITHIN the list.', '.t'],
                  ['Homepage', 'h1', 'Not the wordmark — the hero article headline.', '.s-h1'],
                  ['Homepage', 'h2', '"Terkini" and each section label.', '.s-label'],
                  [
                    'Homepage',
                    'h3',
                    'Each row/card title within a section (corrected — see below).',
                    '.t',
                  ],
                ].map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((c, j) => (
                      <td key={j} className="p-2 text-sm">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-l-2 p-4 text-sm" style={{ borderColor: 'var(--alert)' }}>
            <strong>Markup correction the DSE applies during the build (spec §9.1):</strong> a
            homepage row sits inside a page whose own h1 is the hero, so its rows build as{' '}
            <code>&lt;h3&gt;</code>, not <code>&lt;h2&gt;</code>, or the homepage carries two h2
            levels with no h1 between the second and the page title. The visual style{' '}
            <code>.t</code> is unaffected — only the element changes.
          </div>

          <h3 className="mt-2 text-sm font-semibold">Live: a catalogue outline (h1 → h2 → h2)</h3>
          <div
            className={rootClass}
            style={{ border: '1px solid var(--rule)', padding: 20, ...FONT_DEMO_STYLE }}
          >
            <Label accent className="mb-2 block">
              Kategori
            </Label>
            <H1>Hantaran &amp; Mas Kahwin</H1>
            <div className="mt-4 flex flex-col gap-2">
              <Heading as="h2" variant="row">
                Tempat beli barang hantaran: lima jenis kedai
              </Heading>
              <Heading as="h2" variant="row">
                Berapa dulang hantaran tunang, dan siapa yang tentukan
              </Heading>
            </div>
          </div>

          <h3 className="mt-2 text-sm font-semibold">Schema slots — spec §9.2</h3>
          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Page</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Field</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Source</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Article', 'headline', 'h1 text'],
                  [
                    'Article',
                    'dateModified',
                    'Rekod "Disemak" field — the visible date and the schema date cannot disagree',
                  ],
                  [
                    'Article',
                    'image',
                    'The cover per §6, or omitted on the missing-cover state — never a placeholder in the schema',
                  ],
                  [
                    'Article (rate pages)',
                    'Table rows',
                    'The mas-kahwin rate table, marked up as data',
                  ],
                  ['Catalogue', 'CollectionPage/ItemList', 'Each row/card in reading order'],
                  [
                    'Not-found',
                    'noindex, HTTP 404',
                    'Server-rendered — status code and content ship together',
                  ],
                ].map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((c, j) => (
                      <td key={j} className="p-2 text-sm">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground max-w-[74ch] text-xs">
            FAQPage structured data is deliberately absent — whether the <em>Soalan lazim</em>{' '}
            section qualifies is head-of-seo-content&rsquo;s structured-data policy call, not a
            layout one (spec §9.2, §12). Byline/author ownership is managing-editor&rsquo;s (§12),
            not decided here.
          </p>
        </section>

        {/* ── 06 FOCUS & TARGETS ────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionHead n="06" title="Focus, targets and announcements" note="spec §10" />
          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Control</th>
                  <th className="p-2 text-right font-mono text-[11px] uppercase">Height</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Where</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    '.s-btn',
                    'var(--tap-comfortable)',
                    'Muat lagi, Cuba semula, Laman utama, search entry',
                  ],
                  ['.s-chip', 'var(--tap-comfortable)', 'Category chips'],
                  [
                    '.s-row',
                    '89–92px phone / 173px desktop',
                    'The entire row is the tap target. Measured on a local production build of the twelve homepage rows, 31 Ogos 2026 — 92px at 390px, 89px at 768px, 173px at 1024/1440. UI-12 S2 took the thumbnail to 80×60, so the phone height is now set by the text block, not by the image',
                  ],
                  [
                    '.hk-navrail-item',
                    'var(--tap-comfortable)',
                    'Masthead categories — 44px at every width, UI-02',
                  ],
                  [
                    '.hk-tap / -line / -flow',
                    'var(--tap-min)',
                    'Breadcrumb, footer link, contents entry, card label, credit — UI-11',
                  ],
                  [
                    'Search field (/artikel#cari)',
                    '46px',
                    'UI-09. 16px type is the constraint, not the target: iOS Safari zooms a field under 16px on focus, and mobile is 79% of clicks. 16px line-height 24 + 10px padding + 1px border = 46px, over the 44 floor without a fixed height that would clip enlarged type',
                  ],
                ].map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((c, j) => (
                      <td
                        key={j}
                        className={`p-2 text-sm ${j === 1 ? 'text-right font-mono tabular-nums' : ''}`}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* ── UI-11: the three target utilities, measured live ─────────
              This block replaced a table row that read "Breadcrumb link —
              20px text, 44px hit slop". There was no hit slop. The shipped
              breadcrumb measured 40 × 20, and the page had been asserting
              otherwise for as long as it existed, because a number typed into
              a table cannot be wrong out loud. Every specimen below is now
              measured by TargetProbe at render time. */}
          <div className="flex flex-col gap-5 border p-5">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">
                Standalone targets — the WCAG 2.5.8 (AA) floor
              </h3>
              <p className="text-muted-foreground max-w-[74ch] text-xs">
                Two tokens, and a rule for choosing: <code>--tap-comfortable</code> (44px, WCAG
                2.5.5 AAA and spec §10.2) for a control the reader is <em>meant</em> to hit;{' '}
                <code>--tap-min</code> (24px, the 2.5.8 AA floor) for a secondary standalone link in
                running chrome. A breadcrumb row forced to 44px would triple the height of the
                colophon to fix a hit area that 24px already fixes. An inline link inside a sentence
                — <code>pelamin</code> mid-paragraph — is exempt under 2.5.8 and takes neither.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <TargetProbe label=".hk-tap — default, may wrap">
                <a href="#tap-specimen" className="hk-tap text-sm underline">
                  Utama
                </a>
              </TargetProbe>
              <TargetProbe label=".hk-tap — wrapping in a 171px card column">
                <a href="#tap-specimen" className="hk-eyebrow hk-tap wrap-anywhere max-w-[171px]">
                  Sebelum Nikah: Jodoh, Merisik &amp; Tunang
                </a>
              </TargetProbe>
              <TargetProbe label=".hk-tap-flow — content keeps flowing inline">
                <a href="#tap-specimen" className="hk-tap-flow text-xs underline">
                  Kredit: mohd hasan / Pexels ↗
                </a>
              </TargetProbe>
              <TargetProbe label="untreated inline link — the state UI-11 found" min={24}>
                <a href="#tap-specimen" className="hk-eyebrow">
                  Laman Utama
                </a>
              </TargetProbe>
            </div>
            <p className="text-muted-foreground max-w-[74ch] text-xs">
              The last specimen is deliberately left untreated and is expected to fail: it is the
              15.4px footer link as it shipped, kept here so the difference is visible rather than
              described. The machine check over the real site is{' '}
              <code>pnpm audit:taps &lt;url&gt;</code> (<code>scripts/audit-tap-targets.mjs</code>),
              which exits 1 on any standalone target under the floor.
            </p>
          </div>
          <p className="text-muted-foreground max-w-[74ch] text-xs">
            Tab through the buttons and chips in §04 above — the ring is <code>var(--focus)</code>{' '}
            at full opacity (15.39:1 light / 15.65:1 dark), replacing the shipped{' '}
            <code>ring-ring/30</code> at 1.95:1 that DES-07 flagged. Exactly one{' '}
            <code>aria-live=&quot;polite&quot;</code> region per page, reused by the loading bar at
            ≥3s, a <em>Muat lagi</em> result count, and a retry outcome — not built three times.
          </p>
          <p className="text-muted-foreground max-w-[74ch] text-xs">
            <strong>
              UI-09, 31 Ogos 2026 — the same defect, found shipped on the public site.
            </strong>{' '}
            DES-07 flagged <code>ring-ring/30</code> inside this module; the article search field on{' '}
            <code>/artikel#cari</code> was still painting it. Measured on production at 390 / 768 /
            1024 / 1440, canvas-resolved rather than parsed from <code>getComputedStyle</code>{' '}
            (every token here is <code>oklch()</code>, which Chrome returns as <code>oklab()</code>
            ): the ring composited to <code>rgb(182,181,180)</code> over{' '}
            <code>rgb(252,251,250)</code> — <strong>1.98:1</strong>, against the 3:1 that WCAG 2.2
            SC 1.4.11 asks of an indicator. It is now <code>outline: 2px solid var(--ring)</code> at{' '}
            <code>outline-offset: 2px</code> on <code>:focus-visible</code>, the same shape the
            masthead rail uses, at <strong>17.7:1</strong>. The lesson worth keeping is that a ring
            can be present, correctly sized, and still not be an indicator — “is there a box-shadow”
            was never the test; the flattened ratio is.
          </p>
        </section>

        {/* ── 07 MASTHEAD CATEGORY RAIL ──────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionHead
            n="07"
            title="Masthead category rail"
            note="UI-02 — the real component, not a copy of it"
          />
          <p className="text-muted-foreground max-w-[74ch] text-sm">
            Everything below is <code>&lt;CategoryRail&gt;</code> rendered from{' '}
            <code>getMastheadCategories()</code> — the same component and the same query the public
            masthead uses. Resize this window: at and above 1024px the rail wraps to as many rows as
            it needs and never scrolls; below 1024px it becomes a horizontal scroller with the{' '}
            <code>.hk-edge</code> cues, which is what a phone gets. {railCategories.length}{' '}
            categories are live right now.
          </p>
          <div className="hk-public border" style={{ borderColor: 'var(--border)' }}>
            <CategoryRail categories={railCategories} />
          </div>
          <div className="overflow-x-auto border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Token</th>
                  <th className="p-2 text-right font-mono text-[11px] uppercase">Value</th>
                  <th className="p-2 text-left font-mono text-[11px] uppercase">Decides</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    '--navrail-measure',
                    '80rem / 1280px',
                    'How wide the rail is allowed to be. Kept, not widened: widening it was the DES-08 attempt to fit nine pillars on one line, and it did not.',
                  ],
                  [
                    '--navrail-gutter',
                    '0.5rem → 1rem at 1024px',
                    'Inline padding on the rail container.',
                  ],
                  [
                    '--navrail-item-pad',
                    '0.75rem / 12px',
                    'Inline padding per link. 16px → 12px takes the nine live labels from 1,969.53px of row to 1,897.53px — measured, not estimated.',
                  ],
                  ['--navrail-item-gap-x', '0.25rem / 4px', 'Link to link across a row.'],
                  ['--navrail-item-gap-y', '0.5rem / 8px', 'Row to row once the rail wraps.'],
                  [
                    '--navrail-target',
                    '2.75rem / 44px',
                    'Minimum height of every link. The rail is set in 11px type, which alone gives a 32.5px target; this is the site’s only navigation on a phone.',
                  ],
                ].map(([tok, val, job]) => (
                  <tr key={tok} className="border-t">
                    <td className="p-2 font-mono text-[11px] whitespace-nowrap">{tok}</td>
                    <td className="p-2 text-right font-mono text-[11px] tabular-nums whitespace-nowrap">
                      {val}
                    </td>
                    <td className="p-2 text-sm">{job}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground max-w-[74ch] text-xs">
            <strong>Measured, live production, 31 Aug 2026, before UI-02</strong> (
            <code>node scripts/measure-nav-overflow.mjs https://hellokahwin.com/</code>): the rail
            was 1,970px of content in a 1,264px scroller at 1280px, 1440px <em>and</em> 1920px of
            viewport — three of nine links past the viewport edge at 1280/1440, two at 1920, and
            three clipped by the scroller at every width. The focus ring here is{' '}
            <code>var(--foreground)</code> at 2px with a 2px offset, 17.81:1 on the public paper,
            and <code>outline-color</code> is deliberately excluded from the item&rsquo;s transition
            list so the ring lands on the first frame rather than fading in.
          </p>
        </section>

        {/* ── 08 SCOPE ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <SectionHead n="08" title="Not yet here, and why" />
          <ul className="text-muted-foreground max-w-[74ch] list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Search panel, results, pagination and filter mechanisms</strong> — DES-06
              specifies these in full; repeating them here would let the two drift (spec §12).
            </li>
            <li>
              <strong>Byline / author identity</strong> — editorial policy, owned by
              managing-editor, not a layout decision (spec §12).
            </li>
            <li>
              <strong>FAQPage structured data</strong> — a structured-data policy call for
              head-of-seo-content (spec §9.2, §12).
            </li>
            <li>
              <strong>A &ldquo;Provenance&rdquo; component</strong> — present in the pre-DES-03
              draft of this page, absent from the spec&rsquo;s §8 component table. Dropped here
              rather than carried forward silently: DES-03 supersedes the earlier stand-in, and per
              the brief, a state not in the spec is not specified. If provenance-per-figure is still
              wanted, it is a finding for creative-director, not a decision to make alone in this
              item.
            </li>
            <li>
              <strong>A toggle exposing dark mode to a reader</strong> — deliberately out of scope,
              standing CEO ruling. Both palettes are specified so the system is ready if that ruling
              changes; no <code>ThemeProvider</code> exists anywhere in this module.
            </li>
            <li>
              <strong>Self-hosted, subsetted, preloaded article-h1 webfont</strong> — this page
              demonstrates the correct token (opsz 11 pinned) via Google Fonts, scoped to this admin
              route only. Producing the 21,388-byte self-hosted subset against DES-09&rsquo;s LCP
              budget is DES-08&rsquo;s build task on the real article page.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
