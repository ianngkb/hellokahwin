'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEditor } from 'novel';
import { getMarkRange } from '@tiptap/core';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Quote,
  List,
  ListOrdered,
  Link,
  Images,
  ImageUp,
  Minus,
  Undo,
  Redo,
  ChevronDown,
  Plus,
  Table2,
  MousePointerClick,
  FileText,
  Pilcrow,
  LayoutGrid,
  FolderPlus,
  Video,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { MediaPickerDialog } from '@/components/media/media-picker-dialog';
import type { PickedMedia } from '@/lib/media/picked-media';
import type { DynamicBlockOption } from '@/components/inspire/dynamic-blocks-panel';

interface EditorToolbarProps {
  articleId?: string;
  articleSlug?: string;
  /**
   * Mirrors the editor's own `editable={false}`, which the editor lock sets
   * when another admin holds the article or this session's lock expired.
   *
   * The toolbar sits INSIDE the editor container rather than inside the
   * `<fieldset disabled>` wrappers the rest of the form uses, so without this
   * it rendered fully enabled while a non-editable ProseMirror silently
   * swallowed every command — the exact shape of "the formatting buttons do
   * nothing". Disabling the controls is what makes the dead state legible.
   */
  disabled?: boolean;
  /**
   * Published + active dynamic blocks, for the Embed submenu. The node this
   * inserts (`dynamicBlockEmbed`) is a reference and is useless without a real
   * `blockId`, so with an empty list the Embed item is not offered at all.
   */
  dynamicBlocks?: DynamicBlockOption[];
}

