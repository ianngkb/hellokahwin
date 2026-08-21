/**
 * Dynamic-block injection engine (spec-dynamic-blocks).
 *
 * `mergeDynamicBlocks` is a PURE function over Tiptap JSON — no DB, no React —
 * so the I/O matrix is unit-testable. `resolveDynamicBlocks` is the DB side:
 * it returns the published + active blocks relevant to an article (rule
 * matches + manual embeds) for the merge to consume.
 *
 * Merge semantics:
 *   - `dynamicBlockEmbed` nodes are substituted with the referenced block's
 *     live content (missing/unresolved blocks are dropped silently).
 *   - A manual embed suppresses that block's automatic START/END injection.
 *   - Remaining rule-matched blocks are prepended (START) / appended (END),
 *     ordered by displayOrder then createdAt.
 *   - Nested `dynamicBlockEmbed` nodes inside block content are stripped —
 *     no recursion, ever.
 *   - The output never contains a `dynamicBlockEmbed` node, so the render
 *     pipeline (ArticleRenderer/generateHTML) needs no knowledge of them.
 */

// Node type of the manual-embed atom (src/lib/tiptap/dynamic-block-embed.ts).
// Redeclared here so this module stays free of Tiptap/React imports.
const EMBED_NODE_TYPE = 'dynamicBlockEmbed';

export type DynamicBlockPlacement = 'start' | 'end';

export interface MergeableDynamicBlock {
  id: string;
  /** Tiptap doc JSON ({ type: 'doc', content: [...] }). */
  content: unknown;
  placement: DynamicBlockPlacement;
  displayOrder: number;
  createdAt: string | Date;
  /** True when the block auto-attaches to this article via targeting rules. */
  matchesRules: boolean;
}

interface TiptapNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  [key: string]: unknown;
}

function isDocWithContent(doc: unknown): doc is TiptapNode & { content: TiptapNode[] } {
  return typeof doc === 'object' && doc !== null && Array.isArray((doc as TiptapNode).content);
}

/** Block ids referenced by `dynamicBlockEmbed` nodes anywhere in a doc. */
export function collectEmbeddedBlockIds(doc: unknown): string[] {
  const ids = new Set<string>();
  const walk = (node: TiptapNode) => {
    if (node.type === EMBED_NODE_TYPE) {
      const blockId = node.attrs?.blockId;
      if (typeof blockId === 'string' && blockId) ids.add(blockId);
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  if (typeof doc === 'object' && doc !== null) walk(doc as TiptapNode);
  return [...ids];
}

/** A block's top-level content nodes, with any nested embed nodes stripped. */
function blockContentNodes(block: MergeableDynamicBlock): TiptapNode[] {
  if (!isDocWithContent(block.content)) return [];
  const strip = (nodes: TiptapNode[]): TiptapNode[] =>
    nodes
      .filter((node) => node.type !== EMBED_NODE_TYPE)
      .map((node) =>
        Array.isArray(node.content) ? { ...node, content: strip(node.content) } : node,
      );
  return strip(block.content.content);
}

function sortBlocks(blocks: MergeableDynamicBlock[]): MergeableDynamicBlock[] {
  return [...blocks].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Merge dynamic blocks into an article doc. Pure — does not mutate inputs.
 * `blocks` must already be filtered to published + active (resolveDynamicBlocks
 * guarantees this); draft/inactive/missing blocks simply aren't in the list,
 * so their embed nodes drop out and their rules inject nothing.
 */
export function mergeDynamicBlocks(doc: unknown, blocks: MergeableDynamicBlock[]): unknown {
  if (!isDocWithContent(doc)) return doc;

  const byId = new Map(blocks.map((b) => [b.id, b]));
  const embeddedIds = new Set(collectEmbeddedBlockIds(doc));

  // Substitute manual embed nodes with live block content (drop unresolved).
  const substitute = (nodes: TiptapNode[]): TiptapNode[] =>
    nodes.flatMap((node) => {
      if (node.type === EMBED_NODE_TYPE) {
        const blockId = node.attrs?.blockId;
        const block = typeof blockId === 'string' ? byId.get(blockId) : undefined;
        return block ? blockContentNodes(block) : [];
      }
      if (Array.isArray(node.content)) return [{ ...node, content: substitute(node.content) }];
      return [node];
    });

  const bodyNodes = substitute(doc.content);

  // Auto-inject rule-matched blocks not manually embedded anywhere in the doc.
  const autoBlocks = sortBlocks(blocks.filter((b) => b.matchesRules && !embeddedIds.has(b.id)));
  const startNodes = autoBlocks
    .filter((b) => b.placement === 'start')
    .flatMap((b) => blockContentNodes(b));
  const endNodes = autoBlocks
    .filter((b) => b.placement === 'end')
    .flatMap((b) => blockContentNodes(b));

  return { ...doc, content: [...startNodes, ...bodyNodes, ...endNodes] };
}

/**
 * Fetch the published + active blocks relevant to an article: those whose
 * rules match (category = primary OR secondary, tag, or the specific article)
 * plus any manually-embedded ids (so embeds resolve even without a rule).
 * DB access is lazily imported so the pure merge above stays testable without
 * a database env.
 */
export async function resolveDynamicBlocks(params: {
  articleId: string;
  categoryIds: string[];
  tagIds: string[];
  embeddedBlockIds?: string[];
}): Promise<MergeableDynamicBlock[]> {
  const { articleId, categoryIds, tagIds, embeddedBlockIds = [] } = params;

  const [{ db }, { dynamicBlocks, dynamicBlockRules }, { eq, and, or, inArray }] =
    await Promise.all([
      import('@/lib/db/drizzle'),
      import('@/lib/db/schema/dynamic-blocks'),
      import('drizzle-orm'),
    ]);

  const ruleConditions = [eq(dynamicBlockRules.articleId, articleId)];
  if (categoryIds.length > 0)
    ruleConditions.push(inArray(dynamicBlockRules.categoryId, categoryIds));
  if (tagIds.length > 0) ruleConditions.push(inArray(dynamicBlockRules.tagId, tagIds));

  const matchedRules = await db
    .selectDistinct({ blockId: dynamicBlockRules.blockId })
    .from(dynamicBlockRules)
    .where(or(...ruleConditions));

  const matchedIds = new Set(matchedRules.map((r) => r.blockId));
  const wantedIds = [...new Set([...matchedIds, ...embeddedBlockIds])];
  if (wantedIds.length === 0) return [];

  const rows = await db
    .select({
      id: dynamicBlocks.id,
      content: dynamicBlocks.content,
      placement: dynamicBlocks.placement,
      displayOrder: dynamicBlocks.displayOrder,
      createdAt: dynamicBlocks.createdAt,
    })
    .from(dynamicBlocks)
    .where(
      and(
        inArray(dynamicBlocks.id, wantedIds),
        eq(dynamicBlocks.status, 'published'),
        eq(dynamicBlocks.isActive, true),
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    placement: row.placement === 'start' ? 'start' : 'end',
    displayOrder: row.displayOrder,
    createdAt: row.createdAt,
    matchesRules: matchedIds.has(row.id),
  }));
}
