'use client';

import { useState, useEffect, useMemo, useRef, useTransition, useCallback } from 'react';
import { getSchema } from '@tiptap/core';
import type { JSONContent } from 'novel';
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandList,
  EditorCommandItem,
  EditorCommandEmpty,
  Command,
  createSuggestionItems,
  renderItems,
  handleCommandNavigation,
  StarterKit,
} from 'novel';
import {
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  LayoutGrid,
  Minus,
  Pilcrow,
  FolderPlus,
  Frame,
  Table2,
  MousePointerClick,
  FileText,
  MessageCircle,
} from 'lucide-react';
import { createArticleBaseExtensions } from '@/lib/tiptap/article-extensions';
import { DynamicBlockEmbed } from '@/lib/tiptap/dynamic-block-embed';
import {
  BlockDragHandle,
  BLOCK_DRAG_TYPE,
  getTopLevelBlockInfo,
} from '@/lib/tiptap/block-drag-handle';
import { BlockDragHandleView } from '@/lib/tiptap/block-drag-handle-view';
import { BlockOutlinePanel } from '@/components/inspire/block-outline-panel';
import {
  DynamicBlocksPanel,
  type DynamicBlockOption,
} from '@/components/inspire/dynamic-blocks-panel';
import { EditorToolbar } from '@/components/inspire/editor-toolbar';
import { LinkBubbleMenu } from '@/components/inspire/link-bubble-menu';
import { TableBubbleMenu } from '@/components/inspire/table-bubble-menu';
import { ImageQualitySidebar, ArticleImagesList } from '@/components/inspire/image-quality-toolbar';
import type { BodyImageInfo } from '@/components/inspire/image-quality-toolbar';
import { CoverImageQuality } from '@/components/inspire/cover-image-quality';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/ui/chip';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import {
  deleteArticleAction,
  masterDeleteArticleAction,
  toggleHumanReviewedAction,
} from '../../actions';
import {
  updateArticleAction,
  updateArticleCategoriesAction,
  updateArticleTagsAction,
  regenerateArticleImagesAction,
  acquireLockAction,
} from './actions';
import { useAutosave } from './use-autosave';
import {
  NO_DEGRADED_CONTROLS,
  buildCategorySyncPayload,
  categorySkipWarning,
  foldSavedValuesIntoBaseline,
  shouldWriteCategories,
  shouldWriteTags,
  type DegradedControls,
} from './degraded-controls';
import {
  saveLocalAutosave,
  loadLocalAutosave,
  clearLocalAutosave,
  hasNewerLocalAutosave,
  type LocalAutosaveData,
} from '@/lib/inspire/local-autosave';
import { AlertTriangleIcon, ShieldAlertIcon } from 'lucide-react';
import { CoverImageUpload } from '@/components/inspire/cover-image-upload';
import {
  CategorySelect,
  CategoryMultiSelect,
  CategoryTertiarySelect,
} from '@/components/inspire/category-select';
import { SmartCropPreviewDialog } from '@/components/inspire/smart-crop-preview-dialog';
import { SmartCropManualOverride } from '@/components/inspire/smart-crop-manual-override';
import { RedirectHistory } from './redirect-history';
import { ShareDraftDialog } from './share-draft-dialog';
import { toast } from 'sonner';
// No Sentry in HelloKahwin — degrade error capture to console.
const Sentry = { captureException: (err: unknown, ctx?: unknown) => console.error('[article-editor]', err, ctx) };
import Link from 'next/link';
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  EyeIcon,
  XIcon,
  CropIcon,
  ImageIcon,
  RefreshCwIcon,
  CalendarClockIcon,
  Trash2Icon,
  BadgeCheckIcon,
  Share2Icon,
  FileDownIcon,
} from 'lucide-react';
import type { ArticleStatus } from '@/lib/constants';
import type { EditorInstance } from 'novel';
import type { ImageVariants } from '@/lib/storage/image-variants';
import type { SmartCrops, FocalPoint } from '@/lib/storage/smart-crop';
import { uploadInspireImage } from '@/lib/storage/inspire-upload';
import { trackFiles, markCompleted, markFailed } from '@/lib/storage/upload-progress';
import { formatDate, formatDateTime } from '@/lib/utils/format-date';
import { useUploadProgressToast } from '@/components/inspire/upload-progress-toast';
/** Convert UTC ISO string to datetime-local value in MYT (Asia/Kuala_Lumpur).
 *  Uses sv-SE locale because it produces ISO-like "YYYY-MM-DD HH:mm:ss" format
 *  reliably across modern browsers, which we then reshape to "YYYY-MM-DDTHH:mm". */
function toMYTDatetimeLocal(isoString: string): string {
  return new Date(isoString)
    .toLocaleString('sv-SE', { timeZone: 'Asia/Kuala_Lumpur' })
    .replace(' ', 'T')
    .slice(0, 16);
}

/** Convert datetime-local value (treated as MYT) to UTC ISO string */
function fromMYTDatetimeLocal(localValue: string): string {
  const [datePart, timePart] = localValue.split('T');
  return new Date(`${datePart}T${timePart}:00+08:00`).toISOString();
}

/** Client-safe: extract R2 key from a full public URL (just strips the origin) */
function extractR2Key(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, '');
  } catch {
    return url;
  }
}

function ScheduleDialog({
  open,
  onOpenChange,
  initialValue,
  isPending,
  onSchedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: string;
  isPending: boolean;
  onSchedule: (isoDate: string) => void;
}) {
  const [scheduleDate, setScheduleDate] = useState(
    initialValue ? toMYTDatetimeLocal(initialValue) : '',
  );

  // Sync when dialog opens with a new initial value
  useEffect(() => {
    if (open) {
      setScheduleDate(initialValue ? toMYTDatetimeLocal(initialValue) : '');
    }
  }, [open, initialValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Publication</DialogTitle>
          <DialogDescription>
            Choose a date and time for this article to be automatically published.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label className="mb-2 block text-sm font-medium">Publish Date & Time (MYT)</Label>
          <Input
            type="datetime-local"
            value={scheduleDate}
            min={toMYTDatetimeLocal(new Date().toISOString())}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (scheduleDate) {
                onSchedule(fromMYTDatetimeLocal(scheduleDate));
              }
            }}
            disabled={!scheduleDate || isPending}
          >
            <CalendarClockIcon className="mr-1.5 size-4" />
            {isPending ? 'Scheduling...' : 'Scheduled Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
}

interface TagOption {
  id: string;
  name: string;
  slug: string;
  /** Admin-only tag — assignable here, but stripped from all public output. */
  isHidden: boolean;
}

interface ArticleEditorProps {
  article: {
    id: string;
    title: string;
    slug: string;
    content: unknown;
    coverImageUrl: string | null;
    coverImageVariants: unknown;
    coverImageQuality: string | null;
    coverImageFocalPoint: unknown;
    coverImageDetectionData: unknown;
    coverImageSmartCrops: unknown;
    coverImageFocalPointOverride: unknown;
    metaTitle: string | null;
    metaDescription: string | null;
    pinterestBoardName: string | null;
    status: ArticleStatus;
    isAiGenerated: boolean;
    humanReviewedAt: string | null;
    primaryCategoryId: string | null;
    authorId: string;
    publishedAt: string | null;
    scheduledPublishAt: string | null;
    updatedAt: string;
  };
  categories: Category[];
  articleCategoryIds: string[];
  allTags: TagOption[];
  articleTagIds: string[];
  /**
   * Who this article may be credited to: every opted-in public author, the
   * house account, and — always — the article's CURRENT author, which the page
   * appends if it is missing (see `page.tsx`). Structurally typed rather than
   * importing `SelectableAuthor`, because that module opens a DB client and
   * this file is `'use client'`.
   */
  selectableAuthors: readonly {
    id: string;
    name: string;
    isPublicAuthor: boolean;
    isHouseAccount: boolean;
  }[];
  /**
   * Which controls' server reads failed this render. A degraded control is
   * shown disabled with a "couldn't load" notice instead of as an empty value,
   * and is excluded from the save payload — see `degraded-controls.ts`.
   */
  degraded?: DegradedControls;
  lockStatus: { locked: boolean; lockedByName?: string; expiresAt?: string };
  userId: string;
  redirectHistory?: {
    id: string;
    fromCategorySlug: string;
    toCategorySlug: string;
    changedByName: string;
    createdAt: string;
  }[];
  publishedDynamicBlocks?: DynamicBlockOption[];
  autoAttachedDynamicBlocks?: DynamicBlockOption[];
}

// Per-instance factory: `publishedBlockIds` is baked into the embed extension
// at editor creation so embed NodeViews can flag missing/unpublished blocks
// from first mount (a post-mount storage write would not re-render them).
const createEditorExtensions = (publishedBlockIds: string[]) => [
  ...createArticleBaseExtensions(),
  DynamicBlockEmbed.configure({ publishedBlockIds }) as unknown as typeof StarterKit,
  BlockDragHandle,
  Command.configure({
    suggestion: {
      items: () => slashCommandItems,
      render: renderItems,
      allow: ({
        state,
        range,
      }: {
        state: { doc: { resolve: (pos: number) => { parent: { isTextblock: boolean } } } };
        range: { from: number };
      }) => {
        // Allow slash commands inside any text block, including nested ones (e.g. inside sections)
        const $from = state.doc.resolve(range.from);
        return $from.parent.isTextblock;
      },
    },
  }),
];

const slashCommandItems = createSuggestionItems([
  {
    title: 'Text',
    description: 'Plain text paragraph',
    icon: <Pilcrow className="size-4" />,
    searchTerms: ['paragraph', 'p', 'text'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('paragraph').run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Large section heading',
    icon: <Heading2 className="size-4" />,
    searchTerms: ['h2', 'heading', 'title'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="size-4" />,
    searchTerms: ['h3', 'subheading', 'subtitle'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: <List className="size-4" />,
    searchTerms: ['ul', 'unordered', 'bullet', 'list'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: <ListOrdered className="size-4" />,
    searchTerms: ['ol', 'ordered', 'numbered', 'list'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Block quote',
    icon: <Quote className="size-4" />,
    searchTerms: ['blockquote', 'quote'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run();
    },
  },
  {
    title: 'Image',
    description: 'Upload or embed an image',
    icon: <ImageIcon className="size-4" />,
    searchTerms: ['image', 'photo', 'picture', 'img'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // Trigger the file input programmatically
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,image/avif';
      input.multiple = true;
      input.onchange = () => {
        const files = input.files;
        if (files) {
          // Dispatch a custom event that the editor component will handle
          window.dispatchEvent(
            new CustomEvent('editor-upload-files', { detail: { files: Array.from(files) } }),
          );
        }
      };
      input.click();
    },
  },
  {
    title: 'Gallery',
    description: 'Insert an image gallery block',
    icon: <LayoutGrid className="size-4" />,
    searchTerms: ['gallery', 'grid', 'images', 'photos'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'galleryBlock',
          attrs: {
            'data-images': '[]',
            'data-layout': 'grid-3',
            'data-gap': '4',
            'data-show-captions': 'false',
          },
        })
        .run();
    },
  },
  {
    title: 'Section',
    description: 'Group blocks into a collapsible section',
    icon: <FolderPlus className="size-4" />,
    searchTerms: ['section', 'group', 'folder', 'collapse'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'sectionBlock',
          attrs: { 'data-title': '' },
          content: [{ type: 'paragraph' }],
        })
        .run();
    },
  },
  {
    title: 'Table',
    description: 'Insert a table',
    icon: <Table2 className="size-4" />,
    searchTerms: ['table', 'grid', 'rows', 'columns'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: 'Button',
    description: 'Call-to-action button',
    icon: <MousePointerClick className="size-4" />,
    searchTerms: ['button', 'cta', 'link', 'action'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'ctaButtonBlock',
          attrs: { 'data-text': 'Learn More', 'data-url': '', 'data-new-tab': 'false' },
        })
        .run();
    },
  },
  {
    title: 'PDF',
    description: 'Attach a downloadable PDF as a link or button',
    icon: <FileText className="size-4" />,
    searchTerms: ['pdf', 'download', 'document', 'attachment', 'file', 'brochure'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'pdfLinkBlock',
          attrs: { 'data-url': '', 'data-text': 'Download PDF', 'data-style': 'button' },
        })
        .run();
    },
  },
  {
    title: 'PDF (inline)',
    description: 'Attach a downloadable PDF inline within a paragraph',
    icon: <FileText className="size-4" />,
    searchTerms: ['pdf', 'inline', 'download', 'document', 'attachment', 'file', 'link'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'pdfLinkInline',
          attrs: { 'data-url': '', 'data-text': 'Download PDF', 'data-style': 'link' },
        })
        .run();
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal rule separator',
    icon: <Minus className="size-4" />,
    searchTerms: ['hr', 'divider', 'separator', 'line'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
]);