export function EditorToolbar({
  articleId,
  articleSlug,
  disabled = false,
  dynamicBlocks = [],
}: EditorToolbarProps) {
  const { editor } = useEditor();
  const [pickerOpen, setPickerOpen] = useState(false);
  const handleMediaSelect = useCallback(
    (items: PickedMedia[]) => {
      if (!editor || items.length === 0) return;

      if (items.length === 1) {
        // Single image -> insert as CustomImage node, attributes and all, in
        // ONE insertContent.
        //
        // Two earlier attempts were both wrong. `.setImage(...)` followed by
        // `.updateAttributes('image', ...)` was a no-op: `updateAttributes`
        // walks `nodesBetween(from, to)` and the selection after inserting an
        // atom sits AFTER the node, so nothing matched and variants, quality
        // and caption were all dropped. Searching the document afterwards for
        // a node whose `src` matches then updated the FIRST image with that
        // URL — insert an image already used earlier in the article and the
        // metadata landed on the wrong copy, leaving the new one bare.
        //
        // Building the node with its attributes avoids both: there is no
        // second step to aim, and nothing to find. `custom-image.ts` declares
        // every one of these attributes, so they survive into the document.
        const item = items[0];
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'image',
            attrs: {
              src: item.url,
              alt: item.alt ?? null,
              'data-original-src': item.originalUrl,
              'data-quality': item.defaultQuality ?? 'high',
              'data-variants': JSON.stringify(item.variants),
              'data-caption': item.caption || null,
              'data-caption-url': item.captionUrl || null,
            },
          })
          .run();
      } else {
        // Multiple images → insert as gallery block
        const galleryImages = items.map((item) => ({
          mediaId: item.id,
          src: item.url,
          alt: item.alt ?? '',
          caption: item.caption ?? '',
          captionUrl: item.captionUrl ?? '',
          variants: item.variants,
          quality: item.defaultQuality ?? 'high',
        }));

        editor
          .chain()
          .focus()
          .insertContent({
            type: 'galleryBlock',
            attrs: {
              'data-images': JSON.stringify(galleryImages),
              'data-layout': 'grid-2',
              'data-gap': 8,
              'data-show-captions': true,
            },
          })
          .run();
      }
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <>
      {/* A `fieldset` rather than a `disabled` prop on each of ~30 controls:
          it disables the ones added after this too, and it is the same
          mechanism the surrounding form already uses. */}
      <fieldset
        disabled={disabled}
        className="bg-background/95 sticky bottom-0 z-10 flex flex-wrap items-center gap-0.5 border-t p-1 backdrop-blur-sm disabled:opacity-50"
      >
        {/* Text formatting */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          <Underline className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Block formatting */}
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 4 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          aria-label="Heading 4"
        >
          <Heading4 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 5 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
          aria-label="Heading 5"
        >
          <Heading5 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 6 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
          aria-label="Heading 6"
        >
          <Heading6 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Lists */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <div className="flex items-center">
          <Toggle
            size="sm"
            pressed={editor.isActive('orderedList')}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Ordered List"
            className="rounded-r-none"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="border-border/40 h-8 w-5 rounded-l-none border-l px-0"
                aria-label="Ordered list style"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {(
                [
                  { type: '1', label: '1, 2, 3', desc: 'Decimal' },
                  { type: 'a', label: 'a, b, c', desc: 'Lower Alpha' },
                  { type: 'A', label: 'A, B, C', desc: 'Upper Alpha' },
                  { type: 'i', label: 'i, ii, iii', desc: 'Lower Roman' },
                  { type: 'I', label: 'I, II, III', desc: 'Upper Roman' },
                ] as const
              ).map((opt) => (
                <DropdownMenuItem
                  key={opt.type}
                  onSelect={() => {
                    if (!editor.isActive('orderedList')) {
                      editor.chain().focus().toggleOrderedList().run();
                    }
                    editor
                      .chain()
                      .focus()
                      .updateAttributes('orderedList', { type: opt.type })
                      .run();
                  }}
                >
                  <span className="text-muted-foreground w-16 font-mono">{opt.label}</span>
                  <span>{opt.desc}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Insert */}
        <LinkPopover editor={editor} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-1.5"
              aria-label="Insert block"
              title="Insert block"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onSelect={() => editor.chain().focus().setNode('paragraph').run()}>
              <Pilcrow className="mr-2 h-4 w-4" /> Text
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="mr-2 h-4 w-4" /> Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="mr-2 h-4 w-4" /> Heading 3
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            >
              <Heading4 className="mr-2 h-4 w-4" /> Heading 4
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
            >
              <Heading5 className="mr-2 h-4 w-4" /> Heading 5
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
            >
              <Heading6 className="mr-2 h-4 w-4" /> Heading 6
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="mr-2 h-4 w-4" /> Bullet List
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="mr-2 h-4 w-4" /> Numbered List
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.chain().focus().setBlockquote().run()}>
              <Quote className="mr-2 h-4 w-4" /> Quote
            </DropdownMenuItem>

            <div className="bg-border my-1 h-px" />

            {articleId && (
              <DropdownMenuItem
                onSelect={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/jpeg,image/png,image/webp,image/avif';
                  input.multiple = true;
                  input.onchange = () => {
                    if (input.files) {
                      window.dispatchEvent(
                        new CustomEvent('editor-upload-files', {
                          detail: { files: Array.from(input.files) },
                        }),
                      );
                    }
                  };
                  input.click();
                }}
              >
                <ImageUp className="mr-2 h-4 w-4" /> Image Upload
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setPickerOpen(true)}>
              <Images className="mr-2 h-4 w-4" /> Media Library
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: 'galleryBlock',
                    attrs: {
                      'data-images': '[]',
                      'data-layout': 'grid-3',
                      'data-gap': '4',
                      'data-show-captions': 'false',
                    },
                  })
                  .run()
              }
            >
              <LayoutGrid className="mr-2 h-4 w-4" /> Gallery
            </DropdownMenuItem>

            <div className="bg-border my-1 h-px" />

            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            >
              <Table2 className="mr-2 h-4 w-4" /> Table
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: 'ctaButtonBlock',
                    attrs: { 'data-text': 'Learn More', 'data-url': '', 'data-new-tab': 'false' },
                  })
                  .run()
              }
            >
              <MousePointerClick className="mr-2 h-4 w-4" /> Button
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: 'pdfLinkBlock',
                    attrs: { 'data-url': '', 'data-text': 'Download PDF', 'data-style': 'button' },
                  })
                  .run()
              }
            >
              <FileText className="mr-2 h-4 w-4" /> PDF
            </DropdownMenuItem>
            {/* Was inserting `embedBlock`, a node type that does not exist —
                Tiptap rejected the content as invalid and the item silently
                did nothing. The registered node is `dynamicBlockEmbed`, and it
                is a REFERENCE: it carries a block id and renders that block's
                content at publish time, so it cannot be inserted blank. The
                submenu is the block list; no blocks, no item. */}
            {dynamicBlocks.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Video className="mr-2 h-4 w-4" /> Embed block
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                  {dynamicBlocks.map((block) => (
                    <DropdownMenuItem
                      key={block.id}
                      onSelect={() =>
                        editor
                          .chain()
                          .focus()
                          .insertContent({
                            type: 'dynamicBlockEmbed',
                            attrs: { blockId: block.id, blockName: block.name },
                          })
                          .run()
                      }
                    >
                      {block.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            <div className="bg-border my-1 h-px" />

            <DropdownMenuItem
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: 'sectionBlock',
                    attrs: { 'data-title': '' },
                    content: [{ type: 'paragraph' }],
                  })
                  .run()
              }
            >
              <FolderPlus className="mr-2 h-4 w-4" /> Section
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.chain().focus().setHorizontalRule().run()}>
              <Minus className="mr-2 h-4 w-4" /> Divider
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* History */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-1.5"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-1.5"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </fieldset>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleMediaSelect}
        multiple
        articleId={articleId}
        articleSlug={articleSlug}
      />
    </>
  );
}

