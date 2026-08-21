'use client';

import { useState, useCallback, useTransition } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { PlusIcon, ChevronDownIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { SortableNavItem, type NavItemData } from './sortable-nav-item';
import { NavPreview } from './nav-preview';
import {
  createNavItemAction,
  updateNavItemAction,
  deleteNavItemAction,
  toggleNavItemActiveAction,
  reorderNavItemsAction,
} from './actions';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface NavManagerProps {
  items: NavItemData[];
  availableCategories: CategoryOption[];
}

export function NavManager({
  items: initialItems,
  availableCategories: initialCategories,
}: NavManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [availableCategories, setAvailableCategories] = useState(initialCategories);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set(initialItems.filter((i) => !i.parentId).map((i) => i.id)),
  );
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<'category' | 'custom_link'>('category');
  const [addLabel, setAddLabel] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addCategoryId, setAddCategoryId] = useState('');
  const [addParentId, setAddParentId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const [editItem, setEditItem] = useState<NavItemData | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const [deleteItem, setDeleteItem] = useState<NavItemData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const topLevelItems = items.filter((i) => !i.parentId).sort((a, b) => a.position - b.position);

  const getChildren = useCallback(
    (parentId: string) =>
      items.filter((i) => i.parentId === parentId).sort((a, b) => a.position - b.position),
    [items],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // --- DnD ---
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeItem = items.find((i) => i.id === active.id);
      const overItem = items.find((i) => i.id === over.id);
      if (!activeItem || !overItem) return;

      // Only reorder within the same level
      if (activeItem.parentId !== overItem.parentId) return;

      const parentId = activeItem.parentId;
      const siblings = parentId
        ? items.filter((i) => i.parentId === parentId).sort((a, b) => a.position - b.position)
        : topLevelItems;

      const oldIndex = siblings.findIndex((i) => i.id === active.id);
      const newIndex = siblings.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(siblings, oldIndex, newIndex);
      const updatedItems = items.map((item) => {
        const idx = reordered.findIndex((r) => r.id === item.id);
        if (idx !== -1) return { ...item, position: idx };
        return item;
      });
      setItems(updatedItems);

      startTransition(async () => {
        const result = await reorderNavItemsAction(
          reordered.map((r) => r.id),
          parentId,
        );
        if ('error' in result) {
          toast.error(result.error);
          setItems(items); // rollback
        }
      });
    },
    [items, topLevelItems],
  );

  // --- Toggle active ---
  const handleToggleActive = useCallback(
    (id: string) => {
      const prev = items;
      setItems((cur) => cur.map((i) => (i.id === id ? { ...i, isActive: !i.isActive } : i)));
      startTransition(async () => {
        const result = await toggleNavItemActiveAction(id);
        if ('error' in result) {
          toast.error(result.error);
          setItems(prev);
        }
      });
    },
    [items],
  );

  // --- Add ---
  const openAddDialog = useCallback((parentId?: string) => {
    setAddType(parentId ? 'custom_link' : 'category');
    setAddLabel('');
    setAddUrl('');
    setAddCategoryId('');
    setAddParentId(parentId ?? '');
    setCategorySearch('');
    setShowAddDialog(true);
  }, []);

  const getCategoryParentName = useCallback(
    (parentId: string | null) => {
      if (!parentId) return null;
      return (
        availableCategories.find((c) => c.id === parentId)?.name ??
        initialCategories.find((c) => c.id === parentId)?.name ??
        null
      );
    },
    [availableCategories, initialCategories],
  );

  const filteredCategoryOptions = availableCategories.filter((cat) => {
    if (!categorySearch) return true;
    const search = categorySearch.toLowerCase();
    const parentName = getCategoryParentName(cat.parentId)?.toLowerCase() ?? '';
    return cat.name.toLowerCase().includes(search) || parentName.includes(search);
  });

  const selectedCategoryName = availableCategories.find((c) => c.id === addCategoryId)?.name;

  const handleCategorySelect = useCallback((cat: CategoryOption) => {
    setAddCategoryId(cat.id);
    setAddLabel(cat.name);
    setCategorySearch('');
  }, []);

  const handleAdd = useCallback(() => {
    startTransition(async () => {
      const result = await createNavItemAction({
        type: addType,
        label: addLabel,
        categoryId: addType === 'category' ? addCategoryId : undefined,
        url: addType === 'custom_link' ? addUrl : undefined,
        parentId: addParentId || undefined,
      });
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Nav item added');
        setShowAddDialog(false);
        // Reload page to get fresh data
        window.location.reload();
      }
    });
  }, [addType, addLabel, addCategoryId, addUrl, addParentId]);

  // --- Edit ---
  const openEditDialog = useCallback((item: NavItemData) => {
    setEditItem(item);
    setEditLabel(item.label);
    setEditUrl(item.url ?? '');
  }, []);

  const handleEdit = useCallback(() => {
    if (!editItem) return;
    const prev = items;
    setItems((cur) =>
      cur.map((i) => (i.id === editItem.id ? { ...i, label: editLabel, url: editUrl || null } : i)),
    );
    setEditItem(null);
    startTransition(async () => {
      const result = await updateNavItemAction(editItem.id, { label: editLabel, url: editUrl });
      if ('error' in result) {
        toast.error(result.error);
        setItems(prev);
      } else {
        toast.success('Nav item updated');
      }
    });
  }, [editItem, editLabel, editUrl, items]);

  // --- Delete ---
  const handleDelete = useCallback(() => {
    if (!deleteItem) return;
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== deleteItem.id && i.parentId !== deleteItem.id));
    // If it was a category, add it back to available
    if (deleteItem.type === 'category' && deleteItem.categoryId) {
      setAvailableCategories((cur) => [
        ...cur,
        {
          id: deleteItem.categoryId!,
          name: deleteItem.label,
          slug: deleteItem.categorySlug ?? '',
          parentId: deleteItem.parentId,
        },
      ]);
    }
    setDeleteItem(null);
    startTransition(async () => {
      const result = await deleteNavItemAction(deleteItem.id);
      if ('error' in result) {
        toast.error(result.error);
        setItems(prev);
      } else {
        toast.success('Nav item deleted');
      }
    });
  }, [deleteItem, items]);

  const allSortableIds = items.map((i) => i.id);

  return (
    <div className="space-y-6">
      {/* Live preview */}
      <NavPreview items={items} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-mono font-medium tabular-nums">
            {topLevelItems.length}
          </span>{' '}
          top-level item{topLevelItems.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={() => openAddDialog()}>
          <PlusIcon className="mr-1 size-4" />
          Add Item
        </Button>
      </div>

      {/* Sortable list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {topLevelItems.map((item) => {
              const children = getChildren(item.id);
              const isExpanded = expandedParents.has(item.id);

              return (
                <div key={item.id}>
                  <div className="flex items-center gap-1">
                    {children.length > 0 && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded"
                        onClick={() => toggleExpand(item.id)}
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="size-3.5" />
                        ) : (
                          <ChevronRightIcon className="size-3.5" />
                        )}
                      </button>
                    )}
                    {children.length === 0 && <div className="w-6" />}
                    <div className="flex-1">
                      <SortableNavItem
                        item={item}
                        onToggleActive={handleToggleActive}
                        onEdit={openEditDialog}
                        onDelete={setDeleteItem}
                      />
                    </div>
                  </div>

                  {isExpanded && children.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {children.map((child) => (
                        <SortableNavItem
                          key={child.id}
                          item={child}
                          isChild
                          onToggleActive={handleToggleActive}
                          onEdit={openEditDialog}
                          onDelete={setDeleteItem}
                        />
                      ))}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground hover:border-foreground border-hairline rounded-card ml-8 flex w-fit items-center gap-1 border border-dashed px-3 py-2 text-xs transition-colors"
                        onClick={() => openAddDialog(item.id)}
                      >
                        <PlusIcon className="size-3" />
                        Add child
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {topLevelItems.length === 0 && (
        <div className="bg-card rounded-card border-hairline border">
          <EmptyState
            title="No navigation items yet"
            description="Click “Add Item” to get started."
          />
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{addParentId ? 'Add Child Item' : 'Add Navigation Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!addParentId && (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={addType}
                  onValueChange={(v) => setAddType(v as 'category' | 'custom_link')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[var(--z-popover)]">
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="custom_link">Custom Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {addType === 'category' && !addParentId && (
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="relative">
                  <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                  <Input
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder={selectedCategoryName ?? 'Search categories...'}
                    className="pl-8 text-sm"
                  />
                </div>
                <div className="border-hairline rounded-card max-h-[200px] overflow-y-auto border">
                  {filteredCategoryOptions.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      {availableCategories.length === 0
                        ? 'All categories are already in the navigation.'
                        : 'No matching categories.'}
                    </p>
                  ) : (
                    filteredCategoryOptions.map((cat) => {
                      const parentName = getCategoryParentName(cat.parentId);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`hover:bg-accent w-full px-3 py-1.5 text-left text-sm transition-colors ${
                            addCategoryId === cat.id ? 'bg-accent font-medium' : ''
                          }`}
                          onClick={() => handleCategorySelect(cat)}
                        >
                          {parentName && (
                            <span className="text-muted-foreground mr-1 text-xs">
                              {parentName} /
                            </span>
                          )}
                          {cat.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder="Menu label..."
              />
            </div>

            {(addType === 'custom_link' || addParentId) && (
              <div className="space-y-2">
                <Label>URL {addParentId && '(optional for custom links)'}</Label>
                <Input
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  placeholder="/artikel/..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="quiet" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={
                isPending ||
                !addLabel.trim() ||
                (addType === 'category' && !addParentId && !addCategoryId) ||
                (addType === 'custom_link' && !addParentId && !addUrl.trim())
              }
            >
              {isPending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Navigation Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            </div>
            {editItem?.type === 'custom_link' && (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="quiet" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isPending || !editLabel.trim()}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Navigation Item</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Are you sure you want to delete <strong>{deleteItem?.label}</strong>?
            {deleteItem && !deleteItem.parentId && getChildren(deleteItem.id).length > 0 && (
              <> This will also remove all {getChildren(deleteItem.id).length} child items.</>
            )}
          </p>
          <DialogFooter>
            <Button variant="quiet" onClick={() => setDeleteItem(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
