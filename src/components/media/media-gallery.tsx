'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Grid3X3,
  List,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  X,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getMediaListAction } from '@/app/(admin)/admin/inspire/media/actions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MediaDetailPanel } from './media-detail-panel';
import { BulkUploadDialog } from './bulk-upload-dialog';
import { ArticleCombobox } from './article-combobox';
import type { Media } from '@/lib/db/schema/media';
import { cn, formatFileSize } from '@/lib/utils';
import { bulkDeleteMediaAction } from '@/app/(admin)/admin/inspire/media/actions';
import { toast } from 'sonner';

// ── Bulk action progress toast ─────────────────────────────────────────

const BULK_ACTION_TOAST_ID = 'bulk-action';

function BulkActionToast({ message }: { message: string }) {
  return (
    <div className="border-border/30 bg-popover rounded-card flex w-[320px] items-start gap-3 border p-4 shadow-md">
      <div className="mt-0.5 shrink-0">
        <Loader2 className="text-primary size-4 animate-spin" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-popover-foreground text-sm font-medium">{message}</p>
        <Progress indeterminate className="h-1.5" />
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => toast.dismiss(BULK_ACTION_TOAST_ID)}
        className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function showBulkActionToast(message: string): string {
  toast.custom(() => <BulkActionToast message={message} />, {
    id: BULK_ACTION_TOAST_ID,
    duration: Infinity,
  });
  return BULK_ACTION_TOAST_ID;
}

interface MediaGalleryProps {
  initialItems: Media[];
  initialTotal: number;
  currentPage: number;
  totalPages: number;
  searchParams: { search?: string; source?: string; page?: string; articleId?: string };
  articleId?: string;
  articleName?: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type ViewMode = 'grid' | 'list';

export function MediaGallery({
  initialItems,
  initialTotal,
  currentPage,
  totalPages,
  searchParams,
  articleId,
  articleName,
}: MediaGalleryProps) {
  const router = useRouter();
  const urlParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState<Media[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('media-view-mode') as ViewMode) || 'grid';
    }
    return 'grid';
  });
  const [search, setSearch] = useState(searchParams.search ?? '');
  const [sourceFilter, setSourceFilter] = useState(searchParams.source ?? 'all');
  const [selectedArticle, setSelectedArticle] = useState<{ id: string; title: string } | null>(
    () => (articleId && articleName ? { id: articleId, title: articleName } : null),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailMediaId, setDetailMediaId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Sync selectedArticle when props change (browser back/forward)
  useEffect(() => {
    const fromProps = articleId && articleName ? { id: articleId, title: articleName } : null;
    setSelectedArticle((prev) => {
      if (fromProps?.id === prev?.id) return prev;
      return fromProps;
    });
  }, [articleId, articleName]);

  // Persist view preference
  useEffect(() => {
    localStorage.setItem('media-view-mode', viewMode);
  }, [viewMode]);

  // Track whether this is the initial render to avoid unnecessary navigation
  const [isInitialRender, setIsInitialRender] = useState(true);

  // Debounced search
  useEffect(() => {
    if (isInitialRender) {
      setIsInitialRender(false);
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (selectedArticle) {
        params.set('articleId', selectedArticle.id);
      } else if (search) {
        params.set('search', search);
      }
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      params.set('page', '1');
      router.push(`/admin/inspire/media?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sourceFilter, selectedArticle, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync items when props change (server-side re-render)
  useEffect(() => {
    setItems(initialItems);
    setTotal(initialTotal);
  }, [initialItems, initialTotal]);

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      if (selectedArticle) params.set('articleId', selectedArticle.id);
      else if (search) params.set('search', search);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      params.set('page', String(page));
      router.push(`/admin/inspire/media?${params.toString()}`);
    },
    [search, sourceFilter, selectedArticle, router],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((i) => i.id));
    });
  }, [items]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0 || isPending) return;
    if (!confirm(`Delete ${selectedIds.size} selected media items? This cannot be undone.`)) return;

    startTransition(async () => {
      showBulkActionToast(`Deleting ${selectedIds.size} items...`);
      try {
        const result = await bulkDeleteMediaAction(Array.from(selectedIds));
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(`Deleted ${result.deleted} items`);
          setSelectedIds(new Set());
          router.refresh();
        }
      } catch {
        toast.error('Failed to delete items');
      } finally {
        toast.dismiss(BULK_ACTION_TOAST_ID);
      }
    });
  }, [selectedIds, isPending, router]);

  const handleUploadComplete = useCallback(() => {
    setUploadOpen(false);
    router.refresh();
  }, [router]);

  const handleDetailClose = useCallback(() => {
    setDetailMediaId(null);
  }, []);

  const handleMediaUpdated = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleMediaDeleted = useCallback(() => {
    setDetailMediaId(null);
    router.refresh();
  }, [router]);

  const isBulkMode = selectedIds.size > 0;

  return (
    <>
      <Tabs defaultValue="library">
        <TabsList className="mb-4">
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          {/* Controls bar */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm min-w-[200px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by filename or caption..."
                className="pl-9 text-sm"
              />
            </div>

            <ArticleCombobox
              value={selectedArticle}
              onChange={(article) => {
                setSelectedArticle(article);
                if (article) setSearch('');
              }}
            />

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="article_upload">Article uploads</SelectItem>
                <SelectItem value="library_upload">Library uploads</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center rounded-md border">
              <Button
                variant={viewMode === 'grid' ? 'quiet' : 'ghost'}
                size="sm"
                className="h-8 rounded-r-none px-2"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="size-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'quiet' : 'ghost'}
                size="sm"
                className="h-8 rounded-l-none px-2"
                onClick={() => setViewMode('list')}
              >
                <List className="size-4" />
              </Button>
            </div>

            <Button onClick={() => setUploadOpen(true)} className="ml-auto gap-1.5">
              <Upload className="size-4" />
              Upload
            </Button>
          </div>

          {/* Bulk action bar */}
          {isBulkMode && (
            <div className="bg-muted mb-4 flex items-center gap-3 rounded-md p-3">
              <Checkbox
                checked={selectedIds.size === items.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isPending}
                className="gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Delete selected
              </Button>
            </div>
          )}

          {/* Media items */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground mb-4">No media found.</p>
              <Button onClick={() => setUploadOpen(true)} variant="quiet" className="gap-1.5">
                <Upload className="size-4" />
                Upload your first images
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'group relative cursor-pointer overflow-hidden rounded-md border transition-shadow hover:shadow-md',
                    selectedIds.has(item.id) && 'ring-primary ring-2',
                  )}
                >
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className={cn(
                        'bg-background/80 backdrop-blur-sm',
                        !isBulkMode && 'opacity-0 transition-opacity group-hover:opacity-100',
                      )}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <button
                    type="button"
                    className="bg-muted relative aspect-square w-full"
                    onClick={() => setDetailMediaId(item.id)}
                  >
                    <Image
                      src={item.url}
                      alt={item.alt ?? item.filename}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-cover"
                    />
                  </button>
                  <div className="p-1.5">
                    <p className="truncate text-xs" title={item.filename}>
                      {item.filename}
                    </p>
                    {item.width && item.height && (
                      <p className="text-muted-foreground text-[10px]">
                        {item.width}&times;{item.height}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="w-8 p-2">
                      <Checkbox
                        checked={selectedIds.size === items.length && items.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="w-12 p-2" />
                    <th className="p-2 text-left font-medium">Filename</th>
                    <th className="hidden p-2 text-left font-medium md:table-cell">Dimensions</th>
                    <th className="hidden p-2 text-left font-medium md:table-cell">Size</th>
                    <th className="hidden p-2 text-left font-medium lg:table-cell">Source</th>
                    <th className="hidden p-2 text-left font-medium lg:table-cell">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'hover:bg-muted/30 cursor-pointer border-b transition-colors',
                        selectedIds.has(item.id) && 'bg-primary/5',
                      )}
                      onClick={() => setDetailMediaId(item.id)}
                    >
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td className="p-2">
                        <div className="bg-muted relative size-10 overflow-hidden rounded">
                          <Image
                            src={item.url}
                            alt={item.alt ?? ''}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                      </td>
                      <td className="max-w-[200px] truncate p-2" title={item.filename}>
                        {item.filename}
                      </td>
                      <td className="text-muted-foreground hidden p-2 md:table-cell">
                        {item.width && item.height ? `${item.width}\u00D7${item.height}` : '—'}
                      </td>
                      <td className="text-muted-foreground hidden p-2 md:table-cell">
                        {formatFileSize(item.fileSize)}
                      </td>
                      <td className="text-muted-foreground hidden p-2 lg:table-cell">
                        {item.source === 'article_upload' ? 'Article' : 'Library'}
                      </td>
                      <td className="text-muted-foreground hidden p-2 lg:table-cell">
                        {formatDate(item.createdAt as unknown as string)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-muted-foreground text-sm">{total} items total</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="quiet"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="quiet"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail panel */}
      <MediaDetailPanel
        mediaId={detailMediaId}
        open={!!detailMediaId}
        onClose={handleDetailClose}
        onUpdated={handleMediaUpdated}
        onDeleted={handleMediaDeleted}
        onNavigate={(id) => setDetailMediaId(id)}
      />

      {/* Upload dialog */}
      <BulkUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onComplete={handleUploadComplete}
      />
    </>
  );
}
