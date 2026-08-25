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
    const { target: _target, rel: _rel, ...rest } = HTMLAttributes;
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
