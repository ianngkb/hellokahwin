import type { Editor } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';

/**
 * Convert a PDF attachment node between its block (`pdfLinkBlock`) and inline
 * (`pdfLinkInline`) placement, preserving the shared attrs. Block→inline wraps
 * the inline node in a paragraph; inline→block lets ProseMirror split the host
 * paragraph to seat the block. A no-op if the transform can't be applied.
 */
export function convertPdfPlacement(
  editor: Editor,
  getPos: (() => number) | boolean,
  node: PMNode,
  toInline: boolean,
): void {
  if (typeof getPos !== 'function') return;
  const pos = getPos();
  if (pos == null) return;

  const { schema } = editor.state;
  const targetName = toInline ? 'pdfLinkInline' : 'pdfLinkBlock';
  const type = schema.nodes[targetName];
  if (!type) return;
  if (toInline && !schema.nodes.paragraph) return;

  const attrs: Record<string, unknown> = {
    'data-url': node.attrs['data-url'],
    'data-text': node.attrs['data-text'],
    'data-file-size': node.attrs['data-file-size'],
    'data-style': node.attrs['data-style'],
  };
  // Alignment only exists on the block node.
  if (!toInline) attrs['data-align'] = node.attrs['data-align'] ?? 'center';

  editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      const from = pos;
      const to = pos + node.nodeSize;
      try {
        const newNode = type.create(attrs);
        const replacement = toInline ? schema.nodes.paragraph.create(null, newNode) : newNode;
        if (dispatch) tr.replaceRangeWith(from, to, replacement);
        return true;
      } catch {
        // Transform couldn't fit (e.g. schema constraints) — leave the node as-is.
        return false;
      }
    })
    .run();
}
