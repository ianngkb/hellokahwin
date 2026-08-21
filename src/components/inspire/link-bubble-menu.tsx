'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorBubble } from 'novel';
import { getMarkRange } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Globe, Pencil, Link2Off, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function LinkBubbleMenu() {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <EditorBubble
      shouldShow={({ editor: e }) => e.isActive('link') && e.state.selection.empty}
      tippyOptions={{ placement: 'bottom-start', maxWidth: 'none' }}
    >
      <LinkBubbleContent editor={editor} />
    </EditorBubble>
  );
}

function LinkBubbleContent({ editor }: { editor: Editor }) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [url, setUrl] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [copied, setCopied] = useState(false);
  const rangeRef = useRef<{ from: number; to: number } | null>(null);

  // Reset to preview when editor selection changes (cursor moved to different link)
  useEffect(() => {
    const handler = () => {
      setMode('preview');
      setCopied(false);
    };
    editor.on('selectionUpdate', handler);
    return () => {
      editor.off('selectionUpdate', handler);
    };
  }, [editor]);

  const attrs = editor.getAttributes('link');
  const href = (attrs.href as string) || '';
  const displayUrl = href.replace(/^https?:\/\/(www\.)?/, '');

  const getCurrentLinkInfo = useCallback(() => {
    const { $from } = editor.state.selection;
    const range = getMarkRange($from, editor.schema.marks.link);
    if (range) {
      rangeRef.current = range;
      return editor.state.doc.textBetween(range.from, range.to);
    }
    return '';
  }, [editor]);

  const startEditing = useCallback(() => {
    setUrl(href);
    getCurrentLinkInfo(); // populate rangeRef
    setOpenInNewTab(attrs.target === '_blank');
    setMode('edit');
  }, [href, attrs.target, getCurrentLinkInfo]);

  const save = useCallback(() => {
    const normalised = normaliseUrl(url);
    if (!normalised) return;

    const linkAttrs = {
      href: normalised,
      target: openInNewTab ? '_blank' : null,
      rel: openInNewTab ? 'noopener noreferrer nofollow' : null,
    };

    const range = rangeRef.current;
    if (range) {
      editor
        .chain()
        .focus()
        .setTextSelection(range)
        .setLink(linkAttrs)
        .setTextSelection(range.from)
        .run();
    }

    setMode('preview');
  }, [editor, url, openInNewTab]);

  const unlink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  const copyUrl = useCallback(() => {
    navigator.clipboard.writeText(href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [href]);

  const cancelEdit = useCallback(() => {
    editor.chain().focus().run();
    setMode('preview');
  }, [editor]);

  if (mode === 'edit') {
    return (
      <div className="bg-background w-80 rounded-lg border p-3 shadow-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <Label htmlFor="bubble-url" className="text-xs">
              URL
            </Label>
            <Input
              id="bubble-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="bubble-newtab"
              checked={openInNewTab}
              onCheckedChange={(v) => setOpenInNewTab(v === true)}
            />
            <Label htmlFor="bubble-newtab" variant="inline" className="cursor-pointer text-xs">
              Open in new tab
            </Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </div>
    );
  }

  const currentLinkText = getCurrentLinkInfo();

  return (
    <div className="bg-background flex items-center gap-1 rounded-lg border px-2 py-1 shadow-md">
      <Globe className="text-muted-foreground h-4 w-4 shrink-0" />
      <div className="flex min-w-0 flex-col px-1.5">
        <span className="max-w-[200px] truncate text-sm font-medium">{currentLinkText}</span>
        <span className="text-muted-foreground max-w-[200px] truncate text-xs">{displayUrl}</span>
      </div>
      <div className="ml-1 flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={startEditing}
          title="Edit link"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={unlink}
          title="Remove link"
        >
          <Link2Off className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyUrl} title="Copy URL">
          {copied ? (
            <Check className="text-success h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
