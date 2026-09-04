/**
 * Internal links must be FOLLOWED. One rule, applied in both directions.
 *
 * ── THE DEFECT THIS EXISTS TO CLOSE ───────────────────────────────────────
 *
 * TipTap's Link extension ships `HTMLAttributes = { target: '_blank', rel:
 * 'noopener noreferrer nofollow' }`, and those values are the DEFAULTS of the
 * `target` and `rel` attributes themselves. So:
 *
 *   1. `marked` turns `[anchor](/artikel/c/s)` into a bare `<a href="…">`.
 *   2. `generateJSON` parses it and fills the missing attributes from those
 *      defaults, writing `rel: "noopener noreferrer nofollow"` INTO the row.
 *   3. `generateHTML` emits exactly that.
 *
 * Nobody typed `nofollow` anywhere. Measured on production 26 Aug 2026 by
 * SEO-02: **79 of the 109 internal editorial links on the live site carried
 * `rel="nofollow"`**, including all five links out of `mas-kahwin-ikut-negeri`,
 * the single highest-impression page on the domain, and every link on all 28
 * pillar articles published that week. `nofollow` tells Googlebot not to follow
 * the link. The site had an internal link graph that no crawler would walk,
 * while the indexing baseline recorded 8 of 28 articles indexed and 19
 * discovered-but-never-crawled and attributed it to crawl scheduling.
 *
 * ── WHY THE FIX IS AT RENDER, NOT ONLY AT INGEST ──────────────────────────
 *
 * Because of the 29 WordPress-migration rows. Their marks were written years
 * ago by a different editor and carry their own `rel`/`target`; no ingest-side
 * change can reach them, and there is no source file to re-ingest them from.
 * Deciding at render covers every row that exists and every row that ever will,
 * whatever wrote it.
 *
 * `normaliseInternalLinkMarks` then keeps the STORED data honest for anything
 * we write ourselves, so a future reader of the JSON is not misled by a
 * `nofollow` the site no longer emits.
 *
 * ── EXTERNAL LINKS ARE DELIBERATELY UNTOUCHED ─────────────────────────────
 *
 * They keep `target="_blank" rel="noopener noreferrer nofollow"`. Whether to
 * follow outbound links — several legacy articles link to
 * theweddingnotebook.com — is an editorial decision, not a defect, and is not
 * this module's to make.
 */
import { mergeAttributes } from '@tiptap/core';
import LinkExtension from '@tiptap/extension-link';
import { getPatternRedirect, normalizePathname } from '@/lib/redirects/patterns';
import { RESERVED_ROOT_SEGMENTS } from '@/lib/redirects/trailing-slash';

/**
 * Is this href a link to our own site?
 *
 * Both spellings count: the pillar articles use root-relative `/artikel/…`,
 * and the WordPress rows use absolute `https://hellokahwin.com/…`.
 */
export function isInternalHref(href: string): boolean {
  const h = href.trim();
  if (h.startsWith('//')) return false;
  if (h.startsWith('/')) return true;
  try {
    return /^(www\.)?hellokahwin\.com$/i.test(new URL(h).hostname);
  } catch {
    return false;
  }
}

/**
 * The Link mark, with internal links emitted as followed same-tab links.
 *
 * Use this everywhere `@tiptap/extension-link` was used before — the renderer
 * and the ingest script both import it, so the two cannot drift.
 */
export const InternalAwareLink = LinkExtension.extend({
  renderHTML({ HTMLAttributes }) {
    const href = String(HTMLAttributes.href ?? '');
    if (!isInternalHref(href)) {
      return ['a', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    }
    // Drop whatever target/rel the row happens to carry and state ours. `rel`
    // is set rather than omitted because `mergeAttributes` would otherwise let
    // the extension default — the nofollow triple — back in.
    const rest = { ...HTMLAttributes };
    delete rest.target;
    delete rest.rel;
    return ['a', mergeAttributes(rest, { rel: 'noopener' }), 0];
  },
});

interface MarkLike {
  type?: string;
  attrs?: Record<string, unknown>;
}
interface NodeLike {
  marks?: MarkLike[];
  content?: unknown;
}

/**
 * Rewrite internal link marks in a TipTap document IN PLACE so the stored
 * attributes match what the site emits. Returns how many marks it changed.
 *
 * Called by the ingest script after `generateJSON`, which is where the
 * defaults get baked in.
 */
export function normaliseInternalLinkMarks(doc: unknown): number {
  let changed = 0;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const n = node as NodeLike;
    for (const mark of n.marks ?? []) {
      if (mark.type !== 'link') continue;
      const href = String(mark.attrs?.href ?? '');
      if (!isInternalHref(href)) continue;
      const attrs = mark.attrs as Record<string, unknown>;
      if (attrs.rel === 'noopener' && attrs.target === '_self') continue;
      attrs.rel = 'noopener';
      // '_self' rather than null: a null attribute falls back to the
      // extension's default, which is '_blank'.
      attrs.target = '_self';
      changed++;
    }
    if (n.content) walk(n.content);
  };
  walk(doc);
  return changed;
}