function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function LinkPopover({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>['editor']> }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(false);

  const isEditing = editor.isActive('link');

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        const attrs = editor.getAttributes('link');
        setUrl((attrs.href as string) ?? '');
        setOpenInNewTab(attrs.target === '_blank');
      }
      setOpen(isOpen);
    },
    [editor],
  );

  const saveLink = useCallback(() => {
    const normalised = normaliseUrl(url);
    if (!normalised) {
      editor.chain().focus().unsetLink().run();
      setOpen(false);
      return;
    }

    const linkAttrs = {
      href: normalised,
      target: openInNewTab ? '_blank' : null,
      rel: openInNewTab ? 'noopener noreferrer nofollow' : null,
    };

    if (isEditing && editor.state.selection.empty) {
      // Editing an existing link — find mark range and update attrs
      const { $from } = editor.state.selection;
      const range = getMarkRange($from, editor.schema.marks.link);
      if (range) {
        editor
          .chain()
          .focus()
          .setTextSelection(range)
          .setLink(linkAttrs)
          .setTextSelection(range.from)
          .run();
      }
    } else if (!editor.state.selection.empty) {
      // Text is selected — apply link to selection
      editor.chain().focus().setLink(linkAttrs).run();
    } else {
      // No selection — insert URL as link text at cursor
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: normalised,
          marks: [{ type: 'link', attrs: linkAttrs }],
        })
        .run();
    }

    setOpen(false);
  }, [editor, url, openInNewTab, isEditing]);

  const removeLink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    setOpen(false);
  }, [editor]);

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      {/* No `onPressedChange` here on purpose. `PopoverTrigger asChild`
          composes its own click-to-toggle onto this Toggle, so a handler that
          also forced `handleOpen(true)` fought it: the click that should have
          closed the popover immediately reopened it. The Popover owns `open`;
          `handleOpen` (wired to onOpenChange above) seeds the form from the
          current link when it opens. */}
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={editor.isActive('link')} aria-label="Link">
          <Link className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveLink();
          }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <Label htmlFor="toolbar-url" className="text-xs">
              URL
            </Label>
            <Input
              id="toolbar-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="toolbar-newtab"
              checked={openInNewTab}
              onCheckedChange={(v) => setOpenInNewTab(v === true)}
            />
            <Label htmlFor="toolbar-newtab" variant="inline" className="cursor-pointer text-xs">
              Open in new tab
            </Label>
          </div>
          <div className="flex items-center justify-between">
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={removeLink}
              >
                Remove link
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
