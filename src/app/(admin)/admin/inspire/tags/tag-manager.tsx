'use client';

import { useState, useEffect, useRef, useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExternalLinkIcon,
  MergeIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Chip } from '@/components/ui/chip';
import { ConsoleTable } from '@/components/ui/console-table';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  createTagAction,
  updateTagAction,
  deleteTagAction,
  flushInspireCacheAction,
} from './actions';
import { toast } from 'sonner';

interface Tag {
  id: string;
  name: string;
  slug: string;
  wpId: number | null;
  isHidden: boolean;
  articleCount: number;
}

interface TagManagerProps {
  tags: Tag[];
  searchParams: { search?: string; page?: string };
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export function TagManager({
  tags,
  searchParams,
  currentPage,
  totalPages,
  totalCount,
}: TagManagerProps) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value) params.set('search', value);
      router.push(`/admin/inspire/tags?${params.toString()}`);
    }, 300);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    if (newPage > 1) params.set('page', String(newPage));
    router.push(`/admin/inspire/tags?${params.toString()}`);
  }

  function handleDelete(tag: Tag) {
    if (!confirm(`Delete "${tag.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteTagAction(tag.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Tag deleted');
      }
    });
  }

  function handleFlushCache() {
    startTransition(async () => {
      const result = await flushInspireCacheAction();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Inspire cache flushed');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-mono font-medium tabular-nums">{totalCount}</span>{' '}
          tags
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search tags..."
            defaultValue={searchParams.search ?? ''}
            className="max-w-xs"
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || value.length >= 2) {
                handleSearch(value);
              } else {
                if (debounceRef.current) clearTimeout(debounceRef.current);
              }
            }}
          />
          <Button variant="quiet" size="sm" onClick={handleFlushCache} disabled={isPending}>
            <RefreshCwIcon className="mr-1 size-4" />
            Flush Cache
          </Button>
          <Button variant="quiet" size="sm" asChild>
            <Link href="/admin/inspire/tags/merge">
              <MergeIcon className="mr-1 size-4" />
              Merge Duplicates
            </Link>
          </Button>
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <PlusIcon className="mr-1 size-4" />
            Add Tag
          </Button>
        </div>
      </div>

      {tags.length === 0 ? (
        <div className="bg-card rounded-card border-hairline border">
          <EmptyState
            title={searchParams.search ? 'No tags match your search' : 'No tags yet'}
            description={
              searchParams.search ? 'Try a different search term.' : 'Add one to get started.'
            }
          />
        </div>
      ) : (
        <div className="bg-card rounded-card border-hairline overflow-hidden border">
          <ConsoleTable>
            <thead>
              <tr>
                <th>Tag</th>
                <th className="num">Articles</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id}>
                  <td>
                    <span className="font-semibold">{tag.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">/{tag.slug}</span>
                    {tag.isHidden && (
                      <Chip variant="outline" size="sm" className="ml-2">
                        Hidden
                      </Chip>
                    )}
                  </td>
                  <td className="num">
                    <Chip variant="solid" size="sm">
                      {tag.articleCount}
                    </Chip>
                  </td>
                  <td className="actions">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/artikel/tag/${tag.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon" className="size-8">
                          <ExternalLinkIcon className="size-3.5" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingTag(tag)}
                      >
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-8"
                        onClick={() => handleDelete(tag)}
                        disabled={isPending}
                      >
                        <TrashIcon className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </ConsoleTable>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-mono tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="quiet"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="quiet"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <TagFormDialog open={showAddForm} onOpenChange={setShowAddForm} mode="create" />

      {/* Edit Dialog */}
      {editingTag && (
        <TagFormDialog
          open={!!editingTag}
          onOpenChange={(open) => !open && setEditingTag(null)}
          mode="edit"
          tag={editingTag}
        />
      )}
    </div>
  );
}

function TagFormDialog({
  open,
  onOpenChange,
  mode,
  tag,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  tag?: Tag;
}) {
  const action = mode === 'create' ? createTagAction : updateTagAction;
  const [state, formAction, pending] = useActionState(action, null);

  // Close on success
  useEffect(() => {
    if (state && 'success' in state && state.success) {
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Tag' : 'Edit Tag'}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-5">
          {mode === 'edit' && tag && <input type="hidden" name="id" value={tag.id} />}
          {/* Sentinel — an unchecked checkbox is absent from FormData, which is
              indistinguishable from "field not submitted". This marks the
              isHidden checkbox as part of the submission so the action can tell
              "unchecked" from "omitted". */}
          <input type="hidden" name="isHiddenPresent" value="1" />
          <FormField label="Name" htmlFor="name" required>
            <Input id="name" name="name" defaultValue={tag?.name} required />
          </FormField>
          <FormField label="Slug" htmlFor="slug" hint="Leave blank to generate one from the name.">
            <Input
              id="slug"
              name="slug"
              defaultValue={tag?.slug}
              placeholder="Auto-generated from name"
            />
          </FormField>
          <div className="border-hairline rounded-[8px] border p-3.5">
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                name="isHidden"
                defaultChecked={tag?.isHidden ?? false}
                className="border-hairline mt-0.5 size-4 rounded"
              />
              <span>
                <span className="block text-[12.5px] font-semibold">Hidden from front end</span>
                <span className="text-muted-foreground block text-[11.5px]">
                  Admin-only tag. Still assignable to articles, but never shown to readers and its
                  archive page returns 404.
                </span>
              </span>
            </label>
          </div>
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