/**
 * ── RESOLVING A STORED HREF TO WHERE IT ACTUALLY LANDS ────────────────────
 *
 * Ahrefs, 28 Ogos 2026: "Page has links to redirect", 27 pages. The redirects
 * themselves are correct and resolve in one hop; what is wrong is the STORED
 * href. Article bodies still carry pre-migration spellings — the flat
 * WordPress permalink (`https://hellokahwin.com/dewan-kahwin/`) and the old
 * `hiasan-dekorasi` category segment for articles that have since moved to
 * `hantaran-mas-kahwin` — so every internal click and every crawl of those
 * links spends a redirect it does not have to spend.
 *
 * This is the resolver the one-off rewrite script runs, and it deliberately
 * lives beside `isInternalHref` rather than in the script: the script is
 * disposable, the rule is not, and the next editor who pastes a legacy URL
 * will want the same answer. It mirrors what the request path already does —
 * `normalizePathname` and `getPatternRedirect` are the SAME functions the
 * middleware calls, not copies of them — and then applies the one thing the
 * middleware resolves from the database instead of from a pattern: an article
 * is served under its CURRENT primary category, whatever segment the link
 * spells.
 *
 * The `redirects` table is not consulted, and its absence here is a
 * measurement, not an oversight: it held zero rows in production on
 * 4 September 2026. It is written only when an admin renames a published
 * article's slug, and nothing has been renamed. Were a row to appear, the
 * canonical path this function computes from `primary_category_id` is the
 * same destination that row would carry.
 */
export interface InternalHrefTargets {
  /** Published article slug -> the canonical path it is served at today. */
  articlePathBySlug: ReadonlyMap<string, string>;
  /** Every category slug that exists, so a hub link is never rewritten to a 404. */
  categorySlugs: ReadonlySet<string>;
}

/** The app's own hosts. Anything else is somebody else's site. */
const INTERNAL_HOSTS = /^(www\.)?hellokahwin\.com$/i;

/**
 * Where `href` finally lands, or `null` when it already lands there.
 *
 * `null` is the common answer and the safe one. This function rewrites ONLY
 * when it can name the destination from evidence — a published article's
 * current canonical path, a category that exists, a static route the app
 * actually serves. An unknown slug, an unknown category, an unfamiliar shape:
 * all return `null` and the stored href is left exactly as the editor wrote
 * it, even when normalising the slashes alone would have "worked". A rewrite
 * script that guesses is worse than one that skips, and a link normalised into
 * a 404 is worse than a link that spends one redirect.
 */
export function resolveInternalHref(href: string, targets: InternalHrefTargets): string | null {
  const raw = href.trim();
  if (!raw || raw.startsWith('#')) return null;

  // Split the parts a redirect never changes, so they survive the rewrite.
  let head = raw;
  let suffix = '';
  const hashAt = head.indexOf('#');
  if (hashAt !== -1) {
    suffix = head.slice(hashAt) + suffix;
    head = head.slice(0, hashAt);
  }
  const queryAt = head.indexOf('?');
  if (queryAt !== -1) {
    suffix = head.slice(queryAt) + suffix;
    head = head.slice(0, queryAt);
  }

  let path: string;
  if (head.startsWith('/') && !head.startsWith('//')) {
    path = head;
  } else {
    // Absolute, or protocol-relative. `//hellokahwin.com/x` is a real spelling
    // of an internal link and `isInternalHref` deliberately calls it external
    // (it cannot know the scheme at render time); here the scheme is not in
    // question, so it is resolved against https and judged on its host.
    let url: URL;
    try {
      url = new URL(head.startsWith('//') ? `https:${head}` : head);
    } catch {
      return null;
    }
    // Host alone is not enough. `ftp://hellokahwin.com/x` and
    // `https://hellokahwin.com:8443/x` both match the hostname and are NOT
    // pages of this website; rewriting them to a root-relative path would
    // silently change the scheme or the port they addressed.
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.port !== '') return null;
    if (!INTERNAL_HOSTS.test(url.hostname)) return null;
    // Taking the pathname is what pays for the scheme hop and the trailing
    // slash in one step.
    path = url.pathname;
  }
  if (!path.startsWith('/')) return null;

  // The same normalisation the middleware runs first: repeated slashes
  // collapsed, one trailing slash dropped, bare `/` kept.
  path = normalizePathname(path);

  // WordPress structural shapes (/category/x, /tag/x, /feed, date archives).
  // Applied before the article rules for the same reason the middleware
  // applies it before Clerk: it is the rule that KNOWS the destination.
  const pattern = getPatternRedirect(path);
  if (pattern) path = normalizePathname(pattern.destinationPath);

  const segments = path.split('/').filter(Boolean);
  let destination: string | null = null;

  if (segments.length === 0) {
    destination = '/';
  } else if (segments[0] === 'artikel') {
    if (segments.length === 1) {
      destination = '/artikel';
    } else if (segments[1] === 'tag') {
      // A TAG page, never an article. This branch exists because the shapes
      // collide: `/artikel/tag/rukun-nikah` has three segments and
      // `rukun-nikah` is BOTH a tag and a published article, so the article
      // rule below would have rewritten a tag link into an article link and
      // quietly changed where the sentence pointed. Tags are not enumerated
      // here, so a tag link is normalised and otherwise left alone.
      if (segments.length === 3) destination = path;
    } else if (segments.length === 2) {
      // A category hub. It is only a destination if the category exists —
      // `/artikel/tak-wujud/` normalises cleanly and still 404s.
      if (targets.categorySlugs.has(segments[1])) destination = path;
    } else if (segments.length === 3) {
      // /artikel/<category>/<slug> — the slug is authoritative and the
      // category segment is whatever the link happens to say.
      destination = targets.articlePathBySlug.get(segments[2]) ?? null;
    }
    // Anything deeper is not a shape this app serves; leave it alone.
  } else if (segments.length === 1) {
    // The legacy flat permalink. `/[slug]` looks the article up by slug alone
    // and 308s to its canonical path; this does the same lookup up front.
    // RESERVED_ROOT_SEGMENTS is imported rather than restated so a new
    // top-level route cannot be silently swallowed here.
    if (!RESERVED_ROOT_SEGMENTS.has(segments[0])) {
      destination = targets.articlePathBySlug.get(segments[0]) ?? null;
    }
  }

  if (destination === null) return null;
  const resolved = destination + suffix;
  return resolved === raw ? null : resolved;
}
