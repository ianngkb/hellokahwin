import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span
                  // UI-08: this was `max-w-[200px] truncate`, a fixed box at
                  // EVERY width. It hid 132px (40%) of the article title and
                  // 303px (60%) of the /dewan-kahwin one, identically at 390,
                  // 768, 1024 and 1440 — measured, UI-04 rendered audit. The
                  // crumb is the page's own <h1> and the JSON-LD emits it in
                  // full, so the visible label must match. `min-w-0` on the
                  // <li> lets it shrink inside the flex row; the <ol> already
                  // wraps. `break-words` covers the one state a title can
                  // still overflow on: a single token longer than the column.
                  className="text-foreground font-medium break-words"
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function BreadcrumbJsonLd({ items }: BreadcrumbsProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      // Raw label — JSON.stringify handles JSON string escaping, and the
      // `.replace(/</g, '\\u003c')` below neutralises any `<` (incl. a
      // `</script>` breakout). HTML-entity-escaping here was WRONG: JSON-LD
      // values are not HTML-parsed, so it shipped literal "&amp;" / "&lt;"
      // into structured data (e.g. "Rowan &amp; Parsley" in the SERP crumb).
      name: item.label,
      ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}