function extractFilename(src: string): string {
  return src ? decodeURIComponent(src.split('/').pop() || '').replace(/\?.*$/, '') : 'Image';
}

/**
 * Inline notice for a control whose server read failed this render.
 *
 * Deliberately blunt about the remedy: the control is disabled and only a fresh
 * page load can re-fetch it. The alternative — showing the control empty and
 * enabled — is what would let the next save overwrite the article's real tags
 * or categories with nothing.
 */
function DegradedNotice({ label }: { label: string }) {
  return (
    <p className="text-warning-strong flex items-start gap-1.5 text-xs" role="alert">
      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
      <span>Couldn&apos;t load {label} — reload the page to edit.</span>
    </p>
  );
}

export function ArticleEditorLoader(props: ArticleEditorProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { content } = props.article;
  const publishedDynamicBlocks = props.publishedDynamicBlocks;

  /**
   * Pre-flight the stored document against the editor schema.
   *
   * Tiptap builds its ProseMirror document inside an effect, so a schema
   * mismatch (an unregistered node type, a malformed attr) throws *outside*
   * React's render phase. No error boundary catches that — `(admin)/error.tsx`
   * never fires and the editor simply never appears, leaving a blank page with
   * no clue as to why. Running the same `nodeFromJSON` here first turns that
   * silent failure into a readable message.
   *
   * This deliberately does NOT strip the offending nodes: the editor autosaves,
   * so a "helpful" sanitise would quietly persist the truncated document and
   * destroy the real content.
   */
  const contentError = useMemo(() => {
    try {
      const schema = getSchema(
        createEditorExtensions((publishedDynamicBlocks ?? []).map((b) => b.id)),
      );
      schema.nodeFromJSON(content as JSONContent);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  }, [content, publishedDynamicBlocks]);

  if (!mounted) {
    return <div className="bg-muted/30 min-h-[500px] animate-pulse rounded-md border" />;
  }

  if (contentError) {
    return (
      <div className="border-destructive/40 bg-destructive/5 rounded-card space-y-3 border p-6">
        <h2 className="text-lg font-semibold">This article can&apos;t be opened in the editor</h2>
        <p className="text-muted-foreground text-sm">
          Its saved content doesn&apos;t match the editor&apos;s current block schema, so loading it
          would fail. The article is untouched — nothing has been lost, and it has not been
          autosaved over.
        </p>
        <pre className="bg-muted text-muted-foreground overflow-x-auto rounded p-3 text-xs">
          {contentError}
        </pre>
        <p className="text-muted-foreground text-sm">
          This usually means the document uses a block type this build doesn&apos;t register. Report
          the message above rather than re-saving the article.
        </p>
      </div>
    );
  }

  return <ArticleEditor {...props} />;
}

export function ArticleEditor({
  article,
  categories,
  articleCategoryIds: initialCategoryIds,
  allTags,
  articleTagIds: initialTagIds,
  selectableAuthors,
  degraded = NO_DEGRADED_CONTROLS,
  lockStatus,
  userId,
  redirectHistory,
  publishedDynamicBlocks,
  autoAttachedDynamicBlocks,
}: ArticleEditorProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  // Stable identity for the editor's lifetime (re-creating the array would
  // re-create the Tiptap editor); published block ids are server-fetched once
  // per page load, so first-render values are authoritative.
  const [extensions] = useState(() =>
    createEditorExtensions((publishedDynamicBlocks ?? []).map((b) => b.id)),
  );
  const defaultContent: JSONContent = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  };
  const [editorContent, setEditorContent] = useState<JSONContent>(
    (article.content as JSONContent) ?? defaultContent,
  );
  const [title, setTitle] = useState(article.title);
  const [slug, setSlug] = useState(article.slug);
  const [coverImageUrl, setCoverImageUrl] = useState(article.coverImageUrl ?? '');
  const [coverImageVariants, setCoverImageVariants] = useState<ImageVariants | null>(
    (article.coverImageVariants as ImageVariants) ?? null,
  );
  const [coverImageQuality, setCoverImageQuality] = useState(article.coverImageQuality ?? 'high');
  const [coverImageSmartCrops, setCoverImageSmartCrops] = useState<SmartCrops | null>(
    (article.coverImageSmartCrops as SmartCrops) ?? null,
  );
  const [coverImageFocalPoint, setCoverImageFocalPoint] = useState<FocalPoint | null>(
    (article.coverImageFocalPoint as FocalPoint) ?? null,
  );
  const [coverImageDetectionData, setCoverImageDetectionData] = useState<object | null>(
    (article.coverImageDetectionData as object) ?? null,
  );
  const [coverImageFocalPointOverride, setCoverImageFocalPointOverride] = useState<{
    x: number;
    y: number;
  } | null>((article.coverImageFocalPointOverride as { x: number; y: number }) ?? null);
  const [showCropPreview, setShowCropPreview] = useState(false);
  const [showManualCrop, setShowManualCrop] = useState(false);
  const [metaTitle, setMetaTitle] = useState(article.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(article.metaDescription ?? '');
  const [pinterestBoardName, setPinterestBoardName] = useState(article.pinterestBoardName ?? '');
  const [status, setStatus] = useState<ArticleStatus>(article.status);
  const [humanReviewedAt, setHumanReviewedAt] = useState<string | null>(article.humanReviewedAt);

  function handleToggleHumanReviewed() {
    startTransition(async () => {
      const result = await toggleHumanReviewedAction(article.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setHumanReviewedAt(result.humanReviewed ? new Date().toISOString() : null);
      toast.success(
        result.humanReviewed ? 'Marked as human reviewed' : 'Marked back to Needs review',
      );
    });
  }
  // The credited author. Never an empty string — `articles.author_id` is NOT
  // NULL, so "no author" is not a state this control can produce.
  const [authorId, setAuthorId] = useState(article.authorId);
  const [primaryCategoryId, setPrimaryCategoryId] = useState(article.primaryCategoryId ?? '');
  // Split initialCategoryIds into secondary (children of primary) and tertiary (children of secondaries)
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState<string[]>(() => {
    if (!article.primaryCategoryId) return [];
    return initialCategoryIds.filter((id) => {
      if (id === article.primaryCategoryId) return false;
      const cat = categories.find((c) => c.id === id);
      return cat?.parentId === article.primaryCategoryId;
    });
  });
  const [tertiaryCategoryIds, setTertiaryCategoryIds] = useState<string[]>(() => {
    if (!article.primaryCategoryId) return [];
    const secIds = new Set(
      initialCategoryIds.filter((id) => {
        if (id === article.primaryCategoryId) return false;
        const cat = categories.find((c) => c.id === id);
        return cat?.parentId === article.primaryCategoryId;
      }),
    );
    return initialCategoryIds.filter((id) => {
      const cat = categories.find((c) => c.id === id);
      return cat?.parentId ? secIds.has(cat.parentId) : false;
    });
  });
  const [publishedAt, setPublishedAt] = useState(article.publishedAt ?? '');
  const [updatedAt, setUpdatedAt] = useState(article.updatedAt ?? '');
  const [scheduledPublishAt, setScheduledPublishAt] = useState(article.scheduledPublishAt ?? '');

  // ── Lock & autosave state ────────────────────────────────────────────
  const [lockAcquired, setLockAcquired] = useState(false);
  const [lockedByOther, setLockedByOther] = useState<string | null>(
    lockStatus.locked ? (lockStatus.lockedByName ?? 'Another admin') : null,
  );
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryTimestamp, setRecoveryTimestamp] = useState<string | null>(null);
  const lockLostRef = useRef(false);

  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [seoOpen, setSeoOpen] = useState(true);
  const [selectedBlockIndices, setSelectedBlockIndices] = useState<Set<number>>(new Set());
  const hasBlockSelection = selectedBlockIndices.size >= 2;
  // F1 fix: Track editor readiness via state (refs don't trigger re-renders)
  const [editorReady, setEditorReady] = useState(false);

  // Editor instance ref + selected image tracking for sidebar quality controls
  const editorRef = useRef<EditorInstance | null>(null);

  const handleGroupIntoSection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || selectedBlockIndices.size < 2) return;

    const blocks = getTopLevelBlockInfo(editor.state);
    const indices = Array.from(selectedBlockIndices).sort((a, b) => a - b);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [];
    for (const idx of indices) {
      const block = blocks[idx];
      if (!block) continue;
      children.push(editor.state.doc.child(idx).toJSON());
    }
    if (children.length === 0) return;

    const from = blocks[indices[0]].from;
    const to = blocks[indices[indices.length - 1]].to;

    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContentAt(from, {
        type: 'sectionBlock',
        attrs: { 'data-title': '' },
        content: children,
      })
      .run();

    setSelectedBlockIndices(new Set());
  }, [selectedBlockIndices]);
  const [selectedImage, setSelectedImage] = useState<{
    attrs: Record<string, string>;
    name: string;
    nodeType: string;
  } | null>(null);
  const [bodyImages, setBodyImages] = useState<BodyImageInfo[]>([]);

  const scanBodyImages = useCallback((editor: EditorInstance) => {
    const imgs: BodyImageInfo[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'image') {
        const a = node.attrs;
        const origSrc = a['data-original-src'] || a.src || '';
        const name = extractFilename(origSrc);
        const quality = a['data-quality'] || null;
        let sizeBytes: number | null = null;
        if (a['data-variants'] && quality) {
          try {
            const v = JSON.parse(a['data-variants']);
            sizeBytes = v[quality]?.sizeBytes ?? null;
          } catch {}
        }
        imgs.push({ name, src: a.src, quality, sizeBytes });
      }
      if (node.type.name === 'figureBlock') {
        const a = node.attrs;
        if (a.src) {
          const origSrc = a['data-original-src'] || a.src || '';
          const name = extractFilename(origSrc);
          const quality = a['data-quality'] || null;
          let sizeBytes: number | null = null;
          if (a['data-variants'] && quality) {
            try {
              const v = JSON.parse(a['data-variants']);
              sizeBytes = v[quality]?.sizeBytes ?? null;
            } catch {}
          }
          imgs.push({ name, src: a.src, quality, sizeBytes });
        }
      }
      if (node.type.name === 'galleryBlock') {
        try {
          const galleryImages = JSON.parse(node.attrs['data-images'] || '[]');
          for (const gi of galleryImages) {
            imgs.push({
              name: extractFilename(gi.src || ''),
              src: gi.src,
              quality: gi.quality || null,
              sizeBytes: null,
            });
          }
        } catch {}
      }
    });
    // Only update state if images actually changed (avoids re-renders on every keystroke)
    setBodyImages((prev) => {
      if (prev.length !== imgs.length) return imgs;
      for (let i = 0; i < imgs.length; i++) {
        if (
          prev[i].src !== imgs[i].src ||
          prev[i].quality !== imgs[i].quality ||
          prev[i].sizeBytes !== imgs[i].sizeBytes
        )
          return imgs;
      }
      return prev;
    });
  }, []);

  // Dirty state tracking
  const initialValues = useRef({
    title: article.title,
    slug: article.slug,
    coverImageUrl: article.coverImageUrl ?? '',
    coverImageVariants: JSON.stringify(article.coverImageVariants ?? null),
    coverImageQuality: article.coverImageQuality ?? 'high',
    coverImageSmartCrops: JSON.stringify(article.coverImageSmartCrops ?? null),
    coverImageFocalPointOverride: JSON.stringify(article.coverImageFocalPointOverride ?? null),
    metaTitle: article.metaTitle ?? '',
    metaDescription: article.metaDescription ?? '',
    pinterestBoardName: article.pinterestBoardName ?? '',
    status: article.status,
    authorId: article.authorId,
    primaryCategoryId: article.primaryCategoryId ?? '',
    secondaryCategoryIds: JSON.stringify(secondaryCategoryIds),
    tertiaryCategoryIds: JSON.stringify(tertiaryCategoryIds),
    content: JSON.stringify(article.content),
    publishedAt: article.publishedAt ?? '',
    updatedAt: article.updatedAt ?? '',
    scheduledPublishAt: article.scheduledPublishAt ?? '',
  });

  const isDirty =
    title !== initialValues.current.title ||
    slug !== initialValues.current.slug ||
    coverImageUrl !== initialValues.current.coverImageUrl ||
    JSON.stringify(coverImageVariants) !== initialValues.current.coverImageVariants ||
    coverImageQuality !== initialValues.current.coverImageQuality ||
    JSON.stringify(coverImageSmartCrops) !== initialValues.current.coverImageSmartCrops ||
    JSON.stringify(coverImageFocalPointOverride) !==
      initialValues.current.coverImageFocalPointOverride ||
    metaTitle !== initialValues.current.metaTitle ||
    metaDescription !== initialValues.current.metaDescription ||
    pinterestBoardName !== initialValues.current.pinterestBoardName ||
    status !== initialValues.current.status ||
    authorId !== initialValues.current.authorId ||
    primaryCategoryId !== initialValues.current.primaryCategoryId ||
    JSON.stringify(secondaryCategoryIds) !== initialValues.current.secondaryCategoryIds ||
    JSON.stringify(tertiaryCategoryIds) !== initialValues.current.tertiaryCategoryIds ||
    JSON.stringify(editorContent) !== initialValues.current.content ||
    publishedAt !== initialValues.current.publishedAt ||
    updatedAt !== initialValues.current.updatedAt ||
    scheduledPublishAt !== initialValues.current.scheduledPublishAt;

  // ── Lock acquisition on mount ────────────────────────────────────────
  useEffect(() => {
    if (lockStatus.locked) return; // Already locked by another admin
    let cancelled = false;
    acquireLockAction(article.id).then((result) => {
      if (cancelled) return;
      if ('error' in result && result.error === 'locked') {
        setLockedByOther(result.lockedByName ?? 'Another admin');
      } else if ('success' in result) {
        setLockAcquired(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recovery prompt check on mount ──────────────────────────────────
  useEffect(() => {
    if (hasNewerLocalAutosave(article.id, userId, article.updatedAt)) {
      const data = loadLocalAutosave(article.id, userId);
      if (data?.savedAt) {
        setRecoveryTimestamp(data.savedAt);
        setShowRecovery(true);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRestore() {
    const data = loadLocalAutosave(article.id, userId);
    if (!data) return;
    setTitle(data.title);
    setSlug(data.slug);
    setEditorContent(data.content);
    // Update the Tiptap editor instance directly (initialContent is only consumed once)
    editorRef.current?.commands.setContent(data.content);
    setCoverImageUrl(data.coverImageUrl);
    setCoverImageVariants(data.coverImageVariants as ImageVariants | null);
    setCoverImageQuality(data.coverImageQuality);
    setCoverImageSmartCrops((data.coverImageSmartCrops as SmartCrops) ?? null);
    setCoverImageFocalPointOverride(
      (data.coverImageFocalPointOverride as { x: number; y: number } | null) ?? null,
    );
    setMetaTitle(data.metaTitle);
    setMetaDescription(data.metaDescription);
    setPinterestBoardName(data.pinterestBoardName ?? '');
    setStatus(data.status as ArticleStatus);
    // Categories are restored only when both the snapshot and this render have
    // real category data. A snapshot captured while the reads were failing holds
    // empty ids that mean "unknown", not "cleared"; and with the tree missing
    // now, the parent/child validation below would drop every id anyway. Either
    // way the article's stored categories are left as they are.
    if (!data.categoriesDegraded && !degraded.categories) {
      setPrimaryCategoryId(data.primaryCategoryId);
      // Validate restored secondaries: must be children of the restored primary
      const restoredSecondaries = (data.secondaryCategoryIds ?? []).filter((id) => {
        const cat = categories.find((c) => c.id === id);
        return cat?.parentId === data.primaryCategoryId;
      });
      setSecondaryCategoryIds(restoredSecondaries);
      // Validate restored tertiaries: must be children of restored secondaries
      const secSet = new Set(restoredSecondaries);
      const restoredTertiaries = (data.tertiaryCategoryIds ?? []).filter((id) => {
        const cat = categories.find((c) => c.id === id);
        return cat?.parentId ? secSet.has(cat.parentId) : false;
      });
      setTertiaryCategoryIds(restoredTertiaries);
    }
    setPublishedAt(data.publishedAt);
    setUpdatedAt(data.updatedAt ?? article.updatedAt ?? '');
    setScheduledPublishAt(data.scheduledPublishAt);
    clearLocalAutosave(article.id, userId);
    setShowRecovery(false);
    toast.success('Autosaved changes restored');
  }

  function handleDiscardRecovery() {
    clearLocalAutosave(article.id, userId);
    setShowRecovery(false);
  }

  // ── getFormData for autosave ────────────────────────────────────────
  // This snapshot only reaches localStorage, so it can't wipe the article by
  // itself — but `handleRestore` writes it back into component state, and the
  // save after that would. It records whether the categories were degraded when
  // captured; `handleRestore` then leaves those fields alone rather than
  // restoring ids that were never really loaded.
  const getFormData = useCallback((): LocalAutosaveData => {
    const rawContent = editorRef.current?.getJSON() ?? editorContent;
    return {
      categoriesDegraded: degraded.categories,
      title,
      slug,
      content: JSON.parse(JSON.stringify(rawContent)),
      coverImageUrl,
      coverImageVariants,
      coverImageQuality,
      coverImageSmartCrops,
      coverImageFocalPointOverride,
      metaTitle,
      metaDescription,
      pinterestBoardName,
      status,
      primaryCategoryId,
      secondaryCategoryIds,
      tertiaryCategoryIds,
      publishedAt,
      updatedAt,
      scheduledPublishAt,
      savedAt: new Date().toISOString(),
    };
  }, [
    title,
    slug,
    editorContent,
    coverImageUrl,
    coverImageVariants,
    coverImageQuality,
    coverImageSmartCrops,
    coverImageFocalPointOverride,
    metaTitle,
    metaDescription,
    pinterestBoardName,
    status,
    degraded,
    primaryCategoryId,
    secondaryCategoryIds,
    tertiaryCategoryIds,
    publishedAt,
    updatedAt,
    scheduledPublishAt,
  ]);

  // Tags state
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [tagSearchOpen, setTagSearchOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const tagComboboxRef = useRef<HTMLDivElement>(null);

  // Each category setter carries the same `shouldWriteCategories` backstop the
  // tag handlers have. The `<fieldset disabled>` around these selects is NOT
  // sufficient on its own: Radix/shadcn render their popover content in a
  // portal, i.e. in a DOM subtree OUTSIDE the fieldset, where the native
  // disabled attribute has no effect. Without this a click in an open dropdown
  // still mutates state the save path would then have to discard.
  const handlePrimaryCategoryChange = useCallback(
    (newPrimaryId: string) => {
      if (!shouldWriteCategories(degraded)) return;
      setPrimaryCategoryId(newPrimaryId);
      // Secondaries are always children of primary, so changing primary invalidates all
      setSecondaryCategoryIds([]);
      setTertiaryCategoryIds([]);
    },
    [degraded],
  );

  // When secondaries change, clear orphaned tertiaries
  const handleSecondaryCategoryChange = useCallback(
    (newSecondaryIds: string[]) => {
      if (!shouldWriteCategories(degraded)) return;
      setSecondaryCategoryIds(newSecondaryIds);
      const secSet = new Set(newSecondaryIds);
      setTertiaryCategoryIds((prev) =>
        prev.filter((id) => {
          const cat = categories.find((c) => c.id === id);
          return cat?.parentId ? secSet.has(cat.parentId) : false;
        }),
      );
    },
    [categories, degraded],
  );

  const handleTertiaryCategoryChange = useCallback(
    (newTertiaryIds: string[]) => {
      if (!shouldWriteCategories(degraded)) return;
      setTertiaryCategoryIds(newTertiaryIds);
    },
    [degraded],
  );

  // Live article URL
  const primaryCategory = categories.find((c) => c.id === primaryCategoryId);
  const liveUrl = primaryCategory ? `/artikel/${primaryCategory.slug}/${slug}` : null;

  // Real-wedding = primary category slug is 'real-weddings' or its parent's is.
  // The Pinterest Board Name field is compulsory for these.
  const isRealWeddingsArticle = (() => {
    if (!primaryCategory) return false;
    if (primaryCategory.slug === 'real-weddings') return true;
    const parent = primaryCategory.parentId
      ? categories.find((c) => c.id === primaryCategory.parentId)
      : null;
    return parent?.slug === 'real-weddings';
  })();
  const canViewLive = status === 'published' && liveUrl;

  // Clear cover image metadata when image is removed
  const handleSetCoverImageUrl = useCallback((url: string) => {
    setCoverImageUrl(url);
    if (!url) {
      setCoverImageVariants(null);
      setCoverImageQuality('high');
      setCoverImageSmartCrops(null);
      setCoverImageFocalPoint(null);
      setCoverImageDetectionData(null);
      setCoverImageFocalPointOverride(null);
    }
  }, []);

  const handleCoverQualityChange = useCallback(
    (quality: string) => {
      setCoverImageQuality(quality);
      if (coverImageVariants) {
        const variant = coverImageVariants[quality as keyof ImageVariants];
        if (variant) setCoverImageUrl(variant.url);
      }
    },
    [coverImageVariants],
  );

  const handleCoverVariantsGenerated = useCallback(
    (newVariants: ImageVariants, defaultQuality: string) => {
      setCoverImageVariants(newVariants);
      setCoverImageQuality(defaultQuality);
      const variant = newVariants[defaultQuality as keyof ImageVariants];
      if (variant) setCoverImageUrl(variant.url);
    },
    [],
  );

  const handleSave = useCallback(
    (options?: {
      silent?: boolean;
      statusOverride?: ArticleStatus;
      scheduledPublishAtOverride?: string | null;
    }) => {
      // Guard: prevent save when lock has been lost
      if (lockLostRef.current) {
        toast.error('Cannot save — your editing session has expired');
        return;
      }

      // Compulsory: real-wedding articles require a Pinterest Board Name. Block
      // manual saves with instant feedback (the server enforces this too, which
      // also covers silent autosaves).
      if (!options?.silent && isRealWeddingsArticle && !pinterestBoardName.trim()) {
        toast.error('Pinterest Board Name is required for Real Weddings articles.');
        return;
      }

      const effectiveStatus = options?.statusOverride ?? status;
      const effectiveScheduledPublishAt =
        options?.scheduledPublishAtOverride !== undefined
          ? (options.scheduledPublishAtOverride ?? '')
          : scheduledPublishAt;
      const effectivePublishedAt = effectiveStatus === 'draft' ? '' : publishedAt;

      // Get fresh content directly from editor to avoid stale closure.
      // JSON round-trip is critical: ProseMirror attrs are Object.create(null) frozen objects
      // that React Server Action serialization (React Flight) silently drops.
      const rawContent = editorRef.current?.getJSON() ?? editorContent;
      const freshContent = JSON.parse(JSON.stringify(rawContent));
      startTransition(async () => {
        // The whole save is fenced: a server action that THROWS (deploy skew,
        // network drop, a 500 mid-response — Sentry issue TWN-NEW-1X, seen 30×)
        // is different from one that returns `{ error }`. Unfenced, the
        // rejection escapes the transition, React unwinds to `(admin)/error.tsx`,
        // and the admin's editor — content, cursor, unsaved work — is replaced
        // by "Something went wrong" mid-keystroke. The content itself survives
        // in the 2s localStorage autosave, but the admin doesn't know that.
        // A failed save must degrade to a toast, never to a lost editor.
        try {
          const result = await updateArticleAction(
            article.id,
            {
              title,
              slug,
              content: freshContent,
              // `primaryCategoryId` is spread in only when the category reads
              // succeeded. The action ignores a falsy value, but it also derives the
              // category-move 301 redirect from this field — writing it while the
              // category tree is unknown would mint a redirect off a value we can't
              // trust. Omitting leaves the stored column untouched.
              ...(shouldWriteCategories(degraded) ? { primaryCategoryId } : {}),
              coverImageUrl,
              coverImageVariants,
              coverImageQuality,
              coverImageFocalPoint,
              coverImageDetectionData,
              coverImageSmartCrops,
              coverImageFocalPointOverride,
              metaTitle,
              metaDescription,
              pinterestBoardName,
              authorId,
              status: effectiveStatus,
              publishedAt: effectivePublishedAt || null,
              updatedAt: updatedAt || null,
              scheduledPublishAt: effectiveScheduledPublishAt || null,
            },
            // Autosave must not revalidate this editor's own path: Next re-renders
            // the page inside the action's response, so busting the cache here just
            // forces that render to refetch everything, every 60 seconds, against a
            // 5-wide pool. Explicit saves still revalidate.
            { silent: options?.silent === true },
          );
          if (result.error) {
            if (!options?.silent) toast.error(result.error);
          } else {
            // Sync local state if overrides were used
            if (options?.statusOverride) setStatus(options.statusOverride);
            if (options?.scheduledPublishAtOverride !== undefined)
              setScheduledPublishAt(options.scheduledPublishAtOverride ?? '');
            if (options?.statusOverride === 'draft') setPublishedAt('');

            // Sync junction table with primary + secondary + tertiary categories.
            // `null` = the category reads failed, so the local id set is empty
            // for the wrong reason; skip the (delete-then-insert) sync entirely
            // rather than clear the article's real categories.
            const allCatIds = buildCategorySyncPayload(degraded, {
              primaryCategoryId,
              secondaryCategoryIds,
              tertiaryCategoryIds,
            });
            if (allCatIds) {
              // Forward the save's public-visibility verdict so this call doesn't
              // re-fire the public cache invalidation that updateArticleAction just
              // deliberately skipped for a draft — and the same `silent` flag, or
              // this call would bust the editor's own cache one line after
              // updateArticleAction deliberately spared it.
              await updateArticleCategoriesAction(article.id, allCatIds, result.affectsPublic, {
                silent: options?.silent === true,
              });
            }
            // `allCatIds === null` means the sync was skipped because the category
            // reads failed. Nothing category-shaped reached the database on this
            // save, so the admin's picks are still pending.
            const wroteCategories = allCatIds !== null;
            if (!options?.silent) {
              toast.success('Article saved');
              // The save succeeded but quietly dropped a field the admin may have
              // just edited. Say so — a bare "Article saved" here would be a lie
              // by omission, and the change is lost the moment they navigate.
              const warning = categorySkipWarning({ wroteCategories, silent: false });
              if (warning) toast.warning(warning, { duration: 10000 });
              if (result.redirectedFrom && result.redirectedTo) {
                toast.info(
                  `Redirected from /inspire/${result.redirectedFrom}/${slug} → /inspire/${result.redirectedTo}/${slug}`,
                );
              }
            }
            clearLocalAutosave(article.id, userId);
            // Skipped category writes must NOT be folded into the baseline, or
            // `isDirty` flips false and the unsaved-changes guard stops warning
            // about an edit that was never persisted. See
            // `foldSavedValuesIntoBaseline`.
            initialValues.current = foldSavedValuesIntoBaseline(
              initialValues.current,
              {
                title,
                slug,
                coverImageUrl,
                coverImageVariants: JSON.stringify(coverImageVariants),
                coverImageQuality,
                coverImageSmartCrops: JSON.stringify(coverImageSmartCrops ?? null),
                coverImageFocalPointOverride: JSON.stringify(coverImageFocalPointOverride ?? null),
                metaTitle,
                metaDescription,
                pinterestBoardName,
                status: effectiveStatus,
                authorId,
                primaryCategoryId,
                secondaryCategoryIds: JSON.stringify(secondaryCategoryIds),
                tertiaryCategoryIds: JSON.stringify(tertiaryCategoryIds),
                content: JSON.stringify(editorContent),
                publishedAt: effectivePublishedAt,
                updatedAt,
                scheduledPublishAt: effectiveScheduledPublishAt,
              },
              wroteCategories,
            );
          }
        } catch (err) {
          // Neither clearLocalAutosave nor the baseline fold ran, so the state
          // is exactly right by omission: the editor stays dirty, the
          // unsaved-changes guard keeps warning, the 2s local autosave keeps
          // snapshotting, and the next 60s autosave retries. Nothing to undo.
          console.error('[article-editor] save failed:', err);
          Sentry.captureException(err, { tags: { area: 'article-editor', phase: 'save' } });
          if (!options?.silent) {
            toast.error(
              'Save failed — your changes are still on this page. Try again in a moment.',
              { duration: 10000 },
            );
          }
        }
      });
    },
    [
      article.id,
      title,
      slug,
      editorContent,
      coverImageUrl,
      coverImageVariants,
      coverImageQuality,
      coverImageFocalPoint,
      coverImageDetectionData,
      coverImageSmartCrops,
      coverImageFocalPointOverride,
      metaTitle,
      metaDescription,
      pinterestBoardName,
      isRealWeddingsArticle,
      status,
      authorId,
      degraded,
      primaryCategoryId,
      secondaryCategoryIds,
      tertiaryCategoryIds,
      publishedAt,
      updatedAt,
      scheduledPublishAt,
    ],
  );

  // ── Autosave hook ───────────────────────────────────────────────────
  useUploadProgressToast();

  const { lastAutosaveAt, lockLost } = useAutosave({
    articleId: article.id,
    userId,
    isDirty,
    onSave: handleSave,
    getFormData,
    enabled: lockAcquired,
  });

  // Keep lockLostRef in sync for handleSave guard
  useEffect(() => {
    lockLostRef.current = lockLost;
  }, [lockLost]);

  // ── Debounced local save on every change (2s) ──────────────────────
  useEffect(() => {
    if (!lockAcquired) return;
    const timer = setTimeout(() => {
      saveLocalAutosave(article.id, userId, getFormData());
    }, 2000);
    return () => clearTimeout(timer);
  }, [article.id, userId, lockAcquired, getFormData]);

  // Both tag mutations go through `updateArticleTagsAction`, which clears the
  // article's tag rows and re-inserts what it is given. When the tag reads
  // failed, `selectedTagIds` seeded from an empty array we don't trust — so
  // refuse the write outright rather than persist it. The UI disables these
  // controls too; this is the backstop.
  function handleTagToggle(tagId: string) {
    if (!shouldWriteTags(degraded)) return;
    const newIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(newIds);
    startTransition(async () => {
      const result = await updateArticleTagsAction(article.id, newIds);
      if (result.error) toast.error(result.error);
    });
  }

  function handleTagRemove(tagId: string) {
    if (!shouldWriteTags(degraded)) return;
    const newIds = selectedTagIds.filter((id) => id !== tagId);
    setSelectedTagIds(newIds);
    startTransition(async () => {
      const result = await updateArticleTagsAction(article.id, newIds);
      if (result.error) toast.error(result.error);
    });
  }

  // Close tag combobox on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tagComboboxRef.current && !tagComboboxRef.current.contains(e.target as Node)) {
        setTagSearchOpen(false);
        setTagSearch('');
      }
    }
    if (tagSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [tagSearchOpen]);

  // Warn on unsaved changes before leaving + release lock via beacon
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      // Always release lock on tab close (Blob ensures application/json Content-Type)
      navigator.sendBeacon(
        '/api/v1/inspire/release-lock',
        new Blob([JSON.stringify({ articleId: article.id })], { type: 'application/json' }),
      );
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, article.id]);

  // Cmd+S / Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleSave]);

  // Drag-and-drop / paste image upload handler
  const handleEditorImageFile = useCallback(
    async (file: File, editor: EditorInstance, pos?: number) => {
      if (!file.type.startsWith('image/')) return false;
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image too large (max 10MB)');
        return true;
      }

      trackFiles(1);

      // Insert a placeholder so the user sees something immediately
      const placeholderSrc = URL.createObjectURL(file);
      if (pos != null) {
        editor
          .chain()
          .focus()
          .insertContentAt(pos, {
            type: 'image',
            attrs: { src: placeholderSrc, alt: file.name },
          })
          .run();
      } else {
        editor.chain().focus().setImage({ src: placeholderSrc }).run();
      }

      try {
        const result = await uploadInspireImage(
          { slug: article.slug, articleId: article.id },
          file,
        );

        // Find the placeholder node and replace its attributes with the real upload data
        let found = false;
        editor.state.doc.descendants((node, nodePos) => {
          if (found) return false;
          if (node.type.name === 'image' && node.attrs.src === placeholderSrc) {
            found = true;
            editor
              .chain()
              .setNodeSelection(nodePos)
              .updateAttributes('image', {
                src: result.url,
                'data-original-src': result.originalUrl,
                'data-quality': result.defaultQuality,
                'data-variants': JSON.stringify(result.variants),
              })
              .run();
            return false;
          }
        });

        markCompleted();
        URL.revokeObjectURL(placeholderSrc);
      } catch (err) {
        markFailed();
        toast.error(err instanceof Error ? err.message : 'Image upload failed');
        // Remove the placeholder on failure
        editor.state.doc.descendants((node, nodePos) => {
          if (node.type.name === 'image' && node.attrs.src === placeholderSrc) {
            editor.chain().setNodeSelection(nodePos).deleteSelection().run();
            return false;
          }
        });
        URL.revokeObjectURL(placeholderSrc);
      }

      return true;
    },
    [article.slug, article.id],
  );

  // Listen for file uploads from slash command
  useEffect(() => {
    const handler = (e: Event) => {
      const files = (e as CustomEvent).detail?.files as File[] | undefined;
      const editor = editorRef.current;
      if (!files || !editor) return;

      // Insert all placeholders synchronously first so each gets a unique position,
      // then upload all in parallel. Using setImage sequentially doesn't reliably
      // advance the cursor between rapid calls, so we use insertContentAt with
      // explicit positions instead.
      const placeholders: { file: File; src: string }[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: Image too large (max 10MB)`);
          continue;
        }
        const src = URL.createObjectURL(file);
        // Insert at the current end-of-selection, which advances after each insertion
        const insertPos = editor.state.selection.to;
        editor
          .chain()
          .focus()
          .insertContentAt(insertPos, {
            type: 'image',
            attrs: { src, alt: file.name },
          })
          .run();
        placeholders.push({ file, src });
      }

      if (placeholders.length === 0) return;
      trackFiles(placeholders.length);

      // Upload all files in parallel, replacing placeholders as each completes
      for (const { file, src } of placeholders) {
        uploadInspireImage({ slug: article.slug, articleId: article.id }, file)
          .then((result) => {
            let found = false;
            editor.state.doc.descendants((node, nodePos) => {
              if (found) return false;
              if (node.type.name === 'image' && node.attrs.src === src) {
                found = true;
                editor
                  .chain()
                  .setNodeSelection(nodePos)
                  .updateAttributes('image', {
                    src: result.url,
                    'data-original-src': result.originalUrl,
                    'data-quality': result.defaultQuality,
                    'data-variants': JSON.stringify(result.variants),
                  })
                  .run();
                return false;
              }
            });
            markCompleted();
            URL.revokeObjectURL(src);
          })
          .catch((err) => {
            markFailed();
            toast.error(err instanceof Error ? err.message : `${file.name}: Upload failed`);
            editor.state.doc.descendants((node, nodePos) => {
              if (node.type.name === 'image' && node.attrs.src === src) {
                editor.chain().setNodeSelection(nodePos).deleteSelection().run();
                return false;
              }
            });
            URL.revokeObjectURL(src);
          });
      }
    };
    window.addEventListener('editor-upload-files', handler);
    return () => window.removeEventListener('editor-upload-files', handler);
  }, [article.slug, article.id, trackFiles, markCompleted, markFailed]);

  const availableTags = allTags.filter(
    (t) =>
      !selectedTagIds.includes(t.id) &&
      (!tagSearch.trim() || t.name.toLowerCase().includes(tagSearch.trim().toLowerCase())),
  );
  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));

  const isReadOnly = !!lockedByOther || lockLost;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      {/* Main content area */}
      <div className="space-y-4">
        {/* Locked-by banner */}
        {lockedByOther && (
          <div className="border-warning bg-warning-subtle text-warning flex items-center gap-2 rounded-md border px-4 py-3 text-sm">
            <AlertTriangleIcon className="size-4 shrink-0" />
            This article is being edited by <strong>{lockedByOther}</strong>. You can view but not
            edit.
          </div>
        )}

        {/* Lock-lost warning */}
        {lockLost && !lockedByOther && (
          <div className="border-error bg-error-subtle text-error flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <ShieldAlertIcon className="size-4 shrink-0" />
              Your editing session has expired. Another admin may be editing this article. Please
              copy your changes and reload.
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => window.location.reload()}
              className="shrink-0"
            >
              Reload
            </Button>
          </div>
        )}

        {/* Recovery prompt */}
        {showRecovery && !lockedByOther && (
          <div className="border-info bg-info-subtle text-info flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm">
            <span>
              Unsaved changes recovered from{' '}
              {recoveryTimestamp ? formatDateTime(recoveryTimestamp) : 'a previous session'}.
            </span>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="primary" onClick={handleRestore}>
                Restore
              </Button>
              <Button size="sm" variant="quiet" onClick={handleDiscardRecovery}>
                Discard
              </Button>
            </div>
          </div>
        )}

        {/* Row 1: Full-width title */}
        <fieldset disabled={isReadOnly} className="space-y-3">
          <Input
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            className="h-auto border-0 px-0 py-1.5 text-2xl leading-tight font-bold shadow-none focus-visible:ring-0"
            placeholder="Article title"
          />

          {/* Row 2: Action bar — its own band beneath the title. The fieldset had
              no vertical rhythm, so Unpublish/Update sat flush against the 2xl
              title and collided with its descenders. The hairline + pt-3 keep
              them separated however many items this row grows to hold (it now
              also carries the Dynamic Blocks and WhatsApp inserts from main). */}
          <div className="border-hairline flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t pt-3">
            {/* Left group: Preview/View Live + scheduled badge + published date + group blocks */}
            {canViewLive ? (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
              >
                <ExternalLinkIcon className="size-3.5" />
                View Live
              </a>
            ) : (
              <a
                href={`/admin/inspire/${article.id}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
              >
                <EyeIcon className="size-3.5" />
                Preview
              </a>
            )}

            {/* Scheduled badge (no clear button — use Unpublish to remove) */}
            {status === 'draft' && scheduledPublishAt && (
              <Chip variant="warning" size="sm">
                Scheduled: {formatDateTime(scheduledPublishAt)}
              </Chip>
            )}

            {/* Group into Section — visible when 2+ blocks selected */}
            {hasBlockSelection && (
              <button
                type="button"
                className="bg-primary text-primary-foreground hover:bg-primary/90 animate-in fade-in inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors duration-200"
                onClick={handleGroupIntoSection}
              >
                <FolderPlus className="size-3" />
                Group {selectedBlockIndices.size} blocks into Section
              </button>
            )}

            {/* Right group: autosave + action buttons */}
            <div className="ml-auto flex items-center gap-2">
              {lastAutosaveAt && (
                <span className="text-muted-foreground animate-in fade-in text-xs duration-300">
                  Autosaved{' '}
                  {new Date(lastAutosaveAt).toLocaleTimeString('en-MY', {
                    timeZone: 'Asia/Kuala_Lumpur',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              )}

              {status === 'draft' && !scheduledPublishAt ? (
                <>
                  {/* Draft (not scheduled): Share | Export PDF | Schedule | Save as Draft | Publish.
                      Share and Export are gated on a clean editor: both hand the
                      client the SAVED article, so offering them mid-edit would
                      show a reviewer content the author hasn't committed. */}
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setShowShareDialog(true)}
                    disabled={isDirty || isPending || isReadOnly}
                    title={isDirty ? 'Save your changes first' : undefined}
                  >
                    <Share2Icon className="mr-1 size-3.5" />
                    Share with client
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `/admin/inspire/${article.id}/pdf`,
                        '_blank',
                        'noopener,noreferrer',
                      )
                    }
                    disabled={isDirty || isPending || isReadOnly}
                    title={isDirty ? 'Save your changes first' : undefined}
                  >
                    <FileDownIcon className="mr-1 size-3.5" />
                    Export PDF
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setShowScheduleDialog(true)}
                    disabled={isPending || isReadOnly}
                  >
                    <CalendarClockIcon className="mr-1 size-3.5" />
                    Schedule
                  </Button>
                  <Button
                    variant={isDirty ? 'primary' : 'quiet'}
                    size="sm"
                    onClick={() => handleSave({ statusOverride: 'draft' })}
                    disabled={isPending || isReadOnly}
                  >
                    {isPending ? 'Saving...' : 'Save as Draft'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleSave({ statusOverride: 'published', scheduledPublishAtOverride: null })
                    }
                    disabled={isPending || isReadOnly}
                  >
                    {isPending ? 'Publishing...' : 'Publish'}
                  </Button>
                </>
              ) : (
                <>
                  {/* Published or Scheduled: Unpublish | Update */}
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() =>
                      handleSave({ statusOverride: 'draft', scheduledPublishAtOverride: null })
                    }
                    disabled={isPending || isReadOnly}
                  >
                    {isPending ? 'Saving...' : 'Unpublish'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave()}
                    disabled={isPending || isReadOnly}
                    variant={isDirty ? 'primary' : 'quiet'}
                  >
                    {isPending ? 'Updating...' : 'Update'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Client share-link dialog — mounted alongside the schedule dialog
              so it renders outside the action row's flex layout. */}
          <ShareDraftDialog
            articleId={article.id}
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
          />

          {/* Schedule Dialog */}
          <ScheduleDialog
            open={showScheduleDialog}
            onOpenChange={setShowScheduleDialog}
            initialValue={scheduledPublishAt}
            isPending={isPending}
            onSchedule={(isoDate) => {
              handleSave({ scheduledPublishAtOverride: isoDate });
              setShowScheduleDialog(false);
            }}
          />
        </fieldset>

        {/* Block editor */}
        <div className="relative max-h-[70vh] min-h-[500px] overflow-y-auto rounded-md border">
          {editorReady && editorRef.current && (
            <BlockDragHandleView
              editor={editorRef.current}
              selectedBlocks={selectedBlockIndices}
              onSelectedBlocksChange={setSelectedBlockIndices}
            />
          )}
          <EditorRoot>
            <EditorContent
              extensions={extensions}
              initialContent={editorContent}
              immediatelyRender={false}
              onCreate={({ editor }) => {
                editorRef.current = editor;
                // Provide article metadata to FigureBlock for uploads
                if (editor.storage.figureBlock) {
                  editor.storage.figureBlock.articleId = article.id;
                  editor.storage.figureBlock.articleSlug = article.slug;
                }
                // Same for the PDF nodes — they upload PDFs to the article's R2 folder.
                if (editor.storage.pdfLinkBlock) {
                  editor.storage.pdfLinkBlock.articleId = article.id;
                  editor.storage.pdfLinkBlock.articleSlug = article.slug;
                }
                if (editor.storage.pdfLinkInline) {
                  editor.storage.pdfLinkInline.articleId = article.id;
                  editor.storage.pdfLinkInline.articleSlug = article.slug;
                }
                setEditorReady(true);
                scanBodyImages(editor);
              }}
              onUpdate={({ editor }) => {
                editorRef.current = editor;
                setEditorContent(editor.getJSON());
                // Refresh selected image attrs after editor updates (e.g. after generating variants)
                const sel = editor.state.selection as unknown as {
                  node?: { type: { name: string }; attrs: Record<string, string> };
                };
                if (
                  sel.node &&
                  (sel.node.type.name === 'image' || sel.node.type.name === 'figureBlock')
                ) {
                  const attrs = sel.node.attrs;
                  const src = attrs['data-original-src'] || attrs.src || '';
                  setSelectedImage({
                    attrs,
                    name: extractFilename(src),
                    nodeType: sel.node.type.name,
                  });
                }
                scanBodyImages(editor);
              }}
              onSelectionUpdate={({ editor }) => {
                editorRef.current = editor;
                const sel = editor.state.selection as unknown as {
                  node?: { type: { name: string }; attrs: Record<string, string> };
                };
                if (
                  sel.node &&
                  (sel.node.type.name === 'image' || sel.node.type.name === 'figureBlock')
                ) {
                  const attrs = sel.node.attrs;
                  const src = attrs['data-original-src'] || attrs.src || '';
                  setSelectedImage({
                    attrs,
                    name: extractFilename(src),
                    nodeType: sel.node.type.name,
                  });
                } else {
                  setSelectedImage(null);
                }
              }}
              editable={!isReadOnly}
              editorProps={{
                attributes: {
                  class: 'prose max-w-none p-4 focus:outline-none min-h-[450px]',
                },
                handleDOMEvents: {
                  keydown: (_view, event) => handleCommandNavigation(event),
                },
                handleDrop: (view, event, _slice, moved) => {
                  // F12 fix: Block-level drag system handles its own drops
                  if (event.dataTransfer?.types.includes(BLOCK_DRAG_TYPE)) return true;
                  if (moved || !event.dataTransfer?.files.length) return false;
                  const files = Array.from(event.dataTransfer.files).filter((f) =>
                    f.type.startsWith('image/'),
                  );
                  if (files.length === 0) return false;
                  event.preventDefault();
                  const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
                  const editor = editorRef.current;
                  if (editor) {
                    for (const file of files) {
                      handleEditorImageFile(file, editor, pos);
                    }
                  }
                  return true;
                },
                handlePaste: (view, event) => {
                  const items = event.clipboardData?.items;
                  if (!items) return false;
                  const files: File[] = [];
                  for (const item of items) {
                    if (item.type.startsWith('image/')) {
                      const file = item.getAsFile();
                      if (file) files.push(file);
                    }
                  }
                  if (files.length === 0) return false;
                  event.preventDefault();
                  const editor = editorRef.current;
                  if (editor) {
                    for (const file of files) {
                      handleEditorImageFile(file, editor);
                    }
                  }
                  return true;
                },
              }}
            >
              <LinkBubbleMenu />
              <TableBubbleMenu />
              <EditorToolbar articleId={article.id} articleSlug={article.slug} />
              <EditorCommand className="bg-background z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border px-1 py-2 shadow-md">
                <EditorCommandEmpty className="text-muted-foreground px-2 text-sm">
                  No results
                </EditorCommandEmpty>
                <EditorCommandList>
                  {slashCommandItems.map((item) => (
                    <EditorCommandItem
                      key={item.title}
                      value={item.title}
                      onCommand={(val) => item.command?.(val)}
                      className="hover:bg-accent aria-selected:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                    >
                      <div className="bg-background flex size-8 items-center justify-center rounded-md border">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-xs">{item.description}</p>
                      </div>
                    </EditorCommandItem>
                  ))}
                </EditorCommandList>
              </EditorCommand>
            </EditorContent>
          </EditorRoot>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
        {/* AI review status — only for AI-generated articles */}
        {article.isAiGenerated && (
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Review status</span>
              {humanReviewedAt ? (
                <Chip
                  variant="success"
                  size="sm"
                  title={`Human reviewed ${formatDate(humanReviewedAt)}`}
                >
                  <BadgeCheckIcon className="mr-1 size-3" />
                  Reviewed
                </Chip>
              ) : (
                <Chip
                  variant="warning"
                  size="sm"
                  title="AI-generated article awaiting human review"
                >
                  Needs review
                </Chip>
              )}
            </div>
            <p className="text-muted-foreground mb-3 text-xs">
              This article was AI-generated.{' '}
              {humanReviewedAt
                ? 'It has been reviewed by an admin.'
                : 'Mark it reviewed once an admin has checked it.'}
            </p>
            <Button
              type="button"
              variant={humanReviewedAt ? 'quiet' : 'primary'}
              size="sm"
              className="w-full"
              onClick={handleToggleHumanReviewed}
              disabled={isPending || isReadOnly}
            >
              <BadgeCheckIcon className="mr-2 size-4" />
              {humanReviewedAt ? 'Mark back to Needs review' : 'Mark as reviewed'}
            </Button>
          </div>
        )}

        {/* Block outline */}
        {editorReady && editorRef.current && (
          <BlockOutlinePanel
            editor={editorRef.current}
            selectedBlocks={selectedBlockIndices}
            onSelectedBlocksChange={setSelectedBlockIndices}
          />
        )}

        {/* Dynamic blocks */}
        {editorReady && editorRef.current && (
          <DynamicBlocksPanel
            editor={editorRef.current}
            publishedBlocks={publishedDynamicBlocks ?? []}
            autoAttachedBlocks={autoAttachedDynamicBlocks ?? []}
            disabled={isReadOnly}
          />
        )}

        {/* Cover image */}
        <CoverImageUpload
          articleId={article.id}
          coverImageUrl={coverImageUrl}
          setCoverImageUrl={handleSetCoverImageUrl}
          coverImageVariants={coverImageVariants}
          setCoverImageVariants={setCoverImageVariants}
          coverImageQuality={coverImageQuality}
          setCoverImageQuality={setCoverImageQuality}
          coverImageSmartCrops={coverImageSmartCrops}
          setCoverImageSmartCrops={setCoverImageSmartCrops}
          setCoverImageFocalPoint={setCoverImageFocalPoint}
          setCoverImageDetectionData={setCoverImageDetectionData}
          onSmartCropsReady={() => setShowCropPreview(true)}
        />
        {coverImageUrl && coverImageSmartCrops && (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => setShowCropPreview(true)}
          >
            <CropIcon className="size-3.5" />
            View crops
          </Button>
        )}
        {coverImageUrl && !isDirty && (
          <Link
            href={`/admin/cover-photos?search=${encodeURIComponent(title)}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
          >
            <ImageIcon className="size-3" />
            Manage cover photo crops
          </Link>
        )}
        <CoverImageQuality
          coverImageUrl={coverImageUrl}
          variants={coverImageVariants}
          quality={coverImageQuality}
          onQualityChange={handleCoverQualityChange}
          onVariantsGenerated={handleCoverVariantsGenerated}
        />
        {coverImageUrl && (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="w-full gap-1.5"
            disabled={!coverImageUrl || isPending}
            onClick={() => {
              if (!confirm('This will regenerate all image variants and smart crops. Continue?'))
                return;
              startTransition(async () => {
                const result = await regenerateArticleImagesAction(article.id);
                if (result.error) {
                  toast.error(result.error);
                } else {
                  if (result.variants) {
                    setCoverImageVariants(result.variants as ImageVariants);
                    setCoverImageQuality('high');
                    const highVariant = (result.variants as ImageVariants).high;
                    if (highVariant) setCoverImageUrl(highVariant.url);
                  }
                  if (result.smartCrops) {
                    setCoverImageSmartCrops(result.smartCrops as SmartCrops);
                  }
                  toast.success('Images regenerated');
                }
              });
            }}
          >
            <RefreshCwIcon className="size-3.5" />
            Regenerate Images
          </Button>
        )}
        {selectedImage && editorRef.current && (
          <>
            <ImageQualitySidebar
              editor={editorRef.current}
              imageAttrs={selectedImage.attrs}
              imageName={selectedImage.name}
              nodeType={selectedImage.nodeType}
            />
            {selectedImage.nodeType === 'image' && (
              <Button
                type="button"
                variant="quiet"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  const editor = editorRef.current;
                  if (!editor) return;
                  const sel = editor.state.selection as unknown as {
                    from: number;
                    node?: { attrs: Record<string, unknown> };
                  };
                  if (!sel.node) return;
                  const pos = sel.from;
                  const imageAttrs = {
                    src: sel.node.attrs.src,
                    alt: sel.node.attrs.alt,
                    'data-original-src': sel.node.attrs['data-original-src'],
                    'data-quality': sel.node.attrs['data-quality'],
                    'data-variants': sel.node.attrs['data-variants'],
                  };
                  editor
                    .chain()
                    .focus()
                    .setNodeSelection(pos)
                    .deleteSelection()
                    .insertContentAt(pos, {
                      type: 'figureBlock',
                      attrs: imageAttrs,
                    })
                    .setNodeSelection(pos)
                    .run();
                }}
              >
                <Frame className="size-3.5" />
                Add Caption
              </Button>
            )}
          </>
        )}
        {editorRef.current && bodyImages.length > 0 && (
          <ArticleImagesList editor={editorRef.current} images={bodyImages} />
        )}

        <fieldset disabled={isReadOnly} className="space-y-6">
          {/* Primary category. The whole category group is wrapped in its own
              fieldset so a failed category read disables it without touching
              the rest of the sidebar. */}
          {/* The notice lives OUTSIDE the disabled fieldset below. Screen
              readers commonly skip disabled subtrees, so a notice nested inside
              one is invisible to exactly the users who most need told why the
              control does nothing. Kept adjacent so it still reads in place. */}
          {degraded.categories && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Primary Category</Label>
              <DegradedNotice label="categories" />
            </div>
          )}
          <fieldset disabled={degraded.categories} className="space-y-6 disabled:opacity-60">
            <div className="space-y-2">
              {!degraded.categories && (
                <Label className="text-sm font-semibold">Primary Category</Label>
              )}
              <CategorySelect
                categories={categories}
                value={primaryCategoryId}
                onValueChange={handlePrimaryCategoryChange}
                placeholder="Select category"
              />
            </div>

            {/* Secondary categories */}
            {primaryCategoryId && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Secondary Categories</Label>
                <p className="text-muted-foreground text-xs">
                  Article will also appear on these category pages
                </p>
                <CategoryMultiSelect
                  categories={categories}
                  primaryCategoryId={primaryCategoryId}
                  selectedIds={secondaryCategoryIds}
                  onChange={handleSecondaryCategoryChange}
                />
              </div>
            )}

            {/* Tertiary categories */}
            {secondaryCategoryIds.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tertiary Categories</Label>
                <p className="text-muted-foreground text-xs">
                  Specific sub-categories for finer cross-listing
                </p>
                <CategoryTertiarySelect
                  categories={categories}
                  secondaryCategoryIds={secondaryCategoryIds}
                  selectedIds={tertiaryCategoryIds}
                  onChange={handleTertiaryCategoryChange}
                />
              </div>
            )}
          </fieldset>

          {/* Author. Deliberately OUTSIDE the category fieldset: a failed
              category read must not disable attribution, which is an
              independent field with an independent read. */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Author</Label>
            <Select value={authorId} onValueChange={setAuthorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select author" />
              </SelectTrigger>
              <SelectContent>
                {selectableAuthors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    {a.isHouseAccount ? ' (house)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Public authors get a linked byline and an archive page. The house account stays
              unlinked — pick it to remove a personal credit.
            </p>
          </div>

          {/* Tags */}
          {/* Outside the disabled fieldset — see the categories notice above. */}
          {degraded.tags && (
            <div className="space-y-2">
              <Label variant="inline" className="text-sm font-semibold">
                Tags
              </Label>
              <DegradedNotice label="tags" />
            </div>
          )}
          <fieldset disabled={degraded.tags} className="space-y-2 disabled:opacity-60">
            {!degraded.tags && (
              <Label variant="inline" className="text-sm font-semibold">
                Tags
              </Label>
            )}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <Chip key={tag.id} variant="outline" size="sm" className="gap-1 pr-1">
                    {tag.name}
                    {tag.isHidden && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        Hidden
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => handleTagRemove(tag.id)}
                      aria-label={`Remove tag ${tag.name}`}
                      className="hover:bg-muted-foreground/20 ml-0.5 rounded-full p-0.5"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Chip>
                ))}
              </div>
            )}
            <div className="relative" ref={tagComboboxRef}>
              <Input
                role="combobox"
                aria-expanded={tagSearchOpen}
                aria-controls="tag-listbox"
                aria-autocomplete="list"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setTagSearch(e.target.value);
                  if (!tagSearchOpen) setTagSearchOpen(true);
                }}
                onFocus={() => setTagSearchOpen(true)}
                className="h-9 text-sm"
              />
              {tagSearchOpen && (
                <div
                  id="tag-listbox"
                  role="listbox"
                  className="bg-popover absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border shadow-md"
                >
                  {availableTags.length > 0 ? (
                    availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                        onClick={() => {
                          handleTagToggle(tag.id);
                          setTagSearch('');
                        }}
                      >
                        {tag.name}
                        {tag.isHidden && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            Hidden
                          </Badge>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-muted-foreground px-3 py-2 text-sm">
                      {tagSearch
                        ? 'No matching tags'
                        : allTags.length === 0
                          ? 'No tags available'
                          : 'All tags selected'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </fieldset>

          {/* Slug */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Slug</Label>
            <Input
              value={slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlug(e.target.value)}
              className="text-sm"
            />
            {/* publishedAt catches formerly-published articles being edited in
                another status — the server creates the redirect for those too. */}
            {slug !== initialValues.current.slug &&
              (status === 'published' || Boolean(publishedAt)) && (
                <p className="text-muted-foreground text-xs">
                  The old URL will automatically 301-redirect to the new one when you save.
                </p>
              )}
          </div>

          {/* Dates (MYT) — Published is auto-set on publish; Last Updated drives the
            public visible date + SEO freshness (dateModified, sitemap lastmod). */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Dates (MYT)</Label>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Published</Label>
              <Input
                type="datetime-local"
                value={publishedAt ? toMYTDatetimeLocal(publishedAt) : ''}
                onChange={(e) =>
                  setPublishedAt(e.target.value ? fromMYTDatetimeLocal(e.target.value) : '')
                }
                disabled={status === 'draft' || isReadOnly}
                className="text-sm"
              />
              {status === 'draft' && (
                <p className="text-muted-foreground text-xs">
                  Set automatically when the article is published.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs">Last Updated</Label>
                <button
                  type="button"
                  onClick={() => setUpdatedAt(new Date().toISOString())}
                  disabled={isReadOnly}
                  className="text-muted-foreground hover:text-foreground text-xs underline disabled:opacity-50"
                >
                  Set to now
                </button>
              </div>
              <Input
                type="datetime-local"
                value={updatedAt ? toMYTDatetimeLocal(updatedAt) : ''}
                onChange={(e) =>
                  setUpdatedAt(e.target.value ? fromMYTDatetimeLocal(e.target.value) : '')
                }
                disabled={isReadOnly}
                className="text-sm"
              />
              <p className="text-muted-foreground text-xs">
                Shown on the public article and used for SEO freshness.
              </p>
            </div>
          </div>

          {/* Pinterest Board Name — compulsory for real weddings */}
          {isRealWeddingsArticle && (
            <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50/50 p-3">
              <Label className="text-sm font-semibold">
                Pinterest Board Name <span className="text-red-500">*</span>
                <span className="text-muted-foreground float-right text-xs font-normal">
                  {pinterestBoardName.length}/49
                </span>
              </Label>
              <Input
                value={pinterestBoardName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPinterestBoardName(e.target.value)
                }
                placeholder="Short board title (< 50 chars) for the Pinterest export"
                maxLength={49}
                disabled={isReadOnly}
                className="text-sm"
                aria-invalid={!pinterestBoardName.trim()}
              />
              {!pinterestBoardName.trim() && (
                <p className="flex items-start gap-1.5 text-xs text-red-600">
                  <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                  Required for Real Weddings — used as the Pinterest board title.
                </p>
              )}
            </div>
          )}

          {/* SEO Meta */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSeoOpen(!seoOpen)}
              className="flex w-full items-center gap-2 text-sm font-semibold"
            >
              <ChevronDownIcon
                className={`size-4 transition-transform ${seoOpen ? '' : '-rotate-90'}`}
              />
              SEO
              {!metaDescription && (
                <AlertTriangleIcon
                  className="text-warning size-3.5"
                  aria-label="Missing meta description"
                />
              )}
            </button>
            {seoOpen && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Meta Title <span className="float-right">{metaTitle.length}/70</span>
                  </Label>
                  <Input
                    value={metaTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMetaTitle(e.target.value)
                    }
                    placeholder="Leave blank to auto-generate from title"
                    maxLength={70}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Meta Description{' '}
                    <span className="float-right">{metaDescription.length}/160</span>
                  </Label>
                  <Textarea
                    value={metaDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setMetaDescription(e.target.value)
                    }
                    placeholder="Recommended — used for Google search results and social sharing"
                    maxLength={160}
                    rows={3}
                    className="text-sm"
                  />
                  {!metaDescription && (
                    <p className="text-warning flex items-start gap-1.5 text-xs">
                      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                      Recommended for SEO. We&apos;ll auto-fill from your excerpt or article body if
                      blank.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

        </fieldset>

        {/* Block editor */}
        <div className="relative max-h-[70vh] min-h-[500px] overflow-y-auto rounded-md border">
          {editorReady && editorRef.current && (
            <BlockDragHandleView
              editor={editorRef.current}
              selectedBlocks={selectedBlockIndices}
              onSelectedBlocksChange={setSelectedBlockIndices}
            />
          )}
          <EditorRoot>
            <EditorContent
              extensions={extensions}
              initialContent={editorContent}
              immediatelyRender={false}
              onCreate={({ editor }) => {
                editorRef.current = editor;
                // Provide article metadata to FigureBlock for uploads
                if (editor.storage.figureBlock) {
                  editor.storage.figureBlock.articleId = article.id;
                  editor.storage.figureBlock.articleSlug = article.slug;
                }
                // Same for the PDF nodes — they upload PDFs to the article's R2 folder.
                if (editor.storage.pdfLinkBlock) {
                  editor.storage.pdfLinkBlock.articleId = article.id;
                  editor.storage.pdfLinkBlock.articleSlug = article.slug;
                }
                if (editor.storage.pdfLinkInline) {
                  editor.storage.pdfLinkInline.articleId = article.id;
                  editor.storage.pdfLinkInline.articleSlug = article.slug;
                }
                setEditorReady(true);
                scanBodyImages(editor);
              }}
              onUpdate={({ editor }) => {
                editorRef.current = editor;
                setEditorContent(editor.getJSON());
                // Refresh selected image attrs after editor updates (e.g. after generating variants)
                const sel = editor.state.selection as unknown as {
                  node?: { type: { name: string }; attrs: Record<string, string> };
                };
                if (
                  sel.node &&
                  (sel.node.type.name === 'image' || sel.node.type.name === 'figureBlock')
                ) {
                  const attrs = sel.node.attrs;
                  const src = attrs['data-original-src'] || attrs.src || '';
                  setSelectedImage({
                    attrs,
                    name: extractFilename(src),
                    nodeType: sel.node.type.name,
                  });
                }
                scanBodyImages(editor);
              }}
              onSelectionUpdate={({ editor }) => {
                editorRef.current = editor;
                const sel = editor.state.selection as unknown as {
                  node?: { type: { name: string }; attrs: Record<string, string> };
                };
                if (
                  sel.node &&
                  (sel.node.type.name === 'image' || sel.node.type.name === 'figureBlock')
                ) {
                  const attrs = sel.node.attrs;
                  const src = attrs['data-original-src'] || attrs.src || '';
                  setSelectedImage({
                    attrs,
                    name: extractFilename(src),
                    nodeType: sel.node.type.name,
                  });
                } else {
                  setSelectedImage(null);
                }
              }}
              editable={!isReadOnly}
              editorProps={{
                attributes: {
                  class: 'prose max-w-none p-4 focus:outline-none min-h-[450px]',
                },
                handleDOMEvents: {
                  keydown: (_view, event) => handleCommandNavigation(event),
                },
                handleDrop: (view, event, _slice, moved) => {
                  // F12 fix: Block-level drag system handles its own drops
                  if (event.dataTransfer?.types.includes(BLOCK_DRAG_TYPE)) return true;
                  if (moved || !event.dataTransfer?.files.length) return false;
                  const files = Array.from(event.dataTransfer.files).filter((f) =>
                    f.type.startsWith('image/'),
                  );
                  if (files.length === 0) return false;
                  event.preventDefault();
                  const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
                  const editor = editorRef.current;
                  if (editor) {
                    for (const file of files) {
                      handleEditorImageFile(file, editor, pos);
                    }
                  }
                  return true;
                },
                handlePaste: (view, event) => {
                  const items = event.clipboardData?.items;
                  if (!items) return false;
                  const files: File[] = [];
                  for (const item of items) {
                    if (item.type.startsWith('image/')) {
                      const file = item.getAsFile();
                      if (file) files.push(file);
                    }
                  }
                  if (files.length === 0) return false;
                  event.preventDefault();
                  const editor = editorRef.current;
                  if (editor) {
                    for (const file of files) {
                      handleEditorImageFile(file, editor);
                    }
                  }
                  return true;
                },
              }}
            >
              <LinkBubbleMenu />
              <TableBubbleMenu />
              <EditorToolbar articleId={article.id} articleSlug={article.slug} />
              <EditorCommand className="bg-background z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border px-1 py-2 shadow-md">
                <EditorCommandEmpty className="text-muted-foreground px-2 text-sm">
                  No results
                </EditorCommandEmpty>
                <EditorCommandList>
                  {slashCommandItems.map((item) => (
                    <EditorCommandItem
                      key={item.title}
                      value={item.title}
                      onCommand={(val) => item.command?.(val)}
                      className="hover:bg-accent aria-selected:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                    >
                      <div className="bg-background flex size-8 items-center justify-center rounded-md border">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-xs">{item.description}</p>
                      </div>
                    </EditorCommandItem>
                  ))}
                </EditorCommandList>
              </EditorCommand>
            </EditorContent>
          </EditorRoot>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
        {/* AI review status — only for AI-generated articles */}
        {article.isAiGenerated && (
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Review status</span>
              {humanReviewedAt ? (
                <Chip
                  variant="success"
                  size="sm"
                  title={`Human reviewed ${formatDate(humanReviewedAt)}`}
                >
                  <BadgeCheckIcon className="mr-1 size-3" />
                  Reviewed
                </Chip>
              ) : (
                <Chip
                  variant="warning"
                  size="sm"
                  title="AI-generated article awaiting human review"
                >
                  Needs review
                </Chip>
              )}
            </div>
            <p className="text-muted-foreground mb-3 text-xs">
              This article was AI-generated.{' '}
              {humanReviewedAt
                ? 'It has been reviewed by an admin.'
                : 'Mark it reviewed once an admin has checked it.'}
            </p>
            <Button
              type="button"
              variant={humanReviewedAt ? 'quiet' : 'primary'}
              size="sm"
              className="w-full"
              onClick={handleToggleHumanReviewed}
              disabled={isPending || isReadOnly}
            >
              <BadgeCheckIcon className="mr-2 size-4" />
              {humanReviewedAt ? 'Mark back to Needs review' : 'Mark as reviewed'}
            </Button>
          </div>
        )}

        {/* Block outline */}
        {editorReady && editorRef.current && (
          <BlockOutlinePanel
            editor={editorRef.current}
            selectedBlocks={selectedBlockIndices}
            onSelectedBlocksChange={setSelectedBlockIndices}
          />
        )}

        {/* Dynamic blocks */}
        {editorReady && editorRef.current && (
          <DynamicBlocksPanel
            editor={editorRef.current}
            publishedBlocks={publishedDynamicBlocks ?? []}
            autoAttachedBlocks={autoAttachedDynamicBlocks ?? []}
            disabled={isReadOnly}
          />
        )}

        {/* Cover image */}
        <CoverImageUpload
          articleId={article.id}
          coverImageUrl={coverImageUrl}
          setCoverImageUrl={handleSetCoverImageUrl}
          coverImageVariants={coverImageVariants}
          setCoverImageVariants={setCoverImageVariants}
          coverImageQuality={coverImageQuality}
          setCoverImageQuality={setCoverImageQuality}
          coverImageSmartCrops={coverImageSmartCrops}
          setCoverImageSmartCrops={setCoverImageSmartCrops}
          setCoverImageFocalPoint={setCoverImageFocalPoint}
          setCoverImageDetectionData={setCoverImageDetectionData}
          onSmartCropsReady={() => setShowCropPreview(true)}
        />
        {coverImageUrl && coverImageSmartCrops && (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => setShowCropPreview(true)}
          >
            <CropIcon className="size-3.5" />
            View crops
          </Button>
        )}
        {coverImageUrl && !isDirty && (
          <Link
            href={`/admin/cover-photos?search=${encodeURIComponent(title)}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
          >
            <ImageIcon className="size-3" />
            Manage cover photo crops
          </Link>
        )}
        <CoverImageQuality
          coverImageUrl={coverImageUrl}
          variants={coverImageVariants}
          quality={coverImageQuality}
          onQualityChange={handleCoverQualityChange}
          onVariantsGenerated={handleCoverVariantsGenerated}
        />
        {coverImageUrl && (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="w-full gap-1.5"
            disabled={!coverImageUrl || isPending}
            onClick={() => {
              if (!confirm('This will regenerate all image variants and smart crops. Continue?'))
                return;
              startTransition(async () => {
                const result = await regenerateArticleImagesAction(article.id);
                if (result.error) {
                  toast.error(result.error);
                } else {
                  if (result.variants) {
                    setCoverImageVariants(result.variants as ImageVariants);
                    setCoverImageQuality('high');
                    const highVariant = (result.variants as ImageVariants).high;
                    if (highVariant) setCoverImageUrl(highVariant.url);
                  }
                  if (result.smartCrops) {
                    setCoverImageSmartCrops(result.smartCrops as SmartCrops);
                  }
                  toast.success('Images regenerated');
                }
              });
            }}
          >
            <RefreshCwIcon className="size-3.5" />
            Regenerate Images
          </Button>
        )}
        {selectedImage && editorRef.current && (
          <>
            <ImageQualitySidebar
              editor={editorRef.current}
              imageAttrs={selectedImage.attrs}
              imageName={selectedImage.name}
              nodeType={selectedImage.nodeType}
            />
            {selectedImage.nodeType === 'image' && (
              <Button
                type="button"
                variant="quiet"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  const editor = editorRef.current;
                  if (!editor) return;
                  const sel = editor.state.selection as unknown as {
                    from: number;
                    node?: { attrs: Record<string, unknown> };
                  };
                  if (!sel.node) return;
                  const pos = sel.from;
                  const imageAttrs = {
                    src: sel.node.attrs.src,
                    alt: sel.node.attrs.alt,
                    'data-original-src': sel.node.attrs['data-original-src'],
                    'data-quality': sel.node.attrs['data-quality'],
                    'data-variants': sel.node.attrs['data-variants'],
                  };
                  editor
                    .chain()
                    .focus()
                    .setNodeSelection(pos)
                    .deleteSelection()
                    .insertContentAt(pos, {
                      type: 'figureBlock',
                      attrs: imageAttrs,
                    })
                    .setNodeSelection(pos)
                    .run();
                }}
              >
                <Frame className="size-3.5" />
                Add Caption
              </Button>
            )}
          </>
        )}
        {editorRef.current && bodyImages.length > 0 && (
          <ArticleImagesList editor={editorRef.current} images={bodyImages} />
        )}

        <fieldset disabled={isReadOnly} className="space-y-6">
          {/* Primary category. The whole category group is wrapped in its own
              fieldset so a failed category read disables it without touching
              the rest of the sidebar. */}
          {/* The notice lives OUTSIDE the disabled fieldset below. Screen
              readers commonly skip disabled subtrees, so a notice nested inside
              one is invisible to exactly the users who most need told why the
              control does nothing. Kept adjacent so it still reads in place. */}
          {degraded.categories && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Primary Category</Label>
              <DegradedNotice label="categories" />
            </div>
          )}
          <fieldset disabled={degraded.categories} className="space-y-6 disabled:opacity-60">
            <div className="space-y-2">
              {!degraded.categories && (
                <Label className="text-sm font-semibold">Primary Category</Label>
              )}
              <CategorySelect
                categories={categories}
                value={primaryCategoryId}
                onValueChange={handlePrimaryCategoryChange}
                placeholder="Select category"
              />
            </div>

            {/* Secondary categories */}
            {primaryCategoryId && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Secondary Categories</Label>
                <p className="text-muted-foreground text-xs">
                  Article will also appear on these category pages
                </p>
                <CategoryMultiSelect
                  categories={categories}
                  primaryCategoryId={primaryCategoryId}
                  selectedIds={secondaryCategoryIds}
                  onChange={handleSecondaryCategoryChange}
                />
              </div>
            )}

            {/* Tertiary categories */}
            {secondaryCategoryIds.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tertiary Categories</Label>
                <p className="text-muted-foreground text-xs">
                  Specific sub-categories for finer cross-listing
                </p>
                <CategoryTertiarySelect
                  categories={categories}
                  secondaryCategoryIds={secondaryCategoryIds}
                  selectedIds={tertiaryCategoryIds}
                  onChange={handleTertiaryCategoryChange}
                />
              </div>
            )}
          </fieldset>

          {/* Author. Deliberately OUTSIDE the category fieldset: a failed
              category read must not disable attribution, which is an
              independent field with an independent read. */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Author</Label>
            <Select value={authorId} onValueChange={setAuthorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select author" />
              </SelectTrigger>
              <SelectContent>
                {selectableAuthors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    {a.isHouseAccount ? ' (house)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Public authors get a linked byline and an archive page. The house account stays
              unlinked — pick it to remove a personal credit.
            </p>
          </div>

          {/* Tags */}
          {/* Outside the disabled fieldset — see the categories notice above. */}
          {degraded.tags && (
            <div className="space-y-2">
              <Label variant="inline" className="text-sm font-semibold">
                Tags
              </Label>
              <DegradedNotice label="tags" />
            </div>
          )}
          <fieldset disabled={degraded.tags} className="space-y-2 disabled:opacity-60">
            {!degraded.tags && (
              <Label variant="inline" className="text-sm font-semibold">
                Tags
              </Label>
            )}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <Chip key={tag.id} variant="outline" size="sm" className="gap-1 pr-1">
                    {tag.name}
                    {tag.isHidden && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        Hidden
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => handleTagRemove(tag.id)}
                      aria-label={`Remove tag ${tag.name}`}
                      className="hover:bg-muted-foreground/20 ml-0.5 rounded-full p-0.5"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Chip>
                ))}
              </div>
            )}
            <div className="relative" ref={tagComboboxRef}>
              <Input
                role="combobox"
                aria-expanded={tagSearchOpen}
                aria-controls="tag-listbox"
                aria-autocomplete="list"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setTagSearch(e.target.value);
                  if (!tagSearchOpen) setTagSearchOpen(true);
                }}
                onFocus={() => setTagSearchOpen(true)}
                className="h-9 text-sm"
              />
              {tagSearchOpen && (
                <div
                  id="tag-listbox"
                  role="listbox"
                  className="bg-popover absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border shadow-md"
                >
                  {availableTags.length > 0 ? (
                    availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                        onClick={() => {
                          handleTagToggle(tag.id);
                          setTagSearch('');
                        }}
                      >
                        {tag.name}
                        {tag.isHidden && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            Hidden
                          </Badge>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-muted-foreground px-3 py-2 text-sm">
                      {tagSearch
                        ? 'No matching tags'
                        : allTags.length === 0
                          ? 'No tags available'
                          : 'All tags selected'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </fieldset>

          {/* Slug */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Slug</Label>
            <Input
              value={slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlug(e.target.value)}
              className="text-sm"
            />
            {/* publishedAt catches formerly-published articles being edited in
                another status — the server creates the redirect for those too. */}
            {slug !== initialValues.current.slug &&
              (status === 'published' || Boolean(publishedAt)) && (
                <p className="text-muted-foreground text-xs">
                  The old URL will automatically 301-redirect to the new one when you save.
                </p>
              )}
          </div>

          {/* Dates (MYT) — Published is auto-set on publish; Last Updated drives the
            public visible date + SEO freshness (dateModified, sitemap lastmod). */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Dates (MYT)</Label>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Published</Label>
              <Input
                type="datetime-local"
                value={publishedAt ? toMYTDatetimeLocal(publishedAt) : ''}
                onChange={(e) =>
                  setPublishedAt(e.target.value ? fromMYTDatetimeLocal(e.target.value) : '')
                }
                disabled={status === 'draft' || isReadOnly}
                className="text-sm"
              />
              {status === 'draft' && (
                <p className="text-muted-foreground text-xs">
                  Set automatically when the article is published.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs">Last Updated</Label>
                <button
                  type="button"
                  onClick={() => setUpdatedAt(new Date().toISOString())}
                  disabled={isReadOnly}
                  className="text-muted-foreground hover:text-foreground text-xs underline disabled:opacity-50"
                >
                  Set to now
                </button>
              </div>
              <Input
                type="datetime-local"
                value={updatedAt ? toMYTDatetimeLocal(updatedAt) : ''}
                onChange={(e) =>
                  setUpdatedAt(e.target.value ? fromMYTDatetimeLocal(e.target.value) : '')
                }
                disabled={isReadOnly}
                className="text-sm"
              />
              <p className="text-muted-foreground text-xs">
                Shown on the public article and used for SEO freshness.
              </p>
            </div>
          </div>

          {/* Pinterest Board Name — compulsory for real weddings */}
          {isRealWeddingsArticle && (
            <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50/50 p-3">
              <Label className="text-sm font-semibold">
                Pinterest Board Name <span className="text-red-500">*</span>
                <span className="text-muted-foreground float-right text-xs font-normal">
                  {pinterestBoardName.length}/49
                </span>
              </Label>
              <Input
                value={pinterestBoardName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPinterestBoardName(e.target.value)
                }
                placeholder="Short board title (< 50 chars) for the Pinterest export"
                maxLength={49}
                disabled={isReadOnly}
                className="text-sm"
                aria-invalid={!pinterestBoardName.trim()}
              />
              {!pinterestBoardName.trim() && (
                <p className="flex items-start gap-1.5 text-xs text-red-600">
                  <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                  Required for Real Weddings — used as the Pinterest board title.
                </p>
              )}
            </div>
          )}

          {/* SEO Meta */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSeoOpen(!seoOpen)}
              className="flex w-full items-center gap-2 text-sm font-semibold"
            >
              <ChevronDownIcon
                className={`size-4 transition-transform ${seoOpen ? '' : '-rotate-90'}`}
              />
              SEO
              {!metaDescription && (
                <AlertTriangleIcon
                  className="text-warning size-3.5"
                  aria-label="Missing meta description"
                />
              )}
            </button>
            {seoOpen && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Meta Title <span className="float-right">{metaTitle.length}/70</span>
                  </Label>
                  <Input
                    value={metaTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMetaTitle(e.target.value)
                    }
                    placeholder="Leave blank to auto-generate from title"
                    maxLength={70}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Meta Description{' '}
                    <span className="float-right">{metaDescription.length}/160</span>
                  </Label>
                  <Textarea
                    value={metaDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setMetaDescription(e.target.value)
                    }
                    placeholder="Recommended — used for Google search results and social sharing"
                    maxLength={160}
                    rows={3}
                    className="text-sm"
                  />
                  {!metaDescription && (
                    <p className="text-warning flex items-start gap-1.5 text-xs">
                      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                      Recommended for SEO. We&apos;ll auto-fill from your excerpt or article body if
                      blank.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

        </fieldset>

        {/* Delete actions */}
        <div className="mt-6 space-y-2 border-t pt-6">
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="text-destructive hover:text-destructive w-full gap-1.5"
            disabled={isPending}
            onClick={() => {
              if (!confirm('Delete this article? (Articles with media will be soft-deleted)'))
                return;
              startTransition(async () => {
                const result = await deleteArticleAction(article.id);
                if (result.error) {
                  toast.error(result.error);
                } else {
                  toast.success('Article deleted');
                  router.push('/admin/inspire');
                }
              });
            }}
          >
            <Trash2Icon className="size-3.5" />
            Delete
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full gap-1.5"
            disabled={isPending}
            onClick={() => {
              if (
                !confirm(
                  'MASTER DELETE: This will permanently delete the article, ALL media, and ALL R2 files. This cannot be undone. Continue?',
                )
              )
                return;
              startTransition(async () => {
                const result = await masterDeleteArticleAction(article.id);
                if (result.error) {
                  toast.error(result.error);
                } else {
                  toast.success('Article and all associated data permanently deleted');
                  router.push('/admin/inspire');
                }
              });
            }}
          >
            <Trash2Icon className="size-3.5" />
            Master Delete
          </Button>
        </div>
      </div>

      {/* Redirect history */}
      <RedirectHistory articleId={article.id} articleSlug={slug} entries={redirectHistory ?? []} />

      {/* Smart crop dialogs */}
      <SmartCropPreviewDialog
        open={showCropPreview}
        onOpenChange={setShowCropPreview}
        smartCrops={coverImageSmartCrops}
        onRequestManualCrop={() => setShowManualCrop(true)}
      />
      {coverImageUrl && coverImageVariants?.original?.url && (
        <SmartCropManualOverride
          open={showManualCrop}
          onOpenChange={setShowManualCrop}
          originalImageUrl={coverImageVariants.original.url}
          currentFocalPoint={coverImageFocalPoint}
          originalKey={extractR2Key(coverImageVariants.original.url)}
          onApply={({ focalPointOverride, smartCrops }) => {
            setCoverImageFocalPointOverride(focalPointOverride);
            setCoverImageSmartCrops(smartCrops);
            setShowCropPreview(true);
          }}
        />
      )}
    </div>
  );
}
