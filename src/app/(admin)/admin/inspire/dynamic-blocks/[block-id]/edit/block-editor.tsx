'use client';

import { useState, useEffect, useRef, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { JSONContent, EditorInstance } from 'novel';
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
  FileText,
  Table2,
  MousePointerClick,
  XIcon,
  Trash2Icon,
  SearchIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { createArticleBaseExtensions } from '@/lib/tiptap/article-extensions';
import { EditorToolbar } from '@/components/inspire/editor-toolbar';
import { LinkBubbleMenu } from '@/components/inspire/link-bubble-menu';
import { TableBubbleMenu } from '@/components/inspire/table-bubble-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { SectionCard } from '@/components/ui/section-card';
import { FormField } from '@/components/ui/form-field';
import { StatusChip } from '@/lib/ui/status-chip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  updateDynamicBlockAction,
  deleteDynamicBlockAction,
  searchArticlesForRuleAction,
} from '../../actions';

interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
}

interface TagOption {
  id: string;
  name: string;
}

interface ArticleRule {
  id: string;
  title: string;
}

interface BlockEditorProps {
  block: {
    id: string;
    name: string;
    content: unknown;
    placement: 'start' | 'end';
    status: 'draft' | 'published';
    isActive: boolean;
    displayOrder: number;
  };
  categories: CategoryOption[];
  allTags: TagOption[];
  initialCategoryIds: string[];
  initialTagIds: string[];
  initialArticleRules: ArticleRule[];
}

const extensions = [
  ...createArticleBaseExtensions(),
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
        const $from = state.doc.resolve(range.from);
        return $from.parent.isTextblock;
      },
    },
  }),
];

// Same vocabulary as the article editor minus image upload (images come in via
// the toolbar's media picker — blocks have no per-article upload target).
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

export function BlockEditorLoader(props: BlockEditorProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="bg-muted rounded-card border-hairline min-h-[500px] animate-pulse border" />
    );
  }

  return <BlockEditor {...props} />;
}

