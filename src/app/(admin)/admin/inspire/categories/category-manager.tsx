'use client';

import { useState, useEffect, useActionState, useTransition } from 'react';
import Link from 'next/link';
import { PlusIcon, PencilIcon, TrashIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { EmptyState } from '@/components/ui/empty-state';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from './actions';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  displayOrder: number | null;
  wpId: number | null;
  articleCount: number;
}

interface TreeNode extends Category {
  children: TreeNode[];
  depth: number;
}

interface CategoryManagerProps {
  categories: Category[];
}

function computeDepth(categoryId: string, categories: Category[]): number {
  const map = new Map(categories.map((c) => [c.id, c]));
  let depth = 1;
  let current = map.get(categoryId);
  while (current?.parentId) {
    depth++;
    current = map.get(current.parentId);
  }
  return depth;
}

function buildTree(categories: Category[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [], depth: computeDepth(cat.id, categories) });
  }
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else if (!node.parentId) {
      roots.push(node);
    }
  }
  // Sort children by displayOrder
  for (const node of map.values()) {
    node.children.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }
  roots.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  return roots;
}

function getDescendantIds(categoryId: string, categories: Category[]): Set<string> {
  const ids = new Set<string>();
  function collect(parentId: string) {
    for (const c of categories) {
      if (c.parentId === parentId) {
        ids.add(c.id);
        collect(c.id);
      }
    }
  }
  collect(categoryId);
  return ids;
}

const DEPTH_LABELS: Record<number, string> = { 1: 'Primary', 2: 'Secondary', 3: 'Tertiary' };
const DEPTH_COLORS: Record<number, string> = {
  1: 'bg-chart-1/15 text-chart-1',
  2: 'bg-chart-2/15 text-chart-2',
  3: 'bg-chart-3/15 text-chart-3',
};

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(categories.map((c) => c.id)));

  const tree = buildTree(categories);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete(category: Category) {
    if (!confirm(`Delete "${category.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Category deleted');
      }
    });
  }

  /** Get valid parent options for the form dialog. */
  function getParentOptions(excludeCategoryId?: string): (Category & { depth: number })[] {
    return categories
      .map((c) => ({ ...c, depth: computeDepth(c.id, categories) }))
      .filter((c) => {
        // Exclude depth 3 categories (can't have children)
        if (c.depth >= 3) return false;
        // When editing, exclude the category itself and its descendants
        if (excludeCategoryId) {
          if (c.id === excludeCategoryId) return false;
          if (getDescendantIds(excludeCategoryId, categories).has(c.id)) return false;
        }
        return true;
      });
  }

  function renderNode(node: TreeNode) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const indent = node.depth === 1 ? 'pl-4' : node.depth === 2 ? 'pl-12' : 'pl-20';

    return (
      <div key={node.id}>
        <div
          className={`flex items-center justify-between px-4 py-2.5 ${indent} border-hairline border-b last:border-b-0 ${Number(node.articleCount) === 0 ? 'bg-error-subtle hover:bg-error/20' : 'hover:bg-muted'}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {hasChildren ? (
              <button type="button" onClick={() => toggleExpanded(node.id)} className="shrink-0">
                <ChevronRightIcon
                  className={`text-muted-foreground size-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            ) : (
              <span className="size-4 shrink-0" />
            )}
            <span className={node.depth === 1 ? 'font-medium' : 'text-sm'}>{node.name}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${DEPTH_COLORS[node.depth] ?? ''}`}
            >
              {DEPTH_LABELS[node.depth]}
            </span>
            <span className="text-muted-foreground text-xs">/{node.slug}</span>
            {Number(node.articleCount) > 0 ? (
              <Link
                href={`/admin/inspire?categoryId=${node.id}`}
                className="text-muted-foreground hover:text-foreground text-xs hover:underline"
              >
                <span className="font-mono tabular-nums">{node.articleCount}</span> article
                {Number(node.articleCount) !== 1 ? 's' : ''}
              </Link>
            ) : (
              <span className="text-muted-foreground text-xs">
                <span className="font-mono tabular-nums">0</span> articles
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setEditingCategory(node)}
            >
              <PencilIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive size-8"
              onClick={() => handleDelete(node)}
              disabled={isPending}
            >
              <TrashIcon className="size-3.5" />
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded && node.children.map(renderNode)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-mono font-medium tabular-nums">
            {categories.length}
          </span>{' '}
          categories
        </p>
        <Button onClick={() => setShowAddForm(true)} size="sm">
          <PlusIcon className="mr-1 size-4" />
          Add Category
        </Button>
      </div>

      {/* Category tree */}
      <div className="bg-card rounded-card border-hairline overflow-hidden border">
        {tree.map(renderNode)}
        {categories.length === 0 && (
          <EmptyState title="No categories yet" description="Add one to get started." />
        )}
      </div>

      {/* Add Dialog */}
      <CategoryFormDialog
        open={showAddForm}
        onOpenChange={setShowAddForm}
        parentOptions={getParentOptions()}
        mode="create"
      />

      {/* Edit Dialog */}
      {editingCategory && (
        <CategoryFormDialog
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          parentOptions={getParentOptions(editingCategory.id)}
          mode="edit"
          category={editingCategory}
        />
      )}
    </div>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  parentOptions,
  mode,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentOptions: (Category & { depth: number })[];
  mode: 'create' | 'edit';
  category?: Category;
}) {
  const action = mode === 'create' ? createCategoryAction : updateCategoryAction;
  const [state, formAction, pending] = useActionState(action, null);

  // Close on success
  useEffect(() => {
    if (state && 'success' in state && state.success) {
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  // Build indented label for parent options
  const indentPrefix = (depth: number) =>
    depth === 1 ? '' : depth === 2 ? '\u2014 ' : '\u2014\u2014 ';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Category' : 'Edit Category'}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-5">
          {mode === 'edit' && category && <input type="hidden" name="id" value={category.id} />}
          <FormField label="Name" htmlFor="name" required>
            <Input id="name" name="name" defaultValue={category?.name} required />
          </FormField>
          <FormField label="Slug" htmlFor="slug" hint="Leave blank to generate one from the name.">
            <Input
              id="slug"
              name="slug"
              defaultValue={category?.slug}
              placeholder="Auto-generated from name"
            />
          </FormField>
          <FormField label="Description" htmlFor="description">
            <Input id="description" name="description" defaultValue={category?.description ?? ''} />
          </FormField>
          <FormField label="Parent category" htmlFor="parentId">
            <Select name="parentId" defaultValue={category?.parentId ?? 'none'}>
              <SelectTrigger>
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level)</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {indentPrefix(p.depth)}
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {state && 'error' in state && state.error && (
            <p className="text-error text-[13px]">{state.error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="quiet" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
