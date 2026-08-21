'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { EditorInstance } from 'novel';
import { BlocksIcon, TextCursorInputIcon, ArrowDownToLineIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SectionCard } from '@/components/ui/section-card';

export interface DynamicBlockOption {
  id: string;
  name: string;
  placement: string;
}

interface DynamicBlocksPanelProps {
  editor: EditorInstance;
  /** Published + active blocks available for manual insertion. */
  publishedBlocks: DynamicBlockOption[];
  /** Blocks that auto-attach to this article via targeting rules. */
  autoAttachedBlocks: DynamicBlockOption[];
  disabled?: boolean;
}

export function DynamicBlocksPanel({
  editor,
  publishedBlocks,
  autoAttachedBlocks,
  disabled,
}: DynamicBlocksPanelProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return publishedBlocks;
    return publishedBlocks.filter((b) => b.name.toLowerCase().includes(q));
  }, [publishedBlocks, query]);

  const embedNode = (block: DynamicBlockOption) => ({
    type: 'dynamicBlockEmbed',
    attrs: { blockId: block.id, blockName: block.name },
  });

  const insertAtCursor = (block: DynamicBlockOption) => {
    editor.chain().focus().insertContent(embedNode(block)).run();
  };

  const insertAtEnd = (block: DynamicBlockOption) => {
    editor.chain().focus('end').insertContent(embedNode(block)).run();
  };

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <BlocksIcon className="size-4" />
          Dynamic Blocks
        </span>
      }
      bodyClassName="p-4"
    >
      <p className="text-muted-foreground mb-3 text-[11.5px]">
        Insert a live block at the cursor. A manual embed overrides that block&apos;s automatic
        placement for this article.
      </p>

      {publishedBlocks.length > 0 ? (
        <>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks…"
            className="mb-2 h-8 text-sm"
          />
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-1 text-[11.5px]">No blocks match.</p>
            ) : (
              filtered.map((block) => (
                <div key={block.id} className="flex items-center justify-between gap-2">
                  <span className="line-clamp-1 min-w-0 flex-1 text-[13.5px]">{block.name}</span>
                  <div className="flex shrink-0 items-center">
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      title="Insert at cursor"
                      aria-label={`Insert ${block.name} at cursor`}
                      disabled={disabled}
                      onClick={() => insertAtCursor(block)}
                    >
                      <TextCursorInputIcon className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      title="Insert at end"
                      aria-label={`Insert ${block.name} at end of article`}
                      disabled={disabled}
                      onClick={() => insertAtEnd(block)}
                    >
                      <ArrowDownToLineIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-[11.5px]">
          No published blocks yet.{' '}
          <Link href="/admin/inspire/dynamic-blocks" className="underline">
            Manage dynamic blocks
          </Link>
          .
        </p>
      )}

      {autoAttachedBlocks.length > 0 && (
        <div className="border-hairline mt-4 border-t pt-3">
          <p className="mb-2 text-[12.5px] font-semibold">Auto-attached via rules</p>
          <div className="flex flex-wrap gap-1.5">
            {autoAttachedBlocks.map((block) => (
              <Chip key={block.id} size="sm" title={`Injected at article ${block.placement}`}>
                {block.name} · {block.placement}
              </Chip>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-[11.5px]">
            These render on the published article automatically; inserting one manually moves it to
            your chosen position.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
