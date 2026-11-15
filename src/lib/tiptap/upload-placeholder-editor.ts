import { useSyncExternalStore } from 'react';
import type { Editor } from '@tiptap/core';
import { IMAGE_NODE_TYPES } from './upload-placeholder';

// ── In-flight registry ──────────────────────────────────────────────────
// The placeholder srcs whose upload THIS page started and has not yet settled
// or discarded. The editor's banner reads it to tell "still uploading" from
// "never finished": the global upload-progress tracker cannot, because the
// media picker's bulk uploader and the cover uploader share it, so a stray
// placeholder would read as "uploading" whenever anything else on the page
// is. Module scope on purpose — the figure block's node view and the editor's
// drop/paste/slash handlers are separate components with one document.
let inFlight: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();
function setInFlight(next: Set<string>) {
  inFlight = next;
  for (const l of listeners) l();
}

/** Record a placeholder src whose upload has just started. */
export function beginUploadPlaceholder(placeholderSrc: string) {
  const next = new Set(inFlight);
  next.add(placeholderSrc);
  setInFlight(next);
}

function endUploadPlaceholder(placeholderSrc: string) {
  if (!inFlight.has(placeholderSrc)) return;
  const next = new Set(inFlight);
  next.delete(placeholderSrc);
  setInFlight(next);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
const getSnapshot = () => inFlight;

/** The placeholder srcs still uploading from this page, for the banner. */
export function useInFlightUploadPlaceholders(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Editor-side half of the upload placeholder contract. Both helpers locate the
 * node by its placeholder `src` across EVERY image-bearing node type, in one
 * transaction, from the editor's current document.
 *
 * Why not the node view's own `updateAttributes`, or a walk that only looks
 * at `image` nodes? Because the node that started the upload is not always
 * the node that exists when it finishes:
 *
 * - The sidebar's **Add Caption** deletes the `image` and inserts a
 *   `figureBlock` carrying a copy of its attrs — placeholder src included. A
 *   finisher that only matches `image` finds nothing and reports success.
 * - A figure dragged to a new spot, undo/redo, or a re-created node view all
 *   leave the captured `updateAttributes` pointing at a destroyed view, which
 *   Tiptap turns into a silent no-op (`getPos()` is no longer a number).
 *
 * Matching on the src string survives all of that, because the placeholder
 * travels with the node's attrs wherever it goes.
 */

/**
 * Replace the placeholder with the finished upload's attrs on every node that
 * still carries it. Existing attrs (caption, caption URL) are preserved.
 * Returns how many nodes were updated — `0` means the admin removed the image
 * before the upload finished, and the caller should treat that as "nothing to
 * do", not as a failure.
 */
export function settleUploadPlaceholder(
  editor: Editor,
  placeholderSrc: string,
  attrs: Record<string, unknown>,
): number {
  endUploadPlaceholder(placeholderSrc);
  // The admin navigated away mid-upload: the editor (and its view) is gone,
  // and `view.dispatch` on a destroyed editor throws. Nothing to write to.
  if (editor.isDestroyed) return 0;
  const { state } = editor;
  // Not undoable: Ctrl+Z straight after the swap would restore a revoked
  // `blob:` src that nothing can ever settle again, and every save would then
  // be refused. The upload result is not an edit the admin made.
  const tr = state.tr.setMeta('addToHistory', false);
  let updated = 0;
  state.doc.descendants((node, pos) => {
    if (IMAGE_NODE_TYPES.includes(node.type.name) && node.attrs.src === placeholderSrc) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
      updated++;
    }
  });
  if (updated > 0) editor.view.dispatch(tr);
  return updated;
}

/**
 * A failed upload must not leave a placeholder behind. A bare `image` is
 * removed outright; a `figureBlock` keeps its caption but drops the picture,
 * so it falls back to its "Click to add image" state and the admin's caption
 * work is not thrown away with the failed file.
 */
export function discardUploadPlaceholder(editor: Editor, placeholderSrc: string): number {
  endUploadPlaceholder(placeholderSrc);
  if (editor.isDestroyed) return 0;
  const { state } = editor;
  const tr = state.tr.setMeta('addToHistory', false);
  let changed = 0;
  // Collect first, then apply from the end so earlier positions stay valid
  // when a node is deleted.
  const hits: Array<{
    pos: number;
    nodeSize: number;
    type: string;
    attrs: Record<string, unknown>;
  }> = [];
  state.doc.descendants((node, pos) => {
    if (IMAGE_NODE_TYPES.includes(node.type.name) && node.attrs.src === placeholderSrc) {
      hits.push({ pos, nodeSize: node.nodeSize, type: node.type.name, attrs: node.attrs });
    }
  });
  for (const hit of hits.reverse()) {
    if (hit.type === 'figureBlock') {
      tr.setNodeMarkup(hit.pos, undefined, {
        ...hit.attrs,
        src: null,
        alt: null,
        'data-original-src': null,
        'data-quality': null,
        'data-variants': null,
      });
    } else {
      tr.delete(hit.pos, hit.pos + hit.nodeSize);
    }
    changed++;
  }
  if (changed > 0) editor.view.dispatch(tr);
  return changed;
}
