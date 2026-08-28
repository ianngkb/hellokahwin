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

/** Truncates at the container edge; never wraps to a second line — spec §8. */
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
