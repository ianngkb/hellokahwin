'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Check, Upload, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { getMediaListAction } from '@/app/(admin)/admin/inspire/media/actions';
import { BulkUploadDialog } from './bulk-upload-dialog';
import { ArticleCombobox } from './article-combobox';
import type { Media } from '@/lib/db/schema/media';
import type { PickedMedia } from '@/lib/media/picked-media';
import { cn } from '@/lib/utils';

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: PickedMedia[]) => void;
  multiple?: boolean;
  articleSlug?: string;
  articleId?: string;
  /** Restrict the library to a media kind. Omit to show everything (default). */
  kind?: 'image' | 'pdf';
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  multiple = true,
  articleSlug,
  articleId,
  kind,
}: MediaPickerDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<Media[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, PickedMedia>>(new Map());
  const [selectedArticle, setSelectedArticle] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [uploadOpen, setUploadOpen] = useState(false);

  const pageSize = 36;
  const totalPages = Math.ceil(total / pageSize);

  // Load media when dialog opens or filters change
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(
      () => {
        startTransition(async () => {
          const result = await getMediaListAction({
            search: search || undefined,
            source:
              sourceFilter !== 'all'
                ? (sourceFilter as 'article_upload' | 'library_upload')
                : undefined,
            kind,
            articleId: selectedArticle?.id,
            page,
            pageSize,
          });

          if (result.data) {
            setItems(result.data.items as Media[]);
            setTotal(result.data.total);
          }
        });
      },
      search ? 300 : 0,
    );

    return () => clearTimeout(timer);
  }, [open, search, sourceFilter, kind, selectedArticle?.id, page]);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setSelectedItemsMap(new Map());
      setSearch('');
      setSourceFilter('all');
      setSelectedArticle(null);
      setPage(1);
    }
  }, [open]);

  const toggleSelect = useCallback(
    (item: PickedMedia) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          if (!multiple) next.clear();
          next.add(item.id);
        }
        return next;
      });
      setSelectedItemsMap((prev) => {
        const next = new Map(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          if (!multiple) next.clear();
          next.set(item.id, item);
        }
        return next;
      });
    },
    [multiple],
  );

  const handleInsert = useCallback(() => {
    // Use the accumulated map to resolve items across all pages
    const selected = Array.from(selectedItemsMap.values());
    onSelect(selected);
    onOpenChange(false);
  }, [selectedItemsMap, onSelect, onOpenChange]);

  const handleUploadComplete = useCallback(() => {
    setUploadOpen(false);
    // Refresh the list
    startTransition(async () => {
      const result = await getMediaListAction({
        search: search || undefined,
        source:
          sourceFilter !== 'all'
            ? (sourceFilter as 'article_upload' | 'library_upload')
            : undefined,
        kind,
        page: 1,
        pageSize,
      });
      if (result.data) {
        setItems(result.data.items as Media[]);
        setTotal(result.data.total);
        setPage(1);
      }
    });
  }, [search, sourceFilter, kind]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Media Library</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="library" className="flex min-h-0 flex-1 flex-col gap-3">
            <TabsList>
              <TabsTrigger value="library">Library</TabsTrigger>
              {/* Venue photos are always images, so this tab would let a PDF
                  attachment pick a JPEG. Hide it when picking a PDF. */}
            </TabsList>

            <TabsContent value="library" className="flex min-h-0 flex-1 flex-col gap-3">
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search..."
                    className="pl-9 text-sm"
                  />
                </div>
                <ArticleCombobox
                  value={selectedArticle}
                  onChange={(article) => {
                    setSelectedArticle(article);
                    if (article) setSearch('');
                    setPage(1);
                  }}
                />
                <Select
                  value={sourceFilter}
                  onValueChange={(v) => {
                    setSourceFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="article_upload">Article</SelectItem>
                    <SelectItem value="library_upload">Library</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="quiet"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="size-4" />
                  Upload new
                </Button>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-muted-foreground flex items-center justify-center py-16">
                    {isPending ? 'Loading...' : 'No media found.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 p-1 sm:grid-cols-4 md:grid-cols-6">
                    {items.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            'relative aspect-square cursor-pointer overflow-hidden rounded-md border-2 transition-all',
                            isSelected
                              ? 'border-primary ring-primary/30 ring-2'
                              : 'hover:border-muted-foreground/30 border-transparent',
                          )}
                          onClick={() => toggleSelect(item)}
                        >
                          {item.mimeType === 'application/pdf' ? (
                            <div className="bg-muted flex size-full flex-col items-center justify-center gap-1.5 p-2">
                              <FileText className="text-muted-foreground size-7" />
                              <span className="text-muted-foreground line-clamp-2 text-center text-[10px] break-all">
                                {item.filename}
                              </span>
                            </div>
                          ) : (
                            <Image
                              src={item.url}
                              alt={item.alt ?? item.filename}
                              fill
                              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                              className="object-cover"
                            />
                          )}
                          {isSelected && (
                            <div className="bg-primary absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full">
                              <Check className="text-primary-foreground size-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex items-center justify-between border-t pt-2">
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <>
                  <Button
                    variant="quiet"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    {page}/{totalPages}
                  </span>
                  <Button
                    variant="quiet"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="text-muted-foreground text-sm">{selectedIds.size} selected</span>
              )}
              <Button variant="quiet" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleInsert} disabled={selectedIds.size === 0}>
                Insert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BulkUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onComplete={handleUploadComplete}
        articleSlug={articleSlug}
        articleId={articleId}
      />
    </>
  );
}
