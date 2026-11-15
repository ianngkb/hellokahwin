/**
 * Link attributes for the article editor's two link dialogs (toolbar popover
 * and bubble menu).
 *
 * The saved `rel` is rendered verbatim on the public article, so it alone
 * decides whether a link passes ranking credit. Opening in a new tab adds
 * `noopener noreferrer`; `nofollow` is a separate choice. The dialogs tick
 * nofollow together with "open in new tab" by default, and editors untick it
 * for paid guest post links, which are sold as dofollow.
 * For an INTERNAL link the dialogs do not auto-tick nofollow (followed + same
 * tab is the default), but an editor's explicit ticks are saved as chosen.
 */
export function buildLinkAttrs(
  href: string,
  { openInNewTab, nofollow }: { openInNewTab: boolean; nofollow: boolean },
) {
  const rel = [
    ...(openInNewTab ? ['noopener', 'noreferrer'] : []),
    ...(nofollow ? ['nofollow'] : []),
  ];
  return {
    href,
    target: openInNewTab ? '_blank' : null,
    rel: rel.length ? rel.join(' ') : null,
  };
}

export function hasNofollow(rel: unknown): boolean {
  return typeof rel === 'string' && rel.split(/\s+/).includes('nofollow');
}

/**
 * Link marks carry NO default target/rel. Tiptap's Link defaults to
 * `target="_blank" rel="noopener noreferrer nofollow"` for any link written
 * without them, which silently nofollowed every internal link the connector or
 * a paste produced. With these overrides an attribute exists only when it was
 * chosen (editor dialog) or decided by destination (`applyLinkRelPolicy`).
 * Used by the editor's Link.configure. The public renderer keeps its own
 * `InternalAwareLink`, which re-states internal links as followed at render.
 */
export const LINK_HTML_ATTRIBUTES = { target: null, rel: null } as const;

/** Our own hosts: the apex and any subdomain of hellokahwin.com. */
export function isInternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  return h === 'hellokahwin.com' || h.endsWith('.hellokahwin.com');
}

/**
 * Does this href stay on our site? Root-relative (`/artikel/…`), fragment
 * (`#faq`), query-only and bare relative paths count; so do absolute or
 * protocol-relative URLs on hellokahwin.com. mailto:/tel: and every other
 * host do not.
 *
 * This decides the link DIALOG's defaults only. What the public page emits
 * for an internal link is decided at render by `InternalAwareLink`
 * (`@/lib/inspire/internal-links`), which always emits internal links
 * followed and same-tab whatever the stored mark says.
 */
export function isInternalHref(rawHref: unknown): boolean {
  if (typeof rawHref !== 'string') return false;
  const href = rawHref.trim();
  if (!href) return false;
  if (href.startsWith('//')) {
    try {
      return isInternalHost(new URL(`https:${href}`).hostname);
    } catch {
      return false;
    }
  }
  if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) return true;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1]?.toLowerCase();
  if (!scheme) {
    // `hellokahwin.com/x` typed without a scheme is ours; `foo.com/x` is not;
    // a plain relative path (`artikel/x`) is ours.
    const host = /^([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:[/:?#]|$)/i.exec(href)?.[1];
    return host ? isInternalHost(host) : true;
  }
  if (scheme !== 'http' && scheme !== 'https') return false;
  try {
    return isInternalHost(new URL(href).hostname);
  } catch {
    return false;
  }
}

/** True for an http(s) / protocol-relative link to someone else's host. */
export function isExternalHref(rawHref: unknown): boolean {
  if (typeof rawHref !== 'string') return false;
  const href = rawHref.trim();
  if (!/^(?:https?:)?\/\//i.test(href)) return false;
  return !isInternalHref(href);
}

export interface LinkAttrsLike {
  href?: unknown;
  target?: unknown;
  rel?: unknown;
}

/**
 * The connector's link policy, decided by destination:
 *   - internal → kept as written. No rel/target is ADDED (they would only be
 *     there because someone wrote them, and the save guard reports a nofollow).
 *   - external with no rel and no target → new tab + `noopener noreferrer`.
 *     Followed: nofollow only when the author wrote it, so a paid guest post's
 *     dofollow link stays dofollow.
 *   - external with an explicit rel/target → kept as written, except a
 *     new-tab link always gains `noopener noreferrer`.
 */
export function applyLinkRelPolicy<T extends LinkAttrsLike>(attrs: T): T {
  if (!isExternalHref(attrs.href)) return attrs;
  if (!attrs.rel && !attrs.target)
    return { ...attrs, target: '_blank', rel: 'noopener noreferrer' };
  // A new-tab external link always carries noopener noreferrer (Tiptap's
  // default rel no longer supplies it); any other tokens are kept.
  if (attrs.target === '_blank') {
    const tokens = new Set(
      String(attrs.rel ?? '')
        .split(/\s+/)
        .filter(Boolean),
    );
    if (!tokens.has('noopener') || !tokens.has('noreferrer')) {
      return {
        ...attrs,
        rel: [
          'noopener',
          'noreferrer',
          ...[...tokens].filter((t) => t !== 'noopener' && t !== 'noreferrer'),
        ].join(' '),
      };
    }
  }
  return attrs;
}

/**
 * What an editor typed into a link dialog → the href to save.
 *   - http(s)/mailto/tel kept as typed
 *   - `/x`, `#x`, `?x` kept (our own pages; prefixing would make `https:///x`)
 *   - `catalog/venues/x` (no dot in the first segment) → `/catalog/venues/x`:
 *     a bare path is one of our pages, not a host
 *   - anything else (`example.com/x`) gets `https://`
 */
export function normaliseLinkInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^[/#?]/.test(trimmed)) return trimmed;
  const first = trimmed.split(/[/?#]/)[0];
  if (!first.includes('.')) return `/${trimmed}`;
  return `https://${trimmed}`;
}

/**
 * The nofollow a link dialog saves. An explicit choice (the box was touched,
 * or the link already existed with its own rel) is kept exactly. Otherwise the
 * default is decided at SAVE time from the final href — so ticking "new tab"
 * before typing an internal URL cannot leave a stale nofollow on our own page:
 * outbound new-tab links default to nofollow (paid guest posts untick it),
 * internal links default to followed.
 */
export function dialogNofollow({
  href,
  openInNewTab,
  nofollow,
  explicit,
}: {
  href: string;
  openInNewTab: boolean;
  nofollow: boolean;
  explicit: boolean;
}): boolean {
  if (explicit) return nofollow;
  return openInNewTab && !isInternalHref(href);
}
