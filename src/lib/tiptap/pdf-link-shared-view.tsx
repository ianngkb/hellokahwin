'use client';

import { useState, useCallback, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Pencil,
  Upload,
  Library,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MediaPickerDialog } from '@/components/media/media-picker-dialog';
import type { PickedMedia } from '@/lib/media/picked-media';
import { uploadInspirePdf } from '@/lib/storage/inspire-pdf-upload';
import { convertPdfPlacement } from './pdf-link-convert';

const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25MB

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type PdfStorage = { articleId?: string | null; articleSlug?: string | null } | undefined;

/**
 * Shared node view for both PDF placements. `inline` switches the wrapper
 * (span vs div) and the preview layout (flows in text vs its own line).
 */
export function PdfLinkView({
  inline,
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps & { inline: boolean }) {
  const [editing, setEditing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const url = (node.attrs['data-url'] as string) || '';
  const label = (node.attrs['data-text'] as string) || 'Download PDF';
  const fileSize = Number(node.attrs['data-file-size'] as string) || 0;
  const style = (node.attrs['data-style'] as string) || 'button';
  const align = (node.attrs['data-align'] as string) || 'center';
  const sizeText = formatFileSize(fileSize);

  const setStyle = useCallback(
    (value: string) => updateAttributes({ 'data-style': value }),
    [updateAttributes],
  );

  const setAlignment = useCallback(
    (value: 'left' | 'center' | 'right') => updateAttributes({ 'data-align': value }),
    [updateAttributes],
  );

  const setPlacement = useCallback(
    (toInline: boolean) => {
      if (toInline === inline) return;
      convertPdfPlacement(editor, getPos, node, toInline);
    },
    [editor, getPos, node, inline],
  );

  const applyUploadedPdf = useCallback(
    (opts: { url: string; fileName: string; fileSize: number }) => {
      const nextLabel =
        !label || label === 'Download PDF' ? opts.fileName.replace(/\.pdf$/i, '') : label;
      updateAttributes({
        'data-url': opts.url,
        'data-file-size': String(opts.fileSize),
        'data-text': nextLabel,
      });
    },
    [label, updateAttributes],
  );

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      if (file.size > MAX_PDF_SIZE) {
        toast.error('PDF too large (max 25MB)');
        return;
      }
      const storage = (editor.storage.pdfLinkBlock ?? editor.storage.pdfLinkInline) as PdfStorage;
      setUploading(true);
      try {
        const result = await uploadInspirePdf(
          { slug: storage?.articleSlug ?? undefined, articleId: storage?.articleId ?? undefined },
          file,
        );
        applyUploadedPdf({ url: result.url, fileName: file.name, fileSize: result.fileSize });
        toast.success('PDF uploaded');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'PDF upload failed');
      } finally {
        setUploading(false);
      }
    },
    [editor, applyUploadedPdf],
  );

  const handleLibrarySelect = useCallback(
    (items: PickedMedia[]) => {
      const item = items[0];
      if (!item) return;
      applyUploadedPdf({ url: item.url, fileName: item.filename, fileSize: item.fileSize ?? 0 });
    },
    [applyUploadedPdf],
  );

  const startEditing = useCallback(() => {
    setLabelDraft(label);
    setEditing(true);
  }, [label]);

  const saveLabel = useCallback(() => {
    updateAttributes({ 'data-text': labelDraft.trim() || 'Download PDF' });
    setEditing(false);
  }, [labelDraft, updateAttributes]);

  // Compact link / button chip shared by both placements.
  const chip =
    style === 'link' ? (
      <span className="text-primary inline-flex items-center gap-1 align-middle text-sm font-medium underline underline-offset-2">
        <FileText className="size-3.5" />
        {label}
        {sizeText && <span className="text-muted-foreground">({sizeText})</span>}
      </span>
    ) : (
      <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 align-middle text-sm font-semibold shadow-sm">
        <FileText className="size-3.5" />
        {label}
        {sizeText && <span className="opacity-80">({sizeText})</span>}
      </span>
    );

  const emptyChip = (
    <span className="text-muted-foreground border-muted-foreground/40 inline-flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1 align-middle text-sm">
      <FileText className="size-3.5" /> Attach PDF
    </span>
  );

  const uploadActions = (
    <>
      <Button
        type="button"
        variant="quiet"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="mr-1.5 size-4 animate-spin" />
        ) : (
          <Upload className="mr-1.5 size-4" />
        )}
        {url ? 'Replace file' : 'Upload PDF'}
      </Button>
      <Button
        type="button"
        variant="quiet"
        size="sm"
        onClick={() => setPickerOpen(true)}
        disabled={uploading}
      >
        <Library className="mr-1.5 size-4" /> {url ? 'Library' : 'From library'}
      </Button>
    </>
  );

  const formFields = (
    <>
      <div className="space-y-1">
        <Label htmlFor="pdf-label" className="text-xs">
          Link text
        </Label>
        <Input
          id="pdf-label"
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          placeholder="Download PDF"
          className="h-8 text-sm"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="pdf-style" className="text-xs">
            Display as
          </Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger id="pdf-style" className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="button">Button</SelectItem>
              <SelectItem value="link">Text link</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pdf-placement" className="text-xs">
            Placement
          </Label>
          <Select
            value={inline ? 'inline' : 'block'}
            onValueChange={(v) => setPlacement(v === 'inline')}
          >
            <SelectTrigger id="pdf-placement" className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="block">Standalone</SelectItem>
              <SelectItem value="inline">Inline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{uploadActions}</div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </>
  );

  const formShell = (className: string) => (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        saveLabel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setEditing(false);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {formFields}
    </form>
  );

  const hiddenInputAndPicker = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleLibrarySelect}
        multiple={false}
        kind="pdf"
      />
    </>
  );

  // ── Inline placement ──────────────────────────────────────────────
  // The edit form is portalled via Popover so no block-level DOM is nested
  // inside the inline <span> wrapper (which would break the atom's DOM mapping).
  if (inline) {
    return (
      <NodeViewWrapper as="span" className="inline align-middle">
        {url ? (
          <Popover
            open={editing}
            onOpenChange={(o) => {
              if (o) setLabelDraft(label);
              setEditing(o);
            }}
          >
            <PopoverTrigger asChild>
              <span
                contentEditable={false}
                className={cn('cursor-pointer', selected && 'ring-primary rounded ring-2')}
                title="Edit PDF link"
              >
                {chip}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              {formShell('space-y-3')}
            </PopoverContent>
          </Popover>
        ) : (
          <span
            contentEditable={false}
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            title="Attach a PDF"
          >
            {emptyChip}
          </span>
        )}
        {hiddenInputAndPicker}
      </NodeViewWrapper>
    );
  }

  // ── Standalone block placement ────────────────────────────────────
  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        className={cn('relative my-3', selected && 'ring-primary rounded-md ring-2 ring-offset-2')}
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
        {url && (showToolbar || selected) && !editing && (
          <div
            className="bg-background absolute -top-9 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-md border p-1 shadow-sm"
            contentEditable={false}
          >
            {[
              { value: 'left' as const, icon: AlignLeft, label: 'Align left' },
              { value: 'center' as const, icon: AlignCenter, label: 'Align center' },
              { value: 'right' as const, icon: AlignRight, label: 'Align right' },
            ].map(({ value, icon: Icon, label: title }) => (
              <button
                key={value}
                type="button"
                className={cn(
                  'flex size-7 items-center justify-center rounded transition-colors',
                  align === value ? 'bg-muted' : 'hover:bg-muted',
                )}
                onClick={() => setAlignment(value)}
                title={title}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
            <div className="bg-border mx-0.5 h-4 w-px" />
            <button
              type="button"
              className="hover:bg-muted flex size-7 items-center justify-center rounded transition-colors"
              onClick={startEditing}
              title="Edit PDF link"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}

        {!url ? (
          <div className="border-muted-foreground/30 mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center">
            <FileText className="text-muted-foreground size-5" />
            <p className="text-muted-foreground text-sm">Attach a PDF to link or button</p>
            <div className="flex flex-wrap items-center justify-center gap-2">{uploadActions}</div>
          </div>
        ) : (
          <div
            className={cn(
              'flex',
              align === 'left' && 'justify-start',
              align === 'right' && 'justify-end',
              align !== 'left' && align !== 'right' && 'justify-center',
            )}
          >
            {chip}
          </div>
        )}

        {editing &&
          formShell(
            'bg-background mx-auto mt-3 max-w-sm space-y-3 rounded-lg border p-4 shadow-md',
          )}
        {hiddenInputAndPicker}
      </div>
    </NodeViewWrapper>
  );
}
