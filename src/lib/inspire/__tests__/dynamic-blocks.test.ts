import { describe, it, expect } from 'vitest';
import {
  mergeDynamicBlocks,
  collectEmbeddedBlockIds,
  type MergeableDynamicBlock,
} from '../dynamic-blocks';

function para(text: string) {
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}

function doc(...content: unknown[]) {
  return { type: 'doc', content };
}

function embed(blockId: string, blockName = 'Block') {
  return { type: 'dynamicBlockEmbed', attrs: { blockId, blockName } };
}

function block(id: string, overrides: Partial<MergeableDynamicBlock> = {}): MergeableDynamicBlock {
  return {
    id,
    content: doc(para(`block-${id}`)),
    placement: 'end',
    displayOrder: 0,
    createdAt: '2026-07-01T00:00:00Z',
    matchesRules: true,
    ...overrides,
  };
}

function texts(merged: unknown): string[] {
  const out: string[] = [];
  const walk = (node: { type?: string; text?: string; content?: unknown[] }) => {
    if (node.type === 'text' && node.text) out.push(node.text);
    if (Array.isArray(node.content)) node.content.forEach((c) => walk(c as never));
  };
  walk(merged as never);
  return out;
}

function nodeTypes(merged: unknown): string[] {
  const out: string[] = [];
  const walk = (node: { type?: string; content?: unknown[] }) => {
    if (node.type) out.push(node.type);
    if (Array.isArray(node.content)) node.content.forEach((c) => walk(c as never));
  };
  walk(merged as never);
  return out;
}

describe('collectEmbeddedBlockIds', () => {
  it('finds embed ids at top level and nested', () => {
    const d = doc(para('a'), embed('b1'), {
      type: 'sectionBlock',
      content: [embed('b2'), para('x')],
    });
    expect(collectEmbeddedBlockIds(d).sort()).toEqual(['b1', 'b2']);
  });

  it('returns empty for null/invalid docs', () => {
    expect(collectEmbeddedBlockIds(null)).toEqual([]);
    expect(collectEmbeddedBlockIds('nope')).toEqual([]);
  });
});

describe('mergeDynamicBlocks', () => {
  it('appends END block content after the last article node', () => {
    const merged = mergeDynamicBlocks(doc(para('body')), [block('b1', { placement: 'end' })]);
    expect(texts(merged)).toEqual(['body', 'block-b1']);
  });

  it('prepends START block content before the first article node', () => {
    const merged = mergeDynamicBlocks(doc(para('body')), [block('b1', { placement: 'start' })]);
    expect(texts(merged)).toEqual(['block-b1', 'body']);
  });

  it('orders multiple matches by displayOrder then createdAt', () => {
    const merged = mergeDynamicBlocks(doc(para('body')), [
      block('later', { displayOrder: 1, createdAt: '2026-07-01T00:00:00Z' }),
      block('newer', { displayOrder: 0, createdAt: '2026-07-02T00:00:00Z' }),
      block('older', { displayOrder: 0, createdAt: '2026-07-01T00:00:00Z' }),
    ]);
    expect(texts(merged)).toEqual(['body', 'block-older', 'block-newer', 'block-later']);
  });

  it('renders a manual embed at its position and suppresses auto-injection', () => {
    const merged = mergeDynamicBlocks(doc(para('before'), embed('b1'), para('after')), [
      block('b1', { placement: 'end', matchesRules: true }),
    ]);
    expect(texts(merged)).toEqual(['before', 'block-b1', 'after']);
  });

  it('suppresses auto-injection even for embeds nested inside sections', () => {
    const merged = mergeDynamicBlocks(
      doc({ type: 'sectionBlock', content: [embed('b1')] }, para('body')),
      [block('b1', { placement: 'end' })],
    );
    expect(texts(merged)).toEqual(['block-b1', 'body']);
  });

  it('drops embed nodes referencing missing/draft/inactive blocks', () => {
    // Draft/inactive/deleted blocks are absent from the resolved list.
    const merged = mergeDynamicBlocks(doc(para('body'), embed('gone')), []);
    expect(texts(merged)).toEqual(['body']);
    expect(nodeTypes(merged)).not.toContain('dynamicBlockEmbed');
  });

  it('injects nothing when no blocks match', () => {
    const original = doc(para('body'));
    const merged = mergeDynamicBlocks(original, []);
    expect(texts(merged)).toEqual(['body']);
  });

  it('ignores non-matching blocks provided only for manual resolution', () => {
    // matchesRules=false (embed-only block) must not auto-inject.
    const merged = mergeDynamicBlocks(doc(para('body')), [block('b1', { matchesRules: false })]);
    expect(texts(merged)).toEqual(['body']);
  });

  it('strips nested dynamicBlockEmbed nodes inside block content', () => {
    const merged = mergeDynamicBlocks(doc(para('body')), [
      block('b1', {
        content: doc(para('outer'), embed('b2'), {
          type: 'sectionBlock',
          content: [embed('b3'), para('inner')],
        }),
      }),
      block('b2', { matchesRules: false }),
    ]);
    expect(texts(merged)).toEqual(['body', 'outer', 'inner']);
    expect(nodeTypes(merged)).not.toContain('dynamicBlockEmbed');
  });

  it('guarantees no embed nodes remain in the output', () => {
    const merged = mergeDynamicBlocks(
      doc(embed('b1'), para('body'), { type: 'sectionBlock', content: [embed('missing')] }),
      [block('b1'), block('auto', { placement: 'start' })],
    );
    expect(nodeTypes(merged)).not.toContain('dynamicBlockEmbed');
    expect(texts(merged)).toEqual(['block-auto', 'block-b1', 'body']);
  });

  it('does not mutate the input doc or blocks', () => {
    const original = doc(para('body'), embed('b1'));
    const snapshot = JSON.stringify(original);
    const blocks = [block('b1'), block('b2', { placement: 'start' })];
    const blocksSnapshot = JSON.stringify(blocks);
    mergeDynamicBlocks(original, blocks);
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(JSON.stringify(blocks)).toBe(blocksSnapshot);
  });

  it('returns invalid docs unchanged', () => {
    expect(mergeDynamicBlocks(null, [block('b1')])).toBeNull();
    const noContent = { type: 'doc' };
    expect(mergeDynamicBlocks(noContent, [block('b1')])).toBe(noContent);
  });

  it('handles blocks with empty/invalid content', () => {
    const merged = mergeDynamicBlocks(doc(para('body')), [
      block('b1', { content: null }),
      block('b2', { content: { type: 'doc' } }),
    ]);
    expect(texts(merged)).toEqual(['body']);
  });
});