function BlockEditor({
  block,
  categories,
  allTags,
  initialCategoryIds,
  initialTagIds,
  initialArticleRules,
}: BlockEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<EditorInstance | null>(null);

  const [name, setName] = useState(block.name);
  const [placement, setPlacement] = useState<'start' | 'end'>(block.placement);
  const [status, setStatus] = useState<'draft' | 'published'>(block.status);
  const [isActive, setIsActive] = useState(block.isActive);
  const [displayOrder, setDisplayOrder] = useState(String(block.displayOrder));
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds);
  const [articleRules, setArticleRules] = useState<ArticleRule[]>(initialArticleRules);

  const [tagQuery, setTagQuery] = useState('');
  const [articleQuery, setArticleQuery] = useState('');
  const [articleResults, setArticleResults] = useState<
    { id: string; title: string; slug: string; status: string }[]
  >([]);
  const articleSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest input value — stale async responses are discarded against this.
  const articleQueryRef = useRef('');

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const tagsById = useMemo(() => new Map(allTags.map((t) => [t.id, t])), [allTags]);

  const tagMatches = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (q.length < 1) return [];
    return allTags
      .filter((t) => t.name.toLowerCase().includes(q) && !tagIds.includes(t.id))
      .slice(0, 8);
  }, [allTags, tagQuery, tagIds]);

  useEffect(() => {
    return () => {
      if (articleSearchTimer.current) clearTimeout(articleSearchTimer.current);
    };
  }, []);

  const handleArticleQueryChange = (value: string) => {
    setArticleQuery(value);
    articleQueryRef.current = value;
    if (articleSearchTimer.current) clearTimeout(articleSearchTimer.current);
    if (value.trim().length < 2) {
      setArticleResults([]);
      return;
    }
    articleSearchTimer.current = setTimeout(async () => {
      const results = await searchArticlesForRuleAction(value);
      // Discard responses for queries the user has since moved past.
      if (articleQueryRef.current !== value) return;
      setArticleResults(results);
    }, 300);
  };

  // Dedupe against the CURRENT rules at render time (not when the async
  // search resolved) so adding a rule immediately hides it from results.
  const visibleArticleResults = articleResults.filter(
    (r) => !articleRules.some((a) => a.id === r.id),
  );

  const handleSave = () => {
    const parsedOrder = parseInt(displayOrder, 10);
    // JSON round-trip is critical: ProseMirror attrs are frozen null-prototype
    // objects that React Server Action serialization silently drops.
    const rawContent = editorRef.current?.getJSON() ?? block.content;
    const content = JSON.parse(JSON.stringify(rawContent)) as JSONContent;

    startTransition(async () => {
      const result = await updateDynamicBlockAction(block.id, {
        name,
        content,
        placement,
        status,
        isActive,
        displayOrder: Number.isFinite(parsedOrder) ? parsedOrder : 0,
        categoryIds,
        tagIds,
        articleIds: articleRules.map((a) => a.id),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Block saved');
      }
    });
  };

  const handleDelete = () => {
    if (!confirm('Delete this block? Articles embedding it will simply stop rendering it.')) return;
    startTransition(async () => {
      const result = await deleteDynamicBlockAction(block.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Block deleted');
        router.push('/admin/inspire/dynamic-blocks');
      }
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Block name"
            className="max-w-md text-lg font-semibold"
          />
          <div className="flex items-center gap-2">
            <StatusChip
              status={status}
              variant={status === 'published' ? 'success' : 'solid'}
              label={status === 'published' ? 'Published' : 'Draft'}
            />
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-card border-hairline overflow-hidden border">
          <EditorRoot>
            <EditorContent
              extensions={extensions}
              initialContent={block.content as JSONContent}
              onCreate={({ editor }) => {
                editorRef.current = editor;
              }}
              onUpdate={({ editor }) => {
                editorRef.current = editor;
              }}
              editorProps={{
                attributes: {
                  class: 'prose max-w-none p-4 focus:outline-none min-h-[450px]',
                },
                handleDOMEvents: {
                  keydown: (_view, event) => handleCommandNavigation(event),
                },
              }}
            >
              <LinkBubbleMenu />
              <TableBubbleMenu />
              <EditorToolbar />
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
        <p className="text-muted-foreground text-xs">
          Block content renders inside matching articles with the exact article typography — no
          extra wrappers or padding.
        </p>
      </div>

      {/* Right sidebar */}
      <div className="space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
        {/* Settings */}
        <SectionCard title="Settings" bodyClassName="space-y-4">
          <FormField label="Status" htmlFor="block-status">
            <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'published')}>
              <SelectTrigger id="block-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Placement" htmlFor="block-placement">
            <Select value={placement} onValueChange={(v) => setPlacement(v as 'start' | 'end')}>
              <SelectTrigger id="block-placement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">Start of article</SelectItem>
                <SelectItem value="end">End of article</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Display order"
            htmlFor="block-order"
            hint="Lower numbers render first when multiple blocks match the same article."
          >
            <Input
              id="block-order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
            />
          </FormField>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Checkbox
                id="block-active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              {/* Kept as a bare label — FormField stacks label above control, but
                  a checkbox reads better with the label inline beside it. */}
              <Label htmlFor="block-active" className="font-normal">
                Active
              </Label>
            </div>
            <p className="text-muted-foreground text-[11.5px]">
              Inactive blocks never render publicly — a kill switch that keeps rules and content.
            </p>
          </div>
        </SectionCard>

        {/* Targeting rules */}
        <SectionCard title="Targeting rules" bodyClassName="space-y-4">
          <p className="text-muted-foreground text-[12.5px]">
            The block auto-injects into every published article matching any rule. Category rules
            match primary and secondary categories (exact, no descendants).
          </p>

          {/* Category rules */}
          <FormField label="Categories">
            <Select
              value=""
              onValueChange={(id) => {
                if (id) setCategoryIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add a category…" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((c) => !categoryIds.includes(c.id))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.parentId ? `— ${c.name}` : c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {categoryIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {categoryIds.map((id) => (
                  <Chip key={id} size="sm">
                    {categoriesById.get(id)?.name ?? 'Unknown'}
                    <button
                      type="button"
                      aria-label="Remove category rule"
                      onClick={() => setCategoryIds((prev) => prev.filter((c) => c !== id))}
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Chip>
                ))}
              </div>
            )}
          </FormField>

          {/* Tag rules */}
          <FormField label="Tags" htmlFor="block-tag-search">
            <Input
              id="block-tag-search"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              placeholder="Search tags…"
            />
            {tagMatches.length > 0 && (
              <div className="bg-card rounded-card border-hairline overflow-hidden border">
                {tagMatches.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="hover:bg-muted block w-full px-2.5 py-1.5 text-left text-[13.5px]"
                    onClick={() => {
                      setTagIds((prev) => [...prev, tag.id]);
                      setTagQuery('');
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
            {tagIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {tagIds.map((id) => (
                  <Chip key={id} size="sm">
                    {tagsById.get(id)?.name ?? 'Unknown'}
                    <button
                      type="button"
                      aria-label="Remove tag rule"
                      onClick={() => setTagIds((prev) => prev.filter((t) => t !== id))}
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Chip>
                ))}
              </div>
            )}
          </FormField>

          {/* Article rules */}
          <FormField label="Specific articles" htmlFor="block-article-search">
            <div className="relative">
              <SearchIcon className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                id="block-article-search"
                value={articleQuery}
                onChange={(e) => handleArticleQueryChange(e.target.value)}
                placeholder="Search articles…"
                className="pl-8"
              />
            </div>
            {visibleArticleResults.length > 0 && (
              <div className="bg-card rounded-card border-hairline overflow-hidden border">
                {visibleArticleResults.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="hover:bg-muted block w-full px-2.5 py-1.5 text-left text-[13.5px]"
                    onClick={() => {
                      setArticleRules((prev) => [...prev, { id: a.id, title: a.title }]);
                      setArticleResults([]);
                      setArticleQuery('');
                      articleQueryRef.current = '';
                      if (articleSearchTimer.current) clearTimeout(articleSearchTimer.current);
                    }}
                  >
                    <span className="line-clamp-1">{a.title}</span>
                    <span className="text-muted-foreground text-xs">{a.status}</span>
                  </button>
                ))}
              </div>
            )}
            {articleRules.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {articleRules.map((a) => (
                  <Chip key={a.id} size="sm" className="max-w-full">
                    <span className="line-clamp-1">{a.title}</span>
                    <button
                      type="button"
                      aria-label="Remove article rule"
                      onClick={() => setArticleRules((prev) => prev.filter((r) => r.id !== a.id))}
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Chip>
                ))}
              </div>
            )}
          </FormField>
        </SectionCard>

        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive w-full"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2Icon className="mr-1.5 size-4" />
          Delete block
        </Button>
      </div>
    </div>
  );
}
