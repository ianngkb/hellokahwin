/**
 * Shared chrome — DES-05, spec §8 (.s-mast / .s-crumb / .s-foot). Drawn
 * identically across every frame in §5 and §7, so it is exactly one
 * component each, not one per page type.
 */
import type { ReactNode } from 'react';
import { Label, Wordmark } from './typography';

export interface NavItem {
  label: string;
  href: string;
  current?: boolean;
}

/**
 * Masthead. Phone: wordmark + "Cari". Desktop (≥1024px): + up to three
 * category links, per spec §4.2's breakpoint table ("Nav shows three
 * categories plus Cari"). The wordmark links home; it is a LINK, not a
 * heading — spec §9.1's homepage row is explicit that the wordmark is not
 * the page's h1.
 */
export function Masthead({
  categories = [],
  cariHref = '/cari',
  homeHref = '/',
}: {
  categories?: NavItem[];
  cariHref?: string;
  homeHref?: string;
}) {
  return (
    <div className="s-mast">
      <a href={homeHref} style={{ color: 'inherit', textDecoration: 'none' }}>
        <Wordmark />
      </a>
      <nav className="s-nav" aria-label="Navigasi utama">
        {categories.map((c) => (
          <a
            key={c.href}
            href={c.href}
            className="s-label"
            style={{ color: c.current ? 'var(--fg)' : 'var(--fg-muted)' }}
          >
            {c.label}
          </a>
        ))}
        <a href={cariHref} className="s-label" style={{ color: 'var(--accent)' }}>
          Cari
        </a>
      </nav>
    </div>
  );
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Spec §8 says "truncates at the container edge, never wraps to a second line",
 * but every crumb §5 and §7 draw ends in a CATEGORY ("Hantaran & Mas Kahwin").
 * The spec never drew the state the site actually ships: a final crumb that is
 * the article's own <h1>. `.s-crumb` has always been `flex-wrap: wrap` with no
 * truncation, so the docstring that used to sit here asserted a behaviour the
 * component did not have — UI-08, 31 Ogos 2026.
 *
 * Measured (UI-04 rendered audit, production, four widths): the public
 * `Breadcrumbs` used a fixed `max-w-[200px] truncate` and hid 132px (40%) of
 * the article title and 303px (60%) of the /dewan-kahwin one — identically at
 * 390, 768, 1024 and 1440. That is not "the container edge"; at 1440 the
 * column offered 888px. UI-08 removed the fixed box. Long-label state is on
 * the reference page below the short one; whether §8 should keep the
 * never-wrap rule for article-length crumbs is the Creative Director's call.
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="s-crumb" aria-label="Lokasi anda">
      {items.map((item, i) => (
        <span key={item.label} style={{ display: 'contents' }}>
          {i > 0 && <span aria-hidden="true">›</span>}
          {item.href ? (
            <a href={item.href}>{item.label}</a>
          ) : (
            <span style={{ color: 'var(--fg)' }} aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export interface ReadNextLink {
  label: string;
  href: string;
}

/** Footer / read-next — three related links, category-scoped. Spec §8. */
export function FooterReadNext({ label, links }: { label: ReactNode; links: ReadNextLink[] }) {
  return (
    <div className="s-foot">
      <Label muted>{label}</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 48px' }}>
        {links.map((l) => (
          <a key={l.href} href={l.href} className="s-meta">
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
