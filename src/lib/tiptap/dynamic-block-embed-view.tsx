'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { BlocksIcon, AlertTriangleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DynamicBlockEmbedNodeView({ node, extension, selected }: NodeViewProps) {
  const blockId = (node.attrs.blockId as string) || '';
  const blockName = (node.attrs.blockName as string) || 'Untitled block';

  // Provided at editor creation via configure(); null = unknown (don't flag).
  const publishedBlockIds = extension.options.publishedBlockIds as string[] | null | undefined;
  const isMissing = Array.isArray(publishedBlockIds) && !publishedBlockIds.includes(blockId);

  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        className={cn(
          'my-4 rounded-md border border-dashed p-4',
          isMissing ? 'border-border bg-muted/50' : 'border-primary/40 bg-primary/5',
          selected && 'ring-primary ring-2 ring-offset-2',
        )}
      >
        {isMissing ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <AlertTriangleIcon className="size-4 shrink-0" />
            <div>
              <p className="text-sm font-medium">Missing block</p>
              <p className="text-xs">
                {blockName} is deleted, unpublished or inactive — nothing will render here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <BlocksIcon className="text-primary size-4 shrink-0" />
            <div>
              <p className="text-sm font-medium">{blockName}</p>
              <p className="text-muted-foreground text-xs">
                Dynamic block — content renders on publish
              </p>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
