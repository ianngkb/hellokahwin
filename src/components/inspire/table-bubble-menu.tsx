'use client';

import { useEditor, EditorBubble } from 'novel';
import type { Editor } from '@tiptap/core';
import { Columns3, Rows3, Plus, Trash2, Merge, Split, TableProperties, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TableBubbleMenu() {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <EditorBubble
      shouldShow={({ editor: e }) =>
        e.isActive('table') && !(e.isActive('link') && e.state.selection.empty)
      }
      tippyOptions={{ placement: 'top-start', maxWidth: 'none' }}
    >
      <TableBubbleContent editor={editor} />
    </EditorBubble>
  );
}

function TableBubbleContent({ editor }: { editor: Editor }) {
  return (
    <div className="bg-background flex items-center gap-0.5 rounded-lg border px-1 py-1 shadow-md">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        title="Add column before"
      >
        <Columns3 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Add column after"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Delete column"
      >
        <Minus className="text-destructive h-3.5 w-3.5" />
      </Button>

      <div className="bg-border mx-0.5 h-5 w-px" />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        title="Add row before"
      >
        <Rows3 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Add row after"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Delete row"
      >
        <Minus className="text-destructive h-3.5 w-3.5" />
      </Button>

      <div className="bg-border mx-0.5 h-5 w-px" />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().mergeCells().run()}
        disabled={!editor.can().mergeCells()}
        title="Merge cells"
      >
        <Merge className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().splitCell().run()}
        disabled={!editor.can().splitCell()}
        title="Split cell"
      >
        <Split className="h-3.5 w-3.5" />
      </Button>

      <div className="bg-border mx-0.5 h-5 w-px" />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        title="Toggle header row"
      >
        <TableProperties className="h-3.5 w-3.5" />
      </Button>

      <div className="bg-border mx-0.5 h-5 w-px" />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete table"
      >
        <Trash2 className="text-destructive h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
