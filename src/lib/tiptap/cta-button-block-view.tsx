'use client';

import { useState, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function CtaButtonBlockNodeView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [newTab, setNewTab] = useState(false);

  const displayText = (node.attrs['data-text'] as string) || 'Learn More';
  const displayUrl = (node.attrs['data-url'] as string) || '';
  const displayNewTab = node.attrs['data-new-tab'] === 'true';
  const displayAlign = (node.attrs['data-align'] as string) || 'center';

  const setAlignment = useCallback(
    (value: 'left' | 'center' | 'right') => {
      updateAttributes({ 'data-align': value });
    },
    [updateAttributes],
  );

  const startEditing = useCallback(() => {
    setText(displayText);
    setUrl(displayUrl);
    setNewTab(displayNewTab);
    setEditing(true);
  }, [displayText, displayUrl, displayNewTab]);

  const save = useCallback(() => {
    let normalizedUrl = url.trim();
    if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    updateAttributes({
      'data-text': text || 'Learn More',
      'data-url': normalizedUrl,
      'data-new-tab': newTab ? 'true' : 'false',
    });
    setUrl(normalizedUrl);
    setEditing(false);
  }, [text, url, newTab, updateAttributes]);

  const cancel = useCallback(() => {
    setEditing(false);
  }, []);

  const selectNode = useCallback(() => {
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (pos != null) {
      editor.commands.setNodeSelection(pos);
    }
  }, [editor, getPos]);

  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        className={cn(
          'relative my-4 py-6',
          selected && 'ring-primary rounded-md ring-2 ring-offset-2',
        )}
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
        {/* Floating toolbar */}
        {(showToolbar || selected) && !editing && (
          <div
            className="bg-background absolute -top-9 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-md border p-1 shadow-sm"
            contentEditable={false}
          >
            {[
              { value: 'left' as const, icon: AlignLeft, label: 'Align left' },
              { value: 'center' as const, icon: AlignCenter, label: 'Align center' },
              { value: 'right' as const, icon: AlignRight, label: 'Align right' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                className={cn(
                  'flex size-7 items-center justify-center rounded transition-colors',
                  displayAlign === value ? 'bg-muted' : 'hover:bg-muted',
                )}
                onClick={() => setAlignment(value)}
                title={label}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
            <div className="bg-border mx-0.5 h-4 w-px" />
            <button
              type="button"
              className="hover:bg-muted flex size-7 items-center justify-center rounded transition-colors"
              onClick={startEditing}
              title="Edit button"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}

        {/* Button preview */}
        <div
          className={cn(
            'flex',
            displayAlign === 'left' && 'justify-start',
            displayAlign === 'right' && 'justify-end',
            displayAlign !== 'left' && displayAlign !== 'right' && 'justify-center',
          )}
        >
          <button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block cursor-pointer rounded-full px-8 py-3 text-sm font-semibold shadow-sm transition-colors"
            onClick={selectNode}
            onDoubleClick={startEditing}
          >
            {displayText}
          </button>
        </div>

        {/* Edit form */}
        {editing && (
          <form
            className="bg-background mx-auto mt-4 max-w-sm space-y-3 rounded-lg border p-4 shadow-md"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancel();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <Label htmlFor="cta-text" className="text-xs">
                Button Text
              </Label>
              <Input
                id="cta-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Learn More"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cta-url" className="text-xs">
                URL
              </Label>
              <Input
                id="cta-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cta-newtab"
                checked={newTab}
                onCheckedChange={(v) => setNewTab(v === true)}
              />
              <Label htmlFor="cta-newtab" variant="inline" className="cursor-pointer text-xs">
                Open in new tab
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </form>
        )}
      </div>
    </NodeViewWrapper>
  );
}
