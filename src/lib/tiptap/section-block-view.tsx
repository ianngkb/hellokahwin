'use client';

import { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ChevronDown, FolderOpen, FolderClosed } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionBlockNodeView({ node, updateAttributes }: NodeViewProps) {
  const [collapsed, setCollapsed] = useState(false);
  const title = (node.attrs['data-title'] as string) || '';

  return (
    <NodeViewWrapper className="border-muted-foreground/30 my-4 rounded-md border border-dashed">
      {/* Header bar */}
      <div
        className="bg-muted/30 flex items-center gap-1.5 rounded-t-md px-3 py-2"
        data-drag-handle
      >
        <button
          type="button"
          className="hover:bg-muted shrink-0 rounded p-0.5 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          contentEditable={false}
        >
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 transition-transform',
              collapsed && '-rotate-90',
            )}
          />
        </button>
        <div className="text-muted-foreground shrink-0" contentEditable={false}>
          {collapsed ? <FolderClosed className="size-4" /> : <FolderOpen className="size-4" />}
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => updateAttributes({ 'data-title': e.target.value })}
          placeholder="Section title…"
          className="placeholder:text-muted-foreground/50 flex-1 border-0 bg-transparent text-sm font-semibold outline-none focus:ring-0"
          contentEditable={false}
        />
      </div>

      {/* Content area */}
      <div className={cn(collapsed && 'hidden')}>
        <NodeViewContent className="border-muted mx-3 my-2 border-l-2 pl-4" />
      </div>
    </NodeViewWrapper>
  );
}
