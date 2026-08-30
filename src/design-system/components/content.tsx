/**
 * Content components — DES-05, spec §8 (.s-rekod / .s-row / .s-card /
 * .s-tab / .s-imgless).
 *
 * Card and ListRow both take a `headingLevel` prop rather than hardcoding
 * one. Spec §9.1: a list-row/card title is `<h2>` inside a catalogue (whose
 * own h1 is the category name) but MUST be `<h3>` on the homepage, whose h1
 * is the hero article — the same visual style, a different structural
 * level, decided by the page the component is dropped into. Getting this
 * wrong ships two h2 levels with no h1 between them, which is exactly the
 * markup correction §9.1 makes to what §5 originally drew.
 */
import type { ReactNode } from 'react';
import { Heading, Label } from './typography';

export interface RekodField {
  label: string;
  value: ReactNode;
  accent?: boolean;
}

/** The record panel — the site's whole competitive claim in one component:
 * the answer to "what's the rate" before the photograph even loads. */
export function RekodPanel({ fields }: { fields: RekodField[] }) {
  return (
    <div className="s-rekod">
      <Label muted>Rekod</Label>
      <div style={{ marginTop: 10 }}>
        {fields.map((f) => (
          <div className="s-frow" key={f.label}>
            <span className="s-meta">{f.label}</span>
            <span className="s-val" style={f.accent ? { color: 'var(--accent)' } : undefined}>
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type HeadingLevel = 'h2' | 'h3';

export interface ListRowProps {
  href: string;
  title: string;
  meta: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  /* UI-01: required, not optional. `.s-row` reserves a 44px desktop track for
     this number; a row that omits it does not lose the track, it puts the
     headline in it (44px wide, 225-307px tall — measured on production
     31 Ogos 2026). A prose rule did not stop that happening; `tsc` does.

     Rendered zero-padded by the component, not by the caller. `.s-idx` sets
     `font-variant-numeric: tabular-nums` so the numbers form a straight left
     edge down the list; unpadded, that edge breaks exactly where a 12-item
     list crosses 9 → 10, which is the homepage. DES-03's drawings (05-pages
     H1 and K1) are `01`/`02`/`03`. Padding here means no caller can get it
     wrong. */
  index: number;
  headingLevel: HeadingLevel;
}

/** A catalogue/homepage list row — 80 × 60 thumb on phone, 176 × 132 + index
 * number on desktop. Both are 1.33333: UI-12 S2 took the mobile box off 80 × 80,
 * so the same photograph is no longer two different shapes on two devices.
 * Falls back to `.s-imgless` when the item has no cover
 * (spec §6.3/§8): no broken `<img>`, no grey placeholder promising a
 * photograph that never arrives. */
export function ListRow({
  href,
  title,
  meta,
  imageSrc,
  imageAlt,
  index,
  headingLevel,
}: ListRowProps) {
  if (!imageSrc) {
    return (
      <a href={href} className="s-imgless" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span className="s-idx">{String(index).padStart(2, '0')}</span>
        <Heading as={headingLevel} variant="row">
          {title}
        </Heading>
        <span className="s-dim">{meta}</span>
      </a>
    );
  }
  return (
    <a href={href} className="s-row" style={{ textDecoration: 'none', color: 'inherit' }}>
      <span className="s-idx">{String(index).padStart(2, '0')}</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- design-system demo; real pages use next/image */}
      <img src={imageSrc} alt={imageAlt ?? ''} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Heading as={headingLevel} variant="row">
          {title}
        </Heading>
        <span className="s-dim">{meta}</span>
      </div>
    </a>
  );
}

export interface CardProps {
  href: string;
  title: string;
  deck: ReactNode;
  credit: ReactNode;
  imageSrc: string;
  imageAlt: string;
  headingLevel: HeadingLevel;
}

/** The first item of a set — full-width figure + heading + deck + credit.
 * Spec §5.2: a card leads a list, the rest are `ListRow`s, because twelve
 * full-width cards runs to ~4,000px of scroll and twelve rows to ~1,150px. */
export function Card({ href, title, deck, credit, imageSrc, imageAlt, headingLevel }: CardProps) {
  return (
    <a
      href={href}
      className="s-card"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element -- design-system demo; real pages use next/image */}
        <img src={imageSrc} alt={imageAlt} />
        <figcaption style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Heading as={headingLevel} variant="card">
            {title}
          </Heading>
          <span className="s-meta">{deck}</span>
          <span className="s-cred">{credit}</span>
        </figcaption>
      </figure>
    </a>
  );
}

export interface DataTableColumn<Row> {
  header: string;
  width?: number;
  render: (row: Row) => ReactNode;
  numeric?: boolean;
}

/** The money format — what the site actually sells. Zebra-striped at
 * `--tint` (ink/parchment at 5%), tabular figures throughout. An absent
 * figure reads as a recorded finding ("tiada kadar ditetapkan"), never a
 * blank cell — spec §8, carried from the reference draft's provenance
 * rule and consistent with §5.1's own table. */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
}: {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  caption?: ReactNode;
}) {
  return (
    <div>
      <table className="s-tab">
        {caption && <caption style={{ textAlign: 'left', paddingBottom: 8 }}>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.header} scope="col" style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.header} style={c.numeric ? { fontWeight: 600 } : undefined}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
