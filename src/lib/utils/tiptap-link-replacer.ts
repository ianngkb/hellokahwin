interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
}

const TAG_SLUG_REGEX = /\/artikel\/tag\/([a-z0-9-]+)/;

/**
 * Recursively walks Tiptap JSON content and replaces tag slugs in link hrefs.
 * Returns the (mutated) cloned content and count of replacements made.
 * Deep-clones the input to avoid side effects.
 */
export function replaceTagLinksInContent(
  content: unknown,
  slugReplacements: Map<string, string>,
): { content: unknown; replacedCount: number } {
  // Deep clone to avoid mutating the original
  const cloned = JSON.parse(JSON.stringify(content));
  let replacedCount = 0;

  function walk(node: TiptapNode) {
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type !== 'link' || !mark.attrs) continue;

        const href = mark.attrs.href;
        if (typeof href !== 'string') continue;

        const match = href.match(TAG_SLUG_REGEX);
        if (!match) continue;

        const oldSlug = match[1];
        const newSlug = slugReplacements.get(oldSlug);
        if (!newSlug) continue;

        mark.attrs.href = href.replace(`/artikel/tag/${oldSlug}`, `/artikel/tag/${newSlug}`);
        replacedCount++;
      }
    }

    if (node.content) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  // Walk: handle both doc-level (with content array) and raw arrays
  if (cloned && typeof cloned === 'object') {
    if (Array.isArray(cloned)) {
      for (const node of cloned) {
        walk(node);
      }
    } else if (cloned.content && Array.isArray(cloned.content)) {
      for (const node of cloned.content) {
        walk(node);
      }
    }
  }

  return { content: cloned, replacedCount };
}
