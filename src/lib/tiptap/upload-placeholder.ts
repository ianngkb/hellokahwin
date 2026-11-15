/**
 * Upload placeholders in article content.
 *
 * When an admin drops a photo into the editor, the node is inserted at once
 * with a `blob:` object URL so they see the picture immediately, and the real
 * storage URL is swapped in when the upload finishes. A `blob:` URL only
 * exists inside that one browser tab, so if it ever reaches the database the
 * published article shows a broken image — which is exactly what happened on
 * two articles on The Wedding Notebook (whose editor this one shares) before
 * this module existed. The files themselves had uploaded fine; only the swap
 * was lost.
 *
 * This file is the single definition of "a placeholder that must never be
 * saved". It is pure (no editor, no DOM) so the same check runs in the editor
 * before a save leaves the browser AND in `updateArticleAction`, which both the
 * manual save and the 60-second autosave write through.
 */

/** Node types in the article schema that carry an image `src`. */
export const IMAGE_NODE_TYPES: readonly string[] = ['image', 'figureBlock'];

/**
 * True for a src that only resolves inside the browser tab that minted it:
 * `blob:` object URLs (the editor's upload preview) and inline `data:` URIs,
 * which are never what the upload pipeline stores.
 */
export function isPendingUploadSrc(src: unknown): src is string {
  return typeof src === 'string' && (src.startsWith('blob:') || src.startsWith('data:'));
}

export interface PendingUpload {
  /** Node type that holds the placeholder (`image` or `figureBlock`). */
  type: string;
  /** The dropped file's name, when the editor recorded one. */
  alt: string | null;
  src: string;
}

/**
 * Walk a Tiptap/ProseMirror JSON document and list every image-bearing node
 * whose `src` is still a placeholder. Returns `[]` for anything that is not a
 * document, so callers can pass the raw save payload.
 */
export function findPendingUploads(content: unknown): PendingUpload[] {
  const found: PendingUpload[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: unknown; attrs?: Record<string, unknown>; content?: unknown };
    if (typeof n.type === 'string' && IMAGE_NODE_TYPES.includes(n.type)) {
      const src = n.attrs?.src;
      if (isPendingUploadSrc(src)) {
        const alt = n.attrs?.alt;
        found.push({ type: n.type, alt: typeof alt === 'string' && alt ? alt : null, src });
      }
    }
    if (Array.isArray(n.content)) for (const child of n.content) walk(child);
  };
  walk(content);
  return found;
}

/**
 * One sentence for a toast or a server error. Names the files so the admin
 * can find them in the media library, where a finished upload always lands
 * even when the editor lost track of it.
 */
export function describePendingUploads(pending: readonly PendingUpload[]): string {
  const names = pending.map((p) => p.alt).filter((a): a is string => !!a);
  const count = pending.length;
  const noun = count === 1 ? 'image' : 'images';
  const which = names.length ? ` (${names.join(', ')})` : '';
  return `${count} ${noun}${which} ${count === 1 ? 'has' : 'have'} not finished uploading. Wait for the upload, or replace the image from the media library, then save again.`;
}
